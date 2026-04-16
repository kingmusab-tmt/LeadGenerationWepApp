import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import { Transaction } from "@/models/transactions";
import { ZodError } from "zod";
import {
  badRequest,
  forbidden,
  handleValidationError,
  internalError,
  notFound,
  successResponse,
  unauthorized,
} from "@/lib/api/error-handler";
import { mongoIdParamSchema } from "@/lib/validation/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    await dbConnect();

    const currentUser = await User.findOne({
      email: session.user.email,
    }).select("_id role");

    if (!currentUser) {
      return notFound("User");
    }

    // Extract buyerId from the URL search parameters
    const { searchParams } = new URL(req.url);
    const buyerId = searchParams.get("buyerId");

    let userId: string | undefined;

    if (buyerId) {
      try {
        mongoIdParamSchema.parse(buyerId);
      } catch (error) {
        if (error instanceof ZodError) {
          return handleValidationError(error);
        }
        return badRequest("Invalid buyerId");
      }

      if (currentUser.role === "buyer") {
        const buyer = await Buyer.findOne({ email: session.user.email }).select(
          "_id",
        );

        if (!buyer) {
          return notFound("Buyer");
        }

        if (String(buyer._id) !== buyerId) {
          return forbidden("You do not have access to these transactions");
        }
      } else if (currentUser.role === "seller") {
        const managedBuyer = await Buyer.findOne({
          _id: buyerId,
          registeredWith: currentUser._id,
        }).select("_id");

        if (!managedBuyer) {
          return forbidden("You do not have access to these transactions");
        }
      } else if (currentUser.role !== "admin") {
        return forbidden("Buyer transaction history is restricted");
      }

      userId = buyerId;
    } else {
      if (currentUser.role !== "seller") {
        return forbidden(
          "Seller transaction history requires a seller account",
        );
      }

      userId = String(currentUser._id);
    }

    // Fetch transactions using the userId (either sellerId or buyerId)
    const transactions = await Transaction.find({ userId }).sort({
      createdAt: -1,
    });

    return successResponse(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return internalError("Failed to fetch transactions");
  }
}
