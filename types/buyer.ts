export interface BuyerCriteriaSet {
  _id: string;
  name: string;
  leadTypes: ("exclusive" | "shared")[];
  locations: {
    city: string;
    state?: string;
    country?: string;
    radius?: number;
    zipCodes?: string[];
  }[];
  industries: string[];
  maxPrice: number;
  dailyLimit: number;
  excludedSources: string[];
  autoAccept: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Buyer {
  name: string;
  company: string;
  walletUnit: number;
  email: string;
  phone: string;
  walletBalance: number;
  status: "new" | "active" | "inactive" | "suspended";
  preferredDistribution: "Automatic" | "Manual" | "Both";
  notificationPreferences: ("Email" | "SMS" | "In-App Notification")[];
  leadPreferences: {
    location: string;
    industry: string;
  };
  leadTypes: ("exclusive" | "shared")[];
  maxPricePerLead: number;
  autoAcceptMatchingLeads: boolean;
  excludedSources: string[];
  criteriaSets: BuyerCriteriaSet[];
  activeCriteriaSetId?: string | null;
  purchaseHistory: {
    leadId: string;
    date: Date;
    amount: number;
    unit: number;
  }[];
  paymentHistory: {
    date: Date;
    amount: number;
    method: string;
  }[];
  feedback: {
    rating: number;
    comment: string;
  }[];
  priorityLevel?: string;
  timezone?: string;
  restrictedZones?: { city?: string; state?: string; zipCodes?: string[] }[];
  preferredZones?: { city?: string; state?: string; zipCodes?: string[] }[];
  locationMatchingStrict?: boolean;
  radiusFlexibility?: "strict" | "soft" | "flexible";
  industries?: string[];
  minQualityScore?: number;
  preferredPrice?: number;
  operatingHours?: { start: string; end: string };
  weeklySchedule?: {
    [key: string]: { enabled: boolean; start: string; end: string };
  };
  vacationMode?: { enabled: boolean; pauseUntil?: Date; autoReject: boolean };
  budgetCapType?: "daily" | "weekly" | "monthly";
  budgetCapAmount?: number;
  maxConcurrentLeads?: number;
  maxLeadsPerDay?: number;
  maxLeadsPerWeek?: number;
  maxLeadsPerMonth?: number;
  maxLeadAge?: number;
  serviceRadius?: number;
  preferredContactMethods?: ("phone" | "email" | "sms")[];
  blockDuplicateLeads?: boolean;
  duplicateCheckWindow?: number;
  enableLeadFeedback?: boolean;
  priorityBySource?: { source: string; priority: number }[];
  priorityByIndustry?: { industry: string; priority: number }[];
  priorityByLocation?: { location: string; priority: number }[];
}
