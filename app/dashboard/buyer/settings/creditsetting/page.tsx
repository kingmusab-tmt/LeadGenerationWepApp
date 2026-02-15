"use client";
import React, { useState } from "react";
import axios from "axios";
import {
  TextField,
  Button,
  Paper,
  Typography,
  CircularProgress,
} from "@mui/material";

const PaymentSetupForm: React.FC = () => {
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await axios.post("/api/setup-payment", {
        stripeSecretKey,
        stripeWebhookSecret,
        stripePublishableKey,
      });

      if (response.data.success) {
        alert("Payment details updated successfully!");
      } else {
        alert("Failed to update payment details.");
      }
    } catch (error) {
      console.error("Error updating payment details:", error);
      alert("An error occurred. Please try again.");
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
    </Paper>
  );
};

export default PaymentSetupForm;
