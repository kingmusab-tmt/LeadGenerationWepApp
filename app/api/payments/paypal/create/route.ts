import { NextResponse } from "next/server";
import paypal from "@paypal/checkout-server-sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { generatePayPalAccessToken } from "@/utils/paypalaccesstoken";

const clientId = process.env.PAYPAL_CLIENT_ID!;
const clientSecret = process.env.PAYPAL_SECRET_KEY!;

const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);

export async function POST(req: Request) {
  try {
    const { tierId, amount } = await req.json();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const email = session.user.email;

    const paypalAccessToken = await generatePayPalAccessToken();

    const request = new paypal.orders.OrdersCreateRequest();
    request.headers["Content-Type"] = "application/json";
    request.headers["Authorization"] = `Bearer ${paypalAccessToken}`;
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: amount,
          },
          description: `Subscription for tier ${tierId}`,
        },
      ],
    });

    const response = await client.execute(request);
    return NextResponse.json({ orderID: response.result.id });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create PayPal order" },
      { status: 500 }
    );
  }
}
