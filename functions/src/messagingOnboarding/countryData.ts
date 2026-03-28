/**
 * Country Data Helpers for Messaging Onboarding
 *
 * Uses the full 252-country dataset from sharedData/countryData.ts
 * (exact copy of src/components/atoms/phoneNumberInput/countryData.ts).
 *
 * This file provides lookup helpers (inferCountryFromPhone, getCurrencyForCountry)
 * that operate on the shared country data.
 *
 * @see functions/src/sharedData/countryData.ts
 * @see functions/src/sharedData/README.md
 */

import countryData from "../sharedData/countryData";

// Pre-sort by dial code length DESC for longest-match-first lookup
const SORTED_BY_DIAL_CODE = [...countryData].sort(
  (a, b) => b.dialCode.replace(/\s/g, "").length - a.dialCode.replace(/\s/g, "").length,
);

/** Default fallback — India (primary v1 market) */
const DEFAULT_COUNTRY_ENTRY = countryData.find((c) => c.code === "IN")!;

export interface CountryLookupResult {
  code: string;
  dialCode: string;
  currencyCode: string;
  currencySymbol: string;
  timeZone: string;
}

/**
 * Infer country from E.164 phone number using full 252-country dataset.
 * Matches longest dial code first for accuracy.
 */
export function inferCountryFromPhone(phone: string): CountryLookupResult {
  const cleaned = phone.replace(/[^0-9+]/g, "");
  const withPlus = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;

  for (const entry of SORTED_BY_DIAL_CODE) {
    const code = entry.dialCode.replace(/\s/g, "");
    if (withPlus.startsWith(code)) {
      return entry;
    }
  }

  return DEFAULT_COUNTRY_ENTRY;
}

/**
 * Get currency info for a country code (e.g., "IN" → { code: "INR", symbol: "₹", timezone: "Asia/Kolkata" })
 */
export function getCurrencyForCountry(countryCode: string): { code: string; symbol: string; timezone: string } {
  const entry = countryData.find((e) => e.code === countryCode);
  if (entry) {
    return { code: entry.currencyCode, symbol: entry.currencySymbol, timezone: entry.timeZone };
  }
  return { code: DEFAULT_COUNTRY_ENTRY.currencyCode, symbol: DEFAULT_COUNTRY_ENTRY.currencySymbol, timezone: DEFAULT_COUNTRY_ENTRY.timeZone };
}
