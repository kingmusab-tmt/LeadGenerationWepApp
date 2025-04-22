import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { generatePayPalAccessToken } from "@/utils/paypalaccesstoken";

export async function POST(req: NextRequest) {
  const { sellerEmail, amount } = await req.json();

  try {
    const paypalAccessToken = await generatePayPalAccessToken();

    const payout = await axios.post(
      "https://api-m.sandbox.paypal.com/v1/payments/payouts",
      {
        sender_batch_header: {
          email_subject: "You have a payout!",
        },
        items: [
          {
            recipient_type: "EMAIL",
            amount: {
              value: amount,
              currency: "USD",
            },
            receiver: sellerEmail,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${paypalAccessToken}`,
        },
      }
    );

    return NextResponse.json({
      success: true,
      payoutId: payout.data.batch_header.payout_batch_id,
    });
  } catch (error) {
    console.error("Error processing PayPal payout:", error);

    let errorMessage = "Internal server error";
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.message || error.message;
      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
          details: error.response?.data,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
