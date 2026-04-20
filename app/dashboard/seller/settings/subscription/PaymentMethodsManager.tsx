"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
} from "@mui/material";
import {
  CreditCard as CreditCardIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from "@mui/icons-material";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useNotification } from "@/app/hooks";
import { useCSRFFetch } from "@/app/hooks";

// Initialize Stripe - lazy load only on client side
let stripePromise: ReturnType<typeof loadStripe> | null = null;

function getStripePromise() {
  if (typeof window === "undefined") {
    return null;
  }

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    console.warn(
      "[PaymentMethods] Stripe publishable key not configured. Payment methods unavailable.",
    );
    return null;
  }

  if (!stripePromise) {
    try {
      stripePromise = loadStripe(publishableKey);
    } catch (err) {
      console.error("[PaymentMethods] Failed to initialize Stripe:", err);
      stripePromise = null;
      return null;
    }
  }
  return stripePromise;
}

interface PaymentMethod {
  id: string;
  type: string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

// Card brand icons mapping
const cardBrandDisplay: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

function AddPaymentMethodForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const notify = useNotification();
  const csrfFetch = useCSRFFetch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get setup intent client secret
      const setupResponse = await csrfFetch(
        "/api/subscriptions/payment-methods",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "setup-intent" }),
        },
      );

      const setupData = await setupResponse.json();

      if (!setupData.success || !setupData.clientSecret) {
        throw new Error(setupData.message || "Failed to create setup intent");
      }

      // Confirm card setup
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const { setupIntent, error: stripeError } = await stripe.confirmCardSetup(
        setupData.clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        },
      );

      if (stripeError) {
        throw new Error(stripeError.message || "Card setup failed");
      }

      if (setupIntent?.payment_method) {
        // Attach payment method to customer
        const attachResponse = await csrfFetch(
          "/api/subscriptions/payment-methods",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "attach",
              paymentMethodId: setupIntent.payment_method,
              setAsDefault: true,
            }),
          },
        );

        const attachData = await attachResponse.json();

        if (!attachData.success) {
          throw new Error(
            attachData.message || "Failed to save payment method",
          );
        }

        notify("Payment method added successfully!", "success");
        onSuccess();
      }
    } catch (err) {
      console.error("Add payment method error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to add payment method",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Enter your card details
        </Typography>
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            p: 2,
          }}
        >
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#424770",
                  "::placeholder": {
                    color: "#aab7c4",
                  },
                },
                invalid: {
                  color: "#9e2146",
                },
              },
            }}
          />
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={!stripe || loading}
          startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
        >
          {loading ? "Adding..." : "Add Card"}
        </Button>
      </Stack>
    </form>
  );
}

function PaymentMethodsContent() {
  const notify = useNotification();
  const csrfFetch = useCSRFFetch();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/subscriptions/payment-methods");
      const data = await response.json();

      if (data.success) {
        setPaymentMethods(data.paymentMethods || []);
      } else {
        setError(data.message || "Failed to load payment methods");
      }
    } catch (err) {
      console.error("Failed to fetch payment methods:", err);
      setError("Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      setActionLoading(paymentMethodId);
      const response = await csrfFetch("/api/subscriptions/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set-default",
          paymentMethodId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        notify("Default payment method updated", "success");
        fetchPaymentMethods();
      } else {
        notify(data.message || "Failed to update default", "error");
      }
    } catch (err) {
      console.error("Set default error:", err);
      notify("Failed to update default payment method", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedMethod) return;

    try {
      setActionLoading(selectedMethod.id);
      const response = await csrfFetch("/api/subscriptions/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          paymentMethodId: selectedMethod.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        notify("Payment method removed", "success");
        setDeleteDialogOpen(false);
        setSelectedMethod(null);
        fetchPaymentMethods();
      } else {
        notify(data.message || "Failed to remove payment method", "error");
      }
    } catch (err) {
      console.error("Delete error:", err);
      notify("Failed to remove payment method", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddSuccess = () => {
    setAddDialogOpen(false);
    fetchPaymentMethods();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error}
        <Button onClick={fetchPaymentMethods} size="small" sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">Payment Methods</Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          Add New Card
        </Button>
      </Box>

      {paymentMethods.length === 0 ? (
        <Alert severity="info">
          No payment methods on file. Add a card to enable recurring payments.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {paymentMethods.map((method) => (
            <Card key={method.id} variant="outlined">
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box display="flex" alignItems="center" gap={2}>
                    <CreditCardIcon color="action" />
                    <Box>
                      <Typography variant="subtitle1">
                        {cardBrandDisplay[method.brand || ""] || method.brand}{" "}
                        •••• {method.last4}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Expires {method.expMonth}/{method.expYear}
                      </Typography>
                    </Box>
                    {method.isDefault && (
                      <Chip
                        icon={<StarIcon />}
                        label="Default"
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  <Box>
                    {!method.isDefault && (
                      <IconButton
                        onClick={() => handleSetDefault(method.id)}
                        disabled={actionLoading === method.id}
                        title="Set as default"
                      >
                        {actionLoading === method.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <StarBorderIcon />
                        )}
                      </IconButton>
                    )}
                    <IconButton
                      onClick={() => {
                        setSelectedMethod(method);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={method.isDefault || actionLoading === method.id}
                      color="error"
                      title={
                        method.isDefault
                          ? "Cannot delete default card"
                          : "Remove card"
                      }
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Add Payment Method Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Payment Method</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <AddPaymentMethodForm
              onSuccess={handleAddSuccess}
              onCancel={() => setAddDialogOpen(false)}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Remove Payment Method</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove this card ending in{" "}
            <strong>{selectedMethod?.last4}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={actionLoading === selectedMethod?.id}
          >
            {actionLoading === selectedMethod?.id ? (
              <CircularProgress size={20} />
            ) : (
              "Remove"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function PaymentMethodsManager() {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);

  useEffect(() => {
    // Only load Stripe after component mounts on client
    const promise = getStripePromise();
    if (promise) {
      promise
        .then((stripeInstance) => {
          setStripe(stripeInstance);
          setStripeError(null);
        })
        .catch((err) => {
          console.error("[PaymentMethods] Failed to load Stripe:", err);
          setStripeError(
            err instanceof Error ? err.message : "Failed to load Stripe",
          );
          setStripe(null);
        });
    }
  }, []);

  if (stripeError) {
    return (
      <Box
        sx={{
          p: 2,
          color: "error.main",
          border: "1px solid",
          borderColor: "error.main",
          borderRadius: 1,
        }}
      >
        <p>Payment methods unavailable: {stripeError}</p>
        <p style={{ fontSize: "0.875rem", marginTop: 8 }}>
          Please check your Stripe configuration and refresh the page.
        </p>
      </Box>
    );
  }

  return (
    <Elements stripe={stripe}>
      <PaymentMethodsContent />
    </Elements>
  );
}
