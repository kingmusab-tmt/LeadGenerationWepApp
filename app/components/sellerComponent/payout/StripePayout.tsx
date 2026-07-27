"use client";
import { useEffect, useState } from "react";
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
import { useCSRFFetch } from "@/app/hooks/useCSRF";

interface StripePayoutFormData {
  amount: number;
  currency: string;
}

export default function StripePayout() {
  const [formData, setFormData] = useState<StripePayoutFormData>({
    amount: 0,
    currency: "usd",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const csrfFetch = useCSRFFetch();

  // Identifies this specific payout request to the server (see
  // Idempotency-Key header below) so a double-click or retried request
  // can't move money twice. Reusing the key on a plain resubmit is the
  // point — it's what lets the server recognize "same request again"; only
  // changing the amount/currency should count as a genuinely new payout.
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    crypto.randomUUID(),
  );
  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, [formData.amount, formData.currency]);

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | { target: { name: string; value: string } },
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
      const response = await csrfFetch("/api/payments/payout/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to process payout");
      }

      setSuccess(true);
      setFormData({ amount: 0, currency: "usd" });
      setIdempotencyKey(crypto.randomUUID());
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
            Stripe Connect Payout
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
                label="Amount"
                type="number"
                id="stripe-amount"
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
                id="stripe-currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                required
                variant="outlined"
              >
                <MenuItem value="usd">USD - US Dollar</MenuItem>
                <MenuItem value="eur">EUR - Euro</MenuItem>
                <MenuItem value="gbp">GBP - British Pound</MenuItem>
                <MenuItem value="cad">CAD - Canadian Dollar</MenuItem>
                <MenuItem value="aud">AUD - Australian Dollar</MenuItem>
              </TextField>

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
