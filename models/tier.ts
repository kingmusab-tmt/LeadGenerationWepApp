import mongoose, { Schema, Document, Model } from "mongoose";

interface ITier extends Document {
  name: string;
  price: string;
  description: string;
  features: string[];
  ctaText: string;
  highlight: boolean;
  isActive: boolean;
  order: number;
}
const TierSchema = new Schema<ITier>(
  {
    name: { type: String, required: true },
    price: { type: String, required: true },
    description: { type: String, required: true },
    features: { type: [String], required: true },
    ctaText: { type: String, default: "Get Started" },
    highlight: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

export const Tier: Model<ITier> =
  mongoose.models.Tier || mongoose.model<ITier>("Tier", TierSchema);
