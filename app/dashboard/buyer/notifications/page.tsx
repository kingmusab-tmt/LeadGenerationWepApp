"use client";

import React from "react";
import { Box } from "@mui/material";
import NotificationInbox from "@/app/components/generalComponent/NotificationInbox";

const BuyerNotificationsPage: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <NotificationInbox />
    </Box>
  );
};

export default BuyerNotificationsPage;
