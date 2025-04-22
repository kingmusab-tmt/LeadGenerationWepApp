import mongoose, { Schema, Document, Model } from "mongoose";
import dbConnect from "@/lib/connectdb";
import { User } from "./user";

interface INotification extends Document {
  message: string;
  recipient: string;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
  message: { type: String, required: true },
  recipient: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export async function saveNotification(message: string, recipient: string) {
  await dbConnect();
  const notification = new Notification({ message, recipient });
  await notification.save();
}

export async function getUserNotifications(email: string) {
  await dbConnect();
  return Notification.find({
    $or: [{ recipient: email }, { recipient: "all" }],
  }).sort({ createdAt: -1 });
}

export async function getAllNotifications() {
  await dbConnect();
  return Notification.find().sort({ createdAt: -1 });
}

export async function getAllUsers() {
  await dbConnect();
  return User.find().select("email -_id");
}

export async function getNotification(id: string) {
  await dbConnect();
  return Notification.findById(id);
}

export async function updateNotification(
  id: string,
  message: string,
  recipient: string
) {
  await dbConnect();
  return Notification.findByIdAndUpdate(
    id,
    { message, recipient },
    { new: true }
  );
}

export async function deleteNotification(id: string) {
  await dbConnect();
  return Notification.findByIdAndDelete(id);
}
