/**
 * HubSpot Integration Component
 * UI for configuring HubSpot CRM integration
 *
 * Date: January 21, 2026
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from "@mui/icons-material";

interface HubSpotConfig {
  id: string;
  apiKey?: string;
  webhookUrl: string;
  isActive: boolean;
  events: {
    contactCreated: boolean;
    contactUpdated: boolean;
    dealCreated: boolean;
    dealStageChanged: boolean;
    dealClosed: boolean;
  };
  statistics?: {
    totalDispatches: number;
    successfulDispatches: number;
    failedDispatches: number;
  };
  lastSync?: string;
}

interface Props {
  onNotify: (
    message: string,
    severity?: "success" | "error" | "info" | "warning",
  ) => void;
}

export default function HubSpotIntegration({ onNotify }: Props) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState<HubSpotConfig | null>(null);
  const [formData, setFormData] = useState({
    apiKey: "",
    webhookUrl: "",
    contactCreated: true,
    contactUpdated: true,
    dealCreated: true,
    dealStageChanged: true,
    dealClosed: true,
  });
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/hubspot");
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
          setFormData({
            apiKey: "",
            webhookUrl: data.config.webhookUrl || "",
            contactCreated: data.config.events?.contactCreated ?? true,
            contactUpdated: data.config.events?.contactUpdated ?? true,
            dealCreated: data.config.events?.dealCreated ?? true,
            dealStageChanged: data.config.events?.dealStageChanged ?? true,
            dealClosed: data.config.events?.dealClosed ?? true,
          });
        }
      }
    } catch (error) {
      console.error("Failed to load HubSpot config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.apiKey && !config) {
      onNotify("HubSpot API key is required", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/integrations/hubspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: formData.apiKey || undefined,
          webhookUrl: formData.webhookUrl || undefined,
          events: {
            contactCreated: formData.contactCreated,
            contactUpdated: formData.contactUpdated,
            dealCreated: formData.dealCreated,
            dealStageChanged: formData.dealStageChanged,
            dealClosed: formData.dealClosed,
          },
        }),
      });

      if (res.ok) {
        onNotify("HubSpot integration saved successfully", "success");
        await loadConfig();
      } else {
        const error = await res.json();
        onNotify(error.error || "Failed to save HubSpot integration", "error");
      }
    } catch (error) {
      onNotify("Failed to save HubSpot integration", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/integrations/hubspot/test", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        onNotify(data.message || "Connection test successful", "success");
      } else {
        const error = await res.json();
        onNotify(error.error || "Connection test failed", "error");
      }
    } catch (error) {
      onNotify("Connection test failed", "error");
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove the HubSpot integration?")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/integrations/hubspot/${config?.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onNotify("HubSpot integration removed", "success");
        setConfig(null);
        setFormData({
          apiKey: "",
          webhookUrl: "",
          contactCreated: true,
          contactUpdated: true,
          dealCreated: true,
          dealStageChanged: true,
          dealClosed: true,
        });
      } else {
        onNotify("Failed to remove integration", "error");
      }
    } catch (error) {
      onNotify("Failed to remove integration", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !config) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          HubSpot CRM Integration
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Connect BRIXCOT with HubSpot to sync leads, contacts, and deals
        </Typography>
      </Box>

      {config && (
        <Alert
          severity="success"
          icon={<CheckCircleIcon />}
          sx={{ mb: 3 }}
          action={
            <IconButton size="small" onClick={handleDelete} color="inherit">
              <DeleteIcon />
            </IconButton>
          }
        >
          HubSpot integration is active
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Configuration
              </Typography>

              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="HubSpot API Key"
                  type={showApiKey ? "text" : "password"}
                  value={formData.apiKey}
                  onChange={(e) =>
                    setFormData({ ...formData, apiKey: e.target.value })
                  }
                  placeholder={config ? "Enter new API key to update" : ""}
                  helperText="Get from HubSpot → Settings → Integrations → API Key"
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="Webhook URL (Optional)"
                  value={formData.webhookUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, webhookUrl: e.target.value })
                  }
                  helperText="BRIXCOT webhook endpoint to receive HubSpot events"
                  margin="normal"
                />
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" gutterBottom>
                Event Subscriptions
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.contactCreated}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactCreated: e.target.checked,
                      })
                    }
                  />
                }
                label="Contact Created"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.contactUpdated}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactUpdated: e.target.checked,
                      })
                    }
                  />
                }
                label="Contact Updated"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.dealCreated}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dealCreated: e.target.checked,
                      })
                    }
                  />
                }
                label="Deal Created"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.dealStageChanged}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dealStageChanged: e.target.checked,
                      })
                    }
                  />
                }
                label="Deal Stage Changed"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.dealClosed}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dealClosed: e.target.checked,
                      })
                    }
                  />
                }
                label="Deal Closed"
              />

              <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={loading}
                  fullWidth
                >
                  {config ? "Update" : "Save"} Integration
                </Button>
                {config && (
                  <Button
                    variant="outlined"
                    onClick={handleTest}
                    disabled={testing}
                    startIcon={testing ? <CircularProgress size={20} /> : null}
                  >
                    Test
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Integration Status
              </Typography>

              {config ? (
                <>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Status"
                        secondary={
                          <Chip
                            label={config.isActive ? "Active" : "Inactive"}
                            color={config.isActive ? "success" : "default"}
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Total Dispatches"
                        secondary={config.statistics?.totalDispatches || 0}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Successful"
                        secondary={config.statistics?.successfulDispatches || 0}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Failed"
                        secondary={config.statistics?.failedDispatches || 0}
                      />
                    </ListItem>
                    {config.lastSync && (
                      <ListItem>
                        <ListItemText
                          primary="Last Sync"
                          secondary={new Date(config.lastSync).toLocaleString()}
                        />
                      </ListItem>
                    )}
                  </List>
                </>
              ) : (
                <Alert severity="info" icon={<InfoIcon />}>
                  No HubSpot integration configured yet. Enter your API key to
                  get started.
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Documentation
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Learn how to set up and use the HubSpot integration:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="1. Get HubSpot API Key"
                    secondary="Settings → Integrations → API Key"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="2. Configure Events"
                    secondary="Select which HubSpot events to sync"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="3. Test Connection"
                    secondary="Verify integration is working"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="4. Monitor Activity"
                    secondary="Check statistics and sync status"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
