// app/api/calls/feedback/[callId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import { Transaction } from "@/models/transactions";
import { sendNotification } from "@/lib/notificationService";
import { Buyer } from "@/models/leadbuyers";
import { User } from "@/models";
import { dispatchCallWebhook } from "@/lib/integrations/callWebhookDispatcher";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

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
  sellerId: string;
  buyerId: string;
  callSid: string;
  from: string;
  to: string;
  unitsCharged: number;
  paymentStatus: string;
  feedback?: FeedbackState;
  save(): Promise<unknown>;
};

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !session.user.role) {
      return unauthorized("Authentication required");
    }

    const url = new URL(req.url);
    const callId = url.searchParams.get("callId");
    const body = await req.json();
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
        (String(call.userId) === String(session.user.id) ||
          String(call.sellerId) === String(session.user.id));

      if (!isAdmin && !isSellerOwner) {
        return forbidden("Forbidden");
      }

      // Handle seller review/approval
      return handleSellerReview(
        call as unknown as FeedbackCallDoc,
        approved,
        comment,
      );
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

      // Handle buyer feedback
      return handleBuyerFeedback(
        call as unknown as FeedbackCallDoc,
        feedback,
        callDuration,
      );
    }
  } catch (error) {
    console.error("Error processing feedback:", error);
    return internalError("Internal server error");
  }
}

async function handleBuyerFeedback(
  call: FeedbackCallDoc,
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

  return NextResponse.json({
    success: true,
    message: "Feedback submitted successfully",
    requiresSellerReview: feedback === false && callDuration < 30,
  });
}

async function handleSellerReview(
  call: FeedbackCallDoc,
  approved: boolean,
  comment: string,
) {
  // Verify this is a pending refund case
  if (call.paymentStatus !== "pending_refund") {
    return badRequest("This call doesn't require seller review");
  }

  // Update seller decision
  call.feedback = call.feedback || {};
  call.feedback.sellerApproved = approved;
  call.feedback.sellerComment = comment;

  if (approved) {
    // Process refund
    await processRefund(call);
    call.paymentStatus = "refunded";
  } else {
    // Reject refund request
    call.paymentStatus = "paid";
  }

  await call.save();

  // Fire refund webhook (non-blocking)
  dispatchCallWebhook(call.userId, "callRefunded", {
    callSid: call.callSid,
    from: call.from,
    to: call.to,
    status: call.paymentStatus,
    buyerId: call.buyerId,
    unitsCharged: call.unitsCharged,
    refundAmount: approved ? call.unitsCharged : 0,
    refundComment: comment,
    paymentStatus: call.paymentStatus,
  });

  return NextResponse.json({
    success: true,
    message: `Feedback ${approved ? "approved" : "rejected"}`,
    refundProcessed: approved,
  });
}

async function processRefund(call: FeedbackCallDoc) {
  call.feedback = call.feedback || {};
  // 1. Refund units to buyer
  const buyer = await Buyer.findById(call.buyerId);
  if (buyer) {
    buyer.walletUnit = (buyer.walletUnit || 0) + call.unitsCharged;
    await buyer.save();
  }

  // 2. Fetch seller details for transaction record
  const seller = await User.findById(call.sellerId);

  // 3. Create refund transaction record
  const refundTransaction = new Transaction({
    type: "refund",
    userId: call.buyerId,
    callId: call._id,
    amount: call.unitsCharged,
    metadata: {
      callId: call._id,
      sellerId: call.sellerId,
      sellerName: seller?.name || "Unknown",
      sellerEmail: seller?.email || "N/A",
      buyerId: call.buyerId,
      buyerName: buyer?.name || "Unknown",
      buyerEmail: buyer?.email || "N/A",
      refund: true,
      refundReason: call.feedback.sellerComment,
    },
    status: "completed",
    description: `Refund for call ${call.callSid}`,
  });
  await refundTransaction.save();

  // 3. Update call with refund details
  call.feedback.refundAmount = call.unitsCharged;
  call.feedback.refundedAt = new Date();

  // 4. Send notification to buyer
  if (buyer) {
    await sendNotification({
      userId: call.buyerId,
      type: "refund",
      title: "Refund Processed",
      message: `You've been refunded ${call.unitsCharged} units for call ${call.callSid}`,
      metadata: {
        callId: call._id,
        amount: call.unitsCharged,
      },
    });
  }
}
