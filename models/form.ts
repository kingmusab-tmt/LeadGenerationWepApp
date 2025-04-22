import { Schema, model, models, Document } from "mongoose";

export interface IForm extends Document {
  formId: string;
  userId: string;
  formName: string;
  leadSource: string;
  industry: string;
  fields: Array<{
    id: string;
    type: string;
    label: string;
    required?: boolean;
    options?: string[];
  }>;
}

const FormSchema = new Schema<IForm>(
  {
    formId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    formName: { type: String },
    leadSource: { type: String },
    industry: { type: String },
    fields: {
      type: [
        {
          id: { type: String, required: true },
          type: { type: String, required: true },
          label: { type: String, required: true },
          required: { type: Boolean, default: false },
          options: { type: [String], default: [] },
        },
      ],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Check if model exists before defining it
const Form = models.Form || model<IForm>("Form", FormSchema);

export default Form;
