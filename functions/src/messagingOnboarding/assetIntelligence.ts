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
  imageParts.push({ text: buildValidationPrompt(uploads.length) });

  // Download and encode each upload as base64 for Gemini
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
    const parsed = JSON.parse(responseText) as AssetValidationResult;
    return normalizeValidationResult(parsed, uploads.length);
  } catch (parseErr) {
    logger.error("[AssetIntelligence] Failed to parse Gemini response", {
      responseText: responseText.slice(0, 500),
      error: (parseErr as Error).message,
    });

    // Fallback: treat all files as valid menu files with low confidence
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
        business_type: "Restaurant",
        business_category: "food",
        type_confidence: "low",
      },
    };
  }
}

/**
 * Build the validation prompt for Gemini
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §8.4
 */
function buildValidationPrompt(fileCount: number): string {
  return `You are a menu validation system. Analyze the provided ${fileCount} image(s)/document(s) and return ONLY valid JSON.

For each file (numbered 1 to ${fileCount} in order), determine:
1. Is this an actual menu page with items and prices? (not a logo, interior photo, selfie, etc.)
2. Is there business information visible? (name, phone, address)
3. What type of business is this? (detect from menu content, items, services, pricing patterns)

Return this exact JSON structure:
{
  "valid_menu_files": [1, 3, 4],
  "invalid_files": [2, 5],
  "menu_completeness": "likely_complete",
  "confidence": "high",
  "extracted_business_info": {
    "business_name": "string or null",
    "phone_number": "string or null",
    "address": "string or null",
    "logo_present": true,
    "cuisine_hint": "string or null",
    "confidence": "high"
  },
  "detected_business_type": {
    "business_type": "Restaurant",
    "business_category": "food",
    "type_confidence": "high"
  }
}

BUSINESS TYPE RULES:
- Food menus (items + prices) → category "food", type from: Restaurant, Cafe, Bakery, Bar, Fast Food, Cloud Kitchen, Food Truck, Ice Cream
- Service price lists (salon, spa, gym) → category "service" or "health", type from: Salon, Spa, Gym, Clinic
- If unsure → { "business_type": "Restaurant", "business_category": "food", "type_confidence": "low" }

VALIDATION RULES:
- Valid menu: contains item names AND prices OR service list with pricing
- Invalid: logos, interiors, people, business cards, GST certificates, random photos, personal documents
- menu_completeness: "likely_complete" if most categories seem present, "partial" if obvious gaps, "insufficient" if too few items
- confidence: "high" if clear menu, "medium" if readable but unclear, "low" if poor quality
- Extract business info aggressively — even low confidence is useful
- Return ONLY JSON, no other text`;
}

/**
 * Normalize and sanitize Gemini response
 */
function normalizeValidationResult(
  raw: AssetValidationResult,
  totalFiles: number,
): AssetValidationResult {
  // Ensure valid_menu_files and invalid_files are arrays of numbers within range
  const validFiles = (raw.valid_menu_files || []).filter(
    (n) => typeof n === "number" && n >= 1 && n <= totalFiles,
  );
  const invalidFiles = (raw.invalid_files || []).filter(
    (n) => typeof n === "number" && n >= 1 && n <= totalFiles,
  );

  // Default completeness
  const completeness = ["complete", "likely_complete", "partial", "insufficient"].includes(
    raw.menu_completeness,
  )
    ? raw.menu_completeness
    : "likely_complete";

  // Default confidence
  const confidence = ["high", "medium", "low"].includes(raw.confidence)
    ? raw.confidence
    : "low";

  // Default business info
  const bizInfo = raw.extracted_business_info || {
    business_name: null,
    phone_number: null,
    address: null,
    logo_present: false,
    cuisine_hint: null,
    confidence: "low" as const,
  };

  // Default business type
  const bizType = raw.detected_business_type || {
    business_type: "Restaurant",
    business_category: "food",
    type_confidence: "low" as const,
  };

  return {
    valid_menu_files: validFiles,
    invalid_files: invalidFiles,
    menu_completeness: completeness,
    confidence,
    extracted_business_info: {
      business_name: bizInfo.business_name || null,
      phone_number: bizInfo.phone_number || null,
      address: bizInfo.address || null,
      logo_present: !!bizInfo.logo_present,
      cuisine_hint: bizInfo.cuisine_hint || null,
      confidence: ["high", "medium", "low"].includes(bizInfo.confidence)
        ? bizInfo.confidence
        : "low",
    },
    detected_business_type: {
      business_type: bizType.business_type || "Restaurant",
      business_category: bizType.business_category || "food",
      type_confidence: ["high", "medium", "low"].includes(
        bizType.type_confidence,
      )
        ? bizType.type_confidence
        : "low",
    },
  };
}
