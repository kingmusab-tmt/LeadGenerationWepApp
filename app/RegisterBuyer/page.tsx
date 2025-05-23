"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation"; // Use useSearchParams for query parameters
import BuyerForm from "../components/leadbuyers/BuyerForm";
import { IBuyer } from "@/models/leadbuyers";
import { Snackbar, Alert } from "@mui/material"; // Import Snackbar and Alert
import { useRouter } from "next/navigation";

// Wrap the component that uses useSearchParams in Suspense
const RegisterBuyerPageContent: React.FC = () => {
  const searchParams = useSearchParams(); // Use useSearchParams to access query parameters
  const [sellerId, setSellerId] = useState<string>("");
  const router = useRouter();
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" }); // Snackbar state

  // Extract sellerId from query parameters
  useEffect(() => {
    const sellerIdParam = searchParams.get("sellerId"); // Get sellerId from query params
    if (sellerIdParam) {
      setSellerId(sellerIdParam);
    }
  }, [searchParams]);

  // Handle form submission
  const handleSave = async (
    buyerData: Partial<IBuyer> & { sellerId: string }
  ) => {
    try {
      const response = await fetch("/api/buyers?sellerId=" + sellerId, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buyerData),
      });

      if (!response.ok) {
        throw new Error("Failed to register buyer");
      }

      const result = await response.json();
      console.log("Buyer created:", result);

      // Show success message
      setSnackbar({
        open: true,
        message: "Buyer registered successfully! Redirecting...",
        severity: "success",
      });

      // Redirect to a "Thank You" page after a short delay
      setTimeout(() => {
        router.push(`/auth/sign-in`);
      }, 2000);
    } catch (error) {
      console.error("Failed to register buyer:", error);

      // Show error message
      setSnackbar({
        open: true,
        message: "Failed to register buyer. Please try again.",
        severity: "error",
      });
    }
  };

  // Close the Snackbar
  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <div>
      <h1>Register as a Lead Buyer</h1>
      <BuyerForm
        open={true} // Always open the form
        onClose={() =>
          setSnackbar({
            open: true,
            message: "Buyer registered successfully! Redirecting...",
            severity: "success",
          })
        } // Handle form close
        onSave={handleSave}
        sellerId={sellerId} // Pass sellerId to the form
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000} // Auto-close after 6 seconds
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }} // Position the Snackbar
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
