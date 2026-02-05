"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stack,
  MenuItem,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

interface PayPalPayoutFormData {
  receiverEmail: string;
  amount: number;
  currency: string;
  note?: string;
}

export default function PayPalPayout() {
  const [formData, setFormData] = useState<PayPalPayoutFormData>({
    receiverEmail: "",
    amount: 0,
    currency: "USD",
    note: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/payouts/paypal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to process payout");
      }

      setSuccess(true);
      setFormData({ receiverEmail: "", amount: 0, currency: "USD", note: "" });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 600,
        margin: "2rem auto",
        padding: 2,
      }}
    >
      <Card>
        <CardContent>
          <Typography
            variant="h5"
            component="h2"
            gutterBottom
            sx={{ fontWeight: 600, marginBottom: 3 }}
          >
            PayPal Payout
          </Typography>

          {error && (
            <Alert severity="error" sx={{ marginBottom: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ marginBottom: 2 }}>
              Payout processed successfully!
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="Receiver Email"
                type="email"
                id="paypal-receiverEmail"
                name="receiverEmail"
                value={formData.receiverEmail}
                onChange={handleChange}
                required
                variant="outlined"
                placeholder="recipient@example.com"
              />

              <TextField
                fullWidth
                label="Amount"
                type="number"
                id="paypal-amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                inputProps={{
                  min: "0.01",
                  step: "0.01",
                }}
                required
                variant="outlined"
                placeholder="0.00"
              />

              <TextField
                fullWidth
                label="Currency"
                select
                id="paypal-currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                required
                variant="outlined"
              >
                <MenuItem value="USD">USD - US Dollar</MenuItem>
                <MenuItem value="EUR">EUR - Euro</MenuItem>
                <MenuItem value="GBP">GBP - British Pound</MenuItem>
                <MenuItem value="CAD">CAD - Canadian Dollar</MenuItem>
                <MenuItem value="AUD">AUD - Australian Dollar</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Note (Optional)"
                multiline
                rows={3}
                id="paypal-note"
                name="note"
                value={formData.note}
                onChange={handleChange}
                variant="outlined"
                placeholder="Add a note for this payout..."
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
                endIcon={
                  loading ? <CircularProgress size={20} /> : <SendIcon />
                }
                size="large"
                sx={{
                  marginTop: 1,
                  fontWeight: 600,
                }}
              >
                {loading ? "Processing..." : "Send Payout"}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
