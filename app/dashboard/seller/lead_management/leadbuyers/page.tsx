"use client";
import { useEffect, useState, useRef } from "react";
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
  TableContainer,
  TableSortLabel,
  TextField,
  Pagination,
  Paper,
  Container,
  useMediaQuery,
  Theme,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Chip,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Skeleton,
  DialogActions,
  TextareaAutosize,
  CircularProgress,
} from "@mui/material";
import {
  PlayCircle,
  Close,
  Download,
  Error as ErrorIcon,
  Search,
  Refresh,
  ThumbUp,
  ThumbDown,
} from "@mui/icons-material";
import { formatDate, formatDuration } from "@/lib/formatUtils";

interface Call {
  _id: string;
  from: string;
  to: string;
  status: string;
  recordingUrl?: string;
  callDuration?: number;
  callStatus?: string;
  buyerId?: string;
  buyerName?: string;
  industry?: string;
  createdAt: string;
  callSid?: string;
  unitsCharged?: number;
  feedback?: {
    buyerRating?: boolean;
    sellerApproved?: boolean;
    sellerComment?: string;
    refundAmount?: number;
    refundedAt?: Date;
  };
}

const PAGE_SIZE = 10;

export default function LeadTracking() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Call>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [audioLoading, setAudioLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [currentFeedback, setCurrentFeedback] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [currentAudio, setCurrentAudio] = useState<{
    url: string;
    callSid: string;
    format: string;
  } | null>(null);
  const [audioFormat, setAudioFormat] = useState<"mp3" | "wav">("mp3");
  const audioRef = useRef<HTMLAudioElement>(null);

  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("sm"),
  );

  useEffect(() => {
    async function init() {
      const session = await getSession();
      if (!session?.user) return;
      setSellerId(session.user.id);

      setLoading(true);
      try {
        const response = await fetch(`/api/calls/tracking`);
        if (!response.ok) throw new Error("Failed to load calls");
        const data = await response.json();
        setCalls(Array.isArray(data) ? data : data.calls || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load calls");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleSort = (field: keyof Call) => {
    const isAsc = sortField === field && sortOrder === "asc";
    setSortField(field);
    setSortOrder(isAsc ? "desc" : "asc");
  };

  const handlePlayRecording = async (recordingUrl: string, callSid: string) => {
    const recordingSid = extractRecordingSid(recordingUrl);
    if (!recordingSid) {
      setError("Invalid recording URL");
      return;
    }

    try {
      setAudioLoading(true);
      setOpenModal(true);

      setCurrentAudio({
        url: `/api/calls/tracking/recordingproxy?recordingSid=${recordingSid}&format=${audioFormat}`,
        callSid,
        format: audioFormat,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recording");
    } finally {
      setAudioLoading(false);
    }
  };

  const handleOpenFeedback = (call: Call) => {
    setCurrentCall(call);
    setCurrentFeedback(call.feedback?.buyerRating ?? null);
    setComment(call.feedback?.sellerComment ?? "");
    setFeedbackModalOpen(true);
  };

  const handleSubmitFeedback = async (approved: boolean) => {
    if (!currentCall) return;

    try {
      const response = await fetch(
        `/api/calls/feedback?callId=${currentCall._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isSellerReview: true,
            approved,
            comment,
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to submit feedback");

      const updatedCall = await response.json();

      // Update local state
      setCalls(
        calls.map((call) =>
          call._id === updatedCall._id ? updatedCall : call,
        ),
      );

      setFeedbackModalOpen(false);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit feedback",
      );
    }
  };

  const handleDownload = () => {
    if (!currentAudio) return;
    window.open(
      `/api/calls/tracking/recordingproxy?recordingSid=${extractRecordingSid(
        currentAudio.url,
      )}&format=${audioFormat}&download=true`,
      "_blank",
    );
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/calls/tracking`);
      if (!response.ok) throw new Error("Failed to refresh calls");
      const data = await response.json();
      setCalls(Array.isArray(data) ? data : data.calls || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh calls");
    } finally {
      setLoading(false);
    }
  };

  const filteredCalls = (calls || []).filter(
    (call) =>
      call.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const sortedCalls = [...filteredCalls].sort((a, b) => {
    const aValue = a[sortField] ?? "";
    const bValue = b[sortField] ?? "";

    if (sortField === "createdAt") {
      return sortOrder === "asc"
        ? new Date(aValue as string).getTime() -
            new Date(bValue as string).getTime()
        : new Date(bValue as string).getTime() -
            new Date(aValue as string).getTime();
    }

    return sortOrder === "asc"
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue));
  });

  const paginatedCalls = sortedCalls.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const extractRecordingSid = (url: string) => {
    if (!url) return null;
    const matches = url.match(/Recordings\/([^/]+)/);
    return matches ? matches[1] : null;
  };

  if (loading && calls.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <Container sx={{ mt: 2, mb: 2 }}>
      {/* Error notification */}
      {error && (
        <Snackbar
          open={!!error}
          autoHideDuration={5000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Snackbar>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography
          variant="h5"
          sx={{ fontWeight: "bold" }}
          component="h1"
          color="primary"
        >
          Call Tracking
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: "action.active" }} />,
            }}
          />
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && calls.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "50vh",
            textAlign: "center",
          }}
        >
          <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" color="error" gutterBottom>
            {error}
          </Typography>
          <Button variant="contained" onClick={handleRefresh} sx={{ mt: 2 }}>
            Retry
          </Button>
        </Box>
      ) : (
        <>
          <TableContainer
            component={Paper}
            elevation={3}
            sx={{
              mb: 2,
              maxHeight: "calc(100vh - 300px)",
              overflow: "auto",
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {[
                    { label: "From", field: "from" },
                    { label: "To", field: "to" },
                    { label: "Status", field: "status" },
                    { label: "Buyer", field: "buyerName" },
                    { label: "Industry", field: "industry" },
                    { label: "Duration", field: "callDuration" },
                    { label: "Date", field: "createdAt" },
                    { label: "Rating", field: "feedback.buyerRating" },
                    { label: "Recording", field: "" },
                    { label: "Review", field: "" },
                  ].map(({ label, field }) => (
                    <TableCell key={field || label} sx={{ fontWeight: "bold" }}>
                      {field ? (
                        <TableSortLabel
                          active={sortField === field}
                          direction={sortField === field ? sortOrder : "asc"}
                          onClick={() => handleSort(field as keyof Call)}
                        >
                          {label}
                        </TableSortLabel>
                      ) : (
                        label
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedCalls.length > 0 ? (
                  paginatedCalls.map((call, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{call.from}</TableCell>
                      <TableCell>{call.to}</TableCell>
                      <TableCell>
                        <StatusChip
                          status={call.status || call.callStatus || "unknown"}
                        />
                      </TableCell>
                      <TableCell>{call.buyerName || "N/A"}</TableCell>
                      <TableCell>{call.industry || "N/A"}</TableCell>
                      <TableCell>
                        {formatDuration(call.callDuration ?? null)}
                      </TableCell>
                      <TableCell>{formatDate(call.createdAt)}</TableCell>
                      <TableCell>
                        <QualityChip feedback={call.feedback?.buyerRating} />
                      </TableCell>
                      <TableCell>
                        <RecordingButton
                          recordingUrl={call.recordingUrl}
                          callSid={call.callSid || ""}
                          onPlay={handlePlayRecording}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleOpenFeedback(call)}
                          disabled={
                            !call.feedback?.buyerRating &&
                            call.feedback?.buyerRating !== false
                          }
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} sx={{ textAlign: "center", py: 4 }}>
                      {searchTerm
                        ? "No matching calls found"
                        : "No calls available"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {sortedCalls.length > PAGE_SIZE && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <Pagination
                count={Math.ceil(sortedCalls.length / PAGE_SIZE)}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}

      {/* Audio Player Modal */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: (theme) => theme.palette.primary.main,
            color: (theme) => theme.palette.primary.contrastText,
          }}
        >
          Call Recording
          <div>
            <FormControl size="small" sx={{ mr: 2, minWidth: 80 }}>
              <InputLabel sx={{ color: "white" }}>Format</InputLabel>
              <Select
                value={audioFormat}
                onChange={(e) =>
                  setAudioFormat(e.target.value as "mp3" | "wav")
                }
                label="Format"
                sx={{
                  color: "white",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255, 255, 255, 0.5)",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255, 255, 255, 0.8)",
                  },
                }}
              >
                <MenuItem value="mp3">MP3</MenuItem>
                <MenuItem value="wav">WAV</MenuItem>
              </Select>
            </FormControl>
            <IconButton onClick={() => setOpenModal(false)} color="inherit">
              <Close />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent
          sx={{
            textAlign: "center",
            py: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          {audioLoading ? (
            <>
              <CircularProgress />
            </>
          ) : currentAudio ? (
            <>
              <Typography variant="subtitle1" gutterBottom>
                Call ID: {currentAudio.callSid}
              </Typography>
              <audio
                ref={audioRef}
                controls
                autoPlay
                style={{ width: "100%" }}
                onError={() => setError("Failed to play audio")}
              >
                <source
                  src={currentAudio.url}
                  type={
                    currentAudio.format === "wav" ? "audio/wav" : "audio/mpeg"
                  }
                />
                Your browser does not support the audio element.
              </audio>
            </>
          ) : (
            <Typography color="textSecondary">No recording selected</Typography>
          )}
        </DialogContent>
      </Dialog>

      {/* Feedback Review Modal */}
      <Dialog
        open={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Review Buyer Feedback</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {currentCall && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Typography variant="body1">
                <strong>Call From:</strong> {currentCall.from}
              </Typography>
              <Typography variant="body1">
                <strong>Buyer:</strong> {currentCall.buyerName || "N/A"}
              </Typography>
              <Typography variant="body1">
                <strong>Duration:</strong>{" "}
                {formatDuration(currentCall.callDuration ?? null)}
              </Typography>
              <Typography variant="body1">
                <strong>Buyer Rating:</strong>{" "}
                <QualityChip feedback={currentCall.feedback?.buyerRating} />
              </Typography>
              <Typography variant="body1">
                <strong>Units Charged:</strong> {currentCall.unitsCharged || 0}
              </Typography>

              <FormControl fullWidth sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Your Decision
                </Typography>
                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <Button
                    variant={
                      currentFeedback === true ? "contained" : "outlined"
                    }
                    color="success"
                    startIcon={<ThumbUp />}
                    onClick={() => setCurrentFeedback(true)}
                    fullWidth
                  >
                    Approve
                  </Button>
                  <Button
                    variant={
                      currentFeedback === false ? "contained" : "outlined"
                    }
                    color="error"
                    startIcon={<ThumbDown />}
                    onClick={() => setCurrentFeedback(false)}
                    fullWidth
                  >
                    Reject
                  </Button>
                </Box>
              </FormControl>

              <FormControl fullWidth>
                <Typography variant="subtitle2" gutterBottom>
                  Comments (Optional)
                </Typography>
                <TextareaAutosize
                  minRows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontFamily: "inherit",
                  }}
                />
              </FormControl>

              {currentCall.callDuration && currentCall.callDuration < 30 && (
                <Alert severity="info">
                  Short calls (under 30 seconds) marked as bad may qualify for a
                  refund
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackModalOpen(false)}>Cancel</Button>
          <Button
            onClick={() =>
              currentFeedback !== null && handleSubmitFeedback(currentFeedback)
            }
            variant="contained"
            disabled={currentFeedback === null}
          >
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

// Sub-components
const StatusChip = ({ status }: { status: string }) => (
  <Chip
    label={status}
    color={
      status === "completed"
        ? "success"
        : status === "failed"
          ? "error"
          : status === "in-progress"
            ? "warning"
            : "default"
    }
    size="small"
  />
);

const QualityChip = ({ feedback }: { feedback?: boolean | null }) => {
  if (feedback === undefined || feedback === null) {
    return <Chip label="Not rated" size="small" />;
  }
  return (
    <Chip
      label={feedback ? "Good" : "Bad"}
      color={feedback ? "success" : "error"}
      size="small"
    />
  );
};

const RecordingButton = ({
  recordingUrl,
  callSid,
  onPlay,
}: {
  recordingUrl?: string;
  callSid: string;
  onPlay: (url: string, sid: string) => void;
}) => {
  if (!recordingUrl) {
    return (
      <Typography variant="body2" color="textSecondary">
        No recording
      </Typography>
    );
  }

  const recordingSid = extractRecordingSid(recordingUrl);
  if (!recordingSid) {
    return (
      <Typography variant="body2" color="error">
        Invalid URL
      </Typography>
    );
  }

  return (
    <Tooltip title="Play recording">
      <Button
        variant="outlined"
        size="small"
        startIcon={<PlayCircle />}
        onClick={() => onPlay(recordingUrl, callSid)}
      >
        Play
      </Button>
    </Tooltip>
  );
};

const LoadingSkeleton = () => (
  <TableContainer component={Paper}>
    <Table>
      <TableHead>
        <TableRow>
          {[
            "From",
            "To",
            "Status",
            "Buyer",
            "Industry",
            "Duration",
            "Date",
            "Rating",
            "Recording",
            "Review",
          ].map((header) => (
            <TableCell key={header}>{header}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: 5 }).map((_, index) => (
          <TableRow key={index}>
            {Array.from({ length: 10 }).map((_, cellIndex) => (
              <TableCell key={cellIndex}>
                <Skeleton variant="rectangular" width="100%" height={24} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

// Utility function
const extractRecordingSid = (url: string) => {
  if (!url) return null;
  const matches = url.match(/Recordings\/([^/]+)/);
  return matches ? matches[1] : null;
};
