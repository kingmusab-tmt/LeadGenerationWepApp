import { NextRequest } from "next/server";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import { Buyer } from "@/models/leadbuyers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getCallsQuerySchema } from "@/lib/validation/schemas";
import {
  successResponse,
  unauthorized,
  internalError,
  handleValidationError,
  badRequest,
} from "@/lib/api/error-handler";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";
import { ZodError } from "zod";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Get the seller ID from the session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return unauthorized("Please log in.");
    }
    const sellerId = session.user.id;

    const rateLimited = await checkSimpleRateLimit(req, {
      scope: "calls-tracking",
      limit: 60,
      windowMs: 60 * 1000,
      actorId: sellerId,
    });
    if (rateLimited) return rateLimited;

    // Validate query parameters
    let queryParams;
    try {
      queryParams = await getCallsQuerySchema.parseAsync(
        Object.fromEntries(new URL(req.url).searchParams),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid query parameters");
    }

    const query: Record<string, unknown> = { userId: sellerId };
    if (queryParams.buyerId) query.buyerId = queryParams.buyerId;
    if (queryParams.status) query.status = queryParams.status;
    if (queryParams.paymentStatus) query.paymentStatus = queryParams.paymentStatus;
    if (queryParams.startDate || queryParams.endDate) {
      query.createdAt = {
        ...(queryParams.startDate ? { $gte: new Date(queryParams.startDate) } : {}),
        ...(queryParams.endDate ? { $lte: new Date(queryParams.endDate) } : {}),
      };
    }

    const page = queryParams.page ?? 1;
    const limit = queryParams.limit ?? 200;
    const skip = (page - 1) * limit;

    // Fetch calls as plain objects (lean) for faster serialization. Excludes
    // transcription/aiSummary/voicemail — not rendered by this page — since
    // pulling them for every call in a seller's history is unnecessary
    // payload weight at scale.
    const [calls, total] = await Promise.all([
      Call.find(query)
        .select(
          "userId buyerId callSid from to status callStatus callDuration recordingUrl unitsCharged feedback paymentStatus industry createdAt",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Call.countDocuments(query),
    ]);

    // Batch-fetch all referenced buyers in a single query (avoids N+1)
    const buyerIds = [
      ...new Set(
        calls.filter((c) => c.buyerId).map((c) => c.buyerId!.toString()),
      ),
    ];

    const buyers =
      buyerIds.length > 0
        ? await Buyer.find({ _id: { $in: buyerIds } })
            .select("name leadPreferences.industries")
            .lean()
        : [];

    const buyerMap = new Map(buyers.map((b) => [b._id.toString(), b]));

    const callsWithBuyerInfo = calls.map((call) => {
      const buyer = call.buyerId ? buyerMap.get(call.buyerId.toString()) : null;
      return {
        ...call,
        buyerName: buyer?.name || "N/A",
        industry: buyer?.leadPreferences?.industries?.[0] || call.industry || "N/A",
      };
    });

    return successResponse({
      calls: callsWithBuyerInfo,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching calls:", error);
    return internalError("Failed to fetch calls");
  }
}
