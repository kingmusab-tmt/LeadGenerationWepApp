// utils/notification.ts
export const sendPushNotification = async (user: any, lead: any) => {
  try {
    // Check if the browser supports service workers and push notifications
    if (!("serviceWorker" in navigator)) {
      console.error("Service workers are not supported in this browser.");
      return;
    }

    if (!("PushManager" in window)) {
      console.error("Push notifications are not supported in this browser.");
      return;
    }

    // Register the service worker
    const registration = await navigator.serviceWorker.register(
      "/service-worker.js"
    );
    console.log("Service Worker registered:", registration);

    // Request permission for push notifications
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.error("Permission for push notifications was denied.");
      return;
    }

    // Subscribe the user to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, // VAPID public key
    });

    console.log("User subscribed to push notifications:", subscription);

    // Send the push notification
    await fetch("/api/send-push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscription,
        payload: {
          title: "New Lead Assigned",
          body: `You have been assigned a new lead: ${lead.name}`,
          icon: "/icons/icon-192x192.png", // PWA icon
          data: {
            url: `/leads/${lead.id}`, // URL to open when the notification is clicked
          },
        },
      }),
    });

    console.log(
      `Push notification sent to ${user.name} about lead ${lead.name}`
    );
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
};
