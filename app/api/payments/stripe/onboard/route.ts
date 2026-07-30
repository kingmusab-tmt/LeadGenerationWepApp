import { NextResponse } from "next/server";
import Stripe from "stripe";
import { User } from "@/models";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { internalError, unauthorized } from "@/lib/api/error-handler";
import { env } from "@/lib/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorized("User authentication required");
    }
    await dbConnect();

    // Check if user already has a Stripe account
    const existingUser = await User.findOne({ email: session.user.email });
    let accountId = existingUser?.stripeAccountId;
    let onboardingUrl: string | null = null;

    if (accountId) {
      // Check if account needs to complete additional requirements
      const account = await stripe.accounts.retrieve(accountId);

      if (
        !account.details_submitted ||
        !account.charges_enabled ||
        !account.payouts_enabled
      ) {
        // Create new onboarding link for existing account
        onboardingUrl = await createOnboardingLink(accountId);
        return NextResponse.json(
          {
            accountId,
            onboardingUrl,
            message: "Account needs additional information",
          },
          { status: 200 },
        );
      }

      // Account is fully onboarded
      return NextResponse.json(
        {
          accountId,
          message: "Account already fully onboarded",
        },
        { status: 200 },
      );
    }

    // Create new account if none exists
    const account = await stripe.accounts.create({
      type: "express",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      business_profile: {
        product_description: "Lead Seller on our Brixcot platform",
      },
    });

    accountId = account.id;
    onboardingUrl = await createOnboardingLink(accountId);

    // Update user in database
    await User.findOneAndUpdate(
      { email: session.user.email },
      { stripeAccountId: accountId },
      { upsert: true, new: true },
    );

    return NextResponse.json(
      {
        accountId,
        onboardingUrl,
        message: "New account created",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Stripe onboarding error:", error);
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: "Stripe onboarding failed" },
        { status: error.statusCode || 500 },
      );
    }
    return internalError("Internal server error");
  }
}

async function createOnboardingLink(accountId: string): Promise<string> {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${env.NEXTAUTH_URL}/dashboard/settings?tab=stripe-onboarding&stripe_onboarding=restart&account_id=${accountId}`,
    return_url: `${env.NEXTAUTH_URL}/dashboard/settings?tab=stripe-onboarding&stripe_onboarding=success&account_id=${accountId}`,
    type: "account_onboarding",
  });
  return accountLink.url;
}
