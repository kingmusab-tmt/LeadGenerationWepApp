/**
 * Maps a seller's business country (free text from Google Places
 * autocomplete on the onboarding form) to the 2-letter country code Twilio's
 * AvailablePhoneNumbers API expects. Defaults to "US" — the only country
 * ever searched before this existed — so sellers who haven't set a business
 * country see no change in behavior.
 */
export function resolveTwilioCountryCode(
  businessCountry?: string | null,
): "US" | "GB" | "CA" {
  const normalized = (businessCountry || "").trim().toLowerCase();

  if (
    normalized.includes("united kingdom") ||
    normalized === "uk" ||
    normalized === "gb" ||
    normalized.includes("great britain") ||
    normalized === "england" ||
    normalized === "scotland" ||
    normalized === "wales" ||
    normalized === "northern ireland"
  ) {
    return "GB";
  }

  if (normalized.includes("canada") || normalized === "ca") {
    return "CA";
  }

  return "US";
}

/** NANP (3-digit area code) covers the US and Canada, not the UK. */
export function countryUsesAreaCode(countryCode: "US" | "GB" | "CA"): boolean {
  return countryCode === "US" || countryCode === "CA";
}
