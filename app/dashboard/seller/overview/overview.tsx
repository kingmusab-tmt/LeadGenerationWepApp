"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
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
  Grid2,
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
  AreaChart,
  Area,
} from "recharts";
import { useSession } from "next-auth/react";
import UserDashboard from "../layout";
import { redirect, useRouter } from "next/navigation";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";
import {
  ArrowUpward,
  ArrowDownward,
  Equalizer,
  MonetizationOn,
  People,
  Timeline,
  LocalAtm,
  Assessment,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Schedule,
  Star,
  TrendingUp,
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

const Overview: React.FC = () => {
  const [overviewData, setOverviewData] = useState(initialOverviewData);
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">(
    "monthly"
  );
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    if (!session) {
      redirect("/auth/sign-in");
    }
    return;
  }, [session]);

  useEffect(() => {
    // if (!authChecked) return;

    const fetchOverviewData = async () => {
      try {
        if (session && session.user.role === "seller") {
          const response = await fetch("/api/overview");
          if (response.ok) {
            const data = await response.json();
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
          } else {
            // Set dummy data for demonstration
            setOverviewData({
              ...initialOverviewData,
              totalLeads: 1245,
              totalUsers: 42,
              activeCampaigns: 8,
              totalRevenue: 58250,
              conversionRate: 32,
              leadStatus: {
                new: 845,
                verified: 275,
                closed: 125,
              },
              campaignPerformance: {
                budgetUsage: 65,
                roi: 215,
              },
              kpiTrends: {
                conversionRateTrend: 5,
                revenueTrend: 12,
                leadVolumeTrend: 8,
              },
              topLeadBuyers: [
                {
                  id: "1",
                  name: "Acme Corp",
                  leadsPurchased: 245,
                  totalSpend: 12250,
                },
                {
                  id: "2",
                  name: "Globex Inc",
                  leadsPurchased: 189,
                  totalSpend: 9450,
                },
                {
                  id: "3",
                  name: "Soylent Corp",
                  leadsPurchased: 156,
                  totalSpend: 7800,
                },
                {
                  id: "4",
                  name: "Initech",
                  leadsPurchased: 132,
                  totalSpend: 6600,
                },
                {
                  id: "5",
                  name: "Umbrella Corp",
                  leadsPurchased: 98,
                  totalSpend: 4900,
                },
              ],
              salesPerformance: {
                daily: Array(30)
                  .fill(0)
                  .map((_, i) => ({
                    day: `Day ${i + 1}`,
                    sales: Math.floor(Math.random() * 1000) + 500,
                  })),
                weekly: Array(12)
                  .fill(0)
                  .map((_, i) => ({
                    week: `Week ${i + 1}`,
                    sales: Math.floor(Math.random() * 5000) + 3000,
                  })),
                monthly: Array(12)
                  .fill(0)
                  .map((_, i) => ({
                    month: new Date(0, i).toLocaleString("default", {
                      month: "short",
                    }),
                    sales: Math.floor(Math.random() * 20000) + 15000,
                  })),
              },
              recentActivities: [
                {
                  id: "1",
                  type: "Lead Sold",
                  description: "Lead #12345 sold to Acme Corp for $50",
                  timestamp: new Date(Date.now() - 3600000).toISOString(),
                },
                {
                  id: "2",
                  type: "New Lead",
                  description: "New lead generated from Facebook campaign",
                  timestamp: new Date(Date.now() - 7200000).toISOString(),
                },
                {
                  id: "3",
                  type: "Payment Received",
                  description: "Payment of $1,250 received from Globex Inc",
                  timestamp: new Date(Date.now() - 86400000).toISOString(),
                },
                {
                  id: "4",
                  type: "Campaign Update",
                  description:
                    "Summer Promotion campaign reached 80% of budget",
                  timestamp: new Date(Date.now() - 172800000).toISOString(),
                },
              ],
              leadTrends: {
                monthlyLeads: [120, 190, 140, 210, 180, 220, 240],
                monthlyConversions: [40, 65, 45, 70, 60, 75, 80],
              },
              leadStatusDistribution: [
                { status: "New", count: 845 },
                { status: "Contacted", count: 275 },
                { status: "Converted", count: 125 },
              ],
              topPerformingCampaigns: [
                {
                  id: "1",
                  name: "Summer Sale",
                  conversionRate: 42,
                  revenue: 18500,
                },
                {
                  id: "2",
                  name: "New Product Launch",
                  conversionRate: 38,
                  revenue: 15200,
                },
                {
                  id: "3",
                  name: "Holiday Special",
                  conversionRate: 35,
                  revenue: 12400,
                },
              ],
              leadQualityMetrics: {
                averageLeadScore: 7.2,
                contactRate: 68,
                followUpRate: 72,
              },
              revenueTrend: [
                { month: "Jan", revenue: 4000 },
                { month: "Feb", revenue: 6500 },
                { month: "Mar", revenue: 5800 },
                { month: "Apr", revenue: 7200 },
                { month: "May", revenue: 8900 },
                { month: "Jun", revenue: 10500 },
              ],
              leadSources: [
                { source: "Facebook", count: 420, conversionRate: 28 },
                { source: "Google", count: 380, conversionRate: 32 },
                { source: "Email", count: 210, conversionRate: 35 },
                { source: "Referral", count: 150, conversionRate: 40 },
                { source: "Other", count: 85, conversionRate: 25 },
              ],
            });
          }
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

  const handleTimeframeChange = (
    event: SelectChangeEvent<"daily" | "weekly" | "monthly">
  ) => {
    setTimeframe(event.target.value as "daily" | "weekly" | "monthly");
  };

  // Chart data for Recharts
  const barChartData =
    overviewData.leadTrends?.monthlyLeads?.map((leads, index) => ({
      month: `Month ${index + 1}`,
      leads,
      conversions: overviewData.leadTrends?.monthlyConversions?.[index] || 0,
    })) || [];

  const pieChartData =
    overviewData.leadStatusDistribution?.map((item) => ({
      name: item.status,
      value: item.count,
    })) || [];

  const revenueTrendData = overviewData.revenueTrend || [];
  const leadSourcesData = overviewData.leadSources || [];
  const salesPerformanceData = overviewData.salesPerformance?.[timeframe] || [];
  const topLeadBuyersData = overviewData.topLeadBuyers || [];

  const COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"];

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
      <Container sx={{ mt: 4, mb: 10 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontWeight: "bold", mb: 3 }}
        >
          Seller Dashboard Overview
        </Typography>

        <Grid2 container spacing={3}>
          {/* Key Metrics Row */}
          <Grid2 size={{ xs: 12 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center" }}
            >
              <Assessment sx={{ mr: 1 }} /> Key Performance Indicators
            </Typography>
          </Grid2>

          {/* New Leads */}
          <Grid2 size={{ xs: 6, sm: 6, md: 3 }}>
            <StyledPaper>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">New Leads</Typography>
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
          </Grid2>
          {/* Purchased Leads */}
          <Grid2 size={{ xs: 6, sm: 6, md: 3 }}>
            <StyledPaper>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">Purchased Leads</Typography>
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
          </Grid2>
          {/* Total Leads */}
          <Grid2 size={{ xs: 6, sm: 6, md: 3 }}>
            <StyledPaper>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">Total Leads</Typography>
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
          </Grid2>
          {/* Total Lead Buyers */}
          <Grid2 size={{ xs: 6, sm: 6, md: 3 }}>
            <StyledPaper>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">Total Leads Buyers</Typography>
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
          </Grid2>
          {/* New Lead Buyers */}
          <Grid2 size={{ xs: 6, sm: 6, md: 3 }}>
            <StyledPaper>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">New Leads Buyers</Typography>
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
          </Grid2>

          {/* Conversion Rate */}
          <Grid2 size={{ xs: 6, sm: 6, md: 3 }}>
            <StyledPaper>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">Conversion Rate</Typography>
                <Timeline color="primary" />
              </Box>
              <Typography
                variant="h4"
                sx={{ color: "success.main", fontWeight: "bold" }}
              >
                {overviewData.conversionRate}%
              </Typography>
              <TrendIndicator
                value={overviewData.kpiTrends?.conversionRateTrend || 0}
              />
            </StyledPaper>
          </Grid2>

          {/* Total Revenue */}
          <Grid2 size={{ xs: 6, sm: 6, md: 3 }}>
            <StyledPaper>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">Total Revenue</Typography>
                <MonetizationOn color="primary" />
              </Box>
              <Typography
                variant="h4"
                sx={{ color: "warning.main", fontWeight: "bold" }}
              >
                ${overviewData.totalRevenue.toLocaleString()}
              </Typography>
              <TrendIndicator
                value={overviewData.kpiTrends?.revenueTrend || 0}
              />
            </StyledPaper>
          </Grid2>

          {/* ROI */}
          <Grid2 size={{ xs: 6, sm: 6, md: 3 }}>
            <StyledPaper>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">Campaign ROI</Typography>
                <LocalAtm color="primary" />
              </Box>
              <Typography
                variant="h4"
                sx={{ color: "info.main", fontWeight: "bold" }}
              >
                {overviewData.campaignPerformance?.roi || 0}%
              </Typography>
              <Typography variant="caption">Return on Investment</Typography>
            </StyledPaper>
          </Grid2>

          {/* Lead Quality Metrics */}
          {/* <Grid2 size={{ xs: 12, md: 4 }}>
            <StyledPaper>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <Assessment sx={{ mr: 1 }} /> Lead Quality Metrics
              </Typography>
              <Box mt={2}>
                <Grid2 container spacing={2}>
                  <Grid2 size={{ xs: 4 }}>
                    <Box>
                      <Typography variant="subtitle2">
                        Avg Lead Score
                      </Typography>
                      <Typography variant="h5">
                        {overviewData.leadQualityMetrics?.averageLeadScore || 0}
                        /10
                      </Typography>
                    </Box>
                  </Grid2>
                  <Grid2 size={{ xs: 4 }}>
                    <Box>
                      <Typography variant="subtitle2">Contact Rate</Typography>
                      <Typography variant="h5">
                        {overviewData.leadQualityMetrics?.contactRate || 0}%
                      </Typography>
                    </Box>
                  </Grid2>
                  <Grid2 size={{ xs: 4 }}>
                    <Box>
                      <Typography variant="subtitle2">
                        Follow Up Rate
                      </Typography>
                      <Typography variant="h5">
                        {overviewData.leadQualityMetrics?.followUpRate || 0}%
                      </Typography>
                    </Box>
                  </Grid2>
                </Grid2>
              </Box>
            </StyledPaper>
          </Grid2> */}

          {/* Top Performing Campaigns */}
          {/* <Grid2 size={{ xs: 12, md: 4 }}>
            <StyledPaper sx={{ textAlign: "left" }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <Assessment sx={{ mr: 1 }} /> Top Campaigns
              </Typography>
              <Stack spacing={1}>
                {(overviewData.topPerformingCampaigns || []).map((campaign) => (
                  <Box key={campaign.id}>
                    <Typography variant="subtitle1">{campaign.name}</Typography>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">
                        Conversion: {campaign.conversionRate}%
                      </Typography>
                      <Typography variant="body2">
                        Revenue: ${campaign.revenue.toLocaleString()}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                  </Box>
                ))}
              </Stack>
            </StyledPaper>
          </Grid2> */}

          {/* Lead Sources */}
          <Grid2 size={{ xs: 12, md: 4 }}>
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
                      `${name} ${(percent * 100).toFixed(0)}%`
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
          </Grid2>

          {/* Top Lead Buyers */}
          <Grid2 size={{ xs: 12, md: 4 }}>
            <StyledPaper sx={{ textAlign: "left" }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <Star sx={{ mr: 1 }} /> Top Lead Buyers
              </Typography>
              <Stack spacing={1}>
                {(overviewData.topLeadBuyers || []).map((buyer, index) => (
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
          </Grid2>

          {/* Sales Performance */}
          <Grid2 size={{ xs: 12, md: 4 }}>
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
          </Grid2>

          {/* Charts Section */}
          <Grid2 size={{ xs: 12 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center" }}
            >
              <BarChartIcon sx={{ mr: 1 }} /> Lead Trends
            </Typography>
          </Grid2>

          <Grid2 size={{ xs: 12, md: 6 }}>
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
                  <Bar
                    dataKey="conversions"
                    fill="#82ca9d"
                    name="Conversions"
                  />
                </BarChart>
              </ResponsiveContainer>
            </StyledPaper>
          </Grid2>

          {/* <Grid2 size={{ xs: 12, md: 6 }}>
            <StyledPaper>
              <Typography variant="subtitle1" gutterBottom>
                Revenue Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={revenueTrendData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.1}
                    name="Revenue ($)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </StyledPaper>
          </Grid2> */}

          {/* Lead Status Distribution */}
          <Grid2 size={{ xs: 12, md: 6 }} mb={3}>
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
                      `${name} ${(percent * 100).toFixed(0)}%`
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
          </Grid2>

          {/* Recent Activities */}
          {/* <Grid2 size={{ xs: 12, md: 6 }} mb={3}>
            <StyledPaper sx={{ textAlign: "left" }}>
              <Typography
                variant="subtitle1"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <Schedule sx={{ mr: 1 }} /> Lead Activity Timeline
              </Typography>
              <Stack spacing={2}>
                {(overviewData.recentActivities || []).map((activity) => (
                  <Box key={activity.id}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body1" fontWeight="bold">
                        {activity.type}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(activity.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      {activity.description}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                  </Box>
                ))}
              </Stack>
            </StyledPaper>
          </Grid2> */}
        </Grid2>
      </Container>
    </UserDashboard>
  );
};

export default Overview;
