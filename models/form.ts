import { Schema, model, models, Document } from "mongoose";
import mongoose from "mongoose";

export interface IForm extends Document {
  formId: string;
  userId: mongoose.Types.ObjectId;
  submittedLeads: mongoose.Types.ObjectId[];
  formName: string;
  leadSource: string;
  industry: string;
  description?: string;
  redirectUrl?: string;
  notificationEmail?: string;
  recaptchaEnabled?: boolean;
  // Missing entirely before this field existed, every saved form was
  // instantly live for public submission with no way to build privately
  // first. Documents saved before this field existed have no value stored
  // for it at all — every read path must treat that (not just "published")
  // as publishable, so a pre-existing live form never silently goes dark.
  status?: "draft" | "published";
  // Domains this form will accept submissions from. Empty/absent means
  // unrestricted (the default, and the only behavior that existed before
  // this field) — this is opt-in hardening a seller can turn on, not a
  // default restriction.
  allowedOrigins?: string[];
  fields: Array<{
    id: string;
    type: string;
    label: string;
    required?: boolean;
    options?: string[];
    placeholder?: string;
  }>;
  styleConfig?: {
    primaryColor?: string;
    buttonText?: string;
    successMessage?: string;
    formBackgroundColor?: string;
  };
}

const FormSchema = new Schema<IForm>(
  {
    formId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    formName: { type: String },
    leadSource: { type: String },
    industry: { type: String },
    description: { type: String },
    redirectUrl: { type: String },
    notificationEmail: { type: String },
    recaptchaEnabled: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
    allowedOrigins: { type: [String], default: [] },
    fields: {
      type: [
        {
          id: { type: String, required: true },
          type: { type: String, required: true },
          label: { type: String, required: true },
          required: { type: Boolean, default: false },
          options: { type: [String], default: [] },
          placeholder: { type: String },
        },
      ],
      required: true,
    },
    styleConfig: {
      type: {
        primaryColor: { type: String },
        buttonText: { type: String },
        successMessage: { type: String },
        formBackgroundColor: { type: String },
      },
      required: false,
    },
    submittedLeads: [
      {
        type: Schema.Types.ObjectId,
        ref: "Lead",
      },
    ],
  },
  {
    timestamps: true,
  },
);

FormSchema.index({ userId: 1 });
FormSchema.index({ submittedLeads: 1 });

// ✅ Check if model exists before defining it
const Form = models.Form || model<IForm>("Form", FormSchema);

export default Form;
