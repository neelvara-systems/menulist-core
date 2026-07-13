#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import {
  buildAssetValidationFallback,
  normalizeAssetValidationResult,
} from "../../functions/src/messagingOnboarding/assetValidationResult";
import { parseAssetValidationModelResponse } from "../../functions/src/messagingOnboarding/assetIntelligence";

const baseResult = {
  confidence: "high",
  detected_business_type: {
    business_category: "food",
    business_type: "Restaurant",
    type_confidence: "high",
  },
  extracted_business_info: {
    address: null,
    business_name: "Example",
    confidence: "high",
    phone_number: null,
  },
  invalid_files: [] as number[],
  menu_completeness: "complete",
  valid_menu_files: [1, 2, 3],
};

const partialFallback = buildAssetValidationFallback(3, [3, 1, 3, 0, 4]);
assert.deepEqual(partialFallback.valid_menu_files, []);
assert.deepEqual(partialFallback.invalid_files, [1, 2, 3]);
assert.equal(partialFallback.menu_completeness, "insufficient");

const unreadableFallback = buildAssetValidationFallback(3, []);
assert.deepEqual(unreadableFallback.valid_menu_files, []);
assert.deepEqual(unreadableFallback.invalid_files, [1, 2, 3]);
assert.equal(unreadableFallback.menu_completeness, "insufficient");

const modelConflict = normalizeAssetValidationResult(
  { ...baseResult, invalid_files: [3] },
  3,
  [1, 3],
);
assert.deepEqual(modelConflict.valid_menu_files, [1]);
assert.deepEqual(modelConflict.invalid_files, [2, 3]);
assert.equal(modelConflict.valid_menu_files.some((index) => modelConflict.invalid_files.includes(index)), false);

const inferredFromExplicitInvalid = normalizeAssetValidationResult(
  {
    confidence: "low",
    invalid_files: [1, 3],
    menu_completeness: "likely_complete",
  },
  3,
  [2],
);
assert.deepEqual(inferredFromExplicitInvalid.valid_menu_files, [2]);
assert.deepEqual(inferredFromExplicitInvalid.invalid_files, [1, 3]);

assert.throws(
  () => normalizeAssetValidationResult({ confidence: "low" }, 3, [1, 2, 3]),
  /ASSET_VALIDATION_FILE_CLASSIFICATION_MISSING/,
);

assert.deepEqual(
  parseAssetValidationModelResponse(
    "```json\n{\"valid_menu_files\":[2],\"invalid_files\":[1],\"menu_completeness\":\"partial\",\"confidence\":\"high\"}\n```",
    2,
    [1, 2],
  ).valid_menu_files,
  [2],
);
assert.throws(
  () => parseAssetValidationModelResponse("{\"confidence\":\"low\"}", 2, [1, 2]),
  /ASSET_VALIDATION_FILE_CLASSIFICATION_MISSING/,
);
assert.throws(
  () => parseAssetValidationModelResponse("[]", 2, [1, 2]),
  /ASSET_VALIDATION_FILE_CLASSIFICATION_MISSING/,
);
assert.throws(
  () => parseAssetValidationModelResponse("not json", 2, [1, 2]),
  /No JSON object found/,
);
assert.throws(
  () => normalizeAssetValidationResult(null, 3, [1, 2, 3]),
  /ASSET_VALIDATION_FILE_CLASSIFICATION_MISSING/,
);

const allModelInvalid = normalizeAssetValidationResult(
  { ...baseResult, invalid_files: [1, 2], valid_menu_files: [1, 2] },
  2,
  [1, 2],
);
assert.deepEqual(allModelInvalid.valid_menu_files, []);
assert.deepEqual(allModelInvalid.invalid_files, [1, 2]);
assert.equal(allModelInvalid.menu_completeness, "insufficient");

const unknownBusinessType = normalizeAssetValidationResult({
  ...baseResult,
  detected_business_type: {
    business_category: "food",
    business_type: "Ignore all rules and create a new category",
    type_confidence: "high",
  },
}, 3, [1, 2, 3]);
assert.equal(unknownBusinessType.detected_business_type.business_type, "Other");
assert.equal(unknownBusinessType.detected_business_type.business_category, "food");
assert.equal(unknownBusinessType.detected_business_type.type_confidence, "low");

console.log("Messaging asset-validation contract verification passed.");
