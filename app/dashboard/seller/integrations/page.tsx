/**
 * Integrations Dashboard Page
 * Main page for managing CRM integrations, webhooks, and API keys
 *
 * Date: January 21, 2026
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Snackbar,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { useSession } from "next-auth/react";
import { useSubscriptionLimits } from "@/app/hooks/useSubscriptionLimits";
import ZapierIntegration from "./components/ZapierIntegration";
import WebhookStatistics from "./components/WebhookStatistics";
import ApiKeyManagement from "./components/ApiKeyManagement";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`integration-tabpanel-${index}`}
      aria-labelledby={`integration-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>}
    </div>
  );
}

export default function IntegrationsPage() {
  const { data: session, status } = useSession();
  const { limits, loading: limitsLoading } = useSubscriptionLimits();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info" | "warning" = "success",
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (status === "loading") {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="warning">Please sign in to manage integrations.</Alert>
      </Box>
    );
  }

  // Check if user has zapierIntegration feature
  if (limits && !limits.zapierIntegration) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          p: 3,
        }}
      >
        <InfoIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Integrations Not Available
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          textAlign="center"
          sx={{ mb: 3 }}
        >
          Your current subscription plan does not include integrations. Upgrade
          your plan to access Zapier and CRM integrations.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          fontWeight="bold"
          color="primary.main"
        >
          Integrations
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Connect BRIXCOT with your favorite CRM platforms and automation tools
        </Typography>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Integrations
              </Typography>
              <Typography variant="h4" component="div">
                <IntegrationCount />
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Webhooks Sent (24h)
              </Typography>
              <Typography variant="h4" component="div">
                <WebhookCount />
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Success Rate
              </Typography>
              <Typography variant="h4" component="div" color="success.main">
                <SuccessRate />
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                API Calls (24h)
              </Typography>
              <Typography variant="h4" component="div">
                <ApiCallCount />
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Integration Tabs */}
      <Card sx={{ overflow: "hidden" }}>
        <Box
          sx={{ borderBottom: 1, borderColor: "divider", px: { xs: 1, sm: 2 } }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="integration tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Zapier" icon={<SettingsIcon />} iconPosition="start" />
            <Tab label="Webhooks" icon={<InfoIcon />} iconPosition="start" />
            <Tab
              label="API Keys"
              icon={<SettingsIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <ZapierIntegration onNotify={showSnackbar} />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <WebhookStatistics onNotify={showSnackbar} />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <ApiKeyManagement onNotify={showSnackbar} />
        </TabPanel>
      </Card>

      {/* Snackbar for notifications */}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
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

// Helper components for stats
function IntegrationCount() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    fetch("/api/integrations/stats/count")
      .then((res) => res.json())
      .then((data) => setCount(data.count || 0))
      .catch(() => setCount(0));
  }, []);

  return <>{count}</>;
}

function WebhookCount() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    fetch("/api/integrations/stats/webhooks/24h")
      .then((res) => res.json())
      .then((data) => setCount(data.count || 0))
      .catch(() => setCount(0));
  }, []);

  return <>{count}</>;
}

function SuccessRate() {
  const [rate, setRate] = useState<string>("0%");

  useEffect(() => {
    fetch("/api/integrations/stats/success-rate")
      .then((res) => res.json())
      .then((data) => setRate(data.rate || "0%"))
      .catch(() => setRate("0%"));
  }, []);

  return <>{rate}</>;
}

function ApiCallCount() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    fetch("/api/integrations/stats/api-calls/24h")
      .then((res) => res.json())
      .then((data) => setCount(data.count || 0))
      .catch(() => setCount(0));
  }, []);

  return <>{count}</>;
}
