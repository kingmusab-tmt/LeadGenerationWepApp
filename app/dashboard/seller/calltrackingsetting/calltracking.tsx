"use client";
import React, { useState, useEffect } from "react";
import CallPage from "./selltertwiliosetup";
import { useInitializeUser } from "@/lib/hooks";
import { Box, CircularProgress } from "@mui/material";

const CallTrackingSetting = () => {
  const { currentUser } = useInitializeUser();
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.id) {
      setSellerId(currentUser.id);
      setLoading(false);
    } else if (!currentUser) {
      setLoading(true);
    }
  }, [currentUser]);

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
