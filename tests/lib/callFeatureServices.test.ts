import { describe, expect, it, vi } from "vitest";

// This module's async helpers (sendMissedCallTextBack etc., not under test
// here) pull in utils/notifications -> lib/env, which validates the full
// process.env schema at import time and throws in a test environment with
// no real secrets configured. The pure functions under test don't need it.
vi.mock("@/utils/notifications", () => ({ sendSMS: vi.fn() }));
vi.mock("@/lib/redis", () => ({ getRedisClient: vi.fn() }));
vi.mock("@/models/call", () => ({ default: {} }));
vi.mock("@/models/scheduledCallback", () => ({ default: {} }));

import {
  checkSpamStatus,
  doesBuyerServiceArea,
  extractGeoData,
  isOnDncList,
  requiresAllPartyConsent,
} from "@/utils/callFeatureServices";

describe("doesBuyerServiceArea — geo-routing", () => {
  it("serves everywhere when the buyer has no service locations configured", () => {
    const result = doesBuyerServiceArea(
      { serviceLocations: [] },
      { areaCode: "212", city: "New York", state: "NY" },
    );
    expect(result).toBe(true);
  });

  it("does not filter international/undeterminable callers even with locations configured", () => {
    // extractGeoData only resolves 10/11-digit NANP numbers — a caller
    // whose area code couldn't be determined must not be treated the same
    // as "doesn't match any configured location".
    const result = doesBuyerServiceArea(
      { serviceLocations: [{ city: "Chicago", state: "IL" }] },
      { areaCode: "" },
    );
    expect(result).toBe(true);
  });

  it("iterates each service-location entry rather than reading city/state off the array itself", () => {
    // This is the exact bug the fix closed: serviceLocations is an array of
    // {city, state} entries, not a single object — reading .city/.state
    // directly on the array is always undefined, which made every buyer
    // with any locations configured silently match every caller. A real
    // fix must actually inspect each entry and only match a genuine hit.
    const buyer = {
      serviceLocations: [
        { city: "Austin", state: "TX" },
        { city: "Denver", state: "CO" },
      ],
    };

    expect(
      doesBuyerServiceArea(buyer, { areaCode: "720", city: "Denver", state: "CO" }),
    ).toBe(true);
    expect(
      doesBuyerServiceArea(buyer, { areaCode: "212", city: "New York", state: "NY" }),
    ).toBe(false);
  });

  it("matches on state even when city doesn't match", () => {
    const buyer = { serviceLocations: [{ state: "CA" }] };
    expect(
      doesBuyerServiceArea(buyer, { areaCode: "415", city: "San Francisco", state: "CA" }),
    ).toBe(true);
  });

  it("matches case-insensitively", () => {
    const buyer = { serviceLocations: [{ city: "miami", state: "fl" }] };
    expect(
      doesBuyerServiceArea(buyer, { areaCode: "305", city: "Miami", state: "FL" }),
    ).toBe(true);
  });

  it("serves everywhere when locations are configured but none specify a city or state", () => {
    const buyer = { serviceLocations: [{ radius: 50 }] };
    expect(
      doesBuyerServiceArea(buyer, { areaCode: "212", city: "New York", state: "NY" }),
    ).toBe(true);
  });

  it("returns true for a buyer with no serviceLocations field at all", () => {
    expect(doesBuyerServiceArea({}, { areaCode: "212" })).toBe(true);
    expect(doesBuyerServiceArea(null, { areaCode: "212" })).toBe(true);
  });
});

describe("extractGeoData — phone number to area code", () => {
  it("extracts the area code from an 11-digit NANP number with country code", () => {
    expect(extractGeoData("+12125551234").areaCode).toBe("212");
  });

  it("extracts the area code from a bare 10-digit number", () => {
    expect(extractGeoData("2125551234").areaCode).toBe("212");
  });

  it("resolves known city/state for a recognized area code", () => {
    const geo = extractGeoData("+12125551234");
    expect(geo.state).toBe("NY");
  });

  it("returns an empty area code for an unresolvable (non-NANP) number", () => {
    const geo = extractGeoData("+442071234567"); // UK number
    expect(geo.areaCode).toBe("");
    expect(geo.city).toBeUndefined();
    expect(geo.state).toBeUndefined();
  });
});

describe("isOnDncList — phone number normalization", () => {
  it("matches regardless of +1/country-code formatting differences", () => {
    const dncList = ["+15551234567"];
    expect(isOnDncList("5551234567", dncList)).toBe(true);
    expect(isOnDncList("15551234567", dncList)).toBe(true);
    expect(isOnDncList("+15551234567", dncList)).toBe(true);
  });

  it("does not match a number not on the list", () => {
    expect(isOnDncList("+15559999999", ["+15551234567"])).toBe(false);
  });

  it("returns false for an empty or missing DNC list", () => {
    expect(isOnDncList("+15551234567", [])).toBe(false);
    expect(isOnDncList("+15551234567", undefined)).toBe(false);
  });
});

describe("checkSpamStatus — STIR/SHAKEN attestation", () => {
  it("treats a fully-verified attestation as not spam", () => {
    const result = checkSpamStatus("TN-Validation-Passed-A", "+15551234567");
    expect(result.isSpam).toBe(false);
    expect(result.spamScore).toBe(0);
  });

  it("flags a failed attestation as spam", () => {
    const result = checkSpamStatus("TN-Validation-Failed", "+15551234567");
    expect(result.isSpam).toBe(true);
    expect(result.spamScore).toBe(90);
  });

  it("flags a premium-rate number as spam regardless of attestation", () => {
    const result = checkSpamStatus("TN-Validation-Passed-A", "+19005551234");
    expect(result.isSpam).toBe(true);
    expect(result.reason).toContain("Premium rate");
  });

  it("treats missing attestation as a neutral-risk unknown, not an automatic pass", () => {
    const result = checkSpamStatus(null, "+15551234567");
    expect(result.isSpam).toBe(false);
    expect(result.spamScore).toBe(60);
  });
});

describe("requiresAllPartyConsent — jurisdiction-aware recording enforcement", () => {
  it("flags known all-party-consent states", () => {
    expect(requiresAllPartyConsent("CA")).toBe(true);
    expect(requiresAllPartyConsent("FL")).toBe(true);
    expect(requiresAllPartyConsent("PA")).toBe(true);
  });

  it("does not flag a one-party-consent state", () => {
    expect(requiresAllPartyConsent("NY")).toBe(false);
    expect(requiresAllPartyConsent("TX")).toBe(false);
  });

  it("matches case-insensitively", () => {
    expect(requiresAllPartyConsent("ca")).toBe(true);
  });

  it("treats an undetermined state as not requiring consent, rather than blocking broadly", () => {
    expect(requiresAllPartyConsent(undefined)).toBe(false);
    expect(requiresAllPartyConsent("")).toBe(false);
  });
});
