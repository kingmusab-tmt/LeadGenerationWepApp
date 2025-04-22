import mongoose from "mongoose";

const HelpVideoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  url: {
    type: String,
    required: true,
  },
  duration: {
    type: String,
  },
  category: {
    type: String,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.HelpVideo ||
  mongoose.model("HelpVideo", HelpVideoSchema);
