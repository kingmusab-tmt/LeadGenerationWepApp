import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import { Notification } from "@/models/notificationModel";
import Subscription from "@/models/subscription";
import dbConnect from "./connectdb";
import nodemailer from "nodemailer";
import webpush from "web-push";

type NotificationRecipient = {
  _id?: string;
  email: string;
  pushToken?: string;
  mobileNumber?: string;
  notificationPreferences?: string[];
  emailSettings?: {
    smtpServer?: string;
    port?: number;
    smtpUser?: string;
    smtpPassword?: string;
    emailAddress?: string;
  };
};

let pushConfigured = false;

function configurePush() {
  if (pushConfigured) return;

  const email = process.env.VAPID_EMAIL;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!email || !publicKey || !privateKey) {
    return;
  }

  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
  pushConfigured = true;
}

async function resolveNotificationUser(userId: string) {
  // First try direct User ID resolution (common case).
  const directUser = (await User.findById(
    userId,
  )) as NotificationRecipient | null;
  if (directUser) {
    return directUser;
  }

  // Fallback: userId may actually be a LeadBuyer ID in legacy call paths.
  const buyer = await Buyer.findById(userId).select("email").lean();
  if (!buyer?.email) {
    return null;
  }

  return (await User.findOne({
    email: buyer.email,
  })) as NotificationRecipient | null;
}

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
  metadata?: Record<string, unknown>;
}) {
  try {
    await dbConnect();

    const user = await resolveNotificationUser(userId);
    if (!user || !user._id) {
      return false;
    }

    // Save to database
    const notification = new Notification({
      userId: user._id,
      type,
      title,
      message,
      metadata,
      status: "unread",
    });
    await notification.save();

    const hasNotificationPreference = (preference: string) =>
      (user?.notificationPreferences || []).some(
        (value: string) => value.toLowerCase() === preference.toLowerCase(),
      );

    if (hasNotificationPreference("Email")) {
      await sendEmailNotification(user, title, message);
    }

    // Send push notification when in-app notifications are enabled and a push token exists
    if (hasNotificationPreference("In-App Notification")) {
      await sendPushNotification(String(user._id), title, message);
    }

    if (user.mobileNumber && hasNotificationPreference("SMS")) {
      await sendSmsNotification(user.mobileNumber, message);
    }

    return true;
  } catch (error) {
    console.error("Error sending notification:", error);
    return false;
  }
}

async function sendEmailNotification(
  recipient: NotificationRecipient,
  subject: string,
  body: string,
) {
  await dbConnect();

  const emailConfig = {
    host: recipient.emailSettings?.smtpServer || process.env.EMAIL_SERVER!,
    port:
      recipient.emailSettings?.port || parseInt(process.env.EMAIL_PORT!, 10),
    secure: true,
    auth: {
      user: recipient.emailSettings?.smtpUser || process.env.EMAIL_FROM!,
      pass:
        recipient.emailSettings?.smtpPassword ||
        process.env.EMAIL_SERVER_PASSWORD ||
        process.env.EMAIL_PASSWORD!,
    },
  };
  const transporter = nodemailer.createTransport(emailConfig);

  // Email content
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME || "Brixcot Support"} <${process.env.EMAIL_FROM}>`,
    to: recipient.email,
    subject,
    text: body,
  };

  // Send the email
  await transporter.sendMail(mailOptions);
}

async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
) {
  configurePush();
  if (!pushConfigured) {
    return;
  }

  const subscriptions = await Subscription.find({ userId }).lean();
  if (!subscriptions.length) {
    return;
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: "/favicon-32x32.png",
    data: { url: "/dashboard/buyer/notifications" },
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        },
        payload,
      );
    } catch (error) {
      const statusCode =
        typeof error === "object" && error && "statusCode" in error
          ? (error as { statusCode?: number }).statusCode
          : undefined;

      // Remove stale subscriptions to keep push delivery healthy.
      if (statusCode === 404 || statusCode === 410) {
        await Subscription.deleteOne({ endpoint: sub.endpoint });
      }
    }
  }
}

async function sendSmsNotification(_phoneNumber: string, _message: string) {
  void _phoneNumber;
  void _message;
  // Implementation using Twilio or similar
  // ...
}
