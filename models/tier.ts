import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITier extends Document {
  name: string;
  price: string;
  description: string;
  stripePriceId?: string;
  stripeProductId?: string;
  features: string[];
  ctaText: string;
  highlight: boolean;
  isActive: boolean;
  order: number;
  tierType: "free" | "paid";
  tierUserType: "seller" | "business";
  discountPercentage?: number;
  discountedPrice?: string;
  renewalPrice?: string;
  annualPrice?: string;
}

const TierSchema = new Schema<ITier>(
  {
    name: { type: String, required: true },
    price: { type: String, required: true },
    description: { type: String, required: true },
    features: { type: [String], required: true },
    stripePriceId: { type: String },
    stripeProductId: { type: String },
    ctaText: { type: String, default: "Get Started" },
    highlight: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    order: { type: Number, required: true },
    tierType: {
      type: String,
      enum: ["free", "paid"],
      default: "paid",
    },
    tierUserType: {
      type: String,
      enum: ["seller", "business"],
      default: "seller",
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    discountedPrice: {
      type: String,
    },
    renewalPrice: {
      type: String,
    },
    annualPrice: {
      type: String,
    },
  },
  { timestamps: true }
);

// Pre-save hook to calculate derived pricing fields
TierSchema.pre<ITier>("save", function (next) {
  if (this.isModified("price") || this.isModified("discountPercentage")) {
    const price = parseFloat(this.price);

    // Calculate discounted price
    if (this.discountPercentage && this.discountPercentage > 0) {
      const discountAmount = price * (this.discountPercentage / 100);
      this.discountedPrice = (price - discountAmount).toFixed(2);
    } else {
      this.discountedPrice = this.price;
    }

    // Calculate annual price
    this.annualPrice = (price * 12).toFixed(2);

    // Set default renewal price if not provided
    if (!this.renewalPrice) {
      this.renewalPrice = this.annualPrice;
    }
  }

  // Automatically set tierType based on price
  if (this.price === "0") {
    this.tierType = "free";
  } else {
    this.tierType = "paid";
  }

  next();
});

export const Tier: Model<ITier> =
  mongoose.models.Tier || mongoose.model<ITier>("Tier", TierSchema);
