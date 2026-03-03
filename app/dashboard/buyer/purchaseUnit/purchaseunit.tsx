"use client";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useCSRFFetch } from "@/app/hooks/useCSRF";
import {
  Typography,
  Button,
  Grid,
  Paper,
  Snackbar,
  Alert,
  Container,
  Box,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Divider,
  Stack,
  alpha,
} from "@mui/material";
import {
  CheckCircleOutline,
  ErrorOutline,
  AccountBalanceWallet,
  LocalOffer,
  Star,
  TrendingUp,
  Security,
  CreditCard,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

interface UnitOption {
  units: number;
  cost: number;
  popular?: boolean;
  savings?: number;
}

const UnitPurchase: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  const [selectedOption, setSelectedOption] = useState<UnitOption | null>(null);
  const [loading, setLoading] = useState(false);
  const csrfFetch = useCSRFFetch();
  const [unitPricingOptions, setUnitPricingOptions] = useState<UnitOption[]>(
    [],
  );
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const idempotencyKeyRef = useRef<string | null>(null);
  const checkoutRef = useRef<HTMLDivElement>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info"
  >("info");

  const router = useRouter();

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info",
  ) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // Calculate savings percentage for each tier
  const calculateSavings = (options: UnitOption[]): UnitOption[] => {
    if (options.length === 0) return [];

    const baseRate = options[0].cost / options[0].units;
    return options.map((option, index) => {
      const currentRate = option.cost / option.units;
      const savings = Math.round(((baseRate - currentRate) / baseRate) * 100);
      return {
        ...option,
        savings: savings > 0 ? savings : 0,
        popular: index === Math.floor(options.length / 2), // Mark middle option as popular
      };
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pricingResponse, overviewResponse] = await Promise.all([
          axios.get("/api/buyers/buyerunitpriceOption"),
          fetch("/api/buyers/buyeroverview"),
        ]);

        if (pricingResponse.data.success) {
          const optionsWithSavings = calculateSavings(
            pricingResponse.data.data,
          );
          setUnitPricingOptions(optionsWithSavings);
        } else {
          showSnackbar(
            pricingResponse.data.message ||
              "Failed to fetch unit pricing options",
            "error",
          );
        }

        if (overviewResponse.ok) {
          const overviewData = await overviewResponse.json();
          setWalletBalance(overviewData?.walletUnit || 0);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        showSnackbar("An error occurred while fetching data", "error");
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const status = urlParams.get("status");

      if (status === "success") {
        setShowSuccessModal(true);
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      } else if (status === "canceled") {
        setShowFailureModal(true);
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    } catch (error) {
      console.error("Error parsing URL parameters:", error);
    }
  }, []);

  const generateIdempotencyKey = (units: number, cost: number): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `buyer-credit-${units}-${cost}-${timestamp}-${random}`;
  };

  const handleStripePurchase = async () => {
    if (!selectedOption) return;

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateIdempotencyKey(
        selectedOption.units,
        selectedOption.cost,
      );
    }

    setLoading(true);
    try {
      const response = await csrfFetch(
        "/api/payments/stripe/stripecheckoutapi",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-idempotency-key": idempotencyKeyRef.current,
          },
          body: JSON.stringify({
            units: selectedOption.units,
            cost: selectedOption.cost,
            idempotencyKey: idempotencyKeyRef.current,
          }),
        },
      );
      const data = await response.json();

      if (data.success) {
        window.location.href = data.sessionUrl;
      } else {
        showSnackbar(
          data.message || "Failed to initiate Stripe payment",
          "error",
        );
        idempotencyKeyRef.current = null;
      }
    } catch (error) {
      console.error("Error initiating Stripe payment:", error);
      showSnackbar("An error occurred. Please try again.", "error");
      idempotencyKeyRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    idempotencyKeyRef.current = null;
  }, [selectedOption]);

  // Smooth scroll to checkout when option is selected
  useEffect(() => {
    if (selectedOption && checkoutRef.current) {
      setTimeout(() => {
        checkoutRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }, [selectedOption]);

  const getCardStyles = (option: UnitOption) => {
    const isSelected = selectedOption?.units === option.units;
    return {
      cursor: "pointer",
      transition: "all 0.3s ease",
      border: isSelected
        ? `2px solid ${theme.palette.primary.main}`
        : `1px solid ${theme.palette.divider}`,
      transform: isSelected ? "scale(1.02)" : "scale(1)",
      boxShadow: isSelected
        ? `0 8px 24px ${alpha(theme.palette.primary.main, 0.25)}`
        : theme.shadows[2],
      position: "relative" as const,
      overflow: "visible" as const,
      "&:hover": {
        transform: "scale(1.02)",
        boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
      },
    };
  };

  if (loadingOptions) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Header Section */}
      <Box sx={{ textAlign: "center", mb: 6 }}>
        <Typography
          variant={isMobile ? "h4" : "h3"}
          fontWeight="bold"
          gutterBottom
          sx={{ color: "primary.main" }}
        >
          Purchase Units
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 600, mx: "auto", mb: 3 }}
        >
          Units can be used to purchase leads and accept call leads
        </Typography>

        {/* Wallet Balance Card */}
        {/* <Paper
          elevation={0}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1.5,
            px: 3,
            py: 1.5,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <AccountBalanceWallet color="primary" />
          <Box sx={{ textAlign: "left" }}>
            <Typography variant="caption" color="text.secondary">
              Current Balance
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="primary">
              {walletBalance.toLocaleString()} Units
            </Typography>
          </Box>
        </Paper>*/}
      </Box>

      {/* Features Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 4,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.success.main, 0.05),
          border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
        }}
      >
        <Stack
          direction={isMobile ? "column" : "row"}
          spacing={isMobile ? 2 : 4}
          justifyContent="center"
          alignItems="center"
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Security fontSize="small" color="success" />
            <Typography variant="body2">Secure Payment</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TrendingUp fontSize="small" color="success" />
            <Typography variant="body2">Instant Credit</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CreditCard fontSize="small" color="success" />
            <Typography variant="body2">Powered by Stripe</Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Pricing Cards */}
      <Grid container spacing={3} justifyContent="center">
        {unitPricingOptions.map((option) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={option.units}>
            <Card
              sx={getCardStyles(option)}
              onClick={() => setSelectedOption(option)}
            >
              {/* Popular Badge */}
              {option.popular && (
                <Chip
                  icon={<Star sx={{ fontSize: 16 }} />}
                  label="Most Popular"
                  color="primary"
                  size="small"
                  sx={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontWeight: "bold",
                  }}
                />
              )}

              {/* Savings Badge */}
              {option.savings != null && option.savings > 0 && (
                <Chip
                  icon={<LocalOffer sx={{ fontSize: 14 }} />}
                  label={`Save ${option.savings}%`}
                  color="success"
                  size="small"
                  sx={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    fontSize: "0.7rem",
                  }}
                />
              )}

              <CardContent
                sx={{ textAlign: "center", pt: option.popular ? 4 : 3 }}
              >
                <Typography
                  variant="h2"
                  fontWeight="bold"
                  sx={{ color: theme.palette.primary.main, mb: 0.5 }}
                >
                  {option.units.toLocaleString()}
                </Typography>
                <Typography
                  variant="subtitle1"
                  color="text.secondary"
                  gutterBottom
                >
                  Units
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{ color: theme.palette.text.primary }}
                >
                  ${option.cost}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ${(option.cost / option.units).toFixed(3)} per unit
                </Typography>
              </CardContent>

              <CardActions sx={{ justifyContent: "center", pb: 3 }}>
                <Button
                  variant={
                    selectedOption?.units === option.units
                      ? "contained"
                      : "outlined"
                  }
                  color="primary"
                  fullWidth
                  sx={{ mx: 2 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedOption(option);
                  }}
                >
                  {selectedOption?.units === option.units
                    ? "Selected"
                    : "Select"}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Checkout Section */}
      {selectedOption && (
        <Paper
          ref={checkoutRef}
          elevation={3}
          sx={{
            mt: 4,
            p: 3,
            borderRadius: 3,
            bgcolor: theme.palette.background.paper,
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Order Summary
              </Typography>
              <Stack direction="row" spacing={4} flexWrap="wrap">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Units
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {selectedOption.units.toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Cost
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    ${selectedOption.cost}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    New Balance
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    color="success.main"
                  >
                    {(walletBalance + selectedOption.units).toLocaleString()}{" "}
                    Units
                  </Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                onClick={handleStripePurchase}
                disabled={loading}
                startIcon={
                  loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <CreditCard />
                  )
                }
                sx={{
                  py: 1.5,
                  fontSize: "1rem",
                  fontWeight: "bold",
                  borderRadius: 2,
                }}
              >
                {loading ? "Processing..." : "Checkout with Stripe"}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Success Dialog */}
      <Dialog
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 2 },
        }}
      >
        <DialogContent sx={{ textAlign: "center", py: 4 }}>
          <CheckCircleOutline
            sx={{ fontSize: 80, color: theme.palette.success.main, mb: 2 }}
          />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Payment Successful!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Your wallet has been updated with your new units. You can now
            purchase leads and access premium features.
          </Typography>
          <Chip
            icon={<AccountBalanceWallet />}
            label="Check your updated balance in the dashboard"
            color="success"
            variant="outlined"
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => {
              setShowSuccessModal(false);
              router.push("/dashboard/buyer/overview");
            }}
            sx={{ px: 4, borderRadius: 2 }}
          >
            Go to Dashboard
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setShowSuccessModal(false);
              router.push("/dashboard/buyer/transactions");
            }}
            sx={{ px: 4, borderRadius: 2 }}
          >
            View Transactions
          </Button>
        </DialogActions>
      </Dialog>

      {/* Failure Dialog */}
      <Dialog
        open={showFailureModal}
        onClose={() => setShowFailureModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 2 },
        }}
      >
        <DialogContent sx={{ textAlign: "center", py: 4 }}>
          <ErrorOutline
            sx={{ fontSize: 80, color: theme.palette.error.main, mb: 2 }}
          />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Payment Canceled
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your payment was not completed. No charges have been made to your
            account. Please try again or contact support if the issue persists.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => setShowFailureModal(false)}
            sx={{ px: 4, borderRadius: 2 }}
          >
            Try Again
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push("/contact")}
            sx={{ px: 4, borderRadius: 2 }}
          >
            Contact Support
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UnitPurchase;
