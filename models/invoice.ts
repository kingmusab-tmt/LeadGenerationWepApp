import mongoose, { Document, Schema } from "mongoose";

// Money fields are stored as integer cents (e.g. $19.99 -> 1999), not
// floating-point dollars — see R-31 in the production readiness audit.
// Renamed with a "Cents" suffix (rather than keeping the old names with a
// silently-changed meaning) specifically so any code still written against
// the old dollar-float contract fails to compile instead of silently
// misreading a cents value as dollars. lib/invoiceEngine.ts is the only
// place that should read/write these directly — everywhere else (API
// responses, the PDF generator, the frontend) keeps working with plain
// dollar numbers via the conversion helpers there.
export interface IInvoiceLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
  taxCents?: number;
  totalCents: number;
}

export interface IInvoice extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // Seller who created invoice
  buyerId?: mongoose.Types.ObjectId; // Buyer (optional for custom invoices)
  relatedTransactions?: mongoose.Types.ObjectId[]; // PHASE 3: Link to related transactions
  buyerEmail?: string;
  buyerName?: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  lineItems: IInvoiceLineItem[];
  subtotalCents: number;
  taxCents: number;
  taxRate?: number; // Percentage (e.g., 8.5 for 8.5%)
  discountCents?: number; // Flat amount, in cents
  discountPercent?: number; // Percentage
  totalCents: number;
  status: "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled";
  paymentMethod?: "stripe" | "bank_transfer" | "check";
  paymentDate?: Date;
  notes?: string;
  termsConditions?: string;
  currency: string;
  isPaid: boolean;
  pdfUrl?: string;
  recurringEnabled: boolean;
  recurringFrequency?: "monthly" | "quarterly" | "annually";
  nextRecurringDate?: Date;
  recurringEndDate?: Date;
  parentInvoiceId?: mongoose.Types.ObjectId; // For recurring invoices
  remindersSent: number;
  lastReminderDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceLineItemSchema = new Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0.01 },
  unitPriceCents: { type: Number, required: true, min: 0 },
  taxCents: { type: Number },
  totalCents: { type: Number, required: true },
});

const invoiceSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "Buyer",
    },
    relatedTransactions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Transaction",
      },
    ], // PHASE 3: Link to related transactions
    buyerEmail: String,
    buyerName: String,
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    invoiceDate: { type: Date, default: Date.now, index: true },
    dueDate: { type: Date, required: true },
    lineItems: [invoiceLineItemSchema],
    subtotalCents: { type: Number, required: true, min: 0 },
    taxCents: { type: Number, required: true, min: 0 },
    taxRate: Number,
    discountCents: Number,
    discountPercent: Number,
    totalCents: { type: Number, required: true, min: 0, index: true },
    status: {
      type: String,
      enum: ["draft", "sent", "viewed", "paid", "overdue", "cancelled"],
      default: "draft",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["stripe", "bank_transfer", "check"],
    },
    paymentDate: Date,
    notes: String,
    termsConditions: String,
    currency: { type: String, default: "USD", index: true },
    isPaid: { type: Boolean, default: false, index: true },
    pdfUrl: String,
    recurringEnabled: { type: Boolean, default: false },
    recurringFrequency: {
      type: String,
      enum: ["monthly", "quarterly", "annually"],
    },
    nextRecurringDate: Date,
    recurringEndDate: Date,
    parentInvoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
    },
    remindersSent: { type: Number, default: 0 },
    lastReminderDate: Date,
  },
  { timestamps: true },
);

// Indexes for common queries
invoiceSchema.index({ userId: 1, createdAt: -1 });
invoiceSchema.index({ userId: 1, status: 1 });
invoiceSchema.index({ userId: 1, isPaid: 1 });
invoiceSchema.index({ userId: 1, dueDate: 1, status: 1 });
invoiceSchema.index({ buyerId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 }); // For overdue tracking
invoiceSchema.index({ relatedTransactions: 1 }); // PHASE 3: Transaction lookup

export const Invoice =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", invoiceSchema);
