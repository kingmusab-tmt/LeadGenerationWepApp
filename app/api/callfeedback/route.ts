// app/api/calls/feedback/[callId]/route.ts
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
// import { User } from "@/models/user";
import { Transaction } from "@/models/transactions";
import { sendNotification } from "@/lib/notificationService";
import { Buyer } from "@/models/leadbuyers";

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const url = new URL(req.url);
    const callId = url.searchParams.get("callId");
    const body = await req.json();
    const { feedback, callDuration, isSellerReview, approved, comment } = body;

    // Find the call record
    const call = await Call.findById(callId);
    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    if (isSellerReview) {
      // Handle seller review/approval
      return handleSellerReview(call, approved, comment);
    } else {
      // Handle buyer feedback
      return handleBuyerFeedback(call, feedback, callDuration);
    }
  } catch (error) {
    console.error("Error processing feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleBuyerFeedback(
  call: any,
  feedback: boolean,
  callDuration: number
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
  call: any,
  approved: boolean,
  comment: string
) {
  // Verify this is a pending refund case
  if (call.paymentStatus !== "pending_refund") {
    return NextResponse.json(
      { error: "This call doesn't require seller review" },
      { status: 400 }
    );
  }

  // Update seller decision
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

  return NextResponse.json({
    success: true,
    message: `Feedback ${approved ? "approved" : "rejected"}`,
    refundProcessed: approved,
  });
}

async function processRefund(call: any) {
  // 1. Refund units to buyer
  const buyer = await Buyer.findById(call.buyerId);
  if (buyer) {
    buyer.walletUnit = (buyer.walletUnit || 0) + call.unitsCharged;
    await buyer.save();
  }

  // 2. Create refund transaction record
  const refundTransaction = new Transaction({
    type: "refund",
    userId: call.buyerId,
    callId: call._id,
    amount: call.unitsCharged,
    meta: {
      callId: call._id,
      sellerId: call.sellerId,
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
