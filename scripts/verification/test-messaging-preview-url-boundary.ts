#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import { normalizeMessagingPreviewBaseUrl } from "../../functions/src/messagingOnboarding/previewUrlBoundary";

assert.equal(
  normalizeMessagingPreviewBaseUrl("qa.menulist.digital/owner", false),
  "https://qa.menulist.digital/owner",
);
assert.equal(
  normalizeMessagingPreviewBaseUrl("https://qa.menulist.digital/owner/", false),
  "https://qa.menulist.digital/owner",
);
assert.equal(normalizeMessagingPreviewBaseUrl("http://qa.menulist.digital", false), null);
assert.equal(normalizeMessagingPreviewBaseUrl("javascript:alert(1)", false), null);
assert.equal(normalizeMessagingPreviewBaseUrl("https://user:pass@qa.menulist.digital", false), null);
assert.equal(normalizeMessagingPreviewBaseUrl("https://qa.menulist.digital?token=x", false), null);
assert.equal(normalizeMessagingPreviewBaseUrl("http://localhost:3000", false), null);
assert.equal(normalizeMessagingPreviewBaseUrl("http://localhost:3000", true), "http://localhost:3000");
assert.equal(normalizeMessagingPreviewBaseUrl(" http://localhost:3000", true), null);

console.log("Messaging preview URL boundary verification passed.");
