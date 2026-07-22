// ============================================
// Unified Lead Types
// ============================================

// ---------- Shared Sub-Types ----------

export interface LeadField {
  id: string;
  label: string;
  value: any;
  _id?: string;
}

export interface LeadLocation {
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

export interface LeadAssignment {
  buyerId: string;
  accepted: boolean;
  rejected: boolean;
  assignedAt: string;
}

export type LeadStatus =
  | "new"
  | "available"
  | "sold"
  | "assigned"
  | "qualified"
  | "unqualified"
  | "transferred";

export type LeadDistributionMethod = "manual" | "round_robin" | "marketplace";

export type LeadQualityLevel = "High" | "Medium" | "Low";

// ---------- Main Lead (Seller Management) ----------
// Used by: leadmanagement.tsx, leadform.tsx, leadsSlice.ts

export interface Lead {
  _id: string;
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  industry?: string;
  source?: string;
  leadSource?: string;
  aiQualityScore?: number;
  qualityLevel?: LeadQualityLevel;
  location?: LeadLocation;
  fields: LeadField[];
  createdAt: string;
  updatedAt?: string;
  status: LeadStatus;
  distributionMethod: LeadDistributionMethod;
  exclusive: boolean;
  shared: boolean;
  shareNumber: number;
  unit: number;
  isManual: boolean;
  soldCount?: number;
  assignedTo?: LeadAssignment[];
  [key: string]: unknown;
}

// ---------- Admin Content Verification Lead ----------
// Used by: admindashboard/content_management/content.tsx

export interface AdminLead {
  id: string;
  status: "new" | "available" | "sold" | "assigned" | "flagged";
  qualityScore: number;
  qualityLevel: LeadQualityLevel;
  source: string;
  createdAt: string;
  seller: {
    id: string;
    name: string;
    email?: string;
  };
  buyer?: {
    id: string;
    name: string;
    email?: string;
  };
  fields: {
    label: string;
    value: string;
  }[];
}

// ---------- Buyer Marketplace Lead ----------
// Used by: dashboard/buyer/marketplace/marketplace.tsx

export interface MarketplaceLead {
  _id: string;
  fields: Array<{
    id: string;
    label: string;
    value: string | Record<string, string>;
    _id?: string;
  }>;
  status: string;
  unit: number;
  shareNumber: number;
  soldCount: number;
  createdAt: string;
  soldTo?: Array<{ buyerId: string; createdAt: string; unit: number }>;
  cost?: number;
}
