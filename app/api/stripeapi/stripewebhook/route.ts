import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { ObjectId } from "mongodb";
import { User } from "@/models/user";
import { Transaction } from "@/models/transactions";
import { Tier } from "@/models/tier";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

type PurchaseType = "credits" | "subscription";

interface Metadata {
  purchaseType: PurchaseType;
  userId: string;
  units?: string;
  tierId?: string;
  durationMonths?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { success: false, message: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    await dbConnect();

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        return await handleCheckoutSessionCompleted(session);

      default:
        console.log(`Unhandled event type: ${event.type}`);
        return NextResponse.json({ received: true });
    }
  } catch (error: any) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const metadata = session.metadata
    ? (session.metadata as unknown as Metadata)
    : null;
  if (!metadata?.purchaseType || !metadata?.userId) {
    console.error("Missing required metadata in session:", session);
    return NextResponse.json(
      { success: false, message: "Missing required metadata" },
      { status: 400 }
    );
  }

  if (metadata.purchaseType === "credits") {
    return await handleCreditsPurchase(session, metadata);
  } else if (metadata.purchaseType === "subscription") {
    return await handleSubscriptionPurchase(session, metadata);
  }

  return NextResponse.json(
    { success: false, message: "Unknown purchase type" },
    { status: 400 }
  );
}

async function handleCreditsPurchase(
  session: Stripe.Checkout.Session,
  metadata: Metadata
) {
  const units = parseInt(metadata.units || "0");
  const amount = session.amount_total ? session.amount_total / 100 : 0;
  const userId = metadata.userId;
  const email = session.customer_details?.email;

  if (!email) {
    console.error("Customer email not found in session:", session);
    return NextResponse.json(
      { success: false, message: "Customer email not found" },
      { status: 400 }
    );
  }

  if (!units || !amount || !userId) {
    return NextResponse.json(
      { success: false, message: "Missing required data for credits purchase" },
      { status: 400 }
    );
  }

  // Find the buyer by user ID
  const buyer = await Buyer.findOne({ userId: new ObjectId(userId) });
  if (!buyer) {
    return NextResponse.json(
      { success: false, message: "Buyer not found" },
      { status: 404 }
    );
  }

  // Update buyer's wallet
  await Buyer.findByIdAndUpdate(
    buyer._id,
    { $inc: { walletUnit: units } },
    { new: true }
  );

  // Create transaction record
  const transaction = new Transaction({
    type: "units_purchase",
    userId: buyer._id,
    amount,
    currency: session.currency || "usd",
    previousBalance: buyer.walletUnit,
    currentBalance: buyer.walletUnit + units,
    paymentGateway: "stripe",
    gatewayTransactionId: session.id,
    status: "completed",
    metadata: {
      sellerId: buyer.registeredWith,
      unitsPurchased: units,
    },
  });
  await transaction.save();

  // Update lead seller's balance if applicable
  if (buyer.registeredWith) {
    const leadSeller = await User.findByIdAndUpdate(
      buyer.registeredWith,
      { $inc: { walletBalance: amount } },
      { new: true }
    );

    if (leadSeller) {
      const sellerTransaction = new Transaction({
        type: "seller_income",
        userId: buyer.registeredWith,
        amount,
        currency: session.currency || "usd",
        previousBalance: leadSeller.walletBalance - amount,
        currentBalance: leadSeller.walletBalance,
        paymentGateway: "stripe",
        gatewayTransactionId: session.id,
        status: "completed",
        metadata: {
          buyerId: buyer._id,
          unitsPurchased: units,
        },
      });
      await sellerTransaction.save();
    }
  }

  return NextResponse.json({
    success: true,
    message: "Credits purchase processed successfully",
  });
}

async function handleSubscriptionPurchase(
  session: Stripe.Checkout.Session,
  metadata: Metadata
) {
  const { tierId, userId, durationMonths } = metadata;
  const amount = session.amount_total ? session.amount_total / 100 : 0;

  if (!tierId || !userId) {
    return NextResponse.json(
      { success: false, message: "Missing required data for subscription" },
      { status: 400 }
    );
  }

  const tier = await Tier.findById(tierId);
  if (!tier) {
    return NextResponse.json(
      { success: false, message: "Tier not found" },
      { status: 404 }
    );
  }

  // Calculate subscription dates
  const startDate = new Date();
  const expiryDate = new Date(startDate);
  expiryDate.setMonth(expiryDate.getMonth() + parseInt(durationMonths || "1"));

  // Update user's subscription
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        "subscription.subscriptionPlan": tier.name,
        "subscription.subscriptionStartDate": startDate,
        "subscription.subscriptionExpiryDate": expiryDate,
        "subscription.isSubscriptionActive": true,
        "subscription.isTrial": false,
        "subscription.subscriptionPaymentMethod": "stripe",
        "subscription.subscriptionTierId": tierId,
        "subscription.subscriptionTierType": tier.tierType,
        "subscription.subscriptionPrice":
          parseFloat(tier.discountedPrice || "0") *
          parseInt(durationMonths || "1"),
        "subscription.subscriptionPaymentId": session.id,
        "subscription.subscriptionRenewalPrice":
          parseFloat(tier.renewalPrice || "0") *
          parseInt(durationMonths || "1"),
      },
    },
    { new: true }
  );

  if (!updatedUser) {
    return NextResponse.json(
      { success: false, message: "User not found" },
      { status: 404 }
    );
  }

  // Create transaction record
  const transaction = new Transaction({
    type: "subscription_payment",
    userId,
    amount,
    currency: session.currency || "usd",
    paymentGateway: "stripe",
    gatewayTransactionId: session.id,
    status: "completed",
    metadata: {
      tierId,
      tierType: tier.tierType,
      durationMonths: parseInt(durationMonths || "1"),
      subscriptionPlan: tier.name,
    },
  });
  await transaction.save();

  return NextResponse.json({
    success: true,
    message: "Subscription created successfully",
  });
}
