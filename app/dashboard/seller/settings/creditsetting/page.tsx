"use client";
import React, { useState } from "react";
import axios from "@/lib/axiosInstance";
import {
  TextField,
  Button,
  Paper,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";

const PaymentSetupForm: React.FC = () => {
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await axios.post("/api/setup-payment", {
        stripeSecretKey,
        stripeWebhookSecret,
        stripePublishableKey,
      });

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: "Payment details updated successfully!",
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: "Failed to update payment details.",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error updating payment details:", error);
      setSnackbar({
        open: true,
        message: "An error occurred. Please try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} style={{ padding: "20px", margin: "20px" }}>
      <Typography variant="h5" gutterBottom>
        Payment Setup
      </Typography>
      <TextField
        label="Stripe Secret Key"
        value={stripeSecretKey}
        onChange={(e) => setStripeSecretKey(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Stripe Publishable Key"
        value={stripePublishableKey}
        onChange={(e) => setStripePublishableKey(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Stripe Webhook Secret"
        value={stripeWebhookSecret}
        onChange={(e) => setStripeWebhookSecret(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Button
        variant="contained"
        color="primary"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : "Save Payment Details"}
      </Button>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default PaymentSetupForm;
