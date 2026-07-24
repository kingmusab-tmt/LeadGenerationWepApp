import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Call from "@/models/call";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import dbConnect from "@/lib/connectdb";
import { requireAdmin } from "@/lib/api/adminAuth";
import { internalError } from "@/lib/api/error-handler";

// Unbounded before this — see admin/financial/transactions/route.ts for
// the same fix and reasoning. This route additionally used to run a
// User.findById + Buyer.findById per row inside Promise.all(calls.map(...))
// — an N+1 query pattern replaced below with two batched $in lookups.
const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 500;

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") || "", 10) || DEFAULT_LIMIT),
    );
    const skip = (page - 1) * limit;

    const [calls, total] = await Promise.all([
      Call.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Call.countDocuments(),
    ]);

    const sellerIds = [
      ...new Set(
        calls
          .map((call) => call.userId)
          .filter(
            (id): id is string =>
              !!id && mongoose.Types.ObjectId.isValid(id),
          ),
      ),
    ];
    const buyerIds = [
      ...new Set(
        calls
          .map((call) => call.buyerId)
          .filter(
            (id): id is string =>
              !!id && mongoose.Types.ObjectId.isValid(id),
          ),
      ),
    ];

    const [sellers, buyers] = await Promise.all([
      sellerIds.length
        ? User.find({ _id: { $in: sellerIds } })
            .select("name")
            .lean()
        : [],
      buyerIds.length
        ? Buyer.find({ _id: { $in: buyerIds } })
            .select("name")
            .lean()
        : [],
    ]);

    const sellerById = new Map(sellers.map((s) => [s._id.toString(), s]));
    const buyerById = new Map(buyers.map((b) => [b._id.toString(), b]));

    const formattedCalls = calls.map((call) => {
      const sellerDoc =
        call.userId && mongoose.Types.ObjectId.isValid(call.userId)
          ? sellerById.get(call.userId.toString())
          : undefined;
      const buyerDoc =
        call.buyerId && mongoose.Types.ObjectId.isValid(call.buyerId)
          ? buyerById.get(call.buyerId.toString())
          : undefined;

      return {
        id: (call._id as mongoose.Types.ObjectId).toString(),
        callSid: call.callSid,
        from: call.from,
        to: call.to,
        duration: call.callDuration || 0,
        status: call.callStatus,
        recordingUrl: call.recordingUrl,
        createdAt: call.createdAt.toISOString(),
        seller: sellerDoc
          ? { id: sellerDoc._id.toString(), name: sellerDoc.name }
          : null,
        buyer: buyerDoc
          ? { id: buyerDoc._id.toString(), name: buyerDoc.name }
          : null,
        feedback: call.feedback
          ? {
              rating: call.feedback.buyerRating,
              comment: call.feedback.sellerComment,
            }
          : undefined,
      };
    });

    return NextResponse.json({
      calls: formattedCalls,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Failed to fetch calls:", error);
    return internalError("Failed to fetch calls");
  }
}
