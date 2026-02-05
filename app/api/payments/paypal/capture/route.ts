import { NextResponse } from "next/server";
import paypal from "@paypal/checkout-server-sdk";
import { User } from "@/models";
import { Transaction } from "@/models/transactions";
import {
  invalidateSessionCache,
  invalidateAllUserSessions,
} from "@/lib/cachedSession";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { generatePayPalAccessToken } from "@/utils/paypalaccesstoken";
import dbConnect from "@/lib/connectdb";
import { ObjectId } from "mongodb";
import { Tier } from "@/models/tier";

const clientId = process.env.PAYPAL_CLIENT_ID!;
const clientSecret = process.env.PAYPAL_SECRET_KEY!;

const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);

// Define valid status values for TypeScript
type TransactionStatus = "pending" | "successful" | "failed" | "refunded";

export async function POST(req: Request) {
  try {
    await dbConnect();

    const { orderID, tierId, durationMonths } = await req.json();

    //("Received data:", { orderID, tierId, durationMonths });

    const tierinfor = await Tier.findOne({ _id: new ObjectId(tierId) });
    if (!tierinfor) {
      return NextResponse.json(
        { success: false, error: "Tier not found" },
        { status: 404 },
      );
    }
    const { tierType, name, price, renewalPrice, discountedPrice, tierLimits } =
      tierinfor;

    // Validate required fields
    if (!orderID || !tierId || !durationMonths) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields (orderID, tierId, durationMonths)",
        },
        { status: 400 },
      );
    }

    // Validate and parse numeric values
    const parsedTierPrice = discountedPrice
      ? parseFloat(discountedPrice)
      : parseFloat(price);
    const parsedRenewalPrice = price ? parseFloat(price) : 0;

    if (isNaN(parsedTierPrice) || (renewalPrice && isNaN(parsedRenewalPrice))) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid price format. Please provide valid numbers for tierPrice and tierRenewalPrice",
        },
        { status: 400 },
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const userId = session.user.id;
    const email = session.user.email;
    const userRole = session.user.role || "user"; // Default role if not provided

    // Capture the PayPal order
    const paypalAccessToken = await generatePayPalAccessToken();
    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.headers["Content-Type"] = "application/json";
    request.headers["Authorization"] = `Bearer ${paypalAccessToken}`;

    const response = await client.execute(request);

    if (response.result.status !== "COMPLETED") {
      return NextResponse.json(
        { success: false, error: "Payment not completed" },
        { status: 400 },
      );
    }

    // Calculate subscription dates
    const startDate = new Date();
    const expiryDate = new Date(
      startDate.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000,
    ); // Assuming durationMonths is in months

    const subscriptionUpdate = {
      "subscription.subscriptionPlan": name,
      "subscription.subscriptionStartDate": startDate,
      "subscription.subscriptionExpiryDate": expiryDate,
      "subscription.isSubscriptionActive": true,
      "subscription.isTrial": false,
      "subscription.subscriptionPaymentMethod": "paypal",
      "subscription.subscriptionTierId": tierId,
      "subscription.subscriptionTierType": tierType,
      "subscription.subscriptionPrice": parsedTierPrice * durationMonths,
      "subscription.subscriptionPaymentId": orderID,
      "subscription.subscriptionRenewalPrice":
        parsedRenewalPrice * durationMonths,
      "subscription.subscriptionLimits": {
        leads: tierLimits?.leads || 0,
        twilioNumbers: tierLimits?.twilioNumbers || 0,
        numbers: tierLimits?.numbers || 0,
        callSeconds: tierLimits?.callSeconds || 0,
        forms: tierLimits?.forms || 0,
        buyers: tierLimits?.buyers || 0,
        exports: tierLimits?.exports || false,
        imports: tierLimits?.imports || false,
        liveSupport: tierLimits?.liveSupport || false,
        industries: tierLimits?.industries || 0,
      },
    };

    // Update user's subscription
    const updatedUser = await User.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: subscriptionUpdate },
      { new: true },
    );

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Invalidate session caches so new subscription reflects immediately
    try {
      if (updatedUser?.email) {
        await invalidateSessionCache(updatedUser.email);
      }
      await invalidateAllUserSessions(userId);
    } catch (e) {
      console.error("[PayPalCapture] Failed to invalidate session caches", e);
    }

    // Create transaction record with proper typing
    const transactionData = {
      type: "subscription_payment",
      userId: userId,
      amount: parsedTierPrice * durationMonths,
      currency: "USD",
      paymentGateway: "paypal",
      gatewayTransactionId: orderID,
      status: "completed", // Explicitly typed
      metadata: {
        tierId: tierId,
        tierType,
        tierRenewalDate: expiryDate,
        subscriptionDuration: durationMonths,
        subscriptionPlan: name,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const subscritionTransaction = new Transaction(transactionData);
    await subscritionTransaction.save();

    return NextResponse.json({
      success: true,
      data: {
        transactionId: subscritionTransaction._id,
        subscription: updatedUser.subscription,
        paymentStatus: response.result.status,
      },
    });
  } catch (error: any) {
    console.error("[PAYPAL_CAPTURE_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to capture PayPal order",
        ...(process.env.NODE_ENV === "development" && {
          details: {
            stack: error.stack,
            message: error.message,
          },
        }),
      },
      { status: 500 },
    );
  }
}
