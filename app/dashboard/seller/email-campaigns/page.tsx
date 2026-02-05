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
} from "@mui/icons-material";
import { toast } from "react-toastify";

interface Campaign {
  _id: string;
  name: string;
  subject: string;
  status: "draft" | "scheduled" | "sending" | "completed" | "failed";
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
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    htmlContent: "",
    fromEmail: "",
  });

  // Fetch campaigns
  useEffect(() => {
    if (currentUser) {
      fetchCampaigns();
    }
  }, [currentUser]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/email-campaigns");
      const data = await response.json();
      setCampaigns(data.campaigns || []);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      toast.error("Failed to fetch campaigns");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (campaign?: Campaign) => {
    if (campaign) {
      setEditMode(true);
      setSelectedCampaign(campaign);
      setFormData({
        name: campaign.name,
        subject: campaign.subject,
        htmlContent: "",
        fromEmail: "",
      });
    } else {
      setEditMode(false);
      setFormData({
        name: "",
        subject: "",
        htmlContent: "",
        fromEmail: "",
      });
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
      if (!formData.name || !formData.subject) {
        toast.error("Please fill all required fields");
        return;
      }

      const method = editMode ? "PUT" : "POST";
      const url = editMode
        ? `/api/email-campaigns/${selectedCampaign?._id}`
        : "/api/email-campaigns";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save campaign");

      toast.success(
        editMode ? "Campaign updated" : "Campaign created successfully",
      );
      handleCloseDialog();
      fetchCampaigns();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      toast.error("Error saving campaign");
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this campaign?")) {
      return;
    }

    try {
      const response = await fetch(`/api/email-campaigns/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete campaign");

      toast.success("Campaign deleted");
      fetchCampaigns();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      toast.error("Error deleting campaign");
    }
  };

  const handleSendCampaign = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to send this campaign to all recipients?",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/email-campaigns/${id}/actions?action=send`,
        {
          method: "POST",
        },
      );

      if (!response.ok) throw new Error("Failed to send campaign");

      const data = await response.json();
      toast.success(`Campaign sent to ${data.sent} recipients`);
      fetchCampaigns();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      toast.error("Error sending campaign");
    }
  };

  const getStatusColor = (status: string) => {
    const colors: {
      [key: string]: "default" | "info" | "warning" | "success" | "error";
    } = {
      draft: "default",
      scheduled: "info",
      sending: "warning",
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
                        startIcon={<SendIcon />}
                        onClick={() => handleSendCampaign(campaign._id)}
                        sx={{ mr: 1 }}
                      >
                        Send
                      </Button>
                    )}
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
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteCampaign(campaign._id)}
                    >
                      Delete
                    </Button>
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
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editMode ? "Edit Campaign" : "Create New Campaign"}
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
            label="Subject Line"
            value={formData.subject}
            onChange={(e) =>
              setFormData({ ...formData, subject: e.target.value })
            }
            fullWidth
            required
          />
          <TextField
            label="From Email"
            type="email"
            value={formData.fromEmail}
            onChange={(e) =>
              setFormData({ ...formData, fromEmail: e.target.value })
            }
            fullWidth
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
