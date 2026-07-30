import { describe, expect, it } from "vitest";
import { getRoleLandingPath } from "@/lib/roleRoutes";

// Only /dashboard/seller and /dashboard/buyer exist as route segments. A role
// that maps to a non-existent path is rejected by the proxy, whose seller
// fallback is /plan — which sends the user straight back here, looping.
const EXISTING_DASHBOARD_SEGMENTS = ["seller", "buyer"];

describe("getRoleLandingPath", () => {
  it("routes both seller-side roles to the seller dashboard", () => {
    expect(getRoleLandingPath("seller")).toBe("/dashboard/seller/overview");
    expect(getRoleLandingPath("business-admin")).toBe(
      "/dashboard/seller/overview",
    );
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

  it("never points at a dashboard segment that does not exist", () => {
    for (const role of [
      "admin",
      "seller",
      "business-admin",
      "buyer",
      "staff",
      "user",
    ]) {
      const segment = getRoleLandingPath(role).match(
        /^\/dashboard\/([^/]+)\//,
      )?.[1];

      if (segment) {
        expect(EXISTING_DASHBOARD_SEGMENTS).toContain(segment);
      }
    }
  });
});
