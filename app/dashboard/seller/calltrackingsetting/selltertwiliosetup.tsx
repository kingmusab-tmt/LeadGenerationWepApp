import { useEffect, useState } from "react";
import {
  Button,
  Select,
  MenuItem,
  Typography,
  Switch,
  Snackbar,
  Alert,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  Container,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
  Card,
  CardContent,
} from "@mui/material";
import { industryNiches } from "@/utils/industryNiches";
import cityAreaCodes from "@/utils/cityareacodes";
import CallMethodForm from "./callMethodForm";
import TrackingNumbersTable from "./TrackingNumberTable";
import { TrackingNumber } from "@/types/trackingNumbers";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";
import NextLink from "next/link";

export default function CallPage({ sellerId }: { sellerId: string }) {
  const [numbers, setNumbers] = useState<TrackingNumber[]>([]);
  const [twilioActivated, setTwilioActivated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");
  const [method, setMethod] = useState("Automatic");
  const [manualOption, setManualOption] = useState<
    "manualEntry" | "systemRequest" | null
  >(null);
  const [editingNumber, setEditingNumber] = useState<TrackingNumber | null>(
    null
  );
  const [twilioData, setTwilioData] = useState({
    accountSid: "",
    authToken: "",
    twilioNumber: "",
  });
  const areaCode = city ? cityAreaCodes[city] : "";
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [subscriptionLimits, setSubscriptionLimits] = useState({
    currentCount: 0,
    maxAllowed: 0,
  });

  const fetchUpdatedNumbers = async () => {
    try {
      const numbersResponse = await fetch(
        `/api/call_twillo/get_numbers?sellerId=${sellerId}`
      );
      const numbersData = await numbersResponse.json();
      setNumbers(numbersData);
      setLoading(false);

      if (numbersData.length === 0) {
        setSnackbar({
          open: true,
          message: "No tracking numbers found.",
          severity: "info",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to fetch tracking numbers.",
        severity: "error",
      });
      setLoading(false);
    }
  };

  const fetchTwilioStatus = async () => {
    try {
      const twilioStatusResponse = await fetch(
        `/api/call_twillo/twiliostatus?sellerId=${sellerId}`
      );
      const twilioStatusData = await twilioStatusResponse.json();
      setTwilioActivated(twilioStatusData.twilioActivated);

      // Fetch subscription limits if available in the response
      if (twilioStatusData.subscriptionLimits) {
        setSubscriptionLimits({
          currentCount: twilioStatusData.currentCount || numbers.length,
          maxAllowed: twilioStatusData.subscriptionLimits.twilioNumbers || 0,
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to fetch Twilio status.",
        severity: "error",
      });
    }
  };

  const handleEditNumber = (number: TrackingNumber) => {
    setEditingNumber(number);
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    fetchUpdatedNumbers();
    fetchTwilioStatus();
  }, [sellerId]);

  const handleTwilioToggle = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newStatus = event.target.checked;
    const action = newStatus ? "activate" : "deactivate";

    try {
      const response = await fetch("/api/call_twillo/activateTwilio", {
        method: "POST",
        body: JSON.stringify({ sellerId, action }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTwilioActivated(data.twilioActivated);
      setSnackbar({
        open: true,
        message: `Twilio ${action}d successfully.`,
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to ${action} Twilio: ${
          error instanceof Error ? error.message : String(error)
        }`,
        severity: "error",
      });
      // Revert the UI state if the API call fails
      setTwilioActivated(!newStatus);
    }
  };

  const requestNumber = async () => {
    const selectedIndustry = customIndustry || industry;

    if (!city || !selectedIndustry) {
      setSnackbar({
        open: true,
        message: "Please select a city and industry.",
        severity: "warning",
      });
      return;
    }

    const payload = {
      sellerId,
      areaCode,
      industry: selectedIndustry,
      method,
      recordCall: false,
      reconnectCaller: false,
      passCallerId: false,
      leadSource: "",
      welcomeMessage: "",
      callWhisper: "",
      requireResponse: false,
      forwardingType: "direct",
    };

    try {
      const response = await fetch("/api/call_twillo/register_number", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.limitReached) {
          setSubscriptionLimits({
            currentCount: errorData.currentCount,
            maxAllowed: errorData.maxAllowed,
          });
          setLimitDialogOpen(true);
          return;
        }
        throw new Error(errorData.message || "Failed to request number");
      }

      const data = await response.json();
      const newNumber: TrackingNumber = {
        phoneNumber: data.phoneNumber,
        industry: selectedIndustry,
        method: method as "Manual" | "Automatic",
        forwardingType: "direct",
        recordCall: false,
        reconnectCaller: false,
        passCallerId: false,
        leadSource: "",
        welcomeMessage: "",
        callWhisper: "",
        requireResponse: false,
      };

      setNumbers((prev) => [...prev, newNumber]);
      setSubscriptionLimits({
        currentCount: data.currentCount,
        maxAllowed: data.maxAllowed,
      });
      setSnackbar({
        open: true,
        message: `Number requested successfully. (${data.currentCount}/${data.maxAllowed} used)`,
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "Failed to request number.",
        severity: "error",
      });
    }
  };

  // ... (keep other existing functions like addManualNumber, removeNumber, etc.)
  const addManualNumber = async () => {
    const selectedIndustry = customIndustry || industry;

    if (!twilioData.twilioNumber || !selectedIndustry) {
      setSnackbar({
        open: true,
        message: "Please enter a Twilio number and select an industry.",
        severity: "warning",
      });
      return;
    }

    const newNumber: TrackingNumber = {
      phoneNumber: twilioData.twilioNumber,
      industry: selectedIndustry,
      method: "Manual",
      forwardingType: "direct",
      recordCall: false,
      reconnectCaller: false,
      passCallerId: false,
      leadSource: "",
      welcomeMessage: "",
      callWhisper: "",
      requireResponse: false,
    };

    setNumbers((prev) => [...prev, newNumber]);
    setSnackbar({
      open: true,
      message: "Number added successfully.",
      severity: "success",
    });
  };

  const removeNumber = async (phoneNumber: string) => {
    try {
      await fetch("/api/call_twillo/removeNumber", {
        method: "POST",
        body: JSON.stringify({ sellerId, phoneNumber }),
        headers: { "Content-Type": "application/json" },
      });

      setNumbers((prev) =>
        prev.filter((num) => num.phoneNumber !== phoneNumber)
      );
      setSnackbar({
        open: true,
        message: "Number removed successfully.",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to remove number.",
        severity: "error",
      });
    }
  };
  const handleCloseLimitDialog = () => {
    setLimitDialogOpen(false);
  };

  const handleUpgradeNow = () => {
    // Close the dialog and redirect to subscription page
    setLimitDialogOpen(false);
    // In a real app, you would navigate to the upgrade page
    // router.push('/subscription/upgrade');
  };

  if (loading) return <LoadingComponent />;

  return (
    <Container sx={{ padding: { xs: 2, sm: 4 } }}>
      <Typography
        variant="h5"
        sx={{ fontWeight: "bold", mt: 4, mb: 1, color: "primary.main" }}
      >
        Call Tracking Set Up
      </Typography>

      {/* Subscription Limit Info Card */}
      <Card sx={{ mb: 3, bgcolor: "background.paper" }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Your Number Limits
          </Typography>
          <Typography>
            You're using {subscriptionLimits.currentCount} of{" "}
            {subscriptionLimits.maxAllowed} available tracking numbers.
          </Typography>
          {subscriptionLimits.currentCount >= subscriptionLimits.maxAllowed && (
            <Box sx={{ mt: 2 }}>
              <Typography color="error">
                You've reached your limit. Upgrade to add more numbers.
              </Typography>
              <NextLink href="/subscription" passHref>
                <Button variant="contained" color="primary" sx={{ mt: 1 }}>
                  Upgrade Subscription
                </Button>
              </NextLink>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Rest of your existing UI components */}
      <div>
        <Typography variant="subtitle1">Twilio Status</Typography>
        <Switch
          checked={twilioActivated}
          onChange={handleTwilioToggle}
          color="primary"
        />
        <Typography variant="body2" sx={{ display: "inline", ml: 1 }}>
          {twilioActivated ? "Active" : "Inactive"}
        </Typography>
      </div>

      <div>
        <Typography variant="subtitle1">Request/Add Twilio Number</Typography>
        <RadioGroup
          row
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            setManualOption(null);
          }}
        >
          <FormControlLabel
            value="Automatic"
            control={<Radio />}
            label="Automatic Request"
          />
        </RadioGroup>

        {method === "Automatic" && (
          <div>
            <Typography variant="subtitle1">
              Select City to Determine Area Code
            </Typography>
            <Select
              fullWidth
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {Object.keys(cityAreaCodes).map((city) => (
                <MenuItem key={city} value={city}>
                  {city}
                </MenuItem>
              ))}
            </Select>
            {areaCode && (
              <Typography>Selected Area Code: {areaCode}</Typography>
            )}

            <Typography variant="subtitle1">
              Select Industry/Niche for This Twilio Number
            </Typography>
            <Select
              fullWidth
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            >
              {industryNiches.map((niche) => (
                <MenuItem key={niche.value} value={niche.value}>
                  {niche.label}
                </MenuItem>
              ))}
              <MenuItem value="custom">Other (Specify Below)</MenuItem>
            </Select>
            {industry === "custom" && (
              <TextField
                fullWidth
                label="Enter Industry"
                value={customIndustry}
                onChange={(e) => setCustomIndustry(e.target.value)}
              />
            )}
            <Button
              variant="contained"
              onClick={requestNumber}
              disabled={!twilioActivated}
              sx={{ mt: 2 }}
            >
              Request Number
            </Button>
          </div>
        )}
      </div>

      <TrackingNumbersTable
        numbers={numbers}
        onRemoveNumber={removeNumber}
        onEditNumber={handleEditNumber}
      />
      <CallMethodForm
        numbers={numbers}
        sellerId={sellerId}
        initialValues={editingNumber}
        onUpdateForwarding={async (payload) => {
          try {
            await fetch("/api/call_twillo/updateForwarding", {
              method: "POST",
              body: JSON.stringify(payload),
              headers: { "Content-Type": "application/json" },
            });
            setSnackbar({
              open: true,
              message: "Forwarding updated successfully.",
              severity: "success",
            });
            fetchUpdatedNumbers();
            setEditingNumber(null);
          } catch (error) {
            setSnackbar({
              open: true,
              message: "Failed to update forwarding.",
              severity: "error",
            });
          }
        }}
      />
      {/* Limit Reached Dialog */}
      <Dialog
        open={limitDialogOpen}
        onClose={handleCloseLimitDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Number Limit Reached</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You've reached your limit of {subscriptionLimits.maxAllowed}{" "}
            tracking numbers with your current subscription plan.
          </DialogContentText>
          <DialogContentText sx={{ mt: 2 }}>
            Upgrade your subscription to add more tracking numbers and unlock
            additional features.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLimitDialog}>Continue Anyway</Button>
          <Button
            onClick={handleUpgradeNow}
            variant="contained"
            color="primary"
            component={NextLink}
            href="/subscription"
          >
            Upgrade Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* Existing Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
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
}
