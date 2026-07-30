/**
 * Landing path for each role after sign-in, trial start, or checkout.
 *
 * Roles are NOT interchangeable with dashboard URL segments. The
 * seller/business-admin dashboard is at /dashboard itself and the buyer/staff
 * one at /dashboard/buyer, so no role name appears in a path. Building
 * `/dashboard/${role}/overview` produces a route that the proxy rejects, and
 * its fallback sends sellers back to /plan — an endless /plan ↔ dashboard
 * redirect loop. Always route through this helper.
 */
const ROLE_LANDING_PATHS: Record<string, string> = {
  admin: "/admindashboard/overview",
  seller: "/dashboard/overview",
  "business-admin": "/dashboard/overview",
  buyer: "/dashboard/buyer/overview",
  staff: "/dashboard/buyer/overview",
};

export function getRoleLandingPath(role?: string | null): string {
  if (!role) return "/completeregistration";
  return ROLE_LANDING_PATHS[role] ?? "/completeregistration";
}
