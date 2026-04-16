import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import { authOptions } from "@/auth";
import { internalError, notFound, unauthorized } from "@/lib/api/error-handler";

export async function GET() {
  try {
    await dbConnect();

    // Get the current session
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "buyer") {
      return unauthorized("Authentication required");
    }

    // Fetch the lead buyer using the session user email
    const buyer = await Buyer.findOne({ email: session.user.email }).select(
      "registeredWith",
    );
    if (!buyer || !buyer.registeredWith) {
      return notFound(
        "Buyer",
        "Buyer not found or not registered with a seller",
      );
    }

    // Fetch the lead seller (User) that the buyer is registered with
    const seller = await User.findById(buyer.registeredWith).select(
      "unitPricingOptions",
    );
    if (!seller || !seller.unitPricingOptions) {
      return notFound("Seller", "No unit pricing options found");
    }

    return NextResponse.json({
      success: true,
      data: seller.unitPricingOptions,
    });
  } catch (error) {
    console.error("Error fetching unit pricing options:", error);
    return internalError("Internal server error");
  }
}
