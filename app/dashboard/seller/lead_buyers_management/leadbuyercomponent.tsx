"use client";

import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Box,
  Snackbar,
  Alert,
  Button,
  Dialog,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import { ContentCopy } from "@mui/icons-material";
import BuyerTable from "@/app/components/leadbuyers/buyertable";
import BuyerForm from "@/app/components/leadbuyers/BuyerForm";
import { IBuyer } from "@/models/leadbuyers";
import UserDashboard from "../layout";
import { useSession } from "next-auth/react";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

const BuyersPage: React.FC = () => {
  const { data: session } = useSession();
  const [buyers, setBuyers] = useState<IBuyer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openBuyerForm, setOpenBuyerForm] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [selectedBuyer, setSelectedBuyer] = useState<Partial<IBuyer> | null>(
    null
  );
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "success" | "error" | "info" | "warning",
  });
  const [subscriptionLimits, setSubscriptionLimits] = useState({
    currentCount: 0,
    maxAllowed: 0,
  });

  const sellerId = session?.user?.id || "";
  const [registrationLink, setRegistrationLink] = useState("");
  const [iframeCode, setIframeCode] = useState("");

  // Fetch buyers and subscription limits
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch buyers
      const buyersResponse = await fetch("/api/buyers");
      if (!buyersResponse.ok) throw new Error("Failed to fetch buyers");
      const buyersData: IBuyer[] = await buyersResponse.json();
      setBuyers(buyersData);

      // Fetch subscription limits
      const limitsResponse = await fetch(
        `/api/subscriptions/limits?sellerId=${sellerId}`
      );
      if (!limitsResponse.ok)
        throw new Error("Failed to fetch subscription limits");
      const limitsData = await limitsResponse.json();
      setSubscriptionLimits({
        currentCount: buyersData.length,
        maxAllowed: limitsData.subscriptionLimits.buyers || 0,
      });

      if (buyersData.length === 0) {
        setSnackbar({
          open: true,
          message: "No buyers registered yet.",
          severity: "info",
        });
      }
    } catch (err) {
      setError((err as Error).message);
      setSnackbar({
        open: true,
        message: "Failed to load data.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sellerId) {
      fetchData();
      const link = `${window.location.origin}/RegisterBuyer?sellerId=${sellerId}`;
      const code = `<iframe src="${link}" width="100%" height="500px" style="border: none;"></iframe>`;
      setRegistrationLink(link);
      setIframeCode(code);
    }
  }, [sellerId]);

  const handleAddNewBuyer = () => {
    if (subscriptionLimits.currentCount >= subscriptionLimits.maxAllowed) {
      setSnackbar({
        open: true,
        message: `You've reached your buyer limit (${subscriptionLimits.maxAllowed}). Please upgrade your subscription.`,
        severity: "warning",
      });
      return;
    }
    setSelectedBuyer(null);
    setOpenBuyerForm(true);
  };

  const handleEditBuyer = (buyer: IBuyer) => {
    setSelectedBuyer(buyer);
    setOpenBuyerForm(true);
  };

  const handleSaveBuyer = async (buyerData: Partial<IBuyer>) => {
    try {
      const response = selectedBuyer
        ? await fetch(`/api/buyers?id=${selectedBuyer._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buyerData),
          })
        : await fetch("/api/buyers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buyerData),
          });

      if (!response.ok) throw new Error("Failed to save buyer");

      setSnackbar({
        open: true,
        message: selectedBuyer ? "Buyer updated!" : "Buyer added!",
        severity: "success",
      });

      fetchData();
      setOpenBuyerForm(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error saving buyer.",
        severity: "error",
      });
    }
  };

  const handleDelete = async (buyerId: string) => {
    try {
      const response = await fetch(`/api/buyers?id=${buyerId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete buyer");

      fetchData();
      setSnackbar({
        open: true,
        message: "Buyer deleted!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to delete buyer.",
        severity: "error",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setSnackbar({
          open: true,
          message: "Copied to clipboard!",
          severity: "success",
        });
      })
      .catch(() => {
        setSnackbar({
          open: true,
          message: "Failed to copy.",
          severity: "error",
        });
      });
  };

  const isLimitReached =
    subscriptionLimits.currentCount >= subscriptionLimits.maxAllowed;

  return (
    <UserDashboard>
      <Container sx={{ mt: isMobile ? "4rem" : "4rem", maxWidth: "1200px" }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ textAlign: "center", mb: 4 }}
        >
          Lead Buyer Management
        </Typography>

        {/* Subscription Limit Info */}
        {subscriptionLimits.currentCount === subscriptionLimits.maxAllowed && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6">
                Buyer Limit: {subscriptionLimits.currentCount}/
                {subscriptionLimits.maxAllowed}
              </Typography>
              <Typography color="error" sx={{ mt: 1 }}>
                You've reached your buyer limit. Upgrade to add more buyers.
                Kindly go to Settings to upgrade your subscription.
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <Box
          display="flex"
          justifyContent="space-between"
          mb={3}
          flexWrap="wrap"
          gap={2}
        >
          <Button
            variant="contained"
            onClick={handleAddNewBuyer}
            disabled={isLimitReached}
          >
            Add New Buyer
          </Button>

          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="outlined"
              onClick={() => copyToClipboard(registrationLink)}
              disabled={isLimitReached}
              startIcon={<ContentCopy />}
            >
              Copy Registration Link
            </Button>
            <Button
              variant="outlined"
              onClick={() => copyToClipboard(iframeCode)}
              disabled={isLimitReached}
              startIcon={<ContentCopy />}
            >
              Copy Iframe Code
            </Button>
          </Box>
        </Box>

        {/* Buyer Table */}
        {loading ? (
          <LoadingComponent />
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : buyers.length === 0 ? (
          <Alert severity="info">No buyers registered yet.</Alert>
        ) : (
          <BuyerTable
            buyers={buyers}
            onDelete={handleDelete}
            onEdit={handleEditBuyer}
          />
        )}

        {/* Buyer Form Modal */}
        <Dialog
          open={openBuyerForm}
          onClose={() => setOpenBuyerForm(false)}
          maxWidth="sm"
          fullWidth
        >
          <BuyerForm
            open={openBuyerForm}
            onClose={() => setOpenBuyerForm(false)}
            onSave={handleSaveBuyer}
            initialValues={selectedBuyer || undefined}
            sellerId={sellerId}
          />
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
        </Snackbar>
      </Container>
    </UserDashboard>
  );
};

export default BuyersPage;
