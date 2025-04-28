// components/PaymentProcessor.tsx
"use client";
import React, { useState } from "react";
import {
  Box,
  Button,
  Alert,
  CircularProgress,
  Typography,
} from "@mui/material";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { PayPalButtons } from "@paypal/react-paypal-js";
import axios from "axios";

interface PaymentProcessorProps {
  tier: any;
  paymentMethod: "stripe" | "paypal";
  paypalClientId: string | null;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export const PaymentProcessor = ({
  tier,
  paymentMethod,
  paypalClientId,
  onSuccess,
  onError,
}: PaymentProcessorProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paypalSdkLoaded, setPaypalSdkLoaded] = useState(false);

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

      const response = await axios.post("/api/payments/stripe", {
        paymentMethodId: paymentMethod.id,
        tierId: tier._id,
        amount: yearlyAmount,
        isYearly: true,
      });

      if (response.data.requiresAction) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          response.data.clientSecret
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

  if (paymentMethod === "stripe") {
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
  }

  if (paymentMethod === "paypal") {
    return (
      <Box>
        {!paypalSdkLoaded && (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight={200}
          >
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Loading PayPal...
            </Typography>
          </Box>
        )}

        {paypalSdkLoaded && (
          <PayPalButtons
            style={{ layout: "vertical" }}
            createOrder={async (data, actions) => {
              try {
                const response = await axios.post(
                  "/api/payments/paypal/create",
                  {
                    tierId: tier._id,
                    amount: yearlyAmount,
                    isYearly: true,
                  }
                );

                return response.data.orderID;
              } catch (err) {
                onError("Failed to create PayPal order");
                throw err;
              }
            }}
            onApprove={async (data, actions) => {
              try {
                const response = await axios.post(
                  "/api/payments/paypal/capture",
                  {
                    orderID: data.orderID,
                    tierId: tier._id,
                  }
                );

                if (response.data.success) {
                  onSuccess();
                } else {
                  onError(response.data.message || "Payment failed");
                }
              } catch (err) {
                onError("Failed to process PayPal payment");
              }
            }}
            onError={(err) => {
              onError(`PayPal error: ${err.toString()}`);
            }}
          />
        )}
      </Box>
    );
  }

  return null;
};
