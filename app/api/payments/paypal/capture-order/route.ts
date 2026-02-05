import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { generatePayPalAccessToken } from "@/utils/paypalaccesstoken";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Transaction } from "@/models/transactions";
import { User } from "@/models";

export async function POST(req: NextRequest) {
  const { orderId, units, cost, userId } = await req.json();

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    const email = session.user.email;

    const paypalAccessToken = await generatePayPalAccessToken();

    const response = await axios.post(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${paypalAccessToken}`,
        },
      },
    );

    if (response.data.status === "COMPLETED") {
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
        { $inc: { walletUnit: units } },
        { new: true },
      );

      // Create a credits_purchase transaction
      const creditsPurchaseTransaction = new Transaction({
        type: "units_purchase",
        userId: buyer._id, // Buyer's ID
        amount: cost,
        currency: "USD",
        previousBalance: buyer.walletUnit,
        currentBalance: buyer.walletUnit + units,
        metadata: {
          sellerId: buyer.registeredWith, // Seller's ID
          unitsPurchased: units,
        },
        paymentGateway: "paypal",
        gatewayTransactionId: orderId, // PayPal transaction ID
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
        { $inc: { walletBalance: cost } },
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
        amount: cost,
        currency: "USD",
        previousBalance: leadSeller.walletBalance,
        currentBalance: leadSeller.walletBalance + cost,
        metadata: {
          buyerId: buyer._id,
          unitsPurchased: units, // Credits purchased by the buyer
        },
        paymentGateway: "paypal",
        gatewayTransactionId: orderId, // PayPal transaction ID
        status: "completed",
      });
      await sellerIncomeTransaction.save();

      //("Lead seller balance updated successfully:", leadSeller);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Payment not completed",
          details: response.data,
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error capturing PayPal order:", error);

    let errorMessage = "Internal server error";
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.message || error.message;
      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
          details: error.response?.data,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 },
    );
  }
}
