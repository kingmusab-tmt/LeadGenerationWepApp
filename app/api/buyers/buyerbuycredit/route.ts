import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Buyer } from "@/models/leadbuyers";
import { User } from "@/models/user";
import { decryptData } from "@/lib/encryption"; // Implement decryption utility

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // Authenticate the user
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !session.user ||
      !session.user.id ||
      session.user.role !== "buyer"
    ) {
      // Check if the user is authenticated
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse the request body
    const { units, cost, paymentMethod, paypalOrderId } = await req.json();

    // Get buyer details
    const buyer = await Buyer.findById(session.user.id);
    if (!buyer || !buyer.registeredWith) {
      return NextResponse.json(
        { success: false, message: "Buyer or registered seller not found" },
        { status: 404 }
      );
    }

    // Fetch lead seller details from User model
    const leadSeller = await User.findById(buyer.registeredWith);
    if (!leadSeller) {
      return NextResponse.json(
        { success: false, message: "Lead seller not found" },
        { status: 404 }
      );
    }

    // Handle Stripe payment
    if (paymentMethod === "stripe") {
      const encryptedStripeSecretKey = leadSeller.creditSetup?.stripeSecretKey;
      if (!encryptedStripeSecretKey) {
        return NextResponse.json(
          {
            success: false,
            message: "Stripe payment is not available for this seller",
          },
          { status: 400 }
        );
      }

      // Decrypt the Stripe secret key
      const stripeSecretKey = decryptData(encryptedStripeSecretKey);

      // Initialize Stripe with the seller's secret key
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2025-02-24.acacia",
      });

      // Create a payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: cost * 100, // Convert to cents
        currency: "usd",
        payment_method: paymentMethod,
        confirm: true,
      });

      if (paymentIntent.status !== "succeeded") {
        return NextResponse.json(
          { success: false, message: "Stripe payment failed" },
          { status: 400 }
        );
      }
    }

    // Handle PayPal payment
    else if (paymentMethod === "paypal") {
      const encryptedPaypalAccessToken =
        leadSeller.creditSetup?.paypalAccessToken;
      if (!encryptedPaypalAccessToken) {
        return NextResponse.json(
          {
            success: false,
            message: "PayPal payment is not available for this seller",
          },
          { status: 400 }
        );
      }

      // Decrypt the PayPal access token
      const paypalAccessToken = decryptData(encryptedPaypalAccessToken);

      // Verify the PayPal order
      const verifyResponse = await fetch(
        `https://api-m.paypal.com/v2/checkout/orders/${paypalOrderId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${paypalAccessToken}`,
          },
        }
      );

      const verifyData = await verifyResponse.json();
      if (verifyData.status !== "COMPLETED") {
        return NextResponse.json(
          { success: false, message: "PayPal payment not completed" },
          { status: 400 }
        );
      }
    }

    // Unsupported payment method
    else {
      return NextResponse.json(
        { success: false, message: "Unsupported payment method" },
        { status: 400 }
      );
    }

    // Update the buyer's wallet
    buyer.walletBalance = (buyer.walletBalance || 0) + units;
    await buyer.save();

    return NextResponse.json({
      success: true,
      message: "Payment successful. Wallet updated.",
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
