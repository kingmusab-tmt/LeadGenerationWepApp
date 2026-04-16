"use client";
import React from "react";
import CallPage from "./selltertwiliosetup";
import { useInitializeUser } from "@/app/hooks";
import { Box, CircularProgress } from "@mui/material";

const CallTrackingSetting = () => {
  const { currentUser, loading } = useInitializeUser();
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
        <p>Seller ID not found. Please log in again.</p>
      </Box>
    );
  }

  return <CallPage sellerId={sellerId} />;
};

export default CallTrackingSetting;
