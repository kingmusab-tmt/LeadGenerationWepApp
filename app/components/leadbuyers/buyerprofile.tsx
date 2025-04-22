import React from "react";
import { Box, Typography, Paper, Grid, Chip } from "@mui/material";
import { Buyer } from "@/types/buyer";

interface BuyerProfileProps {
  buyer: Buyer;
}

const BuyerProfile: React.FC<BuyerProfileProps> = ({ buyer }) => {
  return (
    <Paper elevation={3} sx={{ padding: 3, marginBottom: 4 }}>
      <Typography variant="h6" gutterBottom>
        Buyer Profile
      </Typography>
      <Box sx={{ marginTop: 2 }}>
        <Typography>
          <strong>Name:</strong> {buyer.name}
        </Typography>
        <Typography>
          <strong>Company:</strong> {buyer.company}
        </Typography>
        <Typography>
          <strong>Email:</strong> {buyer.email}
        </Typography>
        <Typography>
          <strong>Phone:</strong> {buyer.phone}
        </Typography>
        <Typography>
          <strong>Units Balance:</strong> {buyer.walletUnit}
        </Typography>
        <Typography>
          <strong>Status:</strong> {buyer.status}
        </Typography>
        <Typography>
          <strong>Preferred Distribution: </strong>{" "}
          {buyer.preferredDistribution || "Not specified"}
        </Typography>
        <Typography>
          <strong>Notification Preferences: </strong>
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {(buyer.notificationPreferences || []).map((pref, index) => (
            <Chip
              key={index}
              label={pref}
              color="secondary"
              variant="outlined"
              sx={{ fontSize: "1rem", p: 1 }}
            />
          ))}
        </Box>
        <Typography>
          <strong>Lead Preferences:</strong>
        </Typography>
        <Box sx={{ marginLeft: 2 }}>
          <Typography>
            <strong>Location:</strong> {buyer.leadPreferences.location}
          </Typography>
          <Typography>
            <strong>Industry:</strong> {buyer.leadPreferences.industry}
          </Typography>

          {/* ✅ Display Notification Preferences */}
          <Grid item xs={12}></Grid>
        </Box>
      </Box>
    </Paper>
  );
};

export default BuyerProfile;
