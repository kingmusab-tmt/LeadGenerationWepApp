import { Container, Typography } from "@mui/material";
import React from "react";
import UserDashboard from "../layout";

const NotificationPage = () => {
  return (
    <UserDashboard>
      <Container>
        <Typography variant="h4">Notifications</Typography>
        {/* Add Notifications Details */}
      </Container>
    </UserDashboard>
  );
};

export default NotificationPage;
