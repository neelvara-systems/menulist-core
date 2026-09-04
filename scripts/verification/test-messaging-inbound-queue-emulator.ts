#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { DB_COLLECTIONS } from "../../functions/src/constants/database";
import { admin, firestoreAdmin } from "../../functions/src/firebaseAdmin";
import { MESSAGES } from "../../functions/src/messagingOnboarding/constants";
import {
  drainPendingInboundMessages,
  enqueueInboundMessage,
  enqueueInboundMessages,
  getInboundMessageId,
  processQueuedInboundMessage,
} from "../../functions/src/messagingOnboarding/inboundQueue";
import type { NormalizedMessage } from "../../functions/src/types/messagingOnboarding.types";

const db = firestoreAdmin;
const Timestamp = admin.firestore.Timestamp;
const inbound = db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_INBOUND_MESSAGES);
const sessions = db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS);
const rates = db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_RATE_LIMITS);
const users = db.collection(DB_COLLECTIONS.USERS);

async function clearCollection(
  collection: FirebaseFirestore.CollectionReference,
): Promise<void> {
  while (true) {
    const snapshot = await collection.limit(200).get();
    if (snapshot.empty) return;
    const batch = db.batch();
    for (const document of snapshot.docs) batch.delete(document.ref);
    await batch.commit();
  }
}

function buildMessage(id: string, type: NormalizedMessage["messageType"] = "text"): NormalizedMessage {
  return {
    messageType: type,
    provider: "whatsapp",
    providerMessageId: id,
    rawPayload: { mustNotPersist: true },
    text: type === "text" ? "hello" : undefined,
    timestamp: new Date(),
    userDisplayId: "+919800001001",
    userId: "919800001001",
  };
}

async function verifyDedupAndConcurrentClaim(): Promise<void> {
  const msg = buildMessage("queue-concurrent");
  const first = await enqueueInboundMessage(msg);
  const duplicate = await enqueueInboundMessage(msg);
  assert.equal(first.created, true);
  assert.equal(duplicate.created, false);
  assert.equal(first.messageId, duplicate.messageId);
  const queued = await inbound.doc(first.messageId).get();
  assert.equal(queued.get("rawPayload"), undefined);

  const results = await Promise.all(
    Array.from({ length: 10 }, () => processQueuedInboundMessage(first.messageId)),
  );
  assert.equal(results.filter((result) => result === "processed").length, 1);
  assert.equal(results.filter((result) => result === "skipped").length, 9);
  const completed = await inbound.doc(first.messageId).get();
  assert.equal(completed.get("status"), "PROCESSED");
  assert.equal(completed.get("attempts"), 1);
  assert(completed.get("handlerCompletedAt"));
}

async function verifyBulkEnqueuePreservesBatch(): Promise<void> {
  const messages = Array.from({ length: 25 }, (_, index) => buildMessage(`queue-bulk-${index}`));
  const results = await enqueueInboundMessages([...messages, messages[0]]);
  assert.equal(results.length, 26);
  assert.equal(results.filter((result) => result.created).length, 25);
  assert.equal(results.filter((result) => !result.created).length, 1);
  const persisted = await inbound
    .where("providerMessageId", ">=", "queue-bulk-")
    .where("providerMessageId", "<", "queue-bulk.")
    .get();
  assert.equal(persisted.size, 25);
  const cleanup = db.batch();
  persisted.docs.forEach((doc) => cleanup.update(doc.ref, {
    processedAt: Timestamp.now(),
    status: "PROCESSED",
    updatedAt: Timestamp.now(),
  }));
  await cleanup.commit();
}

async function verifyHandlerCheckpointSurvivesDeliveryRetry(): Promise<void> {
  const originalFetch = globalThis.fetch;
  const originalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const originalAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const sentBodies: string[] = [];
  let requestCount = 0;
  process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-id";
  process.env.WHATSAPP_ACCESS_TOKEN = "token";
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    requestCount++;
    if (typeof init?.body === "string") sentBodies.push(init.body);
    return new Response(null, { status: requestCount === 1 ? 500 : 200 });
  }) as typeof fetch;

  try {
    const msg = buildMessage("queue-delivery-retry", "unsupported");
    const queued = await enqueueInboundMessage(msg);
    assert.equal(await processQueuedInboundMessage(queued.messageId), "retry_scheduled");
    const pending = await inbound.doc(queued.messageId).get();
    assert.equal(pending.get("status"), "PENDING");
    assert.equal(pending.get("replyText"), MESSAGES.NON_MENU_FILE);
    assert(pending.get("handlerCompletedAt"));

    await db.collection(DB_COLLECTIONS.USERS).doc("queue-existing-user").set({
      phone: msg.userDisplayId,
      storeId: 42,
      tenantId: 84,
    });
    await inbound.doc(queued.messageId).update({ nextAttemptAt: Timestamp.now() });
    assert.equal(await processQueuedInboundMessage(queued.messageId), "processed");

    assert.equal(sentBodies.length, 2);
    const retryPayload = JSON.parse(sentBodies[1]) as { text?: { body?: string } };
    assert.equal(
      retryPayload.text?.body,
      MESSAGES.NON_MENU_FILE,
      "delivery retry must use the checkpointed reply instead of rerunning session logic",
    );
    const completed = await inbound.doc(queued.messageId).get();
    assert.equal(completed.get("attempts"), 2);
    assert.equal(completed.get("status"), "PROCESSED");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalPhoneNumberId === undefined) delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    else process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneNumberId;
    if (originalAccessToken === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN;
    else process.env.WHATSAPP_ACCESS_TOKEN = originalAccessToken;
  }
}

async function verifyInvalidPayloadFailsClosed(): Promise<void> {
  const msg = buildMessage("queue-invalid");
  const messageId = getInboundMessageId(msg);
  const now = Timestamp.now();
  await inbound.doc(messageId).set({
    attempts: 0,
    createdAt: now,
    expiresAt: Timestamp.fromMillis(now.toMillis() + 60_000),
    maxAttempts: 5,
    messageId,
    messageType: "text",
    nextAttemptAt: now,
    provider: "unexpected-provider",
    providerDisplayId: msg.userDisplayId,
    providerMessageId: msg.providerMessageId,
    providerTimestamp: now,
    providerUserId: msg.userId,
    status: "PENDING",
    updatedAt: now,
  });
  assert.equal(await processQueuedInboundMessage(messageId), "failed");
  const failed = await inbound.doc(messageId).get();
  assert.equal(failed.get("status"), "FAILED");
  assert.equal(failed.get("lastError"), "INBOUND_PAYLOAD_INVALID");
}

async function verifyInvalidIngressShapesAreRejected(): Promise<void> {
  const missingText = buildMessage("queue-missing-text");
  delete missingText.text;
  await assert.rejects(
    enqueueInboundMessage(missingText),
    /INBOUND_PAYLOAD_INVALID/,
  );

  const stale = buildMessage("queue-stale-ingress");
  stale.timestamp = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
  await assert.rejects(
    enqueueInboundMessage(stale),
    /INBOUND_PAYLOAD_INVALID/,
  );
}

async function verifyMalformedPersistedStateFailsClosed(): Promise<void> {
  const cases: Array<{ id: string; update: Record<string, unknown> }> = [
    { id: "string-attempts", update: { attempts: "0" } },
    { id: "attempt-overflow", update: { attempts: 6 } },
    { id: "orphan-processing-token", update: { processingToken: "unexpected-token" } },
    { id: "orphan-reply", update: { replyText: "already handled" } },
    { id: "invalid-handler-time", update: { handlerCompletedAt: "yesterday" } },
    { id: "invalid-last-error", update: { lastError: { code: "FAILED" } } },
  ];

  for (const testCase of cases) {
    const message = buildMessage(`queue-invalid-${testCase.id}`);
    const queued = await enqueueInboundMessage(message);
    await inbound.doc(queued.messageId).update(testCase.update);
    assert.equal(
      await processQueuedInboundMessage(queued.messageId),
      "failed",
      `${testCase.id} must fail closed`,
    );
    const failed = await inbound.doc(queued.messageId).get();
    assert.equal(failed.get("status"), "FAILED");
    assert.equal(failed.get("lastError"), "INBOUND_PAYLOAD_INVALID");
  }

  const impossibleTimelineMessage = buildMessage("queue-invalid-timeline");
  const impossibleTimeline = await enqueueInboundMessage(impossibleTimelineMessage);
  const timelineNow = Timestamp.now();
  await inbound.doc(impossibleTimeline.messageId).update({
    createdAt: timelineNow,
    expiresAt: Timestamp.fromMillis(timelineNow.toMillis() + 30_000),
    nextAttemptAt: Timestamp.fromMillis(timelineNow.toMillis() + 60_000),
    updatedAt: timelineNow,
  });
  assert.equal(await processQueuedInboundMessage(impossibleTimeline.messageId), "failed");
  const timelineFailed = await inbound.doc(impossibleTimeline.messageId).get();
  assert.equal(timelineFailed.get("lastError"), "INBOUND_PAYLOAD_INVALID");

  const earlyCheckpointMessage = buildMessage("queue-invalid-early-checkpoint");
  const earlyCheckpoint = await enqueueInboundMessage(earlyCheckpointMessage);
  const earlyCheckpointSnapshot = await inbound.doc(earlyCheckpoint.messageId).get();
  await inbound.doc(earlyCheckpoint.messageId).update({
    handlerCompletedAt: Timestamp.fromMillis(
      earlyCheckpointSnapshot.get("createdAt").toMillis() - 1,
    ),
  });
  assert.equal(await processQueuedInboundMessage(earlyCheckpoint.messageId), "failed");
  assert.equal(
    (await inbound.doc(earlyCheckpoint.messageId).get()).get("lastError"),
    "INBOUND_PAYLOAD_INVALID",
  );
}

async function verifyExpiredPayloadFailsClosed(): Promise<void> {
  const message = buildMessage("queue-expired");
  const queued = await enqueueInboundMessage(message);
  const expiredAt = Date.now() - 30_000;
  await inbound.doc(queued.messageId).update({
    createdAt: Timestamp.fromMillis(expiredAt - 60_000),
    expiresAt: Timestamp.fromMillis(expiredAt),
    nextAttemptAt: Timestamp.fromMillis(expiredAt - 15_000),
    updatedAt: Timestamp.fromMillis(expiredAt - 15_000),
  });
  assert.equal(await processQueuedInboundMessage(queued.messageId), "failed");
  const failed = await inbound.doc(queued.messageId).get();
  assert.equal(failed.get("status"), "FAILED");
  assert.equal(failed.get("lastError"), "INBOUND_PAYLOAD_EXPIRED");
}

async function verifyRetryDoesNotOutliveRetention(): Promise<void> {
  const originalFetch = globalThis.fetch;
  const originalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const originalAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-id";
  process.env.WHATSAPP_ACCESS_TOKEN = "token";
  globalThis.fetch = (async () => new Response(null, { status: 500 })) as typeof fetch;

  try {
    const message = buildMessage("queue-retention-boundary", "unsupported");
    const queued = await enqueueInboundMessage(message);
    await inbound.doc(queued.messageId).update({
      expiresAt: Timestamp.fromMillis(Date.now() + 30_000),
    });
    assert.equal(await processQueuedInboundMessage(queued.messageId), "failed");
    const failed = await inbound.doc(queued.messageId).get();
    assert.equal(failed.get("status"), "FAILED");
    assert.equal(failed.get("attempts"), 1);
    assert.equal(failed.get("lastError"), "INBOUND_PROCESSING_FAILED");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalPhoneNumberId === undefined) delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    else process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneNumberId;
    if (originalAccessToken === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN;
    else process.env.WHATSAPP_ACCESS_TOKEN = originalAccessToken;
  }
}

async function verifyPermanentProviderFailureDoesNotRetry(): Promise<void> {
  const originalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const originalAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  delete process.env.WHATSAPP_ACCESS_TOKEN;

  try {
    const message = buildMessage("queue-permanent-provider-failure", "unsupported");
    const queued = await enqueueInboundMessage(message);
    assert.equal(await processQueuedInboundMessage(queued.messageId), "failed");
    const failed = await inbound.doc(queued.messageId).get();
    assert.equal(failed.get("status"), "FAILED");
    assert.equal(failed.get("attempts"), 1);
    assert.equal(failed.get("lastError"), "INBOUND_PROCESSING_FAILED");
  } finally {
    if (originalPhoneNumberId === undefined) delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    else process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneNumberId;
    if (originalAccessToken === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN;
    else process.env.WHATSAPP_ACCESS_TOKEN = originalAccessToken;
  }
}

async function verifyHandlerMutationIsIdempotentAcrossQueueReplay(): Promise<void> {
  const originalFetch = globalThis.fetch;
  const originalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const originalAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const userId = "919800001099";
  const sessionId = "queue-handler-replay-session";
  const sessionRef = db
    .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS)
    .doc(sessionId);
  const now = Timestamp.now();
  let sendCount = 0;
  process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-id";
  process.env.WHATSAPP_ACCESS_TOKEN = "token";
  globalThis.fetch = (async () => {
    sendCount++;
    return new Response(null, { status: 200 });
  }) as typeof fetch;

  try {
    const message = buildMessage("queue-handler-replay", "image");
    message.userId = userId;
    message.userDisplayId = `+${userId}`;
    message.media = {
      fileSize: 1024,
      mimeType: "application/octet-stream",
      providerMediaId: "invalid-provider-media",
    };

    // Model the real crash window: the session mutation committed, but the
    // queue handler/reply checkpoint did not. The replay must reconstruct the
    // original reply without incrementing the strike again.
    await sessionRef.set({
      acquisitionSource: "unknown",
      correctionCount: 0,
      createdAt: now,
      detectedBusinessCategory: null,
      detectedBusinessType: null,
      expiresAt: Timestamp.fromMillis(now.toMillis() + 86_400_000),
      extractedBusinessInfo: null,
      extractedMenuData: null,
      extractionCompletedJobId: null,
      extractionJobId: null,
      fixRequests: [],
      intakeExpiresAt: Timestamp.fromMillis(now.toMillis() + 600_000),
      invalidFiles: [],
      invalidUploadAttempts: 1,
      lastUploadAt: now,
      menuCompleteness: null,
      pendingUploadsWhileProcessing: false,
      previewToken: null,
      previewUrl: null,
      processingRuns: 0,
      provider: "whatsapp",
      providerDisplayId: `+${userId}`,
      providerMessageIds: [message.providerMessageId],
      providerUserId: userId,
      publishedAt: null,
      publishedResult: null,
      qualityScore: null,
      reminderSentAt: null,
      sessionId,
      state: "COLLECTING_INPUT",
      stateHistory: [{ reason: "test", state: "COLLECTING_INPUT", timestamp: now }],
      typeConfidence: null,
      typeSource: "fallback",
      updatedAt: now,
      uploads: [{
        fileName: "initial.png",
        fileSize: 1024,
        id: "initial-upload",
        mimeType: "image/png",
        providerMediaId: "initial-provider-media",
        sha256: crypto.createHash("sha256").update("initial-upload").digest("hex"),
        storagePath: `messagingOnboarding/${sessionId}/initial-upload.png`,
        storageUrl: "https://firebasestorage.googleapis.com/v0/b/demo/o/initial-upload.png?alt=media&token=test",
        uploadedAt: now,
      }],
      validMenuFiles: [],
      validationConfidence: null,
    });

    const queued = await enqueueInboundMessage(message);
    assert.equal(await processQueuedInboundMessage(queued.messageId), "processed");
    assert.equal((await sessionRef.get()).get("invalidUploadAttempts"), 1);
    assert.deepEqual((await sessionRef.get()).get("providerMessageIds"), [message.providerMessageId]);
    assert.equal(sendCount, 1);
    assert.equal((await inbound.doc(queued.messageId).get()).get("replyText"), MESSAGES.NON_MENU_FILE);

    const recordedMedia = buildMessage("queue-recorded-media-replay", "image");
    recordedMedia.userId = userId;
    recordedMedia.userDisplayId = `+${userId}`;
    recordedMedia.media = {
      fileSize: 1024,
      mimeType: "image/png",
      providerMediaId: "initial-provider-media",
    };
    await sessionRef.update({ providerMessageIds: [recordedMedia.providerMessageId] });
    const recordedQueue = await enqueueInboundMessage(recordedMedia);
    assert.equal(await processQueuedInboundMessage(recordedQueue.messageId), "processed");
    assert.equal(
      (await inbound.doc(recordedQueue.messageId).get()).get("replyText"),
      MESSAGES.FIRST_UPLOAD,
    );
    assert.equal(sendCount, 2);
    assert.equal((await sessionRef.get()).get("uploads").length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalPhoneNumberId === undefined) delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    else process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneNumberId;
    if (originalAccessToken === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN;
    else process.env.WHATSAPP_ACCESS_TOKEN = originalAccessToken;
    await sessionRef.delete();
  }
}

async function verifyStaleClaimRecovery(): Promise<void> {
  await db.collection(DB_COLLECTIONS.USERS).doc("queue-existing-user").delete();
  const msg = buildMessage("queue-stale");
  const queued = await enqueueInboundMessage(msg);
  await inbound.doc(queued.messageId).update({
    processingStartedAt: Timestamp.fromMillis(Date.now() - 11 * 60_000),
    processingToken: "stale-token",
    status: "PROCESSING",
  });
  const result = await drainPendingInboundMessages(10);
  assert.equal(result.processed, 1);
  const completed = await inbound.doc(queued.messageId).get();
  assert.equal(completed.get("status"), "PROCESSED");
  assert.equal(completed.get("attempts"), 1);
  assert.equal(completed.get("processingToken"), null);
}

async function main(): Promise<void> {
  assert(process.env.FIRESTORE_EMULATOR_HOST, "FIRESTORE_EMULATOR_HOST is required");
  await Promise.all([
    clearCollection(inbound),
    clearCollection(sessions),
    clearCollection(rates),
    clearCollection(users),
  ]);
  await verifyDedupAndConcurrentClaim();
  await verifyBulkEnqueuePreservesBatch();
  await verifyHandlerCheckpointSurvivesDeliveryRetry();
  await verifyInvalidPayloadFailsClosed();
  await verifyInvalidIngressShapesAreRejected();
  await verifyMalformedPersistedStateFailsClosed();
  await verifyExpiredPayloadFailsClosed();
  await verifyRetryDoesNotOutliveRetention();
  await verifyPermanentProviderFailureDoesNotRetry();
  await verifyHandlerMutationIsIdempotentAcrossQueueReplay();
  await verifyStaleClaimRecovery();
  console.log("Messaging inbound queue emulator tests passed.");
}

let completed = false;
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  completed = true;
});

process.on("beforeExit", () => {
  if (!completed) {
    console.error("Messaging inbound queue emulator tests exited before completion.");
    process.exitCode = 1;
  }
});
