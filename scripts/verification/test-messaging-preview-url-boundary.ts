#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import { normalizeMessagingPreviewBaseUrl } from "../../functions/src/messagingOnboarding/previewUrlBoundary";

assert.equal(
  normalizeMessagingPreviewBaseUrl("menulist.digital/owner", false),
  "https://menulist.digital/owner",
);
assert.equal(
  normalizeMessagingPreviewBaseUrl("https://menulist.digital/owner/", false),
  "https://menulist.digital/owner",
);
assert.equal(normalizeMessagingPreviewBaseUrl("http://menulist.digital", false), null);
assert.equal(normalizeMessagingPreviewBaseUrl("javascript:alert(1)", false), null);
assert.equal(normalizeMessagingPreviewBaseUrl("https://user:pass@menulist.digital", false), null);
assert.equal(normalizeMessagingPreviewBaseUrl("https://menulist.digital?token=x", false), null);
assert.equal(normalizeMessagingPreviewBaseUrl("http://localhost:3000", false), null);
assert.equal(normalizeMessagingPreviewBaseUrl("http://localhost:3000", true), "http://localhost:3000");
assert.equal(normalizeMessagingPreviewBaseUrl(" http://localhost:3000", true), null);

console.log("Messaging preview URL boundary verification passed.");
