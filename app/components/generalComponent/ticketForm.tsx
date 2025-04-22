"use client";
import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Typography,
  Alert,
} from "@mui/material";

type TicketFormData = {
  name: string;
  email: string;
  issueType: string;
  description: string;
};

export default function TicketForm() {
  const [formData, setFormData] = useState<TicketFormData>({
    name: "",
    email: "",
    issueType: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to submit ticket");
      }

      // Handle both response formats:
      // 1. With ticketId: {"ticketId": "ABC123"}
      // 2. Simple status: {"status": 200}
      if (result.ticketId || result.status === 200) {
        setSuccess(true);
        setFormData({ name: "", email: "", issueType: "", description: "" });
      } else {
        setError("Unexpected response from server");
      }
    } catch (err) {
      console.error("Submission error:", err);
      setError(err instanceof Error ? err.message : "Failed to submit ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ maxWidth: 500, mx: "auto", p: 2 }}
    >
      <TextField
        fullWidth
        required
        name="name"
        label="Name"
        value={formData.name}
        onChange={handleChange}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        required
        type="email"
        name="email"
        label="Email"
        value={formData.email}
        onChange={handleChange}
        sx={{ mb: 2 }}
      />

      <TextField
        select
        fullWidth
        required
        name="issueType"
        label="Issue Type"
        value={formData.issueType}
        onChange={handleChange}
        sx={{ mb: 2 }}
      >
        <MenuItem value="Technical Issue">Technical Issue</MenuItem>
        <MenuItem value="Billing Problem">Billing Problem</MenuItem>
        <MenuItem value="Other">Other</MenuItem>
      </TextField>

      <TextField
        fullWidth
        required
        name="description"
        label="Issue Description"
        multiline
        rows={4}
        value={formData.description}
        onChange={handleChange}
        sx={{ mb: 2 }}
      />

      {success && (
        <Alert severity="success" onClose={() => setSuccess(false)}>
          Ticket submitted successfully!
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        disabled={loading}
        fullWidth
        sx={{ mt: 2 }}
      >
        {loading ? "Submitting..." : "Submit Ticket"}
      </Button>
    </Box>
  );
}
