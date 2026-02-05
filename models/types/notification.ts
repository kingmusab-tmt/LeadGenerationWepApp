import mongoose, { Document } from "mongoose";

/**
 * Notification Interface
 * Handles user notifications and alerts
 */
export interface INotification extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  type: "info" | "alert";
  message: string;
  status: "read" | "unread";
  relatedEntityType?: "Lead" | "Form" | "Call" | "Campaign" | "Invoice"; // PHASE 3: Type of related entity
  relatedEntityId?: mongoose.Schema.Types.ObjectId; // PHASE 3: ID of related entity
  actionUrl?: string; // PHASE 3: URL for deep linking
  createdAt?: Date;
}
