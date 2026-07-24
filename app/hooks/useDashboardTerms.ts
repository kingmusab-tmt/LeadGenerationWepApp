"use client";

import { useInitializeUser } from "./useUser";

/**
 * "seller" and "business-admin" accounts share the exact same dashboard
 * (routes, components, functionality) — only the terminology differs:
 * a seller's "Lead Buyer" is a business-admin's "Staff" member, and every
 * "Seller ..." label becomes "Business ...". Nothing else about the
 * underlying data/behavior changes; a business-admin's "Staff" are still
 * literally Buyer records in the same collection.
 */
export interface DashboardTerms {
  isBusinessAdmin: boolean;
  /** "Seller" | "Business" — e.g. "{org} Dashboard", "{org} Settings" */
  org: string;
  /** "Buyer" | "Staff" — singular, collective/short-label use ("Add {buyer}") */
  buyer: string;
  /** "Buyers" | "Staff" — plural/collective use ("Total {buyers}") */
  buyers: string;
  /** "Lead Buyer" | "Staff" — compound singular */
  leadBuyer: string;
  /** "Lead Buyers" | "Staff" — compound plural */
  leadBuyers: string;
  /** "buyer" | "staff member" — lowercase, singular, mid-sentence/specific-instance use */
  buyerLower: string;
  /** "buyers" | "staff" — lowercase, plural/collective, mid-sentence use */
  buyersLower: string;
  /** "Staff Member" | "Buyer" — capitalized singular-instance label (e.g. table/detail field names) */
  buyerMember: string;
}

export function useDashboardTerms(): DashboardTerms {
  const { currentUser } = useInitializeUser();
  const isBusinessAdmin = currentUser?.role === "business-admin";

  return {
    isBusinessAdmin,
    org: isBusinessAdmin ? "Business" : "Seller",
    buyer: isBusinessAdmin ? "Staff" : "Buyer",
    buyers: isBusinessAdmin ? "Staff" : "Buyers",
    leadBuyer: isBusinessAdmin ? "Staff" : "Lead Buyer",
    leadBuyers: isBusinessAdmin ? "Staff" : "Lead Buyers",
    buyerLower: isBusinessAdmin ? "staff member" : "buyer",
    buyersLower: isBusinessAdmin ? "staff" : "buyers",
    buyerMember: isBusinessAdmin ? "Staff Member" : "Buyer",
  };
}
