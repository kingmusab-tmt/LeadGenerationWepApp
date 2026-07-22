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
  autoAccept: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Buyer {
  _id?: string;
  name: string;
  company: string;
  businessDescription?: string;
  companyRegNo?: string;
  vatTaxRegNo?: string;
  businessWebsite?: string;
  contactAddress?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postCode?: string;
  };
  priority: number; // 1-10 scale
  isActive: boolean;
  currentLeads: number;
  currentLeadsToday: number;
  maxLeadsPerDay: number;
  qualificationScoreMinimum: number;
  walletUnit: number;
  email: string;
  lastAssignedAt?: Date;
  lastAssignedLeadId?: string;
  phone: string;
  walletBalance: number;
  status: "new" | "active" | "inactive" | "suspended";
  preferredDistribution: "Automatic" | "Manual" | "Both";
  notificationPreferences: ("Email" | "SMS" | "In-App Notification")[];
  leadPreferences: {
    location: string;
    industries: string[]; // Preferred industries (multiple)
    industryServicePairs?: { industry: string; services: string[] }[];
  };
  serviceLocations: {
    city: string;
    state: string;
    country: string;
    zipCodes?: string[];
    radius?: number;
  }[];
  locationMatchingStrict: boolean;
  workingHours: { start: string; end: string };
  timezone: string;

  // Operational Availability
  acceptOnlyDuringBusinessHours: boolean;
  vacationMode: { enabled: boolean; pauseUntil?: Date; autoReject: boolean };

  // Budget & Volume Limits
  budgetCapType: "daily" | "weekly" | "monthly";
  budgetLimitAmount: number;
  volumeLimitCount: number;
  currentPeriodSpent: number;
  currentPeriodCount: number;
  periodStartDate?: Date;
  maxConcurrentLeads: number;

  // Advanced Location Preferences
  preferredZones: { city?: string; state?: string; zipCodes?: string[] }[];
  radiusFlexibility: "strict" | "soft" | "flexible";

  // Preference Matching
  preferenceMatchingThreshold: "strict" | "moderate" | "flexible";

  // Notification
  notifyOnWeekends: boolean;

  // Weekly Schedule
  weeklySchedule: {
    [key: string]: { enabled: boolean; start: string; end: string };
  };

  // Integration
  webhookConfig?: {
    enabled: boolean;
    url: string;
    authToken: string;
  };

  // Lead Age/Freshness
  maxLeadAge: number;

  // Geographic
  serviceRadius: number;

  // Contact Preferences
  preferredContactMethods: ("phone" | "email" | "sms")[];

  // Priority Settings
  priorityBySource: { source: string; priority: number }[];
  priorityByIndustry: { industry: string; priority: number }[];
  priorityByLocation: { location: string; priority: number }[];

  // Lead Types & Pricing
  leadTypes: ("exclusive" | "shared")[];
  maxPricePerLead: number;
  autoAcceptMatchingLeads: boolean;
  acceptCallLeads: boolean;

  // Criteria Sets
  criteriaSets: BuyerCriteriaSet[];
  activeCriteriaSetId?: string | null;

  // History
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

  // Registration
  registeredWith?: string;
  isIndependentBuyer?: boolean;
  assignedLeads?: string[];
  purchasedLeads?: string[];

  createdAt?: string;
  updatedAt?: string;
}
