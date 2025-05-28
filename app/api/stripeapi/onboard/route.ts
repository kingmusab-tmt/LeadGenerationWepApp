import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { User } from "@/models/user";
import dbConnect from "@/lib/connectdb";
import { getClientIp } from "request-ip";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "User authentication required" },
        { status: 401 }
      );
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
          { status: 200 }
        );
      }

      // Account is fully onboarded
      return NextResponse.json(
        {
          accountId,
          message: "Account already fully onboarded",
        },
        { status: 200 }
      );
    }

    // Create new account if none exists
    const clientIp =
      getClientIp({ headers: Object.fromEntries(request.headers.entries()) }) ||
      request.headers.get("x-forwarded-for") ||
      "";

    const account = await stripe.accounts.create({
      type: "express",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      business_profile: {
        product_description: "Seller on our platform",
      },
    });

    accountId = account.id;
    onboardingUrl = await createOnboardingLink(accountId);

    // Update user in database
    await User.findOneAndUpdate(
      { email: session.user.email },
      { stripeAccountId: accountId },
      { upsert: true, new: true }
    );

    return NextResponse.json(
      {
        accountId,
        onboardingUrl,
        message: "New account created",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Stripe onboarding error:", error);
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode || 500 }
      );
    }
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

async function createOnboardingLink(accountId: string): Promise<string> {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.AUTH_URL}/dashboard/seller/settings?tab=stripe_onboarding=restart&account_id=${accountId}`,
    return_url: `${process.env.AUTH_URL}/dashboard/seller/settings?tab=stripe_onboarding=success&account_id=${accountId}`,
    type: "account_onboarding",
  });
  return accountLink.url;
}
