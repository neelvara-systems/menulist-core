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
const nodemailer = require("nodemailer9");
const path = require("path");
const { SIGNALDESK_COLLECTIONS, SIGNALDESK_SUMMARY_DOCS } = require("@constant/signaldesk/database");
const { SIGNALDESK_OUTCOME_ROUTE_SCOPE } = require("@constant/signaldesk/integrations");
const { SIGNALDESK_PRODUCT_CODE } = require("@constant/signaldesk/product");
const { FEATURE_FLAGS } = require("@config/features");
const { admin, signaldeskFirestoreAdmin } = require("@lib/firebase/signaldeskFirebaseAdmin");
const { isSignalDeskMobileRequest } = require("@lib/signaldesk/apiGuards");
const { getSignalDeskAccessContext } = require("@lib/signaldesk/access");
const { recordSignalDeskMobileActionBlockedServer } = require("@lib/signaldesk/server");
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
const { SignalDeskSourcePolicyCreateSchema } = require("@lib/signaldesk/sourcePolicyContracts");
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
  refreshSignalDeskActivationWatchServer,
  revokeSignalDeskRouteTokenServer,
  reviewSignalDeskApprovalServer,
  reviewSignalDeskAiShadowRunServer,
  reviewSignalDeskContentAssetServer,
  reviewSignalDeskContentDistributionDraftServer,
  reviewSignalDeskExperimentCardServer,
  reviewSignalDeskGrowthMissionServer,
  reviewSignalDeskMarketPodServer,
  reviewSignalDeskTrustPartnerDealServer,
  runSignalDeskAiAssistServer,
  runSignalDeskAiVolumeBatchServer,
  runSignalDeskEnrichmentWaterfallServer,
  runSignalDeskSourceProviderServer,
  scoreSignalDeskTargetServer,
  scheduleSignalDeskContentDistributionDraftServer,
  seedSignalDeskDefaultsServer,
  sendSignalDeskApprovedMessageServer,
  sendSignalDeskOwnedSequenceStepServer,
  upsertSignalDeskChannelWindowStateServer,
  upsertSignalDeskBudgetPolicyServer,
  upsertSignalDeskCommercialOfferServer,
  upsertSignalDeskCommercialOpportunityServer,
  upsertSignalDeskContentSourceServer,
  upsertSignalDeskProofPermissionServer,
  upsertSignalDeskSelfServiceCtaServer,
  createSignalDeskContentAssetServer,
  generateSignalDeskContentDistributionDraftsServer,
  upsertSignalDeskOperatingEnvelopeServer,
  upsertSignalDeskOfferCtaServer,
  upsertSignalDeskSenderDomainServer,
  upsertSignalDeskTeamMemberServer,
  upsertSignalDeskTrustPartnerProfileServer,
} = require("@lib/signaldesk/workflowServer");
const { processSignalDeskOutcomeBridge } = require("@lib/signaldesk/outcomeBridgeServer");
const { assertSignalDeskWorkspaceDocument } = require("@lib/signaldesk/workspaceContracts");

const db = signaldeskFirestoreAdmin;
const timestampNow = () => admin.firestore.Timestamp.now();
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
  await db.collection(SIGNALDESK_COLLECTIONS.TEAM_MEMBERS).doc(access.userId).set({
    active: true,
    email: access.email,
    name: access.name,
    role: access.role,
    updatedAt: timestampNow(),
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
  await templateRef.delete();
  const seedAuditCountBeforeConvergence = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.action === "seed_defaults");
  await Promise.all([
    seedSignalDeskDefaultsServer(access),
    seedSignalDeskDefaultsServer(access),
  ]);
  assert((await templateRef.get()).exists, "Concurrent default seeding did not converge the one missing template");
  const seedAuditCountAfterConvergence = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.action === "seed_defaults");
  assert(seedAuditCountAfterConvergence === seedAuditCountBeforeConvergence + 1, "Concurrent missing-row convergence emitted duplicate seed side effects");
  const seedTimelineRef = db.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES).doc("market-pod_defaults");
  const dailyCostRef = db.collection(SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES).doc(new Date().toISOString().slice(0, 10));
  const seedTimelineBeforeCleanReplay = (await seedTimelineRef.get()).data()?.updatedAt?.toMillis?.();
  const seedCostBeforeCleanReplay = (await dailyCostRef.get()).data()?.firestoreWriteEstimate;
  await Promise.all([
    seedSignalDeskDefaultsServer(access),
    seedSignalDeskDefaultsServer(access),
  ]);
  const seedAuditCountAfterCleanReplay = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.action === "seed_defaults");
  assert(seedAuditCountAfterCleanReplay === seedAuditCountAfterConvergence, "Clean concurrent seed replay emitted a seed audit side effect");
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
  assert(migratedScoreRoute?.defaultModel === "gemini-2.5-flash-lite", "Exact legacy score route was not migrated to the current fast model");
  assert(migratedScoreRoute?.escalationProvider === "gemini" && migratedScoreRoute?.escalationModel === "gemini-2.5-flash", "Exact legacy score route retained stale cross-provider escalation");
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
  assert((await legacyEvidenceRouteRef.get()).data()?.defaultModel === "gemini-2.5-flash-lite", "Missing evidence route did not converge to the current default");
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
  await contentPauseRef.set({ status: "active", updatedAt: timestampNow() });
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
  const refreshedApprovedPod = await recommendSignalDeskMarketPodPlanServer(access, { marketPodId: firstPodSnap.id });
  assert(refreshedApprovedPod.status === "active" && refreshedApprovedPod.approvedBy === access.userId, "System recommendation rewrote founder market-pod approval");
  assert(refreshedApprovedPod.monthlyBudgetUsd === 0, "System recommendation attached unapproved market-pod spend");
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
  const originalApifyToken = process.env.MENULIST_SIGNALDESK_APIFY_API_TOKEN;
  const originalApifyActor = process.env.MENULIST_SIGNALDESK_APIFY_SOURCE_ACTOR_ID;
  process.env.MENULIST_SIGNALDESK_APIFY_API_TOKEN = "local-source-contract-token";
  process.env.MENULIST_SIGNALDESK_APIFY_SOURCE_ACTOR_ID = "local/source-contract";
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
    if (originalApifyToken === undefined) delete process.env.MENULIST_SIGNALDESK_APIFY_API_TOKEN;
    else process.env.MENULIST_SIGNALDESK_APIFY_API_TOKEN = originalApifyToken;
    if (originalApifyActor === undefined) delete process.env.MENULIST_SIGNALDESK_APIFY_SOURCE_ACTOR_ID;
    else process.env.MENULIST_SIGNALDESK_APIFY_SOURCE_ACTOR_ID = originalApifyActor;
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
  await expectRejects("Conflicting enrichment-waterfall key reuse", () => runSignalDeskEnrichmentWaterfallServer(access, { ...waterfallInput, waterfallId: "waterfall_changed" }), "ENRICHMENT_WATERFALL_IDEMPOTENCY_CONFLICT");
  const waterfallVendorCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.VENDOR_RUNS, (data) => data.waterfallId === waterfallId && data.targetId === targetId);
  assert(waterfallVendorCount === 1, "Concurrent enrichment waterfall retry duplicated vendor truth");
  const sourceProviderPauseRef = db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc("scope_source-provider");
  await sourceProviderPauseRef.set({ status: "active" }, { merge: true });
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

  const queueBeforeDraft = await db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.QUEUES)
    .get();
  const approvalBacklogBeforeDraft = Number(queueBeforeDraft.data()?.approvalBacklog || 0);
  const humanReviewBeforeDraft = Number(queueBeforeDraft.data()?.humanReview || 0);
  const [draftResult, duplicateDraftResult] = await Promise.all([
    createSignalDeskDraftServer(access, { targetId }),
    createSignalDeskDraftServer(access, { targetId }),
  ]);
  checkpoint("draft:complete");
  assert(draftResult.draft.draftId === duplicateDraftResult.draft.draftId, "Concurrent identical draft creation produced duplicate drafts");
  assert(draftResult.approval.approvalId === duplicateDraftResult.approval.approvalId, "Concurrent identical draft creation produced duplicate approvals");
  assert(draftResult.approvalPacket.approvalPacketId === duplicateDraftResult.approvalPacket.approvalPacketId, "Concurrent identical draft creation produced duplicate approval packets");
  const draftCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES, (data) => data.targetId === targetId);
  const approvalCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE, (data) => data.targetId === targetId);
  const approvalPacketCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS, (data) => data.targetId === targetId);
  assert(draftCount === 1, "Concurrent identical draft creation wrote duplicate draft summaries");
  assert(approvalCount === 1, "Concurrent identical draft creation wrote duplicate approval queue items");
  assert(approvalPacketCount === 1, "Concurrent identical draft creation wrote duplicate approval packets");
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
  const [refreshedPacket, duplicateRefreshedPacket] = await Promise.all([
    createSignalDeskApprovalPacketServer(access, { approvalId: draftResult.approval.approvalId }),
    createSignalDeskApprovalPacketServer(access, { approvalId: draftResult.approval.approvalId }),
  ]);
  assert(refreshedPacket.approvalPacketId === draftResult.approvalPacket.approvalPacketId, "Approval packet refresh repointed the pending approval");
  assert(duplicateRefreshedPacket.approvalPacketId === refreshedPacket.approvalPacketId, "Concurrent identical approval packet refresh created duplicate packet identity");
  const refreshedApprovalPacketCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS, (data) => data.targetId === targetId);
  assert(refreshedApprovalPacketCount === 1, "Concurrent identical approval packet refresh wrote duplicate packet truth");

  await db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(draftResult.draft.draftId).set({
    body: `${draftResult.draft.body}\nChanged after founder packet preparation.`,
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

  const [exportResult, duplicateExportResult] = await Promise.all([
    exportSignalDeskMessageServer(access, draftResult.approval.approvalId),
    exportSignalDeskMessageServer(access, draftResult.approval.approvalId),
  ]);
  checkpoint("export:complete");
  assert(exportResult.status === "exported", "Export-only handoff was not created");
  assert(exportResult.exportId === duplicateExportResult.exportId, "Concurrent identical export preparation created duplicate exports");
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
  await expectRejects("Historical export with noncanonical preview CTA lineage", () => exportSignalDeskMessageServer(access, draftResult.approval.approvalId), "CONTENT_CTA_LEGACY_IDENTITY_CONFLICT");
  await exportSnap.docs[0].ref.set({
    ctaFingerprintHash: draftResult.draft.ctaFingerprintHash,
    ctaId: draftResult.draft.ctaId,
  }, { merge: true });
  await roguePreviewRef.delete();

  await canonicalCtaRef.set({ status: "hold", updatedAt: timestampNow() }, { merge: true });
  await expectRejects("Historical export replay after CTA revocation", () => exportSignalDeskMessageServer(access, draftResult.approval.approvalId), "CONTENT_CTA_NOT_ACTIVE");
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
    channel: "email",
    idempotencyKey: `reply-happy-${targetId}`,
    message: "Yes, send details.",
    targetId,
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
    channel: "email",
    idempotencyKey: `reply-after-conversion-${targetId}`,
    message: "Thank you, we have completed this.",
    targetId,
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
  await db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_PROFILES).doc(trustPartnerId).set({ displayName: "Metrics Partner", pId: "SD", partnerId: trustPartnerId });
  await db.collection(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_DELIVERABLES).doc(trustDeliverableId).set({ deliverableId: trustDeliverableId, pId: "SD", partnerId: trustPartnerId });
  const trustMetricInput = { activations: 0, commentQuality: "medium", comments: 2, currentListSubmissions: 0, deliverableId: trustDeliverableId, idempotencyKey: `trust-metrics-${targetId}`, ownerLeads: 1, partnerId: trustPartnerId, views: 20 };
  const [trustMetric, trustMetricReplay] = await Promise.all([
    recordSignalDeskTrustPartnerMetricsServer(access, trustMetricInput),
    recordSignalDeskTrustPartnerMetricsServer(access, trustMetricInput),
  ]);
  assert(trustMetric.metricsId === trustMetricReplay.metricsId, "Concurrent trust metrics did not converge");
  await expectRejects("Conflicting trust-metrics key reuse", () => recordSignalDeskTrustPartnerMetricsServer(access, { ...trustMetricInput, views: 21 }), "TRUST_PARTNER_METRICS_IDEMPOTENCY_CONFLICT");
  await expectRejects("Unknown trust-metrics deliverable", () => recordSignalDeskTrustPartnerMetricsServer(access, { ...trustMetricInput, deliverableId: "deliverable_missing", idempotencyKey: `trust-metrics-missing-${targetId}` }), "Trust partner deliverable not found");
  await recordSignalDeskTrustPartnerMetricsServer(access, { ...trustMetricInput, idempotencyKey: `trust-metrics-second-${targetId}`, ownerLeads: 2 });
  const trustDemandSnap = await db.collection(SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES).doc(`trust_partner_${trustPartnerId}_${new Date().toISOString().slice(0, 10)}`).get();
  assert(trustDemandSnap.data()?.count === 3, "Trust metrics demand summary overwrote incremental observations");
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
  const [performance, performanceReplay] = await Promise.all([
    recordSignalDeskContentPerformanceServer(access, performanceInput),
    recordSignalDeskContentPerformanceServer(access, performanceInput),
  ]);
  assert(performance.contentPerformanceId === performanceReplay.contentPerformanceId, "Concurrent content performance did not converge");
  await expectRejects("Mismatched content-performance draft", () => recordSignalDeskContentPerformanceServer(access, { ...performanceInput, channel: "instagram", idempotencyKey: `content-performance-mismatch-${targetId}` }), "CONTENT_PERFORMANCE_DRAFT_MISMATCH");
  await recordSignalDeskContentPerformanceServer(access, { ...performanceInput, idempotencyKey: `content-performance-second-${targetId}`, ownerLeads: 2 });
  const contentDemandSnap = await db.collection(SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES).doc(`content_${contentAssetId}_${new Date().toISOString().slice(0, 10)}`).get();
  assert(contentDemandSnap.data()?.count === 3, "Content performance demand summary overwrote incremental observations");
  const publishedPerformanceDraftSnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS).doc(contentDraftId).get();
  const publishedPerformanceCalendarSnap = await db.collection(SIGNALDESK_COLLECTIONS.CONTENT_CALENDAR_ITEMS).doc(contentCalendarItemId).get();
  assert(publishedPerformanceDraftSnap.data()?.status === "published", "Content performance fixture did not mark its approved draft published");
  assert(publishedPerformanceCalendarSnap.data()?.status === "published", "Content performance fixture did not mark its matching calendar item published");
  assert(publishedPerformanceCalendarSnap.data()?.publicationUrl === performanceInput.publicationUrl, "Content performance fixture lost publication URL evidence");
  const contentPauseRef = db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc("scope_content-distribution");
  await contentPauseRef.set({ status: "active" }, { merge: true });
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
  assert(summary.revenueAccountCount === 5, "Revenue summary did not count reply-created, published-only, and qualified revenue accounts exactly");
  assert(summary.openOpportunityCount === 1, "Published-only opportunity was not preserved as open");
  assert(summary.pipelineCurrency === "INR", "Revenue summary did not preserve pipeline currency");
  assert(summary.pipelineValueMinor === 0, "Activated opportunity remained in pipeline value");
  assert(summary.weightedPipelineValueMinor === 0, "Activated opportunity remained in weighted pipeline value");
  assert(summary.activatedAccountCount === 3, "Revenue summary did not count automatically activated and reconciled accounts exactly");
  assert(summary.wonOpportunityCount === 3, "Revenue summary did not count reply activation, qualified activation, and pre-converted wins exactly");
  assert(summary.founderAttentionMinutes >= 12, "Revenue summary did not record founder attention");
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

  const contactBlockedPolicy = await createPolicy("No contact export", { allowContact: false });
  const heldTargetId = await importOne(contactBlockedPolicy.sourcePolicyId, "NoContact", { email: "blocked@example.invalid" });
  const heldTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(heldTargetId).get();
  assert(heldTargetSnap.data()?.contactability === "blocked", "Contact-disallowed import did not block contactability");
  await scoreSignalDeskTargetServer(access, heldTargetId);
  await createSignalDeskEvidenceServer(access, heldTargetId);
  const heldDraft = await createSignalDeskDraftServer(access, { targetId: heldTargetId });
  assert(heldDraft.approvalPacket.allowedRoute === "none", "Evidence-only target received an allowed contact route");
  assert(heldDraft.approvalPacket.recommendedAction === "hold", "Evidence-only target was presented as approval-ready");
  await expectRejects("Approval without an allowed contact route", () => reviewSignalDeskApprovalServer(access, {
    approvalId: heldDraft.approval.approvalId,
    reason: "Must remain held without contact authority.",
    status: "approved",
  }), "Approval packet is not action-ready");
  const heldApprovalSnap = await db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(heldDraft.approval.approvalId).get();
  assert(heldApprovalSnap.data()?.status === "pending", "Blocked action-ready review changed approval state");

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
  process.env.MENULIST_SIGNALDESK_APIFY_API_TOKEN = "apify-test-token";
  process.env.MENULIST_SIGNALDESK_APIFY_SOURCE_ACTOR_ID = "owner/test-actor";
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
  const initialEvaluation = await createSignalDeskProviderEvaluationServer(access, {
    provider: "apify",
    use: "discovery",
  });
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
    provider: "apify",
    use: "discovery",
  });
  assert(isolatedEvaluation.sampleSize === 1, "Provider evaluation mixed another provider, use, or accounting month");
  await Promise.all(unrelatedVendorRefs.map((ref) => ref.delete()));

  const partner = await upsertSignalDeskTrustPartnerProfileServer(access, {
    audienceFitScore: 90,
    baselineReachScore: 80,
    believableUsageScore: 90,
    channel: "community",
    commentQualityScore: 85,
    displayName: "Accounting Trust Partner",
    geography: "Bengaluru",
    partnerType: "operator-advocate",
    sourceNotes: "Deterministic trust-partner accounting fixture.",
    status: "approved",
    trustFeelScore: 90,
  });
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
  }), "Approval is stale");

  const suppressedPolicy = await createPolicy("Suppressed export");
  const suppressedReady = await prepareApprovedTarget(suppressedPolicy.sourcePolicyId, "SuppressedExport");
  await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(suppressedReady.targetId).set({
    suppressionStatus: "suppressed",
    updatedAt: timestampNow(),
  }, { merge: true });
  await expectRejects("Suppressed contact export", () => exportSignalDeskMessageServer(access, suppressedReady.approvalId), "Target is suppressed");

  const assistedPolicy = await createPolicy("Concurrent assisted handoff");
  const assistedReady = await prepareApprovedTarget(assistedPolicy.sourcePolicyId, "ConcurrentAssistedHandoff");
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
  await expectRejects("Content-bearing export replay after sender authority changed", () => (
    exportSignalDeskMessageServer(access, senderReady.approvalId)
  ), "DRAFT_SENDER_AUTHORITY_STALE");
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
  assert(boundExportReplay.exportId === boundExport.exportId && boundExportReplay.body === boundExport.body, "Validated export replay lost durable content truth");

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
  await expectRejects("Assisted handoff replay after sender authority changed", () => (
    prepareSignalDeskChannelHandoffServer(access, { approvalId: assistedReady.approvalId, channel: "email" })
  ), "DRAFT_SENDER_AUTHORITY_STALE");
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
  assert(assistedValidatedReplay.replay === true && assistedValidatedReplay.recipient === null, "Assisted handoff replay did not return a redacted historical acknowledgement");
  await db.collection(SIGNALDESK_COLLECTIONS.SENDER_DOMAINS).doc(alternateSender.senderDomainId).delete();
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
    idempotencyKey: `reply-dnc-${targetId}`,
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
  await createSignalDeskEvidenceServer(access, targetId);
  let proofGrantOffsetMs = 0;
  const nextProofGrantIso = () => new Date(Date.now() + (proofGrantOffsetMs += 1000)).toISOString();
  await captureSignalDeskReplyServer(access, {
    channel: "email",
    idempotencyKey: `reply-activation-${targetId}`,
    message: "Yes, I want to review the preview.",
    targetId,
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
    channel: "email",
    idempotencyKey: `reply-legacy-${legacyTargetId}`,
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
  const [contentSource, contentSourceReplay] = await Promise.all([
    upsertSignalDeskContentSourceServer(access, contentSourceInput),
    upsertSignalDeskContentSourceServer(access, contentSourceInput),
  ]);
  assert(contentSource.contentSourceId === contentSourceReplay.contentSourceId, "Concurrent content-source update did not converge");
  assert(contentSource.sourceUrl === "https://menulist.ai/", "Content source URL was not canonicalized safely");
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
  const [permission, permissionReplay] = await Promise.all([
    upsertSignalDeskProofPermissionServer(access, proofPermissionInput),
    upsertSignalDeskProofPermissionServer(access, proofPermissionInput),
  ]);
  assert(permission.proofPermissionId === permissionReplay.proofPermissionId, "Concurrent proof permission did not converge");
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
  let [asset, assetReplay] = await Promise.all([
    createSignalDeskContentAssetServer(access, contentAssetInput),
    createSignalDeskContentAssetServer(access, contentAssetInput),
  ]);
  assert(asset.contentAssetId === assetReplay.contentAssetId, "Concurrent content asset creation did not converge");
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
  const [drafts, draftReplay] = await Promise.all([
    generateSignalDeskContentDistributionDraftsServer(access, draftGenerationInput),
    generateSignalDeskContentDistributionDraftsServer(access, draftGenerationInput),
  ]);
  assert(drafts.length === 1, "Permissioned proof did not generate one review-gated draft");
  assert(drafts[0].contentDraftId === draftReplay[0].contentDraftId, "Concurrent content draft generation did not converge");
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
  const queueBeforeContentReview = await db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.QUEUES).get();
  const humanReviewBeforeContentReview = Number(queueBeforeContentReview.data()?.humanReview || 0);
  const [reviewedDraft, reviewedDraftReplay] = await Promise.all([
    reviewSignalDeskContentDistributionDraftServer(access, contentReviewInput),
    reviewSignalDeskContentDistributionDraftServer(access, contentReviewInput),
  ]);
  assert(reviewedDraft.contentDraftId === reviewedDraftReplay.contentDraftId, "Concurrent content review did not converge");
  const queueAfterContentReview = await db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.QUEUES).get();
  assert(Number(queueAfterContentReview.data()?.humanReview || 0) === humanReviewBeforeContentReview - 1, "Concurrent content review did not settle the human-review queue exactly once");
  await expectRejects("Conflicting content review key reuse", () => reviewSignalDeskContentDistributionDraftServer(access, { ...contentReviewInput, approvalStatus: "rejected" }), "CONTENT_REVIEW_IDEMPOTENCY_CONFLICT");
  const contentReviewAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.action === "content_distribution_draft_review" && data.entityId === drafts[0].contentDraftId);
  assert(contentReviewAuditCount === 1, "Concurrent content review duplicated audit effects");
  const scheduleInput = {
    contentDraftId: drafts[0].contentDraftId,
    idempotencyKey: `content-schedule-${targetId}`,
    scheduledFor: futureIso(2),
    status: "queued",
  };
  const [calendarItem, calendarReplay] = await Promise.all([
    scheduleSignalDeskContentDistributionDraftServer(access, scheduleInput),
    scheduleSignalDeskContentDistributionDraftServer(access, scheduleInput),
  ]);
  assert(calendarItem.contentCalendarItemId === calendarReplay.contentCalendarItemId, "Concurrent content scheduling did not converge");
  await expectRejects("Conflicting content schedule key reuse", () => scheduleSignalDeskContentDistributionDraftServer(access, { ...scheduleInput, status: "hold" }), "CONTENT_SCHEDULE_IDEMPOTENCY_CONFLICT");
  await expectRejects("Queued content draft regeneration", () => generateSignalDeskContentDistributionDraftsServer(access, {
    channels: [drafts[0].channel],
    contentAssetId: asset.contentAssetId,
    idempotencyKey: `content-drafts-queued-regeneration-${targetId}`,
  }), "CONTENT_DRAFT_ALREADY_EXISTS");
  const contentScheduleAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.action === "content_distribution_draft_schedule" && data.entityId === drafts[0].contentDraftId);
  assert(contentScheduleAuditCount === 1, "Concurrent content scheduling duplicated audit effects");
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
  const approvedDraftPerformance = await recordSignalDeskContentPerformanceServer(access, {
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
  });
  assert(approvedDraftPerformance.contentPerformanceId, "Approved content draft performance was not recorded");
  assert(approvedDraftPerformance.publicationUrl === performancePublicationUrl, "Approved content draft performance lost publication provenance");
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
  await contentPauseRef.set({ status: "active" }, { merge: true });
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
    channel: "email",
    idempotencyKey: `reply-route-${targetId}`,
    message: "Yes, please prepare the owner review route.",
    targetId,
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
  assert(storedRoute.data()?.sourceActionId, "Signed bridge route token lost its source action attribution");
  assert(storedRoute.data()?.revokedAt === null, "New signed bridge route token was created revoked");

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
    channel: "email",
    idempotencyKey: `reply-complaint-${targetId}`,
    message: "This is an unwanted message and I am making a complaint.",
    targetId,
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
    "MENULIST_SIGNALDESK_SMTP_HOST",
    "MENULIST_SIGNALDESK_SMTP_USER",
    "MENULIST_SIGNALDESK_SMTP_PASS",
    "MENULIST_SIGNALDESK_SMTP_PORT",
    "MENULIST_SIGNALDESK_SMTP_SECURE",
    "MENULIST_SIGNALDESK_EMAIL_FROM",
    "MENULIST_SIGNALDESK_EMAIL_REPLY_TO",
    "MENULIST_SIGNALDESK_PHYSICAL_ADDRESS",
    "MENULIST_SIGNALDESK_UNSUBSCRIBE_URL",
    "MENULIST_SIGNALDESK_META_ACCESS_TOKEN",
    "MENULIST_SIGNALDESK_WHATSAPP_PHONE_NUMBER_ID",
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
    for (const key of envKeys) process.env[key] = key === "MENULIST_SIGNALDESK_UNSUBSCRIBE_URL"
      ? "https://example.invalid/unsubscribe"
      : key === "MENULIST_SIGNALDESK_EMAIL_FROM"
        ? "MenuList <sender@example.invalid>"
        : key === "MENULIST_SIGNALDESK_SMTP_PORT"
          ? "587"
        : key === "MENULIST_SIGNALDESK_SMTP_SECURE"
          ? "false"
        : key === "MENULIST_SIGNALDESK_EMAIL_REPLY_TO"
          ? ""
        : key === "MENULIST_SIGNALDESK_PHYSICAL_ADDRESS"
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
    process.env.MENULIST_SIGNALDESK_EMAIL_FROM = "not-a-mailbox";
    await expectRejects("SMTP malformed From mailbox", () => originalProviderSend({
      body: "Authority check only.",
      channel: "email",
      recipient: "recipient@example.invalid",
      senderDomain: "menulist.test",
      subject: "Authority check",
    }), "EMAIL_SENDER_FROM_INVALID");

    process.env.MENULIST_SIGNALDESK_EMAIL_FROM = "MenuList <sender@menulist.test>";
    process.env.MENULIST_SIGNALDESK_EMAIL_REPLY_TO = "not-a-mailbox";
    await expectRejects("SMTP malformed Reply-To mailbox", () => originalProviderSend({
      body: "Authority check only.",
      channel: "email",
      recipient: "recipient@example.invalid",
      senderDomain: "menulist.test",
      subject: "Authority check",
    }), "EMAIL_REPLY_TO_INVALID");
    process.env.MENULIST_SIGNALDESK_EMAIL_REPLY_TO = "reply@menulist.test";
    process.env.MENULIST_SIGNALDESK_SMTP_SECURE = "definitely";
    await expectRejects("SMTP malformed TLS mode", () => originalProviderSend({
      body: "Authority check only.",
      channel: "email",
      recipient: "recipient@example.invalid",
      senderDomain: "menulist.test",
      subject: "Authority check",
    }), "EMAIL_SMTP_SECURE_INVALID");
    process.env.MENULIST_SIGNALDESK_SMTP_SECURE = "false";
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
      return { provider: "smtp-e2e", providerMessageId: "provider-message-e2e", status: "sent" };
    };
    const providerOperationHash = hashValue(`${ready.approvalId}|email|provider-send-v1`).slice(0, 32);
    const providerClaimRef = db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS).doc(`provider_send_${providerOperationHash}`);
    const providerExportId = `send_${providerOperationHash}`;
    process.env.MENULIST_SIGNALDESK_SMTP_PORT = "70000";
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
    process.env.MENULIST_SIGNALDESK_SMTP_PORT = "587";
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

    const unresolvedPolicy = await createPolicy("Provider send unresolved");
    const unresolvedReady = await prepareApprovedTarget(unresolvedPolicy.sourcePolicyId, "ProviderSendUnresolved");
    let unresolvedProviderCalls = 0;
    signalDeskProviderAdapters.sendSignalDeskProviderMessage = async () => {
      unresolvedProviderCalls += 1;
      throw new Error("ambiguous provider fixture");
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
      return { provider: "smtp-sequence-e2e", providerMessageId: "sequence-provider-message-e2e", status: "sent" };
    };
    const sequenceOperationHash = hashValue(`${sequenceHandoff.sequencerHandoffId}|owned-sequence-send-v1`).slice(0, 32);
    const sequenceClaimRef = db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS).doc(`owned_sequence_send_${sequenceOperationHash}`);
    process.env.MENULIST_SIGNALDESK_PHYSICAL_ADDRESS = "x".repeat(501);
    await expectRejects("Owned sequence deterministic preflight before claim", () => sendSignalDeskOwnedSequenceStepServer(access, {
      sequencerHandoffId: sequenceHandoff.sequencerHandoffId,
    }), "EMAIL_PHYSICAL_ADDRESS_INVALID");
    assert(!(await sequenceClaimRef.get()).exists, "Deterministic owned-sequence preflight failure created a send claim");
    assert(sequenceProviderCalls === 0, "Deterministic owned-sequence preflight failure called the provider");
    const sequencePreflightAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => (
      data.action === "owned_sequence_send_started" && data.entityId === sequenceHandoff.sequencerHandoffId
    ));
    assert(sequencePreflightAuditCount === 0, "Deterministic owned-sequence preflight failure wrote a send-start audit");
    process.env.MENULIST_SIGNALDESK_PHYSICAL_ADDRESS = "Local E2E address";
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
      throw new Error("ambiguous owned sequence fixture");
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
    await runStage("ai-volume", assertAiVolumeMode);
    console.log("SignalDesk focused AI E2E passed");
    return;
  }
  if (process.env.SIGNALDESK_E2E_FOCUS === "authority") {
    await runStage("content-authority", assertContentAuthorityPublishedRemovalReconciliation);
    console.log("SignalDesk focused content-authority E2E passed");
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
  await runStage("import-dedupe", assertImportDedupe);
  await runStage("import-dedupe-pause-invariant", () => assertOutboundNotPaused("Import dedupe"));
  await runStage("source-policy-import-contracts", assertSourcePolicyAndImportContracts);
  await runStage("source-policy-import-pause-invariant", () => assertOutboundNotPaused("Source-policy/import contracts"));
  await runStage("revenue-operating-layer", assertRevenueOperatingLayer);
  await runStage("growth-mission", assertGrowthMissionIntegrity);
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
