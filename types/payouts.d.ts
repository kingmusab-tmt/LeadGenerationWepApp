interface StripeAccountStatus {
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
  };
}

interface StripeOnboardingResponse {
  accountId: string;
  onboardingUrl: string;
  error?: string;
}
interface StripePayoutRequest {
  sellerId: string;
  amount: number;
  currency: string;
}

interface StripePayoutResponse {
  message: string;
  transferId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  error?: string;
}

interface PayPalPayoutRequest {
  receiverEmail: string;
  amount: number;
  currency: string;
  note?: string;
}

interface PayPalPayoutResponse {
  message: string;
  payoutId?: string;
  status?: string;
  amount?: number;
  currency?: string;
  error?: string;
}
