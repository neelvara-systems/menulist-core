#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { DB_COLLECTIONS } from "../../functions/src/constants/database";
import { admin, firestoreAdmin } from "../../functions/src/firebaseAdmin";
import {
  claimMessagingIntakeSession,
  commitMessagingAssetValidation,
  enqueueMessagingExtractionJob,
  failMessagingAssetValidation,
  finalizeMessagingExtractionFailure,
  finalizeMessagingExtractionSuccess,
} from "../../functions/src/messagingOnboarding/extractionLifecycle";
import {
  claimMessagingPendingMessage,
  completeMessagingPendingMessage,
  releaseMessagingPendingMessage,
} from "../../functions/src/messagingOnboarding/messageDeliveryLease";
import { isTransitionForbidden, PROCESSING, RATE_LIMITS } from "../../functions/src/messagingOnboarding/constants";
import { transitionState } from "../../functions/src/messagingOnboarding/sessionEngine";
import type {
  MessagingOnboardingSession,
  SessionUpload,
} from "../../functions/src/types/messagingOnboarding.types";

const db = firestoreAdmin;
const Timestamp = admin.firestore.Timestamp;
const sessions = db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS);
const jobs = db.collection(DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS);
const rates = db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_RATE_LIMITS);

function getUserHash(providerUserId: string): string {
  return crypto.createHash("sha256").update(`whatsapp:${providerUserId}`).digest("hex");
}

function buildUpload(id = "upload-1", sessionId = "session"): SessionUpload {
  return {
    fileName: `${id}.png`,
    fileSize: 1024,
    id,
    mimeType: "image/png",
    providerMediaId: `provider-${id}`,
    sha256: crypto.createHash("sha256").update(id).digest("hex"),
    storagePath: `messagingOnboarding/${sessionId}/${id}.png`,
    storageUrl: `https://firebasestorage.googleapis.com/v0/b/demo/o/${id}.png?alt=media&token=test`,
    uploadedAt: Timestamp.now(),
  };
}

function buildSession(params: {
  processingRuns?: number;
  providerUserId?: string;
  sessionId: string;
}): MessagingOnboardingSession {
  const now = Timestamp.now();
  return {
    acquisitionSource: "unknown",
    correctionCount: 0,
    createdAt: now,
    detectedBusinessCategory: "food",
    detectedBusinessType: "Restaurant",
    expiresAt: Timestamp.fromMillis(now.toMillis() + 86_400_000),
    extractedBusinessInfo: null,
    extractedMenuData: null,
    extractionCompletedJobId: null,
    extractionJobId: null,
    fixRequests: [],
    intakeExpiresAt: Timestamp.fromMillis(now.toMillis() - 1_000),
    invalidFiles: [],
    invalidUploadAttempts: 0,
    lastUploadAt: now,
    menuCompleteness: null,
    pendingUploadsWhileProcessing: false,
    previewToken: null,
    previewUrl: null,
    processingRuns: params.processingRuns || 0,
    provider: "whatsapp",
    providerDisplayId: "+919800000000",
    providerMessageIds: [],
    providerUserId: params.providerUserId || `user-${params.sessionId}`,
    publishedAt: null,
    publishedResult: null,
    qualityScore: null,
    reminderSentAt: null,
    sessionId: params.sessionId,
    state: "COLLECTING_INPUT",
    stateHistory: [{ reason: "test", state: "COLLECTING_INPUT", timestamp: now }],
    typeConfidence: "high",
    typeSource: "manual",
    updatedAt: now,
    uploads: [buildUpload("upload-1", params.sessionId)],
    validMenuFiles: [],
    validationConfidence: null,
  };
}

async function seedRate(providerUserId: string, count = 0): Promise<void> {
  const now = Timestamp.now();
  await rates.doc(getUserHash(providerUserId)).set({
    cooldownUntil: null,
    dayResetAt: Timestamp.fromMillis(now.toMillis() + 86_400_000),
    lastSessionAt: now,
    processingRunsThisWeek: count,
    sessionsThisWeek: 1,
    sessionsToday: 1,
    userHash: getUserHash(providerUserId),
    weekResetAt: Timestamp.fromMillis(now.toMillis() + 7 * 86_400_000),
  });
}

async function verifyLifecycleSerializes(): Promise<void> {
  const session = buildSession({ sessionId: "messaging-lifecycle-race" });
  await sessions.doc(session.sessionId).set(session);
  await seedRate(session.providerUserId);

  const claims = await Promise.all(
    Array.from({ length: 12 }, () => claimMessagingIntakeSession(session.sessionId)),
  );
  assert.equal(claims.filter((claim) => claim.status === "claimed").length, 1);
  assert.equal(claims.filter((claim) => claim.status === "skipped").length, 11);

  const enqueues = await Promise.all(
    Array.from({ length: 12 }, () => enqueueMessagingExtractionJob({
      businessCategory: "food",
      businessType: "Restaurant",
      sessionId: session.sessionId,
      validUploadIds: ["upload-1"],
    })),
  );
  const created = enqueues.filter((result) => result.status === "created");
  assert.equal(created.length, 1, "Exactly one extraction job must be created");
  const jobId = created[0].jobId;
  assert(jobId);

  const jobSnapshot = await jobs.where("projectId", "==", `msg-onboarding-${session.sessionId}`).get();
  assert.equal(jobSnapshot.size, 1);
  assert.equal(jobSnapshot.docs[0].id, jobId);
  assert.equal(jobSnapshot.docs[0].get("destination.sessionId"), session.sessionId);
  assert.equal(jobSnapshot.docs[0].get("skipProjectSave"), true);

  const processingSession = await sessions.doc(session.sessionId).get();
  assert.equal(processingSession.get("state"), "PROCESSING_MENU");
  assert.equal(processingSession.get("extractionJobId"), jobId);
  assert.equal(processingSession.get("processingRuns"), 1);
  const rate = await rates.doc(getUserHash(session.providerUserId)).get();
  assert.equal(rate.get("processingRunsThisWeek"), 1);
  const rateExpiresAt = rate.get("expiresAt");
  assert.equal(typeof rateExpiresAt?.toMillis, "function");
  assert.ok(rateExpiresAt.toMillis() > Date.now() + 89 * 24 * 60 * 60 * 1000);
  assert.ok(rateExpiresAt.toMillis() <= Date.now() + 91 * 24 * 60 * 60 * 1000);

  const staleFailure = await finalizeMessagingExtractionFailure({
    jobId: "wrong-job",
    reason: "stale",
    sessionId: session.sessionId,
  });
  assert.equal(staleFailure.status, "skipped");

  await sessions.doc(session.sessionId).update({
    fixMessageDeliveryAttempts: 4,
    fixMessageLeaseToken: crypto.randomUUID(),
    fixMessageLeaseUntil: Timestamp.fromMillis(Date.now() + 60_000),
    fixMessagePending: true,
  });

  const previewToken = "test-preview-token";
  const finalizations = await Promise.all(
    Array.from({ length: 12 }, () => finalizeMessagingExtractionSuccess({
      data: {
        extractedBusinessProfile: null,
        extractedMenuData: { categories: [{ id: "c1" }], items: [{ id: "i1" }] },
        extractedProjectFiles: [{ uid: "upload-1" }],
        previewToken,
        previewUrl: `https://localhost/msg-preview/${session.sessionId}?token=${previewToken}`,
        qualityScore: 88,
      },
      jobId,
      sessionId: session.sessionId,
    })),
  );
  assert.equal(finalizations.filter((result) => result.status === "finalized").length, 1);

  const completedSession = await sessions.doc(session.sessionId).get();
  assert.equal(completedSession.get("state"), "AWAITING_APPROVAL");
  assert.equal(completedSession.get("extractionCompletedJobId"), jobId);
  assert.equal(completedSession.get("previewMessagePending"), true);
  assert.equal(completedSession.get("previewMessageDeliveryAttempts"), 0);
  assert.equal(completedSession.get("fixMessagePending"), false);
  assert.equal(completedSession.get("fixMessageDeliveryAttempts"), 0);
  assert.equal(completedSession.get("fixMessageLeaseToken"), null);
  assert.equal(completedSession.get("fixMessageLeaseUntil"), null);
  const historyStates = (completedSession.get("stateHistory") as Array<{ state: string }>).map(({ state }) => state);
  assert.deepEqual(historyStates.slice(-2), ["PREVIEW_READY", "AWAITING_APPROVAL"]);

  const deliveryClaims = await Promise.all(
    Array.from({ length: 12 }, () => claimMessagingPendingMessage({
      expectedState: "AWAITING_APPROVAL",
      kind: "preview",
      sessionId: session.sessionId,
    })),
  );
  const activeDeliveryClaims = deliveryClaims.filter(
    (claim): claim is Extract<NonNullable<typeof claim>, { status: "claimed" }> => claim?.status === "claimed",
  );
  assert.equal(activeDeliveryClaims.length, 1);
  assert.equal(await completeMessagingPendingMessage({
    kind: "preview",
    leaseToken: "wrong-token",
    sessionId: session.sessionId,
  }), false);
  assert.equal(await completeMessagingPendingMessage({
    kind: "preview",
    leaseToken: activeDeliveryClaims[0].leaseToken,
    sessionId: session.sessionId,
  }), true);
  assert.equal((await sessions.doc(session.sessionId).get()).get("previewMessagePending"), false);

  await sessions.doc(session.sessionId).update({ previewMessagePending: true });
  const releasable = await claimMessagingPendingMessage({
    expectedState: "AWAITING_APPROVAL",
    kind: "preview",
    sessionId: session.sessionId,
  });
  assert(releasable?.status === "claimed");
  assert.equal(await releaseMessagingPendingMessage({
    kind: "preview",
    leaseToken: releasable.leaseToken,
    sessionId: session.sessionId,
  }), true);
  const reclaimedAfterRelease = await claimMessagingPendingMessage({
    expectedState: "AWAITING_APPROVAL",
    kind: "preview",
    sessionId: session.sessionId,
  });
  assert(reclaimedAfterRelease?.status === "claimed");
  assert.equal(await completeMessagingPendingMessage({
    kind: "preview",
    leaseToken: reclaimedAfterRelease.leaseToken,
    sessionId: session.sessionId,
  }), true);

  const malformedLease = buildSession({ sessionId: "messaging-malformed-delivery-lease" });
  malformedLease.state = "AWAITING_APPROVAL";
  malformedLease.previewUrl = "https://localhost/msg-preview/messaging-malformed-delivery-lease?token=test";
  malformedLease.previewMessagePending = true;
  malformedLease.previewMessageLeaseToken = crypto.randomUUID();
  await sessions.doc(malformedLease.sessionId).set({
    ...malformedLease,
    previewMessageLeaseUntil: "not-a-timestamp",
  });
  const discardedLease = await claimMessagingPendingMessage({
    expectedState: "AWAITING_APPROVAL",
    kind: "preview",
    sessionId: malformedLease.sessionId,
  });
  assert.deepEqual(discardedLease, { reason: "lease_invalid", status: "discarded" });
  assert.equal((await sessions.doc(malformedLease.sessionId).get()).get("previewMessagePending"), false);

  const expiredDelivery = buildSession({ sessionId: "messaging-expired-delivery" });
  expiredDelivery.state = "AWAITING_APPROVAL";
  expiredDelivery.previewUrl = "https://app.menulist.ai/msg-preview/messaging-expired-delivery?token=test";
  expiredDelivery.previewMessagePending = true;
  expiredDelivery.expiresAt = Timestamp.fromMillis(Date.now() - 1);
  await sessions.doc(expiredDelivery.sessionId).set({
    ...expiredDelivery,
    previewMessageDeliveryAttempts: 0,
    previewMessageLeaseToken: null,
    previewMessageLeaseUntil: null,
  });
  assert.deepEqual(await claimMessagingPendingMessage({
    expectedState: "AWAITING_APPROVAL",
    kind: "preview",
    sessionId: expiredDelivery.sessionId,
  }), { reason: "session_expired", status: "discarded" });
  assert.equal((await sessions.doc(expiredDelivery.sessionId).get()).get("previewMessagePending"), false);

  const poisonSession = buildSession({ sessionId: "aaa-messaging-delivery-poison" });
  poisonSession.state = "AWAITING_APPROVAL";
  poisonSession.previewUrl = "https://app.menulist.ai/msg-preview/aaa-messaging-delivery-poison?token=test";
  poisonSession.previewMessagePending = true;
  await sessions.doc(poisonSession.sessionId).set({
    ...poisonSession,
    previewMessageDeliveryAttempts: 0,
    previewMessageLeaseToken: null,
    previewMessageLeaseUntil: null,
  });

  for (let attempt = 1; attempt <= 5; attempt++) {
    const claim = await claimMessagingPendingMessage({
      expectedState: "AWAITING_APPROVAL",
      kind: "preview",
      sessionId: poisonSession.sessionId,
    });
    assert(claim?.status === "claimed");
    assert.equal(
      (await sessions.doc(poisonSession.sessionId).get()).get("previewMessageDeliveryAttempts"),
      attempt,
      "Every acquired lease consumes one bounded delivery attempt",
    );
    assert.equal(await releaseMessagingPendingMessage({
      kind: "preview",
      leaseToken: claim.leaseToken,
      sessionId: poisonSession.sessionId,
    }), true);
  }

  assert.deepEqual(await claimMessagingPendingMessage({
    expectedState: "AWAITING_APPROVAL",
    kind: "preview",
    sessionId: poisonSession.sessionId,
  }), { reason: "attempts_exhausted", status: "discarded" });
  const exhausted = await sessions.doc(poisonSession.sessionId).get();
  assert.equal(exhausted.get("previewMessagePending"), false);
  assert.equal(exhausted.get("previewMessageDeliveryAttempts"), 0);

  const healthySession = buildSession({ sessionId: "zzz-messaging-delivery-healthy" });
  healthySession.state = "AWAITING_APPROVAL";
  healthySession.previewUrl = "https://app.menulist.ai/msg-preview/zzz-messaging-delivery-healthy?token=test";
  healthySession.previewMessagePending = true;
  await sessions.doc(healthySession.sessionId).set({
    ...healthySession,
    previewMessageDeliveryAttempts: 0,
    previewMessageLeaseToken: null,
    previewMessageLeaseUntil: null,
  });
  const nextPending = await sessions
    .where("state", "==", "AWAITING_APPROVAL")
    .where("previewMessagePending", "==", true)
    .limit(1)
    .get();
  assert.equal(nextPending.size, 1);
  assert.equal(nextPending.docs[0].id, healthySession.sessionId);

  const healthyClaim = await claimMessagingPendingMessage({
    expectedState: "AWAITING_APPROVAL",
    kind: "preview",
    sessionId: healthySession.sessionId,
  });
  assert(healthyClaim?.status === "claimed");
  assert.equal(await completeMessagingPendingMessage({
    kind: "preview",
    leaseToken: healthyClaim.leaseToken,
    sessionId: healthySession.sessionId,
  }), true);
  assert.equal(
    (await sessions.doc(healthySession.sessionId).get()).get("previewMessageDeliveryAttempts"),
    0,
  );

  const takeoverSession = buildSession({ sessionId: "messaging-delivery-takeover" });
  takeoverSession.state = "AWAITING_APPROVAL";
  takeoverSession.previewUrl = "https://app.menulist.ai/msg-preview/messaging-delivery-takeover?token=test";
  takeoverSession.previewMessagePending = true;
  const takeoverNow = Timestamp.now();
  await sessions.doc(takeoverSession.sessionId).set({
    ...takeoverSession,
    previewMessageDeliveryAttempts: 0,
    previewMessageLeaseToken: null,
    previewMessageLeaseUntil: null,
  });
  const staleClaim = await claimMessagingPendingMessage({
    expectedState: "AWAITING_APPROVAL",
    kind: "preview",
    leaseMs: 1,
    now: takeoverNow,
    sessionId: takeoverSession.sessionId,
  });
  assert(staleClaim?.status === "claimed");
  const currentClaim = await claimMessagingPendingMessage({
    expectedState: "AWAITING_APPROVAL",
    kind: "preview",
    now: Timestamp.fromMillis(takeoverNow.toMillis() + 2),
    sessionId: takeoverSession.sessionId,
  });
  assert(currentClaim?.status === "claimed");
  assert.equal(await completeMessagingPendingMessage({
    kind: "preview",
    leaseToken: staleClaim.leaseToken,
    sessionId: takeoverSession.sessionId,
  }), false);
  assert.equal(
    (await sessions.doc(takeoverSession.sessionId).get()).get("previewMessageLeaseToken"),
    currentClaim.leaseToken,
    "An expired delivery worker must not acknowledge a newer claim",
  );
  assert.equal(await completeMessagingPendingMessage({
    kind: "preview",
    leaseToken: currentClaim.leaseToken,
    sessionId: takeoverSession.sessionId,
  }), true);
}

async function verifyCapsAndStaleTimers(): Promise<void> {
  const hardExpired = buildSession({ sessionId: "messaging-hard-expired-intake" });
  hardExpired.expiresAt = Timestamp.fromMillis(hardExpired.createdAt.toMillis() + 1);
  await sessions.doc(hardExpired.sessionId).set(hardExpired);
  const hardExpiredClaim = await claimMessagingIntakeSession(
    hardExpired.sessionId,
    Timestamp.fromMillis(hardExpired.expiresAt.toMillis() + 1),
  );
  assert.equal(hardExpiredClaim.status, "expired");
  const hardExpiredPersisted = await sessions.doc(hardExpired.sessionId).get();
  assert.equal(hardExpiredPersisted.get("state"), "EXPIRED");
  assert.equal(hardExpiredPersisted.get("intakeExpiresAt"), null);

  const sessionCap = buildSession({
    processingRuns: PROCESSING.MAX_PROCESSING_RUNS_PER_SESSION,
    sessionId: "messaging-session-cap",
  });
  await sessions.doc(sessionCap.sessionId).set(sessionCap);
  await seedRate(sessionCap.providerUserId);
  assert.equal((await claimMessagingIntakeSession(sessionCap.sessionId)).status, "session_cap");
  const capped = await sessions.doc(sessionCap.sessionId).get();
  assert.equal(capped.get("state"), "COLLECTING_INPUT");
  assert.equal(capped.get("intakeExpiresAt"), null);

  const weeklyCap = buildSession({ sessionId: "messaging-weekly-cap" });
  await sessions.doc(weeklyCap.sessionId).set(weeklyCap);
  await seedRate(weeklyCap.providerUserId, RATE_LIMITS.MAX_PROCESSING_RUNS_PER_WEEK);
  assert.equal((await claimMessagingIntakeSession(weeklyCap.sessionId)).status, "weekly_cap");
  const weeklyCapped = await sessions.doc(weeklyCap.sessionId).get();
  assert.equal(weeklyCapped.get("state"), "COLLECTING_INPUT");
  assert(weeklyCapped.get("intakeExpiresAt").toMillis() > Date.now());

  const staleTimer = buildSession({ sessionId: "messaging-stale-timer" });
  staleTimer.intakeExpiresAt = Timestamp.fromMillis(Date.now() + 60_000);
  await sessions.doc(staleTimer.sessionId).set(staleTimer);
  await seedRate(staleTimer.providerUserId);
  assert.equal((await claimMessagingIntakeSession(staleTimer.sessionId)).status, "skipped");
  assert.equal((await sessions.doc(staleTimer.sessionId).get()).get("state"), "COLLECTING_INPUT");

  const malformedSession = buildSession({ sessionId: "messaging-malformed-processing-count" });
  await sessions.doc(malformedSession.sessionId).set({ ...malformedSession, processingRuns: "invalid" });
  assert.equal((await claimMessagingIntakeSession(malformedSession.sessionId)).status, "invalid");
  assert.equal((await sessions.doc(malformedSession.sessionId).get()).get("state"), "FAILED");

  const malformedCategory = buildSession({ sessionId: "messaging-malformed-business-category" });
  await sessions.doc(malformedCategory.sessionId).set({ ...malformedCategory, detectedBusinessCategory: 42 });
  assert.equal((await claimMessagingIntakeSession(malformedCategory.sessionId)).status, "invalid");
  const quarantinedCategory = await sessions.doc(malformedCategory.sessionId).get();
  assert.equal(quarantinedCategory.get("state"), "FAILED");
  assert.equal(quarantinedCategory.get("stateHistory").length, 1);

  const malformedRate = buildSession({ sessionId: "messaging-malformed-weekly-count" });
  await sessions.doc(malformedRate.sessionId).set(malformedRate);
  await seedRate(malformedRate.providerUserId);
  await rates.doc(getUserHash(malformedRate.providerUserId)).update({
    processingRunsThisWeek: "invalid",
  });
  assert.equal((await claimMessagingIntakeSession(malformedRate.sessionId)).status, "invalid");
  assert.equal((await sessions.doc(malformedRate.sessionId).get()).get("state"), "FAILED");

  const emptySession = buildSession({ sessionId: "messaging-empty-intake" });
  emptySession.uploads = [];
  await sessions.doc(emptySession.sessionId).set(emptySession);
  const emptyClaim = await claimMessagingIntakeSession(emptySession.sessionId);
  assert.equal(emptyClaim.status, "expired");
  assert.equal((await sessions.doc(emptySession.sessionId).get()).get("state"), "EXPIRED");
}

async function verifyFailureAndStateTransitions(): Promise<void> {
  const session = buildSession({ sessionId: "messaging-failure-race" });
  session.state = "PROCESSING_MENU";
  session.stateHistory.push({ reason: "test processing", state: "PROCESSING_MENU", timestamp: Timestamp.now() });
  session.extractionJobId = "bound-failure-job";
  await sessions.doc(session.sessionId).set(session);

  const failures = await Promise.all(
    Array.from({ length: 8 }, () => finalizeMessagingExtractionFailure({
      jobId: "bound-failure-job",
      reason: "EXTRACTION_FAILED",
      sessionId: session.sessionId,
    })),
  );
  assert.equal(failures.filter((result) => result.status === "finalized").length, 1);
  assert.equal((await sessions.doc(session.sessionId).get()).get("state"), "FAILED");

  assert.equal(isTransitionForbidden("PROCESSING_MENU", "PREVIEW_READY"), null);
  assert.match(
    isTransitionForbidden("PROCESSING_MENU", "LIVE") || "",
    /not allowed/,
  );

  const transitionSession = buildSession({ sessionId: "messaging-transition-race" });
  await sessions.doc(transitionSession.sessionId).set(transitionSession);
  const transitions = await Promise.all([
    transitionState(
      transitionSession.sessionId,
      "COLLECTING_INPUT",
      "VALIDATING_ASSETS",
      "claim-a",
      { _provider: "whatsapp", _userIdMasked: "0000" },
    ),
    transitionState(
      transitionSession.sessionId,
      "COLLECTING_INPUT",
      "EXPIRED",
      "claim-b",
      { _provider: "whatsapp", _userIdMasked: "0000" },
    ),
  ]);
  assert.equal(transitions.filter(Boolean).length, 1);
  const transitioned = await sessions.doc(transitionSession.sessionId).get();
  assert.equal(transitioned.get("_provider"), undefined);
  assert.equal(transitioned.get("_userIdMasked"), undefined);
}

async function verifyUploadsDuringExtractionRestart(): Promise<void> {
  for (const outcome of ["success", "failure"] as const) {
    const session = buildSession({ sessionId: `messaging-extraction-new-upload-${outcome}` });
    session.state = "PROCESSING_MENU";
    session.stateHistory.push({
      reason: "processing",
      state: "PROCESSING_MENU",
      timestamp: Timestamp.now(),
    });
    session.extractionJobId = `job-${outcome}`;
    session.pendingUploadsWhileProcessing = true;
    session.uploads.push(buildUpload("late-processing-upload", session.sessionId));
    await sessions.doc(session.sessionId).set(session);

    const result = outcome === "success"
      ? await finalizeMessagingExtractionSuccess({
        data: {
          extractedBusinessProfile: null,
          extractedMenuData: { categories: [{ id: "stale" }], items: [{ id: "stale" }] },
          extractedProjectFiles: [],
          previewToken: "stale-preview-token",
          previewUrl: `https://localhost/msg-preview/${session.sessionId}?token=stale-preview-token`,
          qualityScore: 80,
        },
        jobId: `job-${outcome}`,
        sessionId: session.sessionId,
      })
      : await finalizeMessagingExtractionFailure({
        jobId: `job-${outcome}`,
        reason: "provider failed",
        sessionId: session.sessionId,
      });

    assert.equal(result.status, "uploads_changed");
    const restarted = await sessions.doc(session.sessionId).get();
    assert.equal(restarted.get("state"), "AWAITING_MORE_UPLOADS");
    assert.equal(restarted.get("extractionJobId"), null);
    assert.equal(restarted.get("pendingUploadsWhileProcessing"), false);
    assert.equal(restarted.get("previewMessagePending"), undefined);
    assert(restarted.get("intakeExpiresAt").toMillis() > Date.now());
  }
}

async function verifyValidationSnapshotCommit(): Promise<void> {
  const expiredSession = buildSession({ sessionId: "messaging-validation-expired" });
  await sessions.doc(expiredSession.sessionId).set(expiredSession);
  await seedRate(expiredSession.providerUserId);
  const expiredClaim = await claimMessagingIntakeSession(expiredSession.sessionId);
  assert.equal(expiredClaim.status, "claimed");
  assert(expiredClaim.session);
  await sessions.doc(expiredSession.sessionId).update({
    expiresAt: Timestamp.fromMillis(expiredSession.createdAt.toMillis() + 1),
  });
  assert.equal(await commitMessagingAssetValidation({
    data: {
      detectedBusinessCategory: "food",
      detectedBusinessType: "Restaurant",
      extractedBusinessInfo: null,
      invalidFiles: [],
      menuCompleteness: "complete",
      typeConfidence: "high",
      typeSource: "ai",
      validationConfidence: "high",
      validMenuFiles: ["upload-1"],
    },
    expectedUploads: expiredClaim.session.uploads,
    now: Timestamp.fromMillis(expiredSession.createdAt.toMillis() + 2),
    sessionId: expiredSession.sessionId,
  }), "expired");
  const expiredPersisted = await sessions.doc(expiredSession.sessionId).get();
  assert.equal(expiredPersisted.get("state"), "EXPIRED");
  assert.deepEqual(
    (expiredPersisted.get("stateHistory") as Array<{ state: string }>).slice(-2).map(({ state }) => state),
    ["FAILED", "EXPIRED"],
  );

  const changedSession = buildSession({ sessionId: "messaging-validation-upload-race" });
  await sessions.doc(changedSession.sessionId).set(changedSession);
  await seedRate(changedSession.providerUserId);
  const changedClaim = await claimMessagingIntakeSession(changedSession.sessionId);
  assert.equal(changedClaim.status, "claimed");
  assert(changedClaim.session);
  await sessions.doc(changedSession.sessionId).update({
    uploads: [...changedSession.uploads, buildUpload("late-upload", changedSession.sessionId)],
  });

  const changedCommit = await commitMessagingAssetValidation({
    data: {
      detectedBusinessCategory: "food",
      detectedBusinessType: "Restaurant",
      extractedBusinessInfo: null,
      invalidFiles: [],
      menuCompleteness: "complete",
      typeConfidence: "high",
      typeSource: "ai",
      validationConfidence: "high",
      validMenuFiles: ["upload-1"],
    },
    expectedUploads: changedClaim.session.uploads,
    sessionId: changedSession.sessionId,
  });
  assert.equal(changedCommit, "uploads_changed");
  const changedPersisted = await sessions.doc(changedSession.sessionId).get();
  assert.equal(changedPersisted.get("state"), "AWAITING_MORE_UPLOADS");
  assert.equal(changedPersisted.get("validMenuFiles").length, 0);
  assert(changedPersisted.get("intakeExpiresAt").toMillis() > Date.now());

  const stableSession = buildSession({ sessionId: "messaging-validation-stable" });
  await sessions.doc(stableSession.sessionId).set(stableSession);
  await seedRate(stableSession.providerUserId);
  const stableClaim = await claimMessagingIntakeSession(stableSession.sessionId);
  assert.equal(stableClaim.status, "claimed");
  assert(stableClaim.session);
  const stableCommit = await commitMessagingAssetValidation({
    data: {
      detectedBusinessCategory: "food",
      detectedBusinessType: "Restaurant",
      extractedBusinessInfo: null,
      invalidFiles: [],
      menuCompleteness: "complete",
      typeConfidence: "high",
      typeSource: "ai",
      validationConfidence: "high",
      validMenuFiles: ["upload-1"],
    },
    expectedUploads: stableClaim.session.uploads,
    sessionId: stableSession.sessionId,
  });
  assert.equal(stableCommit, "committed");
  const stablePersisted = await sessions.doc(stableSession.sessionId).get();
  assert.deepEqual(stablePersisted.get("validMenuFiles"), ["upload-1"]);
  assert.equal(stablePersisted.get("detectedBusinessType"), "Restaurant");
}

async function verifyValidationFailureSnapshot(): Promise<void> {
  const changedSession = buildSession({ sessionId: "messaging-validation-failure-upload-race" });
  await sessions.doc(changedSession.sessionId).set(changedSession);
  await seedRate(changedSession.providerUserId);
  const changedClaim = await claimMessagingIntakeSession(changedSession.sessionId);
  assert.equal(changedClaim.status, "claimed");
  assert(changedClaim.session);
  await sessions.doc(changedSession.sessionId).update({
    pendingUploadsWhileProcessing: true,
    uploads: [
      ...changedSession.uploads,
      buildUpload("failure-late-upload", changedSession.sessionId),
    ],
  });
  assert.equal(await failMessagingAssetValidation({
    expectedUploads: changedClaim.session.uploads,
    sessionId: changedSession.sessionId,
  }), "uploads_changed");
  const restarted = await sessions.doc(changedSession.sessionId).get();
  assert.equal(restarted.get("state"), "AWAITING_MORE_UPLOADS");
  assert.equal(restarted.get("pendingUploadsWhileProcessing"), false);
  assert(restarted.get("intakeExpiresAt").toMillis() > Date.now());

  const stableSession = buildSession({ sessionId: "messaging-validation-failure-stable" });
  await sessions.doc(stableSession.sessionId).set(stableSession);
  await seedRate(stableSession.providerUserId);
  const stableClaim = await claimMessagingIntakeSession(stableSession.sessionId);
  assert.equal(stableClaim.status, "claimed");
  assert(stableClaim.session);
  assert.equal(await failMessagingAssetValidation({
    expectedUploads: stableClaim.session.uploads,
    sessionId: stableSession.sessionId,
  }), "failed");
  assert.equal((await sessions.doc(stableSession.sessionId).get()).get("state"), "FAILED");
}

async function verifyOversizedExtractionResultFailsBeforeWrite(): Promise<void> {
  const session = buildSession({ sessionId: "messaging-oversized-extraction-result" });
  const now = Timestamp.now();
  const jobId = "oversized-extraction-job";
  await sessions.doc(session.sessionId).set({
    ...session,
    extractionJobId: jobId,
    intakeExpiresAt: null,
    processingRuns: 1,
    state: "PROCESSING_MENU",
    stateHistory: [{ reason: "test", state: "PROCESSING_MENU", timestamp: now }],
    updatedAt: now,
  });

  await assert.rejects(
    finalizeMessagingExtractionSuccess({
      data: {
        extractedBusinessProfile: null,
        extractedMenuData: {
          categories: [{ id: "category-1" }],
          items: [{ description: "x".repeat(900_000), id: "item-1" }],
        },
        extractedProjectFiles: [],
        previewToken: "oversized-preview-token",
        previewUrl: `https://localhost/msg-preview/${session.sessionId}?token=oversized-preview-token`,
        qualityScore: 80,
      },
      jobId,
      sessionId: session.sessionId,
    }),
    /MESSAGING_ONBOARDING_SESSION_DOCUMENT_TOO_LARGE/,
  );

  const persisted = await sessions.doc(session.sessionId).get();
  assert.equal(persisted.get("state"), "PROCESSING_MENU");
  assert.equal(persisted.get("extractedMenuData"), null);
  assert.equal(persisted.get("previewToken"), null);
}

async function verifyHardExpiryStopsExtractionWork(): Promise<void> {
  const enqueueSession = buildSession({ sessionId: "messaging-expired-before-enqueue" });
  const enqueueNow = Timestamp.now();
  await sessions.doc(enqueueSession.sessionId).set({
    ...enqueueSession,
    expiresAt: Timestamp.fromMillis(enqueueSession.createdAt.toMillis() + 1),
    intakeExpiresAt: null,
    state: "VALIDATING_ASSETS",
    stateHistory: [{ reason: "validating", state: "VALIDATING_ASSETS", timestamp: enqueueNow }],
  });
  assert.equal((await enqueueMessagingExtractionJob({
    businessCategory: "food",
    businessType: "Restaurant",
    now: Timestamp.fromMillis(enqueueSession.createdAt.toMillis() + 2),
    sessionId: enqueueSession.sessionId,
    validUploadIds: ["upload-1"],
  })).status, "expired");
  assert.equal((await sessions.doc(enqueueSession.sessionId).get()).get("state"), "EXPIRED");
  assert.equal(
    (await jobs.where("projectId", "==", `msg-onboarding-${enqueueSession.sessionId}`).get()).size,
    0,
  );

  const finalizationSession = buildSession({ sessionId: "messaging-expired-before-finalize" });
  const finalizationNow = Timestamp.now();
  const jobId = "expired-finalization-job";
  await sessions.doc(finalizationSession.sessionId).set({
    ...finalizationSession,
    expiresAt: Timestamp.fromMillis(finalizationSession.createdAt.toMillis() + 1),
    extractionJobId: jobId,
    intakeExpiresAt: null,
    state: "PROCESSING_MENU",
    stateHistory: [{ reason: "processing", state: "PROCESSING_MENU", timestamp: finalizationNow }],
  });
  const finalization = await finalizeMessagingExtractionSuccess({
    data: {
      extractedBusinessProfile: null,
      extractedMenuData: { categories: [{ id: "category-1" }], items: [{ id: "item-1" }] },
      extractedProjectFiles: [{ uid: "upload-1" }],
      previewToken: "must-not-persist-preview-token",
      previewUrl: "https://localhost/msg-preview/expired?token=must-not-persist-preview-token",
      qualityScore: 90,
    },
    jobId,
    now: Timestamp.fromMillis(finalizationSession.createdAt.toMillis() + 2),
    sessionId: finalizationSession.sessionId,
  });
  assert.equal(finalization.status, "expired");
  const finalized = await sessions.doc(finalizationSession.sessionId).get();
  assert.equal(finalized.get("state"), "EXPIRED");
  assert.equal(finalized.get("extractionJobId"), null);
  assert.equal(finalized.get("previewMessagePending"), false);
  assert.equal(finalized.get("previewToken"), null);
}

async function run(): Promise<void> {
  assert(process.env.FIRESTORE_EMULATOR_HOST, "FIRESTORE_EMULATOR_HOST is required");
  await verifyLifecycleSerializes();
  await verifyCapsAndStaleTimers();
  await verifyFailureAndStateTransitions();
  await verifyUploadsDuringExtractionRestart();
  await verifyValidationSnapshotCommit();
  await verifyValidationFailureSnapshot();
  await verifyOversizedExtractionResultFailsBeforeWrite();
  await verifyHardExpiryStopsExtractionWork();
  console.log("Messaging extraction lifecycle emulator verification passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
