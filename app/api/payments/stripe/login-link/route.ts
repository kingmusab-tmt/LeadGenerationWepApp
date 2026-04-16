import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { env } from "@/lib/env";
import {
  badRequest,
  internalError,
  unauthorized,
} from "@/lib/api/error-handler";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorized("User authentication required");
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user?.stripeAccountId) {
      return badRequest("Stripe account not connected");
    }

    const loginLink = await stripe.accounts.createLoginLink(
      user.stripeAccountId,
    );

    return NextResponse.json({ url: loginLink.url });
  } catch (error) {
    console.error("Stripe login link error:", error);
    return internalError("Failed to create Stripe login link");
  }
}
