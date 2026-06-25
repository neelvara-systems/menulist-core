process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.MENULIST_SIGNALDESK_FIREBASE_MODE = process.env.MENULIST_SIGNALDESK_FIREBASE_MODE || "separate";
process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "demo-signaldesk";
process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID || process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID;
process.env.MENULIST_SIGNALDESK_EMAIL_WEBHOOK_SECRET = process.env.MENULIST_SIGNALDESK_EMAIL_WEBHOOK_SECRET || "local-signaldesk-webhook-secret";

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
const { admin, signaldeskFirestoreAdmin } = require("@lib/firebase/signaldeskFirebaseAdmin");
const { isSignalDeskMobileRequest } = require("@lib/signaldesk/apiGuards");
const { getSignalDeskAccessContext } = require("@lib/signaldesk/access");
const { recordSignalDeskMobileActionBlockedServer } = require("@lib/signaldesk/server");
const { processSignalDeskProviderWebhook } = require("@lib/signaldesk/webhookServer");
const {
  captureSignalDeskDemandSignalServer,
  captureSignalDeskReplyServer,
  createSignalDeskDraftServer,
  createSignalDeskEvidenceServer,
  createSignalDeskResearchAgentRunServer,
  createSignalDeskSourcePolicyServer,
  exportSignalDeskMessageServer,
  importSignalDeskTargetsServer,
  loadSignalDeskWorkspaceServer,
  recordSignalDeskOutcomeServer,
  reviewSignalDeskApprovalServer,
  runSignalDeskSourceProviderServer,
  scoreSignalDeskTargetServer,
  seedSignalDeskDefaultsServer,
  sendSignalDeskApprovedMessageServer,
  upsertSignalDeskSenderDomainServer,
  upsertSignalDeskTeamMemberServer,
} = require("@lib/signaldesk/workflowServer");

const db = signaldeskFirestoreAdmin;
const timestampNow = () => admin.firestore.Timestamp.now();
const hashValue = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const futureIso = (days = 30) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
const pastIso = () => "2000-01-01T00:00:00.000Z";

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
    allowContact: overrides.allowContact ?? true,
    allowEvidence: overrides.allowEvidence ?? true,
    allowPersonalization: overrides.allowPersonalization ?? true,
    expiresAt: overrides.expiresAt ?? futureIso(30),
    name: `${label} source policy`,
    notes: "Local deterministic SignalDesk E2E fixture.",
    provider: overrides.provider,
    retentionDays: overrides.retentionDays ?? 30,
    sourceType: overrides.sourceType || "manual-research",
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

  const reply = await captureSignalDeskReplyServer(access, {
    channel: "email",
    message: "Yes, send details.",
    targetId,
  });
  assert(reply.state === "interested", `Reply was not classified as interested: ${reply.state}`);

  const classificationCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.REPLY_CLASSIFICATIONS, (data) => data.targetId === targetId && data.state === "interested");
  assert(classificationCount > 0, "Reply classification was not recorded");

  const outcome = await recordSignalDeskOutcomeServer(access, {
    channel: "email",
    outcomeType: "two_surface_activation",
    source: "manual",
    targetId,
  });
  assert(outcome.outcomeEventId, "Outcome event was not created");

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

  const contactBlockedPolicy = await createPolicy("No contact export", { allowContact: false });
  const heldTargetId = await importOne(contactBlockedPolicy.sourcePolicyId, "NoContact", { email: "blocked@example.invalid" });
  const heldTargetSnap = await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(heldTargetId).get();
  assert(heldTargetSnap.data()?.contactability === "blocked", "Contact-disallowed import did not block contactability");
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
    return {
      ok: true,
      json: async () => ({
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
      }),
    };
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
    return {
      ok: true,
      json: async () => ({
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
      }),
    };
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
    const rowCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.RESEARCH_TABLE_ROWS, (data) => data.researchRunId === result.run.researchRunId);
    assert(rowCount === 2, "Research table rows were not stored");
    const podSnap = await db.collection(SIGNALDESK_COLLECTIONS.MARKET_PODS).doc(result.run.marketPodId).get();
    assert(podSnap.exists, "Research agent did not create/update market pod map");
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
    '"send-approved-message": "send"',
    '"run-source-provider": "provider_run"',
    '"upsert-connector-setting": "configure"',
    '"schedule-content-distribution-draft": "schedule"',
    '| "reveal_pii"',
    'MOBILE_READ_ONLY_ACTION_BLOCKED',
  ].forEach((needle) => assert(actionsRoute.includes(needle), `Mobile read-only route contract missing ${needle}`));

  for (const [action, actionClass] of [
    ["review-approval", "approve"],
    ["export-message", "export"],
    ["upsert-connector-setting", "configure"],
    ["target-contact-reveal", "reveal_pii"],
  ]) {
    await recordSignalDeskMobileActionBlockedServer({ access, action, actionClass });
  }
  const blockedAuditCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, (data) => data.action === "mobile_action_blocked");
  assert(blockedAuditCount >= 4, "Mobile blocked action audit events were not recorded");
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

  const directDnc = await captureSignalDeskReplyServer(access, {
    channel: "email",
    message: "Stop. Do not contact me again.",
    targetId,
  });
  assert(directDnc.state === "dnc", "DNC reply was not classified as dnc");
  const dncSuppressionCount = await expectCollectionCount(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER, (data) => data.targetId === targetId && data.reason === "dnc");
  assert(dncSuppressionCount > 0, "DNC reply did not create suppression immediately");
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
  const happy = await assertHappyPath();
  await assertSourcePolicyNegatives();
  await assertFhrsFhisSourceProvider();
  await assertResearchAgentTable();
  await assertExpiryAcrossWorkflow();
  await assertApprovalAndExportNegatives();
  await assertMobileReadOnlyContract();
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
