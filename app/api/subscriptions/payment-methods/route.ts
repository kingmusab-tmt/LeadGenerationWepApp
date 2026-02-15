/**
 * Payment Methods Management API
 * Handles listing, adding, updating, and removing payment methods
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  getPaymentMethods,
  createSetupIntent,
  setDefaultPaymentMethod,
  removePaymentMethod,
  attachPaymentMethod,
} from "@/lib/stripeSubscriptionService";
import connectDB from "@/lib/connectdb";

/**
 * GET /api/subscriptions/payment-methods
 * Get all payment methods for current user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDB();

    const result = await getPaymentMethods(session.user.id);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      paymentMethods: result.paymentMethods,
      defaultPaymentMethodId: result.defaultPaymentMethodId,
    });
  } catch (error) {
    console.error("[PaymentMethodsAPI] GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to get payment methods" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/subscriptions/payment-methods
 * Handle payment method actions: setup-intent, set-default, remove, attach
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { action, ...params } = body;

    await connectDB();

    switch (action) {
      case "setup-intent": {
        // Create a setup intent for adding new payment method
        const result = await createSetupIntent(session.user.id);

        if (!result.success) {
          return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          clientSecret: result.clientSecret,
        });
      }

      case "set-default": {
        const { paymentMethodId } = params;

        if (!paymentMethodId) {
          return NextResponse.json(
            { success: false, message: "Payment method ID is required" },
            { status: 400 },
          );
        }

        const result = await setDefaultPaymentMethod(
          session.user.id,
          paymentMethodId,
        );

        if (!result.success) {
          return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: "Default payment method updated",
        });
      }

      case "remove": {
        const { paymentMethodId } = params;

        if (!paymentMethodId) {
          return NextResponse.json(
            { success: false, message: "Payment method ID is required" },
            { status: 400 },
          );
        }

        const result = await removePaymentMethod(
          session.user.id,
          paymentMethodId,
        );

        if (!result.success) {
          return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: "Payment method removed",
        });
      }

      case "attach": {
        const { paymentMethodId, setAsDefault = true } = params;

        if (!paymentMethodId) {
          return NextResponse.json(
            { success: false, message: "Payment method ID is required" },
            { status: 400 },
          );
        }

        const result = await attachPaymentMethod(
          session.user.id,
          paymentMethodId,
          setAsDefault,
        );

        if (!result.success) {
          return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: "Payment method added",
        });
      }

      default:
        return NextResponse.json(
          { success: false, message: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[PaymentMethodsAPI] POST error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process payment method action" },
      { status: 500 },
    );
  }
}
