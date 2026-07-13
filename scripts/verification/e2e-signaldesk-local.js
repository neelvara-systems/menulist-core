process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.MENULIST_SIGNALDESK_FIREBASE_MODE = process.env.MENULIST_SIGNALDESK_FIREBASE_MODE || "separate";
process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "demo-signaldesk";
process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID || process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID;
process.env.MENULIST_SIGNALDESK_EMAIL_WEBHOOK_SECRET = process.env.MENULIST_SIGNALDESK_EMAIL_WEBHOOK_SECRET || "local-signaldesk-webhook-secret";
process.env.MENULIST_SIGNALDESK_APIFY_WEBHOOK_SECRET = process.env.MENULIST_SIGNALDESK_APIFY_WEBHOOK_SECRET || "local-signaldesk-apify-webhook-secret";
process.env.MENULIST_SIGNALDESK_OUTCOME_BRIDGE_SECRET = process.env.MENULIST_SIGNALDESK_OUTCOME_BRIDGE_SECRET || "local-signaldesk-outcome-bridge-secret";
process.env.MENULIST_SIGNALDESK_META_APP_SECRET = process.env.MENULIST_SIGNALDESK_META_APP_SECRET || "local-signaldesk-meta-app-secret";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("SignalDesk local E2E requires FIRESTORE_EMULATOR_HOST. Run it through firebase emulators:exec.");
  process.exit(1);
}

require("ts-node").register({
  compilerOptions: { module: "CommonJS" },
  transpileOnly: true,
});
require("tsconfig-paths/register");

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { SIGNALDESK_COLLECTIONS, SIGNALDESK_SUMMARY_DOCS } = require("@constant/signaldesk/database");
const { SIGNALDESK_OUTCOME_ROUTE_SCOPE } = require("@constant/signaldesk/integrations");
const { admin, signaldeskFirestoreAdmin } = require("@lib/firebase/signaldeskFirebaseAdmin");
const { isSignalDeskMobileRequest } = require("@lib/signaldesk/apiGuards");
const { getSignalDeskAccessContext } = require("@lib/signaldesk/access");
const { recordSignalDeskMobileActionBlockedServer } = require("@lib/signaldesk/server");
const { processSignalDeskProviderWebhook } = require("@lib/signaldesk/webhookServer");
const signalDeskAiProvider = require("@lib/signaldesk/aiProvider");
const {
  captureSignalDeskDemandSignalServer,
  captureSignalDeskReplyServer,
  createSignalDeskDailyGrowthMissionServer,
  createSignalDeskDraftServer,
  createSignalDeskEvidenceServer,
  createSignalDeskResearchAgentRunServer,
  createSignalDeskRouteTokenServer,
  createSignalDeskSourcePolicyServer,
  exportSignalDeskMessageServer,
  importSignalDeskTargetsServer,
  loadSignalDeskWorkspaceServer,
  qualifySignalDeskRevenueAccountServer,
  recommendSignalDeskMarketPodPlanServer,
  recordSignalDeskManualContactServer,
  recordSignalDeskOutcomeServer,
  refreshSignalDeskActivationWatchServer,
  revokeSignalDeskRouteTokenServer,
  reviewSignalDeskApprovalServer,
  reviewSignalDeskAiShadowRunServer,
  reviewSignalDeskMarketPodServer,
  runSignalDeskAiVolumeBatchServer,
  runSignalDeskSourceProviderServer,
  scoreSignalDeskTargetServer,
  seedSignalDeskDefaultsServer,
  sendSignalDeskApprovedMessageServer,
  upsertSignalDeskCommercialOfferServer,
  upsertSignalDeskCommercialOpportunityServer,
  upsertSignalDeskProofPermissionServer,
  createSignalDeskContentAssetServer,
  generateSignalDeskContentDistributionDraftsServer,
  upsertSignalDeskOperatingEnvelopeServer,
  upsertSignalDeskSenderDomainServer,
  upsertSignalDeskTeamMemberServer,
} = require("@lib/signaldesk/workflowServer");
const { processSignalDeskOutcomeBridge } = require("@lib/signaldesk/outcomeBridgeServer");

const db = signaldeskFirestoreAdmin;
const timestampNow = () => admin.firestore.Timestamp.now();
const hashValue = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const metaWebhookHeaders = (rawBody) => new Headers({
  "x-hub-signature-256": `sha256=${crypto.createHmac("sha256", process.env.MENULIST_SIGNALDESK_META_APP_SECRET).update(rawBody).digest("hex")}`,
});
const signedOutcomeHeaders = (rawBody, timestamp = String(Math.floor(Date.now() / 1000))) => new Headers({
  "x-signaldesk-outcome-signature": `sha256=${crypto.createHmac("sha256", process.env.MENULIST_SIGNALDESK_OUTCOME_BRIDGE_SECRET).update(`${timestamp}.${rawBody}`).digest("hex")}`,
  "x-signaldesk-outcome-timestamp": timestamp,
});
const futureIso = (days = 30) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
const pastIso = () => "2000-01-01T00:00:00.000Z";
const activationFixture = (targetId, suffix = "activation") => ({
  evidenceRef: `evidence:${targetId}:${suffix}`,
  idempotencyKey: `outcome:${targetId}:${suffix}`,
  ownerQualifiedAt: new Date(Date.now() - 60_000).toISOString(),
  ownerReviewedAt: new Date().toISOString(),
  surfaces: ["qr", "whatsapp"],
});

const access = {
  active: true,
  email: "signaldesk-e2e@example.invalid",
  firebaseConfigured: true,
  isPlatformAdmin: true,
  name: "SignalDesk E2E",
  permissions: [
    "signaldesk.view",
    "signaldesk.configure",
    "target.review",
    "draft.create",
    "draft.approve",
    "message.export",
    "message.send",
    "source.configure",
    "channel.configure",
    "policy.approve",
    "kill-switch.activate",
    "kill-switch.deactivate",
    "audit.view",
  ],
  role: "founder-admin",
  userId: "signaldesk-e2e",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function deleteCollection(collectionName) {
  while (true) {
    const snap = await db.collection(collectionName).limit(250).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function cleanSignalDeskData() {
  const collections = [
    ...new Set(Object.values(SIGNALDESK_COLLECTIONS)),
    "stores",
    "menus",
    "projects",
    "billing",
  ];
  await Promise.all(collections.map((collectionName) => deleteCollection(collectionName)));
}

async function expectRejects(label, fn, expectedMessage) {
  try {
    await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(message.includes(expectedMessage), `${label}: expected "${expectedMessage}", received "${message}"`);
    return message;
  }
  throw new Error(`${label}: expected rejection "${expectedMessage}"`);
}

async function expectCollectionCount(collectionName, predicate) {
  const snap = await db.collection(collectionName).get();
  return snap.docs.filter((doc) => predicate(doc.data(), doc.id)).length;
}

async function seedAccessAndReadiness() {
  await db.collection(SIGNALDESK_COLLECTIONS.TEAM_MEMBERS).doc(access.userId).set({
    active: true,
    email: access.email,
    name: access.name,
    role: access.role,
    updatedAt: timestampNow(),
  }, { merge: true });

  await seedSignalDeskDefaultsServer(access);
  const publicResearchPolicySnap = await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc("policy_public_business_research_v1").get();
  assert(publicResearchPolicySnap.exists, "Evidence-only public-business research policy was not seeded");
  assert(publicResearchPolicySnap.data()?.allowedUse?.contact === false, "Public-business research policy granted contact permission");
  assert(publicResearchPolicySnap.data()?.allowedUse?.personalization === false, "Public-business research policy granted personalization permission");
  assert(publicResearchPolicySnap.data()?.retentionDays === 30, "Public-business research policy drifted from the 30-day trial retention boundary");
  const permissionedPolicySnap = await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc("policy_manual_research_v1").get();
  assert(permissionedPolicySnap.data()?.allowedUse?.contact === true, "Permissioned manual-introduction policy lost contact use");
  assert(String(permissionedPolicySnap.data()?.notes || "").includes("permissioned"), "Permissioned manual-introduction policy lost its source-rights boundary");
  const zeroSpendPartnerBudgetSnap = await db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc("budget_trust-partner_all_first_partner_test").get();
  assert(zeroSpendPartnerBudgetSnap.data()?.monthlyBudgetUsd === 0, "First trust-partner test pre-approved monthly spend");
  assert(zeroSpendPartnerBudgetSnap.data()?.perRunBudgetUsd === 0, "First trust-partner test pre-approved per-run spend");
  const googlePlacesProviderSnap = await db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_google-places_discovery").get();
  assert(googlePlacesProviderSnap.data()?.ownerApproved === false, "Google Places discovery was approved by default");
  assert(googlePlacesProviderSnap.data()?.monthlyBudgetUsd === 0, "Google Places discovery received a default trial budget");
  const firstPodSnap = await db.collection(SIGNALDESK_COLLECTIONS.MARKET_PODS).doc("market_pod_first_local_v1").get();
  assert(firstPodSnap.data()?.status === "hold", "Recommended first pod bypassed founder approval");
  assert(firstPodSnap.data()?.city === "Bengaluru - Indiranagar and Koramangala", "Recommended first pod drifted from the Bengaluru trial boundary");
  assert(firstPodSnap.data()?.monthlyBudgetUsd === 0, "Recommended first pod pre-approved spend");
  await firstPodSnap.ref.set({
    approvedBy: admin.firestore.FieldValue.delete(),
    category: "restaurant",
    city: "Mumbai",
    country: "India",
    monthlyBudgetUsd: 300,
    name: "First local proof pod",
    offerAngle: "Current-list proof and private preview.",
    status: "hold",
    successMetric: "preview_prepared",
    updatedAt: timestampNow(),
  }, { merge: true });
  await seedSignalDeskDefaultsServer(access);
  const migratedLegacyPodSnap = await firstPodSnap.ref.get();
  assert(migratedLegacyPodSnap.data()?.city === "Bengaluru - Indiranagar and Koramangala", "Legacy unapproved first-pod seed was not migrated");
  assert(migratedLegacyPodSnap.data()?.monthlyBudgetUsd === 0, "Legacy first-pod migration retained unapproved spend");
  await expectRejects("Non-founder market pod approval", () => reviewSignalDeskMarketPodServer({
    ...access,
    role: "growth-manager",
  }, {
    decision: "approved",
    marketPodId: firstPodSnap.id,
    reason: "This role must not approve strategy.",
  }), "Founder approval is required for market pod decisions");
  const approvedPod = await reviewSignalDeskMarketPodServer(access, {
    decision: "approved",
    marketPodId: firstPodSnap.id,
    reason: "Approved for one bounded seven-day E2E trial.",
  });
  assert(approvedPod.status === "active" && approvedPod.reviewDecision === "approved", "Founder market-pod approval was not recorded");
  await seedSignalDeskDefaultsServer(access);
  const reseededPodSnap = await firstPodSnap.ref.get();
  assert(reseededPodSnap.data()?.status === "active", "Default seeding revoked founder market-pod approval");
  assert(reseededPodSnap.data()?.approvedBy === access.userId, "Default seeding rewrote founder market-pod ownership");
  const refreshedApprovedPod = await recommendSignalDeskMarketPodPlanServer(access, { marketPodId: firstPodSnap.id });
  assert(refreshedApprovedPod.status === "active" && refreshedApprovedPod.approvedBy === access.userId, "System recommendation rewrote founder market-pod approval");
  assert(refreshedApprovedPod.monthlyBudgetUsd === 0, "System recommendation attached unapproved market-pod spend");
  await upsertSignalDeskSenderDomainServer(access, {
    authenticationState: "ready",
    bounceRate: 0,
    brandRisk: "low",
    complaintRate: 0,
    domain: "menulist.test",
    provider: "owned-email",
    status: "active",
    unsubscribeReady: true,
    volumeRampState: "warm",
  });
}

async function createPolicy(label, overrides = {}) {
  return createSignalDeskSourcePolicyServer(access, {
    accessMethod: overrides.accessMethod || (overrides.allowContact === false ? "open-data" : "permissioned-referral"),
    allowContact: overrides.allowContact ?? true,
    allowEvidence: overrides.allowEvidence ?? true,
    allowPersonalization: overrides.allowPersonalization ?? true,
    allowedFields: overrides.allowedFields || ["displayName", "category", "city", "country", "currentListUrl", "website", "notes", "providerRecordId", "providerRecordUrl", ...(overrides.allowContact === false ? [] : ["email", "phone", "instagram"])],
    attributionRequirements: ["Keep source references attached."],
    blockedFields: overrides.blockedFields || (overrides.allowContact === false ? ["email", "phone", "instagram"] : ["personal-profile"]),
    expiresAt: overrides.expiresAt ?? futureIso(30),
    name: `${label} source policy`,
    notes: "Local deterministic SignalDesk E2E fixture.",
    policyOwner: access.userId,
    prohibitedUses: ["unapproved send", "cold WhatsApp", "proof use without permission"],
    provider: overrides.provider,
    retentionDays: overrides.retentionDays ?? 30,
    rawPayloadPolicy: "never-store",
    refreshMethod: overrides.sourceType === "provider" ? "provider-refresh" : "manual-review",
    sourceType: overrides.sourceType || "manual-research",
    termsVersion: "local-e2e-v1",
  });
}

async function expirePolicy(sourcePolicyId) {
  await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(sourcePolicyId).set({
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(pastIso())),
    updatedAt: timestampNow(),
  }, { merge: true });
}

function rowFor(suffix, overrides = {}) {
  const phoneSuffix = String(parseInt(hashValue(suffix).slice(0, 8), 16) % 1000000).padStart(6, "0");
  return {
    category: "restaurant",
    city: "Mumbai",
    country: "India",
    currentListUrl: overrides.currentListUrl ?? "https://example.invalid/menu",
    displayName: `SignalDesk ${suffix} Cafe`,
    email: `owner+${suffix.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@example.invalid`,
    notes: "Local E2E target.",
    phone: `+1000000${phoneSuffix}`,
    website: "https://example.invalid",
    ...overrides,
  };
}

async function importOne(sourcePolicyId, suffix, overrides = {}) {
  const result = await importSignalDeskTargetsServer(access, {
    rows: [rowFor(suffix, overrides)],
    sourceName: `local e2e ${suffix}`,
    sourcePolicyId,
  });
  assert(result.run.status === "completed", `${suffix}: import did not complete`);
  assert(result.targets.length === 1, `${suffix}: import did not create one target`);
  return result.targets[0].targetId;
}

async function prepareApprovedTarget(sourcePolicyId, suffix) {
  const targetId = await importOne(sourcePolicyId, suffix);
  const score = await scoreSignalDeskTargetServer(access, targetId);
  assert(score.scoreId, `${suffix}: score was not created`);
  const evidence = await createSignalDeskEvidenceServer(access, targetId);
  assert(evidence.evidencePacketId, `${suffix}: evidence packet was not created`);
  const draftResult = await createSignalDeskDraftServer(access, { targetId });
  assert(draftResult.draft.draftId, `${suffix}: draft was not created`);
  assert(!draftResult.draft.unsupportedClaims?.length, `${suffix}: draft unexpectedly has unsupported claims`);
  assert(draftResult.approvalPacket?.approvalPacketId, `${suffix}: approval packet was not created`);
  const approval = await reviewSignalDeskApprovalServer(access, {
    approvalId: draftResult.approval.approvalId,
    reason: "Local E2E approval after evidence review.",
    status: "approved",
  });
  assert(approval.status === "approved", `${suffix}: approval did not approve`);
  return { approvalId: draftResult.approval.approvalId, draftId: draftResult.draft.draftId, targetId };
}

async function assertImportDedupe() {
  const policy = await createPolicy("Import dedupe");
  const duplicateRow = rowFor("DuplicateWithinImport", { currentListUrl: "" });
  const result = await importSignalDeskTargetsServer(access, {
    rows: [duplicateRow, { ...duplicateRow }],
    sourceName: "local duplicate import",
    sourcePolicyId: policy.sourcePolicyId,
  });
  assert(result.targets.length === 1, "Duplicate rows in one import returned duplicate targets");
  assert(result.run.duplicateCount === 1, "Duplicate rows in one import were not counted");
  const candidateCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.SOURCE_CANDIDATES, (data) => data.sourceRunId === result.run.sourceRunId);
  assert(candidateCount === 1, "Duplicate rows in one import created duplicate source candidates");
}

async function assertHappyPath() {
  const sourcePolicy = await createPolicy("Happy path");
  const targetId = await importOne(sourcePolicy.sourcePolicyId, "Happy");
  const targetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).get();
  assert(targetSnap.exists, "Target summary was not created");
  const target = targetSnap.data();
  assert(target.sourcePolicyId === sourcePolicy.sourcePolicyId, "Source provenance was not attached to target");
  assert(target.sourceRunId, "Source run provenance was not attached to target");
  assert(target.contactability === "ready", "Contactability state was not created");

  const identityCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.IDENTITY_INDEX, (data) => data.targetId === targetId);
  assert(identityCount === 1, "Dedupe identity index was not created");

  const score = await scoreSignalDeskTargetServer(access, targetId);
  assert(score.fitScore >= 0, "Score output was not created");

  const decisionSnapshotCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.DECISION_SNAPSHOTS, (data) => data.targetId === targetId);
  assert(decisionSnapshotCount > 0, "Decision snapshot was not created");

  const evidence = await createSignalDeskEvidenceServer(access, targetId);
  const evidenceDetailSnap = await db.collection(SIGNALDESK_COLLECTIONS.EVIDENCE_PACKETS).doc(evidence.evidencePacketId).get();
  assert(evidenceDetailSnap.exists, "Evidence detail packet was not created");
  assert(evidence.allowedUse.includes("draft-personalization"), "Evidence did not preserve personalization allowed use");

  const draftResult = await createSignalDeskDraftServer(access, { targetId });
  assert(draftResult.draft.unsupportedClaims.length === 0, "Safe draft contains unsupported claims");
  assert(draftResult.approval.status === "pending", "Approval packet was not pending");
  assert(draftResult.approvalPacket.approvalPacketId, "Approval packet summary was not created");

  const approval = await reviewSignalDeskApprovalServer(access, {
    approvalId: draftResult.approval.approvalId,
    reason: "E2E human approval.",
    status: "approved",
  });
  assert(approval.status === "approved", "Human approval failed");

  const exportResult = await exportSignalDeskMessageServer(access, draftResult.approval.approvalId);
  assert(exportResult.status === "exported", "Export-only handoff was not created");
  assert(!exportResult.providerMessageId, "Export path created a provider-send message id");

  const exportSnap = await db.collection(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS).where("approvalId", "==", draftResult.approval.approvalId).limit(1).get();
  assert(!exportSnap.empty, "Message export record was not created");
  assert(exportSnap.docs[0].data().status === "exported", "Message export record was not export-only");

  const preparedTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).get();
  assert(preparedTargetSnap.data()?.status !== "contacted", "Export preparation incorrectly marked the target contacted");
  assert(preparedTargetSnap.data()?.nextAction === "contact", "Export preparation did not request manual contact confirmation");
  const contactInput = {
    idempotencyKey: "manual-contact-happy-e2e",
    occurredAt: new Date().toISOString(),
    result: "contacted",
    route: "email-export",
    sourcePolicyId: sourcePolicy.sourcePolicyId,
    targetId,
  };
  const contact = await recordSignalDeskManualContactServer(access, contactInput);
  const duplicateContact = await recordSignalDeskManualContactServer(access, contactInput);
  assert(contact.duplicate === false, "Manual contact was not recorded");
  assert(duplicateContact.duplicate === true, "Manual contact idempotency did not dedupe a retry");
  await expectRejects("Manual contact idempotency key cannot bind changed facts", () => recordSignalDeskManualContactServer(access, {
    ...contactInput,
    result: "no-answer",
  }), "Manual contact idempotency conflict");
  const contactedTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).get();
  assert(contactedTargetSnap.data()?.status === "contacted", "Manual confirmation did not mark the target contacted");
  assert(contactedTargetSnap.data()?.latestManualContactResult === "contacted", "Manual contact result projection is missing");
  assert(contactedTargetSnap.data()?.latestManualContactRoute === "email-export", "Manual contact route projection is missing");
  const manualContactAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.action === "manual_contact_record" && data.entityId === targetId);
  assert(manualContactAuditCount === 1, "Manual contact retry created duplicate audit events");
  await expectRejects("Consumed email export cannot record another contact", () => recordSignalDeskManualContactServer(access, {
    ...contactInput,
    idempotencyKey: "manual-contact-happy-second-attempt",
  }), "Prepared email export is required");

  const reply = await captureSignalDeskReplyServer(access, {
    channel: "email",
    message: "Yes, send details.",
    targetId,
  });
  assert(reply.state === "interested", `Reply was not classified as interested: ${reply.state}`);
  assert(reply.revenueSyncStatus === "updated", "Interested reply did not update the revenue lifecycle automatically");

  const replyRevenueAccountSnap = await db.collection(SIGNALDESK_COLLECTIONS.REVENUE_ACCOUNTS).doc(`revenue_account_${hashValue(targetId).slice(0, 22)}`).get();
  assert(replyRevenueAccountSnap.exists, "Interested reply did not create a revenue account");

  const classificationCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.REPLY_CLASSIFICATIONS, (data) => data.targetId === targetId && data.state === "interested");
  assert(classificationCount > 0, "Reply classification was not recorded");

  const outcome = await recordSignalDeskOutcomeServer(access, {
    ...activationFixture(targetId, "happy"),
    channel: "email",
    outcomeType: "two_surface_activation",
    source: "manual",
    targetId,
  });
  assert(outcome.outcomeEventId, "Outcome event was not created");
  assert(outcome.activationWatchSyncStatus === "updated", "Outcome did not update the activation watch automatically");
  assert(outcome.activationWatch?.status === "activated", "Two-surface outcome did not close activation automatically");

  const demand = await captureSignalDeskDemandSignalServer(access, {
    signalType: "claim_attempt",
    sourceSurface: "manual",
    targetId,
    targetName: "SignalDesk Happy Cafe",
  });
  assert(demand.demandSignalId, "Demand signal was not created");

  const outcomeSummarySnap = await db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES).where("targetId", "==", targetId).limit(1).get();
  assert(!outcomeSummarySnap.empty, "Outcome summary did not update");

  const controlRoomSnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM).get();
  assert(controlRoomSnap.exists, "Control-room summary was not created");
  assert(Number(controlRoomSnap.data()?.outcomeCount || 0) >= 1, "Control-room outcome summary did not update");

  const workspace = await loadSignalDeskWorkspaceServer(access, "dashboard");
  assert(workspace.workspace.targets.some((item) => item.targetId === targetId), "Workspace did not include E2E target");

  return { approvalId: draftResult.approval.approvalId, sourcePolicyId: sourcePolicy.sourcePolicyId, targetId };
}

async function assertRevenueOperatingLayer() {
  const sourcePolicy = await createPolicy("Revenue operating layer");
  const targetId = await importOne(sourcePolicy.sourcePolicyId, "RevenueOperatingLayer", { currentListUrl: "" });
  const score = await scoreSignalDeskTargetServer(access, targetId);
  assert(score.fitScore >= 70, "Revenue fixture did not meet deterministic qualification threshold");

  const [qualification, duplicateQualification] = await Promise.all([
    qualifySignalDeskRevenueAccountServer(access, {
      locationType: "single-location",
      organizationName: "SignalDesk Revenue Group",
      targetId,
    }),
    qualifySignalDeskRevenueAccountServer(access, {
      locationType: "single-location",
      organizationName: "SignalDesk Revenue Group",
      targetId,
    }),
  ]);
  assert(qualification.qualified === true, "Eligible revenue target was not qualified");
  assert(qualification.account.lifecycleStage === "opportunity", "Qualified account did not enter opportunity lifecycle");
  assert(qualification.account.complianceState === "eligible", "Qualified account did not preserve eligible compliance state");
  assert(qualification.opportunity?.status === "open", "Qualified account did not create an open opportunity");

  assert(duplicateQualification.account.revenueAccountId === qualification.account.revenueAccountId, "Revenue qualification was not idempotent by target");
  assert(duplicateQualification.opportunity?.opportunityId === qualification.opportunity?.opportunityId, "Revenue qualification created a duplicate opportunity");

  const offer = await upsertSignalDeskCommercialOfferServer(access, {
    allowedDiscountBps: 0,
    billingCadence: "monthly",
    contents: ["Current official menu link", "Owner review before publishing", "QR and share support"],
    currency: "INR",
    eligibilitySummary: "Standard single-location MenuList path with no custom terms.",
    founderApprovalConditions: ["Any discount", "Custom terms", "Multi-location commercial request"],
    name: "MenuList standard package",
    priceMinor: 49900,
    status: "active",
    version: 1,
  });
  assert(offer.status === "active", "Commercial offer version was not activated");
  assert(offer.allowedDiscountBps === 0, "Commercial offer changed approved discount authority");
  await expectRejects("Immutable commercial offer version", () => upsertSignalDeskCommercialOfferServer(access, {
    allowedDiscountBps: 0,
    billingCadence: "monthly",
    contents: ["Current official menu link", "Owner review before publishing", "QR and share support"],
    currency: "INR",
    eligibilitySummary: "Standard single-location MenuList path with no custom terms.",
    founderApprovalConditions: ["Any discount", "Custom terms", "Multi-location commercial request"],
    name: "MenuList standard package",
    priceMinor: 59900,
    status: "active",
    version: 1,
  }), "Commercial offer version already exists with different terms");
  await expectRejects("Commercial offer deterministic ID", () => upsertSignalDeskCommercialOfferServer(access, {
    allowedDiscountBps: 0,
    billingCadence: "monthly",
    commercialOfferId: "commercial_offer_custom_bypass",
    contents: ["Current official menu link"],
    currency: "INR",
    eligibilitySummary: "ID boundary fixture.",
    founderApprovalConditions: ["Any discount"],
    name: "MenuList ID boundary package",
    priceMinor: 49900,
    status: "active",
    version: 1,
  }), "Commercial offer ID does not match name and version");

  const opportunity = await upsertSignalDeskCommercialOpportunityServer(access, {
    commercialOfferId: offer.commercialOfferId,
    founderAttentionMinutes: 12,
    nextAction: "Send the approved standard conversion route.",
    nextActionDueAt: pastIso(),
    opportunityId: qualification.opportunity.opportunityId,
    probabilityPercent: 50,
    stage: "offer",
    status: "open",
    valueMinor: 49900,
  });
  assert(opportunity.commercialOfferId === offer.commercialOfferId, "Opportunity did not link the approved offer");
  assert(opportunity.valueMinor === 49900 && opportunity.probabilityPercent === 50, "Opportunity value or probability did not update");
  assert(opportunity.currency === "INR", "Opportunity did not derive currency from its commercial offer");
  const usdOffer = await upsertSignalDeskCommercialOfferServer(access, {
    allowedDiscountBps: 0,
    billingCadence: "monthly",
    contents: ["Current official menu link"],
    currency: "USD",
    eligibilitySummary: "Currency boundary fixture.",
    founderApprovalConditions: ["Any discount"],
    name: "MenuList USD package",
    priceMinor: 999,
    status: "active",
    version: 1,
  });
  await expectRejects("Mixed-currency pipeline", () => upsertSignalDeskCommercialOpportunityServer(access, {
    commercialOfferId: usdOffer.commercialOfferId,
    founderAttentionMinutes: 12,
    nextAction: "This currency change must not persist.",
    opportunityId: qualification.opportunity.opportunityId,
    probabilityPercent: 50,
    stage: "offer",
    status: "open",
    valueMinor: 999,
  }), "Commercial opportunity currency does not match revenue pipeline");
  await expectRejects("Mismatched opportunity state", () => upsertSignalDeskCommercialOpportunityServer(access, {
    commercialOfferId: offer.commercialOfferId,
    founderAttentionMinutes: 12,
    nextAction: "This state must not persist.",
    opportunityId: qualification.opportunity.opportunityId,
    probabilityPercent: 0,
    stage: "lost",
    status: "open",
    valueMinor: 49900,
  }), "Commercial opportunity stage and status do not match");

  const envelopeBase = {
    channel: "manual",
    commercialOfferId: offer.commercialOfferId,
    dailyVolumeCap: 10,
    expiresAt: futureIso(14),
    fallbackAction: "founder-review",
    maxCostUsd: 50,
    sourcePolicyIds: [sourcePolicy.sourcePolicyId],
    startsAt: new Date().toISOString(),
    stopConditions: ["Source policy changes", "Suppression risk rises", "Budget cap is reached"],
    templateIds: ["template_current_list_intro_v1"],
    totalVolumeCap: 50,
  };
  await expectRejects("Envelope without market pod", () => upsertSignalDeskOperatingEnvelopeServer(access, {
    ...envelopeBase,
    name: "Revenue E2E missing market pod",
    requestedApprovalMode: "approve-batch",
    status: "approved",
    version: 1,
  }), "Market pod is required for operating envelope");
  const unreviewedMarketPodId = "market_pod_unreviewed_active";
  await db.collection(SIGNALDESK_COLLECTIONS.MARKET_PODS).doc(unreviewedMarketPodId).set({
    marketPodId: unreviewedMarketPodId,
    name: "Unreviewed active pod",
    status: "active",
    updatedAt: timestampNow(),
  });
  await expectRejects("Envelope with system-active unreviewed pod", () => upsertSignalDeskOperatingEnvelopeServer(access, {
    ...envelopeBase,
    marketPodId: unreviewedMarketPodId,
    name: "Revenue E2E unreviewed pod envelope",
    requestedApprovalMode: "approve-batch",
    status: "approved",
    version: 1,
  }), "Market pod is not founder-approved");
  const marketPodId = "market_pod_first_local_v1";
  const envelopeInput = {
    ...envelopeBase,
    marketPodId,
  };
  await expectRejects("Non-founder operating envelope approval", () => upsertSignalDeskOperatingEnvelopeServer({
    ...access,
    role: "compliance-reviewer",
  }, {
    ...envelopeInput,
    name: "Revenue E2E non-founder approval envelope",
    requestedApprovalMode: "approve-batch",
    status: "approved",
    version: 1,
  }), "Founder approval is required for operating envelopes");
  const approvedEnvelope = await upsertSignalDeskOperatingEnvelopeServer(access, {
    ...envelopeInput,
    name: "Revenue E2E approval envelope",
    requestedApprovalMode: "approve-batch",
    status: "approved",
    version: 1,
  });
  assert(approvedEnvelope.executionState === "approval-only", "Approved envelope escaped approval-only execution");
  assert(approvedEnvelope.approvalMode === "approve-batch", "Approved envelope changed the requested batch mode");
  await expectRejects("Immutable operating envelope version", () => upsertSignalDeskOperatingEnvelopeServer(access, {
    ...envelopeInput,
    maxCostUsd: 40,
    name: "Revenue E2E approval envelope",
    requestedApprovalMode: "approve-batch",
    status: "approved",
    version: 1,
  }), "Operating envelope version already exists with different terms");
  const pausedEnvelope = await upsertSignalDeskOperatingEnvelopeServer(access, {
    ...envelopeInput,
    name: "Revenue E2E approval envelope",
    requestedApprovalMode: "approve-batch",
    status: "paused",
    version: 1,
  });
  assert(pausedEnvelope.executionState === "paused", "Paused envelope kept an executable state");
  assert(pausedEnvelope.approvedBy === access.userId && pausedEnvelope.approvedAt, "Paused envelope lost its founder approval history");
  await expectRejects("Operating envelope deterministic ID", () => upsertSignalDeskOperatingEnvelopeServer(access, {
    ...envelopeInput,
    name: "Revenue E2E envelope ID boundary",
    operatingEnvelopeId: "operating_envelope_custom_bypass",
    requestedApprovalMode: "approve-batch",
    status: "approved",
    version: 1,
  }), "Operating envelope ID does not match name and version");
  await expectRejects("Envelope total below daily cap", () => upsertSignalDeskOperatingEnvelopeServer(access, {
    ...envelopeInput,
    dailyVolumeCap: 20,
    name: "Revenue E2E invalid caps",
    requestedApprovalMode: "approve-batch",
    status: "approved",
    totalVolumeCap: 10,
    version: 1,
  }), "Operating envelope total volume must cover the daily cap");
  await expectRejects("Email envelope without explicit sender", () => upsertSignalDeskOperatingEnvelopeServer(access, {
    ...envelopeInput,
    channel: "email",
    name: "Revenue E2E missing sender",
    requestedApprovalMode: "approve-batch",
    status: "approved",
    version: 1,
  }), "Sender domain is required for email envelope");
  await expectRejects("Revenue envelope with provider budget", () => upsertSignalDeskOperatingEnvelopeServer(access, {
    ...envelopeInput,
    budgetPolicyId: "budget_provider_manual_default",
    name: "Revenue E2E incompatible budget",
    requestedApprovalMode: "approve-batch",
    status: "approved",
    version: 1,
  }), "Budget policy is not eligible for revenue envelope");
  const draftEnvelope = await upsertSignalDeskOperatingEnvelopeServer(access, {
    ...envelopeInput,
    name: "Revenue E2E draft envelope",
    requestedApprovalMode: "approve-batch",
    status: "draft",
    version: 1,
  });
  assert(draftEnvelope.executionState === "held", "Draft envelope became approval-only executable state");
  const expiredEnvelopePolicy = await createPolicy("Revenue expired envelope");
  await expirePolicy(expiredEnvelopePolicy.sourcePolicyId);
  await expectRejects("Envelope with expired source policy", () => upsertSignalDeskOperatingEnvelopeServer(access, {
    ...envelopeInput,
    name: "Revenue E2E expired policy envelope",
    requestedApprovalMode: "approve-batch",
    sourcePolicyIds: [expiredEnvelopePolicy.sourcePolicyId],
    status: "approved",
    version: 1,
  }), "SOURCE_POLICY_EXPIRED");

  const heldEnvelope = await upsertSignalDeskOperatingEnvelopeServer(access, {
    ...envelopeInput,
    name: "Revenue E2E exception envelope",
    requestedApprovalMode: "exception-only",
    status: "approved",
    version: 1,
  });
  assert(heldEnvelope.status === "held", "Exception-only envelope was not held");
  assert(heldEnvelope.executionState === "held", "Exception-only envelope became executable");
  assert(heldEnvelope.approvalMode === "prepare-and-approve-each", "Exception-only envelope did not fall back to per-item approval");

  const routedOutcome = await recordSignalDeskOutcomeServer(access, {
    channel: "manual",
    outcomeType: "route_created",
    source: "manual",
    targetId,
  });
  assert(routedOutcome.activationWatchSyncStatus === "updated", "Route outcome did not update activation automatically");
  const routedWatch = routedOutcome.activationWatch;
  assert(routedWatch.status === "routed", "Activation watch did not derive routed state from outcomes");

  await db.collection(SIGNALDESK_COLLECTIONS.ACTIVATION_WATCHES).doc(routedWatch.activationWatchId).set({
    deadlineAt: admin.firestore.Timestamp.fromDate(new Date(pastIso())),
    status: "routed",
    updatedAt: timestampNow(),
  }, { merge: true });
  const staleWorkspace = await loadSignalDeskWorkspaceServer(access, "revenue");
  assert(staleWorkspace.workspace.activationWatches.some((watch) => watch.targetId === targetId && watch.status === "stalled"), "Expired activation deadline was not surfaced as stalled on read");
  const founderBrief = await createSignalDeskDailyGrowthMissionServer(access);
  assert(founderBrief.summary.includes("open opportunities"), "Daily founder brief omitted revenue movement");
  assert(founderBrief.summary.includes("founder minutes"), "Daily founder brief omitted founder attention");
  assert(founderBrief.summary.includes("estimated spend today"), "Daily founder brief omitted spend");
  assert(founderBrief.missionActions.some((action) => action.label.includes("stalled activation")), "Daily founder brief omitted stalled activation recovery");
  assert(founderBrief.missionActions.some((action) => action.label.includes("overdue revenue next action")), "Daily founder brief omitted overdue opportunity work");

  const inProgressOutcome = await recordSignalDeskOutcomeServer(access, {
    channel: "manual",
    outcomeType: "upload_started",
    source: "manual",
    targetId,
  });
  assert(inProgressOutcome.activationWatchSyncStatus === "updated", "Upload outcome did not update activation automatically");
  const inProgressWatch = inProgressOutcome.activationWatch;
  assert(inProgressWatch.status === "in-progress", "Activation watch did not derive in-progress state from upload outcome");

  const activatedOutcome = await recordSignalDeskOutcomeServer(access, {
    ...activationFixture(targetId, "revenue"),
    channel: "manual",
    outcomeType: "two_surface_activation",
    source: "manual",
    targetId,
  });
  assert(activatedOutcome.activationWatchSyncStatus === "updated", "Activation outcome did not update the watch automatically");
  const activatedWatch = activatedOutcome.activationWatch;
  assert(activatedWatch.status === "activated", "Activation watch did not derive two-surface activation");
  assert(activatedWatch.source === "signaldesk-outcome-summaries", "Activation watch did not preserve its read-only source boundary");
  const longHistoryBatch = db.batch();
  for (let index = 0; index < 31; index += 1) {
    const summaryRef = db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES).doc(`outcome_history_${index}_${targetId}`);
    longHistoryBatch.set(summaryRef, {
      channel: "manual",
      count: 1,
      day: `2099-01-${String((index % 28) + 1).padStart(2, "0")}`,
      outcomeSummaryId: summaryRef.id,
      outcomeType: "route_created",
      pId: "SD",
      source: "manual",
      targetId,
      updatedAt: admin.firestore.Timestamp.fromMillis(Date.now() + ((index + 1) * 60_000)),
    });
  }
  await longHistoryBatch.commit();
  const longHistoryWatch = await refreshSignalDeskActivationWatchServer(access, { targetId });
  assert(longHistoryWatch.status === "activated", "Bounded latest-outcome window lost an older terminal activation");
  assert(longHistoryWatch.outcomeTypes.includes("two_surface_activation"), "Terminal activation evidence disappeared from a long outcome history");
  const wonOpportunitySnap = await db.collection(SIGNALDESK_COLLECTIONS.COMMERCIAL_OPPORTUNITIES).doc(qualification.opportunity.opportunityId).get();
  assert(wonOpportunitySnap.data()?.status === "won" && wonOpportunitySnap.data()?.stage === "won", "Two-surface activation did not close the commercial opportunity");

  const suppressedTargetId = await importOne(sourcePolicy.sourcePolicyId, "RevenueSuppressed", { currentListUrl: "" });
  await scoreSignalDeskTargetServer(access, suppressedTargetId);
  await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(suppressedTargetId).set({
    suppressionStatus: "suppressed",
    updatedAt: timestampNow(),
  }, { merge: true });
  const suppressedQualification = await qualifySignalDeskRevenueAccountServer(access, {
    locationType: "single-location",
    targetId: suppressedTargetId,
  });
  assert(suppressedQualification.qualified === false, "Suppressed account was commercially qualified");
  assert(suppressedQualification.account.complianceState === "suppressed", "Suppressed account lost its compliance state");
  assert(suppressedQualification.opportunity === null, "Suppressed account created an opportunity");

  const publishedTargetId = await importOne(sourcePolicy.sourcePolicyId, "RevenuePublishedOnly", { currentListUrl: "" });
  await scoreSignalDeskTargetServer(access, publishedTargetId);
  await recordSignalDeskOutcomeServer(access, {
    channel: "manual",
    outcomeType: "published",
    source: "manual",
    targetId: publishedTargetId,
  });
  const publishedQualification = await qualifySignalDeskRevenueAccountServer(access, {
    locationType: "single-location",
    targetId: publishedTargetId,
  });
  assert(publishedQualification.account.lifecycleStage === "opportunity", "Published-only target was incorrectly treated as an activated customer");
  assert(publishedQualification.opportunity?.status === "open", "Published-only target was incorrectly closed as won");
  assert(publishedQualification.activationWatch?.status === "published", "Published-only target did not reconcile its activation watch");

  const convertedTargetId = await importOne(sourcePolicy.sourcePolicyId, "RevenueAlreadyConverted", { currentListUrl: "" });
  await scoreSignalDeskTargetServer(access, convertedTargetId);
  await recordSignalDeskOutcomeServer(access, {
    ...activationFixture(convertedTargetId, "converted-before-qualification"),
    channel: "manual",
    outcomeType: "two_surface_activation",
    source: "manual",
    targetId: convertedTargetId,
  });
  const convertedQualification = await qualifySignalDeskRevenueAccountServer(access, {
    locationType: "single-location",
    targetId: convertedTargetId,
  });
  assert(convertedQualification.account.lifecycleStage === "customer", "Converted target was reopened as an opportunity-stage account");
  assert(convertedQualification.opportunity?.status === "won", "Converted target created an open opportunity");
  assert(convertedQualification.activationWatch?.status === "activated", "Qualification did not reconcile a prior activation outcome");

  await db.collection(SIGNALDESK_COLLECTIONS.OPERATING_ENVELOPES).doc(approvedEnvelope.operatingEnvelopeId).set({
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(pastIso())),
    updatedAt: timestampNow(),
  }, { merge: true });

  const workspace = await loadSignalDeskWorkspaceServer(access, "revenue");
  assert(workspace.workspace.revenueAccounts.some((account) => account.revenueAccountId === qualification.account.revenueAccountId), "Revenue workspace did not load qualified account");
  assert(workspace.workspace.commercialOffers.some((item) => item.commercialOfferId === offer.commercialOfferId), "Revenue workspace did not load commercial offer");
  assert(workspace.workspace.operatingEnvelopes.some((item) => item.operatingEnvelopeId === heldEnvelope.operatingEnvelopeId), "Revenue workspace did not load held operating envelope");
  assert(workspace.workspace.operatingEnvelopes.some((item) => item.operatingEnvelopeId === approvedEnvelope.operatingEnvelopeId && item.status === "expired" && item.executionState === "held"), "Revenue workspace did not hold expired operating envelope");
  assert(workspace.workspace.activationWatches.some((watch) => watch.status === "activated" && watch.targetId === targetId), "Revenue workspace did not load activation watch");
  const summary = workspace.workspace.revenueControlSummaries[0];
  assert(summary.revenueAccountCount === 5, "Revenue summary did not count reply-created, published-only, and qualified revenue accounts exactly");
  assert(summary.openOpportunityCount === 1, "Published-only opportunity was not preserved as open");
  assert(summary.pipelineCurrency === "INR", "Revenue summary did not preserve pipeline currency");
  assert(summary.pipelineValueMinor === 0, "Activated opportunity remained in pipeline value");
  assert(summary.weightedPipelineValueMinor === 0, "Activated opportunity remained in weighted pipeline value");
  assert(summary.activatedAccountCount === 3, "Revenue summary did not count automatically activated and reconciled accounts exactly");
  assert(summary.wonOpportunityCount === 3, "Revenue summary did not count reply activation, qualified activation, and pre-converted wins exactly");
  assert(summary.founderAttentionMinutes >= 12, "Revenue summary did not record founder attention");
}

async function assertTeamAccessManagement() {
  const partnerEmail = "signaldesk-partner@example.invalid";
  const partnerSession = {
    uId: "partner-auth-session",
    user: {
      email: partnerEmail,
      name: "SignalDesk Partner",
    },
  };
  const member = await upsertSignalDeskTeamMemberServer(access, {
    active: true,
    email: partnerEmail,
    name: "SignalDesk Partner",
    role: "growth-manager",
  });
  assert(member.teamMemberId, "Team member was not created");
  assert(member.active === true, "Team member was not active");

  const memberSnap = await db.collection(SIGNALDESK_COLLECTIONS.TEAM_MEMBERS).doc(member.teamMemberId).get();
  assert(memberSnap.exists, "Team member document was not stored");

  const partnerAccess = await getSignalDeskAccessContext(partnerSession);
  assert(partnerAccess?.active === true, "Partner access did not resolve by login email");
  assert(partnerAccess.role === "growth-manager", "Partner role did not resolve from team member record");

  const updated = await upsertSignalDeskTeamMemberServer(access, {
    active: true,
    email: partnerEmail,
    name: "SignalDesk Partner",
    role: "operator",
    teamMemberId: member.teamMemberId,
  });
  assert(updated.role === "operator", "Team member role update failed");

  const operatorAccess = await getSignalDeskAccessContext(partnerSession);
  assert(operatorAccess?.role === "operator", "Updated partner role did not resolve");

  await upsertSignalDeskTeamMemberServer(access, {
    active: false,
    email: partnerEmail,
    name: "SignalDesk Partner",
    role: "operator",
    teamMemberId: member.teamMemberId,
  });
  const blockedAccess = await getSignalDeskAccessContext(partnerSession);
  assert(blockedAccess === null, "Inactive team member still resolved access");

  await expectRejects("Self-deactivation", () => upsertSignalDeskTeamMemberServer(access, {
    active: false,
    email: access.email,
    name: access.name,
    role: access.role,
    teamMemberId: access.userId,
    userId: access.userId,
  }), "SignalDesk team member cannot deactivate own access");

  const auditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.entityType === "teamMember" &&
    (data.action === "team_member_upsert" || data.action === "team_member_deactivate")
  ));
  assert(auditCount >= 3, "Team member changes did not write audit events");

  const settingsWorkspace = await loadSignalDeskWorkspaceServer(access, "settings");
  assert(settingsWorkspace.workspace.teamMembers.some((item) => item.teamMemberId === member.teamMemberId), "Settings workspace did not include team member");
}

async function assertSourcePolicyNegatives() {
  await expectRejects("Import without source policy", () => importSignalDeskTargetsServer(access, {
    rows: [rowFor("MissingPolicy")],
    sourceName: "missing policy",
    sourcePolicyId: "missing_source_policy",
  }), "SOURCE_POLICY_REVIEW_REQUIRED");

  const expiredPolicy = await createPolicy("Expired import", { expiresAt: pastIso(), retentionDays: 1 });
  await expectRejects("Import with expired source policy", () => importSignalDeskTargetsServer(access, {
    rows: [rowFor("ExpiredImport")],
    sourceName: "expired policy",
    sourcePolicyId: expiredPolicy.sourcePolicyId,
  }), "SOURCE_POLICY_EXPIRED");

  const legacyPolicyId = "legacy_policy_review_required";
  await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(legacyPolicyId).set({
    sourcePolicyId: legacyPolicyId,
    pId: "SD",
    name: "Legacy policy without expiry basis",
    sourceType: "manual-research",
    status: "active",
    allowedUse: { contact: true, evidence: true, import: true, personalization: true, storage: true },
    retentionDays: 30,
    updatedAt: timestampNow(),
  });
  await expectRejects("Legacy policy without expiry basis", () => importSignalDeskTargetsServer(access, {
    rows: [rowFor("LegacyReview")],
    sourceName: "legacy review",
    sourcePolicyId: legacyPolicyId,
  }), "SOURCE_POLICY_REVIEW_REQUIRED");

  const noRetentionPolicyId = "policy_retention_missing";
  await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(noRetentionPolicyId).set({
    sourcePolicyId: noRetentionPolicyId,
    pId: "SD",
    name: "Policy without retention",
    sourceType: "manual-research",
    status: "active",
    allowedUse: { contact: true, evidence: true, import: true, personalization: true, storage: true },
    approvedAt: timestampNow(),
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(futureIso(30))),
    updatedAt: timestampNow(),
  });
  await expectRejects("Policy without retention", () => importSignalDeskTargetsServer(access, {
    rows: [rowFor("NoRetention")],
    sourceName: "no retention",
    sourcePolicyId: noRetentionPolicyId,
  }), "SOURCE_POLICY_RETENTION_MISSING");

  const incompleteRightsPolicyId = "policy_rights_review_required";
  await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(incompleteRightsPolicyId).set({
    sourcePolicyId: incompleteRightsPolicyId,
    pId: "SD",
    name: "Policy without source rights",
    sourceType: "manual-research",
    status: "active",
    allowedUse: { contact: true, evidence: true, import: true, personalization: true, storage: true },
    approvedAt: timestampNow(),
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(futureIso(30))),
    retentionDays: 30,
    updatedAt: timestampNow(),
  });
  await expectRejects("Policy without source-rights registry", () => importSignalDeskTargetsServer(access, {
    rows: [rowFor("MissingRights")],
    sourceName: "missing source rights",
    sourcePolicyId: incompleteRightsPolicyId,
  }), "SOURCE_POLICY_REVIEW_REQUIRED");

  const contactBlockedPolicy = await createPolicy("No contact export", { allowContact: false });
  const heldTargetId = await importOne(contactBlockedPolicy.sourcePolicyId, "NoContact", { email: "blocked@example.invalid" });
  const heldTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(heldTargetId).get();
  assert(heldTargetSnap.data()?.contactability === "blocked", "Contact-disallowed import did not block contactability");

  const compositePolicy = await createPolicy("Composite message rights");
  const compositeTargetId = await importOne(compositePolicy.sourcePolicyId, "CompositeRights", { currentListUrl: "" });
  await scoreSignalDeskTargetServer(access, compositeTargetId);
  await createSignalDeskEvidenceServer(access, compositeTargetId);
  await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(compositePolicy.sourcePolicyId).set({
    allowedUse: { contact: true, evidence: false, import: true, personalization: true, providerRun: false, storage: true },
    updatedAt: timestampNow(),
  }, { merge: true });
  await expectRejects("Draft after evidence rights revoked", () => createSignalDeskDraftServer(access, {
    targetId: compositeTargetId,
  }), "SOURCE_POLICY_USE_NOT_ALLOWED");
  await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(compositePolicy.sourcePolicyId).set({
    allowedUse: { contact: true, evidence: true, import: true, personalization: true, providerRun: false, storage: true },
    updatedAt: timestampNow(),
  }, { merge: true });
  const compositeDraft = await createSignalDeskDraftServer(access, { targetId: compositeTargetId });
  await reviewSignalDeskApprovalServer(access, {
    approvalId: compositeDraft.approval.approvalId,
    reason: "Composite rights fixture approval.",
    status: "approved",
  });
  await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(compositePolicy.sourcePolicyId).set({
    allowedUse: { contact: true, evidence: true, import: true, personalization: false, providerRun: false, storage: true },
    updatedAt: timestampNow(),
  }, { merge: true });
  await expectRejects("Export after personalization rights revoked", () => exportSignalDeskMessageServer(access, compositeDraft.approval.approvalId), "SOURCE_POLICY_USE_NOT_ALLOWED");
}

async function assertFhrsFhisSourceProvider() {
  const policy = await createPolicy("FHRS FHIS provider", {
    allowContact: false,
    provider: "fhrs-fhis",
    sourceType: "provider",
  });
  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    const requestUrl = new URL(String(url));
    assert(requestUrl.origin === "https://api.ratings.food.gov.uk", "FHRS/FHIS provider used unexpected host");
    assert(requestUrl.pathname === "/Establishments", "FHRS/FHIS provider used unexpected endpoint");
    assert(requestUrl.searchParams.get("businessTypeId") === "1", "FHRS/FHIS provider did not map restaurant query to business type");
    assert(requestUrl.searchParams.get("address") === "Leeds UK", "FHRS/FHIS provider did not pass location as address filter");
    assert(options.headers?.["x-api-version"] === "2", "FHRS/FHIS provider did not request API v2");
    return new Response(JSON.stringify({
        establishments: [{
          AddressLine1: "1 Test Street",
          AddressLine2: "",
          AddressLine3: "Leeds",
          AddressLine4: "",
          BusinessName: "FHRS Test Cafe",
          BusinessType: "Restaurant/Cafe/Canteen",
          BusinessTypeID: 1,
          FHRSID: 1234567,
          LocalAuthorityName: "Leeds",
          NewRatingPending: false,
          Phone: "01130000000",
          PostCode: "LS1 1AA",
          RatingDate: "2026-01-10T00:00:00",
          RatingValue: "5",
          SchemeType: "FHRS",
          geocode: { latitude: 53.8, longitude: -1.54 },
        }],
      }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
  };

  try {
    const result = await runSignalDeskSourceProviderServer(access, {
      city: "Leeds",
      country: "UK",
      maxResults: 1,
      provider: "fhrs-fhis",
      query: "restaurant",
      sourcePolicyId: policy.sourcePolicyId,
    });
    assert(result.targets.length === 1, "FHRS/FHIS provider did not import one target");
    const target = result.targets[0];
    assert(target.displayName === "FHRS Test Cafe", "FHRS/FHIS provider target name was not normalized");
    const targetDetail = await db.collection(SIGNALDESK_COLLECTIONS.TARGETS).doc(target.targetId).get();
    assert(String(targetDetail.data()?.notes || "").includes("No contact permission is inferred"), "FHRS/FHIS provider notes did not preserve contact boundary");
    const retentionCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.PROVIDER_SOURCE_RETENTION, (data) => (
      data.provider === "fhrs-fhis" && data.providerRecordId === "1234567" && data.rawPayloadStored === false
    ));
    assert(retentionCount === 1, "FHRS/FHIS provider retention record was not stored safely");
    const contactIdentityCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES, (data) => (
      data.targetId === target.targetId
    ));
    assert(contactIdentityCount === 0, "FHRS/FHIS provider created contact identities despite contact use being disabled");
  } finally {
    global.fetch = originalFetch;
  }
}

async function assertResearchAgentTable() {
  const policy = await createPolicy("Research agent FHRS", {
    allowContact: false,
    provider: "fhrs-fhis",
    sourceType: "provider",
  });
  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    const requestUrl = new URL(String(url));
    assert(requestUrl.origin === "https://api.ratings.food.gov.uk", "Research agent used unexpected source host");
    assert(requestUrl.pathname === "/Establishments", "Research agent used unexpected source endpoint");
    assert(options.headers?.["x-api-version"] === "2", "Research agent did not preserve FHRS/FHIS API version header");
    return new Response(JSON.stringify({
        establishments: [
          {
            AddressLine1: "2 Research Street",
            AddressLine3: "Leeds",
            BusinessName: "Research Table Cafe",
            BusinessType: "Restaurant/Cafe/Canteen",
            BusinessTypeID: 1,
            FHRSID: 2345678,
            LocalAuthorityName: "Leeds",
            Phone: "01130000001",
            PostCode: "LS2 2AA",
            RatingValue: "5",
            SchemeType: "FHRS",
            geocode: { latitude: 53.81, longitude: -1.55 },
          },
          {
            AddressLine1: "3 Research Street",
            AddressLine3: "Leeds",
            BusinessName: "Research Table Bakery",
            BusinessType: "Retailers - other",
            BusinessTypeID: 7845,
            FHRSID: 2345679,
            LocalAuthorityName: "Leeds",
            Phone: "01130000002",
            PostCode: "LS3 3AA",
            RatingValue: "4",
            SchemeType: "FHRS",
            geocode: { latitude: 53.82, longitude: -1.56 },
          },
        ],
      }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
  };

  try {
    const result = await createSignalDeskResearchAgentRunServer(access, {
      city: "Leeds",
      country: "UK",
      idempotencyKey: "research-agent-e2e-fhrs",
      maxResults: 2,
      prompt: "Find cafes in Leeds with weak menu presence",
      provider: "fhrs-fhis",
      researchType: "market-map",
      sourcePolicyId: policy.sourcePolicyId,
    });
    assert(result.run.status === "completed", "Research agent run did not complete");
    assert(result.run.tableRowCount === 2, "Research agent did not create two table rows");
    assert(result.run.sourceTransparency.some((item) => item.startsWith("provider:fhrs-fhis")), "Research agent did not preserve provider transparency");
    assert(result.rows.some((row) => row.fitDecision === "pass"), "Research agent did not create any pass rows");
    assert(result.rows.every((row) => row.sourceRefs.some((ref) => ref.startsWith("source-policy:"))), "Research rows missed source policy refs");
    assert(result.rows.every((row) => row.enrichment.some((item) => item.key === "source-transparency")), "Research rows missed source transparency enrichment");
    assert(result.rows.every((row) => row.evidenceSummary && row.evidenceSummary.includes("current-list gap")), "Research rows missed evidence summaries");
    assert(result.rows.every((row) => row.allowedRoute === "none"), "Evidence-only research exposed a contact route");
    assert(result.rows.every((row) => row.routePermissionState === "research_only"), "Evidence-only research did not preserve research-only permission state");
    assert(result.rows.every((row) => row.actionabilityState === "research_only"), "Evidence-only research was presented as actionable outreach");
    assert(result.rows.every((row) => row.recommendedCta), "Research rows missed recommended CTAs");
    assert(result.rows.every((row) => row.recommendedMessageAngle), "Research rows missed recommended message angles");
    const rowCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.RESEARCH_TABLE_ROWS, (data) => data.researchRunId === result.run.researchRunId);
    assert(rowCount === 2, "Research table rows were not stored");
    const dashboardWorkspace = await loadSignalDeskWorkspaceServer(access, "dashboard");
    assert(dashboardWorkspace.workspace.researchRuns.some((run) => run.researchRunId === result.run.researchRunId), "Dashboard workspace did not load latest research run");
    assert(dashboardWorkspace.workspace.researchTableRows.some((row) => row.researchRunId === result.run.researchRunId), "Dashboard workspace did not load research table rows for lead batch");
    assert(dashboardWorkspace.workspace.policies.some((workspacePolicy) => workspacePolicy.sourcePolicyId === policy.sourcePolicyId), "Dashboard workspace did not load provider source policy for market search");
    const podSnap = await db.collection(SIGNALDESK_COLLECTIONS.MARKET_PODS).doc(result.run.marketPodId).get();
    assert(podSnap.exists, "Research agent did not create/update market pod map");
    assert(podSnap.data()?.status === "hold", "Research agent granted itself active market-pod status");
    assert(!podSnap.data()?.approvedBy && !podSnap.data()?.reviewedBy, "Research agent fabricated founder market-pod approval");
    assert(podSnap.data()?.recommendation === "activate", "Research agent did not preserve its activation recommendation for founder review");
    const refreshedPod = await recommendSignalDeskMarketPodPlanServer(access, { marketPodId: result.run.marketPodId });
    assert(refreshedPod.status === "hold", "Market-pod recommendation granted itself active status");
    assert(!refreshedPod.approvedBy && !refreshedPod.reviewedBy, "Market-pod recommendation fabricated founder approval");
    const contactIdentityCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES, (data) => (
      result.rows.some((row) => row.targetId === data.targetId)
    ));
    assert(contactIdentityCount === 0, "Research agent created contact identities from source-only data");

    const duplicate = await createSignalDeskResearchAgentRunServer(access, {
      city: "Leeds",
      country: "UK",
      idempotencyKey: "research-agent-e2e-fhrs",
      maxResults: 2,
      prompt: "Find cafes in Leeds with weak menu presence",
      provider: "fhrs-fhis",
      researchType: "market-map",
      sourcePolicyId: policy.sourcePolicyId,
    });
    assert(duplicate.duplicate === true, "Research agent idempotency did not return duplicate");
    const afterDuplicateRows = await expectCollectionCount(SIGNALDESK_COLLECTIONS.RESEARCH_TABLE_ROWS, (data) => data.researchRunId === result.run.researchRunId);
    assert(afterDuplicateRows === rowCount, "Duplicate research run created extra rows");
    await expirePolicy(policy.sourcePolicyId);
    const expiredWorkspace = await loadSignalDeskWorkspaceServer(access, "dashboard");
    const expiredRows = expiredWorkspace.workspace.researchTableRows.filter((row) => row.researchRunId === result.run.researchRunId);
    assert(expiredRows.every((row) => row.allowedRoute === "none" && row.routePermissionState === "expired"), "Persisted research rows were not revalidated after source-policy expiry");
  } finally {
    global.fetch = originalFetch;
  }
}

async function assertExpiryAcrossWorkflow() {
  const providerPolicy = await createPolicy("Expired provider", {
    expiresAt: pastIso(),
    provider: "google-places",
    sourceType: "provider",
  });
  await expectRejects("Provider run with expired policy", () => runSignalDeskSourceProviderServer(access, {
    city: "Mumbai",
    country: "India",
    maxResults: 2,
    provider: "google-places",
    query: "restaurants in Mumbai",
    sourcePolicyId: providerPolicy.sourcePolicyId,
  }), "SOURCE_POLICY_EXPIRED");

  const evidencePolicy = await createPolicy("Expired evidence");
  const evidenceTargetId = await importOne(evidencePolicy.sourcePolicyId, "ExpiredEvidence");
  await expirePolicy(evidencePolicy.sourcePolicyId);
  await expectRejects("Evidence from expired policy", () => createSignalDeskEvidenceServer(access, evidenceTargetId), "SOURCE_POLICY_EXPIRED");

  const draftPolicy = await createPolicy("Expired draft");
  const draftTargetId = await importOne(draftPolicy.sourcePolicyId, "ExpiredDraft");
  await scoreSignalDeskTargetServer(access, draftTargetId);
  await createSignalDeskEvidenceServer(access, draftTargetId);
  await expirePolicy(draftPolicy.sourcePolicyId);
  await expectRejects("Draft from expired policy", () => createSignalDeskDraftServer(access, { targetId: draftTargetId }), "SOURCE_POLICY_EXPIRED");

  const exportPolicy = await createPolicy("Expired export");
  const exportReady = await prepareApprovedTarget(exportPolicy.sourcePolicyId, "ExpiredExport");
  await expirePolicy(exportPolicy.sourcePolicyId);
  await expectRejects("Export from expired policy", () => exportSignalDeskMessageServer(access, exportReady.approvalId), "SOURCE_POLICY_EXPIRED");
}

async function assertApprovalAndExportNegatives() {
  const rejectionPolicy = await createPolicy("Structured approval rejection");
  const rejectionTargetId = await importOne(rejectionPolicy.sourcePolicyId, "StructuredRejection", { currentListUrl: "" });
  await scoreSignalDeskTargetServer(access, rejectionTargetId);
  await createSignalDeskEvidenceServer(access, rejectionTargetId);
  const rejectionDraft = await createSignalDeskDraftServer(access, { targetId: rejectionTargetId });
  await expectRejects("Approval rejection without reason", () => reviewSignalDeskApprovalServer(access, {
    approvalId: rejectionDraft.approval.approvalId,
    status: "rejected",
  }), "Approval rejection reason is required");
  await expectRejects("Approval other rejection without note", () => reviewSignalDeskApprovalServer(access, {
    approvalId: rejectionDraft.approval.approvalId,
    rejectionReason: "other",
    status: "rejected",
  }), "Approval rejection note is required for other");
  const rejectedApproval = await reviewSignalDeskApprovalServer(access, {
    approvalId: rejectionDraft.approval.approvalId,
    reason: "The reviewed evidence is no longer current.",
    rejectionReason: "evidence-weak-or-stale",
    status: "rejected",
  });
  assert(rejectedApproval.rejectionReason === "evidence-weak-or-stale", "Structured rejection reason was not returned");
  const rejectionApprovalSnap = await db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(rejectionDraft.approval.approvalId).get();
  assert(rejectionApprovalSnap.data()?.rejectionReason === "evidence-weak-or-stale", "Structured rejection reason was not stored");
  const rejectionTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(rejectionTargetId).get();
  assert(rejectionTargetSnap.data()?.status === "review" && rejectionTargetSnap.data()?.nextAction === "evidence", "Structured rejection did not project the correct recovery action");

  const concurrentPolicy = await createPolicy("Concurrent approval review");
  const concurrentTargetId = await importOne(concurrentPolicy.sourcePolicyId, "ConcurrentApprovalReview");
  await scoreSignalDeskTargetServer(access, concurrentTargetId);
  await createSignalDeskEvidenceServer(access, concurrentTargetId);
  const concurrentDraft = await createSignalDeskDraftServer(access, { targetId: concurrentTargetId });
  const queueBeforeConcurrentReview = await db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.QUEUES)
    .get();
  const approvalBacklogBefore = Number(queueBeforeConcurrentReview.data()?.approvalBacklog || 0);
  const humanReviewBefore = Number(queueBeforeConcurrentReview.data()?.humanReview || 0);
  const concurrentReviews = await Promise.allSettled([
    reviewSignalDeskApprovalServer(access, {
      approvalId: concurrentDraft.approval.approvalId,
      reason: "Concurrent approval fixture.",
      status: "approved",
    }),
    reviewSignalDeskApprovalServer(access, {
      approvalId: concurrentDraft.approval.approvalId,
      reason: "Concurrent rejection fixture.",
      rejectionReason: "wrong-segment",
      status: "rejected",
    }),
  ]);
  assert(concurrentReviews.filter((result) => result.status === "fulfilled").length === 1, "Concurrent approval review accepted more than one terminal decision");
  assert(concurrentReviews.filter((result) => result.status === "rejected").length === 1, "Concurrent approval review did not reject the losing decision");
  const queueAfterConcurrentReview = await db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.QUEUES)
    .get();
  assert(Number(queueAfterConcurrentReview.data()?.approvalBacklog || 0) === approvalBacklogBefore - 1, "Concurrent approval review decremented approval backlog more than once");
  assert(Number(queueAfterConcurrentReview.data()?.humanReview || 0) === humanReviewBefore - 1, "Concurrent approval review decremented human review more than once");
  const concurrentReviewAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.entityId === concurrentDraft.approval.approvalId
    && (data.action === "draft_approved" || data.action === "draft_rejected")
  ));
  assert(concurrentReviewAuditCount === 1, "Concurrent approval review created duplicate terminal audit events");

  const unsupportedPolicy = await createPolicy("Unsupported claim");
  const unsupportedTargetId = await importOne(unsupportedPolicy.sourcePolicyId, "UnsupportedClaim");
  await scoreSignalDeskTargetServer(access, unsupportedTargetId);
  await createSignalDeskEvidenceServer(access, unsupportedTargetId);
  const unsupportedDraft = await createSignalDeskDraftServer(access, { targetId: unsupportedTargetId });
  await db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(unsupportedDraft.draft.draftId).set({
    unsupportedClaims: ["Invented platform partnership claim"],
    updatedAt: timestampNow(),
  }, { merge: true });
  await expectRejects("Unsupported draft claim approval", () => reviewSignalDeskApprovalServer(access, {
    approvalId: unsupportedDraft.approval.approvalId,
    reason: "Should remain blocked.",
    status: "approved",
  }), "Draft has unsupported claims");
  const approvalBlockAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.action === "approval_block" && data.entityId === unsupportedDraft.approval.approvalId);
  assert(approvalBlockAuditCount > 0, "Unsupported claim approval did not write audit event");
  const unsupportedExportCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS, (data) => data.approvalId === unsupportedDraft.approval.approvalId);
  assert(unsupportedExportCount === 0, "Unsupported claim approval created an export");

  const suppressedPolicy = await createPolicy("Suppressed export");
  const suppressedReady = await prepareApprovedTarget(suppressedPolicy.sourcePolicyId, "SuppressedExport");
  await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(suppressedReady.targetId).set({
    suppressionStatus: "suppressed",
    updatedAt: timestampNow(),
  }, { merge: true });
  await expectRejects("Suppressed contact export", () => exportSignalDeskMessageServer(access, suppressedReady.approvalId), "Target is suppressed");

  const providerSendPolicy = await createPolicy("Provider send disabled");
  const providerSendReady = await prepareApprovedTarget(providerSendPolicy.sourcePolicyId, "ProviderSendDisabled");
  await expectRejects("Provider send disabled", () => sendSignalDeskApprovedMessageServer(access, {
    approvalId: providerSendReady.approvalId,
    channel: "email",
  }), "SignalDesk provider send is disabled");

  const senderPolicy = await createPolicy("Sender not ready");
  const senderReady = await prepareApprovedTarget(senderPolicy.sourcePolicyId, "SenderNotReady");
  await upsertSignalDeskSenderDomainServer(access, {
    authenticationState: "pending",
    bounceRate: 0,
    brandRisk: "low",
    complaintRate: 0,
    domain: "menulist.test",
    provider: "owned-email",
    status: "active",
    unsubscribeReady: false,
    volumeRampState: "warm",
  });
  await expectRejects("Missing sender readiness for export", () => exportSignalDeskMessageServer(access, senderReady.approvalId), "Sender domain is not ready");
  await upsertSignalDeskSenderDomainServer(access, {
    authenticationState: "ready",
    bounceRate: 0,
    brandRisk: "low",
    complaintRate: 0,
    domain: "menulist.test",
    provider: "owned-email",
    status: "active",
    unsubscribeReady: true,
    volumeRampState: "warm",
  });
}

async function assertManualContactGuards() {
  const noExportPolicy = await createPolicy("Manual contact requires prepared email");
  const noExportReady = await prepareApprovedTarget(noExportPolicy.sourcePolicyId, "ManualContactNoExport");
  await expectRejects("Manual email contact without export", () => recordSignalDeskManualContactServer(access, {
    idempotencyKey: "manual-contact-without-export",
    occurredAt: new Date().toISOString(),
    result: "contacted",
    route: "email-export",
    sourcePolicyId: noExportPolicy.sourcePolicyId,
    targetId: noExportReady.targetId,
  }), "Prepared email export is required");

  const wrongContactPolicy = await createPolicy("Manual wrong contact");
  const wrongContactReady = await prepareApprovedTarget(wrongContactPolicy.sourcePolicyId, "ManualWrongContact");
  await exportSignalDeskMessageServer(access, wrongContactReady.approvalId);
  const wrongContact = await recordSignalDeskManualContactServer(access, {
    idempotencyKey: "manual-contact-wrong-contact",
    note: "The business confirmed this route belongs to a different operator.",
    occurredAt: new Date().toISOString(),
    result: "wrong-contact",
    route: "email-export",
    sourcePolicyId: wrongContactPolicy.sourcePolicyId,
    targetId: wrongContactReady.targetId,
  });
  assert(wrongContact.duplicate === false, "Wrong-contact action was not recorded");
  const wrongContactTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(wrongContactReady.targetId).get();
  assert(wrongContactTargetSnap.data()?.suppressionStatus === "wrong-contact", "Wrong-contact action did not suppress the target");
  const wrongContactSuppressionCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER, (data) => data.targetId === wrongContactReady.targetId && data.reason === "wrong-contact");
  assert(wrongContactSuppressionCount === 1, "Wrong-contact action did not create one suppression record");

  const expiredPolicy = await createPolicy("Manual contact expired policy");
  const expiredReady = await prepareApprovedTarget(expiredPolicy.sourcePolicyId, "ManualContactExpired");
  await exportSignalDeskMessageServer(access, expiredReady.approvalId);
  await expirePolicy(expiredPolicy.sourcePolicyId);
  await expectRejects("Manual contact from expired policy", () => recordSignalDeskManualContactServer(access, {
    idempotencyKey: "manual-contact-expired-policy",
    occurredAt: new Date().toISOString(),
    result: "contacted",
    route: "email-export",
    sourcePolicyId: expiredPolicy.sourcePolicyId,
    targetId: expiredReady.targetId,
  }), "SOURCE_POLICY_EXPIRED");

  const limitedPolicy = await createPolicy("Unverified limited contact route", {
    accessMethod: "manual-public-research",
  });
  const limitedTargetId = await importOne(limitedPolicy.sourcePolicyId, "ManualContactLimited", { email: "" });
  await expectRejects("Limited contactability cannot masquerade as a manual form", () => recordSignalDeskManualContactServer(access, {
    idempotencyKey: "manual-contact-unverified-limited-route",
    occurredAt: new Date().toISOString(),
    result: "contacted",
    route: "manual-form",
    sourcePolicyId: limitedPolicy.sourcePolicyId,
    targetId: limitedTargetId,
  }), "Manual contact route is not allowed");

  const staleExportPolicy = await createPolicy("Stale prepared email export");
  const staleExportReady = await prepareApprovedTarget(staleExportPolicy.sourcePolicyId, "ManualContactStaleExport");
  await exportSignalDeskMessageServer(access, staleExportReady.approvalId);
  const staleExportSnap = await db.collection(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS)
    .where("targetId", "==", staleExportReady.targetId)
    .limit(1)
    .get();
  await staleExportSnap.docs[0].ref.set({
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - (31 * 24 * 60 * 60 * 1000))),
  }, { merge: true });
  await expectRejects("Stale prepared email export cannot confirm a current contact", () => recordSignalDeskManualContactServer(access, {
    idempotencyKey: "manual-contact-stale-export",
    occurredAt: new Date().toISOString(),
    result: "contacted",
    route: "email-export",
    sourcePolicyId: staleExportPolicy.sourcePolicyId,
    targetId: staleExportReady.targetId,
  }), "Prepared email export is required");

  const suppressedContactPolicy = await createPolicy("Suppressed manual contact");
  const suppressedContactReady = await prepareApprovedTarget(suppressedContactPolicy.sourcePolicyId, "ManualContactSuppressed");
  await exportSignalDeskMessageServer(access, suppressedContactReady.approvalId);
  await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(suppressedContactReady.targetId).set({
    suppressionStatus: "suppressed",
    updatedAt: timestampNow(),
  }, { merge: true });
  await expectRejects("Suppressed target cannot record manual contact", () => recordSignalDeskManualContactServer(access, {
    idempotencyKey: "manual-contact-suppressed",
    occurredAt: new Date().toISOString(),
    result: "contacted",
    route: "email-export",
    sourcePolicyId: suppressedContactPolicy.sourcePolicyId,
    targetId: suppressedContactReady.targetId,
  }), "Target is suppressed");

  const partnerIntroPolicy = await createPolicy("Permissioned partner introduction");
  const partnerIntroTargetId = await importOne(partnerIntroPolicy.sourcePolicyId, "ManualPartnerIntro", {
    email: "",
    instagram: "",
    phone: "",
    website: "",
  });
  const partnerIntro = await recordSignalDeskManualContactServer(access, {
    idempotencyKey: "manual-contact-partner-introduction",
    occurredAt: new Date().toISOString(),
    result: "introduced",
    route: "partner-intro",
    sourcePolicyId: partnerIntroPolicy.sourcePolicyId,
    targetId: partnerIntroTargetId,
  });
  assert(partnerIntro.duplicate === false, "Permissioned partner introduction was blocked");
}

async function assertUnverifiedLimitedRouteRevalidation() {
  const policy = await createPolicy("Legacy limited route revalidation", {
    accessMethod: "manual-public-research",
  });
  const targetId = await importOne(policy.sourcePolicyId, "LegacyLimitedRoute", { email: "" });
  const researchRowId = `legacy_limited_route_${targetId}`;
  await db.collection(SIGNALDESK_COLLECTIONS.RESEARCH_TABLE_ROWS).doc(researchRowId).set({
    actionabilityState: "actionable",
    allowedRoute: "manual-form",
    allowedRouteReason: "Legacy inferred form route fixture.",
    category: "restaurant",
    contactability: "limited",
    currentListGap: "missing-current-list",
    displayName: "Legacy limited route fixture",
    evidenceSummary: "Evidence fixture",
    enrichment: [],
    fitDecision: "pass",
    fitScore: 80,
    hardGateFailures: [],
    provider: "manual",
    recommendedChannel: "manual-form",
    recommendedCta: "Private preview",
    recommendedMessageAngle: "Current menu link",
    recommendedNextAction: "score",
    researchRowId,
    researchRunId: "legacy_limited_route_run",
    routePermissionState: "permissioned",
    sourcePolicyId: policy.sourcePolicyId,
    sourceRefs: [`source-policy:${policy.sourcePolicyId}`],
    targetId,
    updatedAt: timestampNow(),
  });
  const workspace = await loadSignalDeskWorkspaceServer(access, "mission");
  const row = workspace.workspace.researchTableRows.find((item) => item.researchRowId === researchRowId);
  const opportunity = workspace.workspace.activationOpportunities.find((item) => item.targetId === targetId);
  assert(row?.allowedRoute === "none", "Legacy limited contactability retained an inferred manual-form route");
  assert(row?.actionabilityState === "verify", "Unverified limited contact route remained actionable");
  assert(row?.hardGateFailures.includes("contact-route-unverified"), "Unverified limited contact route missed its hard-gate reason");
  assert(opportunity?.allowedRoute === "none", "Activation opportunity exposed an unverified limited contact route");

  const referralPolicy = await createPolicy("Permissioned referral without direct contact");
  const referralTargetId = await importOne(referralPolicy.sourcePolicyId, "PermissionedReferralNoDirectRoute", {
    email: "",
    instagram: "",
    phone: "",
    website: "",
  });
  const referralResearchRowId = `permissioned_referral_route_${referralTargetId}`;
  await db.collection(SIGNALDESK_COLLECTIONS.RESEARCH_TABLE_ROWS).doc(referralResearchRowId).set({
    actionabilityState: "verify",
    allowedRoute: "none",
    allowedRouteReason: "Pre-revalidation permissioned-referral fixture.",
    category: "restaurant",
    contactability: "missing",
    currentListGap: "missing-current-list",
    displayName: "Permissioned referral fixture",
    evidenceSummary: "Permissioned introduction evidence fixture",
    enrichment: [],
    fitDecision: "pass",
    fitScore: 80,
    hardGateFailures: ["contact-route-missing"],
    provider: "manual",
    recommendedChannel: "hold",
    recommendedCta: "Private preview",
    recommendedMessageAngle: "Permissioned introduction",
    recommendedNextAction: "partner-review",
    researchRowId: referralResearchRowId,
    researchRunId: "permissioned_referral_route_run",
    routePermissionState: "permissioned",
    sourcePolicyId: referralPolicy.sourcePolicyId,
    sourceRefs: [`source-policy:${referralPolicy.sourcePolicyId}`],
    targetId: referralTargetId,
    updatedAt: timestampNow(),
  });
  const referralWorkspace = await loadSignalDeskWorkspaceServer(access, "mission");
  const referralRow = referralWorkspace.workspace.researchTableRows.find((item) => item.researchRowId === referralResearchRowId);
  assert(referralRow?.allowedRoute === "partner-intro", "Permissioned referral without direct contact was not actionable through its partner route");
  assert(referralRow?.actionabilityState === "actionable", "Permissioned referral remained incorrectly held for direct contact");
  assert(!referralRow?.hardGateFailures.includes("contact-route-missing"), "Permissioned referral retained a stale direct-contact failure");
}

async function assertAiShadowReviewLearning() {
  const modelEvalId = "model_eval_evidence_gemini_shadow_e2e";
  const aiRunId = "ai_shadow_e2e_provider_run";
  const rulesRunId = "ai_shadow_e2e_rules_score";
  const timestamp = timestampNow();
  await db.collection(SIGNALDESK_COLLECTIONS.MODEL_EVALS).doc(modelEvalId).set({
    modelEvalId,
    modelRouteId: "model_route_evidence",
    task: "evidence",
    provider: "gemini",
    model: "gemini-e2e",
    status: "needs-review",
    sampleSize: 2,
    passedSampleCount: 1,
    lowConfidenceCount: 1,
    rejectedFactSampleCount: 1,
    reviewedSampleSize: 0,
    acceptedCount: 0,
    editedCount: 0,
    rejectedCount: 0,
    heldCount: 0,
    passRate: 0.5,
    editRate: 0,
    rejectedFactRate: 0.5,
    acceptanceRate: 0,
    rejectionRate: 0,
    holdRate: 0,
    founderAttentionMinutes: 0,
    updatedAt: timestamp,
  });
  await db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(aiRunId).set({
    aiRunId,
    workerType: "ai_assist_evidence",
    workerVersion: "shadow-e2e-v1",
    task: "evidence",
    provider: "gemini",
    model: "gemini-e2e",
    modelRouteId: "model_route_evidence",
    modelEvalId,
    targetId: "target_shadow_e2e",
    confidence: "medium",
    rejectedFactCount: 1,
    output: { rejectedFacts: ["Unsupported claim"] },
    costEstimate: 0.01,
    founderAttentionMinutes: 0,
    createdAt: timestamp,
  });
  await db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(rulesRunId).set({
    scoreId: rulesRunId,
    workerType: "target_score",
    workerVersion: "rules-v1",
    targetId: "target_rules_e2e",
    fitScore: 80,
    currentListGapScore: 80,
    contactabilityScore: 80,
    riskScore: 10,
    segment: "a",
    nextAction: "draft",
    reasons: ["Rules-only fixture"],
    confidence: "high",
    model: "rules",
    costEstimate: 0,
    createdAt: timestamp,
  });
  await db.collection(SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.REVENUE).set({
    founderAttentionMinutes: 10,
    updatedAt: timestamp,
  }, { merge: true });

  await expectRejects("Non-founder AI shadow review", () => reviewSignalDeskAiShadowRunServer({
    ...access,
    role: "growth-manager",
  }, {
    aiRunId,
    decision: "accepted",
    founderAttentionMinutes: 1,
  }), "Founder approval is required for AI shadow review");
  await expectRejects("Rules-only AI shadow review", () => reviewSignalDeskAiShadowRunServer(access, {
    aiRunId: rulesRunId,
    decision: "accepted",
    founderAttentionMinutes: 1,
  }), "Only provider-backed AI assist runs can be reviewed");
  await expectRejects("AI shadow review without exception reason", () => reviewSignalDeskAiShadowRunServer(access, {
    aiRunId,
    decision: "edited",
    founderAttentionMinutes: 3,
  }), "AI shadow review reason is required");

  const sideEffectCountBefore = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS, () => true);
  await reviewSignalDeskAiShadowRunServer(access, {
    aiRunId,
    decision: "edited",
    founderAttentionMinutes: 3,
    reason: "Removed an unsupported claim before reuse.",
  });
  let evalSnap = await db.collection(SIGNALDESK_COLLECTIONS.MODEL_EVALS).doc(modelEvalId).get();
  assert(evalSnap.data()?.sampleSize === 2, "Shadow review changed provider sample size");
  assert(evalSnap.data()?.reviewedSampleSize === 1, "Shadow review did not count one reviewed run");
  assert(evalSnap.data()?.editedCount === 1 && evalSnap.data()?.editRate === 1, "Edited shadow decision was not aggregated");
  assert(evalSnap.data()?.founderAttentionMinutes === 3, "Model evaluation did not capture founder attention");
  let revenueSnap = await db.collection(SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.REVENUE).get();
  assert(revenueSnap.data()?.founderAttentionMinutes === 13, "Revenue summary did not include shadow-review attention");

  await reviewSignalDeskAiShadowRunServer(access, {
    aiRunId,
    decision: "rejected",
    founderAttentionMinutes: 2,
    reason: "Evidence remained too weak for use.",
  });
  evalSnap = await db.collection(SIGNALDESK_COLLECTIONS.MODEL_EVALS).doc(modelEvalId).get();
  assert(evalSnap.data()?.reviewedSampleSize === 1, "Review replacement double-counted the reviewed run");
  assert(evalSnap.data()?.editedCount === 0 && evalSnap.data()?.editRate === 0, "Review replacement retained the prior edit decision");
  assert(evalSnap.data()?.rejectedCount === 1 && evalSnap.data()?.rejectionRate === 1, "Rejected review replacement was not aggregated");
  assert(evalSnap.data()?.founderAttentionMinutes === 2, "Review replacement double-counted founder attention");
  revenueSnap = await db.collection(SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.REVENUE).get();
  assert(revenueSnap.data()?.founderAttentionMinutes === 12, "Revenue attention replacement was not idempotent");

  const runSnap = await db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(aiRunId).get();
  assert(runSnap.data()?.reviewDecision === "rejected", "AI run did not retain the latest founder decision");
  assert(runSnap.data()?.reviewedBy === access.userId, "AI run did not retain founder review identity");
  const auditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.action === "ai_shadow_review" && data.entityId === aiRunId);
  assert(auditCount === 2, "AI shadow review did not write one audit event per founder decision");
  const timelineSnap = await db.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES).doc(`model_${aiRunId}`).get();
  assert(timelineSnap.exists && timelineSnap.data()?.status === "blocked", "AI shadow review timeline did not retain latest status");
  const sideEffectCountAfter = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS, () => true);
  assert(sideEffectCountAfter === sideEffectCountBefore, "AI shadow review created an outbound export");

  const aiWorkspace = await loadSignalDeskWorkspaceServer(access, "ai");
  assert(aiWorkspace.workspace.aiWorkerRuns.some((run) => run.aiRunId === aiRunId), "AI workspace did not expose provider-backed runs for review");
  assert(!aiWorkspace.workspace.scores.some((score) => score.scoreId === aiRunId), "AI provider run leaked into rules scores");
  assert(aiWorkspace.workspace.scores.some((score) => score.scoreId === rulesRunId), "AI workspace lost rules-only scores");
  const loadedEval = aiWorkspace.workspace.modelEvals.find((evaluation) => evaluation.modelEvalId === modelEvalId);
  assert(loadedEval?.passRate === 0.5 && loadedEval?.rejectedFactRate === 0.5, "AI workspace did not derive cumulative provider quality rates");
}

async function assertAiVolumeMode() {
  const policy = await createPolicy("AI volume");
  const targetId = await importOne(policy.sourcePolicyId, "AiVolume");
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
    updatedAt: timestampNow(),
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
    updatedAt: timestampNow(),
  }, { merge: true });

  await expectRejects("Non-founder AI volume run", () => runSignalDeskAiVolumeBatchServer({
    ...access,
    role: "growth-manager",
  }, {
    idempotencyKey: "ai-volume-non-founder-e2e",
    maxEstimatedCostUsd: 1,
    targetIds: [targetId],
    tasks: ["score"],
  }), "Founder approval is required for AI volume runs");
  await expectRejects("AI volume direct-server input bounds", () => runSignalDeskAiVolumeBatchServer(access, {
    idempotencyKey: "short",
    maxEstimatedCostUsd: 1,
    targetIds: [targetId],
    tasks: ["score"],
  }), "AI volume batch limits are invalid");
  await expectRejects("AI volume founder maximum", () => runSignalDeskAiVolumeBatchServer(access, {
    idempotencyKey: "ai-volume-cost-block-e2e",
    maxEstimatedCostUsd: 0.01,
    targetIds: [targetId],
    tasks: ["score", "evidence"],
  }), "AI volume projected cost exceeds founder maximum");
  const preflightVolumeCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS, (data) => data.workerType === "ai_volume_batch");
  assert(preflightVolumeCount === 0, "AI volume cost preflight wrote a parent run before blocking");
  await db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_gemini_ai").set({ dailyBudgetUsd: 0.1 }, { merge: true });
  await db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc("budget_provider_gemini_default").set({ dailyBudgetUsd: 0.1 }, { merge: true });
  await expectRejects("AI volume aggregate provider budget", () => runSignalDeskAiVolumeBatchServer(access, {
    idempotencyKey: "ai-volume-provider-budget-e2e",
    maxEstimatedCostUsd: 1,
    targetIds: [targetId],
    tasks: ["score"],
  }), "Provider daily budget exceeded");
  await db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_gemini_ai").set({ dailyBudgetUsd: 5 }, { merge: true });
  await db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc("budget_provider_gemini_default").set({ dailyBudgetUsd: 5 }, { merge: true });
  const activeVolumeLockRef = db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc("ai_volume_lock_global");
  const staleVolumeKey = "ai-volume-stale-recovery-e2e";
  const staleVolumeId = `ai_volume_${hashValue(`${access.userId}|${staleVolumeKey}`).slice(0, 24)}`;
  const staleVolumeRef = db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(staleVolumeId);
  const staleChildRef = db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc();
  const expiredAt = admin.firestore.Timestamp.fromMillis(Date.now() - 60000);
  await staleVolumeRef.set({
    aiRunId: staleVolumeId,
    volumeRunId: staleVolumeId,
    workerType: "ai_volume_batch",
    workerVersion: "ai-volume-v1",
    status: "running",
    targetIds: [targetId],
    tasks: ["score", "evidence"],
    requestedPairCount: 2,
    completedPairCount: 0,
    failedPairCount: 0,
    modelCallCount: 0,
    estimatedCostUsd: 0,
    maxEstimatedCostUsd: 1,
    childRunIds: [],
    failureCodes: [],
    lockExpiresAt: expiredAt,
    createdBy: access.userId,
    createdAt: expiredAt,
    updatedAt: expiredAt,
  });
  await staleChildRef.set({
    aiRunId: staleChildRef.id,
    confidence: "high",
    costEstimate: 0.03,
    model: "gemini-2.5-flash-lite",
    modelCallCount: 2,
    provider: "gemini",
    targetId,
    task: "score",
    volumeRunId: staleVolumeId,
    workerType: "ai_assist_score",
    workerVersion: "signaldesk-ai-assist-v2+signaldesk-ai-critic-v1",
    createdAt: expiredAt,
  });
  await activeVolumeLockRef.set({
    activeVolumeRunId: staleVolumeId,
    expiresAt: expiredAt,
    status: "running",
    workerType: "ai_volume_lock",
  });
  const recoveredStaleVolume = await runSignalDeskAiVolumeBatchServer(access, {
    idempotencyKey: staleVolumeKey,
    maxEstimatedCostUsd: 1,
    targetIds: [targetId],
    tasks: ["score", "evidence"],
  });
  assert(recoveredStaleVolume.status === "partial", "Expired AI volume parent was not recovered as partial");
  assert(recoveredStaleVolume.completedPairCount === 1 && recoveredStaleVolume.failedPairCount === 1, "Expired AI volume recovery counters are incorrect");
  assert(recoveredStaleVolume.childRunIds.includes(staleChildRef.id), "Expired AI volume recovery lost its completed child");
  assert(recoveredStaleVolume.modelCallCount === 2 && recoveredStaleVolume.estimatedCostUsd === 0.03, "Expired AI volume recovery did not reconstruct calls and cost");
  assert(recoveredStaleVolume.failureCodes.includes("ai_volume_run_interrupted"), "Expired AI volume recovery lost its stable failure code");
  const recoveredLock = await activeVolumeLockRef.get();
  assert(recoveredLock.data()?.status === "completed" && recoveredLock.data()?.recoveryReason === "ai_volume_run_interrupted", "Expired AI volume recovery did not release its owned lock");
  const recoveredTimeline = await db.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES).doc(`model_${staleVolumeId}`).get();
  assert(recoveredTimeline.data()?.status === "held", "Expired AI volume recovery did not write a held timeline");
  const recoveryAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.entityId === staleVolumeId && data.action === "ai_volume_batch_recovered");
  assert(recoveryAuditCount === 1, "Expired AI volume recovery did not write exactly one audit event");
  const recoveredStaleRetry = await runSignalDeskAiVolumeBatchServer(access, {
    idempotencyKey: staleVolumeKey,
    maxEstimatedCostUsd: 1,
    targetIds: [targetId],
    tasks: ["score", "evidence"],
  });
  const recoveryAuditCountAfterRetry = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.entityId === staleVolumeId && data.action === "ai_volume_batch_recovered");
  assert(recoveredStaleRetry.status === "partial" && recoveryAuditCountAfterRetry === 1, "Recovered AI volume retry repeated recovery writes");

  const blockedStaleVolumeKey = "ai-volume-stale-blocked-e2e";
  const blockedStaleVolumeId = `ai_volume_${hashValue(`${access.userId}|${blockedStaleVolumeKey}`).slice(0, 24)}`;
  await db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(blockedStaleVolumeId).set({
    aiRunId: blockedStaleVolumeId,
    volumeRunId: blockedStaleVolumeId,
    workerType: "ai_volume_batch",
    workerVersion: "ai-volume-v1",
    status: "running",
    targetIds: [targetId],
    tasks: ["score"],
    requestedPairCount: 1,
    completedPairCount: 0,
    failedPairCount: 0,
    modelCallCount: 0,
    estimatedCostUsd: 0,
    maxEstimatedCostUsd: 1,
    childRunIds: [],
    failureCodes: [],
    lockExpiresAt: expiredAt,
    createdBy: access.userId,
    createdAt: expiredAt,
    updatedAt: expiredAt,
  });
  const recoveredBlockedVolume = await runSignalDeskAiVolumeBatchServer(access, {
    idempotencyKey: blockedStaleVolumeKey,
    maxEstimatedCostUsd: 1,
    targetIds: [targetId],
    tasks: ["score"],
  });
  assert(recoveredBlockedVolume.status === "blocked" && recoveredBlockedVolume.failedPairCount === 1, "Expired AI volume with no children was not recovered as blocked");
  assert(recoveredBlockedVolume.failureCodes.includes("ai_volume_run_interrupted"), "Blocked stale AI volume lost interruption evidence");

  await activeVolumeLockRef.set({
    activeVolumeRunId: "ai_volume_other",
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 300000),
    status: "running",
    workerType: "ai_volume_lock",
  });
  await expectRejects("Concurrent AI volume run", () => runSignalDeskAiVolumeBatchServer(access, {
    idempotencyKey: "ai-volume-concurrent-block-e2e",
    maxEstimatedCostUsd: 1,
    targetIds: [targetId],
    tasks: ["score"],
  }), "SignalDesk AI volume run is already active");
  await activeVolumeLockRef.delete();

  const originalAssist = signalDeskAiProvider.runSignalDeskAiAssist;
  const originalCritic = signalDeskAiProvider.runSignalDeskAiCritic;
  let assistCallCount = 0;
  let criticCallCount = 0;
  signalDeskAiProvider.runSignalDeskAiAssist = async (input) => {
    assistCallCount += 1;
    const escalated = Boolean(input.priorOutput);
    return {
      confidence: escalated ? "high" : input.task === "evidence" ? "medium" : "high",
      model: input.model,
      output: {
        confidence: escalated ? "high" : input.task === "evidence" ? "medium" : "high",
        nextAction: input.task === "evidence" ? "evidence" : "review",
        reasons: [escalated ? "Strong-model correction fixture" : "Fast-model fixture"],
        rejectedFacts: [],
      },
      promptVersion: "signaldesk-ai-assist-v2",
      task: input.task,
    };
  };
  signalDeskAiProvider.runSignalDeskAiCritic = async (input) => {
    criticCallCount += 1;
    const revise = input.task === "evidence";
    return {
      confidence: revise ? "medium" : "high",
      model: input.model,
      reasons: [revise ? "Evidence needs stronger adjudication" : "Candidate is evidence-bounded"],
      rejectedFacts: [],
      revisedOutput: revise ? {
        confidence: "medium",
        nextAction: "evidence",
        reasons: ["Critic revision fixture"],
        rejectedFacts: [],
      } : undefined,
      promptVersion: "signaldesk-ai-critic-v1",
      verdict: revise ? "revise" : "pass",
    };
  };

  try {
    const messageExportCountBefore = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS, () => true);
    const result = await runSignalDeskAiVolumeBatchServer(access, {
      idempotencyKey: "ai-volume-happy-e2e",
      instruction: "Prepare internal review outputs only.",
      maxEstimatedCostUsd: 1,
      targetIds: [targetId],
      tasks: ["score", "evidence"],
    });
    assert(result.status === "completed", `AI volume batch did not complete: ${result.status}`);
    assert(result.requestedPairCount === 2 && result.completedPairCount === 2, "AI volume batch pair counters are incorrect");
    assert(result.failedPairCount === 0 && result.failureCodes.length === 0, "AI volume batch recorded unexpected failures");
    assert(result.childRunIds.length === 2, "AI volume batch did not retain both child run IDs");
    assert(result.modelCallCount === 5, `AI volume model-call count was ${result.modelCallCount}, expected 5`);
    assert(assistCallCount === 3 && criticCallCount === 2, "AI volume generation/critic/escalation call split is incorrect");
    assert(result.estimatedCostUsd > 0 && result.estimatedCostUsd <= result.maxEstimatedCostUsd, "AI volume estimated cost exceeded founder authority");
    const releasedVolumeLock = await db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc("ai_volume_lock_global").get();
    assert(releasedVolumeLock.data()?.status === "completed", "AI volume global lock was not released after completion");

    const childSnaps = await Promise.all(result.childRunIds.map((childRunId) => (
      db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(childRunId).get()
    )));
    const children = childSnaps.map((snap) => snap.data());
    assert(children.every((child) => child?.volumeRunId === result.volumeRunId), "AI volume child lost its parent run ID");
    assert(children.every((child) => child?.criticVerdict), "AI volume child lost critic evidence");
    assert(children.some((child) => child?.escalated === true && child?.modelCallCount === 3), "AI volume critic exception did not escalate");
    assert(children.some((child) => child?.escalated === false && child?.modelCallCount === 2), "AI volume clean child did not stop after critic pass");
    const messageExportCountAfter = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS, () => true);
    assert(messageExportCountAfter === messageExportCountBefore, "AI volume mode created an outbound export");
    const volumeAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
      data.entityId === result.volumeRunId && (data.action === "ai_volume_batch_started" || data.action === "ai_volume_batch_finished")
    ));
    assert(volumeAuditCount === 2, "AI volume batch did not write start and finish audit evidence");
    const aiWorkspace = await loadSignalDeskWorkspaceServer(access, "ai");
    assert(aiWorkspace.workspace.aiVolumeRuns.some((run) => run.volumeRunId === result.volumeRunId), "AI workspace did not load the volume parent summary");
    assert(aiWorkspace.workspace.aiWorkerRuns.filter((run) => run.volumeRunId === result.volumeRunId).length === 2, "AI workspace did not load both reviewable volume children");

    const callsBeforeRetry = assistCallCount + criticCallCount;
    const idempotentRetry = await runSignalDeskAiVolumeBatchServer(access, {
      idempotencyKey: "ai-volume-happy-e2e",
      instruction: "Prepare internal review outputs only.",
      maxEstimatedCostUsd: 1,
      targetIds: [targetId],
      tasks: ["score", "evidence"],
    });
    assert(idempotentRetry.volumeRunId === result.volumeRunId, "AI volume retry did not return the deterministic parent run");
    assert(assistCallCount + criticCallCount === callsBeforeRetry, "AI volume retry repeated paid model calls");

    signalDeskAiProvider.runSignalDeskAiAssist = async (input) => {
      if (input.task === "evidence" && !input.priorOutput) throw new Error("provider secret raw failure must not persist");
      return {
        confidence: "high",
        model: input.model,
        output: { confidence: "high", nextAction: "review", reasons: ["Partial fixture"], rejectedFacts: [] },
        promptVersion: "signaldesk-ai-assist-v2",
        task: input.task,
      };
    };
    signalDeskAiProvider.runSignalDeskAiCritic = async (input) => ({
      confidence: "high",
      model: input.model,
      reasons: ["Partial fixture critic pass"],
      rejectedFacts: [],
      promptVersion: "signaldesk-ai-critic-v1",
      verdict: "pass",
    });
    const partial = await runSignalDeskAiVolumeBatchServer(access, {
      idempotencyKey: "ai-volume-partial-e2e",
      maxEstimatedCostUsd: 1,
      targetIds: [targetId],
      tasks: ["score", "evidence"],
    });
    assert(partial.status === "partial" && partial.completedPairCount === 1 && partial.failedPairCount === 1, "AI volume partial failure was not retained accurately");
    assert(partial.failureCodes.length === 1 && !partial.failureCodes.join(" ").includes("secret"), "AI volume parent persisted raw provider failure text");

    const scoreRouteRef = db.collection(SIGNALDESK_COLLECTIONS.MODEL_ROUTES).doc("model_route_score");
    await scoreRouteRef.set({ escalationModel: "gpt-5-mini", escalationProvider: "openai", updatedAt: timestampNow() }, { merge: true });
    signalDeskAiProvider.runSignalDeskAiAssist = async (input) => ({
      confidence: "medium",
      model: input.model,
      output: { confidence: "medium", nextAction: "review", reasons: ["Escalation-block fixture"], rejectedFacts: [] },
      promptVersion: "signaldesk-ai-assist-v2",
      task: input.task,
    });
    signalDeskAiProvider.runSignalDeskAiCritic = async (input) => ({
      confidence: "low",
      model: input.model,
      reasons: ["Stronger review required"],
      rejectedFacts: [],
      promptVersion: "signaldesk-ai-critic-v1",
      verdict: "hold",
    });
    const blockedEscalation = await runSignalDeskAiVolumeBatchServer(access, {
      idempotencyKey: "ai-volume-escalation-block-e2e",
      maxEstimatedCostUsd: 1,
      targetIds: [targetId],
      tasks: ["score"],
    });
    const blockedEscalationChild = await db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(blockedEscalation.childRunIds[0]).get();
    assert(blockedEscalation.status === "completed", "Unavailable escalation incorrectly failed the internal child record");
    assert(blockedEscalationChild.data()?.escalationBlocked === true && blockedEscalationChild.data()?.confidence === "low", "Unavailable non-Gemini escalation did not remain review-required");
    await scoreRouteRef.set({ escalationModel: "gemini-2.5-flash", escalationProvider: "gemini", updatedAt: timestampNow() }, { merge: true });

    signalDeskAiProvider.runSignalDeskAiAssist = async (input) => ({
      confidence: "high",
      model: input.model,
      output: { confidence: "high", nextAction: "review", reasons: ["Rejected-fact fixture"], rejectedFacts: ["Owner identity is not evidenced"] },
      promptVersion: "signaldesk-ai-assist-v2",
      task: input.task,
    });
    signalDeskAiProvider.runSignalDeskAiCritic = async (input) => ({
      confidence: "high",
      model: input.model,
      reasons: ["Candidate retained an unsupported fact marker"],
      rejectedFacts: [],
      promptVersion: "signaldesk-ai-critic-v1",
      verdict: "pass",
    });
    const rejectedFactRun = await runSignalDeskAiVolumeBatchServer(access, {
      idempotencyKey: "ai-volume-rejected-fact-e2e",
      maxEstimatedCostUsd: 1,
      targetIds: [targetId],
      tasks: ["score"],
    });
    const rejectedFactChild = await db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(rejectedFactRun.childRunIds[0]).get();
    assert(rejectedFactChild.data()?.rejectedFactCount === 1 && rejectedFactChild.data()?.confidence === "low", "Rejected facts did not force founder review");
  } finally {
    signalDeskAiProvider.runSignalDeskAiAssist = originalAssist;
    signalDeskAiProvider.runSignalDeskAiCritic = originalCritic;
  }
}

async function assertMobileReadOnlyContract() {
  const fakeMobileRequest = {
    headers: {
      get: (key) => {
        const lower = String(key).toLowerCase();
        if (lower === "x-signaldesk-client-mode") return "mobile-readonly";
        if (lower === "user-agent") return "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile";
        if (lower === "sec-ch-ua-mobile") return "?1";
        return "";
      },
    },
  };
  assert(isSignalDeskMobileRequest(fakeMobileRequest), "Mobile request detector did not recognize mobile context");

  const actionsRoute = fs.readFileSync(path.join(__dirname, "..", "..", "src/app/api/signaldesk/actions/route.ts"), "utf8");
  [
    '"review-approval": "approve"',
    '"export-message": "export"',
    '"record-manual-contact": "configure"',
    '"send-approved-message": "send"',
    '"run-source-provider": "provider_run"',
    '"upsert-connector-setting": "configure"',
    '"qualify-revenue-account": "configure"',
    '"review-market-pod": "approve"',
    '"review-ai-shadow-run": "approve"',
    '"run-ai-volume-batch": "provider_run"',
    '"upsert-operating-envelope": "mutate_policy"',
    '"schedule-content-distribution-draft": "schedule"',
    '| "reveal_pii"',
    'MOBILE_READ_ONLY_ACTION_BLOCKED',
  ].forEach((needle) => assert(actionsRoute.includes(needle), `Mobile read-only route contract missing ${needle}`));

  const workspaceSource = fs.readFileSync(path.join(__dirname, "..", "..", "src/components/signaldesk/SignalDeskWorkspace.tsx"), "utf8");
  [
    'SIGNALDESK_AI_VOLUME_RETRY_STORAGE_KEY',
    'result.status !== "running"',
    '"Retry Batch"',
    '>Clear Retry<',
  ].forEach((needle) => assert(workspaceSource.includes(needle), `AI volume retry UI contract missing ${needle}`));

  for (const [action, actionClass] of [
    ["review-approval", "approve"],
    ["export-message", "export"],
    ["record-manual-contact", "configure"],
    ["upsert-connector-setting", "configure"],
    ["qualify-revenue-account", "configure"],
    ["review-market-pod", "approve"],
    ["review-ai-shadow-run", "approve"],
    ["run-ai-volume-batch", "provider_run"],
    ["upsert-operating-envelope", "mutate_policy"],
    ["target-contact-reveal", "reveal_pii"],
  ]) {
    await recordSignalDeskMobileActionBlockedServer({ access, action, actionClass });
  }
  const blockedAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.action === "mobile_action_blocked");
  assert(blockedAuditCount >= 10, "Mobile blocked action audit events were not recorded");
}

async function assertWebhookAndDncFixtures(targetId) {
  const payload = {
    email: "owner+happy@example.invalid",
    event: "email.reply",
    eventId: "email_event_duplicate_fixture",
    message: "stop",
    messageId: "provider_message_duplicate_fixture",
  };
  const headers = new Headers({ "x-signaldesk-webhook-secret": process.env.MENULIST_SIGNALDESK_EMAIL_WEBHOOK_SECRET });
  const messageCountBefore = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGES, () => true);
  const suppressionCountBefore = await expectCollectionCount(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER, () => true);
  const first = await processSignalDeskProviderWebhook({
    provider: "email",
    rawBody: JSON.stringify(payload),
    requestHeaders: headers,
  });
  assert(first.status === "processed", `First webhook was not processed: ${first.status}`);
  const afterFirstMessages = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGES, () => true);
  const afterFirstSuppressions = await expectCollectionCount(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER, () => true);
  assert(afterFirstMessages === messageCountBefore + 1, "First webhook did not create one message");
  assert(afterFirstSuppressions >= suppressionCountBefore + 1, "First webhook did not create suppression");

  const duplicate = await processSignalDeskProviderWebhook({
    provider: "email",
    rawBody: JSON.stringify(payload),
    requestHeaders: headers,
  });
  assert(duplicate.status === "duplicate", `Duplicate webhook was not deduped: ${duplicate.status}`);
  const afterDuplicateMessages = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGES, () => true);
  const afterDuplicateSuppressions = await expectCollectionCount(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER, () => true);
  assert(afterDuplicateMessages === afterFirstMessages, "Duplicate webhook created another message");
  assert(afterDuplicateSuppressions === afterFirstSuppressions, "Duplicate webhook created another suppression");

  const atomicPolicy = await createPolicy("Atomic webhook");
  const atomicTargetId = await importOne(atomicPolicy.sourcePolicyId, "AtomicWebhook", { currentListUrl: "" });
  const atomicPayload = {
    event: "email.reply",
    eventId: "email_event_atomic_fixture",
    message: "Yes, I am interested in a preview.",
    messageId: "provider_message_atomic_fixture",
    targetId: atomicTargetId,
  };
  const atomicMessageCountBefore = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGES, () => true);
  const concurrentResults = await Promise.all([
    processSignalDeskProviderWebhook({ provider: "email", rawBody: JSON.stringify(atomicPayload), requestHeaders: headers }),
    processSignalDeskProviderWebhook({ provider: "email", rawBody: JSON.stringify(atomicPayload), requestHeaders: headers }),
  ]);
  assert(concurrentResults.filter((result) => result.status === "processed").length === 1, "Concurrent webhook processing did not produce one winner");
  assert(concurrentResults.filter((result) => result.status === "duplicate").length === 1, "Concurrent webhook processing did not dedupe one retry");
  const atomicMessageCountAfter = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGES, () => true);
  assert(atomicMessageCountAfter === atomicMessageCountBefore + 1, "Concurrent webhook retry created duplicate message side effects");
  const atomicTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(atomicTargetId).get();
  assert(atomicTargetSnap.data()?.latestConversationId === `conv_${atomicTargetId}`, "Provider reply did not project the latest conversation onto the target");
  assert(atomicTargetSnap.data()?.ownerQualifiedAt, "Interested provider reply did not start the owner-qualified clock");
  const atomicRevenueAccountSnap = await db.collection(SIGNALDESK_COLLECTIONS.REVENUE_ACCOUNTS)
    .doc(`revenue_account_${hashValue(atomicTargetId).slice(0, 22)}`)
    .get();
  assert(atomicRevenueAccountSnap.exists, "Interested provider reply did not project the revenue lifecycle");

  const providerMessageCountBeforeStatus = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGES, (data) => data.targetId === atomicTargetId);
  const atomicPhoneIdentitySnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES)
    .where("targetId", "==", atomicTargetId)
    .where("channel", "==", "phone")
    .limit(1)
    .get();
  assert(!atomicPhoneIdentitySnap.empty, "Atomic webhook fixture lost its phone identity");
  const atomicPhone = String(atomicPhoneIdentitySnap.docs[0].data().value || "").replace(/\D/g, "");
  const deliveryPayload = {
    object: "whatsapp_business_account",
    entry: [{
      id: "waba_e2e",
      changes: [{
        field: "messages",
        value: {
          messaging_product: "whatsapp",
          statuses: [{ id: "wa_outbound_fixture", recipient_id: atomicPhone, status: "delivered", timestamp: String(Math.floor(Date.now() / 1000)) }],
        },
      }],
    }],
  };
  const deliveryRawBody = JSON.stringify(deliveryPayload);
  const deliveryResult = await processSignalDeskProviderWebhook({
    provider: "whatsapp",
    rawBody: deliveryRawBody,
    requestHeaders: metaWebhookHeaders(deliveryRawBody),
  });
  assert(deliveryResult.status === "processed", "WhatsApp delivery status did not resolve its target");
  const providerMessageCountAfterStatus = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGES, (data) => data.targetId === atomicTargetId);
  assert(providerMessageCountAfterStatus === providerMessageCountBeforeStatus, "WhatsApp delivery status was stored as an inbound human reply");
  const afterDeliveryTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(atomicTargetId).get();
  assert(afterDeliveryTargetSnap.data()?.ownerQualifiedAt, "WhatsApp delivery status erased owner-qualified state");

  const emailStatusMessageCountBefore = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGES, (data) => data.targetId === atomicTargetId);
  const emailDeliveryResult = await processSignalDeskProviderWebhook({
    provider: "email",
    rawBody: JSON.stringify({ event: "email.delivered", messageId: "email_status_shared_message", targetId: atomicTargetId }),
    requestHeaders: headers,
  });
  const emailOpenedResult = await processSignalDeskProviderWebhook({
    provider: "email",
    rawBody: JSON.stringify({ event: "email.opened", messageId: "email_status_shared_message", targetId: atomicTargetId }),
    requestHeaders: headers,
  });
  assert(emailDeliveryResult.status === "processed" && emailOpenedResult.status === "processed", "Email status callbacks sharing one message ID collided");
  const emailStatusMessageCountAfter = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGES, (data) => data.targetId === atomicTargetId);
  assert(emailStatusMessageCountAfter === emailStatusMessageCountBefore, "Email delivery status was stored as an inbound human reply");

  const batchMessageCountBefore = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGES, (data) => data.targetId === atomicTargetId);
  const batchedPayload = {
    object: "whatsapp_business_account",
    entry: [{
      id: "waba_e2e",
      changes: [{
        field: "messages",
        value: {
          messaging_product: "whatsapp",
          messages: [
            { from: atomicPhone, id: "wa_batch_message_1", timestamp: String(Math.floor(Date.now() / 1000)), type: "text", text: { body: "Yes, please share pricing." } },
            { from: atomicPhone, id: "wa_batch_message_2", timestamp: String(Math.floor(Date.now() / 1000) + 1), type: "image" },
          ],
        },
      }],
    }],
  };
  const batchedRawBody = JSON.stringify(batchedPayload);
  const batchedResult = await processSignalDeskProviderWebhook({
    provider: "whatsapp",
    rawBody: batchedRawBody,
    requestHeaders: metaWebhookHeaders(batchedRawBody),
  });
  assert(batchedResult.eventCount === 2 && batchedResult.processedCount === 2, "Batched WhatsApp webhook did not process every event");
  const batchMessageCountAfter = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGES, (data) => data.targetId === atomicTargetId);
  assert(batchMessageCountAfter === batchMessageCountBefore + 2, "Batched WhatsApp webhook dropped an inbound message");
  const nonTextMessageSnap = await db.collection(SIGNALDESK_COLLECTIONS.MESSAGES).doc(`message_${hashValue(`webhook_whatsapp_${hashValue("wa_batch_message_2").slice(0, 40)}`).slice(0, 32)}`).get();
  assert(nonTextMessageSnap.data()?.body === "[image message]", "Non-text WhatsApp message was silently discarded");

  const instagramPolicy = await createPolicy("Instagram webhook shape");
  const instagramTargetId = await importOne(instagramPolicy.sourcePolicyId, "InstagramWebhook", { instagram: "owner_igsid_fixture" });
  const instagramPayload = {
    object: "instagram",
    entry: [{
      id: "instagram_business_fixture",
      time: Date.now(),
      messaging: [{
        sender: { id: "owner_igsid_fixture" },
        recipient: { id: "instagram_business_fixture" },
        timestamp: Date.now(),
        message: { mid: "instagram_mid_fixture", text: "Yes, I am interested." },
      }],
    }],
  };
  const instagramRawBody = JSON.stringify(instagramPayload);
  const instagramResult = await processSignalDeskProviderWebhook({
    provider: "instagram",
    rawBody: instagramRawBody,
    requestHeaders: metaWebhookHeaders(instagramRawBody),
  });
  assert(instagramResult.status === "processed", "Instagram messaging webhook shape was not processed");
  const instagramTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(instagramTargetId).get();
  assert(instagramTargetSnap.data()?.ownerQualifiedAt, "Instagram interested reply did not project owner-qualified intent");

  const messengerPolicy = await createPolicy("Messenger webhook shape");
  const messengerTargetId = await importOne(messengerPolicy.sourcePolicyId, "MessengerWebhook");
  await db.collection(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES).doc(`messenger_${hashValue("messenger_psid_fixture")}`).set({
    channel: "messenger",
    identityId: `messenger_${hashValue("messenger_psid_fixture")}`,
    permissionState: "permissioned",
    targetId: messengerTargetId,
    updatedAt: timestampNow(),
    value: "messenger_psid_fixture",
  });
  const messengerPayload = {
    object: "page",
    entry: [{
      id: "messenger_page_fixture",
      time: Date.now(),
      messaging: [{
        sender: { id: "messenger_psid_fixture" },
        recipient: { id: "messenger_page_fixture" },
        timestamp: Date.now(),
        message: { mid: "messenger_mid_fixture", text: "Please send the details." },
      }],
    }],
  };
  const messengerRawBody = JSON.stringify(messengerPayload);
  const messengerResult = await processSignalDeskProviderWebhook({
    provider: "messenger",
    rawBody: messengerRawBody,
    requestHeaders: metaWebhookHeaders(messengerRawBody),
  });
  assert(messengerResult.status === "processed", "Messenger messaging webhook shape was not processed");

  const unknownDncEmail = "unknown-opt-out@example.invalid";
  const unknownDncPayload = {
    email: unknownDncEmail,
    event: "email.reply",
    eventId: "unknown_dnc_fixture",
    message: "Stop. Do not contact me again.",
  };
  const unknownDncResult = await processSignalDeskProviderWebhook({
    provider: "email",
    rawBody: JSON.stringify(unknownDncPayload),
    requestHeaders: headers,
  });
  assert(unknownDncResult.status === "received", "Unresolved DNC webhook was not retained");
  const unknownSuppressionSnap = await db.collection(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER)
    .doc(`email_${hashValue(unknownDncEmail)}`)
    .get();
  assert(unknownSuppressionSnap.exists && unknownSuppressionSnap.data()?.targetId === null, "Unresolved DNC webhook did not create identity suppression");

  const unknownWhatsAppPhone = "15551239876";
  const unknownWhatsAppPayload = {
    object: "whatsapp_business_account",
    entry: [{
      id: "waba_e2e",
      changes: [{
        field: "messages",
        value: {
          messaging_product: "whatsapp",
          messages: [{
            from: unknownWhatsAppPhone,
            id: "wa_unknown_dnc_fixture",
            timestamp: String(Math.floor(Date.now() / 1000)),
            type: "text",
            text: { body: "Stop. Do not contact me again." },
          }],
        },
      }],
    }],
  };
  const unknownWhatsAppRawBody = JSON.stringify(unknownWhatsAppPayload);
  const unknownWhatsAppResult = await processSignalDeskProviderWebhook({
    provider: "whatsapp",
    rawBody: unknownWhatsAppRawBody,
    requestHeaders: metaWebhookHeaders(unknownWhatsAppRawBody),
  });
  assert(unknownWhatsAppResult.status === "received", "Unresolved WhatsApp DNC webhook was not retained");
  const unknownWhatsAppSuppressionSnap = await db.collection(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER)
    .doc(`phone_${hashValue(unknownWhatsAppPhone)}`)
    .get();
  assert(unknownWhatsAppSuppressionSnap.exists, "Unresolved WhatsApp DNC did not create canonical phone suppression");
  const futureImportPolicy = await createPolicy("WhatsApp suppression compatibility");
  const futureSuppressedTargetId = await importOne(futureImportPolicy.sourcePolicyId, "FutureWhatsAppSuppressed", {
    phone: `+${unknownWhatsAppPhone}`,
  });
  const futureSuppressedTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(futureSuppressedTargetId).get();
  assert(futureSuppressedTargetSnap.data()?.suppressionStatus === "suppressed", "Future +E.164 import bypassed canonical WhatsApp suppression");

  const conflictPayload = {
    email: "owner+happy@example.invalid",
    event: "email.reply",
    eventId: "email_target_conflict_fixture",
    message: "Interested",
    targetId: atomicTargetId,
  };
  await expectRejects("Webhook identity and supplied target conflict", () => processSignalDeskProviderWebhook({
    provider: "email",
    rawBody: JSON.stringify(conflictPayload),
    requestHeaders: headers,
  }), "signaldesk_webhook_target_conflict");

  const idempotencyPayload = {
    event: "email.reply",
    eventId: "email_changed_retry_fixture",
    message: "No, not interested.",
    targetId: atomicTargetId,
  };
  await processSignalDeskProviderWebhook({ provider: "email", rawBody: JSON.stringify(idempotencyPayload), requestHeaders: headers });
  await expectRejects("Webhook event ID cannot bind changed facts", () => processSignalDeskProviderWebhook({
    provider: "email",
    rawBody: JSON.stringify({ ...idempotencyPayload, message: "Yes, interested." }),
    requestHeaders: headers,
  }), "signaldesk_webhook_event_conflict");

  const orderedPolicy = await createPolicy("Webhook event ordering");
  const orderedTargetId = await importOne(orderedPolicy.sourcePolicyId, "WebhookOrdering");
  const newestTimestamp = Math.floor(Date.now() / 1000);
  await processSignalDeskProviderWebhook({
    provider: "email",
    rawBody: JSON.stringify({ event: "email.reply", eventId: "ordered_newest_fixture", message: "Yes, interested.", targetId: orderedTargetId, timestamp: newestTimestamp }),
    requestHeaders: headers,
  });
  await processSignalDeskProviderWebhook({
    provider: "email",
    rawBody: JSON.stringify({ event: "email.reply", eventId: "ordered_stale_fixture", message: "Not interested.", targetId: orderedTargetId, timestamp: newestTimestamp - 120 }),
    requestHeaders: headers,
  });
  const orderedConversationSnap = await db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES).doc(`conv_${orderedTargetId}`).get();
  assert(orderedConversationSnap.data()?.state === "interested", "Out-of-order webhook regressed the current conversation state");
  const staleMessageSnap = await db.collection(SIGNALDESK_COLLECTIONS.MESSAGES)
    .doc(`message_${hashValue(`webhook_email_${hashValue("ordered_stale_fixture").slice(0, 40)}`).slice(0, 32)}`)
    .get();
  assert(staleMessageSnap.data()?.isOutOfOrder === true, "Out-of-order webhook was not preserved as historical evidence");

  const sharedExternalId = "apify_shared_provider_event";
  const providerEventCountBefore = await expectCollectionCount(SIGNALDESK_COLLECTIONS.WEBHOOK_EVENTS, () => true);
  const emailShared = await processSignalDeskProviderWebhook({
    provider: "email",
    rawBody: JSON.stringify({ event: "email.delivered", eventId: sharedExternalId }),
    requestHeaders: headers,
  });
  const apifyShared = await processSignalDeskProviderWebhook({
    provider: "apify",
    rawBody: JSON.stringify({ eventType: "ACTOR.RUN.SUCCEEDED", runId: "shared_provider_event", runStatus: "SUCCEEDED" }),
    requestHeaders: new Headers({ "x-signaldesk-webhook-secret": process.env.MENULIST_SIGNALDESK_APIFY_WEBHOOK_SECRET }),
  });
  assert(emailShared.status === "received" && apifyShared.status === "received", "Provider-scoped webhook IDs collided");
  const providerEventCountAfter = await expectCollectionCount(SIGNALDESK_COLLECTIONS.WEBHOOK_EVENTS, () => true);
  assert(providerEventCountAfter === providerEventCountBefore + 2, "Provider-scoped webhook events did not persist independently");

  await expectRejects("Invalid provider target ID", () => processSignalDeskProviderWebhook({
    provider: "email",
    rawBody: JSON.stringify({ event: "email.reply", eventId: "invalid_target_fixture", message: "Interested", targetId: "../stores/unsafe" }),
    requestHeaders: headers,
  }), "signaldesk_webhook_target_conflict");

  const directDnc = await captureSignalDeskReplyServer(access, {
    channel: "email",
    message: "Stop. Do not contact me again.",
    targetId,
  });
  assert(directDnc.state === "dnc", "DNC reply was not classified as dnc");
  const dncSuppressionCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER, (data) => data.targetId === targetId && data.reason === "dnc");
  assert(dncSuppressionCount > 0, "DNC reply did not create suppression immediately");
}

async function assertOutcomeIntegrityAndProofPermissions() {
  const policy = await createPolicy("Outcome integrity");
  const targetId = await importOne(policy.sourcePolicyId, "OutcomeIntegrity", { currentListUrl: "" });
  await captureSignalDeskReplyServer(access, {
    channel: "email",
    message: "Yes, I want to review the preview.",
    targetId,
  });
  await expectRejects("Activation without integrity evidence", () => recordSignalDeskOutcomeServer(access, {
    channel: "manual",
    outcomeType: "two_surface_activation",
    source: "manual",
    targetId,
  }), "OUTCOME_IDEMPOTENCY_KEY_REQUIRED");
  await expectRejects("Activation with one surface", () => recordSignalDeskOutcomeServer(access, {
    ...activationFixture(targetId, "one-surface"),
    channel: "manual",
    outcomeType: "two_surface_activation",
    source: "manual",
    surfaces: ["qr"],
    targetId,
  }), "ACTIVATION_TWO_DISTINCT_SURFACES_REQUIRED");

  const validInput = {
    ...activationFixture(targetId, "idempotent"),
    channel: "manual",
    outcomeType: "two_surface_activation",
    source: "manual",
    targetId,
  };
  const first = await recordSignalDeskOutcomeServer(access, validInput);
  const duplicate = await recordSignalDeskOutcomeServer(access, validInput);
  assert(first.duplicate === false, "First activation outcome was treated as duplicate");
  assert(duplicate.duplicate === true, "Duplicate activation outcome was not deduped");
  await expectRejects("Conflicting activation idempotency reuse", () => recordSignalDeskOutcomeServer(access, {
    ...validInput,
    surfaces: ["qr", "instagram"],
  }), "OUTCOME_IDEMPOTENCY_CONFLICT");
  await expectRejects("Future activation timestamps", () => recordSignalDeskOutcomeServer(access, {
    ...activationFixture(targetId, "future-time"),
    channel: "manual",
    outcomeType: "two_surface_activation",
    ownerQualifiedAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    ownerReviewedAt: new Date(Date.now() + 11 * 60_000).toISOString(),
    source: "manual",
    targetId,
  }), "OUTCOME_TIMESTAMP_INVALID");
  const summarySnap = await db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES)
    .where("targetId", "==", targetId)
    .where("outcomeType", "==", "two_surface_activation")
    .get();
  assert(summarySnap.docs.reduce((sum, doc) => sum + Number(doc.data().count || 0), 0) === 1, "Duplicate activation incremented the summary");
  assert(summarySnap.docs.every((doc) => doc.data().integrityStatus === "owner-reviewed-manual"), "Manual activation lost owner-review integrity state");
  const activatedTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).get();
  assert(activatedTargetSnap.data()?.latestVerifiedActivationEvidenceRef === validInput.evidenceRef, "Target projection lost verified activation evidence");
  assert(new Set(activatedTargetSnap.data()?.latestVerifiedActivationSurfaces || []).size === 2, "Target projection lost distinct activation surfaces");
  await recordSignalDeskOutcomeServer(access, {
    channel: "manual",
    idempotencyKey: `post-activation:${targetId}`,
    outcomeType: "published",
    ownerQualifiedAt: validInput.ownerQualifiedAt,
    source: "manual",
    targetId,
  });
  const postActivationTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).get();
  assert(postActivationTargetSnap.data()?.status === "converted", "A later outcome downgraded a verified activation");
  const activationWatch = await refreshSignalDeskActivationWatchServer(access, { targetId });
  const projectedOwnerQualifiedAt = postActivationTargetSnap.data()?.ownerQualifiedAt?.toDate?.().getTime?.();
  const watchDeadlineAt = new Date(activationWatch.deadlineAt).getTime();
  assert(
    projectedOwnerQualifiedAt && Math.abs(watchDeadlineAt - projectedOwnerQualifiedAt - (7 * 24 * 60 * 60 * 1000)) < 1000,
    `Activation clock did not start from owner-qualified intent (${projectedOwnerQualifiedAt || "missing"} -> ${watchDeadlineAt || "missing"})`,
  );
  const projectedWorkspace = await loadSignalDeskWorkspaceServer(access, "dashboard");
  const projectedOpportunity = projectedWorkspace.workspace.activationOpportunities.find((opportunity) => opportunity.targetId === targetId);
  assert(projectedOpportunity?.state === "activated", "Activation opportunity did not use the durable verified-activation projection");

  const legacyTargetId = await importOne(policy.sourcePolicyId, "LegacyActivation", { currentListUrl: "" });
  await captureSignalDeskReplyServer(access, {
    channel: "email",
    message: "Interested in a preview.",
    targetId: legacyTargetId,
  });
  await db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES).doc(`legacy_activation_${legacyTargetId}`).set({
    channel: "manual",
    count: 1,
    day: new Date().toISOString().slice(0, 10),
    outcomeSummaryId: `legacy_activation_${legacyTargetId}`,
    outcomeType: "two_surface_activation",
    pId: "SD",
    source: "manual",
    targetId: legacyTargetId,
    updatedAt: timestampNow(),
  });
  const legacyWatch = await refreshSignalDeskActivationWatchServer(access, { targetId: legacyTargetId });
  assert(legacyWatch.status !== "activated", "Legacy unverified activation closed an activation watch");
  assert(!legacyWatch.outcomeTypes.includes("two_surface_activation"), "Legacy unverified activation appeared as verified outcome evidence");

  await expectRejects("Customer proof without permission", () => createSignalDeskContentAssetServer(access, {
    canonicalMessage: "An owner-approved proof message for the local activation cohort.",
    primaryAudience: "restaurant-owner",
    proofLevel: "customer-proof",
    proofScopes: ["business-name"],
    riskNotes: [],
    sourceNotes: "Local E2E proof fixture.",
    sourceType: "customer-story",
    title: "Unpermissioned customer proof",
  }), "PROOF_PERMISSION_REQUIRED");
  const permission = await upsertSignalDeskProofPermissionServer(access, {
    evidenceRef: `consent:${targetId}`,
    expiresAt: futureIso(30),
    scopes: ["business-name", "before-after-screenshots"],
    status: "active",
    targetId,
  });
  const asset = await createSignalDeskContentAssetServer(access, {
    canonicalMessage: "An owner-approved proof message for the local activation cohort.",
    primaryAudience: "restaurant-owner",
    proofLevel: "customer-proof",
    proofPermissionId: permission.proofPermissionId,
    proofScopes: ["business-name", "before-after-screenshots"],
    riskNotes: [],
    sourceNotes: "Local E2E proof fixture.",
    sourceType: "customer-story",
    title: "Permissioned customer proof",
  });
  assert(asset.status === "ready", "Permissioned customer proof did not become ready");
  const drafts = await generateSignalDeskContentDistributionDraftsServer(access, {
    channels: ["linkedin"],
    contentAssetId: asset.contentAssetId,
  });
  assert(drafts.length === 1, "Permissioned proof did not generate one review-gated draft");
  await upsertSignalDeskProofPermissionServer(access, {
    evidenceRef: `consent-narrowed:${targetId}`,
    proofPermissionId: permission.proofPermissionId,
    scopes: ["business-name"],
    status: "active",
    targetId,
  });
  await expectRejects("Customer proof outside narrowed scope", () => generateSignalDeskContentDistributionDraftsServer(access, {
    channels: ["email"],
    contentAssetId: asset.contentAssetId,
  }), "PROOF_PERMISSION_SCOPE_NOT_ALLOWED");
  await upsertSignalDeskProofPermissionServer(access, {
    evidenceRef: `consent-revoked:${targetId}`,
    proofPermissionId: permission.proofPermissionId,
    scopes: permission.scopes,
    status: "revoked",
    targetId,
  });
  await expectRejects("Customer proof after revocation", () => generateSignalDeskContentDistributionDraftsServer(access, {
    channels: ["email"],
    contentAssetId: asset.contentAssetId,
  }), "PROOF_PERMISSION_REQUIRED");
}

async function assertSignedOutcomeBridge() {
  const policy = await createPolicy("Signed outcome bridge");
  const targetId = await importOne(policy.sourcePolicyId, "SignedBridge", { currentListUrl: "" });
  await captureSignalDeskReplyServer(access, {
    channel: "email",
    message: "Yes, please prepare the owner review route.",
    targetId,
  });
  const route = await createSignalDeskRouteTokenServer(access, {
    channel: "email",
    targetId,
  });
  const storedRoute = await db.collection(SIGNALDESK_COLLECTIONS.ROUTE_TOKENS).doc(route.routeTokenId).get();
  assert(storedRoute.exists, "Signed bridge route token record was not stored");
  assert(!storedRoute.data()?.token, "Raw invitation token was stored in Firestore");
  assert(storedRoute.data()?.tokenHash === hashValue(route.token), "Stored invitation token hash does not match");
  assert(storedRoute.data()?.scope === SIGNALDESK_OUTCOME_ROUTE_SCOPE, "Signed bridge route token scope was not stored");
  assert(storedRoute.data()?.sourceActionId, "Signed bridge route token lost its source action attribution");
  assert(storedRoute.data()?.revokedAt === null, "New signed bridge route token was created revoked");

  const payload = {
    evidenceRef: `menulist-event:${targetId}`,
    eventId: `menulist_event_${targetId}`,
    outcomeType: "two_surface_activation",
    ownerQualifiedAt: new Date(Date.now() - 60_000).toISOString(),
    ownerReviewedAt: new Date().toISOString(),
    routeToken: route.token,
    surfaces: ["qr", "google-profile"],
    targetId,
  };
  const rawBody = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const headers = signedOutcomeHeaders(rawBody, timestamp);
  const first = await processSignalDeskOutcomeBridge({ rawBody, requestHeaders: headers });
  const duplicate = await processSignalDeskOutcomeBridge({ rawBody, requestHeaders: headers });
  assert(first.status === "processed", "Signed MenuList outcome was not processed");
  assert(duplicate.status === "duplicate", "Signed MenuList outcome replay was not deduped");
  const outcomeSnap = await db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_EVENTS).doc(first.eventId).get();
  assert(outcomeSnap.data()?.routeTokenId === route.routeTokenId, "Signed outcome did not retain its route-token provenance");
  const touchId = `touch_${hashValue(first.eventId).slice(0, 32)}`;
  const touchSnap = await db.collection(SIGNALDESK_COLLECTIONS.ATTRIBUTION_TOUCHES).doc(touchId).get();
  assert(touchSnap.exists, "Signed outcome did not write its direct attribution touch");
  assert(touchSnap.data()?.actionId === storedRoute.data()?.sourceActionId, "Signed outcome attribution lost the route action");
  assert(touchSnap.data()?.method === "route-token-direct-v1", "Signed outcome attribution used the wrong method");
  assert(touchSnap.data()?.targetId === targetId, "Signed outcome attribution targeted the wrong account");
  const usedRouteSnap = await storedRoute.ref.get();
  assert(usedRouteSnap.data()?.lastOutcomeAt, "Signed outcome did not update route usage atomically");
  assert(usedRouteSnap.data()?.lastOutcomeEventIdHash === hashValue(payload.eventId), "Signed outcome route usage stored the wrong event hash");

  const revocation = await revokeSignalDeskRouteTokenServer(access, {
    reason: "Local E2E route-token revocation fixture.",
    routeTokenId: route.routeTokenId,
  });
  assert(revocation.duplicate === false && revocation.status === "revoked", "Signed bridge route token was not revoked");
  const replayAfterRevocation = await processSignalDeskOutcomeBridge({ rawBody, requestHeaders: headers });
  assert(replayAfterRevocation.status === "duplicate", "Exact signed outcome retry was rejected after route revocation");
  const newEventPayload = { ...payload, eventId: `${payload.eventId}_after_revocation` };
  const newEventRawBody = JSON.stringify(newEventPayload);
  await expectRejects("New signed outcome after route revocation", () => processSignalDeskOutcomeBridge({
    rawBody: newEventRawBody,
    requestHeaders: signedOutcomeHeaders(newEventRawBody),
  }), "Invalid SignalDesk route token");
  const duplicateRevocation = await revokeSignalDeskRouteTokenServer(access, {
    reason: "Repeated local E2E route-token revocation fixture.",
    routeTokenId: route.routeTokenId,
  });
  assert(duplicateRevocation.duplicate === true, "Repeated route-token revocation was not idempotent");

  const unknownFieldPayload = { ...payload, unexpectedField: "must-be-rejected" };
  const unknownFieldRawBody = JSON.stringify(unknownFieldPayload);
  await expectRejects("Unknown outcome bridge payload field", () => processSignalDeskOutcomeBridge({
    rawBody: unknownFieldRawBody,
    requestHeaders: signedOutcomeHeaders(unknownFieldRawBody),
  }), "Invalid SignalDesk outcome bridge payload");
  await expectRejects("Invalid outcome bridge signature", () => processSignalDeskOutcomeBridge({
    rawBody,
    requestHeaders: new Headers({
      "x-signaldesk-outcome-signature": "sha256=invalid",
      "x-signaldesk-outcome-timestamp": timestamp,
    }),
  }), "Invalid SignalDesk outcome bridge signature");
}

async function assertComplaintCircuitBreaker() {
  const policy = await createPolicy("Complaint circuit breaker");
  const targetId = await importOne(policy.sourcePolicyId, "ComplaintCircuit", { currentListUrl: "" });
  await db.collection(SIGNALDESK_COLLECTIONS.RESEARCH_TABLE_ROWS).doc(`complaint_route_${targetId}`).set({
    actionabilityState: "actionable",
    allowedRoute: "email-export",
    allowedRouteReason: "Pre-complaint contact route fixture.",
    category: "restaurant",
    contactability: "ready",
    currentListGap: "missing-current-list",
    displayName: "Complaint route fixture",
    evidenceSummary: "Evidence fixture",
    enrichment: [],
    fitDecision: "pass",
    fitScore: 90,
    hardGateFailures: [],
    provider: "fhrs-fhis",
    recommendedChannel: "email-export",
    recommendedCta: "Private preview",
    recommendedMessageAngle: "Current menu link",
    recommendedNextAction: "score",
    researchRowId: `complaint_route_${targetId}`,
    researchRunId: "complaint_route_run",
    routePermissionState: "permissioned",
    sourcePolicyId: policy.sourcePolicyId,
    sourceRefs: [`source-policy:${policy.sourcePolicyId}`],
    targetId,
    updatedAt: timestampNow(),
  });
  const reply = await captureSignalDeskReplyServer(access, {
    channel: "email",
    message: "This is an unwanted message and I am making a complaint.",
    targetId,
  });
  assert(reply.state === "complaint", "Complaint reply was not classified as complaint");
  const suppressionCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER, (data) => data.targetId === targetId && data.reason === "complaint");
  assert(suppressionCount > 0, "Complaint did not create immediate suppression");
  const incidentCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.INCIDENTS, (data) => data.targetId === targetId && data.status === "open");
  assert(incidentCount > 0, "Complaint did not create an open incident");
  const pauseSnap = await db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc("scope_email").get();
  assert(pauseSnap.data()?.status === "active", "Complaint did not pause the email channel");
  const mission = await createSignalDeskDailyGrowthMissionServer(access);
  assert(mission.missionActions[0]?.label.includes("critical reply"), "Daily mission did not prioritize the critical reply before new approvals");
  const workspace = await loadSignalDeskWorkspaceServer(access, "mission");
  const revalidatedRow = workspace.workspace.researchTableRows.find((row) => row.targetId === targetId);
  const suppressedOpportunity = workspace.workspace.activationOpportunities.find((opportunity) => opportunity.targetId === targetId);
  assert(revalidatedRow?.allowedRoute === "none" && revalidatedRow?.routePermissionState === "blocked", "Suppression did not revoke the displayed research route");
  assert(suppressedOpportunity?.allowedRoute === "none" && suppressedOpportunity?.state === "suppressed", "Suppression did not revoke the activation-opportunity route");
}

async function assertNoMenuListTruthWrites() {
  for (const collectionName of ["stores", "menus", "projects", "billing"]) {
    const snap = await db.collection(collectionName).limit(1).get();
    assert(snap.empty, `SignalDesk E2E wrote MenuList truth collection ${collectionName}`);
  }
}

function inspectForSecrets(data, pathParts = []) {
  if (!data || typeof data !== "object") return;
  for (const [key, value] of Object.entries(data)) {
    const keyPath = [...pathParts, key].join(".");
    const normalizedKey = key.toLowerCase();
    assert(!["rawbody", "rawpayload", "providerpayload"].includes(normalizedKey), `Raw provider payload key stored at ${keyPath}`);
    if (!normalizedKey.endsWith("state")) {
      assert(!/(password|privatekey|webhooksecret|appsecret|accesstoken|apikey|smtp_pass|token|secret)$/i.test(key), `Secret-like key stored at ${keyPath}`);
    }
    if (value && typeof value === "object") inspectForSecrets(value, [...pathParts, key]);
  }
}

async function assertNoRawPayloadsOrSecrets() {
  for (const collectionName of Object.values(SIGNALDESK_COLLECTIONS)) {
    const snap = await db.collection(collectionName).limit(500).get();
    snap.docs.forEach((doc) => inspectForSecrets(doc.data(), [collectionName, doc.id]));
  }
}

async function main() {
  await cleanSignalDeskData();
  await seedAccessAndReadiness();

  await assertTeamAccessManagement();
  await assertImportDedupe();
  const happy = await assertHappyPath();
  await assertRevenueOperatingLayer();
  await assertSourcePolicyNegatives();
  await assertFhrsFhisSourceProvider();
  await assertResearchAgentTable();
  await assertExpiryAcrossWorkflow();
  await assertApprovalAndExportNegatives();
  await assertManualContactGuards();
  await assertUnverifiedLimitedRouteRevalidation();
  await assertAiShadowReviewLearning();
  await assertAiVolumeMode();
  await assertMobileReadOnlyContract();
  await assertOutcomeIntegrityAndProofPermissions();
  await assertSignedOutcomeBridge();
  await assertComplaintCircuitBreaker();
  await assertWebhookAndDncFixtures(happy.targetId);
  await assertNoMenuListTruthWrites();
  await assertNoRawPayloadsOrSecrets();

  console.log("SignalDesk local E2E passed");
}

main()
  .catch((error) => {
    console.error("SignalDesk local E2E failed");
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exit(1);
  });
