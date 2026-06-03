/**
 * Asset Intelligence — Gemini Validation + Business Info Extraction
 *
 * Single Gemini call per session to validate uploaded files and extract
 * business information before sending to the extraction pipeline.
 *
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §8.4
 */

import * as functions from "firebase-functions";
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
import { AssetValidationResult, SessionUpload } from "../types/messagingOnboarding.types";

const logger = functions.logger;

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
      const response = await fetch(upload.storageUrl);
      if (!response.ok) {
        logger.warn("[AssetIntelligence] Failed to fetch upload for validation", {
          uploadId: upload.id,
          status: response.status,
        });
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
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
        uploadId: upload.id,
        error: (err as Error).message,
      });
    }
  }

  if (readableUploadCount === 0) {
    return fallbackValidationResult(uploads);
  }

  // Call Gemini API via gateway (key rotation + retry protection)
  const geminiResult = await genAIClient.models.generateContent({
    model: 'gemini-2.5-flash',
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
      responseText: responseText.slice(0, 500),
      error: (parseErr as Error).message,
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
