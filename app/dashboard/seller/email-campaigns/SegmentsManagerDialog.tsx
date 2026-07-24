"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import { Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import { useCSRFFetch } from "@/app/hooks/useCSRF";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useDashboardTerms } from "@/app/hooks";
import ConfirmDialog from "@/app/components/ConfirmDialog";

interface Segment {
  _id: string;
  name: string;
  description?: string;
  filters: {
    source: "leads" | "buyers" | "both";
    industries?: string[];
    leadQuality?: ("High" | "Medium" | "Low")[];
    buyerActiveOnly?: boolean;
  };
  recipientCount?: number;
}

const QUALITY_OPTIONS = ["High", "Medium", "Low"] as const;

export default function SegmentsManagerDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const fetchWithCSRF = useCSRFFetch();
  const terms = useDashboardTerms();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<"leads" | "buyers" | "both">("leads");
  const [industriesInput, setIndustriesInput] = useState("");
  const [leadQuality, setLeadQuality] = useState<string[]>([]);
  const [buyerActiveOnly, setBuyerActiveOnly] = useState(true);

  const fetchSegments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/marketing/email/segments");
      const data = await response.json();
      setSegments(data?.data?.segments || []);
    } catch {
      toast.error("Failed to load segments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchSegments();
  }, [open, fetchSegments]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setSource("leads");
    setIndustriesInput("");
    setLeadQuality([]);
    setBuyerActiveOnly(true);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Segment name is required");
      return;
    }
    try {
      setSaving(true);
      const industries = industriesInput
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      const response = await fetchWithCSRF("/api/marketing/email/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          filters: {
            source,
            industries: industries.length > 0 ? industries : undefined,
            leadQuality:
              source !== "buyers" && leadQuality.length > 0
                ? leadQuality
                : undefined,
            buyerActiveOnly: source !== "leads" ? buyerActiveOnly : undefined,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create segment");
      }

      toast.success("Segment created");
      resetForm();
      fetchSegments();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Error creating segment",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (segment: Segment) => {
    const confirmed = await confirm({
      title: "Delete Segment",
      message: `Delete "${segment.name}"? Campaigns already using it keep their existing recipient list — this only removes the saved segment itself.`,
      confirmText: "Delete",
      confirmColor: "error",
    });
    if (!confirmed) return;

    try {
      setDeletingId(segment._id);
      const response = await fetchWithCSRF(
        `/api/marketing/email/segments/${segment._id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete segment");
      }
      toast.success("Segment deleted");
      fetchSegments();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Error deleting segment",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Segments</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Alert severity="info" sx={{ mb: 1 }}>
            A segment is a saved filter over your own leads/
            {terms.buyersLower} (e.g. &quot;High-quality TX leads&quot;) that
            you can quickly re-apply when picking recipients for a campaign.
          </Alert>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : segments.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              No saved segments yet.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {segments.map((s) => (
                <Box
                  key={s._id}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {s.name}{" "}
                      <Chip
                        size="small"
                        label={`${s.recipientCount ?? 0} recipients`}
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.filters.source}
                      {s.filters.industries?.length
                        ? ` · ${s.filters.industries.join(", ")}`
                        : ""}
                      {s.filters.leadQuality?.length
                        ? ` · Quality: ${s.filters.leadQuality.join(", ")}`
                        : ""}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(s)}
                    disabled={deletingId === s._id}
                  >
                    {deletingId === s._id ? (
                      <CircularProgress size={16} />
                    ) : (
                      <DeleteIcon fontSize="small" />
                    )}
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ my: 1 }} />

          <Typography variant="subtitle2">Create New Segment</Typography>
          <TextField
            label="Segment Name"
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Description (optional)"
            size="small"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Source</InputLabel>
            <Select
              value={source}
              label="Source"
              onChange={(e) =>
                setSource(e.target.value as "leads" | "buyers" | "both")
              }
            >
              <MenuItem value="leads">Leads</MenuItem>
              <MenuItem value="buyers">{terms.leadBuyers}</MenuItem>
              <MenuItem value="both">Both</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Industries (comma-separated, optional)"
            size="small"
            value={industriesInput}
            onChange={(e) => setIndustriesInput(e.target.value)}
            placeholder="Real Estate, Insurance"
            fullWidth
          />
          {source !== "buyers" && (
            <FormControl size="small" fullWidth>
              <InputLabel>Lead Quality (optional)</InputLabel>
              <Select
                multiple
                value={leadQuality}
                onChange={(e) =>
                  setLeadQuality(
                    typeof e.target.value === "string"
                      ? e.target.value.split(",")
                      : e.target.value,
                  )
                }
                renderValue={(selected) => (selected as string[]).join(", ")}
                label="Lead Quality (optional)"
              >
                {QUALITY_OPTIONS.map((q) => (
                  <MenuItem key={q} value={q}>
                    <Checkbox checked={leadQuality.includes(q)} size="small" />
                    <ListItemText primary={q} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {source !== "leads" && (
            <FormControl size="small" fullWidth>
              <InputLabel>{terms.buyer} Status</InputLabel>
              <Select
                value={buyerActiveOnly ? "active" : "all"}
                label={`${terms.buyer} Status`}
                onChange={(e) => setBuyerActiveOnly(e.target.value === "active")}
              >
                <MenuItem value="active">
                  Active {terms.buyersLower} only
                </MenuItem>
                <MenuItem value="all">All {terms.buyersLower}</MenuItem>
              </Select>
            </FormControl>
          )}
          <Button
            variant="outlined"
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            startIcon={saving ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {saving ? "Creating..." : "Create Segment"}
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

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
    </>
  );
}
