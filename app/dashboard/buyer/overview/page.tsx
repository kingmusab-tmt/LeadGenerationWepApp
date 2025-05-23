"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import UserDashboard from "../layout";
import { useRouter } from "next/navigation";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

// Styled Paper component for styling
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  textAlign: "center",
  color: theme.palette.text.secondary,
  background: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
}));

// Initial default values for the overview data
const initialOverviewData = {
  purchasedLeads: 0,
  availableLeads: 0,
  sellerInfo: {
    name: "",
    email: "",
    mobileNumber: "",
    image: "",
  },
  assignedLeads: 0,
  acceptedLeads: 0,
  rejectedLeads: 0,
  walletUnit: 0,
  totalUnitPurchased: 0,
  totalUnitUsed: 0,
  callsReceived: 0,
  callsMissed: 0,
};

// Overview component
const Overview: React.FC = () => {
  const [overviewData, setOverviewData] = useState(initialOverviewData);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // Detect mobile screens

  useEffect(() => {
    // Fetch data from the server (adjust the URL and logic as needed)
    const fetchOverviewData = async () => {
      try {
        const response = await fetch("/api/buyers/buyeroverview");
        if (response.ok) {
          const data = await response.json();
          setOverviewData(data);
        } else {
          router.push("/auth/sign-in");
        }
      } catch (error) {
        console.error("Failed to fetch overview data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <LoadingComponent />
      </Box>
    );
  }

  if (!overviewData) {
    return (
      <Typography variant="h6" align="center" mt={4}>
        No data available
      </Typography>
    );
  }

  return (
    <UserDashboard>
      <Container sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Seller Info */}
          <Grid item xs={6} sm={6} md={3}>
            <StyledPaper>
              <Typography variant="h6">Seller Name</Typography>
              <Typography
                variant="h6"
                sx={{ color: "primary.main", fontWeight: "bold", fontSize: 16 }}
              >
                {overviewData.sellerInfo.name}
              </Typography>
            </StyledPaper>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <StyledPaper>
              <Typography variant="h6">Seller Email</Typography>
              <Typography
                variant="h6"
                sx={{ color: "primary.main", fontWeight: "bold", fontSize: 16 }}
              >
                {overviewData.sellerInfo.email}
              </Typography>
            </StyledPaper>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <StyledPaper>
              <Typography variant="h6">Seller Phone</Typography>
              <Typography
                variant="h6"
                sx={{ color: "primary.main", fontWeight: "bold", fontSize: 16 }}
              >
                {overviewData.sellerInfo.mobileNumber}
              </Typography>
            </StyledPaper>
          </Grid>
          {/* Wallet Unit */}
          <Grid item xs={6} sm={6} md={3}>
            <StyledPaper>
              <Typography variant="h6">Wallet Unit</Typography>
              <Typography
                variant="h4"
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                {overviewData.walletUnit}
              </Typography>
            </StyledPaper>
          </Grid>
          {/* Total Unit Purchased */}
          <Grid item xs={6} sm={6} md={3}>
            <StyledPaper>
              <Typography variant="h6">Total Unit Purchased</Typography>
              <Typography
                variant="h4"
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                {overviewData.totalUnitPurchased}
              </Typography>
            </StyledPaper>
          </Grid>
          {/* Total Unit Used */}
          <Grid item xs={6} sm={6} md={3}>
            <StyledPaper>
              <Typography variant="h6">Total Unit Used</Typography>
              <Typography
                variant="h4"
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                {overviewData.totalUnitUsed}
              </Typography>
            </StyledPaper>
          </Grid>
          {/* Calls Received */}
          <Grid item xs={6} sm={6} md={3}>
            <StyledPaper>
              <Typography variant="h6">Calls Received</Typography>
              <Typography
                variant="h4"
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                {overviewData.callsReceived}
              </Typography>
            </StyledPaper>
          </Grid>
          {/* Calls Missed */}
          <Grid item xs={6} sm={6} md={3}>
            <StyledPaper>
              <Typography variant="h6">Calls Missed</Typography>
              <Typography
                variant="h4"
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                {overviewData.callsMissed}
              </Typography>
            </StyledPaper>
          </Grid>
          {/* Purchased Leads */}
          <Grid item xs={6} sm={6} md={3}>
            <StyledPaper>
              <Typography variant="h6">Purchased Leads</Typography>
              <Typography
                variant="h4"
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                {overviewData.purchasedLeads}
              </Typography>
            </StyledPaper>
          </Grid>
          {/* Available Leads */}
          <Grid item xs={6} sm={6} md={3}>
            <StyledPaper>
              <Typography variant="h6">Available Leads</Typography>
              <Typography
                variant="h4"
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                {overviewData.availableLeads}
              </Typography>
            </StyledPaper>
          </Grid>

          {/* Assigned Leads */}
          <Grid item xs={6} sm={6} md={3}>
            <StyledPaper>
              <Typography variant="h6">Assigned Leads</Typography>
              <Typography
                variant="h4"
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                {overviewData.assignedLeads}
              </Typography>
            </StyledPaper>
          </Grid>
          {/* Accepted Leads */}
          <Grid item xs={6} sm={6} md={3}>
            <StyledPaper>
              <Typography variant="h6">Accepted Leads</Typography>
              <Typography
                variant="h4"
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                {overviewData.acceptedLeads}
              </Typography>
            </StyledPaper>
          </Grid>
          {/* Rejected Leads */}
          <Grid item xs={6} sm={6} md={3}>
            <StyledPaper>
              <Typography variant="h6">Rejected Leads</Typography>
              <Typography
                variant="h4"
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                {overviewData.rejectedLeads}
              </Typography>
            </StyledPaper>
          </Grid>
        </Grid>
      </Container>
    </UserDashboard>
  );
};

export default Overview;
