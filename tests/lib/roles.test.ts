import { describe, expect, it } from "vitest";
import { isSellerRole, SELLER_SIDE_ROLES } from "@/lib/roles";

describe("isSellerRole", () => {
  it("accepts both seller-side roles", () => {
    // business-admin shares the seller dashboard and APIs — gating on the
    // literal "seller" string 403s them on their own buyers, leads and calls.
    expect(isSellerRole("seller")).toBe(true);
    expect(isSellerRole("business-admin")).toBe(true);
  });

  it("rejects buyer-side, admin, and unassigned roles", () => {
    for (const role of ["buyer", "staff", "admin", "user"]) {
      expect(isSellerRole(role)).toBe(false);
    }
  });

  it("rejects missing roles rather than throwing", () => {
    expect(isSellerRole(undefined)).toBe(false);
    expect(isSellerRole(null)).toBe(false);
    expect(isSellerRole("")).toBe(false);
  });

  it("keeps the exported list in sync with the predicate", () => {
    for (const role of SELLER_SIDE_ROLES) {
      expect(isSellerRole(role)).toBe(true);
    }
  });
});
