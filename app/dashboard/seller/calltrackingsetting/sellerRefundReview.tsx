"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  Skeleton,
  IconButton,
  Tooltip,
  InputAdornment,
  alpha,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { formatDuration, formatDate } from "@/lib/formatUtils";
import { useCSRFFetch } from "@/app/hooks/useCSRF";
import { useDashboardTerms } from "@/app/hooks";

interface RefundCall {
  _id: string;
  callSid: string;
  from: string;
  to: string;
  buyerId: string;
  buyerName?: string;
  industry: string;
  callDuration: number;
  unitsCharged: number;
  paymentStatus: "pending_refund" | "refunded" | "paid";
  status: string;
  recordingUrl?: string;
  createdAt: string;
  feedback?: {
    buyerRating: boolean | null;
    sellerApproved: boolean | null;
    sellerComment?: string;
    refundAmount?: number;
    refundedAt?: string;
  };
}

export default function SellerRefundReview() {
  const terms = useDashboardTerms();
  const fetchWithCSRF = useCSRFFetch();
  const [calls, setCalls] = useState<RefundCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filter, setFilter] = useState<"pending" | "reviewed" | "all">(
    "pending",
  );
  const [search, setSearch] = useState("");
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    call: RefundCall | null;
    action: "approve" | "reject" | null;
  }>({ open: false, call: null, action: null });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recordingDialog, setRecordingDialog] = useState<{
    open: boolean;
    url: string;
  }>({ open: false, url: "" });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Fetches every page for a given paymentStatus filter so pending refunds
  // can never be silently hidden behind a seller's older call history — a
  // single recency-windowed fetch previously meant sellers with more than
  // ~200 total calls could lose visibility into old pending refund requests
  // indefinitely (they'd never appear to be approved/rejected).
  const fetchAllByPaymentStatus = useCallback(
    async (paymentStatus: string, maxPages = 20): Promise<RefundCall[]> => {
      const results: RefundCall[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const res = await fetch(
          `/api/calls/tracking?paymentStatus=${paymentStatus}&page=${page}&limit=200`,
        );
        const data = await res.json();
        const calls: RefundCall[] = Array.isArray(data?.data?.calls)
          ? data.data.calls
          : [];
        results.push(...calls);
        totalPages = data?.data?.pagination?.pages || 1;
        page += 1;
      } while (page <= totalPages && page <= maxPages);
      return results;
    },
    [],
  );

  const fetchRefundCalls = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, refunded, recent] = await Promise.all([
        fetchAllByPaymentStatus("pending_refund"),
        fetchAllByPaymentStatus("refunded"),
        fetch("/api/calls/tracking?limit=200")
          .then((r) => r.json())
          .then((data) =>
            Array.isArray(data?.data?.calls) ? (data.data.calls as RefundCall[]) : [],
          ),
      ]);

      // Merge and de-duplicate by _id — `recent` covers rejected refunds
      // (feedback.sellerApproved === false, paymentStatus stays "paid")
      // within the recency window, while pending/refunded are complete.
      const byId = new Map<string, RefundCall>();
      for (const c of [...pending, ...refunded, ...recent]) {
        if (
          c.paymentStatus === "pending_refund" ||
          c.paymentStatus === "refunded" ||
          c.feedback?.buyerRating === false
        ) {
          byId.set(c._id, c);
        }
      }

      setCalls(Array.from(byId.values()));
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to load refund requests",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [fetchAllByPaymentStatus]);

  useEffect(() => {
    fetchRefundCalls();
  }, [fetchRefundCalls]);

  const filteredCalls = calls.filter((call) => {
    // Filter by status
    if (filter === "pending" && call.paymentStatus !== "pending_refund")
      return false;
    if (
      filter === "reviewed" &&
      call.paymentStatus !== "refunded" &&
      call.feedback?.sellerApproved !== false
    )
      return false;

    // Search
    if (search) {
      const s = search.toLowerCase();
      return (
        call.from?.toLowerCase().includes(s) ||
        call.to?.toLowerCase().includes(s) ||
        call.buyerName?.toLowerCase().includes(s) ||
        call.industry?.toLowerCase().includes(s) ||
        call.callSid?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const handleReviewOpen = (call: RefundCall, action: "approve" | "reject") => {
    setReviewDialog({ open: true, call, action });
    setComment("");
  };

  const handleReviewClose = () => {
    setReviewDialog({ open: false, call: null, action: null });
    setComment("");
  };

  const handleSubmitReview = async () => {
    if (!reviewDialog.call || !reviewDialog.action) return;
    setSubmitting(true);

    try {
      const res = await fetchWithCSRF(
        `/api/calls/feedback?callId=${reviewDialog.call._id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isSellerReview: true,
            approved: reviewDialog.action === "approve",
            comment,
          }),
        },
      );

      if (!res.ok) throw new Error("Failed to submit review");

      setSnackbar({
        open: true,
        message:
          reviewDialog.action === "approve"
            ? `Refund approved — units returned to ${terms.buyerLower}`
            : "Refund request rejected",
        severity: "success",
      });

      handleReviewClose();
      fetchRefundCalls(); // Refresh list
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to submit review",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = calls.filter(
    (c) => c.paymentStatus === "pending_refund",
  ).length;

  return (
    <Box>
      {/* Summary Bar */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Chip
          label={`Pending (${pendingCount})`}
          color={filter === "pending" ? "warning" : "default"}
          variant={filter === "pending" ? "filled" : "outlined"}
          onClick={() => setFilter("pending")}
          sx={{ fontWeight: 600 }}
        />
        <Chip
          label="Reviewed"
          color={filter === "reviewed" ? "info" : "default"}
          variant={filter === "reviewed" ? "filled" : "outlined"}
          onClick={() => setFilter("reviewed")}
        />
        <Chip
          label="All"
          color={filter === "all" ? "primary" : "default"}
          variant={filter === "all" ? "filled" : "outlined"}
          onClick={() => setFilter("all")}
        />

        <Box sx={{ flexGrow: 1 }} />

        <TextField
          size="small"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 200 }}
        />

        <Tooltip title="Refresh">
          <IconButton
            aria-label="Refresh refund requests"
            onClick={fetchRefundCalls}
            size="small"
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Table */}
      {loading ? (
        <Box>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              height={48}
              sx={{ mb: 1, borderRadius: 1 }}
            />
          ))}
        </Box>
      ) : filteredCalls.length === 0 ? (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <Typography variant="h6" color="text.secondary">
              {filter === "pending"
                ? "No pending refund requests"
                : "No refund requests found"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {filter === "pending"
                ? `When ${terms.buyersLower} report bad calls, refund requests will appear here for your review.`
                : "Try changing your filter or search criteria."}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer>
          <Table size="small" sx={{ "& th": { fontWeight: 700 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Caller</TableCell>
                <TableCell>{terms.buyer}</TableCell>
                <TableCell>Industry</TableCell>
                <TableCell align="center">Duration</TableCell>
                <TableCell align="center">Units</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Recording</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCalls
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((call) => (
                  <TableRow
                    key={call._id}
                    hover
                    sx={{
                      bgcolor:
                        call.paymentStatus === "pending_refund"
                          ? (theme) => alpha(theme.palette.warning.main, 0.04)
                          : undefined,
                    }}
                  >
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {formatDate(call.createdAt)}
                    </TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: 13 }}>
                      {call.from}
                    </TableCell>
                    <TableCell>
                      {call.buyerName || call.buyerId?.slice(0, 8) || "—"}
                    </TableCell>
                    <TableCell>{call.industry || "—"}</TableCell>
                    <TableCell align="center">
                      {formatDuration(call.callDuration)}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${call.unitsCharged || 0} units`}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={
                          call.paymentStatus === "pending_refund"
                            ? "Pending"
                            : call.paymentStatus === "refunded"
                              ? "Refunded"
                              : call.feedback?.sellerApproved === false
                                ? "Rejected"
                                : "Paid"
                        }
                        size="small"
                        color={
                          call.paymentStatus === "pending_refund"
                            ? "warning"
                            : call.paymentStatus === "refunded"
                              ? "success"
                              : call.feedback?.sellerApproved === false
                                ? "error"
                                : "default"
                        }
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {call.recordingUrl &&
                      call.recordingUrl !== "No Record" ? (
                        <Tooltip title="Play recording">
                          <IconButton
                            aria-label={`Play recording for call from ${call.from}`}
                            size="small"
                            onClick={() =>
                              setRecordingDialog({
                                open: true,
                                url: call.recordingUrl!,
                              })
                            }
                          >
                            <PlayArrowIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {call.paymentStatus === "pending_refund" ? (
                        <Box
                          sx={{
                            display: "flex",
                            gap: 0.5,
                            justifyContent: "center",
                          }}
                        >
                          <Tooltip title="Approve refund">
                            <IconButton
                              aria-label={`Approve refund for call from ${call.from}`}
                              size="small"
                              color="success"
                              onClick={() => handleReviewOpen(call, "approve")}
                            >
                              <CheckCircleOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject refund">
                            <IconButton
                              aria-label={`Reject refund for call from ${call.from}`}
                              size="small"
                              color="error"
                              onClick={() => handleReviewOpen(call, "reject")}
                            >
                              <CancelOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {call.feedback?.sellerComment
                            ? `"${call.feedback.sellerComment.slice(0, 30)}..."`
                            : "Reviewed"}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={filteredCalls.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </TableContainer>
      )}

      {/* Review Dialog */}
      <Dialog
        open={reviewDialog.open}
        onClose={handleReviewClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {reviewDialog.action === "approve"
            ? "Approve Refund"
            : "Reject Refund Request"}
        </DialogTitle>
        <DialogContent>
          {reviewDialog.call && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Call from <strong>{reviewDialog.call.from}</strong> on{" "}
                {formatDate(reviewDialog.call.createdAt)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Duration: {formatDuration(reviewDialog.call.callDuration)} ·
                Units: {reviewDialog.call.unitsCharged}
              </Typography>
              {reviewDialog.call.feedback?.buyerRating === false && (
                <Chip
                  label={`${terms.buyer} rated this call as bad`}
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ mt: 1 }}
                />
              )}
            </Box>
          )}
          <TextField
            label={
              reviewDialog.action === "approve"
                ? "Reason for approval (optional)"
                : "Reason for rejection"
            }
            multiline
            rows={3}
            fullWidth
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required={reviewDialog.action === "reject"}
            placeholder={
              reviewDialog.action === "approve"
                ? "e.g., Confirmed bad lead quality"
                : "e.g., Call duration was sufficient, valid lead"
            }
          />
          {reviewDialog.action === "approve" && (
            <Typography
              variant="caption"
              color="warning.main"
              sx={{ mt: 1, display: "block" }}
            >
              This will refund {reviewDialog.call?.unitsCharged || 0} units back
              to the {terms.buyerLower}&apos;s wallet.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReviewClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={reviewDialog.action === "approve" ? "success" : "error"}
            onClick={handleSubmitReview}
            disabled={
              submitting ||
              (reviewDialog.action === "reject" && !comment.trim())
            }
          >
            {submitting
              ? "Submitting..."
              : reviewDialog.action === "approve"
                ? "Approve & Refund"
                : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Recording Playback Dialog */}
      <Dialog
        open={recordingDialog.open}
        onClose={() => setRecordingDialog({ open: false, url: "" })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Call Recording</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <audio controls style={{ width: "100%" }}>
              <source src={recordingDialog.url} type="audio/mpeg" />
              Your browser does not support audio playback.
            </audio>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecordingDialog({ open: false, url: "" })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.severity === "error" ? 6000 : 4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
