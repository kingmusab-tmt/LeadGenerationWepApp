import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * StripeEvent model for idempotent webhook processing.
 * Stores processed Stripe event IDs to prevent duplicate processing.
 * Each Stripe event has a unique event.id that never repeats.
 */
export interface IStripeEvent extends Document {
  eventId: string; // Stripe event.id (e.g., "evt_1abc123...")
  eventType: string; // Event type (e.g., "checkout.session.completed")
  processedAt: Date;
  sessionId?: string; // checkout session ID if applicable
  paymentIntentId?: string; // payment intent ID if applicable
  metadata?: {
    status?: "processing" | "completed" | "error";
    userId?: string;
    buyerId?: string;
    sellerId?: string;
    units?: number;
    amount?: number;
    creditsApplied?: boolean;
    error?: string;
  };
}

const StripeEventSchema: Schema = new Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
    sessionId: {
      type: String,
      sparse: true,
      index: true,
    },
    paymentIntentId: {
      type: String,
      sparse: true,
    },
    metadata: {
      status: String, // "processing" | "completed" | "error"
      userId: String,
      buyerId: String,
      sellerId: String,
      units: Number,
      amount: Number,
      creditsApplied: Boolean,
      error: String,
    },
  },
  {
    timestamps: true,
  },
);

// TTL index - automatically delete events older than 30 days
// This prevents the collection from growing unbounded
StripeEventSchema.index(
  { processedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);

export const StripeEvent: Model<IStripeEvent> =
  mongoose.models.StripeEvent ||
  mongoose.model<IStripeEvent>("StripeEvent", StripeEventSchema);
