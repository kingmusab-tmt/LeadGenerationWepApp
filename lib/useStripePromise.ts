import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

export function useStripePromise() {
  const [stripePromise, setStripePromise] = useState<any>(null);

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        const stripe = await loadStripe(
          process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || ""
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
