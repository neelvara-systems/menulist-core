process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.MENULIST_SIGNALDESK_FIREBASE_MODE = process.env.MENULIST_SIGNALDESK_FIREBASE_MODE || "separate";
process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "demo-signaldesk-fresh-lineage";
process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID || process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID;

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("SignalDesk fresh-lineage verification requires FIRESTORE_EMULATOR_HOST.");
  process.exit(1);
}

require("ts-node").register({
  compilerOptions: { module: "CommonJS", target: "ES2022" },
  transpileOnly: true,
});
require("tsconfig-paths/register");

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const { FEATURE_FLAGS } = require("@config/features");
const { SIGNALDESK_COLLECTIONS } = require("@constant/signaldesk/database");
const { admin, signaldeskFirestoreAdmin: db } = require("@lib/firebase/signaldeskFirebaseAdmin");
const signalDeskAiProvider = require("@lib/signaldesk/aiProvider");
const {
  captureSignalDeskReplyServer,
  createSignalDeskDailyGrowthMissionServer,
  createSignalDeskDraftServer,
  createSignalDeskEvidenceServer,
  createSignalDeskSourcePolicyServer,
  importSignalDeskTargetsServer,
  prepareSignalDeskChannelHandoffServer,
  qualifySignalDeskRevenueAccountServer,
  refreshSignalDeskActivationWatchServer,
  reviewSignalDeskApprovalServer,
  runSignalDeskAiAssistServer,
  scoreSignalDeskTargetServer,
  seedSignalDeskDefaultsServer,
  sendSignalDeskApprovedMessageServer,
  upsertSignalDeskChannelWindowStateServer,
  upsertSignalDeskCommercialOpportunityServer,
  upsertSignalDeskSenderDomainServer,
} = require("@lib/signaldesk/workflowServer");

const access = {
  active: true,
  email: "signaldesk-fresh-lineage@example.invalid",
  firebaseConfigured: true,
  isPlatformAdmin: true,
  name: "SignalDesk Fresh Lineage",
  permissions: [],
  role: "founder-admin",
  userId: "signaldesk-fresh-lineage",
};

const hashValue = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const pause = () => new Promise((resolve) => setTimeout(resolve, 8));

async function expectRejects(run, expectedCode) {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert.match(message, new RegExp(expectedCode));
    return;
  }
  assert.fail(`Expected ${expectedCode}`);
}

async function deleteCollection(collectionName) {
  while (true) {
    const snapshot = await db.collection(collectionName).limit(250).get();
    if (snapshot.empty) return;
    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
}

async function resetData() {
  await Promise.all(Array.from(new Set(Object.values(SIGNALDESK_COLLECTIONS))).map(deleteCollection));
}

async function main() {
  await resetData();
  await seedSignalDeskDefaultsServer(access);
  await db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_gemini_ai").set({
    credentialState: "configured",
    dailyBudgetUsd: 5,
    monthlyBudgetUsd: 120,
    ownerApproved: true,
    perRunBudgetUsd: 0.15,
    provider: "gemini",
    status: "approved",
    use: "ai",
    spentTodayUsd: 0,
    spentMonthUsd: 0,
    updatedAt: admin.firestore.Timestamp.now(),
  }, { merge: true });
  await db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc("budget_provider_gemini_default").set({
    dailyBudgetUsd: 5,
    monthlyBudgetUsd: 120,
    perRunBudgetUsd: 0.15,
    provider: "gemini",
    scope: "provider",
    status: "active",
    spentTodayUsd: 0,
    spentMonthUsd: 0,
    updatedAt: admin.firestore.Timestamp.now(),
  }, { merge: true });
  await upsertSignalDeskSenderDomainServer(access, {
    authenticationState: "ready",
    bounceRate: 0,
    brandRisk: "low",
    complaintRate: 0,
    domain: "fresh-lineage.invalid",
    idempotencyKey: "fresh-lineage-sender-v1",
    provider: "owned-email",
    status: "active",
    unsubscribeReady: true,
    volumeRampState: "low_volume",
  });

  const policy = await createSignalDeskSourcePolicyServer(access, {
    accessMethod: "permissioned-referral",
    allowContact: true,
    allowEvidence: true,
    allowPersonalization: true,
    allowedContactChannels: ["email", "manual", "whatsapp", "instagram"],
    allowedFields: ["displayName", "category", "city", "country", "currentListUrl", "website", "email", "phone", "instagram", "notes"],
    attributionRequirements: ["Keep source authority attached."],
    blockedFields: [],
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000).toISOString(),
    idempotencyKey: "fresh-lineage-policy-v1",
    lastReviewedAt: new Date().toISOString(),
    name: "Fresh lineage policy",
    notes: "Local emulator authority fixture.",
    policyOwner: access.userId,
    prohibitedUses: ["unapproved send"],
    rawPayloadPolicy: "never-store",
    refreshMethod: "manual-review",
    retentionDays: 30,
    sourceType: "manual-research",
    termsVersion: "fresh-lineage-v1",
  });

  const sensitiveTargetName = "Sensitive Fresh Lineage Cafe";
  const phone = "+919876543210";
  const row = {
    category: "restaurant",
    city: "Mumbai",
    country: "India",
    currentListUrl: "",
    displayName: sensitiveTargetName,
    email: "fresh-lineage-owner@example.invalid",
    instagram: "sensitive_fresh_lineage",
    notes: "source-only note that must not enter immutable logs",
    permissionEvidenceRef: "permission:fresh-lineage-owner",
    phone,
    website: "https://fresh-lineage.invalid",
  };
  const importTarget = (idempotencyKey) => importSignalDeskTargetsServer(access, {
    idempotencyKey,
    rows: [row],
    sourceName: "fresh lineage source",
    sourcePolicyId: policy.sourcePolicyId,
  });

  const firstImport = await importTarget("fresh-lineage-import-v1");
  const targetId = firstImport.targets[0].targetId;
  const firstRunId = firstImport.run.sourceRunId;
  const targetRef = db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId);
  const detailRef = db.collection(SIGNALDESK_COLLECTIONS.TARGETS).doc(targetId);
  const whatsappContactRef = db.collection(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES)
    .doc(`whatsapp_${hashValue(phone)}`);

  for (const snapshot of await Promise.all([targetRef.get(), detailRef.get(), whatsappContactRef.get()])) {
    assert.equal(snapshot.get("sourceDataLifecycleState"), "active");
    assert.equal(snapshot.get("sourceRunId"), firstRunId);
    assert.ok(snapshot.get("sourceDataObservedAt"));
    assert.ok(snapshot.get("sourceDataExpiresAt"));
  }
  assert.equal((await whatsappContactRef.get()).get("rawValueStored"), true);

  await targetRef.set({
    sourceDataLifecycleState: "pending",
    sourceDataLifecycleToken: "pending-retention-proof",
  }, { merge: true });
  await expectRejects(
    () => importTarget("fresh-lineage-import-pending-rejected-v1"),
    "SOURCE_DATA_LIFECYCLE_IN_PROGRESS",
  );
  await targetRef.set({
    sourceDataLifecycleState: "active",
    sourceDataLifecycleToken: null,
  }, { merge: true });

  const firstScore = await scoreSignalDeskTargetServer(access, targetId);
  const firstEvidence = await createSignalDeskEvidenceServer(access, targetId);
  const firstScoreRaw = (await db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(firstScore.scoreId).get()).data();
  assert.equal(firstScoreRaw.aiDetailLifecycleState, "active");
  assert.equal(firstScoreRaw.sourceDataPayloadStored, true);
  assert.ok(firstScoreRaw.aiDetailExpiresAt.toMillis() - firstScoreRaw.aiDetailRetentionAnchorAt.toMillis() === 90 * 24 * 60 * 60 * 1_000);

  const contactBeforeTombstone = (await whatsappContactRef.get()).data();
  await whatsappContactRef.set({
    permissionEvidenceRef: null,
    permissionState: "expired",
    rawValueStored: false,
    sourceDataLifecycleCompletedAt: admin.firestore.Timestamp.now(),
    sourceDataLifecycleState: "completed",
    sourceDataLifecycleToken: "contact-retention-token-v1",
    updatedAt: admin.firestore.Timestamp.now(),
    value: admin.firestore.FieldValue.delete(),
  }, { merge: true });

  const replay = await importTarget("fresh-lineage-import-v1");
  assert.equal(replay.run.sourceRunId, firstRunId);
  assert.equal((await whatsappContactRef.get()).get("sourceDataLifecycleState"), "completed");
  assert.equal((await whatsappContactRef.get()).get("value"), undefined);

  await pause();
  const secondImport = await importTarget("fresh-lineage-import-v2");
  assert.notEqual(secondImport.run.sourceRunId, firstRunId);
  const refreshedContact = (await whatsappContactRef.get()).data();
  assert.equal(refreshedContact.sourceDataLifecycleState, "active");
  assert.equal(refreshedContact.sourceRunId, secondImport.run.sourceRunId);
  assert.equal(refreshedContact.value, phone);
  assert.equal(refreshedContact.rawValueStored, true);
  assert.ok(refreshedContact.sourceDataObservedAt.toMillis() > contactBeforeTombstone.sourceDataObservedAt.toMillis());

  const secondScore = await scoreSignalDeskTargetServer(access, targetId);
  const secondEvidence = await createSignalDeskEvidenceServer(access, targetId);
  assert.notEqual(secondScore.scoreId, firstScore.scoreId);
  assert.notEqual(secondEvidence.evidencePacketId, firstEvidence.evidencePacketId);
  assert.equal((await db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(firstScore.scoreId).get()).exists, true);
  assert.equal((await db.collection(SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES).doc(firstEvidence.evidencePacketId).get()).exists, true);

  signalDeskAiProvider.runSignalDeskAiAssist = async (input) => ({
    confidence: "high",
    model: input.model,
    output: {
      confidence: "high",
      nextAction: "review",
      reasons: ["Fresh source authority verified"],
      rejectedFacts: [],
    },
    promptVersion: "signaldesk-ai-assist-v2",
    task: input.task,
  });
  const aiAssistIdempotencyKey = "fresh-lineage-ai-assist-v1";
  const aiAssist = await runSignalDeskAiAssistServer(access, {
    idempotencyKey: aiAssistIdempotencyKey,
    targetId,
    task: "evidence",
  });
  const aiAssistRef = db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(aiAssist.aiRunId);
  const aiAssistRaw = (await aiAssistRef.get()).data();
  assert.equal(aiAssistRaw.sourceRunId, secondImport.run.sourceRunId);
  assert.equal(aiAssistRaw.sourceDataLifecycleState, "active");
  assert.equal(aiAssistRaw.aiDetailLifecycleState, "active");
  assert.equal(aiAssistRaw.sourceDataPayloadStored, true);
  assert.ok(aiAssistRaw.aiDetailExpiresAt.toMillis() - aiAssistRaw.aiDetailRetentionAnchorAt.toMillis() === 90 * 24 * 60 * 60 * 1_000);
  await aiAssistRef.set({
    aiDetailExpiresAt: null,
    aiDetailLifecycleState: "completed",
    output: null,
    sourceDataPayloadStored: false,
  }, { merge: true });
  await expectRejects(
    () => runSignalDeskAiAssistServer(access, {
      idempotencyKey: aiAssistIdempotencyKey,
      targetId,
      task: "evidence",
    }),
    "AI_ASSIST_DETAIL_EXPIRED",
  );

  const candidateSnapshot = await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_CANDIDATES)
    .where("targetId", "==", targetId)
    .get();
  assert.equal(candidateSnapshot.size, 2);
  assert.ok(candidateSnapshot.docs.every((document) => document.get("sourceDataLifecycleState") === "active"));

  const initialQualification = await qualifySignalDeskRevenueAccountServer(access, {
    locationType: "single-location",
    targetId,
  });
  assert.equal(initialQualification.qualified, true);
  const accountRef = db.collection(SIGNALDESK_COLLECTIONS.REVENUE_ACCOUNTS).doc(initialQualification.account.revenueAccountId);
  const opportunityRef = db.collection(SIGNALDESK_COLLECTIONS.COMMERCIAL_OPPORTUNITIES).doc(initialQualification.opportunity.opportunityId);
  assert.equal((await accountRef.get()).get("sourceDataLifecycleState"), "active");
  assert.equal((await opportunityRef.get()).get("sourceDataLifecycleState"), "active");

  await accountRef.set({
    activationState: "not-started",
    automationState: "paused",
    displayName: "Retained revenue account",
    engagementState: "none",
    lifecycleStage: "nurture",
    sourceDataLifecycleCompletedAt: admin.firestore.Timestamp.now(),
    sourceDataLifecycleState: "completed",
    sourceDataLifecycleToken: "revenue-retention-token-v1",
  }, { merge: true });
  await opportunityRef.set({
    nextAction: "No action; source-data retention completed.",
    probabilityPercent: 0,
    sourceDataLifecycleCompletedAt: admin.firestore.Timestamp.now(),
    sourceDataLifecycleState: "completed",
    sourceDataLifecycleToken: "opportunity-retention-token-v1",
    stage: "nurture",
    status: "nurture",
    title: "Retained commercial opportunity",
    valueMinor: 0,
  }, { merge: true });
  await expectRejects(
    () => qualifySignalDeskRevenueAccountServer(access, { locationType: "single-location", targetId }),
    "REVENUE_ACCOUNT_FRESH_LINEAGE_REQUIRED",
  );

  await pause();
  const thirdImport = await importTarget("fresh-lineage-import-v3");
  await scoreSignalDeskTargetServer(access, targetId);
  const freshQualification = await qualifySignalDeskRevenueAccountServer(access, {
    locationType: "single-location",
    targetId,
  });
  assert.equal((await accountRef.get()).get("sourceDataLifecycleState"), "active");
  assert.equal((await accountRef.get()).get("sourceRunId"), thirdImport.run.sourceRunId);
  assert.equal((await opportunityRef.get()).get("sourceDataLifecycleState"), "active");
  assert.equal((await opportunityRef.get()).get("status"), "open");

  const sensitiveNextAction = "Call private owner Alice on secret extension 4242";
  await upsertSignalDeskCommercialOpportunityServer(access, {
    founderAttentionMinutes: 1,
    nextAction: sensitiveNextAction,
    opportunityId: freshQualification.opportunity.opportunityId,
    probabilityPercent: 35,
    stage: "discovery",
    status: "open",
    valueMinor: 0,
  });
  await refreshSignalDeskActivationWatchServer(access, { targetId });

  const timelineSnapshot = await db.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES).get();
  const timelineText = JSON.stringify(timelineSnapshot.docs.map((document) => document.data()));
  assert.equal(timelineText.includes(sensitiveTargetName), false);
  assert.equal(timelineText.includes(`${sensitiveTargetName} - MenuList standard path`), false);
  assert.equal(timelineText.includes(sensitiveNextAction), false);

  await opportunityRef.set({
    legalRetentionReviewReason: "commercial-engagement-record",
    legalRetentionReviewRequired: false,
    sourceDataLifecycleCompletedAt: admin.firestore.Timestamp.now(),
    sourceDataLifecycleState: "completed",
    stage: "won",
    status: "won",
  }, { merge: true });
  await accountRef.set({
    engagementState: "replied",
    legalRetentionReviewReason: "commercial-engagement-record",
    legalRetentionReviewRequired: true,
    lifecycleStage: "customer",
    sourceDataLifecycleCompletedAt: admin.firestore.Timestamp.now(),
    sourceDataLifecycleState: "completed",
  }, { merge: true });
  await pause();
  await importTarget("fresh-lineage-import-v4");
  await scoreSignalDeskTargetServer(access, targetId);
  await qualifySignalDeskRevenueAccountServer(access, { locationType: "single-location", targetId });
  assert.equal((await opportunityRef.get()).get("status"), "won");
  assert.equal((await opportunityRef.get()).get("sourceDataLifecycleState"), "completed");
  assert.equal((await accountRef.get()).get("sourceDataLifecycleState"), "completed");
  await expectRejects(
    () => upsertSignalDeskCommercialOpportunityServer(access, {
      founderAttentionMinutes: 0,
      nextAction: "Reopen retained win",
      opportunityId: freshQualification.opportunity.opportunityId,
      probabilityPercent: 25,
      stage: "discovery",
      status: "open",
      valueMinor: 0,
    }),
    "COMMERCIAL_OPPORTUNITY_TERMINAL_RECORD_PRESERVED",
  );

  const latestEvidence = await createSignalDeskEvidenceServer(access, targetId);
  const latestEvidenceRef = db.collection(SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES)
    .doc(latestEvidence.evidencePacketId);
  const latestEvidenceSnapshot = await latestEvidenceRef.get();
  const latestEvidenceData = latestEvidenceSnapshot.data();
  assert.ok(latestEvidenceData);
  await latestEvidenceRef.set({ targetName: "Corrupted evidence target" }, { merge: true });
  await expectRejects(
    () => createSignalDeskEvidenceServer(access, targetId),
    "OUTCOME_EVIDENCE_TARGET_MISMATCH",
  );
  await latestEvidenceRef.set(latestEvidenceData);
  let providerStartedResolve;
  let releaseProviderResolve;
  const providerStarted = new Promise((resolve) => { providerStartedResolve = resolve; });
  const releaseProvider = new Promise((resolve) => { releaseProviderResolve = resolve; });
  signalDeskAiProvider.runSignalDeskAiAssist = async (input) => {
    providerStartedResolve();
    await releaseProvider;
    return {
      confidence: "high",
      model: input.model,
      output: {
        confidence: "high",
        nextAction: "review",
        reasons: ["TOCTOU fixture output must not persist"],
        rejectedFacts: [],
      },
      promptVersion: "signaldesk-ai-assist-v2",
      task: input.task,
    };
  };
  const toctouIdempotencyKey = "fresh-lineage-ai-toctou-v1";
  const targetBeforeToctou = (await targetRef.get()).data();
  const toctouRun = runSignalDeskAiAssistServer(access, {
    idempotencyKey: toctouIdempotencyKey,
    targetId,
    task: "evidence",
  });
  await providerStarted;
  const changedAt = admin.firestore.Timestamp.now();
  await targetRef.set({
    sourceDataObservedAt: changedAt,
    sourceRunId: "source_run_concurrent_refresh",
    updatedAt: changedAt,
  }, { merge: true });
  releaseProviderResolve();
  await expectRejects(() => toctouRun, "AI_ASSIST_SOURCE_AUTHORITY_CHANGED");
  const toctouHash = hashValue(`${access.userId}|${toctouIdempotencyKey}`);
  const toctouClaim = await db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS)
    .doc(`ai_assist_${toctouHash}`)
    .get();
  const toctouRunRef = db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS)
    .doc(`ai_assist_${toctouHash.slice(0, 32)}`);
  assert.equal(toctouClaim.get("status"), "unresolved");
  assert.equal(toctouClaim.get("failureCode"), "ai_assist_source_authority_changed");
  assert.equal((await toctouRunRef.get()).exists, false);
  await targetRef.set({
    sourceDataExpiresAt: targetBeforeToctou.sourceDataExpiresAt,
    sourceDataObservedAt: targetBeforeToctou.sourceDataObservedAt,
    sourceRunId: targetBeforeToctou.sourceRunId,
    updatedAt: targetBeforeToctou.updatedAt,
  }, { merge: true });

  const evidenceSummaries = await db.collection(SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES)
    .where("targetId", "==", targetId)
    .get();
  const evidenceDeleteBatch = db.batch();
  evidenceSummaries.docs.forEach((document) => evidenceDeleteBatch.delete(document.ref));
  await evidenceDeleteBatch.commit();

  let evidenceProviderStartedResolve;
  let releaseEvidenceProviderResolve;
  const evidenceProviderStarted = new Promise((resolve) => { evidenceProviderStartedResolve = resolve; });
  const releaseEvidenceProvider = new Promise((resolve) => { releaseEvidenceProviderResolve = resolve; });
  signalDeskAiProvider.runSignalDeskAiAssist = async (input) => {
    evidenceProviderStartedResolve();
    await releaseEvidenceProvider;
    return {
      confidence: "high",
      model: input.model,
      output: {
        confidence: "high",
        nextAction: "review",
        reasons: ["Concurrent evidence fixture output must not persist"],
        rejectedFacts: [],
      },
      promptVersion: "signaldesk-ai-assist-v2",
      task: input.task,
    };
  };
  const evidenceToctouIdempotencyKey = "fresh-lineage-ai-evidence-toctou-v1";
  const evidenceToctouRun = runSignalDeskAiAssistServer(access, {
    idempotencyKey: evidenceToctouIdempotencyKey,
    targetId,
    task: "evidence",
  });
  await evidenceProviderStarted;
  await latestEvidenceRef.set(latestEvidenceData);
  releaseEvidenceProviderResolve();
  await expectRejects(() => evidenceToctouRun, "AI_ASSIST_SOURCE_AUTHORITY_CHANGED");
  const evidenceToctouHash = hashValue(`${access.userId}|${evidenceToctouIdempotencyKey}`);
  const evidenceToctouClaim = await db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS)
    .doc(`ai_assist_${evidenceToctouHash}`)
    .get();
  assert.equal(evidenceToctouClaim.get("status"), "unresolved");
  assert.equal(evidenceToctouClaim.get("failureCode"), "ai_assist_source_authority_changed");
  assert.equal((await db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS)
    .doc(`ai_assist_${evidenceToctouHash.slice(0, 32)}`)
    .get()).exists, false);

  const draftResult = await createSignalDeskDraftServer(access, { targetId });
  assert.equal(draftResult.draft.evidencePacketId, latestEvidence.evidencePacketId);
  const sensitiveReviewNote = "Operator note with private customer detail 8391";
  await reviewSignalDeskApprovalServer(access, {
    approvalId: draftResult.approval.approvalId,
    reason: sensitiveReviewNote,
    status: "approved",
  });
  await upsertSignalDeskChannelWindowStateServer(access, {
    channel: "whatsapp",
    idempotencyKey: "fresh-lineage-whatsapp-window-v1",
    reason: "Inbound owner opt-in recorded",
    source: "opt-in",
    status: "open",
    targetId,
  });
  const digitsOnly = phone.replace(/\D/g, "");
  await db.collection(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER)
    .doc(`phone_${hashValue(digitsOnly)}`)
    .set({
      channel: "whatsapp",
      createdAt: admin.firestore.Timestamp.now(),
      identityHash: hashValue(digitsOnly),
      pId: "SD",
      reason: "dnc",
      source: "legacy",
      suppressionId: `phone_${hashValue(digitsOnly)}`,
      targetId,
    });
  await expectRejects(
    () => prepareSignalDeskChannelHandoffServer(access, {
      approvalId: draftResult.approval.approvalId,
      channel: "whatsapp",
    }),
    "Target is suppressed",
  );
  await expectRejects(
    () => prepareSignalDeskChannelHandoffServer(access, {
      approvalId: draftResult.approval.approvalId,
      channel: "messenger",
    }),
    "ASSISTED_CHANNEL_RECIPIENT_NOT_SAFE",
  );
  await upsertSignalDeskChannelWindowStateServer(access, {
    channel: "instagram",
    idempotencyKey: "fresh-lineage-instagram-window-v1",
    reason: "Inbound owner opt-in recorded",
    source: "opt-in",
    status: "open",
    targetId,
  });
  const instagramRecipientId = "17841400000000001";
  await detailRef.set({ instagramRecipientId }, { merge: true });
  const instagramSuppressionRef = db.collection(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER)
    .doc(`instagram_${hashValue(row.instagram)}`);
  await instagramSuppressionRef.set({
    channel: "instagram",
    createdAt: admin.firestore.Timestamp.now(),
    identityHash: hashValue(row.instagram),
    pId: "SD",
    reason: "dnc",
    source: "inbound",
    suppressionId: instagramSuppressionRef.id,
    targetId,
  });
  FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND = true;
  try {
    await expectRejects(
      () => sendSignalDeskApprovedMessageServer(access, {
        approvalId: draftResult.approval.approvalId,
        channel: "instagram",
      }),
      "DIRECT_PROVIDER_SEND_EMAIL_ONLY",
    );
  } finally {
    FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND = false;
    await instagramSuppressionRef.delete();
  }
  const redactedHandoff = await prepareSignalDeskChannelHandoffServer(access, {
    approvalId: draftResult.approval.approvalId,
    channel: "instagram",
  });
  assert.equal(redactedHandoff.recipient, null);
  assert.equal(redactedHandoff.recipientPreview, "@s***");
  const redactedReplay = await prepareSignalDeskChannelHandoffServer({
    ...access,
    permissions: ["contact.reveal"],
  }, {
    approvalId: draftResult.approval.approvalId,
    channel: "instagram",
  });
  assert.equal(redactedReplay.recipient, null);
  assert.equal(redactedReplay.recipientPreview, "@s***");

  const conversationId = `conv_${targetId}`;
  const sensitiveInterestedPreview = "Interested; private order reference SECRET-7788";
  await db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES).doc(conversationId).set({
    channel: "email",
    conversationId,
    lastMessagePreview: sensitiveInterestedPreview,
    pId: "SD",
    state: "interested",
    targetId,
    targetName: sensitiveTargetName,
    updatedAt: admin.firestore.Timestamp.now(),
  });
  await targetRef.set({ latestConversationId: conversationId }, { merge: true });
  const mission = await createSignalDeskDailyGrowthMissionServer(access);
  assert.ok(mission.missionActions.some((action) => action.entityType === "reply"));
  assert.equal(JSON.stringify(mission.missionActions).includes(sensitiveInterestedPreview), false);

  const sensitiveComplaint = "Spam complaint; private case SECRET-COMPLAINT-9911";
  await captureSignalDeskReplyServer(access, {
    conversationId,
    idempotencyKey: "fresh-lineage-critical-reply-v1",
    message: sensitiveComplaint,
  });
  const missionAfterComplaint = (await db.collection(SIGNALDESK_COLLECTIONS.GROWTH_MISSIONS).doc(mission.growthMissionId).get()).data();
  assert.equal(JSON.stringify(missionAfterComplaint.missionActions).includes(sensitiveComplaint), false);
  assert.ok(missionAfterComplaint.missionActions.every((action) => /^[a-z-]+:[a-z-]+:[a-z-]+$/.test(action.reason)));

  const auditSnapshot = await db.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS).get();
  const auditText = JSON.stringify(auditSnapshot.docs.map((document) => document.data()));
  for (const forbidden of [sensitiveTargetName, sensitiveNextAction, sensitiveReviewNote, sensitiveInterestedPreview, sensitiveComplaint]) {
    assert.equal(auditText.includes(forbidden), false, `Audit retained forbidden text: ${forbidden}`);
  }
  assert.ok(auditSnapshot.docs.every((document) => {
    const reason = document.get("reason");
    return reason == null || /^event:[a-z0-9_-]+$/.test(reason) || document.get("actorId") === "signaldesk-source-data-lifecycle";
  }));

  const workflowSource = fs.readFileSync("src/lib/signaldesk/workflowServer.ts", "utf8");
  assert.match(workflowSource, /SOURCE_PROVIDER_RETENTION_FRESH_LINEAGE_REQUIRED/);
  assert.match(workflowSource, /providerIdentityHash: hashValue\(JSON\.stringify/);
  console.log("SignalDesk fresh-lineage verification passed");
}

main().catch((error) => {
  console.error("SignalDesk fresh-lineage verification failed");
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
