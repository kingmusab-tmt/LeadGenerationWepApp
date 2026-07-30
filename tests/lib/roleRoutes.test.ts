import { describe, expect, it } from "vitest";
import { getRoleLandingPath } from "@/lib/roleRoutes";

// The seller/business-admin dashboard is /dashboard itself; /dashboard/buyer
// is the only nested one. Interpolating a role into the path (the bug this
// helper exists to prevent) yields a route the proxy rejects, and its seller
// fallback is /plan — which sends the user straight back, looping. So every
// path this returns must be one that actually exists.
const REAL_ROUTES = [
  "/admindashboard/overview",
  "/dashboard/overview",
  "/dashboard/buyer/overview",
  "/completeregistration",
];

const ROLE_NAMES = [
  "admin",
  "seller",
  "business-admin",
  "buyer",
  "staff",
  "user",
];

describe("getRoleLandingPath", () => {
  it("routes both seller-side roles to the shared dashboard root", () => {
    expect(getRoleLandingPath("seller")).toBe("/dashboard/overview");
    expect(getRoleLandingPath("business-admin")).toBe("/dashboard/overview");
  });

  it("routes both buyer-side roles to the buyer dashboard", () => {
    expect(getRoleLandingPath("buyer")).toBe("/dashboard/buyer/overview");
    expect(getRoleLandingPath("staff")).toBe("/dashboard/buyer/overview");
  });

  it("sends admins to their own dashboard", () => {
    expect(getRoleLandingPath("admin")).toBe("/admindashboard/overview");
  });

  it("falls back to registration for missing or unknown roles", () => {
    expect(getRoleLandingPath(undefined)).toBe("/completeregistration");
    expect(getRoleLandingPath(null)).toBe("/completeregistration");
    expect(getRoleLandingPath("")).toBe("/completeregistration");
    expect(getRoleLandingPath("user")).toBe("/completeregistration");
    expect(getRoleLandingPath("not-a-role")).toBe("/completeregistration");
  });

  it("only ever returns a route that exists", () => {
    for (const role of ROLE_NAMES) {
      expect(REAL_ROUTES).toContain(getRoleLandingPath(role));
    }
  });

  it("never interpolates a seller-side role into the path", () => {
    for (const role of ["seller", "business-admin"]) {
      expect(getRoleLandingPath(role)).not.toContain(role);
    }
  });
});
