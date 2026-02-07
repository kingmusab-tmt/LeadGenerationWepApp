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

export default function SmsCampaignsPage() {
  const { currentUser } = useInitializeUser();
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedCampaign, setSelectedCampaign] = useState<SmsCampaign | null>(
    null,
  );
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    textContent: "",
    recipientList: "",
  });

  useEffect(() => {
    if (currentUser) {
      fetchCampaigns();
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
        });
      } catch {
        setFormData({
          name: campaign.name,
          textContent: campaign.textContent || "",
          recipientList: (campaign.recipients || [])
            .map((r) => r.phone)
            .join(", "),
        });
      }
    } else {
      setEditMode(false);
      setSelectedCampaign(null);
      setFormData({ name: "", textContent: "", recipientList: "" });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCampaign(null);
    setEditMode(false);
  };

  const handleSaveCampaign = async () => {
    try {
      if (!formData.name || !formData.textContent) {
        toast.error("Please fill campaign name and message");
        return;
      }

      const method = editMode ? "PUT" : "POST";
      const url = editMode
        ? `/api/marketing/sms/campaigns/${selectedCampaign?._id}`
        : "/api/marketing/sms/campaigns";

      const recipientArray = formData.recipientList
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((phone) => ({ phone }));

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          textContent: formData.textContent,
          recipients: recipientArray.length > 0 ? recipientArray : undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to save campaign");

      toast.success(
        editMode ? "Campaign updated" : "Campaign created successfully",
      );
      handleCloseDialog();
      fetchCampaigns();
    } catch {
      toast.error("Error saving campaign");
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this campaign?"))
      return;
    try {
      const response = await fetch(`/api/marketing/sms/campaigns/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete campaign");
      toast.success("Campaign deleted");
      fetchCampaigns();
    } catch {
      toast.error("Error deleting campaign");
    }
  };

  const handleSendCampaign = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to send this SMS campaign to all recipients?",
      )
    )
      return;
    try {
      const response = await fetch(
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
    } catch (error: any) {
      toast.error(error?.message || "Error sending campaign");
    }
  };

  const handlePauseCampaign = async (id: string) => {
    try {
      const response = await fetch(
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
      const response = await fetch(
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

  const filteredCampaigns =
    filterStatus === "all"
      ? campaigns
      : campaigns.filter((c) => c.status === filterStatus);

  const charCount = formData.textContent.length;
  const smsSegments = Math.ceil(charCount / 160) || 0;

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
            href="/dashboard/seller/sms-campaigns/templates"
          >
            Templates
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
                  <TableCell>
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
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
          <TextField
            label="Campaign Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            fullWidth
            required
          />
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
          <SmsRecipientPicker
            value={formData.recipientList}
            onChange={(val) => setFormData({ ...formData, recipientList: val })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveCampaign} variant="contained">
            {editMode ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
