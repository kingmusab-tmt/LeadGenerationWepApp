import mongoose, { Schema, Model } from "mongoose";
import { INotification } from "./types/notification";

/**
 * Notification Schema
 * MongoDB schema for Notification documents
 */
const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    type: {
      type: String,
      enum: {
        values: ["info", "alert"],
        message: "Notification type must be info or alert",
      },
      required: [true, "Notification type is required"],
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      minlength: [1, "Message cannot be empty"],
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: {
        values: ["read", "unread"],
        message: "Status must be read or unread",
      },
      default: "unread",
    },
    relatedEntityType: {
      type: String,
      enum: ["Lead", "Form", "Call", "Campaign", "Invoice"],
    },
    relatedEntityId: {
      type: Schema.Types.ObjectId,
    },
    actionUrl: {
      type: String,
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
  },
);

/**
 * Database Indexes
 * Optimizes notification queries
 */

// User lookup indexes
NotificationSchema.index({ userId: 1 }); // Find all notifications for a user
NotificationSchema.index({ userId: 1, status: 1 }); // Find unread notifications for a user

// Status queries
NotificationSchema.index({ status: 1 }); // Find all unread notifications
NotificationSchema.index({ type: 1 }); // Find notifications by type

// PHASE 3: Related entity indexes
NotificationSchema.index({ relatedEntityType: 1 }); // Find notifications by entity type
NotificationSchema.index({ relatedEntityId: 1 }); // Find notifications for entity

// Timestamp indexes
NotificationSchema.index({ createdAt: -1 }); // Recently created notifications
NotificationSchema.index({ userId: 1, createdAt: -1 }); // User's recent notifications

// Compound index for common queries
NotificationSchema.index({
  userId: 1,
  status: 1,
  createdAt: -1,
}); // User's unread notifications, sorted by date

// PHASE 3: Compound index for entity notifications
NotificationSchema.index({
  relatedEntityType: 1,
  relatedEntityId: 1,
});

// TTL Index for automatic cleanup (optional, uncomment to enable)
// NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
