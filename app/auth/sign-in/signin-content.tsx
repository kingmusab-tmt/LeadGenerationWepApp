"use client";

import { useInitializeUser } from "@/app/hooks";
import { useCSRFFetch } from "@/app/hooks";
import { SignInPage } from "./signin";
import { Box, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { hasTrialIntent, clearTrialIntent } from "@/lib/trialIntent";

const SignInContent: React.FC = () => {
  const { currentUser, loading: userLoading } = useInitializeUser();
  const csrfFetch = useCSRFFetch();
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [startingTrial, setStartingTrial] = useState(false);

  const routeSellerBasedOnSubscription = async (fallbackPath: string) => {
    try {
      const response = await fetch("/api/subscriptions/manage");
      if (!response.ok) {
        router.replace(fallbackPath);
        return;
      }

      const data = await response.json();
      const subscription = data?.subscription;
      const expirySource =
        subscription?.subscriptionExpiryDate ??
        subscription?.stripeDetails?.currentPeriodEnd;

      if (!expirySource) {
        router.replace(fallbackPath);
        return;
      }

      const expiryDate = new Date(expirySource);
      if (Number.isNaN(expiryDate.getTime())) {
        router.replace(fallbackPath);
        return;
      }

      const daysRemaining = Math.ceil(
        (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      if (daysRemaining <= 7) {
        router.replace("/plan");
        return;
      }

      router.replace("/dashboard/overview");
    } catch (error) {
      console.error("[SignIn] Failed to check subscription expiry:", error);
      router.replace(fallbackPath);
    }
  };

  const startTrialForExistingUser = async () => {
    if (startingTrial) return false;
    setStartingTrial(true);

    try {
      const response = await csrfFetch("/api/subscriptions/trial/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Clear trial intent
        clearTrialIntent();
        // Update session to reflect new subscription
        await updateSession();
        return true;
      }
    } catch (error) {
      console.error("[SignIn] Error starting trial:", error);
    }
    // Do NOT clear trialIntent on failure — allow other flows (e.g. complete registration) to handle it
    setStartingTrial(false);
    return false;
  };

  useEffect(() => {
    // Wait for session to load first
    if (status === "loading") return;

    // If not authenticated, no redirect needed
    if (status === "unauthenticated") return;

    // If already redirecting or starting trial, skip
    if (startingTrial) return;

    // Check for trial intent
    const trialIntent = hasTrialIntent(searchParams);

    // Use session data for faster redirect (JWT token is already available)
    const role = session?.user?.role || currentUser?.role;
    const isSubActive = session?.user?.isSubActive || currentUser?.isSubActive;

    // If we have role from session, redirect immediately
    if (role && role !== "user") {
      console.log("[SignIn] User authenticated, redirecting based on role:", {
        role,
        isSubActive,
        trialIntent,
      });

      if (role === "admin") {
        router.replace("/admindashboard/overview");
      } else if (
        (role === "seller" || role === "business-admin") &&
        isSubActive
      ) {
        // User already has active subscription, clear trial intent and go to dashboard
        clearTrialIntent();
        void routeSellerBasedOnSubscription("/dashboard/overview");
      } else if (role === "buyer" || role === "staff") {
        router.replace("/dashboard/buyer/overview");
      } else if (role === "seller" || role === "business-admin") {
        // User doesn't have active subscription
        if (trialIntent) {
          // Start trial for existing user
          // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: this effect is the post-auth entry point, and starting the trial (which sets a loading flag) must happen as soon as we know the user has trial intent, not in response to a later user action.
          startTrialForExistingUser().then((success) => {
            if (success) {
              void routeSellerBasedOnSubscription("/plan");
            } else {
              router.replace("/plan");
            }
          });
        } else {
          router.replace("/plan");
        }
      } else {
        router.replace("/completeregistration");
      }
    } else if (role === "user") {
      console.log("[SignIn] User needs to complete registration");
      router.replace("/completeregistration");
    }
  }, [
    session,
    status,
    currentUser,
    router,
    searchParams,
    startingTrial,
    updateSession,
    csrfFetch,
  ]);

  if (status === "loading" || status === "authenticated" || startingTrial) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Unauthenticated: Show Sign In UI
  return <SignInPage />;
};

export default SignInContent;
