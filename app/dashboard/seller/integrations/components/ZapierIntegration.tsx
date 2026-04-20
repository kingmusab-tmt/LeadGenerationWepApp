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
  Info as InfoIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Code as CodeIcon,
} from "@mui/icons-material";
import { useCSRFFetch } from "@/app/hooks/useCSRF";
import { useConfirm } from "@/app/hooks/useConfirm";
import ConfirmDialog from "@/app/components/ConfirmDialog";

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
  const fetchWithCSRF = useCSRFFetch();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
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
    } catch {
      onNotify("Failed to add webhook", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (configId: string) => {
    const confirmed = await confirm({
      title: "Remove Webhook",
      message: "Are you sure you want to remove this Zapier webhook?",
      confirmText: "Remove",
      confirmColor: "error",
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetchWithCSRF(`/api/integrations/zapier/${configId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onNotify("Zapier webhook removed", "success");
        await loadConfigs();
      } else {
        onNotify("Failed to remove webhook", "error");
      }
    } catch {
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
    } catch {
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
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Triggers (Outgoing)" />
          <Tab label="Actions (Incoming)" />
          <Tab
            label="API Documentation"
            icon={<CodeIcon />}
            iconPosition="start"
          />
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
              sx={{
                mb: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
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
                    No Zapier webhooks configured yet. Click &quot;Add
                    Webhook&quot; to get started.
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

      <TabPanel value={tab} index={2}>
        <ApiDocumentation onNotify={onNotify} />
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmColor={confirmState.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
}

// API Key Management Tab Component
function ApiKeyManagementTab({ onNotify }: Props) {
  const fetchWithCSRF = useCSRFFetch();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyExists, setApiKeyExists] = useState(false);
  const [truncatedKey, setTruncatedKey] = useState<string | null>(null);
  const [keyCreatedAt, setKeyCreatedAt] = useState<string | null>(null);
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
        setTruncatedKey(data.truncatedKey || null);
        setKeyCreatedAt(data.createdAt || null);
      }
    } catch (error) {
      console.error("Failed to check API key:", error);
    }
  };

  const generateApiKey = async () => {
    if (apiKeyExists) {
      const confirmed = await confirm({
        title: "Generate New Key",
        message:
          "Generating a new key will invalidate your current API key. Any existing Zapier integrations using the old key will stop working. Continue?",
        confirmText: "Generate",
        confirmColor: "warning",
      });
      if (!confirmed) return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/integrations/zapier/api-key", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setApiKey(data.apiKey);
        setTruncatedKey(
          `${data.apiKey.slice(0, 8)}...${data.apiKey.slice(-4)}`,
        );
        setKeyCreatedAt(new Date().toISOString());
        setApiKeyExists(true);
        setShowKey(true);
        onNotify(
          "API key generated successfully. Save it now - it won't be shown again!",
          "success",
        );
      } else {
        onNotify("Failed to generate API key", "error");
      }
    } catch {
      onNotify("Failed to generate API key", "error");
    } finally {
      setLoading(false);
    }
  };

  const revokeApiKey = async () => {
    const confirmed = await confirm({
      title: "Revoke API Key",
      message:
        "Are you sure? This will break all existing Zapier actions using this key.",
      confirmText: "Revoke",
      confirmColor: "error",
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetchWithCSRF("/api/integrations/zapier/api-key", {
        method: "DELETE",
      });

      if (res.ok) {
        setApiKey(null);
        setTruncatedKey(null);
        setKeyCreatedAt(null);
        setApiKeyExists(false);
        onNotify("API key revoked successfully", "success");
      } else {
        onNotify("Failed to revoke API key", "error");
      }
    } catch {
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
              {apiKey ? (
                /* Just generated — show the full key */
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
                    Save this key securely — it won&apos;t be shown again after
                    you leave this page!
                  </Alert>
                </Box>
              ) : (
                /* Previously generated — show truncated preview */
                <Box
                  sx={{
                    mb: 2,
                    p: 2,
                    borderRadius: 1,
                    bgcolor: "action.hover",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography
                      variant="body2"
                      component="div"
                      fontWeight="bold"
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <Chip
                        label="Active"
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                      <Typography
                        component="code"
                        sx={{
                          fontFamily: "monospace",
                          fontSize: "0.9rem",
                          bgcolor: "background.paper",
                          px: 1,
                          py: 0.5,
                          borderRadius: 0.5,
                          border: 1,
                          borderColor: "divider",
                        }}
                      >
                        {truncatedKey || "••••••••...••••"}
                      </Typography>
                    </Typography>
                    {keyCreatedAt && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.5, display: "block" }}
                      >
                        Generated on{" "}
                        {new Date(keyCreatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}

              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={generateApiKey}
                  disabled={loading}
                  sx={{ flex: 1 }}
                >
                  Generate New API Key
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={revokeApiKey}
                  disabled={loading}
                  sx={{ flex: 1 }}
                >
                  Revoke API Key
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                No API key configured yet. Generate one to use Zapier actions
                and other API integrations.
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmColor={confirmState.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
}

// Code block component with copy button
function CodeBlock({
  code,
  onNotify,
}: {
  code: string;
  onNotify: Props["onNotify"];
}) {
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    onNotify("Copied to clipboard", "success");
  };

  return (
    <Box sx={{ position: "relative", mb: 2 }}>
      <IconButton
        size="small"
        onClick={handleCopy}
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          bgcolor: "background.paper",
          "&:hover": { bgcolor: "action.hover" },
          zIndex: 1,
        }}
      >
        <CopyIcon fontSize="small" />
      </IconButton>
      <Box
        component="pre"
        sx={{
          bgcolor: "grey.900",
          color: "grey.100",
          p: 2,
          borderRadius: 1,
          overflow: "auto",
          fontSize: 13,
          fontFamily: "monospace",
          lineHeight: 1.6,
          maxHeight: 400,
          "& .comment": { color: "grey.500" },
        }}
      >
        <code>{code}</code>
      </Box>
    </Box>
  );
}

// API Documentation Tab Component
function ApiDocumentation({ onNotify }: Props) {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://your-domain.com";

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          API Documentation
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Use these endpoints to integrate BRIXCOT with Zapier or any external
          service
        </Typography>
      </Box>

      {/* Authentication */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Authentication
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            All API requests require an API key passed in the{" "}
            <Typography
              component="code"
              variant="body2"
              sx={{
                bgcolor: "action.hover",
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                fontFamily: "monospace",
                fontSize: 12,
                border: 1,
                borderColor: "divider",
              }}
            >
              X-API-Key
            </Typography>{" "}
            header. Generate your API key from the{" "}
            <strong>Actions (Incoming)</strong> tab.
          </Typography>
          <CodeBlock
            onNotify={onNotify}
            code={`// Include this header in every request
X-API-Key: your_api_key_here`}
          />
          <Alert severity="warning" sx={{ mt: 1 }}>
            Keep your API key secret. Never expose it in client-side code or
            public repositories. Revoke and regenerate immediately if
            compromised.
          </Alert>
        </CardContent>
      </Card>

      {/* Base URL */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Base URL
          </Typography>
          <CodeBlock onNotify={onNotify} code={baseUrl} />
          <Typography variant="body2" color="text.secondary">
            All endpoint paths below are relative to this base URL.
          </Typography>
        </CardContent>
      </Card>

      {/* Create Lead */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Chip label="POST" color="success" size="small" />
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              fontFamily="monospace"
            >
              /api/integrations/zapier/actions
            </Typography>
          </Box>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Create Lead
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create a new lead in BRIXCOT from an external source (e.g., Facebook
            Ads, Google Forms via Zapier).
          </Typography>

          <Typography
            variant="caption"
            fontWeight="bold"
            display="block"
            sx={{ mb: 1 }}
          >
            Request Body
          </Typography>
          <CodeBlock
            onNotify={onNotify}
            code={`{
  "action": "create_lead",
  "data": {
    "name": "John Doe",          // Required
    "email": "john@example.com", // Optional
    "phone": "+1234567890",      // Optional
    "company": "Acme Inc",       // Optional
    "industry": "Technology",    // Optional
    "source": "facebook_ads",    // Optional
    "status": "new",             // Optional: new | available | qualified | unqualified | assigned | sold
    "city": "Austin",            // Optional
    "state": "TX",               // Optional
    "country": "US",             // Optional
    "zipCode": "73301"           // Optional
  }
}`}
          />
          <Typography
            variant="caption"
            fontWeight="bold"
            display="block"
            sx={{ mb: 1 }}
          >
            Response (200 OK)
          </Typography>
          <CodeBlock
            onNotify={onNotify}
            code={`{
  "success": true,
  "lead": {
    "id": "65a1b2c3d4e5f6...",
    "name": "John Doe",
    "email": "john@example.com",
    "status": "new",
    "qualificationScore": 75,
    "createdAt": "2026-02-08T12:00:00Z"
  }
}`}
          />
        </CardContent>
      </Card>

      {/* Update Lead */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Chip label="POST" color="success" size="small" />
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              fontFamily="monospace"
            >
              /api/integrations/zapier/actions
            </Typography>
          </Box>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Update Lead
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Update an existing lead&apos;s information. Only provided fields
            will be updated.
          </Typography>

          <Typography
            variant="caption"
            fontWeight="bold"
            display="block"
            sx={{ mb: 1 }}
          >
            Request Body
          </Typography>
          <CodeBlock
            onNotify={onNotify}
            code={`{
  "action": "update_lead",
  "data": {
    "leadId": "65a1b2c3d4e5f6...",  // Required
    "name": "John Smith",            // Optional
    "email": "john.new@example.com", // Optional
    "phone": "+1987654321",          // Optional
    "company": "New Company",        // Optional
    "status": "qualified",           // Optional
    "qualificationScore": 85         // Optional (0-100)
  }
}`}
          />
        </CardContent>
      </Card>

      {/* Search Leads */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Chip label="POST" color="success" size="small" />
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              fontFamily="monospace"
            >
              /api/integrations/zapier/actions
            </Typography>
          </Box>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Search Leads
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Find leads matching one or more search criteria. Returns up to the
            specified limit.
          </Typography>

          <Typography
            variant="caption"
            fontWeight="bold"
            display="block"
            sx={{ mb: 1 }}
          >
            Request Body
          </Typography>
          <CodeBlock
            onNotify={onNotify}
            code={`{
  "action": "search_leads",
  "data": {
    "email": "john@example.com",  // Optional
    "phone": "+1234567890",       // Optional
    "name": "John",               // Optional (partial match)
    "status": "qualified",        // Optional
    "limit": 10                   // Optional (default: 10)
  }
}`}
          />
          <Typography
            variant="caption"
            fontWeight="bold"
            display="block"
            sx={{ mb: 1 }}
          >
            Response (200 OK)
          </Typography>
          <CodeBlock
            onNotify={onNotify}
            code={`{
  "success": true,
  "leads": [
    {
      "id": "65a1b2c3d4e5f6...",
      "name": "John Doe",
      "email": "john@example.com",
      "status": "qualified",
      "qualificationScore": 85
    }
  ],
  "total": 1
}`}
          />
        </CardContent>
      </Card>

      {/* Find Lead by Email */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Chip label="POST" color="success" size="small" />
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              fontFamily="monospace"
            >
              /api/integrations/zapier/actions
            </Typography>
          </Box>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Find Lead by Email
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Look up a specific lead by their email address. Returns the first
            matching lead.
          </Typography>

          <Typography
            variant="caption"
            fontWeight="bold"
            display="block"
            sx={{ mb: 1 }}
          >
            Request Body
          </Typography>
          <CodeBlock
            onNotify={onNotify}
            code={`{
  "action": "find_lead",
  "data": {
    "email": "john@example.com"  // Required
  }
}`}
          />
        </CardContent>
      </Card>

      {/* Assign Lead */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Chip label="POST" color="success" size="small" />
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              fontFamily="monospace"
            >
              /api/integrations/zapier/actions
            </Typography>
          </Box>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Assign Lead to Buyer
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Manually assign a lead to a specific registered buyer by their email
            address.
          </Typography>

          <Typography
            variant="caption"
            fontWeight="bold"
            display="block"
            sx={{ mb: 1 }}
          >
            Request Body
          </Typography>
          <CodeBlock
            onNotify={onNotify}
            code={`{
  "action": "assign_lead",
  "data": {
    "leadId": "65a1b2c3d4e5f6...",    // Required
    "buyerEmail": "buyer@company.com"  // Required
  }
}`}
          />
        </CardContent>
      </Card>

      {/* Update Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Chip label="POST" color="success" size="small" />
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              fontFamily="monospace"
            >
              /api/integrations/zapier/actions
            </Typography>
          </Box>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Update Lead Status
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Change the status of a lead. Triggers any configured automation
            rules (e.g., auto-assignment on &quot;qualified&quot;).
          </Typography>

          <Typography
            variant="caption"
            fontWeight="bold"
            display="block"
            sx={{ mb: 1 }}
          >
            Request Body
          </Typography>
          <CodeBlock
            onNotify={onNotify}
            code={`{
  "action": "update_status",
  "data": {
    "leadId": "65a1b2c3d4e5f6...",  // Required
    "status": "qualified"            // Required: new | available | qualified | unqualified | assigned | sold | transferred
  }
}`}
          />
        </CardContent>
      </Card>

      {/* Get Lead Details */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Chip label="POST" color="success" size="small" />
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              fontFamily="monospace"
            >
              /api/integrations/zapier/actions
            </Typography>
          </Box>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Get Lead Details
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Retrieve the complete details of a specific lead including score,
            assignment history, and metadata.
          </Typography>

          <Typography
            variant="caption"
            fontWeight="bold"
            display="block"
            sx={{ mb: 1 }}
          >
            Request Body
          </Typography>
          <CodeBlock
            onNotify={onNotify}
            code={`{
  "action": "get_lead",
  "data": {
    "leadId": "65a1b2c3d4e5f6..."  // Required
  }
}`}
          />
        </CardContent>
      </Card>

      {/* Error Responses */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Error Responses
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            All endpoints return consistent error responses. Common HTTP status
            codes:
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Grid container spacing={1}>
              {[
                {
                  code: "400",
                  label: "Bad Request",
                  desc: "Invalid action name or missing required fields",
                  color: "warning" as const,
                },
                {
                  code: "401",
                  label: "Unauthorized",
                  desc: "Missing or invalid API key in X-API-Key header",
                  color: "error" as const,
                },
                {
                  code: "404",
                  label: "Not Found",
                  desc: "Lead or resource not found",
                  color: "default" as const,
                },
                {
                  code: "429",
                  label: "Rate Limited",
                  desc: "Too many requests — slow down and retry",
                  color: "warning" as const,
                },
                {
                  code: "500",
                  label: "Server Error",
                  desc: "Internal error — contact support if persistent",
                  color: "error" as const,
                },
              ].map((err) => (
                <Grid size={12} key={err.code}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      py: 0.75,
                    }}
                  >
                    <Chip
                      label={err.code}
                      color={err.color}
                      size="small"
                      sx={{ fontWeight: "bold", minWidth: 50 }}
                    />
                    <Typography variant="body2" fontWeight="bold">
                      {err.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      — {err.desc}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Typography
            variant="caption"
            fontWeight="bold"
            display="block"
            sx={{ mb: 1 }}
          >
            Error Response Format
          </Typography>
          <CodeBlock
            onNotify={onNotify}
            code={`{
  "success": false,
  "error": "Description of what went wrong"
}`}
          />
        </CardContent>
      </Card>

      {/* cURL Example */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Quick Start — cURL Example
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Test the API from your terminal:
          </Typography>
          <CodeBlock
            onNotify={onNotify}
            code={`curl -X POST ${baseUrl}/api/integrations/zapier/actions \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{
    "action": "create_lead",
    "data": {
      "name": "Test Lead",
      "email": "test@example.com",
      "phone": "+1234567890",
      "source": "api_test"
    }
  }'`}
          />
        </CardContent>
      </Card>

      {/* Webhook Triggers */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Outbound Webhook Triggers
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            When you configure a webhook in the <strong>Triggers</strong> tab,
            BRIXCOT sends POST requests to your URL with the following events.
            Each event payload includes an HMAC-SHA256 signature in the{" "}
            <Typography
              component="code"
              variant="body2"
              sx={{
                bgcolor: "action.hover",
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                fontFamily: "monospace",
                fontSize: 12,
                border: 1,
                borderColor: "divider",
              }}
            >
              x-webhook-signature
            </Typography>{" "}
            header for verification.
          </Typography>

          <Grid container spacing={1}>
            {[
              {
                event: "lead_created",
                desc: "Fired when a new lead is captured",
              },
              {
                event: "lead_updated",
                desc: "Fired when lead data changes",
              },
              {
                event: "lead_qualified",
                desc: "Fired when AI scoring qualifies a lead",
              },
              {
                event: "lead_assigned",
                desc: "Fired when a lead is assigned to a buyer",
              },
              {
                event: "lead_accepted",
                desc: "Fired when a buyer accepts a lead",
              },
              {
                event: "lead_rejected",
                desc: "Fired when a buyer rejects a lead",
              },
              {
                event: "lead_sold",
                desc: "Fired when a lead sale is completed",
              },
              {
                event: "deal_created",
                desc: "Fired when a new deal is created",
              },
              { event: "deal_won", desc: "Fired when a deal is marked as won" },
              {
                event: "buyer_registered",
                desc: "Fired when a new buyer registers",
              },
            ].map((trigger) => (
              <Grid size={12} key={trigger.event}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    py: 0.5,
                  }}
                >
                  <Chip
                    label={trigger.event}
                    size="small"
                    variant="outlined"
                    sx={{ fontFamily: "monospace", minWidth: 160 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {trigger.desc}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Typography
            variant="caption"
            fontWeight="bold"
            display="block"
            sx={{ mt: 2, mb: 1 }}
          >
            Example Webhook Payload
          </Typography>
          <CodeBlock
            onNotify={onNotify}
            code={`// Headers sent with each webhook
{
  "Content-Type": "application/json",
  "x-webhook-signature": "sha256=abc123...",  // HMAC-SHA256 of payload
  "x-webhook-timestamp": "1707350400"         // Unix timestamp
}

// Body
{
  "event": "lead_created",
  "timestamp": "2026-02-08T12:00:00Z",
  "data": {
    "id": "65a1b2c3d4e5f6...",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+1234567890",
    "source": "facebook_ads",
    "status": "new",
    "qualificationScore": 72,
    "createdAt": "2026-02-08T12:00:00Z"
  }
}`}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
