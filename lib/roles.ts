/**
 * "seller" and "business-admin" are the same product tier: they share one
 * dashboard, one set of routes, and one set of APIs — only the UI wording
 * differs (a seller's "Lead Buyer" is a business-admin's "Staff"; see
 * app/hooks/useDashboardTerms.ts).
 *
 * So any check asking "is this a seller-side account acting on its own data"
 * must accept both roles. Comparing `role !== "seller"` directly hands
 * business-admins a 403 on their own buyers, leads, calls, and settings.
 *
 * This is only about seller-vs-buyer capability. It deliberately says nothing
 * about "admin", which callers still check separately where a platform admin
 * is allowed to act on someone else's data.
 */
export const SELLER_SIDE_ROLES = ["seller", "business-admin"] as const;

export function isSellerRole(role?: string | null): boolean {
  return role === "seller" || role === "business-admin";
}
