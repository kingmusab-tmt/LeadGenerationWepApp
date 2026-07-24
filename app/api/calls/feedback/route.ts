import { NextRequest } from "next/server";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import { Transaction } from "@/models/transactions";
import { sendNotification } from "@/lib/notificationService";
import { Buyer } from "@/models/leadbuyers";
import { User } from "@/models";
import { dispatchCallWebhook } from "@/lib/integrations/callWebhookDispatcher";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { recordAuditLog } from "@/lib/auditLog";
import { withErrorHandler } from "@/lib/api/async-handler";
import {
  badRequest,
  forbidden,
  notFound,
  successResponse,
  unauthorized,
} from "@/lib/api/error-handler";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";
import { requireCsrf } from "@/lib/security/requireCsrf";
import { callFeedbackSchema } from "@/lib/validation/schemas";

type FeedbackState = {
  buyerRating?: boolean;
  sellerApproved?: boolean;
  sellerComment?: string;
  refundAmount?: number;
  refundedAt?: Date;
};

type FeedbackCallDoc = {
  _id: string;
  userId: string;
  buyerId?: string;
  callSid: string;
  from: string;
  to: string;
  unitsCharged: number;
  paymentStatus: string;
  feedback?: FeedbackState;
};

export const POST = withErrorHandler(async (req: NextRequest) => {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session.user.role) {
    return unauthorized("Authentication required");
  }

  const rateLimited = await checkSimpleRateLimit(req, {
    scope: "calls-feedback",
    limit: 20,
    windowMs: 10 * 60 * 1000,
    actorId: session.user.id,
  });
  if (rateLimited) return rateLimited;

  const csrfError = requireCsrf(req, session.user.email);
  if (csrfError) return csrfError;

  const url = new URL(req.url);
  const callId = url.searchParams.get("callId");
  if (!callId) {
    return badRequest("callId is required");
  }

  const body = callFeedbackSchema.parse(await req.json());
  const { feedback, callDuration, isSellerReview, approved, comment } = body;

  // Find the call record
  const call = await Call.findById(callId);
  if (!call) {
    return notFound("Call");
  }

  if (isSellerReview) {
    const isAdmin = session.user.role === "admin";
    const isSellerOwner =
      session.user.role === "seller" &&
      String(call.userId) === String(session.user.id);

    if (!isAdmin && !isSellerOwner) {
      return forbidden("Forbidden");
    }

    if (typeof approved !== "boolean") {
      return badRequest("`approved` must be a boolean for a seller review.");
    }

    return handleSellerReview(callId, approved, comment || "", session.user);
  } else {
    const buyerProfile = await Buyer.findOne({ email: session.user.email })
      .select("_id")
      .lean();
    const isBuyerOwner =
      session.user.role === "buyer" &&
      !!buyerProfile?._id &&
      String(call.buyerId) === String(buyerProfile._id);

    if (!isBuyerOwner) {
      return forbidden("Forbidden");
    }

    if (typeof feedback !== "boolean" || typeof callDuration !== "number") {
      return badRequest("`feedback` (boolean) and `callDuration` (number) are required.");
    }

    return handleBuyerFeedback(
      call as unknown as FeedbackCallDoc & {
        feedback?: FeedbackState;
        save(): Promise<unknown>;
      },
      feedback,
      callDuration,
    );
  }
});

async function handleBuyerFeedback(
  call: FeedbackCallDoc & { feedback?: FeedbackState; save(): Promise<unknown> },
  feedback: boolean,
  callDuration: number,
) {
  // Update call with buyer feedback
  call.feedback = call.feedback || {};
  call.feedback.buyerRating = feedback;

  // Auto-detect potential refund cases (short calls marked as bad)
  if (feedback === false && callDuration < 30) {
    call.paymentStatus = "pending_refund";
  }

  await call.save();

  return successResponse({
    call,
    message: "Feedback submitted successfully",
    requiresSellerReview: feedback === false && callDuration < 30,
  });
}

async function handleSellerReview(
  callId: string,
  approved: boolean,
  comment: string,
  actor: { id: string; email?: string | null; role?: string | null },
) {
  // Atomically "claim" this call for review — the filter only matches a call
  // still in pending_refund, so a double-click or two concurrent requests
  // can only ever have one of them succeed here. Without this, a plain
  // read-then-write allowed both requests to pass the eligibility check
  // before either write landed, crediting the buyer's wallet twice.
  const claimed = await Call.findOneAndUpdate(
    { _id: callId, paymentStatus: "pending_refund" },
    { $set: { paymentStatus: "processing_refund" } },
    { new: true },
  );

  if (!claimed) {
    return badRequest(
      "This call doesn't require seller review, or a review is already in progress.",
    );
  }

  try {
    if (approved) {
      await processRefund(claimed as unknown as FeedbackCallDoc, comment);
    }

    const finalStatus = approved ? "refunded" : "paid";
    const updated = await Call.findByIdAndUpdate(
      callId,
      {
        $set: {
          paymentStatus: finalStatus,
          "feedback.sellerApproved": approved,
          "feedback.sellerComment": comment,
        },
      },
      { new: true },
    );

    dispatchCallWebhook(claimed.userId, "callRefunded", {
      callSid: claimed.callSid,
      from: claimed.from,
      to: claimed.to,
      status: finalStatus,
      buyerId: claimed.buyerId,
      unitsCharged: claimed.unitsCharged,
      refundAmount: approved ? claimed.unitsCharged : 0,
      refundComment: comment,
      paymentStatus: finalStatus,
    });

    await recordAuditLog({
      actor,
      action: approved ? "call.refund.approved" : "call.refund.rejected",
      targetType: "Call",
      targetId: callId,
      summary: `${approved ? "Approved" : "Rejected"} refund for call ${claimed.callSid}`,
    });

    return successResponse({
      call: updated,
      message: `Feedback ${approved ? "approved" : "rejected"}`,
      refundProcessed: approved,
    });
  } catch (error) {
    // Roll back the claim so this can be retried rather than getting stuck
    // in "processing_refund" forever after a failed refund attempt.
    await Call.findByIdAndUpdate(callId, {
      $set: { paymentStatus: "pending_refund" },
    });

    if (error instanceof Error && error.message.startsWith("REFUND_FAILED:")) {
      return badRequest(error.message.replace("REFUND_FAILED:", "").trim());
    }
    throw error;
  }
}

async function processRefund(call: FeedbackCallDoc, comment: string) {
  // 1. Refund units to buyer
  const buyer = call.buyerId ? await Buyer.findById(call.buyerId) : null;
  if (!buyer) {
    // Don't silently mark this refunded — the credit never actually
    // reaches anyone if the buyer account no longer exists.
    throw new Error(
      "REFUND_FAILED: The buyer account for this call no longer exists, so the refund cannot be processed.",
    );
  }
  buyer.walletUnit = (buyer.walletUnit || 0) + call.unitsCharged;
  await buyer.save();

  // 2. Fetch seller details for transaction record
  const seller = await User.findById(call.userId);

  // 3. Create refund transaction record
  const refundTransaction = new Transaction({
    type: "refund",
    userId: call.buyerId,
    callId: call._id,
    amount: call.unitsCharged,
    metadata: {
      callId: call._id,
      sellerId: call.userId,
      sellerName: seller?.name || "Unknown",
      sellerEmail: seller?.email || "N/A",
      buyerId: call.buyerId,
      buyerName: buyer?.name || "Unknown",
      buyerEmail: buyer?.email || "N/A",
      refund: true,
      refundReason: comment,
    },
    status: "completed",
    description: `Refund for call ${call.callSid}`,
  });
  await refundTransaction.save();

  // 4. Send notification to buyer
  await sendNotification({
    userId: call.buyerId!,
    type: "refund",
    title: "Refund Processed",
    message: `You've been refunded ${call.unitsCharged} units for call ${call.callSid}`,
    metadata: {
      callId: call._id,
      amount: call.unitsCharged,
    },
  });
}
