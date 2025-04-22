import mongoose, { Schema, Document } from "mongoose";

interface ISubscription extends Document {
  buyerId: string;
  planType: string; // e.g., 'Basic', 'Premium'
  leadsRemaining: number;
  nextBillingDate: Date;
}

const SubscriptionSchema = new Schema<ISubscription>({
  buyerId: { type: String, required: true },
  planType: { type: String, required: true },
  leadsRemaining: { type: Number, required: true },
  nextBillingDate: { type: Date, required: true },
});

export default mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
