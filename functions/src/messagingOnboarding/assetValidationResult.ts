import {
  FALLBACK_BUSINESS_CATEGORY,
  FALLBACK_BUSINESS_TYPE,
  getBusinessTypeConfig,
  resolveStoreBusinessCategory,
} from "../sharedData/businessTypes";
import {
  normalizeMenuIntakeIdentityResult,
  RawMenuIntakeIdentityResult,
} from "../sharedData/menuIntakeIdentity";
import type { AssetValidationResult } from "../types/messagingOnboarding.types";

function isRawMenuIntakeIdentityResult(value: unknown): value is RawMenuIntakeIdentityResult {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeReadableFileIndexes(
  readableFileIndexes: readonly number[],
  totalFiles: number,
): number[] {
  const seen = new Set<number>();
  for (const index of readableFileIndexes) {
    if (Number.isInteger(index) && index >= 1 && index <= totalFiles) seen.add(index);
  }
  return Array.from(seen).sort((a, b) => a - b);
}

export function buildAssetValidationFallback(
  totalFiles: number,
  readableFileIndexes: readonly number[],
): AssetValidationResult {
  normalizeReadableFileIndexes(readableFileIndexes, totalFiles);
  const invalid = Array.from({ length: Math.max(0, totalFiles) }, (_, index) => index + 1);

  return {
    valid_menu_files: [],
    invalid_files: invalid,
    menu_completeness: "insufficient",
    confidence: "low",
    extracted_business_info: {
      business_name: null,
      phone_number: null,
      address: null,
      logo_present: false,
      cuisine_hint: null,
      confidence: "low",
    },
    detected_business_type: {
      business_type: FALLBACK_BUSINESS_TYPE,
      business_category: FALLBACK_BUSINESS_CATEGORY,
      type_confidence: "low",
    },
  };
}

export function normalizeAssetValidationResult(
  raw: unknown,
  totalFiles: number,
  readableFileIndexes: readonly number[],
): AssetValidationResult {
  if (
    !isRawMenuIntakeIdentityResult(raw)
    || (!Array.isArray(raw.valid_menu_files) && !Array.isArray(raw.invalid_files))
  ) {
    throw new Error("ASSET_VALIDATION_FILE_CLASSIFICATION_MISSING");
  }
  const normalized = normalizeMenuIntakeIdentityResult(raw, totalFiles);
  const readable = normalizeReadableFileIndexes(readableFileIndexes, totalFiles);
  const readableSet = new Set(readable);
  const modelInvalid = new Set(normalized.validation.invalidFileIndexes);
  const valid = normalized.validation.validMenuFileIndexes.filter(
    (index) => readableSet.has(index) && !modelInvalid.has(index),
  );
  const validSet = new Set(valid);
  const invalid = Array.from({ length: Math.max(0, totalFiles) }, (_, index) => index + 1)
    .filter((index) => !validSet.has(index));
  const resolvedBusinessTypeConfig = getBusinessTypeConfig(normalized.identity.businessType || undefined);
  const resolvedBusinessType = resolvedBusinessTypeConfig?.value || FALLBACK_BUSINESS_TYPE;
  const resolvedBusinessCategory = resolveStoreBusinessCategory(
    resolvedBusinessType,
    normalized.identity.businessCategory || undefined,
  );

  return {
    valid_menu_files: valid,
    invalid_files: invalid,
    menu_completeness: valid.length === 0
      ? "insufficient"
      : normalized.validation.menuCompleteness,
    confidence: normalized.validation.confidence,
    extracted_business_info: {
      business_name: normalized.identity.businessName,
      phone_number: normalized.identity.phoneNumber,
      address: normalized.identity.address,
      logo_present: false,
      cuisine_hint: null,
      confidence: normalized.identity.confidence,
    },
    detected_business_type: {
      business_type: resolvedBusinessType,
      business_category: resolvedBusinessCategory,
      type_confidence: resolvedBusinessTypeConfig ? normalized.identity.confidence : "low",
    },
  };
}
