import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { User } from "@/models/user";
import { Buyer } from "@/models/leadbuyers";
import { authOptions } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Get the current session
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "buyer") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch the lead buyer using the session user email
    const buyer = await Buyer.findOne({ email: session.user.email }).select(
      "registeredWith"
    );
    if (!buyer || !buyer.registeredWith) {
      return NextResponse.json(
        {
          success: false,
          message: "Buyer not found or not registered with a seller",
        },
        { status: 404 }
      );
    }

    // Fetch the lead seller (User) that the buyer is registered with
    const seller = await User.findById(buyer.registeredWith).select(
      "unitPricingOptions"
    );
    if (!seller || !seller.unitPricingOptions) {
      return NextResponse.json(
        { success: false, message: "No unit pricing options found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: seller.unitPricingOptions,
    });
  } catch (error) {
    console.error("Error fetching unit pricing options:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
