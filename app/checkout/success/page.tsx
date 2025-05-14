//"original working code"

// "use client";
// import React, { useEffect, useState } from "react";
// import "@stripe/stripe-js";
// import {
//   Container,
//   Typography,
//   Stepper,
//   Step,
//   StepLabel,
//   Box,
//   Button,
//   Paper,
//   Divider,
//   List,
//   ListItem,
//   ListItemText,
//   Alert,
//   Grid,
//   CircularProgress,
//   Chip,
// } from "@mui/material";
// import CheckCircleIcon from "@mui/icons-material/CheckCircle";
// import { useRouter, useSearchParams } from "next/navigation";
// import { loadStripe } from "@stripe/stripe-js";
// import {
//   Elements,
//   CardElement,
//   useStripe,
//   useElements,
// } from "@stripe/react-stripe-js";
// import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
// import { useSession } from "next-auth/react";
// import Head from "next/head";
// import axios from "axios";
// import { useStripePromise } from "@/lib/useStripePromise";

// const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);
// if (!stripePromise) {
//   console.error("Stripe failed to initialize");
// }

// interface Tier {
//   _id: string;
//   name: string;
//   price: string;
//   description: string;
//   features: string[];
//   ctaText: string;
//   highlight: boolean;
//   isActive: boolean;
//   stripePriceId?: string;
//   paypalPlanId?: string;
//   tierType: string;
//   discountPercentage: number;
//   discountedPrice: string;
//   renewalPrice: string;
//   annualPrice: string;
// }

// // Replace your StripePaymentForm component with this updated version
// const StripePaymentForm = ({
//   tier,
//   onSuccess,
//   onError,
// }: {
//   tier: Tier;
//   onSuccess: () => void;
//   onError: (message: string) => void;
// }) => {
//   const stripe = useStripe();
//   const elements = useElements();
//   const [processing, setProcessing] = useState(false);
//   const [stripeReady, setStripeReady] = useState(false);
//   const [cardComplete, setCardComplete] = useState(false);

//   useEffect(() => {
//     if (stripe && elements) {
//       setStripeReady(true);
//     }
//   }, [stripe, elements]);

//   // Add card element change handler
//   const handleCardChange = (event: any) => {
//     setCardComplete(event.complete);
//   };

//   const handleSubmit = async (event: React.FormEvent) => {
//     event.preventDefault();

//     if (!stripe || !elements) {
//       onError("Payment system not ready. Please try again.");
//       return;
//     }

//     setProcessing(true);
//     onError("");

//     try {
//       const cardElement = elements.getElement(CardElement);

//       if (!cardElement) {
//         throw new Error("Card element not found");
//       }

//       const { error: stripeError, paymentMethod } =
//         await stripe.createPaymentMethod({
//           type: "card",
//           card: cardElement,
//         });

//       if (stripeError) {
//         throw new Error(stripeError.message || "Payment failed");
//       }

//       const yearlyAmount = (parseFloat(tier.discountedPrice) * 12).toFixed(2);

//       const response = await axios.post("/api/payments/stripe", {
//         paymentMethodId: paymentMethod?.id,
//         tierId: tier._id,
//         amount: yearlyAmount,
//         isYearly: true,
//       });

//       if (response.data.requiresAction) {
//         const { error: confirmError } = await stripe.confirmCardPayment(
//           response.data.clientSecret
//         );
//         if (confirmError) throw new Error(confirmError.message);
//       }

//       onSuccess();
//     } catch (err) {
//       onError(err instanceof Error ? err.message : "Payment failed");
//     } finally {
//       setProcessing(false);
//     }
//   };

//   if (!stripeReady) {
//     return (
//       <Box
//         sx={{
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//           gap: 2,
//           p: 3,
//         }}
//       >
//         <CircularProgress size={24} />
//         <Typography>Loading payment form...</Typography>
//       </Box>
//     );
//   }

//   return (
//     <form onSubmit={handleSubmit}>
//       <Box
//         sx={{
//           mb: 3,
//           p: 2,
//           border: "1px solid #eee",
//           borderRadius: 1,
//         }}
//       >
//         <CardElement
//           options={{
//             hidePostalCode: true,
//             style: {
//               base: {
//                 fontSize: "16px",
//                 color: "#424770",
//                 "::placeholder": {
//                   color: "#aab7c4",
//                 },
//                 padding: "10px",
//               },
//               invalid: {
//                 color: "#ff0000",
//               },
//             },
//           }}
//           onChange={handleCardChange}
//         />
//       </Box>
//       <Button
//         type="submit"
//         variant="contained"
//         color="primary"
//         fullWidth
//         disabled={!stripe || processing || !cardComplete}
//         size="large"
//         sx={{ height: 48 }}
//       >
//         {processing ? (
//           <CircularProgress size={24} />
//         ) : (
//           `Pay $${(parseFloat(tier.discountedPrice) * 12).toFixed(2)}/year`
//         )}
//       </Button>
//     </form>
//   );
// };

// const PayPalPayment = ({
//   tier,
//   onSuccess,
//   onError,
// }: {
//   tier: Tier;
//   onSuccess: () => void;
//   onError: (message: string) => void;
// }) => {
//   const yearlyAmount = (parseFloat(tier.discountedPrice) * 12).toFixed(2);

//   return (
//     <PayPalButtons
//       style={{ layout: "vertical" }}
//       createOrder={async (data, actions) => {
//         try {
//           const response = await axios.post("/api/payments/paypal/create", {
//             tierId: tier._id,
//             amount: yearlyAmount,
//           });
//           return response.data.orderID;
//         } catch (err) {
//           onError("Failed to create PayPal order");
//           throw err;
//         }
//       }}
//       onApprove={async (data, actions) => {
//         try {
//           const response = await axios.post("/api/payments/paypal/capture", {
//             orderID: data.orderID,
//             tierId: tier._id,
//           });
//           if (response.data.success) onSuccess();
//           else onError(response.data.message || "Payment failed");
//         } catch (err) {
//           onError("Failed to process PayPal payment");
//         }
//       }}
//       onError={(err) => {
//         onError(`PayPal error: ${err.toString()}`);
//       }}
//     />
//   );
// };

// const PaymentSection = ({
//   tier,
//   paymentMethod,
//   onSuccess,
//   onError,
// }: {
//   tier: Tier;
//   paymentMethod: "stripe" | "paypal";
//   onSuccess: () => void;
//   onError: (message: string) => void;
// }) => {
//   const stripePromise = useStripePromise();
//   const [stripeLoaded, setStripeLoaded] = useState(false);

//   useEffect(() => {
//     if (paymentMethod === "stripe" && stripePromise) {
//       setStripeLoaded(true);
//     }
//   }, [paymentMethod, stripePromise]);

//   if (paymentMethod === "stripe" && !stripeLoaded) {
//     return (
//       <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
//         <CircularProgress />
//         <Typography variant="body2" sx={{ ml: 2 }}>
//           Loading Stripe...
//         </Typography>
//       </Box>
//     );
//   }

//   return (
//     <Box>
//       {paymentMethod === "stripe" && stripeLoaded && (
//         <Elements stripe={stripePromise}>
//           <StripePaymentForm
//             tier={tier}
//             onSuccess={onSuccess}
//             onError={onError}
//           />
//         </Elements>
//       )}
//       {paymentMethod === "paypal" && (
//         <PayPalPayment tier={tier} onSuccess={onSuccess} onError={onError} />
//       )}
//     </Box>
//   );
// };

// const CheckoutContent = () => {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const { data: session, status } = useSession();

//   const [activeStep, setActiveStep] = useState(0);
//   const [paymentMethod, setPaymentMethod] = useState<
//     "stripe" | "paypal" | null
//   >(null);
//   const [completed, setCompleted] = useState(false);
//   const [tier, setTier] = useState<Tier | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [paypalClientId, setPaypalClientId] = useState<string | null>(null);

//   useEffect(() => {
//     if (status === "unauthenticated") {
//       router.push(
//         `/auth/sign-in?callbackUrl=${encodeURIComponent(
//           window.location.pathname
//         )}`
//       );
//     }
//   }, [status, router]);

//   useEffect(() => {
//     const fetchPaypalClientId = async () => {
//       try {
//         const response = await axios.get("/api/paypalapi/getpaypalapiclientid");
//         setPaypalClientId(response.data.clientId);
//       } catch (error) {
//         console.error("Failed to fetch PayPal client ID:", error);
//         setError("Failed to initialize PayPal");
//       }
//     };

//     const fetchTier = async () => {
//       const planId = searchParams.get("plan");
//       if (!planId) {
//         router.push("/plan");
//         return;
//       }

//       try {
//         const response = await axios.get(
//           `/api/subscriptions/tiers?tierId=${planId}`
//         );
//         if (!response.data.isActive) {
//           throw new Error("This tier is not currently available");
//         }
//         setTier(response.data);
//       } catch (err) {
//         setError(err instanceof Error ? err.message : "Failed to load tier");
//         router.push("/plan");
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (status === "authenticated") {
//       fetchPaypalClientId();
//       fetchTier();
//     }
//   }, [status, searchParams, router]);

//   const handlePaymentSuccess = () => {
//     setActiveStep(2);
//     setCompleted(true);
//   };

//   const handlePaymentError = (message: string) => {
//     setError(message);
//   };

//   if (status !== "authenticated" || loading) {
//     return (
//       <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
//         <CircularProgress />
//       </Container>
//     );
//   }

//   if (error || !tier) {
//     return (
//       <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
//         <Alert severity="error">{error || "Plan not found"}</Alert>
//         <Button onClick={() => router.push("/plan")} sx={{ mt: 2 }}>
//           Back to plan
//         </Button>
//       </Container>
//     );
//   }

//   const yearlyAmount = (parseFloat(tier.discountedPrice) * 12).toFixed(2);

//   const handlePaymentMethodSelect = (method: "stripe" | "paypal") => {
//     console.log("Selected payment method:", method);
//     setPaymentMethod(method);
//   };

//   return (
//     <>
//       <Head>
//         <title>Checkout | {tier.name} Plan</title>
//       </Head>

//       <Container maxWidth="md" sx={{ py: 6 }}>
//         <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 6 }}>
//           <Step>
//             <StepLabel>Select Plan</StepLabel>
//           </Step>
//           <Step>
//             <StepLabel>Payment Method</StepLabel>
//           </Step>
//           <Step>
//             <StepLabel>Complete</StepLabel>
//           </Step>
//         </Stepper>

//         {!completed ? (
//           <Grid container spacing={4}>
//             <Grid item xs={12} md={7}>
//               <Paper elevation={3} sx={{ p: 3 }}>
//                 {activeStep === 0 ? (
//                   <>
//                     <Typography variant="h6" gutterBottom>
//                       Review Your Plan
//                     </Typography>
//                     <Typography
//                       variant="body1"
//                       color="text.secondary"
//                       paragraph
//                     >
//                       You've selected the <strong>{tier.name}</strong> plan.
//                     </Typography>

//                     <Box mb={3}>
//                       {tier.discountPercentage > 0 && (
//                         <Chip
//                           label={`${tier.discountPercentage}% OFF`}
//                           color="success"
//                           size="small"
//                           sx={{ mb: 1 }}
//                         />
//                       )}
//                       <Typography variant="body1" paragraph>
//                         {tier.description}
//                       </Typography>
//                     </Box>

//                     <List dense>
//                       {tier.features.map((feature, index) => (
//                         <ListItem key={index}>
//                           <ListItemText primary={feature} />
//                         </ListItem>
//                       ))}
//                     </List>

//                     <Box mt={4}>
//                       <Button
//                         variant="contained"
//                         color="primary"
//                         fullWidth
//                         onClick={() => setActiveStep(1)}
//                       >
//                         Continue to Payment
//                       </Button>
//                     </Box>
//                   </>
//                 ) : (
//                   <>
//                     <Typography variant="h6" gutterBottom>
//                       Payment Method
//                     </Typography>

//                     {!paymentMethod ? (
//                       <Box display="flex" flexDirection="column" gap={2}>
//                         <Button
//                           variant="outlined"
//                           size="large"
//                           onClick={() => setPaymentMethod("stripe")}
//                           sx={{ py: 2 }}
//                         >
//                           Stripe
//                         </Button>
//                         <Button
//                           variant="outlined"
//                           size="large"
//                           onClick={() => setPaymentMethod("paypal")}
//                           sx={{ py: 2 }}
//                         >
//                           PayPal
//                         </Button>
//                       </Box>
//                     ) : (
//                       <PayPalScriptProvider
//                         options={{
//                           clientId: paypalClientId || "",
//                           currency: "USD",
//                           intent: "capture",
//                           components: "buttons",
//                         }}
//                       >
//                         <PaymentSection
//                           tier={tier}
//                           paymentMethod={paymentMethod}
//                           onSuccess={handlePaymentSuccess}
//                           onError={handlePaymentError}
//                         />
//                       </PayPalScriptProvider>
//                     )}
//                   </>
//                 )}
//               </Paper>
//             </Grid>

//             <Grid item xs={12} md={5}>
//               <Paper elevation={3} sx={{ p: 3 }}>
//                 <Typography variant="h6" gutterBottom>
//                   Order Summary
//                 </Typography>

//                 <Box display="flex" justifyContent="space-between" mb={2}>
//                   <Typography>Plan:</Typography>
//                   <Typography fontWeight="bold">{tier.name}</Typography>
//                 </Box>

//                 {tier.discountPercentage > 0 && (
//                   <>
//                     <Box display="flex" justifyContent="space-between" mb={1}>
//                       <Typography>Original Price:</Typography>
//                       <Typography sx={{ textDecoration: "line-through" }}>
//                         ${tier.price}/month
//                       </Typography>
//                     </Box>
//                     <Box display="flex" justifyContent="space-between" mb={2}>
//                       <Typography>Discount:</Typography>
//                       <Typography color="success.main">
//                         {tier.discountPercentage}% OFF
//                       </Typography>
//                     </Box>
//                   </>
//                 )}

//                 <Box display="flex" justifyContent="space-between" mb={2}>
//                   <Typography>Monthly Price:</Typography>
//                   <Typography fontWeight="bold">
//                     ${tier.discountedPrice}/month
//                   </Typography>
//                 </Box>

//                 <Box display="flex" justifyContent="space-between" mb={2}>
//                   <Typography>Billed Yearly:</Typography>
//                   <Typography fontWeight="bold">
//                     ${yearlyAmount}/year
//                   </Typography>
//                 </Box>

//                 <Divider sx={{ my: 2 }} />

//                 <Box display="flex" justifyContent="space-between">
//                   <Typography variant="subtitle1">Total Today:</Typography>
//                   <Typography variant="subtitle1" fontWeight="bold">
//                     ${yearlyAmount}
//                   </Typography>
//                 </Box>
//               </Paper>
//             </Grid>
//           </Grid>
//         ) : (
//           <Paper elevation={3} sx={{ p: 6, textAlign: "center" }}>
//             <CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 3 }} />
//             <Typography variant="h4" gutterBottom>
//               Payment Successful!
//             </Typography>
//             <Typography variant="body1" paragraph>
//               Thank you for subscribing to the <strong>{tier.name}</strong>{" "}
//               plan.
//             </Typography>
//             <Typography variant="body1" paragraph>
//               Your yearly subscription is now active. You can manage your
//               account from the dashboard.
//             </Typography>
//             <Box mt={4}>
//               <Button
//                 variant="contained"
//                 color="primary"
//                 size="large"
//                 onClick={() =>
//                   router.push(`/dashboard/${session?.user?.role}/overview`)
//                 }
//               >
//                 Go to Dashboard
//               </Button>
//             </Box>
//           </Paper>
//         )}

//         {error && (
//           <Alert severity="error" sx={{ mt: 2 }}>
//             {error}
//           </Alert>
//         )}
//       </Container>
//     </>
//   );
// };

// export default CheckoutContent;
//second working code
// "use client";
// import React, { useEffect, useState } from "react";
// import {
//   Container,
//   Typography,
//   Stepper,
//   Step,
//   StepLabel,
//   Box,
//   Button,
//   Paper,
//   Divider,
//   List,
//   ListItem,
//   ListItemText,
//   Alert,
//   Grid,
//   CircularProgress,
//   Chip,
//   Select,
//   MenuItem,
//   FormControl,
//   InputLabel,
// } from "@mui/material";
// import CheckCircleIcon from "@mui/icons-material/CheckCircle";
// import { useRouter, useSearchParams } from "next/navigation";
// import { loadStripe } from "@stripe/stripe-js";
// import { useSession } from "next-auth/react";
// import Head from "next/head";
// import axios from "axios";
// import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

// const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

// interface Tier {
//   _id: string;
//   name: string;
//   price: string;
//   description: string;
//   features: string[];
//   ctaText: string;
//   highlight: boolean;
//   isActive: boolean;
//   stripePriceId?: string;
//   paypalPlanId?: string;
//   tierType: string;
//   discountPercentage: number;
//   discountedPrice: string;
//   renewalPrice: string;
//   annualPrice: string;
// }

// const StripeCheckoutButton = ({
//   tier,
//   duration,
//   onSuccess,
//   onError,
//   onCancel,
// }: {
//   tier: Tier;
//   duration: number;
//   onSuccess: () => void;
//   onError: (message: string) => void;
//   onCancel: () => void;
// }) => {
//   const [loading, setLoading] = useState(false);

//   const handleCheckout = async () => {
//     setLoading(true);
//     onError("");

//     try {
//       const response = await axios.post("/api/stripeapi/stripecheckoutapi", {
//         tierId: tier._id,
//         durationMonths: duration,
//       });

//       const stripe = await stripePromise;
//       if (!stripe) throw new Error("Stripe not initialized");

//       const { error } = await stripe.redirectToCheckout({
//         sessionId: response.data.sessionId,
//       });

//       if (error) throw error;

//       // Start polling for payment status
//       startPaymentStatusPolling(response.data.sessionId);
//     } catch (err) {
//       onError(err instanceof Error ? err.message : "Payment failed");
//       setLoading(false);
//     }
//   };

//   const startPaymentStatusPolling = (sessionId: string) => {
//     const pollingInterval = setInterval(async () => {
//       try {
//         const response = await axios.get(
//           `/api/payments/status?sessionId=${sessionId}`
//         );

//         if (response.data.status === "succeeded") {
//           clearInterval(pollingInterval);
//           onSuccess();
//         } else if (response.data.status === "canceled") {
//           clearInterval(pollingInterval);
//           onCancel();
//         }
//       } catch (error) {
//         console.error("Polling error:", error);
//         // Don't stop polling on temporary errors
//       }
//     }, 3000); // Poll every 3 seconds

//     // Cleanup interval on component unmount
//     return () => clearInterval(pollingInterval);
//   };

//   return (
//     <Button
//       onClick={handleCheckout}
//       variant="contained"
//       color="primary"
//       fullWidth
//       disabled={loading}
//       size="large"
//       sx={{ height: 48 }}
//     >
//       {loading ? (
//         <CircularProgress size={24} />
//       ) : (
//         `Pay $${(parseFloat(tier.discountedPrice) * duration).toFixed(2)}`
//       )}
//     </Button>
//   );
// };

// const PayPalPayment = ({
//   tier,
//   duration,
//   onSuccess,
//   onError,
// }: {
//   tier: Tier;
//   duration: number;
//   onSuccess: () => void;
//   onError: (message: string) => void;
// }) => {
//   const totalAmount = parseFloat(tier.discountedPrice) * duration;

//   return (
//     <PayPalButtons
//       style={{ layout: "vertical" }}
//       createOrder={async (data, actions) => {
//         try {
//           const response = await axios.post("/api/payments/paypal/create", {
//             tierId: tier._id,
//             amount: totalAmount.toFixed(2),
//             durationMonths: duration,
//           });
//           return response.data.orderID;
//         } catch (err) {
//           onError("Failed to create PayPal order");
//           throw err;
//         }
//       }}
//       onApprove={async (data, actions) => {
//         try {
//           const response = await axios.post("/api/payments/paypal/capture", {
//             orderID: data.orderID,
//             tierId: tier._id,
//             durationMonths: duration,
//           });
//           if (response.data.success) onSuccess();
//           else onError(response.data.message || "Payment failed");
//         } catch (err) {
//           onError("Failed to process PayPal payment");
//         }
//       }}
//       onCancel={() => {
//         onError("Payment was canceled");
//       }}
//       onError={(err) => {
//         onError(`PayPal error: ${err.toString()}`);
//       }}
//     />
//   );
// };

// const PaymentSection = ({
//   tier,
//   paymentMethod,
//   duration,
//   onSuccess,
//   onError,
//   onCancel,
// }: {
//   tier: Tier;
//   paymentMethod: "stripe" | "paypal";
//   duration: number;
//   onSuccess: () => void;
//   onError: (message: string) => void;
//   onCancel: () => void;
// }) => {
//   return (
//     <Box>
//       {paymentMethod === "stripe" && (
//         <StripeCheckoutButton
//           tier={tier}
//           duration={duration}
//           onSuccess={onSuccess}
//           onError={onError}
//           onCancel={onCancel}
//         />
//       )}
//       {paymentMethod === "paypal" && (
//         <PayPalPayment
//           tier={tier}
//           duration={duration}
//           onSuccess={onSuccess}
//           onError={onError}
//         />
//       )}
//     </Box>
//   );
// };

// const CheckoutContent = () => {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const { data: session, status } = useSession();

//   const [activeStep, setActiveStep] = useState(0);
//   const [paymentMethod, setPaymentMethod] = useState<
//     "stripe" | "paypal" | null
//   >(null);
//   const [duration, setDuration] = useState<number>(1);
//   const [completed, setCompleted] = useState(false);
//   const [tier, setTier] = useState<Tier | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
//   const [paymentProcessing, setPaymentProcessing] = useState(false);

//   useEffect(() => {
//     if (status === "unauthenticated") {
//       router.push(
//         `/auth/sign-in?callbackUrl=${encodeURIComponent(
//           window.location.pathname
//         )}`
//       );
//     }
//   }, [status, router]);

//   useEffect(() => {
//     const fetchPaypalClientId = async () => {
//       try {
//         const response = await axios.get("/api/paypalapi/getpaypalapiclientid");
//         setPaypalClientId(response.data.clientId);
//       } catch (error) {
//         console.error("Failed to fetch PayPal client ID:", error);
//         setError("Failed to initialize PayPal");
//       }
//     };

//     const fetchTier = async () => {
//       const planId = searchParams.get("plan");
//       if (!planId) {
//         router.push("/plan");
//         return;
//       }

//       try {
//         const response = await axios.get(
//           `/api/subscriptions/tiers?tierId=${planId}`
//         );
//         if (!response.data.isActive) {
//           throw new Error("This tier is not currently available");
//         }
//         setTier(response.data);
//       } catch (err) {
//         setError(err instanceof Error ? err.message : "Failed to load tier");
//         router.push("/plan");
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (status === "authenticated") {
//       fetchPaypalClientId();
//       fetchTier();
//     }
//   }, [status, searchParams, router]);

//   const handlePaymentSuccess = () => {
//     setActiveStep(2);
//     setCompleted(true);
//     setPaymentProcessing(false);
//   };

//   const handlePaymentError = (message: string) => {
//     setError(message);
//     setPaymentProcessing(false);
//   };

//   const handlePaymentCancel = () => {
//     setError("Payment was canceled");
//     setPaymentProcessing(false);
//   };

//   const handlePaymentMethodSelect = (method: "stripe" | "paypal") => {
//     setPaymentMethod(method);
//     setPaymentProcessing(true);
//   };

//   if (status !== "authenticated" || loading) {
//     return (
//       <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
//         <CircularProgress />
//       </Container>
//     );
//   }

//   if (error || !tier) {
//     return (
//       <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
//         <Alert severity="error">{error || "Plan not found"}</Alert>
//         <Button onClick={() => router.push("/plan")} sx={{ mt: 2 }}>
//           Back to plan
//         </Button>
//       </Container>
//     );
//   }

//   const totalAmount = parseFloat(tier.discountedPrice) * duration;

//   return (
//     <>
//       <Head>
//         <title>Checkout | {tier.name} Plan</title>
//       </Head>

//       <Container maxWidth="md" sx={{ py: 6 }}>
//         <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 6 }}>
//           <Step>
//             <StepLabel>Select Plan</StepLabel>
//           </Step>
//           <Step>
//             <StepLabel>Payment Method</StepLabel>
//           </Step>
//           <Step>
//             <StepLabel>Complete</StepLabel>
//           </Step>
//         </Stepper>

//         {!completed ? (
//           <Grid container spacing={4}>
//             <Grid item xs={12} md={7}>
//               <Paper elevation={3} sx={{ p: 3 }}>
//                 {activeStep === 0 ? (
//                   <>
//                     <Typography variant="h6" gutterBottom>
//                       Review Your Plan
//                     </Typography>
//                     <Typography
//                       variant="body1"
//                       color="text.secondary"
//                       paragraph
//                     >
//                       You've selected the <strong>{tier.name}</strong> plan.
//                     </Typography>

//                     <Box mb={3}>
//                       {tier.discountPercentage > 0 && (
//                         <Chip
//                           label={`${tier.discountPercentage}% OFF`}
//                           color="success"
//                           size="small"
//                           sx={{ mb: 1 }}
//                         />
//                       )}
//                       <Typography variant="body1" paragraph>
//                         {tier.description}
//                       </Typography>
//                     </Box>

//                     <FormControl fullWidth sx={{ mb: 3 }}>
//                       <InputLabel id="duration-label">
//                         Subscription Duration
//                       </InputLabel>
//                       <Select
//                         labelId="duration-label"
//                         value={duration}
//                         label="Subscription Duration"
//                         onChange={(e) => setDuration(Number(e.target.value))}
//                       >
//                         {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
//                           (months) => (
//                             <MenuItem key={months} value={months}>
//                               {months} month{months !== 1 ? "s" : ""}
//                             </MenuItem>
//                           )
//                         )}
//                       </Select>
//                     </FormControl>

//                     <List dense>
//                       {tier.features.map((feature, index) => (
//                         <ListItem key={index}>
//                           <ListItemText primary={feature} />
//                         </ListItem>
//                       ))}
//                     </List>

//                     <Box mt={4}>
//                       <Button
//                         variant="contained"
//                         color="primary"
//                         fullWidth
//                         onClick={() => setActiveStep(1)}
//                       >
//                         Continue to Payment
//                       </Button>
//                     </Box>
//                   </>
//                 ) : (
//                   <>
//                     <Typography variant="h6" gutterBottom>
//                       Payment Method
//                     </Typography>

//                     {!paymentMethod ? (
//                       <Box display="flex" flexDirection="column" gap={2}>
//                         <Button
//                           variant="outlined"
//                           size="large"
//                           onClick={() => handlePaymentMethodSelect("stripe")}
//                           sx={{ py: 2 }}
//                         >
//                           Stripe
//                         </Button>
//                         <Button
//                           variant="outlined"
//                           size="large"
//                           onClick={() => handlePaymentMethodSelect("paypal")}
//                           sx={{ py: 2 }}
//                         >
//                           PayPal
//                         </Button>
//                       </Box>
//                     ) : (
//                       <PayPalScriptProvider
//                         options={{
//                           clientId: paypalClientId || "",
//                           currency: "USD",
//                           intent: "capture",
//                           components: "buttons",
//                         }}
//                       >
//                         <PaymentSection
//                           tier={tier}
//                           paymentMethod={paymentMethod}
//                           duration={duration}
//                           onSuccess={handlePaymentSuccess}
//                           onError={handlePaymentError}
//                           onCancel={handlePaymentCancel}
//                         />
//                       </PayPalScriptProvider>
//                     )}
//                   </>
//                 )}
//               </Paper>
//             </Grid>

//             <Grid item xs={12} md={5}>
//               <Paper elevation={3} sx={{ p: 3 }}>
//                 <Typography variant="h6" gutterBottom>
//                   Order Summary
//                 </Typography>

//                 <Box display="flex" justifyContent="space-between" mb={2}>
//                   <Typography>Plan:</Typography>
//                   <Typography fontWeight="bold">{tier.name}</Typography>
//                 </Box>

//                 <Box display="flex" justifyContent="space-between" mb={2}>
//                   <Typography>Duration:</Typography>
//                   <Typography fontWeight="bold">
//                     {duration} month{duration !== 1 ? "s" : ""}
//                   </Typography>
//                 </Box>

//                 {tier.discountPercentage > 0 && (
//                   <>
//                     <Box display="flex" justifyContent="space-between" mb={1}>
//                       <Typography>Original Price:</Typography>
//                       <Typography sx={{ textDecoration: "line-through" }}>
//                         ${(parseFloat(tier.price) * duration).toFixed(2)}
//                       </Typography>
//                     </Box>
//                     <Box display="flex" justifyContent="space-between" mb={2}>
//                       <Typography>Discount:</Typography>
//                       <Typography color="success.main">
//                         {tier.discountPercentage}% OFF
//                       </Typography>
//                     </Box>
//                   </>
//                 )}

//                 <Box display="flex" justifyContent="space-between" mb={2}>
//                   <Typography>Monthly Price:</Typography>
//                   <Typography fontWeight="bold">
//                     ${tier.discountedPrice}/month
//                   </Typography>
//                 </Box>

//                 <Divider sx={{ my: 2 }} />

//                 <Box display="flex" justifyContent="space-between">
//                   <Typography variant="subtitle1">Total Today:</Typography>
//                   <Typography variant="subtitle1" fontWeight="bold">
//                     ${totalAmount.toFixed(2)}
//                   </Typography>
//                 </Box>
//               </Paper>
//             </Grid>
//           </Grid>
//         ) : (
//           <Paper elevation={3} sx={{ p: 6, textAlign: "center" }}>
//             <CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 3 }} />
//             <Typography variant="h4" gutterBottom>
//               Payment Successful!
//             </Typography>
//             <Typography variant="body1" paragraph>
//               Thank you for subscribing to the <strong>{tier.name}</strong>{" "}
//               plan.
//             </Typography>
//             <Typography variant="body1" paragraph>
//               Your {duration}-month subscription is now active. You can manage
//               your account from the dashboard.
//             </Typography>
//             <Box mt={4}>
//               <Button
//                 variant="contained"
//                 color="primary"
//                 size="large"
//                 onClick={() =>
//                   router.push(`/dashboard/${session?.user?.role}/overview`)
//                 }
//               >
//                 Go to Dashboard
//               </Button>
//             </Box>
//           </Paper>
//         )}

//         {error && (
//           <Alert severity="error" sx={{ mt: 2 }}>
//             {error}
//           </Alert>
//         )}
//       </Container>
//     </>
//   );
// };

// export default CheckoutContent;
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { useSession } from "next-auth/react";
import Head from "next/head";
import axios from "axios";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

interface Tier {
  _id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  ctaText: string;
  highlight: boolean;
  isActive: boolean;
  tierType: string;
  discountPercentage: number;
  discountedPrice: string;
}

const StripeCheckoutButton = ({
  tier,
  duration,
  onSuccess,
  onError,
}: {
  tier: Tier;
  duration: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}) => {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    onError("");

    try {
      const response = await axios.post("/api/stripeapi/stripecheckoutapi", {
        tierId: tier._id,
        durationMonths: duration,
      });

      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe not initialized");

      const { error } = await stripe.redirectToCheckout({
        sessionId: response.data.sessionId,
      });

      if (error) throw error;
    } catch (err) {
      onError(err instanceof Error ? err.message : "Payment failed");
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      variant="contained"
      color="primary"
      fullWidth
      disabled={loading}
      size="large"
      sx={{ height: 48 }}
    >
      {loading ? (
        <CircularProgress size={24} />
      ) : (
        `Pay $${(
          parseFloat(tier.discountedPrice || tier.price) * duration
        ).toFixed(2)} for ${duration} month${duration !== 1 ? "s" : ""}`
      )}
    </Button>
  );
};

const PayPalPayment = ({
  tier,
  duration,
  onSuccess,
  onError,
}: {
  tier: Tier;
  duration: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}) => {
  const totalAmount = parseFloat(tier.discountedPrice) * duration;

  return (
    <PayPalButtons
      style={{ layout: "vertical" }}
      createOrder={async (data, actions) => {
        try {
          const response = await axios.post("/api/payments/paypal/create", {
            tierId: tier._id,
            amount: totalAmount.toFixed(2),
            durationMonths: duration,
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
            durationMonths: duration,
          });
          if (response.data.success) onSuccess();
          else onError(response.data.message || "Payment failed");
        } catch (err) {
          onError("Failed to process PayPal payment");
        }
      }}
      onCancel={() => {
        onError("Payment was canceled");
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
  duration,
  onSuccess,
  onError,
}: {
  tier: Tier;
  paymentMethod: "stripe" | "paypal";
  duration: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}) => {
  return (
    <Box>
      {paymentMethod === "stripe" && (
        <StripeCheckoutButton
          tier={tier}
          duration={duration}
          onSuccess={onSuccess}
          onError={onError}
        />
      )}
      {paymentMethod === "paypal" && (
        <PayPalPayment
          tier={tier}
          duration={duration}
          onSuccess={onSuccess}
          onError={onError}
        />
      )}
    </Box>
  );
};

const CheckoutContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [activeStep, setActiveStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<
    "stripe" | "paypal" | null
  >(null);
  const [duration, setDuration] = useState<number>(1);
  const [completed, setCompleted] = useState(false);
  const [tier, setTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [isCanceled, setIsCanceled] = useState(false);

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
    // Check for canceled payment
    if (searchParams.get("canceled") === "true") {
      setError("Payment was canceled");
      setIsCanceled(true);
    }
  }, [searchParams]);

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

  const handlePaymentMethodSelect = (method: "stripe" | "paypal") => {
    setPaymentMethod(method);
  };

  const handleCancelOrder = () => {
    setCancelModalOpen(true);
  };

  const confirmCancelOrder = () => {
    setCancelModalOpen(false);
    router.push("/plan");
  };

  const handleBackToPayment = () => {
    setIsCanceled(false);
    setError(null);
    setActiveStep(0);
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

  const totalAmount = parseFloat(tier.discountedPrice) * duration;

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

                    <FormControl fullWidth sx={{ mb: 3 }}>
                      <InputLabel id="duration-label">
                        Subscription Duration
                      </InputLabel>
                      <Select
                        labelId="duration-label"
                        value={duration}
                        label="Subscription Duration"
                        onChange={(e) => setDuration(Number(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
                          (months) => (
                            <MenuItem key={months} value={months}>
                              {months} month{months !== 1 ? "s" : ""}
                            </MenuItem>
                          )
                        )}
                      </Select>
                    </FormControl>

                    <List dense>
                      {tier.features.map((feature, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={feature} />
                        </ListItem>
                      ))}
                    </List>

                    <Box mt={4} display="flex" gap={2}>
                      <Button
                        variant="outlined"
                        onClick={handleCancelOrder}
                        fullWidth
                      >
                        Cancel Order
                      </Button>
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

                    {isCanceled ? (
                      <Box textAlign="center">
                        <Alert severity="warning" sx={{ mb: 3 }}>
                          Your payment was canceled
                        </Alert>
                        <Button
                          variant="contained"
                          onClick={handleBackToPayment}
                        >
                          Back to Payment
                        </Button>
                      </Box>
                    ) : !paymentMethod ? (
                      <Box display="flex" flexDirection="column" gap={2}>
                        <Button
                          variant="outlined"
                          size="large"
                          onClick={() => handlePaymentMethodSelect("stripe")}
                          sx={{ py: 2 }}
                        >
                          Stripe
                        </Button>
                        <Button
                          variant="outlined"
                          size="large"
                          onClick={() => handlePaymentMethodSelect("paypal")}
                          sx={{ py: 2 }}
                        >
                          PayPal
                        </Button>
                        <Button
                          variant="text"
                          onClick={() => setActiveStep(0)}
                          sx={{ mt: 2 }}
                        >
                          Back to Plan Selection
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
                          duration={duration}
                          onSuccess={handlePaymentSuccess}
                          onError={handlePaymentError}
                        />
                        <Button
                          variant="text"
                          onClick={() => setPaymentMethod(null)}
                          sx={{ mt: 2 }}
                        >
                          Choose different payment method
                        </Button>
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
                  <Typography>Duration:</Typography>
                  <Typography fontWeight="bold">
                    {duration} month{duration !== 1 ? "s" : ""}
                  </Typography>
                </Box>

                {tier.discountPercentage > 0 && (
                  <>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography>Original Price:</Typography>
                      <Typography sx={{ textDecoration: "line-through" }}>
                        ${(parseFloat(tier.price) * duration).toFixed(2)}
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

                <Divider sx={{ my: 2 }} />

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="subtitle1">Total Today:</Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    ${totalAmount.toFixed(2)}
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
              Your {duration}-month subscription is now active. You can manage
              your account from the dashboard.
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

        {error && !isCanceled && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Container>

      {/* Cancel Order Confirmation Dialog */}
      <Dialog
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        aria-labelledby="cancel-order-title"
      >
        <DialogTitle id="cancel-order-title">Cancel Order</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this order? You'll be returned to
            the plans page.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelModalOpen(false)}>Keep Order</Button>
          <Button onClick={confirmCancelOrder} color="error" autoFocus>
            Cancel Order
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CheckoutContent;
