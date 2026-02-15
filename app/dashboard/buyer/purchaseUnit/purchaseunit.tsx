"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useCSRFFetch } from "@/app/hooks/useCSRF";
import {
  Typography,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  Snackbar,
  Alert,
  Container,
} from "@mui/material";
import { useRouter } from "next/navigation"; // Import useRouter for redirection
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

const UnitPurchase: React.FC = () => {
  const [units, setUnits] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const csrfFetch = useCSRFFetch();
  const [unitPricingOptions, setUnitPricingOptions] = useState<
    { units: number; cost: number }[]
  >([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info"
  >("info");

  const router = useRouter(); // Initialize useRouter for redirection

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

  useEffect(() => {
    const fetchUnitPricingOptions = async () => {
      try {
        const response = await axios.get("/api/buyers/buyerunitpriceOption");
        if (response.data.success) {
          setUnitPricingOptions(response.data.data);
        } else {
          showSnackbar(
            response.data.message || "Failed to fetch unit pricing options",
            "error",
          );
        }
      } catch (error) {
        console.error("Error fetching unit pricing options:", error);
        showSnackbar(
          "An error occurred while fetching pricing options",
          "error",
        );
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchUnitPricingOptions();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get("status");

    if (status === "success") {
      setShowSuccessModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === "canceled") {
      setShowFailureModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleStripePurchase = async () => {
    setLoading(true);
    try {
      const response = await csrfFetch(
        "/api/payments/stripe/stripecheckoutapi",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            units,
            cost,
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
      }
    } catch (error) {
      console.error("Error initiating Stripe payment:", error);
      showSnackbar("An error occurred. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container sx={{ mt: 6 }}>
      <Paper elevation={3} style={{ padding: "20px", margin: "20px" }}>
        <Typography variant="h5" gutterBottom>
          Purchase Units
        </Typography>
        {loadingOptions ? (
          <LoadingComponent />
        ) : (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Select Units</InputLabel>
                <Select
                  value={units}
                  onChange={(e) => {
                    const selectedUnits = Number(e.target.value);
                    setUnits(selectedUnits);
                    const selectedOption = unitPricingOptions.find(
                      (option) => option.units === selectedUnits,
                    );
                    setCost(selectedOption?.cost || 0);
                  }}
                >
                  {unitPricingOptions.map((option) => (
                    <MenuItem key={option.units} value={option.units}>
                      {option.units} units - ${option.cost}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleStripePurchase}
                disabled={loading || units === 0}
              >
                {loading ? "Processing..." : "Purchase with Stripe"}
              </Button>
            </Grid>
          </Grid>
        )}

        {showSuccessModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <Paper
              elevation={3}
              style={{
                padding: "20px",
                maxWidth: "400px",
                textAlign: "center",
              }}
            >
              <Typography variant="h6" gutterBottom>
                Payment Successful!
              </Typography>
              <Typography variant="body1" gutterBottom>
                Your wallet has been updated. Please check your transaction
                history and wallet balance.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push("/dashboard/buyer/overview"); // Redirect to dashboard
                }}
              >
                Close
              </Button>
            </Paper>
          </div>
        )}

        {showFailureModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <Paper
              elevation={3}
              style={{
                padding: "20px",
                maxWidth: "400px",
                textAlign: "center",
              }}
            >
              <Typography variant="h6" gutterBottom>
                Payment Failed
              </Typography>
              <Typography variant="body1" gutterBottom>
                Please try again or contact the admin if the issue persists.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setShowFailureModal(false)}
              >
                Close
              </Button>
            </Paper>
          </div>
        )}

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
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default UnitPurchase;
