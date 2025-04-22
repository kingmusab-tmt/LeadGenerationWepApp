import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { User } from "@/models/user";
import { encryptData } from "@/lib/encryption"; // Implement encryption for sensitive data

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      stripeSecretKey,
      stripePublishableKey,
      stripeWebhookSecret,
      paypalClientId,
      paypalSecret,
    } = body;

    // Encrypt sensitive data before saving
    const encryptedStripeSecretKey = encryptData(stripeSecretKey);
    const encryptedStripeWebhookSecret = encryptData(stripeWebhookSecret);

    const encryptedPaypalSecret = encryptData(paypalSecret);

    // Update the seller's payment details
    await User.findByIdAndUpdate(session.user.id, {
      creditSetup: {
        stripeSecretKey: encryptedStripeSecretKey,
        stripePublishableKey,
        stripeWebhookSecret: encryptedStripeWebhookSecret,
        paypalClientId,
        paypalSecret: encryptedPaypalSecret,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating payment details:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
