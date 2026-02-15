"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { getSession } from "next-auth/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Snackbar,
  Alert,
  Box,
  Typography,
  TextField,
  Chip,
  Pagination,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  TableContainer,
  Skeleton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import { formatDate, formatDuration } from "@/lib/formatUtils";

interface Call {
  _id: string;
  from: string;
  to: string;
  status: string;
  recordingUrl?: string;
  callDuration?: number;
  buyerName?: string;
  industry?: string;
  unitsCharged?: number;
  paymentStatus?: string;
  createdAt: string;
  callSid?: string;
  forwardingType?: string;
  feedback?: {
    buyerRating: boolean | null;
    sellerApproved: boolean | null;
    sellerComment?: string;
    refundAmount?: number;
    refundedAt?: string;
  };
}

const PAGE_SIZE = 15;

const STATUS_COLORS: Record<
  string,
  "success" | "error" | "warning" | "info" | "default"
> = {
  completed: "success",
  forwarded: "info",
  "no-answer": "warning",
  failed: "error",
  busy: "error",
  insufficient_balance: "error",
  "in-progress": "warning",
  ringing: "info",
};

const PAYMENT_COLORS: Record<
  string,
  "success" | "error" | "warning" | "default"
> = {
  paid: "success",
  refunded: "error",
  pending_refund: "warning",
};

export default function LeadTracking() {
  const [allCalls, setAllCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  // Audio player state
  const [audioDialogOpen, setAudioDialogOpen] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<{
    url: string;
    callSid: string;
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    async function fetchSellerId() {
      const session = await getSession();
      if (session && session.user) {
        setSellerId(session.user.id);
      }
    }
    fetchSellerId();
  }, []);

  const fetchCalls = useCallback(async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/calls/tracking");
      const data = await res.json();
      const calls = Array.isArray(data)
        ? data
        : (data?.data ?? data?.calls ?? []);
      setAllCalls(calls);
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to fetch calls.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Apply filters
  useEffect(() => {
    let result = [...allCalls];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.from?.toLowerCase().includes(q) ||
          c.to?.toLowerCase().includes(q) ||
          c.buyerName?.toLowerCase().includes(q) ||
          c.industry?.toLowerCase().includes(q) ||
          c.status?.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((c) => new Date(c.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((c) => new Date(c.createdAt) <= to);
    }

    result.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    setFilteredCalls(result);
    setCurrentPage(1);
  }, [allCalls, search, statusFilter, dateFrom, dateTo]);

  const paginatedCalls = filteredCalls.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const totalPages = Math.ceil(filteredCalls.length / PAGE_SIZE);

  const uniqueStatuses = Array.from(new Set(allCalls.map((c) => c.status)));

  const handlePlayRecording = (recordingUrl: string, callSid?: string) => {
    if (!recordingUrl) return;
    const matches = recordingUrl.match(/Recordings\/([^/]+)/);
    const recordingSid = matches ? matches[1] : null;

    if (recordingSid) {
      setCurrentAudio({
        url: `/api/recordings/proxy?recordingSid=${recordingSid}&format=mp3`,
        callSid: callSid || "Unknown",
      });
    } else {
      setCurrentAudio({ url: recordingUrl, callSid: callSid || "Unknown" });
    }
    setAudioDialogOpen(true);
  };

  const exportCSV = () => {
    if (filteredCalls.length === 0) {
      setSnackbar({
        open: true,
        message: "No calls to export.",
        severity: "info",
      });
      return;
    }

    const headers = [
      "Date",
      "From",
      "To",
      "Status",
      "Buyer",
      "Industry",
      "Duration (s)",
      "Units Charged",
      "Payment Status",
      "Forwarding Type",
    ];
    const rows = filteredCalls.map((c) => [
      new Date(c.createdAt).toISOString(),
      c.from,
      c.to,
      c.status,
      c.buyerName || "N/A",
      c.industry || "N/A",
      c.callDuration?.toString() || "0",
      c.unitsCharged?.toString() || "0",
      c.paymentStatus || "N/A",
      c.forwardingType || "N/A",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `call-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSnackbar({
      open: true,
      message: `Exported ${filteredCalls.length} calls.`,
      severity: "success",
    });
  };

  if (loading && allCalls.length === 0) {
    return (
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
    );
  }

  return (
    <Box>
      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          alignItems: "center",
          mb: 2,
        }}
      >
        <TextField
          size="small"
          placeholder="Search calls..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 200, flex: "1 1 200px" }}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status"
          >
            <MenuItem value="all">All Statuses</MenuItem>
            {uniqueStatuses.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          type="date"
          label="From"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />

        <Box sx={{ display: "flex", gap: 0.5, ml: "auto" }}>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={fetchCalls} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export CSV">
            <IconButton size="small" onClick={exportCSV}>
              <FileDownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Results summary */}
      <Box sx={{ display: "flex", gap: 1, mb: 1.5, alignItems: "center" }}>
        <Typography variant="body2" color="text.secondary">
          {filteredCalls.length} call{filteredCalls.length !== 1 ? "s" : ""}
          {search || statusFilter !== "all" || dateFrom || dateTo
            ? " (filtered)"
            : ""}
        </Typography>
        {(search || statusFilter !== "all" || dateFrom || dateTo) && (
          <Button
            size="small"
            variant="text"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Clear Filters
          </Button>
        )}
      </Box>

      {/* Table */}
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>From</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>To</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Buyer</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Industry</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Cost</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Payment</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Recording</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedCalls.length > 0 ? (
              paginatedCalls.map((call) => (
                <TableRow key={call._id || call.callSid} hover>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {formatDate(call.createdAt)}
                  </TableCell>
                  <TableCell
                    sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
                  >
                    {call.from}
                  </TableCell>
                  <TableCell
                    sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
                  >
                    {call.to}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={call.status}
                      color={STATUS_COLORS[call.status] || "default"}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{call.buyerName || "N/A"}</TableCell>
                  <TableCell>{call.industry || "N/A"}</TableCell>
                  <TableCell>
                    {call.callDuration
                      ? formatDuration(call.callDuration)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {call.unitsCharged ? (
                      <Typography variant="body2" fontWeight={600}>
                        {call.unitsCharged} units
                      </Typography>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {call.paymentStatus ? (
                      <Chip
                        label={call.paymentStatus}
                        color={PAYMENT_COLORS[call.paymentStatus] || "default"}
                        size="small"
                        variant="outlined"
                      />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {call.recordingUrl && call.recordingUrl !== "No Record" ? (
                      <Tooltip title="Play recording">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() =>
                            handlePlayRecording(
                              call.recordingUrl!,
                              call.callSid,
                            )
                          }
                        >
                          <PlayCircleIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        None
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} sx={{ textAlign: "center", py: 4 }}>
                  <Typography color="text.secondary">
                    {search || statusFilter !== "all" || dateFrom || dateTo
                      ? "No calls match your filters"
                      : "No call history available"}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
            size="small"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Audio Player Dialog */}
      <Dialog
        open={audioDialogOpen}
        onClose={() => {
          setAudioDialogOpen(false);
          setCurrentAudio(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography fontWeight={600}>Call Recording</Typography>
          <IconButton
            size="small"
            onClick={() => {
              setAudioDialogOpen(false);
              setCurrentAudio(null);
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center", py: 3 }}>
          {currentAudio && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Call SID: {currentAudio.callSid}
              </Typography>
              <audio
                ref={audioRef}
                controls
                autoPlay
                style={{ width: "100%", marginTop: 16 }}
              >
                <source src={currentAudio.url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
