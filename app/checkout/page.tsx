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
  Chip,
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
import axios from "axios";

// Stripe setup
const stripePromise = loadStripe(process.env.PUBLIC_STRIPE_PUBLIC_KEY!);

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
  tierType: string;
  discountPercentage: number;
  discountedPrice: string;
  renewalPrice: string;
  annualPrice: string;
}

const StripePaymentForm = ({
  tier,
  onSuccess,
  onError,
}: {
  tier: Tier;
  onSuccess: () => void;
  onError: (message: string) => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    onError("");

    try {
      const { error: stripeError, paymentMethod } =
        await stripe.createPaymentMethod({
          type: "card",
          card: elements.getElement(CardElement)!,
        });

      if (stripeError) throw new Error(stripeError.message || "Payment failed");

      const yearlyAmount = (parseFloat(tier.discountedPrice) * 12).toFixed(2);

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
        if (confirmError)
          throw new Error(confirmError.message || "Authentication failed");
      }

      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box mb={3}>
        <CardElement options={{ hidePostalCode: true }} />
      </Box>
      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        disabled={!stripe || processing}
        size="large"
      >
        {processing ? (
          <CircularProgress size={24} />
        ) : (
          `Pay $${(parseFloat(tier.discountedPrice) * 12).toFixed(2)}/year`
        )}
      </Button>
    </form>
  );
};

const PayPalPayment = ({
  tier,
  onSuccess,
  onError,
}: {
  tier: Tier;
  onSuccess: () => void;
  onError: (message: string) => void;
}) => {
  const yearlyAmount = (parseFloat(tier.discountedPrice) * 12).toFixed(2);

  return (
    <PayPalButtons
      style={{ layout: "vertical" }}
      createOrder={async (data, actions) => {
        try {
          const response = await axios.post("/api/payments/paypal/create", {
            tierId: tier._id,
            amount: yearlyAmount,
          });
          return response.data.orderID;
        } catch (err) {
          onError("Failed to create PayPal order");
          throw err;
        }
      }}
      onApprove={async (data, actions) => {
        try {
          const response = await axios.post("/api/payments/paypal/capture", {
            orderID: data.orderID,
            tierId: tier._id,
          });
          if (response.data.success) onSuccess();
          else onError(response.data.message || "Payment failed");
        } catch (err) {
          onError("Failed to process PayPal payment");
        }
      }}
      onError={(err) => {
        onError(`PayPal error: ${err.toString()}`);
      }}
    />
  );
};

const PaymentSection = ({
  tier,
  paymentMethod,
  onSuccess,
  onError,
}: {
  tier: Tier;
  paymentMethod: "stripe" | "paypal";
  onSuccess: () => void;
  onError: (message: string) => void;
}) => {
  return (
    <Box>
      {paymentMethod === "stripe" && (
        <Elements stripe={stripePromise}>
          <StripePaymentForm
            tier={tier}
            onSuccess={onSuccess}
            onError={onError}
          />
        </Elements>
      )}
      {paymentMethod === "paypal" && (
        <PayPalPayment tier={tier} onSuccess={onSuccess} onError={onError} />
      )}
    </Box>
  );
};

const CheckoutPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const [activeStep, setActiveStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<
    "stripe" | "paypal" | null
  >(null);
  const [completed, setCompleted] = useState(false);
  const [tier, setTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);

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
    const fetchPaypalClientId = async () => {
      try {
        const response = await axios.get("/api/paypalapi/getpaypalapiclientid");
        setPaypalClientId(response.data.clientId);
      } catch (error) {
        console.error("Failed to fetch PayPal client ID:", error);
        setError("Failed to initialize PayPal");
      }
    };

    const fetchTier = async () => {
      const planId = searchParams.get("plan");
      if (!planId) {
        router.push("/plan");
        return;
      }

      try {
        const response = await axios.get(
          `/api/subscriptions/tiers?tierId=${planId}`
        );
        if (!response.data.isActive) {
          throw new Error("This tier is not currently available");
        }
        setTier(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tier");
        router.push("/plan");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchPaypalClientId();
      fetchTier();
    }
  }, [status, searchParams, router]);

  const handlePaymentSuccess = () => {
    setActiveStep(2);
    setCompleted(true);
  };

  const handlePaymentError = (message: string) => {
    setError(message);
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
        <Alert severity="error">{error || "Plan not found"}</Alert>
        <Button onClick={() => router.push("/plan")} sx={{ mt: 2 }}>
          Back to plan
        </Button>
      </Container>
    );
  }

  const yearlyAmount = (parseFloat(tier.discountedPrice) * 12).toFixed(2);

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
                {activeStep === 0 ? (
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

                    <Box mb={3}>
                      {tier.discountPercentage > 0 && (
                        <Chip
                          label={`${tier.discountPercentage}% OFF`}
                          color="success"
                          size="small"
                          sx={{ mb: 1 }}
                        />
                      )}
                      <Typography variant="body1" paragraph>
                        {tier.description}
                      </Typography>
                    </Box>

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
                ) : (
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
                    ) : (
                      <PayPalScriptProvider
                        options={{
                          clientId: paypalClientId || "",
                          currency: "USD",
                          intent: "capture",
                          components: "buttons",
                        }}
                      >
                        <PaymentSection
                          tier={tier}
                          paymentMethod={paymentMethod}
                          onSuccess={handlePaymentSuccess}
                          onError={handlePaymentError}
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

                {tier.discountPercentage > 0 && (
                  <>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography>Original Price:</Typography>
                      <Typography sx={{ textDecoration: "line-through" }}>
                        ${tier.price}/month
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={2}>
                      <Typography>Discount:</Typography>
                      <Typography color="success.main">
                        {tier.discountPercentage}% OFF
                      </Typography>
                    </Box>
                  </>
                )}

                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography>Monthly Price:</Typography>
                  <Typography fontWeight="bold">
                    ${tier.discountedPrice}/month
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography>Billed Yearly:</Typography>
                  <Typography fontWeight="bold">
                    ${yearlyAmount}/year
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="subtitle1">Total Today:</Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    ${yearlyAmount}
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
              Your yearly subscription is now active. You can manage your
              account from the dashboard.
            </Typography>
            <Box mt={4}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={() =>
                  router.push(`/dashboard/${session?.user?.role}/overview`)
                }
              >
                Go to Dashboard
              </Button>
            </Box>
          </Paper>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Container>
    </>
  );
};

export default CheckoutPage;
