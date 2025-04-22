import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers"; // Import your LeadBuyer model
import { User } from "@/models/user"; // Import your User model
import { Transaction } from "@/models/transactions";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Use customer_details.email instead of customer_email
    const email = session.customer_details?.email; // Buyer's email
    const amountPaid = session.amount_total! / 100; // Total amount paid
    const unitsPurchased = parseInt(session?.metadata?.units || "0"); // Number of units purchased

    if (!email) {
      console.error("Customer email not found in session:", session);
      return NextResponse.json(
        { success: false, message: "Customer email not found" },
        { status: 400 }
      );
    }

    try {
      await dbConnect(); // Connect to the database

      // Find the buyer by email
      const buyer = await Buyer.findOne({ email });

      if (!buyer) {
        console.error("Buyer not found for email:", email);
        return NextResponse.json(
          { success: false, message: "Buyer not found" },
          { status: 404 }
        );
      }

      // Update the buyer's wallet with the exact units purchased
      await Buyer.findByIdAndUpdate(
        buyer._id,
        { $inc: { walletUnit: unitsPurchased } },
        { new: true }
      );

      // Create a credits_purchase transaction
      const creditsPurchaseTransaction = new Transaction({
        type: "units_purchase",
        userId: buyer._id, // Buyer's ID
        amount: amountPaid,
        currency: "USD",
        previousBalance: buyer.walletUnit,
        currentBalance: buyer.walletUnit + unitsPurchased,
        metadata: {
          sellerId: buyer.registeredWith, // Seller's ID
          unitsPurchased: unitsPurchased,
        },
        paymentGateway: "stripe",
        gatewayTransactionId: session.id,
        status: "completed",
      });
      await creditsPurchaseTransaction.save();

      // Get the lead seller's ID from the buyer's registeredWith field
      const leadSellerId = buyer.registeredWith;

      if (!leadSellerId) {
        console.error("Lead seller not found for buyer:", buyer);
        return NextResponse.json(
          { success: false, message: "Lead seller not found for this buyer" },
          { status: 404 }
        );
      }

      // Find the lead seller and update their balance
      const leadSeller = await User.findByIdAndUpdate(
        leadSellerId,
        { $inc: { walletBalance: amountPaid } },
        { new: true }
      );

      if (!leadSeller) {
        console.error("Lead seller not found for ID:", leadSellerId);
        return NextResponse.json(
          { success: false, message: "Lead seller not found" },
          { status: 404 }
        );
      }

      // Create a seller_income transaction
      const sellerIncomeTransaction = new Transaction({
        type: "seller_income",
        userId: leadSellerId, // Seller's ID
        amount: amountPaid,
        currency: "USD",
        previousBalance: leadSeller.walletBalance,
        currentBalance: leadSeller.walletBalance + amountPaid,
        metadata: {
          buyerId: buyer._id, // Seller's ID
          unitsPurchased, // Credits purchased by the buyer
        },
        paymentGateway: "stripe",
        gatewayTransactionId: session.id,
        status: "completed",
      });
      await sellerIncomeTransaction.save();

      console.log("Lead seller balance updated successfully:", leadSeller);
      return NextResponse.json({
        success: true,
        message: "Lead seller balance updated successfully",
        leadSeller,
      });
    } catch (error) {
      console.error("Error updating lead seller balance:", error);
      return NextResponse.json(
        { success: false, message: "Internal server error" },
        { status: 500 }
      );
    }
  }

  console.log("Received unhandled event type:", event.type);
  return NextResponse.json({ received: true });
}
