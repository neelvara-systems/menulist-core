#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import {
  getMessagingExpiryTransitionPath,
  isMessagingReminderDue,
  normalizeMessagingCleanupSession,
} from "../../functions/src/messagingOnboarding/sessionCleanupBoundary";
import { isTransitionForbidden } from "../../functions/src/messagingOnboarding/constants";
import type { MessagingOnboardingState } from "../../functions/src/types/messagingOnboarding.types";

const SESSION_ID = "AbCdEfGhIjKlMnOpQrSt";
const TOKEN = "cleanupPreviewToken_1234567890";
const now = Timestamp.now();
const old = Timestamp.fromMillis(now.toMillis() - 13 * 60 * 60 * 1_000);
const uploadId = crypto.createHash("sha1").update("cleanup-upload").digest("hex");

function buildSession() {
  return {
    createdAt: old,
    expiresAt: Timestamp.fromMillis(now.toMillis() + 60_000),
    previewToken: TOKEN,
    previewUrl: `https://menulist.ai/msg-preview/${SESSION_ID}?token=${TOKEN}`,
    provider: "whatsapp",
    providerUserId: "919800000000",
    reminderMessageLeaseToken: null,
    reminderMessageLeaseUntil: null,
    reminderSentAt: null,
    sessionId: SESSION_ID,
    state: "AWAITING_APPROVAL",
    stateHistory: [
      { state: "AWAITING_APPROVAL", timestamp: old },
    ],
    uploads: [{
      id: uploadId,
      mimeType: "image/png",
      storagePath: `messagingOnboarding/${SESSION_ID}/${uploadId}.png`,
    }],
  };
}

const normalized = normalizeMessagingCleanupSession(buildSession(), SESSION_ID);
assert(normalized);
assert.deepEqual(normalized.uploads, [{
  id: uploadId,
  storagePath: `messagingOnboarding/${SESSION_ID}/${uploadId}.png`,
}]);
assert.deepEqual(normalized.storagePaths, [
  `messagingOnboarding/${SESSION_ID}/${uploadId}.png`,
]);
assert.equal(isMessagingReminderDue(normalized, now.toMillis(), 12 * 60 * 60 * 1_000), true);
const expiredApproval = normalizeMessagingCleanupSession({
  ...buildSession(),
  expiresAt: Timestamp.fromMillis(now.toMillis() - 1),
}, SESSION_ID);
assert(expiredApproval);
assert.equal(
  isMessagingReminderDue(expiredApproval, now.toMillis(), 12 * 60 * 60 * 1_000),
  false,
  "Expired approval sessions must never receive reminders",
);

assert.equal(normalizeMessagingCleanupSession(buildSession(), "Z".repeat(20)), null);
assert.equal(normalizeMessagingCleanupSession({
  ...buildSession(),
  uploads: [{
    id: uploadId,
    mimeType: "image/png",
    storagePath: `messagingOnboarding/${"Z".repeat(20)}/${uploadId}.png`,
  }],
}, SESSION_ID), null, "A cleanup row must not address another session's objects");
assert.equal(normalizeMessagingCleanupSession({
  ...buildSession(),
  previewUrl: `https://attacker.example/msg-preview/${SESSION_ID}?token=${TOKEN}`,
}, SESSION_ID, "https://menulist.ai"), null);
assert.equal(normalizeMessagingCleanupSession({
  ...buildSession(),
  reminderMessageLeaseToken: "lease-token",
  reminderMessageLeaseUntil: null,
}, SESSION_ID), null);

const recentState = normalizeMessagingCleanupSession({
  ...buildSession(),
  stateHistory: [
    { state: "AWAITING_APPROVAL", timestamp: old },
    { state: "AWAITING_APPROVAL", timestamp: now },
  ],
}, SESSION_ID);
assert(recentState);
assert.equal(
  isMessagingReminderDue(recentState, now.toMillis(), 12 * 60 * 60 * 1_000),
  false,
  "Reminder age must use the current state entry, not the first historical preview",
);

for (const state of [
  "COLLECTING_INPUT",
  "VALIDATING_ASSETS",
  "AWAITING_MORE_UPLOADS",
  "PROCESSING_MENU",
  "PREVIEW_READY",
  "AWAITING_APPROVAL",
  "PUBLISHING",
  "FAILED",
] as const) {
  const path = getMessagingExpiryTransitionPath(state);
  assert.equal(path.at(-1), "EXPIRED");
  let current: MessagingOnboardingState = state;
  for (const next of path) {
    assert.equal(isTransitionForbidden(current, next), null, `${current} -> ${next} must be allowed`);
    current = next;
  }
}
assert.deepEqual(getMessagingExpiryTransitionPath("LIVE"), []);
assert.deepEqual(getMessagingExpiryTransitionPath("EXPIRED"), []);
assert.deepEqual(getMessagingExpiryTransitionPath("COOLDOWN"), []);

console.log("Messaging session cleanup boundary verification passed.");
