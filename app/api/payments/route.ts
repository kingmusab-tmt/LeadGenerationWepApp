import Stripe from "stripe";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user";
import { Buyer } from "@/models/leadbuyers";
import { NextRequest, NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { sellerId, buyerId } = await req.json();

    const seller = await User.findById(sellerId);
    if (!seller)
      return new NextResponse(JSON.stringify({ error: "Seller not found" }), {
        status: 404,
      });

    const buyer = await Buyer.findById(buyerId);
    if (!buyer)
      return new NextResponse(JSON.stringify({ error: "Buyer not found" }), {
        status: 404,
      });

    // Create Payment Intent with Dynamic Amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount: seller.unitPricingOptions[0].cost * 100, // Convert to cents
      currency: "usd",
      metadata: { buyerId },
    });

    return new NextResponse(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { status: 200 }
    );
  } catch (error) {
    return new NextResponse(JSON.stringify({ error: "Payment failed" }), {
      status: 500,
    });
  }
}
