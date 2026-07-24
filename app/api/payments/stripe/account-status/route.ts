import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { User } from "@/models";
import dbConnect from "@/lib/connectdb";
import { env } from "@/lib/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 },
      );
    }

    await dbConnect();
    // Always the authenticated caller's own account — this endpoint
    // previously took an arbitrary ?email= query param with no session
    // check at all, letting anyone look up any seller's Stripe Connect
    // onboarding/compliance status.
    const email = session.user.email;

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
