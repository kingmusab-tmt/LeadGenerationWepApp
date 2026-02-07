import mongoose from "mongoose";

const FAQSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
  category: {
    type: String,
  },
  targetAudience: {
    type: String,
    enum: ["buyer", "seller", "both"],
    default: "both",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.FAQ || mongoose.model("FAQ", FAQSchema);
