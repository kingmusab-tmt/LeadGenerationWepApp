"use server";

import webpush from "web-push";
import image from "../public/favicon-32x32.png";
import Subscription from "@/models/subscription";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { User } from "@/models/userModel";

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL!}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

function parseSubscriptionInput(
  sub: PushSubscription,
): PushSubscriptionPayload | null {
  const raw = sub as unknown as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };

  if (typeof raw.endpoint !== "string" || raw.endpoint.length > 2048) {
    return null;
  }

  if (
    typeof raw.keys?.p256dh !== "string" ||
    typeof raw.keys?.auth !== "string"
  ) {
    return null;
  }

  return {
    endpoint: raw.endpoint,
    keys: {
      p256dh: raw.keys.p256dh,
      auth: raw.keys.auth,
    },
  };
}

async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const user = await User.findOne({ email: session.user.email })
    .select("_id role")
    .lean();
  if (!user?._id) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function subscribeUser(sub: PushSubscription) {
  await dbConnect();

  try {
    const user = await getAuthenticatedUser();
    const userId = String(user._id);

    const parsedSub = parseSubscriptionInput(sub);
    if (!parsedSub) {
      return { success: false, error: "Invalid subscription payload" };
    }

    // Check if the subscription already exists
    const existingSubscription = await Subscription.findOne({
      endpoint: parsedSub.endpoint,
    });

    if (existingSubscription && !existingSubscription.userId) {
      existingSubscription.userId = userId;
      existingSubscription.keys = parsedSub.keys;
      await existingSubscription.save();
      return { success: true };
    }

    if (
      existingSubscription &&
      String(existingSubscription.userId || "") !== userId
    ) {
      return {
        success: false,
        error: "Subscription endpoint owned by another user",
      };
    }

    if (existingSubscription) {
      existingSubscription.keys = parsedSub.keys;
      await existingSubscription.save();
    } else {
      // Create a new subscription in the database
      const newSubscription = new Subscription({
        userId,
        endpoint: parsedSub.endpoint,
        keys: parsedSub.keys,
      });
      await newSubscription.save();
    }

    return { success: true };
  } catch (error) {
    console.error("Error saving subscription:", error);
    return { success: false, error: "Failed to save subscription" };
  }
}

export async function unsubscribeUser(sub: PushSubscription) {
  await dbConnect();

  try {
    const user = await getAuthenticatedUser();
    const userId = String(user._id);

    if (!sub?.endpoint || typeof sub.endpoint !== "string") {
      return { success: false, error: "Invalid subscription payload" };
    }

    // Remove the subscription from the database based on the endpoint
    await Subscription.deleteOne({ endpoint: sub.endpoint, userId });

    return { success: true };
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return { success: false, error: "Failed to delete subscription" };
  }
}

export async function sendNotification(message: unknown) {
  await dbConnect();

  try {
    const user = await getAuthenticatedUser();
    if (user.role !== "admin") {
      return { success: false, error: "Forbidden" };
    }

    const safeBody =
      typeof message === "string"
        ? message.slice(0, 500)
        : JSON.stringify(message).slice(0, 500);

    const subscriptions = await Subscription.find();
    for (const sub of subscriptions) {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
      };

      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: "New Notification",
          body: safeBody,
          icon: image,
        }),
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: "Failed to send notification" };
  }
}
