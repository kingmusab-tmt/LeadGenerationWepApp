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
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Tabs,
  Tab,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  CircularProgress,
  Snackbar,
  Tooltip,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import { useSession } from "next-auth/react";
import HubSpotIntegration from "./components/HubSpotIntegration";
import SalesforceIntegration from "./components/SalesforceIntegration";
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
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function IntegrationsPage() {
  const { data: session, status } = useSession();
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
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">Please sign in to manage integrations.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Integrations
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Connect BRIXCOT with your favorite CRM platforms and automation tools
        </Typography>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 3 }}>
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
        <Grid size={{ xs: 12, md: 3 }}>
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
        <Grid size={{ xs: 12, md: 3 }}>
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
        <Grid size={{ xs: 12, md: 3 }}>
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
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="integration tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="HubSpot" icon={<SettingsIcon />} iconPosition="start" />
            <Tab
              label="Salesforce"
              icon={<SettingsIcon />}
              iconPosition="start"
            />
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
          <HubSpotIntegration onNotify={showSnackbar} />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <SalesforceIntegration onNotify={showSnackbar} />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <ZapierIntegration onNotify={showSnackbar} />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <WebhookStatistics onNotify={showSnackbar} />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
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
    </Container>
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
