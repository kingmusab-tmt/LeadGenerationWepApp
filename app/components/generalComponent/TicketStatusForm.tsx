"use client";
import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

export default function TicketStatusForm() {
  const [email, setEmail] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [statusInfo, setStatusInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpText, setFollowUpText] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpSuccess, setFollowUpSuccess] = useState(false);

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatusInfo(null);

    try {
      const res = await fetch("/api/tickets/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, ticketId }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to fetch ticket status");
      }

      if (result.error) {
        setError(result.error);
      } else {
        setStatusInfo(result);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to fetch ticket status"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFollowUp = async () => {
    setFollowUpLoading(true);
    setError("");

    try {
      const res = await fetch("/api/tickets/followup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          ticketId,
          followUp: followUpText,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to submit follow-up");
      }

      if (result.error) {
        setError(result.error);
      } else {
        setFollowUpSuccess(true);
        setFollowUpText("");
        // Refresh the status to show the new follow-up
        await handleCheckStatus({
          preventDefault: () => {},
        } as React.FormEvent);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to submit follow-up"
      );
    } finally {
      setFollowUpLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 500, mx: "auto", p: 2 }}>
      <Box component="form" onSubmit={handleCheckStatus} sx={{ mb: 3 }}>
        <Typography variant="h5" mb={2}>
          Check Ticket Status
        </Typography>

        <TextField
          fullWidth
          required
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          required
          label="Ticket ID"
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Button type="submit" variant="contained" disabled={loading} fullWidth>
          {loading ? <CircularProgress size={24} /> : "Check Status"}
        </Button>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
      </Box>

      {statusInfo && (
        <Box sx={{ mt: 3 }}>
          <Alert severity="info">
            <Typography variant="subtitle1" gutterBottom>
              <strong>Ticket ID:</strong> {ticketId}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Status:</strong> {statusInfo.status || "Unknown"}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Issue Type:</strong>{" "}
              {statusInfo.issueType || "Not specified"}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Description:</strong>{" "}
              {statusInfo.description || "No description"}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Support Notes:</strong>{" "}
              {statusInfo.followUpNotes || "No updates yet."}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Follow Up Messages:</strong>{" "}
              {statusInfo.followUpMessages || "No updates yet."}
            </Typography>
          </Alert>

          <Button
            variant="outlined"
            onClick={() => setFollowUpOpen(true)}
            sx={{ mt: 2 }}
            fullWidth
          >
            Add Follow-up
          </Button>
        </Box>
      )}

      {/* Follow-up Dialog */}
      <Dialog open={followUpOpen} onClose={() => setFollowUpOpen(false)}>
        <DialogTitle>Add Follow-up to Ticket</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Follow-up Details"
            type="text"
            fullWidth
            variant="standard"
            multiline
            rows={4}
            value={followUpText}
            onChange={(e) => setFollowUpText(e.target.value)}
          />
          {followUpSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Follow-up submitted successfully!
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFollowUpOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmitFollowUp}
            disabled={followUpLoading || !followUpText}
          >
            {followUpLoading ? (
              <CircularProgress size={24} />
            ) : (
              "Submit Follow-up"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
