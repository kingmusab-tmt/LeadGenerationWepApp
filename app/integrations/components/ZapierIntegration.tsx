/**
 * Zapier Integration Component
 * UI for configuring Zapier triggers and actions
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
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";

interface ZapierConfig {
  id: string;
  webhookUrl: string;
  description?: string;
  events: {
    lead_created: boolean;
    lead_updated: boolean;
    lead_qualified: boolean;
    lead_assigned: boolean;
    lead_accepted: boolean;
    lead_rejected: boolean;
    lead_sold: boolean;
    deal_created: boolean;
    deal_won: boolean;
    buyer_registered: boolean;
  };
  isActive: boolean;
  createdAt: string;
  statistics?: {
    totalDispatches: number;
    successfulDispatches: number;
    failedDispatches: number;
  };
}

interface Props {
  onNotify: (
    message: string,
    severity?: "success" | "error" | "info" | "warning",
  ) => void;
}

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
      id={`zapier-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export default function ZapierIntegration({ onNotify }: Props) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<ZapierConfig[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    webhookUrl: "",
    description: "",
    lead_created: true,
    lead_updated: true,
    lead_qualified: true,
    lead_assigned: true,
    lead_accepted: true,
    lead_rejected: true,
    lead_sold: true,
    deal_created: true,
    deal_won: true,
    buyer_registered: true,
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/zapier");
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs || []);
      }
    } catch (error) {
      console.error("Failed to load Zapier configs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddConfig = async () => {
    if (!formData.webhookUrl) {
      onNotify("Webhook URL is required", "error");
      return;
    }

    if (!formData.webhookUrl.startsWith("https://hooks.zapier.com/")) {
      onNotify("Invalid Zapier webhook URL", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/integrations/zapier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: formData.webhookUrl,
          description: formData.description,
          events: {
            lead_created: formData.lead_created,
            lead_updated: formData.lead_updated,
            lead_qualified: formData.lead_qualified,
            lead_assigned: formData.lead_assigned,
            lead_accepted: formData.lead_accepted,
            lead_rejected: formData.lead_rejected,
            lead_sold: formData.lead_sold,
            deal_created: formData.deal_created,
            deal_won: formData.deal_won,
            buyer_registered: formData.buyer_registered,
          },
        }),
      });

      if (res.ok) {
        onNotify("Zapier webhook added successfully", "success");
        setDialogOpen(false);
        setFormData({
          webhookUrl: "",
          description: "",
          lead_created: true,
          lead_updated: true,
          lead_qualified: true,
          lead_assigned: true,
          lead_accepted: true,
          lead_rejected: true,
          lead_sold: true,
          deal_created: true,
          deal_won: true,
          buyer_registered: true,
        });
        await loadConfigs();
      } else {
        const error = await res.json();
        onNotify(error.error || "Failed to add webhook", "error");
      }
    } catch (error) {
      onNotify("Failed to add webhook", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (configId: string) => {
    if (!confirm("Are you sure you want to remove this Zapier webhook?")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/integrations/zapier/${configId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onNotify("Zapier webhook removed", "success");
        await loadConfigs();
      } else {
        onNotify("Failed to remove webhook", "error");
      }
    } catch (error) {
      onNotify("Failed to remove webhook", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (configId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/zapier/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId }),
      });

      if (res.ok) {
        onNotify("Test trigger sent successfully", "success");
      } else {
        const error = await res.json();
        onNotify(error.error || "Test failed", "error");
      }
    } catch (error) {
      onNotify("Test failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Zapier Integration
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Connect BRIXCOT with 6,000+ apps through Zapier
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Triggers (Outgoing)" />
          <Tab label="Actions (Incoming)" />
        </Tabs>
      </Box>

      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
              Triggers send data from BRIXCOT to Zapier when events occur (e.g.,
              new lead created)
            </Alert>

            <Box
              sx={{ mb: 2, display: "flex", justifyContent: "space-between" }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Active Webhooks
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setDialogOpen(true)}
              >
                Add Webhook
              </Button>
            </Box>

            {loading && !configs.length ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : configs.length === 0 ? (
              <Card>
                <CardContent>
                  <Alert severity="info">
                    No Zapier webhooks configured yet. Click "Add Webhook" to
                    get started.
                  </Alert>
                </CardContent>
              </Card>
            ) : (
              <Grid container spacing={2}>
                {configs.map((config) => (
                  <Grid size={12} key={config.id}>
                    <Card>
                      <CardContent>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            mb: 2,
                          }}
                        >
                          <Typography variant="subtitle1" fontWeight="bold">
                            {config.description || "Zapier Webhook"}
                          </Typography>
                          <Chip
                            label={config.isActive ? "Active" : "Inactive"}
                            color={config.isActive ? "success" : "default"}
                            size="small"
                          />
                        </Box>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          {config.webhookUrl}
                        </Typography>

                        <Box sx={{ mt: 2, mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Subscribed Events:
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 0.5,
                              mt: 1,
                            }}
                          >
                            {Object.entries(config.events)
                              .filter(([, enabled]) => enabled)
                              .map(([event]) => (
                                <Chip
                                  key={event}
                                  label={event}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                          </Box>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={2}>
                          <Grid size={4}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Total Dispatches
                            </Typography>
                            <Typography variant="h6">
                              {config.statistics?.totalDispatches || 0}
                            </Typography>
                          </Grid>
                          <Grid size={4}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Successful
                            </Typography>
                            <Typography variant="h6" color="success.main">
                              {config.statistics?.successfulDispatches || 0}
                            </Typography>
                          </Grid>
                          <Grid size={4}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Failed
                            </Typography>
                            <Typography variant="h6" color="error.main">
                              {config.statistics?.failedDispatches || 0}
                            </Typography>
                          </Grid>
                        </Grid>

                        <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleTest(config.id)}
                          >
                            Test
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleDelete(config.id)}
                            startIcon={<DeleteIcon />}
                          >
                            Remove
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <ApiKeyManagementTab onNotify={onNotify} />
      </TabPanel>

      {/* Add Webhook Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Zapier Webhook</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Webhook URL"
            value={formData.webhookUrl}
            onChange={(e) =>
              setFormData({ ...formData, webhookUrl: e.target.value })
            }
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            helperText="Get from Zapier → Webhooks by Zapier → Catch Hook"
            margin="normal"
          />

          <TextField
            fullWidth
            label="Description (Optional)"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="e.g., Send to Slack"
            margin="normal"
          />

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>
            Select Events to Trigger
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={formData.lead_created}
                onChange={(e) =>
                  setFormData({ ...formData, lead_created: e.target.checked })
                }
              />
            }
            label="Lead Created"
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.lead_updated}
                onChange={(e) =>
                  setFormData({ ...formData, lead_updated: e.target.checked })
                }
              />
            }
            label="Lead Updated"
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.lead_qualified}
                onChange={(e) =>
                  setFormData({ ...formData, lead_qualified: e.target.checked })
                }
              />
            }
            label="Lead Qualified"
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.lead_assigned}
                onChange={(e) =>
                  setFormData({ ...formData, lead_assigned: e.target.checked })
                }
              />
            }
            label="Lead Assigned"
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.lead_accepted}
                onChange={(e) =>
                  setFormData({ ...formData, lead_accepted: e.target.checked })
                }
              />
            }
            label="Lead Accepted"
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.lead_rejected}
                onChange={(e) =>
                  setFormData({ ...formData, lead_rejected: e.target.checked })
                }
              />
            }
            label="Lead Rejected"
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.lead_sold}
                onChange={(e) =>
                  setFormData({ ...formData, lead_sold: e.target.checked })
                }
              />
            }
            label="Lead Sold"
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.deal_created}
                onChange={(e) =>
                  setFormData({ ...formData, deal_created: e.target.checked })
                }
              />
            }
            label="Deal Created"
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.deal_won}
                onChange={(e) =>
                  setFormData({ ...formData, deal_won: e.target.checked })
                }
              />
            }
            label="Deal Won"
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.buyer_registered}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    buyer_registered: e.target.checked,
                  })
                }
              />
            }
            label="Buyer Registered"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddConfig}
            disabled={loading}
          >
            Add Webhook
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// API Key Management Tab Component
function ApiKeyManagementTab({ onNotify }: Props) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyExists, setApiKeyExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      const res = await fetch("/api/integrations/zapier/api-key");
      if (res.ok) {
        const data = await res.json();
        setApiKeyExists(data.exists);
      }
    } catch (error) {
      console.error("Failed to check API key:", error);
    }
  };

  const generateApiKey = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/zapier/api-key", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setApiKey(data.apiKey);
        setApiKeyExists(true);
        setShowKey(true);
        onNotify(
          "API key generated successfully. Save it now - it won't be shown again!",
          "success",
        );
      } else {
        onNotify("Failed to generate API key", "error");
      }
    } catch (error) {
      onNotify("Failed to generate API key", "error");
    } finally {
      setLoading(false);
    }
  };

  const revokeApiKey = async () => {
    if (
      !confirm(
        "Are you sure? This will break all existing Zapier actions using this key.",
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/integrations/zapier/api-key", {
        method: "DELETE",
      });

      if (res.ok) {
        setApiKey(null);
        setApiKeyExists(false);
        onNotify("API key revoked successfully", "success");
      } else {
        onNotify("Failed to revoke API key", "error");
      }
    } catch (error) {
      onNotify("Failed to revoke API key", "error");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      onNotify("API key copied to clipboard", "success");
    }
  };

  return (
    <Box>
      <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
        Actions allow Zapier to send data to BRIXCOT (e.g., create lead from
        form submission)
      </Alert>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            API Key for Zapier Actions
          </Typography>

          {apiKeyExists ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                API key is active and ready to use
              </Alert>

              {apiKey && (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Your API Key"
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => setShowKey(!showKey)}
                          >
                            {showKey ? (
                              <VisibilityOffIcon />
                            ) : (
                              <VisibilityIcon />
                            )}
                          </IconButton>
                          <IconButton size="small" onClick={copyToClipboard}>
                            <CopyIcon />
                          </IconButton>
                        </Box>
                      ),
                    }}
                  />
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Save this key securely - it won't be shown again after you
                    leave this page!
                  </Alert>
                </Box>
              )}

              <Button
                variant="outlined"
                color="error"
                onClick={revokeApiKey}
                disabled={loading}
                fullWidth
              >
                Revoke API Key
              </Button>
            </Box>
          ) : (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                No API key configured yet. Generate one to use Zapier actions.
              </Alert>

              <Button
                variant="contained"
                onClick={generateApiKey}
                disabled={loading}
                fullWidth
              >
                Generate API Key
              </Button>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" gutterBottom>
            Available Actions
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Create Lead"
                secondary="Create new leads in BRIXCOT from external sources"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Update Lead"
                secondary="Update existing lead information"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Search Leads"
                secondary="Find leads matching criteria"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Assign Lead"
                secondary="Assign leads to buyers automatically"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Update Status"
                secondary="Change lead status"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}
