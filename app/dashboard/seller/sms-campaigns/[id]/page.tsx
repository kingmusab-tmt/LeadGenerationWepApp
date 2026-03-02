"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Divider,
} from "@mui/material";
import {
  Send as SendIcon,
  Pause as PauseIcon,
  PlayArrow as ResumeIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import SmsRecipientPicker from "@/app/components/SmsRecipientPicker";
import { useConfirm } from "@/app/hooks/useConfirm";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useCSRFFetch } from "@/app/hooks/useCSRF";

interface CampaignData {
  _id: string;
  name: string;
  textContent: string;
  status: string;
  recipients: Array<{ phone: string; name?: string }>;
  stats: {
    queued: number;
    sent: number;
    delivered: number;
    failed: number;
    replies: number;
    optOuts: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface SmsReply {
  _id: string;
  phone: string;
  body: string;
  createdAt?: string;
}

export default function SmsCampaignEditorPage() {
  const fetchWithCSRF = useCSRFFetch();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const campaignId = params?.id as string;
  const repliesSectionRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [replies, setReplies] = useState<SmsReply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
  const [formData, setFormData] = useState({
    name: "",
    textContent: "",
    recipientList: "",
  });
  const [testPhone, setTestPhone] = useState("");
  const shouldFocusReplies = searchParams.get("view") === "replies";

  useEffect(() => {
    if (!shouldFocusReplies || loading) return;
    requestAnimationFrame(() => {
      repliesSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [shouldFocusReplies, loading]);

  useEffect(() => {
    const fetchReplies = async () => {
      try {
        setRepliesLoading(true);
        const res = await fetch(
          `/api/marketing/sms/campaigns/${campaignId}/replies`,
        );
        if (!res.ok) throw new Error("Failed to load replies");
        const data = await res.json();
        setReplies(data.items || []);
      } catch {
        setReplies([]);
      } finally {
        setRepliesLoading(false);
      }
    };

    const fetchCampaign = async () => {
      try {
        const res = await fetch(`/api/marketing/sms/campaigns/${campaignId}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setCampaign(data);
        const phones = (data.recipients || [])
          .map((r: { phone: string }) => r.phone)
          .join(", ");
        setFormData({
          name: data.name || "",
          textContent: data.textContent || "",
          recipientList: phones,
        });
      } catch {
        toast.error("Failed to load campaign");
      } finally {
        setLoading(false);
      }
    };
    if (campaignId) {
      void fetchCampaign();
      void fetchReplies();
    }
  }, [campaignId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const recipientArray = formData.recipientList
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((phone) => ({ phone }));

      const res = await fetchWithCSRF(
        `/api/marketing/sms/campaigns/${campaignId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            textContent: formData.textContent,
            recipients: recipientArray,
          }),
        },
      );
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setCampaign(updated);
      toast.success("Campaign saved");
    } catch {
      toast.error("Error saving campaign");
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    const confirmed = await confirm({
      title: "Send SMS Campaign",
      message: "Send this SMS campaign to all recipients now?",
      confirmText: "Send Now",
      confirmColor: "primary",
    });
    if (!confirmed) return;
    try {
      setSaving(true);
      const res = await fetch(
        `/api/marketing/sms/campaigns/${campaignId}/actions?action=send`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      toast.success(`Campaign sending started. Sent: ${data.sent}`);
      // Refresh campaign status
      const refreshRes = await fetch(
        `/api/marketing/sms/campaigns/${campaignId}`,
      );
      if (refreshRes.ok) setCampaign(await refreshRes.json());
    } catch (error: any) {
      toast.error(error?.message || "Error sending campaign");
    } finally {
      setSaving(false);
    }
  };

  const handleTestSms = async () => {
    if (!testPhone.trim()) {
      toast.error("Enter a phone number to send test SMS");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(
        `/api/marketing/sms/campaigns/${campaignId}/actions?action=test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testPhone: testPhone.trim() }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send test SMS");
      toast.success("Test SMS sent successfully");
    } catch (error: any) {
      toast.error(error?.message || "Error sending test SMS");
    } finally {
      setSaving(false);
    }
  };

  const handlePause = async () => {
    try {
      setSaving(true);
      const res = await fetch(
        `/api/marketing/sms/campaigns/${campaignId}/actions?action=pause`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Failed to pause");
      toast.success("Campaign paused");
      const refreshRes = await fetch(
        `/api/marketing/sms/campaigns/${campaignId}`,
      );
      if (refreshRes.ok) setCampaign(await refreshRes.json());
    } catch {
      toast.error("Error pausing campaign");
    } finally {
      setSaving(false);
    }
  };

  const handleResume = async () => {
    try {
      setSaving(true);
      const res = await fetch(
        `/api/marketing/sms/campaigns/${campaignId}/actions?action=resume`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Failed to resume");
      const data = await res.json();
      toast.success(data.message || "Campaign resumed");
      const refreshRes = await fetch(
        `/api/marketing/sms/campaigns/${campaignId}`,
      );
      if (refreshRes.ok) setCampaign(await refreshRes.json());
    } catch {
      toast.error("Error resuming campaign");
    } finally {
      setSaving(false);
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

  const isDraft = campaign?.status === "draft";
  const isSending = campaign?.status === "sending";
  const isPaused = campaign?.status === "paused";
  const charCount = formData.textContent.length;
  const smsSegments = Math.ceil(charCount / 160) || 0;

  if (loading)
    return (
      <Box p={3}>
        <CircularProgress />
      </Box>
    );

  if (!campaign)
    return (
      <Box p={3}>
        <Typography color="error">Campaign not found</Typography>
      </Box>
    );

  return (
    <Box p={3}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>
            {campaign.name}
          </Typography>
          <Chip
            label={campaign.status}
            color={getStatusColor(campaign.status)}
            size="small"
            sx={{ mt: 0.5 }}
          />
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          {isDraft && (
            <>
              <Button
                onClick={handleSave}
                variant="contained"
                disabled={saving}
                startIcon={<SaveIcon />}
              >
                Save
              </Button>
              <Button
                onClick={handleSend}
                variant="outlined"
                disabled={saving}
                startIcon={<SendIcon />}
              >
                Send Now
              </Button>
            </>
          )}
          {isPaused && (
            <>
              <Button
                onClick={handleSave}
                variant="contained"
                disabled={saving}
                startIcon={<SaveIcon />}
              >
                Save
              </Button>
              <Button
                onClick={handleResume}
                variant="outlined"
                color="success"
                disabled={saving}
                startIcon={<ResumeIcon />}
              >
                Resume
              </Button>
            </>
          )}
          {isSending && (
            <Button
              onClick={handlePause}
              variant="outlined"
              color="warning"
              disabled={saving}
              startIcon={<PauseIcon />}
            >
              Pause
            </Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Editor Column */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Campaign Editor
              </Typography>
              <TextField
                fullWidth
                label="Campaign Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={!isDraft && !isPaused}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                minRows={6}
                label="SMS Message"
                value={formData.textContent}
                onChange={(e) =>
                  setFormData({ ...formData, textContent: e.target.value })
                }
                disabled={!isDraft && !isPaused}
                helperText={`${charCount}/160 characters${smsSegments > 1 ? ` (${smsSegments} SMS segments)` : ""} — Use {{variable}} for personalization`}
                sx={{ mb: 2 }}
              />

              <SmsRecipientPicker
                value={formData.recipientList}
                onChange={(val) =>
                  setFormData({ ...formData, recipientList: val })
                }
                disabled={!isDraft && !isPaused}
              />

              {/* Test SMS */}
              {(isDraft || isPaused) && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Send Test SMS
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <TextField
                      size="small"
                      label="Test Phone Number"
                      placeholder="+15551234567"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <Button
                      variant="outlined"
                      onClick={handleTestSms}
                      disabled={saving || !testPhone.trim()}
                    >
                      Send Test
                    </Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Stats Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Campaign Stats
              </Typography>
              {[
                { label: "Queued", value: campaign.stats?.queued || 0 },
                { label: "Sent", value: campaign.stats?.sent || 0 },
                {
                  label: "Delivered",
                  value: campaign.stats?.delivered || 0,
                  color: "success.main",
                },
                {
                  label: "Failed",
                  value: campaign.stats?.failed || 0,
                  color: "error.main",
                },
                { label: "Replies", value: campaign.stats?.replies || 0 },
                {
                  label: "Opt-Outs",
                  value: campaign.stats?.optOuts || 0,
                  color: "warning.main",
                },
              ].map((stat) => (
                <Box
                  key={stat.label}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    py: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    color={stat.color || "text.primary"}
                  >
                    {stat.value}
                  </Typography>
                </Box>
              ))}

              {campaign.stats?.sent > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Delivery Rate
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {campaign.stats.sent > 0
                      ? (
                          (campaign.stats.delivered / campaign.stats.sent) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </Typography>
                </>
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Recipients: {campaign.recipients?.length || 0}
              </Typography>
              {campaign.createdAt && (
                <Typography variant="body2" color="text.secondary">
                  Created: {new Date(campaign.createdAt).toLocaleDateString()}
                </Typography>
              )}
              {campaign.updatedAt && (
                <Typography variant="body2" color="text.secondary">
                  Updated: {new Date(campaign.updatedAt).toLocaleDateString()}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }} ref={repliesSectionRef}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6">Received Replies</Typography>
                <Button
                  size="small"
                  onClick={async () => {
                    try {
                      setRepliesLoading(true);
                      const res = await fetch(
                        `/api/marketing/sms/campaigns/${campaignId}/replies`,
                      );
                      if (!res.ok) throw new Error("Failed to load replies");
                      const data = await res.json();
                      setReplies(data.items || []);
                    } catch {
                      toast.error("Failed to refresh replies");
                    } finally {
                      setRepliesLoading(false);
                    }
                  }}
                  disabled={repliesLoading}
                >
                  {repliesLoading ? "Refreshing..." : "Refresh"}
                </Button>
              </Box>

              {repliesLoading ? (
                <CircularProgress size={20} />
              ) : replies.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No replies received for this campaign yet.
                </Typography>
              ) : (
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                >
                  {replies.map((reply) => (
                    <Box
                      key={reply._id}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        p: 1.5,
                      }}
                    >
                      <Typography variant="subtitle2">{reply.phone}</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {reply.body || "(No message body)"}
                      </Typography>
                      {reply.createdAt && (
                        <Typography variant="caption" color="text.secondary">
                          {new Date(reply.createdAt).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
