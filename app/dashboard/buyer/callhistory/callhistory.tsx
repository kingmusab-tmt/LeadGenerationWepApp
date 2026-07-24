"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Skeleton,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Chip,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Snackbar,
  Alert,
  Pagination,
  TextField,
  Switch,
  DialogActions,
  CircularProgress,
  Stack,
  Card,
  CardContent,
  Divider,
  useMediaQuery,
  useTheme,
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
  Feedback,
} from "@mui/icons-material";
import { Container } from "@mui/material";
import { formatDate, formatDuration } from "@/lib/formatUtils";
import { useCSRFFetch } from "@/app/hooks/useCSRF";

interface Call {
  _id: string;
  status: string;
  callDuration: number | null;
  recordingUrl?: string;
  industry: string;
  paymentStatus: string;
  createdAt: string;
  callSid: string;
  from?: string;
  to?: string;
  feedback?: boolean | null; // true = good, false = bad, null = not rated
  disposition?: string | null;
  dispositionNotes?: string;
  aiSummary?: string;
  aiSentiment?: string;
  aiLeadScore?: string;
}

const PAGE_SIZE = 10;

const CallHistory: React.FC = () => {
  const fetchWithCSRF = useCSRFFetch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioLoading, setAudioLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [currentFeedback, setCurrentFeedback] = useState<boolean | null>(null);
  const [currentAudio, setCurrentAudio] = useState<{
    url: string;
    callSid: string;
    format: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [audioFormat, setAudioFormat] = useState<"mp3" | "wav">("mp3");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetchCallHistory();
  }, []);

  useEffect(() => {
    const search = searchTerm.toLowerCase();
    const filtered = calls.filter((call) => {
      const industry = String(call.industry || "").toLowerCase();
      const status = String(call.status || "").toLowerCase();
      const feedbackLabel =
        call.feedback !== null && call.feedback !== undefined
          ? call.feedback
            ? "good"
            : "bad"
          : "";

      return (
        industry.includes(search) ||
        status.includes(search) ||
        feedbackLabel.includes(search)
      );
    });
    setFilteredCalls(filtered);
    setCurrentPage(1);
  }, [searchTerm, calls]);

  const fetchCallHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/buyers/buyerCallleads");
      if (!response.ok) throw new Error("Failed to fetch calls");
      const payload = await response.json();
      const data = payload?.data ?? payload;
      setCalls(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calls");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayRecording = async (recordingUrl: string, callSid: string) => {
    const recordingSid = extractRecordingSid(recordingUrl);
    if (!recordingSid) {
      setError("Invalid recording URL");
      setSnackbarOpen(true);
      return;
    }

    try {
      setAudioLoading(true);
      setError(null);
      setOpenModal(true);

      setCurrentAudio({
        url: `/api/calls/tracking/recordingproxy?recordingSid=${recordingSid}&format=${audioFormat}`,
        callSid,
        format: audioFormat,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recording");
      setSnackbarOpen(true);
    } finally {
      setAudioLoading(false);
    }
  };

  const handleOpenFeedback = (call: Call) => {
    setCurrentCall(call);
    setCurrentFeedback(call.feedback !== undefined ? call.feedback : null);
    setFeedbackModalOpen(true);
  };

  const handleSubmitFeedback = async () => {
    if (!currentCall || currentFeedback === null) return;

    try {
      const response = await fetch(
        `/api/calls/feedback?callId=${currentCall._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            feedback: currentFeedback,
            callDuration: currentCall.callDuration,
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to submit feedback");

      // Update local state
      setCalls(
        calls.map((call) =>
          call._id === currentCall._id
            ? { ...call, feedback: currentFeedback }
            : call,
        ),
      );

      setFeedbackModalOpen(false);
      setSnackbarOpen(true);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit feedback",
      );
      setSnackbarOpen(true);
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

  const handleCloseModal = () => {
    setOpenModal(false);
    setCurrentAudio(null);
    setError(null);
  };

  const handleRefresh = () => {
    fetchCallHistory();
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const paginatedCalls = filteredCalls.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  if (loading && calls.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
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
          sx={{ fontWeight: "bold", mt: 6, color: "primary.main" }}
        >
          Call History
        </Typography>

        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search calls..."
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
          {isMobile ? (
            paginatedCalls.length > 0 ? (
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                {paginatedCalls.map((call) => (
                  <Card key={call._id} variant="outlined">
                    <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1,
                        }}
                      >
                        <StatusChip status={call.status} />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(call.createdAt)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {call.industry} &middot;{" "}
                          {formatDuration(call.callDuration)}
                        </Typography>
                        <PaymentChip status={call.paymentStatus} />
                      </Box>
                      <RecordingButton
                        recordingUrl={call.recordingUrl}
                        callSid={call.callSid}
                        onPlay={handlePlayRecording}
                      />
                      <Divider sx={{ my: 1.5 }} />
                      <Box sx={{ mb: 1.5 }}>
                        <DispositionSelect
                          callId={call._id}
                          currentDisposition={call.disposition || ""}
                          onUpdate={(disposition) => {
                            setCalls(
                              calls.map((c) =>
                                c._id === call._id ? { ...c, disposition } : c,
                              ),
                            );
                          }}
                        />
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <QualityChip feedback={call.feedback} />
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Feedback />}
                          onClick={() => handleOpenFeedback(call)}
                        >
                          Rate
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Paper sx={{ py: 4, textAlign: "center", mb: 2 }}>
                <Typography color="text.secondary">
                  {searchTerm
                    ? "No matching calls found"
                    : "No call history available"}
                </Typography>
              </Paper>
            )
          ) : (
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
                      "Status",
                      "Date",
                      "Duration",
                      "Recording",
                      "Industry",
                      "Payment",
                      "Disposition",
                      "Quality",
                      "Feedback",
                    ].map((header) => (
                      <TableCell key={header} sx={{ fontWeight: "bold" }}>
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedCalls.length > 0 ? (
                    paginatedCalls.map((call) => (
                      <TableRow key={call._id} hover>
                        <TableCell>
                          <StatusChip status={call.status} />
                        </TableCell>
                        <TableCell>{formatDate(call.createdAt)}</TableCell>
                        <TableCell>
                          {formatDuration(call.callDuration)}
                        </TableCell>
                        <TableCell>
                          <RecordingButton
                            recordingUrl={call.recordingUrl}
                            callSid={call.callSid}
                            onPlay={handlePlayRecording}
                          />
                        </TableCell>
                        <TableCell>{call.industry}</TableCell>
                        <TableCell>
                          <PaymentChip status={call.paymentStatus} />
                        </TableCell>
                        <TableCell>
                          <DispositionSelect
                            callId={call._id}
                            currentDisposition={call.disposition || ""}
                            onUpdate={(disposition) => {
                              setCalls(
                                calls.map((c) =>
                                  c._id === call._id
                                    ? { ...c, disposition }
                                    : c,
                                ),
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <QualityChip feedback={call.feedback} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Feedback />}
                            onClick={() => handleOpenFeedback(call)}
                          >
                            Rate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        sx={{ textAlign: "center", py: 4 }}
                      >
                        {searchTerm
                          ? "No matching calls found"
                          : "No call history available"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {filteredCalls.length > PAGE_SIZE && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <Pagination
                count={Math.ceil(filteredCalls.length / PAGE_SIZE)}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}

      <AudioPlayerModal
        open={openModal}
        onClose={handleCloseModal}
        currentAudio={currentAudio}
        audioLoading={audioLoading}
        audioFormat={audioFormat}
        onFormatChange={setAudioFormat}
        onDownload={handleDownload}
      />

      <FeedbackModal
        open={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        feedback={currentFeedback}
        setFeedback={setCurrentFeedback}
        onSubmit={handleSubmitFeedback}
        callDuration={currentCall?.callDuration || null}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={error ? "error" : "success"}
          variant="filled"
        >
          {error || "Feedback submitted successfully"}
        </Alert>
      </Snackbar>
    </Container>
  );
};

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

const PaymentChip = ({ status }: { status: string }) => (
  <Chip
    label={status}
    color={
      status === "paid"
        ? "success"
        : status === "refunded"
          ? "error"
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

const DISPOSITION_OPTIONS = [
  { value: "", label: "—" },
  {
    value: "qualified_lead",
    label: "Qualified Lead",
    color: "success" as const,
  },
  {
    value: "not_interested",
    label: "Not Interested",
    color: "default" as const,
  },
  { value: "wrong_number", label: "Wrong Number", color: "warning" as const },
  { value: "callback_requested", label: "Callback", color: "info" as const },
  { value: "sold", label: "Sold", color: "success" as const },
  { value: "voicemail", label: "Voicemail", color: "default" as const },
  { value: "spam", label: "Spam", color: "error" as const },
];

const DispositionSelect = ({
  callId,
  currentDisposition,
  onUpdate,
}: {
  callId: string;
  currentDisposition: string;
  onUpdate: (disposition: string) => void;
}) => {
  const fetchWithCSRF = useCSRFFetch();
  const [saving, setSaving] = useState(false);

  const handleChange = async (value: string) => {
    if (value === currentDisposition) return;
    setSaving(true);
    try {
      const res = await fetchWithCSRF("/api/calls/disposition", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId, disposition: value }),
      });
      if (res.ok) {
        onUpdate(value);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  if (currentDisposition) {
    const opt = DISPOSITION_OPTIONS.find((o) => o.value === currentDisposition);
    return (
      <Tooltip title="Click to change">
        <Chip
          label={opt?.label || currentDisposition}
          color={opt?.color || "default"}
          size="small"
          onClick={() => handleChange("")}
          sx={{ cursor: "pointer" }}
        />
      </Tooltip>
    );
  }

  return (
    <FormControl size="small" sx={{ minWidth: 120 }}>
      <Select
        value=""
        displayEmpty
        disabled={saving}
        onChange={(e) => handleChange(e.target.value as string)}
        sx={{ fontSize: "0.8rem" }}
      >
        <MenuItem value="" disabled>
          Set...
        </MenuItem>
        {DISPOSITION_OPTIONS.filter((o) => o.value).map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

const AudioPlayerModal = ({
  open,
  onClose,
  currentAudio,
  audioLoading,
  audioFormat,
  onFormatChange,
  onDownload,
}: {
  open: boolean;
  onClose: () => void;
  currentAudio: { url: string; callSid: string; format: string } | null;
  audioLoading: boolean;
  audioFormat: "mp3" | "wav";
  onFormatChange: (format: "mp3" | "wav") => void;
  onDownload: () => void;
}) => (
  <Dialog
    open={open}
    onClose={onClose}
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
            onChange={(e) => onFormatChange(e.target.value as "mp3" | "wav")}
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
        <IconButton onClick={onClose} color="inherit">
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
          <audio controls autoPlay style={{ width: "100%" }}>
            <source
              src={currentAudio.url}
              type={currentAudio.format === "wav" ? "audio/wav" : "audio/mpeg"}
            />
            Your browser does not support the audio element.
          </audio>
        </>
      ) : (
        <Typography color="textSecondary">No recording selected</Typography>
      )}
    </DialogContent>
  </Dialog>
);

const FeedbackModal = ({
  open,
  onClose,
  feedback,
  setFeedback,
  onSubmit,
  callDuration,
}: {
  open: boolean;
  onClose: () => void;
  feedback: boolean | null;
  setFeedback: (value: boolean | null) => void;
  onSubmit: () => void;
  callDuration: number | null;
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Rate Call Quality</DialogTitle>
    <DialogContent>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, py: 2 }}>
        <Typography variant="body1" gutterBottom>
          Was this a quality lead?
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "center", gap: 4 }}>
          <Button
            variant={feedback === true ? "contained" : "outlined"}
            color="success"
            startIcon={<ThumbUp />}
            onClick={() => setFeedback(true)}
            size="large"
          >
            Good
          </Button>
          <Button
            variant={feedback === false ? "contained" : "outlined"}
            color="error"
            startIcon={<ThumbDown />}
            onClick={() => setFeedback(false)}
            size="large"
          >
            Bad
          </Button>
        </Box>

        {callDuration !== null && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            Call duration: {formatDuration(callDuration)}
          </Typography>
        )}

        {feedback === false && callDuration && callDuration < 30 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Short calls marked as bad may qualify for a refund
          </Alert>
        )}
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button
        onClick={onSubmit}
        variant="contained"
        disabled={feedback === null}
      >
        Submit Feedback
      </Button>
    </DialogActions>
  </Dialog>
);

const LoadingSkeleton = () => (
  <TableContainer component={Paper}>
    <Table>
      <TableHead>
        <TableRow>
          {[
            "Status",
            "Date",
            "Duration",
            "Recording",
            "Industry",
            "Payment",
            "Quality",
            "Feedback",
          ].map((header) => (
            <TableCell key={header}>{header}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: 5 }).map((_, index) => (
          <TableRow key={index}>
            {Array.from({ length: 8 }).map((_, cellIndex) => (
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

// Utility functions
const extractRecordingSid = (url: string) => {
  if (!url) return null;
  const matches = url.match(/Recordings\/([^/]+)/);
  return matches ? matches[1] : null;
};

export default CallHistory;
