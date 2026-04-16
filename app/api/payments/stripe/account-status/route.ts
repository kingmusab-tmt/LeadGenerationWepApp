import { NextResponse } from "next/server";
import Stripe from "stripe";
import { User } from "@/models";
import dbConnect from "@/lib/connectdb";
import { env } from "@/lib/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { message: "User email is required" },
        { status: 400 },
      );
    }

    const user = await User.findOne({ email });
    if (!user || !user.stripeAccountId) {
      return NextResponse.json(
        { message: "No Stripe account found for user" },
        { status: 404 },
      );
    }

    const account = await stripe.accounts.retrieve(user.stripeAccountId);

    // Update user onboarding status if needed
    if (account.details_submitted && !user.stripeOnboarded) {
      await User.updateOne({ email }, { stripeOnboarded: true });
    }

    return NextResponse.json(
      {
        accountId: user.stripeAccountId,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        requirements: {
          currentlyDue: account.requirements?.currently_due || [],
          eventuallyDue: account.requirements?.eventually_due || [],
          pastDue: account.requirements?.past_due || [],
        },
        tosAccepted: !!account.tos_acceptance?.date,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Stripe account status error:", error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode || 500 },
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
