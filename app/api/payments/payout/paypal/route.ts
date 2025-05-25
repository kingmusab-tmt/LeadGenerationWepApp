import { NextResponse } from "next/server";

interface PayPalPayoutRequest {
  receiverEmail: string;
  amount: number;
  currency: string;
  note?: string;
}

interface PayPalPayoutResponse {
  batch_header: {
    payout_batch_id: string;
    batch_status: string;
    sender_batch_header: {
      email_subject: string;
    };
  };
}

export async function POST(req: Request) {
  try {
    if (req.method !== "POST") {
      return NextResponse.json(
        { message: "Method not allowed" },
        { status: 405 }
      );
    }

    const body = (await req.json()) as PayPalPayoutRequest;

    // Validate input
    if (!body.receiverEmail || !body.amount || !body.currency) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get PayPal access token
    const authResponse = await fetch(
      `${process.env.PAYPAL_API_BASE_URL}/v1/oauth2/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
          ).toString("base64")}`,
        },
        body: "grant_type=client_credentials",
      }
    );

    const authData = await authResponse.json();

    if (!authResponse.ok) {
      return NextResponse.json(
        { message: "Failed to authenticate with PayPal", details: authData },
        { status: authResponse.status }
      );
    }

    const accessToken = authData.access_token;

    // Prepare payout request
    const payoutData = {
      sender_batch_header: {
        sender_batch_id: `Payouts_${Date.now()}`,
        email_subject: "You have a payout!",
        email_message: body.note || "You have received a payout. Thank you!",
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: {
            value: body.amount.toFixed(2),
            currency: body.currency,
          },
          receiver: body.receiverEmail,
          note: body.note || "Thank you for your service!",
          sender_item_id: `item_${Date.now()}`,
        },
      ],
    };

    // Send payout request
    const payoutResponse = await fetch(
      `${process.env.PAYPAL_API_BASE_URL}/v1/payments/payouts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payoutData),
      }
    );

    const payoutResult: PayPalPayoutResponse = await payoutResponse.json();

    if (!payoutResponse.ok) {
      return NextResponse.json(
        { message: "Failed to process PayPal payout", details: payoutResult },
        { status: payoutResponse.status }
      );
    }

    return NextResponse.json(
      {
        message: "Payout successful",
        payoutId: payoutResult.batch_header.payout_batch_id,
        status: payoutResult.batch_header.batch_status,
        amount: body.amount,
        currency: body.currency,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PayPal payout error:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
