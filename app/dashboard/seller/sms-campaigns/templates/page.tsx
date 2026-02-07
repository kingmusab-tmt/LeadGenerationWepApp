"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  Typography,
  Grid,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { toast } from "react-toastify";

const PRESET_SMS = {
  lead_notification: {
    name: "New Lead Alert",
    textContent:
      "New lead: {{leadName}} - {{serviceType}}. Call: {{leadPhone}}",
  },
  promo: {
    name: "Promo Offer",
    textContent:
      "{{company}}: {{offerTitle}} - Save {{discount}}%! Reply STOP to opt-out.",
  },
  reminder: {
    name: "Appointment Reminder",
    textContent:
      "Reminder: {{appointmentDate}} at {{appointmentTime}}. Reply HELP for info.",
  },
};

interface SmsTemplate {
  _id: string;
  name: string;
  textContent: string;
  category: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function SmsTemplatesPage() {
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | null>(
    null,
  );
  const [form, setForm] = useState({
    name: "",
    textContent: "",
    category: "custom",
  });

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/marketing/sms/templates");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTemplates();
  }, []);

  const handleSave = async () => {
    if (!form.name || !form.textContent) {
      toast.error("Please fill name and message");
      return;
    }
    try {
      const method = editMode ? "PUT" : "POST";
      const url = editMode
        ? `/api/marketing/sms/templates/${selectedTemplate?._id}`
        : "/api/marketing/sms/templates";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      setOpen(false);
      setEditMode(false);
      setSelectedTemplate(null);
      setForm({ name: "", textContent: "", category: "custom" });
      void fetchTemplates();
      toast.success(editMode ? "Template updated" : "Template saved");
    } catch {
      toast.error("Error saving template");
    }
  };

  const handleEdit = (template: SmsTemplate) => {
    setEditMode(true);
    setSelectedTemplate(template);
    setForm({
      name: template.name,
      textContent: template.textContent,
      category: template.category,
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      const res = await fetch(`/api/marketing/sms/templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Template deleted");
      void fetchTemplates();
    } catch {
      toast.error("Error deleting template");
    }
  };

  const handleLoadPreset = (key: string) => {
    const tpl = (
      PRESET_SMS as Record<string, { name: string; textContent: string }>
    )[key];
    setEditMode(false);
    setSelectedTemplate(null);
    setForm({
      name: tpl.name,
      textContent: tpl.textContent,
      category: "preset",
    });
    setOpen(true);
  };

  const handleNewTemplate = () => {
    setEditMode(false);
    setSelectedTemplate(null);
    setForm({ name: "", textContent: "", category: "custom" });
    setOpen(true);
  };

  const charCount = form.textContent.length;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          SMS Templates
        </Typography>
        <Button variant="contained" onClick={handleNewTemplate}>
          New Template
        </Button>
      </Box>

      {/* Preset Templates */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Preset Templates
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {Object.entries(PRESET_SMS).map(([key, tpl]) => (
          <Grid size={{ xs: 12, md: 4 }} key={key}>
            <Card variant="outlined">
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography variant="h6">{tpl.name}</Typography>
                  <Chip label="Preset" size="small" color="info" />
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: "pre-wrap",
                    color: "text.secondary",
                    mb: 2,
                  }}
                >
                  {tpl.textContent}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleLoadPreset(key)}
                >
                  Use Preset
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Saved Templates */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Your Templates
      </Typography>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress />
        </Box>
      ) : templates.length === 0 ? (
        <Alert severity="info">
          No custom templates yet. Create one or use a preset above.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {templates.map((tpl) => (
            <Grid size={{ xs: 12, md: 4 }} key={tpl._id}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <Typography variant="h6">{tpl.name}</Typography>
                    <Chip
                      label={tpl.category}
                      size="small"
                      color={tpl.category === "preset" ? "info" : "default"}
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: "pre-wrap",
                      color: "text.secondary",
                      mb: 2,
                    }}
                  >
                    {tpl.textContent}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(tpl)}
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(tpl._id)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Template Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editMode ? "Edit SMS Template" : "New SMS Template"}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Template Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            multiline
            minRows={6}
            label="SMS Message"
            value={form.textContent}
            onChange={(e) => setForm({ ...form, textContent: e.target.value })}
            helperText={`${charCount}/160 characters — Use {{variable}} for personalization`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editMode ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
