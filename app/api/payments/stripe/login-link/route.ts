import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "User authentication required" },
        { status: 401 },
      );
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user?.stripeAccountId) {
      return NextResponse.json(
        { message: "Stripe account not connected" },
        { status: 400 },
      );
    }

    const loginLink = await stripe.accounts.createLoginLink(
      user.stripeAccountId,
    );

    return NextResponse.json({ url: loginLink.url });
  } catch (error) {
    console.error("Stripe login link error:", error);
    return NextResponse.json(
      { message: "Failed to create Stripe login link" },
      { status: 500 },
    );
  }
}
