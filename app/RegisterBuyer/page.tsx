"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BuyerForm from "../components/leadbuyers/BuyerForm";
import { IBuyer } from "@/models/leadbuyers";
import {
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useCSRFFetch } from "@/app/hooks";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

// Wrap the component that uses useSearchParams in Suspense
const RegisterBuyerPageContent: React.FC = () => {
  const searchParams = useSearchParams();
  const csrfFetch = useCSRFFetch();
  const [sellerId, setSellerId] = useState<string>("");
  const router = useRouter();
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });
  const [successModal, setSuccessModal] = useState<{
    open: boolean;
    buyerName?: string;
  }>({ open: false });

  // Extract sellerId from query parameters
  useEffect(() => {
    const sellerIdParam = searchParams.get("sellerId");
    if (sellerIdParam) {
      setSellerId(sellerIdParam);
    }
  }, [searchParams]);

  // Handle form submission
  const handleSave = async (
    buyerData: Partial<IBuyer> & { sellerId: string },
  ) => {
    try {
      const response = await csrfFetch("/api/buyers?sellerId=" + sellerId, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buyerData),
      });

      if (!response.ok) {
        let errorMessage = "Failed to register buyer";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = `${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Buyer created:", result);

      // Show success modal instead of snackbar
      setSuccessModal({
        open: true,
        buyerName: buyerData.name,
      });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to register buyer";

      // Show error message
      setSnackbar({
        open: true,
        message: errorMsg,
        severity: "error",
      });
    }
  };

  // Handle form cancellation
  const handleCancel = () => {
    router.push(`/auth/sign-in`);
  };

  // Close the Snackbar
  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Handle success modal actions
  const handleProceedToSignIn = () => {
    setSuccessModal({ open: false });
    router.push(`/auth/sign-in`);
  };

  return (
    <div>
      <BuyerForm
        open={true}
        onClose={handleCancel}
        onSave={handleSave}
        sellerId={sellerId}
      />

      {/* Success Modal */}
      <Dialog
        open={successModal.open}
        onClose={() => setSuccessModal({ open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CheckCircleIcon sx={{ color: "success.main", fontSize: 28 }} />
            <Typography variant="h6">Registration Successful! 🎉</Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Welcome, <strong>{successModal.buyerName}</strong>! Your buyer
            account has been successfully registered.
          </Typography>

          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Next Steps:
          </Typography>

          <List sx={{ mb: 2 }}>
            <ListItem sx={{ pl: 0 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Typography sx={{ fontWeight: 600 }}>1.</Typography>
              </ListItemIcon>
              <ListItemText
                primary="Click 'Proceed to Sign In' below"
                primaryTypographyProps={{ variant: "body2" }}
              />
            </ListItem>

            <ListItem sx={{ pl: 0 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Typography sx={{ fontWeight: 600 }}>2.</Typography>
              </ListItemIcon>
              <ListItemText
                primary="Sign in with your email address"
                primaryTypographyProps={{ variant: "body2" }}
              />
            </ListItem>

            <ListItem sx={{ pl: 0 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Typography sx={{ fontWeight: 600 }}>3.</Typography>
              </ListItemIcon>
              <ListItemText
                primary="Select 'Buyer' on the role selection page"
                primaryTypographyProps={{ variant: "body2" }}
              />
            </ListItem>

            <ListItem sx={{ pl: 0 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Typography sx={{ fontWeight: 600 }}>4.</Typography>
              </ListItemIcon>
              <ListItemText
                primary="Access your buyer dashboard and start purchasing leads"
                primaryTypographyProps={{ variant: "body2" }}
              />
            </ListItem>
          </List>

          <Box
            sx={{
              bgcolor: "info.lighter",
              p: 1.5,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "info.light",
            }}
          >
            <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
              <strong>Important:</strong> Make sure to select{" "}
              <strong>"Buyer"</strong> during role selection to access the buyer
              dashboard and marketplace.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setSuccessModal({ open: false })}
          >
            Close
          </Button>
          <Button variant="contained" onClick={handleProceedToSignIn}>
            Proceed to Sign In
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for error notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

// Main component with Suspense boundary
const RegisterBuyerPage: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterBuyerPageContent />
    </Suspense>
  );
};

export default RegisterBuyerPage;
