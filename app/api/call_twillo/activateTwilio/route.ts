import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { User } from "@/models/user";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { sellerId, action } = await req.json();

    if (!sellerId || !action) {
      return NextResponse.json(
        { error: "sellerId and action are required" },
        { status: 400 }
      );
    }

    const seller = await User.findById(sellerId);
    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    if (action === "activate") {
      seller.twilioActivated = true;
    } else if (action === "deactivate") {
      seller.twilioActivated = false;
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'activate' or 'deactivate'" },
        { status: 400 }
      );
    }

    await seller.save();

    return NextResponse.json(
      {
        success: true,
        message: `Twilio ${action}d successfully`,
        twilioActivated: seller.twilioActivated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Twilio activation error:", error);
    return NextResponse.json(
      {
        error: "Operation failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
