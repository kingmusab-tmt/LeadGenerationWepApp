"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
} from "@mui/material";
import type { ChipProps } from "@mui/material";
import { CheckCircle, Cancel, Phone, Refresh } from "@mui/icons-material";
import { useCSRFFetch } from "@/app/hooks/useCSRF";

interface ScheduledCallback {
  _id: string;
  callerPhone: string;
  trackingNumber: string;
  industry: string;
  callSid: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  scheduledFor: string;
  attemptCount: number;
  maxAttempts: number;
  completedAt?: string;
  notes?: string;
  createdAt: string;
}

export default function ScheduledCallbacksPanel() {
  const fetchWithCSRF = useCSRFFetch();
  const [callbacks, setCallbacks] = useState<ScheduledCallback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    callback: ScheduledCallback | null;
    action: "complete" | "cancel";
  }>({ open: false, callback: null, action: "complete" });
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCallbacks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/calls/scheduled-callbacks?status=${statusFilter}&page=${page}&limit=15`,
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCallbacks(data.callbacks || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchCallbacks();
  }, [fetchCallbacks]);

  const handleAction = async () => {
    if (!actionDialog.callback) return;
    setActionLoading(true);
    try {
      const res = await fetchWithCSRF("/api/calls/scheduled-callbacks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callbackId: actionDialog.callback._id,
          action: actionDialog.action,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setActionDialog({ open: false, callback: null, action: "complete" });
      setNotes("");
      fetchCallbacks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getStatusColor = (status: string): ChipProps["color"] => {
    switch (status) {
      case "pending":
        return "warning";
      case "completed":
        return "success";
      case "cancelled":
        return "default";
      case "failed":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Scheduled Callbacks</Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              label="Status"
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="all">All</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchCallbacks} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : callbacks.length === 0 ? (
        <Alert severity="info">No {statusFilter} callbacks found.</Alert>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Caller</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Industry</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Requested</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Attempts</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {callbacks.map((cb) => (
                  <TableRow key={cb._id} hover>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <Phone fontSize="small" color="primary" />
                        <Typography variant="body2">
                          {cb.callerPhone}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{cb.industry || "—"}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(cb.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={cb.status}
                        size="small"
                        color={getStatusColor(cb.status)}
                      />
                    </TableCell>
                    <TableCell>
                      {cb.attemptCount}/{cb.maxAttempts}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          maxWidth: 150,
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {cb.notes || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {cb.status === "pending" && (
                        <Box
                          sx={{
                            display: "flex",
                            gap: 0.5,
                            justifyContent: "center",
                          }}
                        >
                          <Tooltip title="Mark as completed">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() =>
                                setActionDialog({
                                  open: true,
                                  callback: cb,
                                  action: "complete",
                                })
                              }
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancel callback">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                setActionDialog({
                                  open: true,
                                  callback: cb,
                                  action: "cancel",
                                })
                              }
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                size="small"
              />
            </Box>
          )}
        </>
      )}

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onClose={() =>
          setActionDialog({ open: false, callback: null, action: "complete" })
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionDialog.action === "complete"
            ? "Mark Callback as Completed"
            : "Cancel Callback"}
        </DialogTitle>
        <DialogContent>
          {actionDialog.callback && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Caller: {actionDialog.callback.callerPhone}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Requested: {formatDate(actionDialog.callback.createdAt)}
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={2}
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setActionDialog({
                open: false,
                callback: null,
                action: "complete",
              });
              setNotes("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color={actionDialog.action === "complete" ? "success" : "error"}
            onClick={handleAction}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : null}
          >
            {actionDialog.action === "complete"
              ? "Mark Completed"
              : "Cancel Callback"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
