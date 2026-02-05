"use client";
import StripeOnboarding from "@/app/components/sellerComponent/payout/stripeonboarding/StripeOnboarding";
import React from "react";
import { useInitializeUser } from "@/lib/hooks";

const StripeOnboardingPage = () => {
  const { currentUser } = useInitializeUser();
  const userEmail = currentUser?.email || "";
  return <StripeOnboarding userEmail={userEmail} />;
};

export default StripeOnboardingPage;
