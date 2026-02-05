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

  // Role-based redirection with subscription check
  switch (userRole) {
    case "admin":
      redirect("/admindashboard/overview");

    case "buyer":
    case "staff":
      redirect("/dashboard/buyer/overview");

    case "seller":
    case "business-admin":
      if (isSubActive) {
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
