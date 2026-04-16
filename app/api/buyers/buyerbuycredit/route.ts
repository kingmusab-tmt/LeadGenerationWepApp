import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Buyer } from "@/models/leadbuyers";
import { User } from "@/models";
import { decryptData } from "@/lib/encryption"; // Implement decryption utility
import {
  badRequest,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

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
      return unauthorized("Authentication required");
    }

    // Parse the request body
    const { units, cost, paymentMethod } = await req.json();

    // Get buyer details
    const buyer = await Buyer.findById(session.user.id);
    if (!buyer || !buyer.registeredWith) {
      return notFound("Buyer", "Buyer or registered seller not found");
    }

    // Fetch lead seller details from User model
    const leadSeller = await User.findById(buyer.registeredWith);
    if (!leadSeller) {
      return notFound("Seller", "Lead seller not found");
    }

    // Handle Stripe payment
    if (paymentMethod === "stripe") {
      const encryptedStripeSecretKey = leadSeller.creditSetup?.stripeSecretKey;
      if (!encryptedStripeSecretKey) {
        return badRequest("Stripe payment is not available for this seller");
      }

      // Decrypt the Stripe secret key
      let stripeSecretKey: string;
      try {
        stripeSecretKey = decryptData(encryptedStripeSecretKey);
      } catch (error) {
        console.error("Failed to decrypt Stripe secret key:", error);
        return internalError(
          "Payment configuration error. Please contact the seller.",
        );
      }

      // Initialize Stripe with the seller's secret key
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2025-12-15.clover",
      });

      // Create a payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: cost * 100, // Convert to cents
        currency: "usd",
        payment_method: paymentMethod,
        confirm: true,
      });

      if (paymentIntent.status !== "succeeded") {
        return badRequest("Stripe payment failed");
      }
    }

    // Unsupported payment method
    else {
      return badRequest("Unsupported payment method");
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
    return internalError("Internal server error");
  }
}
