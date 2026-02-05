import mongoose from "mongoose";

/**
 * Subscription Interface
 * Handles all subscription-related user data
 */
export interface ISubscription {
  subscriptionTierId: string;
  subscriptionTierType: "free" | "paid"; // Subscription tier type (free or paid)
  subscriptionTierUserType: "seller" | "business"; // User type for the subscription tier
  subscriptionPlan: string; // Subscription plan name
  subscriptionPrice?: number; // Price of the subscription plan
  subscriptionStartDate: Date; // when user signed up
  subscriptionExpiryDate: Date; // when Free Tier or Paid plan ends
  isSubscriptionActive: boolean; // true/false
  isTrial: boolean; // true if Free Tier trial is active
  usedTrial: boolean; // true if user has used their Free Tier trial
  subscriptionRenewalDate?: Date;
  subscriptionPaymentMethod: "stripe" | "paypal" | "free";
  subscriptionPaymentId?: string; // Stripe/PayPal subscription ID
  subscriptionRenewalPrice?: number; // Renewal price for the subscription
  subscriptionLimits: {
    forms: number;
    leads: number;
    buyers: number;
    numbers: number;
    twilioNumbers: number;
    callSeconds: number;
    exports: boolean;
    imports: boolean;
    liveSupport: boolean;
    industries: number;
  };
  subscriptionUsage: {
    leads: number;
    callSeconds: number;
  };
}
