"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  useMediaQuery,
  useTheme,
  Chip,
  Stack,
  Divider,
  MenuItem,
  Select,
  SelectChangeEvent,
  Grid,
  Snackbar,
  Alert,
  Button,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useInitializeUser } from "@/app/hooks";
import {
  ArrowUpward,
  ArrowDownward,
  Equalizer,
  MonetizationOn,
  People,
  Timeline,
  LocalAtm,
  Assessment,
  BarChart as BarChartIcon,
  Star,
  Warning,
} from "@mui/icons-material";

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  textAlign: "center",
  color: theme.palette.text.secondary,
  background: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
  height: "100%",
}));

const TrendIndicator = ({ value }: { value: number }) => {
  if (value > 0) {
    return (
      <Box display="flex" alignItems="center" color="success.main">
        <ArrowUpward fontSize="small" />
        <Typography variant="caption">{value}%</Typography>
      </Box>
    );
  } else if (value < 0) {
    return (
      <Box display="flex" alignItems="center" color="error.main">
        <ArrowDownward fontSize="small" />
        <Typography variant="caption">{Math.abs(value)}%</Typography>
      </Box>
    );
  }
  return (
    <Box display="flex" alignItems="center" color="text.secondary">
      <Equalizer fontSize="small" />
      <Typography variant="caption">0%</Typography>
    </Box>
  );
};

// Initial default values for the overview data
const initialOverviewData = {
  totalLeads: 0,
  totalUsers: 0,
  activeCampaigns: 0,
  totalRevenue: 0,
  conversionRate: 0,
  leadStatus: {
    new: 0,
    verified: 0,
    closed: 0,
  },
  totalPayments: 0,
  campaignPerformance: {
    budgetUsage: 0,
    roi: 0,
  },
  totalLeadBuyers: 0,
  newLeadBuyers: 0,
  totalLeadBuyerCredits: 0,
  totalLeadBuyerUsedCredits: 0,
  totalLeadBuyerRemainingCredits: 0,
  newLeads: 0,
  purchasedLeads: 0,
  leadTrends: {
    monthlyLeads: [] as number[],
    monthlyConversions: [] as number[],
  },
  leadStatusDistribution: [] as { status: string; count: number }[],
  topPerformingCampaigns: [] as {
    id: string;
    name: string;
    conversionRate: number;
    revenue: number;
  }[],
  leadQualityMetrics: {
    averageLeadScore: 0,
    contactRate: 0,
    followUpRate: 0,
  },
  revenueTrend: [] as { month: string; revenue: number }[],
  leadSources: [] as {
    source: string;
    count: number;
    conversionRate: number;
  }[],
  recentActivities: [] as {
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }[],
  kpiTrends: {
    conversionRateTrend: 0,
    revenueTrend: 0,
    leadVolumeTrend: 0,
  },
  topLeadBuyers: [] as {
    id: string;
    name: string;
    leadsPurchased: number;
    totalSpend: number;
  }[],
  salesPerformance: {
    daily: [] as { day: string; sales: number }[],
    weekly: [] as { week: string; sales: number }[],
    monthly: [] as { month: string; sales: number }[],
  },
};

const COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"];

const Overview: React.FC = () => {
  const [overviewData, setOverviewData] = useState(initialOverviewData);
  const { currentUser, loading: userLoading } = useInitializeUser();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">(
    "monthly",
  );
  const [subscriptionAlert, setSubscriptionAlert] = useState<{
    open: boolean;
    message: string;
    severity: "warning" | "error" | "info";
    daysRemaining: number;
    isTrial?: boolean;
  }>({
    open: false,
    message: "",
    severity: "warning",
    daysRemaining: 0,
    isTrial: false,
  });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isSessionSubActive = session?.user?.isSubActive === true;

  // Auth redirects are handled by the seller layout - no need to duplicate here

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      try {
        const subscriptionCheck = await fetch("/api/subscriptions/check");
        if (subscriptionCheck.ok) {
          const { isActive, expiryDate, isTrial, daysRemaining } =
            await subscriptionCheck.json();

          // If subscription is active, don't do any redirects
          if (isActive) {
            // Show trial or subscription expiry notifications
            if (expiryDate && daysRemaining !== undefined) {
              if (isTrial) {
                if (daysRemaining <= 14 && daysRemaining > 0) {
                  setSubscriptionAlert({
                    open: true,
                    message:
                      daysRemaining <= 3
                        ? `Your free trial ends in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}! Subscribe now to keep access.`
                        : `You're on a free trial - ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining. Explore all features!`,
                    severity: daysRemaining <= 3 ? "warning" : "info",
                    daysRemaining,
                    isTrial: true,
                  });
                }
              } else {
                if (daysRemaining <= 10 && daysRemaining > 0) {
                  setSubscriptionAlert({
                    open: true,
                    message: `Your subscription expires in ${daysRemaining} day${
                      daysRemaining !== 1 ? "s" : ""
                    }. Please renew to avoid service interruption.`,
                    severity: "warning",
                    daysRemaining,
                    isTrial: false,
                  });
                }
              }
            }
            return;
          }

          if (!expiryDate) {
            if (isSessionSubActive) {
              return;
            }
            router.push("/plan");
            return;
          }

          router.push("/subscription-expired");
        }
      } catch (error) {
        console.error("Failed to check subscription status", error);
      }
    };

    const fetchOverviewData = async () => {
      try {
        if (currentUser && currentUser.role === "seller") {
          // Run subscription check and overview data fetch in PARALLEL
          const [, overviewResponse] = await Promise.all([
            checkSubscriptionStatus(),
            fetch("/api/overview"),
          ]);

          if (overviewResponse.ok) {
            const payload = await overviewResponse.json();
            const data = payload?.data ?? payload;
            setOverviewData({
              ...initialOverviewData,
              ...data,
              kpiTrends: {
                ...initialOverviewData.kpiTrends,
                ...(data.kpiTrends || {}),
              },
              leadTrends: {
                ...initialOverviewData.leadTrends,
                ...(data.leadTrends || {}),
              },
              leadQualityMetrics: {
                ...initialOverviewData.leadQualityMetrics,
                ...(data.leadQualityMetrics || {}),
              },
              campaignPerformance: {
                ...initialOverviewData.campaignPerformance,
                ...(data.campaignPerformance || {}),
              },
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch overview data", error);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch data once auth is confirmed
    if (status === "authenticated" && currentUser && !userLoading) {
      fetchOverviewData();
    }
  }, [currentUser, isSessionSubActive, router, status, userLoading]);

  const handleTimeframeChange = (
    event: SelectChangeEvent<"daily" | "weekly" | "monthly">,
  ) => {
    setTimeframe(event.target.value as "daily" | "weekly" | "monthly");
  };

  const handleSubscriptionAlertClose = () => {
    setSubscriptionAlert({ ...subscriptionAlert, open: false });
  };

  const handleRenewSubscription = () => {
    router.push("/plan");
  };

  // Memoized chart data for Recharts
  const barChartData = useMemo(
    () =>
      overviewData.leadTrends?.monthlyLeads?.map((leads, index) => ({
        month: `Month ${index + 1}`,
        leads,
        conversions: overviewData.leadTrends?.monthlyConversions?.[index] || 0,
      })) || [],
    [overviewData.leadTrends],
  );

  const pieChartData = useMemo(
    () =>
      overviewData.leadStatusDistribution?.map((item) => ({
        name: item.status,
        value: item.count,
      })) || [],
    [overviewData.leadStatusDistribution],
  );

  const leadSourcesData = overviewData.leadSources || [];
  const salesPerformanceData = overviewData.salesPerformance?.[timeframe] || [];
  const topLeadBuyersData = overviewData.topLeadBuyers || [];

  // Show loading while auth is loading or data is loading
  if (loading || status === "loading" || userLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <CircularProgress />
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
    <Box sx={{ width: "100%" }}>
      {/* Subscription Alert Snackbar */}
      <Snackbar
        open={subscriptionAlert.open}
        autoHideDuration={subscriptionAlert.isTrial ? null : 10000}
        onClose={handleSubscriptionAlertClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleSubscriptionAlertClose}
          severity={subscriptionAlert.severity}
          variant="filled"
          sx={{ width: "100%" }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleRenewSubscription}
            >
              {subscriptionAlert.isTrial ? "SUBSCRIBE" : "RENEW"}
            </Button>
          }
        >
          <Box display="flex" alignItems="center">
            {subscriptionAlert.isTrial ? (
              <Box component="span" sx={{ mr: 1 }}>
                🎉
              </Box>
            ) : (
              <Warning sx={{ mr: 1 }} />
            )}
            {subscriptionAlert.message}
          </Box>
        </Alert>
      </Snackbar>

      {/* <Typography
          variant="h4"
          gutterBottom
          sx={{ fontWeight: "bold", mb: 3 }}
        >
          Seller Dashboard Overview
        </Typography> */}

      <Grid container spacing={3}>
        {/* Key Metrics Row */}
        <Grid size={{ xs: 12 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: "flex", alignItems: "center" }}
          >
            <Assessment sx={{ mr: 1 }} /> Key Performance Indicators
          </Typography>
        </Grid>

        {/* New Leads */}
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StyledPaper>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6" color="primary">
                New Leads
              </Typography>
              <People color="primary" />
            </Box>
            <Typography
              variant="h4"
              sx={{ color: "primary.main", fontWeight: "bold" }}
            >
              {overviewData.newLeads}
            </Typography>
            <TrendIndicator
              value={overviewData.kpiTrends?.leadVolumeTrend || 0}
            />
          </StyledPaper>
        </Grid>
        {/* Purchased Leads */}
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StyledPaper>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6" color="primary">
                Purchased Leads
              </Typography>
              <People color="primary" />
            </Box>
            <Typography
              variant="h4"
              sx={{ color: "primary.main", fontWeight: "bold" }}
            >
              {overviewData.purchasedLeads}
            </Typography>
            <TrendIndicator
              value={overviewData.kpiTrends?.leadVolumeTrend || 0}
            />
          </StyledPaper>
        </Grid>
        {/* Total Leads */}
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StyledPaper>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6" color="primary">
                Total Leads
              </Typography>
              <People color="primary" />
            </Box>
            <Typography
              variant="h4"
              sx={{ color: "primary.main", fontWeight: "bold" }}
            >
              {overviewData.totalLeads}
            </Typography>
            <TrendIndicator
              value={overviewData.kpiTrends?.leadVolumeTrend || 0}
            />
          </StyledPaper>
        </Grid>
        {/* Total Lead Buyers */}
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StyledPaper>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6" color="primary">
                Total Leads Buyers
              </Typography>
              <People color="primary" />
            </Box>
            <Typography
              variant="h4"
              sx={{ color: "primary.main", fontWeight: "bold" }}
            >
              {overviewData.totalLeadBuyers}
            </Typography>
            <TrendIndicator
              value={overviewData.kpiTrends?.leadVolumeTrend || 0}
            />
          </StyledPaper>
        </Grid>
        {/* New Lead Buyers */}
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StyledPaper>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6" color="primary">
                New Leads Buyers
              </Typography>
              <People color="primary" />
            </Box>
            <Typography
              variant="h4"
              sx={{ color: "primary.main", fontWeight: "bold" }}
            >
              {overviewData.newLeadBuyers}
            </Typography>
            <TrendIndicator
              value={overviewData.kpiTrends?.leadVolumeTrend || 0}
            />
          </StyledPaper>
        </Grid>

        {/* Conversion Rate */}
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StyledPaper>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6" color="primary">
                Conversion Rate
              </Typography>
              <Timeline color="primary" />
            </Box>
            <Typography
              variant="h4"
              sx={{ color: "primary.main", fontWeight: "bold" }}
            >
              {overviewData.conversionRate}%
            </Typography>
            <TrendIndicator
              value={overviewData.kpiTrends?.conversionRateTrend || 0}
            />
          </StyledPaper>
        </Grid>

        {/* Total Revenue */}
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StyledPaper>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6" color="primary">
                Total Revenue
              </Typography>
              <MonetizationOn color="primary" />
            </Box>
            <Typography
              variant="h4"
              sx={{ color: "primary.main", fontWeight: "bold" }}
            >
              ${overviewData.totalRevenue.toLocaleString()}
            </Typography>
            <TrendIndicator value={overviewData.kpiTrends?.revenueTrend || 0} />
          </StyledPaper>
        </Grid>

        {/* Lead Buyer Credits */}
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StyledPaper>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6" color="primary">
                Lead Buyer Credits
              </Typography>
              <LocalAtm color="primary" />
            </Box>
            <Typography
              variant="h4"
              sx={{ color: "info.main", fontWeight: "bold" }}
            >
              {(overviewData.totalLeadBuyerUsedCredits || 0) +
                (overviewData.totalLeadBuyerRemainingCredits || 0)}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                mt: 1,
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Used Credit
                </Typography>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.primary"
                >
                  {overviewData.totalLeadBuyerUsedCredits || 0}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Remaining Credit
                </Typography>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.primary"
                >
                  {overviewData.totalLeadBuyerRemainingCredits || 0}
                </Typography>
              </Box>
            </Box>
          </StyledPaper>
        </Grid>

        {/* Lead Sources */}
        <Grid size={{ xs: 12, md: 4 }}>
          <StyledPaper>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center" }}
            >
              <Assessment sx={{ mr: 1 }} /> Lead Sources
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={leadSourcesData}
                  dataKey="count"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={isMobile ? 60 : 80}
                  fill="#8884d8"
                  label={({ name, percent }) =>
                    `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                  }
                >
                  {leadSourcesData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [
                    `${props.payload.source}: ${value} leads (${props.payload.conversionRate}% conversion)`,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </StyledPaper>
        </Grid>

        {/* Top Lead Buyers */}
        <Grid size={{ xs: 12, md: 4 }}>
          <StyledPaper sx={{ textAlign: "left" }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center" }}
            >
              <Star sx={{ mr: 1 }} /> Top Lead Buyers
            </Typography>
            <Stack spacing={1}>
              {topLeadBuyersData.map((buyer, index) => (
                <Box key={buyer.id}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="subtitle1">
                      #{index + 1} {buyer.name}
                    </Typography>
                    <Chip
                      label={`${buyer.leadsPurchased} leads`}
                      size="small"
                      color="primary"
                    />
                  </Box>
                  <Typography variant="body2">
                    Total spend: ${buyer.totalSpend.toLocaleString()}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                </Box>
              ))}
            </Stack>
          </StyledPaper>
        </Grid>

        {/* Sales Performance */}
        <Grid size={{ xs: 12, md: 4 }}>
          <StyledPaper>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="subtitle1" gutterBottom>
                Sales Performance
              </Typography>
              <Select
                value={timeframe}
                onChange={handleTimeframeChange}
                size="small"
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </Box>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={salesPerformanceData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={
                    timeframe === "daily"
                      ? "day"
                      : timeframe === "weekly"
                        ? "week"
                        : "month"
                  }
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                  name="Sales ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </StyledPaper>
        </Grid>

        {/* Charts Section */}
        <Grid size={{ xs: 12 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: "flex", alignItems: "center" }}
          >
            <BarChartIcon sx={{ mr: 1 }} /> Lead Trends
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }} mb={4}>
          <StyledPaper>
            <Typography variant="subtitle1" gutterBottom>
              Monthly Lead Volume
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={barChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="leads" fill="#8884d8" name="Leads Generated" />
                <Bar dataKey="conversions" fill="#82ca9d" name="Conversions" />
              </BarChart>
            </ResponsiveContainer>
          </StyledPaper>
        </Grid>

        {/* Lead Status Distribution */}
        <Grid size={{ xs: 12, md: 6 }} mb={4}>
          <StyledPaper>
            <Typography variant="subtitle1" gutterBottom>
              Lead Status Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={isMobile ? 80 : 120}
                  fill="#8884d8"
                  label={({ name, percent }) =>
                    `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                  }
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </StyledPaper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Overview;
