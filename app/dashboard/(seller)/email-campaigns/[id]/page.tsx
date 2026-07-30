"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Switch,
  FormControlLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
} from "@mui/material";
import {
  Send as SendIcon,
  Save as SaveIcon,
  Pause as PauseIcon,
  PlayArrow as ResumeIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import RecipientPicker from "@/app/components/RecipientPicker";
import { useConfirm } from "@/app/hooks/useConfirm";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useCSRFFetch } from "@/app/hooks/useCSRF";

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
  goals?: {
    targetOpenRate?: number;
    targetClickRate?: number;
    targetConversionRate?: number;
  };
  abTesting?: {
    enabled: boolean;
    variantSubject?: string;
    variantContent?: string;
    splitPercentage?: number;
    winningVariant?: "A" | "B";
  };
}

interface VariantStat {
  sent: number;
  opened: number;
  clicked: number;
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
    goals?: {
      targetOpenRate?: number;
      targetClickRate?: number;
      targetConversionRate?: number;
    };
    variantStats?: {
      A: VariantStat;
      B: VariantStat;
      winningVariant?: "A" | "B";
    };
  };
}

interface RecipientRow {
  _id: string;
  recipientEmail: string;
  status: string;
  variant?: "A" | "B";
  openedAt?: string;
  clickedAt?: string;
  error?: string;
}

export default function CampaignEditor() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const fetchWithCSRF = useCSRFFetch();

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<
    "pause" | "resume" | "delete" | null
  >(null);
  const [tabValue, setTabValue] = useState(0);
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    htmlContent: "",
    textContent: "",
    fromEmail: "",
    fromName: "",
    recipientList: "",
    targetOpenRate: "",
    targetClickRate: "",
    targetConversionRate: "",
    abTestingEnabled: false,
    variantSubject: "",
    variantContent: "",
    splitPercentage: "50",
  });

  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientsPage, setRecipientsPage] = useState(1);
  const [recipientsPages, setRecipientsPages] = useState(1);
  const [recipientsStatusFilter, setRecipientsStatusFilter] = useState("all");

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
        targetOpenRate: data.goals?.targetOpenRate?.toString() || "",
        targetClickRate: data.goals?.targetClickRate?.toString() || "",
        targetConversionRate:
          data.goals?.targetConversionRate?.toString() || "",
        abTestingEnabled: data.abTesting?.enabled || false,
        variantSubject: data.abTesting?.variantSubject || "",
        variantContent: data.abTesting?.variantContent || "",
        splitPercentage: data.abTesting?.splitPercentage?.toString() || "50",
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

  const fetchRecipients = useCallback(
    async (page: number, statusFilter: string) => {
      try {
        setRecipientsLoading(true);
        const params = new URLSearchParams({
          page: String(page),
          limit: "25",
        });
        if (statusFilter !== "all") params.set("status", statusFilter);
        const response = await fetch(
          `/api/marketing/email/campaigns/${campaignId}/recipients?${params}`,
        );
        const data = await response.json();
        setRecipients(data.recipients || []);
        setRecipientsPages(data.pagination?.pages || 1);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        toast.error("Failed to load recipients");
      } finally {
        setRecipientsLoading(false);
      }
    },
    [campaignId],
  );

  useEffect(() => {
    void fetchCampaign();
    void fetchAnalytics();
  }, [fetchCampaign, fetchAnalytics]);

  useEffect(() => {
    if (tabValue === 2) {
      void fetchRecipients(recipientsPage, recipientsStatusFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabValue, recipientsPage, recipientsStatusFilter]);

  const handleSave = async () => {
    try {
      setSaving(true);
      // Parse recipients from comma-separated string
      const recipientArray = formData.recipientList
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0);

      const response = await fetchWithCSRF(
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
            goals: {
              targetOpenRate: formData.targetOpenRate
                ? Number(formData.targetOpenRate)
                : undefined,
              targetClickRate: formData.targetClickRate
                ? Number(formData.targetClickRate)
                : undefined,
              targetConversionRate: formData.targetConversionRate
                ? Number(formData.targetConversionRate)
                : undefined,
            },
            abTesting: {
              enabled: formData.abTestingEnabled,
              variantSubject: formData.variantSubject || undefined,
              variantContent: formData.variantContent || undefined,
              splitPercentage: formData.splitPercentage
                ? Number(formData.splitPercentage)
                : undefined,
            },
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
    const confirmed = await confirm({
      title: "Send Campaign",
      message: "Are you sure you want to send this campaign to all recipients?",
      confirmText: "Send Now",
      confirmColor: "primary",
    });
    if (!confirmed) return;

    try {
      setSaving(true);
      const response = await fetchWithCSRF(
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

  const handlePause = async () => {
    try {
      setActionLoading("pause");
      const response = await fetchWithCSRF(
        `/api/marketing/email/campaigns/${campaignId}/actions?action=pause`,
        { method: "POST" },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to pause campaign");
      }
      toast.success("Campaign paused");
      fetchCampaign();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Error pausing campaign",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async () => {
    try {
      setActionLoading("resume");
      const response = await fetchWithCSRF(
        `/api/marketing/email/campaigns/${campaignId}/actions?action=resume`,
        { method: "POST" },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to resume campaign");
      }
      const data = await response.json();
      toast.success(data.message || "Campaign resumed");
      fetchCampaign();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Error resuming campaign",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!campaign) return;
    const hasSendHistory = campaign.analytics.sent > 0;
    const confirmed = await confirm({
      title: "Delete Campaign",
      message: hasSendHistory
        ? `This campaign was already sent to ${campaign.analytics.sent} recipient(s) — deleting it permanently erases all of its send, open, and click history. This cannot be undone.`
        : "Are you sure you want to delete this campaign? This action cannot be undone.",
      confirmText: "Delete",
      confirmColor: "error",
    });
    if (!confirmed) return;

    try {
      setActionLoading("delete");
      const response = await fetchWithCSRF(
        `/api/marketing/email/campaigns/${campaignId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete campaign");
      }
      toast.success("Campaign deleted");
      router.push("/dashboard/email-campaigns");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Error deleting campaign",
      );
      setActionLoading(null);
    }
  };

  const handleDeclareWinner = async (variant: "A" | "B") => {
    try {
      const response = await fetchWithCSRF(
        `/api/marketing/email/campaigns/${campaignId}/actions?action=declare-winner`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ winningVariant: variant }),
        },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to record winner");
      }
      toast.success(`Variant ${variant} recorded as the winner`);
      fetchCampaign();
      fetchAnalytics();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Error recording winner",
      );
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="h4">{campaign.name}</Typography>
          <Chip label={campaign.status} size="small" />
        </Box>
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
          {campaign.status === "sending" && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={
                actionLoading === "pause" ? (
                  <CircularProgress size={16} />
                ) : (
                  <PauseIcon />
                )
              }
              onClick={handlePause}
              disabled={actionLoading !== null}
            >
              Pause
            </Button>
          )}
          {campaign.status === "paused" && (
            <Button
              variant="outlined"
              color="success"
              startIcon={
                actionLoading === "resume" ? (
                  <CircularProgress size={16} />
                ) : (
                  <ResumeIcon />
                )
              }
              onClick={handleResume}
              disabled={actionLoading !== null}
            >
              Resume
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
          {campaign.status !== "sending" && (
            <Button
              variant="outlined"
              color="error"
              startIcon={
                actionLoading === "delete" ? (
                  <CircularProgress size={16} />
                ) : (
                  <DeleteIcon />
                )
              }
              onClick={handleDelete}
              disabled={actionLoading !== null}
            >
              Delete
            </Button>
          )}
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={(_, newValue) => setTabValue(newValue)}
        sx={{ mb: 3 }}
        aria-label="Campaign editor sections"
      >
        <Tab label="Editor" />
        <Tab label="Preview" />
        <Tab label="Recipients" />
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

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Goals (optional)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Set a target and compare it against actual performance on the
                Analytics tab once the campaign has sent.
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Target Open Rate %"
                type="number"
                value={formData.targetOpenRate}
                onChange={(e) =>
                  setFormData({ ...formData, targetOpenRate: e.target.value })
                }
                fullWidth
                disabled={campaign.status !== "draft"}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Target Click Rate %"
                type="number"
                value={formData.targetClickRate}
                onChange={(e) =>
                  setFormData({ ...formData, targetClickRate: e.target.value })
                }
                fullWidth
                disabled={campaign.status !== "draft"}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Target Conversion Rate %"
                type="number"
                value={formData.targetConversionRate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    targetConversionRate: e.target.value,
                  })
                }
                fullWidth
                disabled={campaign.status !== "draft"}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.abTestingEnabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        abTestingEnabled: e.target.checked,
                      })
                    }
                    disabled={campaign.status !== "draft"}
                  />
                }
                label="Enable A/B Testing"
              />
              <Typography variant="body2" color="text.secondary">
                Splits recipients between the main content above (variant A)
                and an alternate subject/content (variant B) so you can
                compare performance. There is no automatic follow-up send to
                the rest of the list — declaring a winner (on the Analytics
                tab, once results are in) is just a record for your own
                reference.
              </Typography>
            </Grid>
            {formData.abTestingEnabled && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Variant B Subject"
                    value={formData.variantSubject}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        variantSubject: e.target.value,
                      })
                    }
                    fullWidth
                    disabled={campaign.status !== "draft"}
                    placeholder="Defaults to the main subject if left blank"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Variant B Split %"
                    type="number"
                    value={formData.splitPercentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        splitPercentage: e.target.value,
                      })
                    }
                    fullWidth
                    disabled={campaign.status !== "draft"}
                    helperText="% of recipients who get variant B; the rest get variant A"
                    inputProps={{ min: 1, max: 99 }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Variant B HTML Content"
                    value={formData.variantContent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        variantContent: e.target.value,
                      })
                    }
                    fullWidth
                    multiline
                    rows={8}
                    disabled={campaign.status !== "draft"}
                    placeholder="Defaults to the main HTML content above if left blank"
                    variant="outlined"
                  />
                </Grid>
              </>
            )}
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

      {/* Recipients Tab */}
      {tabValue === 2 && (
        <Box>
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={recipientsStatusFilter}
                label="Status"
                onChange={(e) => {
                  setRecipientsStatusFilter(e.target.value);
                  setRecipientsPage(1);
                }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="sending">Sending</MenuItem>
                <MenuItem value="sent">Sent</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="bounced">Bounced</MenuItem>
                <MenuItem value="unsubscribed">Unsubscribed</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {recipientsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : recipients.length === 0 ? (
            <Alert severity="info">
              No recipients yet — they&apos;re queued once the campaign is
              sent.
            </Alert>
          ) : (
            <>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Email</TableCell>
                      <TableCell>Status</TableCell>
                      {campaign.abTesting?.enabled && (
                        <TableCell>Variant</TableCell>
                      )}
                      <TableCell>Opened</TableCell>
                      <TableCell>Clicked</TableCell>
                      <TableCell>Error</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recipients.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell sx={{ fontFamily: "monospace" }}>
                          {r.recipientEmail}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={r.status}
                            color={
                              r.status === "sent"
                                ? "success"
                                : r.status === "failed" ||
                                    r.status === "bounced"
                                  ? "error"
                                  : r.status === "unsubscribed"
                                    ? "warning"
                                    : "default"
                            }
                          />
                        </TableCell>
                        {campaign.abTesting?.enabled && (
                          <TableCell>{r.variant || "—"}</TableCell>
                        )}
                        <TableCell>
                          {r.openedAt
                            ? new Date(r.openedAt).toLocaleString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {r.clickedAt
                            ? new Date(r.clickedAt).toLocaleString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {r.error ? (
                            <Typography variant="caption" color="error">
                              {r.error}
                            </Typography>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {recipientsPages > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <Pagination
                    count={recipientsPages}
                    page={recipientsPage}
                    onChange={(_, page) => setRecipientsPage(page)}
                    color="primary"
                    size="small"
                  />
                </Box>
              )}
            </>
          )}
        </Box>
      )}

      {/* Analytics Tab */}
      {tabValue === 3 && (
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
                {analytics?.stats.goals?.targetOpenRate !== undefined && (
                  <Chip
                    size="small"
                    sx={{ mt: 0.5 }}
                    label={`Target: ${analytics.stats.goals.targetOpenRate}%`}
                    color={
                      parseFloat(analytics.stats.openRate) >=
                      analytics.stats.goals.targetOpenRate
                        ? "success"
                        : "default"
                    }
                  />
                )}
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
                {analytics?.stats.goals?.targetClickRate !== undefined && (
                  <Chip
                    size="small"
                    sx={{ mt: 0.5 }}
                    label={`Target: ${analytics.stats.goals.targetClickRate}%`}
                    color={
                      parseFloat(analytics.stats.clickRate) >=
                      analytics.stats.goals.targetClickRate
                        ? "success"
                        : "default"
                    }
                  />
                )}
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
                  {analytics?.stats.goals?.targetConversionRate !==
                    undefined && (
                    <Typography>
                      Target Conversion Rate:{" "}
                      {analytics.stats.goals.targetConversionRate}% (tracked
                      manually — no automated conversion tracking yet)
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {analytics?.stats.variantStats && (
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    A/B Test Results
                  </Typography>
                  <Grid container spacing={2}>
                    {(["A", "B"] as const).map((variant) => {
                      const v = analytics.stats.variantStats![variant];
                      const openRate =
                        v.sent > 0
                          ? ((v.opened / v.sent) * 100).toFixed(1) + "%"
                          : "0%";
                      const isWinner =
                        analytics.stats.variantStats!.winningVariant ===
                        variant;
                      return (
                        <Grid size={{ xs: 12, sm: 6 }} key={variant}>
                          <Box
                            sx={{
                              p: 2,
                              border: "1px solid",
                              borderColor: isWinner
                                ? "success.main"
                                : "divider",
                              borderRadius: 1,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <Typography fontWeight={600}>
                                Variant {variant}
                              </Typography>
                              {isWinner && (
                                <Chip
                                  label="Winner"
                                  color="success"
                                  size="small"
                                />
                              )}
                            </Box>
                            <Typography variant="body2">
                              Sent: {v.sent} · Opened: {v.opened} (
                              {openRate}) · Clicked: {v.clicked}
                            </Typography>
                            {!isWinner && (
                              <Button
                                size="small"
                                sx={{ mt: 1 }}
                                onClick={() => handleDeclareWinner(variant)}
                              >
                                Declare Winner
                              </Button>
                            )}
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message || ""}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmColor={confirmState.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
}
