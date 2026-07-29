process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.SIGNALDESK_FIREBASE_MODE = process.env.SIGNALDESK_FIREBASE_MODE || "separate";
process.env.SIGNALDESK_FIREBASE_PROJECT_ID = process.env.SIGNALDESK_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "demo-signaldesk";
process.env.NEXT_PUBLIC_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_SIGNALDESK_FIREBASE_PROJECT_ID || process.env.SIGNALDESK_FIREBASE_PROJECT_ID;
process.env.SIGNALDESK_EMAIL_WEBHOOK_SECRET = process.env.SIGNALDESK_EMAIL_WEBHOOK_SECRET || "local-signaldesk-webhook-secret";
process.env.SIGNALDESK_APIFY_WEBHOOK_SECRET = process.env.SIGNALDESK_APIFY_WEBHOOK_SECRET || "local-signaldesk-apify-webhook-secret";
process.env.SIGNALDESK_OUTCOME_BRIDGE_SECRET = process.env.SIGNALDESK_OUTCOME_BRIDGE_SECRET || "local-signaldesk-outcome-bridge-secret";
process.env.SIGNALDESK_META_APP_SECRET = process.env.SIGNALDESK_META_APP_SECRET || "local-signaldesk-meta-app-secret";

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
const nodemailer = require("nodemailer9");
const path = require("path");
const { DB_COLLECTIONS } = require("@constant/database");
const { SIGNALDESK_COLLECTIONS, SIGNALDESK_SUMMARY_DOCS } = require("@constant/signaldesk/database");
const { SIGNALDESK_OUTCOME_ROUTE_SCOPE } = require("@constant/signaldesk/integrations");
const { SIGNALDESK_PRODUCT_CODE } = require("@constant/signaldesk/product");
const { FEATURE_FLAGS } = require("@config/features");
const { firestoreAdmin } = require("@lib/firebase/firebaseAdmin");
const { admin, signaldeskFirestoreAdmin } = require("@lib/firebase/signaldeskFirebaseAdmin");
const { isSignalDeskMobileRequest } = require("@lib/signaldesk/apiGuards");
const { getSignalDeskAccessContext } = require("@lib/signaldesk/access");
const { parseSignalDeskDailyCostDocument } = require("@lib/signaldesk/accountingContracts");
const { signalDeskOutcomeSummaryIdFor } = require("@lib/signaldesk/outcomeContracts");
const {
  projectSignalDeskControlRoomDocument,
  projectSignalDeskQueueDocument,
  recordSignalDeskMobileActionBlockedServer,
} = require("@lib/signaldesk/server");
const {
  canApplySignalDeskWebhookInboundToTarget,
  parseSignalDeskWebhookTargetLifecycleState,
  signalDeskWebhookContactIdentityIdFor,
} = require("@lib/signaldesk/webhookContracts");
const { processSignalDeskProviderWebhook } = require("@lib/signaldesk/webhookServer");
const signalDeskAiProvider = require("@lib/signaldesk/aiProvider");
const signalDeskProviderAdapters = require("@lib/signaldesk/providerAdapters");
const { parseSignalDeskTargetImportCsv } = require("@lib/signaldesk/csvImport");
const { runSignalDeskSourceProvider } = require("@lib/signaldesk/sourceProviders");
const {
  SignalDeskSourcePolicyCreateSchema,
  SignalDeskSourcePolicyRenewSchema,
} = require("@lib/signaldesk/sourcePolicyContracts");
const {
  parseSignalDeskContactIdentityDocument,
  parseSignalDeskIdentityIndexDocument,
  parseSignalDeskResearchRowDocument,
  parseSignalDeskResearchRunDocument,
  parseSignalDeskSourceCandidateDocument,
  parseSignalDeskTargetDetailDocument,
  parseSignalDeskTargetScoreDocument,
  parseSignalDeskTargetSummaryDocument,
} = require("@lib/signaldesk/targetContracts");
const {
  captureSignalDeskDemandSignalServer,
  captureSignalDeskReplyServer,
  createSignalDeskApprovalPacketServer,
  createSignalDeskDailyGrowthMissionServer,
  createSignalDeskDraftServer,
  createSignalDeskEvidenceServer,
  createSignalDeskExperimentCardServer,
  createSignalDeskProviderEvaluationServer,
  createSignalDeskResearchAgentRunServer,
  createSignalDeskRouteTokenServer,
  createSignalDeskSequencerHandoffServer,
  createSignalDeskSourcePolicyServer,
  createSignalDeskTrustPartnerBriefServer,
  createSignalDeskTrustPartnerNicheTestServer,
  createSignalDeskWeeklyStrategistMemoServer,
  exportSignalDeskMessageServer,
  importSignalDeskTargetsServer,
  loadSignalDeskWorkspaceServer,
  prepareSignalDeskChannelHandoffServer,
  qualifySignalDeskRevenueAccountServer,
  recommendSignalDeskMarketPodPlanServer,
  recordSignalDeskManualContactServer,
  recordSignalDeskContentPerformanceServer,
  recordSignalDeskOutcomeServer,
  recordSignalDeskTrustPartnerMetricsServer,
  recordSignalDeskTrustPartnerDeliverableServer,
  refreshSignalDeskActivationWatchServer,
  refreshSignalDeskProviderSourceRetentionServer,
  renewSignalDeskSourcePolicyServer,
  revokeSignalDeskRouteTokenServer,
  reviewSignalDeskApprovalServer,
  reviewSignalDeskAiShadowRunServer,
  reviewSignalDeskContentAssetServer,
  reviewSignalDeskContentDistributionDraftServer,
  reviewSignalDeskExperimentCardServer,
  reviewSignalDeskGrowthMissionServer,
  reviewSignalDeskMarketPodServer,
  reviewSignalDeskTrustPartnerDealServer,
  reviewSignalDeskTrustPartnerRenewalServer,
  runSignalDeskAiAssistServer,
  runSignalDeskAiVolumeBatchServer,
  runSignalDeskEnrichmentWaterfallServer,
  runSignalDeskSourceProviderServer,
  scoreSignalDeskTargetServer,
  scheduleSignalDeskContentDistributionDraftServer,
  seedSignalDeskDefaultsServer,
  sendSignalDeskApprovedMessageServer,
  sendSignalDeskOwnedSequenceStepServer,
  createSignalDeskSourceQualitySnapshotServer,
  upsertSignalDeskChannelWindowStateServer,
  upsertSignalDeskAudienceSegmentServer,
  upsertSignalDeskBudgetPolicyServer,
  upsertSignalDeskEnrichmentWaterfallServer,
  upsertSignalDeskModelRouteServer,
  upsertSignalDeskProviderAccountServer,
  upsertSignalDeskCommercialOfferServer,
  upsertSignalDeskCommercialOpportunityServer,
  upsertSignalDeskConnectorSettingServer,
  upsertSignalDeskContentSourceServer,
  upsertSignalDeskProofPermissionServer,
  upsertSignalDeskSelfServiceCtaServer,
  createSignalDeskContentAssetServer,
  generateSignalDeskContentDistributionDraftsServer,
  upsertSignalDeskOperatingEnvelopeServer,
  upsertSignalDeskOfferCtaServer,
  upsertSignalDeskReplyPlaybookServer,
  upsertSignalDeskSenderDomainServer,
  upsertSignalDeskTeamMemberServer,
  upsertSignalDeskTrustPartnerProfileServer,
} = require("@lib/signaldesk/workflowServer");
const { processSignalDeskOutcomeBridge } = require("@lib/signaldesk/outcomeBridgeServer");
const { assertSignalDeskWorkspaceDocument } = require("@lib/signaldesk/workspaceContracts");

const db = signaldeskFirestoreAdmin;
const timestampNow = () => admin.firestore.Timestamp.now();
const activeKillSwitchFixture = (scope, reason = `Active ${scope} E2E safety pause.`) => {
  const timestamp = timestampNow();
  return {
    activatedAt: timestamp,
    activatedBy: access.userId,
    deactivatedAt: null,
    deactivatedBy: null,
    killSwitchId: `scope_${scope}`,
    pId: SIGNALDESK_PRODUCT_CODE,
    reason,
    scope,
    status: "active",
    updatedAt: timestamp,
    updatedBy: access.userId,
  };
};
const hashValue = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const senderDomainIdFor = (domain) => `sender_${hashValue(domain).slice(0, 18)}`;
const contentFixtureCtaId = "cta_private_preview_v1";
const contentFixtureCtaCopy = "If useful, I can send a private MenuList preview for your team to inspect.";
const contentFixtureCtaFingerprintHash = hashValue(JSON.stringify({
  copy: contentFixtureCtaCopy,
  ctaId: contentFixtureCtaId,
  ctaType: "preview",
  label: "Private preview",
  status: "active",
}));
const metaWebhookHeaders = (rawBody) => new Headers({
  "x-hub-signature-256": `sha256=${crypto.createHmac("sha256", process.env.SIGNALDESK_META_APP_SECRET).update(rawBody).digest("hex")}`,
});
const signedOutcomeHeaders = (rawBody, timestamp = String(Math.floor(Date.now() / 1000))) => new Headers({
  "x-signaldesk-outcome-signature": `sha256=${crypto.createHmac("sha256", process.env.SIGNALDESK_OUTCOME_BRIDGE_SECRET).update(`${timestamp}.${rawBody}`).digest("hex")}`,
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

const contentAssetFixture = (contentAssetId, overrides = {}) => ({
  canonicalMessage: "A complete persisted content asset used by the local SignalDesk verification rail.",
  contentAssetId,
  createdAt: timestampNow(),
  ctaId: contentFixtureCtaId,
  marketPodId: null,
  pId: "SD",
  primaryAudience: "restaurant-owner",
  proofLevel: "owned",
  proofPermissionId: null,
  proofScopes: [],
  riskNotes: [],
  sourceId: null,
  sourceNotes: "Local deterministic SignalDesk E2E fixture.",
  sourceType: "manual",
  sourceUrl: null,
  status: "ready",
  title: "Performance Asset",
  updatedAt: timestampNow(),
  updatedBy: access.userId,
  ...overrides,
});

const contentDraftFixture = (contentDraftId, contentAssetId, overrides = {}) => ({
  approvalStatus: "approved",
  body: "A complete approved distribution draft body for deterministic performance verification.",
  channel: "linkedin",
  contentAssetId,
  contentDraftId,
  createdAt: timestampNow(),
  ctaId: contentFixtureCtaId,
  ctaFingerprintHash: contentFixtureCtaFingerprintHash,
  hook: "A complete distribution hook.",
  pId: "SD",
  reviewReason: "Approved by the local SignalDesk verification rail.",
  scheduledFor: null,
  status: "approved",
  title: "Performance distribution draft",
  updatedAt: timestampNow(),
  updatedBy: access.userId,
  ...overrides,
});

const contentCalendarFixture = (contentDraftId, contentAssetId, overrides = {}) => {
  const contentCalendarItemId = `content_calendar_${contentDraftId}`;
  return {
    channel: "linkedin",
    contentAssetId,
    contentCalendarItemId,
    contentDraftId,
    createdAt: timestampNow(),
    pId: "SD",
    publishedAt: null,
    publicationUrl: null,
    scheduledFor: admin.firestore.Timestamp.fromDate(new Date(futureIso(1))),
    status: "queued",
    updatedAt: timestampNow(),
    updatedBy: access.userId,
    ...overrides,
  };
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let strictProjectionSentinelTargetId = null;
let activeE2eCheckpoint = null;

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
  const accessMemberTimestamp = timestampNow();
  await db.collection(SIGNALDESK_COLLECTIONS.TEAM_MEMBERS).doc(access.userId).set({
    active: true,
    email: access.email,
    emailLower: access.email,
    name: access.name,
    pId: SIGNALDESK_PRODUCT_CODE,
    permissions: [],
    role: access.role,
    status: "active",
    teamMemberId: access.userId,
    userId: access.userId,
    createdAt: accessMemberTimestamp,
    createdBy: access.userId,
    updatedAt: accessMemberTimestamp,
    updatedBy: access.userId,
  }, { merge: true });

  const canonicalPreviewRef = db.collection(SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS).doc(contentFixtureCtaId);
  const legacyPreviewRef = db.collection(SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS).doc("cta_preview");
  await legacyPreviewRef.set({
    copy: "Legacy owner-held private preview.",
    createdAt: timestampNow(),
    ctaId: legacyPreviewRef.id,
    ctaType: "preview",
    label: "Legacy private preview",
    pId: "SD",
    status: "hold",
    updatedAt: timestampNow(),
  });
  await seedSignalDeskDefaultsServer(access);
  const legacyOnlyCanonical = (await canonicalPreviewRef.get()).data();
  const legacyOnlyAlias = (await legacyPreviewRef.get()).data();
  assert(legacyOnlyCanonical?.copy === "Legacy owner-held private preview." && legacyOnlyCanonical?.status === "hold", "Legacy-only preview CTA migration did not preserve owner truth and held state");
  assert(legacyOnlyAlias?.canonicalCtaId === contentFixtureCtaId && legacyOnlyAlias?.identityAliasState === "migrated" && legacyOnlyAlias?.status !== "active", "Legacy-only preview CTA was not retired as a held alias");

  await Promise.all([canonicalPreviewRef.delete(), legacyPreviewRef.delete()]);
  const dualExactTimestamp = timestampNow();
  const dualExactTruth = {
    copy: contentFixtureCtaCopy,
    createdAt: dualExactTimestamp,
    ctaType: "preview",
    label: "Private preview",
    pId: "SD",
    status: "active",
    updatedAt: dualExactTimestamp,
  };
  await Promise.all([
    canonicalPreviewRef.set({ ...dualExactTruth, ctaId: canonicalPreviewRef.id }),
    legacyPreviewRef.set({ ...dualExactTruth, ctaId: legacyPreviewRef.id }),
  ]);
  await seedSignalDeskDefaultsServer(access);
  assert((await canonicalPreviewRef.get()).data()?.status === "active", "Exact dual-row preview CTA migration disabled valid canonical authority");
  assert((await legacyPreviewRef.get()).data()?.status !== "active", "Exact dual-row preview CTA migration left two active authorities");

  await Promise.all([canonicalPreviewRef.delete(), legacyPreviewRef.delete()]);
  const ambiguousTimestamp = timestampNow();
  await Promise.all([
    canonicalPreviewRef.set({ ...dualExactTruth, ctaId: canonicalPreviewRef.id, updatedAt: ambiguousTimestamp }),
    legacyPreviewRef.set({ ...dualExactTruth, copy: "Conflicting legacy preview truth.", ctaId: legacyPreviewRef.id, updatedAt: ambiguousTimestamp }),
  ]);
  await expectRejects("Ambiguous dual-row preview CTA seed", () => seedSignalDeskDefaultsServer(access), "CONTENT_CTA_LEGACY_IDENTITY_AMBIGUOUS");
  assert((await canonicalPreviewRef.get()).data()?.status === "hold", "Ambiguous preview CTA migration did not hold canonical authority");
  const identityIncidentSnap = await db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS)
    .where("incidentType", "==", "preview-cta-identity-ambiguity")
    .limit(1)
    .get();
  assert(!identityIncidentSnap.empty && identityIncidentSnap.docs[0].data().status === "open", "Ambiguous preview CTA migration did not create an operator-recovery incident");
  await identityIncidentSnap.docs[0].ref.set({ status: "acknowledged", updatedAt: timestampNow() }, { merge: true });
  await upsertSignalDeskSelfServiceCtaServer(access, {
    copy: contentFixtureCtaCopy,
    ctaType: "preview",
    idempotencyKey: "preview-cta-ambiguous-founder-recovery-v1",
    label: "Private preview",
    status: "active",
  });
  assert((await identityIncidentSnap.docs[0].ref.get()).data()?.status === "resolved", "Acknowledged preview CTA identity incident could not be resolved by explicit founder authority");
  const resolvedCanonicalCta = (await canonicalPreviewRef.get()).data();
  assert(resolvedCanonicalCta?.identityMigrationState === "migrated", "Founder CTA resolution did not close the canonical identity marker");
  assert(resolvedCanonicalCta?.identityMigrationResolvedBy === access.userId, "Founder CTA resolution did not record the resolving authority");
  assert(Boolean(resolvedCanonicalCta?.identityMigrationResolvedAt?.toMillis?.()), "Founder CTA resolution did not record a durable resolution timestamp");
  await identityIncidentSnap.docs[0].ref.set({ status: "acknowledged", updatedAt: timestampNow() }, { merge: true });
  const replayedFounderAuthority = await upsertSignalDeskSelfServiceCtaServer(access, {
    copy: contentFixtureCtaCopy,
    ctaType: "preview",
    idempotencyKey: "preview-cta-ambiguous-founder-recovery-v1",
    label: "Private preview",
    status: "active",
  });
  assert(replayedFounderAuthority.ctaId === contentFixtureCtaId, "Founder CTA replay did not return current canonical authority");
  assert((await identityIncidentSnap.docs[0].ref.get()).data()?.status === "resolved", "Exact founder CTA replay could not finish interrupted identity-incident resolution");
  const previewIdentityAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => String(data.action || "").startsWith("preview_cta_identity_"));
  const templateRef = db.collection(SIGNALDESK_COLLECTIONS.TEMPLATE_SUMMARIES).doc("template_current_list_intro_v1");
  const dailyCostRef = db.collection(SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES).doc(new Date().toISOString().slice(0, 10));
  await dailyCostRef.set({ legacyUnexpectedField: "must-be-removed" }, { merge: true });
  await templateRef.delete();
  const seedAuditCountBeforeConvergence = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.action === "seed_defaults");
  await Promise.all([
    seedSignalDeskDefaultsServer(access),
    seedSignalDeskDefaultsServer(access),
  ]);
  assert((await templateRef.get()).exists, "Concurrent default seeding did not converge the one missing template");
  const repairedDailyCostSnap = await dailyCostRef.get();
  const repairedDailyCost = parseSignalDeskDailyCostDocument(repairedDailyCostSnap.data(), repairedDailyCostSnap.id);
  assert(
    JSON.stringify(Object.keys(repairedDailyCost).sort()) === JSON.stringify([
      "aiCostEstimate",
      "day",
      "firestoreReadEstimate",
      "firestoreWriteEstimate",
      "pId",
      "providerCostEstimate",
      "updatedAt",
    ]),
    "Daily-cost authority projection exposed a non-authoritative legacy field",
  );
  assert(repairedDailyCost?.pId === "SD" && repairedDailyCost?.day === dailyCostRef.id, "Daily-cost writer did not restore canonical identity fields");
  const seedAuditCountAfterConvergence = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.action === "seed_defaults");
  assert(seedAuditCountAfterConvergence === seedAuditCountBeforeConvergence + 1, "Concurrent missing-row convergence emitted duplicate seed side effects");
  await templateRef.set({ stalePrivateField: "must-be-removed" }, { merge: true });
  await seedSignalDeskDefaultsServer(access);
  assert((await templateRef.get()).data()?.stalePrivateField === undefined, "Default template refresh retained stale fields");
  const seedAuditCountAfterTemplateRepair = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.action === "seed_defaults");
  assert(seedAuditCountAfterTemplateRepair === seedAuditCountAfterConvergence + 1, "Template shape repair did not emit one seed settlement");
  const seedTimelineRef = db.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES).doc("market-pod_defaults");
  const seedTimelineBeforeCleanReplay = (await seedTimelineRef.get()).data()?.updatedAt?.toMillis?.();
  const seedCostBeforeCleanReplay = (await dailyCostRef.get()).data()?.firestoreWriteEstimate;
  await Promise.all([
    seedSignalDeskDefaultsServer(access),
    seedSignalDeskDefaultsServer(access),
  ]);
  const seedAuditCountAfterCleanReplay = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.action === "seed_defaults");
  assert(seedAuditCountAfterCleanReplay === seedAuditCountAfterTemplateRepair, "Clean concurrent seed replay emitted a seed audit side effect");
  assert((await seedTimelineRef.get()).data()?.updatedAt?.toMillis?.() === seedTimelineBeforeCleanReplay, "Clean concurrent seed replay rewrote the seed timeline");
  assert((await dailyCostRef.get()).data()?.firestoreWriteEstimate === seedCostBeforeCleanReplay, "Clean concurrent seed replay inflated the Firestore write estimate");
  const previewIdentityReplayAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => String(data.action || "").startsWith("preview_cta_identity_"));
  assert(previewIdentityReplayAuditCount === previewIdentityAuditCount, "Exact preview CTA seed replay duplicated identity audit or cost work");
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
  const providerAccountRegistrySnap = await db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).get();
  assert(providerAccountRegistrySnap.size === 18, "Default seeding did not create the complete 18-account provider registry");
  const providerBudgetRegistrySnap = await db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).get();
  assert(providerBudgetRegistrySnap.docs.filter((doc) => doc.data().scope === "provider").length === 17, "Default seeding did not create the 17 deduplicated provider budgets");
  const ownedEmailSenderRef = db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_owned-email_sender");
  const ownedEmailSender = (await ownedEmailSenderRef.get()).data();
  assert(ownedEmailSender?.status === "disabled" && ownedEmailSender?.credentialState === "missing", "Owned-email sender authority was admitted before credentials and sender-domain controls");
  assert(ownedEmailSender?.ownerApproved === false && ownedEmailSender?.dailyBudgetUsd === 0 && ownedEmailSender?.monthlyBudgetUsd === 0, "Owned-email sender authority received default approval or spend");
  const ownedEmailBudgetRef = db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc("budget_provider_owned-email_default");
  const ownedEmailBudget = (await ownedEmailBudgetRef.get()).data();
  assert(ownedEmailBudget?.status === "hold" && ownedEmailBudget?.dailyBudgetUsd === 0 && ownedEmailBudget?.monthlyBudgetUsd === 0, "Shared owned-email budget ignored the disabled sender authority");
  const operatorBudgetUpdatedAt = admin.firestore.Timestamp.fromMillis(Date.now() - 90_000);
  await ownedEmailBudgetRef.set({
    dailyBudgetUsd: 12,
    monthlyBudgetUsd: 120,
    perRunBudgetUsd: 1,
    spentMonthUsd: 8,
    spentTodayUsd: 2,
    status: "active",
    updatedAt: operatorBudgetUpdatedAt,
    updatedBy: "founder-budget-owner",
  }, { merge: true });
  await seedSignalDeskDefaultsServer(access);
  const preservedOwnedEmailBudget = (await ownedEmailBudgetRef.get()).data();
  assert(preservedOwnedEmailBudget?.status === "active" && preservedOwnedEmailBudget?.dailyBudgetUsd === 12 && preservedOwnedEmailBudget?.spentTodayUsd === 2, "Default seeding overwrote current provider budget authority or spend");
  assert(preservedOwnedEmailBudget?.updatedAt?.toMillis?.() === operatorBudgetUpdatedAt.toMillis(), "Default seeding rewrote provider budget ownership metadata");
  const operatorProviderRef = db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_lemlist_sequencer");
  const operatorProviderUpdatedAt = admin.firestore.Timestamp.fromMillis(Date.now() - 75_000);
  await operatorProviderRef.set({
    dailyBudgetUsd: 2,
    disabledReason: "Founder-owned bounded sequencer evaluation remains disabled pending sender authority.",
    monthlyBudgetUsd: 20,
    perRunBudgetUsd: 0.5,
    spentMonthUsd: 3,
    spentTodayUsd: 1,
    updatedAt: operatorProviderUpdatedAt,
    updatedBy: "founder-provider-owner",
  }, { merge: true });
  await seedSignalDeskDefaultsServer(access);
  const preservedOperatorProvider = (await operatorProviderRef.get()).data();
  assert(preservedOperatorProvider?.dailyBudgetUsd === 2 && preservedOperatorProvider?.spentTodayUsd === 1, "Default seeding overwrote current provider-account budget or spend truth");
  assert(preservedOperatorProvider?.disabledReason === "Founder-owned bounded sequencer evaluation remains disabled pending sender authority.", "Default seeding overwrote the current provider disable reason");
  assert(preservedOperatorProvider?.updatedAt?.toMillis?.() === operatorProviderUpdatedAt.toMillis(), "Default seeding rewrote provider-account ownership metadata");
  await operatorProviderRef.set({ pId: "AL" }, { merge: true });
  await expectRejects("Foreign provider collision", () => seedSignalDeskDefaultsServer(access), "PROVIDER_ACCOUNT_PRODUCT_MISMATCH");
  await operatorProviderRef.set(preservedOperatorProvider);
  await operatorProviderRef.set({ dailyBudgetUsd: "2" }, { merge: true });
  await expectRejects("Malformed provider collision", () => seedSignalDeskDefaultsServer(access), "PROVIDER_ACCOUNT_SHAPE_INVALID");
  await operatorProviderRef.set(preservedOperatorProvider);
  const legacyScoreRouteRef = db.collection(SIGNALDESK_COLLECTIONS.MODEL_ROUTES).doc("model_route_score");
  const legacyScoreCreatedAt = admin.firestore.Timestamp.fromMillis(Date.now() - 60_000);
  await legacyScoreRouteRef.set({
    confidenceThreshold: "medium",
    createdAt: legacyScoreCreatedAt,
    defaultModel: "gemini-2.5-flash",
    defaultProvider: "gemini",
    escalationModel: "gpt-5-mini",
    escalationProvider: "openai",
    maxCostUsd: 0.05,
    modelRouteId: legacyScoreRouteRef.id,
    pId: SIGNALDESK_PRODUCT_CODE,
    status: "active",
    task: "score",
    updatedAt: timestampNow(),
    updatedBy: access.userId,
  });
  await seedSignalDeskDefaultsServer(access);
  const migratedScoreRoute = (await legacyScoreRouteRef.get()).data();
  assert(migratedScoreRoute?.defaultModel === "gemini-3.5-flash-lite", "Exact legacy score route was not migrated to the current fast model");
  assert(migratedScoreRoute?.escalationProvider === "gemini" && migratedScoreRoute?.escalationModel === "gemini-3.6-flash", "Exact legacy score route retained stale cross-provider escalation");
  assert(migratedScoreRoute?.createdAt?.toMillis?.() === legacyScoreCreatedAt.toMillis(), "Exact legacy score migration rewrote creation ownership");
  const legacyEvidenceRouteRef = db.collection(SIGNALDESK_COLLECTIONS.MODEL_ROUTES).doc("model_route_evidence");
  const nearLegacyEvidenceRoute = {
    confidenceThreshold: "medium",
    createdAt: admin.firestore.Timestamp.fromMillis(Date.now() - 55_000),
    defaultModel: "gemini-2.5-flash",
    defaultProvider: "gemini",
    escalationModel: "gpt-5-mini",
    escalationProvider: "openai",
    maxCostUsd: 0.05,
    modelRouteId: legacyEvidenceRouteRef.id,
    ownerMarker: "founder-preserve-route",
    pId: SIGNALDESK_PRODUCT_CODE,
    status: "active",
    task: "evidence",
    updatedAt: timestampNow(),
    updatedBy: access.userId,
  };
  await legacyEvidenceRouteRef.set(nearLegacyEvidenceRoute);
  await seedSignalDeskDefaultsServer(access);
  const preservedNearLegacyEvidenceRoute = (await legacyEvidenceRouteRef.get()).data();
  assert(preservedNearLegacyEvidenceRoute?.defaultModel === "gemini-2.5-flash" && preservedNearLegacyEvidenceRoute?.ownerMarker === "founder-preserve-route", "Near-match model route was mistaken for an exact legacy seed");
  await legacyEvidenceRouteRef.delete();
  await seedSignalDeskDefaultsServer(access);
  assert((await legacyEvidenceRouteRef.get()).data()?.defaultModel === "gemini-3.5-flash-lite", "Missing evidence route did not converge to the current default");
  const firstPodSnap = await db.collection(SIGNALDESK_COLLECTIONS.MARKET_PODS).doc("market_pod_first_local_v1").get();
  assert(firstPodSnap.data()?.status === "hold", "Recommended first pod bypassed founder approval");
  assert(firstPodSnap.data()?.city === "Bengaluru - Indiranagar and Koramangala", "Recommended first pod drifted from the Bengaluru trial boundary");
  assert(firstPodSnap.data()?.monthlyBudgetUsd === 0, "Recommended first pod pre-approved spend");
  const defaultContentSourceRef = db.collection(SIGNALDESK_COLLECTIONS.CONTENT_SOURCES).doc("content_source_menulist_owned_proof_v1");
  const defaultContentSourceSnap = await defaultContentSourceRef.get();
  assert(defaultContentSourceSnap.data()?.status === "hold", "Default content source advanced before founder pod approval");
  const preservedLastAssetAt = admin.firestore.Timestamp.fromMillis(Date.now() - 120_000);
  await defaultContentSourceRef.delete();
  const contentPauseRef = db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc("scope_content-distribution");
  await contentPauseRef.set(activeKillSwitchFixture("content-distribution"));
  await seedSignalDeskDefaultsServer(access);
  assert(!(await defaultContentSourceRef.get()).exists, "Default seeding created a content source while distribution was paused");
  await contentPauseRef.delete();
  const heldPodTruth = firstPodSnap.data();
  await firstPodSnap.ref.set({
    ...heldPodTruth,
    approvedBy: access.userId,
    reviewDecision: "approved",
    status: "active",
    updatedAt: timestampNow(),
  });
  await expectRejects("Malformed active default pod", () => seedSignalDeskDefaultsServer(access), "MARKET_POD_SHAPE_INVALID");
  assert(!(await defaultContentSourceRef.get()).exists, "Malformed active pod caused default content-source activation");
  await firstPodSnap.ref.set(heldPodTruth);
  await seedSignalDeskDefaultsServer(access);
  const restoredDefaultSourceSnap = await defaultContentSourceRef.get();
  assert(restoredDefaultSourceSnap.data()?.status === "hold", "Restored default content source bypassed founder review");
  const restoredCreatedAt = restoredDefaultSourceSnap.data()?.createdAt?.toMillis?.();
  const restoredDefaultSourceTruth = restoredDefaultSourceSnap.data();
  await defaultContentSourceRef.set({ pId: "AL" }, { merge: true });
  await expectRejects("Foreign default content-source collision", () => seedSignalDeskDefaultsServer(access), "CONTENT_SOURCE_PRODUCT_MISMATCH");
  await defaultContentSourceRef.set(restoredDefaultSourceTruth);
  await defaultContentSourceRef.set({ sourceType: "provider" }, { merge: true });
  await expectRejects("Malformed default content-source collision", () => seedSignalDeskDefaultsServer(access), "CONTENT_SOURCE_SHAPE_INVALID");
  await defaultContentSourceRef.set(restoredDefaultSourceTruth);
  await defaultContentSourceRef.update({ contentSourceId: admin.firestore.FieldValue.delete() });
  await expectRejects("Identity-less default content-source collision", () => seedSignalDeskDefaultsServer(access), "CONTENT_SOURCE_SHAPE_INVALID");
  await defaultContentSourceRef.set(restoredDefaultSourceTruth);
  await defaultContentSourceRef.set({ lastAssetAt: preservedLastAssetAt }, { merge: true });
  const legacyPodCreatedAt = admin.firestore.Timestamp.fromMillis(Date.now() - 45_000);
  await firstPodSnap.ref.set({
    category: "restaurant",
    city: "Mumbai",
    country: "India",
    createdAt: legacyPodCreatedAt,
    marketPodId: firstPodSnap.id,
    monthlyBudgetUsd: 300,
    name: "First local proof pod",
    offerAngle: "Current-list proof and private preview.",
    ownerMarker: "founder-preserve-pod",
    pId: SIGNALDESK_PRODUCT_CODE,
    status: "hold",
    successMetric: "preview_prepared",
    updatedAt: timestampNow(),
    updatedBy: access.userId,
  });
  await seedSignalDeskDefaultsServer(access);
  const preservedNearLegacyPod = (await firstPodSnap.ref.get()).data();
  assert(preservedNearLegacyPod?.city === "Mumbai" && preservedNearLegacyPod?.monthlyBudgetUsd === 300 && preservedNearLegacyPod?.ownerMarker === "founder-preserve-pod", "Near-match market pod was mistaken for an exact legacy seed");
  await firstPodSnap.ref.update({ ownerMarker: admin.firestore.FieldValue.delete() });
  await seedSignalDeskDefaultsServer(access);
  const migratedLegacyPodSnap = await firstPodSnap.ref.get();
  assert(migratedLegacyPodSnap.data()?.city === "Bengaluru - Indiranagar and Koramangala", "Legacy unapproved first-pod seed was not migrated");
  assert(migratedLegacyPodSnap.data()?.monthlyBudgetUsd === 0, "Legacy first-pod migration retained unapproved spend");
  assert(migratedLegacyPodSnap.data()?.createdAt?.toMillis?.() === legacyPodCreatedAt.toMillis(), "Legacy first-pod migration rewrote creation ownership");
  const offerCtaRef = db.collection(SIGNALDESK_COLLECTIONS.OFFER_CTAS).doc("offer_cta_current_list_upload_v1");
  const legacyOfferCreatedAt = admin.firestore.Timestamp.fromMillis(Date.now() - 40_000);
  await offerCtaRef.set({
    activationSurface: "upload",
    approvedAsk: "Upload the current menu or service list so MenuList can prepare a private preview for review before publishing.",
    blockedClaims: ["AI will increase sales", "Guaranteed Google ranking", "Fully automatic public publishing"],
    createdAt: legacyOfferCreatedAt,
    ctaId: contentFixtureCtaId,
    marketPodId: firstPodSnap.id,
    offerCtaId: offerCtaRef.id,
    pId: SIGNALDESK_PRODUCT_CODE,
    proofMatchRule: "Use only with owned MenuList proof or a target evidence packet showing a current-list gap.",
    segment: "restaurant-owner",
    status: "active",
    title: "Current list upload and private preview",
    updatedAt: timestampNow(),
    updatedBy: access.userId,
  });
  await seedSignalDeskDefaultsServer(access);
  const migratedLegacyOffer = (await offerCtaRef.get()).data();
  assert(migratedLegacyOffer?.status === "hold", "Exact legacy active Offer CTA was not migrated to current held authority");
  assert(migratedLegacyOffer?.createdAt?.toMillis?.() === legacyOfferCreatedAt.toMillis(), "Legacy Offer CTA migration rewrote creation ownership");
  await expectRejects("Non-founder market pod approval", () => reviewSignalDeskMarketPodServer({
    ...access,
    role: "growth-manager",
  }, {
    decision: "approved",
    idempotencyKey: `market-pod-review-non-founder-${firstPodSnap.id}`,
    marketPodId: firstPodSnap.id,
    reason: "This role must not approve strategy.",
  }), "Founder approval is required for market pod decisions");
  const approvedPodInput = {
    decision: "approved",
    idempotencyKey: `market-pod-review-approved-${firstPodSnap.id}`,
    marketPodId: firstPodSnap.id,
    reason: "Approved for one bounded seven-day E2E trial.",
  };
  const [approvedPod, approvedPodReplay] = await Promise.all([
    reviewSignalDeskMarketPodServer(access, approvedPodInput),
    reviewSignalDeskMarketPodServer(access, approvedPodInput),
  ]);
  assert(approvedPod.status === "active" && approvedPod.reviewDecision === "approved", "Founder market-pod approval was not recorded");
  assert(approvedPodReplay.marketPodId === approvedPod.marketPodId && approvedPodReplay.status === "active", "Concurrent market-pod approval did not replay durable truth");
  await seedSignalDeskDefaultsServer(access);
  const reseededPodSnap = await firstPodSnap.ref.get();
  assert(reseededPodSnap.data()?.status === "active", "Default seeding revoked founder market-pod approval");
  assert(reseededPodSnap.data()?.approvedBy === access.userId, "Default seeding rewrote founder market-pod ownership");
  const reseededContentSourceSnap = await defaultContentSourceRef.get();
  assert(reseededContentSourceSnap.data()?.status === "hold", "Default seeding silently promoted an existing held content source");
  assert(reseededContentSourceSnap.data()?.createdAt?.toMillis?.() === restoredCreatedAt, "Default seeding rewrote content-source creation time");
  assert(reseededContentSourceSnap.data()?.lastAssetAt?.toMillis?.() === preservedLastAssetAt.toMillis(), "Default seeding reset content-source asset recency");
  const invalidDecisionInputRefs = [];
  const invalidDecisionInputBatch = db.batch();
  for (let index = 0; index < 31; index += 1) {
    const targetRef = db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(`invalid_decision_target_${index}`);
    const demandRef = db.collection(SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES).doc(`invalid_decision_demand_${index}`);
    const updatedAt = admin.firestore.Timestamp.fromMillis(Date.now() + ((index + 1) * 60_000));
    invalidDecisionInputRefs.push(targetRef, demandRef);
    invalidDecisionInputBatch.set(targetRef, {
      category: "Poison category",
      city: "Poison city",
      pId: SIGNALDESK_PRODUCT_CODE,
      targetId: targetRef.id,
      updatedAt,
    });
    invalidDecisionInputBatch.set(demandRef, {
      count: 999,
      pId: SIGNALDESK_PRODUCT_CODE,
      updatedAt,
    });
  }
  const invalidProviderEvaluationRef = db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_EVALUATIONS).doc("invalid_decision_provider_eval");
  const invalidMarketPodRef = db.collection(SIGNALDESK_COLLECTIONS.MARKET_PODS).doc("invalid_decision_market_pod");
  invalidDecisionInputRefs.push(invalidProviderEvaluationRef, invalidMarketPodRef);
  invalidDecisionInputBatch.set(invalidProviderEvaluationRef, {
    pId: SIGNALDESK_PRODUCT_CODE,
    provider: "google-places",
    recommendation: "approve",
    updatedAt: admin.firestore.Timestamp.fromMillis(Date.now() + (40 * 60_000)),
    use: "discovery",
  });
  invalidDecisionInputBatch.set(invalidMarketPodRef, {
    marketPodId: invalidMarketPodRef.id,
    name: "Poison pod",
    pId: SIGNALDESK_PRODUCT_CODE,
    status: "active",
    updatedAt: admin.firestore.Timestamp.fromMillis(Date.now() + (41 * 60_000)),
  });
  await invalidDecisionInputBatch.commit();
  try {
    const refreshedApprovedPod = await recommendSignalDeskMarketPodPlanServer(access, { marketPodId: firstPodSnap.id });
    assert(refreshedApprovedPod.status === "active" && refreshedApprovedPod.approvedBy === access.userId, "System recommendation rewrote founder market-pod approval");
    assert(refreshedApprovedPod.monthlyBudgetUsd === 0, "System recommendation attached unapproved market-pod spend");
    assert(refreshedApprovedPod.recommendationReason === "0 matching targets, 0 demand signals, 0 outcomes.", "Malformed decision rows influenced the market-pod recommendation");
    const strategistMemo = await createSignalDeskWeeklyStrategistMemoServer(access, {});
    assert(strategistMemo.summary.startsWith("0 targets, 0 demand signals, 0 outcomes."), "Malformed decision rows influenced the weekly strategist memo");
    assert(strategistMemo.recommendedMarketPodId === firstPodSnap.id, "Malformed newest pod hid older valid founder-approved pod authority");
    assert(!strategistMemo.providerQualitySummary.includes("google-places"), "Malformed provider evaluation influenced the weekly strategist memo");
    assert(!Object.prototype.hasOwnProperty.call(strategistMemo, "pId") && !Object.prototype.hasOwnProperty.call(strategistMemo, "updatedBy"), "Weekly strategist memo response leaked internal fields");
    const strategistAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
      data.action === "weekly_strategist_memo_create" && data.entityId === strategistMemo.strategistMemoId
    ));
    const strategistMemoReplay = await createSignalDeskWeeklyStrategistMemoServer(access, {});
    assert(strategistMemoReplay.updatedAt === strategistMemo.updatedAt, "Weekly strategist memo exact replay rewrote durable truth");
    assert(await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
      data.action === "weekly_strategist_memo_create" && data.entityId === strategistMemo.strategistMemoId
    )) === strategistAuditCount, "Weekly strategist memo exact replay repeated audit/cost effects");
    const strategistMemoRef = db.collection(SIGNALDESK_COLLECTIONS.STRATEGIST_MEMOS).doc(strategistMemo.strategistMemoId);
    await strategistMemoRef.set({ stalePrivateField: "must-be-removed" }, { merge: true });
    await createSignalDeskWeeklyStrategistMemoServer(access, {});
    assert((await strategistMemoRef.get()).data()?.stalePrivateField === undefined, "Weekly strategist memo refresh retained stale fields");
  } finally {
    const invalidDecisionInputCleanup = db.batch();
    invalidDecisionInputRefs.forEach((reference) => invalidDecisionInputCleanup.delete(reference));
    await invalidDecisionInputCleanup.commit();
  }
  await upsertSignalDeskSenderDomainServer(access, {
    authenticationState: "ready",
    bounceRate: 0,
    brandRisk: "low",
    complaintRate: 0,
    domain: "menulist.test",
    idempotencyKey: "e2e-sender-domain-initial-ready-v1",
    provider: "owned-email",
    status: "active",
    unsubscribeReady: true,
    volumeRampState: "low_volume",
  });
}

async function assertSenderDomainAuthorityIntegrity() {
  const senderCollection = db.collection(SIGNALDESK_COLLECTIONS.SENDER_DOMAINS);
  const placeholderRef = senderCollection.doc("sender_domain_pending_v1");
  const placeholderBeforeSnap = await placeholderRef.get();
  assert(!placeholderBeforeSnap.exists, "Default seeding created an invalid sender placeholder");
  const legacyTimestamp = timestampNow();
  const legacyPendingSender = {
    authenticationState: "missing",
    bounceRate: 0,
    brandRisk: "medium",
    complaintRate: 0,
    createdAt: legacyTimestamp,
    domain: "pending",
    pId: SIGNALDESK_PRODUCT_CODE,
    provider: null,
    senderDomainId: placeholderRef.id,
    status: "hold",
    unsubscribeReady: false,
    updatedAt: legacyTimestamp,
    updatedBy: access.userId,
    volumeRampState: "not_started",
  };
  await placeholderRef.set(legacyPendingSender);
  await seedSignalDeskDefaultsServer(access);
  const preservedPlaceholder = (await placeholderRef.get()).data();
  assert(preservedPlaceholder?.updatedAt?.toMillis?.() === legacyTimestamp.toMillis(), "Default seeding rewrote the exact legacy sender sentinel");
  const sentinelWorkspace = await loadSignalDeskWorkspaceServer(access, "settings");
  assert(!sentinelWorkspace.workspace.senderDomains.some((sender) => sender.senderDomainId === placeholderRef.id), "Exact legacy sender sentinel leaked into the workspace DTO");

  await placeholderRef.set({ ...legacyPendingSender, ownerMarker: "non-exact-sentinel", pId: "ML" });
  await seedSignalDeskDefaultsServer(access);
  const wrongProductPlaceholder = (await placeholderRef.get()).data();
  assert(wrongProductPlaceholder?.pId === "ML" && wrongProductPlaceholder?.ownerMarker === "non-exact-sentinel", "Default seeding overwrote a non-exact sender sentinel collision");
  const malformedSentinelWorkspace = await loadSignalDeskWorkspaceServer(access, "settings");
  assert(!malformedSentinelWorkspace.workspace.senderDomains.some((sender) => sender.senderDomainId === placeholderRef.id), "Malformed sender sentinel leaked into the workspace DTO");
  await placeholderRef.delete();

  const canonicalDomain = "sender-authority.test";
  const canonicalSenderId = senderDomainIdFor(canonicalDomain);
  const canonicalRequest = {
    authenticationState: "ready",
    bounceRate: 0,
    brandRisk: "low",
    complaintRate: 0,
    domain: "  Sender-Authority.Test. ",
    idempotencyKey: "e2e-sender-domain-canonical-concurrent-v1",
    provider: "owned-email",
    status: "hold",
    unsubscribeReady: true,
    volumeRampState: "low_volume",
  };
  const [canonicalFirst, canonicalReplay] = await Promise.all([
    upsertSignalDeskSenderDomainServer(access, canonicalRequest),
    upsertSignalDeskSenderDomainServer(access, canonicalRequest),
  ]);
  assert(canonicalFirst.senderDomainId === canonicalSenderId && canonicalFirst.domain === canonicalDomain, "Sender canonicalization did not converge on canonical identity");
  assert(canonicalReplay.senderDomainId === canonicalSenderId && canonicalReplay.domain === canonicalDomain, "Concurrent sender retry did not replay canonical truth");
  for (const result of [canonicalFirst, canonicalReplay]) {
    assert(!Object.prototype.hasOwnProperty.call(result, "pId"), "Sender mutation leaked product ownership metadata");
    assert(!Object.prototype.hasOwnProperty.call(result, "updatedBy"), "Sender mutation leaked actor metadata");
    assert(!Object.prototype.hasOwnProperty.call(result, "createdAt"), "Sender mutation leaked persistence metadata");
  }
  const canonicalAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "sender_domain_upsert" && data.entityId === canonicalSenderId
  ));
  assert(canonicalAuditCount === 1, "Concurrent sender retry repeated audit or cost effects");
  const canonicalClaimCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS, (data) => (
    data.operation === "sender_domain_upsert" && data.entityId === canonicalSenderId
  ));
  assert(canonicalClaimCount === 1, "Concurrent sender retry created duplicate durable claims");
  await expectRejects("Changed sender idempotency payload", () => upsertSignalDeskSenderDomainServer(access, {
    ...canonicalRequest,
    complaintRate: 0.01,
  }), "SENDER_DOMAIN_IDEMPOTENCY_CONFLICT");
  await expectRejects("Malformed sender hostname", () => upsertSignalDeskSenderDomainServer(access, {
    ...canonicalRequest,
    domain: "invalid_sender",
    idempotencyKey: "e2e-sender-domain-invalid-host-v1",
  }), "SENDER_DOMAIN_INVALID");

  const wrongProductDomain = "foreign-sender.test";
  const wrongProductRef = senderCollection.doc(senderDomainIdFor(wrongProductDomain));
  await wrongProductRef.set({
    authenticationState: "ready",
    bounceRate: 0,
    brandRisk: "low",
    complaintRate: 0,
    domain: wrongProductDomain,
    ownerMarker: "foreign-owner-truth",
    pId: "ML",
    provider: "owned-email",
    senderDomainId: wrongProductRef.id,
    status: "active",
    unsubscribeReady: true,
    updatedAt: timestampNow(),
    volumeRampState: "ready",
  });
  await expectRejects("Wrong-product canonical sender collision", () => upsertSignalDeskSenderDomainServer(access, {
    ...canonicalRequest,
    domain: wrongProductDomain,
    idempotencyKey: "e2e-sender-domain-wrong-product-v1",
  }), "SENDER_DOMAIN_PRODUCT_MISMATCH");
  const preservedWrongProduct = (await wrongProductRef.get()).data();
  assert(preservedWrongProduct?.pId === "ML" && preservedWrongProduct?.ownerMarker === "foreign-owner-truth", "Sender upsert overwrote a wrong-product canonical collision");

  const legacyRawDomains = ["Legacy.Sender.Test.", "LEGACY.SENDER.TEST"];
  const legacyRefs = legacyRawDomains.map((rawDomain, index) => senderCollection.doc(senderDomainIdFor(rawDomain)));
  await Promise.all(legacyRefs.map((legacyRef, index) => legacyRef.set({
    authenticationState: "ready",
    bounceRate: 0,
    brandRisk: "low",
    complaintRate: 0,
    domain: legacyRawDomains[index],
    ownerMarker: `legacy-${index + 1}`,
    pId: SIGNALDESK_PRODUCT_CODE,
    provider: "owned-email",
    senderDomainId: legacyRef.id,
    status: "active",
    unsubscribeReady: true,
    updatedAt: timestampNow(),
    volumeRampState: "ready",
  })));
  const recoveredLegacy = await upsertSignalDeskSenderDomainServer(access, {
    ...canonicalRequest,
    domain: "legacy.sender.test",
    idempotencyKey: "e2e-sender-domain-legacy-recovery-v1",
  });
  const recoveredLegacyRef = senderCollection.doc(senderDomainIdFor("legacy.sender.test"));
  assert(recoveredLegacy.senderDomainId === recoveredLegacyRef.id, "Legacy sender recovery did not create canonical authority");
  const legacyAfterRecovery = await Promise.all(legacyRefs.map((legacyRef) => legacyRef.get()));
  assert(legacyAfterRecovery.every((snap, index) => snap.data()?.ownerMarker === `legacy-${index + 1}`), "Canonical sender recovery silently overwrote a legacy alias row");

  const mismatchDomain = "mismatched-id.sender.test";
  const mismatchRef = senderCollection.doc(senderDomainIdFor(mismatchDomain));
  const badRateDomain = "bad-rate.sender.test";
  const badRateRef = senderCollection.doc(senderDomainIdFor(badRateDomain));
  const badTimeDomain = "bad-time.sender.test";
  const badTimeRef = senderCollection.doc(senderDomainIdFor(badTimeDomain));
  const senderShape = (senderRef, domain, overrides = {}) => ({
    authenticationState: "ready",
    bounceRate: 0,
    brandRisk: "low",
    complaintRate: 0,
    domain,
    pId: SIGNALDESK_PRODUCT_CODE,
    provider: "owned-email",
    senderDomainId: senderRef.id,
    status: "active",
    unsubscribeReady: true,
    updatedAt: timestampNow(),
    updatedBy: "must-not-leak",
    volumeRampState: "ready",
    ...overrides,
  });
  await Promise.all([
    mismatchRef.set(senderShape(mismatchRef, mismatchDomain, { senderDomainId: "sender_wrong_identity" })),
    badRateRef.set(senderShape(badRateRef, badRateDomain, { bounceRate: 1.01 })),
    badTimeRef.set(senderShape(badTimeRef, badTimeDomain, { updatedAt: "not-a-timestamp" })),
  ]);

  const channelsWorkspace = await loadSignalDeskWorkspaceServer(access, "channels");
  const visibleSenders = channelsWorkspace.workspace.senderDomains;
  const visibleSenderIds = new Set(visibleSenders.map((sender) => sender.senderDomainId));
  assert(visibleSenderIds.has(canonicalSenderId), "Strict sender workspace projector omitted valid canonical authority");
  assert(visibleSenderIds.has(recoveredLegacyRef.id), "Strict sender workspace projector omitted recovered canonical legacy authority");
  assert(!visibleSenderIds.has(wrongProductRef.id), "Strict sender workspace projector leaked wrong-product authority");
  assert(!visibleSenderIds.has(mismatchRef.id), "Strict sender workspace projector leaked mismatched identity");
  assert(!visibleSenderIds.has(badRateRef.id), "Strict sender workspace projector leaked malformed rate authority");
  assert(!visibleSenderIds.has(badTimeRef.id), "Strict sender workspace projector leaked malformed timestamp authority");
  assert(legacyRefs.every((legacyRef) => !visibleSenderIds.has(legacyRef.id)), "Strict sender workspace projector exposed noncanonical legacy identity");
  const publicSenderFields = new Set([
    "authenticationState",
    "bounceRate",
    "brandRisk",
    "complaintRate",
    "domain",
    "provider",
    "senderDomainId",
    "status",
    "unsubscribeReady",
    "updatedAt",
    "volumeRampState",
  ]);
  assert(visibleSenders.every((sender) => Object.keys(sender).every((key) => publicSenderFields.has(key))), "Sender workspace returned non-DTO persistence fields");

  const scanBlockerRefs = Array.from({ length: 35 }, (_, index) => (
    senderCollection.doc(`a_invalid_sender_scan_${String(index).padStart(3, "0")}`)
  ));
  await Promise.all(scanBlockerRefs.map((scanRef, index) => scanRef.set({
    authenticationState: "ready",
    bounceRate: 0,
    brandRisk: "low",
    complaintRate: 0,
    domain: `scan-blocker-${index}.test`,
    pId: SIGNALDESK_PRODUCT_CODE,
    provider: "owned-email",
    senderDomainId: scanRef.id,
    status: "active",
    unsubscribeReady: true,
    updatedAt: timestampNow(),
    volumeRampState: "ready",
  })));
  const paginatedSenderWorkspace = await loadSignalDeskWorkspaceServer(access, "channels");
  assert(
    paginatedSenderWorkspace.workspace.senderDomains.some((sender) => sender.senderDomainId === senderDomainIdFor("menulist.test")),
    "Invalid first-page sender rows starved the later valid sender workspace DTO",
  );
  const scanPolicy = await createPolicy("Sender deterministic bounded scan");
  const scanReady = await prepareApprovedTarget(scanPolicy.sourcePolicyId, "SenderBoundedScan");
  const scanDraft = (await db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(scanReady.draftId).get()).data();
  assert(scanDraft?.senderDomainId === senderDomainIdFor("menulist.test"), "Invalid first-page sender rows starved the later ready canonical sender");
  await Promise.all(scanBlockerRefs.map((scanRef) => scanRef.delete()));

  await Promise.all([
    senderCollection.doc(canonicalSenderId).delete(),
    wrongProductRef.delete(),
    ...legacyRefs.map((legacyRef) => legacyRef.delete()),
    recoveredLegacyRef.delete(),
    mismatchRef.delete(),
    badRateRef.delete(),
    badTimeRef.delete(),
  ]);
}

async function createPolicy(label, overrides = {}) {
  const allowContact = overrides.allowContact ?? true;
  const sourceType = overrides.sourceType || "manual-research";
  const lastReviewedAt = overrides.lastReviewedAt || new Date().toISOString();
  const input = {
    accessMethod: overrides.accessMethod || (allowContact ? "permissioned-referral" : sourceType === "provider" ? "licensed-api" : "open-data"),
    allowContact,
    allowEvidence: overrides.allowEvidence ?? true,
    allowPersonalization: overrides.allowPersonalization ?? true,
    allowedContactChannels: overrides.allowedContactChannels || (allowContact ? ["email", "manual"] : []),
    allowedFields: overrides.allowedFields || ["displayName", "category", "city", "country", "currentListUrl", "website", "notes", "providerRecordId", "providerRecordUrl", ...(allowContact ? ["email", "phone", "instagram"] : [])],
    attributionRequirements: ["Keep source references attached."],
    blockedFields: overrides.blockedFields || (allowContact ? ["personal-profile"] : ["email", "phone", "instagram"]),
    expiresAt: overrides.expiresAt ?? futureIso(30),
    idempotencyKey: overrides.idempotencyKey || `e2e-policy:${label}`,
    lastReviewedAt,
    name: `${label} source policy`,
    notes: "Local deterministic SignalDesk E2E fixture.",
    policyOwner: access.userId,
    prohibitedUses: ["unapproved send", "cold WhatsApp", "proof use without permission"],
    provider: overrides.provider,
    retentionDays: overrides.retentionDays ?? 30,
    rawPayloadPolicy: "never-store",
    refreshMethod: sourceType === "provider" ? "provider-refresh" : "manual-review",
    sourceType,
    termsVersion: "local-e2e-v1",
  };
  const fixtureValidation = SignalDeskSourcePolicyCreateSchema.safeParse(input);
  if (!fixtureValidation.success && overrides.skipFixtureValidation !== true) {
    const issueSummary = fixtureValidation.error.issues
      .map((issue) => `${issue.path.join(".") || "root"}:${issue.code}`)
      .join(",");
    throw new Error(`E2E_SOURCE_POLICY_FIXTURE_INVALID:${label}:${issueSummary}`);
  }
  return createSignalDeskSourcePolicyServer(access, input);
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
    permissionEvidenceRef: `e2e:permission:${suffix}`,
    phone: `+1000000${phoneSuffix}`,
    website: "https://example.invalid",
    ...overrides,
  };
}

async function importOne(sourcePolicyId, suffix, overrides = {}) {
  const result = await importSignalDeskTargetsServer(access, {
    idempotencyKey: `e2e-import:${suffix}`,
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

async function assertEvidencePacketContracts() {
  const reviewOnlyPolicy = await createPolicy("Evidence review only", {
    allowContact: false,
    allowPersonalization: false,
  });
  const reviewOnlyTargetId = await importOne(reviewOnlyPolicy.sourcePolicyId, "EvidenceReviewOnly");
  await scoreSignalDeskTargetServer(access, reviewOnlyTargetId);
  const reviewOnlyEvidence = await createSignalDeskEvidenceServer(access, reviewOnlyTargetId);
  assert(
    JSON.stringify(reviewOnlyEvidence.allowedUse) === JSON.stringify(["evidence"]),
    "evidence-only packet did not preserve its bounded allowed use",
  );
  const reviewOnlyTarget = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES)
    .doc(reviewOnlyTargetId)
    .get();
  assert(
    reviewOnlyTarget.get("nextAction") === "hold",
    "evidence-only authority advanced to an unusable draft action",
  );

  const suppressionPolicy = await createPolicy("Evidence suppression identity");
  const suppressionTargetId = await importOne(suppressionPolicy.sourcePolicyId, "EvidenceSuppressionIdentity");
  await scoreSignalDeskTargetServer(access, suppressionTargetId);
  const clearEvidence = await createSignalDeskEvidenceServer(access, suppressionTargetId);
  const suppressionTargetRef = db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(suppressionTargetId);
  await suppressionTargetRef.set({
    suppressionStatus: "suppressed",
    updatedAt: timestampNow(),
  }, { merge: true });
  const suppressedEvidence = await createSignalDeskEvidenceServer(access, suppressionTargetId);
  assert(
    suppressedEvidence.evidencePacketId !== clearEvidence.evidencePacketId,
    "suppression-sensitive evidence reused a stale packet identity",
  );
  assert(
    suppressedEvidence.currentMenuPresence?.twoSurfaceFeasibility === "blocked",
    "suppressed evidence did not report blocked two-surface feasibility",
  );
  assert(
    (await suppressionTargetRef.get()).get("nextAction") === "hold",
    "suppressed evidence advanced to a draft action",
  );
}

async function assertDraftControlContracts() {
  const createDraftReadyTarget = async (label) => {
    const policy = await createPolicy(`Draft control ${label}`);
    const targetId = await importOne(policy.sourcePolicyId, `DraftControl${label}`);
    await scoreSignalDeskTargetServer(access, targetId);
    await createSignalDeskEvidenceServer(access, targetId);
    return targetId;
  };
  const writeTemplate = async (templateId, overrides = {}) => {
    await db.collection(SIGNALDESK_COLLECTIONS.TEMPLATE_SUMMARIES).doc(templateId).set({
      approvedVariables: ["businessName", "category", "city", "opportunity", "proofCta"],
      body: "Hi {{businessName}}, {{opportunity}}. {{proofCta}}",
      channel: "email",
      createdAt: timestampNow(),
      name: `Draft control ${templateId}`,
      pId: SIGNALDESK_PRODUCT_CODE,
      status: "active",
      subject: "Quick note for {{businessName}}",
      templateId,
      updatedAt: timestampNow(),
      updatedBy: access.userId,
      ...overrides,
    });
  };

  const channelTargetId = await createDraftReadyTarget("Channel");
  const channelTemplateId = "template_draft_control_channel_e2e";
  await writeTemplate(channelTemplateId, { channel: "manual" });
  await expectRejects(
    "Non-email template for email draft",
    () => createSignalDeskDraftServer(access, { targetId: channelTargetId, templateId: channelTemplateId }),
    "DRAFT_TEMPLATE_CHANNEL_INVALID",
  );

  const variableTargetId = await createDraftReadyTarget("Variable");
  const variableTemplateId = "template_draft_control_variable_e2e";
  await writeTemplate(variableTemplateId, {
    approvedVariables: ["businessName", "opportunity", "proofCta"],
    body: "Hi {{businessName}} in {{city}}, {{opportunity}}. {{proofCta}}",
  });
  await expectRejects(
    "Unapproved template variable",
    () => createSignalDeskDraftServer(access, { targetId: variableTargetId, templateId: variableTemplateId }),
    "DRAFT_TEMPLATE_VARIABLE_INVALID",
  );

  const claimTargetId = await createDraftReadyTarget("Claim");
  const claimTemplateId = "template_draft_control_claim_e2e";
  await writeTemplate(claimTemplateId, {
    body: "Hi {{businessName}}, we guarantee sales and we are an official WhatsApp partner. {{proofCta}}",
  });
  await expectRejects(
    "Unsupported template claims",
    () => createSignalDeskDraftServer(access, { targetId: claimTargetId, templateId: claimTemplateId }),
    "DRAFT_UNSUPPORTED_CLAIMS",
  );

  const evidenceTargetId = await createDraftReadyTarget("EvidenceLineage");
  await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(evidenceTargetId).set({
    category: "cafe",
    updatedAt: timestampNow(),
  }, { merge: true });
  await expectRejects(
    "Stale evidence after target truth changes",
    () => createSignalDeskDraftServer(access, { targetId: evidenceTargetId }),
    "DRAFT_EVIDENCE_LINEAGE_STALE",
  );

  const authorityTargetId = await createDraftReadyTarget("TemplateAuthority");
  const authorityTemplateId = "template_draft_control_authority_e2e";
  await writeTemplate(authorityTemplateId);
  const authorityDraft = await createSignalDeskDraftServer(access, {
    targetId: authorityTargetId,
    templateId: authorityTemplateId,
  });
  assert(authorityDraft.draft.templateFingerprintHash?.length === 64, "Draft did not bind exact template authority");
  await db.collection(SIGNALDESK_COLLECTIONS.TEMPLATE_SUMMARIES).doc(authorityTemplateId).set({
    status: "inactive",
    updatedAt: timestampNow(),
  }, { merge: true });
  await expectRejects(
    "Approval after template deactivation",
    () => reviewSignalDeskApprovalServer(access, {
      approvalId: authorityDraft.approval.approvalId,
      reason: "Inactive template must not remain approvable.",
      status: "approved",
    }),
    "DRAFT_TEMPLATE_AUTHORITY_STALE",
  );
}

async function replyConversationIdFor(targetId, channel = "email") {
  const targetRef = db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId);
  const targetSnap = await targetRef.get();
  assert(targetSnap.exists, `Reply-lineage target is missing: ${targetId}`);
  const target = targetSnap.data();
  const conversationId = target.latestConversationId || `conv_reply_fixture_${hashValue(targetId).slice(0, 24)}`;
  const conversationRef = db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES).doc(conversationId);
  const conversationSnap = await conversationRef.get();
  if (!conversationSnap.exists) {
    const timestamp = timestampNow();
    await conversationRef.set({
      channel,
      conversationId,
      lastMessagePreview: "Persisted outbound lineage fixture.",
      pId: SIGNALDESK_PRODUCT_CODE,
      state: "contacted",
      targetId,
      targetName: target.displayName,
      updatedAt: timestamp,
    });
    await targetRef.set({ latestConversationId: conversationId, updatedAt: timestamp }, { merge: true });
  }
  return conversationId;
}

async function assertImportDedupe() {
  const policy = await createPolicy("Import dedupe");
  const duplicateRow = rowFor("DuplicateWithinImport", { currentListUrl: "" });
  const result = await importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:duplicate-within-import",
    rows: [duplicateRow, { ...duplicateRow }],
    sourceName: "local duplicate import",
    sourcePolicyId: policy.sourcePolicyId,
  });
  assert(result.targets.length === 1, "Duplicate rows in one import returned duplicate targets");
  assert(result.run.duplicateCount === 1, "Duplicate rows in one import were not counted");
  const candidateCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.SOURCE_CANDIDATES, (data) => data.sourceRunId === result.run.sourceRunId);
  assert(candidateCount === 1, "Duplicate rows in one import created duplicate source candidates");
}

async function assertSourcePolicyAndImportContracts() {
  const csvHeader = "displayName,category,city,country,website,email,phone,currentListUrl,instagram,permissionEvidenceRef";
  const parsedCsv = parseSignalDeskTargetImportCsv(`${csvHeader}\r\n"Cafe, One",Cafe,Bengaluru,India,"https://example.invalid/menu,one",,,,,"founder ""proof""\r\nline two"`);
  assert(parsedCsv.length === 1, "Quoted CSV record did not parse exactly once");
  assert(parsedCsv[0].displayName === "Cafe, One", "Quoted CSV comma shifted the target display name");
  assert(parsedCsv[0].website === "https://example.invalid/menu,one", "Quoted CSV comma shifted the website field");
  assert(parsedCsv[0].permissionEvidenceRef === 'founder "proof"\nline two', "Quoted CSV quote/newline decoding drifted");
  await expectRejects("CSV unclosed quote", () => parseSignalDeskTargetImportCsv('"Unclosed,Cafe,Mumbai,India,,,,,,'), "A quoted field is not closed");
  await expectRejects("CSV missing column", () => parseSignalDeskTargetImportCsv("Cafe,Cafe,Mumbai,India,,,,,"), "must contain exactly 10 columns");
  await expectRejects("CSV extra column", () => parseSignalDeskTargetImportCsv("Cafe,Cafe,Mumbai,India,,,,,,,extra"), "must contain exactly 10 columns");
  await expectRejects("CSV empty display name", () => parseSignalDeskTargetImportCsv(",Cafe,Mumbai,India,,,,,,"), "needs a display name");
  await expectRejects("CSV delimiter-only row", () => parseSignalDeskTargetImportCsv(",,,,,,,,,"), "needs a display name");
  await expectRejects("CSV overlong display name", () => parseSignalDeskTargetImportCsv(`${"x".repeat(181)},Cafe,Mumbai,India,,,,,,`), "overlong displayName");
  await expectRejects("CSV row cap", () => parseSignalDeskTargetImportCsv(Array.from({ length: 51 }, (_, index) => `Cafe ${index},Cafe,Mumbai,India,,,,,,`).join("\n")), "Use no more than 50 target rows");

  const researchTimestamp = timestampNow();
  const researchRunId = "research_contract_fixture";
  const completedResearchRun = {
    category: "Cafe",
    city: "Mumbai",
    country: "India",
    createdAt: researchTimestamp,
    enrichmentColumns: ["source-transparency"],
    failCount: 0,
    idempotencyKeyHash: "research-contract-idempotency",
    marketPodId: "market_pod_contract_fixture",
    maxResults: 10,
    normalizedQuery: "cafes in Mumbai",
    pId: SIGNALDESK_PRODUCT_CODE,
    passCount: 1,
    prompt: "Find cafes in Mumbai",
    provider: "google-places",
    providerRunIds: ["provider_run_contract_fixture"],
    researchRunId,
    researchType: "business-prospect",
    sourcePolicyId: null,
    sourceTransparency: ["provider:google-places"],
    status: "completed",
    tableRowCount: 1,
    unsureCount: 0,
    updatedAt: researchTimestamp,
  };
  await expectRejects("Research run count mismatch", () => parseSignalDeskResearchRunDocument({
    ...completedResearchRun,
    tableRowCount: 2,
  }, researchRunId), "RESEARCH_RUN_SHAPE_INVALID");
  await expectRejects("Research run in-flight terminal truth", () => parseSignalDeskResearchRunDocument({
    ...completedResearchRun,
    status: "running",
  }, researchRunId), "RESEARCH_RUN_SHAPE_INVALID");

  const researchRowId = "research_row_contract_fixture";
  const researchRowFixture = {
    actionabilityState: "research_only",
    allowedRoute: "none",
    allowedRouteReason: "Evidence only",
    category: "Cafe",
    city: "Mumbai",
    contactability: "missing",
    country: "India",
    currentListGap: "no-link",
    displayName: "Contract Cafe",
    enrichment: [],
    evidenceSummary: "Current-list gap requires review.",
    fitDecision: "pass",
    fitScore: 80,
    hardGateFailures: [],
    pId: SIGNALDESK_PRODUCT_CODE,
    provider: "google-places",
    providerRecordUrl: "https://maps.example.invalid/contract-cafe",
    recommendedCta: "Review the evidence.",
    recommendedMessageAngle: "Current-list accuracy",
    recommendedNextAction: "evidence",
    researchRowId,
    researchRunId,
    routePermissionState: "research_only",
    sourcePolicyId: null,
    sourceRefs: ["provider:google-places"],
    sourceRunId: null,
    targetId: null,
    updatedAt: researchTimestamp,
    website: null,
  };
  await expectRejects("Research row score range", () => parseSignalDeskResearchRowDocument({
    ...researchRowFixture,
    fitScore: 101,
  }, researchRowId), "RESEARCH_ROW_SHAPE_INVALID");
  await expectRejects("Research pass verdict requires a passing score", () => parseSignalDeskResearchRowDocument({
    ...researchRowFixture,
    fitScore: 0,
  }, researchRowId), "RESEARCH_ROW_SHAPE_INVALID");
  await expectRejects("Research fail verdict cannot expose an outreach route", () => parseSignalDeskResearchRowDocument({
    ...researchRowFixture,
    actionabilityState: "actionable",
    allowedRoute: "email-export",
    fitDecision: "fail",
    fitScore: 20,
    hardGateFailures: ["Source rights are blocked."],
    recommendedNextAction: "score",
  }, researchRowId), "RESEARCH_ROW_SHAPE_INVALID");

  const originalFetch = global.fetch;
  const originalApifyToken = process.env.SIGNALDESK_APIFY_API_TOKEN;
  const originalApifyActor = process.env.SIGNALDESK_APIFY_SOURCE_ACTOR_ID;
  process.env.SIGNALDESK_APIFY_API_TOKEN = "local-source-contract-token";
  process.env.SIGNALDESK_APIFY_SOURCE_ACTOR_ID = "local/source-contract";
  try {
    global.fetch = async (_url, init) => {
      assert(init?.signal, "Source-provider adapter omitted its AbortSignal timeout");
      return new Response(JSON.stringify([
        { name: "Overlong ID Cafe", placeId: "p".repeat(241), googleMapsUrl: "https://maps.example.invalid/overlong-id" },
        { name: "n".repeat(181), placeId: "drop-overlong-name" },
        { name: "Overlong Email Cafe", placeId: "valid-email-record", email: `${"e".repeat(181)}@example.invalid` },
        { name: "Overlong URL Cafe", placeId: "valid-url-record", googleMapsUrl: `https://maps.example.invalid/${"u".repeat(600)}` },
        { name: "Maps Record Only Cafe", placeId: "maps-record-only", googleMapsUrl: "https://maps.example.invalid/maps-only", website: "https://maps-only.example.invalid" },
        { name: "Explicit Menu Cafe", placeId: "explicit-menu-record", googleMapsUrl: "https://maps.example.invalid/explicit-menu", menuUrl: "https://menus.example.invalid/current.pdf" },
        { name: "Malformed Optional Cafe", placeId: "malformed-optional-record", email: "not-an-email", instagramUrl: "https://www.instagram.com/Valid_Handle/", phone: "+44 call-me", website: "ftp://example.invalid/private" },
      ]), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    const boundedProviderRows = await runSignalDeskSourceProvider({
      city: "Mumbai",
      country: "India",
      maxResults: 10,
      provider: "apify",
      query: "bounded provider fields",
    });
    const overlongIdRow = boundedProviderRows.find((row) => row.displayName === "Overlong ID Cafe");
    assert(overlongIdRow && !overlongIdRow.providerRecordId, "Provider adapter truncated an overlong record ID into valid identity truth");
    assert(overlongIdRow.providerRecordUrl === "https://maps.example.invalid/overlong-id", "Provider adapter lost the valid fallback record URL");
    assert(!boundedProviderRows.some((row) => row.displayName === "n".repeat(180)), "Provider adapter truncated an overlong display name into a target");
    const overlongEmailRow = boundedProviderRows.find((row) => row.displayName === "Overlong Email Cafe");
    assert(overlongEmailRow && !overlongEmailRow.email, "Provider adapter truncated an overlong email into contact truth");
    const overlongUrlRow = boundedProviderRows.find((row) => row.displayName === "Overlong URL Cafe");
    assert(overlongUrlRow && !overlongUrlRow.providerRecordUrl, "Provider adapter truncated an overlong URL into provenance truth");
    const mapsOnlyRow = boundedProviderRows.find((row) => row.displayName === "Maps Record Only Cafe");
    assert(mapsOnlyRow?.providerRecordUrl === "https://maps.example.invalid/maps-only", "Provider adapter lost the Maps record URL");
    assert(!mapsOnlyRow?.currentListUrl, "Provider adapter misrepresented a Maps record URL as current-list truth");
    const explicitMenuRow = boundedProviderRows.find((row) => row.displayName === "Explicit Menu Cafe");
    assert(explicitMenuRow?.currentListUrl === "https://menus.example.invalid/current.pdf", "Provider adapter lost an explicit current-list URL");
    const malformedOptionalRow = boundedProviderRows.find((row) => row.displayName === "Malformed Optional Cafe");
    assert(malformedOptionalRow, "One malformed optional provider field dropped an otherwise valid business");
    assert(!malformedOptionalRow.email && !malformedOptionalRow.phone && !malformedOptionalRow.website, "Malformed optional provider fields reached target truth");
    assert(malformedOptionalRow.instagram === "valid_handle", "Instagram URL did not normalize to one canonical handle");
  } finally {
    global.fetch = originalFetch;
    if (originalApifyToken === undefined) delete process.env.SIGNALDESK_APIFY_API_TOKEN;
    else process.env.SIGNALDESK_APIFY_API_TOKEN = originalApifyToken;
    if (originalApifyActor === undefined) delete process.env.SIGNALDESK_APIFY_SOURCE_ACTOR_ID;
    else process.env.SIGNALDESK_APIFY_SOURCE_ACTOR_ID = originalApifyActor;
  }

  const reviewedAt = new Date().toISOString();
  const expiresAt = futureIso(20);
  const replayOptions = {
    expiresAt,
    idempotencyKey: "e2e-policy-contract-replay-v1",
    lastReviewedAt: reviewedAt,
  };
  const firstPolicy = await createPolicy("Policy contract replay", replayOptions);
  const replayedPolicy = await createPolicy("Policy contract replay", replayOptions);
  assert(firstPolicy.sourcePolicyId === replayedPolicy.sourcePolicyId, "Source-policy exact retry created a second policy");
  await expectRejects("Source-policy changed-input conflict", () => createPolicy("Policy contract changed", replayOptions), "SOURCE_POLICY_IDEMPOTENCY_CONFLICT");
  await expectRejects("Source-policy past expiry", () => createPolicy("Past policy contract", {
    expiresAt: pastIso(),
    idempotencyKey: "e2e-policy-past-expiry-v1",
    skipFixtureValidation: true,
  }), "SOURCE_POLICY_INPUT_INVALID");
  await expectRejects("Source-policy contact channel without contact authority", () => createPolicy("Channel authority mismatch", {
    allowContact: false,
    allowedContactChannels: ["email"],
    idempotencyKey: "e2e-policy-channel-mismatch-v1",
    skipFixtureValidation: true,
  }), "SOURCE_POLICY_INPUT_INVALID");
  const persistedRefreshPolicy = await createPolicy("Persisted provider refresh parity", {
    allowContact: false,
    allowPersonalization: false,
    provider: "google-places",
    sourceType: "provider",
  });
  await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(persistedRefreshPolicy.sourcePolicyId).set({
    refreshMethod: "manual-review",
    updatedAt: timestampNow(),
  }, { merge: true });
  await expectRejects("Persisted provider refresh mismatch", () => importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:persisted-provider-refresh-mismatch",
    rows: [rowFor("PersistedRefreshMismatch", { email: "", permissionEvidenceRef: "", phone: "" })],
    sourceName: "persisted provider refresh mismatch",
    sourcePolicyId: persistedRefreshPolicy.sourcePolicyId,
  }), "SOURCE_POLICY_SHAPE_INVALID");
  const persistedFutureReviewPolicy = await createPolicy("Persisted future review parity");
  await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(persistedFutureReviewPolicy.sourcePolicyId).set({
    lastReviewedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1_000)),
    updatedAt: timestampNow(),
  }, { merge: true });
  await expectRejects("Persisted future policy review", () => importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:persisted-future-review",
    rows: [rowFor("PersistedFutureReview")],
    sourceName: "persisted future review",
    sourcePolicyId: persistedFutureReviewPolicy.sourcePolicyId,
  }), "SOURCE_POLICY_SHAPE_INVALID");
  const persistedStringTimestampPolicy = await createPolicy("Persisted string timestamp rejection");
  await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(persistedStringTimestampPolicy.sourcePolicyId).set({
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  await expectRejects("Persisted policy string timestamp", () => importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:persisted-string-timestamp",
    rows: [rowFor("PersistedStringTimestamp")],
    sourceName: "persisted string timestamp",
    sourcePolicyId: persistedStringTimestampPolicy.sourcePolicyId,
  }), "SOURCE_POLICY_SHAPE_INVALID");

  const retryRow = rowFor("ManualImportIdempotency");
  const retryInput = {
    idempotencyKey: "e2e-import:manual-idempotency",
    rows: [retryRow],
    sourceName: "manual import idempotency",
    sourcePolicyId: firstPolicy.sourcePolicyId,
  };
  const firstImport = await importSignalDeskTargetsServer(access, retryInput);
  const replayedImport = await importSignalDeskTargetsServer(access, retryInput);
  assert(firstImport.run.sourceRunId === replayedImport.run.sourceRunId, "Manual import exact retry created a second source run");
  assert(firstImport.targets[0].targetId === replayedImport.targets[0].targetId, "Manual import exact retry changed target identity");
  assert(await expectCollectionCount(SIGNALDESK_COLLECTIONS.SOURCE_RUN_SUMMARIES, (data) => data.sourceRunId === firstImport.run.sourceRunId) === 1, "Manual import exact retry duplicated source-run truth");
  await expectRejects("Manual import changed-input idempotency conflict", () => importSignalDeskTargetsServer(access, {
    ...retryInput,
    sourceName: "manual import idempotency changed",
  }), "TARGET_IMPORT_IDEMPOTENCY_CONFLICT");
  const concurrentInput = {
    idempotencyKey: "e2e-import:manual-concurrent",
    rows: [rowFor("ManualImportConcurrent")],
    sourceName: "manual import concurrent",
    sourcePolicyId: firstPolicy.sourcePolicyId,
  };
  const [concurrentOne, concurrentTwo] = await Promise.all([
    importSignalDeskTargetsServer(access, concurrentInput),
    importSignalDeskTargetsServer(access, concurrentInput),
  ]);
  assert(concurrentOne.run.sourceRunId === concurrentTwo.run.sourceRunId, "Concurrent manual import created two source runs");
  assert(concurrentOne.targets[0].targetId === concurrentTwo.targets[0].targetId, "Concurrent manual import created two target identities");

  const opportunityPolicy = await createPolicy("Opportunity precedence", {
    allowedContactChannels: ["email", "manual", "instagram"],
    idempotencyKey: "e2e-policy-opportunity-precedence",
  });
  const opportunityImport = await importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:opportunity-precedence",
    rows: [
      rowFor("OpportunityMissing", { currentListUrl: "", instagram: "", website: "https://example.invalid" }),
      rowFor("OpportunityPdf", { currentListUrl: "https://example.invalid/menu.pdf", instagram: "", website: "https://example.invalid" }),
      rowFor("OpportunityInstagram", { currentListUrl: "", instagram: "@menu_only", website: "" }),
      rowFor("OpportunityCurrent", { currentListUrl: "https://example.invalid/current-menu", instagram: "", website: "https://example.invalid" }),
    ],
    sourceName: "opportunity precedence",
    sourcePolicyId: opportunityPolicy.sourcePolicyId,
  });
  const opportunityByName = new Map(opportunityImport.targets.map((target) => [target.displayName, target.primaryOpportunity]));
  assert(opportunityByName.get("SignalDesk OpportunityMissing Cafe") === "missing-current-list", "Missing current-list truth did not take precedence over website presence");
  assert(opportunityByName.get("SignalDesk OpportunityPdf Cafe") === "pdf-only", "Explicit PDF current-list truth was not classified as PDF-only");
  assert(opportunityByName.get("SignalDesk OpportunityInstagram Cafe") === "instagram-only", "Instagram-only truth was not classified narrowly");
  assert(opportunityByName.get("SignalDesk OpportunityCurrent Cafe") === "unknown", "A non-PDF current-list URL was incorrectly classified as a gap");

  const providerIdentityPolicy = await createPolicy("Stable provider identity", {
    allowContact: false,
    allowPersonalization: false,
    idempotencyKey: "e2e-policy-stable-provider-identity",
    provider: "fhrs-fhis",
    sourceType: "provider",
  });
  const importAuthorityCollections = [
    SIGNALDESK_COLLECTIONS.SOURCE_RUN_SUMMARIES,
    SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES,
    SIGNALDESK_COLLECTIONS.TARGETS,
    SIGNALDESK_COLLECTIONS.IDENTITY_INDEX,
    SIGNALDESK_COLLECTIONS.SOURCE_CANDIDATES,
    SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS,
    SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES,
  ];
  const authorityCountsBefore = await Promise.all(importAuthorityCollections.map((collection) => (
    expectCollectionCount(collection, () => true)
  )));
  await expectRejects("Manual import cannot consume a provider-only policy", () => importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:provider-policy-manual-spoof",
    rows: [rowFor("ProviderPolicyManualSpoof", { providerRecordId: "", providerRecordUrl: "" })],
    sourceName: "provider policy manual spoof",
    sourcePolicyId: providerIdentityPolicy.sourcePolicyId,
  }), "SOURCE_POLICY_USE_NOT_ALLOWED");
  await expectRejects("Manual import cannot claim provider lineage", () => importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:provider-lineage-manual-spoof",
    rows: [rowFor("ProviderLineageManualSpoof", { providerRecordId: "provider-spoof", providerRecordUrl: "https://provider.example.invalid/spoof" })],
    sourceName: "provider lineage manual spoof",
    sourcePolicyId: firstPolicy.sourcePolicyId,
  }), "TARGET_IMPORT_PROVIDER_LINEAGE_REQUIRED");
  const authorityCountsAfter = await Promise.all(importAuthorityCollections.map((collection) => (
    expectCollectionCount(collection, () => true)
  )));
  assert(JSON.stringify(authorityCountsAfter) === JSON.stringify(authorityCountsBefore), "Rejected manual/provider provenance spoof created durable import, identity, claim, or cost truth");

  const originalProviderIdentityFetch = global.fetch;
  let providerIdentityRecords = [
    { BusinessName: "Same Name Cafe", BusinessType: "Restaurant/Cafe/Canteen", FHRSID: 9100001 },
    { BusinessName: "Same Name Cafe", BusinessType: "Restaurant/Cafe/Canteen", FHRSID: 9100002 },
  ];
  global.fetch = async () => new Response(JSON.stringify({ establishments: providerIdentityRecords }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
  let providerIdentityImport;
  try {
    providerIdentityImport = await runSignalDeskSourceProviderServer(access, {
      city: "Leeds",
      country: "UK",
      idempotencyKey: "e2e-provider:stable-provider-pair",
      maxResults: 2,
      provider: "fhrs-fhis",
      query: "stable provider identity pair",
      sourcePolicyId: providerIdentityPolicy.sourcePolicyId,
    });
    assert(providerIdentityImport.targets.length === 2, "Same-name provider records collapsed into one target");
    assert(new Set(providerIdentityImport.targets.map((target) => target.targetId)).size === 2, "Different provider record IDs produced one target identity");
    assert(providerIdentityImport.targets.every((target) => target.primaryOpportunity === "missing-current-list"), "Provider record URLs were misrepresented as current-list truth");
    providerIdentityRecords = [providerIdentityRecords[0]];
    const providerIdentityReplay = await runSignalDeskSourceProviderServer(access, {
      city: "Leeds",
      country: "UK",
      idempotencyKey: "e2e-provider:stable-provider-cross-run",
      maxResults: 1,
      provider: "fhrs-fhis",
      query: "stable provider identity cross run",
      sourcePolicyId: providerIdentityPolicy.sourcePolicyId,
    });
    assert(providerIdentityReplay.targets[0].targetId === providerIdentityImport.targets[0].targetId, "Stable provider record changed target identity across runs");
  } finally {
    global.fetch = originalProviderIdentityFetch;
  }
  const providerRebindPolicy = await createPolicy("Stable provider rebind guard", {
    allowContact: false,
    allowPersonalization: false,
    idempotencyKey: "e2e-policy-stable-provider-rebind",
    provider: "fhrs-fhis",
    sourceType: "provider",
  });
  const originalProviderRebindFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ establishments: [providerIdentityRecords[0]] }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
  try {
    await expectRejects("Stable provider source-policy rebind", () => runSignalDeskSourceProviderServer(access, {
      city: "Leeds",
      country: "UK",
      idempotencyKey: "e2e-provider:stable-provider-rebind",
      maxResults: 1,
      provider: "fhrs-fhis",
      query: "stable provider identity rebind",
      sourcePolicyId: providerRebindPolicy.sourcePolicyId,
    }), "TARGET_SOURCE_POLICY_REBIND");
  } finally {
    global.fetch = originalProviderRebindFetch;
  }

  const foreignPolicy = await createPolicy("Foreign product guard");
  await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(foreignPolicy.sourcePolicyId).set({ pId: "FOREIGN" }, { merge: true });
  await expectRejects("Foreign source-policy product", () => importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:foreign-policy",
    rows: [rowFor("ForeignPolicy")],
    sourceName: "foreign policy import",
    sourcePolicyId: foreignPolicy.sourcePolicyId,
  }), "SOURCE_POLICY_PRODUCT_MISMATCH");
  const mismatchedPolicy = await createPolicy("Policy identity guard");
  await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(mismatchedPolicy.sourcePolicyId).set({ sourcePolicyId: "different_policy_id" }, { merge: true });
  await expectRejects("Mismatched source-policy identity", () => importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:mismatched-policy",
    rows: [rowFor("MismatchedPolicy")],
    sourceName: "mismatched policy import",
    sourcePolicyId: mismatchedPolicy.sourcePolicyId,
  }), "SOURCE_POLICY_IDENTITY_MISMATCH");

  const permissionRow = rowFor("PermissionEvidenceRequired");
  delete permissionRow.permissionEvidenceRef;
  await expectRejects("Contact row without permission evidence", () => importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:missing-permission-evidence",
    rows: [permissionRow],
    sourceName: "missing permission evidence",
    sourcePolicyId: firstPolicy.sourcePolicyId,
  }), "TARGET_IMPORT_PERMISSION_EVIDENCE_REQUIRED");

  const divergentRow = rowFor("DivergentDuplicate");
  await expectRejects("Divergent duplicate rows", () => importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:divergent-duplicate",
    rows: [divergentRow, { ...divergentRow, notes: "Divergent duplicate payload." }],
    sourceName: "divergent duplicate import",
    sourcePolicyId: firstPolicy.sourcePolicyId,
  }), "TARGET_IMPORT_DIVERGENT_DUPLICATE");

  const matureRow = rowFor("MaturePreservation");
  const matureFirst = await importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:mature-first",
    rows: [matureRow],
    sourceName: "mature target first import",
    sourcePolicyId: firstPolicy.sourcePolicyId,
  });
  const matureTargetId = matureFirst.targets[0].targetId;
  strictProjectionSentinelTargetId = matureTargetId;
  await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(matureTargetId).set({
    contactabilityScore: 91,
    email: "must-not-leak@example.invalid",
    fitScore: 93,
    instagram: "must-not-leak",
    latestOutcomeAt: timestampNow(),
    nextAction: "outcome",
    phone: "+19999999999",
    privateSecret: "must-not-leak",
    segment: "a",
    status: "converted",
    updatedAt: timestampNow(),
    updatedBy: "private-writer",
  }, { merge: true });
  const matureReplay = await importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:mature-second",
    rows: [matureRow],
    sourceName: "mature target second import",
    sourcePolicyId: firstPolicy.sourcePolicyId,
  });
  assert(matureReplay.targets[0].status === "converted", "Re-import regressed mature target status");
  assert(matureReplay.targets[0].segment === "a" && matureReplay.targets[0].nextAction === "outcome", "Re-import regressed mature target lifecycle");
  assert(matureReplay.targets[0].fitScore === 93 && matureReplay.targets[0].contactabilityScore === 91, "Re-import erased mature derived scores");

  const secondPolicy = await createPolicy("Policy rebind guard");
  await expectRejects("Target source-policy rebind", () => importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:source-policy-rebind",
    rows: [matureRow],
    sourceName: "policy rebind import",
    sourcePolicyId: secondPolicy.sourcePolicyId,
  }), "TARGET_SOURCE_POLICY_REBIND");

  const orphanRow = rowFor("OrphanIdentity");
  const orphanImport = await importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:orphan-setup",
    rows: [orphanRow],
    sourceName: "orphan setup",
    sourcePolicyId: firstPolicy.sourcePolicyId,
  });
  const orphanTargetId = orphanImport.targets[0].targetId;
  await Promise.all([
    db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(orphanTargetId).delete(),
    db.collection(SIGNALDESK_COLLECTIONS.TARGETS).doc(orphanTargetId).delete(),
  ]);
  await expectRejects("Orphaned identity index", () => importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:orphan-rejection",
    rows: [orphanRow],
    sourceName: "orphan rejection",
    sourcePolicyId: firstPolicy.sourcePolicyId,
  }), "TARGET_IMPORT_ORPHANED_IDENTITY");

  const invalidTargetRefs = Array.from({ length: 125 }, (_, index) => (
    db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(`a_invalid_target_${String(index).padStart(3, "0")}`)
  ));
  const invalidPolicyRefs = Array.from({ length: 35 }, (_, index) => (
    db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(`a_invalid_policy_${String(index).padStart(3, "0")}`)
  ));
  const matureSummarySnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(matureTargetId).get();
  const matureSummaryRaw = matureSummarySnap.data();
  const matureDetailSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGETS).doc(matureTargetId).get();
  const matureDetailRaw = matureDetailSnap.data();
  const normalizedLegacyUrlTarget = parseSignalDeskTargetSummaryDocument({
    ...matureSummaryRaw,
    website: "https://example.invalid",
  }, matureTargetId);
  assert(normalizedLegacyUrlTarget.website === "https://example.invalid/", "Harmless legacy HTTP URL shape was not normalized at the read boundary");
  await expectRejects("Persisted target credential URL", () => parseSignalDeskTargetSummaryDocument({
    ...matureSummaryRaw,
    website: "https://owner:secret@example.invalid/menu",
  }, matureTargetId), "TARGET_SHAPE_INVALID");
  await expectRejects("Persisted target email canonical form", () => parseSignalDeskTargetDetailDocument({
    ...matureDetailRaw,
    email: "Owner@Example.invalid",
  }, matureTargetId), "TARGET_DETAIL_SHAPE_INVALID");
  await expectRejects("Persisted target phone canonical form", () => parseSignalDeskTargetDetailDocument({
    ...matureDetailRaw,
    phone: "+12callme",
  }, matureTargetId), "TARGET_DETAIL_SHAPE_INVALID");
  await expectRejects("Persisted target Instagram canonical form", () => parseSignalDeskTargetDetailDocument({
    ...matureDetailRaw,
    instagram: "invalid handle",
  }, matureTargetId), "TARGET_DETAIL_SHAPE_INVALID");
  await expectRejects("Target provider identity cannot appear on a legacy identity", () => parseSignalDeskTargetDetailDocument({
    ...matureDetailRaw,
    identityVersion: "legacy-business-v1",
    provider: "google-places",
  }, matureTargetId), "TARGET_DETAIL_SHAPE_INVALID");
  await expectRejects("Target provider-record identity requires a provider", () => parseSignalDeskTargetDetailDocument({
    ...matureDetailRaw,
    identityVersion: "provider-record-v1",
    provider: null,
    providerRecordId: "record-without-provider",
  }, matureTargetId), "TARGET_DETAIL_SHAPE_INVALID");
  await expectRejects("Target provider URL identity cannot also claim a record ID", () => parseSignalDeskTargetDetailDocument({
    ...matureDetailRaw,
    identityVersion: "provider-url-v1",
    provider: "google-places",
    providerRecordId: "conflicting-record",
    providerRecordUrl: "https://maps.example.invalid/place",
  }, matureTargetId), "TARGET_DETAIL_SHAPE_INVALID");
  await expectRejects("Target detail rejects manual as an external provider", () => parseSignalDeskTargetDetailDocument({
    ...matureDetailRaw,
    identityVersion: "provider-business-v1",
    provider: "manual",
  }, matureTargetId), "TARGET_DETAIL_SHAPE_INVALID");

  const strictIdentityHash = "a".repeat(64);
  const projectedIdentity = parseSignalDeskIdentityIndexDocument({
    identityHash: strictIdentityHash,
    pId: SIGNALDESK_PRODUCT_CODE,
    privateSecret: "must-not-survive",
    targetId: matureTargetId,
  }, strictIdentityHash);
  assert(!("privateSecret" in projectedIdentity), "Identity-index projector leaked an unknown persisted field");
  const contactIdentityId = `email_${"b".repeat(64)}`;
  const projectedContactIdentity = parseSignalDeskContactIdentityDocument({
    channel: "email",
    identityId: contactIdentityId,
    pId: SIGNALDESK_PRODUCT_CODE,
    permissionEvidenceRef: "e2e:permission:strict-contact",
    permissionState: "permissioned",
    privateSecret: "must-not-survive",
    sourcePolicyId: firstPolicy.sourcePolicyId,
    sourceRunId: "source_run_strict_contact",
    targetId: matureTargetId,
    value: "owner@example.invalid",
  }, contactIdentityId);
  assert(!("privateSecret" in projectedContactIdentity), "Contact-identity projector leaked an unknown persisted field");
  await expectRejects("Contact identity rejects trim-normalized document identity", () => parseSignalDeskContactIdentityDocument({
    channel: "email",
    identityId: ` ${contactIdentityId} `,
    pId: SIGNALDESK_PRODUCT_CODE,
    permissionState: "permissioned",
    sourcePolicyId: firstPolicy.sourcePolicyId,
    sourceRunId: "source_run_strict_contact",
    targetId: matureTargetId,
    value: "owner@example.invalid",
  }, contactIdentityId), "CONTACT_IDENTITY_MISMATCH");
  const sourceCandidateId = "candidate_strict_projection";
  const projectedCandidate = parseSignalDeskSourceCandidateDocument({
    blocked: false,
    displayName: "Strict projection candidate",
    pId: SIGNALDESK_PRODUCT_CODE,
    privateSecret: "must-not-survive",
    sourceCandidateId,
    sourcePolicyId: firstPolicy.sourcePolicyId,
    sourceRunId: "source_run_strict_candidate",
    targetId: matureTargetId,
  }, sourceCandidateId);
  assert(!("privateSecret" in projectedCandidate), "Source-candidate projector leaked an unknown persisted field");

  const scoringImport = await importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:strict-target-scoring",
    rows: [rowFor("StrictTargetScoring")],
    sourceName: "strict target scoring",
    sourcePolicyId: firstPolicy.sourcePolicyId,
  });
  const scoringTargetId = scoringImport.targets[0].targetId;
  const scoringTargetRef = db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(scoringTargetId);
  const scoringTargetBefore = await scoringTargetRef.get();
  await scoringTargetRef.set({ pId: "FOREIGN", updatedAt: timestampNow() }, { merge: true });
  await expectRejects("Target scoring rejects foreign target truth", () => scoreSignalDeskTargetServer(access, scoringTargetId), "TARGET_PRODUCT_MISMATCH");
  assert(await expectCollectionCount(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS, (data) => data.targetId === scoringTargetId) === 0, "Malformed target truth created an AI score run");
  await scoringTargetRef.set(scoringTargetBefore.data());
  const validTargetScore = await scoreSignalDeskTargetServer(access, scoringTargetId);
  const targetScoreRef = db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(validTargetScore.scoreId);
  const scoredTargetBeforeMalformedReplay = await scoringTargetRef.get();
  await targetScoreRef.set({ pId: "FOREIGN" }, { merge: true });
  await expectRejects("Target score replay rejects foreign score truth", () => scoreSignalDeskTargetServer(access, scoringTargetId), "TARGET_SCORE_PRODUCT_MISMATCH");
  await targetScoreRef.set({ fitScore: 101, pId: SIGNALDESK_PRODUCT_CODE }, { merge: true });
  await expectRejects("Target score replay rejects out-of-range score truth", () => scoreSignalDeskTargetServer(access, scoringTargetId), "TARGET_SCORE_SHAPE_INVALID");
  const scoredTargetAfterMalformedReplay = await scoringTargetRef.get();
  assert(
    scoredTargetAfterMalformedReplay.data()?.updatedAt?.toMillis() === scoredTargetBeforeMalformedReplay.data()?.updatedAt?.toMillis(),
    "Malformed prior score replay mutated target truth",
  );
  const malformedTargetScoreRaw = (await targetScoreRef.get()).data();
  await expectRejects("Target score identity cannot bind another target", () => parseSignalDeskTargetScoreDocument({
    ...malformedTargetScoreRaw,
    fitScore: 50,
    targetId: "different_target",
  }, validTargetScore.scoreId, scoringTargetId), "TARGET_SCORE_IDENTITY_MISMATCH");
  const invalidScoreTargetRef = db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc("a_invalid_score_target");
  const invalidTimestampTargetRef = db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc("a_invalid_timestamp_target");
  const matureRunSnap = await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_RUN_SUMMARIES).doc(matureFirst.run.sourceRunId).get();
  const matureRunRaw = matureRunSnap.data();
  const invalidCountRunRef = db.collection(SIGNALDESK_COLLECTIONS.SOURCE_RUN_SUMMARIES).doc("a_invalid_count_source_run");
  const invalidStatusRunRef = db.collection(SIGNALDESK_COLLECTIONS.SOURCE_RUN_SUMMARIES).doc("a_invalid_status_source_run");
  const invalidTimestampRunRef = db.collection(SIGNALDESK_COLLECTIONS.SOURCE_RUN_SUMMARIES).doc("a_invalid_timestamp_source_run");
  await Promise.all([
    ...invalidTargetRefs.map((ref) => ref.set({ pId: "FOREIGN", targetId: ref.id, updatedAt: timestampNow() })),
    ...invalidPolicyRefs.map((ref) => ref.set({ pId: "FOREIGN", sourcePolicyId: ref.id, updatedAt: timestampNow() })),
    invalidScoreTargetRef.set({ ...matureSummaryRaw, fitScore: 101, targetId: invalidScoreTargetRef.id, updatedAt: timestampNow() }),
    invalidTimestampTargetRef.set({ ...matureSummaryRaw, latestOutcomeAt: new Date().toISOString(), targetId: invalidTimestampTargetRef.id, updatedAt: timestampNow() }),
    invalidCountRunRef.set({ ...matureRunRaw, duplicateCount: Number(matureRunRaw.importedCount) + 1, sourceRunId: invalidCountRunRef.id, updatedAt: timestampNow() }),
    invalidStatusRunRef.set({ ...matureRunRaw, blockedCount: 0, sourceRunId: invalidStatusRunRef.id, status: "partial", updatedAt: timestampNow() }),
    invalidTimestampRunRef.set({ ...matureRunRaw, sourceRunId: invalidTimestampRunRef.id, updatedAt: new Date().toISOString() }),
  ]);
  const workspace = await loadSignalDeskWorkspaceServer(access, "targets");
  const projectedTarget = workspace.workspace.targets.find((target) => target.targetId === matureTargetId);
  assert(projectedTarget, "Bounded strict target scan was starved by malformed first-page records");
  assert(workspace.workspace.policies.some((policy) => policy.sourcePolicyId === firstPolicy.sourcePolicyId), "Bounded strict policy scan was starved by malformed first-page records");
  const exactTargetDtoKeys = [
    "category", "city", "contactability", "contactabilityScore", "country", "currentListGapScore", "currentListUrl", "displayName",
    "fitScore", "latestApprovalId", "latestConversationId", "latestDraftId", "latestManualContactAt", "latestManualContactResult",
    "latestManualContactRoute", "latestOutcomeAt", "latestVerifiedActivationAt", "latestVerifiedActivationEvidenceRef",
    "latestVerifiedActivationIntegrityStatus", "latestVerifiedActivationSurfaces", "nextAction", "ownerQualifiedAt", "primaryOpportunity",
    "riskScore", "segment", "sourceConfidence", "sourcePolicyId", "sourceRunId", "status", "suppressionStatus", "targetId", "updatedAt", "website",
  ].sort();
  assert(JSON.stringify(Object.keys(projectedTarget).sort()) === JSON.stringify(exactTargetDtoKeys), "Target summary DTO key allowlist drifted");
  assert(!("email" in projectedTarget) && !("phone" in projectedTarget) && !("instagram" in projectedTarget) && !("privateSecret" in projectedTarget) && !("updatedBy" in projectedTarget), "Target summary DTO leaked contact or private fields");
  await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(matureTargetId).set({
    email: admin.firestore.FieldValue.delete(),
    instagram: admin.firestore.FieldValue.delete(),
    phone: admin.firestore.FieldValue.delete(),
    privateSecret: admin.firestore.FieldValue.delete(),
    updatedBy: admin.firestore.FieldValue.delete(),
  }, { merge: true });
  const cleanedMatureTarget = (await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(matureTargetId).get()).data();
  assert(!Object.prototype.hasOwnProperty.call(cleanedMatureTarget || {}, "privateSecret"), "Strict target projection fixture did not remove its private-secret sentinel");
  assert(!workspace.workspace.targets.some((target) => target.targetId === invalidScoreTargetRef.id), "Out-of-range persisted target score reached the workspace");
  assert(!workspace.workspace.targets.some((target) => target.targetId === invalidTimestampTargetRef.id), "Malformed-present target timestamp reached the workspace");
  const importWorkspace = await loadSignalDeskWorkspaceServer(access, "imports");
  assert(!importWorkspace.workspace.imports.some((run) => run.sourceRunId === invalidCountRunRef.id), "Impossible source-run count reached the workspace");
  assert(!importWorkspace.workspace.imports.some((run) => run.sourceRunId === invalidStatusRunRef.id), "Contradictory source-run status reached the workspace");
  assert(!importWorkspace.workspace.imports.some((run) => run.sourceRunId === invalidTimestampRunRef.id), "Malformed source-run timestamp reached the workspace");
  await Promise.all([
    ...invalidTargetRefs,
    ...invalidPolicyRefs,
    invalidScoreTargetRef,
    invalidTimestampTargetRef,
    invalidCountRunRef,
    invalidStatusRunRef,
    invalidTimestampRunRef,
  ].map((ref) => ref.delete()));
}

async function assertHappyPath() {
  const checkpoint = (step) => {
    activeE2eCheckpoint = `happy-path:${step}`;
    if (process.env.SIGNALDESK_E2E_DEBUG_STEPS === "1") console.log(`[SignalDesk E2E] happy-path:${step}`);
  };
  checkpoint("source-policy:start");
  const sourcePolicy = await createPolicy("Happy path");
  checkpoint("target-import:start");
  const targetId = await importOne(sourcePolicy.sourcePolicyId, "Happy");
  checkpoint("target-import:complete");
  const targetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).get();
  assert(targetSnap.exists, "Target summary was not created");
  const target = targetSnap.data();
  assert(target.sourcePolicyId === sourcePolicy.sourcePolicyId, "Source provenance was not attached to target");
  assert(target.sourceRunId, "Source run provenance was not attached to target");
  assert(target.contactability === "ready", "Contactability state was not created");

  const waterfallId = `waterfall_happy_${hashValue(targetId).slice(0, 12)}`;
  await db.collection(SIGNALDESK_COLLECTIONS.ENRICHMENT_WATERFALLS).doc(waterfallId).set({
    maxCostUsd: 0,
    maxCredits: 1,
    name: "Happy path existing website",
    pId: "SD",
    providerOrder: ["hunter"],
    requestedField: "website",
    retentionDays: 30,
    sourcePolicyId: sourcePolicy.sourcePolicyId,
    status: "active",
    stopCondition: "first-candidate",
    updatedAt: admin.firestore.Timestamp.now(),
    verificationRequired: false,
    waterfallId,
  });
  const waterfallInput = { idempotencyKey: `waterfall-happy-${targetId}`, targetId, waterfallId };
  checkpoint("enrichment-waterfall:start");
  const [waterfallResult, waterfallReplay] = await Promise.all([
    runSignalDeskEnrichmentWaterfallServer(access, waterfallInput),
    runSignalDeskEnrichmentWaterfallServer(access, waterfallInput),
  ]);
  checkpoint("enrichment-waterfall:complete");
  assert(waterfallResult.enrichmentResultId === waterfallReplay.enrichmentResultId, "Concurrent enrichment waterfall retry did not converge");
  assert(waterfallResult.status === "verified" && waterfallResult.provider === "manual", "Existing approved enrichment value was not reused");
  assert(!Object.prototype.hasOwnProperty.call(waterfallResult, "pId") && !Object.prototype.hasOwnProperty.call(waterfallResult, "updatedBy"), "Enrichment waterfall returned private persisted fields");
  await expectRejects("Conflicting enrichment-waterfall key reuse", () => runSignalDeskEnrichmentWaterfallServer(access, { ...waterfallInput, waterfallId: "waterfall_changed" }), "ENRICHMENT_WATERFALL_IDEMPOTENCY_CONFLICT");
  const waterfallVendorCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.VENDOR_RUNS, (data) => data.waterfallId === waterfallId && data.targetId === targetId);
  assert(waterfallVendorCount === 1, "Concurrent enrichment waterfall retry duplicated vendor truth");
  const sourceProviderPauseRef = db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc("scope_source-provider");
  await sourceProviderPauseRef.set(activeKillSwitchFixture("source-provider"));
  await expectRejects("Paused enrichment-waterfall settlement", () => runSignalDeskEnrichmentWaterfallServer(access, { ...waterfallInput, idempotencyKey: `waterfall-paused-${targetId}` }), "SignalDesk source providers are paused");
  await sourceProviderPauseRef.delete();

  const identityCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.IDENTITY_INDEX, (data) => data.targetId === targetId);
  assert(identityCount === 1, "Dedupe identity index was not created");

  const [score, duplicateScore] = await Promise.all([
    scoreSignalDeskTargetServer(access, targetId),
    scoreSignalDeskTargetServer(access, targetId),
  ]);
  checkpoint("score:complete");
  assert(score.fitScore >= 0, "Score output was not created");
  assert(score.scoreId === duplicateScore.scoreId, "Concurrent identical target scoring created duplicate operations");

  const decisionSnapshotCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.DECISION_SNAPSHOTS, (data) => data.targetId === targetId);
  assert(decisionSnapshotCount === 1, "Concurrent identical target scoring created duplicate decision snapshots");
  const scoreLedgerCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AI_OPERATION_LEDGER, (data) => data.targetId === targetId && data.operation === "target_score");
  assert(scoreLedgerCount === 1, "Concurrent identical target scoring created duplicate ledgers");

  const [evidence, duplicateEvidence] = await Promise.all([
    createSignalDeskEvidenceServer(access, targetId),
    createSignalDeskEvidenceServer(access, targetId),
  ]);
  checkpoint("evidence:complete");
  assert(evidence.evidencePacketId === duplicateEvidence.evidencePacketId, "Concurrent identical evidence creation produced duplicate packets");
  const evidenceDetailSnap = await db.collection(SIGNALDESK_COLLECTIONS.EVIDENCE_PACKETS).doc(evidence.evidencePacketId).get();
  assert(evidenceDetailSnap.exists, "Evidence detail packet was not created");
  assert(evidence.allowedUse.includes("draft-personalization"), "Evidence did not preserve personalization allowed use");
  assert(evidence.currentMenuPresence?.diagnosticVersion === "current-menu-presence-v1", "Evidence did not include the current-menu diagnostic contract");
  assert(evidence.currentMenuPresence?.ownerControlState === "unverified", "Evidence inferred owner control without owner proof");
  assert(evidence.currentMenuPresence?.mobileAccessState === "unverified", "Evidence inferred mobile accessibility without direct proof");
  assert(evidence.currentMenuPresence?.sourceRefs.includes(`source-policy:${sourcePolicy.sourcePolicyId}`), "Current-menu diagnostic lost source-policy provenance");
  assert(evidence.currentMenuPresence?.sourceRefs.some((sourceRef) => sourceRef.startsWith("source-run:")), "Current-menu diagnostic lost source-run provenance");
  assert(evidence.rejectedFacts.some((fact) => fact.includes("sales impact")), "Evidence did not reject unsupported commercial-impact claims");
  const evidenceSummaryCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES, (data) => data.targetId === targetId);
  assert(evidenceSummaryCount === 1, "Concurrent identical evidence creation produced duplicate summaries");

  const malformedEvidenceRefs = Array.from({ length: 31 }, (_, index) => (
    db.collection(SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES).doc(`invalid_recent_evidence_${index}_${hashValue(targetId).slice(0, 8)}`)
  ));
  const malformedEvidenceBatch = db.batch();
  malformedEvidenceRefs.forEach((reference, index) => malformedEvidenceBatch.set(reference, {
    evidencePacketId: reference.id,
    pId: SIGNALDESK_PRODUCT_CODE,
    targetId,
    updatedAt: admin.firestore.Timestamp.fromMillis(Date.now() + ((index + 1) * 60_000)),
  }));
  await malformedEvidenceBatch.commit();

  const queueBeforeDraft = await db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.QUEUES)
    .get();
  const approvalBacklogBeforeDraft = Number(queueBeforeDraft.data()?.approvalBacklog || 0);
  const humanReviewBeforeDraft = Number(queueBeforeDraft.data()?.humanReview || 0);
  let draftResult;
  let duplicateDraftResult;
  try {
    [draftResult, duplicateDraftResult] = await Promise.all([
      createSignalDeskDraftServer(access, { targetId }),
      createSignalDeskDraftServer(access, { targetId }),
    ]);
  } finally {
    const malformedEvidenceCleanup = db.batch();
    malformedEvidenceRefs.forEach((reference) => malformedEvidenceCleanup.delete(reference));
    await malformedEvidenceCleanup.commit();
  }
  checkpoint("draft:complete");
  assert(draftResult.draft.draftId === duplicateDraftResult.draft.draftId, "Concurrent identical draft creation produced duplicate drafts");
  assert(draftResult.approval.approvalId === duplicateDraftResult.approval.approvalId, "Concurrent identical draft creation produced duplicate approvals");
  assert(draftResult.approvalPacket.approvalPacketId === duplicateDraftResult.approvalPacket.approvalPacketId, "Concurrent identical draft creation produced duplicate approval packets");
  for (const publicValue of [draftResult.draft, draftResult.approval, draftResult.approvalPacket]) {
    assert(!("contactIdentityId" in publicValue) && !("contactAuthorityFingerprintHash" in publicValue), "Outbound contact binding leaked through a public mutation DTO");
  }
  const [storedDraftBinding, storedApprovalBinding, storedPacketBinding] = await Promise.all([
    db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(draftResult.draft.draftId).get(),
    db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(draftResult.approval.approvalId).get(),
    db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS).doc(draftResult.approvalPacket.approvalPacketId).get(),
  ]);
  const storedContactIdentityId = storedDraftBinding.data()?.contactIdentityId;
  const storedContactFingerprint = storedDraftBinding.data()?.contactAuthorityFingerprintHash;
  assert(storedContactIdentityId && storedContactFingerprint, "Draft did not persist exact contact authority binding");
  assert(storedApprovalBinding.data()?.contactIdentityId === storedContactIdentityId && storedApprovalBinding.data()?.contactAuthorityFingerprintHash === storedContactFingerprint, "Approval contact authority binding diverged from draft truth");
  assert(storedPacketBinding.data()?.contactIdentityId === storedContactIdentityId && storedPacketBinding.data()?.contactAuthorityFingerprintHash === storedContactFingerprint, "Approval packet contact authority binding diverged from draft truth");
  const draftCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES, (data) => data.targetId === targetId);
  const approvalCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE, (data) => data.targetId === targetId);
  const approvalPacketCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS, (data) => data.targetId === targetId);
  assert(draftCount === 1, "Concurrent identical draft creation wrote duplicate draft summaries");
  assert(approvalCount === 1, "Concurrent identical draft creation wrote duplicate approval queue items");
  assert(approvalPacketCount === 1, "Concurrent identical draft creation wrote duplicate approval packets");
  const replayPacketRef = db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS).doc(draftResult.approvalPacket.approvalPacketId);
  const replayPacketSnapshot = await replayPacketRef.get();
  await replayPacketRef.delete();
  try {
    await expectRejects("Partial draft replay", () => createSignalDeskDraftServer(access, { targetId }), "DRAFT_REPLAY_INCOMPLETE");
  } finally {
    await replayPacketRef.set(replayPacketSnapshot.data());
  }
  const queueAfterDraft = await db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.QUEUES)
    .get();
  assert(Number(queueAfterDraft.data()?.approvalBacklog || 0) === approvalBacklogBeforeDraft + 1, "Concurrent identical draft creation incremented approval backlog more than once");
  assert(Number(queueAfterDraft.data()?.humanReview || 0) === humanReviewBeforeDraft + 1, "Concurrent identical draft creation incremented human review more than once");
  assert(draftResult.draft.unsupportedClaims.length === 0, "Safe draft contains unsupported claims");
  assert(draftResult.approval.status === "pending", "Approval packet was not pending");
  assert(draftResult.approvalPacket.approvalPacketId, "Approval packet summary was not created");
  assert(draftResult.approvalPacket.actionVersion === "signaldesk-action-packet-v1", "Approval packet did not bind the exact action contract");
  assert(draftResult.approvalPacket.actionFingerprintHash?.length === 64, "Approval packet action fingerprint is missing or malformed");
  assert(draftResult.draft.ctaId === contentFixtureCtaId && draftResult.draft.ctaFingerprintHash?.length === 64, "Outbound draft did not bind exact CTA lineage");
  assert(draftResult.approvalPacket.ctaId === draftResult.draft.ctaId && draftResult.approvalPacket.ctaFingerprintHash === draftResult.draft.ctaFingerprintHash, "Approval packet CTA lineage diverged from its draft");
  assert(draftResult.approvalPacket.allowedRoute === "email-export", "Approval packet did not bind the allowed export-only route");
  assert(draftResult.approvalPacket.messageBody === draftResult.draft.body, "Approval packet did not snapshot the exact draft body");
  assert(draftResult.approvalPacket.messageSubject === draftResult.draft.subject, "Approval packet did not snapshot the exact draft subject");
  assert(draftResult.approvalPacket.evidenceSummary === evidence.summary, "Approval packet did not snapshot the evidence summary");
  assert(draftResult.approvalPacket.currentMenuPresence?.diagnosticVersion === "current-menu-presence-v1", "Approval packet lost the current-menu diagnostic");
  assert(draftResult.approvalPacket.unsupportedClaims.length === 0, "Approval packet did not preserve the unsupported-claim result");
  await replayPacketRef.set({
    legacyPrivate: "remove-on-authoritative-refresh",
    riskSummary: "Poisoned packet summary requiring authoritative refresh.",
  }, { merge: true });
  const [refreshedPacket, duplicateRefreshedPacket] = await Promise.all([
    createSignalDeskApprovalPacketServer(access, { approvalId: draftResult.approval.approvalId }),
    createSignalDeskApprovalPacketServer(access, { approvalId: draftResult.approval.approvalId }),
  ]);
  assert(refreshedPacket.approvalPacketId === draftResult.approvalPacket.approvalPacketId, "Approval packet refresh repointed the pending approval");
  assert(duplicateRefreshedPacket.approvalPacketId === refreshedPacket.approvalPacketId, "Concurrent identical approval packet refresh created duplicate packet identity");
  const refreshedApprovalPacketCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS, (data) => data.targetId === targetId);
  assert(refreshedApprovalPacketCount === 1, "Concurrent identical approval packet refresh wrote duplicate packet truth");
  assert(!Object.prototype.hasOwnProperty.call((await replayPacketRef.get()).data() || {}, "legacyPrivate"), "Approval packet authoritative refresh preserved a stale private field");

  await db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(draftResult.draft.draftId).set({
    body: `${draftResult.draft.body} Changed after founder packet preparation.`,
  }, { merge: true });
  await expectRejects("Changed exact action after packet preparation", () => reviewSignalDeskApprovalServer(access, {
    approvalId: draftResult.approval.approvalId,
    reason: "Must not approve a changed action.",
    status: "approved",
  }), "Approval packet is stale");
  const staleApprovalSnap = await db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(draftResult.approval.approvalId).get();
  assert(staleApprovalSnap.data()?.status === "pending", "Stale action packet changed approval state");
  await db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(draftResult.draft.draftId).set({
    body: draftResult.draft.body,
  }, { merge: true });
  const reboundPacket = await createSignalDeskApprovalPacketServer(access, { approvalId: draftResult.approval.approvalId });
  assert(reboundPacket.actionFingerprintHash === draftResult.approvalPacket.actionFingerprintHash, "Restored exact action did not restore the approval fingerprint");

  const canonicalCtaRef = db.collection(SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS).doc(contentFixtureCtaId);
  await canonicalCtaRef.set({ copy: `${contentFixtureCtaCopy} Authority changed.`, updatedAt: timestampNow() }, { merge: true });
  await expectRejects("Approval after CTA fingerprint drift", () => reviewSignalDeskApprovalServer(access, {
    approvalId: draftResult.approval.approvalId,
    reason: "A changed CTA requires a fresh draft.",
    status: "approved",
  }), "CONTENT_CTA_STALE");
  await canonicalCtaRef.set({ copy: contentFixtureCtaCopy, updatedAt: timestampNow() }, { merge: true });
  const roguePreviewRef = db.collection(SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS).doc("cta_rogue_active_preview_e2e");
  await roguePreviewRef.set({
    copy: "Rogue active preview CTA.",
    ctaId: roguePreviewRef.id,
    ctaType: "preview",
    label: "Rogue preview",
    pId: "SD",
    status: "active",
    updatedAt: timestampNow(),
  });
  await expectRejects("Approval with dual-active preview CTA authority", () => reviewSignalDeskApprovalServer(access, {
    approvalId: draftResult.approval.approvalId,
    reason: "Ambiguous CTA authority must fail closed.",
    status: "approved",
  }), "CONTENT_CTA_ACTIVE_AMBIGUOUS");
  await roguePreviewRef.delete();

  const approval = await reviewSignalDeskApprovalServer(access, {
    approvalId: draftResult.approval.approvalId,
    reason: "E2E human approval.",
    status: "approved",
  });
  checkpoint("approval:complete");
  assert(approval.status === "approved", "Human approval failed");

  const exportResults = await Promise.all([
    exportSignalDeskMessageServer(access, draftResult.approval.approvalId),
    exportSignalDeskMessageServer(access, draftResult.approval.approvalId),
  ]);
  const exportResult = exportResults.find((result) => result.replay !== true);
  const duplicateExportResult = exportResults.find((result) => result !== exportResult);
  checkpoint("export:complete");
  assert(exportResult && duplicateExportResult, "Concurrent export did not return one fresh result and one replay acknowledgement");
  assert(exportResult.status === "exported", "Export-only handoff was not created");
  assert(exportResult.exportId === duplicateExportResult.exportId, "Concurrent identical export preparation created duplicate exports");
  assert(duplicateExportResult.replay === true && !("body" in duplicateExportResult) && !("subject" in duplicateExportResult), "Concurrent export replay was not a redacted historical acknowledgement");
  assert(exportResult.ctaId === draftResult.draft.ctaId && exportResult.ctaFingerprintHash === draftResult.draft.ctaFingerprintHash, "Message export lost CTA lineage");
  assert(!exportResult.providerMessageId, "Export path created a provider-send message id");

  const exportSnap = await db.collection(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS).where("approvalId", "==", draftResult.approval.approvalId).limit(1).get();
  assert(!exportSnap.empty, "Message export record was not created");
  assert(exportSnap.docs[0].data().status === "exported", "Message export record was not export-only");
  const exportCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS, (data) => data.approvalId === draftResult.approval.approvalId);
  assert(exportCount === 1, "Concurrent identical export preparation wrote duplicate export truth");

  const legacyLineagePreview = {
    copy: "Noncanonical historical preview CTA.",
    ctaId: roguePreviewRef.id,
    ctaType: "preview",
    label: "Historical preview",
    pId: "SD",
    status: "active",
    updatedAt: timestampNow(),
  };
  const legacyLineageFingerprintHash = hashValue(JSON.stringify({
    copy: legacyLineagePreview.copy,
    ctaId: legacyLineagePreview.ctaId,
    ctaType: legacyLineagePreview.ctaType,
    label: legacyLineagePreview.label,
    status: legacyLineagePreview.status,
  }));
  await roguePreviewRef.set(legacyLineagePreview);
  await exportSnap.docs[0].ref.set({
    ctaFingerprintHash: legacyLineageFingerprintHash,
    ctaId: roguePreviewRef.id,
  }, { merge: true });
  const noncanonicalCtaReplay = await exportSignalDeskMessageServer(access, draftResult.approval.approvalId);
  assert(noncanonicalCtaReplay.replay === true && noncanonicalCtaReplay.currentAuthority === false, "Historical export replay did not expose noncanonical CTA revocation");
  assert(!("body" in noncanonicalCtaReplay) && !("recipient" in noncanonicalCtaReplay) && !("subject" in noncanonicalCtaReplay), "Historical export replay exposed reusable content after CTA lineage revocation");
  await exportSnap.docs[0].ref.set({
    ctaFingerprintHash: draftResult.draft.ctaFingerprintHash,
    ctaId: draftResult.draft.ctaId,
  }, { merge: true });
  await roguePreviewRef.delete();

  await canonicalCtaRef.set({ status: "hold", updatedAt: timestampNow() }, { merge: true });
  const revokedCtaExportReplay = await exportSignalDeskMessageServer(access, draftResult.approval.approvalId);
  assert(revokedCtaExportReplay.replay === true && revokedCtaExportReplay.currentAuthority === false, "Historical export replay did not expose revoked current CTA authority");
  assert(!("body" in revokedCtaExportReplay) && !("recipient" in revokedCtaExportReplay) && !("subject" in revokedCtaExportReplay), "Historical export replay exposed reusable content after CTA revocation");
  await canonicalCtaRef.set({ status: "active", updatedAt: timestampNow() }, { merge: true });

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
  checkpoint("manual-contact:complete");
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
    conversationId: await replyConversationIdFor(targetId),
    idempotencyKey: `reply-happy-${targetId}`,
    message: "Yes, send details.",
  });
  checkpoint("reply:complete");
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
  checkpoint("outcome:complete");
  assert(outcome.outcomeEventId, "Outcome event was not created");
  assert(outcome.activationWatchSyncStatus === "updated", "Outcome did not update the activation watch automatically");
  assert(outcome.activationWatch?.status === "activated", "Two-surface outcome did not close activation automatically");
  await captureSignalDeskReplyServer(access, {
    conversationId: await replyConversationIdFor(targetId),
    idempotencyKey: `reply-after-conversion-${targetId}`,
    message: "Thank you, we have completed this.",
  });
  const convertedAfterReplySnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).get();
  assert(convertedAfterReplySnap.data()?.status === "converted", "Reply capture downgraded a converted target");

  const demandInput = {
    idempotencyKey: `demand-happy-${targetId}`,
    signalType: "claim_attempt",
    sourceSurface: "manual",
    targetId,
    targetName: "Spoofed client name",
  };
  const [demand, demandReplay] = await Promise.all([
    captureSignalDeskDemandSignalServer(access, demandInput),
    captureSignalDeskDemandSignalServer(access, demandInput),
  ]);
  assert(demand.demandSignalId, "Demand signal was not created");
  assert([demand, demandReplay].filter((result) => result.duplicate === false).length === 1, "Concurrent demand signals did not elect one owner");
  assert([demand, demandReplay].filter((result) => result.duplicate === true).length === 1, "Concurrent demand signal replay was not durable");
  await expectRejects("Conflicting demand-signal key reuse", () => captureSignalDeskDemandSignalServer(access, {
    ...demandInput,
    signalType: "share",
  }), "DEMAND_SIGNAL_IDEMPOTENCY_CONFLICT");
  await expectRejects("Unknown demand-signal target", () => captureSignalDeskDemandSignalServer(access, {
    ...demandInput,
    idempotencyKey: `demand-unknown-${targetId}`,
    targetId: "target_missing",
  }), "Target not found");
  const demandSignalSnap = await db.collection(SIGNALDESK_COLLECTIONS.DEMAND_SIGNALS).doc(demand.demandSignalId).get();
  assert(demandSignalSnap.data()?.targetName === "SignalDesk Happy Cafe", "Demand signal trusted a client-supplied target name");
  const channelWindowInput = {
    channel: "whatsapp",
    idempotencyKey: `channel-window-${targetId}`,
    source: "inbound",
    status: "open",
    targetId,
  };
  const [channelWindow, channelWindowReplay] = await Promise.all([
    upsertSignalDeskChannelWindowStateServer(access, channelWindowInput),
    upsertSignalDeskChannelWindowStateServer(access, channelWindowInput),
  ]);
  assert(channelWindow.channelWindowId === channelWindowReplay.channelWindowId, "Concurrent channel-window retry did not converge");
  assert((await db.collection(SIGNALDESK_COLLECTIONS.CHANNEL_HEALTH_SUMMARIES).doc("whatsapp").get()).data()?.pId === SIGNALDESK_PRODUCT_CODE, "Channel-window health projection omitted SignalDesk product identity");
  await expectRejects("Conflicting channel-window key reuse", () => upsertSignalDeskChannelWindowStateServer(access, {
    ...channelWindowInput,
    status: "closed",
  }), "CHANNEL_WINDOW_IDEMPOTENCY_CONFLICT");
  await expectRejects("Unknown channel-window target", () => upsertSignalDeskChannelWindowStateServer(access, {
    ...channelWindowInput,
    idempotencyKey: `channel-window-unknown-${targetId}`,
    targetId: "target_missing",
  }), "Target not found");
  const trustPartnerId = `partner_metrics_${hashValue(targetId).slice(0, 12)}`;
  const trustDeliverableId = `deliverable_metrics_${hashValue(targetId).slice(0, 12)}`;
  await db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_PROFILES).doc(trustPartnerId).set({
    audienceFitScore: 80,
    baselineReachScore: 80,
    believableUsageScore: 80,
    channel: "community",
    commentQualityScore: 80,
    displayName: "Metrics Partner",
    geography: "Bengaluru",
    pId: "SD",
    partnerId: trustPartnerId,
    partnerType: "operator-advocate",
    sourceNotes: "Aggregate E2E metrics fixture.",
    status: "candidate",
    trustFeelScore: 80,
    trustScore: 80,
    updatedAt: timestampNow(),
    updatedBy: access.userId,
  });
  await db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_DELIVERABLES).doc(trustDeliverableId).set({
    dealId: null,
    deliverableId: trustDeliverableId,
    disclosurePresent: true,
    dueDate: null,
    pId: "SD",
    partnerId: trustPartnerId,
    postUrl: "https://example.com/signaldesk-metrics-proof",
    reviewState: "approved",
    status: "live",
    updatedAt: timestampNow(),
    updatedBy: access.userId,
  });
  const trustDemandRef = db.collection(SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES)
    .doc(`trust_partner_${trustPartnerId}_${new Date().toISOString().slice(0, 10)}`);
  await trustDemandRef.set({
    count: 1,
    day: new Date().toISOString().slice(0, 10),
    demandSignalId: trustDemandRef.id,
    pId: "ML",
    signalType: "referral",
    sourceSurface: "manual",
    targetId: null,
    targetName: null,
    updatedAt: timestampNow(),
  });
  const trustCollisionKey = `trust-metrics-collision-${targetId}`;
  await expectRejects("Trust metrics merged wrong-product demand summary", () => recordSignalDeskTrustPartnerMetricsServer(access, {
    activations: 0,
    commentQuality: "medium",
    comments: 0,
    currentListSubmissions: 0,
    deliverableId: trustDeliverableId,
    idempotencyKey: trustCollisionKey,
    ownerLeads: 1,
    partnerId: trustPartnerId,
    views: 1,
  }), "DEMAND_SIGNAL_SUMMARY_INVALID");
  assert((await trustDemandRef.get()).data()?.pId === "ML", "Trust metrics overwrote wrong-product demand authority");
  const rejectedTrustMetricId = `partner_metric_${hashValue(`${access.userId}|${trustCollisionKey}`).slice(0, 32)}`;
  assert(!(await db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_METRICS).doc(rejectedTrustMetricId).get()).exists, "Rejected trust demand collision wrote partial metric truth");
  await trustDemandRef.delete();
  const trustMetricInput = { activations: 0, commentQuality: "medium", comments: 2, currentListSubmissions: 0, deliverableId: trustDeliverableId, idempotencyKey: `trust-metrics-${targetId}`, ownerLeads: 1, partnerId: trustPartnerId, views: 20 };
  const [trustMetric, trustMetricReplay] = await Promise.all([
    recordSignalDeskTrustPartnerMetricsServer(access, trustMetricInput),
    recordSignalDeskTrustPartnerMetricsServer(access, trustMetricInput),
  ]);
  assert(trustMetric.metricsId === trustMetricReplay.metricsId, "Concurrent trust metrics did not converge");
  await expectRejects("Conflicting trust-metrics key reuse", () => recordSignalDeskTrustPartnerMetricsServer(access, { ...trustMetricInput, views: 21 }), "TRUST_PARTNER_METRICS_IDEMPOTENCY_CONFLICT");
  await expectRejects("Unknown trust-metrics deliverable", () => recordSignalDeskTrustPartnerMetricsServer(access, { ...trustMetricInput, deliverableId: "deliverable_missing", idempotencyKey: `trust-metrics-missing-${targetId}` }), "Trust partner deliverable not found");
  const validTrustDemandSummary = (await trustDemandRef.get()).data();
  assert(validTrustDemandSummary, "Trust metrics did not create valid demand authority");
  await trustDemandRef.set({ legacyPrivate: "reject-malformed-authority" }, { merge: true });
  const malformedTrustKey = `trust-metrics-malformed-${targetId}`;
  await expectRejects("Trust metrics accepted malformed demand summary", () => recordSignalDeskTrustPartnerMetricsServer(access, {
    ...trustMetricInput,
    idempotencyKey: malformedTrustKey,
    ownerLeads: 2,
  }), "DEMAND_SIGNAL_SUMMARY_INVALID");
  const rejectedMalformedTrustMetricId = `partner_metric_${hashValue(`${access.userId}|${malformedTrustKey}`).slice(0, 32)}`;
  assert(!(await db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_METRICS).doc(rejectedMalformedTrustMetricId).get()).exists, "Malformed trust demand authority caused a partial metric write");
  await trustDemandRef.set(validTrustDemandSummary);
  await recordSignalDeskTrustPartnerMetricsServer(access, { ...trustMetricInput, idempotencyKey: `trust-metrics-second-${targetId}`, ownerLeads: 2 });
  const trustDemandSnap = await trustDemandRef.get();
  assert(trustDemandSnap.data()?.count === 3, "Trust metrics demand summary overwrote incremental observations");
  assert(trustDemandSnap.data()?.pId === "SD", "Trust metrics demand summary lost SignalDesk product ownership");
  const contentAssetId = `asset_performance_${hashValue(targetId).slice(0, 12)}`;
  const contentDraftId = `draft_performance_${hashValue(targetId).slice(0, 12)}`;
  const contentCalendarItemId = `content_calendar_${contentDraftId}`;
  const performanceCta = await upsertSignalDeskSelfServiceCtaServer(access, {
    copy: "Open a private owner-reviewed MenuList preview.",
    ctaType: "claim-start",
    idempotencyKey: `content-performance-cta-${targetId}`,
    label: "Open private preview",
    status: "active",
  });
  const performanceCtaFingerprintHash = hashValue(JSON.stringify({
    copy: performanceCta.copy,
    ctaId: performanceCta.ctaId,
    ctaType: performanceCta.ctaType,
    label: performanceCta.label,
    status: performanceCta.status,
  }));
  const performanceScheduledFor = admin.firestore.Timestamp.fromDate(new Date(futureIso(1)));
  await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(contentAssetId).set(contentAssetFixture(contentAssetId, {
    ctaId: performanceCta.ctaId,
  }));
  await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(contentDraftId).set(contentDraftFixture(contentDraftId, contentAssetId, {
    ctaFingerprintHash: performanceCtaFingerprintHash,
    ctaId: performanceCta.ctaId,
    scheduledFor: performanceScheduledFor,
  }));
  await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_CALENDAR_ITEMS).doc(contentCalendarItemId).set(contentCalendarFixture(contentDraftId, contentAssetId, {
    scheduledFor: performanceScheduledFor,
  }));
  const performanceInput = { activations: 0, channel: "linkedin", clicks: 2, contentAssetId, contentDraftId, currentListSubmissions: 0, engagementQuality: "medium", idempotencyKey: `content-performance-${targetId}`, ownerLeads: 1, publicationUrl: `https://example.invalid/published/${contentDraftId}`, publishedAt: new Date().toISOString(), views: 30 };
  const contentDemandRef = db.collection(SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES)
    .doc(`content_${contentAssetId}_${new Date().toISOString().slice(0, 10)}`);
  await contentDemandRef.set({
    count: 1,
    day: new Date().toISOString().slice(0, 10),
    demandSignalId: contentDemandRef.id,
    pId: "ML",
    signalType: "referral",
    sourceSurface: "manual",
    targetId: null,
    targetName: null,
    updatedAt: timestampNow(),
  });
  const contentCollisionKey = `content-performance-collision-${targetId}`;
  await expectRejects("Content performance merged wrong-product demand summary", () => recordSignalDeskContentPerformanceServer(access, {
    ...performanceInput,
    idempotencyKey: contentCollisionKey,
  }), "DEMAND_SIGNAL_SUMMARY_INVALID");
  assert((await contentDemandRef.get()).data()?.pId === "ML", "Content performance overwrote wrong-product demand authority");
  const rejectedContentPerformanceId = `content_performance_${hashValue(`${access.userId}|${contentCollisionKey}`).slice(0, 32)}`;
  assert(!(await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_PERFORMANCE_SUMMARIES).doc(rejectedContentPerformanceId).get()).exists, "Rejected content demand collision wrote partial performance truth");
  await contentDemandRef.delete();
  const [performance, performanceReplay] = await Promise.all([
    recordSignalDeskContentPerformanceServer(access, performanceInput),
    recordSignalDeskContentPerformanceServer(access, performanceInput),
  ]);
  assert(performance.contentPerformanceId === performanceReplay.contentPerformanceId, "Concurrent content performance did not converge");
  await expectRejects("Mismatched content-performance draft", () => recordSignalDeskContentPerformanceServer(access, { ...performanceInput, channel: "instagram", idempotencyKey: `content-performance-mismatch-${targetId}` }), "CONTENT_PERFORMANCE_DRAFT_MISMATCH");
  const validContentDemandSummary = (await contentDemandRef.get()).data();
  assert(validContentDemandSummary, "Content performance did not create valid demand authority");
  await contentDemandRef.set({ legacyPrivate: "reject-malformed-authority" }, { merge: true });
  const malformedContentKey = `content-performance-malformed-${targetId}`;
  await expectRejects("Content performance accepted malformed demand summary", () => recordSignalDeskContentPerformanceServer(access, {
    ...performanceInput,
    idempotencyKey: malformedContentKey,
    ownerLeads: 2,
  }), "DEMAND_SIGNAL_SUMMARY_INVALID");
  const rejectedMalformedContentPerformanceId = `content_performance_${hashValue(`${access.userId}|${malformedContentKey}`).slice(0, 32)}`;
  assert(!(await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_PERFORMANCE_SUMMARIES).doc(rejectedMalformedContentPerformanceId).get()).exists, "Malformed content demand authority caused a partial performance write");
  await contentDemandRef.set(validContentDemandSummary);
  await recordSignalDeskContentPerformanceServer(access, { ...performanceInput, idempotencyKey: `content-performance-second-${targetId}`, ownerLeads: 2 });
  const contentDemandSnap = await contentDemandRef.get();
  assert(contentDemandSnap.data()?.count === 3, "Content performance demand summary overwrote incremental observations");
  assert(contentDemandSnap.data()?.pId === "SD", "Content performance demand summary lost SignalDesk product ownership");
  const publishedPerformanceDraftSnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(contentDraftId).get();
  const publishedPerformanceCalendarSnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_CALENDAR_ITEMS).doc(contentCalendarItemId).get();
  assert(publishedPerformanceDraftSnap.data()?.status === "published", "Content performance fixture did not mark its approved draft published");
  assert(publishedPerformanceCalendarSnap.data()?.status === "published", "Content performance fixture did not mark its matching calendar item published");
  assert(publishedPerformanceCalendarSnap.data()?.publicationUrl === performanceInput.publicationUrl, "Content performance fixture lost publication URL evidence");
  const contentPauseRef = db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc("scope_content-distribution");
  await contentPauseRef.set(activeKillSwitchFixture("content-distribution"));
  await expectRejects("Paused content-performance settlement", () => recordSignalDeskContentPerformanceServer(access, { ...performanceInput, idempotencyKey: `content-performance-paused-${targetId}` }), "Content distribution is paused");
  await contentPauseRef.delete();

  const outcomeSummarySnap = await db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES).where("targetId", "==", targetId).limit(1).get();
  assert(!outcomeSummarySnap.empty, "Outcome summary did not update");

  const controlRoomSnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM).get();
  assert(controlRoomSnap.exists, "Control-room summary was not created");
  assert(Number(controlRoomSnap.data()?.outcomeCount || 0) >= 1, "Control-room outcome summary did not update");

  const activatedTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).get();
  assert(typeof activatedTargetSnap.data()?.ownerQualifiedAt?.toDate === "function", "Outcome settlement stored owner-qualified target time outside Firestore Timestamp truth");
  assert(typeof activatedTargetSnap.data()?.latestVerifiedActivationAt?.toDate === "function", "Outcome settlement stored verified-activation target time outside Firestore Timestamp truth");
  const workspace = await loadSignalDeskWorkspaceServer(access, "dashboard");
  assert(workspace.workspace.targets.some((item) => item.targetId === targetId), "Workspace did not include E2E target");

  return { approvalId: draftResult.approval.approvalId, sourcePolicyId: sourcePolicy.sourcePolicyId, targetId };
}

async function assertRevenueOperatingLayer() {
  const baselineSummarySnap = await db.collection(SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.REVENUE)
    .get();
  const baselineSummary = baselineSummarySnap.data() || {};
  const sourcePolicy = await createPolicy("Revenue operating layer");
  const targetId = await importOne(sourcePolicy.sourcePolicyId, "RevenueOperatingLayer", { currentListUrl: "" });
  const score = await scoreSignalDeskTargetServer(access, targetId);
  await createSignalDeskEvidenceServer(access, targetId);
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
  const qualificationAuditCountBeforeReplay = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "revenue_account_qualify" && data.entityId === qualification.account.revenueAccountId
  ));
  const qualificationReplay = await qualifySignalDeskRevenueAccountServer(access, {
    locationType: "single-location",
    organizationName: "SignalDesk Revenue Group",
    targetId,
  });
  const qualificationAuditCountAfterReplay = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "revenue_account_qualify" && data.entityId === qualification.account.revenueAccountId
  ));
  assert(qualificationReplay.account.updatedAt === qualification.account.updatedAt, "Exact revenue qualification replay rewrote account truth");
  assert(qualificationAuditCountBeforeReplay === 1 && qualificationAuditCountAfterReplay === 1, "Exact revenue qualification replay repeated audit/cost effects");

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
  const offerAuditCountBeforeReplay = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "commercial_offer_upsert" && data.entityId === offer.commercialOfferId
  ));
  const offerReplay = await upsertSignalDeskCommercialOfferServer(access, {
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
  const offerAuditCountAfterReplay = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "commercial_offer_upsert" && data.entityId === offer.commercialOfferId
  ));
  assert(offerReplay.updatedAt === offer.updatedAt, "Exact commercial-offer replay rewrote offer truth");
  assert(offerAuditCountBeforeReplay === 1 && offerAuditCountAfterReplay === 1, "Exact commercial-offer replay repeated audit/cost effects");
  const offerRef = db.collection(SIGNALDESK_COLLECTIONS.COMMERCIAL_OFFERS).doc(offer.commercialOfferId);
  await offerRef.set({ legacyPrivate: "remove-on-authoritative-refresh" }, { merge: true });
  await upsertSignalDeskCommercialOfferServer(access, {
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
  assert(!Object.prototype.hasOwnProperty.call((await offerRef.get()).data() || {}, "legacyPrivate"), "Commercial-offer authoritative refresh preserved a stale private field");
  await expectRejects("Duplicate commercial offer terms", () => upsertSignalDeskCommercialOfferServer(access, {
    allowedDiscountBps: 0,
    billingCadence: "monthly",
    contents: ["Current official menu link", "Current official menu link"],
    currency: "INR",
    eligibilitySummary: "Duplicate term boundary fixture.",
    founderApprovalConditions: ["Any discount"],
    name: "MenuList duplicate term package",
    priceMinor: 49900,
    status: "active",
    version: 1,
  }), "COMMERCIAL_OFFER_DUPLICATE_TERM");
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

  const opportunityInput = {
    commercialOfferId: offer.commercialOfferId,
    founderAttentionMinutes: 12,
    nextAction: "Send the approved standard conversion route.",
    nextActionDueAt: pastIso(),
    opportunityId: qualification.opportunity.opportunityId,
    probabilityPercent: 50,
    stage: "offer",
    status: "open",
    valueMinor: 49900,
  };
  const opportunity = await upsertSignalDeskCommercialOpportunityServer(access, opportunityInput);
  assert(opportunity.commercialOfferId === offer.commercialOfferId, "Opportunity did not link the approved offer");
  assert(opportunity.valueMinor === 49900 && opportunity.probabilityPercent === 50, "Opportunity value or probability did not update");
  assert(opportunity.currency === "INR", "Opportunity did not derive currency from its commercial offer");
  const opportunityAuditCountBeforeReplay = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "commercial_opportunity_upsert" && data.entityId === opportunity.opportunityId
  ));
  const opportunityReplay = await upsertSignalDeskCommercialOpportunityServer(access, opportunityInput);
  const opportunityAuditCountAfterReplay = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "commercial_opportunity_upsert" && data.entityId === opportunity.opportunityId
  ));
  assert(opportunityReplay.updatedAt === opportunity.updatedAt, "Exact commercial-opportunity replay rewrote opportunity truth");
  assert(opportunityAuditCountBeforeReplay === 1 && opportunityAuditCountAfterReplay === 1, "Exact commercial-opportunity replay repeated audit/cost effects");
  await expectRejects("Manual commercial win", () => upsertSignalDeskCommercialOpportunityServer(access, {
    ...opportunityInput,
    probabilityPercent: 100,
    stage: "won",
    status: "won",
    winLossReason: "Manual win must not bypass activation authority.",
  }), "COMMERCIAL_OPPORTUNITY_WIN_REQUIRES_ACTIVATION");
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
  const envelopeAuditCountBeforeReplay = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "operating_envelope_upsert" && data.entityId === approvedEnvelope.operatingEnvelopeId
  ));
  const approvedEnvelopeReplay = await upsertSignalDeskOperatingEnvelopeServer(access, {
    ...envelopeInput,
    name: "Revenue E2E approval envelope",
    requestedApprovalMode: "approve-batch",
    status: "approved",
    version: 1,
  });
  const envelopeAuditCountAfterReplay = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "operating_envelope_upsert" && data.entityId === approvedEnvelope.operatingEnvelopeId
  ));
  assert(approvedEnvelopeReplay.updatedAt === approvedEnvelope.updatedAt, "Exact operating-envelope replay rewrote envelope truth");
  assert(approvedEnvelopeReplay.approvedAt === approvedEnvelope.approvedAt, "Exact operating-envelope replay reset founder approval time");
  assert(envelopeAuditCountBeforeReplay === 1 && envelopeAuditCountAfterReplay === 1, "Exact operating-envelope replay repeated audit/cost effects");
  await expectRejects("Duplicate operating-envelope references", () => upsertSignalDeskOperatingEnvelopeServer(access, {
    ...envelopeInput,
    name: "Revenue E2E duplicate reference envelope",
    requestedApprovalMode: "approve-batch",
    sourcePolicyIds: [sourcePolicy.sourcePolicyId, sourcePolicy.sourcePolicyId],
    status: "approved",
    version: 1,
  }), "OPERATING_ENVELOPE_DUPLICATE_REFERENCE");
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
    evidenceRef: `operator-note:${targetId}:route`,
    idempotencyKey: `route-outcome:${targetId}`,
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
    evidenceRef: `operator-note:${targetId}:upload`,
    idempotencyKey: `upload-outcome:${targetId}`,
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
    const day = `2099-01-${String(index + 1).padStart(2, "0")}`;
    const summaryId = signalDeskOutcomeSummaryIdFor({
      channel: "manual",
      day,
      outcomeType: "route_created",
      source: "manual",
      targetId,
    });
    const summaryRef = db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES).doc(summaryId);
    const updatedAt = admin.firestore.Timestamp.fromDate(new Date(`${day}T12:00:00.000Z`));
    const idempotencyKeyHash = hashValue(`revenue-history:${targetId}:${index}`);
    const outcomeEventId = `outcome_${idempotencyKeyHash.slice(0, 32)}`;
    const evidenceRef = `operator-note:${targetId}:history:${index}`;
    longHistoryBatch.set(db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_EVENTS).doc(outcomeEventId), {
      channel: "manual",
      createdAt: updatedAt,
      createdBy: access.userId,
      evidenceRef,
      idempotencyKeyHash,
      integrityStatus: "unverified",
      outcomeEventId,
      outcomeType: "route_created",
      ownerQualifiedAt: null,
      ownerReviewedAt: null,
      pId: "SD",
      routeTokenId: null,
      source: "manual",
      sourceEventId: null,
      surfaces: [],
      targetId,
      targetName: qualification.account.displayName,
    });
    longHistoryBatch.set(summaryRef, {
      channel: "manual",
      count: 1,
      day,
      evidenceRef,
      integrityStatus: "unverified",
      latestOutcomeEventId: outcomeEventId,
      outcomeSummaryId: summaryRef.id,
      outcomeType: "route_created",
      ownerQualifiedAt: null,
      ownerReviewedAt: null,
      pId: "SD",
      routeTokenId: null,
      source: "manual",
      sourceEventId: null,
      surfaces: [],
      targetId,
      targetName: qualification.account.displayName,
      updatedAt,
    });
  }
  await longHistoryBatch.commit();
  const longHistoryWatch = await refreshSignalDeskActivationWatchServer(access, { targetId });
  assert(longHistoryWatch.status === "activated", "Bounded latest-outcome window lost an older terminal activation");
  assert(longHistoryWatch.outcomeTypes.includes("two_surface_activation"), "Terminal activation evidence disappeared from a long outcome history");
  const watchAuditCountBeforeReplay = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "activation_watch_refresh" && data.entityId === longHistoryWatch.activationWatchId
  ));
  const longHistoryWatchReplay = await refreshSignalDeskActivationWatchServer(access, { targetId });
  const watchAuditCountAfterReplay = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "activation_watch_refresh" && data.entityId === longHistoryWatch.activationWatchId
  ));
  assert(longHistoryWatchReplay.updatedAt === longHistoryWatch.updatedAt, "Exact activation-watch recheck rewrote watch truth");
  assert(watchAuditCountAfterReplay === watchAuditCountBeforeReplay, "Exact activation-watch recheck repeated audit/cost effects");
  const wonOpportunitySnap = await db.collection(SIGNALDESK_COLLECTIONS.COMMERCIAL_OPPORTUNITIES).doc(qualification.opportunity.opportunityId).get();
  assert(wonOpportunitySnap.data()?.status === "won" && wonOpportunitySnap.data()?.stage === "won", "Two-surface activation did not close the commercial opportunity");
  const clearedActivationSummary = (await db.collection(SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.REVENUE)
    .get()).data();
  assert(clearedActivationSummary?.pipelineValueMinor === 0 && clearedActivationSummary?.pipelineCurrency === null, "Activation close retained currency on an empty pipeline");

  const currencySwitchTargetId = await importOne(sourcePolicy.sourcePolicyId, "RevenueCurrencySwitch", { currentListUrl: "" });
  await scoreSignalDeskTargetServer(access, currencySwitchTargetId);
  await createSignalDeskEvidenceServer(access, currencySwitchTargetId);
  const currencySwitchQualification = await qualifySignalDeskRevenueAccountServer(access, {
    locationType: "single-location",
    targetId: currencySwitchTargetId,
  });
  const usdOpportunityInput = {
    commercialOfferId: usdOffer.commercialOfferId,
    founderAttentionMinutes: 0,
    nextAction: "Confirm the USD offer decision.",
    opportunityId: currencySwitchQualification.opportunity.opportunityId,
    probabilityPercent: 50,
    stage: "offer",
    status: "open",
    valueMinor: 999,
  };
  await upsertSignalDeskCommercialOpportunityServer(access, usdOpportunityInput);
  const usdPipelineSummary = (await db.collection(SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.REVENUE)
    .get()).data();
  assert(usdPipelineSummary?.pipelineValueMinor === 999 && usdPipelineSummary?.pipelineCurrency === "USD", "Empty pipeline could not adopt a new currency");
  await upsertSignalDeskCommercialOpportunityServer(access, {
    ...usdOpportunityInput,
    probabilityPercent: 0,
    stage: "lost",
    status: "lost",
    winLossReason: "Currency-switch regression fixture closed.",
  });
  const closedUsdPipelineSummary = (await db.collection(SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.REVENUE)
    .get()).data();
  assert(closedUsdPipelineSummary?.pipelineValueMinor === 0 && closedUsdPipelineSummary?.pipelineCurrency === null, "Manual close retained currency on an empty pipeline");

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
  assert(suppressedQualification.account.automationState === "paused", "Suppressed account was not paused from automation");
  assert(suppressedQualification.opportunity === null, "Suppressed account created an opportunity");

  const demotedTargetId = await importOne(sourcePolicy.sourcePolicyId, "RevenueAuthorityDemotion", { currentListUrl: "" });
  await scoreSignalDeskTargetServer(access, demotedTargetId);
  await createSignalDeskEvidenceServer(access, demotedTargetId);
  const initialDemotionQualification = await qualifySignalDeskRevenueAccountServer(access, {
    locationType: "single-location",
    targetId: demotedTargetId,
  });
  assert(initialDemotionQualification.opportunity?.status === "open", "Authority-demotion fixture did not start with an open opportunity");
  await upsertSignalDeskCommercialOpportunityServer(access, {
    commercialOfferId: offer.commercialOfferId,
    founderAttentionMinutes: 0,
    nextAction: "Wait for current authority.",
    opportunityId: initialDemotionQualification.opportunity.opportunityId,
    probabilityPercent: 25,
    stage: "discovery",
    status: "open",
    valueMinor: 49900,
  });
  await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(demotedTargetId).set({
    suppressionStatus: "suppressed",
    updatedAt: timestampNow(),
  }, { merge: true });
  const demotedQualification = await qualifySignalDeskRevenueAccountServer(access, {
    locationType: "single-location",
    targetId: demotedTargetId,
  });
  assert(demotedQualification.qualified === false, "Withdrawn current authority remained commercially qualified");
  assert(demotedQualification.account.automationState === "paused", "Withdrawn current authority did not pause the account");
  assert(demotedQualification.opportunity?.status === "nurture" && demotedQualification.opportunity?.stage === "nurture", "Withdrawn current authority did not demote the open opportunity");
  const demotedPipelineSummary = (await db.collection(SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.REVENUE)
    .get()).data();
  assert(demotedPipelineSummary?.pipelineValueMinor === 0 && demotedPipelineSummary?.pipelineCurrency === null, "Qualification demotion retained currency on an empty pipeline");

  const publishedTargetId = await importOne(sourcePolicy.sourcePolicyId, "RevenuePublishedOnly", { currentListUrl: "" });
  await scoreSignalDeskTargetServer(access, publishedTargetId);
  await createSignalDeskEvidenceServer(access, publishedTargetId);
  await recordSignalDeskOutcomeServer(access, {
    channel: "manual",
    evidenceRef: `operator-note:${publishedTargetId}:published`,
    idempotencyKey: `published-outcome:${publishedTargetId}`,
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
  await createSignalDeskEvidenceServer(access, convertedTargetId);
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
    startsAt: admin.firestore.Timestamp.fromDate(new Date("1999-12-01T00:00:00.000Z")),
    updatedAt: timestampNow(),
  }, { merge: true });

  const rawRevenueSummary = await db.collection(SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.REVENUE)
    .get();
  assert(rawRevenueSummary.exists, "Revenue operating layer did not persist its control summary");
  try {
    assertSignalDeskWorkspaceDocument(
      SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES,
      rawRevenueSummary.data(),
      rawRevenueSummary.id,
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown projection failure";
    throw new Error(`Revenue control summary failed its workspace contract: ${reason}`);
  }

  const workspace = await loadSignalDeskWorkspaceServer(access, "revenue");
  assert(workspace.workspace.revenueAccounts.some((account) => account.revenueAccountId === qualification.account.revenueAccountId), "Revenue workspace did not load qualified account");
  assert(workspace.workspace.commercialOffers.some((item) => item.commercialOfferId === offer.commercialOfferId), "Revenue workspace did not load commercial offer");
  assert(workspace.workspace.operatingEnvelopes.some((item) => item.operatingEnvelopeId === heldEnvelope.operatingEnvelopeId), "Revenue workspace did not load held operating envelope");
  assert(workspace.workspace.operatingEnvelopes.some((item) => item.operatingEnvelopeId === approvedEnvelope.operatingEnvelopeId && item.status === "expired" && item.executionState === "held"), "Revenue workspace did not hold expired operating envelope");
  assert(workspace.workspace.activationWatches.some((watch) => watch.status === "activated" && watch.targetId === targetId), "Revenue workspace did not load activation watch");
  const summary = workspace.workspace.revenueControlSummaries[0];
  assert(summary.revenueAccountCount === Number(baselineSummary.revenueAccountCount || 0) + 6, "Revenue summary did not count the six feature-local revenue accounts exactly");
  assert(summary.openOpportunityCount === Number(baselineSummary.openOpportunityCount || 0) + 1, "Published-only opportunity was not preserved as the only feature-local open opportunity");
  assert(summary.pipelineCurrency === null, "Empty revenue pipeline retained a stale currency");
  assert(summary.pipelineValueMinor === 0, "Activated opportunity remained in pipeline value");
  assert(summary.weightedPipelineValueMinor === 0, "Activated opportunity remained in weighted pipeline value");
  assert(summary.activatedAccountCount === Number(baselineSummary.activatedAccountCount || 0) + 2, "Revenue summary did not count the qualified and pre-converted activations exactly");
  assert(summary.wonOpportunityCount === Number(baselineSummary.wonOpportunityCount || 0) + 2, "Revenue summary did not count the qualified and pre-converted wins exactly");
  assert(summary.founderAttentionMinutes >= Number(baselineSummary.founderAttentionMinutes || 0) + 12, "Revenue summary did not record feature-local founder attention");
}

async function assertGrowthMissionIntegrity() {
  const reviewedDay = "2037-03-15";
  const reviewedMission = await createSignalDeskDailyGrowthMissionServer(access, {
    day: reviewedDay,
    marketPodId: "market_pod_first_local_v1",
  });
  assert(reviewedMission.growthMissionId === `growth_mission_${reviewedDay}`, "Growth mission ID did not preserve its exact day identity");
  assert(reviewedMission.missionActions.length > 0 && reviewedMission.missionActions.length <= 5, "Growth mission projector returned an invalid action count");
  const originalCreatedAt = reviewedMission.createdAt;
  const reviewed = await reviewSignalDeskGrowthMissionServer(access, {
    growthMissionId: reviewedMission.growthMissionId,
    ownerDecision: "approved",
    ownerDecisionNote: "Approved without allowing same-day regeneration to erase this decision.",
  });
  assert(reviewed.status === "approved" && reviewed.ownerDecision === "approved", "Growth mission approval matrix was not enforced");
  assert(reviewed.missionActions.every((action) => action.status === "approved"), "Growth mission approval did not update every action coherently");
  const reviewedActionSnapshot = JSON.stringify(reviewed.missionActions);
  const createAuditCountBeforeReplay = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "growth_mission_create" && data.entityId === reviewed.growthMissionId
  ));
  const sameDayReplay = await createSignalDeskDailyGrowthMissionServer(access, {
    day: reviewedDay,
    marketPodId: "market_pod_first_local_v1",
  });
  assert(sameDayReplay.ownerDecision === "approved" && sameDayReplay.status === "approved", "Same-day mission refresh reset founder review state");
  assert(sameDayReplay.createdAt === originalCreatedAt, "Same-day mission refresh reset creation time");
  assert(JSON.stringify(sameDayReplay.missionActions) === reviewedActionSnapshot, "Same-day mission refresh reset action status or history");
  const createAuditCountAfterReplay = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "growth_mission_create" && data.entityId === reviewed.growthMissionId
  ));
  assert(createAuditCountBeforeReplay === 1 && createAuditCountAfterReplay === 1, "Exact same-day mission replay repeated audit/cost effects");
  const replayPodRef = db.collection(SIGNALDESK_COLLECTIONS.MARKET_PODS).doc("market_pod_first_local_v1");
  const replayPodSnap = await replayPodRef.get();
  assert(replayPodSnap.exists, "Growth mission replay fixture pod was missing");
  await replayPodRef.delete();
  try {
    const dependencyIndependentReplay = await createSignalDeskDailyGrowthMissionServer(access, {
      day: reviewedDay,
      marketPodId: "market_pod_first_local_v1",
    });
    assert(dependencyIndependentReplay.ownerDecision === "approved", "Durable mission replay depended on mutable current generation inputs");
  } finally {
    await replayPodRef.set(replayPodSnap.data());
  }
  await expectRejects("Changed same-day mission request", () => createSignalDeskDailyGrowthMissionServer(access, {
    day: reviewedDay,
  }), "GROWTH_MISSION_REQUEST_CONFLICT");
  await expectRejects("Invalid growth mission calendar day", () => createSignalDeskDailyGrowthMissionServer(access, {
    day: "2037-02-30",
  }), "GROWTH_MISSION_DAY_INVALID");
  await expectRejects("Contradictory growth mission review input", () => reviewSignalDeskGrowthMissionServer(access, {
    growthMissionId: reviewedMission.growthMissionId,
    ownerDecision: "hold",
    status: "approved",
  }), "GROWTH_MISSION_STATE_CONFLICT");
  await expectRejects("Invalid growth mission document ID", () => reviewSignalDeskGrowthMissionServer(access, {
    growthMissionId: "growth_mission_2037-02-30",
    ownerDecision: "hold",
  }), "GROWTH_MISSION_ID_INVALID");

  const terminalDay = "2037-03-16";
  const terminalMission = await createSignalDeskDailyGrowthMissionServer(access, { day: terminalDay });
  const completedMission = await reviewSignalDeskGrowthMissionServer(access, {
    growthMissionId: terminalMission.growthMissionId,
    ownerDecision: "completed",
    ownerDecisionNote: "Daily mission completed.",
  });
  assert(completedMission.status === "completed" && completedMission.missionActions.every((action) => action.status === "completed"), "Completed mission state was internally contradictory");
  const completedReplay = await reviewSignalDeskGrowthMissionServer(access, {
    growthMissionId: terminalMission.growthMissionId,
    ownerDecision: "completed",
    ownerDecisionNote: "Daily mission completed.",
  });
  assert(completedReplay.updatedAt === completedMission.updatedAt, "Exact terminal mission replay rewrote durable completion truth");
  await expectRejects("Completed growth mission transition", () => reviewSignalDeskGrowthMissionServer(access, {
    growthMissionId: terminalMission.growthMissionId,
    ownerDecision: "approved",
  }), "GROWTH_MISSION_TERMINAL");

  const malformedDay = "2037-03-17";
  const malformedMission = await createSignalDeskDailyGrowthMissionServer(access, { day: malformedDay });
  await reviewSignalDeskGrowthMissionServer(access, {
    growthMissionId: malformedMission.growthMissionId,
    ownerDecision: "approved",
  });
  await db.collection(SIGNALDESK_COLLECTIONS.GROWTH_MISSIONS).doc(malformedMission.growthMissionId).set({
    status: "ready",
  }, { merge: true });
  await expectRejects("Malformed growth mission review", () => reviewSignalDeskGrowthMissionServer(access, {
    growthMissionId: malformedMission.growthMissionId,
    ownerDecision: "hold",
  }), "GROWTH_MISSION_SHAPE_INVALID");

  const wrongProductDay = "2037-03-18";
  const wrongProductMission = await createSignalDeskDailyGrowthMissionServer(access, { day: wrongProductDay });
  await db.collection(SIGNALDESK_COLLECTIONS.GROWTH_MISSIONS).doc(wrongProductMission.growthMissionId).set({
    pId: "AL",
  }, { merge: true });
  await expectRejects("Wrong-product growth mission review", () => reviewSignalDeskGrowthMissionServer(access, {
    growthMissionId: wrongProductMission.growthMissionId,
    ownerDecision: "hold",
  }), "GROWTH_MISSION_PRODUCT_MISMATCH");
  await expectRejects("Wrong-product deterministic growth mission collision", () => createSignalDeskDailyGrowthMissionServer(access, {
    day: wrongProductDay,
  }), "GROWTH_MISSION_PRODUCT_MISMATCH");

  const missionWorkspace = await loadSignalDeskWorkspaceServer(access, "mission");
  assert(!missionWorkspace.workspace.growthMissions.some((mission) => mission.growthMissionId === malformedMission.growthMissionId), "Mission workspace exposed a contradictory persisted mission");
  assert(!missionWorkspace.workspace.growthMissions.some((mission) => mission.growthMissionId === wrongProductMission.growthMissionId), "Mission workspace exposed a wrong-product mission");
  const projectedReviewed = missionWorkspace.workspace.growthMissions.find((mission) => mission.growthMissionId === reviewedMission.growthMissionId);
  assert(Boolean(projectedReviewed), "Mission workspace omitted a valid reviewed mission");
  assert(!Object.prototype.hasOwnProperty.call(projectedReviewed, "pId"), "Mission workspace leaked internal product identity");
  assert(!Object.prototype.hasOwnProperty.call(projectedReviewed, "updatedBy"), "Mission workspace leaked internal actor identity");
  assert(!Object.prototype.hasOwnProperty.call(projectedReviewed, "signalContext"), "Mission workspace leaked internal generation context");
  assert(!Object.prototype.hasOwnProperty.call(projectedReviewed, "generationRequestFingerprintHash"), "Mission workspace leaked internal request fingerprinting");
}

async function assertOperatingLayerContracts() {
  const policy = await createPolicy("Operating layer source quality");
  const imported = await importSignalDeskTargetsServer(access, {
    idempotencyKey: "operating-layer-source-quality-import",
    rows: [rowFor("OperatingLayerQuality")],
    sourceName: "Operating layer quality fixture",
    sourcePolicyId: policy.sourcePolicyId,
  });
  const sourceRunId = imported.run.sourceRunId;
  const unrelatedPolicy = await createPolicy("Operating layer unrelated activation");
  const unrelatedTargetId = await importOne(unrelatedPolicy.sourcePolicyId, "OperatingLayerUnrelatedActivation", { currentListUrl: "" });
  await createSignalDeskEvidenceServer(access, unrelatedTargetId);
  await recordSignalDeskOutcomeServer(access, {
    ...activationFixture(unrelatedTargetId, "operating-layer-unrelated"),
    channel: "manual",
    outcomeType: "two_surface_activation",
    source: "manual",
    targetId: unrelatedTargetId,
  });
  const snapshot = await createSignalDeskSourceQualitySnapshotServer(access, {
    sourcePolicyId: policy.sourcePolicyId,
    sourceRunId,
  });
  assert(snapshot.sourcePolicyId === policy.sourcePolicyId && snapshot.sourceRunId === sourceRunId, "Source-quality snapshot lost source authority");
  assert(snapshot.activationRate === 0, "Source-quality snapshot attributed another source's activation");
  const snapshotAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "source_quality_snapshot_create" && data.entityId === snapshot.sourceQualitySnapshotId
  ));
  const snapshotReplay = await createSignalDeskSourceQualitySnapshotServer(access, {
    sourcePolicyId: policy.sourcePolicyId,
    sourceRunId,
  });
  assert(snapshotReplay.updatedAt === snapshot.updatedAt, "Exact source-quality replay rewrote durable truth");
  assert(await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "source_quality_snapshot_create" && data.entityId === snapshot.sourceQualitySnapshotId
  )) === snapshotAuditCount, "Exact source-quality replay repeated audit/cost effects");
  const sourceQualitySnapshotRef = db.collection(SIGNALDESK_COLLECTIONS.SOURCE_QUALITY_SNAPSHOTS).doc(snapshot.sourceQualitySnapshotId);
  await sourceQualitySnapshotRef.set({ stalePrivateField: "must-be-removed" }, { merge: true });
  await createSignalDeskSourceQualitySnapshotServer(access, {
    sourcePolicyId: policy.sourcePolicyId,
    sourceRunId,
  });
  assert((await sourceQualitySnapshotRef.get()).data()?.stalePrivateField === undefined, "Source-quality snapshot refresh retained stale fields");
  const relatedTargetId = imported.targets[0].targetId;
  await createSignalDeskEvidenceServer(access, relatedTargetId);
  await recordSignalDeskOutcomeServer(access, {
    ...activationFixture(relatedTargetId, "operating-layer-related-one"),
    channel: "manual",
    outcomeType: "two_surface_activation",
    source: "manual",
    targetId: relatedTargetId,
  });
  await recordSignalDeskOutcomeServer(access, {
    ...activationFixture(relatedTargetId, "operating-layer-related-two"),
    channel: "email",
    outcomeType: "two_surface_activation",
    source: "manual",
    targetId: relatedTargetId,
  });
  const multiOutcomeSnapshot = await createSignalDeskSourceQualitySnapshotServer(access, {
    sourcePolicyId: policy.sourcePolicyId,
    sourceRunId,
  });
  assert(multiOutcomeSnapshot.activationRate === 1, "Source-quality snapshot counted repeated outcomes instead of distinct activated targets");
  const otherPolicy = await createPolicy("Operating layer mismatch");
  await expectRejects("Source-quality policy/run mismatch", () => createSignalDeskSourceQualitySnapshotServer(access, {
    sourcePolicyId: otherPolicy.sourcePolicyId,
    sourceRunId,
  }), "SOURCE_QUALITY_POLICY_RUN_MISMATCH");
  await expectRejects("Missing source-quality run", () => createSignalDeskSourceQualitySnapshotServer(access, {
    sourceRunId: "missing_operating_source_run",
  }), "Source run not found");

  const playbookInput = {
    approvedReply: "Thanks. I can share the approved private preview details.",
    escalationRequired: false,
    intent: "send-details",
    nextRoute: "self-serve-preview",
    status: "active",
    suppressionRequired: false,
    title: "Operating layer details reply",
  };
  const playbook = await upsertSignalDeskReplyPlaybookServer(access, playbookInput);
  const playbookAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "reply_playbook_upsert" && data.entityId === playbook.playbookId
  ));
  const playbookReplay = await upsertSignalDeskReplyPlaybookServer(access, playbookInput);
  assert(playbookReplay.updatedAt === playbook.updatedAt, "Exact reply-playbook replay rewrote durable truth");
  assert(await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "reply_playbook_upsert" && data.entityId === playbook.playbookId
  )) === playbookAuditCount, "Exact reply-playbook replay repeated audit/cost effects");
  const playbookRef = db.collection(SIGNALDESK_COLLECTIONS.REPLY_PLAYBOOKS).doc(playbook.playbookId);
  await playbookRef.set({ stalePrivateField: "must-be-removed" }, { merge: true });
  await upsertSignalDeskReplyPlaybookServer(access, playbookInput);
  assert((await playbookRef.get()).data()?.stalePrivateField === undefined, "Reply-playbook refresh retained stale fields");
  await expectRejects("Unsafe stop reply playbook", () => upsertSignalDeskReplyPlaybookServer(access, {
    ...playbookInput,
    approvedReply: "Stop confirmed. No more outreach will be sent.",
    intent: "stop",
    nextRoute: "manual-reply",
    title: "Unsafe stop reply",
  }), "REPLY_PLAYBOOK_SHAPE_INVALID");

  const marketPodId = "market_pod_operating_replay_v1";
  const pod = await recommendSignalDeskMarketPodPlanServer(access, { marketPodId });
  const podAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "market_pod_recommend" && data.entityId === marketPodId
  ));
  const podReplay = await recommendSignalDeskMarketPodPlanServer(access, { marketPodId });
  assert(podReplay.updatedAt === pod.updatedAt, "Exact market-pod recommendation replay rewrote durable truth");
  assert(await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "market_pod_recommend" && data.entityId === marketPodId
  )) === podAuditCount, "Exact market-pod recommendation replay repeated audit/cost effects");

  const workspace = await loadSignalDeskWorkspaceServer(access, "mission");
  assert(workspace.workspace.replyPlaybooks.some((item) => item.playbookId === playbook.playbookId), "Mission workspace omitted the valid reply playbook");
  assert(workspace.workspace.sourceQualitySnapshots.some((item) => item.sourceQualitySnapshotId === snapshot.sourceQualitySnapshotId), "Mission workspace omitted the valid source-quality snapshot");
}

async function assertAudienceSegmentContracts() {
  const segmentInput = {
    criteriaSummary: "Current owned or verified demand signals.",
    idempotencyKey: "audience-segment-current-signals",
    marketPodId: "market_pod_first_local_v1",
    name: "Current verified demand",
    sourcePolicyId: "policy_public_business_research_v1",
    status: "hold",
    triggerType: "demand-signal",
  };
  const [first, replay] = await Promise.all([
    upsertSignalDeskAudienceSegmentServer(access, segmentInput),
    upsertSignalDeskAudienceSegmentServer(access, segmentInput),
  ]);
  assert(first.audienceSegmentId === replay.audienceSegmentId, "Concurrent audience-segment replay created divergent identities");
  const storedRows = await db.collection(SIGNALDESK_COLLECTIONS.AUDIENCE_SEGMENTS)
    .where("name", "==", segmentInput.name)
    .get();
  assert(storedRows.size === 1, "Concurrent audience-segment replay created duplicate rows");
  assert(await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "audience_segment_upsert" && data.entityId === first.audienceSegmentId
  )) === 1, "Audience-segment replay duplicated audit or cost effects");
  await expectRejects("Changed audience-segment idempotency payload", () => upsertSignalDeskAudienceSegmentServer(access, {
    ...segmentInput,
    criteriaSummary: "Changed criteria cannot reuse the original operation key.",
  }), "AUDIENCE_SEGMENT_IDEMPOTENCY_CONFLICT");
  await expectRejects("Missing audience-segment market pod", () => upsertSignalDeskAudienceSegmentServer(access, {
    ...segmentInput,
    idempotencyKey: "audience-segment-missing-pod",
    marketPodId: "missing_audience_segment_pod",
  }), "AUDIENCE_SEGMENT_MARKET_POD_NOT_FOUND");
  const wrongProductPodRef = db.collection(SIGNALDESK_COLLECTIONS.MARKET_PODS).doc("audience_segment_wrong_product_pod");
  await wrongProductPodRef.set({
    marketPodId: wrongProductPodRef.id,
    pId: "ML",
  });
  await expectRejects("Wrong-product audience-segment market pod", () => upsertSignalDeskAudienceSegmentServer(access, {
    ...segmentInput,
    idempotencyKey: "audience-segment-wrong-product-pod",
    marketPodId: wrongProductPodRef.id,
  }), "AUDIENCE_SEGMENT_MARKET_POD_INVALID");
  await expectRejects("Missing audience-segment source policy", () => upsertSignalDeskAudienceSegmentServer(access, {
    ...segmentInput,
    idempotencyKey: "audience-segment-missing-policy",
    sourcePolicyId: "missing_audience_segment_policy",
  }), "AUDIENCE_SEGMENT_SOURCE_POLICY_NOT_FOUND");
  const wrongProductPolicyRef = db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc("audience_segment_wrong_product_policy");
  await wrongProductPolicyRef.set({
    pId: "ML",
    sourcePolicyId: wrongProductPolicyRef.id,
  });
  await expectRejects("Wrong-product audience-segment source policy", () => upsertSignalDeskAudienceSegmentServer(access, {
    ...segmentInput,
    idempotencyKey: "audience-segment-wrong-product-policy",
    sourcePolicyId: wrongProductPolicyRef.id,
  }), "AUDIENCE_SEGMENT_SOURCE_POLICY_INVALID");
}

async function assertEnrichmentWaterfallConfigurationContracts() {
  const waterfallInput = {
    idempotencyKey: "enrichment-waterfall-config-email",
    maxCostUsd: 2,
    maxCredits: 3,
    name: "Verified email configuration",
    providerOrder: ["hunter", "zerobounce", "apollo"],
    requestedField: "email",
    retentionDays: 30,
    sourcePolicyId: "policy_public_business_research_v1",
    status: "hold",
    stopCondition: "first-verified",
    verificationRequired: true,
  };
  const [first, replay] = await Promise.all([
    upsertSignalDeskEnrichmentWaterfallServer(access, waterfallInput),
    upsertSignalDeskEnrichmentWaterfallServer(access, waterfallInput),
  ]);
  assert(first.waterfallId === replay.waterfallId, "Concurrent enrichment-waterfall configuration replay created divergent identities");
  const storedRows = await db.collection(SIGNALDESK_COLLECTIONS.ENRICHMENT_WATERFALLS)
    .where("name", "==", waterfallInput.name)
    .get();
  assert(storedRows.size === 1, "Concurrent enrichment-waterfall configuration replay created duplicate rows");
  assert(await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "enrichment_waterfall_upsert" && data.entityId === first.waterfallId
  )) === 1, "Enrichment-waterfall configuration replay duplicated audit or cost effects");
  await expectRejects("Changed enrichment-waterfall configuration idempotency payload", () => upsertSignalDeskEnrichmentWaterfallServer(access, {
    ...waterfallInput,
    maxCredits: 4,
  }), "ENRICHMENT_WATERFALL_CONFIG_IDEMPOTENCY_CONFLICT");
  await expectRejects("Duplicate enrichment-waterfall providers", () => upsertSignalDeskEnrichmentWaterfallServer(access, {
    ...waterfallInput,
    idempotencyKey: "enrichment-waterfall-duplicate-provider",
    providerOrder: ["hunter", "hunter"],
  }), "ENRICHMENT_WATERFALL_CONFIG_SHAPE_INVALID");
  await expectRejects("Unverified first-verified enrichment waterfall", () => upsertSignalDeskEnrichmentWaterfallServer(access, {
    ...waterfallInput,
    idempotencyKey: "enrichment-waterfall-invalid-verification",
    verificationRequired: false,
  }), "ENRICHMENT_WATERFALL_CONFIG_SHAPE_INVALID");
  await expectRejects("Missing enrichment-waterfall source policy", () => upsertSignalDeskEnrichmentWaterfallServer(access, {
    ...waterfallInput,
    idempotencyKey: "enrichment-waterfall-missing-policy",
    sourcePolicyId: "missing_enrichment_waterfall_policy",
  }), "ENRICHMENT_WATERFALL_CONFIG_SOURCE_POLICY_NOT_FOUND");
  const wrongProductPolicyRef = db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc("enrichment_waterfall_wrong_product_policy");
  await wrongProductPolicyRef.set({
    pId: "ML",
    sourcePolicyId: wrongProductPolicyRef.id,
  });
  await expectRejects("Wrong-product enrichment-waterfall source policy", () => upsertSignalDeskEnrichmentWaterfallServer(access, {
    ...waterfallInput,
    idempotencyKey: "enrichment-waterfall-wrong-product-policy",
    sourcePolicyId: wrongProductPolicyRef.id,
  }), "ENRICHMENT_WATERFALL_CONFIG_SOURCE_POLICY_INVALID");

  const runPolicy = await createPolicy("Waterfall configuration authority");
  const targetId = await importOne(runPolicy.sourcePolicyId, "Waterfall configuration authority");
  const wrongProductWaterfallRef = db.collection(SIGNALDESK_COLLECTIONS.ENRICHMENT_WATERFALLS)
    .doc("waterfall_wrong_product_run_authority");
  await wrongProductWaterfallRef.set({
    maxCostUsd: 0,
    maxCredits: 1,
    name: "Wrong product waterfall",
    pId: "ML",
    providerOrder: ["hunter"],
    requestedField: "website",
    retentionDays: 30,
    sourcePolicyId: runPolicy.sourcePolicyId,
    status: "active",
    stopCondition: "first-candidate",
    updatedAt: admin.firestore.Timestamp.now(),
    verificationRequired: false,
    waterfallId: wrongProductWaterfallRef.id,
  });
  await expectRejects("Wrong-product enrichment-waterfall run authority", () => runSignalDeskEnrichmentWaterfallServer(access, {
    idempotencyKey: "enrichment-waterfall-wrong-product-run",
    targetId,
    waterfallId: wrongProductWaterfallRef.id,
  }), "ENRICHMENT_WATERFALL_SHAPE_INVALID");
}

async function assertModelRouteConfigurationContracts() {
  const routeRef = db.collection(SIGNALDESK_COLLECTIONS.MODEL_ROUTES).doc("model_route_quality-critic");
  await routeRef.set({ legacyPrivate: "remove-on-authoritative-write" }, { merge: true });
  const current = (await routeRef.get()).data();
  const routeInput = {
    confidenceThreshold: current.confidenceThreshold,
    defaultModel: current.defaultModel,
    defaultProvider: current.defaultProvider,
    idempotencyKey: "model-route-quality-critic-current",
    maxCostUsd: current.maxCostUsd,
    status: current.status,
    task: "quality-critic",
  };
  const [first, replay] = await Promise.all([
    upsertSignalDeskModelRouteServer(access, routeInput),
    upsertSignalDeskModelRouteServer(access, routeInput),
  ]);
  assert(first.modelRouteId === replay.modelRouteId, "Concurrent model-route replay created divergent results");
  assert(!Object.prototype.hasOwnProperty.call(first, "pId") && !Object.prototype.hasOwnProperty.call(first, "updatedBy"), "Model-route mutation returned private persisted fields");
  const stored = (await routeRef.get()).data();
  assert(!Object.prototype.hasOwnProperty.call(stored || {}, "legacyPrivate"), "Model-route authoritative replacement preserved a stale unknown field");
  assert(await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "model_route_upsert" && data.entityId === routeRef.id
  )) === 1, "Model-route replay duplicated audit or cost effects");
  await expectRejects("Changed model-route idempotency payload", () => upsertSignalDeskModelRouteServer(access, {
    ...routeInput,
    maxCostUsd: routeInput.maxCostUsd + 0.01,
  }), "MODEL_ROUTE_IDEMPOTENCY_CONFLICT");
  await expectRejects("Unpaired model-route escalation", () => upsertSignalDeskModelRouteServer(access, {
    ...routeInput,
    escalationProvider: "gemini",
    idempotencyKey: "model-route-unpaired-escalation",
  }), "MODEL_ROUTE_SHAPE_INVALID");

  await routeRef.set({ ...stored, pId: "ML" });
  await expectRejects("Wrong-product current model-route overwrite", () => upsertSignalDeskModelRouteServer(access, {
    ...routeInput,
    idempotencyKey: "model-route-wrong-product-overwrite",
  }), "MODEL_ROUTE_CURRENT_SHAPE_INVALID");
  const runPolicy = await createPolicy("Model route execution authority");
  const targetId = await importOne(runPolicy.sourcePolicyId, "Model route execution authority");
  await expectRejects("Wrong-product model-route execution authority", () => runSignalDeskAiAssistServer(access, {
    idempotencyKey: "model-route-wrong-product-execution",
    targetId,
    task: "quality-critic",
  }), "SignalDesk AI route is not active");
}

async function assertProviderBudgetConfigurationContracts() {
  const providerRef = db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_gemini_ai");
  const providerCurrent = (await providerRef.get()).data();
  const providerInput = {
    credentialState: providerCurrent.credentialState,
    dailyBudgetUsd: providerCurrent.dailyBudgetUsd,
    disabledReason: providerCurrent.disabledReason || undefined,
    idempotencyKey: "provider-account-gemini-ai-current",
    monthlyBudgetUsd: providerCurrent.monthlyBudgetUsd,
    ownerApproved: providerCurrent.ownerApproved,
    perRunBudgetUsd: providerCurrent.perRunBudgetUsd,
    provider: "gemini",
    status: providerCurrent.status,
    use: "ai",
  };
  const [providerFirst, providerReplay] = await Promise.all([
    upsertSignalDeskProviderAccountServer(access, providerInput),
    upsertSignalDeskProviderAccountServer(access, providerInput),
  ]);
  assert(providerFirst.providerAccountId === providerReplay.providerAccountId, "Concurrent provider-account replay created divergent results");
  assert(!Object.prototype.hasOwnProperty.call(providerFirst, "pId") && !Object.prototype.hasOwnProperty.call(providerFirst, "updatedBy"), "Provider-account mutation returned private persisted fields");
  assert(await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "provider_account_upsert" && data.entityId === providerRef.id
  )) === 1, "Provider-account replay duplicated audit or cost effects");
  await expectRejects("Changed provider-account idempotency payload", () => upsertSignalDeskProviderAccountServer(access, {
    ...providerInput,
    dailyBudgetUsd: providerInput.dailyBudgetUsd + 1,
  }), "PROVIDER_ACCOUNT_IDEMPOTENCY_CONFLICT");
  await expectRejects("Invalid provider-account budget hierarchy", () => upsertSignalDeskProviderAccountServer(access, {
    ...providerInput,
    dailyBudgetUsd: 1,
    idempotencyKey: "provider-account-invalid-budget",
    perRunBudgetUsd: 2,
  }), "SIGNALDESK_PROVIDER_ACCOUNT_BUDGET_INVALID");

  const budgetRef = db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc("budget_provider_gemini_default");
  const budgetCurrent = (await budgetRef.get()).data();
  const budgetInput = {
    dailyBudgetUsd: budgetCurrent.dailyBudgetUsd,
    idempotencyKey: "budget-policy-gemini-provider-current",
    monthlyBudgetUsd: budgetCurrent.monthlyBudgetUsd,
    name: budgetCurrent.name,
    perRunBudgetUsd: budgetCurrent.perRunBudgetUsd,
    provider: "gemini",
    scope: "provider",
    status: budgetCurrent.status,
  };
  const [budgetFirst, budgetReplay] = await Promise.all([
    upsertSignalDeskBudgetPolicyServer(access, budgetInput),
    upsertSignalDeskBudgetPolicyServer(access, budgetInput),
  ]);
  assert(budgetFirst.budgetPolicyId === budgetReplay.budgetPolicyId, "Concurrent budget-policy replay created divergent results");
  assert(!Object.prototype.hasOwnProperty.call(budgetFirst, "pId") && !Object.prototype.hasOwnProperty.call(budgetFirst, "updatedBy"), "Budget-policy mutation returned private persisted fields");
  assert(await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "budget_policy_upsert" && data.entityId === budgetRef.id
  )) === 1, "Budget-policy replay duplicated audit or cost effects");
  await expectRejects("Changed budget-policy idempotency payload", () => upsertSignalDeskBudgetPolicyServer(access, {
    ...budgetInput,
    monthlyBudgetUsd: budgetInput.monthlyBudgetUsd + 1,
  }), "BUDGET_POLICY_IDEMPOTENCY_CONFLICT");
  await expectRejects("Invalid budget-policy hierarchy", () => upsertSignalDeskBudgetPolicyServer(access, {
    ...budgetInput,
    dailyBudgetUsd: 1,
    idempotencyKey: "budget-policy-invalid-hierarchy",
    perRunBudgetUsd: 2,
  }), "SIGNALDESK_BUDGET_POLICY_BUDGET_INVALID");
}

async function assertConnectorSettingConfigurationContracts() {
  const connectorInput = {
    connectorKind: "email-smtp",
    displayName: "Audit connector email",
    fromName: "MenuList",
    idempotencyKey: "connector-setting-email-current",
    notes: "Founder-controlled connector readiness.",
    replyToEmail: "reply@example.invalid",
    senderDomain: "example.invalid",
    senderEmail: "hello@example.invalid",
    status: "hold",
  };
  const connectorId = `connector_${connectorInput.connectorKind}_${hashValue([
    connectorInput.connectorKind,
    connectorInput.senderEmail,
    connectorInput.displayName.toLowerCase(),
  ].join("|")).slice(0, 18)}`;
  const connectorRef = db.collection(SIGNALDESK_COLLECTIONS.CONNECTOR_SETTINGS).doc(connectorId);
  await upsertSignalDeskConnectorSettingServer(access, {
    ...connectorInput,
    idempotencyKey: "connector-setting-email-initial",
  });
  const channelHealthRef = db.collection(SIGNALDESK_COLLECTIONS.CHANNEL_HEALTH_SUMMARIES).doc("email");
  await connectorRef.set({ legacyPrivate: "remove-on-authoritative-write" }, { merge: true });
  await channelHealthRef.set({ legacyPrivate: "remove-on-authoritative-write" }, { merge: true });
  const auditCountBefore = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "connector_setting_upsert" && data.entityId === connectorRef.id
  ));
  const [first, replay] = await Promise.all([
    upsertSignalDeskConnectorSettingServer(access, connectorInput),
    upsertSignalDeskConnectorSettingServer(access, connectorInput),
  ]);
  assert(first.connectorId === replay.connectorId, "Concurrent connector-setting replay created divergent results");
  assert(first.connectorId === connectorId, "Connector-setting identity did not match its normalized authority key");
  assert(!Object.prototype.hasOwnProperty.call(first, "pId") && !Object.prototype.hasOwnProperty.call(first, "updatedBy"), "Connector-setting mutation returned private persisted fields");
  const stored = (await connectorRef.get()).data();
  assert(!Object.prototype.hasOwnProperty.call(stored || {}, "legacyPrivate"), "Connector-setting authoritative replacement preserved a stale unknown field");
  assert(await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "connector_setting_upsert" && data.entityId === connectorRef.id
  )) === auditCountBefore + 1, "Connector-setting replay duplicated audit or cost effects");
  const storedChannelHealth = (await channelHealthRef.get()).data();
  assert(storedChannelHealth?.pId === SIGNALDESK_PRODUCT_CODE, "Connector-setting health projection omitted SignalDesk product identity");
  assert(!Object.prototype.hasOwnProperty.call(storedChannelHealth || {}, "legacyPrivate"), "Connector-setting health replacement preserved a stale unknown field");
  const settingsWorkspace = await loadSignalDeskWorkspaceServer(access, "settings");
  assert(settingsWorkspace.workspace.channelHealth.some((health) => health.channel === "email"), "Connector-setting health projection was invisible to settings consumers");
  await expectRejects("Changed connector-setting idempotency payload", () => upsertSignalDeskConnectorSettingServer(access, {
    ...connectorInput,
    notes: "Changed input cannot reuse the settled operation key.",
  }), "CONNECTOR_SETTING_IDEMPOTENCY_CONFLICT");

  await channelHealthRef.set({ ...storedChannelHealth, pId: "ML" });
  await expectRejects("Wrong-product current connector health overwrite", () => upsertSignalDeskConnectorSettingServer(access, {
    ...connectorInput,
    idempotencyKey: "connector-setting-wrong-product-health",
  }), "CHANNEL_HEALTH_CURRENT_SHAPE_INVALID");
  assert((await channelHealthRef.get()).data()?.pId === "ML", "Wrong-product connector health authority was overwritten");
  await channelHealthRef.set({ ...storedChannelHealth, pId: SIGNALDESK_PRODUCT_CODE });
  await upsertSignalDeskChannelWindowStateServer(access, {
    channel: "whatsapp",
    idempotencyKey: "connector-health-global-whatsapp-window",
    source: "inbound",
    status: "open",
  });
  const whatsappChannelHealthRef = db.collection(SIGNALDESK_COLLECTIONS.CHANNEL_HEALTH_SUMMARIES).doc("whatsapp");
  const storedWhatsappChannelHealth = (await whatsappChannelHealthRef.get()).data();
  assert(storedWhatsappChannelHealth?.pId === SIGNALDESK_PRODUCT_CODE, "Channel-window health projection omitted SignalDesk product identity");
  const whatsappWindowRef = db.collection(SIGNALDESK_COLLECTIONS.CHANNEL_WINDOW_STATES).doc("window_whatsapp_global");
  const storedWhatsappWindow = (await whatsappWindowRef.get()).data();
  assert(storedWhatsappWindow?.pId === SIGNALDESK_PRODUCT_CODE, "Channel-window mutation omitted SignalDesk product identity");
  await whatsappWindowRef.set({ ...storedWhatsappWindow, pId: "ML" });
  await expectRejects("Wrong-product current channel-window overwrite", () => upsertSignalDeskChannelWindowStateServer(access, {
    channel: "whatsapp",
    idempotencyKey: "connector-window-wrong-product-whatsapp",
    source: "inbound",
    status: "closed",
  }), "CHANNEL_WINDOW_CURRENT_SHAPE_INVALID");
  assert((await whatsappWindowRef.get()).data()?.pId === "ML", "Wrong-product channel-window authority was overwritten");
  await whatsappWindowRef.set({ ...storedWhatsappWindow, pId: SIGNALDESK_PRODUCT_CODE });
  await whatsappWindowRef.set({ targetId: "target_wrong_lineage" }, { merge: true });
  await expectRejects("Mismatched current channel-window lineage", () => upsertSignalDeskChannelWindowStateServer(access, {
    channel: "whatsapp",
    idempotencyKey: "connector-window-mismatched-lineage",
    source: "inbound",
    status: "closed",
  }), "CHANNEL_WINDOW_CURRENT_SHAPE_INVALID");
  await whatsappWindowRef.set(storedWhatsappWindow);
  await whatsappChannelHealthRef.set({ ...storedWhatsappChannelHealth, pId: "ML" });
  await expectRejects("Wrong-product current channel-window health overwrite", () => upsertSignalDeskChannelWindowStateServer(access, {
    channel: "whatsapp",
    idempotencyKey: "connector-health-wrong-product-whatsapp-window",
    source: "inbound",
    status: "closed",
  }), "CHANNEL_HEALTH_CURRENT_SHAPE_INVALID");
  assert((await whatsappChannelHealthRef.get()).data()?.pId === "ML", "Wrong-product channel-window health authority was overwritten");
  await whatsappChannelHealthRef.set({ ...storedWhatsappChannelHealth, pId: SIGNALDESK_PRODUCT_CODE });

  await connectorRef.set({ ...stored, pId: "ML" });
  await expectRejects("Wrong-product current connector-setting overwrite", () => upsertSignalDeskConnectorSettingServer(access, {
    ...connectorInput,
    idempotencyKey: "connector-setting-wrong-product",
  }), "CONNECTOR_SETTING_CURRENT_SHAPE_INVALID");
  assert((await connectorRef.get()).data()?.pId === "ML", "Wrong-product connector-setting authority was overwritten");
}

async function assertTeamAccessManagement() {
  const partnerEmail = "signaldesk-partner@example.invalid";
  const partnerSession = {
    authIssuedAt: new Date().toISOString(),
    uId: "partner-auth-session",
    user: {
      email: partnerEmail,
      name: "SignalDesk Partner",
    },
  };
  await firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(partnerSession.uId).set({
    active: true,
    email: partnerEmail,
    id: partnerSession.uId,
    isVerified: true,
  });
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

async function assertExperimentAndOfferAuthorityIntegrity() {
  const suffix = "experiment_authority_e2e";
  const policy = await createPolicy("Experiment authority");
  const podId = `market_pod_${suffix}`;
  const ctaId = `cta_${suffix}`;
  const alternateCtaId = `cta_${suffix}_alternate`;
  const offerId = `offer_cta_${suffix}`;
  const timestamp = timestampNow();
  await db.collection(SIGNALDESK_COLLECTIONS.MARKET_PODS).doc(podId).set({
    approvedAt: timestamp,
    approvedBy: access.userId,
    category: "restaurant",
    city: "Bengaluru",
    country: "India",
    marketPodId: podId,
    monthlyBudgetUsd: 0,
    name: "Experiment authority pod",
    offerAngle: "One controlled private preview.",
    pId: "SD",
    reviewDecision: "approved",
    reviewedAt: timestamp,
    reviewedBy: access.userId,
    reviewReason: "Local experiment authority fixture.",
    status: "active",
    successMetric: "preview_prepared",
    updatedAt: timestamp,
    updatedBy: access.userId,
  });
  for (const [id, label] of [[ctaId, "Experiment preview"], [alternateCtaId, "Alternate experiment preview"]]) {
    await db.collection(SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS).doc(id).set({
      copy: `${label} copy for one bounded experiment.`,
      ctaId: id,
      ctaType: "claim-start",
      label,
      pId: "SD",
      status: "active",
      updatedAt: timestampNow(),
      updatedBy: access.userId,
    });
  }
  const offerInput = {
    activationSurface: "preview",
    approvedAsk: "Review one private MenuList preview before deciding whether to continue.",
    blockedClaims: ["Guaranteed sales", "Guaranteed ranking"],
    ctaId,
    marketPodId: podId,
    offerCtaId: offerId,
    proofMatchRule: "Use only with owned or explicitly permissioned proof.",
    segment: "restaurant-owner",
    status: "active",
    title: "Controlled experiment preview",
  };
  const offerAuditCountBefore = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "offer_cta_upsert" && data.entityId === offerId
  ));
  const [offer, offerReplay] = await Promise.all([
    upsertSignalDeskOfferCtaServer(access, offerInput),
    upsertSignalDeskOfferCtaServer(access, offerInput),
  ]);
  assert(offer.offerCtaId === offerId && offer.status === "active", "Controlled offer CTA was not activated");
  assert(offerReplay.offerCtaId === offerId && offerReplay.status === "active", "Concurrent exact offer save did not converge");
  const offerAuditCountAfter = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "offer_cta_upsert" && data.entityId === offerId
  ));
  assert(offerAuditCountAfter === offerAuditCountBefore + 1, "Concurrent exact offer save repeated audit and cost effects");
  assert(!Object.prototype.hasOwnProperty.call(offer, "pId"), "Offer CTA DTO leaked its product marker");

  await expectRejects("Active offer without coupled authorities", () => upsertSignalDeskOfferCtaServer(access, {
    ...offerInput,
    ctaId: undefined,
    offerCtaId: `${offerId}_missing_authority`,
  }), "OFFER_CTA_ACTIVE_AUTHORITY_REQUIRED");
  await expectRejects("Active offer with missing nested CTA", () => upsertSignalDeskOfferCtaServer(access, {
    ...offerInput,
    ctaId: `cta_${suffix}_missing`,
    offerCtaId: `${offerId}_missing_cta`,
  }), "Offer CTA self-service CTA not found");
  await db.collection(SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS).doc(alternateCtaId).set({ status: "hold", updatedAt: timestampNow() }, { merge: true });
  await expectRejects("Active offer with inactive nested CTA", () => upsertSignalDeskOfferCtaServer(access, {
    ...offerInput,
    ctaId: alternateCtaId,
    offerCtaId: `${offerId}_inactive_cta`,
  }), "Offer CTA self-service CTA is not active");
  await db.collection(SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS).doc(alternateCtaId).set({ status: "active", updatedAt: timestampNow() }, { merge: true });
  const wrongProductOfferId = `${offerId}_wrong_product`;
  await db.collection(SIGNALDESK_COLLECTIONS.OFFER_CTAS).doc(wrongProductOfferId).set({
    ...offerInput,
    offerCtaId: wrongProductOfferId,
    pId: "AL",
    updatedAt: timestampNow(),
  });
  await expectRejects("Wrong-product offer overwrite", () => upsertSignalDeskOfferCtaServer(access, {
    ...offerInput,
    offerCtaId: wrongProductOfferId,
  }), "OFFER_CTA_PRODUCT_MISMATCH");
  assert((await db.collection(SIGNALDESK_COLLECTIONS.OFFER_CTAS).doc(wrongProductOfferId).get()).data()?.pId === "AL", "Wrong-product offer was overwritten");

  const assetId = `content_asset_${suffix}`;
  await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(assetId).set(contentAssetFixture(assetId, {
    ctaId,
    marketPodId: podId,
    title: "Experiment authority proof asset",
  }));
  const experimentInput = {
    channel: "content",
    contentAssetId: assetId,
    ctaId: offerId,
    expectedOutcome: "One owner reviews a private preview.",
    hypothesis: "A permissioned private preview creates a useful owner conversation.",
    marketPodId: podId,
    readbackPlan: {
      baselineWindow: {
        endAt: "2026-07-08T00:00:00.000Z",
        startAt: "2026-07-01T00:00:00.000Z",
      },
      candidateWindow: {
        endAt: "2026-07-15T00:00:00.000Z",
        startAt: "2026-07-08T00:00:00.000Z",
      },
      confounders: ["Market pod changes", "Offer or CTA changes"],
      nextReadbackAt: "2026-07-15T00:00:00.000Z",
      primaryMetric: "Owner-reviewed two-surface activations",
    },
    sourcePolicyId: policy.sourcePolicyId,
    status: "active",
    stopRule: "Stop after five attempts or one complaint.",
    targetCount: 5,
  };
  const experiment = await createSignalDeskExperimentCardServer(access, experimentInput);
  assert(experiment.status === "active" && experiment.ownerDecision === "pending", "Controlled experiment did not become active");
  assert(experiment.proofAssetSummary === "Experiment authority proof asset", "Experiment proof summary did not derive from validated asset truth");
  assert(experiment.readbackPlan?.version === "signaldesk-experiment-readback-v1", "Experiment readback plan was not versioned");
  assert(experiment.readbackPlan?.primaryMetric === experimentInput.readbackPlan.primaryMetric, "Experiment readback plan lost its primary metric");
  assert(!Object.prototype.hasOwnProperty.call(experiment, "pId"), "Experiment DTO leaked its product marker");

  await expectRejects("Experiment readback identity conflict", () => createSignalDeskExperimentCardServer(access, {
    ...experimentInput,
    readbackPlan: {
      ...experimentInput.readbackPlan,
      nextReadbackAt: "2026-07-16T00:00:00.000Z",
    },
  }), "EXPERIMENT_CARD_IDENTITY_CONFLICT");
  await expectRejects("Invalid experiment readback window", () => createSignalDeskExperimentCardServer(access, {
    ...experimentInput,
    hypothesis: "Overlapping readback windows must not enter experiment truth.",
    readbackPlan: {
      ...experimentInput.readbackPlan,
      candidateWindow: {
        endAt: "2026-07-15T00:00:00.000Z",
        startAt: "2026-07-07T00:00:00.000Z",
      },
    },
  }), "EXPERIMENT_READBACK_PLAN_INVALID");

  const experimentSnap = await db.collection(SIGNALDESK_COLLECTIONS.EXPERIMENT_CARDS).doc(experiment.experimentCardId).get();
  await experimentSnap.ref.set({ internalOnly: "must-not-leak" }, { merge: true });
  const legacyExperimentId = `${experiment.experimentCardId}_legacy`;
  const legacyExperimentData = {
    ...experimentSnap.data(),
    experimentCardId: legacyExperimentId,
  };
  delete legacyExperimentData.readbackPlan;
  await db.collection(SIGNALDESK_COLLECTIONS.EXPERIMENT_CARDS).doc(legacyExperimentId).set(legacyExperimentData);
  const wrongProductExperimentId = `${experiment.experimentCardId}_wrong_product`;
  await db.collection(SIGNALDESK_COLLECTIONS.EXPERIMENT_CARDS).doc(wrongProductExperimentId).set({
    ...experimentSnap.data(),
    experimentCardId: wrongProductExperimentId,
    pId: "AL",
  });
  const contradictoryExperimentId = `${experiment.experimentCardId}_contradictory`;
  await db.collection(SIGNALDESK_COLLECTIONS.EXPERIMENT_CARDS).doc(contradictoryExperimentId).set({
    ...experimentSnap.data(),
    experimentCardId: contradictoryExperimentId,
    ownerDecision: "complete",
    pId: "SD",
    status: "active",
  });
  const missionWorkspace = await loadSignalDeskWorkspaceServer(access, "mission");
  const projectedExperiment = missionWorkspace.workspace.experimentCards.find((row) => row.experimentCardId === experiment.experimentCardId);
  const projectedLegacyExperiment = missionWorkspace.workspace.experimentCards.find((row) => row.experimentCardId === legacyExperimentId);
  assert(projectedExperiment && !Object.prototype.hasOwnProperty.call(projectedExperiment, "internalOnly"), "Experiment workspace bypassed the strict DTO projector");
  assert(projectedLegacyExperiment?.readbackPlan === null, "Legacy experiment without a readback plan did not remain visible");
  assert(!missionWorkspace.workspace.experimentCards.some((row) => row.experimentCardId === wrongProductExperimentId), "Wrong-product experiment leaked into the workspace");
  assert(!missionWorkspace.workspace.experimentCards.some((row) => row.experimentCardId === contradictoryExperimentId), "Contradictory experiment lifecycle leaked into the workspace");
  await db.collection(SIGNALDESK_COLLECTIONS.EXPERIMENT_CARDS).doc(legacyExperimentId).delete();
  await db.collection(SIGNALDESK_COLLECTIONS.EXPERIMENT_CARDS).doc(contradictoryExperimentId).delete();

  await expectRejects("Active experiment without controlled authorities", () => createSignalDeskExperimentCardServer(access, {
    ...experimentInput,
    contentAssetId: undefined,
    ctaId: undefined,
    hypothesis: "An active experiment must not start without current authority.",
    marketPodId: undefined,
    sourcePolicyId: undefined,
  }), "EXPERIMENT_ACTIVE_AUTHORITY_REQUIRED");
  await expectRejects("Experiment with missing offer", () => createSignalDeskExperimentCardServer(access, {
    ...experimentInput,
    contentAssetId: undefined,
    ctaId: `${offerId}_missing`,
    hypothesis: "A planned experiment cannot retain a missing offer reference.",
    status: "planned",
  }), "Offer CTA not found");
  const heldOfferId = `${offerId}_held`;
  await upsertSignalDeskOfferCtaServer(access, { ...offerInput, offerCtaId: heldOfferId, status: "hold" });
  await expectRejects("Active experiment with inactive offer", () => createSignalDeskExperimentCardServer(access, {
    ...experimentInput,
    contentAssetId: undefined,
    ctaId: heldOfferId,
    hypothesis: "An inactive offer cannot activate an experiment.",
  }), "Offer CTA is not active");
  const commercialOfferInputFor = (name, offerCtaId) => ({
    allowedDiscountBps: 0,
    billingCadence: "monthly",
    contents: ["One controlled MenuList activation"],
    currency: "USD",
    eligibilitySummary: "Only for the isolated experiment authority fixture.",
    founderApprovalConditions: ["Founder reviews the exact offer and authority chain."],
    name,
    offerCtaId,
    priceMinor: 1000,
    status: "active",
    version: 1,
  });
  await expectRejects("Commercial offer with inactive Offer CTA", () => upsertSignalDeskCommercialOfferServer(access, commercialOfferInputFor(
    "Inactive nested experiment offer",
    heldOfferId,
  )), "Offer CTA is not active");
  await expectRejects("Commercial offer with wrong-product Offer CTA", () => upsertSignalDeskCommercialOfferServer(access, commercialOfferInputFor(
    "Wrong-product nested experiment offer",
    wrongProductOfferId,
  )), "OFFER_CTA_PRODUCT_MISMATCH");
  const pendingOfferId = `${offerId}_pending`;
  const activeOfferSnap = await db.collection(SIGNALDESK_COLLECTIONS.OFFER_CTAS).doc(offerId).get();
  await db.collection(SIGNALDESK_COLLECTIONS.OFFER_CTAS).doc(pendingOfferId).set({
    ...activeOfferSnap.data(),
    dependentHoldReconciliationPending: true,
    dependentHoldReconciliationToken: "pending-offer-authority-e2e",
    offerCtaId: pendingOfferId,
  });
  await expectRejects("Commercial offer with pending Offer CTA", () => upsertSignalDeskCommercialOfferServer(access, commercialOfferInputFor(
    "Pending nested experiment offer",
    pendingOfferId,
  )), "CONTENT_AUTHORITY_RECONCILIATION_PENDING");
  const malformedNestedOfferId = `${offerId}_malformed_nested`;
  await db.collection(SIGNALDESK_COLLECTIONS.OFFER_CTAS).doc(malformedNestedOfferId).set({
    ...activeOfferSnap.data(),
    ctaId: `${ctaId}_missing_nested`,
    offerCtaId: malformedNestedOfferId,
  });
  await expectRejects("Commercial offer with invalid nested Offer CTA authority", () => upsertSignalDeskCommercialOfferServer(access, commercialOfferInputFor(
    "Invalid nested experiment offer",
    malformedNestedOfferId,
  )), "Offer CTA self-service CTA not found");
  const wrongPolicyId = `policy_${suffix}_wrong_product`;
  const policySnap = await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(policy.sourcePolicyId).get();
  await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(wrongPolicyId).set({
    ...policySnap.data(),
    pId: "AL",
    sourcePolicyId: wrongPolicyId,
  });
  await expectRejects("Experiment with wrong-product source policy", () => createSignalDeskExperimentCardServer(access, {
    ...experimentInput,
    contentAssetId: undefined,
    hypothesis: "Wrong-product source authority cannot enter an experiment.",
    sourcePolicyId: wrongPolicyId,
    status: "planned",
  }), "EXPERIMENT_SOURCE_POLICY_PRODUCT_MISMATCH");
  const mismatchedAssetId = `${assetId}_mismatched_cta`;
  await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(mismatchedAssetId).set(contentAssetFixture(mismatchedAssetId, {
    ctaId: alternateCtaId,
    marketPodId: podId,
    title: "Mismatched experiment authority asset",
  }));
  await expectRejects("Experiment offer and asset provenance mismatch", () => createSignalDeskExperimentCardServer(access, {
    ...experimentInput,
    contentAssetId: mismatchedAssetId,
    hypothesis: "Offer and proof provenance must agree before a test is stored.",
  }), "EXPERIMENT_OFFER_ASSET_PROVENANCE_MISMATCH");

  await expectRejects("Experiment review without result summary", () => reviewSignalDeskExperimentCardServer(access, {
    experimentCardId: experiment.experimentCardId,
    ownerDecision: "hold",
    resultSummary: "",
  }), "EXPERIMENT_REVIEW_RESULT_REQUIRED");
  await expectRejects("Experiment review transition mismatch", () => reviewSignalDeskExperimentCardServer(access, {
    experimentCardId: experiment.experimentCardId,
    ownerDecision: "hold",
    resultSummary: "Transition mismatch must fail.",
    status: "active",
  }), "EXPERIMENT_REVIEW_STATUS_MISMATCH");
  const heldExperiment = await reviewSignalDeskExperimentCardServer(access, {
    experimentCardId: experiment.experimentCardId,
    ownerDecision: "hold",
    resultSummary: "Held for an authority recheck.",
  });
  assert(heldExperiment.status === "paused", "Experiment hold decision did not derive paused state");
  const repeatAuditCountBefore = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "experiment_card_review" && data.entityId === experiment.experimentCardId
  ));
  const [repeatedExperiment, repeatedExperimentReplay] = await Promise.all([
    reviewSignalDeskExperimentCardServer(access, {
      experimentCardId: experiment.experimentCardId,
      ownerDecision: "repeat",
      resultSummary: "Authority rechecked; repeat one bounded cycle.",
    }),
    reviewSignalDeskExperimentCardServer(access, {
      experimentCardId: experiment.experimentCardId,
      ownerDecision: "repeat",
      resultSummary: "Authority rechecked; repeat one bounded cycle.",
    }),
  ]);
  assert(repeatedExperiment.status === "active", "Experiment repeat decision did not derive active state");
  assert(repeatedExperimentReplay.status === "active", "Concurrent exact experiment review did not converge");
  const repeatAuditCountAfter = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "experiment_card_review" && data.entityId === experiment.experimentCardId
  ));
  assert(repeatAuditCountAfter === repeatAuditCountBefore + 1, "Concurrent exact experiment review repeated audit and cost effects");
  const stoppedExperiment = await reviewSignalDeskExperimentCardServer(access, {
    experimentCardId: experiment.experimentCardId,
    ownerDecision: "stop",
    resultSummary: "Stopped after the bounded cycle met its stop condition.",
  });
  assert(stoppedExperiment.status === "stopped", "Experiment stop decision did not derive stopped state");
  await expectRejects("Terminal experiment reopen", () => reviewSignalDeskExperimentCardServer(access, {
    experimentCardId: experiment.experimentCardId,
    ownerDecision: "repeat",
    resultSummary: "Stopped after the bounded cycle met its stop condition.",
  }), "EXPERIMENT_TERMINAL_REOPEN_NOT_ALLOWED");
  await expectRejects("Terminal experiment result mutation", () => reviewSignalDeskExperimentCardServer(access, {
    experimentCardId: experiment.experimentCardId,
    ownerDecision: "stop",
    resultSummary: "A terminal retry cannot rewrite the recorded result.",
  }), "EXPERIMENT_TERMINAL_MUTATION_NOT_ALLOWED");

  const assetCascadeExperiment = await createSignalDeskExperimentCardServer(access, {
    ...experimentInput,
    hypothesis: "Content authority reduction pauses a nonterminal experiment.",
  });
  await reviewSignalDeskContentAssetServer(access, {
    contentAssetId: assetId,
    idempotencyKey: `experiment-asset-hold-${suffix}`,
    reason: "Exercise experiment dependency reconciliation.",
    status: "hold",
  });
  const assetCascadeSnap = await db.collection(SIGNALDESK_COLLECTIONS.EXPERIMENT_CARDS).doc(assetCascadeExperiment.experimentCardId).get();
  assert(assetCascadeSnap.data()?.status === "paused" && assetCascadeSnap.data()?.authorityHoldReason, "Content asset authority reduction did not pause its experiment");
  await expectRejects("Experiment repeat after asset authority reduction", () => reviewSignalDeskExperimentCardServer(access, {
    experimentCardId: assetCascadeExperiment.experimentCardId,
    ownerDecision: "repeat",
    resultSummary: "Repeat requested after the content authority recheck.",
  }), "Content asset is not ready");

  const offerCascadeExperiment = await createSignalDeskExperimentCardServer(access, {
    ...experimentInput,
    channel: "manual",
    contentAssetId: undefined,
    hypothesis: "Offer authority reduction pauses a nonterminal experiment.",
  });
  await upsertSignalDeskOfferCtaServer(access, { ...offerInput, status: "hold" });
  const offerCascadeSnap = await db.collection(SIGNALDESK_COLLECTIONS.EXPERIMENT_CARDS).doc(offerCascadeExperiment.experimentCardId).get();
  assert(offerCascadeSnap.data()?.status === "paused" && offerCascadeSnap.data()?.authorityHoldReason, "Offer authority reduction did not pause its experiment");
  await expectRejects("Experiment repeat after offer authority reduction", () => reviewSignalDeskExperimentCardServer(access, {
    experimentCardId: offerCascadeExperiment.experimentCardId,
    ownerDecision: "repeat",
    resultSummary: "Repeat requested after the offer authority recheck.",
  }), "Offer CTA is not active");
  await upsertSignalDeskOfferCtaServer(access, offerInput);

  const podCascadeExperiment = await createSignalDeskExperimentCardServer(access, {
    ...experimentInput,
    channel: "manual",
    contentAssetId: undefined,
    hypothesis: "Market-pod authority reduction pauses a nonterminal experiment.",
  });
  await reviewSignalDeskMarketPodServer(access, {
    decision: "held",
    idempotencyKey: `experiment-pod-hold-${suffix}`,
    marketPodId: podId,
    reason: "Exercise experiment and offer dependency reconciliation.",
  });
  const podCascadeSnap = await db.collection(SIGNALDESK_COLLECTIONS.EXPERIMENT_CARDS).doc(podCascadeExperiment.experimentCardId).get();
  const cascadedOfferSnap = await db.collection(SIGNALDESK_COLLECTIONS.OFFER_CTAS).doc(offerId).get();
  assert(podCascadeSnap.data()?.status === "paused" && podCascadeSnap.data()?.authorityHoldReason, "Market-pod authority reduction did not pause its experiment");
  assert(cascadedOfferSnap.data()?.status === "hold", "Market-pod authority reduction left its offer active");
  await reviewSignalDeskMarketPodServer(access, {
    decision: "approved",
    idempotencyKey: `experiment-pod-restore-${suffix}`,
    marketPodId: podId,
    reason: "Restore the isolated E2E authority fixture.",
  });
  await upsertSignalDeskOfferCtaServer(access, offerInput);
}

async function assertSourcePolicyNegatives() {
  await expectRejects("Import without source policy", () => importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:missing-policy",
    rows: [rowFor("MissingPolicy")],
    sourceName: "missing policy",
    sourcePolicyId: "missing_source_policy",
  }), "SOURCE_POLICY_REVIEW_REQUIRED");

  const expiredPolicy = await createPolicy("Expired import", { expiresAt: futureIso(1), retentionDays: 1 });
  await expirePolicy(expiredPolicy.sourcePolicyId);
  await expectRejects("Import with expired source policy", () => importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:expired-policy",
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
    idempotencyKey: "e2e-import:legacy-policy-review",
    rows: [rowFor("LegacyReview")],
    sourceName: "legacy review",
    sourcePolicyId: legacyPolicyId,
  }), "SOURCE_POLICY_SHAPE_INVALID");

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
    idempotencyKey: "e2e-import:no-retention",
    rows: [rowFor("NoRetention")],
    sourceName: "no retention",
    sourcePolicyId: noRetentionPolicyId,
  }), "SOURCE_POLICY_SHAPE_INVALID");

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
    idempotencyKey: "e2e-import:missing-rights",
    rows: [rowFor("MissingRights")],
    sourceName: "missing source rights",
    sourcePolicyId: incompleteRightsPolicyId,
  }), "SOURCE_POLICY_SHAPE_INVALID");

  const renewablePolicy = await createPolicy("Renewable policy", {
    expiresAt: futureIso(1),
    retentionDays: 30,
  });
  const renewableTargetId = await importOne(renewablePolicy.sourcePolicyId, "RenewalTarget");
  const renewalPolicyBefore = (await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES)
    .doc(renewablePolicy.sourcePolicyId).get()).data();
  const renewalTargetBefore = (await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES)
    .doc(renewableTargetId).get()).data();
  const renewalLastReviewedAt = new Date().toISOString();
  const renewalInput = {
    expiresAt: new Date(Date.parse(renewalLastReviewedAt) + (30 * 24 * 60 * 60 * 1_000)).toISOString(),
    idempotencyKey: "e2e-source-policy-renewal",
    lastReviewedAt: renewalLastReviewedAt,
    sourcePolicyId: renewablePolicy.sourcePolicyId,
  };
  assert(SignalDeskSourcePolicyRenewSchema.safeParse(renewalInput).success, "Source policy renewal fixture is invalid");
  const renewedPolicy = await renewSignalDeskSourcePolicyServer(access, renewalInput);
  const renewalReplay = await renewSignalDeskSourcePolicyServer(access, renewalInput);
  assert(renewedPolicy.expiresAt === renewalInput.expiresAt, "Source policy renewal did not persist the requested expiry");
  assert(renewalReplay.expiresAt === renewedPolicy.expiresAt, "Source policy renewal exact replay diverged");
  assert(renewedPolicy.status === "active", "Source policy renewal did not restore active policy authority");
  for (const field of [
    "accessMethod",
    "allowedContactChannels",
    "allowedFields",
    "allowedUse",
    "attributionRequirements",
    "blockedFields",
    "createdAt",
    "name",
    "policyOwner",
    "prohibitedUses",
    "provider",
    "rawPayloadPolicy",
    "refreshMethod",
    "retentionDays",
    "sourceType",
    "termsUrl",
    "termsVersion",
  ]) {
    assert(
      JSON.stringify(renewedPolicy[field]) === JSON.stringify(renewablePolicy[field]),
      `Source policy renewal changed immutable terms: ${field}`,
    );
  }
  const renewalTargetAfter = (await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES)
    .doc(renewableTargetId).get()).data();
  assert(
    renewalTargetAfter?.updatedAt?.toMillis?.() === renewalTargetBefore?.updatedAt?.toMillis?.(),
    "Source policy renewal mutated an existing target",
  );
  assert(
    renewalPolicyBefore?.createdAt?.toMillis?.() === (await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES)
      .doc(renewablePolicy.sourcePolicyId).get()).data()?.createdAt?.toMillis?.(),
    "Source policy renewal changed policy creation truth",
  );
  await expectRejects("Source policy renewal changed replay", () => renewSignalDeskSourcePolicyServer(access, {
    ...renewalInput,
    expiresAt: futureIso(20),
  }), "SOURCE_POLICY_RENEWAL_IDEMPOTENCY_CONFLICT");

  const blockedRenewalPolicy = await createPolicy("Blocked renewal", { expiresAt: futureIso(1) });
  await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(blockedRenewalPolicy.sourcePolicyId).set({
    status: "blocked",
    updatedAt: timestampNow(),
  }, { merge: true });
  await expectRejects("Blocked source policy renewal", () => renewSignalDeskSourcePolicyServer(access, {
    expiresAt: futureIso(30),
    idempotencyKey: "e2e-source-policy-renew-blocked",
    lastReviewedAt: new Date().toISOString(),
    sourcePolicyId: blockedRenewalPolicy.sourcePolicyId,
  }), "SOURCE_POLICY_RENEWAL_BLOCKED");

  const boundedRenewalPolicy = await createPolicy("Bounded renewal", {
    expiresAt: futureIso(1),
    retentionDays: 5,
  });
  await expectRejects("Source policy renewal beyond retention", () => renewSignalDeskSourcePolicyServer(access, {
    expiresAt: futureIso(10),
    idempotencyKey: "e2e-source-policy-renew-window",
    lastReviewedAt: new Date().toISOString(),
    sourcePolicyId: boundedRenewalPolicy.sourcePolicyId,
  }), "SOURCE_POLICY_RENEWAL_WINDOW_INVALID");

  const contactBlockedPolicy = await createPolicy("No contact export", { allowContact: false });
  const heldTargetId = await importOne(contactBlockedPolicy.sourcePolicyId, "NoContact", { email: "blocked@example.invalid" });
  const heldTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(heldTargetId).get();
  assert(heldTargetSnap.data()?.contactability === "blocked", "Contact-disallowed import did not block contactability");
  await scoreSignalDeskTargetServer(access, heldTargetId);
  await createSignalDeskEvidenceServer(access, heldTargetId);
  await expectRejects("Draft without contact authority", () => createSignalDeskDraftServer(access, {
    targetId: heldTargetId,
  }), "SIGNALDESK_CONTACT_AUTHORITY_RECIPIENT_REQUIRED");
  assert(
    await expectCollectionCount(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES, (data) => data.targetId === heldTargetId) === 0,
    "Contact-disallowed target created draft truth",
  );
  assert(
    await expectCollectionCount(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE, (data) => data.targetId === heldTargetId) === 0,
    "Contact-disallowed target created approval truth",
  );

  const compositePolicy = await createPolicy("Composite message rights");
  const compositeTargetId = await importOne(compositePolicy.sourcePolicyId, "CompositeRights", { currentListUrl: "" });
  await scoreSignalDeskTargetServer(access, compositeTargetId);
  await createSignalDeskEvidenceServer(access, compositeTargetId);
  await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(compositePolicy.sourcePolicyId).set({
    allowedContactChannels: [],
    allowedUse: { contact: false, evidence: false, import: false, personalization: false, providerRun: false, storage: false },
    updatedAt: timestampNow(),
  }, { merge: true });
  await expectRejects("Draft after evidence rights revoked", () => createSignalDeskDraftServer(access, {
    targetId: compositeTargetId,
  }), "SOURCE_POLICY_USE_NOT_ALLOWED");
  await db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(compositePolicy.sourcePolicyId).set({
    allowedContactChannels: ["email", "manual"],
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
  let providerRequestCount = 0;
  let rejectNextProvider = false;
  global.fetch = async (url, options = {}) => {
    providerRequestCount += 1;
    const requestUrl = new URL(String(url));
    assert(requestUrl.origin === "https://api.ratings.food.gov.uk", "FHRS/FHIS provider used unexpected host");
    assert(requestUrl.pathname === "/Establishments", "FHRS/FHIS provider used unexpected endpoint");
    assert(requestUrl.searchParams.get("businessTypeId") === "1", "FHRS/FHIS provider did not map restaurant query to business type");
    assert(requestUrl.searchParams.get("address") === "Leeds UK", "FHRS/FHIS provider did not pass location as address filter");
    assert(options.headers?.["x-api-version"] === "2", "FHRS/FHIS provider did not request API v2");
    assert(options.signal instanceof AbortSignal, "FHRS/FHIS provider request did not carry an application timeout signal");
    if (rejectNextProvider) {
      rejectNextProvider = false;
      throw new Error("provider secret failure fixture");
    }
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
        }, {
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
      idempotencyKey: "source-provider-fhrs-e2e",
      maxResults: 2,
      provider: "fhrs-fhis",
      query: "restaurant",
      sourcePolicyId: policy.sourcePolicyId,
    });
    assert(result.targets.length === 1, "FHRS/FHIS duplicate provider rows did not converge on one target");
    const target = result.targets[0];
    assert(target.displayName === "FHRS Test Cafe", "FHRS/FHIS provider target name was not normalized");
    const targetDetail = await db.collection(SIGNALDESK_COLLECTIONS.TARGETS).doc(target.targetId).get();
    assert(String(targetDetail.data()?.notes || "").includes("No contact permission is inferred"), "FHRS/FHIS provider notes did not preserve contact boundary");
    const retentionCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.PROVIDER_SOURCE_RETENTION, (data) => (
      data.provider === "fhrs-fhis" && data.providerRecordId === "1234567" && data.rawPayloadStored === false
    ));
    assert(retentionCount === 1, "FHRS/FHIS provider retention record was not stored safely");
    const duplicateRetentionCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.PROVIDER_SOURCE_RETENTION, (data) => (
      data.provider === "fhrs-fhis"
      && data.sourceRunId === result.run.sourceRunId
      && data.providerRecordId === "1234567"
      && data.targetId === target.targetId
    ));
    assert(duplicateRetentionCount === 1, "Exact duplicate provider rows did not converge on one retained lineage record");
    const retentionSnapshot = await db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_SOURCE_RETENTION)
      .where("provider", "==", "fhrs-fhis")
      .where("providerRecordId", "==", "1234567")
      .limit(1)
      .get();
    const retentionDocument = retentionSnapshot.docs[0];
    assert(retentionDocument, "FHRS/FHIS provider retention fixture was not readable");
    const retentionBeforeRefresh = retentionDocument.data();
    const refreshDueBefore = retentionBeforeRefresh.refreshDueAt?.toMillis?.();
    const retentionRefreshInput = {
      idempotencyKey: `provider-retention-refresh-${retentionDocument.id}`,
      notes: "Provider record rechecked in the focused retention contract.",
      providerSourceRetentionId: retentionDocument.id,
      status: "refreshed",
    };
    const refreshedRetention = await refreshSignalDeskProviderSourceRetentionServer(access, retentionRefreshInput);
    const replayedRetention = await refreshSignalDeskProviderSourceRetentionServer(access, retentionRefreshInput);
    assert(
      JSON.stringify(replayedRetention) === JSON.stringify(refreshedRetention),
      "Provider retention exact retry returned divergent authority",
    );
    assert(refreshedRetention.status === "refreshed" && refreshedRetention.lastRefreshedAt, "Provider retention refresh did not return refreshed authority");
    await expectRejects("Provider retention changed-input retry", () => refreshSignalDeskProviderSourceRetentionServer(access, {
      ...retentionRefreshInput,
      status: "blocked",
    }), "PROVIDER_SOURCE_RETENTION_IDEMPOTENCY_CONFLICT");
    const retentionAfterRefresh = (await retentionDocument.ref.get()).data();
    assert(typeof retentionAfterRefresh.lastRefreshedAt?.toMillis === "function", "Provider retention refresh stored lastRefreshedAt as a non-Timestamp");
    assert(typeof retentionAfterRefresh.retentionExpiresAt?.toMillis === "function", "Provider retention refresh stored retentionExpiresAt as a non-Timestamp");
    assert(retentionAfterRefresh.refreshDueAt?.toMillis?.() === refreshDueBefore, "Provider retention refresh rewrote an untouched refreshDueAt timestamp");
    await retentionDocument.ref.set({ sourceDataLifecycleState: "completed" }, { merge: true });
    await expectRejects("Provider retention refresh after lifecycle completion", () => refreshSignalDeskProviderSourceRetentionServer(access, {
      ...retentionRefreshInput,
      idempotencyKey: `${retentionRefreshInput.idempotencyKey}-completed`,
    }), "PROVIDER_SOURCE_RETENTION_LIFECYCLE_COMPLETED");
    await retentionDocument.ref.set({ sourceDataLifecycleState: admin.firestore.FieldValue.delete() }, { merge: true });
    const foreignRetentionRef = db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_SOURCE_RETENTION).doc("retention_foreign_product_fixture");
    await foreignRetentionRef.set({
      ...retentionAfterRefresh,
      pId: "ML",
      providerSourceRetentionId: foreignRetentionRef.id,
      status: "active",
      updatedAt: timestampNow(),
    });
    await expectRejects("Foreign provider retention refresh", () => refreshSignalDeskProviderSourceRetentionServer(access, {
      idempotencyKey: "provider-retention-foreign-refresh",
      providerSourceRetentionId: foreignRetentionRef.id,
      status: "refreshed",
    }), "PROVIDER_SOURCE_RETENTION_SHAPE_INVALID");
    assert((await foreignRetentionRef.get()).data()?.status === "active", "Foreign provider retention row was mutated through admin authority");
    await foreignRetentionRef.delete();
    const contactIdentityCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES, (data) => (
      data.targetId === target.targetId
    ));
    assert(contactIdentityCount === 0, "FHRS/FHIS provider created contact identities despite contact use being disabled");
    const replay = await runSignalDeskSourceProviderServer(access, {
      city: "Leeds", country: "UK", idempotencyKey: "source-provider-fhrs-e2e", maxResults: 2,
      provider: "fhrs-fhis", query: "restaurant", sourcePolicyId: policy.sourcePolicyId,
    });
    assert(replay.providerRunId === result.providerRunId && providerRequestCount === 1, "Source provider exact replay repeated provider work");
    assert(JSON.stringify(Object.keys(replay.run).sort()) === JSON.stringify(Object.keys(result.run).sort()), "Source-provider replay run DTO keyset drifted");
    assert(JSON.stringify(Object.keys(replay.targets[0]).sort()) === JSON.stringify(Object.keys(result.targets[0]).sort()), "Source-provider replay target DTO keyset drifted");
    assert(!("pId" in replay.run) && !("updatedBy" in replay.run) && !("pId" in replay.targets[0]), "Source-provider replay leaked persistence fields");
    const completedSourceProviderClaimRef = db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS)
      .doc(`source_provider_${hashValue(`${access.userId}|source-provider-fhrs-e2e`)}`);
    const completedSourceProviderClaim = (await completedSourceProviderClaimRef.get()).data();
    await completedSourceProviderClaimRef.set({ ...completedSourceProviderClaim, entityId: "provider_redirected" });
    await expectRejects("Source provider replay with redirected claim entity", () => runSignalDeskSourceProviderServer(access, {
      city: "Leeds", country: "UK", idempotencyKey: "source-provider-fhrs-e2e", maxResults: 2,
      provider: "fhrs-fhis", query: "restaurant", sourcePolicyId: policy.sourcePolicyId,
    }), "Source provider idempotency conflict");
    assert(providerRequestCount === 1, "Redirected source-provider claim repeated provider work");
    await completedSourceProviderClaimRef.set(completedSourceProviderClaim);
    await expectRejects("Source provider changed-input idempotency conflict", () => runSignalDeskSourceProviderServer(access, {
      city: "Leeds", country: "UK", idempotencyKey: "source-provider-fhrs-e2e", maxResults: 1,
      provider: "fhrs-fhis", query: "cafes", sourcePolicyId: policy.sourcePolicyId,
    }), "Source provider idempotency conflict");
    assert(providerRequestCount === 1, "Source provider changed-input conflict repeated provider work");

    const originalRunTransaction = db.runTransaction;
    let injectedAcknowledgementLoss = false;
    let providerTransactionCount = 0;
    db.runTransaction = async function patchedRunTransaction(updateFunction, ...args) {
      const result = await originalRunTransaction.call(this, updateFunction, ...args);
      providerTransactionCount += 1;
      if (!injectedAcknowledgementLoss && providerTransactionCount === 2) {
        injectedAcknowledgementLoss = true;
        throw new Error("injected provider import acknowledgement loss");
      }
      return result;
    };
    try {
      const ambiguous = await runSignalDeskSourceProviderServer(access, {
        city: "Leeds", country: "UK", idempotencyKey: "source-provider-fhrs-ambiguous", maxResults: 2,
        provider: "fhrs-fhis", query: "restaurant ambiguous", sourcePolicyId: policy.sourcePolicyId,
      });
      assert(injectedAcknowledgementLoss, "Source provider acknowledgement-loss fixture did not execute");
      assert(ambiguous.targets.length === 1 && providerRequestCount === 2, "Source provider acknowledgement recovery repeated or lost provider work");
      const ambiguousClaimId = `source_provider_${hashValue(`${access.userId}|source-provider-fhrs-ambiguous`)}`;
      const ambiguousClaim = await db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS).doc(ambiguousClaimId).get();
      assert(ambiguousClaim.data()?.status === "completed", "Source provider acknowledgement recovery lost completed claim truth");
    } finally {
      db.runTransaction = originalRunTransaction;
    }

    rejectNextProvider = true;
    await expectRejects("Source provider unresolved external outcome", () => runSignalDeskSourceProviderServer(access, {
      city: "Leeds", country: "UK", idempotencyKey: "source-provider-fhrs-unresolved", maxResults: 2,
      provider: "fhrs-fhis", query: "restaurant failure", sourcePolicyId: policy.sourcePolicyId,
    }), "SOURCE_PROVIDER_REQUEST_FAILED");
    const unresolvedClaimId = `source_provider_${hashValue(`${access.userId}|source-provider-fhrs-unresolved`)}`;
    const unresolvedClaim = await db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS).doc(unresolvedClaimId).get();
    assert(unresolvedClaim.data()?.status === "unresolved", "Source provider failure left a permanent in-progress claim");
    assert(unresolvedClaim.data()?.failureCode === "source_provider_outcome_unresolved", "Source provider failure lost its stable non-sensitive code");
    assert(/^\d{4}-\d{2}-\d{2}$/.test(String(unresolvedClaim.data()?.accountingDay || "")), "Source provider claim lost its reservation day");
    assert(/^\d{4}-\d{2}$/.test(String(unresolvedClaim.data()?.accountingMonth || "")), "Source provider claim lost its reservation month");
    assert(Boolean(unresolvedClaim.data()?.reservedAt?.toMillis?.()), "Source provider claim lost its immutable reservation timestamp");
    await expectRejects("Source provider unresolved exact retry", () => runSignalDeskSourceProviderServer(access, {
      city: "Leeds", country: "UK", idempotencyKey: "source-provider-fhrs-unresolved", maxResults: 2,
      provider: "fhrs-fhis", query: "restaurant failure", sourcePolicyId: policy.sourcePolicyId,
    }), "Source provider outcome requires review");
    assert(providerRequestCount === 3, "Source provider unresolved retry repeated ambiguous external work");
    const unresolvedAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
      data.action === "source_provider_outcome_unresolved"
      && data.entityId === "provider_fhrs-fhis"
      && data.reason === "event:source_provider_outcome_unresolved"
    ));
    assert(unresolvedAuditCount === 1, "Source provider unresolved outcome did not emit one stable audit event");
  } finally {
    global.fetch = originalFetch;
  }
}

async function assertProviderBudgetReservation() {
  const policy = await createPolicy("Apify budget reservation", { allowContact: false, provider: "apify", sourceType: "provider" });
  await db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_apify_discovery").set({
    credentialState: "configured", dailyBudgetUsd: 0.05, monthlyBudgetUsd: 1, ownerApproved: true,
    perRunBudgetUsd: 0.05, provider: "apify", spentMonthUsd: 0, spentTodayUsd: 0, status: "approved", use: "discovery",
  }, { merge: true });
  await db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc("budget_provider_apify_default").set({
    dailyBudgetUsd: 0.05, monthlyBudgetUsd: 1, perRunBudgetUsd: 0.05, provider: "apify",
    scope: "provider", spentMonthUsd: 0, spentTodayUsd: 0, status: "active",
  }, { merge: true });
  process.env.SIGNALDESK_APIFY_API_TOKEN = "apify-test-token";
  process.env.SIGNALDESK_APIFY_SOURCE_ACTOR_ID = "owner/test-actor";
  const originalFetch = global.fetch;
  let providerRequestCount = 0;
  global.fetch = async () => {
    providerRequestCount += 1;
    return new Response(JSON.stringify([{ id: `apify-${providerRequestCount}`, name: `Apify Cafe ${providerRequestCount}`, city: "Pune", country: "India" }]), {
      headers: { "Content-Type": "application/json" }, status: 200,
    });
  };
  try {
    const results = await Promise.allSettled([
      runSignalDeskSourceProviderServer(access, { city: "Pune", country: "India", idempotencyKey: "apify-budget-race-one", maxResults: 1, provider: "apify", query: "cafes one", sourcePolicyId: policy.sourcePolicyId }),
      runSignalDeskSourceProviderServer(access, { city: "Pune", country: "India", idempotencyKey: "apify-budget-race-two", maxResults: 1, provider: "apify", query: "cafes two", sourcePolicyId: policy.sourcePolicyId }),
    ]);
    assert(results.filter((result) => result.status === "fulfilled").length === 1, "Atomic provider budget admitted more than one request");
    assert(results.filter((result) => result.status === "rejected").length === 1, "Atomic provider budget did not reject the over-cap request");
    assert(providerRequestCount === 1, "Provider budget race executed more than one external request");
    const account = await db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_apify_discovery").get();
    const budget = await db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc("budget_provider_apify_default").get();
    assert(account.data()?.spentTodayUsd === 0.05 && budget.data()?.spentTodayUsd === 0.05, "Provider reservation was not charged exactly once");
    assert(account.data()?.spendDayKey === budget.data()?.spendDayKey && account.data()?.spendMonthKey === budget.data()?.spendMonthKey, "Provider reservation did not preserve a shared accounting period");
    const completedApifyClaims = (await Promise.all([
      "apify-budget-race-one",
      "apify-budget-race-two",
    ].map((key) => db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS)
      .doc(`source_provider_${hashValue(`${access.userId}|${key}`)}`)
      .get()))).filter((snap) => snap.data()?.status === "completed");
    assert(completedApifyClaims.length === 1, "Provider budget race did not converge on one completed claim");
    assert(completedApifyClaims[0].data().accountingDay === account.data()?.spendDayKey, "Completed provider claim and account used different reservation days");
  } finally {
    global.fetch = originalFetch;
  }
}

async function assertProviderEvaluationAndTrustPartnerAccounting() {
  const currentDay = new Date().toISOString().slice(0, 10);
  const currentMonth = currentDay.slice(0, 7);
  const [initialEvaluation, replayedEvaluation] = await Promise.all([
    createSignalDeskProviderEvaluationServer(access, {
      idempotencyKey: "provider-evaluation-accounting-v1",
      provider: "apify",
      use: "discovery",
    }),
    createSignalDeskProviderEvaluationServer(access, {
      idempotencyKey: "provider-evaluation-accounting-v1",
      provider: "apify",
      use: "discovery",
    }),
  ]);
  assert(JSON.stringify(replayedEvaluation) === JSON.stringify(initialEvaluation), "Provider evaluation exact retry did not replay its first result");
  await expectRejects("Provider evaluation changed-input retry", () => createSignalDeskProviderEvaluationServer(access, {
    idempotencyKey: "provider-evaluation-accounting-v1",
    provider: "apify",
    use: "research",
  }), "PROVIDER_EVALUATION_IDEMPOTENCY_CONFLICT");
  assert(initialEvaluation.accountingMonth === currentMonth, "Provider evaluation lost its accounting period");
  assert(initialEvaluation.sampleSize === 1, "Provider evaluation did not use the exact provider/use/month population");
  assert(initialEvaluation.populationTruncated === false, "Bounded provider evaluation falsely reported truncation");
  const unrelatedVendorRefs = [
    db.collection(SIGNALDESK_COLLECTIONS.VENDOR_RUNS).doc("provider_eval_other_provider"),
    db.collection(SIGNALDESK_COLLECTIONS.VENDOR_RUNS).doc("provider_eval_other_use"),
    db.collection(SIGNALDESK_COLLECTIONS.VENDOR_RUNS).doc("provider_eval_other_month"),
  ];
  await Promise.all([
    unrelatedVendorRefs[0].set({ accountingMonth: currentMonth, provider: "google-places", providerUse: "discovery" }),
    unrelatedVendorRefs[1].set({ accountingMonth: currentMonth, provider: "apify", providerUse: "research" }),
    unrelatedVendorRefs[2].set({ accountingMonth: "2000-01", provider: "apify", providerUse: "discovery" }),
  ]);
  const isolatedEvaluation = await createSignalDeskProviderEvaluationServer(access, {
    idempotencyKey: "provider-evaluation-accounting-v2",
    provider: "apify",
    use: "discovery",
  });
  assert(isolatedEvaluation.sampleSize === 1, "Provider evaluation mixed another provider, use, or accounting month");
  await Promise.all(unrelatedVendorRefs.map((ref) => ref.delete()));
  const evaluationRef = db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_EVALUATIONS).doc("provider_eval_apify_discovery");
  await evaluationRef.set({ stalePrivateField: "must-be-removed" }, { merge: true });
  await createSignalDeskProviderEvaluationServer(access, {
    idempotencyKey: "provider-evaluation-accounting-v3",
    provider: "apify",
    use: "discovery",
  });
  assert((await evaluationRef.get()).data()?.stalePrivateField === undefined, "Provider evaluation refresh retained stale authoritative fields");
  await evaluationRef.set({ pId: "ML" }, { merge: true });
  await expectRejects("Foreign provider evaluation refresh", () => createSignalDeskProviderEvaluationServer(access, {
    idempotencyKey: "provider-evaluation-accounting-v4",
    provider: "apify",
    use: "discovery",
  }), "PROVIDER_EVALUATION_CURRENT_SHAPE_INVALID");

  const partner = await upsertSignalDeskTrustPartnerProfileServer(access, {
    audienceFitScore: 90,
    baselineReachScore: 80,
    believableUsageScore: 90,
    channel: "community",
    commentQualityScore: 85,
    displayName: "Accounting Trust Partner",
    geography: "Bengaluru",
    idempotencyKey: "trust-partner-profile-accounting-v1",
    partnerType: "operator-advocate",
    sourceNotes: "Deterministic trust-partner accounting fixture.",
    status: "approved",
    trustFeelScore: 90,
  });
  const partnerReplay = await upsertSignalDeskTrustPartnerProfileServer(access, {
    audienceFitScore: 90,
    baselineReachScore: 80,
    believableUsageScore: 90,
    channel: "community",
    commentQualityScore: 85,
    displayName: "Accounting Trust Partner",
    geography: "Bengaluru",
    idempotencyKey: "trust-partner-profile-accounting-v1",
    partnerType: "operator-advocate",
    sourceNotes: "Deterministic trust-partner accounting fixture.",
    status: "approved",
    trustFeelScore: 90,
  });
  assert(partnerReplay.partnerId === partner.partnerId, "Trust-partner profile replay did not return the original entity");
  await expectRejects("Changed trust-partner profile retry", () => upsertSignalDeskTrustPartnerProfileServer(access, {
    audienceFitScore: 89,
    baselineReachScore: 80,
    believableUsageScore: 90,
    channel: "community",
    commentQualityScore: 85,
    displayName: "Accounting Trust Partner",
    geography: "Bengaluru",
    idempotencyKey: "trust-partner-profile-accounting-v1",
    partnerType: "operator-advocate",
    sourceNotes: "Deterministic trust-partner accounting fixture.",
    status: "approved",
    trustFeelScore: 90,
  }), "TRUST_PARTNER_PROFILE_IDEMPOTENCY_CONFLICT");
  await expectRejects("Non-founder trust-partner approval", () => upsertSignalDeskTrustPartnerProfileServer({
    ...access,
    role: "growth-manager",
  }, {
    audienceFitScore: 90,
    baselineReachScore: 90,
    believableUsageScore: 90,
    channel: "newsletter",
    commentQualityScore: 90,
    displayName: "Unapproved Trust Partner",
    idempotencyKey: "trust-partner-non-founder-approval-v1",
    partnerType: "operator-advocate",
    sourceNotes: "Founder boundary fixture.",
    status: "approved",
    trustFeelScore: 90,
  }), "TRUST_PARTNER_FOUNDER_APPROVAL_REQUIRED");
  const niche = await createSignalDeskTrustPartnerNicheTestServer(access, {
    angle: "Current-list proof through trusted operators.",
    idempotencyKey: "trust-partner-niche-accounting-v1",
    intendedAttempts: 3,
    nicheName: "Operator advocates",
    partnerIds: [partner.partnerId],
  });
  const nicheReplay = await createSignalDeskTrustPartnerNicheTestServer(access, {
    angle: "Current-list proof through trusted operators.",
    idempotencyKey: "trust-partner-niche-accounting-v1",
    intendedAttempts: 3,
    nicheName: "Operator advocates",
    partnerIds: [partner.partnerId],
  });
  assert(nicheReplay.nicheTestId === niche.nicheTestId, "Trust-partner niche replay did not return the original test");
  const trustBudgetRef = db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES)
    .doc("budget_trust-partner_all_first_partner_test");
  await trustBudgetRef.set({
    budgetPolicyId: trustBudgetRef.id,
    dailyBudgetUsd: 0.04,
    monthlyBudgetUsd: 0.04,
    name: "First trust partner test",
    pId: SIGNALDESK_PRODUCT_CODE,
    perRunBudgetUsd: 0.04,
    provider: null,
    scope: "trust-partner",
    scopeId: "first_partner_test",
    spendDayKey: currentDay,
    spendMonthKey: currentMonth,
    spentMonthUsd: 0,
    spentTodayUsd: 0,
    status: "active",
    updatedAt: timestampNow(),
  });
  const dealInput = {
    approvalStatus: "approved",
    budgetPolicyId: trustBudgetRef.id,
    deliverableCount: 1,
    dueDate: futureIso(14).slice(0, 10),
    flatFeeUsd: 0.04,
    founderApproved: true,
    partnerId: partner.partnerId,
    pricingModel: "flat-fee",
  };
  const concurrentDeals = await Promise.all([
    reviewSignalDeskTrustPartnerDealServer(access, dealInput),
    reviewSignalDeskTrustPartnerDealServer(access, dealInput),
  ]);
  assert(concurrentDeals[0].dealId === concurrentDeals[1].dealId, "Concurrent trust-partner approval created divergent deals");
  const reservedBudget = (await trustBudgetRef.get()).data();
  assert(reservedBudget?.spentTodayUsd === 0.04 && reservedBudget?.spentMonthUsd === 0.04, "Concurrent trust-partner approval reserved budget more than once");
  assert(concurrentDeals[0].budgetReservationState === "reserved" && concurrentDeals[0].budgetReservationAmountUsd === 0.04, "Trust-partner deal lost reservation evidence");
  const dealAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "trust_partner_deal_review" && data.entityId === concurrentDeals[0].dealId
  ));
  assert(dealAuditCount === 1, "Concurrent trust-partner approval duplicated audit and cost effects");
  await reviewSignalDeskTrustPartnerDealServer(access, dealInput);
  assert((await trustBudgetRef.get()).data()?.spentTodayUsd === 0.04, "Exact trust-partner replay reserved budget again");
  await expectRejects("Approved trust-partner deal is immutable", () => reviewSignalDeskTrustPartnerDealServer(access, {
    ...dealInput,
    approvalStatus: "rejected",
  }), "TRUST_PARTNER_DEAL_APPROVAL_IMMUTABLE");
  await expectRejects("Paid barter trust-partner deal", () => reviewSignalDeskTrustPartnerDealServer(access, {
    ...dealInput,
    flatFeeUsd: 0.01,
    pricingModel: "barter",
  }), "TRUST_PARTNER_BARTER_COST_INVALID");
  await expectRejects("Invalid trust-partner deliverable count", () => reviewSignalDeskTrustPartnerDealServer(access, {
    ...dealInput,
    deliverableCount: 0,
  }), "TRUST_PARTNER_DEAL_DELIVERABLE_COUNT_INVALID");

  const legacyDueDate = futureIso(21).slice(0, 10);
  const legacyDealId = `deal_${partner.partnerId}_${hashValue(`direct|0.03|${legacyDueDate}`).slice(0, 12)}`;
  await db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_DEALS).doc(legacyDealId).set({
    approvalStatus: "approved",
    budgetPolicyId: trustBudgetRef.id,
    dealId: legacyDealId,
    deliverableCount: 1,
    dueDate: legacyDueDate,
    flatFeeUsd: 0.03,
    nicheTestId: null,
    pId: SIGNALDESK_PRODUCT_CODE,
    partnerId: partner.partnerId,
    partnerName: partner.displayName,
    paymentState: "pending",
    pricingModel: "flat-fee",
    updatedAt: timestampNow(),
  });
  const legacyDeal = await reviewSignalDeskTrustPartnerDealServer(access, {
    ...dealInput,
    dueDate: legacyDueDate,
    flatFeeUsd: 0.03,
  });
  assert(legacyDeal.budgetReservationState === "legacy-assumed-reserved", "Legacy approved trust-partner deal was not normalized conservatively");
  assert((await trustBudgetRef.get()).data()?.spentTodayUsd === 0.04, "Legacy approved trust-partner deal was charged again");

  const deliverableInput = {
    dealId: concurrentDeals[0].dealId,
    disclosurePresent: true,
    idempotencyKey: "trust-partner-deliverable-accounting-v1",
    partnerId: partner.partnerId,
    postUrl: "https://example.com/trust-partner-proof#campaign",
    reviewState: "approved",
    status: "live",
  };
  const deliverable = await recordSignalDeskTrustPartnerDeliverableServer(access, deliverableInput);
  const deliverableReplay = await recordSignalDeskTrustPartnerDeliverableServer(access, deliverableInput);
  assert(deliverableReplay.deliverableId === deliverable.deliverableId, "Trust-partner deliverable replay did not return the original evidence");
  assert(deliverable.postUrl === "https://example.com/trust-partner-proof", "Trust-partner deliverable URL was not canonicalized");
  await expectRejects("Changed trust-partner deliverable retry", () => recordSignalDeskTrustPartnerDeliverableServer(access, {
    ...deliverableInput,
    status: "submitted",
  }), "TRUST_PARTNER_DELIVERABLE_IDEMPOTENCY_CONFLICT");
  await expectRejects("Live trust-partner deliverable without URL", () => recordSignalDeskTrustPartnerDeliverableServer(access, {
    disclosurePresent: true,
    idempotencyKey: "trust-partner-deliverable-missing-url-v1",
    partnerId: partner.partnerId,
    reviewState: "approved",
    status: "live",
  }), "TRUST_PARTNER_LIVE_POST_URL_REQUIRED");

  const metricInput = {
    activations: 0,
    commentQuality: "medium",
    comments: 3,
    currentListSubmissions: 0,
    deliverableId: deliverable.deliverableId,
    idempotencyKey: "trust-partner-metrics-accounting-v1",
    ownerLeads: 1,
    partnerId: partner.partnerId,
    views: 100,
  };
  const metric = await recordSignalDeskTrustPartnerMetricsServer(access, metricInput);
  const metricReplay = await recordSignalDeskTrustPartnerMetricsServer(access, metricInput);
  assert(metricReplay.metricsId === metric.metricsId, "Trust-partner metrics replay did not return the original record");
  await expectRejects("Observed trust-partner metrics without live evidence", () => recordSignalDeskTrustPartnerMetricsServer(access, {
    ...metricInput,
    deliverableId: undefined,
    idempotencyKey: "trust-partner-metrics-no-evidence-v1",
  }), "TRUST_PARTNER_METRICS_LIVE_DELIVERABLE_REQUIRED");

  const renewalInput = {
    evidenceSummary: "One owner-quality lead from attributable live evidence.",
    idempotencyKey: "trust-partner-renewal-accounting-v1",
    nicheTestId: niche.nicheTestId,
    ownerDecision: "pending",
    partnerId: partner.partnerId,
    recommendation: "retest",
  };
  const renewal = await reviewSignalDeskTrustPartnerRenewalServer(access, renewalInput);
  const renewalReplay = await reviewSignalDeskTrustPartnerRenewalServer(access, renewalInput);
  assert(renewalReplay.decisionId === renewal.decisionId, "Trust-partner renewal replay did not return the original decision");
  await expectRejects("Unsupported trust-partner renewal recommendation", () => reviewSignalDeskTrustPartnerRenewalServer(access, {
    ...renewalInput,
    idempotencyKey: "trust-partner-renewal-mismatch-v1",
    recommendation: "renew",
  }), "TRUST_PARTNER_RENEWAL_RECOMMENDATION_MISMATCH");

  const trustPauseRef = db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc("scope_trust-partner");
  await trustPauseRef.set(activeKillSwitchFixture("trust-partner"));
  await expectRejects("Paused trust-partner profile admission", () => upsertSignalDeskTrustPartnerProfileServer(access, {
    audienceFitScore: 80,
    baselineReachScore: 80,
    believableUsageScore: 80,
    channel: "offline",
    commentQualityScore: 80,
    displayName: "Paused Trust Partner",
    idempotencyKey: "trust-partner-paused-profile-v1",
    partnerType: "restaurant-consultant",
    sourceNotes: "Pause fixture.",
    status: "candidate",
    trustFeelScore: 80,
  }), "TRUST_PARTNER_RAIL_PAUSED");
  await expectRejects("Paused trust-partner niche admission", () => createSignalDeskTrustPartnerNicheTestServer(access, {
    angle: "Paused niche fixture.",
    idempotencyKey: "trust-partner-paused-niche-v1",
    intendedAttempts: 3,
    nicheName: "Paused partners",
    partnerIds: [partner.partnerId],
  }), "TRUST_PARTNER_RAIL_PAUSED");
  await trustPauseRef.delete();
}

async function assertResearchAgentTable() {
  const policy = await createPolicy("Research agent FHRS", {
    allowContact: false,
    provider: "fhrs-fhis",
    sourceType: "provider",
  });
  const originalFetch = global.fetch;
  let providerRequestCount = 0;
  global.fetch = async (url, options = {}) => {
    providerRequestCount += 1;
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
    await expectRejects("Research run requires an explicit source policy", () => createSignalDeskResearchAgentRunServer(access, {
      city: "Leeds",
      country: "UK",
      idempotencyKey: "research-agent-missing-policy",
      maxResults: 2,
      prompt: "Find cafes in Leeds with weak menu presence",
      provider: "fhrs-fhis",
      researchType: "market-map",
    }), "RESEARCH_SOURCE_POLICY_ID_REQUIRED");
    await expectRejects("Research run requires a bounded idempotency key", () => createSignalDeskResearchAgentRunServer(access, {
      city: "Leeds",
      country: "UK",
      idempotencyKey: "",
      maxResults: 2,
      prompt: "Find cafes in Leeds with weak menu presence",
      provider: "fhrs-fhis",
      researchType: "market-map",
      sourcePolicyId: policy.sourcePolicyId,
    }), "RESEARCH_IDEMPOTENCY_KEY_INVALID");
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
    assert(duplicate.run.status === "completed", "Research agent idempotency replay replaced durable completion status");
    assert(JSON.stringify(Object.keys(duplicate.run).sort()) === JSON.stringify(Object.keys(result.run).sort()), "Research replay run DTO keyset drifted");
    assert(JSON.stringify(Object.keys(duplicate.rows[0]).sort()) === JSON.stringify(Object.keys(result.rows[0]).sort()), "Research replay row DTO keyset drifted");
    assert(!("pId" in duplicate.run) && !("updatedBy" in duplicate.run) && !("pId" in duplicate.rows[0]), "Research replay leaked persistence fields");
    const researchClaimRef = db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS)
      .doc(`research_${hashValue("research-agent-e2e-fhrs")}`);
    const completedResearchClaim = (await researchClaimRef.get()).data();
    await researchClaimRef.set({ ...completedResearchClaim, entityId: "research_redirected" });
    await expectRejects("Research replay with redirected claim entity", () => createSignalDeskResearchAgentRunServer(access, {
      city: "Leeds",
      country: "UK",
      idempotencyKey: "research-agent-e2e-fhrs",
      maxResults: 2,
      prompt: "Find cafes in Leeds with weak menu presence",
      provider: "fhrs-fhis",
      researchType: "market-map",
      sourcePolicyId: policy.sourcePolicyId,
    }), "RESEARCH_IDEMPOTENCY_CONFLICT");
    await researchClaimRef.set(completedResearchClaim);
    const afterDuplicateRows = await expectCollectionCount(SIGNALDESK_COLLECTIONS.RESEARCH_TABLE_ROWS, (data) => data.researchRunId === result.run.researchRunId);
    assert(afterDuplicateRows === rowCount, "Duplicate research run created extra rows");
    const independentResearch = await createSignalDeskResearchAgentRunServer(access, {
      city: "Leeds",
      country: "UK",
      idempotencyKey: "research-agent-e2e-independent",
      maxResults: 2,
      prompt: "Find cafes in Leeds with weak menu presence",
      provider: "fhrs-fhis",
      researchType: "market-map",
      sourcePolicyId: policy.sourcePolicyId,
    });
    assert(independentResearch.run.researchRunId !== result.run.researchRunId, "Independent research keys collided on one run identity");
    assert(independentResearch.rows.every((row) => row.researchRunId === independentResearch.run.researchRunId), "Independent research rows reused another run namespace");
    await expectRejects("Research key cannot bind changed input", () => createSignalDeskResearchAgentRunServer(access, {
      city: "Leeds",
      country: "UK",
      idempotencyKey: "research-agent-e2e-fhrs",
      maxResults: 1,
      prompt: "Find bakeries in Leeds",
      provider: "fhrs-fhis",
      researchType: "market-map",
      sourcePolicyId: policy.sourcePolicyId,
    }), "RESEARCH_IDEMPOTENCY_CONFLICT");
    const requestsBeforeConcurrentClaim = providerRequestCount;
    const concurrentInput = {
      city: "Leeds",
      country: "UK",
      idempotencyKey: "research-agent-e2e-concurrent",
      maxResults: 2,
      prompt: "Find cafes in Leeds for a concurrent claim",
      provider: "fhrs-fhis",
      researchType: "market-map",
      sourcePolicyId: policy.sourcePolicyId,
    };
    const concurrentResults = await Promise.all([
      createSignalDeskResearchAgentRunServer(access, concurrentInput),
      createSignalDeskResearchAgentRunServer(access, concurrentInput),
    ]);
    assert(concurrentResults.filter((entry) => entry.duplicate === true).length === 1, "Concurrent research claim did not return exactly one duplicate");
    assert(providerRequestCount - requestsBeforeConcurrentClaim === 1, "Concurrent research claim launched duplicate provider work");

    const originalCompletionRunTransaction = db.runTransaction;
    const ambiguousResearchKey = "research-agent-final-ambiguous";
    const ambiguousResearchKeyHash = hashValue(ambiguousResearchKey);
    let injectedResearchAcknowledgementLoss = false;
    db.runTransaction = async function patchedResearchCompletionAcknowledgement(updateFunction, transactionOptions) {
      const result = await originalCompletionRunTransaction.call(this, updateFunction, transactionOptions);
      if (!injectedResearchAcknowledgementLoss) {
        const completedRun = await db.collection(SIGNALDESK_COLLECTIONS.RESEARCH_RUNS)
          .where("idempotencyKeyHash", "==", ambiguousResearchKeyHash)
          .where("status", "==", "completed")
          .limit(1)
          .get();
        if (!completedRun.empty) {
          injectedResearchAcknowledgementLoss = true;
          throw new Error("injected research completion acknowledgement loss");
        }
      }
      return result;
    };
    try {
      const ambiguousResearch = await createSignalDeskResearchAgentRunServer(access, {
        city: "Leeds",
        country: "UK",
        idempotencyKey: ambiguousResearchKey,
        maxResults: 2,
        prompt: "Find cafes in Leeds for acknowledgement recovery",
        provider: "fhrs-fhis",
        researchType: "market-map",
        sourcePolicyId: policy.sourcePolicyId,
      });
      assert(injectedResearchAcknowledgementLoss, "Research completion acknowledgement-loss fixture did not reach durable completion");
      assert(ambiguousResearch.run.status === "completed" && ambiguousResearch.rows.length === 2, "Research completion acknowledgement loss overwrote durable success");
      const ambiguousStoredRun = await db.collection(SIGNALDESK_COLLECTIONS.RESEARCH_RUNS).doc(ambiguousResearch.run.researchRunId).get();
      assert(ambiguousStoredRun.data()?.status === "completed", "Research completion acknowledgement loss marked the durable run blocked");
    } finally {
      db.runTransaction = originalCompletionRunTransaction;
    }
    await reviewSignalDeskMarketPodServer(access, {
      decision: "approved",
      idempotencyKey: `market-pod-review-fixture-${result.run.marketPodId}`,
      marketPodId: result.run.marketPodId,
      reason: "Approve before the next research completion.",
    });
    await createSignalDeskResearchAgentRunServer(access, {
      city: "Leeds",
      country: "UK",
      idempotencyKey: "research-agent-pod-review-preservation",
      marketPodId: result.run.marketPodId,
      maxResults: 2,
      prompt: "Refresh cafes in Leeds after the founder reviews the pod",
      provider: "fhrs-fhis",
      researchType: "market-map",
      sourcePolicyId: policy.sourcePolicyId,
    });
    const reviewedPod = await db.collection(SIGNALDESK_COLLECTIONS.MARKET_PODS).doc(result.run.marketPodId).get();
    assert(reviewedPod.data()?.status === "active", "Research completion overwrote founder pod approval status");
    assert(reviewedPod.data()?.reviewDecision === "approved" && reviewedPod.data()?.reviewedBy === access.userId, "Research completion overwrote founder pod review authority");
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
    provider: "google-places",
    sourceType: "provider",
  });
  await expirePolicy(providerPolicy.sourcePolicyId);
  await expectRejects("Provider run with expired policy", () => runSignalDeskSourceProviderServer(access, {
    city: "Mumbai",
    country: "India",
    idempotencyKey: "source-provider-expired-e2e",
    maxResults: 2,
    provider: "google-places",
    query: "restaurants in Mumbai",
    sourcePolicyId: providerPolicy.sourcePolicyId,
  }), "SOURCE_POLICY_EXPIRED");

  const evidencePolicy = await createPolicy("Expired evidence");
  const evidenceTargetId = await importOne(evidencePolicy.sourcePolicyId, "ExpiredEvidence");
  await expirePolicy(evidencePolicy.sourcePolicyId);
  await expectRejects("Score from expired policy", () => scoreSignalDeskTargetServer(access, evidenceTargetId), "SOURCE_POLICY_EXPIRED");
  await expectRejects("Evidence from expired policy", () => createSignalDeskEvidenceServer(access, evidenceTargetId), "SOURCE_POLICY_EXPIRED");

  const draftPolicy = await createPolicy("Expired draft");
  const draftTargetId = await importOne(draftPolicy.sourcePolicyId, "ExpiredDraft");
  await scoreSignalDeskTargetServer(access, draftTargetId);
  await createSignalDeskEvidenceServer(access, draftTargetId);
  await expirePolicy(draftPolicy.sourcePolicyId);
  await expectRejects("Draft from expired policy", () => createSignalDeskDraftServer(access, { targetId: draftTargetId }), "SOURCE_POLICY_EXPIRED");

  const approvalPolicy = await createPolicy("Expired approval");
  const approvalTargetId = await importOne(approvalPolicy.sourcePolicyId, "ExpiredApproval");
  await scoreSignalDeskTargetServer(access, approvalTargetId);
  await createSignalDeskEvidenceServer(access, approvalTargetId);
  const expiredApprovalDraft = await createSignalDeskDraftServer(access, { targetId: approvalTargetId });
  await expirePolicy(approvalPolicy.sourcePolicyId);
  await expectRejects("Approval from expired policy", () => reviewSignalDeskApprovalServer(access, {
    approvalId: expiredApprovalDraft.approval.approvalId,
    status: "approved",
  }), "SOURCE_POLICY_EXPIRED");

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
  const terminalApprovalSnap = await db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE)
    .doc(concurrentDraft.approval.approvalId)
    .get();
  const terminalApproval = terminalApprovalSnap.data();
  const terminalReplayInput = terminalApproval?.status === "approved"
    ? {
      approvalId: concurrentDraft.approval.approvalId,
      reason: "Concurrent approval fixture.",
      status: "approved",
    }
    : {
      approvalId: concurrentDraft.approval.approvalId,
      reason: "Concurrent rejection fixture.",
      rejectionReason: "wrong-segment",
      status: "rejected",
    };
  const terminalReplay = await reviewSignalDeskApprovalServer(access, terminalReplayInput);
  assert(terminalReplay.status === terminalApproval?.status, "Exact terminal approval retry did not replay durable truth");
  const queueAfterTerminalReplay = await db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.QUEUES)
    .get();
  assert(Number(queueAfterTerminalReplay.data()?.approvalBacklog || 0) === approvalBacklogBefore - 1, "Exact terminal approval retry decremented approval backlog twice");
  assert(Number(queueAfterTerminalReplay.data()?.humanReview || 0) === humanReviewBefore - 1, "Exact terminal approval retry decremented human review twice");
  const terminalReplayAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.entityId === concurrentDraft.approval.approvalId
    && (data.action === "draft_approved" || data.action === "draft_rejected")
  ));
  assert(terminalReplayAuditCount === 1, "Exact terminal approval retry duplicated the terminal audit event");
  await expectRejects("Conflicting terminal approval retry", () => reviewSignalDeskApprovalServer(access, {
    approvalId: concurrentDraft.approval.approvalId,
    reason: "Conflicting retry fixture.",
    status: terminalApproval?.status === "approved" ? "approved" : "rejected",
    ...(terminalApproval?.status === "rejected" ? { rejectionReason: "duplicate" } : {}),
  }), "Approval is not pending");

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

  const missingDraftPolicy = await createPolicy("Missing approval draft");
  const missingDraftTargetId = await importOne(missingDraftPolicy.sourcePolicyId, "MissingApprovalDraft");
  await scoreSignalDeskTargetServer(access, missingDraftTargetId);
  await createSignalDeskEvidenceServer(access, missingDraftTargetId);
  const missingDraft = await createSignalDeskDraftServer(access, { targetId: missingDraftTargetId });
  await db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(missingDraft.draft.draftId).delete();
  await expectRejects("Approval without durable draft", () => reviewSignalDeskApprovalServer(access, {
    approvalId: missingDraft.approval.approvalId,
    status: "approved",
  }), "Draft is required before approval");

  const suppressedApprovalPolicy = await createPolicy("Suppressed approval");
  const suppressedApprovalTargetId = await importOne(suppressedApprovalPolicy.sourcePolicyId, "SuppressedApproval");
  await scoreSignalDeskTargetServer(access, suppressedApprovalTargetId);
  await createSignalDeskEvidenceServer(access, suppressedApprovalTargetId);
  const suppressedApprovalDraft = await createSignalDeskDraftServer(access, { targetId: suppressedApprovalTargetId });
  await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(suppressedApprovalTargetId).set({
    suppressionStatus: "suppressed",
    updatedAt: timestampNow(),
  }, { merge: true });
  await expectRejects("Approval after target suppression", () => reviewSignalDeskApprovalServer(access, {
    approvalId: suppressedApprovalDraft.approval.approvalId,
    status: "approved",
  }), "Target is not approval-ready");

  const staleApprovalPolicy = await createPolicy("Stale approval");
  const staleApprovalTargetId = await importOne(staleApprovalPolicy.sourcePolicyId, "StaleApproval");
  await scoreSignalDeskTargetServer(access, staleApprovalTargetId);
  await createSignalDeskEvidenceServer(access, staleApprovalTargetId);
  const staleTemplateId = "template_stale_approval_e2e";
  await db.collection(SIGNALDESK_COLLECTIONS.TEMPLATE_SUMMARIES).doc(staleTemplateId).set({
    templateId: staleTemplateId,
    pId: SIGNALDESK_PRODUCT_CODE,
    name: "Stale approval fixture",
    channel: "email",
    status: "active",
    approvedVariables: ["businessName", "city", "opportunity", "proofCta"],
    subject: "A current list for {{businessName}}",
    body: "Hello {{businessName}}, {{opportunity}}. {{proofCta}}",
    updatedAt: timestampNow(),
  });
  const staleDraft = await createSignalDeskDraftServer(access, { targetId: staleApprovalTargetId, templateId: staleTemplateId });
  await db.collection(SIGNALDESK_COLLECTIONS.TEMPLATE_SUMMARIES).doc(staleTemplateId).set({
    body: "Hello {{businessName}}, {{opportunity}}. Updated: {{proofCta}}",
    updatedAt: timestampNow(),
  }, { merge: true });
  const currentDraft = await createSignalDeskDraftServer(access, { targetId: staleApprovalTargetId, templateId: staleTemplateId });
  assert(currentDraft.approval.approvalId !== staleDraft.approval.approvalId, "Changed draft truth did not create a new approval unit");
  await expectRejects("Superseded approval", () => reviewSignalDeskApprovalServer(access, {
    approvalId: staleDraft.approval.approvalId,
    status: "approved",
  }), "DRAFT_TEMPLATE_AUTHORITY_STALE");

  const suppressedPolicy = await createPolicy("Suppressed export");
  const suppressedReady = await prepareApprovedTarget(suppressedPolicy.sourcePolicyId, "SuppressedExport");
  await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(suppressedReady.targetId).set({
    suppressionStatus: "suppressed",
    updatedAt: timestampNow(),
  }, { merge: true });
  await expectRejects("Suppressed contact export", () => exportSignalDeskMessageServer(access, suppressedReady.approvalId), "Target is suppressed");

  const assistedPolicy = await createPolicy("Concurrent assisted handoff");
  const assistedReady = await prepareApprovedTarget(assistedPolicy.sourcePolicyId, "ConcurrentAssistedHandoff");
  await expectRejects("Cross-channel assisted handoff", () => prepareSignalDeskChannelHandoffServer(access, {
    approvalId: assistedReady.approvalId,
    channel: "whatsapp",
  }), "Assisted handoff requires an approval for the selected channel");
  const assistedHandoffs = await Promise.all([
    prepareSignalDeskChannelHandoffServer(access, { approvalId: assistedReady.approvalId, channel: "email" }),
    prepareSignalDeskChannelHandoffServer(access, { approvalId: assistedReady.approvalId, channel: "email" }),
  ]);
  assert(assistedHandoffs[0].exportId === assistedHandoffs[1].exportId, "Concurrent assisted handoff returned different export identities");
  assert(assistedHandoffs.some((result) => result.recipient === null), "Assisted handoff replay did not redact recipient data");
  const assistedExportCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS, (data) => (
    data.approvalId === assistedReady.approvalId && data.provider === "assisted-handoff"
  ));
  assert(assistedExportCount === 1, "Concurrent assisted handoff created duplicate exports");
  const assistedReplay = await prepareSignalDeskChannelHandoffServer(access, {
    approvalId: assistedReady.approvalId,
    channel: "email",
  });
  assert(assistedReplay.exportId === assistedHandoffs[0].exportId && assistedReplay.recipient === null && assistedReplay.replay === true, "Assisted handoff exact replay lost durable or redacted truth");

  const revealPolicy = await createPolicy("Explicit contact reveal authority");
  const revealReady = await prepareApprovedTarget(revealPolicy.sourcePolicyId, "ExplicitContactReveal");
  const revealAccess = { ...access, permissions: [...access.permissions, "contact.reveal"] };
  const revealedHandoff = await prepareSignalDeskChannelHandoffServer(revealAccess, {
    approvalId: revealReady.approvalId,
    channel: "email",
  });
  assert(typeof revealedHandoff.recipient === "string" && revealedHandoff.recipient.includes("@"), "Explicit contact-reveal authority did not return the prepared recipient");
  const revealAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "contact_recipient_reveal" && data.entityId === revealedHandoff.exportId
  ));
  assert(revealAuditCount === 1, "Explicit contact reveal did not create exactly one audit event");
  const redactedRevealReplay = await prepareSignalDeskChannelHandoffServer(revealAccess, {
    approvalId: revealReady.approvalId,
    channel: "email",
  });
  assert(redactedRevealReplay.replay === true && redactedRevealReplay.recipient === null, "Assisted handoff replay re-exposed raw contact identity");

  const providerSendPolicy = await createPolicy("Provider send disabled");
  const providerSendReady = await prepareApprovedTarget(providerSendPolicy.sourcePolicyId, "ProviderSendDisabled");
  await expectRejects("Provider send disabled", () => sendSignalDeskApprovedMessageServer(access, {
    approvalId: providerSendReady.approvalId,
    channel: "email",
  }), "SignalDesk provider send is disabled");

  const senderPolicy = await createPolicy("Sender not ready");
  const senderReady = await prepareApprovedTarget(senderPolicy.sourcePolicyId, "SenderNotReady");
  await upsertSignalDeskSenderDomainServer(access, {
    authenticationState: "partial",
    bounceRate: 0,
    brandRisk: "low",
    complaintRate: 0,
    domain: "menulist.test",
    idempotencyKey: "e2e-sender-domain-export-hold-v1",
    provider: "owned-email",
    status: "active",
    unsubscribeReady: false,
    volumeRampState: "paused",
  });
  await expectRejects("Missing sender readiness for export", () => exportSignalDeskMessageServer(access, senderReady.approvalId), "Sender domain is not ready");
  await upsertSignalDeskSenderDomainServer(access, {
    authenticationState: "ready",
    bounceRate: 0,
    brandRisk: "low",
    complaintRate: 0,
    domain: "menulist.test",
    idempotencyKey: "e2e-sender-domain-export-restore-v1",
    provider: "owned-email",
    status: "active",
    unsubscribeReady: true,
    volumeRampState: "low_volume",
  });

  const canonicalSenderId = senderDomainIdFor("menulist.test");
  const boundDraftSnap = await db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(senderReady.draftId).get();
  const boundApprovalSnap = await db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(senderReady.approvalId).get();
  const boundDraft = boundDraftSnap.data();
  const boundPacketSnap = await db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS)
    .doc(boundApprovalSnap.data()?.approvalPacketId)
    .get();
  assert(boundDraft?.senderDomainId === canonicalSenderId && Boolean(boundDraft?.senderDomainFingerprintHash), "Draft did not bind exact sender authority");
  assert(boundPacketSnap.data()?.senderDomainId === canonicalSenderId, "Approval packet lost draft sender identity");
  assert(boundPacketSnap.data()?.senderDomainFingerprintHash === boundDraft?.senderDomainFingerprintHash, "Approval packet lost draft sender fingerprint");

  const alternateSender = await upsertSignalDeskSenderDomainServer(access, {
    authenticationState: "ready",
    bounceRate: 0,
    brandRisk: "low",
    complaintRate: 0,
    domain: "alternate-sender.test",
    idempotencyKey: "e2e-sender-domain-alternate-ready-v1",
    provider: "owned-email",
    status: "active",
    unsubscribeReady: true,
    volumeRampState: "ready",
  });
  await expectRejects("Sequencer explicit alternate sender substitution", () => createSignalDeskSequencerHandoffServer(access, {
    approvalId: senderReady.approvalId,
    provider: "owned-email",
    senderDomainId: alternateSender.senderDomainId,
  }), "SEQUENCER_SENDER_AUTHORITY_MISMATCH");

  await upsertSignalDeskSenderDomainServer(access, {
    authenticationState: "ready",
    bounceRate: 0,
    brandRisk: "low",
    complaintRate: 0,
    domain: "menulist.test",
    idempotencyKey: "e2e-sender-domain-ramp-not-started-v1",
    provider: "owned-email",
    status: "active",
    unsubscribeReady: true,
    volumeRampState: "not_started",
  });
  await expectRejects("Export cannot substitute alternate sender while bound ramp is not started", () => (
    exportSignalDeskMessageServer(access, senderReady.approvalId)
  ), "Sender domain is not ready");
  await upsertSignalDeskSenderDomainServer(access, {
    authenticationState: "ready",
    bounceRate: 0,
    brandRisk: "low",
    complaintRate: 0,
    domain: "menulist.test",
    idempotencyKey: "e2e-sender-domain-lineage-restore-v1",
    provider: "owned-email",
    status: "active",
    unsubscribeReady: true,
    volumeRampState: "low_volume",
  });
  const boundExport = await exportSignalDeskMessageServer(access, senderReady.approvalId);
  assert(boundExport.senderDomainId === canonicalSenderId, "Email export substituted an alternate active sender");
  assert(boundExport.senderDomainFingerprintHash === boundDraft?.senderDomainFingerprintHash, "Email export lost approved sender fingerprint");
  const storedBoundExport = (await db.collection(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS).doc(boundExport.exportId).get()).data();
  assert(storedBoundExport?.senderDomainId === canonicalSenderId && storedBoundExport?.senderDomainFingerprintHash === boundDraft?.senderDomainFingerprintHash, "Persisted email export lost exact sender lineage");

  await upsertSignalDeskSenderDomainServer(access, {
    authenticationState: "ready",
    bounceRate: 0,
    brandRisk: "low",
    complaintRate: 0.005,
    domain: "menulist.test",
    idempotencyKey: "e2e-sender-domain-export-authority-changed-v1",
    provider: "owned-email",
    status: "active",
    unsubscribeReady: true,
    volumeRampState: "low_volume",
  });
  const revokedSenderExportReplay = await exportSignalDeskMessageServer(access, senderReady.approvalId);
  assert(revokedSenderExportReplay.replay === true && revokedSenderExportReplay.currentAuthority === false, "Historical export replay did not expose revoked current sender authority");
  assert(!("body" in revokedSenderExportReplay) && !("recipient" in revokedSenderExportReplay) && !("subject" in revokedSenderExportReplay), "Historical export replay exposed reusable content after sender revocation");
  await upsertSignalDeskSenderDomainServer(access, {
    authenticationState: "ready",
    bounceRate: 0,
    brandRisk: "low",
    complaintRate: 0,
    domain: "menulist.test",
    idempotencyKey: "e2e-sender-domain-export-authority-replay-restore-v1",
    provider: "owned-email",
    status: "active",
    unsubscribeReady: true,
    volumeRampState: "low_volume",
  });
  const boundExportReplay = await exportSignalDeskMessageServer(access, senderReady.approvalId);
  assert(boundExportReplay.exportId === boundExport.exportId && boundExportReplay.replay === true && boundExportReplay.currentAuthority === true, "Validated export replay lost durable historical truth");
  assert(!("body" in boundExportReplay) && !("recipient" in boundExportReplay) && !("subject" in boundExportReplay), "Validated export replay re-exposed reusable content");

  const assistedStoredExport = (await db.collection(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS).doc(assistedReplay.exportId).get()).data();
  const assistedDraft = (await db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(assistedReady.draftId).get()).data();
  assert(assistedStoredExport?.senderDomainId === canonicalSenderId, "Assisted handoff lost approved sender identity");
  assert(assistedStoredExport?.senderDomainFingerprintHash === assistedDraft?.senderDomainFingerprintHash, "Assisted handoff lost approved sender fingerprint");
  await upsertSignalDeskSenderDomainServer(access, {
    authenticationState: "ready",
    bounceRate: 0.005,
    brandRisk: "low",
    complaintRate: 0,
    domain: "menulist.test",
    idempotencyKey: "e2e-sender-domain-handoff-authority-changed-v1",
    provider: "owned-email",
    status: "active",
    unsubscribeReady: true,
    volumeRampState: "low_volume",
  });
  const revokedSenderAssistedReplay = await prepareSignalDeskChannelHandoffServer(access, { approvalId: assistedReady.approvalId, channel: "email" });
  assert(revokedSenderAssistedReplay.replay === true && revokedSenderAssistedReplay.currentAuthority === false, "Assisted handoff replay did not expose revoked current sender authority");
  assert(revokedSenderAssistedReplay.recipient === null, "Assisted handoff replay re-exposed raw contact identity after sender revocation");
  await upsertSignalDeskSenderDomainServer(access, {
    authenticationState: "ready",
    bounceRate: 0,
    brandRisk: "low",
    complaintRate: 0,
    domain: "menulist.test",
    idempotencyKey: "e2e-sender-domain-handoff-authority-replay-restore-v1",
    provider: "owned-email",
    status: "active",
    unsubscribeReady: true,
    volumeRampState: "low_volume",
  });
  const assistedValidatedReplay = await prepareSignalDeskChannelHandoffServer(access, {
    approvalId: assistedReady.approvalId,
    channel: "email",
  });
  assert(assistedValidatedReplay.replay === true && assistedValidatedReplay.currentAuthority === true && assistedValidatedReplay.recipient === null, "Assisted handoff replay did not return a current redacted historical acknowledgement");
  await db.collection(SIGNALDESK_COLLECTIONS.SENDER_DOMAINS).doc(alternateSender.senderDomainId).delete();
}

async function assertManualContactGuards() {
  const noExportPolicy = await createPolicy("Manual contact requires prepared email");
  const noExportReady = await prepareApprovedTarget(noExportPolicy.sourcePolicyId, "ManualContactNoExport");
  const noExportTargetRef = db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(noExportReady.targetId);
  const noExportTargetSnapshot = await noExportTargetRef.get();
  await noExportTargetRef.set({ pId: "ML", updatedAt: timestampNow() }, { merge: true });
  try {
    await expectRejects("Manual contact rejects foreign target truth", () => recordSignalDeskManualContactServer(access, {
      idempotencyKey: "manual-contact-foreign-target",
      occurredAt: new Date().toISOString(),
      result: "contacted",
      route: "email-export",
      sourcePolicyId: noExportPolicy.sourcePolicyId,
      targetId: noExportReady.targetId,
    }), "TARGET_PRODUCT_MISMATCH");
  } finally {
    await noExportTargetRef.set(noExportTargetSnapshot.data());
  }
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
    allowContact: false,
  });
  const limitedTargetId = await importOne(limitedPolicy.sourcePolicyId, "ManualContactLimited", { email: "" });
  await expectRejects("Limited contactability cannot masquerade as a manual form", () => recordSignalDeskManualContactServer(access, {
    idempotencyKey: "manual-contact-unverified-limited-route",
    occurredAt: new Date().toISOString(),
    result: "contacted",
    route: "manual-form",
    sourcePolicyId: limitedPolicy.sourcePolicyId,
    targetId: limitedTargetId,
  }), "SOURCE_POLICY_USE_NOT_ALLOWED");

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
  const unrelatedFreshExportBatch = db.batch();
  Array.from({ length: 21 }, (_, index) => {
    const reference = db.collection(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS)
      .doc(`unrelated_fresh_export_${index}_${hashValue(staleExportReady.targetId).slice(0, 10)}`);
    unrelatedFreshExportBatch.set(reference, {
      approvalId: `unrelated_approval_${index}`,
      channel: "email",
      createdAt: timestampNow(),
      draftId: `unrelated_draft_${index}`,
      exportId: reference.id,
      pId: SIGNALDESK_PRODUCT_CODE,
      status: "exported",
      targetId: staleExportReady.targetId,
    });
  });
  await unrelatedFreshExportBatch.commit();
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
  const partnerIntroTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(partnerIntroTargetId).get();
  const partnerIntroCandidateId = `candidate_${hashValue(`${partnerIntroTargetSnap.data()?.sourceRunId}|${partnerIntroTargetId}`).slice(0, 32)}`;
  const partnerIntroCandidateRef = db.collection(SIGNALDESK_COLLECTIONS.SOURCE_CANDIDATES).doc(partnerIntroCandidateId);
  await partnerIntroCandidateRef.set({ blocked: true }, { merge: true });
  await expectRejects("Blocked partner evidence cannot authorize an introduction", () => recordSignalDeskManualContactServer(access, {
    idempotencyKey: "manual-contact-blocked-partner-introduction",
    occurredAt: new Date().toISOString(),
    result: "introduced",
    route: "partner-intro",
    sourcePolicyId: partnerIntroPolicy.sourcePolicyId,
    targetId: partnerIntroTargetId,
  }), "Partner introduction permission evidence is required");
  await partnerIntroCandidateRef.set({ blocked: false }, { merge: true });
  const partnerIntroInput = {
    idempotencyKey: "manual-contact-partner-introduction",
    occurredAt: new Date().toISOString(),
    result: "introduced",
    route: "partner-intro",
    sourcePolicyId: partnerIntroPolicy.sourcePolicyId,
    targetId: partnerIntroTargetId,
  };
  const [partnerIntro, partnerIntroReplay] = await Promise.all([
    recordSignalDeskManualContactServer(access, partnerIntroInput),
    recordSignalDeskManualContactServer(access, partnerIntroInput),
  ]);
  assert(
    [partnerIntro.duplicate, partnerIntroReplay.duplicate].filter(Boolean).length === 1,
    "Concurrent permissioned partner introduction did not settle exactly once",
  );
}

async function assertUnverifiedLimitedRouteRevalidation() {
  const policy = await createPolicy("Legacy limited route revalidation", {
    accessMethod: "manual-public-research",
    allowContact: false,
  });
  const targetId = await importOne(policy.sourcePolicyId, "LegacyLimitedRoute", { email: "" });
  const researchRowId = `legacy_limited_route_${targetId}`;
  await db.collection(SIGNALDESK_COLLECTIONS.RESEARCH_TABLE_ROWS).doc(researchRowId).set({
    actionabilityState: "actionable",
    allowedRoute: "partner-intro",
    allowedRouteReason: "Legacy inferred partner route fixture.",
    category: "restaurant",
    contactability: "limited",
    currentListGap: "missing-current-list",
    displayName: "Legacy limited route fixture",
    evidenceSummary: "Evidence fixture",
    enrichment: [],
    fitDecision: "pass",
    fitScore: 80,
    hardGateFailures: [],
    pId: "SD",
    provider: "fhrs-fhis",
    recommendedChannel: "partner-intro",
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
  const [policySnap, targetSnap] = await Promise.all([
    db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(policy.sourcePolicyId).get(),
    db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).get(),
  ]);
  assert(policySnap.exists && targetSnap.exists, "Limited-route overflow fixture dependencies are missing");
  const overflowBatch = db.batch();
  for (let index = 0; index <= 30; index += 1) {
    const suffix = String(index).padStart(2, "0");
    const fillerPolicyId = `source_policy_route_overflow_${suffix}`;
    const fillerTargetId = `target_route_overflow_${suffix}`;
    const updatedAt = timestampNow();
    overflowBatch.set(db.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(fillerPolicyId), {
      ...policySnap.data(),
      name: `Route overflow policy ${suffix}`,
      sourcePolicyId: fillerPolicyId,
      updatedAt,
    });
    overflowBatch.set(db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(fillerTargetId), {
      ...targetSnap.data(),
      displayName: `Route overflow target ${suffix}`,
      sourcePolicyId: fillerPolicyId,
      targetId: fillerTargetId,
      updatedAt,
    });
  }
  await overflowBatch.commit();
  const workspace = await loadSignalDeskWorkspaceServer(access, "mission");
  const row = workspace.workspace.researchTableRows.find((item) => item.researchRowId === researchRowId);
  const opportunity = workspace.workspace.activationOpportunities.find((item) => item.targetId === targetId);
  assert(!workspace.workspace.policies.some((item) => item.sourcePolicyId === policy.sourcePolicyId), "Limited-route policy was not pushed beyond the returned list bound");
  assert(!workspace.workspace.targets.some((item) => item.targetId === targetId), "Limited-route target was not pushed beyond the returned list bound");
  assert(row?.allowedRoute === "none", "Legacy limited contactability retained an inferred manual-form route");
  assert(row?.actionabilityState === "research_only", "Unverified limited contact route remained actionable");
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
    pId: "SD",
    provider: "fhrs-fhis",
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
    pId: SIGNALDESK_PRODUCT_CODE,
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
    pId: SIGNALDESK_PRODUCT_CODE,
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
    pId: SIGNALDESK_PRODUCT_CODE,
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
    activatedAccountCount: 0,
    founderAttentionMinutes: 10,
    lostOpportunityCount: 0,
    openOpportunityCount: 0,
    pId: SIGNALDESK_PRODUCT_CODE,
    pipelineCurrency: null,
    pipelineValueMinor: 0,
    revenueAccountCount: 0,
    revenueControlSummaryId: SIGNALDESK_SUMMARY_DOCS.REVENUE,
    stalledActivationCount: 0,
    updatedAt: timestamp,
    weightedPipelineValueMinor: 0,
    wonOpportunityCount: 0,
  });

  const wrongProductRunId = `${aiRunId}_wrong_product`;
  const validRunData = (await db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(aiRunId).get()).data();
  assert(validRunData, "AI shadow fixture did not create its provider run");
  await db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(wrongProductRunId).set({
    ...validRunData,
    aiRunId: wrongProductRunId,
    pId: "ML",
  });
  const evalBeforeWrongProductRun = (await db.collection(SIGNALDESK_COLLECTIONS.MODEL_EVALS).doc(modelEvalId).get()).data();
  await expectRejects("Wrong-product AI shadow run review", () => reviewSignalDeskAiShadowRunServer(access, {
    aiRunId: wrongProductRunId,
    decision: "accepted",
    founderAttentionMinutes: 1,
  }), "AI_WORKER_RUN_SHAPE_INVALID");
  assert(JSON.stringify((await db.collection(SIGNALDESK_COLLECTIONS.MODEL_EVALS).doc(modelEvalId).get()).data()) === JSON.stringify(evalBeforeWrongProductRun), "Wrong-product AI run changed model-evaluation truth");

  const evalRef = db.collection(SIGNALDESK_COLLECTIONS.MODEL_EVALS).doc(modelEvalId);
  const validEvalData = (await evalRef.get()).data();
  assert(validEvalData, "AI shadow fixture did not create model-evaluation authority");
  await evalRef.set({ pId: "ML" }, { merge: true });
  await expectRejects("Wrong-product AI model-evaluation review", () => reviewSignalDeskAiShadowRunServer(access, {
    aiRunId,
    decision: "accepted",
    founderAttentionMinutes: 1,
  }), "MODEL_EVAL_SHAPE_INVALID");
  assert((await db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(aiRunId).get()).data()?.reviewDecision === undefined, "Wrong-product model evaluation caused a partial run review");
  await evalRef.set(validEvalData);

  const revenueRef = db.collection(SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.REVENUE);
  const validRevenueData = (await revenueRef.get()).data();
  assert(validRevenueData, "AI shadow fixture did not create revenue-summary authority");
  await revenueRef.set({ pId: "ML" }, { merge: true });
  await expectRejects("Wrong-product AI review revenue summary", () => reviewSignalDeskAiShadowRunServer(access, {
    aiRunId,
    decision: "accepted",
    founderAttentionMinutes: 1,
  }), "REVENUE_CONTROL_SUMMARY_SHAPE_INVALID");
  assert((await db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(aiRunId).get()).data()?.reviewDecision === undefined, "Wrong-product revenue summary caused a partial run review");
  await revenueRef.set(validRevenueData);

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
    decision: "edited",
    founderAttentionMinutes: 3,
    reason: "Removed an unsupported claim before reuse.",
  });
  const exactReplayAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
    data.action === "ai_shadow_review" && data.entityId === aiRunId
  ));
  assert(exactReplayAuditCount === 1, "Exact AI shadow-review replay emitted a duplicate audit event");
  revenueSnap = await db.collection(SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.REVENUE).get();
  assert(revenueSnap.data()?.founderAttentionMinutes === 13, "Exact AI shadow-review replay changed founder attention");

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

  const workspaceNoiseBatch = db.batch();
  for (let index = 0; index < 31; index += 1) {
    const volumeRunId = `ai_volume_workspace_noise_${String(index).padStart(2, "0")}`;
    const noiseTimestamp = admin.firestore.Timestamp.fromMillis(timestamp.toMillis() + index + 1);
    workspaceNoiseBatch.set(db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(volumeRunId), {
      aiDetailLifecycleState: "active",
      aiRunId: volumeRunId,
      childRunIds: [],
      completedAt: noiseTimestamp,
      completedPairCount: 0,
      createdAt: noiseTimestamp,
      createdBy: access.userId,
      estimatedCostUsd: 0,
      failedPairCount: 1,
      failureCodes: ["workspace-noise-fixture"],
      lockExpiresAt: null,
      maxEstimatedCostUsd: 1,
      modelCallCount: 0,
      pId: SIGNALDESK_PRODUCT_CODE,
      requestedPairCount: 1,
      status: "blocked",
      targetIds: ["target_workspace_noise"],
      tasks: ["score"],
      updatedAt: noiseTimestamp,
      volumeRunId,
      workerType: "ai_volume_batch",
      workerVersion: "ai-volume-v1",
    });
  }
  await workspaceNoiseBatch.commit();

  const aiWorkspace = await loadSignalDeskWorkspaceServer(access, "ai");
  assert(aiWorkspace.workspace.aiWorkerRuns.some((run) => run.aiRunId === aiRunId), "AI workspace did not expose provider-backed runs for review");
  assert(!aiWorkspace.workspace.scores.some((score) => score.scoreId === aiRunId), "AI provider run leaked into rules scores");
  assert(aiWorkspace.workspace.scores.some((score) => score.scoreId === rulesRunId), "AI workspace lost rules-only scores");
  const loadedEval = aiWorkspace.workspace.modelEvals.find((evaluation) => evaluation.modelEvalId === modelEvalId);
  assert(loadedEval?.passRate === 0.5 && loadedEval?.rejectedFactRate === 0.5, "AI workspace did not derive cumulative provider quality rates");
  const workspaceNoiseCleanup = db.batch();
  for (let index = 0; index < 31; index += 1) {
    const volumeRunId = `ai_volume_workspace_noise_${String(index).padStart(2, "0")}`;
    workspaceNoiseCleanup.delete(db.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS).doc(volumeRunId));
  }
  await workspaceNoiseCleanup.commit();
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
  await db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_gemini_ai").set({ dailyBudgetUsd: 0.1, perRunBudgetUsd: 0.1 }, { merge: true });
  await db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc("budget_provider_gemini_default").set({ dailyBudgetUsd: 0.1, perRunBudgetUsd: 0.1 }, { merge: true });
  await expectRejects("AI volume aggregate provider budget", () => runSignalDeskAiVolumeBatchServer(access, {
    idempotencyKey: "ai-volume-provider-budget-e2e",
    maxEstimatedCostUsd: 1,
    targetIds: [targetId],
    tasks: ["score"],
  }), "SIGNALDESK_PROVIDER_DAILY_BUDGET_EXCEEDED");
  await db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_gemini_ai").set({ dailyBudgetUsd: 5, perRunBudgetUsd: 0.15 }, { merge: true });
  await db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc("budget_provider_gemini_default").set({ dailyBudgetUsd: 5, perRunBudgetUsd: 0.15 }, { merge: true });
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
    if (String(input.instruction || "").includes("provider unresolved fixture")) {
      throw new Error("model provider secret failure fixture");
    }
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
    const scoreEvalRef = db.collection(SIGNALDESK_COLLECTIONS.MODEL_EVALS).doc("model_eval_score_gemini");
    await scoreEvalRef.set({
      editRate: 0,
      model: "gemini-3.5-flash-lite",
      modelEvalId: scoreEvalRef.id,
      modelRouteId: "model_route_score",
      pId: "ML",
      passRate: 1,
      provider: "gemini",
      rejectedFactRate: 0,
      sampleSize: 1,
      status: "passed",
      task: "score",
      updatedAt: timestampNow(),
    });
    const collisionClaimRef = db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS)
      .doc(`ai_assist_${hashValue(`${access.userId}|ai-assist-model-eval-collision`)}`);
    await expectRejects("Wrong-product model-evaluation AI admission", () => runSignalDeskAiAssistServer(access, {
      idempotencyKey: "ai-assist-model-eval-collision",
      instruction: "This request must stop before provider work.",
      targetId,
      task: "score",
    }), "MODEL_EVAL_SHAPE_INVALID");
    assert(assistCallCount === 0 && criticCallCount === 0, "Wrong-product model evaluation reached the AI provider");
    assert(!(await collisionClaimRef.get()).exists, "Wrong-product model evaluation reserved a durable AI claim");
    await scoreEvalRef.delete();

    await db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_gemini_ai").set({ dailyBudgetUsd: 0.05, perRunBudgetUsd: 0.05, spentMonthUsd: 0, spentTodayUsd: 0 }, { merge: true });
    await db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc("budget_provider_gemini_default").set({ dailyBudgetUsd: 0.05, perRunBudgetUsd: 0.05, spentMonthUsd: 0, spentTodayUsd: 0 }, { merge: true });
    const directBudgetRace = await Promise.allSettled([
      runSignalDeskAiAssistServer(access, { idempotencyKey: "ai-assist-budget-race-one", instruction: "First budget slot.", targetId, task: "score" }),
      runSignalDeskAiAssistServer(access, { idempotencyKey: "ai-assist-budget-race-two", instruction: "Second budget slot.", targetId, task: "score" }),
    ]);
    assert(directBudgetRace.filter((result) => result.status === "fulfilled").length === 1, "Atomic AI provider budget admitted more than one request");
    assert(directBudgetRace.filter((result) => result.status === "rejected").length === 1, "Atomic AI provider budget did not reject the over-cap request");
    assert(assistCallCount === 1 && criticCallCount === 0, "AI provider budget race executed more than one model call");
    await db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_gemini_ai").set({ dailyBudgetUsd: 5, perRunBudgetUsd: 0.15, spentMonthUsd: 0, spentTodayUsd: 0 }, { merge: true });
    await db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc("budget_provider_gemini_default").set({ dailyBudgetUsd: 5, perRunBudgetUsd: 0.15, spentMonthUsd: 0, spentTodayUsd: 0 }, { merge: true });
    assistCallCount = 0;
    criticCallCount = 0;

    const optionalGeminiBudgetRef = db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc("budget_provider_gemini_default");
    await optionalGeminiBudgetRef.delete();
    await runSignalDeskAiAssistServer(access, {
      idempotencyKey: "ai-assist-missing-optional-budget",
      instruction: "Verify optional provider budget persistence.",
      targetId,
      task: "score",
    });
    assert(!(await optionalGeminiBudgetRef.get()).exists, "AI finalization created a partial optional provider-budget document");
    const accountAfterMissingBudget = await db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_gemini_ai").get();
    assert(accountAfterMissingBudget.data()?.spentTodayUsd === 0.05, "AI finalization lost provider-account spend without an optional budget policy");
    await upsertSignalDeskBudgetPolicyServer(access, {
      dailyBudgetUsd: 5,
      idempotencyKey: "ai-assist-gemini-provider-budget",
      monthlyBudgetUsd: 100,
      name: "Gemini provider budget",
      perRunBudgetUsd: 5,
      provider: "gemini",
      scope: "provider",
      status: "active",
    });
    await db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_gemini_ai").set({ spentMonthUsd: 0, spentTodayUsd: 0 }, { merge: true });
    assistCallCount = 0;
    criticCallCount = 0;

    await expectRejects("Direct AI assist unresolved provider outcome", () => runSignalDeskAiAssistServer(access, {
      idempotencyKey: "ai-assist-provider-unresolved",
      instruction: "provider unresolved fixture",
      targetId,
      task: "score",
    }), "model provider secret failure fixture");
    const unresolvedAiClaimId = `ai_assist_${hashValue(`${access.userId}|ai-assist-provider-unresolved`)}`;
    const unresolvedAiClaim = await db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS).doc(unresolvedAiClaimId).get();
    assert(unresolvedAiClaim.data()?.status === "unresolved", "AI provider failure left a permanent in-progress claim");
    assert(unresolvedAiClaim.data()?.failureCode === "ai_assist_outcome_unresolved", "AI provider failure lost its stable non-sensitive code");
    assert(unresolvedAiClaim.data()?.reservedCostUsd === 0.05, "AI provider failure lost its owned generation reservation");
    assert(/^\d{4}-\d{2}-\d{2}$/.test(String(unresolvedAiClaim.data()?.accountingDay || "")), "AI provider failure lost its reservation day");
    assert(Boolean(unresolvedAiClaim.data()?.reservedAt?.toMillis?.()), "AI provider failure lost its immutable reservation timestamp");
    await expectRejects("Direct AI assist unresolved exact retry", () => runSignalDeskAiAssistServer(access, {
      idempotencyKey: "ai-assist-provider-unresolved",
      instruction: "provider unresolved fixture",
      targetId,
      task: "score",
    }), "AI assist outcome requires review");
    assert(assistCallCount === 1, "AI unresolved retry repeated ambiguous model work");
    const unresolvedAiAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
      data.action === "ai_assist_outcome_unresolved"
      && data.entityId === `ai_assist_${hashValue(`${access.userId}|ai-assist-provider-unresolved`).slice(0, 32)}`
      && data.reason === "event:ai_assist_outcome_unresolved"
    ));
    assert(unresolvedAiAuditCount === 1, "AI unresolved outcome did not emit one stable audit event");
    assistCallCount = 0;
    criticCallCount = 0;

    const originalRunTransaction = db.runTransaction;
    let aiTransactionCount = 0;
    db.runTransaction = async function patchedRunTransaction(updateFunction, transactionOptions) {
      aiTransactionCount += 1;
      const result = await originalRunTransaction.call(this, updateFunction, transactionOptions);
      if (aiTransactionCount === 2) throw new Error("injected AI final acknowledgement loss");
      return result;
    };
    try {
      const ambiguousAi = await runSignalDeskAiAssistServer(access, {
        idempotencyKey: "ai-assist-final-ambiguous",
        instruction: "Verify final transaction acknowledgement recovery.",
        targetId,
        task: "score",
      });
      assert(Boolean(ambiguousAi.aiRunId) && aiTransactionCount === 2, "AI final acknowledgement recovery did not return durable output");
      assert(assistCallCount === 1, "AI final acknowledgement recovery repeated model work");
    } finally {
      db.runTransaction = originalRunTransaction;
    }
    assistCallCount = 0;
    criticCallCount = 0;

    const directAssistInput = {
      idempotencyKey: "ai-assist-direct-concurrent-e2e",
      instruction: "Prepare one internal evidence review.",
      targetId,
      task: "evidence",
    };
    const directConcurrent = await Promise.allSettled([
      runSignalDeskAiAssistServer(access, directAssistInput),
      runSignalDeskAiAssistServer(access, directAssistInput),
    ]);
    const directConcurrentStates = directConcurrent.map((result) => (
      result.status === "fulfilled"
        ? "fulfilled"
        : result.reason instanceof Error
          ? [result.reason.message, ...(result.reason.stack || "").split("\n").slice(1, 4).map((line) => line.trim())].join(" <- ")
          : "rejected"
    )).join(" | ");
    assert(directConcurrent.every((result) => result.status === "fulfilled"), `Concurrent direct AI assist did not converge on durable completion: ${directConcurrentStates}`);
    const directConcurrentRunIds = directConcurrent.map((result) => result.status === "fulfilled" ? result.value.aiRunId : null);
    assert(new Set(directConcurrentRunIds).size === 1, "Concurrent direct AI assist did not converge on one durable run");
    assert(assistCallCount === 1 && criticCallCount === 0, "Concurrent direct AI assist repeated paid model calls");
    const directReplay = await runSignalDeskAiAssistServer(access, directAssistInput);
    assert(Boolean(directReplay.aiRunId), "Completed direct AI assist did not replay its durable run");
    assert(assistCallCount === 1 && criticCallCount === 0, "Completed direct AI assist replay repeated paid model calls");
    const directAssistClaimRef = db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS)
      .doc(`ai_assist_${hashValue(`${access.userId}|${directAssistInput.idempotencyKey}`)}`);
    const completedDirectAssistClaim = (await directAssistClaimRef.get()).data();
    await directAssistClaimRef.set({ ...completedDirectAssistClaim, operation: "ai_assist_score" });
    await expectRejects("Direct AI assist replay with changed claim operation", () => runSignalDeskAiAssistServer(access, directAssistInput), "AI assist idempotency conflict");
    assert(assistCallCount === 1 && criticCallCount === 0, "Changed AI assist claim operation repeated paid model calls");
    await directAssistClaimRef.set(completedDirectAssistClaim);
    await expectRejects("Direct AI assist changed-input idempotency conflict", () => runSignalDeskAiAssistServer(access, {
      ...directAssistInput,
      instruction: "Prepare different internal evidence.",
    }), "AI assist idempotency conflict");
    assert(assistCallCount === 1 && criticCallCount === 0, "Direct AI assist changed-input conflict repeated paid model calls");
    assistCallCount = 0;
    criticCallCount = 0;

    const messageExportCountBefore = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS, () => true);
    const aiAccountBeforeVolume = (await db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_gemini_ai").get()).data();
    const aiBudgetBeforeVolume = (await db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc("budget_provider_gemini_default").get()).data();
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
    const aiAccountAfterVolume = (await db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_gemini_ai").get()).data();
    const aiBudgetAfterVolume = (await db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc("budget_provider_gemini_default").get()).data();
    const expectedAccountSpendAfterVolume = Math.round((Number(aiAccountBeforeVolume?.spentTodayUsd || 0) + result.estimatedCostUsd) * 1_000_000) / 1_000_000;
    const expectedBudgetSpendAfterVolume = Math.round((Number(aiBudgetBeforeVolume?.spentTodayUsd || 0) + result.estimatedCostUsd) * 1_000_000) / 1_000_000;
    assert(aiAccountAfterVolume?.spentTodayUsd === expectedAccountSpendAfterVolume, "AI volume account reservation did not settle to exact child cost");
    assert(aiBudgetAfterVolume?.spentTodayUsd === expectedBudgetSpendAfterVolume, "AI volume budget reservation did not settle to exact child cost");
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
    const childClaimSnaps = await Promise.all(result.childRunIds.map((childRunId) => db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS)
      .where("entityId", "==", childRunId)
      .limit(1)
      .get()));
    const childClaims = childClaimSnaps.map((snap) => snap.docs[0]?.data());
    assert(childClaims.every((claim) => claim?.status === "completed" && claim?.reservedBudgetPolicy === true), "AI volume child did not retain completed budget reservation authority");
    assert(childClaims.every((claim, index) => claim?.reservedCostUsd >= Number(children[index]?.costEstimate || 0)), "AI volume child actual cost exceeded its owned reservation");
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

    await expectRejects("AI volume changed-input idempotency conflict", () => runSignalDeskAiVolumeBatchServer(access, {
      idempotencyKey: "ai-volume-happy-e2e",
      instruction: "Prepare a different internal review output.",
      maxEstimatedCostUsd: 1,
      targetIds: [targetId],
      tasks: ["score"],
    }), "AI volume idempotency conflict");
    assert(assistCallCount + criticCallCount === callsBeforeRetry, "AI volume changed-input conflict repeated paid model calls");

    const concurrentCallsBefore = assistCallCount + criticCallCount;
    const concurrentResults = await Promise.all([
      runSignalDeskAiVolumeBatchServer(access, {
        idempotencyKey: "ai-volume-exact-concurrent-e2e",
        instruction: "Prepare one concurrent internal review output.",
        maxEstimatedCostUsd: 1,
        targetIds: [targetId],
        tasks: ["score"],
      }),
      runSignalDeskAiVolumeBatchServer(access, {
        idempotencyKey: "ai-volume-exact-concurrent-e2e",
        instruction: "Prepare one concurrent internal review output.",
        maxEstimatedCostUsd: 1,
        targetIds: [targetId],
        tasks: ["score"],
      }),
    ]);
    assert(concurrentResults[0].volumeRunId === concurrentResults[1].volumeRunId, "Concurrent AI volume retries did not converge on one parent");
    assert(assistCallCount + criticCallCount - concurrentCallsBefore === 2, "Concurrent AI volume retries repeated paid model calls");

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
    await scoreRouteRef.set({ escalationModel: "gemini-3.6-flash", escalationProvider: "gemini", updatedAt: timestampNow() }, { merge: true });

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
  const headers = new Headers({ "x-signaldesk-webhook-secret": process.env.SIGNALDESK_EMAIL_WEBHOOK_SECRET });
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

  const atomicPolicy = await createPolicy("Atomic webhook", {
    allowedContactChannels: ["email", "manual", "whatsapp"],
  });
  const atomicReady = await prepareApprovedTarget(atomicPolicy.sourcePolicyId, "AtomicWebhook");
  const atomicTargetId = atomicReady.targetId;
  await exportSignalDeskMessageServer(access, atomicReady.approvalId);
  await recordSignalDeskManualContactServer(access, {
    idempotencyKey: "manual-contact-atomic-webhook-e2e",
    occurredAt: new Date().toISOString(),
    result: "contacted",
    route: "email-export",
    sourcePolicyId: atomicPolicy.sourcePolicyId,
    targetId: atomicTargetId,
  });
  const atomicEmailIdentitySnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES)
    .where("targetId", "==", atomicTargetId)
    .where("channel", "==", "email")
    .limit(1)
    .get();
  assert(!atomicEmailIdentitySnap.empty, "Atomic webhook fixture lost its email identity");
  const atomicEmailIdentityDoc = atomicEmailIdentitySnap.docs[0];
  const atomicEmailAuthority = parseSignalDeskContactIdentityDocument(atomicEmailIdentityDoc.data(), atomicEmailIdentityDoc.id);
  const atomicEmail = String(atomicEmailAuthority.value || "");
  assert(atomicEmailAuthority.targetId === atomicTargetId, "Atomic webhook email authority points at another target");
  assert(atomicEmailAuthority.permissionState === "permissioned", "Atomic webhook email authority is not permissioned");
  assert(atomicTargetId !== targetId, "Atomic webhook fixture unexpectedly deduped to the prior DNC target");
  const atomicTargetBeforeWebhook = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(atomicTargetId).get();
  assert(atomicTargetBeforeWebhook.data()?.suppressionStatus === "clear", "Atomic webhook target was suppressed before the concurrency check");
  assert(atomicTargetBeforeWebhook.data()?.status === "contacted" && atomicTargetBeforeWebhook.data()?.latestConversationId, "Atomic webhook target has no prior-contact authority");
  const atomicPayload = {
    email: atomicEmail,
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
  const concurrentStatusDetail = JSON.stringify(concurrentResults);
  assert(concurrentResults.filter((result) => result.status === "processed").length === 1, `Concurrent webhook processing did not produce one winner: ${concurrentStatusDetail}`);
  assert(concurrentResults.filter((result) => result.status === "duplicate").length === 1, `Concurrent webhook processing did not dedupe one retry: ${concurrentStatusDetail}`);
  const atomicMessageCountAfter = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGES, () => true);
  assert(atomicMessageCountAfter === atomicMessageCountBefore + 1, "Concurrent webhook retry created duplicate message side effects");
  const atomicTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(atomicTargetId).get();
  assert(atomicTargetSnap.data()?.latestConversationId === `conv_${atomicTargetId}`, "Provider reply did not project the latest conversation onto the target");
  assert(atomicTargetSnap.data()?.ownerQualifiedAt, "Interested provider reply did not start the owner-qualified clock");
  const atomicRevenueAccountSnap = await db.collection(SIGNALDESK_COLLECTIONS.REVENUE_ACCOUNTS)
    .doc(`revenue_account_${hashValue(atomicTargetId).slice(0, 22)}`)
    .get();
  assert(atomicRevenueAccountSnap.exists, "Interested provider reply did not project the revenue lifecycle");

  const atomicTargetName = String(atomicTargetSnap.data()?.displayName || "Atomic Webhook Target");
  const seedInboundConversationAuthority = async (channel, inboundTargetId, targetName) => {
    await upsertSignalDeskChannelWindowStateServer(access, {
      channel,
      idempotencyKey: `webhook-inbound-window-${channel}-${inboundTargetId}`,
      source: "inbound",
      status: "open",
      targetId: inboundTargetId,
    });
    const conversationId = `conv_${channel}_${inboundTargetId}`;
    const timestamp = timestampNow();
    await db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES).doc(conversationId).set({
      channel,
      conversationId,
      lastMessagePreview: "Expected inbound conversation fixture.",
      pId: SIGNALDESK_PRODUCT_CODE,
      state: "contacted",
      targetId: inboundTargetId,
      targetName,
      updatedAt: timestamp,
    });
    await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(inboundTargetId).set({
      latestConversationId: conversationId,
      nextAction: "reply",
      status: "contacted",
      updatedAt: timestamp,
    }, { merge: true });
  };
  const seedDeliveryAuthority = async (channel, providerMessageId, deliveryTargetId, targetName) => {
    const fixtureKey = hashValue(`${channel}|${providerMessageId}`).slice(0, 24);
    const exportId = `export_webhook_${fixtureKey}`;
    await db.collection(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS).doc(exportId).set({
      approvalId: `approval_webhook_${fixtureKey}`,
      body: "Local webhook delivery authority fixture.",
      channel,
      createdAt: timestampNow(),
      createdBy: access.userId,
      ctaFingerprintHash: hashValue(`webhook-cta|${fixtureKey}`),
      ctaId: "cta_private_preview_v1",
      draftId: `draft_webhook_${fixtureKey}`,
      exportId,
      pId: SIGNALDESK_PRODUCT_CODE,
      provider: channel === "email" ? "smtp" : `meta-${channel}`,
      providerMessageId,
      senderDomainFingerprintHash: channel === "email" ? hashValue("menulist.test") : null,
      senderDomainId: channel === "email" ? senderDomainIdFor("menulist.test") : null,
      status: "sent",
      subject: "Local webhook delivery fixture",
      targetId: deliveryTargetId,
      targetName,
      updatedAt: timestampNow(),
    });
  };
  const whatsAppTargetId = await importOne(atomicPolicy.sourcePolicyId, "WhatsAppWebhook");
  const whatsAppTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(whatsAppTargetId).get();
  const whatsAppTargetName = String(whatsAppTargetSnap.data()?.displayName || "WhatsApp Webhook Target");
  await seedInboundConversationAuthority("whatsapp", whatsAppTargetId, whatsAppTargetName);
  await seedDeliveryAuthority("whatsapp", "wa_outbound_fixture", whatsAppTargetId, whatsAppTargetName);
  await seedDeliveryAuthority("email", "email_status_shared_message", atomicTargetId, atomicTargetName);

  const providerMessageCountBeforeStatus = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGES, (data) => data.targetId === whatsAppTargetId);
  const atomicPhoneIdentitySnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES)
    .where("targetId", "==", whatsAppTargetId)
    .where("channel", "==", "whatsapp")
    .limit(1)
    .get();
  assert(!atomicPhoneIdentitySnap.empty, "Atomic webhook fixture lost its phone identity");
  const atomicWhatsAppIdentityDoc = atomicPhoneIdentitySnap.docs[0];
  const atomicWhatsAppAuthority = parseSignalDeskContactIdentityDocument(atomicWhatsAppIdentityDoc.data(), atomicWhatsAppIdentityDoc.id);
  assert(atomicWhatsAppAuthority.targetId === whatsAppTargetId, "Atomic WhatsApp authority points at another target");
  assert(atomicWhatsAppAuthority.permissionState === "permissioned", "Atomic WhatsApp authority is not permissioned");
  assert(atomicWhatsAppAuthority.sourcePolicyId === atomicPolicy.sourcePolicyId, "Atomic WhatsApp authority lost source-policy lineage");
  const atomicPhone = String(atomicWhatsAppAuthority.value || "").replace(/\D/g, "");
  assert(signalDeskWebhookContactIdentityIdFor("whatsapp", atomicPhone) === atomicWhatsAppIdentityDoc.id, "Atomic WhatsApp identity is not canonical webhook authority");
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
  const providerMessageCountAfterStatus = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGES, (data) => data.targetId === whatsAppTargetId);
  assert(providerMessageCountAfterStatus === providerMessageCountBeforeStatus, "WhatsApp delivery status was stored as an inbound human reply");
  const afterDeliveryTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(whatsAppTargetId).get();
  assert(afterDeliveryTargetSnap.data()?.status === "contacted", "WhatsApp delivery status changed the target contact state");

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

  const batchMessageCountBefore = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGES, (data) => data.targetId === whatsAppTargetId);
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
  const atomicTargetBeforeBatch = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(whatsAppTargetId).get();
  const parsedAtomicTargetBeforeBatch = parseSignalDeskTargetSummaryDocument(atomicTargetBeforeBatch.data(), atomicTargetBeforeBatch.id);
  assert(
    canApplySignalDeskWebhookInboundToTarget(
      parsedAtomicTargetBeforeBatch,
      false,
      parseSignalDeskWebhookTargetLifecycleState(atomicTargetBeforeBatch.data()),
    ),
    "Atomic target lost prior-contact authority before the WhatsApp batch",
  );
  const batchedResult = await processSignalDeskProviderWebhook({
    provider: "whatsapp",
    rawBody: batchedRawBody,
    requestHeaders: metaWebhookHeaders(batchedRawBody),
  });
  assert(batchedResult.eventCount === 2 && batchedResult.processedCount === 2, "Batched WhatsApp webhook did not process every event");
  const batchMessageCountAfter = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGES, (data) => data.targetId === whatsAppTargetId);
  const webhookMessageIdFor = (provider, externalId) => `message_${hashValue(`webhook_${provider}_${hashValue(externalId).slice(0, 40)}`).slice(0, 32)}`;
  const [textMessageSnap, nonTextMessageSnap] = await Promise.all([
    db.collection(SIGNALDESK_COLLECTIONS.MESSAGES).doc(webhookMessageIdFor("whatsapp", "wa_batch_message_1")).get(),
    db.collection(SIGNALDESK_COLLECTIONS.MESSAGES).doc(webhookMessageIdFor("whatsapp", "wa_batch_message_2")).get(),
  ]);
  assert(
    batchMessageCountAfter === batchMessageCountBefore + 2,
    `Batched WhatsApp webhook dropped an inbound message: result=${JSON.stringify(batchedResult)}, before=${batchMessageCountBefore}, after=${batchMessageCountAfter}, text=${textMessageSnap.exists}, nonText=${nonTextMessageSnap.exists}`,
  );
  assert(nonTextMessageSnap.data()?.body === "[image message]", "Non-text WhatsApp message was silently discarded");

  const instagramPolicy = await createPolicy("Instagram webhook shape", {
    allowedContactChannels: ["instagram"],
  });
  const instagramTargetId = await importOne(instagramPolicy.sourcePolicyId, "InstagramWebhook", { instagram: "owner_igsid_fixture" });
  const instagramTargetSnapBeforeWebhook = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(instagramTargetId).get();
  await seedInboundConversationAuthority(
    "instagram",
    instagramTargetId,
    String(instagramTargetSnapBeforeWebhook.data()?.displayName || "Instagram Webhook Target"),
  );
  const instagramFixtureContacts = await db.collection(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES)
    .where("targetId", "==", instagramTargetId)
    .get();
  const instagramChannelAuthority = instagramFixtureContacts.docs.find((contact) => contact.data().channel === "instagram")?.data();
  const disallowedEmailAuthority = instagramFixtureContacts.docs.find((contact) => contact.data().channel === "email")?.data();
  assert(instagramChannelAuthority?.permissionState === "permissioned", "Allowed Instagram contact authority was not retained");
  assert(
    !disallowedEmailAuthority,
    `Disallowed email channel was retained as contact authority: state=${disallowedEmailAuthority?.permissionState || "unknown"}, allowed=${JSON.stringify(instagramPolicy.allowedContactChannels || [])}`,
  );
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

  const messengerPolicy = await createPolicy("Messenger webhook shape", {
    allowedContactChannels: ["messenger"],
    allowedFields: [
      "displayName", "category", "city", "country", "currentListUrl", "website", "notes",
      "providerRecordId", "providerRecordUrl", "messengerRecipientId",
    ],
  });
  const messengerTargetId = await importOne(messengerPolicy.sourcePolicyId, "MessengerWebhook");
  const messengerTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(messengerTargetId).get();
  assert(messengerTargetSnap.exists, "Messenger webhook target authority was not created");
  await seedInboundConversationAuthority(
    "messenger",
    messengerTargetId,
    String(messengerTargetSnap.data()?.displayName || "Messenger Webhook Target"),
  );
  const messengerIdentityId = `messenger_${hashValue("messenger_psid_fixture")}`;
  await db.collection(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES).doc(`messenger_${hashValue("messenger_psid_fixture")}`).set({
    channel: "messenger",
    expiresAt: messengerTargetSnap.data()?.sourceDataExpiresAt,
    identityId: messengerIdentityId,
    observedAt: messengerTargetSnap.data()?.sourceDataObservedAt,
    pId: SIGNALDESK_PRODUCT_CODE,
    permissionEvidenceRef: "e2e:permission:MessengerWebhook",
    permissionState: "permissioned",
    sourcePolicyId: messengerPolicy.sourcePolicyId,
    sourceRunId: messengerTargetSnap.data()?.sourceRunId,
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
    .doc(`phone_${hashValue(`+${unknownWhatsAppPhone}`)}`)
    .get();
  assert(unknownWhatsAppSuppressionSnap.exists, "Unresolved WhatsApp DNC did not create canonical phone suppression");
  const futureImportPolicy = await createPolicy("WhatsApp suppression compatibility");
  const futureSuppressedImport = await importSignalDeskTargetsServer(access, {
    idempotencyKey: "e2e-import:FutureWhatsAppSuppressed",
    rows: [rowFor("FutureWhatsAppSuppressed", { phone: `+${unknownWhatsAppPhone}` })],
    sourceName: "local e2e FutureWhatsAppSuppressed",
    sourcePolicyId: futureImportPolicy.sourcePolicyId,
  });
  assert(futureSuppressedImport.run.status === "blocked", "Suppressed future import was not represented as blocked");
  assert(futureSuppressedImport.targets.length === 1, "Suppressed future import did not retain one reviewable target");
  const futureSuppressedTargetId = futureSuppressedImport.targets[0].targetId;
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
    email: atomicEmail,
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
  const orderedReady = await prepareApprovedTarget(orderedPolicy.sourcePolicyId, "WebhookOrdering");
  const orderedTargetId = orderedReady.targetId;
  await exportSignalDeskMessageServer(access, orderedReady.approvalId);
  await recordSignalDeskManualContactServer(access, {
    idempotencyKey: "manual-contact-ordered-webhook-e2e",
    occurredAt: new Date().toISOString(),
    result: "contacted",
    route: "email-export",
    sourcePolicyId: orderedPolicy.sourcePolicyId,
    targetId: orderedTargetId,
  });
  const orderedEmailIdentitySnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES)
    .where("targetId", "==", orderedTargetId)
    .where("channel", "==", "email")
    .limit(1)
    .get();
  assert(!orderedEmailIdentitySnap.empty, "Ordered webhook fixture lost its email identity");
  const orderedEmail = String(orderedEmailIdentitySnap.docs[0].data().value || "");
  const newestTimestamp = Math.floor(Date.now() / 1000);
  await processSignalDeskProviderWebhook({
    provider: "email",
    rawBody: JSON.stringify({ email: orderedEmail, event: "email.reply", eventId: "ordered_newest_fixture", message: "Yes, interested.", targetId: orderedTargetId, timestamp: newestTimestamp }),
    requestHeaders: headers,
  });
  await processSignalDeskProviderWebhook({
    provider: "email",
    rawBody: JSON.stringify({ email: orderedEmail, event: "email.reply", eventId: "ordered_stale_fixture", message: "Not interested.", targetId: orderedTargetId, timestamp: newestTimestamp - 120 }),
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
    requestHeaders: new Headers({ "x-signaldesk-webhook-secret": process.env.SIGNALDESK_APIFY_WEBHOOK_SECRET }),
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
    conversationId: await replyConversationIdFor(targetId),
    idempotencyKey: `reply-dnc-${targetId}`,
    message: "Stop. Do not contact me again.",
  });
  assert(directDnc.state === "dnc", "DNC reply was not classified as dnc");
  const dncSuppressionCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER, (data) => data.targetId === targetId && data.reason === "dnc");
  assert(dncSuppressionCount > 0, "DNC reply did not create suppression immediately");
}

async function assertOutcomeIntegrityAndProofPermissions() {
  const policy = await createPolicy("Outcome integrity");
  const targetId = await importOne(policy.sourcePolicyId, "OutcomeIntegrity", { currentListUrl: "" });
  await createSignalDeskEvidenceServer(access, targetId);
  const contentDailyCostRef = db.collection(SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES)
    .doc(new Date().toISOString().slice(0, 10));
  const readContentWriteEstimate = async () => Number(
    (await contentDailyCostRef.get()).data()?.firestoreWriteEstimate || 0,
  );
  let proofGrantOffsetMs = 0;
  const nextProofGrantIso = () => new Date(Date.now() + (proofGrantOffsetMs += 1000)).toISOString();
  await captureSignalDeskReplyServer(access, {
    conversationId: await replyConversationIdFor(targetId),
    idempotencyKey: `reply-activation-${targetId}`,
    message: "Yes, I want to review the preview.",
  });
  await expectRejects("Outcome without operation identity", () => recordSignalDeskOutcomeServer(access, {
    channel: "manual",
    evidenceRef: `operator-note:${targetId}:missing-operation-key`,
    outcomeType: "route_created",
    source: "manual",
    targetId,
  }), "OUTCOME_IDEMPOTENCY_KEY_REQUIRED");
  const exactRouteInput = {
    channel: "manual",
    evidenceRef: `operator-note:${targetId}:route`,
    idempotencyKey: `outcome:${targetId}:concurrent-route`,
    outcomeType: "route_created",
    source: "manual",
    targetId,
  };
  const concurrentRoutes = await Promise.all([
    recordSignalDeskOutcomeServer(access, exactRouteInput),
    recordSignalDeskOutcomeServer(access, exactRouteInput),
  ]);
  assert(concurrentRoutes.filter((result) => result.duplicate === false).length === 1, "Concurrent route outcomes did not elect one owner");
  assert(concurrentRoutes.filter((result) => result.duplicate === true).length === 1, "Concurrent route outcome replay was not durable");
  await expectRejects("Conflicting route outcome idempotency reuse", () => recordSignalDeskOutcomeServer(access, {
    ...exactRouteInput,
    outcomeType: "upload_started",
  }), "OUTCOME_IDEMPOTENCY_CONFLICT");
  const routeSummarySnap = await db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES)
    .where("targetId", "==", targetId)
    .where("outcomeType", "==", "route_created")
    .get();
  assert(routeSummarySnap.docs.reduce((sum, doc) => sum + Number(doc.data().count || 0), 0) === 1, "Concurrent route outcome incremented the summary more than once");
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
    evidenceRef: validInput.evidenceRef,
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
    conversationId: await replyConversationIdFor(legacyTargetId),
    idempotencyKey: `reply-legacy-${legacyTargetId}`,
    message: "Interested in a preview.",
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

  const contentSourceRef = db.collection(SIGNALDESK_COLLECTIONS.CONTENT_SOURCES).doc("content_source_menulist_owned_proof_v1");
  const sourceBeforeActivation = await contentSourceRef.get();
  const contentSourceInput = {
    contentSourceId: contentSourceRef.id,
    defaultAudience: "restaurant-owner",
    defaultMarketPodId: "market_pod_first_local_v1",
    idempotencyKey: `content-source-${targetId}`,
    sourceType: "proof-page",
    sourceUrl: "https://menulist.ai",
    status: "active",
    title: "MenuList owned proof assets",
  };
  const contentSourceCostBefore = await readContentWriteEstimate();
  const [contentSource, contentSourceReplay] = await Promise.all([
    upsertSignalDeskContentSourceServer(access, contentSourceInput),
    upsertSignalDeskContentSourceServer(access, contentSourceInput),
  ]);
  assert(
    await readContentWriteEstimate() === contentSourceCostBefore + 5,
    "Concurrent content-source upsert did not report its exact five-write effect set once",
  );
  assert(contentSource.contentSourceId === contentSourceReplay.contentSourceId, "Concurrent content-source update did not converge");
  assert(contentSource.sourceUrl === "https://menulist.ai/", "Content source URL was not canonicalized safely");
  const contentSourceClaimRef = db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS)
    .doc(`content_source_${hashValue(`${access.userId}|${contentSourceInput.idempotencyKey}`)}`);
  const contentSourceClaim = (await contentSourceClaimRef.get()).data();
  assert(contentSourceClaim, "Content-source replay claim was not persisted");
  await contentSourceClaimRef.set({ operation: "proof_permission_upsert" }, { merge: true });
  await expectRejects("Wrong-operation content-source claim", () => upsertSignalDeskContentSourceServer(access, contentSourceInput), "CONTENT_SOURCE_IDEMPOTENCY_CONFLICT");
  await contentSourceClaimRef.set(contentSourceClaim);
  await contentSourceClaimRef.set({
    resultSnapshot: { ...(contentSourceClaim.resultSnapshot || {}), pId: "ML" },
  }, { merge: true });
  await expectRejects("Wrong-product content-source replay snapshot", () => upsertSignalDeskContentSourceServer(access, contentSourceInput), "CONTENT_SOURCE_REPLAY_MISSING");
  await contentSourceClaimRef.set(contentSourceClaim);
  await expectRejects("Conflicting content-source key reuse", () => upsertSignalDeskContentSourceServer(access, { ...contentSourceInput, title: "Changed content source" }), "CONTENT_SOURCE_IDEMPOTENCY_CONFLICT");
  await expectRejects("Mutable content-source URL", () => upsertSignalDeskContentSourceServer(access, { ...contentSourceInput, idempotencyKey: `content-source-url-${targetId}`, sourceUrl: "https://menulist.ai/other" }), "CONTENT_SOURCE_PROVENANCE_IMMUTABLE");
  await expectRejects("Malformed content-source URL", () => upsertSignalDeskContentSourceServer(access, { ...contentSourceInput, contentSourceId: undefined, idempotencyKey: `content-source-url-invalid-${targetId}`, sourceUrl: "javascript:alert(1)" }), "Content URL must be a valid credential-free HTTP(S) URL");
  await expectRejects("Missing content-source pod", () => upsertSignalDeskContentSourceServer(access, { ...contentSourceInput, contentSourceId: undefined, defaultMarketPodId: "pod_missing", idempotencyKey: `content-source-pod-missing-${targetId}`, title: "Missing pod source" }), "Market pod not found");
  const sourceHeldPodId = `pod_source_held_${hashValue(targetId).slice(0, 12)}`;
  await db.collection(SIGNALDESK_COLLECTIONS.MARKET_PODS).doc(sourceHeldPodId).set({ marketPodId: sourceHeldPodId, pId: "SD", reviewDecision: "held", status: "hold" });
  await expectRejects("Held content-source pod", () => upsertSignalDeskContentSourceServer(access, { ...contentSourceInput, contentSourceId: undefined, defaultMarketPodId: sourceHeldPodId, idempotencyKey: `content-source-pod-held-${targetId}`, title: "Held pod source" }), "Market pod is not founder-approved");
  const upperCaseSource = await upsertSignalDeskContentSourceServer(access, { ...contentSourceInput, contentSourceId: undefined, idempotencyKey: `content-source-case-upper-${targetId}`, sourceUrl: "https://example.test/Case?Ref=Owner", title: "Case-sensitive proof" });
  const lowerCaseSource = await upsertSignalDeskContentSourceServer(access, { ...contentSourceInput, contentSourceId: undefined, idempotencyKey: `content-source-case-lower-${targetId}`, sourceUrl: "https://example.test/case?ref=owner", title: "Case-sensitive proof" });
  assert(upperCaseSource.contentSourceId !== lowerCaseSource.contentSourceId, "Case-sensitive content URLs collapsed to one source identity");
  const clearedPodSource = await upsertSignalDeskContentSourceServer(access, { ...contentSourceInput, contentSourceId: lowerCaseSource.contentSourceId, defaultMarketPodId: null, idempotencyKey: `content-source-clear-pod-${targetId}`, sourceUrl: "https://example.test/case?ref=owner", status: "hold", title: "Case-sensitive proof" });
  assert(clearedPodSource.defaultMarketPodId === null, "Content-source update could not explicitly clear its default pod");
  const legacySourceTitle = "Legacy source identity";
  const legacySourceUrl = "https://example.test/Legacy";
  const legacySourceId = `content_source_${hashValue(`${legacySourceTitle.toLowerCase()}|blog|example.test/legacy`).slice(0, 18)}`;
  await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_SOURCES).doc(legacySourceId).set({ contentSourceId: legacySourceId, defaultAudience: "restaurant-owner", pId: "SD", sourceType: "blog", sourceUrl: legacySourceUrl, status: "hold", title: legacySourceTitle, updatedAt: timestampNow() });
  const legacySource = await upsertSignalDeskContentSourceServer(access, { ...contentSourceInput, contentSourceId: undefined, idempotencyKey: `content-source-legacy-${targetId}`, sourceType: "blog", sourceUrl: legacySourceUrl, title: legacySourceTitle });
  assert(legacySource.contentSourceId === legacySourceId, "Content-source v2 identity abandoned a matching legacy document");
  const malformedSourceRef = db.collection(SIGNALDESK_COLLECTIONS.CONTENT_SOURCES).doc(`source_malformed_${hashValue(targetId).slice(0, 12)}`);
  await malformedSourceRef.set({ contentSourceId: malformedSourceRef.id, defaultAudience: "restaurant-owner", pId: "SD", sourceType: "proof-page", sourceUrl: "javascript:alert(1)", status: "active", title: "Malformed persisted source", updatedAt: timestampNow() });
  const contentWorkspace = await loadSignalDeskWorkspaceServer(access, "content");
  assert(!contentWorkspace.workspace.contentSources.some((source) => source.contentSourceId === malformedSourceRef.id), "Malformed persisted content source reached the workspace");
  assert(contentWorkspace.workspace.targets.some((target) => target.targetId === targetId), "Founder content workspace omitted proof-permission targets");
  const operatorContentWorkspace = await loadSignalDeskWorkspaceServer({
    ...access,
    permissions: ["signaldesk.view", "draft.create"],
    role: "operator",
  }, "content");
  assert(operatorContentWorkspace.workspace.targets.length === 0, "Content workspace exposed proof-permission targets without configure authority");
  await malformedSourceRef.delete();
  const invalidHeadRefs = Array.from({ length: 31 }, (_, index) => (
    db.collection(SIGNALDESK_COLLECTIONS.CONTENT_SOURCES).doc(`source_invalid_head_${index}_${hashValue(targetId).slice(0, 8)}`)
  ));
  const invalidHeadBatch = db.batch();
  invalidHeadRefs.forEach((reference, index) => invalidHeadBatch.set(reference, {
    contentSourceId: reference.id,
    defaultAudience: "restaurant-owner",
    pId: "SD",
    sourceType: "proof-page",
    sourceUrl: "javascript:alert(1)",
    status: "active",
    title: `Malformed newest source ${index}`,
    updatedAt: admin.firestore.Timestamp.fromMillis(Date.now() + ((index + 1) * 60_000)),
  }));
  await invalidHeadBatch.commit();
  try {
    const backfilledContentWorkspace = await loadSignalDeskWorkspaceServer(access, "content");
    assert(
      backfilledContentWorkspace.workspace.contentSources.some((source) => source.contentSourceId === contentSource.contentSourceId),
      "Malformed newest content-source rows starved an older valid workspace row",
    );
    assert(
      !backfilledContentWorkspace.workspace.contentSources.some((source) => source.contentSourceId.startsWith("source_invalid_head_")),
      "Malformed newest content-source rows reached the workspace DTO",
    );
  } finally {
    const invalidHeadCleanup = db.batch();
    invalidHeadRefs.forEach((reference) => invalidHeadCleanup.delete(reference));
    await invalidHeadCleanup.commit();
  }
  const sourceAfterActivation = await contentSourceRef.get();
  assert(sourceAfterActivation.data()?.createdAt?.toMillis?.() === sourceBeforeActivation.data()?.createdAt?.toMillis?.(), "Content-source update rewrote creation time");
  assert(sourceAfterActivation.data()?.lastAssetAt?.toMillis?.() === sourceBeforeActivation.data()?.lastAssetAt?.toMillis?.(), "Content-source update reset asset recency");

  const contentAssetCtaInput = {
    copy: "Open a private owner-reviewed MenuList preview.",
    ctaType: "claim-start",
    idempotencyKey: `content-asset-cta-${targetId}`,
    label: "Open private preview",
    status: "active",
  };
  const [contentAssetCta, contentAssetCtaReplay] = await Promise.all([
    upsertSignalDeskSelfServiceCtaServer(access, contentAssetCtaInput),
    upsertSignalDeskSelfServiceCtaServer(access, contentAssetCtaInput),
  ]);
  assert(contentAssetCta.ctaId === contentAssetCtaReplay.ctaId, "Concurrent content-asset CTA creation did not converge");
  const contentCtaClaimRef = db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS)
    .doc(`content_cta_${hashValue(`${access.userId}|${contentAssetCtaInput.idempotencyKey}`)}`);
  const contentCtaClaim = (await contentCtaClaimRef.get()).data();
  assert(contentCtaClaim, "Content-CTA replay claim was not persisted");
  await contentCtaClaimRef.set({ actorId: "other-signaldesk-actor" }, { merge: true });
  await expectRejects("Wrong-actor content-CTA claim", () => upsertSignalDeskSelfServiceCtaServer(access, contentAssetCtaInput), "CONTENT_CTA_IDEMPOTENCY_CONFLICT");
  await contentCtaClaimRef.set(contentCtaClaim);

  await expectRejects("Customer proof without permission", () => createSignalDeskContentAssetServer(access, {
    canonicalMessage: "An owner-approved proof message for the local activation cohort.",
    ctaId: contentAssetCta.ctaId,
    idempotencyKey: `content-asset-unpermissioned-${targetId}`,
    primaryAudience: "restaurant-owner",
    proofLevel: "customer-proof",
    proofScopes: ["business-name"],
    riskNotes: [],
    sourceNotes: "Local E2E proof fixture.",
    sourceType: "customer-story",
    title: "Unpermissioned customer proof",
  }), "PROOF_PERMISSION_REQUIRED");
  const proofPermissionInput = {
    evidenceRef: `consent:${targetId}`,
    expiresAt: futureIso(30),
    idempotencyKey: `proof-permission-${targetId}`,
    scopes: ["business-name", "before-after-screenshots"],
    status: "active",
    targetId,
  };
  const proofPermissionCostBefore = await readContentWriteEstimate();
  const [permission, permissionReplay] = await Promise.all([
    upsertSignalDeskProofPermissionServer(access, proofPermissionInput),
    upsertSignalDeskProofPermissionServer(access, proofPermissionInput),
  ]);
  assert(
    await readContentWriteEstimate() === proofPermissionCostBefore + 4,
    "Concurrent proof-permission upsert did not report its exact four-write effect set once",
  );
  assert(permission.proofPermissionId === permissionReplay.proofPermissionId, "Concurrent proof permission did not converge");
  const proofPermissionClaimRef = db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS)
    .doc(`proof_permission_${hashValue(`${access.userId}|${proofPermissionInput.idempotencyKey}`)}`);
  const proofPermissionClaim = (await proofPermissionClaimRef.get()).data();
  assert(proofPermissionClaim, "Proof-permission replay claim was not persisted");
  await proofPermissionClaimRef.set({ pId: "ML" }, { merge: true });
  await expectRejects("Wrong-product proof-permission claim", () => upsertSignalDeskProofPermissionServer(access, proofPermissionInput), "PROOF_PERMISSION_IDEMPOTENCY_CONFLICT");
  await proofPermissionClaimRef.set(proofPermissionClaim);
  await expectRejects("Conflicting proof-permission key reuse", () => upsertSignalDeskProofPermissionServer(access, { ...proofPermissionInput, status: "hold" }), "PROOF_PERMISSION_IDEMPOTENCY_CONFLICT");
  await expectRejects("Unknown proof-permission target", () => upsertSignalDeskProofPermissionServer(access, { ...proofPermissionInput, idempotencyKey: `proof-permission-missing-${targetId}`, targetId: "target_missing" }), "Target not found");
  const contentAssetInput = {
    canonicalMessage: "An owner-approved proof message for the local activation cohort.",
    ctaId: contentAssetCta.ctaId,
    idempotencyKey: `content-asset-${targetId}`,
    primaryAudience: "restaurant-owner",
    proofLevel: "customer-proof",
    proofPermissionId: permission.proofPermissionId,
    proofScopes: ["business-name", "before-after-screenshots"],
    riskNotes: [],
    sourceId: contentSource.contentSourceId,
    sourceNotes: "Local E2E proof fixture.",
    sourceType: contentSource.sourceType,
    sourceUrl: contentSource.sourceUrl,
    title: "Permissioned customer proof",
  };
  const contentAssetCostBefore = await readContentWriteEstimate();
  let [asset, assetReplay] = await Promise.all([
    createSignalDeskContentAssetServer(access, contentAssetInput),
    createSignalDeskContentAssetServer(access, contentAssetInput),
  ]);
  assert(
    await readContentWriteEstimate() === contentAssetCostBefore + 6,
    "Concurrent source-backed content-asset creation did not report its exact six-write effect set once",
  );
  assert(asset.contentAssetId === assetReplay.contentAssetId, "Concurrent content asset creation did not converge");
  const contentAssetClaimRef = db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS)
    .doc(`content_asset_${hashValue(`${access.userId}|${contentAssetInput.idempotencyKey}`)}`);
  const contentAssetClaim = (await contentAssetClaimRef.get()).data();
  assert(contentAssetClaim, "Content-asset replay claim was not persisted");
  await contentAssetClaimRef.set({ pId: "ML" }, { merge: true });
  await expectRejects("Wrong-product content-asset replay claim", () => createSignalDeskContentAssetServer(access, contentAssetInput), "CONTENT_ASSET_IDEMPOTENCY_CONFLICT");
  await contentAssetClaimRef.set(contentAssetClaim);
  await contentAssetClaimRef.set({ actorId: "other-signaldesk-actor" }, { merge: true });
  await expectRejects("Wrong-actor content-asset replay claim", () => createSignalDeskContentAssetServer(access, contentAssetInput), "CONTENT_ASSET_IDEMPOTENCY_CONFLICT");
  await contentAssetClaimRef.set(contentAssetClaim);
  const redirectedContentAssetId = `content_asset_redirect_${hashValue(targetId).slice(0, 16)}`;
  await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(redirectedContentAssetId).set(contentAssetFixture(redirectedContentAssetId, {
    canonicalMessage: "A different valid asset must not satisfy the original replay claim.",
    title: "Redirected content-asset replay fixture",
  }));
  await contentAssetClaimRef.set({ entityId: redirectedContentAssetId }, { merge: true });
  await expectRejects("Redirected content-asset replay claim", () => createSignalDeskContentAssetServer(access, contentAssetInput), "CONTENT_ASSET_IDEMPOTENCY_CONFLICT");
  await contentAssetClaimRef.set(contentAssetClaim);
  await expectRejects("Referenced content-source audience mutation", () => upsertSignalDeskContentSourceServer(access, {
    ...contentSourceInput,
    defaultAudience: "general",
    idempotencyKey: `content-source-referenced-audience-${targetId}`,
  }), "CONTENT_SOURCE_REFERENCED_IMMUTABLE");
  await expectRejects("Referenced content-source pod mutation", () => upsertSignalDeskContentSourceServer(access, {
    ...contentSourceInput,
    defaultMarketPodId: null,
    idempotencyKey: `content-source-referenced-pod-${targetId}`,
  }), "CONTENT_SOURCE_REFERENCED_IMMUTABLE");
  await expectRejects("Conflicting content-asset key reuse", () => createSignalDeskContentAssetServer(access, { ...contentAssetInput, title: "Changed proof title" }), "CONTENT_ASSET_IDEMPOTENCY_CONFLICT");
  await expectRejects("Missing explicit content asset", () => createSignalDeskContentAssetServer(access, {
    ...contentAssetInput,
    contentAssetId: `content_asset_missing_${hashValue(targetId).slice(0, 12)}`,
    idempotencyKey: `content-asset-explicit-missing-${targetId}`,
  }), "Content asset not found");
  await expectRejects("Mutable content-asset proof provenance", () => createSignalDeskContentAssetServer(access, {
    ...contentAssetInput,
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-asset-provenance-${targetId}`,
    proofLevel: "owned",
    proofPermissionId: undefined,
    proofScopes: [],
  }), "CONTENT_ASSET_PROVENANCE_IMMUTABLE");
  const ownedAssetInput = {
    canonicalMessage: "A bounded owned content message for deterministic identity and lifecycle verification.",
    ctaId: contentAssetCta.ctaId,
    primaryAudience: "restaurant-owner",
    proofLevel: "owned",
    proofScopes: [],
    riskNotes: [],
    sourceNotes: "Local owned-content identity fixture.",
    sourceType: "blog",
  };
  await expectRejects("Caller-declared distributed content asset", () => createSignalDeskContentAssetServer(access, {
    ...ownedAssetInput,
    idempotencyKey: `content-asset-distributed-${targetId}`,
    status: "distributed",
    title: "Caller-declared distributed asset",
  }), "CONTENT_ASSET_STATUS_NOT_ALLOWED");
  await expectRejects("Caller-declared ready content asset", () => createSignalDeskContentAssetServer(access, {
    ...ownedAssetInput,
    idempotencyKey: `content-asset-ready-${targetId}`,
    status: "ready",
    title: "Caller-declared ready asset",
  }), "CONTENT_ASSET_STATUS_NOT_ALLOWED");
  await expectRejects("Risk-bearing content asset declared ready", () => createSignalDeskContentAssetServer(access, {
    ...ownedAssetInput,
    idempotencyKey: `content-asset-risk-ready-${targetId}`,
    riskNotes: ["Founder review is still required."],
    status: "ready",
    title: "Risk-bearing ready asset",
  }), "CONTENT_ASSET_STATUS_NOT_ALLOWED");
  await expectRejects("Internal note declared ready", () => createSignalDeskContentAssetServer(access, {
    ...ownedAssetInput,
    idempotencyKey: `content-asset-internal-ready-${targetId}`,
    proofLevel: "internal-note",
    status: "ready",
    title: "Internal note ready asset",
  }), "CONTENT_ASSET_STATUS_NOT_ALLOWED");
  const historicalAssetInput = {
    ...ownedAssetInput,
    idempotencyKey: `content-asset-historical-replay-${targetId}`,
    status: "ready",
    title: "Historical status-bearing asset replay",
  };
  const historicalAssetId = `content_asset_historical_${hashValue(targetId).slice(0, 12)}`;
  const historicalOperationHash = hashValue(`${access.userId}|${historicalAssetInput.idempotencyKey}`);
  const historicalFingerprintHash = hashValue(JSON.stringify({
    ...historicalAssetInput,
    idempotencyKey: undefined,
    proofScopes: Array.from(new Set(historicalAssetInput.proofScopes)).sort(),
  }));
  await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(historicalAssetId).set(contentAssetFixture(historicalAssetId, {
    canonicalMessage: historicalAssetInput.canonicalMessage,
    ctaId: historicalAssetInput.ctaId,
    primaryAudience: historicalAssetInput.primaryAudience,
    proofLevel: historicalAssetInput.proofLevel,
    proofScopes: historicalAssetInput.proofScopes,
    riskNotes: historicalAssetInput.riskNotes,
    sourceNotes: historicalAssetInput.sourceNotes,
    sourceType: historicalAssetInput.sourceType,
    status: "ready",
    title: historicalAssetInput.title,
  }));
  await db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS).doc(`content_asset_${historicalOperationHash}`).set({
    actorId: access.userId,
    entityId: historicalAssetId,
    operation: "content_asset_create",
    pId: "SD",
    requestFingerprintHash: historicalFingerprintHash,
    updatedAt: timestampNow(),
  });
  const historicalAssetReplay = await createSignalDeskContentAssetServer(access, historicalAssetInput);
  assert(historicalAssetReplay.contentAssetId === historicalAssetId, "Historical status-bearing content-asset claim no longer replayed exact durable truth");

  const urlLessSourceA = await upsertSignalDeskContentSourceServer(access, {
    defaultAudience: "restaurant-owner",
    defaultMarketPodId: "market_pod_first_local_v1",
    idempotencyKey: `content-source-url-less-a-${targetId}`,
    sourceType: "blog",
    status: "active",
    title: "URL-less identity source A",
  });
  const urlLessSourceB = await upsertSignalDeskContentSourceServer(access, {
    defaultAudience: "restaurant-owner",
    defaultMarketPodId: "market_pod_first_local_v1",
    idempotencyKey: `content-source-url-less-b-${targetId}`,
    sourceType: "blog",
    status: "active",
    title: "URL-less identity source B",
  });
  const urlLessAssetA = await createSignalDeskContentAssetServer(access, {
    ...ownedAssetInput,
    idempotencyKey: `content-asset-url-less-a-${targetId}`,
    sourceId: urlLessSourceA.contentSourceId,
    title: "Shared URL-less asset title",
  });
  const urlLessAssetB = await createSignalDeskContentAssetServer(access, {
    ...ownedAssetInput,
    idempotencyKey: `content-asset-url-less-b-${targetId}`,
    sourceId: urlLessSourceB.contentSourceId,
    title: "Shared URL-less asset title",
  });
  assert(urlLessAssetA.contentAssetId !== urlLessAssetB.contentAssetId, "Two URL-less selected sources with the same asset title collapsed to one identity");

  const upperCaseAsset = await createSignalDeskContentAssetServer(access, {
    ...ownedAssetInput,
    idempotencyKey: `content-asset-case-upper-${targetId}`,
    sourceUrl: "https://example.test/AssetCase?Ref=Owner",
    title: "Case-sensitive standalone asset",
  });
  const lowerCaseAsset = await createSignalDeskContentAssetServer(access, {
    ...ownedAssetInput,
    idempotencyKey: `content-asset-case-lower-${targetId}`,
    sourceUrl: "https://example.test/assetcase?ref=owner",
    title: "Case-sensitive standalone asset",
  });
  assert(upperCaseAsset.contentAssetId !== lowerCaseAsset.contentAssetId, "Case-sensitive standalone content URLs collapsed to one asset identity");
  const sourceTypeAssetBlog = await createSignalDeskContentAssetServer(access, {
    ...ownedAssetInput,
    idempotencyKey: `content-asset-type-blog-${targetId}`,
    sourceUrl: "https://example.test/source-type-proof",
    title: "Source-type standalone identity",
  });
  const sourceTypeAssetChangelog = await createSignalDeskContentAssetServer(access, {
    ...ownedAssetInput,
    idempotencyKey: `content-asset-type-changelog-${targetId}`,
    sourceType: "changelog",
    sourceUrl: "https://example.test/source-type-proof",
    title: "Source-type standalone identity",
  });
  assert(sourceTypeAssetBlog.contentAssetId !== sourceTypeAssetChangelog.contentAssetId, "Standalone source types with the same title and URL collapsed to one asset identity");

  const legacyAssetTitle = "Matching legacy asset identity";
  const legacyAssetUrl = "https://example.test/LegacyAsset";
  const legacyAssetId = `content_asset_${hashValue(`${legacyAssetTitle.toLowerCase()}|example.test/legacyasset`).slice(0, 18)}`;
  const legacyAssetCreatedAt = admin.firestore.Timestamp.fromMillis(Date.now() - 180_000);
  const legacyAssetRef = db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(legacyAssetId);
  await legacyAssetRef.set(contentAssetFixture(legacyAssetId, {
    canonicalMessage: "The matching legacy content asset before its compatible update.",
    createdAt: legacyAssetCreatedAt,
    sourceType: "blog",
    sourceUrl: legacyAssetUrl,
    title: legacyAssetTitle,
  }));
  const reusedLegacyAsset = await createSignalDeskContentAssetServer(access, {
    ...ownedAssetInput,
    idempotencyKey: `content-asset-legacy-match-${targetId}`,
    sourceUrl: legacyAssetUrl,
    title: legacyAssetTitle,
  });
  const reusedLegacyAssetSnap = await legacyAssetRef.get();
  assert(reusedLegacyAsset.contentAssetId === legacyAssetId, "Content-asset v2 identity abandoned a matching legacy document");
  assert(reusedLegacyAssetSnap.data()?.createdAt?.toMillis?.() === legacyAssetCreatedAt.toMillis(), "Matching legacy content-asset reuse rewrote creation time");

  const mismatchedLegacyTitle = "Mismatched legacy asset identity";
  const mismatchedLegacyUrl = "https://example.test/MismatchedLegacyAsset";
  const mismatchedLegacyId = `content_asset_${hashValue(`${mismatchedLegacyTitle.toLowerCase()}|example.test/mismatchedlegacyasset`).slice(0, 18)}`;
  const mismatchedLegacyCreatedAt = admin.firestore.Timestamp.fromMillis(Date.now() - 240_000);
  const mismatchedLegacyRef = db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(mismatchedLegacyId);
  const mismatchedLegacyMessage = "The mismatched legacy content asset must remain byte-for-byte untouched.";
  await mismatchedLegacyRef.set(contentAssetFixture(mismatchedLegacyId, {
    canonicalMessage: mismatchedLegacyMessage,
    createdAt: mismatchedLegacyCreatedAt,
    sourceType: "blog",
    sourceUrl: mismatchedLegacyUrl,
    title: mismatchedLegacyTitle,
  }));
  const mismatchedLegacyV2Asset = await createSignalDeskContentAssetServer(access, {
    ...ownedAssetInput,
    idempotencyKey: `content-asset-legacy-mismatch-${targetId}`,
    sourceType: "changelog",
    sourceUrl: mismatchedLegacyUrl,
    title: mismatchedLegacyTitle,
  });
  const untouchedMismatchedLegacySnap = await mismatchedLegacyRef.get();
  assert(mismatchedLegacyV2Asset.contentAssetId !== mismatchedLegacyId, "Mismatched legacy content provenance was reused instead of creating v2 identity");
  assert(untouchedMismatchedLegacySnap.data()?.canonicalMessage === mismatchedLegacyMessage, "Mismatched legacy content asset was overwritten during v2 creation");
  assert(untouchedMismatchedLegacySnap.data()?.createdAt?.toMillis?.() === mismatchedLegacyCreatedAt.toMillis(), "Mismatched legacy content asset creation time changed during v2 creation");

  const malformedAssetRef = db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(`content_asset_malformed_${hashValue(targetId).slice(0, 12)}`);
  const wrongProductAssetRef = db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(`content_asset_wrong_product_${hashValue(targetId).slice(0, 12)}`);
  await malformedAssetRef.set(contentAssetFixture(malformedAssetRef.id, { title: "x" }));
  await wrongProductAssetRef.set(contentAssetFixture(wrongProductAssetRef.id, { pId: "ML", title: "Wrong-product content asset" }));
  const assetShapeWorkspace = await loadSignalDeskWorkspaceServer(access, "content");
  assert(!assetShapeWorkspace.workspace.contentAssets.some((item) => item.contentAssetId === malformedAssetRef.id), "Malformed persisted content asset reached the workspace");
  assert(!assetShapeWorkspace.workspace.contentAssets.some((item) => item.contentAssetId === wrongProductAssetRef.id), "Wrong-product persisted content asset reached the workspace");
  await expectRejects("Malformed persisted content asset consumer", () => generateSignalDeskContentDistributionDraftsServer(access, {
    channels: ["short-video"],
    contentAssetId: malformedAssetRef.id,
    idempotencyKey: `content-drafts-malformed-asset-${targetId}`,
  }), "CONTENT_ASSET_SHAPE_INVALID");
  await expectRejects("Wrong-product persisted content asset consumer", () => generateSignalDeskContentDistributionDraftsServer(access, {
    channels: ["partner-brief"],
    contentAssetId: wrongProductAssetRef.id,
    idempotencyKey: `content-drafts-wrong-product-asset-${targetId}`,
  }), "CONTENT_ASSET_SHAPE_INVALID");
  await Promise.all([malformedAssetRef.delete(), wrongProductAssetRef.delete()]);

  const riskHeldAsset = await createSignalDeskContentAssetServer(access, {
    ...ownedAssetInput,
    idempotencyKey: `content-asset-risk-held-${targetId}`,
    riskNotes: ["Founder review is still required."],
    title: "Risk-bearing held asset",
  });
  const internalHeldAsset = await createSignalDeskContentAssetServer(access, {
    ...ownedAssetInput,
    idempotencyKey: `content-asset-internal-held-${targetId}`,
    proofLevel: "internal-note",
    title: "Internal-note held asset",
  });
  assert(riskHeldAsset.status === "hold" && internalHeldAsset.status === "hold", "Risk-bearing or internal content bypassed the held state");
  await expectRejects("Risk-bearing asset founder readiness", () => reviewSignalDeskContentAssetServer(access, {
    contentAssetId: riskHeldAsset.contentAssetId,
    idempotencyKey: `content-asset-review-risk-${targetId}`,
    reason: "This must remain held while risk notes exist.",
    status: "ready",
  }), "CONTENT_ASSET_READINESS_BLOCKED");
  await expectRejects("Internal-note asset founder readiness", () => reviewSignalDeskContentAssetServer(access, {
    contentAssetId: internalHeldAsset.contentAssetId,
    idempotencyKey: `content-asset-review-internal-${targetId}`,
    reason: "Internal notes are not distribution-ready assets.",
    status: "ready",
  }), "CONTENT_ASSET_READINESS_BLOCKED");

  const reviewCandidate = await createSignalDeskContentAssetServer(access, {
    ...ownedAssetInput,
    idempotencyKey: `content-asset-review-candidate-${targetId}`,
    title: "Founder-reviewed lifecycle asset",
  });
  const initiallyHeldReviewCandidate = await reviewSignalDeskContentAssetServer(access, {
    contentAssetId: reviewCandidate.contentAssetId,
    idempotencyKey: `content-asset-review-initial-hold-${targetId}`,
    reason: "Founder held this eligible asset before final readiness review.",
    status: "hold",
  });
  assert(initiallyHeldReviewCandidate.status === "hold", "Founder content-asset hold did not persist");
  const assetReadyReviewInput = {
    contentAssetId: reviewCandidate.contentAssetId,
    idempotencyKey: `content-asset-review-ready-${targetId}`,
    reason: "Founder verified the bounded owned content.",
    status: "ready",
  };
  const [founderReadyAsset, founderReadyAssetReplay] = await Promise.all([
    reviewSignalDeskContentAssetServer(access, assetReadyReviewInput),
    reviewSignalDeskContentAssetServer(access, assetReadyReviewInput),
  ]);
  assert(founderReadyAsset.status === "ready" && founderReadyAssetReplay.status === "ready", "Concurrent founder content-asset readiness did not converge");
  const contentAssetReviewClaimRef = db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS)
    .doc(`content_asset_review_${hashValue(`${access.userId}|${assetReadyReviewInput.idempotencyKey}`)}`);
  const contentAssetReviewClaim = (await contentAssetReviewClaimRef.get()).data();
  assert(contentAssetReviewClaim, "Content-asset review replay claim was not persisted");
  await contentAssetReviewClaimRef.set({ pId: "ML" }, { merge: true });
  await expectRejects("Wrong-product content-asset review claim", () => reviewSignalDeskContentAssetServer(access, assetReadyReviewInput), "CONTENT_ASSET_REVIEW_IDEMPOTENCY_CONFLICT");
  await contentAssetReviewClaimRef.set(contentAssetReviewClaim);
  await contentAssetReviewClaimRef.set({ entityId: asset.contentAssetId }, { merge: true });
  await expectRejects("Redirected content-asset review claim", () => reviewSignalDeskContentAssetServer(access, assetReadyReviewInput), "CONTENT_ASSET_REVIEW_IDEMPOTENCY_CONFLICT");
  await contentAssetReviewClaimRef.set(contentAssetReviewClaim);
  await expectRejects("Conflicting content-asset review key reuse", () => reviewSignalDeskContentAssetServer(access, {
    ...assetReadyReviewInput,
    reason: "Changed founder review reason.",
  }), "CONTENT_ASSET_REVIEW_IDEMPOTENCY_CONFLICT");
  const founderArchivedAsset = await reviewSignalDeskContentAssetServer(access, {
    contentAssetId: reviewCandidate.contentAssetId,
    idempotencyKey: `content-asset-review-archive-${targetId}`,
    reason: "Founder archived the completed lifecycle fixture.",
    status: "archived",
  });
  assert(founderArchivedAsset.status === "archived", "Founder content-asset archive did not persist");
  await expectRejects("Archived content asset restore", () => reviewSignalDeskContentAssetServer(access, {
    contentAssetId: reviewCandidate.contentAssetId,
    idempotencyKey: `content-asset-review-restore-${targetId}`,
    reason: "Archived assets must remain terminal.",
    status: "ready",
  }), "CONTENT_ASSET_STATUS_TRANSITION_INVALID");
  await expectRejects("Mismatched selected-source URL", () => createSignalDeskContentAssetServer(access, { ...contentAssetInput, idempotencyKey: `content-asset-source-url-${targetId}`, sourceUrl: "https://menulist.ai/other" }), "CONTENT_SOURCE_URL_MISMATCH");
  await expectRejects("Mismatched selected-source audience", () => createSignalDeskContentAssetServer(access, { ...contentAssetInput, idempotencyKey: `content-asset-source-audience-${targetId}`, primaryAudience: "general" }), "CONTENT_SOURCE_AUDIENCE_MISMATCH");
  await expectRejects("Mismatched selected-source pod", () => createSignalDeskContentAssetServer(access, { ...contentAssetInput, idempotencyKey: `content-asset-source-pod-${targetId}`, marketPodId: sourceHeldPodId }), "CONTENT_SOURCE_MARKET_POD_MISMATCH");
  await expectRejects("Unknown explicit content CTA", () => createSignalDeskContentAssetServer(access, { ...contentAssetInput, ctaId: "cta_missing", idempotencyKey: `content-asset-missing-cta-${targetId}` }), "CONTENT_CTA_NOT_FOUND");
  const heldCtaId = `cta_held_${hashValue(targetId).slice(0, 12)}`;
  await db.collection(SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS).doc(heldCtaId).set({
    copy: "Held CTA",
    ctaId: heldCtaId,
    ctaType: "claim-start",
    label: "Held CTA",
    pId: "SD",
    status: "hold",
  });
  await expectRejects("Inactive explicit content CTA", () => createSignalDeskContentAssetServer(access, { ...contentAssetInput, ctaId: heldCtaId, idempotencyKey: `content-asset-held-cta-${targetId}` }), "CONTENT_CTA_NOT_ACTIVE");
  const heldSourceId = `source_held_${hashValue(targetId).slice(0, 12)}`;
  await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_SOURCES).doc(heldSourceId).set({
    contentSourceId: heldSourceId,
    defaultAudience: "restaurant-owner",
    pId: "SD",
    sourceType: contentAssetInput.sourceType,
    status: "hold",
    title: "Held customer proof source",
  });
  await expectRejects("Inactive content source", () => createSignalDeskContentAssetServer(access, { ...contentAssetInput, idempotencyKey: `content-asset-held-source-${targetId}`, sourceId: heldSourceId }), "Content source is not active");
  const heldPodId = `pod_held_${hashValue(targetId).slice(0, 12)}`;
  await db.collection(SIGNALDESK_COLLECTIONS.MARKET_PODS).doc(heldPodId).set({ marketPodId: heldPodId, pId: "SD", reviewDecision: "held", status: "hold" });
  await expectRejects("Unapproved content market pod", () => createSignalDeskContentAssetServer(access, { ...contentAssetInput, idempotencyKey: `content-asset-held-pod-${targetId}`, marketPodId: heldPodId, sourceId: undefined, sourceUrl: undefined }), "Market pod is not founder-approved");
  assert(asset.status === "ready", "Permissioned customer proof did not become ready");
  const draftGenerationInput = {
    channels: ["linkedin"],
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-drafts-${targetId}`,
  };
  const contentDraftGenerationCostBefore = await readContentWriteEstimate();
  const [drafts, draftReplay] = await Promise.all([
    generateSignalDeskContentDistributionDraftsServer(access, draftGenerationInput),
    generateSignalDeskContentDistributionDraftsServer(access, draftGenerationInput),
  ]);
  assert(
    await readContentWriteEstimate() === contentDraftGenerationCostBefore + 6,
    "Concurrent first-revision content-draft generation did not report its exact six-write effect set once",
  );
  assert(drafts.length === 1, "Permissioned proof did not generate one review-gated draft");
  assert(drafts[0].contentDraftId === draftReplay[0].contentDraftId, "Concurrent content draft generation did not converge");
  const contentDraftGenerationClaimRef = db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS)
    .doc(`content_draft_generation_${hashValue(`${access.userId}|${draftGenerationInput.idempotencyKey}`)}`);
  const contentDraftGenerationClaim = (await contentDraftGenerationClaimRef.get()).data();
  assert(contentDraftGenerationClaim, "Content-draft generation replay claim was not persisted");
  await contentDraftGenerationClaimRef.set({ pId: "ML" }, { merge: true });
  await expectRejects("Wrong-product content-draft generation claim", () => generateSignalDeskContentDistributionDraftsServer(access, draftGenerationInput), "CONTENT_DRAFT_GENERATION_IDEMPOTENCY_CONFLICT");
  await contentDraftGenerationClaimRef.set(contentDraftGenerationClaim);
  await contentDraftGenerationClaimRef.set({ entityId: urlLessAssetA.contentAssetId }, { merge: true });
  await expectRejects("Redirected content-draft generation claim", () => generateSignalDeskContentDistributionDraftsServer(access, draftGenerationInput), "CONTENT_DRAFT_GENERATION_IDEMPOTENCY_CONFLICT");
  await contentDraftGenerationClaimRef.set(contentDraftGenerationClaim);
  await expectRejects("Conflicting content draft generation key reuse", () => generateSignalDeskContentDistributionDraftsServer(access, { ...draftGenerationInput, channels: ["email"] }), "CONTENT_DRAFT_GENERATION_IDEMPOTENCY_CONFLICT");
  await expectRejects("Content draft regeneration under a new key", () => generateSignalDeskContentDistributionDraftsServer(access, {
    ...draftGenerationInput,
    idempotencyKey: `content-drafts-regeneration-${targetId}`,
  }), "CONTENT_DRAFT_ALREADY_EXISTS");
  assert(asset.ctaId, "Content asset did not retain the active CTA selected at creation");
  const assetCtaRef = db.collection(SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS).doc(asset.ctaId);
  const activeAssetCtaSnap = await assetCtaRef.get();
  assert(activeAssetCtaSnap.data()?.status === "active", "Content asset CTA fixture was not active before draft generation");
  const activeAssetCtaCopy = activeAssetCtaSnap.data()?.copy;
  assert(typeof activeAssetCtaCopy === "string" && activeAssetCtaCopy.length > 0, "Content asset CTA fixture did not contain stable copy");
  await assetCtaRef.set({ copy: `${activeAssetCtaCopy} Changed after draft generation.`, updatedAt: timestampNow() }, { merge: true });
  await expectRejects("Content draft after CTA copy drift", () => reviewSignalDeskContentDistributionDraftServer(access, {
    approvalStatus: "approved",
    contentDraftId: drafts[0].contentDraftId,
    idempotencyKey: `content-review-stale-cta-${targetId}`,
    reviewReason: "A changed CTA must require fresh draft generation.",
  }), "CONTENT_DRAFT_CTA_STALE");
  await assetCtaRef.set({ copy: activeAssetCtaCopy, updatedAt: timestampNow() }, { merge: true });
  await assetCtaRef.set({ status: "hold", updatedAt: timestampNow() }, { merge: true });
  await expectRejects("Draft generation with inactive CTA", () => generateSignalDeskContentDistributionDraftsServer(access, {
    channels: ["email"],
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-drafts-inactive-cta-${targetId}`,
  }), "CONTENT_CTA_NOT_ACTIVE");
  await assetCtaRef.set({ status: "active", updatedAt: timestampNow() }, { merge: true });
  const reviewRevocationDrafts = await generateSignalDeskContentDistributionDraftsServer(access, {
    channels: ["email"],
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-drafts-review-revocation-${targetId}`,
  });
  await upsertSignalDeskProofPermissionServer(access, {
    evidenceRef: `consent-review-revoked:${targetId}`,
    idempotencyKey: `proof-permission-review-revoked-${targetId}`,
    proofPermissionId: permission.proofPermissionId,
    scopes: permission.scopes,
    status: "revoked",
    targetId,
  });
  const heldReviewRevocationDraft = await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS)
    .doc(reviewRevocationDrafts[0].contentDraftId)
    .get();
  const heldOriginalDraft = await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS)
    .doc(drafts[0].contentDraftId)
    .get();
  assert(
    heldReviewRevocationDraft.data()?.approvalStatus === "hold" && heldReviewRevocationDraft.data()?.status === "hold",
    "Proof-permission revocation did not hold its dependent pending draft",
  );
  assert(
    heldOriginalDraft.data()?.approvalStatus === "hold" && heldOriginalDraft.data()?.status === "hold",
    "Proof-permission revocation did not hold every dependent pending draft",
  );
  await expectRejects("Content review after permission revocation", () => reviewSignalDeskContentDistributionDraftServer(access, {
    approvalStatus: "approved",
    contentDraftId: reviewRevocationDrafts[0].contentDraftId,
    idempotencyKey: `content-review-permission-revoked-${targetId}`,
    reviewReason: "Revoked customer proof cannot be approved.",
  }), "CONTENT_DRAFT_ALREADY_REVIEWED");
  await upsertSignalDeskProofPermissionServer(access, {
    evidenceRef: `consent-review-restored:${targetId}`,
    grantedAt: nextProofGrantIso(),
    idempotencyKey: `proof-permission-review-restored-${targetId}`,
    proofPermissionId: permission.proofPermissionId,
    scopes: permission.scopes,
    status: "active",
    targetId,
  });
  await reviewSignalDeskContentAssetServer(access, {
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-asset-review-after-review-revocation-${targetId}`,
    reason: "Founder restored readiness after proof permission was restored.",
    status: "ready",
  });
  const scheduleRevocationDrafts = await generateSignalDeskContentDistributionDraftsServer(access, {
    channels: ["newsletter"],
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-drafts-schedule-revocation-${targetId}`,
  });
  await reviewSignalDeskContentDistributionDraftServer(access, {
    approvalStatus: "approved",
    contentDraftId: scheduleRevocationDrafts[0].contentDraftId,
    idempotencyKey: `content-review-before-schedule-revocation-${targetId}`,
    reviewReason: "Approved before the permission revocation fixture.",
  });
  await upsertSignalDeskProofPermissionServer(access, {
    evidenceRef: `consent-schedule-revoked:${targetId}`,
    idempotencyKey: `proof-permission-schedule-revoked-${targetId}`,
    proofPermissionId: permission.proofPermissionId,
    scopes: permission.scopes,
    status: "revoked",
    targetId,
  });
  const heldScheduleRevocationDraft = await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS)
    .doc(scheduleRevocationDrafts[0].contentDraftId)
    .get();
  assert(
    heldScheduleRevocationDraft.data()?.approvalStatus === "hold" && heldScheduleRevocationDraft.data()?.status === "hold",
    "Proof-permission revocation did not hold its dependent approved draft",
  );
  await expectRejects("Content scheduling after permission revocation", () => scheduleSignalDeskContentDistributionDraftServer(access, {
    contentDraftId: scheduleRevocationDrafts[0].contentDraftId,
    idempotencyKey: `content-schedule-permission-revoked-${targetId}`,
    scheduledFor: futureIso(2),
    status: "queued",
  }), "Content draft must be approved before scheduling");
  await upsertSignalDeskProofPermissionServer(access, {
    evidenceRef: `consent-schedule-restored:${targetId}`,
    grantedAt: nextProofGrantIso(),
    idempotencyKey: `proof-permission-schedule-restored-${targetId}`,
    proofPermissionId: permission.proofPermissionId,
    scopes: permission.scopes,
    status: "active",
    targetId,
  });
  await reviewSignalDeskContentAssetServer(access, {
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-asset-review-after-schedule-revocation-${targetId}`,
    reason: "Founder restored readiness after the schedule permission fixture.",
    status: "ready",
  });
  const priorMainDraft = drafts[0];
  const [restoredMainDraft] = await generateSignalDeskContentDistributionDraftsServer(access, {
    channels: [priorMainDraft.channel],
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-drafts-after-proof-restoration-${targetId}`,
  });
  assert(
    restoredMainDraft.revision === priorMainDraft.revision + 1
      && restoredMainDraft.supersedesContentDraftId === priorMainDraft.contentDraftId,
    "Restored proof authority did not require a fresh versioned content draft",
  );
  drafts[0] = restoredMainDraft;
  const priorCalendarlessDraft = scheduleRevocationDrafts[0];
  const [calendarlessDraft] = await generateSignalDeskContentDistributionDraftsServer(access, {
    channels: [priorCalendarlessDraft.channel],
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-drafts-calendar-evidence-${targetId}`,
  });
  assert(
    calendarlessDraft.revision === priorCalendarlessDraft.revision + 1
      && calendarlessDraft.supersedesContentDraftId === priorCalendarlessDraft.contentDraftId,
    "Calendar evidence fixture did not use a fresh versioned draft",
  );
  await reviewSignalDeskContentDistributionDraftServer(access, {
    approvalStatus: "approved",
    contentDraftId: calendarlessDraft.contentDraftId,
    idempotencyKey: `content-review-calendar-evidence-${targetId}`,
    reviewReason: "Approve the isolated calendar evidence fixture.",
  });
  scheduleRevocationDrafts[0] = calendarlessDraft;
  const contentReviewInput = {
    approvalStatus: "approved",
    contentDraftId: drafts[0].contentDraftId,
    idempotencyKey: `content-review-${targetId}`,
    reviewReason: "Approved for deterministic schedule testing.",
  };
  const contentReviewQueueRef = db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.QUEUES);
  await contentReviewQueueRef.delete();
  const queueBeforeContentReview = await db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.QUEUES).get();
  const humanReviewBeforeContentReview = Number(queueBeforeContentReview.data()?.humanReview || 0);
  const contentReviewCostBefore = await readContentWriteEstimate();
  const contentReviewDraftRef = db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS)
    .doc(contentReviewInput.contentDraftId);
  await contentReviewDraftRef.set({ legacyPrivate: "remove-on-authoritative-review" }, { merge: true });
  const [reviewedDraft, reviewedDraftReplay] = await Promise.all([
    reviewSignalDeskContentDistributionDraftServer(access, contentReviewInput),
    reviewSignalDeskContentDistributionDraftServer(access, contentReviewInput),
  ]);
  assert(
    await readContentWriteEstimate() === contentReviewCostBefore + 6,
    "Concurrent content-draft review did not report its exact six-write effect set once",
  );
  assert(reviewedDraft.contentDraftId === reviewedDraftReplay.contentDraftId, "Concurrent content review did not converge");
  const reviewedDraftPersistence = (await contentReviewDraftRef.get()).data();
  assert(!Object.prototype.hasOwnProperty.call(reviewedDraftPersistence || {}, "legacyPrivate"), "Content review retained a stale private draft field");
  assert(reviewedDraftPersistence?.createdAt?.toDate, "Content review converted persisted draft creation time away from Firestore Timestamp");
  assert(reviewedDraftPersistence?.latestContentDraftId === contentReviewInput.contentDraftId, "Content review lost validated draft-head identity");
  const contentReviewClaimRef = db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS)
    .doc(`content_review_${hashValue(`${access.userId}|${contentReviewInput.idempotencyKey}`)}`);
  const contentReviewClaim = (await contentReviewClaimRef.get()).data();
  assert(contentReviewClaim, "Content-review replay claim was not persisted");
  await contentReviewClaimRef.set({ operation: "content_distribution_draft_schedule" }, { merge: true });
  await expectRejects("Wrong-operation content-review claim", () => reviewSignalDeskContentDistributionDraftServer(access, contentReviewInput), "CONTENT_REVIEW_IDEMPOTENCY_CONFLICT");
  await contentReviewClaimRef.set(contentReviewClaim);
  await contentReviewClaimRef.set({ entityId: scheduleRevocationDrafts[0].contentDraftId }, { merge: true });
  await expectRejects("Redirected content-review claim", () => reviewSignalDeskContentDistributionDraftServer(access, contentReviewInput), "CONTENT_REVIEW_IDEMPOTENCY_CONFLICT");
  await contentReviewClaimRef.set(contentReviewClaim);
  const queueAfterContentReview = await db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.QUEUES).get();
  assert(Number(queueAfterContentReview.data()?.humanReview || 0) === humanReviewBeforeContentReview - 1, "Concurrent content review did not settle the human-review queue exactly once");
  assert(queueAfterContentReview.data()?.queueSummaryId === SIGNALDESK_SUMMARY_DOCS.QUEUES, "Content review recreated queue truth without canonical identity");
  assert(projectSignalDeskQueueDocument(queueAfterContentReview.data(), queueAfterContentReview.id), "Content-review-created queue truth was unreadable by the overview projector");
  await expectRejects("Conflicting content review key reuse", () => reviewSignalDeskContentDistributionDraftServer(access, { ...contentReviewInput, approvalStatus: "rejected" }), "CONTENT_REVIEW_IDEMPOTENCY_CONFLICT");
  const contentReviewAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.action === "content_distribution_draft_review" && data.entityId === drafts[0].contentDraftId);
  assert(contentReviewAuditCount === 1, "Concurrent content review duplicated audit effects");
  const scheduleInput = {
    contentDraftId: drafts[0].contentDraftId,
    idempotencyKey: `content-schedule-${targetId}`,
    scheduledFor: futureIso(2),
    status: "queued",
  };
  const contentScheduleCostBefore = await readContentWriteEstimate();
  const [calendarItem, calendarReplay] = await Promise.all([
    scheduleSignalDeskContentDistributionDraftServer(access, scheduleInput),
    scheduleSignalDeskContentDistributionDraftServer(access, scheduleInput),
  ]);
  assert(
    await readContentWriteEstimate() === contentScheduleCostBefore + 6,
    "Concurrent content scheduling did not report its exact six-write effect set once",
  );
  assert(calendarItem.contentCalendarItemId === calendarReplay.contentCalendarItemId, "Concurrent content scheduling did not converge");
  const contentScheduleClaimRef = db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS)
    .doc(`content_schedule_${hashValue(`${access.userId}|${scheduleInput.idempotencyKey}`)}`);
  const contentScheduleClaim = (await contentScheduleClaimRef.get()).data();
  assert(contentScheduleClaim, "Content-schedule replay claim was not persisted");
  await contentScheduleClaimRef.set({ actorId: "other-signaldesk-actor" }, { merge: true });
  await expectRejects("Wrong-actor content-schedule claim", () => scheduleSignalDeskContentDistributionDraftServer(access, scheduleInput), "CONTENT_SCHEDULE_IDEMPOTENCY_CONFLICT");
  await contentScheduleClaimRef.set(contentScheduleClaim);
  await contentScheduleClaimRef.set({ entityId: "content_calendar_other_valid_entity" }, { merge: true });
  await expectRejects("Redirected content-schedule claim", () => scheduleSignalDeskContentDistributionDraftServer(access, scheduleInput), "CONTENT_SCHEDULE_IDEMPOTENCY_CONFLICT");
  await contentScheduleClaimRef.set(contentScheduleClaim);
  const contentScheduleAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.action === "content_distribution_draft_schedule" && data.entityId === drafts[0].contentDraftId);
  assert(contentScheduleAuditCount === 1, "Concurrent content scheduling duplicated audit effects");
  const contentCalendarRef = db.collection(SIGNALDESK_COLLECTIONS.CONTENT_CALENDAR_ITEMS)
    .doc(calendarItem.contentCalendarItemId);
  await contentCalendarRef.set({ legacyPrivate: "remove-on-authoritative-reschedule" }, { merge: true });
  await scheduleSignalDeskContentDistributionDraftServer(access, {
    ...scheduleInput,
    idempotencyKey: `content-schedule-normalize-${targetId}`,
    scheduledFor: futureIso(3),
  });
  const normalizedCalendarPersistence = (await contentCalendarRef.get()).data();
  assert(!Object.prototype.hasOwnProperty.call(normalizedCalendarPersistence || {}, "legacyPrivate"), "Content scheduling retained a stale private calendar field");
  assert(normalizedCalendarPersistence?.createdAt?.toDate, "Content scheduling converted persisted calendar creation time away from Firestore Timestamp");
  await expectRejects("Conflicting content schedule key reuse", () => scheduleSignalDeskContentDistributionDraftServer(access, { ...scheduleInput, status: "hold" }), "CONTENT_SCHEDULE_IDEMPOTENCY_CONFLICT");
  await expectRejects("Queued content draft regeneration", () => generateSignalDeskContentDistributionDraftsServer(access, {
    channels: [drafts[0].channel],
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-drafts-queued-regeneration-${targetId}`,
  }), "CONTENT_DRAFT_ALREADY_EXISTS");
  await expectRejects("Held content asset performance", () => recordSignalDeskContentPerformanceServer(access, {
    activations: 0,
    channel: "blog",
    clicks: 0,
    contentAssetId: riskHeldAsset.contentAssetId,
    currentListSubmissions: 0,
    engagementQuality: "low",
    idempotencyKey: `content-performance-held-${targetId}`,
    ownerLeads: 0,
    views: 0,
  }), "Content asset is not ready");
  await expectRejects("Archived content asset performance", () => recordSignalDeskContentPerformanceServer(access, {
    activations: 0,
    channel: "blog",
    clicks: 0,
    contentAssetId: founderArchivedAsset.contentAssetId,
    currentListSubmissions: 0,
    engagementQuality: "low",
    idempotencyKey: `content-performance-archived-${targetId}`,
    ownerLeads: 0,
    views: 0,
  }), "Content asset is not ready");
  const performancePublishedAt = new Date().toISOString();
  const performancePublicationUrl = `https://example.test/published/${drafts[0].contentDraftId}`;
  await expectRejects("Pending content draft performance", () => recordSignalDeskContentPerformanceServer(access, {
    activations: 0,
    channel: reviewRevocationDrafts[0].channel,
    clicks: 0,
    contentAssetId: asset.contentAssetId,
    contentDraftId: reviewRevocationDrafts[0].contentDraftId,
    currentListSubmissions: 0,
    engagementQuality: "low",
    idempotencyKey: `content-performance-pending-draft-${targetId}`,
    ownerLeads: 0,
    publicationUrl: `https://example.test/published/${reviewRevocationDrafts[0].contentDraftId}`,
    publishedAt: performancePublishedAt,
    views: 1,
  }), "CONTENT_PERFORMANCE_DRAFT_NOT_APPROVED");
  await expectRejects("Nonzero content performance without publication evidence", () => recordSignalDeskContentPerformanceServer(access, {
    activations: 0,
    channel: drafts[0].channel,
    clicks: 0,
    contentAssetId: asset.contentAssetId,
    contentDraftId: drafts[0].contentDraftId,
    currentListSubmissions: 0,
    engagementQuality: "low",
    idempotencyKey: `content-performance-no-publication-${targetId}`,
    ownerLeads: 0,
    views: 1,
  }), "CONTENT_PERFORMANCE_PUBLICATION_EVIDENCE_REQUIRED");
  await expectRejects("Content performance with future publication time", () => recordSignalDeskContentPerformanceServer(access, {
    activations: 0,
    channel: drafts[0].channel,
    clicks: 0,
    contentAssetId: asset.contentAssetId,
    contentDraftId: drafts[0].contentDraftId,
    currentListSubmissions: 0,
    engagementQuality: "low",
    idempotencyKey: `content-performance-future-publication-${targetId}`,
    ownerLeads: 0,
    publicationUrl: performancePublicationUrl,
    publishedAt: futureIso(2),
    views: 1,
  }), "CONTENT_PERFORMANCE_PUBLISHED_AT_INVALID");
  await expectRejects("Published performance without approved draft", () => recordSignalDeskContentPerformanceServer(access, {
    activations: 0,
    channel: "blog",
    clicks: 0,
    contentAssetId: urlLessAssetA.contentAssetId,
    currentListSubmissions: 0,
    engagementQuality: "low",
    idempotencyKey: `content-performance-no-draft-${targetId}`,
    ownerLeads: 0,
    publicationUrl: `https://example.test/published/${urlLessAssetA.contentAssetId}`,
    publishedAt: performancePublishedAt,
    views: 1,
  }), "CONTENT_PERFORMANCE_PUBLICATION_DRAFT_REQUIRED");
  await expectRejects("Published performance without calendar evidence", () => recordSignalDeskContentPerformanceServer(access, {
    activations: 0,
    channel: scheduleRevocationDrafts[0].channel,
    clicks: 0,
    contentAssetId: asset.contentAssetId,
    contentDraftId: scheduleRevocationDrafts[0].contentDraftId,
    currentListSubmissions: 0,
    engagementQuality: "low",
    idempotencyKey: `content-performance-no-calendar-${targetId}`,
    ownerLeads: 0,
    publicationUrl: `https://example.test/published/${scheduleRevocationDrafts[0].contentDraftId}`,
    publishedAt: performancePublishedAt,
    views: 1,
  }), "CONTENT_PERFORMANCE_CALENDAR_REQUIRED");
  const unscheduledCalendarId = `content_calendar_${scheduleRevocationDrafts[0].contentDraftId}`;
  const unscheduledCalendarRef = db.collection(SIGNALDESK_COLLECTIONS.CONTENT_CALENDAR_ITEMS).doc(unscheduledCalendarId);
  await unscheduledCalendarRef.set(contentCalendarFixture(
    scheduleRevocationDrafts[0].contentDraftId,
    asset.contentAssetId,
    { channel: "x", status: "queued" },
  ));
  await expectRejects("Published performance with mismatched calendar", () => recordSignalDeskContentPerformanceServer(access, {
    activations: 0,
    channel: scheduleRevocationDrafts[0].channel,
    clicks: 0,
    contentAssetId: asset.contentAssetId,
    contentDraftId: scheduleRevocationDrafts[0].contentDraftId,
    currentListSubmissions: 0,
    engagementQuality: "low",
    idempotencyKey: `content-performance-calendar-mismatch-${targetId}`,
    ownerLeads: 0,
    publicationUrl: `https://example.test/published/${scheduleRevocationDrafts[0].contentDraftId}`,
    publishedAt: performancePublishedAt,
    views: 1,
  }), "CONTENT_PERFORMANCE_CALENDAR_MISMATCH");
  await unscheduledCalendarRef.set({ channel: scheduleRevocationDrafts[0].channel, status: "held", updatedAt: timestampNow() }, { merge: true });
  await expectRejects("Published performance with held calendar", () => recordSignalDeskContentPerformanceServer(access, {
    activations: 0,
    channel: scheduleRevocationDrafts[0].channel,
    clicks: 0,
    contentAssetId: asset.contentAssetId,
    contentDraftId: scheduleRevocationDrafts[0].contentDraftId,
    currentListSubmissions: 0,
    engagementQuality: "low",
    idempotencyKey: `content-performance-calendar-held-${targetId}`,
    ownerLeads: 0,
    publicationUrl: `https://example.test/published/${scheduleRevocationDrafts[0].contentDraftId}`,
    publishedAt: performancePublishedAt,
    views: 1,
  }), "CONTENT_PERFORMANCE_CALENDAR_NOT_READY");
  await unscheduledCalendarRef.delete();
  const zeroMetricPerformance = await recordSignalDeskContentPerformanceServer(access, {
    activations: 0,
    channel: "blog",
    clicks: 0,
    contentAssetId: urlLessAssetA.contentAssetId,
    currentListSubmissions: 0,
    engagementQuality: "low",
    idempotencyKey: `content-performance-zero-metric-${targetId}`,
    ownerLeads: 0,
    views: 0,
  });
  assert(zeroMetricPerformance.contentPerformanceId, "Zero-metric content observation without publication evidence was rejected");
  await expectRejects("Content publication predating asset, draft, and calendar authority", () => recordSignalDeskContentPerformanceServer(access, {
    activations: 0,
    channel: drafts[0].channel,
    clicks: 1,
    contentAssetId: asset.contentAssetId,
    contentDraftId: drafts[0].contentDraftId,
    currentListSubmissions: 0,
    engagementQuality: "low",
    idempotencyKey: `content-performance-predates-authority-${targetId}`,
    ownerLeads: 0,
    publicationUrl: `${performancePublicationUrl}-predates-authority`,
    publishedAt: pastIso(),
    views: 1,
  }), "CONTENT_PERFORMANCE_PREDATES_AUTHORITY");
  const approvedDraftPerformanceInput = {
    activations: 0,
    channel: drafts[0].channel,
    clicks: 2,
    contentAssetId: asset.contentAssetId,
    contentDraftId: drafts[0].contentDraftId,
    currentListSubmissions: 0,
    engagementQuality: "medium",
    idempotencyKey: `content-performance-approved-draft-${targetId}`,
    ownerLeads: 1,
    publicationUrl: performancePublicationUrl,
    publishedAt: performancePublishedAt,
    views: 30,
  };
  const approvedDraftPerformance = await recordSignalDeskContentPerformanceServer(access, approvedDraftPerformanceInput);
  assert(approvedDraftPerformance.contentPerformanceId, "Approved content draft performance was not recorded");
  assert(approvedDraftPerformance.publicationUrl === performancePublicationUrl, "Approved content draft performance lost publication provenance");
  const contentPerformanceClaimRef = db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS)
    .doc(`content_performance_${hashValue(`${access.userId}|${approvedDraftPerformanceInput.idempotencyKey}`)}`);
  const contentPerformanceClaim = (await contentPerformanceClaimRef.get()).data();
  assert(contentPerformanceClaim, "Content-performance replay claim was not persisted");
  await contentPerformanceClaimRef.set({ pId: "ML" }, { merge: true });
  await expectRejects("Wrong-product content-performance claim", () => recordSignalDeskContentPerformanceServer(access, approvedDraftPerformanceInput), "CONTENT_PERFORMANCE_IDEMPOTENCY_CONFLICT");
  await contentPerformanceClaimRef.set(contentPerformanceClaim);
  const contentPerformanceRef = db.collection(SIGNALDESK_COLLECTIONS.CONTENT_PERFORMANCE_SUMMARIES)
    .doc(approvedDraftPerformance.contentPerformanceId);
  const contentPerformanceSnapshot = (await contentPerformanceRef.get()).data();
  assert(contentPerformanceSnapshot, "Content-performance replay result was not persisted");
  await contentPerformanceRef.set({ views: approvedDraftPerformanceInput.views + 1 }, { merge: true });
  await expectRejects("Request-inconsistent content-performance replay result", () => recordSignalDeskContentPerformanceServer(access, approvedDraftPerformanceInput), "CONTENT_PERFORMANCE_IDEMPOTENCY_CONFLICT");
  await contentPerformanceRef.set(contentPerformanceSnapshot);
  const distributedAssetSnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(asset.contentAssetId).get();
  assert(distributedAssetSnap.data()?.status === "distributed", "Approved content draft performance did not mark the asset distributed");
  const publishedDraftSnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(drafts[0].contentDraftId).get();
  const publishedCalendarSnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_CALENDAR_ITEMS).doc(calendarItem.contentCalendarItemId).get();
  assert(publishedDraftSnap.data()?.status === "published", "Approved content draft performance did not mark the draft published");
  assert(publishedCalendarSnap.data()?.status === "published", "Approved content draft performance did not mark the calendar item published");
  assert(publishedCalendarSnap.data()?.publicationUrl === performancePublicationUrl, "Approved content draft performance lost publication URL evidence");
  assert(publishedCalendarSnap.data()?.publishedAt?.toDate?.().toISOString() === performancePublishedAt, "Approved content draft performance lost publication timestamp evidence");
  await expectRejects("Published content draft regeneration", () => generateSignalDeskContentDistributionDraftsServer(access, {
    channels: [drafts[0].channel],
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-drafts-published-regeneration-${targetId}`,
  }), "CONTENT_DRAFT_ALREADY_EXISTS");
  const heldDistributedAsset = await reviewSignalDeskContentAssetServer(access, {
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-asset-review-distributed-hold-${targetId}`,
    reason: "Temporarily hold a previously distributed asset without erasing publication truth.",
    status: "hold",
  });
  assert(heldDistributedAsset.status === "hold", "Distributed content asset could not enter a conservative hold");
  const heldDistributedAssetSnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(asset.contentAssetId).get();
  const heldDistributedIncidentId = heldDistributedAssetSnap.data()?.publicationReviewIncidentId;
  assert(heldDistributedAssetSnap.data()?.publicationReviewRequired === true && heldDistributedIncidentId, "Published content hold did not create a durable review incident");
  const restoredDistributedAsset = await reviewSignalDeskContentAssetServer(access, {
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-asset-review-distributed-restore-${targetId}`,
    reason: "Restore current authority while preserving durable publication truth.",
    status: "ready",
  });
  assert(restoredDistributedAsset.status === "distributed", "Published content asset restoration erased distributed truth");
  const restoredDistributedAssetSnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(asset.contentAssetId).get();
  const resolvedDistributedIncidentSnap = await db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS).doc(heldDistributedIncidentId).get();
  assert(restoredDistributedAssetSnap.data()?.publicationReviewRequired === false, "Published content review marker was not cleared after explicit restoration");
  assert(resolvedDistributedIncidentSnap.data()?.status === "resolved", "Published content review incident was not resolved after explicit restoration");
  await expectRejects("Published content performance evidence mismatch", () => recordSignalDeskContentPerformanceServer(access, {
    activations: 0,
    channel: drafts[0].channel,
    clicks: 1,
    contentAssetId: asset.contentAssetId,
    contentDraftId: drafts[0].contentDraftId,
    currentListSubmissions: 0,
    engagementQuality: "medium",
    idempotencyKey: `content-performance-publication-mismatch-${targetId}`,
    ownerLeads: 0,
    publicationUrl: `${performancePublicationUrl}-changed`,
    publishedAt: performancePublishedAt,
    views: 1,
  }), "CONTENT_PERFORMANCE_PUBLICATION_MISMATCH");
  const publishedAssetId = asset.contentAssetId;
  const pauseSafetyAsset = await createSignalDeskContentAssetServer(access, {
    ...contentAssetInput,
    idempotencyKey: `content-asset-pause-safety-${targetId}`,
    title: "Permissioned pause safety proof",
  });
  assert(pauseSafetyAsset.status === "ready", "Unpublished pause safety asset was not ready before the pause fixture");
  asset = pauseSafetyAsset;
  const pausedSafetyDrafts = await generateSignalDeskContentDistributionDraftsServer(access, {
    channels: ["x", "partner-brief", "short-video"],
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-drafts-pause-safety-${targetId}`,
  });
  const pausedHoldDraft = pausedSafetyDrafts.find((draft) => draft.channel === "x");
  const pausedRejectDraft = pausedSafetyDrafts.find((draft) => draft.channel === "partner-brief");
  const pausedScheduleDraft = pausedSafetyDrafts.find((draft) => draft.channel === "short-video");
  assert(pausedHoldDraft && pausedRejectDraft && pausedScheduleDraft, "Paused content safety fixtures did not preserve their channel identities");
  await reviewSignalDeskContentDistributionDraftServer(access, {
    approvalStatus: "approved",
    contentDraftId: pausedScheduleDraft.contentDraftId,
    idempotencyKey: `content-review-pause-schedule-${targetId}`,
    reviewReason: "Approved before the pause fixture so a conservative schedule hold remains available.",
  });
  const contentPauseRef = db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc("scope_content-distribution");
  await contentPauseRef.set(activeKillSwitchFixture("content-distribution"));
  const activeContentPauseSnap = await contentPauseRef.get();
  assert(activeContentPauseSnap.data()?.status === "active", "Content pause fixture was not active before settlement");
  const queueBeforePausedDraftSafety = await db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.QUEUES).get();
  const humanReviewBeforePausedDraftSafety = Number(queueBeforePausedDraftSafety.data()?.humanReview || 0);
  const pausedHeldDraft = await reviewSignalDeskContentDistributionDraftServer(access, {
    approvalStatus: "hold",
    contentDraftId: pausedHoldDraft.contentDraftId,
    idempotencyKey: `content-review-paused-hold-${targetId}`,
    reviewReason: "A global pause must still allow a conservative draft hold.",
  });
  assert(pausedHeldDraft.status === "hold", "Paused content review did not persist a conservative hold");
  const pausedRejectedDraft = await reviewSignalDeskContentDistributionDraftServer(access, {
    approvalStatus: "rejected",
    contentDraftId: pausedRejectDraft.contentDraftId,
    idempotencyKey: `content-review-paused-rejected-${targetId}`,
    reviewReason: "A global pause must still allow a draft rejection.",
  });
  assert(pausedRejectedDraft.status === "rejected", "Paused content review did not persist a rejection");
  const queueAfterPausedDraftSafety = await db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.QUEUES).get();
  assert(Number(queueAfterPausedDraftSafety.data()?.humanReview || 0) === humanReviewBeforePausedDraftSafety - 2, "Paused draft safety decisions did not settle human review exactly once per pending draft");
  const pausedCalendar = await scheduleSignalDeskContentDistributionDraftServer(access, {
    contentDraftId: pausedScheduleDraft.contentDraftId,
    idempotencyKey: `content-schedule-paused-hold-${targetId}`,
    scheduledFor: futureIso(2),
    status: "hold",
  });
  assert(pausedCalendar.status === "held", "Paused content scheduling did not persist a conservative hold");
  for (const status of ["inactive", "hold", "blocked"]) {
    const pausedSource = await upsertSignalDeskContentSourceServer(access, {
      ...contentSourceInput,
      idempotencyKey: `content-source-paused-${status}-${targetId}`,
      status,
    });
    assert(pausedSource.status === status, `Paused content source did not accept the safety-reducing ${status} state`);
  }

  await expectRejects("Paused content source activation", () => upsertSignalDeskContentSourceServer(access, { ...contentSourceInput, idempotencyKey: `content-source-paused-active-${targetId}` }), "Content distribution is paused");
  await expectRejects("Paused content asset settlement", () => createSignalDeskContentAssetServer(access, { ...contentAssetInput, idempotencyKey: `content-asset-paused-${targetId}` }), "Content distribution is paused");
  await expectRejects("Paused content draft generation settlement", () => generateSignalDeskContentDistributionDraftsServer(access, { ...draftGenerationInput, channels: ["email"], idempotencyKey: `content-drafts-paused-${targetId}` }), "Content distribution is paused");
  await expectRejects("Paused content asset advancement", () => reviewSignalDeskContentAssetServer(access, {
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-asset-review-paused-ready-${targetId}`,
    reason: "A paused distribution rail cannot restore readiness.",
    status: "ready",
  }), "Content distribution is paused");
  await expectRejects("Paused content review settlement (advancement)", () => reviewSignalDeskContentDistributionDraftServer(access, {
    approvalStatus: "approved",
    contentDraftId: pausedHoldDraft.contentDraftId,
    idempotencyKey: `content-review-paused-approved-${targetId}`,
    reviewReason: "A paused distribution rail cannot approve content.",
  }), "Content distribution is paused");
  await expectRejects("Paused content schedule settlement (advancement)", () => scheduleSignalDeskContentDistributionDraftServer(access, {
    contentDraftId: pausedScheduleDraft.contentDraftId,
    idempotencyKey: `content-schedule-paused-queued-${targetId}`,
    scheduledFor: futureIso(2),
    status: "queued",
  }), "Content distribution is paused");
  await contentPauseRef.delete();
  const restoredSourceAfterPause = await upsertSignalDeskContentSourceServer(access, {
    ...contentSourceInput,
    idempotencyKey: `content-source-restored-after-pause-${targetId}`,
    status: "active",
  });
  assert(restoredSourceAfterPause.status === "active", "Content source did not return to active after the pause was lifted");
  const reviewMarkedPublishedAsset = await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(publishedAssetId).get();
  assert(
    reviewMarkedPublishedAsset.data()?.status === "distributed"
      && reviewMarkedPublishedAsset.data()?.publicationReviewRequired === true,
    "Published source-authority removal did not preserve truth and require review",
  );
  await expectRejects("Unresolved publication review draft generation", () => generateSignalDeskContentDistributionDraftsServer(access, {
    channels: ["other"],
    contentAssetId: publishedAssetId,
    idempotencyKey: `content-drafts-unresolved-publication-review-${targetId}`,
  }), "CONTENT_ASSET_PUBLICATION_REVIEW_REQUIRED");
  const restoredAssetAfterPause = await reviewSignalDeskContentAssetServer(access, {
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-asset-restored-after-pause-${targetId}`,
    reason: "Restore current source authority after the global distribution pause.",
    status: "ready",
  });
  assert(restoredAssetAfterPause.status === "ready", "Post-pause readiness restoration did not restore the unpublished safety asset");
  const revisionGenerationInput = {
    channels: [pausedHoldDraft.channel, pausedRejectDraft.channel],
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-drafts-versioned-regeneration-${targetId}`,
  };
  const revisedDrafts = await generateSignalDeskContentDistributionDraftsServer(access, revisionGenerationInput);
  const revisedDraftReplay = await generateSignalDeskContentDistributionDraftsServer(access, revisionGenerationInput);
  const previousDraftByChannel = new Map([
    [pausedHoldDraft.channel, pausedHeldDraft],
    [pausedRejectDraft.channel, pausedRejectedDraft],
  ]);
  for (const revisedDraft of revisedDrafts) {
    const previousDraft = previousDraftByChannel.get(revisedDraft.channel);
    assert(previousDraft, `Versioned content draft ${revisedDraft.channel} lost its predecessor`);
    assert(revisedDraft.contentDraftId !== previousDraft.contentDraftId, `Versioned content draft ${revisedDraft.channel} reused the prior ID`);
    assert(revisedDraft.revision === previousDraft.revision + 1, `Versioned content draft ${revisedDraft.channel} did not increment its revision`);
    assert(revisedDraft.supersedesContentDraftId === previousDraft.contentDraftId, `Versioned content draft ${revisedDraft.channel} did not link its predecessor`);
    assert(revisedDraft.status === "draft" && revisedDraft.approvalStatus === "pending", `Versioned content draft ${revisedDraft.channel} bypassed review`);
    const replayedDraft = revisedDraftReplay.find((candidate) => candidate.channel === revisedDraft.channel);
    assert(replayedDraft?.contentDraftId === revisedDraft.contentDraftId, `Versioned content draft ${revisedDraft.channel} replay returned a different ID`);
    const previousDraftSnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(previousDraft.contentDraftId).get();
    assert(previousDraftSnap.data()?.status === previousDraft.status, `Versioned content draft ${revisedDraft.channel} overwrote its predecessor status`);
    assert(previousDraftSnap.data()?.approvalStatus === previousDraft.approvalStatus, `Versioned content draft ${revisedDraft.channel} overwrote its predecessor approval`);
    assert(previousDraftSnap.data()?.revision === previousDraft.revision, `Versioned content draft ${revisedDraft.channel} overwrote its predecessor revision`);
    assert(previousDraftSnap.data()?.body === previousDraft.body, `Versioned content draft ${revisedDraft.channel} overwrote its predecessor copy`);
  }
  const revisedHeldDraft = revisedDrafts.find((draft) => draft.channel === pausedHoldDraft.channel);
  const revisedRejectedDraft = revisedDrafts.find((draft) => draft.channel === pausedRejectDraft.channel);
  assert(revisedHeldDraft && revisedRejectedDraft, "Versioned content draft settlement fixtures were incomplete");
  await reviewSignalDeskContentDistributionDraftServer(access, {
    approvalStatus: "hold",
    contentDraftId: revisedHeldDraft.contentDraftId,
    idempotencyKey: `content-review-versioned-hold-${targetId}`,
    reviewReason: "Settle the regenerated hold fixture without leaving review backlog.",
  });
  await reviewSignalDeskContentDistributionDraftServer(access, {
    approvalStatus: "rejected",
    contentDraftId: revisedRejectedDraft.contentDraftId,
    idempotencyKey: `content-review-versioned-rejected-${targetId}`,
    reviewReason: "Settle the regenerated rejection fixture without leaving review backlog.",
  });
  await upsertSignalDeskProofPermissionServer(access, {
    evidenceRef: `consent-narrowed:${targetId}`,
    idempotencyKey: `proof-permission-narrowed-${targetId}`,
    proofPermissionId: permission.proofPermissionId,
    scopes: ["business-name"],
    status: "active",
    targetId,
  });
  await expectRejects("Narrowed customer proof founder readiness", () => reviewSignalDeskContentAssetServer(access, {
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-asset-review-narrowed-${targetId}`,
    reason: "The narrowed permission no longer covers the asset proof scopes.",
    status: "ready",
  }), "PROOF_PERMISSION_SCOPE_NOT_ALLOWED");
  await expectRejects("Customer proof outside narrowed scope", () => generateSignalDeskContentDistributionDraftsServer(access, {
    channels: ["blog"],
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-drafts-narrowed-${targetId}`,
  }), "Content asset is not ready");
  await upsertSignalDeskProofPermissionServer(access, {
    evidenceRef: `consent-revoked:${targetId}`,
    idempotencyKey: `proof-permission-revoked-${targetId}`,
    proofPermissionId: permission.proofPermissionId,
    scopes: permission.scopes,
    status: "revoked",
    targetId,
  });
  await expectRejects("Revoked customer proof founder readiness", () => reviewSignalDeskContentAssetServer(access, {
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-asset-review-revoked-${targetId}`,
    reason: "Revoked customer proof cannot return to ready.",
    status: "ready",
  }), "PROOF_PERMISSION_REQUIRED");
  await expectRejects("Customer proof after revocation", () => generateSignalDeskContentDistributionDraftsServer(access, {
    channels: ["other"],
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-drafts-revoked-${targetId}`,
  }), "Content asset is not ready");

  const cascadeCtaInput = {
    copy: "Start a bounded owner-reviewed MenuList claim.",
    ctaType: "claim-start",
    idempotencyKey: `content-cta-cascade-create-${targetId}`,
    label: "Start claim",
    status: "active",
  };
  const [cascadeCta, cascadeCtaReplay] = await Promise.all([
    upsertSignalDeskSelfServiceCtaServer(access, cascadeCtaInput),
    upsertSignalDeskSelfServiceCtaServer(access, cascadeCtaInput),
  ]);
  assert(cascadeCta.ctaId === cascadeCtaReplay.ctaId, "Concurrent content CTA creation did not converge");
  await expectRejects("Conflicting content CTA key reuse", () => upsertSignalDeskSelfServiceCtaServer(access, {
    ...cascadeCtaInput,
    copy: "Changed copy must not reuse the original CTA claim.",
  }), "CONTENT_CTA_IDEMPOTENCY_CONFLICT");
  const ctaCascadeAsset = await createSignalDeskContentAssetServer(access, {
    ...ownedAssetInput,
    ctaId: cascadeCta.ctaId,
    idempotencyKey: `content-asset-cta-cascade-${targetId}`,
    title: "CTA authority cascade fixture",
  });
  const [ctaCascadeDraft] = await generateSignalDeskContentDistributionDraftsServer(access, {
    channels: ["other"],
    contentAssetId: ctaCascadeAsset.contentAssetId,
    idempotencyKey: `content-drafts-cta-cascade-${targetId}`,
  });
  const ctaHoldInput = {
    ...cascadeCtaInput,
    idempotencyKey: `content-cta-cascade-hold-${targetId}`,
    status: "hold",
  };
  const heldCascadeCta = await upsertSignalDeskSelfServiceCtaServer(access, ctaHoldInput);
  const heldCascadeCtaReplay = await upsertSignalDeskSelfServiceCtaServer(access, ctaHoldInput);
  assert(heldCascadeCta.status === "hold" && heldCascadeCtaReplay.status === "hold", "Content CTA hold replay did not preserve the safety decision");
  const [heldCtaAssetSnap, heldCtaDraftSnap] = await Promise.all([
    db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(ctaCascadeAsset.contentAssetId).get(),
    db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(ctaCascadeDraft.contentDraftId).get(),
  ]);
  assert(heldCtaAssetSnap.data()?.status === "hold", "Content CTA revocation did not hold its dependent asset");
  assert(heldCtaDraftSnap.data()?.status === "hold", "Content CTA revocation did not hold its dependent draft");
  const restoredCascadeCta = await upsertSignalDeskSelfServiceCtaServer(access, {
    ...cascadeCtaInput,
    idempotencyKey: `content-cta-cascade-restore-${targetId}`,
  });
  assert(restoredCascadeCta.status === "active", "Content CTA fixture was not restored after cascade verification");
  await reviewSignalDeskContentAssetServer(access, {
    contentAssetId: ctaCascadeAsset.contentAssetId,
    idempotencyKey: `content-asset-cta-cascade-restore-${targetId}`,
    reason: "Restore the dedicated CTA cascade asset after authority returned.",
    status: "ready",
  });
  await expectRejects("Held CTA cascade draft reopen", () => reviewSignalDeskContentDistributionDraftServer(access, {
    approvalStatus: "rejected",
    contentDraftId: ctaCascadeDraft.contentDraftId,
    idempotencyKey: `content-review-cta-cascade-settle-${targetId}`,
    reviewReason: "Settle the dedicated CTA cascade review fixture.",
  }), "CONTENT_DRAFT_ALREADY_REVIEWED");
}

async function assertContentAuthorityPublishedRemovalReconciliation() {
  const incidentIdFor = (authorityRef, assetId) => (
    `content_authority_removal_${hashValue(`${authorityRef.path}|${assetId}`).slice(0, 40)}`
  );
  const controlRef = db.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM);
  const controlCounts = async () => {
    const snap = await controlRef.get();
    return {
      incidentCount: Number(snap.data()?.incidentCount || 0),
      openIncidentCount: Number(snap.data()?.openIncidentCount || 0),
    };
  };
  const createSource = (suffix) => upsertSignalDeskContentSourceServer(access, {
    defaultAudience: "restaurant-owner",
    defaultMarketPodId: null,
    idempotencyKey: `authority-source-create-${suffix}`,
    sourceType: "manual",
    status: "active",
    title: `Authority source ${suffix}`,
  });
  const sourceInput = (source, suffix, status) => ({
    contentSourceId: source.contentSourceId,
    defaultAudience: source.defaultAudience,
    defaultMarketPodId: source.defaultMarketPodId,
    idempotencyKey: `authority-source-${status}-${suffix}`,
    sourceType: source.sourceType,
    status,
    title: source.title,
  });
  const markerAt = new Date(Date.now() - (5 * 60 * 1000));
  const dependencyAt = new Date(Date.now() - (30 * 60 * 1000));
  const scheduledAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() - (60 * 60 * 1000)));

  const source = await createSource("published-removal");
  const sourceRef = db.collection(SIGNALDESK_COLLECTIONS.CONTENT_SOURCES).doc(source.contentSourceId);
  const markerAssetId = "asset_authority_marker";
  const markerDraftId = "draft_authority_marker";
  const markerCalendarId = `content_calendar_${markerDraftId}`;
  const draftOnlyAssetId = "asset_authority_published_draft";
  const draftOnlyDraftId = "draft_authority_published_only";
  const calendarOnlyAssetId = "asset_authority_published_calendar";
  const calendarOnlyDraftId = "draft_authority_calendar_only";
  const calendarOnlyCalendarId = `content_calendar_${calendarOnlyDraftId}`;
  await Promise.all([
    db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(markerAssetId).set(contentAssetFixture(markerAssetId, {
      hasPublishedContent: true,
      lastPublicationUrl: "https://example.test/published/marker-newest",
      lastPublishedAt: admin.firestore.Timestamp.fromDate(markerAt),
      lastPublishedChannel: "linkedin",
      lastPublishedContentDraftId: markerDraftId,
      publicationStateVersion: 1,
      sourceId: source.contentSourceId,
      status: "distributed",
    })),
    db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(markerDraftId).set(contentDraftFixture(markerDraftId, markerAssetId, {
      approvalStatus: "approved",
      scheduledFor: scheduledAt,
      status: "published",
      updatedAt: admin.firestore.Timestamp.fromDate(dependencyAt),
    })),
    db.collection(SIGNALDESK_COLLECTIONS.CONTENT_CALENDAR_ITEMS).doc(markerCalendarId).set(contentCalendarFixture(markerDraftId, markerAssetId, {
      publicationUrl: "https://example.test/published/marker-older-calendar",
      publishedAt: admin.firestore.Timestamp.fromDate(dependencyAt),
      scheduledFor: scheduledAt,
      status: "published",
    })),
    db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(draftOnlyAssetId).set(contentAssetFixture(draftOnlyAssetId, {
      sourceId: source.contentSourceId,
      status: "ready",
    })),
    db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(draftOnlyDraftId).set(contentDraftFixture(draftOnlyDraftId, draftOnlyAssetId, {
      approvalStatus: "approved",
      scheduledFor: scheduledAt,
      status: "published",
      updatedAt: admin.firestore.Timestamp.fromDate(dependencyAt),
    })),
    db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(calendarOnlyAssetId).set(contentAssetFixture(calendarOnlyAssetId, {
      sourceId: source.contentSourceId,
      status: "ready",
    })),
    db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(calendarOnlyDraftId).set(contentDraftFixture(calendarOnlyDraftId, calendarOnlyAssetId)),
    db.collection(SIGNALDESK_COLLECTIONS.CONTENT_CALENDAR_ITEMS).doc(calendarOnlyCalendarId).set(contentCalendarFixture(calendarOnlyDraftId, calendarOnlyAssetId, {
      publicationUrl: "https://example.test/published/calendar-only",
      publishedAt: admin.firestore.Timestamp.fromDate(dependencyAt),
      scheduledFor: scheduledAt,
      status: "published",
    })),
  ]);
  await controlRef.delete();
  const firstCounts = await controlCounts();
  const firstHoldInput = sourceInput(source, "published-removal-1", "hold");
  await upsertSignalDeskContentSourceServer(access, firstHoldInput);
  const firstAuthority = await sourceRef.get();
  assert(firstAuthority.data()?.dependentHoldReconciliationPending === false, "Published authority reconciliation did not complete");
  assert(firstAuthority.data()?.lastDependentHoldReconciliationResult?.publicationReviewAssetCount === 3, "Published authority reconciliation lost asset-review count");
  assert(firstAuthority.data()?.lastDependentHoldReconciliationResult?.publishedIncidentCount === 3, "Published authority reconciliation lost incident count");
  const publishedAssetIds = [markerAssetId, draftOnlyAssetId, calendarOnlyAssetId];
  const firstIncidents = await Promise.all(publishedAssetIds.map(assetId => (
    db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS).doc(incidentIdFor(sourceRef, assetId)).get()
  )));
  const reviewedAssets = await Promise.all(publishedAssetIds.map(assetId => (
    db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(assetId).get()
  )));
  firstIncidents.forEach((incident, index) => {
    assert(incident.exists, `Published authority incident missing for ${publishedAssetIds[index]}`);
    assert(incident.data()?.status === "open" && incident.data()?.severity === "high", "Published authority incident was not high/open");
    assert(incident.data()?.authorityPath === sourceRef.path, "Published authority incident lost source identity");
  });
  reviewedAssets.forEach((asset) => assert(asset.data()?.publicationReviewRequired === true, "Published asset was not review-marked"));
  assert(reviewedAssets[0].data()?.status === "distributed", "Published marker asset lost distributed truth");
  assert((await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(draftOnlyDraftId).get()).data()?.status === "published", "Published draft truth was held");
  assert((await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_CALENDAR_ITEMS).doc(calendarOnlyCalendarId).get()).data()?.status === "published", "Published calendar truth was held");
  const markerIncident = firstIncidents[0].data();
  assert(markerIncident?.publicationEvidenceSource === "asset-marker", "Older dependency evidence downgraded the latest marker");
  assert(markerIncident?.publishedAt === markerAt.toISOString(), "Latest marker timestamp was not retained");
  const afterFirstCounts = await controlCounts();
  assert(afterFirstCounts.incidentCount === firstCounts.incidentCount + 3, "Published authority incident total was not exact");
  assert(afterFirstCounts.openIncidentCount === firstCounts.openIncidentCount + 3, "Published authority open count was not exact");
  const recreatedControlSnap = await controlRef.get();
  assert(recreatedControlSnap.data()?.controlRoomSummaryId === SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM, "Incident writer recreated control-room truth without canonical identity");
  assert(projectSignalDeskControlRoomDocument(recreatedControlSnap.data(), recreatedControlSnap.id), "Incident-created control-room truth was unreadable by the overview projector");

  await upsertSignalDeskContentSourceServer(access, firstHoldInput);
  const replayCounts = await controlCounts();
  assert(replayCounts.incidentCount === afterFirstCounts.incidentCount, "Published authority replay duplicated incident total");
  assert(replayCounts.openIncidentCount === afterFirstCounts.openIncidentCount, "Published authority replay duplicated open count");
  const resolveBatch = db.batch();
  firstIncidents.forEach(incident => resolveBatch.set(incident.ref, { status: "resolved" }, { merge: true }));
  resolveBatch.set(controlRef, { openIncidentCount: admin.firestore.FieldValue.increment(-3) }, { merge: true });
  await resolveBatch.commit();
  await upsertSignalDeskContentSourceServer(access, sourceInput(source, "published-removal-restore", "active"));
  await upsertSignalDeskContentSourceServer(access, sourceInput(source, "published-removal-2", "hold"));
  const reopenedCounts = await controlCounts();
  assert(reopenedCounts.incidentCount === afterFirstCounts.incidentCount, "Reopened published authority incident changed total count");
  assert(reopenedCounts.openIncidentCount === afterFirstCounts.openIncidentCount, "Published authority incidents did not reopen exactly once");
  const reopenedAuthority = await sourceRef.get();
  assert(reopenedAuthority.data()?.lastDependentHoldReconciliationResult?.publishedIncidentCount === 3, "Reopen reconciliation lost incident count");
  const reopenedMarkerIncident = await firstIncidents[0].ref.get();
  assert(reopenedMarkerIncident.data()?.publicationEvidenceSource === "asset-marker", "Reopen downgraded publication evidence");
  assert(reopenedMarkerIncident.data()?.publishedAt === markerAt.toISOString(), "Reopen changed the latest publication timestamp");

  const collisionSource = await createSource("collision-restart");
  const collisionSourceRef = db.collection(SIGNALDESK_COLLECTIONS.CONTENT_SOURCES).doc(collisionSource.contentSourceId);
  const collisionAssetId = "asset_authority_collision";
  await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(collisionAssetId).set(contentAssetFixture(collisionAssetId, {
    hasPublishedContent: true,
    lastPublishedAt: admin.firestore.Timestamp.fromDate(markerAt),
    publicationStateVersion: 1,
    sourceId: collisionSource.contentSourceId,
    status: "distributed",
  }));
  const collisionCounts = await controlCounts();
  await controlRef.set({ pId: "AL" }, { merge: true });
  const collisionHoldInput = sourceInput(collisionSource, "collision-restart-hold", "hold");
  await expectRejects("Content authority control product collision", () => (
    upsertSignalDeskContentSourceServer(access, collisionHoldInput)
  ), "CONTENT_AUTHORITY_CONTROL_ROOM_PRODUCT_MISMATCH");
  const pendingCollisionSource = await collisionSourceRef.get();
  const pendingCollisionToken = pendingCollisionSource.data()?.dependentHoldReconciliationToken;
  assert(pendingCollisionSource.data()?.dependentHoldReconciliationPending === true, "Failed content authority reconciliation lost restart state");
  assert(!(await db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS).doc(incidentIdFor(collisionSourceRef, collisionAssetId)).get()).exists, "Control collision partially created an incident");
  assert((await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(collisionAssetId).get()).data()?.publicationReviewRequired !== true, "Control collision partially marked an asset");
  await controlRef.set({ pId: "SD" }, { merge: true });
  const collisionIncidentRef = db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS)
    .doc(incidentIdFor(collisionSourceRef, collisionAssetId));
  await collisionIncidentRef.set({
    authorityId: collisionSourceRef.id,
    authorityPath: collisionSourceRef.path,
    contentAssetId: collisionAssetId,
    incidentId: collisionIncidentRef.id,
    incidentType: "content-authority-publication-removal-review",
    pId: "SD",
    severity: "low",
    status: "open",
  });
  await expectRejects("Content authority incident collision", () => (
    upsertSignalDeskContentSourceServer(access, collisionHoldInput)
  ), "CONTENT_AUTHORITY_INCIDENT_SHAPE_INVALID");
  const collisionAfterShapeFailure = await collisionSourceRef.get();
  assert(collisionAfterShapeFailure.data()?.dependentHoldReconciliationToken === pendingCollisionToken, "Incident collision replaced the restart token");
  assert(collisionAfterShapeFailure.data()?.dependentHoldReconciliationPending === true, "Incident collision cleared restart state");
  await collisionIncidentRef.delete();
  await upsertSignalDeskContentSourceServer(access, collisionHoldInput);
  const recoveredCollisionSource = await collisionSourceRef.get();
  assert(recoveredCollisionSource.data()?.dependentHoldReconciliationPending === false, "Content authority reconciliation did not recover from collision");
  assert(recoveredCollisionSource.data()?.lastDependentHoldReconciliationToken === pendingCollisionToken, "Content authority recovery changed token identity");
  const recoveredCollisionCounts = await controlCounts();
  assert(recoveredCollisionCounts.incidentCount === collisionCounts.incidentCount + 1, "Collision recovery incident total was not exact");
  assert(recoveredCollisionCounts.openIncidentCount === collisionCounts.openIncidentCount + 1, "Collision recovery open count was not exact");

  const schedulerPermissionId = "proof_permission_scheduler_owned_authority";
  const schedulerPermissionRef = db.collection(SIGNALDESK_COLLECTIONS.PROOF_PERMISSIONS).doc(schedulerPermissionId);
  const schedulerTargetId = "target_scheduler_owned_authority";
  const schedulerProgress = { phase: "assets", assetCursor: null, sentinel: "scheduler-owned" };
  await Promise.all([
    db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(schedulerTargetId).set({
      displayName: "Scheduler authority fixture",
      pId: "SD",
      targetId: schedulerTargetId,
    }),
    schedulerPermissionRef.set({
      dependentHoldReconciliationKind: "proof-permission-expiry-v1",
      dependentHoldReconciliationPending: true,
      dependentHoldReconciliationProgress: schedulerProgress,
      dependentHoldReconciliationToken: "scheduler_owned_token",
      evidenceRef: "scheduler-owned-evidence",
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + (24 * 60 * 60 * 1000))),
      grantedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - (24 * 60 * 60 * 1000))),
      pId: "SD",
      proofPermissionId: schedulerPermissionId,
      revokedAt: null,
      scopes: ["business-name"],
      status: "active",
      targetId: schedulerTargetId,
      targetName: "Scheduler authority fixture",
      updatedAt: timestampNow(),
    }),
  ]);
  await expectRejects("App reconciliation consuming scheduler-owned token", () => (
    upsertSignalDeskProofPermissionServer(access, {
      evidenceRef: "scheduler-owned-evidence",
      idempotencyKey: "scheduler-owned-authority-update",
      proofPermissionId: schedulerPermissionId,
      scopes: ["business-name"],
      status: "hold",
      targetId: schedulerTargetId,
    })
  ), "CONTENT_AUTHORITY_RECONCILIATION_PENDING");
  const schedulerPermission = await schedulerPermissionRef.get();
  assert(schedulerPermission.data()?.dependentHoldReconciliationKind === "proof-permission-expiry-v1", "App reconciliation replaced scheduler kind");
  assert(schedulerPermission.data()?.dependentHoldReconciliationToken === "scheduler_owned_token", "App reconciliation replaced scheduler token");
  assert(JSON.stringify(schedulerPermission.data()?.dependentHoldReconciliationProgress) === JSON.stringify(schedulerProgress), "App reconciliation replaced scheduler progress");

  const directCta = await upsertSignalDeskSelfServiceCtaServer(access, {
    copy: "Request a founder-reviewed route draft.",
    ctaType: "route-draft",
    idempotencyKey: "authority-direct-cta-create",
    label: "Request route draft",
    status: "active",
  });
  const directDraftAssetId = "asset_authority_direct_published_draft";
  const directDraftId = "draft_authority_direct_published";
  const directCalendarAssetId = "asset_authority_direct_published_calendar";
  const directCalendarDraftId = "draft_authority_direct_calendar";
  const directCalendarId = `content_calendar_${directCalendarDraftId}`;
  await Promise.all([
    db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(directDraftAssetId).set(contentAssetFixture(directDraftAssetId, { ctaId: null })),
    db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(directDraftId).set(contentDraftFixture(directDraftId, directDraftAssetId, {
      approvalStatus: "approved",
      ctaId: directCta.ctaId,
      scheduledFor: scheduledAt,
      status: "published",
      updatedAt: admin.firestore.Timestamp.fromDate(dependencyAt),
    })),
    db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(directCalendarAssetId).set(contentAssetFixture(directCalendarAssetId, { ctaId: null })),
    db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(directCalendarDraftId).set(contentDraftFixture(directCalendarDraftId, directCalendarAssetId, {
      ctaId: directCta.ctaId,
    })),
    db.collection(SIGNALDESK_COLLECTIONS.CONTENT_CALENDAR_ITEMS).doc(directCalendarId).set(contentCalendarFixture(directCalendarDraftId, directCalendarAssetId, {
      publicationUrl: "https://example.test/published/direct-calendar",
      publishedAt: admin.firestore.Timestamp.fromDate(dependencyAt),
      scheduledFor: scheduledAt,
      status: "published",
    })),
  ]);
  const directCounts = await controlCounts();
  await upsertSignalDeskSelfServiceCtaServer(access, {
    copy: directCta.copy,
    ctaType: directCta.ctaType,
    idempotencyKey: "authority-direct-cta-hold",
    label: directCta.label,
    status: "hold",
  });
  const directCtaSnap = await db.collection(SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS).doc(directCta.ctaId).get();
  assert(directCtaSnap.data()?.lastDependentHoldReconciliationResult?.publicationReviewAssetCount === 2, "Direct CTA reconciliation lost publication review count");
  assert(directCtaSnap.data()?.lastDependentHoldReconciliationResult?.publishedIncidentCount === 2, "Direct CTA reconciliation lost incident count");
  assert((await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(directDraftAssetId).get()).data()?.status === "ready", "Direct published-draft asset was held");
  assert((await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS).doc(directCalendarAssetId).get()).data()?.status === "ready", "Direct published-calendar asset was held");
  assert((await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(directDraftId).get()).data()?.status === "published", "Direct published draft was held");
  assert((await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_CALENDAR_ITEMS).doc(directCalendarId).get()).data()?.status === "published", "Direct published calendar was held");
  const afterDirectCounts = await controlCounts();
  assert(afterDirectCounts.incidentCount === directCounts.incidentCount + 2, "Direct CTA incident total was not exact");
  assert(afterDirectCounts.openIncidentCount === directCounts.openIncidentCount + 2, "Direct CTA open count was not exact");
}

async function assertSignedOutcomeBridge() {
  const policy = await createPolicy("Signed outcome bridge");
  const targetId = await importOne(policy.sourcePolicyId, "SignedBridge", { currentListUrl: "" });
  const fabricatedConversationRef = db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES)
    .doc(`conv_fabricated_${hashValue(targetId).slice(0, 20)}`);
  await fabricatedConversationRef.set({
    channel: "email",
    conversationId: fabricatedConversationRef.id,
    pId: SIGNALDESK_PRODUCT_CODE,
    state: "contacted",
    targetId,
    targetName: "Fabricated lineage",
    updatedAt: timestampNow(),
  });
  await expectRejects("Reply cannot attach to a non-current fabricated conversation", () => captureSignalDeskReplyServer(access, {
    conversationId: fabricatedConversationRef.id,
    idempotencyKey: `reply-fabricated-${targetId}`,
    message: "Stop and create incident effects.",
  }), "Reply conversation is not current for target");
  const fabricatedEffectCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGES, (data) => data.conversationId === fabricatedConversationRef.id);
  assert(fabricatedEffectCount === 0, "Fabricated reply lineage produced an inbound message effect");
  await fabricatedConversationRef.delete();
  const importedTarget = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).get();
  assert(importedTarget.data()?.sourceDataLifecycleState === "active", "Imported target did not receive active source-data authority");
  assert(importedTarget.data()?.sourceDataObservedAt?.toMillis?.(), "Imported target did not retain its source observation time");
  assert(
    importedTarget.data()?.sourceDataExpiresAt?.toMillis?.() === Date.parse(policy.expiresAt),
    "Imported target source-data expiry diverged from its source policy",
  );
  assert(importedTarget.data()?.sourcePolicyId === policy.sourcePolicyId, "Imported target lost its source-policy lineage");
  assert(importedTarget.data()?.sourceRunId, "Imported target lost its source-run lineage");
  await scoreSignalDeskTargetServer(access, targetId);
  await createSignalDeskEvidenceServer(access, targetId);
  await captureSignalDeskReplyServer(access, {
    conversationId: await replyConversationIdFor(targetId),
    idempotencyKey: `reply-route-${targetId}`,
    message: "Yes, please prepare the owner review route.",
  });
  await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).set({
    suppressionStatus: "suppressed",
    updatedAt: timestampNow(),
  }, { merge: true });
  await expectRejects("Route token after suppression", () => createSignalDeskRouteTokenServer(access, {
    channel: "email",
    idempotencyKey: `route-token-suppressed-${targetId}`,
    targetId,
  }), "Target is suppressed");
  await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).set({
    suppressionStatus: "clear",
    updatedAt: timestampNow(),
  }, { merge: true });
  const route = await createSignalDeskRouteTokenServer(access, {
    channel: "email",
    idempotencyKey: `route-token-${targetId}`,
    targetId,
  });
  const duplicateRoute = await createSignalDeskRouteTokenServer(access, {
    channel: "email",
    idempotencyKey: `route-token-${targetId}`,
    targetId,
  });
  assert(duplicateRoute.duplicate === true, "Route-token retry was not identified as a duplicate");
  assert(duplicateRoute.routeTokenId === route.routeTokenId, "Route-token retry changed the route identity");
  assert(duplicateRoute.token === route.token, "Route-token retry changed the one-time token material");
  await expectRejects("Conflicting route-token idempotency reuse", () => createSignalDeskRouteTokenServer(access, {
    channel: "manual",
    idempotencyKey: `route-token-${targetId}`,
    targetId,
  }), "ROUTE_TOKEN_IDEMPOTENCY_CONFLICT");
  const storedRoute = await db.collection(SIGNALDESK_COLLECTIONS.ROUTE_TOKENS).doc(route.routeTokenId).get();
  assert(storedRoute.exists, "Signed bridge route token record was not stored");
  assert(!storedRoute.data()?.token, "Raw invitation token was stored in Firestore");
  assert(storedRoute.data()?.tokenHash === hashValue(route.token), "Stored invitation token hash does not match");
  assert(storedRoute.data()?.scope === SIGNALDESK_OUTCOME_ROUTE_SCOPE, "Signed bridge route token scope was not stored");
  assert(storedRoute.data()?.sourceActionId === importedTarget.data()?.latestConversationId, "Signed bridge route token did not retain its exact interested-conversation attribution");
  assert(storedRoute.data()?.revokedAt === null, "New signed bridge route token was created revoked");
  await expectRejects("Invented route-token source action", () => createSignalDeskRouteTokenServer(access, {
    actionId: "invented_owner_action",
    channel: "email",
    idempotencyKey: `route-token-invented-action-${targetId}`,
    targetId,
  }), "ROUTE_TOKEN_SOURCE_ACTION_INVALID");

  const payload = {
    evidenceRef: `menulist-event:${targetId}`,
    eventId: `menulist_event_${targetId}`,
    outcomeType: "two_surface_activation",
    ownerQualifiedAt: storedRoute.data()?.ownerQualifiedAt.toDate().toISOString(),
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
    pId: "SD",
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
  const complaintInput = {
    conversationId: await replyConversationIdFor(targetId),
    idempotencyKey: `reply-complaint-${targetId}`,
    message: "This is an unwanted message and I am making a complaint.",
  };
  const complaintReplies = await Promise.all([
    captureSignalDeskReplyServer(access, complaintInput),
    captureSignalDeskReplyServer(access, complaintInput),
  ]);
  const [reply] = complaintReplies;
  assert(reply.state === "complaint", "Complaint reply was not classified as complaint");
  assert(complaintReplies.filter((result) => result.duplicate).length === 1, "Concurrent complaint reply capture did not converge on one durable event");
  await expectRejects("Reply idempotency changed input", () => captureSignalDeskReplyServer(access, {
    ...complaintInput,
    message: "This changed message must not reuse the same event key.",
  }), "Reply idempotency conflict");
  const suppressionCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER, (data) => data.targetId === targetId && data.reason === "complaint");
  assert(suppressionCount > 0, "Complaint did not create immediate suppression");
  const incidentCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.INCIDENTS, (data) => data.targetId === targetId && data.status === "open");
  assert(incidentCount === 1, "Complaint reply retry created duplicate incidents");
  const complaintMessageCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGES, (data) => data.targetId === targetId && data.direction === "inbound");
  assert(complaintMessageCount === 1, "Complaint reply retry created duplicate inbound messages");
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

async function assertInboxContracts() {
  const policy = await createPolicy("Inbox transition contracts");
  const targetId = await importOne(policy.sourcePolicyId, "InboxTransitions", { currentListUrl: "" });
  const conversationId = await replyConversationIdFor(targetId);
  const queueRef = db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.QUEUES);
  const backlog = async () => Number((await queueRef.get()).data()?.inboxBacklog || 0);
  const initialBacklog = await backlog();

  const interested = await captureSignalDeskReplyServer(access, {
    conversationId,
    idempotencyKey: `reply-inbox-interested-${targetId}`,
    message: "Yes, please send the details.",
  });
  assert(interested.state === "interested", "Inbox did not classify a positive reply as interested");
  assert(await backlog() === initialBacklog + 1, "Inbox actionable transition did not increment backlog exactly once");

  await captureSignalDeskReplyServer(access, {
    conversationId,
    idempotencyKey: `reply-inbox-interested-repeat-${targetId}`,
    message: "Yes, I am still interested.",
  });
  assert(await backlog() === initialBacklog + 1, "Repeated actionable reply inflated the inbox backlog");

  const notInterested = await captureSignalDeskReplyServer(access, {
    conversationId,
    idempotencyKey: `reply-inbox-not-interested-${targetId}`,
    message: "Not interested, thank you.",
  });
  assert(notInterested.state === "not_interested", "Manual capture diverged from signed-webhook not-interested classification");
  assert(await backlog() === initialBacklog, "Resolved reply did not decrement the inbox backlog exactly once");

  const safetyTargetId = await importOne(policy.sourcePolicyId, "InboxSafety", { currentListUrl: "" });
  const safetyConversationId = await replyConversationIdFor(safetyTargetId);
  const complaint = await captureSignalDeskReplyServer(access, {
    conversationId: safetyConversationId,
    idempotencyKey: `reply-inbox-complaint-${safetyTargetId}`,
    message: "This is an unwanted message and I am making a complaint.",
  });
  assert(complaint.state === "complaint", "Inbox complaint classification failed");
  const complaintBacklog = await backlog();
  const attemptedWeakening = await captureSignalDeskReplyServer(access, {
    conversationId: safetyConversationId,
    idempotencyKey: `reply-inbox-after-complaint-${safetyTargetId}`,
    message: "Yes, send more information.",
  });
  assert(attemptedWeakening.state === "complaint", "A later non-safety reply weakened the complaint conversation state");
  assert(await backlog() === complaintBacklog, "Safety-state preservation changed the inbox backlog");
  const safetyConversation = await db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES).doc(safetyConversationId).get();
  assert(safetyConversation.data()?.state === "complaint", "Persisted complaint state was weakened");
  const safetyTarget = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(safetyTargetId).get();
  assert(safetyTarget.data()?.suppressionStatus === "complaint", "Complaint suppression authority was weakened");
  const revenueAccountCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.REVENUE_ACCOUNTS, (data) => data.targetId === safetyTargetId);
  assert(revenueAccountCount === 0, "A reply behind a complaint safety state entered the revenue lifecycle");

  const priorityTargetId = await importOne(policy.sourcePolicyId, "InboxPriority", { currentListUrl: "" });
  const priorityConversationId = await replyConversationIdFor(priorityTargetId);
  await db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES).doc(priorityConversationId).set({
    lastMessagePreview: "Older actionable reply",
    state: "complaint",
    updatedAt: admin.firestore.Timestamp.fromMillis(Date.now() - 86_400_000),
  }, { merge: true });
  await Promise.all(Array.from({ length: 35 }, (_, index) => {
    const id = `conv_inbox_recent_terminal_${String(index).padStart(2, "0")}`;
    return db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES).doc(id).set({
      channel: "email",
      conversationId: id,
      lastMessagePreview: "Recent terminal history",
      pId: SIGNALDESK_PRODUCT_CODE,
      state: "interested",
      targetId: priorityTargetId,
      targetName: `Recent terminal ${index}`,
      updatedAt: admin.firestore.Timestamp.fromMillis(Date.now() + index),
    });
  }));
  const inboxWorkspace = await loadSignalDeskWorkspaceServer(access, "inbox");
  assert(
    inboxWorkspace.workspace.conversations.some((conversation) => conversation.conversationId === priorityConversationId),
    "Recent terminal history crowded an actionable conversation out of Inbox",
  );
}

async function assertProviderSendClaimAndRecovery() {
  const originalFlag = FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND;
  const originalProviderSend = signalDeskProviderAdapters.sendSignalDeskProviderMessage;
  const originalCreateTransport = nodemailer.createTransport;
  const originalFetch = global.fetch;
  const ownedEmailSenderRef = db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_owned-email_sender");
  const ownedEmailBudgetRef = db.collection(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES).doc("budget_provider_owned-email_default");
  const [originalOwnedEmailSenderSnap, originalOwnedEmailBudgetSnap] = await Promise.all([
    ownedEmailSenderRef.get(),
    ownedEmailBudgetRef.get(),
  ]);
  const envKeys = [
    "SIGNALDESK_SMTP_HOST",
    "SIGNALDESK_SMTP_USER",
    "SIGNALDESK_SMTP_PASS",
    "SIGNALDESK_SMTP_PORT",
    "SIGNALDESK_SMTP_SECURE",
    "SIGNALDESK_EMAIL_FROM",
    "SIGNALDESK_EMAIL_REPLY_TO",
    "SIGNALDESK_PHYSICAL_ADDRESS",
    "SIGNALDESK_UNSUBSCRIBE_URL",
    "SIGNALDESK_META_ACCESS_TOKEN",
    "SIGNALDESK_WHATSAPP_PHONE_NUMBER_ID",
  ];
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  try {
    FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND = true;
    const emailSpendDay = new Date().toISOString().slice(0, 10);
    const emailSpendMonth = emailSpendDay.slice(0, 7);
    await ownedEmailSenderRef.set({
      credentialState: "configured",
      dailyBudgetUsd: 0.04,
      monthlyBudgetUsd: 1,
      ownerApproved: true,
      perRunBudgetUsd: 0.01,
      spendDayKey: emailSpendDay,
      spendMonthKey: emailSpendMonth,
      spentMonthUsd: 0,
      spentTodayUsd: 0,
      status: "approved",
      updatedAt: timestampNow(),
    }, { merge: true });
    await ownedEmailBudgetRef.set({
      dailyBudgetUsd: 0.04,
      monthlyBudgetUsd: 1,
      perRunBudgetUsd: 0.01,
      spendDayKey: emailSpendDay,
      spendMonthKey: emailSpendMonth,
      spentMonthUsd: 0,
      spentTodayUsd: 0,
      status: "active",
      updatedAt: timestampNow(),
    }, { merge: true });
    for (const key of envKeys) process.env[key] = key === "SIGNALDESK_UNSUBSCRIBE_URL"
      ? "https://example.invalid/unsubscribe"
      : key === "SIGNALDESK_EMAIL_FROM"
        ? "MenuList <sender@example.invalid>"
        : key === "SIGNALDESK_SMTP_PORT"
          ? "587"
        : key === "SIGNALDESK_SMTP_SECURE"
          ? "false"
        : key === "SIGNALDESK_EMAIL_REPLY_TO"
          ? ""
        : key === "SIGNALDESK_PHYSICAL_ADDRESS"
          ? "Local E2E address"
          : "local-e2e-value";

    await expectRejects("SMTP send without bound sender authority", () => originalProviderSend({
      body: "Authority check only.",
      channel: "email",
      recipient: "recipient@example.invalid",
      subject: "Authority check",
    }), "EMAIL_SENDER_DOMAIN_AUTHORITY_REQUIRED");
    await expectRejects("SMTP configured From-domain mismatch", () => originalProviderSend({
      body: "Authority check only.",
      channel: "email",
      recipient: "recipient@example.invalid",
      senderDomain: "menulist.test",
      subject: "Authority check",
    }), "EMAIL_SENDER_DOMAIN_AUTHORITY_MISMATCH");
    process.env.SIGNALDESK_EMAIL_FROM = "not-a-mailbox";
    await expectRejects("SMTP malformed From mailbox", () => originalProviderSend({
      body: "Authority check only.",
      channel: "email",
      recipient: "recipient@example.invalid",
      senderDomain: "menulist.test",
      subject: "Authority check",
    }), "EMAIL_SENDER_FROM_INVALID");

    process.env.SIGNALDESK_EMAIL_FROM = "MenuList <sender@menulist.test>";
    process.env.SIGNALDESK_EMAIL_REPLY_TO = "not-a-mailbox";
    await expectRejects("SMTP malformed Reply-To mailbox", () => originalProviderSend({
      body: "Authority check only.",
      channel: "email",
      recipient: "recipient@example.invalid",
      senderDomain: "menulist.test",
      subject: "Authority check",
    }), "EMAIL_REPLY_TO_INVALID");
    process.env.SIGNALDESK_EMAIL_REPLY_TO = "reply@menulist.test";
    process.env.SIGNALDESK_SMTP_SECURE = "definitely";
    await expectRejects("SMTP malformed TLS mode", () => originalProviderSend({
      body: "Authority check only.",
      channel: "email",
      recipient: "recipient@example.invalid",
      senderDomain: "menulist.test",
      subject: "Authority check",
    }), "EMAIL_SMTP_SECURE_INVALID");
    process.env.SIGNALDESK_SMTP_SECURE = "false";
    let smtpTransportOptions = null;
    let smtpMailOptions = null;
    nodemailer.createTransport = (options) => {
      smtpTransportOptions = options;
      return {
        sendMail: async (mailOptions) => {
          smtpMailOptions = mailOptions;
          return {
            accepted: ["recipient@example.invalid"],
            envelope: {
              from: "sender@menulist.test",
              to: ["recipient@example.invalid"],
            },
            messageId: "smtp-timeout-fixture",
            pending: [],
            rejected: [],
            response: "250 OK",
          };
        },
      };
    };
    const smtpFixture = await originalProviderSend({
      body: "Timeout fixture only.",
      channel: "email",
      recipient: "recipient@example.invalid",
      senderDomain: "menulist.test",
      subject: "Timeout fixture",
    });
    assert(smtpFixture.providerMessageId === "smtp-timeout-fixture", "SMTP timeout fixture did not complete through the adapter");
    assert(
      smtpTransportOptions?.connectionTimeout === 10_000
      && smtpTransportOptions?.greetingTimeout === 10_000
      && smtpTransportOptions?.socketTimeout === 20_000,
      "SMTP adapter omitted bounded connection, greeting, or socket timeouts",
    );
    assert(smtpTransportOptions?.secure === false, "SMTP adapter did not preserve the validated false TLS mode");
    assert(smtpMailOptions?.replyTo === "reply@menulist.test", "SMTP adapter did not preserve the validated Reply-To mailbox");
    nodemailer.createTransport = originalCreateTransport;

    let metaRequestOptions = null;
    global.fetch = async (_url, options = {}) => {
      metaRequestOptions = options;
      return new Response(JSON.stringify({
        contacts: [{ input: "919999999999", wa_id: "919999999999" }],
        messages: [{ id: "meta-timeout-fixture" }],
        messaging_product: "whatsapp",
      }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };
    const metaFixture = await originalProviderSend({
      body: "Timeout fixture only.",
      channel: "whatsapp",
      recipient: "919999999999",
    });
    assert(metaFixture.providerMessageId === "meta-timeout-fixture", "Meta timeout fixture did not complete through the adapter");
    assert(metaRequestOptions?.signal instanceof AbortSignal, "Meta adapter omitted its bounded request timeout signal");
    global.fetch = originalFetch;

    const policy = await createPolicy("Provider send claim");
    const ready = await prepareApprovedTarget(policy.sourcePolicyId, "ProviderSendClaim");
    let providerCallCount = 0;
    signalDeskProviderAdapters.sendSignalDeskProviderMessage = async (providerInput) => {
      providerCallCount += 1;
      assert(providerInput.senderDomain === "menulist.test", "Provider send did not receive the approved sender domain");
      await new Promise((resolve) => setTimeout(resolve, 25));
      const inboundAt = timestampNow();
      const replyRaceConversationId = `conv_${ready.targetId}`;
      const replyRaceTarget = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(ready.targetId).get();
      assert(typeof replyRaceTarget.data()?.displayName === "string", "Provider reply-race target name is missing");
      await Promise.all([
        db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES).doc(replyRaceConversationId).set({
          channel: "email",
          conversationId: replyRaceConversationId,
          lastInboundAt: inboundAt,
          lastInboundOccurredAt: inboundAt,
          lastMessagePreview: "Yes, please send the details.",
          pId: SIGNALDESK_PRODUCT_CODE,
          state: "interested",
          targetId: ready.targetId,
          targetName: replyRaceTarget.data()?.displayName,
          updatedAt: inboundAt,
        }),
        replyRaceTarget.ref.set({
          latestConversationId: replyRaceConversationId,
          nextAction: "outcome",
          status: "replied",
          updatedAt: inboundAt,
        }, { merge: true }),
        db.collection(SIGNALDESK_COLLECTIONS.CHANNEL_HEALTH_SUMMARIES).doc("email").set({
          channel: "email",
          configured: true,
          lastError: "Inbound complaint paused this channel.",
          pId: SIGNALDESK_PRODUCT_CODE,
          status: "paused",
          updatedAt: inboundAt,
        }),
      ]);
      return { provider: "smtp", providerMessageId: "provider-message-e2e", status: "sent" };
    };
    const providerOperationHash = hashValue(`${ready.approvalId}|email|provider-send-v1`).slice(0, 32);
    const providerClaimRef = db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS).doc(`provider_send_${providerOperationHash}`);
    const providerExportId = `send_${providerOperationHash}`;
    await expectRejects("Direct Meta provider send is not governed for first build", () => sendSignalDeskApprovedMessageServer(access, {
      approvalId: ready.approvalId,
      channel: "whatsapp",
    }), "DIRECT_PROVIDER_SEND_EMAIL_ONLY");
    assert(providerCallCount === 0, "Direct Meta denial reached the provider adapter");
    process.env.SIGNALDESK_SMTP_PORT = "70000";
    await expectRejects("Provider deterministic preflight before claim", () => sendSignalDeskApprovedMessageServer(access, {
      approvalId: ready.approvalId,
      channel: "email",
    }), "EMAIL_SMTP_PORT_INVALID");
    assert(!(await providerClaimRef.get()).exists, "Deterministic provider preflight failure created a send claim");
    assert(providerCallCount === 0, "Deterministic provider preflight failure called the provider");
    const providerPreflightAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
      data.action === "provider_send_started" && data.entityId === providerExportId
    ));
    assert(providerPreflightAuditCount === 0, "Deterministic provider preflight failure wrote a send-start audit");
    process.env.SIGNALDESK_SMTP_PORT = "587";
    const malformedGlobalPauseRef = db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc("scope_global-outbound");
    await malformedGlobalPauseRef.set({
      killSwitchId: malformedGlobalPauseRef.id,
      pId: "ML",
      reason: "Foreign inactive row must not bypass strict SignalDesk pause authority.",
      scope: "global-outbound",
      status: "inactive",
      updatedAt: timestampNow(),
    });
    await expectRejects("Provider send with malformed inactive kill-switch authority", () => sendSignalDeskApprovedMessageServer(access, {
      approvalId: ready.approvalId,
      channel: "email",
    }), "KILL_SWITCH_PRODUCT_MISMATCH");
    assert(!(await providerClaimRef.get()).exists, "Malformed inactive kill-switch authority created a provider send claim");
    assert(providerCallCount === 0, "Malformed inactive kill-switch authority reached the provider adapter");
    await malformedGlobalPauseRef.delete();
    const providerHealthRef = db.collection(SIGNALDESK_COLLECTIONS.CHANNEL_HEALTH_SUMMARIES).doc("email");
    const providerHealthBeforeAdmission = (await providerHealthRef.get()).data();
    await providerHealthRef.set({ ...providerHealthBeforeAdmission, pId: "ML" });
    await expectRejects("Provider send with wrong-product current channel health", () => sendSignalDeskApprovedMessageServer(access, {
      approvalId: ready.approvalId,
      channel: "email",
    }), "CHANNEL_HEALTH_CURRENT_SHAPE_INVALID");
    assert(!(await providerClaimRef.get()).exists, "Wrong-product channel health created a provider send claim");
    assert(providerCallCount === 0, "Wrong-product channel health reached the provider adapter");
    if (providerHealthBeforeAdmission) {
      await providerHealthRef.set({ ...providerHealthBeforeAdmission, pId: SIGNALDESK_PRODUCT_CODE });
    } else {
      await providerHealthRef.delete();
    }
    await providerHealthRef.set({
      channel: "email",
      configured: true,
      lastError: "stale settlement error",
      legacyPrivate: "remove-on-authoritative-write",
      pId: SIGNALDESK_PRODUCT_CODE,
      status: "warning",
      updatedAt: timestampNow(),
    });
    const concurrent = await Promise.allSettled([
      sendSignalDeskApprovedMessageServer(access, { approvalId: ready.approvalId, channel: "email" }),
      sendSignalDeskApprovedMessageServer(access, { approvalId: ready.approvalId, channel: "email" }),
    ]);
    assert(providerCallCount === 1, "Concurrent identical provider send executed the provider more than once");
    assert(concurrent.some((result) => result.status === "fulfilled"), "Provider send claim had no successful owner");
    const replay = await sendSignalDeskApprovedMessageServer(access, { approvalId: ready.approvalId, channel: "email" });
    assert(replay.providerMessageId === "provider-message-e2e", "Completed provider send replay lost durable provider truth");
    assert(replay.replay === true && !("body" in replay) && !("recipient" in replay) && !("subject" in replay), "Completed provider send replay was not a redacted historical acknowledgement");
    assert(replay.currentAuthority === true, "Completed provider replay did not confirm current CTA authority");
    assert(providerCallCount === 1, "Completed provider send replay called the provider again");
    const completedProviderClaim = (await providerClaimRef.get()).data();
    await providerClaimRef.set({ ...completedProviderClaim, actorId: "poisoned-provider-send-actor" });
    await expectRejects("Provider send replay with poisoned claim actor", () => sendSignalDeskApprovedMessageServer(access, {
      approvalId: ready.approvalId,
      channel: "email",
    }), "PROVIDER_SEND_REVIEW_REQUIRED");
    assert(providerCallCount === 1, "Poisoned provider send claim reached the provider adapter");
    await providerClaimRef.set(completedProviderClaim);
    const providerChannelHealth = (await db.collection(SIGNALDESK_COLLECTIONS.CHANNEL_HEALTH_SUMMARIES).doc("email").get()).data();
    assert(providerChannelHealth?.pId === SIGNALDESK_PRODUCT_CODE && providerChannelHealth?.status === "paused", "Provider settlement overwrote a newer paused channel-health state");
    assert(providerChannelHealth?.lastError === "Inbound complaint paused this channel." && !Object.prototype.hasOwnProperty.call(providerChannelHealth || {}, "legacyPrivate"), "Provider settlement lost current pause evidence or preserved stale channel-health fields");
    const replyRaceConversationId = `conv_${ready.targetId}`;
    const [replyRaceConversation, replyRaceTarget] = await Promise.all([
      db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES).doc(replyRaceConversationId).get(),
      db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(ready.targetId).get(),
    ]);
    assert(replyRaceConversation.data()?.state === "interested", "Provider settlement downgraded an in-flight inbound reply to contacted");
    assert(replyRaceConversation.data()?.lastMessagePreview === "Yes, please send the details.", "Provider settlement replaced the newer inbound preview");
    assert(replyRaceConversation.data()?.lastOutboundAt?.toDate, "Provider settlement lost its outbound timestamp while preserving the reply");
    assert(replyRaceTarget.data()?.status === "replied" && replyRaceTarget.data()?.nextAction === "outcome", "Provider settlement downgraded the replied target workflow");
    await providerHealthRef.set({
      channel: "email",
      configured: true,
      lastError: null,
      pId: SIGNALDESK_PRODUCT_CODE,
      status: "healthy",
      updatedAt: timestampNow(),
    });
    signalDeskProviderAdapters.sendSignalDeskProviderMessage = async (providerInput) => {
      providerCallCount += 1;
      assert(providerInput.senderDomain === "menulist.test", "Provider send did not receive the approved sender domain");
      return { provider: "smtp", providerMessageId: "provider-message-e2e", status: "sent" };
    };
    const readyTargetDetailSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGETS).doc(ready.targetId).get();
    const readyContactIdentityRef = db.collection(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES)
      .doc(`email_${hashValue(readyTargetDetailSnap.data()?.email)}`);
    await readyContactIdentityRef.set({ permissionState: "research_only", updatedAt: timestampNow() }, { merge: true });
    const revokedContactReplay = await sendSignalDeskApprovedMessageServer(access, { approvalId: ready.approvalId, channel: "email" });
    assert(revokedContactReplay.replay === true && revokedContactReplay.currentAuthority === false, "Provider replay did not expose revoked current contact authority");
    assert(!("body" in revokedContactReplay) && !("recipient" in revokedContactReplay) && !("subject" in revokedContactReplay), "Provider replay exposed reusable content after contact revocation");
    assert(providerCallCount === 1, "Historical provider replay called the provider after contact revocation");
    await readyContactIdentityRef.set({ permissionState: "permissioned", updatedAt: timestampNow() }, { merge: true });
    const sendExportCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS, (data) => data.approvalId === ready.approvalId && data.status === "sent");
    assert(sendExportCount === 1, "Provider send claim created duplicate sent exports");
    await upsertSignalDeskSenderDomainServer(access, {
      authenticationState: "partial",
      bounceRate: 0,
      brandRisk: "low",
      complaintRate: 0,
      domain: "menulist.test",
      idempotencyKey: "e2e-sender-domain-provider-history-hold-v1",
      provider: "owned-email",
      status: "active",
      unsubscribeReady: false,
      volumeRampState: "paused",
    });
    const historicalReplay = await sendSignalDeskApprovedMessageServer(access, { approvalId: ready.approvalId, channel: "email" });
    assert(historicalReplay.replay === true && historicalReplay.providerMessageId === "provider-message-e2e", "Provider replay did not preserve redacted historical send truth after sender revocation");
    assert(historicalReplay.currentAuthority === false, "Provider replay did not expose revoked current sender authority");
    assert(!("body" in historicalReplay) && !("recipient" in historicalReplay) && !("subject" in historicalReplay), "Provider replay exposed reusable content after sender revocation");
    assert(providerCallCount === 1, "Historical provider replay called the provider after sender revocation");
    await upsertSignalDeskSenderDomainServer(access, {
      authenticationState: "ready",
      bounceRate: 0,
      brandRisk: "low",
      complaintRate: 0,
      domain: "menulist.test",
      idempotencyKey: "e2e-sender-domain-provider-history-restore-v1",
      provider: "owned-email",
      status: "active",
      unsubscribeReady: true,
      volumeRampState: "low_volume",
    });
    const providerReplayCtaRef = db.collection(SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS).doc(contentFixtureCtaId);
    await providerReplayCtaRef.set({ status: "hold", updatedAt: timestampNow() }, { merge: true });
    const revokedCtaReplay = await sendSignalDeskApprovedMessageServer(access, { approvalId: ready.approvalId, channel: "email" });
    assert(revokedCtaReplay.replay === true && revokedCtaReplay.currentAuthority === false, "Provider replay did not expose revoked current CTA authority");
    assert(!("body" in revokedCtaReplay) && !("recipient" in revokedCtaReplay) && !("subject" in revokedCtaReplay), "Provider replay exposed reusable content after CTA revocation");
    assert(providerCallCount === 1, "Historical provider replay called the provider after CTA revocation");
    await providerReplayCtaRef.set({ status: "active", updatedAt: timestampNow() }, { merge: true });

    const approvalBindingPolicy = await createPolicy("Approval contact binding");
    const approvalBindingTargetId = await importOne(approvalBindingPolicy.sourcePolicyId, "ApprovalContactBinding");
    await scoreSignalDeskTargetServer(access, approvalBindingTargetId);
    await createSignalDeskEvidenceServer(access, approvalBindingTargetId);
    const approvalBindingDraft = await createSignalDeskDraftServer(access, { targetId: approvalBindingTargetId });
    await db.collection(SIGNALDESK_COLLECTIONS.TARGETS).doc(approvalBindingTargetId).set({
      email: "replacement-recipient@example.invalid",
      updatedAt: timestampNow(),
    }, { merge: true });
    await expectRejects("Approval recipient substitution", () => reviewSignalDeskApprovalServer(access, {
      approvalId: approvalBindingDraft.approval.approvalId,
      reason: "Changed recipient must require a new draft and approval.",
      status: "approved",
    }), "SIGNALDESK_CONTACT_AUTHORITY_NOT_FOUND");
    const pendingApprovalBindingSnap = await db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE)
      .doc(approvalBindingDraft.approval.approvalId).get();
    assert(pendingApprovalBindingSnap.data()?.status === "pending", "Recipient substitution advanced the pending approval");

    const revokedBeforeSendPolicy = await createPolicy("Contact revoked before send");
    const revokedBeforeSendReady = await prepareApprovedTarget(revokedBeforeSendPolicy.sourcePolicyId, "ContactRevokedBeforeSend");
    const revokedBeforeSendDetail = await db.collection(SIGNALDESK_COLLECTIONS.TARGETS).doc(revokedBeforeSendReady.targetId).get();
    const revokedBeforeSendIdentityRef = db.collection(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES)
      .doc(`email_${hashValue(revokedBeforeSendDetail.data()?.email)}`);
    await revokedBeforeSendIdentityRef.set({ permissionState: "expired", updatedAt: timestampNow() }, { merge: true });
    const providerCallsBeforeRevokedAdmission = providerCallCount;
    await expectRejects("Export after contact revocation", () => exportSignalDeskMessageServer(access, revokedBeforeSendReady.approvalId), "SIGNALDESK_CONTACT_AUTHORITY_STALE");
    await expectRejects("Provider send after contact revocation", () => sendSignalDeskApprovedMessageServer(access, {
      approvalId: revokedBeforeSendReady.approvalId,
      channel: "email",
    }), "SIGNALDESK_CONTACT_AUTHORITY_STALE");
    await expectRejects("Sequencer handoff after contact revocation", () => createSignalDeskSequencerHandoffServer(access, {
      approvalId: revokedBeforeSendReady.approvalId,
      provider: "owned-email",
    }), "SIGNALDESK_CONTACT_AUTHORITY_STALE");
    assert(providerCallCount === providerCallsBeforeRevokedAdmission, "Revoked contact authority reached the provider adapter");

    const wrongProductApprovalPolicy = await createPolicy("Wrong-product approval execution");
    const wrongProductApprovalReady = await prepareApprovedTarget(wrongProductApprovalPolicy.sourcePolicyId, "WrongProductApprovalExecution");
    const wrongProductApprovalRef = db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(wrongProductApprovalReady.approvalId);
    const validApprovalTruth = (await wrongProductApprovalRef.get()).data();
    assert(validApprovalTruth, "Wrong-product approval fixture did not create approval authority");
    await wrongProductApprovalRef.set({ ...validApprovalTruth, pId: "ML" });
    const providerCallsBeforeWrongProductApproval = providerCallCount;
    await expectRejects("Export with wrong-product approval", () => exportSignalDeskMessageServer(access, wrongProductApprovalReady.approvalId), "APPROVAL_SHAPE_INVALID");
    await expectRejects("Assisted handoff with wrong-product approval", () => prepareSignalDeskChannelHandoffServer(access, {
      approvalId: wrongProductApprovalReady.approvalId,
      channel: "email",
    }), "APPROVAL_SHAPE_INVALID");
    await expectRejects("Provider send with wrong-product approval", () => sendSignalDeskApprovedMessageServer(access, {
      approvalId: wrongProductApprovalReady.approvalId,
      channel: "email",
    }), "APPROVAL_SHAPE_INVALID");
    await expectRejects("Sequencer handoff with wrong-product approval", () => createSignalDeskSequencerHandoffServer(access, {
      approvalId: wrongProductApprovalReady.approvalId,
      provider: "owned-email",
    }), "APPROVAL_SHAPE_INVALID");
    assert(providerCallCount === providerCallsBeforeWrongProductApproval, "Wrong-product approval reached the provider adapter");
    await wrongProductApprovalRef.set(validApprovalTruth);

    const crossChannelPolicy = await createPolicy("Email rail channel binding");
    const crossChannelReady = await prepareApprovedTarget(crossChannelPolicy.sourcePolicyId, "EmailRailCrossChannel");
    const crossChannelApprovalRef = db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(crossChannelReady.approvalId);
    const crossChannelDraftRef = db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(crossChannelReady.draftId);
    await Promise.all([
      crossChannelApprovalRef.set({ channel: "whatsapp", updatedAt: timestampNow() }, { merge: true }),
      crossChannelDraftRef.set({ channel: "whatsapp", updatedAt: timestampNow() }, { merge: true }),
    ]);
    const providerCallsBeforeCrossChannel = providerCallCount;
    await expectRejects("Email export with non-email approval", () => exportSignalDeskMessageServer(access, crossChannelReady.approvalId), "MESSAGE_EXPORT_EMAIL_APPROVAL_REQUIRED");
    await expectRejects("Email provider send with non-email approval", () => sendSignalDeskApprovedMessageServer(access, {
      approvalId: crossChannelReady.approvalId,
      channel: "email",
    }), "PROVIDER_SEND_EMAIL_APPROVAL_REQUIRED");
    await expectRejects("Email sequencer with non-email approval", () => createSignalDeskSequencerHandoffServer(access, {
      approvalId: crossChannelReady.approvalId,
      provider: "owned-email",
    }), "SEQUENCER_HANDOFF_EMAIL_APPROVAL_REQUIRED");
    assert(providerCallCount === providerCallsBeforeCrossChannel, "Cross-channel email denial reached the provider adapter");

    const unresolvedPolicy = await createPolicy("Provider send unresolved");
    const unresolvedReady = await prepareApprovedTarget(unresolvedPolicy.sourcePolicyId, "ProviderSendUnresolved");
    let unresolvedProviderCalls = 0;
    signalDeskProviderAdapters.sendSignalDeskProviderMessage = async () => {
      unresolvedProviderCalls += 1;
      return { provider: "meta-whatsapp", providerMessageId: "wrong-provider-result", status: "sent" };
    };
    await expectRejects("Ambiguous provider send", () => sendSignalDeskApprovedMessageServer(access, {
      approvalId: unresolvedReady.approvalId,
      channel: "email",
    }), "PROVIDER_SEND_OUTCOME_UNRESOLVED");
    await expectRejects("Unresolved provider send retry", () => sendSignalDeskApprovedMessageServer(access, {
      approvalId: unresolvedReady.approvalId,
      channel: "email",
    }), "PROVIDER_SEND_REVIEW_REQUIRED");
    assert(unresolvedProviderCalls === 1, "Unresolved provider send retry called the provider again");

    const recoverableHandoffPolicy = await createPolicy("Recoverable blocked email handoff");
    const recoverableHandoffReady = await prepareApprovedTarget(recoverableHandoffPolicy.sourcePolicyId, "RecoverableEmailHandoff");
    const ownedEmailSequencerRef = db.collection(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS).doc("provider_owned-email_sequencer");
    await ownedEmailSequencerRef.set({
      credentialState: "missing",
      ownerApproved: false,
      status: "disabled",
      updatedAt: timestampNow(),
    }, { merge: true });
    const blockedHandoff = await createSignalDeskSequencerHandoffServer(access, {
      approvalId: recoverableHandoffReady.approvalId,
      provider: "owned-email",
    });
    assert(blockedHandoff.status === "blocked" && Boolean(blockedHandoff.blockedReason), "Disabled provider did not create a reviewable blocked handoff");
    const blockedHandoffReplay = await createSignalDeskSequencerHandoffServer(access, {
      approvalId: recoverableHandoffReady.approvalId,
      provider: "owned-email",
    });
    assert(blockedHandoffReplay.replay === true && blockedHandoffReplay.status === "blocked", "Unchanged blocked handoff did not replay without side effects");
    let recoverableHandoffAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
      data.action === "sequencer_handoff_create" && data.entityId === blockedHandoff.sequencerHandoffId
    ));
    assert(recoverableHandoffAuditCount === 1, "Blocked handoff replay repeated audit and cost effects");
    await ownedEmailSequencerRef.set({
      credentialState: "not_required",
      ownerApproved: true,
      status: "approved",
      updatedAt: timestampNow(),
    }, { merge: true });
    const recoveredHandoff = await createSignalDeskSequencerHandoffServer(access, {
      approvalId: recoverableHandoffReady.approvalId,
      provider: "owned-email",
    });
    assert(
      recoveredHandoff.sequencerHandoffId === blockedHandoff.sequencerHandoffId
      && recoveredHandoff.status === "queued",
      "Blocked handoff did not recover in place after provider readiness changed",
    );
    recoverableHandoffAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
      data.action === "sequencer_handoff_create" && data.entityId === blockedHandoff.sequencerHandoffId
    ));
    assert(recoverableHandoffAuditCount === 2, "Blocked handoff recovery did not record exactly one new transition");

    const prioritizedApprovalPolicy = await createPolicy("Email workspace actionable priority");
    const prioritizedApproval = await prepareApprovedTarget(prioritizedApprovalPolicy.sourcePolicyId, "EmailWorkspacePriority");
    const [prioritizedApprovalSnap, recoveredHandoffSnap, recoveredStepSnap] = await Promise.all([
      db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(prioritizedApproval.approvalId).get(),
      db.collection(SIGNALDESK_COLLECTIONS.SEQUENCER_HANDOFFS).doc(recoveredHandoff.sequencerHandoffId).get(),
      db.collection(SIGNALDESK_COLLECTIONS.SEQUENCER_STEPS).doc(`${recoveredHandoff.sequencerHandoffId}_step_1`).get(),
    ]);
    assert(recoveredStepSnap.exists, "Recovered owned handoff did not create its ready step");
    const terminalBatch = db.batch();
    for (let index = 0; index < 35; index += 1) {
      const updatedAt = timestampNow();
      const approvalId = `approval_email_terminal_${index}`;
      const handoffId = `sequencer_email_terminal_${index}`;
      const stepId = `step_email_terminal_${index}`;
      terminalBatch.set(db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(approvalId), {
        ...prioritizedApprovalSnap.data(),
        approvalId,
        status: "exported",
        updatedAt,
      });
      terminalBatch.set(db.collection(SIGNALDESK_COLLECTIONS.SEQUENCER_HANDOFFS).doc(handoffId), {
        ...recoveredHandoffSnap.data(),
        blockedReason: null,
        nextSendAt: null,
        sequencerHandoffId: handoffId,
        status: "sent",
        updatedAt,
      });
      terminalBatch.set(db.collection(SIGNALDESK_COLLECTIONS.SEQUENCER_STEPS).doc(stepId), {
        ...recoveredStepSnap.data(),
        sentAt: updatedAt,
        sequenceStepId: stepId,
        sequencerHandoffId: handoffId,
        status: "sent",
        updatedAt,
      });
    }
    await terminalBatch.commit();
    const channelWorkspace = await loadSignalDeskWorkspaceServer(access, "channels");
    assert(channelWorkspace.workspace.approvals.some((approval) => approval.approvalId === prioritizedApproval.approvalId), "Recent terminal approvals crowded an approved email action out of Channels");
    assert(channelWorkspace.workspace.sequencerHandoffs.some((handoff) => handoff.sequencerHandoffId === recoveredHandoff.sequencerHandoffId), "Recent terminal handoffs crowded a queued email handoff out of Channels");
    assert(channelWorkspace.workspace.sequencerSteps.some((step) => step.sequenceStepId === recoveredStepSnap.id), "Recent terminal steps crowded a ready email step out of Channels");

    const sequencePolicy = await createPolicy("Owned sequence send claim");
    const sequenceReady = await prepareApprovedTarget(sequencePolicy.sourcePolicyId, "OwnedSequenceSendClaim");
    const concurrentHandoffs = await Promise.all([
      createSignalDeskSequencerHandoffServer(access, {
        approvalId: sequenceReady.approvalId,
        provider: "owned-email",
      }),
      createSignalDeskSequencerHandoffServer(access, {
        approvalId: sequenceReady.approvalId,
        provider: "owned-email",
      }),
    ]);
    const [sequenceHandoff] = concurrentHandoffs;
    assert(sequenceHandoff.sequencerHandoffId === concurrentHandoffs[1].sequencerHandoffId, "Concurrent sequence handoff creation returned different identities");
    assert(sequenceHandoff.blockedReason === null, "Ready sequence handoff exposed an empty blocked reason");
    assert(concurrentHandoffs.every((handoff) => !("contactIdentityId" in handoff) && !("contactAuthorityFingerprintHash" in handoff)), "Sequence handoff DTO leaked internal contact authority");
    const storedSequenceHandoff = (await db.collection(SIGNALDESK_COLLECTIONS.SEQUENCER_HANDOFFS)
      .doc(sequenceHandoff.sequencerHandoffId).get()).data();
    assert(Boolean(storedSequenceHandoff?.contactIdentityId) && Boolean(storedSequenceHandoff?.contactAuthorityFingerprintHash), "Persisted sequence handoff lost contact authority");
    const sequenceHandoffAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
      data.action === "sequencer_handoff_create" && data.entityId === sequenceHandoff.sequencerHandoffId
    ));
    assert(sequenceHandoffAuditCount === 1, "Concurrent sequence handoff creation repeated audit and cost effects");
    const sequenceStepCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.SEQUENCER_STEPS, (data) => (
      data.sequencerHandoffId === sequenceHandoff.sequencerHandoffId
    ));
    assert(sequenceStepCount === 1, "Concurrent sequence handoff creation produced duplicate steps");
    await expectRejects("Changed sequence handoff sender", () => createSignalDeskSequencerHandoffServer(access, {
      approvalId: sequenceReady.approvalId,
      provider: "owned-email",
      senderDomainId: "different-sender-domain",
    }), "Sequencer handoff request conflicts with existing truth");
    let sequenceProviderCalls = 0;
    signalDeskProviderAdapters.sendSignalDeskProviderMessage = async (providerInput) => {
      sequenceProviderCalls += 1;
      assert(providerInput.senderDomain === "menulist.test", "Owned sequence send did not receive the approved sender domain");
      await new Promise((resolve) => setTimeout(resolve, 25));
      return { provider: "smtp", providerMessageId: "sequence-provider-message-e2e", status: "sent" };
    };
    const sequenceOperationHash = hashValue(`${sequenceHandoff.sequencerHandoffId}|owned-sequence-send-v1`).slice(0, 32);
    const sequenceClaimRef = db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS).doc(`owned_sequence_send_${sequenceOperationHash}`);
    process.env.SIGNALDESK_PHYSICAL_ADDRESS = "x".repeat(501);
    await expectRejects("Owned sequence deterministic preflight before claim", () => sendSignalDeskOwnedSequenceStepServer(access, {
      sequencerHandoffId: sequenceHandoff.sequencerHandoffId,
    }), "EMAIL_PHYSICAL_ADDRESS_INVALID");
    assert(!(await sequenceClaimRef.get()).exists, "Deterministic owned-sequence preflight failure created a send claim");
    assert(sequenceProviderCalls === 0, "Deterministic owned-sequence preflight failure called the provider");
    const sequencePreflightAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
      data.action === "owned_sequence_send_started" && data.entityId === sequenceHandoff.sequencerHandoffId
    ));
    assert(sequencePreflightAuditCount === 0, "Deterministic owned-sequence preflight failure wrote a send-start audit");
    process.env.SIGNALDESK_PHYSICAL_ADDRESS = "Local E2E address";
    const sequenceApprovalRef = db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(sequenceReady.approvalId);
    const sequenceApprovalTruth = (await sequenceApprovalRef.get()).data();
    assert(sequenceApprovalTruth, "Owned-sequence approval fixture did not create approval authority");
    await sequenceApprovalRef.set({ ...sequenceApprovalTruth, pId: "ML" });
    await expectRejects("Owned sequence with wrong-product approval", () => sendSignalDeskOwnedSequenceStepServer(access, {
      sequencerHandoffId: sequenceHandoff.sequencerHandoffId,
    }), "APPROVAL_SHAPE_INVALID");
    assert(!(await sequenceClaimRef.get()).exists, "Wrong-product approval created an owned-sequence send claim");
    assert(sequenceProviderCalls === 0, "Wrong-product approval reached the owned-sequence provider adapter");
    await sequenceApprovalRef.set(sequenceApprovalTruth);
    const sequenceHealthRef = db.collection(SIGNALDESK_COLLECTIONS.CHANNEL_HEALTH_SUMMARIES).doc("email");
    const sequenceHealthBeforeAdmission = (await sequenceHealthRef.get()).data();
    await sequenceHealthRef.set({ ...sequenceHealthBeforeAdmission, pId: "ML" });
    await expectRejects("Owned sequence with wrong-product current channel health", () => sendSignalDeskOwnedSequenceStepServer(access, {
      sequencerHandoffId: sequenceHandoff.sequencerHandoffId,
    }), "CHANNEL_HEALTH_CURRENT_SHAPE_INVALID");
    assert(!(await sequenceClaimRef.get()).exists, "Wrong-product channel health created an owned-sequence send claim");
    assert(sequenceProviderCalls === 0, "Wrong-product channel health reached the owned-sequence provider adapter");
    await sequenceHealthRef.set({ ...sequenceHealthBeforeAdmission, pId: SIGNALDESK_PRODUCT_CODE });
    const concurrentSequence = await Promise.allSettled([
      sendSignalDeskOwnedSequenceStepServer(access, { sequencerHandoffId: sequenceHandoff.sequencerHandoffId }),
      sendSignalDeskOwnedSequenceStepServer(access, { sequencerHandoffId: sequenceHandoff.sequencerHandoffId }),
    ]);
    assert(sequenceProviderCalls === 1, "Concurrent owned sequence send executed the provider more than once");
    assert(concurrentSequence.some((result) => result.status === "fulfilled"), "Owned sequence send claim had no successful owner");
    const sequenceReplay = await sendSignalDeskOwnedSequenceStepServer(access, {
      sequencerHandoffId: sequenceHandoff.sequencerHandoffId,
    });
    assert(sequenceReplay.providerMessageId === "sequence-provider-message-e2e", "Completed owned sequence replay lost durable provider truth");
    assert(sequenceReplay.currentAuthority === true, "Completed owned sequence replay did not confirm current CTA and sender authority");
    assert(sequenceProviderCalls === 1, "Completed owned sequence replay called the provider again");
    const completedSequenceClaim = (await sequenceClaimRef.get()).data();
    await sequenceClaimRef.set({ ...completedSequenceClaim, entityId: "poisoned-sequence-export" });
    await expectRejects("Owned sequence replay with redirected claim entity", () => sendSignalDeskOwnedSequenceStepServer(access, {
      sequencerHandoffId: sequenceHandoff.sequencerHandoffId,
    }), "OWNED_SEQUENCE_SEND_REVIEW_REQUIRED");
    assert(sequenceProviderCalls === 1, "Redirected owned-sequence claim reached the provider adapter");
    await sequenceClaimRef.set(completedSequenceClaim);
    const sequenceExportCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS, (data) => (
      data.approvalId === sequenceReady.approvalId && data.status === "sent"
    ));
    assert(sequenceExportCount === 1, "Owned sequence send claim created duplicate sent exports");
    await upsertSignalDeskSenderDomainServer(access, {
      authenticationState: "partial",
      bounceRate: 0,
      brandRisk: "low",
      complaintRate: 0,
      domain: "menulist.test",
      idempotencyKey: "e2e-sender-domain-sequence-history-hold-v1",
      provider: "owned-email",
      status: "active",
      unsubscribeReady: false,
      volumeRampState: "paused",
    });
    const historicalSequenceReplay = await sendSignalDeskOwnedSequenceStepServer(access, {
      sequencerHandoffId: sequenceHandoff.sequencerHandoffId,
    });
    assert(historicalSequenceReplay.currentAuthority === false, "Owned sequence replay did not expose revoked current sender authority");
    assert(!("body" in historicalSequenceReplay) && !("recipient" in historicalSequenceReplay) && !("subject" in historicalSequenceReplay), "Owned sequence replay exposed reusable content after sender revocation");
    assert(sequenceProviderCalls === 1, "Historical owned sequence replay called the provider after sender revocation");
    await upsertSignalDeskSenderDomainServer(access, {
      authenticationState: "ready",
      bounceRate: 0,
      brandRisk: "low",
      complaintRate: 0,
      domain: "menulist.test",
      idempotencyKey: "e2e-sender-domain-sequence-history-restore-v1",
      provider: "owned-email",
      status: "active",
      unsubscribeReady: true,
      volumeRampState: "low_volume",
    });

    const unresolvedSequencePolicy = await createPolicy("Owned sequence send unresolved");
    const unresolvedSequenceReady = await prepareApprovedTarget(unresolvedSequencePolicy.sourcePolicyId, "OwnedSequenceSendUnresolved");
    const unresolvedSequenceHandoff = await createSignalDeskSequencerHandoffServer(access, {
      approvalId: unresolvedSequenceReady.approvalId,
      provider: "owned-email",
    });
    let unresolvedSequenceCalls = 0;
    signalDeskProviderAdapters.sendSignalDeskProviderMessage = async () => {
      unresolvedSequenceCalls += 1;
      return { provider: "meta-messenger", providerMessageId: "wrong-sequence-provider-result", status: "sent" };
    };
    await expectRejects("Ambiguous owned sequence send", () => sendSignalDeskOwnedSequenceStepServer(access, {
      sequencerHandoffId: unresolvedSequenceHandoff.sequencerHandoffId,
    }), "OWNED_SEQUENCE_SEND_OUTCOME_UNRESOLVED");
    await expectRejects("Unresolved owned sequence retry", () => sendSignalDeskOwnedSequenceStepServer(access, {
      sequencerHandoffId: unresolvedSequenceHandoff.sequencerHandoffId,
    }), "OWNED_SEQUENCE_SEND_REVIEW_REQUIRED");
    assert(unresolvedSequenceCalls === 1, "Unresolved owned sequence retry called the provider again");

    const cappedPolicy = await createPolicy("Owned email shared sender cap");
    const cappedReady = await prepareApprovedTarget(cappedPolicy.sourcePolicyId, "OwnedEmailSharedCap");
    let cappedProviderCalls = 0;
    signalDeskProviderAdapters.sendSignalDeskProviderMessage = async () => {
      cappedProviderCalls += 1;
      return { provider: "smtp-cap-e2e", providerMessageId: "must-not-send-over-cap", status: "sent" };
    };
    await expectRejects("Shared owned-email sender cap", () => sendSignalDeskApprovedMessageServer(access, {
      approvalId: cappedReady.approvalId,
      channel: "email",
    }), "SIGNALDESK_PROVIDER_DAILY_BUDGET_EXCEEDED");
    assert(cappedProviderCalls === 0, "Shared owned-email cap called the provider after capacity was exhausted");
    const [cappedAccountSnap, cappedBudgetSnap] = await Promise.all([
      ownedEmailSenderRef.get(),
      ownedEmailBudgetRef.get(),
    ]);
    assert(cappedAccountSnap.data()?.spentTodayUsd === 0.04, "Direct and sequence sends did not share the sender-account cap");
    assert(cappedBudgetSnap.data()?.spentTodayUsd === 0.04, "Direct and sequence sends did not share the sender-budget cap");

    const revokedSenderPolicy = await createPolicy("Owned sequence sender revocation");
    const revokedSenderReady = await prepareApprovedTarget(revokedSenderPolicy.sourcePolicyId, "OwnedSequenceSenderRevoked");
    const revokedSenderHandoff = await createSignalDeskSequencerHandoffServer(access, {
      approvalId: revokedSenderReady.approvalId,
      provider: "owned-email",
    });
    await upsertSignalDeskSenderDomainServer(access, {
      authenticationState: "partial",
      bounceRate: 0,
      brandRisk: "low",
      complaintRate: 0,
      domain: "menulist.test",
      idempotencyKey: "e2e-sender-domain-sequence-hold-v1",
      provider: "owned-email",
      status: "active",
      unsubscribeReady: false,
      volumeRampState: "paused",
    });
    let revokedSenderCalls = 0;
    signalDeskProviderAdapters.sendSignalDeskProviderMessage = async () => {
      revokedSenderCalls += 1;
      return { provider: "smtp-sequence-e2e", providerMessageId: "must-not-send", status: "sent" };
    };
    await expectRejects("Owned sequence after sender revocation", () => sendSignalDeskOwnedSequenceStepServer(access, {
      sequencerHandoffId: revokedSenderHandoff.sequencerHandoffId,
    }), "Sender domain is not ready");
    assert(revokedSenderCalls === 0, "Owned sequence called the provider after sender authority was revoked");
    await upsertSignalDeskSenderDomainServer(access, {
      authenticationState: "ready",
      bounceRate: 0,
      brandRisk: "low",
      complaintRate: 0,
      domain: "menulist.test",
      idempotencyKey: "e2e-sender-domain-sequence-restore-v1",
      provider: "owned-email",
      status: "active",
      unsubscribeReady: true,
      volumeRampState: "low_volume",
    });
  } finally {
    FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND = originalFlag;
    signalDeskProviderAdapters.sendSignalDeskProviderMessage = originalProviderSend;
    nodemailer.createTransport = originalCreateTransport;
    global.fetch = originalFetch;
    if (originalOwnedEmailSenderSnap.exists) await ownedEmailSenderRef.set(originalOwnedEmailSenderSnap.data());
    else await ownedEmailSenderRef.delete();
    if (originalOwnedEmailBudgetSnap.exists) await ownedEmailBudgetRef.set(originalOwnedEmailBudgetSnap.data());
    else await ownedEmailBudgetRef.delete();
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  }
}

async function assertCtaAndTrustBriefAuthorityIntegrity() {
  const partner = await upsertSignalDeskTrustPartnerProfileServer(access, {
    audienceFitScore: 90,
    baselineReachScore: 80,
    believableUsageScore: 90,
    channel: "community",
    commentQualityScore: 85,
    displayName: "CTA Authority Trust Partner",
    geography: "Bengaluru",
    partnerType: "local-community-operator",
    sourceNotes: "Deterministic local trust-brief authority fixture.",
    status: "approved",
    trustFeelScore: 90,
  });
  const briefInput = {
    approvedClaims: ["Owner reviews before publication", "Current list preview"],
    bannedClaims: ["Guaranteed ranking", "Guaranteed sales"],
    disclosureText: "Disclose that this is a MenuList partner brief.",
    onePageBrief: "Use only the approved claims and current CTA. Do not imply automated publication or guaranteed outcomes.",
    partnerId: partner.partnerId,
  };
  const brief = await createSignalDeskTrustPartnerBriefServer(access, briefInput);
  const briefRef = db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_BRIEFS).doc(brief.briefId);
  await briefRef.set({
    approvedClaims: [...brief.approvedClaims].reverse(),
    bannedClaims: [...brief.bannedClaims].reverse(),
  }, { merge: true });
  const reorderedReplay = await createSignalDeskTrustPartnerBriefServer(access, {
    ...briefInput,
    approvedClaims: [...briefInput.approvedClaims].reverse(),
    bannedClaims: [...briefInput.bannedClaims].reverse(),
  });
  assert(reorderedReplay.briefId === brief.briefId, "Reordered trust-brief claims created a duplicate deterministic brief");
  assert(reorderedReplay.ctaId === contentFixtureCtaId && reorderedReplay.ctaFingerprintHash?.length === 64, "Trust brief lost current CTA lineage");
  const trustBriefAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.action === "trust_partner_brief_create" && data.entityId === brief.briefId);
  assert(trustBriefAuditCount === 1, "Trust brief exact replay duplicated audit or cost effects");
  await expectRejects("Contradictory trust-brief claims", () => createSignalDeskTrustPartnerBriefServer(access, {
    ...briefInput,
    bannedClaims: ["Current list preview"],
  }), "TRUST_PARTNER_BRIEF_CLAIM_CONFLICT");

  const wrongProductBriefRef = db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_BRIEFS).doc("trust_brief_wrong_product_e2e");
  await wrongProductBriefRef.set({
    ...brief,
    briefId: wrongProductBriefRef.id,
    pId: "ML",
    status: "ready",
  });
  const malformedBriefRef = db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_BRIEFS).doc("trust_brief_malformed_same_product_e2e");
  await malformedBriefRef.set({
    approvedClaims: ["Current list preview"],
    bannedClaims: ["Guaranteed sales"],
    briefId: malformedBriefRef.id,
    ctaId: contentFixtureCtaId,
    disclosureRequired: true,
    disclosureText: "Disclose this partner relationship.",
    onePageBrief: "Malformed same-product dependency intentionally omits its CTA fingerprint.",
    pId: "SD",
    partnerId: partner.partnerId,
    status: "ready",
  });
  const holdInput = {
    copy: contentFixtureCtaCopy,
    ctaType: "preview",
    idempotencyKey: "preview-cta-trust-brief-hold-v1",
    label: "Private preview",
    status: "hold",
  };
  await expectRejects("Malformed same-product trust brief reconciliation", () => upsertSignalDeskSelfServiceCtaServer(access, holdInput), "TRUST_PARTNER_BRIEF_DEPENDENCY_SHAPE_INVALID");
  assert((await db.collection(SIGNALDESK_COLLECTIONS.SELF_SERVICE_CTAS).doc(contentFixtureCtaId).get()).data()?.dependentHoldReconciliationPending === true, "Malformed trust-brief dependency allowed CTA reconciliation to report clean");
  const partnersWorkspace = await loadSignalDeskWorkspaceServer(access, "partners");
  assert(!partnersWorkspace.workspace.trustPartnerBriefs.some((candidate) => candidate.briefId === wrongProductBriefRef.id || candidate.briefId === malformedBriefRef.id), "Wrong-product or malformed trust brief reached workspace consumers");
  await malformedBriefRef.delete();
  await upsertSignalDeskSelfServiceCtaServer(access, holdInput);
  assert((await briefRef.get()).data()?.status === "blocked", "CTA hold did not block its valid trust brief dependency");
  await upsertSignalDeskSelfServiceCtaServer(access, {
    ...holdInput,
    idempotencyKey: "preview-cta-trust-brief-restore-v1",
    status: "active",
  });
  assert((await briefRef.get()).data()?.status === "blocked", "CTA restore silently reactivated an already-blocked trust brief");
  await wrongProductBriefRef.delete();
}

async function assertNoMenuListTruthWrites() {
  for (const collectionName of ["stores", "menus", "projects", "billing"]) {
    const snap = await db.collection(collectionName).limit(1).get();
    assert(snap.empty, `SignalDesk E2E wrote MenuList truth collection ${collectionName}`);
  }
}

async function assertOutboundNotPaused(stage) {
  for (const scope of ["global-outbound", "email"]) {
    const pauseSnap = await db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc(`scope_${scope}`).get();
    assert(pauseSnap.data()?.status !== "active", `${stage} left ${scope} paused before the happy path`);
  }
}

const NON_SECRET_COORDINATION_TOKEN_KEYS = new Set([
  "canonicalreconciliationtoken",
  "contentauthorityreconciliationtoken",
  "dependentholdreconciliationtoken",
  "lastdependentholdreconciliationtoken",
  "lifecycletoken",
  "proofexpirylifecycletoken",
  "publicationreviewlifecycletoken",
  "publicationreviewreconciliationtoken",
  "reconciliationtoken",
  "sourcedatalifecycletoken",
]);

function inspectForSecrets(data, pathParts = []) {
  if (!data || typeof data !== "object") return;
  for (const [key, value] of Object.entries(data)) {
    const keyPath = [...pathParts, key].join(".");
    const normalizedKey = key.toLowerCase();
    assert(!["rawbody", "rawpayload", "providerpayload"].includes(normalizedKey), `Raw provider payload key stored at ${keyPath}`);
    if (!normalizedKey.endsWith("state") && !NON_SECRET_COORDINATION_TOKEN_KEYS.has(normalizedKey)) {
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
  const runStage = async (name, action) => {
    activeE2eCheckpoint = null;
    try {
      if (process.env.SIGNALDESK_E2E_DEBUG_STEPS === "1") console.log(`[SignalDesk E2E] stage:${name}:start`);
      const result = await action();
      if (strictProjectionSentinelTargetId) {
        const sentinelTarget = (await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(strictProjectionSentinelTargetId).get()).data();
        assert(
          !Object.prototype.hasOwnProperty.call(sentinelTarget || {}, "privateSecret"),
          `${name} restored the strict target projection private-secret sentinel`,
        );
      }
      if (process.env.SIGNALDESK_E2E_DEBUG_STEPS === "1") console.log(`[SignalDesk E2E] stage:${name}:passed`);
      return result;
    } catch (error) {
      const detail = error instanceof Error ? error.stack || error.message : String(error);
      const checkpoint = activeE2eCheckpoint ? ` at ${activeE2eCheckpoint}` : "";
      throw new Error(`SignalDesk E2E stage failed (${name})${checkpoint}: ${detail}`, { cause: error });
    }
  };
  if (process.env.SIGNALDESK_E2E_FOCUS === "seed") {
    console.log("SignalDesk focused seed E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "ai") {
    await runStage("ai-shadow-learning", assertAiShadowReviewLearning);
    await runStage("ai-volume", assertAiVolumeMode);
    console.log("SignalDesk focused AI E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "evidence") {
    await runStage("evidence-packets", assertEvidencePacketContracts);
    console.log("SignalDesk focused Evidence Packets E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "draft") {
    await runStage("draft-control", assertDraftControlContracts);
    console.log("SignalDesk focused Draft Control E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "authority") {
    await runStage("content-authority", assertContentAuthorityPublishedRemovalReconciliation);
    console.log("SignalDesk focused content-authority E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "operating") {
    await runStage("operating-layer", assertOperatingLayerContracts);
    console.log("SignalDesk focused Operating Layer E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "audience-segment") {
    await runStage("audience-segment", assertAudienceSegmentContracts);
    console.log("SignalDesk focused audience-segment E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "enrichment-waterfall-config") {
    await runStage("enrichment-waterfall-config", assertEnrichmentWaterfallConfigurationContracts);
    console.log("SignalDesk focused enrichment-waterfall configuration E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "model-route") {
    await runStage("model-route", assertModelRouteConfigurationContracts);
    console.log("SignalDesk focused model-route E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "provider-budget-config") {
    await runStage("provider-budget-config", assertProviderBudgetConfigurationContracts);
    console.log("SignalDesk focused provider/budget configuration E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "connector-setting-config") {
    await runStage("connector-setting-config", assertConnectorSettingConfigurationContracts);
    console.log("SignalDesk focused connector-setting configuration E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "revenue") {
    await runStage("revenue-operating-layer", assertRevenueOperatingLayer);
    console.log("SignalDesk focused Revenue Operating Layer E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "outcome-proof-content") {
    await runStage("outcome-proof-content", assertOutcomeIntegrityAndProofPermissions);
    console.log("SignalDesk focused outcome/proof/content E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "sender-outbound") {
    await runStage("sender-domain-authority", assertSenderDomainAuthorityIntegrity);
    await runStage("provider-send-recovery", assertProviderSendClaimAndRecovery);
    console.log("SignalDesk focused sender-outbound E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "idempotency-claims") {
    await runStage("fhrs-fhis-source-provider", assertFhrsFhisSourceProvider);
    await runStage("research-agent-table", assertResearchAgentTable);
    await runStage("ai-volume", assertAiVolumeMode);
    await runStage("sender-domain-authority", assertSenderDomainAuthorityIntegrity);
    await runStage("provider-send-recovery", assertProviderSendClaimAndRecovery);
    console.log("SignalDesk focused idempotency-claims E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "source-import") {
    await runStage("source-policy-import-contracts", assertSourcePolicyAndImportContracts);
    await runStage("import-dedupe", assertImportDedupe);
    console.log("SignalDesk focused source/import E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "happy-path") {
    await runStage("happy-path", assertHappyPath);
    console.log("SignalDesk focused happy-path E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "approval-export-negatives") {
    await runStage("approval-export-negatives", assertApprovalAndExportNegatives);
    console.log("SignalDesk focused approval/export negatives E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "source-negatives") {
    await runStage("source-policy-negatives", assertSourcePolicyNegatives);
    console.log("SignalDesk focused source-policy negatives E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "fhrs-fhis") {
    await runStage("fhrs-fhis-source-provider", assertFhrsFhisSourceProvider);
    console.log("SignalDesk focused FHRS/FHIS E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "provider-accounting") {
    await runStage("provider-budget-reservation", assertProviderBudgetReservation);
    await runStage("provider-evaluation-trust-accounting", assertProviderEvaluationAndTrustPartnerAccounting);
    console.log("SignalDesk focused provider-accounting E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "manual-contact") {
    await runStage("manual-contact-guards", assertManualContactGuards);
    console.log("SignalDesk focused manual-contact E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "limited-route") {
    await runStage("limited-route-revalidation", assertUnverifiedLimitedRouteRevalidation);
    console.log("SignalDesk focused limited-route E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "webhook-dnc") {
    const happy = await runStage("happy-path", assertHappyPath);
    await runStage("webhook-dnc", () => assertWebhookAndDncFixtures(happy.targetId));
    console.log("SignalDesk focused webhook/DNC E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "inbox") {
    await runStage("inbox-contracts", assertInboxContracts);
    console.log("SignalDesk focused Inbox E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "signed-outcome-bridge") {
    await runStage("signed-outcome-bridge", assertSignedOutcomeBridge);
    console.log("SignalDesk focused signed-outcome bridge E2E passed");
    return;
  }
  await runStage("sender-domain-authority", assertSenderDomainAuthorityIntegrity);
  await runStage("sender-domain-authority-pause-invariant", () => assertOutboundNotPaused("Sender-domain authority"));

  await runStage("team-access", assertTeamAccessManagement);
  await runStage("team-access-pause-invariant", () => assertOutboundNotPaused("Team access"));
  const happy = await runStage("happy-path", assertHappyPath);
  await runStage("evidence-packets", assertEvidencePacketContracts);
  await runStage("draft-control", assertDraftControlContracts);
  await runStage("import-dedupe", assertImportDedupe);
  await runStage("import-dedupe-pause-invariant", () => assertOutboundNotPaused("Import dedupe"));
  await runStage("source-policy-import-contracts", assertSourcePolicyAndImportContracts);
  await runStage("source-policy-import-pause-invariant", () => assertOutboundNotPaused("Source-policy/import contracts"));
  await runStage("revenue-operating-layer", assertRevenueOperatingLayer);
  await runStage("growth-mission", assertGrowthMissionIntegrity);
  await runStage("operating-layer", assertOperatingLayerContracts);
  await runStage("experiment-offer-authority", assertExperimentAndOfferAuthorityIntegrity);
  await runStage("webhook-dnc", () => assertWebhookAndDncFixtures(happy.targetId));
  await runStage("source-policy-negatives", assertSourcePolicyNegatives);
  await runStage("fhrs-fhis-source-provider", assertFhrsFhisSourceProvider);
  await runStage("provider-budget-reservation", assertProviderBudgetReservation);
  await runStage("provider-evaluation-trust-accounting", assertProviderEvaluationAndTrustPartnerAccounting);
  await runStage("research-agent-table", assertResearchAgentTable);
  await runStage("workflow-expiry", assertExpiryAcrossWorkflow);
  await runStage("approval-export-negatives", assertApprovalAndExportNegatives);
  await runStage("provider-send-recovery", assertProviderSendClaimAndRecovery);
  await runStage("cta-trust-brief-authority", assertCtaAndTrustBriefAuthorityIntegrity);
  await runStage("manual-contact-guards", assertManualContactGuards);
  await runStage("limited-route-revalidation", assertUnverifiedLimitedRouteRevalidation);
  await runStage("ai-shadow-learning", assertAiShadowReviewLearning);
  await runStage("ai-volume", assertAiVolumeMode);
  await runStage("mobile-read-only", assertMobileReadOnlyContract);
  await runStage("outcome-proof-content", assertOutcomeIntegrityAndProofPermissions);
  await runStage("content-authority", assertContentAuthorityPublishedRemovalReconciliation);
  await runStage("signed-outcome-bridge", assertSignedOutcomeBridge);
  await runStage("complaint-circuit-breaker", assertComplaintCircuitBreaker);
  await runStage("inbox-contracts", assertInboxContracts);
  await runStage("menulist-boundary", assertNoMenuListTruthWrites);
  await runStage("payload-secret-scan", assertNoRawPayloadsOrSecrets);

  console.log("SignalDesk local E2E passed");
}

main()
  .catch((error) => {
    console.error("SignalDesk local E2E failed");
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exit(1);
  });
