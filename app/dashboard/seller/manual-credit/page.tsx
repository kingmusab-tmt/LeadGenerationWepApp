"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
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
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useCSRFFetch } from "@/app/hooks/useCSRF";
import { useConfirm } from "@/app/hooks/useConfirm";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import {
  useSellerBuyerSearch,
  BuyerOption,
} from "@/app/hooks/useSellerBuyerSearch";
import { useDashboardTerms } from "@/app/hooks";

const MAX_DESCRIPTION_LENGTH = 500;

// Prevents the scroll wheel from silently changing a number field's value
// while it happens to have focus — a well-known <input type="number"> footgun.
const blurOnWheel = (e: React.WheelEvent<HTMLInputElement>) => {
  e.currentTarget.blur();
};

const ManualCreditPage: React.FC = () => {
  const router = useRouter();
  const terms = useDashboardTerms();
  const csrfFetch = useCSRFFetch();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const [buyerSearch, setBuyerSearch] = useState("");
  const {
    options: buyers,
    loading: fetchingBuyers,
    error: buyersError,
  } = useSellerBuyerSearch(buyerSearch);

  const [selectedBuyer, setSelectedBuyer] = useState<BuyerOption | null>(null);
  const [cashPaid, setCashPaid] = useState<string>("");
  const [numberOfCredits, setNumberOfCredits] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  // Identifies this specific pending entry to the server (see
  // Idempotency-Key header below) so a retried/duplicated request can't
  // credit the buyer twice. Regenerated whenever the actual entry changes —
  // re-clicking "Credit Account" after a failed attempt reuses the same key
  // (a legitimate retry), but editing any field first starts a new one
  // (a genuinely different transaction).
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    crypto.randomUUID(),
  );
  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, [selectedBuyer?.id, cashPaid, numberOfCredits, description]);

  useEffect(() => {
    if (buyersError) {
      setSnackbar({ open: true, message: buyersError, severity: "error" });
    }
  }, [buyersError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedDescription = description.trim();

    if (!selectedBuyer || !cashPaid || !numberOfCredits || !trimmedDescription) {
      setSnackbar({
        open: true,
        message: "Please fill in all fields",
        severity: "warning",
      });
      return;
    }

    const cashAmount = parseFloat(cashPaid);
    const credits = parseFloat(numberOfCredits);

    if (isNaN(cashAmount) || cashAmount <= 0) {
      setSnackbar({
        open: true,
        message: "Please enter a valid cash amount",
        severity: "warning",
      });
      return;
    }

    if (isNaN(credits) || credits <= 0 || !Number.isInteger(credits)) {
      setSnackbar({
        open: true,
        message: "Number of credits must be a whole number greater than 0",
        severity: "warning",
      });
      return;
    }

    const confirmed = await confirm({
      title: "Confirm Manual Credit",
      message: `Credit ${credits.toLocaleString()} unit(s) to ${selectedBuyer.name} (${selectedBuyer.company}) for $${cashAmount.toFixed(
        2,
      )} cash received? The ${terms.buyerLower} will be emailed with the description below.`,
      confirmText: "Credit Account",
      confirmColor: "primary",
    });
    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await csrfFetch("/api/sellers/manual-credit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          buyerId: selectedBuyer.id,
          cashPaid: cashAmount,
          numberOfCredits: credits,
          description: trimmedDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to process credit");
      }

      setSnackbar({
        open: true,
        message:
          data.data?.emailSent === false
            ? `Credits added, but the ${terms.buyerLower}'s notification email failed to send — let them know directly.`
            : `Credits successfully added to ${terms.buyerLower}'s account!`,
        severity: data.data?.emailSent === false ? "warning" : "success",
      });

      // Reset form — a fresh idempotency key for whatever the seller enters
      // next, since the one just used is now permanently spent server-side.
      setSelectedBuyer(null);
      setBuyerSearch("");
      setCashPaid("");
      setNumberOfCredits("");
      setDescription("");
      setIdempotencyKey(crypto.randomUUID());
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to add credits";
      setSnackbar({
        open: true,
        message,
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
      <Box
        onClick={() => router.push("/dashboard/seller/overview")}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          mb: 2,
          cursor: "pointer",
          color: "text.secondary",
          "&:hover": { color: "primary.main" },
        }}
      >
        <ArrowBackIcon fontSize="small" />
        <Typography variant="body2">Back to Dashboard</Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ mb: 3, fontWeight: "bold", color: "primary.main" }}
        >
          Manual Credit to {terms.buyer}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Credit units to a {terms.buyerLower}&lsquo;s account when they pay
          cash directly.
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* Lead Buyer Selection */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                fullWidth
                loading={fetchingBuyers}
                options={buyers}
                value={selectedBuyer}
                onChange={(event, newValue) => setSelectedBuyer(newValue)}
                inputValue={buyerSearch}
                onInputChange={(event, newValue, reason) => {
                  if (reason === "input") setBuyerSearch(newValue);
                }}
                filterOptions={(options) => options}
                getOptionLabel={(option) => option?.name || ""}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderOption={(props, option) => {
                  const optionProps = props as unknown as {
                    key: React.Key;
                    ref?: React.Ref<HTMLLIElement>;
                    className?: string;
                    id?: string;
                    onClick?: React.MouseEventHandler<HTMLLIElement>;
                    onMouseMove?: React.MouseEventHandler<HTMLLIElement>;
                    onTouchStart?: React.TouchEventHandler<HTMLLIElement>;
                    tabIndex?: number;
                    role?: string;
                    ["data-option-index"]?: number;
                    ["aria-disabled"]?: boolean;
                    ["aria-selected"]?: boolean;
                  };
                  return (
                    <li
                      key={optionProps.key}
                      ref={optionProps.ref}
                      className={optionProps.className}
                      id={optionProps.id}
                      onClick={optionProps.onClick}
                      onMouseMove={optionProps.onMouseMove}
                      onTouchStart={optionProps.onTouchStart}
                      tabIndex={optionProps.tabIndex}
                      role={optionProps.role}
                      data-option-index={optionProps["data-option-index"]}
                      aria-disabled={optionProps["aria-disabled"]}
                      aria-selected={optionProps["aria-selected"]}
                    >
                      <Box>
                        <Typography variant="body1">{option.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          ({option.company})
                        </Typography>
                      </Box>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={terms.leadBuyer}
                    placeholder={`Search for ${terms.buyerLower}...`}
                    required
                    helperText="Search by name, email, or company"
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
              />
            </Grid>

            {/* Cash Paid */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Cash Paid"
                type="number"
                value={cashPaid}
                onChange={(e) => setCashPaid(e.target.value)}
                onWheel={blurOnWheel}
                placeholder="Enter amount received"
                required
                helperText={`Amount of cash collected from the ${terms.buyerLower}`}
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
              />
            </Grid>

            {/* Number of Credits */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Number of Credits"
                type="number"
                value={numberOfCredits}
                onChange={(e) => setNumberOfCredits(e.target.value)}
                onWheel={blurOnWheel}
                placeholder="Enter units to credit"
                required
                helperText="Whole units equivalent to the cash paid"
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
              />
            </Grid>

            {/* Description */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Reason for this credit..."
                required
                helperText={`Visible to the ${terms.buyerLower} — ${description.length}/${MAX_DESCRIPTION_LENGTH}`}
                inputProps={{ maxLength: MAX_DESCRIPTION_LENGTH }}
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
              />
            </Grid>
          </Grid>

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

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message || ""}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmColor={confirmState.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

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
