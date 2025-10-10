import { Container, Typography } from "@mui/material";
import React from "react";
import UserDashboard from "../layout";

const Promotionpage = () => {
  return (
    <UserDashboard>
      <Container sx={{ mt: 6, mb: 4 }}>
        <Typography variant="h4">Promotions</Typography>
        {/* Add Promotions Details */}
      </Container>
    </UserDashboard>
  );
};

export default Promotionpage;
