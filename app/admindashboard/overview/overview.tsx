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
  SelectChangeEvent,
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
import { useInitializeUser } from "@/lib/hooks";
import AdminDashboard from "../layout";
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
  VerifiedUser,
  AttachMoney,
  Call,
  Description,
  Group,
  Receipt,
  CheckCircle,
  Cancel,
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
  totalUsers: 0,
  activeUsers: 0,
  suspendedUsers: 0,
  totalSellers: 0,
  verifiedSellers: 0,
  totalBuyers: 0,
  activeBuyers: 0,
  totalRevenue: 0,
  monthlyRevenue: 0,
  totalTransactions: 0,
  pendingVerifications: 0,
  totalLeads: 0,
  soldLeads: 0,
  totalCalls: 0,
  callMinutes: 0,
  userGrowth: [] as { month: string; users: number }[],
  revenueTrend: [] as { month: string; revenue: number }[],
  userDistribution: [] as { role: string; count: number }[],
  recentTransactions: [] as {
    id: string;
    type: string;
    amount: number;
    userId: string;
    status: string;
    createdAt: string;
  }[],
  recentVerifications: [] as {
    id: string;
    sellerId: string;
    status: string;
    method: string;
    timestamp: string;
  }[],
};

const AdminOverview: React.FC = () => {
  const [overviewData, setOverviewData] = useState(initialOverviewData);
  const { currentUser } = useInitializeUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">(
    "monthly",
  );
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin") {
      redirect("/auth/sign-in");
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        if (currentUser && currentUser.role === "admin") {
          const response = await fetch("/api/admin/overview");
          if (response.ok) {
            const data = await response.json();
            setOverviewData({
              ...initialOverviewData,
              ...data,
            });
          } else {
            // Set dummy data for demonstration
            setOverviewData({
              ...initialOverviewData,
              totalUsers: 1245,
              activeUsers: 1020,
              suspendedUsers: 225,
              totalSellers: 420,
              verifiedSellers: 380,
              totalBuyers: 825,
              activeBuyers: 750,
              totalRevenue: 582500,
              monthlyRevenue: 125000,
              totalTransactions: 3842,
              pendingVerifications: 12,
              totalLeads: 12450,
              soldLeads: 8450,
              totalCalls: 3842,
              callMinutes: 6420,
              userGrowth: Array(12)
                .fill(0)
                .map((_, i) => ({
                  month: new Date(0, i).toLocaleString("default", {
                    month: "short",
                  }),
                  users: Math.floor(Math.random() * 200) + 50,
                })),
              revenueTrend: Array(12)
                .fill(0)
                .map((_, i) => ({
                  month: new Date(0, i).toLocaleString("default", {
                    month: "short",
                  }),
                  revenue: Math.floor(Math.random() * 50000) + 25000,
                })),
              userDistribution: [
                { role: "Sellers", count: 420 },
                { role: "Buyers", count: 825 },
                { role: "Admins", count: 5 },
              ],
              recentTransactions: [
                {
                  id: "1",
                  type: "lead_purchase",
                  amount: 1250,
                  userId: "user_123",
                  status: "completed",
                  createdAt: new Date(Date.now() - 3600000).toISOString(),
                },
                {
                  id: "2",
                  type: "seller_payout",
                  amount: 3250,
                  userId: "user_456",
                  status: "completed",
                  createdAt: new Date(Date.now() - 7200000).toISOString(),
                },
                {
                  id: "3",
                  type: "units_purchase",
                  amount: 500,
                  userId: "user_789",
                  status: "completed",
                  createdAt: new Date(Date.now() - 86400000).toISOString(),
                },
                {
                  id: "4",
                  type: "subscription_payment",
                  amount: 299,
                  userId: "user_101",
                  status: "completed",
                  createdAt: new Date(Date.now() - 172800000).toISOString(),
                },
              ],
              recentVerifications: [
                {
                  id: "1",
                  sellerId: "seller_123",
                  status: "pending",
                  method: "manual",
                  timestamp: new Date(Date.now() - 3600000).toISOString(),
                },
                {
                  id: "2",
                  sellerId: "seller_456",
                  status: "verified",
                  method: "email",
                  timestamp: new Date(Date.now() - 7200000).toISOString(),
                },
                {
                  id: "3",
                  sellerId: "seller_789",
                  status: "rejected",
                  method: "phone",
                  timestamp: new Date(Date.now() - 86400000).toISOString(),
                },
              ],
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch overview data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, [currentUser]);

  const handleTimeframeChange = (
    event: SelectChangeEvent<"daily" | "weekly" | "monthly">,
  ) => {
    setTimeframe(event.target.value as "daily" | "weekly" | "monthly");
  };

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
    <AdminDashboard>
      <Container sx={{ mt: 4, mb: 10 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontWeight: "bold", mb: 3 }}
        >
          Admin Dashboard Overview
        </Typography>

        <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gap={3}>
          {/* Key Metrics Row */}
          <Box gridColumn="span 12">
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center" }}
            >
              <Assessment sx={{ mr: 1 }} /> Key Performance Indicators
            </Typography>
          </Box>

          {/* Total Users */}
          <Box gridColumn={{ xs: "span 6", sm: "span 6", md: "span 3" }}>
            <StyledPaper>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">Total Users</Typography>
                <Group color="primary" />
              </Box>
              <Typography
                variant="h4"
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                {overviewData.totalUsers.toLocaleString()}
              </Typography>
              <Typography variant="caption">
                {overviewData.activeUsers} active, {overviewData.suspendedUsers}{" "}
                suspended
              </Typography>
            </StyledPaper>
          </Box>

          {/* Total Sellers */}
          <Box gridColumn={{ xs: "span 6", sm: "span 6", md: "span 3" }}>
            <StyledPaper>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">Total Sellers</Typography>
                <VerifiedUser color="primary" />
              </Box>
              <Typography
                variant="h4"
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                {overviewData.totalSellers.toLocaleString()}
              </Typography>
              <Typography variant="caption">
                {overviewData.verifiedSellers} verified
              </Typography>
            </StyledPaper>
          </Box>

          {/* Total Buyers */}
          <Box gridColumn={{ xs: "span 6", sm: "span 6", md: "span 3" }}>
            <StyledPaper>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">Total Buyers</Typography>
                <People color="primary" />
              </Box>
              <Typography
                variant="h4"
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                {overviewData.totalBuyers.toLocaleString()}
              </Typography>
              <Typography variant="caption">
                {overviewData.activeBuyers} active
              </Typography>
            </StyledPaper>
          </Box>

          {/* Pending Verifications */}
          <Box gridColumn={{ xs: "span 6", sm: "span 6", md: "span 3" }}>
            <StyledPaper>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">Pending Verifications</Typography>
                <Description color="primary" />
              </Box>
              <Typography
                variant="h4"
                sx={{ color: "warning.main", fontWeight: "bold" }}
              >
                {overviewData.pendingVerifications}
              </Typography>
              <Typography variant="caption">Seller applications</Typography>
            </StyledPaper>
          </Box>

          {/* Total Revenue */}
          <Box gridColumn={{ xs: "span 6", sm: "span 6", md: "span 3" }}>
            <StyledPaper>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">Total Revenue</Typography>
                <AttachMoney color="primary" />
              </Box>
              <Typography
                variant="h4"
                sx={{ color: "success.main", fontWeight: "bold" }}
              >
                ${overviewData.totalRevenue.toLocaleString()}
              </Typography>
              <TrendIndicator value={12} />
            </StyledPaper>
          </Box>

          {/* Monthly Revenue */}
          <Box gridColumn={{ xs: "span 6", sm: "span 6", md: "span 3" }}>
            <StyledPaper>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">Monthly Revenue</Typography>
                <MonetizationOn color="primary" />
              </Box>
              <Typography
                variant="h4"
                sx={{ color: "success.main", fontWeight: "bold" }}
              >
                ${overviewData.monthlyRevenue.toLocaleString()}
              </Typography>
              <TrendIndicator value={8} />
            </StyledPaper>
          </Box>

          {/* Total Transactions */}
          <Box gridColumn={{ xs: "span 6", sm: "span 6", md: "span 3" }}>
            <StyledPaper>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">Total Transactions</Typography>
                <Receipt color="primary" />
              </Box>
              <Typography
                variant="h4"
                sx={{ color: "info.main", fontWeight: "bold" }}
              >
                {overviewData.totalTransactions.toLocaleString()}
              </Typography>
              <Typography variant="caption">All time</Typography>
            </StyledPaper>
          </Box>

          {/* Total Leads */}
          <Box gridColumn={{ xs: "span 6", sm: "span 6", md: "span 3" }}>
            <StyledPaper>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">Total Leads</Typography>
                <Description color="primary" />
              </Box>
              <Typography
                variant="h4"
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                {overviewData.totalLeads.toLocaleString()}
              </Typography>
              <Typography variant="caption">
                {overviewData.soldLeads} sold
              </Typography>
            </StyledPaper>
          </Box>

          {/* Total Calls */}
          <Box gridColumn={{ xs: "span 6", sm: "span 6", md: "span 3" }}>
            <StyledPaper>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6">Total Calls</Typography>
                <Call color="primary" />
              </Box>
              <Typography
                variant="h4"
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                {overviewData.totalCalls.toLocaleString()}
              </Typography>
              <Typography variant="caption">
                {overviewData.callMinutes} minutes
              </Typography>
            </StyledPaper>
          </Box>

          {/* User Growth Chart */}
          <Box gridColumn={{ xs: "span 12", md: "span 6" }}>
            <StyledPaper>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <TrendingUp sx={{ mr: 1 }} /> User Growth
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={overviewData.userGrowth}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#8884d8"
                    fill="#8884d8"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </StyledPaper>
          </Box>

          {/* Revenue Trend Chart */}
          <Box gridColumn={{ xs: "span 12", md: "span 6" }}>
            <StyledPaper>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <MonetizationOn sx={{ mr: 1 }} /> Revenue Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={overviewData.revenueTrend}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#82ca9d" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            </StyledPaper>
          </Box>

          {/* User Distribution */}
          <Box gridColumn={{ xs: "span 12", md: "span 4" }}>
            <StyledPaper>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <Group sx={{ mr: 1 }} /> User Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={overviewData.userDistribution}
                    dataKey="count"
                    nameKey="role"
                    cx="50%"
                    cy="50%"
                    outerRadius={isMobile ? 80 : 100}
                    fill="#8884d8"
                    label={({ name, percent = 0 }) =>
                      `${name} ${((percent || 0) * 100).toFixed(0)}%`
                    }
                  >
                    {overviewData.userDistribution.map((entry, index) => (
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
          </Box>

          {/* Recent Transactions */}
          <Box gridColumn={{ xs: "span 12", md: "span 4" }}>
            <StyledPaper sx={{ textAlign: "left" }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <Receipt sx={{ mr: 1 }} /> Recent Transactions
              </Typography>
              <Stack spacing={1}>
                {overviewData.recentTransactions.map((txn) => (
                  <Box key={txn.id}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="subtitle1">
                        {txn.type.replace("_", " ")}
                      </Typography>
                      <Chip
                        label={`$${txn.amount}`}
                        size="small"
                        color={
                          txn.type.includes("purchase") ||
                          txn.type.includes("payment")
                            ? "primary"
                            : "success"
                        }
                      />
                    </Box>
                    <Typography variant="body2">
                      User: {txn.userId.substring(0, 8)}...
                    </Typography>
                    <Typography variant="caption">
                      {new Date(txn.createdAt).toLocaleString()}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                  </Box>
                ))}
              </Stack>
            </StyledPaper>
          </Box>

          {/* Recent Verifications */}
          <Box gridColumn={{ xs: "span 12", md: "span 4" }}>
            <StyledPaper sx={{ textAlign: "left" }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <VerifiedUser sx={{ mr: 1 }} /> Recent Verifications
              </Typography>
              <Stack spacing={1}>
                {overviewData.recentVerifications.map((verification) => (
                  <Box key={verification.id}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="subtitle1">
                        Seller: {verification.sellerId.substring(0, 8)}...
                      </Typography>
                      {verification.status === "verified" ? (
                        <Chip
                          icon={<CheckCircle />}
                          label="Verified"
                          size="small"
                          color="success"
                        />
                      ) : verification.status === "pending" ? (
                        <Chip
                          icon={<Schedule />}
                          label="Pending"
                          size="small"
                          color="warning"
                        />
                      ) : (
                        <Chip
                          icon={<Cancel />}
                          label="Rejected"
                          size="small"
                          color="error"
                        />
                      )}
                    </Box>
                    <Typography variant="body2">
                      Method: {verification.method}
                    </Typography>
                    <Typography variant="caption">
                      {new Date(verification.timestamp).toLocaleString()}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                  </Box>
                ))}
              </Stack>
            </StyledPaper>
          </Box>
        </Box>
      </Container>
    </AdminDashboard>
  );
};

export default AdminOverview;
// Note: The above code is a complete React component for an admin dashboard overview page.
// It includes various charts and metrics to display the performance of the application.
