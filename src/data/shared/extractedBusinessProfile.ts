/**
 * Extracted Business Profile — Shared Data Contract
 * ═══════════════════════════════════════════════════════════════
 *
 * PRIMARY SOURCE — This file is the single source of truth.
 * It may import sibling shared data files only. Do not import app or
 * Functions-only modules.
 *
 * COPY RULE: This exact file is copied as-is to:
 *   functions/src/sharedData/extractedBusinessProfile.ts
 *
 * Extraction can suggest business/profile defaults, but owners remain the
 * authority. Callers should apply suggestions only when confidence and
 * overwrite rules allow it.
 */

import { normalizeBusinessCategory } from "./businessTypes";

export type ExtractedBusinessProfileConfidence = "high" | "medium" | "low";
export type ExtractedBusinessProfileSuggestionSource =
  | "menu_intake_identity"
  | "menu_extraction"
  | "system";

export type ExtractedBusinessProfileField =
  | "businessName"
  | "phoneNumber"
  | "addressLine"
  | "businessType"
  | "businessCategory"
  | "currencyCode"
  | "defaultLanguage"
  | "activeLanguages"
  | "projectName"
  | "brandAccentColor"
  | "imageBackgroundColor";

export interface ExtractedBusinessProfileSuggestion<T = string> {
  field: ExtractedBusinessProfileField;
  value: T;
  confidence: ExtractedBusinessProfileConfidence;
  evidence?: string;
  source?: ExtractedBusinessProfileSuggestionSource;
  sourceFileIndex?: number;
}

export interface ExtractedBusinessIdentityProfile {
  businessName?: ExtractedBusinessProfileSuggestion;
  phoneNumber?: ExtractedBusinessProfileSuggestion;
  addressLine?: ExtractedBusinessProfileSuggestion;
  businessType?: ExtractedBusinessProfileSuggestion;
  businessCategory?: ExtractedBusinessProfileSuggestion;
  currencyCode?: ExtractedBusinessProfileSuggestion;
  defaultLanguage?: ExtractedBusinessProfileSuggestion;
  activeLanguages?: ExtractedBusinessProfileSuggestion<string[]>;
}

export interface ExtractedBusinessVisualProfile {
  brandAccentColor?: ExtractedBusinessProfileSuggestion;
  imageBackgroundColor?: ExtractedBusinessProfileSuggestion;
}

export interface ExtractedProjectProfile {
  projectName?: ExtractedBusinessProfileSuggestion;
}

export interface ExtractedBusinessProfile {
  identity?: ExtractedBusinessIdentityProfile;
  visualBrand?: ExtractedBusinessVisualProfile;
  project?: ExtractedProjectProfile;
}

const CONFIDENCE_VALUES: ExtractedBusinessProfileConfidence[] = ["high", "medium", "low"];
const CONFIDENCE_RANK: Record<ExtractedBusinessProfileConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};
const CURRENCY_ALIASES: Record<string, string> = {
  "$": "USD",
  "usd": "USD",
  "us$": "USD",
  "₹": "INR",
  "rs": "INR",
  "rs.": "INR",
  "inr": "INR",
  "rupee": "INR",
  "rupees": "INR",
  "€": "EUR",
  "eur": "EUR",
  "£": "GBP",
  "gbp": "GBP",
  "aed": "AED",
  "د.إ": "AED",
  "sar": "SAR",
  "aud": "AUD",
  "cad": "CAD",
  "sgd": "SGD",
  "myr": "MYR",
  "jpy": "JPY",
  "¥": "JPY",
};

function cleanText(value: unknown, maxLength = 160): string | null {
  if (
    typeof value !== "string"
    && !(typeof value === "number" && Number.isFinite(value))
  ) return null;
  const normalized = String(value).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeConfidence(value: unknown): ExtractedBusinessProfileConfidence {
  const normalized = cleanText(value, 16)?.toLowerCase();
  return CONFIDENCE_VALUES.includes(normalized as ExtractedBusinessProfileConfidence)
    ? normalized as ExtractedBusinessProfileConfidence
    : "low";
}

function normalizeSource(value: unknown): ExtractedBusinessProfileSuggestionSource | undefined {
  const normalized = cleanText(value, 40);
  if (
    normalized === "menu_intake_identity" ||
    normalized === "menu_extraction" ||
    normalized === "system"
  ) {
    return normalized;
  }
  return undefined;
}

function normalizeSourceFileIndex(value: unknown): number | undefined {
  const index = typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" && /^\d+$/.test(value.trim())
      ? Number(value.trim())
      : Number.NaN;
  return Number.isInteger(index) && index >= 0 ? index : undefined;
}

function normalizeTextValue(value: unknown, maxLength = 160): string | null {
  return cleanText(value, maxLength);
}

export function normalizeCurrencyCode(value: unknown): string | null {
  const normalized = cleanText(value, 24);
  if (!normalized) return null;
  const lower = normalized.toLowerCase();
  const alias = CURRENCY_ALIASES[lower] || CURRENCY_ALIASES[normalized];
  if (alias) return alias;

  const upper = normalized.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  return null;
}

export function normalizeLanguageCode(value: unknown): string | null {
  const normalized = cleanText(value, 12)?.toLowerCase();
  if (!normalized) return null;
  return /^[a-z]{2,3}(-[a-z]{2,4})?$/.test(normalized) ? normalized : null;
}

export function normalizeLanguageCodes(value: unknown): string[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const seen = new Set<string>();
  for (const entry of rawValues) {
    const normalized = normalizeLanguageCode(entry);
    if (normalized) seen.add(normalized);
  }
  return Array.from(seen).slice(0, 8);
}

export function normalizeHexColor(value: unknown): string | null {
  const raw = cleanText(value, 32);
  if (!raw) return null;
  const match = raw.match(/#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/);
  if (!match) return null;
  const hex = match[1];
  const expanded = hex.length === 3
    ? hex.split("").map((char) => `${char}${char}`).join("")
    : hex;
  return `#${expanded.toUpperCase()}`;
}

function getRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function getColorStats(hex: string): { chroma: number; lightness: number } {
  const { r, g, b } = getRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return {
    chroma: max - min,
    lightness: (max + min) / 2,
  };
}

function normalizeAccentColor(value: unknown): string | null {
  const hex = normalizeHexColor(value);
  if (!hex) return null;
  const stats = getColorStats(hex);
  if (stats.lightness < 18 || stats.lightness > 238) return null;
  if (stats.chroma < 18) return null;
  return hex;
}

function normalizeBackgroundColor(value: unknown): string | null {
  const hex = normalizeHexColor(value);
  if (!hex) return null;
  const stats = getColorStats(hex);
  if (stats.lightness < 24 || stats.lightness > 248) return null;
  return hex;
}

function normalizeBusinessCategoryValue(value: unknown): string | null {
  return normalizeBusinessCategory(cleanText(value, 40) || undefined) || null;
}

function readRawSuggestionValue(raw: unknown): unknown {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const valueContainer = raw as Record<string, unknown>;
    return valueContainer.value ?? valueContainer.suggestedValue ?? valueContainer.detectedValue;
  }
  return raw;
}

function normalizeSuggestion<T>(
  raw: unknown,
  field: ExtractedBusinessProfileField,
  normalizeValue: (value: unknown) => T | null,
): ExtractedBusinessProfileSuggestion<T> | undefined {
  const value = normalizeValue(readRawSuggestionValue(raw));
  if (value === null) return undefined;

  const container = raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
  const evidence = cleanText(container.evidence, 180) || undefined;
  const source = normalizeSource(container.source) || "menu_extraction";
  const sourceFileIndex = normalizeSourceFileIndex(container.sourceFileIndex);

  return {
    field,
    value,
    confidence: normalizeConfidence(container.confidence),
    ...(evidence ? { evidence } : {}),
    ...(source ? { source } : {}),
    ...(sourceFileIndex !== undefined ? { sourceFileIndex } : {}),
  };
}

function hasValues(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && Object.values(value).some(Boolean));
}

export function hasExtractedBusinessProfile(
  profile: ExtractedBusinessProfile | null | undefined,
): profile is ExtractedBusinessProfile {
  return Boolean(
    profile &&
    (hasValues(profile.identity) || hasValues(profile.visualBrand) || hasValues(profile.project)),
  );
}

export function normalizeExtractedBusinessProfile(raw: unknown): ExtractedBusinessProfile | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const container = raw as Record<string, unknown>;
  const identityRaw = container.identity && typeof container.identity === "object" && !Array.isArray(container.identity)
    ? container.identity as Record<string, unknown>
    : {};
  const visualRaw = container.visualBrand && typeof container.visualBrand === "object" && !Array.isArray(container.visualBrand)
    ? container.visualBrand as Record<string, unknown>
    : {};
  const projectRaw = container.project && typeof container.project === "object" && !Array.isArray(container.project)
    ? container.project as Record<string, unknown>
    : {};

  const identity: ExtractedBusinessIdentityProfile = {
    businessName: normalizeSuggestion(identityRaw.businessName, "businessName", (value) => normalizeTextValue(value, 100)),
    phoneNumber: normalizeSuggestion(identityRaw.phoneNumber, "phoneNumber", (value) => normalizeTextValue(value, 40)),
    addressLine: normalizeSuggestion(identityRaw.addressLine ?? identityRaw.address, "addressLine", (value) => normalizeTextValue(value, 250)),
    businessType: normalizeSuggestion(identityRaw.businessType, "businessType", (value) => normalizeTextValue(value, 80)),
    businessCategory: normalizeSuggestion(identityRaw.businessCategory, "businessCategory", normalizeBusinessCategoryValue),
    currencyCode: normalizeSuggestion(identityRaw.currencyCode ?? identityRaw.currency, "currencyCode", normalizeCurrencyCode),
    defaultLanguage: normalizeSuggestion(identityRaw.defaultLanguage, "defaultLanguage", normalizeLanguageCode),
    activeLanguages: normalizeSuggestion(identityRaw.activeLanguages ?? identityRaw.languages, "activeLanguages", (value) => {
      const languages = normalizeLanguageCodes(value);
      return languages.length ? languages : null;
    }),
  };
  const visualBrand: ExtractedBusinessVisualProfile = {
    brandAccentColor: normalizeSuggestion(visualRaw.brandAccentColor ?? visualRaw.primaryColor, "brandAccentColor", normalizeAccentColor),
    imageBackgroundColor: normalizeSuggestion(visualRaw.imageBackgroundColor ?? visualRaw.backgroundColor, "imageBackgroundColor", normalizeBackgroundColor),
  };
  const project: ExtractedProjectProfile = {
    projectName: normalizeSuggestion(projectRaw.projectName ?? projectRaw.name, "projectName", (value) => normalizeTextValue(value, 80)),
  };

  const profile: ExtractedBusinessProfile = {
    ...(hasValues(identity) ? { identity } : {}),
    ...(hasValues(visualBrand) ? { visualBrand } : {}),
    ...(hasValues(project) ? { project } : {}),
  };

  return hasExtractedBusinessProfile(profile) ? profile : undefined;
}

export function getSuggestionValue<T>(
  suggestion: ExtractedBusinessProfileSuggestion<T> | null | undefined,
  minConfidence: ExtractedBusinessProfileConfidence = "medium",
): T | undefined {
  if (!suggestion) return undefined;
  return CONFIDENCE_RANK[suggestion.confidence] >= CONFIDENCE_RANK[minConfidence]
    ? suggestion.value
    : undefined;
}
