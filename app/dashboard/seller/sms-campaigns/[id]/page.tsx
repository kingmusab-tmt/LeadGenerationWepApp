"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
} from "@mui/material";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";

export default function SmsCampaignEditorPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campaign, setCampaign] = useState<{
    _id: string;
    name: string;
    textContent: string;
    status: string;
    stats?: {
      queued?: number;
      sent?: number;
      delivered?: number;
      failed?: number;
      replies?: number;
      optOuts?: number;
    };
  } | null>(null);
  const [formData, setFormData] = useState({ name: "", textContent: "" });

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const res = await fetch(`/api/sms-campaigns/${campaignId}`);
        const data = await res.json();
        setCampaign(data);
        setFormData({
          name: data.name || "",
          textContent: data.textContent || "",
        });
      } catch {
        toast.error("Failed to load campaign");
      } finally {
        setLoading(false);
      }
    };
    if (campaignId) void fetchCampaign();
  }, [campaignId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/sms-campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Saved");
    } catch {
      toast.error("Error saving");
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!window.confirm("Send this SMS campaign now?")) return;
    try {
      setSaving(true);
      const res = await fetch(
        `/api/sms-campaigns/${campaignId}/actions?action=send`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      toast.success(`Campaign sending started. Sent ${data.sent}`);
    } catch {
      toast.error("Error sending campaign");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <Box p={3}>
        <CircularProgress />
      </Box>
    );
  return (
    <Box p={3}>
      <Typography variant="h4" mb={2}>
        SMS Campaign: {campaign?.name}
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                minRows={6}
                label="Text Content"
                value={formData.textContent}
                onChange={(e) =>
                  setFormData({ ...formData, textContent: e.target.value })
                }
              />
              <Box mt={2} display="flex" gap={1}>
                <Button
                  onClick={handleSave}
                  variant="contained"
                  disabled={saving}
                >
                  Save
                </Button>
                <Button
                  onClick={handleSend}
                  variant="outlined"
                  disabled={saving}
                >
                  Send Now
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1">Stats</Typography>
              <Typography variant="body2">
                Queued: {campaign?.stats?.queued || 0}
              </Typography>
              <Typography variant="body2">
                Sent: {campaign?.stats?.sent || 0}
              </Typography>
              <Typography variant="body2">
                Delivered: {campaign?.stats?.delivered || 0}
              </Typography>
              <Typography variant="body2">
                Failed: {campaign?.stats?.failed || 0}
              </Typography>
              <Typography variant="body2">
                Replies: {campaign?.stats?.replies || 0}
              </Typography>
              <Typography variant="body2">
                Opt-outs: {campaign?.stats?.optOuts || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
