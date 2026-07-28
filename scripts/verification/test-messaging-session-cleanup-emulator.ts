#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import { DB_COLLECTIONS } from "../../functions/src/constants/database";
import { admin, firestoreAdmin } from "../../functions/src/firebaseAdmin";
import { FEATURE_FLAGS } from "../../functions/src/messagingOnboarding/constants";
import { quarantineInvalidMessagingCleanupSession } from "../../functions/src/messagingOnboarding/reminderLease";
import { messagingSessionCleanupLogic } from "../../functions/src/schedulers/messagingSessionCleanup";

const db = firestoreAdmin;
const Timestamp = admin.firestore.Timestamp;
const sessions = db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS);
const inbound = db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_INBOUND_MESSAGES);

function buildSession(params: {
  expiresAt: FirebaseFirestore.Timestamp;
  sessionId: string;
  state: "COLLECTING_INPUT" | "COOLDOWN" | "EXPIRED" | "PUBLISHING";
}) {
  const createdAt = Timestamp.fromMillis(params.expiresAt.toMillis() - 60_000);
  return {
    createdAt,
    expiresAt: params.expiresAt,
    previewToken: null,
    previewUrl: null,
    provider: "whatsapp",
    providerUserId: `user-${params.sessionId}`,
    reminderMessageLeaseToken: null,
    reminderMessageLeaseUntil: null,
    reminderSentAt: null,
    sessionId: params.sessionId,
    state: params.state,
    stateHistory: [{ state: params.state, timestamp: createdAt }],
    uploads: [],
    updatedAt: createdAt,
  };
}

async function main(): Promise<void> {
  const now = Timestamp.now();
  const publishingId = "PuBlIsHiNg1234567890";
  const cleanupId = "ClEaNuPSesS123456789";
  const cooldownCleanupId = "CoOlDoWnCl1234567890";
  const malformedId = "MaLfOrMeDX1234567890";
  const protectedId = "PrOtEcTeDX1234567890";
  const processingInboundId = "processing-inbound";
  const processedInboundId = "processed-inbound";

  await Promise.all([
    sessions.doc(publishingId).set(buildSession({
      expiresAt: Timestamp.fromMillis(now.toMillis() - 1_000),
      sessionId: publishingId,
      state: "PUBLISHING",
    })),
    sessions.doc(cleanupId).set(buildSession({
      expiresAt: Timestamp.fromMillis(now.toMillis() - 49 * 60 * 60 * 1_000),
      sessionId: cleanupId,
      state: "EXPIRED",
    })),
    sessions.doc(cooldownCleanupId).set(buildSession({
      expiresAt: Timestamp.fromMillis(now.toMillis() - 49 * 60 * 60 * 1_000),
      sessionId: cooldownCleanupId,
      state: "COOLDOWN",
    })),
    sessions.doc(malformedId).set(buildSession({
      expiresAt: Timestamp.fromMillis(now.toMillis() - 49 * 60 * 60 * 1_000),
      sessionId: protectedId,
      state: "EXPIRED",
    })),
    sessions.doc(protectedId).set(buildSession({
      expiresAt: Timestamp.fromMillis(now.toMillis() + 60 * 60 * 1_000),
      sessionId: protectedId,
      state: "COLLECTING_INPUT",
    })),
    inbound.doc(processingInboundId).set({
      expiresAt: Timestamp.fromMillis(now.toMillis() - 1_000),
      status: "PROCESSING",
    }),
    inbound.doc(processedInboundId).set({
      expiresAt: Timestamp.fromMillis(now.toMillis() - 1_000),
      status: "PROCESSED",
    }),
  ]);

  const result = await messagingSessionCleanupLogic();
  assert.equal(result.expired, 1);
  assert.equal(result.cleaned, 2);
  assert.equal(result.inboundCleaned, 1);
  assert.equal((await sessions.doc(publishingId).get()).get("state"), "EXPIRED");
  const publishingHistory = (await sessions.doc(publishingId).get()).get("stateHistory");
  assert.deepEqual(publishingHistory.slice(-2).map((entry: { state: string }) => entry.state), [
    "FAILED",
    "EXPIRED",
  ]);
  assert.equal((await sessions.doc(cleanupId).get()).exists, false);
  assert.equal((await sessions.doc(cooldownCleanupId).get()).exists, false);
  assert.equal(
    (await sessions.doc(malformedId).get()).exists,
    false,
    "An invalid terminal row must not remain in the bounded cleanup query",
  );
  assert.equal(
    (await sessions.doc(protectedId).get()).get("state"),
    "COLLECTING_INPUT",
    "A malformed embedded session ID must never mutate its target document",
  );
  assert.equal(
    (await inbound.doc(processingInboundId).get()).exists,
    true,
    "Cleanup must not delete a queue row while a worker owns its PROCESSING claim",
  );
  assert.equal((await inbound.doc(processedInboundId).get()).exists, false);

  const disabledExpiryId = "DiSaBlEdExPiRy123456";
  const disabledInboundId = "disabled-expired-inbound";
  (FEATURE_FLAGS as { ENABLE_MESSAGING_ONBOARDING: boolean }).ENABLE_MESSAGING_ONBOARDING = false;
  await Promise.all([
    sessions.doc(disabledExpiryId).set(buildSession({
      expiresAt: Timestamp.fromMillis(now.toMillis() - 49 * 60 * 60 * 1_000),
      sessionId: disabledExpiryId,
      state: "COLLECTING_INPUT",
    })),
    inbound.doc(disabledInboundId).set({
      expiresAt: Timestamp.fromMillis(now.toMillis() - 1_000),
      status: "PROCESSED",
    }),
  ]);
  const disabledResult = await messagingSessionCleanupLogic();
  assert.equal(disabledResult.reminders, 0, "A disabled feature must not send reminders");
  assert.equal(disabledResult.expired, 1, "Session expiry must continue while the feature is disabled");
  assert.equal(disabledResult.cleaned, 1, "Expired session cleanup must continue while disabled");
  assert.equal(disabledResult.inboundCleaned, 1, "Inbound retention must continue while disabled");
  assert.equal((await sessions.doc(disabledExpiryId).get()).exists, false);
  assert.equal((await inbound.doc(disabledInboundId).get()).exists, false);

  const staleQuarantineId = "StAlEQuArAnTiNe12345";
  const staleQuarantineRef = sessions.doc(staleQuarantineId);
  await staleQuarantineRef.set(buildSession({
    expiresAt: Timestamp.fromMillis(now.toMillis() - 1_000),
    sessionId: "different-embedded-session",
    state: "EXPIRED",
  }));
  const staleSnapshot = await staleQuarantineRef.get();
  await staleQuarantineRef.update({
    sessionId: staleQuarantineId,
    state: "COLLECTING_INPUT",
    stateHistory: [{ state: "COLLECTING_INPUT", timestamp: now }],
    updatedAt: now,
  });
  await assert.rejects(
    quarantineInvalidMessagingCleanupSession({
      docRef: staleQuarantineRef,
      lastUpdateTime: staleSnapshot.updateTime,
      now: Timestamp.now(),
      stage: "cleanup",
    }),
    (error: unknown) => {
      if (!error || typeof error !== "object") return false;
      const code = Reflect.get(error, "code");
      return code === 9 || code === "failed-precondition";
    },
    "A stale quarantine snapshot must not overwrite a concurrent valid state update",
  );
  assert.equal((await staleQuarantineRef.get()).get("state"), "COLLECTING_INPUT");

  await Promise.all([
    sessions.doc(publishingId).delete(),
    sessions.doc(protectedId).delete(),
    staleQuarantineRef.delete(),
    inbound.doc(processingInboundId).delete(),
  ]);
  await admin.app().delete();
  console.log("Messaging session cleanup emulator verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
