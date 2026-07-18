#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { DB_COLLECTIONS } from "../../functions/src/constants/database";
import { admin, firestoreAdmin } from "../../functions/src/firebaseAdmin";
import {
  addUploadToSession,
  appendStoredUploadOrCleanup,
  createSessionWithId,
  findActiveSession,
  findExistingStoreByPhone,
  getUserHash,
  handleMessage,
  isMessagingUploadPathReferencedBySession,
} from "../../functions/src/messagingOnboarding/sessionEngine";
import type { IMessagingProvider } from "../../functions/src/messagingOnboarding/providers/IMessagingProvider";
import type {
  MessagingOnboardingSession,
  NormalizedMessage,
  SessionUpload,
} from "../../functions/src/types/messagingOnboarding.types";

const db = firestoreAdmin;
const Timestamp = admin.firestore.Timestamp;
const sessions = db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS);
const rates = db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_RATE_LIMITS);

function buildMessage(providerMessageId: string, userId: string): NormalizedMessage {
  return {
    media: {
      fileName: `${providerMessageId}.png`,
      fileSize: 1024,
      mimeType: "image/png",
      providerMediaId: `media-${providerMessageId}`,
    },
    messageType: "image",
    provider: "whatsapp",
    providerMessageId,
    rawPayload: null,
    timestamp: new Date(),
    userDisplayId: `+${userId}`,
    userId,
  };
}

function buildUpload(
  id: string,
  uploadedAt = Timestamp.now(),
  sessionId = "test",
): SessionUpload {
  return {
    fileName: `${id}.png`,
    fileSize: 1024,
    id,
    mimeType: "image/png",
    providerMediaId: `provider-${id}`,
    sha256: crypto.createHash("sha256").update(id).digest("hex"),
    storagePath: `messagingOnboarding/${sessionId}/${id}.png`,
    storageUrl: `https://firebasestorage.googleapis.com/v0/b/demo/o/${id}.png?alt=media&token=test`,
    uploadedAt,
  };
}

function buildSession(sessionId: string, userId: string): MessagingOnboardingSession {
  const now = Timestamp.now();
  return {
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
    invalidUploadAttempts: 0,
    lastUploadAt: now,
    menuCompleteness: null,
    pendingUploadsWhileProcessing: false,
    previewToken: null,
    previewUrl: null,
    processingRuns: 0,
    provider: "whatsapp",
    providerDisplayId: `+${userId}`,
    providerMessageIds: [],
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
    uploads: [buildUpload(`${sessionId}-initial`, Timestamp.now(), sessionId)],
    validMenuFiles: [],
    validationConfidence: null,
  };
}

function verifyUploadPersistenceProjection(): void {
  const session = buildSession("upload-persistence-projection", "919800000100");
  const retained = session.uploads[0];
  assert.equal(
    isMessagingUploadPathReferencedBySession(session, session.sessionId, retained.storagePath),
    true,
  );
  assert.equal(
    isMessagingUploadPathReferencedBySession(session, session.sessionId, `${retained.storagePath}.other`),
    false,
  );
  assert.equal(
    isMessagingUploadPathReferencedBySession(
      { ...session, uploads: [{ ...retained, storagePath: "wrong-scope/path.png" }] },
      session.sessionId,
      retained.storagePath,
    ),
    null,
  );
  assert.equal(
    isMessagingUploadPathReferencedBySession(session, "different-session", retained.storagePath),
    null,
  );
}

async function verifyAtomicSessionAdmission(): Promise<void> {
  const userId = "919800000101";
  const attempts = await Promise.allSettled(
    Array.from({ length: 12 }, (_, index) => createSessionWithId(
      `admission-${index}`,
      buildMessage(`admission-message-${index}`, userId),
      buildUpload(`admission-upload-${index}`, Timestamp.now(), `admission-${index}`),
    )),
  );
  assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
  assert.equal(
    attempts.filter((attempt) => attempt.status === "rejected"
      && String(attempt.reason).includes("SESSION_ADMISSION_ACTIVE")).length,
    11,
  );

  const active = await sessions.where("providerUserId", "==", userId).get();
  assert.equal(active.size, 1);
  const firstSessionId = active.docs[0].id;
  const rateRef = rates.doc(getUserHash("whatsapp", userId));
  let rate = await rateRef.get();
  assert.equal(rate.get("activeSessionId"), firstSessionId);
  assert.equal(rate.get("sessionsToday"), 1);
  assert.equal(rate.get("sessionsThisWeek"), 1);

  await active.docs[0].ref.update({ state: "EXPIRED" });
  await createSessionWithId(
    "admission-second",
    buildMessage("admission-second", userId),
    buildUpload("admission-second", Timestamp.now(), "admission-second"),
  );
  rate = await rateRef.get();
  assert.equal(rate.get("activeSessionId"), "admission-second");
  assert.equal(rate.get("sessionsToday"), 2);
  assert.equal(rate.get("sessionsThisWeek"), 2);

  await sessions.doc("admission-second").update({ state: "EXPIRED" });
  await assert.rejects(
    () => createSessionWithId(
      "admission-daily-cap",
      buildMessage("admission-daily-cap", userId),
      buildUpload("admission-daily-cap", Timestamp.now(), "admission-daily-cap"),
    ),
    /SESSION_ADMISSION_INVALID/,
  );
  assert.equal((await sessions.doc("admission-daily-cap").get()).exists, false);

  await rateRef.update({ dayResetAt: Timestamp.fromMillis(Date.now() - 1) });
  await createSessionWithId(
    "admission-after-reset",
    buildMessage("admission-after-reset", userId),
    buildUpload("admission-after-reset", Timestamp.now(), "admission-after-reset"),
  );
  rate = await rateRef.get();
  assert.equal(rate.get("sessionsToday"), 1);
  assert.equal(rate.get("sessionsThisWeek"), 3);
}

async function verifyConcurrentUploadAppend(): Promise<void> {
  const session = buildSession("append-race", "919800000102");
  const old = Timestamp.fromMillis(Date.now() - 60_000);
  const latestPreview = Timestamp.fromMillis(Date.now() - 10_000);
  session.uploads = [buildUpload("append-initial", old, session.sessionId)];
  session.stateHistory = [
    { reason: "old preview", state: "PREVIEW_READY", timestamp: old },
    { reason: "restart", state: "COLLECTING_INPUT", timestamp: Timestamp.fromMillis(Date.now() - 30_000) },
    { reason: "latest preview", state: "AWAITING_APPROVAL", timestamp: latestPreview },
    { reason: "current collection", state: "COLLECTING_INPUT", timestamp: Timestamp.fromMillis(Date.now() - 5_000) },
  ];
  await sessions.doc(session.sessionId).set(session);

  const concurrentResults = await Promise.all(
    Array.from({ length: 12 }, (_, index) => addUploadToSession(
      session.sessionId,
      buildUpload(`append-${index}`, Timestamp.now(), session.sessionId),
      session,
    )),
  );
  assert(concurrentResults.every((result) => result.status === "added"));

  const cappedResults = [];
  for (let index = 12; index < 20; index++) {
    cappedResults.push(await addUploadToSession(
      session.sessionId,
      buildUpload(`append-${index}`, Timestamp.now(), session.sessionId),
      session,
    ));
  }
  const statusCounts = [...concurrentResults, ...cappedResults].reduce<Record<string, number>>((counts, result) => {
    counts[result.status] = (counts[result.status] || 0) + 1;
    return counts;
  }, {});
  assert.deepEqual(statusCounts, { added: 14, limit_reached: 6 });
  const persisted = await sessions.doc(session.sessionId).get();
  assert.equal((persisted.get("uploads") as SessionUpload[]).length, 15);
  assert.equal(new Set((persisted.get("uploads") as SessionUpload[]).map((upload) => upload.id)).size, 15);
  assert([...concurrentResults, ...cappedResults].filter((result) => result.status === "added")
    .every((result) => result.recentUploadCount >= 1 && result.recentUploadCount <= 14));

  const duplicate = await addUploadToSession(
    session.sessionId,
    buildUpload("append-0", Timestamp.now(), session.sessionId),
    session,
  );
  assert.equal(duplicate.status, "duplicate", "duplicate identity must win before the size cap");
}

async function verifyCommittedAppendAcknowledgementLossRetainsReference(): Promise<void> {
  const session = buildSession("append-acknowledgement-loss", "919800000115");
  await sessions.doc(session.sessionId).set(session);
  const upload = buildUpload("append-committed-before-throw", Timestamp.now(), session.sessionId);
  const originalRunTransaction = firestoreAdmin.runTransaction.bind(firestoreAdmin);
  firestoreAdmin.runTransaction = (async (...args: Parameters<typeof firestoreAdmin.runTransaction>) => {
    await originalRunTransaction(...args);
    throw new Error("simulated post-commit acknowledgement loss");
  }) as typeof firestoreAdmin.runTransaction;
  try {
    await assert.rejects(
      () => appendStoredUploadOrCleanup(upload, session),
      /simulated post-commit acknowledgement loss/,
    );
  } finally {
    firestoreAdmin.runTransaction = originalRunTransaction as typeof firestoreAdmin.runTransaction;
  }
  const persisted = await sessions.doc(session.sessionId).get();
  assert.equal(
    isMessagingUploadPathReferencedBySession(persisted.data(), session.sessionId, upload.storagePath),
    true,
  );
}

async function verifyInvalidUploadCounterAndCooldown(): Promise<void> {
  const userId = "919800000103";
  const session = buildSession("invalid-upload-race", userId);
  await sessions.doc(session.sessionId).set(session);
  const rateRef = rates.doc(getUserHash("whatsapp", userId));
  const now = Timestamp.now();
  await rateRef.set({
    activeSessionId: session.sessionId,
    cooldownUntil: null,
    dayResetAt: Timestamp.fromMillis(now.toMillis() + 86_400_000),
    lastSessionAt: now,
    processingRunsThisWeek: 0,
    sessionsThisWeek: 1,
    sessionsToday: 1,
    userHash: rateRef.id,
    weekResetAt: Timestamp.fromMillis(now.toMillis() + 7 * 86_400_000),
  });

  const adapter: IMessagingProvider = {
    downloadMedia: async () => Buffer.from([1, 2, 3, 4]),
    parseIncomingMessages: () => [],
    providerId: "whatsapp",
    sendLinkMessage: async () => undefined,
    sendTextMessage: async () => undefined,
    verifyWebhook: () => true,
  };
  const results = await Promise.all(
    Array.from({ length: 3 }, (_, index) => handleMessage(
      buildMessage(`invalid-upload-${index}`, userId),
      adapter,
    )),
  );
  assert(results.every((result) => typeof result === "string"));

  const persistedSession = await sessions.doc(session.sessionId).get();
  const persistedRate = await rateRef.get();
  assert.equal(persistedSession.get("invalidUploadAttempts"), 3);
  assert.equal(persistedSession.get("state"), "COOLDOWN");
  assert.equal(persistedSession.get("intakeExpiresAt"), null);
  assert(persistedRate.get("cooldownUntil").toMillis() > Date.now());
}

async function verifyFailedSessionReopensAtomically(): Promise<void> {
  const session = buildSession("failed-session-reopen", "919800000104");
  session.state = "FAILED";
  session.stateHistory.push({ reason: "test failure", state: "FAILED", timestamp: Timestamp.now() });
  session.extractionJobId = "failed-job";
  session.extractionCompletedJobId = "failed-job";
  session.extractedMenuData = { stale: true };
  session.previewToken = "stale-token";
  session.previewUrl = "https://example.invalid/stale";
  session.validMenuFiles = [session.uploads[0].id];
  await sessions.doc(session.sessionId).set(session);

  const result = await addUploadToSession(
    session.sessionId,
    buildUpload("failed-session-new-upload", Timestamp.now(), session.sessionId),
    session,
  );
  assert.equal(result.status, "added");
  assert.equal(result.reopenedFromFailure, true);

  const persisted = await sessions.doc(session.sessionId).get();
  assert.equal(persisted.get("state"), "COLLECTING_INPUT");
  assert.equal(persisted.get("extractionJobId"), null);
  assert.equal(persisted.get("extractionCompletedJobId"), null);
  assert.equal(persisted.get("extractedMenuData"), null);
  assert.equal(persisted.get("previewToken"), null);
  assert.equal(persisted.get("previewUrl"), null);
  assert.deepEqual(persisted.get("validMenuFiles"), []);
  assert.equal((persisted.get("uploads") as SessionUpload[]).length, 2);
  const history = persisted.get("stateHistory") as Array<{ state: string }>;
  assert.equal(history.at(-1)?.state, "COLLECTING_INPUT");
}

async function verifyFullResendInvalidatesStaleDeliveryState(): Promise<void> {
  const session = buildSession("full-resend-delivery-reset", "919800000115");
  const previewAt = Timestamp.fromMillis(Date.now() - 30_000);
  session.state = "AWAITING_APPROVAL";
  session.stateHistory.push({
    reason: "preview ready",
    state: "AWAITING_APPROVAL",
    timestamp: previewAt,
  });
  session.uploads = [
    buildUpload("full-resend-original", Timestamp.fromMillis(previewAt.toMillis() - 1), session.sessionId),
    buildUpload("full-resend-recent-1", Timestamp.fromMillis(previewAt.toMillis() + 1), session.sessionId),
    buildUpload("full-resend-recent-2", Timestamp.fromMillis(previewAt.toMillis() + 2), session.sessionId),
  ];
  session.detectedBusinessCategory = "food";
  session.detectedBusinessType = "Restaurant";
  session.extractedBusinessInfo = {
    address: "Old address",
    businessName: "Old business",
    confidence: "high",
    cuisineHint: "old",
    logoPresent: false,
    phoneNumber: "+919800000115",
  };
  session.extractedMenuData = { items: [{ id: "stale" }] };
  session.extractedProjectFiles = [{ uid: "stale" }];
  session.previewToken = "stale-preview-token";
  session.previewUrl = "https://menulist.ai/msg-preview/full-resend-delivery-reset?token=stale";
  session.previewMessagePending = true;
  session.previewMessageDeliveryAttempts = 4;
  session.previewMessageLeaseToken = "stale-preview-lease";
  session.previewMessageLeaseUntil = Timestamp.fromMillis(Date.now() + 60_000);
  session.fixMessagePending = true;
  session.fixMessageDeliveryAttempts = 4;
  session.fixMessageLeaseToken = "stale-fix-lease";
  session.fixMessageLeaseUntil = Timestamp.fromMillis(Date.now() + 60_000);
  session.reminderMessageLeaseToken = "stale-reminder-lease";
  session.reminderMessageLeaseUntil = Timestamp.fromMillis(Date.now() + 60_000);
  await sessions.doc(session.sessionId).set(session);

  const result = await addUploadToSession(
    session.sessionId,
    buildUpload("full-resend-recent-3", Timestamp.now(), session.sessionId),
    session,
    {
      cleanupPendingUploads: async () => undefined,
      restartOnRecentThreshold: 3,
      restartProviderMessageId: "full-resend-replay-message",
    },
  );
  assert.equal(result.status, "added");
  assert.equal(result.sessionRestarted, true);

  const reset = await sessions.doc(session.sessionId).get();
  assert.equal(reset.get("state"), "COLLECTING_INPUT");
  assert.equal(reset.get("detectedBusinessCategory"), null);
  assert.equal(reset.get("detectedBusinessType"), null);
  assert.equal(reset.get("extractedBusinessInfo"), null);
  assert.equal(reset.get("extractedMenuData"), null);
  assert.equal(reset.get("extractedProjectFiles"), null);
  assert.equal(reset.get("previewMessagePending"), false);
  assert.equal(reset.get("previewMessageDeliveryAttempts"), 0);
  assert.equal(reset.get("previewMessageLeaseToken"), null);
  assert.equal(reset.get("previewMessageLeaseUntil"), null);
  assert.equal(reset.get("fixMessagePending"), false);
  assert.equal(reset.get("fixMessageDeliveryAttempts"), 0);
  assert.equal(reset.get("fixMessageLeaseToken"), null);
  assert.equal(reset.get("fixMessageLeaseUntil"), null);
  assert.equal(reset.get("reminderMessageLeaseToken"), null);
  assert.equal(reset.get("reminderMessageLeaseUntil"), null);
  const replacementUploads = reset.get("uploads") as SessionUpload[];
  assert.equal(replacementUploads.length, 3);
  assert.equal(replacementUploads.some(({ id }) => id === "full-resend-original"), false);
  assert(replacementUploads.every(({ id }) => id.startsWith("full-resend-recent-")));
  assert.deepEqual(reset.get("providerMessageIds"), ["full-resend-replay-message"]);
}

async function verifyInvalidUploadAccountingAcrossActiveStates(): Promise<void> {
  const invalidAdapter: IMessagingProvider = {
    downloadMedia: async () => Buffer.from([0x00, 0x01, 0x02]),
    parseIncomingMessages: () => [],
    providerId: "whatsapp",
    sendLinkMessage: async () => undefined,
    sendTextMessage: async () => undefined,
    verifyWebhook: () => true,
  };

  for (const state of ["PROCESSING_MENU", "AWAITING_APPROVAL"] as const) {
    const userId = state === "PROCESSING_MENU" ? "919800000105" : "919800000106";
    const session = buildSession(`invalid-${state.toLowerCase()}`, userId);
    session.state = state;
    session.stateHistory.push({ reason: "test state", state, timestamp: Timestamp.now() });
    session.previewUrl = state === "AWAITING_APPROVAL" ? "https://menulist.ai/preview/test" : null;
    await sessions.doc(session.sessionId).set(session);
    const result = await handleMessage(buildMessage(`invalid-${state}`, userId), invalidAdapter);
    assert.equal(result, "Send menu photos or a menu PDF.");
    assert.equal((await sessions.doc(session.sessionId).get()).get("invalidUploadAttempts"), 1);
  }

  const passwordUserId = "919800000107";
  const passwordSession = buildSession("password-preview", passwordUserId);
  passwordSession.state = "AWAITING_APPROVAL";
  passwordSession.stateHistory.push({
    reason: "test state",
    state: "AWAITING_APPROVAL",
    timestamp: Timestamp.now(),
  });
  passwordSession.previewUrl = "https://menulist.ai/preview/test";
  await sessions.doc(passwordSession.sessionId).set(passwordSession);
  const passwordMessage = buildMessage("password-preview", passwordUserId);
  passwordMessage.messageType = "document";
  passwordMessage.media = {
    fileName: "locked.pdf",
    fileSize: 64,
    mimeType: "application/pdf",
    providerMediaId: "password-preview-media",
  };
  const passwordAdapter: IMessagingProvider = {
    ...invalidAdapter,
    downloadMedia: async () => Buffer.from("%PDF-1.4\n/Encrypt\n%%EOF", "latin1"),
  };
  assert.equal(
    await handleMessage(passwordMessage, passwordAdapter),
    "This PDF is locked. Send an unlocked PDF or photos.",
  );
}

async function verifySessionAndExistingStoreLookupBoundaries(): Promise<void> {
  const malformedPhone = "+919800000108";
  await db.collection(DB_COLLECTIONS.USERS).doc("messaging-malformed-store-user").set({
    phone: malformedPhone,
    storeId: "10",
    tenantId: "20",
  });
  assert.equal(await findExistingStoreByPhone(malformedPhone), null);

  const validPhone = "+919800000109";
  await db.collection(DB_COLLECTIONS.USERS).doc("messaging-valid-store-user").set({
    phone: validPhone,
    storeId: 10,
    tenantId: 20,
  });
  assert.deepEqual(await findExistingStoreByPhone(validPhone), { storeId: 10, tenantId: 20 });
  await db.collection(DB_COLLECTIONS.USERS).doc("messaging-duplicate-store-user").set({
    phone: validPhone,
    storeId: 10,
    tenantId: 20,
  });
  await assert.rejects(
    () => findExistingStoreByPhone(validPhone),
    /MESSAGING_EXISTING_STORE_LOOKUP_AMBIGUOUS/,
  );
  assert.equal(await findExistingStoreByPhone("telegram-user-name"), null);

  const expiredActive = buildSession("lookup-hard-expired", "919800000116");
  expiredActive.createdAt = Timestamp.fromMillis(Date.now() - 86_400_000 - 1_000);
  expiredActive.expiresAt = Timestamp.fromMillis(Date.now() - 1_000);
  await sessions.doc(expiredActive.sessionId).set(expiredActive);
  assert.equal(
    await findActiveSession("whatsapp", expiredActive.providerUserId),
    null,
    "The 24h hard boundary must close an active row before the daily cleanup sweep",
  );
  const expiredPersisted = await sessions.doc(expiredActive.sessionId).get();
  assert.equal(expiredPersisted.get("state"), "EXPIRED");
  assert.equal(expiredPersisted.get("intakeExpiresAt"), null);
  assert.equal(
    (expiredPersisted.get("stateHistory") as Array<{ state: string }>).at(-1)?.state,
    "EXPIRED",
  );

  const expiredDuringAppend = buildSession("append-hard-expired", "919800000117");
  expiredDuringAppend.createdAt = Timestamp.fromMillis(Date.now() - 86_400_000 - 1_000);
  expiredDuringAppend.expiresAt = Timestamp.fromMillis(Date.now() - 1_000);
  await sessions.doc(expiredDuringAppend.sessionId).set(expiredDuringAppend);
  const expiredAppendResult = await addUploadToSession(
    expiredDuringAppend.sessionId,
    buildUpload("append-after-expiry", Timestamp.now(), expiredDuringAppend.sessionId),
    expiredDuringAppend,
  );
  assert.equal(expiredAppendResult.status, "expired");
  const expiredAppendPersisted = await sessions.doc(expiredDuringAppend.sessionId).get();
  assert.equal(expiredAppendPersisted.get("state"), "EXPIRED");
  assert.equal(
    (expiredAppendPersisted.get("uploads") as SessionUpload[]).some(
      ({ id }) => id === "append-after-expiry",
    ),
    false,
  );

  const malformedIdentity = buildSession("lookup-document-id", "919800000110");
  malformedIdentity.sessionId = "different-session-id";
  await sessions.doc("lookup-document-id").set(malformedIdentity);
  await assert.rejects(
    () => findActiveSession("whatsapp", malformedIdentity.providerUserId),
    /MESSAGING_SESSION_LOOKUP_INVALID/,
  );

  const malformedCounter = buildSession("lookup-invalid-counter", "919800000112");
  await sessions.doc(malformedCounter.sessionId).set({
    ...malformedCounter,
    processingRuns: "1",
  });
  await assert.rejects(
    () => findActiveSession("whatsapp", malformedCounter.providerUserId),
    /MESSAGING_SESSION_LOOKUP_INVALID/,
  );

  const malformedUpload = buildSession("lookup-invalid-upload", "919800000113");
  await sessions.doc(malformedUpload.sessionId).set({
    ...malformedUpload,
    uploads: [{ ...malformedUpload.uploads[0], fileSize: -1 }],
  });
  await assert.rejects(
    () => findActiveSession("whatsapp", malformedUpload.providerUserId),
    /MESSAGING_SESSION_LOOKUP_INVALID/,
  );

  const staleHistory = buildSession("lookup-stale-history", "919800000114");
  staleHistory.state = "PROCESSING_MENU";
  await sessions.doc(staleHistory.sessionId).set(staleHistory);
  await assert.rejects(
    () => findActiveSession("whatsapp", staleHistory.providerUserId),
    /MESSAGING_SESSION_LOOKUP_INVALID/,
  );

  const duplicateUserId = "919800000111";
  const duplicateA = buildSession("duplicate-active-a", duplicateUserId);
  const duplicateB = buildSession("duplicate-active-b", duplicateUserId);
  await Promise.all([
    sessions.doc(duplicateA.sessionId).set(duplicateA),
    sessions.doc(duplicateB.sessionId).set(duplicateB),
  ]);
  await assert.rejects(
    () => findActiveSession("whatsapp", duplicateUserId),
    /MESSAGING_SESSION_LOOKUP_AMBIGUOUS/,
  );
}

async function main(): Promise<void> {
  assert(process.env.FIRESTORE_EMULATOR_HOST, "FIRESTORE_EMULATOR_HOST is required");
  verifyUploadPersistenceProjection();
  await verifyAtomicSessionAdmission();
  await verifyConcurrentUploadAppend();
  await verifyCommittedAppendAcknowledgementLossRetainsReference();
  await verifyInvalidUploadCounterAndCooldown();
  await verifyFailedSessionReopensAtomically();
  await verifyFullResendInvalidatesStaleDeliveryState();
  await verifyInvalidUploadAccountingAcrossActiveStates();
  await verifySessionAndExistingStoreLookupBoundaries();
  console.log("Messaging session concurrency emulator tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
