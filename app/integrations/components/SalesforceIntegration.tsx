/**
 * Salesforce Integration Component
 * UI for configuring Salesforce CRM integration
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
  IconButton,
  CircularProgress,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
} from "@mui/icons-material";

interface SalesforceConfig {
  id: string;
  instanceUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  webhookUrl: string;
  isActive: boolean;
  leadConversion: {
    enabled: boolean;
    autoConvert: boolean;
    convertToAccount: boolean;
    convertToContact: boolean;
    convertToOpportunity: boolean;
  };
  events: {
    leadCreated: boolean;
    leadUpdated: boolean;
    leadConverted: boolean;
    opportunityCreated: boolean;
    opportunityStageChanged: boolean;
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

export default function SalesforceIntegration({ onNotify }: Props) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState<SalesforceConfig | null>(null);
  const [formData, setFormData] = useState({
    instanceUrl: "",
    clientId: "",
    clientSecret: "",
    username: "",
    password: "",
    securityToken: "",
    webhookUrl: "",
    autoConvert: false,
    convertToAccount: true,
    convertToContact: true,
    convertToOpportunity: true,
    leadCreated: true,
    leadUpdated: true,
    leadConverted: true,
    opportunityCreated: true,
    opportunityStageChanged: true,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/salesforce");
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
          setFormData({
            instanceUrl: data.config.instanceUrl || "",
            clientId: "",
            clientSecret: "",
            username: "",
            password: "",
            securityToken: "",
            webhookUrl: data.config.webhookUrl || "",
            autoConvert: data.config.leadConversion?.autoConvert ?? false,
            convertToAccount:
              data.config.leadConversion?.convertToAccount ?? true,
            convertToContact:
              data.config.leadConversion?.convertToContact ?? true,
            convertToOpportunity:
              data.config.leadConversion?.convertToOpportunity ?? true,
            leadCreated: data.config.events?.leadCreated ?? true,
            leadUpdated: data.config.events?.leadUpdated ?? true,
            leadConverted: data.config.events?.leadConverted ?? true,
            opportunityCreated: data.config.events?.opportunityCreated ?? true,
            opportunityStageChanged:
              data.config.events?.opportunityStageChanged ?? true,
          });
        }
      }
    } catch (error) {
      console.error("Failed to load Salesforce config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.instanceUrl && !config) {
      onNotify("Salesforce instance URL is required", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/integrations/salesforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceUrl: formData.instanceUrl || undefined,
          clientId: formData.clientId || undefined,
          clientSecret: formData.clientSecret || undefined,
          username: formData.username || undefined,
          password: formData.password || undefined,
          securityToken: formData.securityToken || undefined,
          webhookUrl: formData.webhookUrl || undefined,
          leadConversion: {
            enabled: true,
            autoConvert: formData.autoConvert,
            convertToAccount: formData.convertToAccount,
            convertToContact: formData.convertToContact,
            convertToOpportunity: formData.convertToOpportunity,
          },
          events: {
            leadCreated: formData.leadCreated,
            leadUpdated: formData.leadUpdated,
            leadConverted: formData.leadConverted,
            opportunityCreated: formData.opportunityCreated,
            opportunityStageChanged: formData.opportunityStageChanged,
          },
        }),
      });

      if (res.ok) {
        onNotify("Salesforce integration saved successfully", "success");
        await loadConfig();
      } else {
        const error = await res.json();
        onNotify(
          error.error || "Failed to save Salesforce integration",
          "error",
        );
      }
    } catch (error) {
      onNotify("Failed to save Salesforce integration", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/integrations/salesforce/test", {
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
    if (
      !confirm("Are you sure you want to remove the Salesforce integration?")
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/integrations/salesforce/${config?.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onNotify("Salesforce integration removed", "success");
        setConfig(null);
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
          Salesforce CRM Integration
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Connect BRIXCOT with Salesforce to sync leads, contacts, and
          opportunities
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
          Salesforce integration is active
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                OAuth 2.0 Configuration
              </Typography>

              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Instance URL"
                  value={formData.instanceUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, instanceUrl: e.target.value })
                  }
                  placeholder="https://your-domain.my.salesforce.com"
                  helperText="Your Salesforce instance URL"
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="Client ID"
                  value={formData.clientId}
                  onChange={(e) =>
                    setFormData({ ...formData, clientId: e.target.value })
                  }
                  placeholder={config ? "Enter to update" : ""}
                  helperText="From Connected App"
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="Client Secret"
                  type="password"
                  value={formData.clientSecret}
                  onChange={(e) =>
                    setFormData({ ...formData, clientSecret: e.target.value })
                  }
                  placeholder={config ? "Enter to update" : ""}
                  helperText="From Connected App"
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="Username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder={config ? "Enter to update" : ""}
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder={config ? "Enter to update" : ""}
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="Security Token"
                  type="password"
                  value={formData.securityToken}
                  onChange={(e) =>
                    setFormData({ ...formData, securityToken: e.target.value })
                  }
                  placeholder={config ? "Enter to update" : ""}
                  helperText="Get from Settings → Reset Security Token"
                  margin="normal"
                />
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" gutterBottom>
                Lead Conversion Settings
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.autoConvert}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        autoConvert: e.target.checked,
                      })
                    }
                  />
                }
                label="Auto-convert qualified leads"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.convertToAccount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        convertToAccount: e.target.checked,
                      })
                    }
                  />
                }
                label="Create Account on conversion"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.convertToContact}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        convertToContact: e.target.checked,
                      })
                    }
                  />
                }
                label="Create Contact on conversion"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.convertToOpportunity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        convertToOpportunity: e.target.checked,
                      })
                    }
                  />
                }
                label="Create Opportunity on conversion"
              />

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" gutterBottom>
                Event Subscriptions
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.leadCreated}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        leadCreated: e.target.checked,
                      })
                    }
                  />
                }
                label="Lead Created"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.leadUpdated}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        leadUpdated: e.target.checked,
                      })
                    }
                  />
                }
                label="Lead Updated"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.leadConverted}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        leadConverted: e.target.checked,
                      })
                    }
                  />
                }
                label="Lead Converted"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.opportunityCreated}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        opportunityCreated: e.target.checked,
                      })
                    }
                  />
                }
                label="Opportunity Created"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.opportunityStageChanged}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        opportunityStageChanged: e.target.checked,
                      })
                    }
                  />
                }
                label="Opportunity Stage Changed"
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
                  No Salesforce integration configured yet. Enter your
                  credentials to get started.
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Setup Guide
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="1. Create Connected App"
                    secondary="Salesforce Setup → Apps → App Manager"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="2. Get OAuth Credentials"
                    secondary="Copy Client ID and Client Secret"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="3. Reset Security Token"
                    secondary="Settings → Reset Security Token"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="4. Configure Events"
                    secondary="Select which Salesforce events to sync"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="5. Test Connection"
                    secondary="Verify integration is working"
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
