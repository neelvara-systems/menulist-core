#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { DB_COLLECTIONS } from "../../functions/src/constants/database";
import { admin, firestoreAdmin } from "../../functions/src/firebaseAdmin";
import { addUploadToSession } from "../../functions/src/messagingOnboarding/sessionEngine";
import { drainMessagingPendingUploadCleanup } from "../../functions/src/messagingOnboarding/uploadCleanup";
import type {
  MessagingOnboardingSession,
  SessionUpload,
} from "../../functions/src/types/messagingOnboarding.types";
import {
  buildMessagingPublishUploadCleanupState,
  normalizeMessagingPublishSession,
} from "../../src/lib/messaging-onboarding/publishSessionBoundary";

const db = firestoreAdmin;
const Timestamp = admin.firestore.Timestamp;
const sessions = db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS);
const BUCKET = "demo.appspot.com";

function buildUpload(
  label: string,
  sessionId: string,
  uploadedAt: FirebaseFirestore.Timestamp,
): SessionUpload {
  const id = crypto.createHash("sha1").update(label).digest("hex");
  const storagePath = `messagingOnboarding/${sessionId}/${id}.png`;
  return {
    fileName: `${label}.png`,
    fileSize: 1024,
    id,
    mimeType: "image/png",
    providerMediaId: `provider-${label}`,
    sha256: crypto.createHash("sha256").update(label).digest("hex"),
    storagePath,
    storageUrl: `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(storagePath)}?alt=media&token=123e4567-e89b-42d3-a456-426614174000`,
    uploadedAt,
  };
}

function buildSession(sessionId: string, authUploadCount: number): MessagingOnboardingSession {
  const now = Timestamp.now();
  const previewAt = Timestamp.fromMillis(now.toMillis() - 10_000);
  const originalAt = Timestamp.fromMillis(previewAt.toMillis() - 10_000);
  const uploads = Array.from({ length: authUploadCount }, (_, index) => (
    buildUpload(`original-${sessionId}-${index}`, sessionId, originalAt)
  ));
  return {
    acquisitionSource: "unknown",
    correctionCount: 0,
    createdAt: Timestamp.fromMillis(now.toMillis() - 60_000),
    detectedBusinessCategory: "food",
    detectedBusinessType: "Restaurant",
    expiresAt: Timestamp.fromMillis(now.toMillis() + 86_400_000),
    extractedBusinessInfo: null,
    extractedBusinessProfile: null,
    extractedMenuData: {
      categories: [{ id: "category-1", name: { en: "Menu" } }],
      items: [{ category: "category-1", id: "item-1", name: { en: "Item" }, price: "10" }],
      languages: [{ code: "en", isPrimary: true, name: "English" }],
    },
    extractedProjectFiles: uploads.slice(0, 1).map((upload) => ({
      active: true,
      deleted: false,
      extractedData: {
        data: {
          categories: [{ id: "category-1", name: { en: "Menu" } }],
          items: [{ category: "category-1", id: "item-1", name: { en: "Item" }, price: "10" }],
          languages: [{ code: "en", isPrimary: true, name: "English" }],
        },
        message: "",
      },
      index: 0,
      name: upload.fileName,
      size: upload.fileSize,
      type: upload.mimeType,
      uid: upload.id,
      url: upload.storageUrl,
    })),
    extractionCompletedJobId: "completed-job",
    extractionJobId: null,
    fixRequests: [],
    intakeExpiresAt: null,
    invalidFiles: [],
    invalidUploadAttempts: 0,
    lastUploadAt: originalAt,
    menuCompleteness: "complete",
    pendingUploadCleanupPaths: [],
    pendingUploadsWhileProcessing: false,
    previewToken: "replacementLifecyclePreviewToken123",
    previewUrl: `https://app.menulist.ai/msg-preview/${sessionId}?token=replacementLifecyclePreviewToken123`,
    processingRuns: 1,
    provider: "whatsapp",
    providerDisplayId: "+919800001234",
    providerMessageIds: [],
    providerUserId: `user-${sessionId}`,
    publishedAt: null,
    publishedResult: null,
    qualityScore: 90,
    reminderSentAt: null,
    replacementUploads: [],
    sessionId,
    state: "AWAITING_APPROVAL",
    stateHistory: [{ reason: "preview", state: "AWAITING_APPROVAL", timestamp: previewAt }],
    typeConfidence: "high",
    typeSource: "ai",
    updatedAt: now,
    uploadCleanupPending: false,
    uploads,
    validMenuFiles: uploads.slice(0, 1).map(({ id }) => id),
    validationConfidence: "high",
  };
}

async function verifyFifteenSourceFullResend(): Promise<void> {
  const session = buildSession("replacement-stage-session", 15);
  await sessions.doc(session.sessionId).set(session);
  const replacementAt = Timestamp.now();

  for (let index = 0; index < 3; index++) {
    const result = await addUploadToSession(
      session.sessionId,
      buildUpload(`replacement-${index}`, session.sessionId, Timestamp.fromMillis(replacementAt.toMillis() + index)),
      session,
      {
        cleanupPendingUploads: async () => undefined,
        restartOnRecentThreshold: 3,
        restartProviderMessageId: `replacement-message-${index}`,
      },
    );
    assert.equal(result.status, "added");
    assert.equal(result.sessionRestarted, index === 2);
    const persisted = await sessions.doc(session.sessionId).get();
    assert.equal((persisted.get("uploads") as SessionUpload[]).length, index === 2 ? 3 : 15);
    assert.equal((persisted.get("replacementUploads") as SessionUpload[]).length, index === 2 ? 0 : index + 1);
  }

  const restarted = await sessions.doc(session.sessionId).get();
  assert.equal(restarted.get("state"), "COLLECTING_INPUT");
  assert.equal(restarted.get("uploadCleanupPending"), true);
  assert.equal((restarted.get("pendingUploadCleanupPaths") as string[]).length, 15);
  assert((restarted.get("uploads") as SessionUpload[]).every(({ fileName }) => (
    fileName?.startsWith("replacement-")
  )));
}

async function verifyOldPreviewPublishCleanup(): Promise<void> {
  const session = buildSession("publish-staged-session", 1);
  const replacementAt = Timestamp.now();
  session.replacementUploads = [
    buildUpload("publish-staged-1", session.sessionId, replacementAt),
    buildUpload("publish-staged-2", session.sessionId, Timestamp.fromMillis(replacementAt.toMillis() + 1)),
  ];
  await sessions.doc(session.sessionId).set(session);

  const normalized = normalizeMessagingPublishSession(session, session.sessionId, BUCKET);
  assert(normalized);
  const cleanupState = buildMessagingPublishUploadCleanupState(normalized);
  await sessions.doc(session.sessionId).update({
    ...cleanupState,
    state: "LIVE",
    updatedAt: Timestamp.now(),
  });

  const staged = await sessions.doc(session.sessionId).get();
  assert.deepEqual(staged.get("replacementUploads"), []);
  assert.equal(staged.get("uploadCleanupPending"), true);
  assert.equal((staged.get("pendingUploadCleanupPaths") as string[]).length, 2);
  assert.equal((staged.get("uploads") as SessionUpload[]).length, 1);

  const deleted: string[] = [];
  const cleanup = await drainMessagingPendingUploadCleanup({
    deletePath: async (storagePath) => {
      deleted.push(storagePath);
    },
    sessionId: session.sessionId,
  });
  assert.deepEqual(cleanup, { deleted: 2, status: "drained" });
  assert.deepEqual(deleted.sort(), session.replacementUploads.map(({ storagePath }) => storagePath).sort());
  const drained = await sessions.doc(session.sessionId).get();
  assert.deepEqual(drained.get("pendingUploadCleanupPaths"), []);
  assert.equal(drained.get("uploadCleanupPending"), false);
  assert.equal((drained.get("uploads") as SessionUpload[]).length, 1);
}

async function verifyInvalidCleanupRowIsQuarantined(): Promise<void> {
  const session = buildSession("invalid-cleanup-session", 1);
  const untrustedPath = buildUpload(
    "wrong-session-upload",
    "different-session",
    Timestamp.now(),
  ).storagePath;
  session.pendingUploadCleanupPaths = [untrustedPath];
  session.uploadCleanupPending = true;
  await sessions.doc(session.sessionId).set(session);

  const deleted: string[] = [];
  const cleanup = await drainMessagingPendingUploadCleanup({
    deletePath: async (storagePath) => {
      deleted.push(storagePath);
    },
    sessionId: session.sessionId,
  });
  assert.deepEqual(cleanup, { deleted: 0, status: "invalid" });
  assert.deepEqual(deleted, []);

  const quarantined = await sessions.doc(session.sessionId).get();
  assert.equal(quarantined.get("uploadCleanupPending"), false);
  assert.deepEqual(quarantined.get("pendingUploadCleanupPaths"), [untrustedPath]);
}

async function verifyCompletionFailureRemainsRetryable(): Promise<void> {
  const session = buildSession("cleanup-completion-failure", 1);
  const orphan = buildUpload("completion-failure-orphan", session.sessionId, Timestamp.now());
  session.pendingUploadCleanupPaths = [orphan.storagePath];
  session.uploadCleanupPending = true;
  await sessions.doc(session.sessionId).set(session);

  const originalRunTransaction = firestoreAdmin.runTransaction;
  firestoreAdmin.runTransaction = (async () => {
    throw new Error("simulated completion transaction failure");
  }) as typeof firestoreAdmin.runTransaction;
  try {
    const cleanup = await drainMessagingPendingUploadCleanup({
      deletePath: async () => undefined,
      sessionId: session.sessionId,
    });
    assert.deepEqual(cleanup, { deleted: 0, status: "failed" });
  } finally {
    firestoreAdmin.runTransaction = originalRunTransaction;
  }

  const retryable = await sessions.doc(session.sessionId).get();
  assert.equal(retryable.get("uploadCleanupPending"), true);
  assert.deepEqual(retryable.get("pendingUploadCleanupPaths"), [orphan.storagePath]);
}

async function verifyConcurrentCleanupCountsOnce(): Promise<void> {
  const session = buildSession("concurrent-cleanup-session", 1);
  const paths = [
    buildUpload("concurrent-orphan-1", session.sessionId, Timestamp.now()).storagePath,
    buildUpload("concurrent-orphan-2", session.sessionId, Timestamp.now()).storagePath,
  ];
  session.pendingUploadCleanupPaths = paths;
  session.uploadCleanupPending = true;
  await sessions.doc(session.sessionId).set(session);

  let deleteCalls = 0;
  let releaseDeletes: () => void = () => undefined;
  const deletesReady = new Promise<void>((resolve) => {
    releaseDeletes = resolve;
  });
  const deletePath = async () => {
    deleteCalls++;
    if (deleteCalls === paths.length * 2) releaseDeletes();
    await deletesReady;
  };
  const results = await Promise.all([
    drainMessagingPendingUploadCleanup({ deletePath, sessionId: session.sessionId }),
    drainMessagingPendingUploadCleanup({ deletePath, sessionId: session.sessionId }),
  ]);
  assert.equal(results.reduce((total, result) => total + result.deleted, 0), paths.length);

  const drained = await sessions.doc(session.sessionId).get();
  assert.equal(drained.get("uploadCleanupPending"), false);
  assert.deepEqual(drained.get("pendingUploadCleanupPaths"), []);
}

async function main(): Promise<void> {
  assert(process.env.FIRESTORE_EMULATOR_HOST, "FIRESTORE_EMULATOR_HOST is required");
  await verifyFifteenSourceFullResend();
  await verifyOldPreviewPublishCleanup();
  await verifyInvalidCleanupRowIsQuarantined();
  await verifyCompletionFailureRemainsRetryable();
  await verifyConcurrentCleanupCountsOnce();
  console.log("Messaging replacement-upload lifecycle emulator verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
