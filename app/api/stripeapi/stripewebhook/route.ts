// import { NextRequest, NextResponse } from "next/server";
// import Stripe from "stripe";
// import dbConnect from "@/lib/connectdb";
// import { Buyer } from "@/models/leadbuyers";
// import { ObjectId } from "mongodb";
// import { User } from "@/models/user";
// import { Transaction } from "@/models/transactions";
// import { Tier } from "@/models/tier";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: "2025-02-24.acacia",
// });

// type PurchaseType = "credits" | "subscription";

// interface Metadata {
//   purchaseType: PurchaseType;
//   userId: string;
//   units?: string;
//   tierId?: string;
//   durationMonths?: string;
// }

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
//     return NextResponse.json(
//       { success: false, message: "Webhook signature verification failed" },
//       { status: 400 }
//     );
//   }

//   try {
//     await dbConnect();

//     switch (event.type) {
//       case "account.updated":
//         const account = event.data.object;

//         if (account.tos_acceptance?.date) {
//           await User.findOneAndUpdate(
//             { stripeAccountId: account.id },
//             {
//               "tosAcceptance.accepted": true,
//               "tosAcceptance.acceptedAt": new Date(
//                 account.tos_acceptance.date * 1000
//               ),
//               "tosAcceptance.ipAddress": account.tos_acceptance.ip || "unknown",
//             }
//           );
//         }
//         // Update user in database
//         await User.findOneAndUpdate(
//           { stripeAccountId: account.id },
//           {
//             stripeOnboarded: account.details_submitted,
//             $set: {
//               "stripeDetails.chargesEnabled": account.charges_enabled,
//               "stripeDetails.payoutsEnabled": account.payouts_enabled,
//               "stripeDetails.requirements": account.requirements,
//             },
//           }
//         );
//         break;

//       case "checkout.session.completed":
//         const session = event.data.object as Stripe.Checkout.Session;
//         return await handleCheckoutSessionCompleted(session);

//       default:
//         return NextResponse.json({ received: true });
//     }
//   } catch (error: any) {
//     return NextResponse.json(
//       {
//         success: false,
//         message: "Internal server error",
//         error:
//           process.env.NODE_ENV === "development" ? error.message : undefined,
//       },
//       { status: 500 }
//     );
//   }
// }

// async function handleCheckoutSessionCompleted(
//   session: Stripe.Checkout.Session
// ) {
//   const metadata = session.metadata
//     ? (session.metadata as unknown as Metadata)
//     : null;
//   if (!metadata?.purchaseType || !metadata?.userId) {
//     return NextResponse.json(
//       { success: false, message: "Missing required metadata" },
//       { status: 400 }
//     );
//   }

//   if (metadata.purchaseType === "credits") {
//     return await handleCreditsPurchase(session, metadata);
//   } else if (metadata.purchaseType === "subscription") {
//     return await handleSubscriptionPurchase(session, metadata);
//   }

//   return NextResponse.json(
//     { success: false, message: "Unknown purchase type" },
//     { status: 400 }
//   );
// }

// async function handleCreditsPurchase(
//   session: Stripe.Checkout.Session,
//   metadata: Metadata
// ) {
//   const units = parseInt(metadata.units || "0");
//   const amount = session.amount_total ? session.amount_total / 100 : 0;
//   const userId = metadata.userId;
//   const email = session.customer_details?.email;

//   if (!email) {
//     return NextResponse.json(
//       { success: false, message: "Customer email not found" },
//       { status: 400 }
//     );
//   }

//   if (!units || !amount || !userId) {
//     return NextResponse.json(
//       { success: false, message: "Missing required data for credits purchase" },
//       { status: 400 }
//     );
//   }

//   // Find the buyer by user ID
//   const buyer = await Buyer.findOne({ email: email });
//   if (!buyer) {
//     return NextResponse.json(
//       { success: false, message: "Buyer not found" },
//       { status: 404 }
//     );
//   }

//   // Update buyer's wallet
//   await Buyer.findByIdAndUpdate(
//     buyer._id,
//     { $inc: { walletUnit: units } },
//     { new: true }
//   );

//   // Create transaction record
//   const transaction = new Transaction({
//     type: "units_purchase",
//     userId: buyer._id,
//     amount,
//     currency: session.currency || "usd",
//     previousBalance: buyer.walletUnit,
//     currentBalance: buyer.walletUnit + units,
//     paymentGateway: "stripe",
//     gatewayTransactionId: session.id,
//     status: "completed",
//     metadata: {
//       sellerId: buyer.registeredWith,
//       unitsPurchased: units,
//     },
//   });
//   await transaction.save();
//   // Update lead seller's balance if applicable
//   if (buyer.registeredWith) {
//     const leadSeller = await User.findByIdAndUpdate(
//       buyer.registeredWith,
//       { $inc: { walletBalance: amount } },
//       { new: true }
//     );

//     if (leadSeller) {
//       const sellerTransaction = new Transaction({
//         type: "seller_income",
//         userId: buyer.registeredWith,
//         amount,
//         currency: session.currency || "usd",
//         previousBalance: leadSeller.walletBalance - amount,
//         currentBalance: leadSeller.walletBalance,
//         paymentGateway: "stripe",
//         gatewayTransactionId: session.id,
//         status: "completed",
//         metadata: {
//           buyerId: buyer._id,
//           unitsPurchased: units,
//         },
//       });
//       await sellerTransaction.save();
//     }
//   }

//   return NextResponse.json({
//     success: true,
//     message: "Credits purchase processed successfully",
//   });
// }

// async function handleSubscriptionPurchase(
//   session: Stripe.Checkout.Session,
//   metadata: Metadata
// ) {
//   const { tierId, userId, durationMonths } = metadata;
//   const amount = session.amount_total ? session.amount_total / 100 : 0;

//   if (!tierId || !userId) {
//     return NextResponse.json(
//       { success: false, message: "Missing required data for subscription" },
//       { status: 400 }
//     );
//   }

//   const tier = await Tier.findById(tierId);
//   if (!tier) {
//     return NextResponse.json(
//       { success: false, message: "Tier not found" },
//       { status: 404 }
//     );
//   }

//   // Calculate subscription dates
//   const startDate = new Date();
//   const expiryDate = new Date(startDate);
//   expiryDate.setMonth(expiryDate.getMonth() + parseInt(durationMonths || "1"));

//   // Update user's subscription
//   const updatedUser = await User.findByIdAndUpdate(
//     userId,
//     {
//       $set: {
//         "subscription.subscriptionPlan": tier.name,
//         "subscription.subscriptionStartDate": startDate,
//         "subscription.subscriptionExpiryDate": expiryDate,
//         "subscription.isSubscriptionActive": true,
//         "subscription.isTrial": false,
//         "subscription.subscriptionPaymentMethod": "stripe",
//         "subscription.subscriptionTierId": tierId,
//         "subscription.subscriptionTierType": tier.tierType,
//         "subscription.subscriptionPrice":
//           parseFloat(tier.discountedPrice || "0") *
//           parseInt(durationMonths || "1"),
//         "subscription.subscriptionPaymentId": session.id,
//         "subscription.subscriptionRenewalPrice":
//           parseFloat(tier.renewalPrice || "0") *
//           parseInt(durationMonths || "1"),
//       },
//     },
//     { new: true }
//   );

//   if (!updatedUser) {
//     return NextResponse.json(
//       { success: false, message: "User not found" },
//       { status: 404 }
//     );
//   }

//   // Create transaction record
//   const transaction = new Transaction({
//     type: "subscription_payment",
//     userId,
//     amount,
//     currency: session.currency || "usd",
//     paymentGateway: "stripe",
//     gatewayTransactionId: session.id,
//     status: "completed",
//     metadata: {
//       tierId,
//       tierType: tier.tierType,
//       durationMonths: parseInt(durationMonths || "1"),
//       subscriptionPlan: tier.name,
//     },
//   });
//   await transaction.save();

//   return NextResponse.json({
//     success: true,
//     message: "Subscription created successfully",
//   });
// }
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
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
  sellerId?: string;
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
    return NextResponse.json(
      { success: false, message: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    await dbConnect();

    switch (event.type as string) {
      case "account.updated":
        const account = event.data.object;
        // Ensure the object is a Stripe.Account before calling the handler
        if (
          account &&
          typeof account === "object" &&
          "charges_enabled" in account &&
          "details_submitted" in account &&
          "payouts_enabled" in account &&
          "type" in account &&
          account.type === "custom"
        ) {
          await handleAccountUpdated(account as Stripe.Account);
        }
        break;

      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        return await handleCheckoutSessionCompleted(session);

      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        // Ensure the object is a PaymentIntent before calling the handler
        if (
          paymentIntent &&
          typeof paymentIntent === "object" &&
          "object" in paymentIntent &&
          paymentIntent.object === "payment_intent"
        ) {
          await verifyPaymentIntent(paymentIntent as Stripe.PaymentIntent);
        }
        break;

      case "transfer.created":
      case "transfer.paid":
        const transfer = event.data.object;
        // Type guard to ensure transfer is a Stripe.Transfer
        if (
          transfer &&
          typeof transfer === "object" &&
          "object" in transfer &&
          transfer.object === "transfer" &&
          "destination" in transfer &&
          "status" in transfer &&
          "id" in transfer &&
          "created" in transfer
        ) {
          await handleTransferEvent(transfer as Stripe.Transfer, event.type);
        }
        break;

      default:
        return NextResponse.json({ received: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
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

async function handleAccountUpdated(account: Stripe.Account) {
  if (account.tos_acceptance?.date) {
    await User.findOneAndUpdate(
      { stripeAccountId: account.id },
      {
        "tosAcceptance.accepted": true,
        "tosAcceptance.acceptedAt": new Date(
          account.tos_acceptance.date * 1000
        ),
        "tosAcceptance.ipAddress": account.tos_acceptance.ip || "unknown",
      }
    );
  }

  await User.findOneAndUpdate(
    { stripeAccountId: account.id },
    {
      stripeOnboarded: account.details_submitted,
      $set: {
        "stripeDetails.chargesEnabled": account.charges_enabled,
        "stripeDetails.payoutsEnabled": account.payouts_enabled,
        "stripeDetails.requirements": account.requirements,
      },
    }
  );
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const metadata = session.metadata
    ? (session.metadata as unknown as Metadata)
    : null;

  if (!metadata?.purchaseType || !metadata?.userId) {
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

async function verifyPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  // Only process if this is a direct charge (not a transfer)
  if (paymentIntent.transfer_data?.destination) {
    const sellerAccountId = paymentIntent.transfer_data.destination;
    const amount = paymentIntent.amount_received
      ? paymentIntent.amount_received / 100
      : 0;

    // Verify the payment landed in seller's account
    await Transaction.findOneAndUpdate(
      { gatewayTransactionId: paymentIntent.id },
      {
        $set: {
          "metadata.transferVerified": true,
          "metadata.sellerAccountId": sellerAccountId,
          "metadata.transferAmount": amount,
        },
      }
    );
  }
}

async function handleTransferEvent(
  transfer: Stripe.Transfer,
  eventType: string
) {
  // Verify transfers to seller accounts
  const transaction = await Transaction.findOneAndUpdate(
    {
      "metadata.sellerAccountId": transfer.destination,
      "metadata.transferVerified": { $ne: true },
    },
    {
      $set: {
        "metadata.transferId": transfer.id,
        "metadata.transferStatus": eventType, // e.g., "transfer.paid" or "transfer.created"
        "metadata.transferVerified": true,
        "metadata.transferDate": new Date(transfer.created * 1000),
      },
    },
    { new: true }
  );

  if (transaction) {
    // Update seller's balance if the transfer is confirmed
    // Stripe.Transfer may not have a 'status' property in all versions; assume transfer is paid if eventType is 'transfer.paid'
    if (eventType === "transfer.paid") {
      const sellerId = transaction.metadata?.sellerId;
      if (sellerId) {
        await User.findByIdAndUpdate(
          sellerId,
          { $inc: { walletBalance: transaction.amount } },
          { new: true }
        );
      }
    }
  }
}

async function handleCreditsPurchase(
  session: Stripe.Checkout.Session,
  metadata: Metadata
) {
  const units = parseInt(metadata.units || "0");
  const amount = session.amount_total ? session.amount_total / 100 : 0;
  const userId = metadata.userId;
  const sellerId = metadata.sellerId;
  const email = session.customer_details?.email;

  if (!email) {
    return NextResponse.json(
      { success: false, message: "Customer email not found" },
      { status: 400 }
    );
  }

  if (!units || !amount || !userId || !sellerId) {
    return NextResponse.json(
      { success: false, message: "Missing required data for credits purchase" },
      { status: 400 }
    );
  }

  // Find the buyer and seller
  const [buyer, seller] = await Promise.all([
    Buyer.findOne({ email }),
    User.findById(sellerId),
  ]);

  if (!buyer) {
    return NextResponse.json(
      { success: false, message: "Buyer not found" },
      { status: 404 }
    );
  }

  if (!seller) {
    return NextResponse.json(
      { success: false, message: "Seller not found" },
      { status: 404 }
    );
  }

  // Update buyer's wallet
  await Buyer.findByIdAndUpdate(
    buyer._id,
    { $inc: { walletUnit: units } },
    { new: true }
  );

  // Create transaction record (initially unverified)
  const transaction = new Transaction({
    type: "units_purchase",
    userId: buyer._id,
    amount,
    currency: session.currency || "usd",
    previousBalance: buyer.walletUnit,
    currentBalance: buyer.walletUnit + units,
    paymentGateway: "stripe",
    gatewayTransactionId: session.payment_intent?.toString() || session.id,
    status: "completed",
    metadata: {
      sellerId,
      sellerAccountId: seller.stripeAccountId,
      unitsPurchased: units,
      checkoutSessionId: session.id,
      transferVerified: false,
    },
  });
  await transaction.save();

  return NextResponse.json({
    success: true,
    message: "Credits purchase Successfully processed",
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

  const [tier, user] = await Promise.all([
    Tier.findById(tierId),
    User.findById(userId),
  ]);

  if (!tier) {
    return NextResponse.json(
      { success: false, message: "Tier not found" },
      { status: 404 }
    );
  }

  if (!user) {
    return NextResponse.json(
      { success: false, message: "User not found" },
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

  // Create transaction record
  const transaction = new Transaction({
    type: "subscription_payment",
    userId,
    amount,
    currency: session.currency || "usd",
    paymentGateway: "stripe",
    gatewayTransactionId: session.payment_intent?.toString() || session.id,
    status: "completed", // Platform payments are trusted immediately
    metadata: {
      tierId,
      tierType: tier.tierType,
      durationMonths: parseInt(durationMonths || "1"),
      subscriptionPlan: tier.name,
      isPlatformPayment: true,
    },
  });
  await transaction.save();

  return NextResponse.json({
    success: true,
    message: "Subscription created successfully",
  });
}
