import Stripe from "stripe";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import { NextRequest } from "next/server";
import {
  createPaymentSchema,
  mongoIdParamSchema,
} from "@/lib/validation/schemas";
import {
  successResponse,
  unauthorized,
  notFound,
  internalError,
  handleValidationError,
  badRequest,
} from "@/lib/api/error-handler";
import { ZodError } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { env } from "@/lib/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

/**
 * POST /api/payments
 * Create a payment intent for a transaction
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized();
    }

    // Validate request body
    let validatedData;
    try {
      const body = await req.json();
      validatedData = await createPaymentSchema.parseAsync(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid request body");
    }

    await dbConnect();

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(validatedData.amount * 100), // Convert to cents
      currency: validatedData.currency,
      description: validatedData.description,
      metadata: {
        userId: session.user.id,
        ...validatedData.metadata,
      },
    });

    return successResponse(
      {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
      201,
    );
  } catch (error: unknown) {
    console.error("[POST /api/payments]", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      (error as { type?: string }).type === "StripeInvalidRequestError"
    ) {
      return badRequest("Invalid payment details");
    }
    return internalError("Failed to create payment");
  }
}
