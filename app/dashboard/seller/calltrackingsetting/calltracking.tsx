"use client";
import React, { Suspense } from "react";
import CallPage from "./selltertwiliosetup";
import { useInitializeUser, useDashboardTerms } from "@/app/hooks";
import { Box, CircularProgress } from "@mui/material";

const CallTrackingSetting = () => {
  const { currentUser, loading } = useInitializeUser();
  const terms = useDashboardTerms();
  const sellerId = currentUser?.id ?? null;

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "300px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!sellerId) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "300px",
        }}
      >
        <p>{terms.org} ID not found. Please log in again.</p>
      </Box>
    );
  }

  return (
    // CallPage reads the active tab from the URL (?tab=N) via useSearchParams,
    // which requires a Suspense boundary in the App Router.
    <Suspense
      fallback={
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "300px",
          }}
        >
          <CircularProgress />
        </Box>
      }
    >
      <CallPage sellerId={sellerId} />
    </Suspense>
  );
};

export default CallTrackingSetting;
