"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Paper,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";

interface Template {
  _id: string;
  name: string;
  category: string;
  subject: string;
  previewText: string;
  createdAt: string;
}

// Pre-built template categories
const PRESET_TEMPLATES = {
  lead_notification: {
    name: "New Lead Notification",
    subject: "New Lead Available - {{leadName}}",
    htmlContent: `
      <h2>New Lead Available</h2>
      <p>You have received a new lead:</p>
      <p><strong>Name:</strong> {{leadName}}</p>
      <p><strong>Phone:</strong> {{leadPhone}}</p>
      <p><strong>Email:</strong> {{leadEmail}}</p>
      <p><strong>Service:</strong> {{serviceType}}</p>
      <p><a href="{{callToActionLink}}">View Lead Details</a></p>
    `,
  },
  weekly_newsletter: {
    name: "Weekly Newsletter",
    subject: "Weekly Digest - {{date}}",
    htmlContent: `
      <h2>Weekly Newsletter</h2>
      <p>Hello {{recipientName}},</p>
      <h3>This Week's Highlights</h3>
      <ul>
        <li>{{highlight1}}</li>
        <li>{{highlight2}}</li>
        <li>{{highlight3}}</li>
      </ul>
      <p><a href="{{readMoreLink}}">Read More</a></p>
    `,
  },
  promotional: {
    name: "Promotional Campaign",
    subject: "Special Offer: {{offerTitle}} - {{discount}}% Off",
    htmlContent: `
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
        <h2>{{offerTitle}}</h2>
        <p style="font-size: 24px; font-weight: bold; color: #e74c3c;">
          {{discount}}% OFF
        </p>
        <p>{{offerDescription}}</p>
        <p>
          <a href="{{claimOfferLink}}" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            Claim Offer
          </a>
        </p>
        <p><small>Offer expires: {{expirationDate}}</small></p>
      </div>
    `,
  },
  welcome: {
    name: "Welcome Email",
    subject: "Welcome to {{companyName}}!",
    htmlContent: `
      <h2>Welcome {{recipientName}}!</h2>
      <p>We're excited to have you join us.</p>
      <h3>Getting Started</h3>
      <ol>
        <li>{{step1}}</li>
        <li>{{step2}}</li>
        <li>{{step3}}</li>
      </ol>
      <p>Need help? <a href="{{supportLink}}">Contact our support team</a></p>
    `,
  },
};

export default function EmailTemplateBuilder() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [presetSelected, setPresetSelected] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    htmlContent: "",
    textContent: "",
    category: "custom",
    previewText: "",
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/email/templates");
      const data = await response.json();
      setTemplates(data || []);
    } catch {
      toast.error("Failed to fetch templates");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (template?: Template) => {
    if (template) {
      setEditMode(true);
      setFormData({
        name: template.name,
        subject: "",
        htmlContent: "",
        textContent: "",
        category: template.category,
        previewText: "",
      });
    } else {
      setEditMode(false);
      setFormData({
        name: "",
        subject: "",
        htmlContent: "",
        textContent: "",
        category: "custom",
        previewText: "",
      });
    }
    setPresetSelected("");
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setFormData({
      name: "",
      subject: "",
      htmlContent: "",
      textContent: "",
      category: "custom",
      previewText: "",
    });
  };

  const handleLoadPreset = (presetKey: string) => {
    const preset = PRESET_TEMPLATES[presetKey as keyof typeof PRESET_TEMPLATES];
    if (preset) {
      setFormData({
        name: preset.name,
        subject: preset.subject,
        htmlContent: preset.htmlContent,
        textContent: "",
        category: presetKey,
        previewText: preset.name,
      });
      setPresetSelected(presetKey);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      if (!formData.name || !formData.subject || !formData.htmlContent) {
        toast.error("Please fill all required fields");
        return;
      }

      const response = await fetch("/api/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save template");
      }

      toast.success("Template created successfully");
      handleCloseDialog();
      fetchTemplates();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error saving template",
      );
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this template?")) {
      return;
    }

    try {
      const response = await fetch(`/api/email/templates/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete template");

      toast.success("Template deleted");
      fetchTemplates();
    } catch {
      toast.error("Error deleting template");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          Email Templates
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          New Template
        </Button>
      </Box>

      {/* Templates Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template._id}>
                  <TableCell>{template.name}</TableCell>
                  <TableCell>
                    <Chip label={template.category} size="small" />
                  </TableCell>
                  <TableCell>{template.subject}</TableCell>
                  <TableCell>
                    {new Date(template.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenDialog(template)}
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteTemplate(template._id)}
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

      {/* Template Builder Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editMode ? "Edit Template" : "Create New Template"}
        </DialogTitle>
        <DialogContent
          sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}
        >
          {!editMode && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Load a Preset Template:
              </Typography>
              <Grid container spacing={1}>
                {Object.entries(PRESET_TEMPLATES).map(([key]) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={key}>
                    <Button
                      fullWidth
                      variant={
                        presetSelected === key ? "contained" : "outlined"
                      }
                      onClick={() => handleLoadPreset(key)}
                      sx={{ textAlign: "left" }}
                    >
                      {
                        PRESET_TEMPLATES[key as keyof typeof PRESET_TEMPLATES]
                          .name
                      }
                    </Button>
                  </Grid>
                ))}
              </Grid>
              <Typography
                variant="body2"
                sx={{ mt: 2, color: "text.secondary" }}
              >
                Or create a custom template below:
              </Typography>
            </Box>
          )}

          <TextField
            label="Template Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            fullWidth
            required
          />

          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              label="Category"
            >
              <MenuItem value="welcome">Welcome</MenuItem>
              <MenuItem value="lead_notification">Lead Notification</MenuItem>
              <MenuItem value="promotional">Promotional</MenuItem>
              <MenuItem value="newsletter">Newsletter</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Subject Line"
            value={formData.subject}
            onChange={(e) =>
              setFormData({ ...formData, subject: e.target.value })
            }
            fullWidth
            required
            helperText="Use {{variable}} syntax for dynamic content"
          />

          <TextField
            label="Preview Text (shown in email client)"
            value={formData.previewText}
            onChange={(e) =>
              setFormData({ ...formData, previewText: e.target.value })
            }
            fullWidth
          />

          <TextField
            label="HTML Content"
            value={formData.htmlContent}
            onChange={(e) =>
              setFormData({ ...formData, htmlContent: e.target.value })
            }
            fullWidth
            multiline
            rows={10}
            required
            variant="outlined"
            helperText="Use {{variable}} syntax for dynamic content"
          />

          <TextField
            label="Plain Text Content (Optional)"
            value={formData.textContent}
            onChange={(e) =>
              setFormData({ ...formData, textContent: e.target.value })
            }
            fullWidth
            multiline
            rows={6}
            variant="outlined"
          />

          <Card sx={{ backgroundColor: "#f5f5f5", p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Preview
            </Typography>
            <Box
              dangerouslySetInnerHTML={{ __html: formData.htmlContent }}
              sx={{
                border: "1px solid #ddd",
                padding: 1,
                borderRadius: 1,
                backgroundColor: "white",
                "& img": { maxWidth: "100%" },
              }}
            />
          </Card>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveTemplate} variant="contained">
            {editMode ? "Update" : "Create"} Template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
