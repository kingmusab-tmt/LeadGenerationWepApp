"use client";
import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Box,
  Button,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  Grid,
  CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useSession } from "next-auth/react";
import Head from "next/head";

// Stripe setup
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface Tier {
  _id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  ctaText: string;
  highlight: boolean;
  isActive: boolean;
  stripePriceId?: string;
  paypalPlanId?: string;
}

const CheckoutForm = ({
  tier,
  onSuccess,
}: {
  tier: Tier;
  onSuccess: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const { data: session } = useSession();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !session?.user?.email) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: stripeError, paymentMethod } =
        await stripe.createPaymentMethod({
          type: "card",
          card: elements.getElement(CardElement)!,
        });

      if (stripeError) {
        setError(stripeError.message || "Payment failed");
        setProcessing(false);
        return;
      }

      // Send paymentMethod.id to your server
      const response = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          tierId: tier._id,
          email: session.user.email,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        onSuccess();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box mb={3}>
        <CardElement options={{ hidePostalCode: true }} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        disabled={!stripe || processing}
        size="large"
      >
        {processing ? <CircularProgress size={24} /> : `Pay $${tier.price}`}
      </Button>
    </form>
  );
};

const CheckoutPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeStep, setActiveStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<
    "stripe" | "paypal" | null
  >(null);
  const [completed, setCompleted] = useState(false);
  const [tier, setTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(
        `/auth/sign-in?callbackUrl=${encodeURIComponent(
          window.location.pathname
        )}`
      );
    }
  }, [status, router]);

  useEffect(() => {
    const fetchTier = async () => {
      const tierId = searchParams.get("tierId");
      if (!tierId) {
        router.push("/landingpage");
        return;
      }

      try {
        const response = await fetch(`/api/tiers/${tierId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch tier details");
        }
        const data = await response.json();
        if (!data.isActive) {
          throw new Error("This tier is not currently available");
        }
        setTier(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tier");
        router.push("/pricing");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchTier();
    }
  }, [status, searchParams]);

  const handlePaymentSuccess = () => {
    setActiveStep(2);
    setCompleted(true);
  };

  if (status !== "authenticated" || loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !tier) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
        <Alert severity="error">{error || "Tier not found"}</Alert>
        <Button onClick={() => router.push("/pricing")} sx={{ mt: 2 }}>
          Back to Pricing
        </Button>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Checkout | {tier.name} Plan</title>
      </Head>

      <Container maxWidth="md" sx={{ py: 6 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 6 }}>
          <Step>
            <StepLabel>Select Plan</StepLabel>
          </Step>
          <Step>
            <StepLabel>Payment Method</StepLabel>
          </Step>
          <Step>
            <StepLabel>Complete</StepLabel>
          </Step>
        </Stepper>

        {!completed ? (
          <Grid container spacing={4}>
            <Grid item xs={12} md={7}>
              <Paper elevation={3} sx={{ p: 3 }}>
                {activeStep === 0 && (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Review Your Plan
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      paragraph
                    >
                      You've selected the <strong>{tier.name}</strong> plan.
                    </Typography>

                    <List dense>
                      {tier.features.map((feature, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={feature} />
                        </ListItem>
                      ))}
                    </List>

                    <Box mt={4}>
                      <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={() => setActiveStep(1)}
                      >
                        Continue to Payment
                      </Button>
                    </Box>
                  </>
                )}

                {activeStep === 1 && (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Payment Method
                    </Typography>

                    {!paymentMethod ? (
                      <Box display="flex" flexDirection="column" gap={2}>
                        <Button
                          variant="outlined"
                          size="large"
                          onClick={() => setPaymentMethod("stripe")}
                          sx={{ py: 2 }}
                        >
                          Credit/Debit Card
                        </Button>
                        <Button
                          variant="outlined"
                          size="large"
                          onClick={() => setPaymentMethod("paypal")}
                          sx={{ py: 2 }}
                        >
                          PayPal
                        </Button>
                      </Box>
                    ) : paymentMethod === "stripe" ? (
                      <Elements stripe={stripePromise}>
                        <CheckoutForm
                          tier={tier}
                          onSuccess={handlePaymentSuccess}
                        />
                      </Elements>
                    ) : (
                      <PayPalScriptProvider
                        options={{
                          clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
                          currency: "USD",
                        }}
                      >
                        <PayPalButtons
                          style={{ layout: "vertical" }}
                          createOrder={(data, actions) => {
                            return actions.order.create({
                              purchase_units: [
                                {
                                  amount: {
                                    value: tier.price,
                                    currency_code: "USD",
                                  },
                                  description: `${tier.name} Plan Subscription`,
                                },
                              ],
                              intent: "CAPTURE",
                            });
                          }}
                          onApprove={async (data, actions) => {
                            const details = await actions.order!.capture();
                            const response = await fetch(
                              "/api/subscriptions/paypal",
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  orderID: data.orderID,
                                  tierId: tier._id,
                                }),
                              }
                            );

                            if (response.ok) {
                              handlePaymentSuccess();
                            }
                          }}
                        />
                      </PayPalScriptProvider>
                    )}
                  </>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={5}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Order Summary
                </Typography>

                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography>Plan:</Typography>
                  <Typography fontWeight="bold">{tier.name}</Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography>Price:</Typography>
                  <Typography fontWeight="bold">${tier.price}/month</Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="subtitle1">Total:</Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    ${tier.price}/month
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        ) : (
          <Paper elevation={3} sx={{ p: 6, textAlign: "center" }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 3 }} />
            <Typography variant="h4" gutterBottom>
              Payment Successful!
            </Typography>
            <Typography variant="body1" paragraph>
              Thank you for subscribing to the <strong>{tier.name}</strong>{" "}
              plan.
            </Typography>
            <Typography variant="body1" paragraph>
              Your subscription is now active. You can manage your account from
              the dashboard.
            </Typography>
            <Box mt={4}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={() => router.push("/dashboard")}
              >
                Go to Dashboard
              </Button>
            </Box>
          </Paper>
        )}
      </Container>
    </>
  );
};

export default CheckoutPage;
