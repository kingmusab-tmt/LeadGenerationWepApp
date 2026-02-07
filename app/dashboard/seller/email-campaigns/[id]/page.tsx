"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Send as SendIcon, Save as SaveIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import RecipientPicker from "@/app/components/RecipientPicker";

interface CampaignDetail {
  _id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  fromName: string;
  fromEmail: string;
  recipientEmails: string[];
  status: string;
  totalRecipients: number;
  analytics: {
    sent: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
  };
}

interface AnalyticsData {
  stats: {
    total: number;
    sent: number;
    opened: number;
    openRate: string;
    clicked: number;
    clickRate: string;
    unsubscribed: number;
  };
}

interface TemplateItem {
  _id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  category: string;
}

export default function CampaignEditor() {
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    htmlContent: "",
    textContent: "",
    fromEmail: "",
    fromName: "",
    recipientList: "",
  });

  const fetchCampaign = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/marketing/email/campaigns/${campaignId}`,
      );
      const data = await response.json();
      setCampaign(data);
      setFormData({
        name: data.name,
        subject: data.subject,
        htmlContent: data.htmlContent || "",
        textContent: data.textContent || "",
        fromEmail: data.fromEmail || "",
        fromName: data.fromName || "",
        recipientList: (data.recipientEmails || []).join(", "),
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/marketing/email/campaigns/${campaignId}/analytics`,
      );
      const data = await response.json();
      setAnalytics(data);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      console.error("Failed to load analytics");
    }
  }, [campaignId]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch("/api/marketing/email/templates");
      const data = await response.json();
      setTemplates(data || []);
    } catch {
      // Templates are optional — don't block
    }
  }, []);

  useEffect(() => {
    void fetchCampaign();
    void fetchAnalytics();
    void fetchTemplates();
  }, [fetchCampaign, fetchAnalytics, fetchTemplates]);

  const handleSave = async () => {
    try {
      setSaving(true);
      // Parse recipients from comma-separated string
      const recipientArray = formData.recipientList
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0);

      const response = await fetch(
        `/api/marketing/email/campaigns/${campaignId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            subject: formData.subject,
            htmlContent: formData.htmlContent,
            textContent: formData.textContent,
            fromEmail: formData.fromEmail || undefined,
            fromName: formData.fromName || undefined,
            recipientList:
              recipientArray.length > 0 ? recipientArray : undefined,
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to save campaign");

      toast.success("Campaign saved successfully");
      fetchCampaign();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      toast.error("Error saving campaign");
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (
      !window.confirm(
        "Are you sure you want to send this campaign to all recipients?",
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        `/api/marketing/email/campaigns/${campaignId}/actions?action=send`,
        {
          method: "POST",
        },
      );

      if (!response.ok) throw new Error("Failed to send campaign");

      const data = await response.json();
      toast.success(`Campaign sent successfully to ${data.sent} recipients`);
      fetchCampaign();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      toast.error("Error sending campaign");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!campaign) {
    return <Alert severity="error">Campaign not found</Alert>;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4">{campaign.name}</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {campaign.status === "draft" && (
            <Button
              variant="contained"
              color="success"
              startIcon={<SendIcon />}
              onClick={handleSend}
              disabled={saving}
            >
              Send Campaign
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving || campaign.status !== "draft"}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={(_, newValue) => setTabValue(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="Editor" />
        <Tab label="Preview" />
        <Tab label="Analytics" />
      </Tabs>

      {/* Editor Tab */}
      {tabValue === 0 && (
        <Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Campaign Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                fullWidth
                disabled={campaign.status !== "draft"}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Subject Line"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                fullWidth
                disabled={campaign.status !== "draft"}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="From Email"
                value={formData.fromEmail}
                onChange={(e) =>
                  setFormData({ ...formData, fromEmail: e.target.value })
                }
                fullWidth
                disabled={campaign.status !== "draft"}
                helperText="Sender email address (uses SMTP settings default if empty)"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="From Name"
                value={formData.fromName}
                onChange={(e) =>
                  setFormData({ ...formData, fromName: e.target.value })
                }
                fullWidth
                disabled={campaign.status !== "draft"}
                helperText="Display name for the sender"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <RecipientPicker
                value={formData.recipientList}
                onChange={(val) =>
                  setFormData({ ...formData, recipientList: val })
                }
                disabled={campaign.status !== "draft"}
              />
            </Grid>
            {/* Template Picker */}
            {campaign.status === "draft" && templates.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Load Template</InputLabel>
                  <Select
                    value=""
                    onChange={async (e) => {
                      const templateId = e.target.value;
                      if (!templateId) return;
                      try {
                        const response = await fetch(
                          `/api/marketing/email/templates/${templateId}`,
                        );
                        const tmpl = await response.json();
                        setFormData((prev) => ({
                          ...prev,
                          subject: tmpl.subject || prev.subject,
                          htmlContent: tmpl.htmlContent || prev.htmlContent,
                          textContent: tmpl.textContent || prev.textContent,
                        }));
                        toast.success("Template loaded into campaign");
                      } catch {
                        toast.error("Failed to load template");
                      }
                    }}
                    label="Load Template"
                  >
                    {templates.map((t) => (
                      <MenuItem key={t._id} value={t._id}>
                        {t.name} ({t.category})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <TextField
                label="HTML Content"
                value={formData.htmlContent}
                onChange={(e) =>
                  setFormData({ ...formData, htmlContent: e.target.value })
                }
                fullWidth
                multiline
                rows={10}
                disabled={campaign.status !== "draft"}
                variant="outlined"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Plain Text Content (Optional)"
                value={formData.textContent}
                onChange={(e) =>
                  setFormData({ ...formData, textContent: e.target.value })
                }
                fullWidth
                multiline
                rows={6}
                disabled={campaign.status !== "draft"}
                variant="outlined"
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Preview Tab */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Email Preview
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                border: "1px solid #ddd",
                padding: 2,
                borderRadius: 1,
                backgroundColor: "#fafafa",
              }}
            >
              <Typography variant="subtitle2">
                Subject: {campaign.subject}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box
                dangerouslySetInnerHTML={{ __html: formData.htmlContent }}
                sx={{
                  "& img": { maxWidth: "100%" },
                  "& a": { color: "#1976d2" },
                }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Analytics Tab */}
      {tabValue === 2 && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Recipients
                </Typography>
                <Typography variant="h5">
                  {analytics?.stats.total || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Sent
                </Typography>
                <Typography variant="h5">
                  {analytics?.stats.sent || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Open Rate
                </Typography>
                <Typography variant="h5">
                  {analytics?.stats.openRate || "0%"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Click Rate
                </Typography>
                <Typography variant="h5">
                  {analytics?.stats.clickRate || "0%"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Detailed Metrics
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography>
                    Opened: {analytics?.stats.opened || 0}
                  </Typography>
                  <Typography>
                    Clicked: {analytics?.stats.clicked || 0}
                  </Typography>
                  <Typography>
                    Unsubscribed: {analytics?.stats.unsubscribed || 0}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
