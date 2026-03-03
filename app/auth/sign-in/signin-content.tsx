"use client";

import { useInitializeUser } from "@/lib/hooks";
import { useCSRFFetch } from "@/app/hooks";
import { SignInPage } from "./signin";
import { Box, CircularProgress } from "@mui/material";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

const SignInContent: React.FC = () => {
  const { currentUser, loading: userLoading } = useInitializeUser();
  const csrfFetch = useCSRFFetch();
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Function to start trial for existing users
  const startTrialForExistingUser = useCallback(async () => {
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
        sessionStorage.removeItem("trialIntent");
        // Update session to reflect new subscription
        await updateSession();
        return true;
      }
    } catch (error) {
      console.error("[SignIn] Error starting trial:", error);
    }

    // Clear trial intent even on failure
    sessionStorage.removeItem("trialIntent");
    setStartingTrial(false);
    return false;
  }, [startingTrial, updateSession]);

  useEffect(() => {
    // Wait for session to load first
    if (status === "loading") return;

    // If not authenticated, no redirect needed
    if (status === "unauthenticated") return;

    // If already redirecting or starting trial, skip
    if (isRedirecting || startingTrial) return;

    // Check for trial intent
    const trialParam = searchParams.get("trial");
    const trialIntent =
      trialParam === "true" || sessionStorage.getItem("trialIntent") === "true";

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
      setIsRedirecting(true);

      if (role === "admin") {
        router.replace("/admindashboard/overview");
      } else if (
        (role === "seller" || role === "business-admin") &&
        isSubActive
      ) {
        // User already has active subscription, clear trial intent and go to dashboard
        sessionStorage.removeItem("trialIntent");
        router.replace("/dashboard/seller/overview");
      } else if (role === "buyer" || role === "staff") {
        router.replace("/dashboard/buyer/overview");
      } else if (role === "seller" || role === "business-admin") {
        // User doesn't have active subscription
        if (trialIntent) {
          // Start trial for existing user
          setIsRedirecting(false); // Allow retrying
          startTrialForExistingUser().then((success) => {
            if (success) {
              router.replace("/dashboard/seller/overview");
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
      setIsRedirecting(true);
      router.replace("/completeregistration");
    }
  }, [
    session,
    status,
    currentUser,
    router,
    isRedirecting,
    searchParams,
    startTrialForExistingUser,
    startingTrial,
  ]);

  // Avoid hydration mismatch by waiting for client mount
  if (
    !isMounted ||
    status === "loading" ||
    status === "authenticated" ||
    startingTrial
  ) {
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
