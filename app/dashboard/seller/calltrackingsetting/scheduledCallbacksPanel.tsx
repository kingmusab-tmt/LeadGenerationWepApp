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
  const [actionError, setActionError] = useState<string | null>(null);

  // Guards against two races:
  // 1. Out-of-order responses — switching the status filter or page quickly
  //    could let a slower, older request resolve after a newer one and
  //    clobber the UI with stale data. `isStale()` is checked right after
  //    the await and skips applying the response if a newer request/unmount
  //    has since superseded it.
  // 2. Stale pagination — resolving/cancelling the last item on a later
  //    page leaves `requestPage` pointing past the new last page; if so,
  //    clamp to the last valid page and let the effect below refetch,
  //    instead of showing a false "no callbacks" empty state.
  const fetchCallbacks = useCallback(
    async (requestPage: number, isStale: () => boolean) => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/calls/scheduled-callbacks?status=${statusFilter}&page=${requestPage}&limit=15`,
        );
        if (!res.ok) throw new Error("Failed to fetch");
        const body = await res.json();
        const data = body?.data ?? body;
        if (isStale()) return;
        const pages = data.pagination?.pages || 1;
        const total = data.pagination?.total ?? 0;
        if (requestPage > pages && total > 0) {
          setPage(pages);
          return;
        }
        setCallbacks(data.callbacks || []);
        setTotalPages(pages);
      } catch (err) {
        if (isStale()) return;
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!isStale()) setLoading(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    let cancelled = false;
    fetchCallbacks(page, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchCallbacks, page]);

  const handleAction = async () => {
    if (!actionDialog.callback) return;
    setActionLoading(true);
    setActionError(null);
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
      fetchCallbacks(page, () => false);
    } catch (err) {
      // Shown inside the dialog (see the Dialog below) rather than the
      // page-level error banner — the seller is looking at the modal when
      // this happens, and the banner sits behind it out of view.
      setActionError(err instanceof Error ? err.message : "Failed to update");
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
        <Box>
          <Typography variant="h6">Scheduled Callbacks</Typography>
          <Typography variant="caption" color="text.secondary">
            These are not dialed automatically — call the customer back
            yourself, then mark the request completed or cancelled below.
          </Typography>
        </Box>
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
            <IconButton
              aria-label="Refresh callbacks"
              onClick={() => fetchCallbacks(page, () => false)}
              size="small"
            >
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
                              aria-label={`Mark callback from ${cb.callerPhone} as completed`}
                              size="small"
                              color="success"
                              onClick={() => {
                                setActionError(null);
                                setActionDialog({
                                  open: true,
                                  callback: cb,
                                  action: "complete",
                                });
                              }}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancel callback">
                            <IconButton
                              aria-label={`Cancel callback from ${cb.callerPhone}`}
                              size="small"
                              color="error"
                              onClick={() => {
                                setActionError(null);
                                setActionDialog({
                                  open: true,
                                  callback: cb,
                                  action: "cancel",
                                });
                              }}
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
        onClose={() => {
          setActionDialog({ open: false, callback: null, action: "complete" });
          setActionError(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionDialog.action === "complete"
            ? "Mark Callback as Completed"
            : "Cancel Callback"}
        </DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {actionError}
            </Alert>
          )}
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
              setActionError(null);
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
