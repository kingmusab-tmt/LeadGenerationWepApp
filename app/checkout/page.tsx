"use client";
import { Suspense } from "react";
import { Container, CircularProgress } from "@mui/material";
import CheckoutContent from "./checkoutContent";

const CheckoutPage = () => {
  return (
    <Suspense
      fallback={
        <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
          <CircularProgress />
        </Container>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
};

export default CheckoutPage;
