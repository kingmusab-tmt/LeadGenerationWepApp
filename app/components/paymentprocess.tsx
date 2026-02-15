// components/PaymentProcessor.tsx
"use client";
import React, { useState } from "react";
import { Box, Button, CircularProgress } from "@mui/material";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

interface PaymentProcessorProps {
  tier: any;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export const PaymentProcessor = ({
  tier,
  onSuccess,
  onError,
}: PaymentProcessorProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const yearlyAmount = (parseFloat(tier.discountedPrice) * 12).toFixed(2);

  const handleStripePayment = async () => {
    if (!stripe || !elements) {
      onError("Stripe is not initialized");
      return;
    }

    setProcessing(true);

    try {
      const { error: stripeError, paymentMethod } =
        await stripe.createPaymentMethod({
          type: "card",
          card: elements.getElement(CardElement)!,
        });

      if (stripeError) {
        throw new Error(stripeError.message || "Payment failed");
      }

      const response = await fetch("/api/payments/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          tierId: tier._id,
          amount: yearlyAmount,
          isYearly: true,
        }),
      });

      const data = await response.json();

      if (data.requiresAction) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          data.clientSecret,
        );

        if (confirmError) {
          throw new Error(confirmError.message || "Authentication failed");
        }
      }

      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box>
      <Box mb={3}>
        <CardElement options={{ hidePostalCode: true }} />
      </Box>
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleStripePayment}
        disabled={!stripe || processing}
        size="large"
      >
        {processing ? (
          <CircularProgress size={24} />
        ) : (
          `Pay $${yearlyAmount}/year`
        )}
      </Button>
    </Box>
  );
};
