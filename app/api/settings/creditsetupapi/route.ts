import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { User } from "@/models";
import { encryptData } from "@/lib/encryption"; // Implement encryption for sensitive data
import { internalError, unauthorized } from "@/lib/api/error-handler";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return unauthorized("Authentication required");
    }

    const body = await req.json();
    const { stripeSecretKey, stripePublishableKey, stripeWebhookSecret } = body;

    // Encrypt sensitive data before saving
    const encryptedStripeSecretKey = encryptData(stripeSecretKey);
    const encryptedStripeWebhookSecret = encryptData(stripeWebhookSecret);

    // Update the seller's payment details
    await User.findByIdAndUpdate(session.user.id, {
      creditSetup: {
        stripeSecretKey: encryptedStripeSecretKey,
        stripePublishableKey,
        stripeWebhookSecret: encryptedStripeWebhookSecret,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating payment details:", error);
    return internalError("Internal server error");
  }
}
