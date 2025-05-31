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
  Avatar,
  Chip,
  Divider,
  Skeleton,
  Card,
  CardContent,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import UserDashboard from "../layout";
import { useRouter } from "next/navigation";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";
import {
  AccountCircle,
  Email,
  Phone,
  AccountBalanceWallet,
  ShoppingCart,
  CheckCircle,
  Cancel,
  Assignment,
  CallReceived,
  CallMissed,
  People,
  MonetizationOn,
} from "@mui/icons-material";
import { JSX } from "react/jsx-runtime";

// Styled Card component for better visual appeal
const StatCard = styled(Card)(({ theme }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  transition: "transform 0.3s, box-shadow 0.3s",
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: theme.shadows[8],
  },
}));

const StatCardContent = styled(CardContent)(({ theme }) => ({
  flexGrow: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  padding: theme.spacing(3),
}));

const ProfileCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  background: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
  borderRadius: theme.shape.borderRadius * 2,
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

// Define a type for stat IDs
type StatId =
  | "walletUnit"
  | "totalUnitPurchased"
  | "totalUnitUsed"
  | "callsReceived"
  | "callsMissed"
  | "purchasedLeads"
  | "availableLeads"
  | "assignedLeads"
  | "acceptedLeads"
  | "rejectedLeads";

// Icon components for different stats
const statIcons: Record<StatId, JSX.Element> = {
  walletUnit: <AccountBalanceWallet fontSize="large" color="primary" />,
  totalUnitPurchased: <ShoppingCart fontSize="large" color="primary" />,
  totalUnitUsed: <MonetizationOn fontSize="large" color="primary" />,
  callsReceived: <CallReceived fontSize="large" color="primary" />,
  callsMissed: <CallMissed fontSize="large" color="primary" />,
  purchasedLeads: <People fontSize="large" color="primary" />,
  availableLeads: <Assignment fontSize="large" color="primary" />,
  assignedLeads: <Assignment fontSize="large" color="primary" />,
  acceptedLeads: <CheckCircle fontSize="large" color="primary" />,
  rejectedLeads: <Cancel fontSize="large" color="primary" />,
};

// Overview component
const Overview: React.FC = () => {
  const [overviewData, setOverviewData] = useState(initialOverviewData);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
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

  // Stats data for mapping
  const stats: { id: StatId; label: string; value: number }[] = [
    { id: "walletUnit", label: "Wallet Unit", value: overviewData.walletUnit },
    {
      id: "totalUnitPurchased",
      label: "Total Unit Purchased",
      value: overviewData.totalUnitPurchased,
    },
    {
      id: "totalUnitUsed",
      label: "Total Unit Used",
      value: overviewData.totalUnitUsed,
    },
    {
      id: "callsReceived",
      label: "Calls Received",
      value: overviewData.callsReceived,
    },
    {
      id: "callsMissed",
      label: "Calls Missed",
      value: overviewData.callsMissed,
    },
    {
      id: "purchasedLeads",
      label: "Purchased Leads",
      value: overviewData.purchasedLeads,
    },
    {
      id: "availableLeads",
      label: "Available Leads",
      value: overviewData.availableLeads,
    },
    {
      id: "assignedLeads",
      label: "Assigned Leads",
      value: overviewData.assignedLeads,
    },
    {
      id: "acceptedLeads",
      label: "Accepted Leads",
      value: overviewData.acceptedLeads,
    },
    {
      id: "rejectedLeads",
      label: "Rejected Leads",
      value: overviewData.rejectedLeads,
    },
  ];

  return (
    <UserDashboard>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Profile Section */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <ProfileCard>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  mb: 2,
                  bgcolor: theme.palette.primary.main,
                }}
                src={overviewData.sellerInfo.image}
              >
                {overviewData.sellerInfo.name.charAt(0)}
              </Avatar>
              <Typography variant="h5" gutterBottom>
                {overviewData.sellerInfo.name}
              </Typography>
              <Chip
                label="Lead Seller"
                color="primary"
                variant="outlined"
                sx={{ mb: 2 }}
              />

              <Box sx={{ width: "100%", mt: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mb: 1,
                    gap: 1,
                  }}
                >
                  <Email color="action" />
                  <Typography variant="body1">
                    {overviewData.sellerInfo.email}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mb: 1,
                    gap: 1,
                  }}
                >
                  <Phone color="action" />
                  <Typography variant="body1">
                    {overviewData.sellerInfo.mobileNumber}
                  </Typography>
                </Box>
              </Box>
            </ProfileCard>
          </Grid>

          {/* Key Metrics */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={3}>
              {stats.slice(0, 4).map((stat) => (
                <Grid item xs={6} sm={3} key={stat.id}>
                  <StatCard>
                    <StatCardContent>
                      {statIcons[stat.id]}
                      <Typography
                        variant="h4"
                        sx={{
                          color: "primary.main",
                          fontWeight: "bold",
                          mt: 1,
                        }}
                      >
                        {stat.value}
                      </Typography>
                      <Typography variant="subtitle2" color="textSecondary">
                        {stat.label}
                      </Typography>
                    </StatCardContent>
                  </StatCard>
                </Grid>
              ))}
            </Grid>

            {/* Performance Summary */}
            <Paper
              sx={{
                p: 3,
                mt: 3,
                background: theme.palette.background.default,
              }}
            >
              <Typography variant="h6" gutterBottom>
                Performance Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2">Lead Conversion</Typography>
                  <Typography variant="h6" color="primary">
                    {overviewData.acceptedLeads > 0
                      ? Math.round(
                          (overviewData.acceptedLeads /
                            overviewData.purchasedLeads) *
                            100
                        )
                      : 0}
                    %
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2">Call Answer Rate</Typography>
                  <Typography variant="h6" color="primary">
                    {overviewData.callsReceived > 0
                      ? Math.round(
                          (overviewData.callsReceived /
                            (overviewData.callsReceived +
                              overviewData.callsMissed)) *
                            100
                        )
                      : 0}
                    %
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2">Units Remaining</Typography>
                  <Typography variant="h6" color="primary">
                    {overviewData.walletUnit}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2">Lead Utilization</Typography>
                  <Typography variant="h6" color="primary">
                    {overviewData.totalUnitPurchased > 0
                      ? Math.round(
                          (overviewData.totalUnitUsed /
                            overviewData.totalUnitPurchased) *
                            100
                        )
                      : 0}
                    %
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>

        {/* Detailed Stats */}
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          Detailed Statistics
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          {stats.slice(4).map((stat) => (
            <Grid item xs={6} sm={4} md={3} key={stat.id}>
              <StatCard>
                <StatCardContent>
                  {statIcons[stat.id]}
                  <Typography
                    variant="h5"
                    sx={{
                      color: "primary.main",
                      fontWeight: "bold",
                      mt: 1,
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography variant="subtitle2" color="textSecondary">
                    {stat.label}
                  </Typography>
                </StatCardContent>
              </StatCard>
            </Grid>
          ))}
        </Grid>
      </Container>
    </UserDashboard>
  );
};

export default Overview;
