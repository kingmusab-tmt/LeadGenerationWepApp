"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Container,
  Typography,
  Box,
  Snackbar,
  Alert,
  Grid,
} from "@mui/material";
import BuyerProfile from "@/app/components/leadbuyers/buyerprofile";
import LeadPurchaseHistory from "@/app/components/leadbuyers/leadpurchasehistory";
import { Buyer } from "@/types/buyer";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

const BuyerDetailsPage: React.FC = () => {
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "success" | "error" | "info" | "warning",
  });

  const params = useParams();
  const buyerId =
    typeof params.buyerId === "string"
      ? params.buyerId
      : params.buyerId?.[0] ?? ""; // Ensure it's always a string

  // Fetch buyer details when component loads
  useEffect(() => {
    if (!buyerId) return;
    //(`Fetching details for Buyer ID: ${buyerId}`);

    const fetchBuyer = async () => {
      try {
        const response = await fetch(`/api/buyers?buyerId=${buyerId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch buyer details");
        }

        const data = await response.json();
        //("Buyer data received:", data);

        if (!data) {
          setError("Buyer not found");
          setSnackbar({
            open: true,
            message: "Buyer not found",
            severity: "warning",
          });
        } else {
          // Ensure notificationPreference is always an array
          const buyerData = {
            ...data,
            notificationPreferences: data.notificationPreferences || [], // Default to empty array if undefined
          };
          setBuyer(buyerData);
          setSnackbar({
            open: true,
            message: "Buyer details loaded successfully!",
            severity: "success",
          });
        }
      } catch (err) {
        setError((err as Error).message);
        setSnackbar({
          open: true,
          message: "Error fetching buyer details",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBuyer();
  }, [buyerId]);

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <LoadingComponent />
      </Box>
    );
  }

  return (
    <Container
      sx={{
        padding: { xs: 2, sm: 4 },
        marginTop: { xs: 2, sm: 4 },
        width: "100%",
      }}
    >
      {/* Success or Error Messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
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

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : null}

      {buyer ? (
        <>
          <Typography
            variant="h6"
            gutterBottom
            mt={3}
            sx={{
              textAlign: "center",
              fontSize: { xs: "2rem", sm: "2rem" },
              fontWeight: "bold",
            }}
          >
            {buyer.name} Information
          </Typography>

          <Grid
            container
            spacing={4}
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
            }}
          >
            {/* ✅ Buyer Profile - Full Width on Small Screens, Left Side on Large */}
            <Grid item xs={12} md={4}>
              <BuyerProfile buyer={buyer} />
            </Grid>

            {/* ✅ Purchase History & Payment History - Right Side on Large */}
            <Grid item xs={12} md={8} container spacing={3}>
              <Grid item xs={12}>
                {/* <Typography variant="h6" sx={{ mb: 1 }}>
                  Purchase History
                </Typography> */}
                <LeadPurchaseHistory id={buyerId} />
              </Grid>

              {/* <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Payment History
                </Typography>
                <PaymentHistory history={buyer.paymentHistory} />
              </Grid> */}
            </Grid>

            {/* ✅ Feedback - Full Width on Small Screens, Stacked Below */}
            {/* <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Feedback
              </Typography>
              <FeedbackSection feedback={buyer.feedback} />
            </Grid> */}
          </Grid>
        </>
      ) : (
        <Alert severity="warning">Buyer not found.</Alert>
      )}
    </Container>
  );
};

export default BuyerDetailsPage;
