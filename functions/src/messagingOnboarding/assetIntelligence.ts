/**
 * Asset Intelligence — Gemini Validation + Business Info Extraction
 *
 * Single Gemini call per session to validate uploaded files and extract
 * business information before sending to the extraction pipeline.
 *
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §8.4
 */

import * as functions from "firebase-functions";
import { AI_MODEL } from "../constants/ai";
import { genAIClient } from "../genAiClient";
import {
  buildMenuIntakeIdentityPrompt,
  normalizeMenuIntakeIdentityResult,
  RawMenuIntakeIdentityResult,
} from "../sharedData/menuIntakeIdentity";
import {
  FALLBACK_BUSINESS_CATEGORY,
  FALLBACK_BUSINESS_TYPE,
  resolveStoreBusinessCategory,
} from "../sharedData/businessTypes";
import { UPLOAD_LIMITS } from "./constants";
import { AssetValidationResult, SessionUpload } from "../types/messagingOnboarding.types";
import {
  isResponseBodyTooLargeError,
  readResponseUint8ArrayWithLimit,
} from "../utils/boundedResponseBody";
import { validateNetworkTargetUrl } from "../utils/networkTarget";

const logger = functions.logger;
const ASSET_VALIDATION_UPLOAD_FETCH_FAILED = "ASSET_VALIDATION_UPLOAD_FETCH_FAILED";
const ASSET_VALIDATION_UPLOAD_TOO_LARGE = "ASSET_VALIDATION_UPLOAD_TOO_LARGE";
const ASSET_VALIDATION_UPLOAD_URL_REJECTED = "ASSET_VALIDATION_UPLOAD_URL_REJECTED";
const ASSET_VALIDATION_RESPONSE_PARSE_FAILED = "ASSET_VALIDATION_RESPONSE_PARSE_FAILED";

function getProjectStorageBucketFallback(): string {
  const projectId = process.env.FIREBASE_PROJECT_ID
    || process.env.GCLOUD_PROJECT
    || process.env.GCP_PROJECT
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  return projectId ? `${projectId}.appspot.com` : "";
}

function getAllowedStorageBucket(): string {
  return process.env.FIREBASE_STORAGE_BUCKET
    || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    || getProjectStorageBucketFallback();
}

function getStoragePathFromDownloadUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;

    const allowedBucket = getAllowedStorageBucket();
    if (url.hostname === "firebasestorage.googleapis.com") {
      const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/([^?]+)$/);
      if (decodeURIComponent(match?.[1] || "") !== allowedBucket) return null;
      return match?.[2] ? decodeURIComponent(match[2]) : null;
    }

    if (url.hostname === "storage.googleapis.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      const bucket = decodeURIComponent(parts[0] || "");
      if (bucket !== allowedBucket) return null;
      return parts.length >= 2 ? decodeURIComponent(parts.slice(1).join("/")) : null;
    }

    return null;
  } catch {
    return null;
  }
}

function isAllowedMessagingUploadUrl(upload: SessionUpload): boolean {
  const storagePath = getStoragePathFromDownloadUrl(upload.storageUrl);
  if (!storagePath || storagePath !== upload.storagePath) return false;

  const parts = storagePath.split("/");
  if (parts.length !== 3 || parts[0] !== "messagingOnboarding") return false;

  const fileName = parts[2] || "";
  return fileName.startsWith(`${upload.id}.`);
}

function getAssetIntelligenceErrorName(error: unknown): string {
  if (error instanceof Error) return (error.name || "Error").slice(0, 80);
  return typeof error;
}

function getAssetIntelligenceErrorCode(error: Error): string | undefined {
  const code = (error as { code?: unknown }).code;
  if (code === undefined || code === null) return undefined;
  return String(code).slice(0, 64);
}

function getAssetIntelligenceStatusCode(error: Error): number | undefined {
  const status = Number((error as { status?: unknown; statusCode?: unknown }).status
    || (error as { statusCode?: unknown }).statusCode);
  return Number.isFinite(status) ? status : undefined;
}

function getAssetIntelligenceErrorContext(error: unknown): {
  sourceErrorName: string;
  sourceErrorCode?: string;
  sourceStatusCode?: number;
} {
  if (error instanceof Error) {
    return {
      sourceErrorName: getAssetIntelligenceErrorName(error),
      sourceErrorCode: getAssetIntelligenceErrorCode(error),
      sourceStatusCode: getAssetIntelligenceStatusCode(error),
    };
  }

  return { sourceErrorName: getAssetIntelligenceErrorName(error) };
}

function getUploadDiagnosticContext(upload: SessionUpload, uploadIndex: number, uploadCount: number) {
  return {
    uploadIndex,
    uploadCount,
    uploadIdLength: upload.id.length,
    storageUrlPresent: Boolean(upload.storageUrl),
    storageUrlLength: upload.storageUrl.length,
    mimeTypePresent: Boolean(upload.mimeType),
    mimeTypeLength: upload.mimeType.length,
    fileSize: upload.fileSize,
  };
}

function getTargetValidationDiagnosticContext(result: {
  addressCount?: number;
  error?: string;
  errorName?: string;
}) {
  return {
    addressCount: result.addressCount || 0,
    targetError: typeof result.error === "string" ? result.error.slice(0, 80) : undefined,
    targetErrorName: typeof result.errorName === "string" ? result.errorName.slice(0, 80) : undefined,
  };
}

/**
 * Validate uploaded files and extract business info using Gemini
 *
 * @param uploads - Array of session uploads to validate
 * @returns Validation result with valid/invalid files, business info, and business type
 */
export async function validateAssets(
  uploads: SessionUpload[],
): Promise<AssetValidationResult> {
  // Build image parts for Gemini
  const imageParts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [];

  // Add instruction text
  imageParts.push({ text: buildMenuIntakeIdentityPrompt(uploads.length) });

  // Download and encode each upload as base64 for Gemini
  let readableUploadCount = 0;
  for (let i = 0; i < uploads.length; i++) {
    const upload = uploads[i];
    try {
      if (!isAllowedMessagingUploadUrl(upload)) {
        logger.warn("[AssetIntelligence] Rejected unsafe upload URL", {
          failureCode: ASSET_VALIDATION_UPLOAD_URL_REJECTED,
          ...getUploadDiagnosticContext(upload, i + 1, uploads.length),
        });
        continue;
      }

      const targetValidation = await validateNetworkTargetUrl(upload.storageUrl);
      if (!targetValidation.valid || !targetValidation.normalizedUrl) {
        logger.warn("[AssetIntelligence] Rejected unsafe upload target", {
          failureCode: ASSET_VALIDATION_UPLOAD_URL_REJECTED,
          ...getUploadDiagnosticContext(upload, i + 1, uploads.length),
          ...getTargetValidationDiagnosticContext(targetValidation),
        });
        continue;
      }

      const response = await fetch(targetValidation.normalizedUrl);
      if (!response.ok) {
        logger.warn("[AssetIntelligence] Failed to fetch upload for validation", {
          failureCode: ASSET_VALIDATION_UPLOAD_FETCH_FAILED,
          ...getUploadDiagnosticContext(upload, i + 1, uploads.length),
          status: response.status,
        });
        continue;
      }
      let responseBytes: Uint8Array;
      try {
        responseBytes = await readResponseUint8ArrayWithLimit(response, UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES);
      } catch (error) {
        if (isResponseBodyTooLargeError(error)) {
          logger.warn("[AssetIntelligence] Rejected oversized upload response", {
            failureCode: ASSET_VALIDATION_UPLOAD_TOO_LARGE,
            ...getUploadDiagnosticContext(upload, i + 1, uploads.length),
            responseByteLength: error.receivedBytes,
            maxSize: error.maxBytes,
          });
          continue;
        }
        throw error;
      }

      const buffer = Buffer.from(responseBytes);
      const base64 = buffer.toString("base64");

      readableUploadCount += 1;
      imageParts.push({ text: `File ${i + 1}` });
      imageParts.push({
        inlineData: {
          mimeType: upload.mimeType,
          data: base64,
        },
      });
    } catch (err) {
      logger.warn("[AssetIntelligence] Error fetching upload", {
        failureCode: ASSET_VALIDATION_UPLOAD_FETCH_FAILED,
        ...getUploadDiagnosticContext(upload, i + 1, uploads.length),
        ...getAssetIntelligenceErrorContext(err),
      });
    }
  }

  if (readableUploadCount === 0) {
    return fallbackValidationResult(uploads);
  }

  // Call Gemini API via gateway (key rotation + retry protection)
  const geminiResult = await genAIClient.models.generateContent({
    model: AI_MODEL,
    contents: [{ role: 'user', parts: imageParts }],
    config: {
      temperature: 0.1,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  });

  const responseText = geminiResult?.text || "";

  try {
    const parsed = parseGeminiJson(responseText) as RawMenuIntakeIdentityResult;
    return toAssetValidationResult(parsed, uploads.length);
  } catch (parseErr) {
    logger.error("[AssetIntelligence] Failed to parse Gemini response", {
      failureCode: ASSET_VALIDATION_RESPONSE_PARSE_FAILED,
      responseTextLength: responseText.length,
      uploadCount: uploads.length,
      readableUploadCount,
      ...getAssetIntelligenceErrorContext(parseErr),
    });

    // Fallback: treat all files as valid menu files with low confidence
    return fallbackValidationResult(uploads);
  }
}

function parseGeminiJson(text: string): RawMenuIntakeIdentityResult {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) throw new Error("No JSON object found in Gemini response");
    return JSON.parse(objectMatch[0]);
  }
}

function fallbackValidationResult(uploads: SessionUpload[]): AssetValidationResult {
  return {
    valid_menu_files: uploads.map((_, i) => i + 1),
    invalid_files: [],
    menu_completeness: "likely_complete",
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

function toAssetValidationResult(raw: RawMenuIntakeIdentityResult, totalFiles: number): AssetValidationResult {
  const normalized = normalizeMenuIntakeIdentityResult(raw, totalFiles);
  const resolvedBusinessType = normalized.identity.businessType || FALLBACK_BUSINESS_TYPE;
  const resolvedBusinessCategory = resolveStoreBusinessCategory(
    resolvedBusinessType,
    normalized.identity.businessCategory || undefined,
  );

  return {
    valid_menu_files: normalized.validation.validMenuFileIndexes,
    invalid_files: normalized.validation.invalidFileIndexes,
    menu_completeness: normalized.validation.menuCompleteness,
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
      type_confidence: normalized.identity.businessType ? normalized.identity.confidence : "low",
    },
  };
}
