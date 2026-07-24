"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCSRFFetch } from "@/app/hooks/useCSRF";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import SendIcon from "@mui/icons-material/Send";

interface StripeAccountStatus {
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  tosAccepted: boolean;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
  };
}

interface StripeOnboardingProps {
  userEmail: string;
  onSaveHandlerReady?: ((saveHandler: () => Promise<boolean>) => void) | null;
  onConnectionStatusChange?: ((isFullyConnected: boolean) => void) | null;
}

export default function StripeOnboarding({
  userEmail,
  onSaveHandlerReady,
  onConnectionStatusChange,
}: StripeOnboardingProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] =
    useState<StripeAccountStatus | null>(null);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const router = useRouter();
  const fetchWithCSRF = useCSRFFetch();

  // Check account status on component mount
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        setLoading(true);
        // The route derives the account from the caller's own session now
        // (it used to trust this query param, letting anyone look up any
        // seller's Stripe status) — no email needed on the request.
        const response = await fetch("/api/payments/stripe/account-status");
        const data = await response.json();

        if (response.ok) {
          setAccountStatus(data);
          setAccountId(data.accountId || null);
        }
      } catch (err) {
        console.error("Failed to check account status:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) {
      checkInitialStatus();
    }

    // Handle onboarding redirects
    if (typeof window === "undefined") return;

    try {
      const query = new URLSearchParams(window.location.search);
      let onboardingStatus = query.get("stripe_onboarding");
      const accountIdParam = query.get("account_id");

      if (!onboardingStatus) {
        const tabParam = query.get("tab");
        if (tabParam?.startsWith("stripe_onboarding")) {
          onboardingStatus = tabParam.split("=")[1] || null;
        }
      }

      if (onboardingStatus === "success") {
        setAccountId(accountIdParam);
        checkInitialStatus();
        router.replace(window.location.pathname);
      } else if (onboardingStatus === "restart") {
        setError("Onboarding was interrupted - please try again");
        setAccountId(accountIdParam);
        router.replace(window.location.pathname);
      }
    } catch (err) {
      console.error("Failed to handle onboarding redirect:", err);
    }
  }, [router, userEmail]);

  const createConnectedAccount = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithCSRF("/api/payments/stripe/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user: { email: userEmail } }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create account");
      }

      setAccountId(data.accountId);
      setOnboardingUrl(data.onboardingUrl);
      window.location.href = data.onboardingUrl;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  const getRequirementLabel = (requirement: string) => {
    const labels: Record<string, string> = {
      "individual.ssn_last_4": "Last 4 digits of your SSN",
      "individual.id_number": "Government-issued ID number",
    };
    return labels[requirement] || requirement;
  };

  const openStripeDashboard = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    setDashboardLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/stripe/login-link", {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to open Stripe dashboard");
      }

      if (data.url) {
        const newTab = window.open(data.url, "_blank", "noopener,noreferrer");
        if (!newTab || newTab.closed || typeof newTab.closed === "undefined") {
          setError(
            "Please allow popups for this site to open the Stripe dashboard.",
          );
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleNextValidation = useCallback(async (): Promise<boolean> => {
    if (loading || dashboardLoading) {
      setError("Please wait for Stripe status checks to complete.");
      return false;
    }

    const isFullyEnabled = Boolean(
      accountStatus?.chargesEnabled && accountStatus?.payoutsEnabled,
    );

    if (!isFullyEnabled) {
      setError(
        "Please complete Stripe onboarding and ensure payouts are enabled before continuing.",
      );
      return false;
    }

    return true;
  }, [
    loading,
    dashboardLoading,
    accountStatus?.chargesEnabled,
    accountStatus?.payoutsEnabled,
  ]);

  useEffect(() => {
    if (!onSaveHandlerReady) return;
    onSaveHandlerReady(handleNextValidation);
  }, [onSaveHandlerReady, handleNextValidation]);

  useEffect(() => {
    if (!onConnectionStatusChange) return;
    const isFullyConnected = Boolean(
      accountStatus?.chargesEnabled && accountStatus?.payoutsEnabled,
    );
    onConnectionStatusChange(isFullyConnected);
  }, [
    onConnectionStatusChange,
    accountStatus?.chargesEnabled,
    accountStatus?.payoutsEnabled,
  ]);

  const renderRequirements = () => {
    if (!accountStatus) return null;

    const hasOutstandingRequirements =
      accountStatus.requirements.currentlyDue.length > 0 ||
      accountStatus.requirements.pastDue.length > 0;

    if (!hasOutstandingRequirements) {
      return (
        <Alert
          severity="success"
          icon={<CheckCircleIcon />}
          sx={{ marginTop: 2, marginBottom: 2 }}
        >
          Your account is fully set up and ready to receive payments!
        </Alert>
      );
    }

    return (
      <Box sx={{ marginTop: 3, marginBottom: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Additional Information Required
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ marginBottom: 2 }}
        >
          Your account is partially set up, but we need more information to
          enable payments:
        </Typography>

        {accountStatus.requirements.currentlyDue.length > 0 && (
          <Box sx={{ marginBottom: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, color: "error.main", marginBottom: 1 }}
            >
              Immediately Required:
            </Typography>
            <List
              sx={{ bgcolor: "rgba(244, 67, 54, 0.05)", borderRadius: 1, p: 1 }}
            >
              {accountStatus.requirements.currentlyDue.map((req, i) => (
                <ListItem key={`current-${i}`} disableGutters>
                  <ListItemText primary={getRequirementLabel(req)} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {accountStatus.requirements.pastDue.length > 0 && (
          <Box sx={{ marginBottom: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, color: "warning.main", marginBottom: 1 }}
            >
              Past Due:
            </Typography>
            <List
              sx={{ bgcolor: "rgba(255, 152, 0, 0.05)", borderRadius: 1, p: 1 }}
            >
              {accountStatus.requirements.pastDue.map((req, i) => (
                <ListItem key={`past-${i}`} disableGutters>
                  <ListItemText primary={getRequirementLabel(req)} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {accountStatus.requirements.eventuallyDue.length > 0 && (
          <Box sx={{ marginBottom: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, color: "info.main", marginBottom: 1 }}
            >
              Future Requirements:
            </Typography>
            <List
              sx={{
                bgcolor: "rgba(33, 150, 243, 0.05)",
                borderRadius: 1,
                p: 1,
              }}
            >
              {accountStatus.requirements.eventuallyDue.map((req, i) => (
                <ListItem key={`eventual-${i}`} disableGutters>
                  <ListItemText primary={getRequirementLabel(req)} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        <Button
          onClick={() => {
            if (!onboardingUrl) {
              createConnectedAccount();
            } else {
              window.location.href = onboardingUrl;
            }
          }}
          disabled={loading}
          variant="contained"
          color="success"
          endIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          sx={{ marginTop: 2 }}
        >
          {loading ? "Loading..." : "Provide Missing Information"}
        </Button>
      </Box>
    );
  };

  const renderAccountStatus = () => {
    if (!accountStatus) return null;

    const isFullyEnabled =
      accountStatus.chargesEnabled && accountStatus.payoutsEnabled;
    const needsAttention = accountStatus.detailsSubmitted && !isFullyEnabled;

    return (
      <Paper sx={{ p: 2, mb: 3, bgcolor: "background.default" }}>
        <Stack spacing={1.5}>
          {isFullyEnabled && (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              Your Stripe account is fully connected and payouts are enabled.
            </Alert>
          )}
          {needsAttention && (
            <Alert severity="warning" icon={<ErrorIcon />}>
              Stripe is still reviewing or requires more details before payouts
              can be enabled.
            </Alert>
          )}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Account Status:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                bgcolor: isFullyEnabled ? "success.light" : "warning.light",
                color: isFullyEnabled ? "success.dark" : "warning.dark",
                fontWeight: 600,
              }}
            >
              {isFullyEnabled ? "Fully Connected" : "Partially Connected"}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2">
              <strong>Payments Enabled:</strong>
            </Typography>
            <Typography
              variant="body2"
              color={
                accountStatus.chargesEnabled ? "success.main" : "error.main"
              }
            >
              {accountStatus.chargesEnabled ? "✓ Yes" : "✗ No"}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2">
              <strong>Payouts Enabled:</strong>
            </Typography>
            <Typography
              variant="body2"
              color={
                accountStatus.payoutsEnabled ? "success.main" : "error.main"
              }
            >
              {accountStatus.payoutsEnabled ? "✓ Yes" : "✗ No"}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2">
              <strong>TOS Accepted:</strong>
            </Typography>
            <Typography
              variant="body2"
              color={accountStatus.tosAccepted ? "success.main" : "error.main"}
            >
              {accountStatus.tosAccepted ? "✓ Yes" : "✗ No"}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              onClick={openStripeDashboard}
              disabled={dashboardLoading}
            >
              {dashboardLoading
                ? "Opening Dashboard..."
                : "Open Stripe Dashboard"}
            </Button>
            {!isFullyEnabled && (
              <Button
                variant="contained"
                color="primary"
                onClick={createConnectedAccount}
                disabled={loading}
              >
                {loading ? "Loading..." : "Continue Onboarding"}
              </Button>
            )}
          </Box>
        </Stack>
      </Paper>
    );
  };

  return (
    <Box sx={{ maxWidth: 700, margin: "2rem auto", padding: 2 }}>
      <Card>
        <CardContent>
          <Typography
            variant="h5"
            component="h2"
            gutterBottom
            sx={{ fontWeight: 600, marginBottom: 1 }}
          >
            Stripe Connect Onboarding
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ marginBottom: 3 }}
          >
            Connect your Stripe account to start receiving payments.
          </Typography>

          {error && (
            <Alert
              severity="error"
              icon={<ErrorIcon />}
              sx={{ marginBottom: 2 }}
            >
              {error}
            </Alert>
          )}

          {loading && !accountStatus ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 4,
              }}
            >
              <CircularProgress size={40} sx={{ marginRight: 2 }} />
              <Typography>Loading account status...</Typography>
            </Box>
          ) : accountStatus ? (
            <>
              {renderAccountStatus()}
              {renderRequirements()}
            </>
          ) : (
            <Paper
              sx={{
                p: 3,
                bgcolor: "info.lighter",
                border: "1px solid",
                borderColor: "info.light",
              }}
            >
              <Typography variant="body1" sx={{ marginBottom: 2 }}>
                You need to connect your Stripe account to receive payments.
              </Typography>
              <Button
                onClick={createConnectedAccount}
                disabled={loading}
                variant="contained"
                color="primary"
                endIcon={
                  loading ? <CircularProgress size={20} /> : <SendIcon />
                }
              >
                {loading ? "Creating Account..." : "Connect with Stripe"}
              </Button>
            </Paper>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
