#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import {
  estimateInlineAssetValidationRequestBytes,
  shouldInlineAssetValidationFiles,
} from "../../functions/src/messagingOnboarding/assetModelInputBoundary";

const prompt = "Validate these menu files";
assert.equal(shouldInlineAssetValidationFiles(prompt, []), true);
assert.equal(shouldInlineAssetValidationFiles(prompt, [1024 * 1024]), true);
assert.equal(
  shouldInlineAssetValidationFiles(prompt, [10 * 1024 * 1024, 5 * 1024 * 1024]),
  false,
  "base64 expansion must move a valid multi-file intake to the Files API path",
);
assert.equal(shouldInlineAssetValidationFiles(prompt, [-1]), false);
assert.equal(shouldInlineAssetValidationFiles(prompt, [Number.MAX_VALUE]), false);
assert(
  estimateInlineAssetValidationRequestBytes(prompt, [1024])
    > Buffer.byteLength(prompt, "utf8") + 1024,
  "the estimate must include base64 expansion and JSON overhead",
);

console.log("Messaging asset model-input boundary verification passed.");
