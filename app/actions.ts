"use server";

import webpush from "web-push";
import image from "../public/favicon-32x32.png";
import Subscription from "@/models/subscription";
import dbConnect from "@/lib/connectdb";

webpush.setVapidDetails(
  "mailto:musab.buraimoh@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// let subscription: PushSubscription | null = null;

export async function subscribeUser(sub: PushSubscription) {
  await dbConnect();

  try {
    // Check if the subscription already exists
    const existingSubscription = await Subscription.findOne({
      endpoint: sub.endpoint,
    });

    if (!existingSubscription) {
      // Create a new subscription in the database
      const newSubscription = new Subscription(sub);
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
    // Remove the subscription from the database based on the endpoint
    await Subscription.deleteOne({ endpoint: sub.endpoint });

    return { success: true };
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return { success: false, error: "Failed to delete subscription" };
  }
}

export async function sendNotification(message: any) {
  await dbConnect();

  try {
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
          body: message,
          icon: image,
        })
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: "Failed to send notification" };
  }
}
