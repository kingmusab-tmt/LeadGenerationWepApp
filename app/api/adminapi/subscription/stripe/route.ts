import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { User } from "@/models/user";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

// Helper function to get Stripe price ID
function getStripePriceId(plan: string): string {
  const priceId = process.env[`STRIPE_${plan.toUpperCase()}_PRICE_ID`];
  if (!priceId) {
    throw new Error(`Stripe price ID not configured for plan: ${plan}`);
  }
  return priceId;
}

// Helper function to get plan limits
function getPlanLimits(plan: string): {
  leads: number;
  buyers: number;
  numbers: number;
  callSeconds: number;
} {
  const plans = {
    starter: { leads: 100, buyers: 5, numbers: 1, callSeconds: 100 },
    professional: { leads: 1000, buyers: 20, numbers: 3, callSeconds: 1000 },
    enterprise: { leads: 10000, buyers: 100, numbers: 10, callSeconds: 5000 },
  };

  if (!(plan in plans)) {
    throw new Error(`Invalid plan: ${plan}`);
  }

  return plans[plan as keyof typeof plans];
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { paymentMethodId, plan } = await req.json();

  try {
    // Validate plan
    if (!["starter", "professional", "enterprise"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Handle customer creation
    let customer: Stripe.Customer;
    if (user.stripeCustomerId) {
      const retrievedCustomer = await stripe.customers.retrieve(
        user.stripeCustomerId
      );
      customer = retrievedCustomer.deleted
        ? await stripe.customers.create({
            email: session.user.email,
            payment_method: paymentMethodId,
            invoice_settings: { default_payment_method: paymentMethodId },
          })
        : (retrievedCustomer as Stripe.Customer);
    } else {
      customer = await stripe.customers.create({
        email: session.user.email,
        payment_method: paymentMethodId,
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

    // Update customer ID if changed
    if (!user.stripeCustomerId || user.stripeCustomerId !== customer.id) {
      await User.updateOne(
        { email: session.user.email },
        { $set: { stripeCustomerId: customer.id } }
      );
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: getStripePriceId(plan) }],
      expand: ["latest_invoice.payment_intent"],
    });

    // Type-safe client secret extraction
    const clientSecret =
      typeof subscription.latest_invoice === "object" &&
      subscription.latest_invoice !== null &&
      "payment_intent" in subscription.latest_invoice &&
      typeof subscription.latest_invoice.payment_intent === "object" &&
      subscription.latest_invoice.payment_intent !== null &&
      "client_secret" in subscription.latest_invoice.payment_intent
        ? (
            subscription.latest_invoice as Stripe.Invoice & {
              payment_intent: Stripe.PaymentIntent;
            }
          ).payment_intent.client_secret
        : undefined;

    // Validate subscription period
    if (!subscription.current_period_end) {
      throw new Error("Subscription missing period end date");
    }

    // Update user subscription
    const updateResult = await User.updateOne(
      { email: session.user.email },
      {
        $set: {
          subscription: {
            plan,
            status: "active",
            startDate: new Date(),
            renewalDate: new Date(subscription.current_period_end * 1000),
            paymentMethod: "stripe",
            paymentId: subscription.id,
            limits: getPlanLimits(plan),
            usage: { leads: 0, callSeconds: 0 },
          },
        },
      }
    );

    if (updateResult.modifiedCount === 0) {
      throw new Error("Failed to update user subscription");
    }

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret,
    });
  } catch (err: any) {
    console.error("Error creating subscription:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create subscription" },
      { status: 500 }
    );
  }
}
