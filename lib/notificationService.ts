import { User } from "@/models";
import { Notification } from "@/models/notificationModel";
import { Buyer } from "@/models/leadbuyers";
import dbConnect from "./connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import nodemailer from "nodemailer";

export async function sendNotification({
  userId,
  type,
  title,
  message,
  metadata = {},
}: {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
}) {
  try {
    // Save to database
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      metadata,
      read: false,
    });
    await notification.save();

    // Send email if user has email notifications enabled
    const user = await User.findById(userId);
    if (user?.notificationPreferences?.includes("Email")) {
      await sendEmailNotification(user.email, title, message);
    }

    // Send push notification if enabled
    if (user?.notificationPreferences?.push) {
      await sendPushNotification(user.pushToken, title, message);
    }

    if (user?.notificationPreferences?.includes("SMS")) {
      await sendSmsNotification(user.mobileNumber, message);
    }

    return true;
  } catch (error) {
    console.error("Error sending notification:", error);
    return false;
  }
}

async function sendEmailNotification(
  email: string,
  subject: string,
  body: string,
) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Session not found");
  }
  const buyer = await Buyer.findOne({ email: session.user.email });
  const sellerId = buyer?.registeredWith;
  const seller = await User.findOne({ _id: sellerId });

  const emailConfig = {
    host: seller?.emailSettings.smtpServer || process.env.EMAIL_SERVER!,
    port: seller?.emailSettings.port || parseInt(process.env.EMAIL_PORT!, 10),
    secure: true,
    auth: {
      user: seller?.emailSettings.smtpUser || process.env.EMAIL_FROM!,
      pass: seller?.emailSettings.smtpPassword || process.env.EMAIL_PASSWORD!,
    },
  };
  const transporter = nodemailer.createTransport(emailConfig);

  // Email content
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject,
    text: body,
  };

  // Send the email
  await transporter.sendMail(mailOptions);
}

async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
) {
  // Implementation using Firebase Cloud Messaging or similar
  // ...
}

async function sendSmsNotification(phoneNumber: string, message: string) {
  // Implementation using Twilio or similar
  // ...
}
