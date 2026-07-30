"use client";

import { Container } from "@mui/material";
import React from "react";
import NotificationInbox from "@/app/components/generalComponent/NotificationInbox";

const NotificationPage = () => {
  return (
    <Container sx={{ py: { xs: 3, sm: 4 } }}>
      <NotificationInbox />
    </Container>
  );
};

export default NotificationPage;
