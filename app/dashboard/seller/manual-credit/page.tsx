"use client";

import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Autocomplete,
  Alert,
  Snackbar,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import {
  AccountBalanceWallet,
  Description,
  AttachMoney,
} from "@mui/icons-material";

interface BuyerOption {
  id: string;
  name: string;
  company: string;
  email: string;
}

const ManualCreditPage: React.FC = () => {
  const [buyers, setBuyers] = useState<BuyerOption[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerOption | null>(null);
  const [cashPaid, setCashPaid] = useState<string>("");
  const [numberOfCredits, setNumberOfCredits] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetchingBuyers, setFetchingBuyers] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  // Fetch all buyers
  useEffect(() => {
    const fetchBuyers = async () => {
      try {
        const response = await fetch("/api/buyers");
        if (!response.ok) throw new Error("Failed to fetch buyers");
        const data = await response.json();

        const formattedBuyers = data.map((buyer: any) => ({
          id: buyer._id,
          name: buyer.name,
          company: buyer.company,
          email: buyer.email,
        }));

        setBuyers(formattedBuyers);
      } catch (error) {
        setSnackbar({
          open: true,
          message: "Failed to load buyers",
          severity: "error",
        });
      } finally {
        setFetchingBuyers(false);
      }
    };

    fetchBuyers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBuyer || !cashPaid || !numberOfCredits || !description) {
      setSnackbar({
        open: true,
        message: "Please fill in all fields",
        severity: "warning",
      });
      return;
    }

    const cashAmount = parseFloat(cashPaid);
    const credits = parseInt(numberOfCredits);

    if (isNaN(cashAmount) || cashAmount <= 0) {
      setSnackbar({
        open: true,
        message: "Please enter a valid cash amount",
        severity: "warning",
      });
      return;
    }

    if (isNaN(credits) || credits <= 0) {
      setSnackbar({
        open: true,
        message: "Please enter a valid number of credits",
        severity: "warning",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/sellers/manual-credit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buyerId: selectedBuyer.id,
          cashPaid: cashAmount,
          numberOfCredits: credits,
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to process credit");
      }

      setSnackbar({
        open: true,
        message: "Credits successfully added to buyer's account!",
        severity: "success",
      });

      // Reset form
      setSelectedBuyer(null);
      setCashPaid("");
      setNumberOfCredits("");
      setDescription("");
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || "Failed to add credits",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ mb: 3, fontWeight: "bold", color: "primary.main" }}
        >
          Manual Credit to Buyer
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Credit units to a buyer's account when they pay cash directly.
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          {/* Lead Buyer Selection */}
          <Autocomplete
            fullWidth
            loading={fetchingBuyers}
            options={buyers}
            value={selectedBuyer}
            onChange={(event, newValue) => setSelectedBuyer(newValue)}
            getOptionLabel={(option) => option?.name || ""}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Box>
                  <Typography variant="body1">{option.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    ({option.company})
                  </Typography>
                </Box>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Lead Buyer"
                placeholder="Search for buyer..."
                required
                helperText="Select the buyer to credit"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {fetchingBuyers ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            sx={{ mb: 3 }}
          />

          {/* Cash Paid */}
          <TextField
            fullWidth
            label="Cash Paid"
            type="number"
            value={cashPaid}
            onChange={(e) => setCashPaid(e.target.value)}
            placeholder="Enter amount received"
            required
            helperText="Amount of cash collected from the buyer"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AttachMoney />
                </InputAdornment>
              ),
            }}
            inputProps={{
              step: "0.01",
              min: "0",
            }}
            sx={{ mb: 3 }}
          />

          {/* Number of Credits */}
          <TextField
            fullWidth
            label="Number of Credits"
            type="number"
            value={numberOfCredits}
            onChange={(e) => setNumberOfCredits(e.target.value)}
            placeholder="Enter units to credit"
            required
            helperText="Number of units equivalent to the cash paid"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AccountBalanceWallet />
                </InputAdornment>
              ),
            }}
            inputProps={{
              step: "1",
              min: "1",
            }}
            sx={{ mb: 3 }}
          />

          {/* Description */}
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide details about this transaction..."
            required
            helperText="Explain the reason for this manual credit (visible to the buyer)"
            InputProps={{
              startAdornment: (
                <InputAdornment
                  position="start"
                  sx={{ alignSelf: "flex-start", mt: 2 }}
                >
                  <Description />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          {/* Submit Button */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              startIcon={
                loading ? (
                  <CircularProgress size={20} />
                ) : (
                  <AccountBalanceWallet />
                )
              }
            >
              {loading ? "Processing..." : "Credit Account"}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ManualCreditPage;
