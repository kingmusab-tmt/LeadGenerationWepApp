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

    // Validate query parameters
    try {
      await getCallsQuerySchema.parseAsync(
        Object.fromEntries(new URL(req.url).searchParams),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid query parameters");
    }

    // Fetch calls as plain objects (lean) for faster serialization
    const calls = await Call.find({ userId: sellerId }).lean();

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
        industry: buyer?.leadPreferences?.industries?.[0] || "N/A",
      };
    });

    return successResponse(callsWithBuyerInfo);
  } catch (error) {
    console.error("Error fetching calls:", error);
    return internalError("Failed to fetch calls");
  }
}
