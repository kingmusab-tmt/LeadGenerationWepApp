"use client";
import StripeOnboarding from "@/app/components/sellerComponent/payout/stripeonboarding/StripeOnboarding";
import React from "react";
import { useSession } from "next-auth/react";

const StripeOnboardingPage = () => {
  const { data: session } = useSession();
  const userEmail = session?.user?.email || "";
  return <StripeOnboarding userEmail={userEmail} />;
};

export default StripeOnboardingPage;
