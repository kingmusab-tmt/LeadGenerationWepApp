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
} from "@mui/material";
import { toast } from "react-toastify";

const PRESET_SMS = {
  lead_notification: {
    name: "New Lead",
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

export default function SmsTemplatesPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_templates, _setTemplates] = useState<
    Array<{ _id: string; name: string; textContent: string; category: string }>
  >([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    textContent: "",
    category: "custom",
  });

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/sms/templates");
      const data = await res.json();
      // Future: Use for templates display
      void data;
    } catch {
      toast.error("Failed to load templates");
    }
  };

  useEffect(() => {
    void fetchTemplates();
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/sms/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      setOpen(false);
      setForm({ name: "", textContent: "", category: "custom" });
      void fetchTemplates();
      toast.success("Template saved");
    } catch {
      toast.error("Error saving template");
    }
  };

  const handleLoadPreset = (key: string) => {
    const tpl = (
      PRESET_SMS as Record<string, { name: string; textContent: string }>
    )[key];
    setForm({
      name: tpl.name,
      textContent: tpl.textContent,
      category: "preset",
    });
    setOpen(true);
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Typography variant="h4">SMS Templates</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>
          New Template
        </Button>
      </Box>

      <Grid container spacing={2}>
        {Object.entries(PRESET_SMS).map(([key, tpl]) => (
          <Grid size={{ xs: 12, md: 4 }} key={key}>
            <Card>
              <CardContent>
                <Typography variant="h6">{tpl.name}</Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {tpl.textContent}
                </Typography>
                <Box mt={2}>
                  <Button
                    variant="outlined"
                    onClick={() => handleLoadPreset(key)}
                  >
                    Use Preset
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>New SMS Template</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            minRows={6}
            label="Text Content"
            value={form.textContent}
            onChange={(e) => setForm({ ...form, textContent: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
