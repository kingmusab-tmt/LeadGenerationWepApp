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
