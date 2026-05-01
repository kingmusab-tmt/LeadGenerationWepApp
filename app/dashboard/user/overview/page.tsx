import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";

export default async function OverviewRedirect() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/sign-in");
  }

  // Fetch fresh user data from database to get current role and subscription status
  // This avoids stale session data issues
  await dbConnect();
  const dbUser = await User.findOne({ email: session.user?.email })
    .select("role subscription")
    .lean();

  if (!dbUser) {
    redirect("/auth/sign-in");
  }

  const userRole = dbUser.role;
  const isSubActive = dbUser.subscription?.isSubscriptionActive || false;
  const expirySource = dbUser.subscription?.subscriptionExpiryDate;
  const daysRemaining = expirySource
    ? Math.ceil(
        (new Date(expirySource).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
    : null;

  // Role-based redirection with subscription check
  switch (userRole) {
    case "admin":
      redirect("/admindashboard/overview");

    case "buyer":
    case "staff":
      redirect("/dashboard/buyer/overview");

    case "seller":
    case "business-admin":
      if (isSubActive && (daysRemaining === null || daysRemaining > 7)) {
        redirect("/dashboard/seller/overview");
      } else {
        redirect("/plan");
      }

    default:
      redirect("/completeregistration");
  }

  // This won't render since we always redirect
  return null;
}
