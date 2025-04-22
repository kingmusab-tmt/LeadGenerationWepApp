"use client";
import React, { useState, useEffect, memo } from "react";
import axios from "axios";
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

declare global {
  interface Window {
    paypal: any;
  }
}

const UnitPurchase: React.FC = () => {
  const [units, setUnits] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("stripe");
  const [loading, setLoading] = useState(false);
  const [unitPricingOptions, setUnitPricingOptions] = useState<
    { units: number; cost: number }[]
  >([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [isPayPalSdkLoaded, setIsPayPalSdkLoaded] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info"
  >("info");

  const router = useRouter(); // Initialize useRouter for redirection

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info"
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
            "error"
          );
        }
      } catch (error) {
        console.error("Error fetching unit pricing options:", error);
        showSnackbar(
          "An error occurred while fetching pricing options",
          "error"
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

  useEffect(() => {
    if (paymentMethod === "paypal") {
      const fetchPaypalClientId = async () => {
        try {
          const response = await axios.get(
            "/api/paypalapi/getpaypalapiclientid"
          );
          if (response.data.success) {
            setPaypalClientId(response.data.clientId);
          } else {
            showSnackbar(
              response.data.message || "Failed to fetch PayPal Client ID",
              "error"
            );
          }
        } catch (error) {
          console.error("Error fetching PayPal Client ID:", error);
          showSnackbar(
            "An error occurred while fetching PayPal Client ID",
            "error"
          );
        }
      };

      fetchPaypalClientId();
    }
  }, [paymentMethod]);

  useEffect(() => {
    if (paypalClientId && paymentMethod === "paypal") {
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}`;
      script.async = true;

      script.onload = () => {
        setIsPayPalSdkLoaded(true);
      };

      script.onerror = () => {
        showSnackbar("Failed to load PayPal. Please try again.", "error");
      };

      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
        setIsPayPalSdkLoaded(false);
      };
    }
  }, [paypalClientId, paymentMethod]);

  const handleStripePurchase = async () => {
    setLoading(true);
    try {
      const response = await axios.post("/api/stripeapi/stripecheckoutapi", {
        units,
        cost,
      });

      if (response.data.success) {
        window.location.href = response.data.sessionUrl;
      } else {
        showSnackbar(
          response.data.message || "Failed to initiate Stripe payment",
          "error"
        );
      }
    } catch (error) {
      console.error("Error initiating Stripe payment:", error);
      showSnackbar("An error occurred. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalApprove = async (orderId: string) => {
    setLoading(true);
    try {
      const response = await axios.post("/api/paypalapi/capture-order", {
        orderId,
        units,
        cost,
      });

      if (response.data.success) {
        showSnackbar(
          "Payment successful! Your wallet has been updated.",
          "success"
        );
        // Redirect to the dashboard after successful payment
        router.push("/dashboard/buyer/overview");
      } else {
        showSnackbar(
          response.data.message || "Payment failed. Please try again.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error capturing PayPal payment:", error);
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
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Select Units</InputLabel>
                <Select
                  value={units}
                  onChange={(e) => {
                    const selectedUnits = Number(e.target.value);
                    setUnits(selectedUnits);
                    const selectedOption = unitPricingOptions.find(
                      (option) => option.units === selectedUnits
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
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as string)}
                >
                  <MenuItem value="stripe">Stripe</MenuItem>
                  <MenuItem value="paypal">PayPal</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              {paymentMethod === "stripe" ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleStripePurchase}
                  disabled={loading || units === 0}
                >
                  {loading ? "Processing..." : "Purchase with Stripe"}
                </Button>
              ) : (
                <div id="paypal-button-container">
                  {isPayPalSdkLoaded && (
                    <PayPalButtons
                      createOrder={(data: any, actions: any) => {
                        if (cost <= 0) {
                          showSnackbar(
                            "Invalid cost. Please select a valid number of units.",
                            "error"
                          );
                          return Promise.reject("Invalid cost");
                        }
                        return actions.order.create({
                          purchase_units: [
                            {
                              amount: {
                                value: cost.toFixed(2),
                              },
                            },
                          ],
                        });
                      }}
                      onApprove={async (data: any, actions: any) => {
                        await handlePayPalApprove(data.orderID);
                      }}
                    />
                  )}
                </div>
              )}
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

const PayPalButtons = memo(
  ({
    createOrder,
    onApprove,
  }: {
    createOrder: (data: any, actions: any) => Promise<string>;
    onApprove: (data: any, actions: any) => Promise<void>;
  }) => {
    useEffect(() => {
      if (window.paypal && typeof window.paypal.Buttons === "function") {
        // Clear the container before rendering the button
        const container = document.getElementById("paypal-button-container");
        if (container) {
          container.innerHTML = ""; // Clear any existing buttons
        }

        window.paypal
          .Buttons({
            createOrder,
            onApprove,
          })
          .render("#paypal-button-container");
      } else {
        console.error("PayPal SDK not loaded or Buttons method is unavailable");
      }
    }, [createOrder, onApprove]);

    return <div id="paypal-button-container"></div>;
  }
);

export default UnitPurchase;
