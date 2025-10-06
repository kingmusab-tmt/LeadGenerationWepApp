// // app/api/subscriptions/check/route.ts
// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/auth";
// import dbConnect from "@/lib/connectdb";
// import { User } from "@/models/user";

// export async function GET(req: Request) {
//   try {
//     await dbConnect();
//     const session = await getServerSession(authOptions);

//     if (!session?.user?.id) {
//       return NextResponse.json({ isActive: false }, { status: 200 });
//     }

//     // Find user and check subscription status
//     const user = await User.findById(session.user.id).select("subscription");

//     if (!user) {
//       return NextResponse.json({ isActive: false }, { status: 200 });
//     }

//     // Check if user has an active subscription
//     const currentDate = new Date();
//     const subscription = user.subscription;

//     // Determine if subscription is active based on multiple factors
//     const isSubscriptionActive =
//       subscription?.isSubscriptionActive === true &&
//       subscription?.subscriptionExpiryDate &&
//       new Date(subscription.subscriptionExpiryDate) > currentDate;

//     return NextResponse.json({
//       isActive: isSubscriptionActive,
//       expiryDate: subscription?.subscriptionExpiryDate || null,
//     });
//   } catch (error) {
//     console.error("[SUBSCRIPTION_CHECK_ERROR]", error);
//     return NextResponse.json({ isActive: false }, { status: 200 });
//   }
// }
// app/api/subscriptions/check/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ isActive: false }, { status: 200 });
    }

    // Find user and check subscription status
    const user = await User.findById(session.user.id).select("subscription");

    if (!user) {
      return NextResponse.json({ isActive: false }, { status: 200 });
    }

    // Check if user has an active subscription
    const currentDate = new Date();
    const subscription = user.subscription;

    // Determine if subscription is active based on multiple factors
    let isSubscriptionActive = false;

    if (
      subscription?.isSubscriptionActive === true &&
      subscription?.subscriptionExpiryDate
    ) {
      // Check if subscription expiry date is in the future
      if (new Date(subscription.subscriptionExpiryDate) > currentDate) {
        isSubscriptionActive = true;
      } else {
        // Subscription has expired, update the user's subscription status
        isSubscriptionActive = false;

        // Optionally update the user's subscription status in the database
        await User.findByIdAndUpdate(session.user.id, {
          "subscription.isSubscriptionActive": false,
        });
      }
    }

    return NextResponse.json({
      isActive: isSubscriptionActive,
      expiryDate: subscription?.subscriptionExpiryDate || null,
      usedTrial: subscription?.usedTrial || false,
    });
  } catch (error) {
    console.error("[SUBSCRIPTION_CHECK_ERROR]", error);
    return NextResponse.json({ isActive: false }, { status: 200 });
  }
}
