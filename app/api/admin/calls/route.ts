import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Call from "@/models/call";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import dbConnect from "@/lib/connectdb";
import { requireAdmin } from "@/lib/api/adminAuth";
import { internalError } from "@/lib/api/error-handler";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();

    // First get all calls without populating
    const calls = await Call.find().sort({ createdAt: -1 }).lean();

    // Process calls to handle invalid buyerIds
    const formattedCalls = await Promise.all(
      calls.map(async (call) => {
        let seller = null;
        let buyer = null;

        // Populate seller if userId exists
        if (call.userId && mongoose.Types.ObjectId.isValid(call.userId)) {
          const sellerDoc = await User.findById(call.userId)
            .select("name")
            .lean();
          seller = sellerDoc
            ? {
                id: sellerDoc._id.toString(),
                name: sellerDoc.name,
              }
            : null;
        }

        // Populate buyer only if buyerId exists and is valid
        if (call.buyerId && mongoose.Types.ObjectId.isValid(call.buyerId)) {
          const buyerDoc = await Buyer.findById(call.buyerId)
            .select("name")
            .lean();
          buyer = buyerDoc
            ? {
                id: buyerDoc._id.toString(),
                name: buyerDoc.name,
              }
            : null;
        }

        return {
          id: (call._id as mongoose.Types.ObjectId).toString(),
          callSid: call.callSid,
          from: call.from,
          to: call.to,
          duration: call.callDuration || 0,
          status: call.callStatus,
          recordingUrl: call.recordingUrl,
          createdAt: call.createdAt.toISOString(),
          seller,
          buyer,
          feedback: call.feedback
            ? {
                rating: call.feedback.buyerRating,
                comment: call.feedback.sellerComment,
              }
            : undefined,
        };
      }),
    );

    return NextResponse.json({ calls: formattedCalls });
  } catch (error) {
    console.error("Failed to fetch calls:", error);
    return internalError("Failed to fetch calls");
  }
}
