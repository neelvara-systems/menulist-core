#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { DB_COLLECTIONS } from "@constant/database";
import { admin } from "@lib/firebase/firebaseAdmin";
import {
  applyMessagingOnboardingFixRequest,
  MAX_MESSAGING_ONBOARDING_CORRECTIONS_PER_SESSION,
} from "@lib/messaging-onboarding/fixRequestTransaction";

const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;
const sessions = db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS);
const token = "preview-token-1234567890";

function sessionId(prefix: string): string {
  return prefix.replace(/[^A-Za-z0-9]/g, "").padEnd(20, "0").slice(0, 20);
}

function buildSession(id: string, correctionCount: number) {
  const now = Timestamp.now();
  const uploadId = crypto.createHash("sha1").update(id).digest("hex");
  const storagePath = `messagingOnboarding/${id}/${uploadId}.png`;
  return {
    correctionCount,
    createdAt: now,
    expiresAt: Timestamp.fromMillis(now.toMillis() + 60_000),
    extractedBusinessInfo: { businessName: "Old" },
    extractedMenuData: { items: [{ id: "old" }] },
    extractedProjectFiles: [{ uid: "old" }],
    extractionCompletedJobId: "old-job",
    extractionJobId: "old-job",
    fixMessageDeliveryAttempts: 4,
    fixMessageLeaseToken: "stale-fix-lease",
    fixMessageLeaseUntil: Timestamp.fromMillis(now.toMillis() + 60_000),
    fixMessagePending: false,
    fixRequests: [],
    lastUploadAt: Timestamp.fromMillis(now.toMillis() - 30_000),
    previewMessageLeaseToken: "stale-preview-lease",
    previewMessageLeaseUntil: Timestamp.fromMillis(now.toMillis() + 60_000),
    previewMessageDeliveryAttempts: 4,
    previewMessagePending: true,
    previewToken: token,
    previewUrl: `https://localhost/msg-preview/${id}?token=${token}`,
    qualityScore: 90,
    provider: "whatsapp",
    providerUserId: "919800000000",
    pendingUploadCleanupPaths: [],
    replacementUploads: [],
    sessionId: id,
    state: "AWAITING_APPROVAL",
    stateHistory: [{ state: "AWAITING_APPROVAL", timestamp: now }],
    updatedAt: now,
    uploadCleanupPending: false,
    uploads: [{
      fileName: "menu.png",
      fileSize: 1024,
      id: uploadId,
      mimeType: "image/png",
      providerMediaId: `provider-${uploadId}`,
      sha256: crypto.createHash("sha256").update(id).digest("hex"),
      storagePath,
      storageUrl: `https://firebasestorage.googleapis.com/v0/b/demo/o/${encodeURIComponent(storagePath)}?alt=media&token=test`,
      uploadedAt: now,
    }],
  };
}

async function verifyConcurrentCorrectionSerializes(): Promise<void> {
  const id = sessionId("FixRaceSession1");
  await sessions.doc(id).set(buildSession(id, 2));

  const results = await Promise.all(
    Array.from({ length: 10 }, () => applyMessagingOnboardingFixRequest({
      cleanupPendingUploads: async () => undefined,
      issues: ["price_incorrect"],
      note: "Please check price",
      sessionId: id,
      token,
    })),
  );
  assert.equal(results.filter((result) => result.status === "updated").length, 1);

  const stored = await sessions.doc(id).get();
  assert.equal(stored.get("correctionCount"), 3);
  assert.equal(stored.get("state"), "COLLECTING_INPUT");
  assert.equal(stored.get("extractionJobId"), null);
  assert.equal(stored.get("extractionCompletedJobId"), null);
  assert.equal(stored.get("previewToken"), null);
  assert.equal(stored.get("previewMessagePending"), false);
  assert.equal(stored.get("previewMessageDeliveryAttempts"), 0);
  assert.equal(stored.get("previewMessageLeaseToken"), null);
  assert.equal(stored.get("fixMessagePending"), true);
  assert.equal(stored.get("fixMessageDeliveryAttempts"), 0);
  assert.equal(stored.get("fixMessageLeaseToken"), null);
  assert.deepEqual(stored.get("uploads"), []);
  assert.deepEqual(stored.get("replacementUploads"), []);
  assert.equal(stored.get("uploadCleanupPending"), true);
  assert.equal((stored.get("pendingUploadCleanupPaths") as string[]).length, 1);
  assert.equal((stored.get("fixRequests") as unknown[]).length, 1);
  assert(stored.get("lastUploadAt").toMillis() < stored.get("updatedAt").toMillis());
}

async function verifyRejectionsDoNotMutate(): Promise<void> {
  const maxId = sessionId("FixMaxSession1");
  await sessions.doc(maxId).set(buildSession(
    maxId,
    MAX_MESSAGING_ONBOARDING_CORRECTIONS_PER_SESSION,
  ));
  assert.equal((await applyMessagingOnboardingFixRequest({
    issues: ["other"],
    sessionId: maxId,
    token,
  })).status, "max_reached");

  const tokenId = sessionId("FixTokenSession1");
  await sessions.doc(tokenId).set(buildSession(tokenId, 0));
  assert.equal((await applyMessagingOnboardingFixRequest({
    issues: ["item_missing"],
    sessionId: tokenId,
    token: "wrong-token-1234567890",
  })).status, "invalid_token");
  assert.equal((await sessions.doc(tokenId).get()).get("state"), "AWAITING_APPROVAL");

  assert.equal((await applyMessagingOnboardingFixRequest({
    issues: ["other"],
    sessionId: "path/escape",
    token,
  })).status, "invalid_input");
  const invalidIssueResult = await Reflect.apply(applyMessagingOnboardingFixRequest, null, [{
    issues: ["not_supported"],
    sessionId: tokenId,
    token,
  }]);
  assert.equal(invalidIssueResult.status, "invalid_input");

  assert.equal((await applyMessagingOnboardingFixRequest({
    issues: ["other", "other"],
    sessionId: tokenId,
    token,
  })).status, "invalid_input");

  const expiredId = sessionId("FixExpiredSession1");
  const expired = buildSession(expiredId, 0);
  expired.expiresAt = Timestamp.fromMillis(Date.now() - 1);
  await sessions.doc(expiredId).set(expired);
  assert.equal((await applyMessagingOnboardingFixRequest({
    issues: ["other"],
    sessionId: expiredId,
    token,
  })).status, "expired");
}

async function run(): Promise<void> {
  assert(process.env.FIRESTORE_EMULATOR_HOST, "FIRESTORE_EMULATOR_HOST is required");
  await verifyConcurrentCorrectionSerializes();
  await verifyRejectionsDoNotMutate();
  console.log("Messaging fix-request emulator verification passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
