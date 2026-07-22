import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Generic idempotency-key ledger for financially-sensitive POST endpoints
 * (starting with manual credit). A unique index on (key, scope) is what
 * actually enforces "only one request with this key ever runs" — the
 * insert itself is the atomic claim, not an application-level read-then-write.
 * Entries expire on their own; idempotency only needs to hold for the
 * window a client might plausibly retry in, not forever.
 */
export interface IIdempotencyKey extends Document {
  key: string;
  scope: string;
  actorId: mongoose.Types.ObjectId;
  status: "processing" | "completed";
  responseBody?: Record<string, unknown>;
  createdAt: Date;
}

const IdempotencyKeySchema = new Schema<IIdempotencyKey>({
  key: { type: String, required: true },
  scope: { type: String, required: true },
  actorId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  status: {
    type: String,
    enum: ["processing", "completed"],
    default: "processing",
  },
  responseBody: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 }, // 24h TTL
});

IdempotencyKeySchema.index({ key: 1, scope: 1 }, { unique: true });

export const IdempotencyKey: Model<IIdempotencyKey> =
  mongoose.models.IdempotencyKey ||
  mongoose.model<IIdempotencyKey>("IdempotencyKey", IdempotencyKeySchema);
