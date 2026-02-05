"use client";

import { useInitializeUser } from "@/lib/hooks";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";
import { SignInPage } from "./signin";
import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const SignIn: React.FC = () => {
  const { currentUser, loading: userLoading } = useInitializeUser();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Wait for session to load first
    if (status === "loading") return;

    // If not authenticated, no redirect needed
    if (status === "unauthenticated") return;

    // If already redirecting, skip
    if (isRedirecting) return;

    // Use session data for faster redirect (JWT token is already available)
    const role = session?.user?.role || currentUser?.role;
    const isSubActive = session?.user?.isSubActive || currentUser?.isSubActive;

    // If we have role from session, redirect immediately
    if (role && role !== "user") {
      console.log("[SignIn] User authenticated, redirecting based on role:", {
        role,
        isSubActive,
      });
      setIsRedirecting(true);

      if (role === "admin") {
        router.replace("/admindashboard/overview");
      } else if (
        (role === "seller" || role === "business-admin") &&
        isSubActive
      ) {
        router.replace("/dashboard/seller/overview");
      } else if (role === "buyer" || role === "staff") {
        router.replace("/dashboard/buyer/overview");
      } else if (role === "seller" || role === "business-admin") {
        router.replace("/plan");
      } else {
        router.replace("/completeregistration");
      }
    } else if (role === "user") {
      console.log("[SignIn] User needs to complete registration");
      setIsRedirecting(true);
      router.replace("/completeregistration");
    }
  }, [session, status, currentUser, router, isRedirecting]);

  // Avoid hydration mismatch by waiting for client mount
  if (!isMounted || status === "loading" || status === "authenticated") {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <LoadingComponent />
      </Box>
    );
  }

  // Unauthenticated: Show Sign In UI
  return <SignInPage />;
};

export default SignIn;
