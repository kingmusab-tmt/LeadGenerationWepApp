// Stripe initialization hook
// Lazy loads Stripe.js SDK and provides promise for integration

"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

/**
 * Hook for initializing Stripe payment processing
 * Lazy loads Stripe SDK on component mount
 * Caches the stripe promise for subsequent uses
 *
 * @returns Stripe promise or null while loading
 *
 * @example
 * const stripePromise = useStripePromise();
 *
 * return (
 *   <Elements stripe={stripePromise}>
 *     <PaymentForm />
 *   </Elements>
 * );
 */
export function useStripePromise() {
  const [stripePromise, setStripePromise] = useState<any>(null);

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        const stripe = await loadStripe(
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
        );
        if (!stripe) throw new Error("Stripe failed to initialize");
        setStripePromise(stripe);
      } catch (error) {
        console.error("Stripe initialization error:", error);
      }
    };

    initializeStripe();
  }, []);

  return stripePromise;
}
