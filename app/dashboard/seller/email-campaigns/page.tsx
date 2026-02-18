"use client";

import React, { useState, useEffect } from "react";
import { useInitializeUser } from "@/lib/hooks";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Pause as PauseIcon,
  PlayArrow as ResumeIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import RecipientPicker from "@/app/components/RecipientPicker";
import { useConfirm } from "@/app/hooks/useConfirm";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useCSRFFetch } from "@/app/hooks/useCSRF";

interface Campaign {
  _id: string;
  name: string;
  subject: string;
  status: "draft" | "scheduled" | "sending" | "paused" | "completed" | "failed";
  analytics: {
    sent: number;
    opened: number;
    clicked: number;
  };
  totalRecipients: number;
  createdAt: string;
  sentAt?: string;
}

export default function EmailCampaigns() {
  const fetchWithCSRF = useCSRFFetch();
  const { currentUser } = useInitializeUser();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null,
  );
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    htmlContent: "",
    fromEmail: "",
    recipientList: "",
  });
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiIncludeRecipientName, setAiIncludeRecipientName] = useState(true);
  const [aiRecipientSource, setAiRecipientSource] = useState<
    "leads" | "buyers" | "leadsAndBuyers" | "all"
  >("leads");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [editorMode, setEditorMode] = useState<"visual" | "html">("visual");
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
  const [actionLoading, setActionLoading] = useState<{
    campaignId: string;
    action: "send" | "pause" | "resume" | "delete" | null;
  }>({ campaignId: "", action: null });

  // Fetch campaigns
  useEffect(() => {
    if (currentUser) {
      fetchCampaigns();
    }
  }, [currentUser]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/marketing/email/campaigns");
      const data = await response.json();
      setCampaigns(data?.data?.campaigns || data?.campaigns || []);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      toast.error("Failed to fetch campaigns");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = async (campaign?: Campaign) => {
    if (campaign) {
      setEditMode(true);
      setSelectedCampaign(campaign);
      // Fetch full campaign data including htmlContent, fromEmail, recipients
      try {
        const response = await fetch(
          `/api/marketing/email/campaigns/${campaign._id}`,
        );
        const fullCampaign = await response.json();
        setFormData({
          name: fullCampaign.name || campaign.name,
          subject: fullCampaign.subject || campaign.subject,
          htmlContent: fullCampaign.htmlContent || "",
          fromEmail: fullCampaign.fromEmail || "",
          recipientList: (fullCampaign.recipientEmails || []).join(", "),
        });
      } catch {
        // Fallback to partial data from list
        setFormData({
          name: campaign.name,
          subject: campaign.subject,
          htmlContent: "",
          fromEmail: "",
          recipientList: "",
        });
      }
    } else {
      setEditMode(false);
      // Fetch user's email settings for new campaign
      let defaultFromEmail = "";
      try {
        const settingsResponse = await fetch("/api/settings");
        const settingsData = await settingsResponse.json();
        if (
          settingsData?.success &&
          settingsData?.data?.emailSettings?.fromEmail
        ) {
          defaultFromEmail = settingsData.data.emailSettings.fromEmail;
        }
      } catch {
        // If fetch fails, leave empty
      }
      setFormData({
        name: "",
        subject: "",
        htmlContent: "",
        fromEmail: defaultFromEmail,
        recipientList: "",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCampaign(null);
    setEditMode(false);
  };

  const handleGenerateWithAI = async () => {
    if (!aiDescription.trim()) {
      toast.error("Please provide a campaign description");
      return;
    }

    try {
      setAiGenerating(true);
      const response = await fetch("/api/ai/generate-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignType: "email",
          description: aiDescription,
          includeRecipientName: aiIncludeRecipientName,
          recipientSource: aiRecipientSource,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate campaign");
      }

      const result = await response.json();
      const { name, subject, htmlContent } = result.data;

      setFormData({
        ...formData,
        name,
        subject,
        htmlContent,
      });

      setAiDialogOpen(false);
      setAiDescription("");
      toast.success("Campaign generated successfully! You can edit it now.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate campaign");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveCampaign = async () => {
    try {
      if (!formData.name || !formData.subject) {
        toast.error("Please fill all required fields");
        return;
      }

      setSaving(true);
      const method = editMode ? "PUT" : "POST";
      const url = editMode
        ? `/api/marketing/email/campaigns/${selectedCampaign?._id}`
        : "/api/marketing/email/campaigns";

      // Parse comma-separated recipients into an array
      const recipientArray = formData.recipientList
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          subject: formData.subject,
          htmlContent: formData.htmlContent || undefined,
          fromEmail: formData.fromEmail || undefined,
          recipientList: recipientArray.length > 0 ? recipientArray : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save campaign");
      }

      toast.success(
        editMode ? "Campaign updated" : "Campaign created successfully",
      );
      handleCloseDialog();
      fetchCampaigns();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error: any) {
      toast.error(_error?.message || "Error saving campaign");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Campaign",
      message:
        "Are you sure you want to delete this campaign? This action cannot be undone.",
      confirmText: "Delete",
      confirmColor: "error",
    });
    if (!confirmed) return;

    try {
      setActionLoading({ campaignId: id, action: "delete" });
      const response = await fetchWithCSRF(
        `/api/marketing/email/campaigns/${id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete campaign");
      }

      toast.success("Campaign deleted");
      fetchCampaigns();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error: any) {
      toast.error(_error?.message || "Error deleting campaign");
    } finally {
      setActionLoading({ campaignId: "", action: null });
    }
  };

  const handleSendCampaign = async (id: string) => {
    const confirmed = await confirm({
      title: "Send Campaign",
      message: "Are you sure you want to send this campaign to all recipients?",
      confirmText: "Send Now",
      confirmColor: "primary",
    });
    if (!confirmed) return;

    try {
      setActionLoading({ campaignId: id, action: "send" });
      const response = await fetch(
        `/api/marketing/email/campaigns/${id}/actions?action=send`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send campaign");
      }

      const data = await response.json();
      toast.success(`Campaign sent to ${data.sent} recipients`);
      fetchCampaigns();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error: any) {
      toast.error(_error?.message || "Error sending campaign");
    } finally {
      setActionLoading({ campaignId: "", action: null });
    }
  };

  const handlePauseCampaign = async (id: string) => {
    try {
      setActionLoading({ campaignId: id, action: "pause" });
      const response = await fetch(
        `/api/marketing/email/campaigns/${id}/actions?action=pause`,
        { method: "POST" },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to pause campaign");
      }
      toast.success("Campaign paused");
      fetchCampaigns();
    } catch (error: any) {
      toast.error(error?.message || "Error pausing campaign");
    } finally {
      setActionLoading({ campaignId: "", action: null });
    }
  };

  const handleResumeCampaign = async (id: string) => {
    try {
      setActionLoading({ campaignId: id, action: "resume" });
      const response = await fetch(
        `/api/marketing/email/campaigns/${id}/actions?action=resume`,
        { method: "POST" },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to resume campaign");
      }
      const data = await response.json();
      toast.success(data.message || "Campaign resumed");
      fetchCampaigns();
    } catch (error: any) {
      toast.error(error?.message || "Error resuming campaign");
    } finally {
      setActionLoading({ campaignId: "", action: null });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: {
      [key: string]: "default" | "info" | "warning" | "success" | "error";
    } = {
      draft: "default",
      scheduled: "info",
      sending: "warning",
      paused: "info",
      completed: "success",
      failed: "error",
    };
    return colors[status] || "default";
  };

  const filteredCampaigns =
    filterStatus === "all"
      ? campaigns
      : campaigns.filter((c) => c.status === filterStatus);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          Email Campaigns
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          New Campaign
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Campaigns
              </Typography>
              <Typography variant="h5">{campaigns.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active
              </Typography>
              <Typography variant="h5">
                {campaigns.filter((c) => c.status === "sending").length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h5">
                {campaigns.filter((c) => c.status === "completed").length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Open Rate
              </Typography>
              <Typography variant="h5">
                {campaigns.length > 0
                  ? (
                      campaigns.reduce(
                        (sum, c) =>
                          sum +
                          (c.totalRecipients > 0
                            ? (c.analytics.opened / c.totalRecipients) * 100
                            : 0),
                        0,
                      ) / campaigns.length
                    ).toFixed(1) + "%"
                  : "0%"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={(_, newValue) => {
          setTabValue(newValue);
          setFilterStatus(
            newValue === 0
              ? "all"
              : newValue === 1
                ? "draft"
                : newValue === 2
                  ? "sending"
                  : "completed",
          );
        }}
        sx={{ mb: 3 }}
      >
        <Tab label="All" />
        <Tab label="Drafts" />
        <Tab label="Sending" />
        <Tab label="Completed" />
      </Tabs>

      {/* Campaigns Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress />
        </Box>
      ) : filteredCampaigns.length === 0 ? (
        <Alert severity="info">No campaigns found</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Recipients</TableCell>
                <TableCell>Sent</TableCell>
                <TableCell>Opened</TableCell>
                <TableCell>Clicked</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCampaigns.map((campaign) => (
                <TableRow key={campaign._id}>
                  <TableCell>{campaign.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={campaign.status}
                      color={getStatusColor(campaign.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{campaign.totalRecipients}</TableCell>
                  <TableCell>{campaign.analytics.sent}</TableCell>
                  <TableCell>{campaign.analytics.opened}</TableCell>
                  <TableCell>{campaign.analytics.clicked}</TableCell>
                  <TableCell>
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {campaign.status === "draft" && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={
                          actionLoading.campaignId === campaign._id &&
                          actionLoading.action === "send" ? (
                            <CircularProgress size={16} />
                          ) : (
                            <SendIcon />
                          )
                        }
                        onClick={() => handleSendCampaign(campaign._id)}
                        disabled={
                          actionLoading.campaignId === campaign._id &&
                          actionLoading.action === "send"
                        }
                        sx={{ mr: 1 }}
                      >
                        Send
                      </Button>
                    )}
                    {campaign.status === "sending" && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={
                          actionLoading.campaignId === campaign._id &&
                          actionLoading.action === "pause" ? (
                            <CircularProgress size={16} />
                          ) : (
                            <PauseIcon />
                          )
                        }
                        onClick={() => handlePauseCampaign(campaign._id)}
                        disabled={
                          actionLoading.campaignId === campaign._id &&
                          actionLoading.action === "pause"
                        }
                        sx={{ mr: 1 }}
                      >
                        Pause
                      </Button>
                    )}
                    {campaign.status === "paused" && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={
                          actionLoading.campaignId === campaign._id &&
                          actionLoading.action === "resume" ? (
                            <CircularProgress size={16} />
                          ) : (
                            <ResumeIcon />
                          )
                        }
                        onClick={() => handleResumeCampaign(campaign._id)}
                        disabled={
                          actionLoading.campaignId === campaign._id &&
                          actionLoading.action === "resume"
                        }
                        sx={{ mr: 1 }}
                      >
                        Resume
                      </Button>
                    )}
                    {["draft", "paused"].includes(campaign.status) && (
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleOpenDialog(campaign)}
                        disabled={actionLoading.campaignId !== ""}
                        sx={{ mr: 1 }}
                      >
                        Edit
                      </Button>
                    )}
                    {!["sending"].includes(campaign.status) && (
                      <Button
                        size="small"
                        color="error"
                        startIcon={
                          actionLoading.campaignId === campaign._id &&
                          actionLoading.action === "delete" ? (
                            <CircularProgress size={16} />
                          ) : (
                            <DeleteIcon />
                          )
                        }
                        onClick={() => handleDeleteCampaign(campaign._id)}
                        disabled={
                          actionLoading.campaignId === campaign._id &&
                          actionLoading.action === "delete"
                        }
                      >
                        Delete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Campaign Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editMode ? "Edit Campaign" : "Create New Campaign"}
        </DialogTitle>
        <DialogContent
          sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}
        >
          {!editMode && (
            <Button
              variant="outlined"
              onClick={() => setAiDialogOpen(true)}
              fullWidth
            >
              Generate Campaign with AI
            </Button>
          )}
          <TextField
            label="Campaign Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Subject Line"
            value={formData.subject}
            onChange={(e) =>
              setFormData({ ...formData, subject: e.target.value })
            }
            fullWidth
            required
          />
          <Box>
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 1 }}>
              <Tabs
                value={editorMode}
                onChange={(_, newValue) => setEditorMode(newValue)}
                aria-label="Email content editor mode"
              >
                <Tab label="Visual Editor" value="visual" />
                <Tab label="HTML Source" value="html" />
              </Tabs>
            </Box>
            {editorMode === "visual" ? (
              <Box
                sx={{
                  border: "1px solid #ccc",
                  borderRadius: 1,
                  p: 2,
                  minHeight: 300,
                  maxHeight: 500,
                  overflow: "auto",
                  backgroundColor: "#fff",
                }}
              >
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    setFormData({
                      ...formData,
                      htmlContent: e.currentTarget.innerHTML,
                    })
                  }
                  dangerouslySetInnerHTML={{ __html: formData.htmlContent }}
                  style={{
                    outline: "none",
                    minHeight: "250px",
                    fontFamily: "Arial, sans-serif",
                    lineHeight: "1.6",
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  Tip: Edit content visually. Use{" "}
                  {`{{recipientName}}, {{leadName}}, {{buyerName}}`} for
                  personalization.
                </Typography>
              </Box>
            ) : (
              <TextField
                label="Email Content (HTML)"
                value={formData.htmlContent}
                onChange={(e) =>
                  setFormData({ ...formData, htmlContent: e.target.value })
                }
                fullWidth
                multiline
                rows={12}
                variant="outlined"
                helperText="HTML content for the email. Use {{variable}} for dynamic content."
              />
            )}
          </Box>
          <TextField
            label="From Email"
            type="email"
            value={formData.fromEmail}
            onChange={(e) =>
              setFormData({ ...formData, fromEmail: e.target.value })
            }
            fullWidth
          />
          <RecipientPicker
            value={formData.recipientList}
            onChange={(val) => setFormData({ ...formData, recipientList: val })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveCampaign}
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : null}
          >
            {saving ? "Saving..." : editMode ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Generation Dialog */}
      <Dialog
        open={aiDialogOpen}
        onClose={() => !aiGenerating && setAiDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate Campaign with AI</DialogTitle>
        <DialogContent
          sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            label="Campaign Description"
            value={aiDescription}
            onChange={(e) => setAiDescription(e.target.value)}
            fullWidth
            multiline
            rows={4}
            required
            placeholder="Describe what this campaign is about. E.g., 'Promote our new service for home sellers' or 'Follow-up with leads who haven't responded'"
          />
          <FormControl fullWidth>
            <InputLabel>Recipient Source</InputLabel>
            <Select
              value={aiRecipientSource}
              onChange={(e) =>
                setAiRecipientSource(
                  e.target.value as
                    | "leads"
                    | "buyers"
                    | "leadsAndBuyers"
                    | "all",
                )
              }
              label="Recipient Source"
            >
              <MenuItem value="leads">Leads</MenuItem>
              <MenuItem value="buyers">Buyers</MenuItem>
              <MenuItem value="leadsAndBuyers">Leads and Buyers</MenuItem>
              <MenuItem value="all">All (Leads, Buyers & Manual)</MenuItem>
            </Select>
          </FormControl>
          <Box>
            <FormControl component="fieldset">
              <Typography variant="body2" sx={{ mb: 1 }}>
                Include recipient name?
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant={aiIncludeRecipientName ? "contained" : "outlined"}
                  onClick={() => setAiIncludeRecipientName(true)}
                >
                  Yes
                </Button>
                <Button
                  size="small"
                  variant={!aiIncludeRecipientName ? "contained" : "outlined"}
                  onClick={() => setAiIncludeRecipientName(false)}
                >
                  No
                </Button>
              </Box>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setAiDialogOpen(false)}
            disabled={aiGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerateWithAI}
            variant="contained"
            disabled={aiGenerating || !aiDescription.trim()}
            startIcon={aiGenerating ? <CircularProgress size={20} /> : null}
          >
            {aiGenerating ? "Generating..." : "Generate"}
          </Button>
        </DialogActions>
      </Dialog>

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
