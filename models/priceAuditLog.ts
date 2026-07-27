import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Durable log of tier/Stripe price validation, sync, and coupon events —
 * used for billing compliance review. Previously an in-memory array capped
 * at 1000 entries, wiped on every restart and invisible to any instance
 * other than the one that wrote it; a serverless deployment could lose the
 * entire history between requests.
 */
export interface IPriceAuditLog extends Document {
  tierId: string;
  tierName: string;
  action:
    | "validation"
    | "sync"
    | "mismatch"
    | "coupon_created"
    | "coupon_applied";
  localPrice: number;
  stripePrice: number | null;
  stripePriceId: string | null;
  couponId?: string;
  discountPercent?: number;
  details: string;
  resolved: boolean;
  createdAt: Date;
}

const PriceAuditLogSchema = new Schema<IPriceAuditLog>(
  {
    tierId: { type: String, required: true },
    tierName: { type: String, required: true },
    action: {
      type: String,
      enum: ["validation", "sync", "mismatch", "coupon_created", "coupon_applied"],
      required: true,
    },
    localPrice: { type: Number, required: true },
    stripePrice: { type: Number, default: null },
    stripePriceId: { type: String, default: null },
    couponId: { type: String },
    discountPercent: { type: Number },
    details: { type: String, required: true },
    resolved: { type: Boolean, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

PriceAuditLogSchema.index({ createdAt: -1 });
PriceAuditLogSchema.index({ tierId: 1, createdAt: -1 });
PriceAuditLogSchema.index({ action: 1, resolved: 1 });

export const PriceAuditLog: Model<IPriceAuditLog> =
  mongoose.models.PriceAuditLog ||
  mongoose.model<IPriceAuditLog>("PriceAuditLog", PriceAuditLogSchema);
