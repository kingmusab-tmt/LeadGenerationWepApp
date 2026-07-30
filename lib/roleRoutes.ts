/**
 * Landing path for each role after sign-in, trial start, or checkout.
 *
 * Roles are NOT interchangeable with dashboard URL segments: only
 * /dashboard/seller and /dashboard/buyer exist, so `business-admin` and
 * `staff` must be mapped rather than interpolated into the path. Building
 * `/dashboard/${role}/overview` for those roles produces a route that the
 * proxy rejects, and its fallback sends sellers back to /plan — an endless
 * /plan ↔ dashboard redirect loop. Always route through this helper.
 */
const ROLE_LANDING_PATHS: Record<string, string> = {
  admin: "/admindashboard/overview",
  seller: "/dashboard/seller/overview",
  "business-admin": "/dashboard/seller/overview",
  buyer: "/dashboard/buyer/overview",
  staff: "/dashboard/buyer/overview",
};

export function getRoleLandingPath(role?: string | null): string {
  if (!role) return "/completeregistration";
  return ROLE_LANDING_PATHS[role] ?? "/completeregistration";
}
