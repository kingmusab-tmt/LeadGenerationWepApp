import mongoose, { Schema, Document, Model } from "mongoose";

interface IVerification extends Document {
  verificationId: string;
  sellerId: string;
  verificationStatus: "pending" | "verified" | "rejected";
  verificationMethod: "email" | "phone" | "manual";
  remarks: string;
  timestamp: Date;
}

const VerificationSchema: Schema = new Schema({
  verificationId: { type: String, required: true },
  sellerId: { type: String, required: true },
  verificationStatus: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    required: true,
  },
  verificationMethod: {
    type: String,
    enum: ["email", "phone", "manual"],
    required: true,
  },
  remarks: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const Verifications: Model<IVerification> =
  mongoose.models.Verifications ||
  mongoose.model<IVerification>("Verifications", VerificationSchema);

export { Verifications };
export type { IVerification };
