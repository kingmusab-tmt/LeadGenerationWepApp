import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export default async function OverviewRedirect() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/sign-in");
  }

  const userRole = session.user?.role;
  const isSubActive = session.user?.isSubActive;

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
