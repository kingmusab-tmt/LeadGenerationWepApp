import { useEffect, useState, useCallback } from "react";
import {
  Button,
  Select,
  MenuItem,
  Typography,
  Switch,
  Snackbar,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
  Card,
  CardContent,
  Tabs,
  Tab,
  Paper,
  Chip,
  LinearProgress,
  Divider,
  FormControl,
  InputLabel,
  alpha,
  Skeleton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import DialpadIcon from "@mui/icons-material/Dialpad";
import PhoneForwardedIcon from "@mui/icons-material/PhoneForwarded";
import HistoryIcon from "@mui/icons-material/History";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import PhoneCallbackIcon from "@mui/icons-material/PhoneCallback";

import AssessmentIcon from "@mui/icons-material/Assessment";
import RefreshIcon from "@mui/icons-material/Refresh";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { industryNiches } from "@/utils/industryNiches";
import cityAreaCodes from "@/utils/cityareacodes";
import GoogleCityAutocomplete from "@/app/components/GoogleCityAutocomplete";
import CallMethodForm from "./callMethodForm";
import TrackingNumbersTable from "./TrackingNumberTable";
import LeadTracking from "./sellerleadtracking";
import SellerRefundReview from "./sellerRefundReview";
import BuyerPerformanceDashboard from "./buyerPerformanceDashboard";
import ScheduledCallbacksPanel from "./scheduledCallbacksPanel";
import { TrackingNumber } from "@/types/trackingNumbers";
import NextLink from "next/link";
import { formatDuration } from "@/lib/formatUtils";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
      {value === index && children}
    </Box>
  );
}

interface AnalyticsSummary {
  totalCalls: number;
  completedCalls: number;
  noAnswerCalls: number;
  failedCalls: number;
  forwardedCalls: number;
  answerRate: number;
  avgDuration: number;
  totalUnitsCharged: number;
  totalRevenue: number;
  refundedCalls: number;
  pendingRefundCalls: number;
  peakHour: { hour: number; count: number } | null;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  dailyData: { date: string; count: number }[];
  callsByStatus: Record<string, number>;
  callsByIndustry: Record<string, number>;
  recentActivity: {
    _id: string;
    from: string;
    to: string;
    status: string;
    callDuration?: number;
    industry?: string;
    createdAt: string;
    unitsCharged?: number;
    paymentStatus?: string;
  }[];
}

// Simple bar chart component
function MiniBarChart({
  data,
  height = 80,
}: {
  data: { date: string; count: number }[];
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-end",
        gap: "2px",
        height,
        width: "100%",
      }}
    >
      {data.map((d) => (
        <Tooltip key={d.date} title={`${d.date}: ${d.count} calls`}>
          <Box
            sx={{
              flex: 1,
              bgcolor: "primary.main",
              borderRadius: "2px 2px 0 0",
              minHeight: d.count > 0 ? 4 : 1,
              height: `${(d.count / max) * 100}%`,
              opacity: d.count > 0 ? 0.8 : 0.15,
              transition: "height 0.3s",
              "&:hover": { opacity: 1 },
            }}
          />
        </Tooltip>
      ))}
    </Box>
  );
}

// Status badge colors
const STATUS_COLORS: Record<
  string,
  "success" | "error" | "warning" | "info" | "default"
> = {
  completed: "success",
  forwarded: "info",
  "no-answer": "warning",
  failed: "error",
  insufficient_balance: "error",
};

export default function CallPage({ sellerId }: { sellerId: string }) {
  const [activeTab, setActiveTab] = useState(0);
  const [numbers, setNumbers] = useState<TrackingNumber[]>([]);
  const [twilioActivated, setTwilioActivated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");
  const [editingNumber, setEditingNumber] = useState<TrackingNumber | null>(
    null,
  );
  const areaCode = city ? cityAreaCodes[city] : "";
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [subscriptionLimits, setSubscriptionLimits] = useState({
    currentCount: 0,
    maxAllowed: 0,
  });

  // Analytics state
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch("/api/calls/analytics");
      const data = await res.json();
      if (data?.data) {
        setAnalytics(data.data);
      }
    } catch {
      // Silent fail - analytics are supplementary
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const fetchUpdatedNumbers = useCallback(async () => {
    try {
      const numbersResponse = await fetch(
        `/api/calls/twilio/get_numbers?sellerId=${sellerId}`,
      );
      const numbersPayload = await numbersResponse.json();
      const numbersData = Array.isArray(numbersPayload)
        ? numbersPayload
        : Array.isArray(numbersPayload?.data)
          ? numbersPayload.data
          : [];

      setNumbers(numbersData);
      setLoading(false);

      if (numbersData.length === 0) {
        setSnackbar({
          open: true,
          message: "No tracking numbers found.",
          severity: "info",
        });
      }
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to fetch tracking numbers.",
        severity: "error",
      });
      setLoading(false);
    }
  }, [sellerId]);

  const fetchTwilioStatus = useCallback(async () => {
    try {
      const twilioStatusResponse = await fetch(
        `/api/calls/twilio/twiliostatus?sellerId=${sellerId}`,
      );
      const twilioStatusData = await twilioStatusResponse.json();
      setTwilioActivated(twilioStatusData.twilioActivated);

      if (twilioStatusData.subscriptionLimits) {
        setSubscriptionLimits({
          currentCount: twilioStatusData.currentCount || numbers.length,
          maxAllowed: twilioStatusData.subscriptionLimits.twilioNumbers || 0,
        });
      }
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to fetch Twilio status.",
        severity: "error",
      });
    }
  }, [numbers.length, sellerId]);

  const handleEditNumber = (number: TrackingNumber) => {
    setEditingNumber(number);
    setActiveTab(2); // Switch to Forwarding tab when editing
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    fetchUpdatedNumbers();
    fetchTwilioStatus();
    fetchAnalytics();
  }, [fetchUpdatedNumbers, fetchTwilioStatus, fetchAnalytics]);

  const handleTwilioToggle = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newStatus = event.target.checked;
    const action = newStatus ? "activate" : "deactivate";

    try {
      const response = await fetch("/api/calls/twilio/activateTwilio", {
        method: "POST",
        body: JSON.stringify({ sellerId, action }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTwilioActivated(data.twilioActivated);
      setSnackbar({
        open: true,
        message: `Twilio ${action}d successfully.`,
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to ${action} Twilio: ${
          error instanceof Error ? error.message : String(error)
        }`,
        severity: "error",
      });
      setTwilioActivated(!newStatus);
    }
  };

  const requestNumber = async () => {
    const selectedIndustry = customIndustry || industry;

    if (!city || !selectedIndustry) {
      setSnackbar({
        open: true,
        message: "Please select a city and industry.",
        severity: "warning",
      });
      return;
    }

    const payload = {
      sellerId,
      areaCode,
      industry: selectedIndustry,
      method: "Automatic",
      recordCall: false,
      reconnectCaller: false,
      passCallerId: false,
      leadSource: "",
      welcomeMessage: "",
      callWhisper: "",
      requireResponse: false,
      forwardingType: "direct",
    };

    try {
      const response = await fetch("/api/calls/twilio/register_number", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.limitReached) {
          setSubscriptionLimits({
            currentCount: errorData.currentCount,
            maxAllowed: errorData.maxAllowed,
          });
          setLimitDialogOpen(true);
          return;
        }
        throw new Error(errorData.message || "Failed to request number");
      }

      const data = await response.json();
      const newNumber: TrackingNumber = {
        phoneNumber: data.phoneNumber,
        industry: selectedIndustry,
        method: "Automatic",
        forwardingType: "direct",
        recordCall: false,
        reconnectCaller: false,
        passCallerId: false,
        leadSource: "",
        welcomeMessage: "",
        callWhisper: "",
        requireResponse: false,
      };

      setNumbers((prev) => [...prev, newNumber]);
      setSubscriptionLimits({
        currentCount: data.currentCount,
        maxAllowed: data.maxAllowed,
      });
      setSnackbar({
        open: true,
        message: `Number requested successfully. (${data.currentCount}/${data.maxAllowed} used)`,
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "Failed to request number.",
        severity: "error",
      });
    }
  };

  const removeNumber = async (phoneNumber: string) => {
    try {
      await fetch("/api/calls/twilio/removeNumber", {
        method: "POST",
        body: JSON.stringify({ sellerId, phoneNumber }),
        headers: { "Content-Type": "application/json" },
      });

      setNumbers((prev) =>
        prev.filter((num) => num.phoneNumber !== phoneNumber),
      );
      setSnackbar({
        open: true,
        message: "Number removed successfully.",
        severity: "success",
      });
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to remove number.",
        severity: "error",
      });
    }
  };

  const handleCloseLimitDialog = () => {
    setLimitDialogOpen(false);
  };

  const usagePercent =
    subscriptionLimits.maxAllowed > 0
      ? (subscriptionLimits.currentCount / subscriptionLimits.maxAllowed) * 100
      : 0;

  if (loading)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ width: "100%" }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: "text.primary" }}
        >
          Call Tracking Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Configure your Twilio integration, manage tracking numbers, and set up
          call forwarding rules.
        </Typography>
      </Box>

      {/* Status Bar */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Chip
            icon={<PhoneInTalkIcon />}
            label={twilioActivated ? "Twilio Active" : "Twilio Inactive"}
            color={twilioActivated ? "success" : "default"}
            variant={twilioActivated ? "filled" : "outlined"}
            size="small"
          />
          <Chip
            label={`${numbers.length} Number${numbers.length !== 1 ? "s" : ""}`}
            color="primary"
            variant="outlined"
            size="small"
          />
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            minWidth: 200,
          }}
        >
          <Typography variant="caption" color="text.secondary" noWrap>
            {subscriptionLimits.currentCount}/{subscriptionLimits.maxAllowed}{" "}
            numbers used
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.min(usagePercent, 100)}
            color={usagePercent >= 100 ? "error" : "primary"}
            sx={{ flex: 1, height: 6, borderRadius: 3 }}
          />
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper
        elevation={0}
        sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}
      >
        <Tabs
          value={activeTab}
          onChange={(_e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            px: 1,
            "& .MuiTab-root": {
              minHeight: 56,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.875rem",
            },
          }}
        >
          <Tab
            icon={<PhoneInTalkIcon />}
            iconPosition="start"
            label="Overview"
          />
          <Tab icon={<DialpadIcon />} iconPosition="start" label="Numbers" />
          <Tab
            icon={<PhoneForwardedIcon />}
            iconPosition="start"
            label="Forwarding"
          />
          <Tab icon={<HistoryIcon />} iconPosition="start" label="Call Log" />
          <Tab
            icon={<ReceiptLongIcon />}
            iconPosition="start"
            label="Refunds"
          />
          <Tab
            icon={<AssessmentIcon />}
            iconPosition="start"
            label="Performance"
          />
          <Tab
            icon={<PhoneCallbackIcon />}
            iconPosition="start"
            label="Callbacks"
          />
        </Tabs>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* ── TAB 0: OVERVIEW ── */}
          <TabPanel value={activeTab} index={0}>
            {/* Quick Stats Cards */}
            {analyticsLoading && !analytics ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "1fr 1fr",
                    md: "repeat(4, 1fr)",
                  },
                  gap: 2,
                  mb: 3,
                }}
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    variant="rectangular"
                    height={100}
                    sx={{ borderRadius: 2 }}
                  />
                ))}
              </Box>
            ) : analytics ? (
              <>
                {/* Stats Row */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr 1fr",
                      md: "repeat(4, 1fr)",
                    },
                    gap: 2,
                    mb: 3,
                  }}
                >
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Total Calls
                          </Typography>
                          <Typography variant="h5" fontWeight={700}>
                            {analytics.summary.totalCalls}
                          </Typography>
                        </Box>
                        <PhoneCallbackIcon
                          sx={{
                            fontSize: 32,
                            color: "primary.main",
                            opacity: 0.7,
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>

                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Answer Rate
                          </Typography>
                          <Typography
                            variant="h5"
                            fontWeight={700}
                            color={
                              analytics.summary.answerRate >= 50
                                ? "success.main"
                                : "error.main"
                            }
                          >
                            {analytics.summary.answerRate}%
                          </Typography>
                        </Box>
                        {analytics.summary.answerRate >= 50 ? (
                          <TrendingUpIcon
                            sx={{
                              fontSize: 32,
                              color: "success.main",
                              opacity: 0.7,
                            }}
                          />
                        ) : (
                          <TrendingDownIcon
                            sx={{
                              fontSize: 32,
                              color: "error.main",
                              opacity: 0.7,
                            }}
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>

                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Avg Duration
                          </Typography>
                          <Typography variant="h5" fontWeight={700}>
                            {formatDuration(analytics.summary.avgDuration)}
                          </Typography>
                        </Box>
                        <AccessTimeIcon
                          sx={{
                            fontSize: 32,
                            color: "info.main",
                            opacity: 0.7,
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>

                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Units Earned
                          </Typography>
                          <Typography variant="h5" fontWeight={700}>
                            {analytics.summary.totalUnitsCharged}
                          </Typography>
                        </Box>
                        <MonetizationOnIcon
                          sx={{
                            fontSize: 32,
                            color: "warning.main",
                            opacity: 0.7,
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Box>

                {/* Second Stats Row */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr 1fr",
                      md: "repeat(4, 1fr)",
                    },
                    gap: 2,
                    mb: 3,
                  }}
                >
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">
                        Completed
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight={600}
                        color="success.main"
                      >
                        {analytics.summary.completedCalls}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">
                        No Answer
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight={600}
                        color="warning.main"
                      >
                        {analytics.summary.noAnswerCalls}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">
                        Refunded
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight={600}
                        color="error.main"
                      >
                        {analytics.summary.refundedCalls}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">
                        Pending Refund
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight={600}
                        color="warning.main"
                      >
                        {analytics.summary.pendingRefundCalls}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </>
            ) : null}

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 3,
              }}
            >
              {/* Twilio Activation Card */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Twilio Integration
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Enable or disable Twilio to manage call tracking numbers and
                    forwarding.
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 2,
                      borderRadius: 1.5,
                      bgcolor: twilioActivated
                        ? (theme) => alpha(theme.palette.success.main, 0.08)
                        : "action.hover",
                    }}
                  >
                    <Switch
                      checked={twilioActivated}
                      onChange={handleTwilioToggle}
                      color="success"
                    />
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        {twilioActivated ? "Active" : "Inactive"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {twilioActivated
                          ? "Call tracking is running"
                          : "Toggle to activate call tracking"}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Subscription Limits Card */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Subscription Usage
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Your current tracking number allocation and usage.
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        {subscriptionLimits.currentCount} of{" "}
                        {subscriptionLimits.maxAllowed} numbers
                      </Typography>
                      <Typography
                        variant="body2"
                        color={usagePercent >= 100 ? "error" : "text.secondary"}
                        fontWeight={600}
                      >
                        {Math.round(usagePercent)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(usagePercent, 100)}
                      color={usagePercent >= 100 ? "error" : "primary"}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  {subscriptionLimits.currentCount >=
                    subscriptionLimits.maxAllowed && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                        You&apos;ve reached your limit. Upgrade to add more
                        numbers.
                      </Typography>
                      <Button
                        component={NextLink}
                        href="/dashboard/seller/settings/subscription"
                        variant="contained"
                        size="small"
                      >
                        Upgrade Subscription
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>

            {/* Call Volume Chart + Industry Breakdown */}
            {analytics && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
                  gap: 3,
                  mt: 3,
                }}
              >
                {/* Daily Call Volume */}
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={700}>
                        Call Volume (Last 30 Days)
                      </Typography>
                      <Tooltip title="Refresh analytics">
                        <Button
                          size="small"
                          startIcon={
                            analyticsLoading ? (
                              <CircularProgress size={14} />
                            ) : (
                              <RefreshIcon />
                            )
                          }
                          onClick={fetchAnalytics}
                          disabled={analyticsLoading}
                        >
                          Refresh
                        </Button>
                      </Tooltip>
                    </Box>
                    <MiniBarChart data={analytics.dailyData} height={100} />
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mt: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {analytics.dailyData[0]?.date}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {
                          analytics.dailyData[analytics.dailyData.length - 1]
                            ?.date
                        }
                      </Typography>
                    </Box>
                    {analytics.summary.peakHour && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: "block" }}
                      >
                        Peak hour: {analytics.summary.peakHour.hour}:00 (
                        {analytics.summary.peakHour.count} calls)
                      </Typography>
                    )}
                  </CardContent>
                </Card>

                {/* Industry Breakdown */}
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      gutterBottom
                    >
                      Calls by Industry
                    </Typography>
                    {Object.entries(analytics.callsByIndustry)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 8)
                      .map(([industry, count]) => (
                        <Box key={industry} sx={{ mb: 1.5 }}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mb: 0.25,
                            }}
                          >
                            <Typography
                              variant="body2"
                              noWrap
                              sx={{ maxWidth: "70%" }}
                            >
                              {industry}
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {count}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={(count / analytics.summary.totalCalls) * 100}
                            sx={{ height: 4, borderRadius: 2 }}
                          />
                        </Box>
                      ))}
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Recent Activity Feed */}
            {analytics && analytics.recentActivity.length > 0 && (
              <Card variant="outlined" sx={{ borderRadius: 2, mt: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Recent Activity
                  </Typography>
                  <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
                    {analytics.recentActivity.map((call) => (
                      <Box
                        key={call._id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          py: 1,
                          borderBottom: 1,
                          borderColor: "divider",
                          "&:last-child": { borderBottom: 0 },
                        }}
                      >
                        <Chip
                          label={call.status}
                          color={STATUS_COLORS[call.status] || "default"}
                          size="small"
                          variant="outlined"
                          sx={{ minWidth: 90 }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" noWrap>
                            {call.from} → {call.to}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {call.industry || "Unknown"} ·{" "}
                            {call.callDuration
                              ? formatDuration(call.callDuration)
                              : "—"}
                          </Typography>
                        </Box>
                        {call.unitsCharged ? (
                          <Chip
                            label={`${call.unitsCharged} units`}
                            size="small"
                            variant="outlined"
                          />
                        ) : null}
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
                          {new Date(call.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}
          </TabPanel>

          {/* ── TAB 1: NUMBERS ── */}
          <TabPanel value={activeTab} index={1}>
            {/* Request Number Section */}
            <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Request a Tracking Number
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Automatically provision a new Twilio number by selecting a
                  city and industry.
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <GoogleCityAutocomplete
                    label="City (Area Code)"
                    value={city}
                    onChange={(val) => setCity(val)}
                    placeholder="Search city..."
                    helperText={areaCode ? `Area Code: ${areaCode}` : undefined}
                  />

                  <FormControl fullWidth size="small">
                    <InputLabel>Industry / Niche</InputLabel>
                    <Select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      label="Industry / Niche"
                    >
                      {industryNiches.map((niche) => (
                        <MenuItem key={niche.value} value={niche.value}>
                          {niche.label}
                        </MenuItem>
                      ))}
                      <MenuItem value="custom">Other (Specify Below)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {industry === "custom" && (
                  <TextField
                    fullWidth
                    size="small"
                    label="Enter Custom Industry"
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    sx={{ mt: 2 }}
                  />
                )}

                <Button
                  variant="contained"
                  onClick={requestNumber}
                  disabled={
                    !twilioActivated || !city || (!industry && !customIndustry)
                  }
                  sx={{ mt: 2 }}
                >
                  Request Number
                </Button>
              </CardContent>
            </Card>

            {/* Tracking Numbers Table */}
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Your Tracking Numbers
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Manage your provisioned numbers. Use the actions menu to edit
                  forwarding or remove a number.
                </Typography>
                <Box sx={{ overflowX: "auto" }}>
                  <TrackingNumbersTable
                    numbers={numbers}
                    onRemoveNumber={removeNumber}
                    onEditNumber={handleEditNumber}
                  />
                </Box>
              </CardContent>
            </Card>
          </TabPanel>

          {/* ── TAB 2: FORWARDING ── */}
          <TabPanel value={activeTab} index={2}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Call Forwarding Configuration
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Choose a tracking number and configure how incoming calls are
                  routed, including welcome messages, whispers, and IVR
                  responses.
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <CallMethodForm
                  numbers={numbers}
                  sellerId={sellerId}
                  initialValues={editingNumber}
                  onUpdateForwarding={async (payload) => {
                    try {
                      await fetch("/api/calls/twilio/updateForwarding", {
                        method: "POST",
                        body: JSON.stringify(payload),
                        headers: { "Content-Type": "application/json" },
                      });
                      setSnackbar({
                        open: true,
                        message: "Forwarding updated successfully.",
                        severity: "success",
                      });
                      fetchUpdatedNumbers();
                      setEditingNumber(null);
                    } catch {
                      setSnackbar({
                        open: true,
                        message: "Failed to update forwarding.",
                        severity: "error",
                      });
                    }
                  }}
                />
              </CardContent>
            </Card>
          </TabPanel>

          {/* ── TAB 3: CALL LOG ── */}
          <TabPanel value={activeTab} index={3}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  gutterBottom
                  color="primary.main"
                >
                  Call History
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  View incoming call logs including status, duration, buyer
                  routing, and recordings.
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ overflowX: "auto" }}>
                  <LeadTracking />
                </Box>
              </CardContent>
            </Card>
          </TabPanel>

          {/* ── TAB 4: REFUNDS ── */}
          <TabPanel value={activeTab} index={4}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Refund Requests
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Review and approve or reject refund requests from buyers who
                  reported bad call quality.
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <SellerRefundReview />
              </CardContent>
            </Card>
          </TabPanel>

          {/* ── TAB 5: BUYER PERFORMANCE ── */}
          <TabPanel value={activeTab} index={5}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                <BuyerPerformanceDashboard />
              </CardContent>
            </Card>
          </TabPanel>

          {/* ── TAB 6: SCHEDULED CALLBACKS ── */}
          <TabPanel value={activeTab} index={6}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                <ScheduledCallbacksPanel />
              </CardContent>
            </Card>
          </TabPanel>
        </Box>
      </Paper>

      {/* Limit Reached Dialog */}
      <Dialog
        open={limitDialogOpen}
        onClose={handleCloseLimitDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Number Limit Reached</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You&apos;ve reached your limit of {subscriptionLimits.maxAllowed}{" "}
            tracking numbers with your current subscription plan.
          </DialogContentText>
          <DialogContentText sx={{ mt: 2 }}>
            Upgrade your subscription to add more tracking numbers and unlock
            additional features.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLimitDialog}>Cancel</Button>
          <Button
            variant="contained"
            component={NextLink}
            href="/dashboard/seller/settings/subscription"
          >
            Upgrade Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
