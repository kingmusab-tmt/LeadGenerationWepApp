import { NextRequest, NextResponse } from "next/server";
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

    const calls = await Call.find({ userId: sellerId });

    const callsWithBuyerInfo = await Promise.all(
      calls.map(async (call) => {
        if (call.buyerId) {
          const buyer = await Buyer.findById(call.buyerId);
          if (buyer) {
            return {
              ...call.toObject(),
              buyerName: buyer.name,
              industry: buyer.leadPreferences.industries?.[0] || "N/A",
            };
          }
        }
        return { ...call.toObject(), buyerName: "N/A", industry: "N/A" };
      }),
    );

    return successResponse(callsWithBuyerInfo);
  } catch (error) {
    console.error("Error fetching calls:", error);
    return internalError("Failed to fetch calls");
  }
}
