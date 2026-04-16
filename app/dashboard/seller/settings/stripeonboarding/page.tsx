"use client";
import StripeOnboarding from "@/app/components/sellerComponent/payout/stripeonboarding/StripeOnboarding";
import React from "react";
import { useInitializeUser } from "@/app/hooks";

type StripeOnboardingPageProps = {
  onSaveHandlerReady?: ((saveHandler: () => Promise<boolean>) => void) | null;
  onConnectionStatusChange?: ((isFullyConnected: boolean) => void) | null;
};

const StripeOnboardingPage: React.FC<StripeOnboardingPageProps> = ({
  onSaveHandlerReady,
  onConnectionStatusChange,
}) => {
  const { currentUser } = useInitializeUser();
  const userEmail = currentUser?.email || "";
  return (
    <StripeOnboarding
      userEmail={userEmail}
      onSaveHandlerReady={onSaveHandlerReady}
      onConnectionStatusChange={onConnectionStatusChange}
    />
  );
};

export default StripeOnboardingPage;
