import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers"; // Import your LeadBuyer model
import { User } from "@/models"; // Import your User model
import { Transaction } from "@/models/transactions";
import { generatePayPalAccessToken } from "@/utils/paypalaccesstoken";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headers = req.headers;

  try {
    const paypalAccessToken = await generatePayPalAccessToken();

    // Verify the webhook signature
    const response = await axios.post(
      `https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature`,
      {
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(body),
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${paypalAccessToken}`,
        },
      },
    );

    if (response.data.verification_status !== "SUCCESS") {
      return NextResponse.json(
        { success: false, message: "Webhook signature verification failed" },
        { status: 400 },
      );
    }

    const event = JSON.parse(body);

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const email = event.resource.payer.email_address; // Get the buyer's email from the event
      const amountPaid = parseFloat(event.resource.amount.value); // Total amount paid
      const unitsPurchased = parseInt(event.resource.custom_id); // Number of units purchased

      if (!email || !unitsPurchased) {
        console.error("Invalid event data:", event);
        return NextResponse.json(
          { success: false, message: "Invalid event data" },
          { status: 400 },
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
            { status: 404 },
          );
        }

        // Update the buyer's wallet with the exact units purchased
        await Buyer.findByIdAndUpdate(
          buyer._id,
          { $inc: { walletUnit: unitsPurchased } },
          { new: true },
        );

        // Create a credits_purchase transaction
        const creditsPurchaseTransaction = new Transaction({
          type: "credits_purchase",
          userId: buyer._id, // Buyer's ID
          amount: amountPaid,
          currency: "USD",
          metadata: {
            creditsPurchased: unitsPurchased,
          },
          paymentGateway: "paypal",
          gatewayTransactionId: event.resource.id, // PayPal transaction ID
          status: "completed",
        });
        await creditsPurchaseTransaction.save();

        // Get the lead seller's ID from the buyer's registeredWith field
        const leadSellerId = buyer.registeredWith;

        if (!leadSellerId) {
          console.error("Lead seller not found for buyer:", buyer);
          return NextResponse.json(
            { success: false, message: "Lead seller not found for this buyer" },
            { status: 404 },
          );
        }

        // Find the lead seller and update their balance
        const leadSeller = await User.findByIdAndUpdate(
          leadSellerId,
          { $inc: { walletBalance: amountPaid } },
          { new: true },
        );

        if (!leadSeller) {
          console.error("Lead seller not found for ID:", leadSellerId);
          return NextResponse.json(
            { success: false, message: "Lead seller not found" },
            { status: 404 },
          );
        }

        // Create a seller_income transaction
        const sellerIncomeTransaction = new Transaction({
          type: "seller_income",
          userId: leadSellerId, // Seller's ID
          amount: amountPaid,
          currency: "USD",
          metadata: {
            sellerId: leadSellerId, // Seller's ID
            creditsPurchased: unitsPurchased, // Credits purchased by the buyer
          },
          paymentGateway: "paypal",
          gatewayTransactionId: event.resource.id, // PayPal transaction ID
          status: "completed",
        });
        await sellerIncomeTransaction.save();

        //("Lead seller balance updated successfully:", leadSeller);
        return NextResponse.json({
          success: true,
          message: "Lead seller balance updated successfully",
          leadSeller,
        });
      } catch (error) {
        console.error("Error updating lead seller balance:", error);
        return NextResponse.json(
          { success: false, message: "Internal server error" },
          { status: 500 },
        );
      }
    }

    //("Received unhandled event type:", event.event_type);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing PayPal webhook:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
