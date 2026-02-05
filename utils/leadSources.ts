/**
 * Standardized Lead Sources
 * Used across the entire system to maintain consistency
 */

export interface LeadSource {
  value: string;
  label: string;
  category: "organic" | "paid" | "direct" | "referral" | "other";
  description?: string;
}

export const LEAD_SOURCES: LeadSource[] = [
  // Organic Sources
  {
    value: "organic_search",
    label: "Organic Search",
    category: "organic",
    description: "Google, Bing, or other search engines",
  },
  {
    value: "website",
    label: "Website",
    category: "organic",
    description: "Direct website contact form submission",
  },
  {
    value: "seo",
    label: "SEO",
    category: "organic",
    description: "Search engine optimization traffic",
  },

  // Paid Sources
  {
    value: "google_ads",
    label: "Google Ads",
    category: "paid",
    description: "Google Ads (PPC) campaigns",
  },
  {
    value: "facebook_ads",
    label: "Facebook Ads",
    category: "paid",
    description: "Facebook/Instagram advertising",
  },
  {
    value: "linkedin_ads",
    label: "LinkedIn Ads",
    category: "paid",
    description: "LinkedIn sponsored content",
  },
  {
    value: "paid_search",
    label: "Paid Search",
    category: "paid",
    description: "Paid search advertising",
  },
  {
    value: "display_ads",
    label: "Display Ads",
    category: "paid",
    description: "Banner and display advertising",
  },

  // Direct Sources
  {
    value: "direct",
    label: "Direct",
    category: "direct",
    description: "Direct contact by prospect",
  },
  {
    value: "phone_call",
    label: "Phone Call",
    category: "direct",
    description: "Incoming phone inquiry",
  },
  {
    value: "email",
    label: "Email",
    category: "direct",
    description: "Direct email inquiry",
  },
  {
    value: "cold_call",
    label: "Cold Call",
    category: "direct",
    description: "Outbound cold calling",
  },
  {
    value: "cold_email",
    label: "Cold Email",
    category: "direct",
    description: "Outbound cold email campaign",
  },

  // Referral Sources
  {
    value: "referral",
    label: "Referral",
    category: "referral",
    description: "Referred by existing customer",
  },
  {
    value: "partner",
    label: "Partner",
    category: "referral",
    description: "Business partner referral",
  },
  {
    value: "affiliate",
    label: "Affiliate",
    category: "referral",
    description: "Affiliate program or marketing partner",
  },

  // Social Media Sources
  {
    value: "social_media",
    label: "Social Media",
    category: "organic",
    description: "Social media organic reach",
  },
  {
    value: "twitter",
    label: "Twitter/X",
    category: "organic",
    description: "Twitter/X platform",
  },
  {
    value: "linkedin",
    label: "LinkedIn",
    category: "organic",
    description: "LinkedIn platform",
  },
  {
    value: "instagram",
    label: "Instagram",
    category: "organic",
    description: "Instagram platform",
  },
  {
    value: "tiktok",
    label: "TikTok",
    category: "organic",
    description: "TikTok platform",
  },
  {
    value: "youtube",
    label: "YouTube",
    category: "organic",
    description: "YouTube platform",
  },

  // Marketing Automation & Integration Sources
  {
    value: "email_marketing",
    label: "Email Marketing",
    category: "paid",
    description: "Email marketing campaign",
  },
  {
    value: "webinar",
    label: "Webinar",
    category: "organic",
    description: "Webinar or online event",
  },
  {
    value: "event",
    label: "Event",
    category: "organic",
    description: "Trade show, conference, or offline event",
  },
  {
    value: "zapier",
    label: "Zapier Integration",
    category: "other",
    description: "Zapier automation integration",
  },
  {
    value: "api",
    label: "API Integration",
    category: "other",
    description: "Direct API integration",
  },

  // Platform Specific
  {
    value: "brixcot",
    label: "BRIXCOT Platform",
    category: "other",
    description: "BRIXCOT lead generation platform",
  },
  {
    value: "hubspot",
    label: "HubSpot",
    category: "other",
    description: "HubSpot CRM integration",
  },
  {
    value: "salesforce",
    label: "Salesforce",
    category: "other",
    description: "Salesforce CRM integration",
  },

  // Other Sources
  {
    value: "other",
    label: "Other",
    category: "other",
    description: "Other lead source",
  },
  {
    value: "unknown",
    label: "Unknown",
    category: "other",
    description: "Lead source unknown or not specified",
  },
];

/**
 * Get lead source by value
 */
export const getLeadSourceByValue = (value: string): LeadSource | undefined => {
  return LEAD_SOURCES.find((source) => source.value === value);
};

/**
 * Get all lead source values as a simple array
 */
export const getLeadSourceValues = (): string[] => {
  return LEAD_SOURCES.map((source) => source.value);
};

/**
 * Get lead source labels for display
 */
export const getLeadSourceLabels = (): Record<string, string> => {
  const labels: Record<string, string> = {};
  LEAD_SOURCES.forEach((source) => {
    labels[source.value] = source.label;
  });
  return labels;
};

/**
 * Get lead sources by category
 */
export const getLeadSourcesByCategory = (
  category: LeadSource["category"],
): LeadSource[] => {
  return LEAD_SOURCES.filter((source) => source.category === category);
};

/**
 * Format lead source value for display
 */
export const formatLeadSource = (value: string): string => {
  const source = getLeadSourceByValue(value);
  return source ? source.label : value;
};
