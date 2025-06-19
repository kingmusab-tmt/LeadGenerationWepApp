"use client";

import { useSession } from "next-auth/react";
import { redirect, useSearchParams } from "next/navigation";
import RoleSelectionPage from "@/app/completeregistration/page";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";
import { SignInPage } from "./signin"; // You can edit this SignInPage inline below if needed

const SignIn: React.FC = () => {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingComponent />
      </div>
    );
  }

  if (status === "authenticated") {
    const user = session.user;
    const isSubActive = user?.isSubActive;

    // If user has not selected a role yet
    if (user?.role === "user") {
      return <RoleSelectionPage />;
    } else if (user?.role === "admin") {
      // Redirect to admin dashboard or another page
      redirect("/admindashboard/overview");
    } else if (
      (user?.role === "seller" || user?.role === "business-admin") &&
      isSubActive
    ) {
      redirect("/dashboard/seller/overview");
    } else if (user?.role === "buyer") {
      redirect("/dashboard/buyer/overview");
    } else if (user?.role === "seller" && !isSubActive) {
      // Redirect to plan page if subscription is not active
      redirect("/plan");
    }

    // Let middleware handle redirection
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingComponent />
      </div>
    );
  }

  // Unauthenticated: Show Sign In UI with possible error
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {error && (
        <div className="text-red-600 mb-4 text-sm text-center">
          {error === "OAuthAccountNotLinked"
            ? "This account is linked to a different sign-in method. Try another one."
            : "An error occurred. Please try again."}
        </div>
      )}
      <SignInPage />
    </div>
  );
};

export default SignIn;
