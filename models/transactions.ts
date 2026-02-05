import mongoose, { Schema, Document, Model } from "mongoose";

// Define the interface for the Transaction document
export interface ITransaction extends Document {
  _id: string; // Unique identifier for the transaction
  type:
    | "lead_purchase" // Buyer purchases a lead
    | "call_purchase" // Buyer purchases a call
    | "units_purchase" // Buyer purchases units
    | "seller_income" // Seller earns income from a lead sale
    | "seller_payout" // Seller withdraws earnings
    | "refund" // Refund issued to buyer or seller
    | "admin_adjustment" // Admin manually adjusts units/balance
    | "subscription_payment" // Seller subscribes to a package
    | "subscription_renewal" // Seller renews a subscription
    | "subscription_cancellation"; // Seller cancels a subscription
  userId: mongoose.Types.ObjectId; // Reference to the User model (buyer or seller)
  amount: number;
  previousBalance: number; // Previous balance before the transaction
  currentBalance: number; // Current balance after the transaction
  currency: string;
  stripeAccountId?: string; // For seller_payout (Stripe account ID of the seller)
  relatedInvoices?: mongoose.Types.ObjectId[]; // PHASE 3: Link to related invoices
  metadata: {
    leadId?: mongoose.Types.ObjectId; // PHASE 1: Changed from string to ObjectId ref
    unitsPurchased?: number; // For units_purchase
    sellerId?: mongoose.Types.ObjectId; // PHASE 1: Changed from string to ObjectId ref (ID of the seller earning income)
    buyerId: mongoose.Types.ObjectId; // PHASE 1: Changed from String to ObjectId ref
    refund: boolean;
    tierId: mongoose.Types.ObjectId; // PHASE 1: Changed from string to ObjectId ref
    stripeTransferId: string; // For seller_payout (ID from Stripe transfer)
    tierName: string;
    tierRenewalDate?: Date; // For subscription_renewal (renewal date of the subscription)
    userEmail: string; // For subscription_payment or renewal (email of the user)
    tierType: string;
    subscriptionYears: number; // For
    payoutId?: string; // For seller_payout (ID from payment gateway)
    refundReason?: string; // For refund
    adminNote?: string; // For admin_adjustment
    subscriptionId?: mongoose.Types.ObjectId; // For subscription_payment, renewal, or cancellation
    subscriptionPlan?: string; // For subscription_payment or renewal
    subscriptionDuration?: string; // For subscription_payment or renewal (e.g., "monthly", "yearly")
    transferVerified: boolean;
    transferAmount: number;
  };
  paymentGateway: "stripe" | "paypal" | "square" | "manual";
  gatewayTransactionId?: string; // Transaction ID from the payment gateway
  status: "pending" | "completed" | "failed" | "refunded";
  createdAt: Date;
  updatedAt: Date;
}

// Define the Mongoose schema
const TransactionSchema: Schema = new Schema<ITransaction>(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "lead_purchase",
        "units_purchase",
        "seller_income",
        "seller_payout",
        "refund",
        "admin_adjustment",
        "subscription_payment",
        "subscription_renewal",
        "subscription_cancellation",
      ],
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User", // Reference to the User model
    },
    amount: {
      type: Number,
    },
    stripeAccountId: {
      type: String, // For seller payouts, the Stripe account ID of the seller
    },
    relatedInvoices: [
      {
        type: Schema.Types.ObjectId,
        ref: "Invoice",
      },
    ], // PHASE 3: Link to related invoices
    previousBalance: { type: Number }, // Previous balance before the transaction
    currentBalance: { type: Number }, // Current balance after the transaction
    currency: {
      type: String,
      default: "USD",
    },

    metadata: {
      transferVerified: { type: Boolean },
      transferAmount: { type: Number },
      tierId: {
        type: Schema.Types.ObjectId, // PHASE 1: Changed from String to ObjectId ref
        ref: "Tier", // Reference to Tier model
      },
      stripeTransferId: {
        type: String,
      },
      tierName: {
        type: String,
      },
      tierType: {
        type: String,
      },
      tierRenewalDate: {
        type: Date,
      },
      subscriptionYears: {
        type: Number,
      },
      userEmail: {
        type: String,
      },
      leadId: {
        type: Schema.Types.ObjectId, // PHASE 1: Changed from String to ObjectId ref
        ref: "Lead", // Reference to Lead model
      },
      unitsPurchased: {
        type: Number,
      },
      sellerId: {
        type: Schema.Types.ObjectId, // PHASE 1: Changed from String to ObjectId ref
        ref: "User", // Reference to User model
      },
      buyerId: {
        type: Schema.Types.ObjectId, // PHASE 1: Changed from String to ObjectId ref
        ref: "Buyer", // Reference to Buyer model
      },
      refund: {
        type: Boolean,
      },
      payoutId: {
        type: String,
      },
      refundReason: {
        type: String,
      },

      adminNote: {
        type: String,
      },
      subscriptionPlan: {
        type: String,
      },
      subscriptionDuration: {
        type: String,
      },
    },
    paymentGateway: {
      type: String,
      enum: ["stripe", "paypal", "square", "manual"],
    },
    gatewayTransactionId: {
      type: String,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
  },
);

// Indexes
TransactionSchema.index({ userId: 1 }); // Index on userId field for faster queries
TransactionSchema.index({ type: 1 }); // Index on type field for faster queries
TransactionSchema.index({ status: 1 }); // Index on status field for faster queries
TransactionSchema.index({ "metadata.sellerId": 1 }); // Index on sellerId for faster queries
TransactionSchema.index({ "metadata.subscriptionId": 1 }); // Index on subscriptionId for faster queries
TransactionSchema.index({ "metadata.buyerId": 1 }); // PHASE 1: Index on buyerId for faster queries
TransactionSchema.index({ "metadata.leadId": 1 }); // PHASE 1: Index on leadId for faster queries
TransactionSchema.index({ "metadata.tierId": 1 }); // PHASE 1: Index on tierId for faster queries
TransactionSchema.index({ relatedInvoices: 1 }); // PHASE 3: Index on relatedInvoices for faster queries

// Create and export the Mongoose model
export const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);
