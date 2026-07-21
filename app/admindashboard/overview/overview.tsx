"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Typography,
  useMediaQuery,
  useTheme,
  Chip,
  Stack,
  Divider,
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
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  MonetizationOn,
  People,
  Assessment,
  Schedule,
  TrendingUp,
  VerifiedUser,
  AttachMoney,
  Call,
  Description,
  Group,
  Receipt,
  CheckCircle,
  Cancel,
  Refresh,
} from "@mui/icons-material";
import StatCard from "@/app/components/generalComponent/StatCard";

// Padded panel used to house charts/lists below the KPI row.
const ChartPanel = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  textAlign: "center",
  color: theme.palette.text.secondary,
  height: "100%",
}));

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

// Compute percentage change between two most recent months
const computeTrend = (
  data: Array<Record<string, string | number>>,
  valueKey: string,
): number => {
  if (!data || data.length < 2) return 0;
  const current = Number(data[data.length - 1]?.[valueKey] ?? 0);
  const previous = Number(data[data.length - 2]?.[valueKey] ?? 0);
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

const AdminOverview: React.FC = () => {
  const [overviewData, setOverviewData] = useState(initialOverviewData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        const response = await fetch("/api/admin/overview");
        if (response.ok) {
          const data = await response.json();
          setOverviewData({
            ...initialOverviewData,
            ...data,
          });
          setError(null);
        } else {
          setError("Failed to load overview data. Please try again.");
        }
      } catch (err) {
        console.error("Failed to fetch overview data", err);
        setError("Failed to load overview data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  const COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"];

  const revenueTrend = computeTrend(overviewData.revenueTrend, "revenue");
  const userGrowthTrend = computeTrend(overviewData.userGrowth, "users");

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
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 8 }}>
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<Refresh />}
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4, mb: 10 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold", mb: 3 }}>
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
          <StatCard
            label="Total Users"
            value={overviewData.totalUsers.toLocaleString()}
            icon={<Group color="primary" />}
            caption={`${overviewData.activeUsers} active, ${overviewData.suspendedUsers} suspended`}
          />
        </Box>

        {/* Total Sellers */}
        <Box gridColumn={{ xs: "span 6", sm: "span 6", md: "span 3" }}>
          <StatCard
            label="Total Sellers"
            value={overviewData.totalSellers.toLocaleString()}
            icon={<VerifiedUser color="primary" />}
            caption={`${overviewData.verifiedSellers} verified`}
          />
        </Box>

        {/* Total Buyers */}
        <Box gridColumn={{ xs: "span 6", sm: "span 6", md: "span 3" }}>
          <StatCard
            label="Total Buyers"
            value={overviewData.totalBuyers.toLocaleString()}
            icon={<People color="primary" />}
            caption={`${overviewData.activeBuyers} active`}
          />
        </Box>

        {/* Pending Verifications */}
        <Box gridColumn={{ xs: "span 6", sm: "span 6", md: "span 3" }}>
          <StatCard
            label="Pending Verifications"
            value={overviewData.pendingVerifications}
            icon={<Description color="primary" />}
            valueColor="warning.main"
            caption="Seller applications"
          />
        </Box>

        {/* Total Revenue */}
        <Box gridColumn={{ xs: "span 6", sm: "span 6", md: "span 3" }}>
          <StatCard
            label="Total Revenue"
            value={`$${overviewData.totalRevenue.toLocaleString()}`}
            icon={<AttachMoney color="primary" />}
            trend={revenueTrend}
          />
        </Box>

        {/* Monthly Revenue */}
        <Box gridColumn={{ xs: "span 6", sm: "span 6", md: "span 3" }}>
          <StatCard
            label="Monthly Revenue"
            value={`$${overviewData.monthlyRevenue.toLocaleString()}`}
            icon={<MonetizationOn color="primary" />}
            valueColor="success.main"
            trend={userGrowthTrend}
          />
        </Box>

        {/* Total Transactions */}
        <Box gridColumn={{ xs: "span 6", sm: "span 6", md: "span 3" }}>
          <StatCard
            label="Total Transactions"
            value={overviewData.totalTransactions.toLocaleString()}
            icon={<Receipt color="primary" />}
            valueColor="info.main"
            caption="All time"
          />
        </Box>

        {/* Total Leads */}
        <Box gridColumn={{ xs: "span 6", sm: "span 6", md: "span 3" }}>
          <StatCard
            label="Total Leads"
            value={overviewData.totalLeads.toLocaleString()}
            icon={<Description color="primary" />}
            caption={`${overviewData.soldLeads} sold`}
          />
        </Box>

        {/* Total Calls */}
        <Box gridColumn={{ xs: "span 6", sm: "span 6", md: "span 3" }}>
          <StatCard
            label="Total Calls"
            value={overviewData.totalCalls.toLocaleString()}
            icon={<Call color="primary" />}
            caption={`${overviewData.callMinutes} minutes`}
          />
        </Box>

        {/* User Growth Chart */}
        <Box gridColumn={{ xs: "span 12", md: "span 6" }}>
          <ChartPanel>
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
          </ChartPanel>
        </Box>

        {/* Revenue Trend Chart */}
        <Box gridColumn={{ xs: "span 12", md: "span 6" }}>
          <ChartPanel>
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
          </ChartPanel>
        </Box>

        {/* User Distribution */}
        <Box gridColumn={{ xs: "span 12", md: "span 4" }}>
          <ChartPanel>
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
          </ChartPanel>
        </Box>

        {/* Recent Transactions */}
        <Box gridColumn={{ xs: "span 12", md: "span 4" }}>
          <ChartPanel sx={{ textAlign: "left" }}>
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
          </ChartPanel>
        </Box>

        {/* Recent Verifications */}
        <Box gridColumn={{ xs: "span 12", md: "span 4" }}>
          <ChartPanel sx={{ textAlign: "left" }}>
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
          </ChartPanel>
        </Box>
      </Box>
    </Container>
  );
};

export default AdminOverview;
