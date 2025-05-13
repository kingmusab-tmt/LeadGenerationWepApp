// import { NextRequest, NextResponse } from "next/server";
// import Stripe from "stripe";
// import dbConnect from "@/lib/connectdb";
// import { Buyer } from "@/models/leadbuyers"; // Import your LeadBuyer model
// import { User } from "@/models/user"; // Import your User model
// import { Transaction } from "@/models/transactions";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: "2025-02-24.acacia",
// });

// export async function POST(req: NextRequest) {
//   const body = await req.text();
//   const signature = req.headers.get("stripe-signature")!;

//   let event: Stripe.Event;

//   try {
//     event = stripe.webhooks.constructEvent(
//       body,
//       signature,
//       process.env.STRIPE_WEBHOOK_SECRET!
//     );
//   } catch (error) {
//     console.error("Webhook signature verification failed:", error);
//     return NextResponse.json(
//       { success: false, message: "Webhook signature verification failed" },
//       { status: 400 }
//     );
//   }

//   if (event.type === "checkout.session.completed") {
//     const session = event.data.object as Stripe.Checkout.Session;

//     // Use customer_details.email instead of customer_email
//     const email = session.customer_details?.email; // Buyer's email
//     const amountPaid = session.amount_total! / 100; // Total amount paid
//     const unitsPurchased = parseInt(session?.metadata?.units || "0"); // Number of units purchased

//     if (!email) {
//       console.error("Customer email not found in session:", session);
//       return NextResponse.json(
//         { success: false, message: "Customer email not found" },
//         { status: 400 }
//       );
//     }

//     try {
//       await dbConnect(); // Connect to the database

//       // Find the buyer by email
//       const buyer = await Buyer.findOne({ email });

//       if (!buyer) {
//         console.error("Buyer not found for email:", email);
//         return NextResponse.json(
//           { success: false, message: "Buyer not found" },
//           { status: 404 }
//         );
//       }

//       // Update the buyer's wallet with the exact units purchased
//       await Buyer.findByIdAndUpdate(
//         buyer._id,
//         { $inc: { walletUnit: unitsPurchased } },
//         { new: true }
//       );

//       // Create a credits_purchase transaction
//       const creditsPurchaseTransaction = new Transaction({
//         type: "units_purchase",
//         userId: buyer._id, // Buyer's ID
//         amount: amountPaid,
//         currency: "USD",
//         previousBalance: buyer.walletUnit,
//         currentBalance: buyer.walletUnit + unitsPurchased,
//         metadata: {
//           sellerId: buyer.registeredWith, // Seller's ID
//           unitsPurchased: unitsPurchased,
//         },
//         paymentGateway: "stripe",
//         gatewayTransactionId: session.id,
//         status: "completed",
//       });
//       await creditsPurchaseTransaction.save();

//       // Get the lead seller's ID from the buyer's registeredWith field
//       const leadSellerId = buyer.registeredWith;

//       if (!leadSellerId) {
//         console.error("Lead seller not found for buyer:", buyer);
//         return NextResponse.json(
//           { success: false, message: "Lead seller not found for this buyer" },
//           { status: 404 }
//         );
//       }

//       // Find the lead seller and update their balance
//       const leadSeller = await User.findByIdAndUpdate(
//         leadSellerId,
//         { $inc: { walletBalance: amountPaid } },
//         { new: true }
//       );

//       if (!leadSeller) {
//         console.error("Lead seller not found for ID:", leadSellerId);
//         return NextResponse.json(
//           { success: false, message: "Lead seller not found" },
//           { status: 404 }
//         );
//       }

//       // Create a seller_income transaction
//       const sellerIncomeTransaction = new Transaction({
//         type: "seller_income",
//         userId: leadSellerId, // Seller's ID
//         amount: amountPaid,
//         currency: "USD",
//         previousBalance: leadSeller.walletBalance,
//         currentBalance: leadSeller.walletBalance + amountPaid,
//         metadata: {
//           buyerId: buyer._id, // Seller's ID
//           unitsPurchased, // Credits purchased by the buyer
//         },
//         paymentGateway: "stripe",
//         gatewayTransactionId: session.id,
//         status: "completed",
//       });
//       await sellerIncomeTransaction.save();

//       console.log("Lead seller balance updated successfully:", leadSeller);
//       return NextResponse.json({
//         success: true,
//         message: "Lead seller balance updated successfully",
//         leadSeller,
//       });
//     } catch (error) {
//       console.error("Error updating lead seller balance:", error);
//       return NextResponse.json(
//         { success: false, message: "Internal server error" },
//         { status: 500 }
//       );
//     }
//   }

//   console.log("Received unhandled event type:", event.type);
//   return NextResponse.json({ received: true });
// }
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
type TransactionType = "units_purchase" | "subscription_payment";
type TransactionStatus = "pending" | "completed" | "failed" | "refunded";

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

      case "invoice.payment_succeeded":
        // Handle subscription renewal payments
        const invoice = event.data.object as Stripe.Invoice;
        return await handleInvoicePaymentSucceeded(invoice);

      case "invoice.payment_failed":
        // Handle failed subscription payments
        const failedInvoice = event.data.object as Stripe.Invoice;
        return await handleInvoicePaymentFailed(failedInvoice);

      case "customer.subscription.deleted":
        // Handle subscription cancellations
        const subscription = event.data.object as Stripe.Subscription;
        return await handleSubscriptionDeleted(subscription);

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
  const updatedBuyer = await Buyer.findByIdAndUpdate(
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
        "subscription.subscriptionPrice": parseFloat(
          tier.discountedPrice || "0"
        ),
        "subscription.subscriptionPaymentId": session.id,
        "subscription.subscriptionRenewalPrice": parseFloat(
          tier.renewalPrice || "0"
        ),
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

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Handle subscription renewal payments
  const subscriptionId = invoice.subscription as string;
  const amount = invoice.amount_paid / 100;
  const currency = invoice.currency;

  // Retrieve the subscription to get metadata
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const metadata = subscription.metadata as unknown as Metadata;

  if (!metadata?.userId || !metadata?.tierId) {
    return NextResponse.json(
      { success: false, message: "Missing required metadata in subscription" },
      { status: 400 }
    );
  }

  // Update user's subscription expiry date
  const periodEnd = new Date(subscription.current_period_end * 1000);
  await User.findByIdAndUpdate(metadata.userId, {
    $set: {
      "subscription.subscriptionExpiryDate": periodEnd,
      "subscription.isSubscriptionActive": true,
    },
  });

  // Create renewal transaction
  const renewalTransaction = new Transaction({
    type: "subscription_renewal",
    userId: metadata.userId,
    amount,
    currency,
    paymentGateway: "stripe",
    gatewayTransactionId: invoice.id,
    status: "completed",
    metadata: {
      tierId: metadata.tierId,
      subscriptionId,
      periodStart: new Date(subscription.current_period_start * 1000),
      periodEnd,
    },
  });
  await renewalTransaction.save();

  return NextResponse.json({
    success: true,
    message: "Subscription renewal processed",
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Handle failed subscription payments
  const subscriptionId = invoice.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const metadata = subscription.metadata as unknown as Metadata;

  if (metadata?.userId) {
    // Mark subscription as inactive in your database
    await User.findByIdAndUpdate(metadata.userId, {
      $set: {
        "subscription.isSubscriptionActive": false,
      },
    });

    // Create failed payment transaction
    const failedTransaction = new Transaction({
      type: "subscription_renewal",
      userId: metadata.userId,
      amount: invoice.amount_due / 100,
      currency: invoice.currency,
      paymentGateway: "stripe",
      gatewayTransactionId: invoice.id,
      status: "failed",
      metadata: {
        tierId: metadata.tierId,
        subscriptionId,
        failureReason: invoice.last_finalization_error?.message || "Unknown",
      },
    });
    await failedTransaction.save();
  }

  return NextResponse.json({
    success: true,
    message: "Subscription payment failure handled",
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Handle subscription cancellations
  const metadata = subscription.metadata as unknown as Metadata;

  if (metadata?.userId) {
    // Mark subscription as cancelled in your database
    await User.findByIdAndUpdate(metadata.userId, {
      $set: {
        "subscription.isSubscriptionActive": false,
        "subscription.cancellationDate": new Date(),
      },
    });

    // Create cancellation transaction
    const cancellationTransaction = new Transaction({
      type: "subscription_cancellation",
      userId: metadata.userId,
      paymentGateway: "stripe",
      gatewayTransactionId: subscription.id,
      status: "completed",
      metadata: {
        tierId: metadata.tierId,
        cancellationReason: subscription.cancellation_details?.reason || "user",
      },
    });
    await cancellationTransaction.save();
  }

  return NextResponse.json({
    success: true,
    message: "Subscription cancellation processed",
  });
}
