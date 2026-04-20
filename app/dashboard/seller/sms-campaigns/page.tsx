"use client";

import React, { useState, useEffect } from "react";
import { useInitializeUser } from "@/app/hooks";
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
import SmsRecipientPicker from "@/app/components/SmsRecipientPicker";
import { useConfirm } from "@/app/hooks/useConfirm";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import TwilioNumberGenerator from "@/app/components/TwilioNumberGenerator";
import { Phone as PhoneIcon } from "@mui/icons-material";
import { useCSRFFetch } from "@/app/hooks/useCSRF";
import { useSubscriptionLimits } from "@/app/hooks/useSubscriptionLimits";

interface SmsCampaign {
  _id: string;
  name: string;
  textContent: string;
  status: "draft" | "scheduled" | "sending" | "paused" | "completed" | "failed";
  recipients: Array<{ phone: string; name?: string }>;
  stats: {
    queued: number;
    sent: number;
    delivered: number;
    failed: number;
    replies: number;
    optOuts: number;
  };
  createdAt: string;
}

interface TwilioTrackingNumber {
  purpose?: string;
  phoneNumber?: string;
}

interface SmsCampaignWithFromNumber extends SmsCampaign {
  fromPhoneNumber?: string;
}

export default function SmsCampaignsPage() {
  const { currentUser } = useInitializeUser();
  const { limits, isTrial } = useSubscriptionLimits();
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedCampaign, setSelectedCampaign] = useState<SmsCampaign | null>(
    null,
  );
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    textContent: "",
    recipientList: "",
    fromPhoneNumber: "",
  });
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiIncludeRecipientName, setAiIncludeRecipientName] = useState(true);
  const [aiRecipientSource, setAiRecipientSource] = useState<
    "leads" | "buyers" | "leadsAndBuyers" | "all"
  >("leads");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [smsEditorMode, setSmsEditorMode] = useState<"visual" | "text">(
    "visual",
  );
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
  const fetchWithCSRF = useCSRFFetch();
  const [twilioGeneratorOpen, setTwilioGeneratorOpen] = useState(false);
  const [smsPhoneNumbers, setSmsPhoneNumbers] = useState<string[]>([]);
  const [smsPhoneNumbersCount, setSmsPhoneNumbersCount] = useState(0);
  const [smsPhoneNumbersLimit, setSmsPhoneNumbersLimit] = useState(0);

  useEffect(() => {
    if (currentUser) {
      fetchCampaigns();
      fetchSmsPhoneNumbers();
    }
  }, [currentUser]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/marketing/sms/campaigns?limit=50");
      const data = await response.json();
      setCampaigns(data?.data?.items || data?.items || []);
    } catch {
      toast.error("Failed to fetch SMS campaigns");
    } finally {
      setLoading(false);
    }
  };

  const fetchSmsPhoneNumbers = async () => {
    try {
      // Fetch subscription limits
      const limitResponse = await fetch("/api/subscriptions/limits");
      const limitData = await limitResponse.json();
      if (limitData?.subscriptionLimits) {
        setSmsPhoneNumbersLimit(
          limitData.subscriptionLimits.smsPhoneNumbers || 0,
        );
      }

      // Fetch SMS phone numbers from tracking numbers
      const numbersResponse = await fetch("/api/calls/twilio/get_numbers");
      if (numbersResponse.ok) {
        const numbersPayload = await numbersResponse.json();
        const allNumbers = Array.isArray(numbersPayload)
          ? numbersPayload
          : Array.isArray(numbersPayload?.data)
            ? numbersPayload.data
            : [];

        // Filter to only SMS numbers
        const smsNumbers = (allNumbers as TwilioTrackingNumber[])
          .filter((num) => num.purpose === "sms" && !!num.phoneNumber)
          .map((num) => num.phoneNumber as string);
        setSmsPhoneNumbers(smsNumbers);
        setSmsPhoneNumbersCount(smsNumbers.length);
      }
    } catch (error) {
      console.error("Failed to fetch SMS phone numbers:", error);
    }
  };

  const handleOpenDialog = async (campaign?: SmsCampaign) => {
    if (campaign) {
      setEditMode(true);
      setSelectedCampaign(campaign);
      try {
        const response = await fetch(
          `/api/marketing/sms/campaigns/${campaign._id}`,
        );
        const fullCampaign = await response.json();
        const phones = (fullCampaign.recipients || [])
          .map((r: { phone: string }) => r.phone)
          .join(", ");
        setFormData({
          name: fullCampaign.name || campaign.name,
          textContent: fullCampaign.textContent || "",
          recipientList: phones,
          fromPhoneNumber: fullCampaign.fromPhoneNumber || "",
        });
      } catch {
        setFormData({
          name: campaign.name,
          textContent: campaign.textContent || "",
          recipientList: (campaign.recipients || [])
            .map((r) => r.phone)
            .join(", "),
          fromPhoneNumber:
            (campaign as SmsCampaignWithFromNumber).fromPhoneNumber || "",
        });
      }
    } else {
      setEditMode(false);
      setSelectedCampaign(null);
      setFormData({
        name: "",
        textContent: "",
        recipientList: "",
        fromPhoneNumber: "",
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
      const response = await fetchWithCSRF("/api/ai/generate-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignType: "sms",
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
      const { name, textContent } = result.data;

      setFormData({
        ...formData,
        name,
        textContent,
      });

      setAiDialogOpen(false);
      setAiDescription("");
      toast.success("Campaign generated successfully! You can edit it now.");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate campaign",
      );
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveCampaign = async () => {
    try {
      if (!formData.name || !formData.textContent) {
        toast.error("Please fill campaign name and message");
        return;
      }

      setSaving(true);
      const method = editMode ? "PUT" : "POST";
      const url = editMode
        ? `/api/marketing/sms/campaigns/${selectedCampaign?._id}`
        : "/api/marketing/sms/campaigns";

      const recipientArray = formData.recipientList
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((phone) => ({ phone }));

      const response = await fetchWithCSRF(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          textContent: formData.textContent,
          recipients: recipientArray.length > 0 ? recipientArray : undefined,
          fromPhoneNumber: formData.fromPhoneNumber || undefined,
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
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Error saving campaign",
      );
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
      const response = await fetchWithCSRF(
        `/api/marketing/sms/campaigns/${id}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) throw new Error("Failed to delete campaign");
      toast.success("Campaign deleted");
      fetchCampaigns();
    } catch {
      toast.error("Error deleting campaign");
    }
  };

  const handleSendCampaign = async (id: string) => {
    const confirmed = await confirm({
      title: "Send SMS Campaign",
      message:
        "Are you sure you want to send this SMS campaign to all recipients?",
      confirmText: "Send Now",
      confirmColor: "primary",
    });
    if (!confirmed) return;
    try {
      const response = await fetchWithCSRF(
        `/api/marketing/sms/campaigns/${id}/actions?action=send`,
        { method: "POST" },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send campaign");
      }
      const data = await response.json();
      toast.success(
        `Campaign sending started. Sent: ${data.sent}, Failed: ${data.failed}`,
      );
      fetchCampaigns();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Error sending campaign",
      );
    }
  };

  const handlePauseCampaign = async (id: string) => {
    try {
      const response = await fetchWithCSRF(
        `/api/marketing/sms/campaigns/${id}/actions?action=pause`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Failed to pause campaign");
      toast.success("Campaign paused");
      fetchCampaigns();
    } catch {
      toast.error("Error pausing campaign");
    }
  };

  const handleResumeCampaign = async (id: string) => {
    try {
      const response = await fetchWithCSRF(
        `/api/marketing/sms/campaigns/${id}/actions?action=resume`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Failed to resume campaign");
      const data = await response.json();
      toast.success(data.message || "Campaign resumed");
      fetchCampaigns();
    } catch {
      toast.error("Error resuming campaign");
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<
      string,
      "default" | "info" | "warning" | "success" | "error"
    > = {
      draft: "default",
      scheduled: "info",
      sending: "warning",
      paused: "info",
      completed: "success",
      failed: "error",
    };
    return colors[status] || "default";
  };

  const filteredCampaigns = (
    filterStatus === "all"
      ? campaigns
      : campaigns.filter((c) => c.status === filterStatus)
  ).sort((a, b) => {
    const replyDiff = (b.stats?.replies || 0) - (a.stats?.replies || 0);
    if (replyDiff !== 0) return replyDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const charCount = formData.textContent.length;
  const smsSegments = Math.ceil(charCount / 160) || 0;

  // Check if user has access to SMS campaigns
  if (limits && !isTrial && !limits.smsCampaignsEnabled) {
    return (
      <Box
        sx={{
          p: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "50vh",
          textAlign: "center",
        }}
      >
        <Typography variant="h5" gutterBottom>
          SMS Campaigns Not Available
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 400 }}>
          Your current subscription plan does not include SMS Campaigns. Please
          upgrade your plan to access this feature.
        </Typography>
        <Button
          variant="contained"
          onClick={() =>
            (window.location.href = "/dashboard/seller/settings/subscription")
          }
        >
          View Subscription Plans
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          SMS Campaigns
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PhoneIcon />}
            onClick={() => setTwilioGeneratorOpen(true)}
          >
            Get SMS Number
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            New Campaign
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
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
                Total Delivered
              </Typography>
              <Typography variant="h5">
                {campaigns.reduce(
                  (sum, c) => sum + (c.stats?.delivered || 0),
                  0,
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Tabs */}
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
        <Alert severity="info">No SMS campaigns found</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Recipients</TableCell>
                <TableCell>Sent</TableCell>
                <TableCell>Delivered</TableCell>
                <TableCell>Failed</TableCell>
                <TableCell>Replies</TableCell>
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
                  <TableCell>{campaign.recipients?.length || 0}</TableCell>
                  <TableCell>{campaign.stats?.sent || 0}</TableCell>
                  <TableCell>{campaign.stats?.delivered || 0}</TableCell>
                  <TableCell>{campaign.stats?.failed || 0}</TableCell>
                  <TableCell>{campaign.stats?.replies || 0}</TableCell>
                  <TableCell>
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        mr: 1,
                      }}
                    >
                      <Button
                        size="small"
                        href={`/dashboard/seller/sms-campaigns/${campaign._id}?view=replies`}
                      >
                        View Replies
                      </Button>
                      <Chip
                        size="small"
                        label={campaign.stats?.replies || 0}
                        color={
                          (campaign.stats?.replies || 0) > 0
                            ? "success"
                            : "default"
                        }
                        sx={{ ml: 0.5, height: 20 }}
                      />
                    </Box>
                    {campaign.status === "draft" && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<SendIcon />}
                        onClick={() => handleSendCampaign(campaign._id)}
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
                        startIcon={<PauseIcon />}
                        onClick={() => handlePauseCampaign(campaign._id)}
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
                        startIcon={<ResumeIcon />}
                        onClick={() => handleResumeCampaign(campaign._id)}
                        sx={{ mr: 1 }}
                      >
                        Resume
                      </Button>
                    )}
                    {["draft", "paused"].includes(campaign.status) && (
                      <>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleOpenDialog(campaign)}
                          sx={{ mr: 1 }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          href={`/dashboard/seller/sms-campaigns/${campaign._id}`}
                        >
                          Open
                        </Button>
                      </>
                    )}
                    {!["sending"].includes(campaign.status) && (
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteCampaign(campaign._id)}
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
          {editMode ? "Edit SMS Campaign" : "Create New SMS Campaign"}
        </DialogTitle>
        <DialogContent
          sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}
        >
          {!editMode && limits?.aiGenerativeEnabled && (
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
          <FormControl fullWidth>
            <InputLabel>From Phone Number</InputLabel>
            <Select
              value={formData.fromPhoneNumber}
              onChange={(e) =>
                setFormData({ ...formData, fromPhoneNumber: e.target.value })
              }
              label="From Phone Number"
            >
              <MenuItem value="">
                <em>None selected</em>
              </MenuItem>
              {smsPhoneNumbers.map((phone) => (
                <MenuItem key={phone} value={phone}>
                  {phone}
                </MenuItem>
              ))}
            </Select>
            {smsPhoneNumbers.length === 0 && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                No phone numbers available. Generate one using the
                &quot;Generate Phone Number&quot; button at the top.
              </Typography>
            )}
          </FormControl>
          <Box>
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 1 }}>
              <Tabs
                value={smsEditorMode}
                onChange={(_, newValue) => setSmsEditorMode(newValue)}
                aria-label="SMS content editor mode"
              >
                <Tab label="Visual Preview" value="visual" />
                <Tab label="Text Editor" value="text" />
              </Tabs>
            </Box>
            {smsEditorMode === "visual" ? (
              <Box
                sx={{
                  border: "1px solid #ccc",
                  borderRadius: 1,
                  p: 2,
                  minHeight: 120,
                  backgroundColor: "#f9f9f9",
                }}
              >
                <Box
                  sx={{
                    backgroundColor: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: 2,
                    p: 2,
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    fontSize: "14px",
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {formData.textContent
                    .split(/(\{\{[^}]+\}\})/g)
                    .map((part, idx) => {
                      if (part.match(/\{\{[^}]+\}\}/)) {
                        return (
                          <span
                            key={idx}
                            style={{
                              backgroundColor: "#e3f2fd",
                              color: "#1976d2",
                              padding: "2px 4px",
                              borderRadius: "3px",
                              fontWeight: "bold",
                            }}
                          >
                            {part}
                          </span>
                        );
                      }
                      return <span key={idx}>{part}</span>;
                    })}
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  {charCount}/160 characters
                  {smsSegments > 1 ? ` (${smsSegments} SMS segments)` : ""} —
                  Variables like {`{{recipientName}}`} are highlighted in blue
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setSmsEditorMode("text")}
                  sx={{ mt: 1 }}
                >
                  Edit Text
                </Button>
              </Box>
            ) : (
              <TextField
                label="SMS Message"
                value={formData.textContent}
                onChange={(e) =>
                  setFormData({ ...formData, textContent: e.target.value })
                }
                fullWidth
                multiline
                minRows={4}
                required
                helperText={`${charCount}/160 characters${smsSegments > 1 ? ` (${smsSegments} SMS segments)` : ""} — Use {{variable}} for personalization`}
              />
            )}
          </Box>
          <SmsRecipientPicker
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
            placeholder="Describe what this campaign is about. E.g., 'Remind leads about our open house event' or 'Send a follow-up to buyers'"
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

      {/* Twilio Number Generator Modal */}
      <TwilioNumberGenerator
        open={twilioGeneratorOpen}
        onClose={() => setTwilioGeneratorOpen(false)}
        onNumberGenerated={(phoneNumber: string) => {
          setSmsPhoneNumbers([...smsPhoneNumbers, phoneNumber]);
          fetchSmsPhoneNumbers();
        }}
        currentCount={smsPhoneNumbersCount}
        maxAllowed={smsPhoneNumbersLimit}
      />
    </Box>
  );
}
