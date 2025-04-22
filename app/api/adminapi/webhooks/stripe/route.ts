import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { User } from "@/models/user";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice
        );
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Error handling webhook:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await User.updateOne(
    { stripeCustomerId: invoice.customer as string },
    {
      $set: {
        "subscription.renewalDate": new Date(
          subscription.current_period_end * 1000
        ),
        "subscription.status": "active",
      },
    }
  );
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  if (subscription.status === "active" || subscription.status === "past_due") {
    await User.updateOne(
      { stripeCustomerId: subscription.customer as string },
      {
        $set: {
          "subscription.status":
            subscription.status === "active" ? "active" : "pending",
          "subscription.renewalDate": new Date(
            subscription.current_period_end * 1000
          ),
        },
      }
    );
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await User.updateOne(
    { stripeCustomerId: subscription.customer as string },
    {
      $set: {
        "subscription.status": "canceled",
        "subscription.endDate": new Date(),
      },
    }
  );
}
