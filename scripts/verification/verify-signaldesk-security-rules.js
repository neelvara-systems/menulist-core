const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID || "demo-signaldesk";

const firestoreRules = fs.readFileSync(path.join(ROOT, "firestore-signaldesk.rules"), "utf8");
const storageRules = fs.readFileSync(path.join(ROOT, "storage-signaldesk.rules"), "utf8");

const summaryCollections = [
  "signaldeskRolePolicies",
  "signaldeskFoundationSummaries",
  "signaldeskAiEvalSummaries",
  "signaldeskControlRoomSummaries",
  "signaldeskQueueSummaries",
  "signaldeskChannelHealthSummaries",
  "signaldeskConnectorSettings",
  "signaldeskTargetSummaries",
  "signaldeskSourcePolicies",
  "signaldeskEvidencePacketSummaries",
  "signaldeskDraftSummaries",
  "signaldeskApprovalQueue",
  "signaldeskConversationSummaries",
  "signaldeskOutcomeSummaries",
  "signaldeskDemandSignalSummaries",
  "signaldeskContentAssets",
  "signaldeskContentDistributionDrafts",
  "signaldeskProofPermissions",
  "signaldeskResearchRuns",
  "signaldeskResearchTableRows",
  "signaldeskTrustPartnerProfiles",
  "signaldeskRevenueAccounts",
  "signaldeskCommercialOpportunities",
  "signaldeskCommercialOffers",
  "signaldeskOperatingEnvelopes",
  "signaldeskActivationWatches",
  "signaldeskRevenueControlSummaries",
];

const rawCollections = [
  "signaldeskTargets",
  "signaldeskImportRows",
  "signaldeskContactIdentities",
  "signaldeskChannelIdentities",
  "signaldeskSuppressionLedger",
  "signaldeskEvidencePackets",
  "signaldeskConversations",
  "signaldeskMessages",
  "signaldeskMessageEvents",
  "signaldeskOutcomeEvents",
  "signaldeskDemandSignals",
  "signaldeskDataRequests",
  "signaldeskIdempotencyKeys",
  "signaldeskRouteTokens",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} missing ${needle}`);
}

function getMatchBlock(content, collectionName) {
  const marker = `match /${collectionName}/{docId}`;
  const start = content.indexOf(marker);
  if (start < 0) return "";
  const next = content.indexOf("\n    match /", start + marker.length);
  return content.slice(start, next < 0 ? content.length : next);
}

function verifyStaticFirestoreRules() {
  assertIncludes(firestoreRules, "match /{document=**}", "Firestore default deny");
  assertIncludes(firestoreRules, "allow read, write: if false;", "Firestore default deny");
  assertIncludes(firestoreRules, "function canReadSignalDesk()", "Firestore direct-read helper");
  assertIncludes(firestoreRules, "request.auth.token.platformRole == 'PLATFORM'", "Firestore platform admin helper");
  assertIncludes(firestoreRules, "signaldeskTeamMembers/$(request.auth.uid)", "Firestore SignalDesk member helper");
  assertIncludes(firestoreRules, "data.pId == 'SD'", "Firestore SignalDesk member product binding");
  assertIncludes(firestoreRules, "data.teamMemberId == request.auth.uid", "Firestore SignalDesk member document binding");
  assertIncludes(firestoreRules, "data.userId == request.auth.uid", "Firestore SignalDesk member user binding");
  assertIncludes(firestoreRules, "data.status == 'active'", "Firestore SignalDesk member status binding");
  assertIncludes(firestoreRules, "function isSignalDeskHumanRole(role)", "Firestore SignalDesk human-role helper");
  assertIncludes(firestoreRules, "resource.data.pId == 'SD'", "Firestore SignalDesk resource product binding");
  assertIncludes(firestoreRules, "return isSignalDeskPlatformAdmin() && isSignalDeskResource();", "Firestore direct reads are platform-only");
  assert(!firestoreRules.includes("role == 'system-worker'"), "System workers must not satisfy the human member predicate");
  const teamMemberRuleStart = firestoreRules.indexOf("match /signaldeskTeamMembers/{memberId}");
  const teamMemberRuleEnd = firestoreRules.indexOf("\n    match /", teamMemberRuleStart + 1);
  const teamMemberRule = firestoreRules.slice(teamMemberRuleStart, teamMemberRuleEnd);
  assert(teamMemberRuleStart >= 0, "signaldeskTeamMembers rule block exists");
  assert(teamMemberRule.includes("allow read: if canReadSignalDesk()"), "SignalDesk team membership reads use the platform-only product gate");
  assert(!teamMemberRule.includes("memberId == request.auth.uid"), "SignalDesk members cannot directly read membership records");

  for (const collection of summaryCollections) {
    const block = getMatchBlock(firestoreRules, collection);
    assert(block, `${collection} rule block exists`);
    assert(block.includes("allow read: if canReadSignalDesk()"), `${collection} read is internal-only`);
    assert(block.includes("allow write: if false"), `${collection} client write is denied`);
  }

  for (const collection of rawCollections) {
    const block = getMatchBlock(firestoreRules, collection);
    if (!block) continue;
    assert(!block.includes("allow read: if canReadSignalDesk()"), `${collection} must not be summary-readable`);
    assert(block.includes("allow read, write: if false") || block.includes("allow write: if false"), `${collection} client write is denied`);
  }

  assertIncludes(firestoreRules, "match /signaldeskAuditEvents/{docId}", "Audit events rule");
  assert(getMatchBlock(firestoreRules, "signaldeskAuditEvents").includes("allow read: if canReadSignalDesk()"), "Audit events use the platform-only product gate");
  assertIncludes(firestoreRules, "match /signaldeskAiOperationLedger/{docId}", "AI operation ledger rule");
  assert(getMatchBlock(firestoreRules, "signaldeskAiOperationLedger").includes("allow read: if canReadSignalDesk()"), "AI operation ledger uses the platform-only product gate");
}

function verifyStaticStorageRules() {
  assertIncludes(storageRules, "match /{allPaths=**}", "Storage default deny");
  assertIncludes(storageRules, "allow read, write: if false;", "Storage default deny");
  assertIncludes(storageRules, "match /signaldesk/imports/{fileName}", "Storage imports path");
  assertIncludes(storageRules, "match /signaldesk/evidence/{allPaths=**}", "Storage evidence path");
  assertIncludes(storageRules, "match /signaldesk/exports/{allPaths=**}", "Storage exports path");
  const directReadDenials = storageRules.match(/allow read, write, delete: if false;/g) || [];
  assert(directReadDenials.length >= 3, "Storage import, evidence, and export direct reads/writes are denied");
  assert(!storageRules.includes("canReadSignalDesk()"), "Storage has no direct SignalDesk member read helper");
}

async function expectDenied(label, operation) {
  try {
    await operation();
  } catch (error) {
    const code = String(error?.code || error?.message || "");
    if (/permission-denied|unauthorized|403/i.test(code)) return;
    throw new Error(`${label} failed with unexpected error: ${code}`);
  }
  throw new Error(`${label} unexpectedly succeeded`);
}

function parseHostPort(value, defaultPort) {
  const trimmed = String(value || "").replace(/^https?:\/\//, "");
  const [host, port] = trimmed.split(":");
  return { host: host || "127.0.0.1", port: Number(port || defaultPort) };
}

async function verifyFirestoreEmulatorDenials() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.log("Skipping Firestore runtime denial checks; FIRESTORE_EMULATOR_HOST is not set.");
    return;
  }

  const { initializeApp } = require("firebase/app");
  const {
    connectFirestoreEmulator,
    doc,
    getDoc,
    getFirestore,
    setDoc,
  } = require("firebase/firestore");

  const app = initializeApp({ apiKey: "signaldesk-rules-smoke", projectId: PROJECT_ID }, "signaldesk-rules-smoke-firestore");
  const firestore = getFirestore(app);
  const { host, port } = parseHostPort(process.env.FIRESTORE_EMULATOR_HOST, 8080);
  connectFirestoreEmulator(firestore, host, port);

  await expectDenied("Public summary read", () => getDoc(doc(firestore, "signaldeskControlRoomSummaries/dashboard")));
  await expectDenied("Public raw target read", () => getDoc(doc(firestore, "signaldeskTargets/target_test")));
  await expectDenied("Public summary write", () => setDoc(doc(firestore, "signaldeskTargetSummaries/target_test"), { displayName: "Denied" }));
  await expectDenied("Public revenue summary read", () => getDoc(doc(firestore, "signaldeskRevenueControlSummaries/current")));
  await expectDenied("Public revenue account write", () => setDoc(doc(firestore, "signaldeskRevenueAccounts/account_test"), { pId: "SD" }));
  await expectDenied("Public source policy write", () => setDoc(doc(firestore, "signaldeskSourcePolicies/policy_test"), { status: "active" }));
}

async function verifyStorageEmulatorDenials() {
  if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    console.log("Skipping Storage runtime denial checks; FIREBASE_STORAGE_EMULATOR_HOST is not set.");
    return;
  }

  const { initializeApp } = require("firebase/app");
  const {
    connectStorageEmulator,
    getStorage,
    ref,
    uploadString,
  } = require("firebase/storage");

  const app = initializeApp({
    apiKey: "signaldesk-storage-rules-smoke",
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.appspot.com`,
  }, "signaldesk-rules-smoke-storage");
  const storage = getStorage(app);
  const { host, port } = parseHostPort(process.env.FIREBASE_STORAGE_EMULATOR_HOST, 9199);
  connectStorageEmulator(storage, host, port);

  await expectDenied("Public SignalDesk storage upload", () => uploadString(ref(storage, "signaldesk/imports/denied.csv"), "denied"));
}

async function verifyRulesUnitSemantics() {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    console.log("Skipping authenticated rules-unit checks; Firestore and Storage emulators are both required.");
    return;
  }

  const {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
  } = require("@firebase/rules-unit-testing");
  const {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    setDoc,
    query,
    where,
  } = require("firebase/firestore");
  const {
    deleteObject,
    getBytes,
    ref,
    uploadString,
  } = require("firebase/storage");

  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: firestoreRules },
    storage: { rules: storageRules },
  });

  try {
    await testEnv.clearFirestore();
    await testEnv.clearStorage();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await Promise.all([
        setDoc(doc(firestore, "signaldeskTeamMembers/active-member"), {
          active: true,
          email: "active-member@example.invalid",
          emailLower: "active-member@example.invalid",
          pId: "SD",
          permissions: [],
          role: "operator",
          status: "active",
          teamMemberId: "active-member",
          userId: "active-member",
        }),
        setDoc(doc(firestore, "signaldeskTeamMembers/readonly-member"), {
          active: true,
          email: "readonly-member@example.invalid",
          emailLower: "readonly-member@example.invalid",
          pId: "SD",
          permissions: [],
          role: "readonly-analyst",
          status: "active",
          teamMemberId: "readonly-member",
          userId: "readonly-member",
        }),
        setDoc(doc(firestore, "signaldeskTeamMembers/inactive-member"), {
          active: false,
          pId: "SD",
          role: "operator",
          status: "inactive",
          teamMemberId: "inactive-member",
          userId: "inactive-member",
        }),
        setDoc(doc(firestore, "signaldeskTeamMembers/missing-product-member"), {
          active: true,
          role: "operator",
          status: "active",
          teamMemberId: "missing-product-member",
          userId: "missing-product-member",
        }),
        setDoc(doc(firestore, "signaldeskTeamMembers/foreign-product-member"), {
          active: true,
          pId: "AL",
          role: "operator",
          status: "active",
          teamMemberId: "foreign-product-member",
          userId: "foreign-product-member",
        }),
        setDoc(doc(firestore, "signaldeskTeamMembers/malformed-role-member"), {
          active: true,
          pId: "SD",
          role: "owner",
          status: "active",
          teamMemberId: "malformed-role-member",
          userId: "malformed-role-member",
        }),
        setDoc(doc(firestore, "signaldeskTeamMembers/malformed-status-member"), {
          active: true,
          pId: "SD",
          role: "operator",
          status: "enabled",
          teamMemberId: "malformed-status-member",
          userId: "malformed-status-member",
        }),
        setDoc(doc(firestore, "signaldeskTeamMembers/system-worker"), {
          active: true,
          pId: "SD",
          role: "system-worker",
          status: "active",
          teamMemberId: "system-worker",
          userId: "system-worker",
        }),
        setDoc(doc(firestore, "signaldeskControlRoomSummaries/dashboard"), { pId: "SD", status: "ready" }),
        setDoc(doc(firestore, "signaldeskControlRoomSummaries/dashboard_missing_product"), { status: "ready" }),
        setDoc(doc(firestore, "signaldeskControlRoomSummaries/dashboard_foreign_product"), { pId: "AL", status: "ready" }),
        setDoc(doc(firestore, "signaldeskRolePolicies/current"), { pId: "SD", version: 1 }),
        setDoc(doc(firestore, "signaldeskFoundationSummaries/current"), { pId: "SD", status: "ready" }),
        setDoc(doc(firestore, "signaldeskAiEvalSummaries/current"), { pId: "SD", status: "ready" }),
        setDoc(doc(firestore, "signaldeskRevenueAccounts/account_summary"), { pId: "SD", revenueAccountId: "account_summary" }),
        setDoc(doc(firestore, "signaldeskCommercialOpportunities/opportunity_summary"), { pId: "SD", opportunityId: "opportunity_summary" }),
        setDoc(doc(firestore, "signaldeskCommercialOffers/offer_summary"), { pId: "SD", commercialOfferId: "offer_summary" }),
        setDoc(doc(firestore, "signaldeskOperatingEnvelopes/envelope_summary"), { pId: "SD", operatingEnvelopeId: "envelope_summary" }),
        setDoc(doc(firestore, "signaldeskActivationWatches/watch_summary"), { pId: "SD", activationWatchId: "watch_summary" }),
        setDoc(doc(firestore, "signaldeskProofPermissions/proof_permission"), { pId: "SD", proofPermissionId: "proof_permission" }),
        setDoc(doc(firestore, "signaldeskRouteTokens/route_token"), { pId: "SD", tokenHash: "hash-only" }),
        setDoc(doc(firestore, "signaldeskRevenueControlSummaries/current"), { pId: "SD", revenueAccountCount: 1 }),
        setDoc(doc(firestore, "signaldeskTargetSummaries/target_summary"), { pId: "SD", targetId: "target_summary" }),
        setDoc(doc(firestore, "signaldeskTargets/target_detail"), { pId: "SD", targetId: "target_detail" }),
        setDoc(doc(firestore, "signaldeskMessages/message_detail"), { pId: "SD", messageId: "message_detail" }),
        setDoc(doc(firestore, "signaldeskImportRows/import_row"), { pId: "SD", rowId: "import_row" }),
        setDoc(doc(firestore, "signaldeskSuppressionLedger/suppression"), { pId: "SD", suppressionId: "suppression" }),
        setDoc(doc(firestore, "signaldeskContactIdentities/contact_identity"), { pId: "SD", identityId: "contact_identity" }),
        setDoc(doc(firestore, "signaldeskAuditEvents/audit_event"), { pId: "SD", action: "seeded" }),
        setDoc(doc(firestore, "signaldeskAiOperationLedger/ai_ledger"), { pId: "SD", operation: "seeded" }),
      ]);

      const storage = context.storage();
      await Promise.all([
        uploadString(ref(storage, "signaldesk/imports/allowed.csv"), "name,email"),
        uploadString(ref(storage, "signaldesk/evidence/allowed.json"), "{}"),
        uploadString(ref(storage, "signaldesk/exports/allowed.json"), "{}"),
        uploadString(ref(storage, "signaldesk/incidents/admin.json"), "{}"),
      ]);
    });

    const publicUser = testEnv.unauthenticatedContext();
    const menuListOwner = testEnv.authenticatedContext("menulist-owner", {
      platformRole: "OWNER",
      productId: "ML",
      role: "owner",
    });
    const inactiveMember = testEnv.authenticatedContext("inactive-member", {
      platformRole: "STAFF",
      productId: "SD",
    });
    const activeMember = testEnv.authenticatedContext("active-member", {
      platformRole: "STAFF",
      productId: "SD",
    });
    const readonlyMember = testEnv.authenticatedContext("readonly-member", {
      platformRole: "STAFF",
      productId: "SD",
    });
    const missingProductMember = testEnv.authenticatedContext("missing-product-member", {
      platformRole: "STAFF",
      productId: "SD",
    });
    const foreignProductMember = testEnv.authenticatedContext("foreign-product-member", {
      platformRole: "STAFF",
      productId: "SD",
    });
    const malformedRoleMember = testEnv.authenticatedContext("malformed-role-member", {
      platformRole: "STAFF",
      productId: "SD",
    });
    const malformedStatusMember = testEnv.authenticatedContext("malformed-status-member", {
      platformRole: "STAFF",
      productId: "SD",
    });
    const systemWorker = testEnv.authenticatedContext("system-worker", {
      platformRole: "STAFF",
      productId: "SD",
    });
    const platformAdmin = testEnv.authenticatedContext("platform-admin", {
      platformRole: "PLATFORM",
      productId: "SD",
    });

    await assertFails(getDoc(doc(publicUser.firestore(), "signaldeskControlRoomSummaries/dashboard")));
    await assertFails(getDoc(doc(menuListOwner.firestore(), "signaldeskControlRoomSummaries/dashboard")));
    for (const [memberId, memberContext] of [
      ["inactive-member", inactiveMember],
      ["active-member", activeMember],
      ["readonly-member", readonlyMember],
      ["missing-product-member", missingProductMember],
      ["foreign-product-member", foreignProductMember],
      ["malformed-role-member", malformedRoleMember],
      ["malformed-status-member", malformedStatusMember],
      ["system-worker", systemWorker],
    ]) {
      await assertFails(getDoc(doc(memberContext.firestore(), "signaldeskControlRoomSummaries/dashboard")));
      await assertFails(getDoc(doc(memberContext.firestore(), `signaldeskTeamMembers/${memberId}`)));
      await assertFails(getDocs(collection(memberContext.firestore(), "signaldeskTargetSummaries")));
    }

    await assertSucceeds(getDoc(doc(platformAdmin.firestore(), "signaldeskControlRoomSummaries/dashboard")));
    await assertFails(getDoc(doc(platformAdmin.firestore(), "signaldeskControlRoomSummaries/dashboard_missing_product")));
    await assertFails(getDoc(doc(platformAdmin.firestore(), "signaldeskControlRoomSummaries/dashboard_foreign_product")));
    await assertSucceeds(getDoc(doc(platformAdmin.firestore(), "signaldeskTeamMembers/active-member")));
    await assertFails(getDoc(doc(platformAdmin.firestore(), "signaldeskTeamMembers/missing-product-member")));
    await assertFails(getDoc(doc(platformAdmin.firestore(), "signaldeskTeamMembers/foreign-product-member")));
    await assertFails(getDocs(collection(platformAdmin.firestore(), "signaldeskTeamMembers")));
    for (const collectionName of [
      "signaldeskRolePolicies",
      "signaldeskFoundationSummaries",
      "signaldeskAiEvalSummaries",
    ]) {
      await assertFails(getDoc(doc(activeMember.firestore(), `${collectionName}/current`)));
      await assertSucceeds(getDoc(doc(platformAdmin.firestore(), `${collectionName}/current`)));
      await assertFails(setDoc(doc(platformAdmin.firestore(), `${collectionName}/client_write`), { pId: "SD" }));
    }
    await assertSucceeds(getDocs(query(
      collection(platformAdmin.firestore(), "signaldeskTeamMembers"),
      where("pId", "==", "SD"),
    )));
    await assertSucceeds(getDocs(query(
      collection(platformAdmin.firestore(), "signaldeskControlRoomSummaries"),
      where("pId", "==", "SD"),
    )));
    await assertFails(getDoc(doc(activeMember.firestore(), "signaldeskProofPermissions/proof_permission")));
    await assertSucceeds(getDoc(doc(platformAdmin.firestore(), "signaldeskProofPermissions/proof_permission")));
    await assertFails(setDoc(doc(activeMember.firestore(), "signaldeskProofPermissions/client_write"), { pId: "SD" }));
    for (const [collectionName, docId] of [
      ["signaldeskRevenueAccounts", "account_summary"],
      ["signaldeskCommercialOpportunities", "opportunity_summary"],
      ["signaldeskCommercialOffers", "offer_summary"],
      ["signaldeskOperatingEnvelopes", "envelope_summary"],
      ["signaldeskActivationWatches", "watch_summary"],
      ["signaldeskRevenueControlSummaries", "current"],
    ]) {
      await assertFails(getDoc(doc(activeMember.firestore(), collectionName, docId)));
      await assertSucceeds(getDoc(doc(platformAdmin.firestore(), collectionName, docId)));
      await assertFails(setDoc(doc(activeMember.firestore(), collectionName, "client_write"), { pId: "SD" }));
      await assertFails(setDoc(doc(platformAdmin.firestore(), collectionName, "client_write"), { pId: "SD" }));
    }
    await assertSucceeds(getDoc(doc(platformAdmin.firestore(), "signaldeskAuditEvents/audit_event")));
    await assertSucceeds(getDoc(doc(platformAdmin.firestore(), "signaldeskAiOperationLedger/ai_ledger")));

    await assertFails(setDoc(doc(activeMember.firestore(), "signaldeskTargetSummaries/client_write"), { pId: "SD" }));
    await assertFails(setDoc(doc(platformAdmin.firestore(), "signaldeskAuditEvents/client_write"), { pId: "SD" }));
    await assertFails(setDoc(doc(platformAdmin.firestore(), "signaldeskAiOperationLedger/client_write"), { pId: "SD" }));

    for (const collectionName of [
      "signaldeskTargets",
      "signaldeskImportRows",
      "signaldeskMessages",
      "signaldeskSuppressionLedger",
      "signaldeskContactIdentities",
      "signaldeskRouteTokens",
    ]) {
      await assertFails(getDoc(doc(activeMember.firestore(), `${collectionName}/${collectionName}_doc`)));
      await assertFails(getDocs(collection(activeMember.firestore(), collectionName)));
      await assertFails(getDoc(doc(platformAdmin.firestore(), `${collectionName}/${collectionName}_doc`)));
      await assertFails(getDocs(collection(platformAdmin.firestore(), collectionName)));
    }

    await assertFails(getBytes(ref(publicUser.storage(), "signaldesk/imports/allowed.csv")));
    await assertFails(getBytes(ref(publicUser.storage(), "signaldesk/evidence/allowed.json")));
    await assertFails(getBytes(ref(publicUser.storage(), "signaldesk/exports/allowed.json")));
    await assertFails(getBytes(ref(publicUser.storage(), "signaldesk/incidents/admin.json")));
    await assertFails(getBytes(ref(menuListOwner.storage(), "signaldesk/imports/allowed.csv")));
    await assertFails(getBytes(ref(activeMember.storage(), "signaldesk/imports/allowed.csv")));
    await assertFails(getBytes(ref(activeMember.storage(), "signaldesk/evidence/allowed.json")));
    await assertFails(getBytes(ref(activeMember.storage(), "signaldesk/exports/allowed.json")));
    await assertFails(getBytes(ref(activeMember.storage(), "signaldesk/incidents/admin.json")));
    await assertFails(getBytes(ref(platformAdmin.storage(), "signaldesk/imports/allowed.csv")));
    await assertFails(getBytes(ref(platformAdmin.storage(), "signaldesk/evidence/allowed.json")));
    await assertFails(getBytes(ref(platformAdmin.storage(), "signaldesk/exports/allowed.json")));
    await assertSucceeds(getBytes(ref(platformAdmin.storage(), "signaldesk/incidents/admin.json")));
    await assertFails(uploadString(ref(activeMember.storage(), "signaldesk/imports/client-write.csv"), "denied"));
    await assertFails(uploadString(ref(platformAdmin.storage(), "signaldesk/imports/admin-client-write.csv"), "denied"));
    await assertFails(deleteObject(ref(activeMember.storage(), "signaldesk/imports/allowed.csv")));
    await assertFails(deleteObject(ref(platformAdmin.storage(), "signaldesk/imports/allowed.csv")));
    await assertFails(deleteDoc(doc(activeMember.firestore(), "signaldeskControlRoomSummaries/dashboard")));
    await assertFails(deleteDoc(doc(platformAdmin.firestore(), "signaldeskControlRoomSummaries/dashboard")));
  } finally {
    await testEnv.cleanup();
  }
}

async function main() {
  verifyStaticFirestoreRules();
  verifyStaticStorageRules();
  await verifyRulesUnitSemantics();
  await verifyFirestoreEmulatorDenials();
  await verifyStorageEmulatorDenials();
  console.log("SignalDesk security rules verifier passed");
  process.exit(0);
}

main().catch((error) => {
  console.error("SignalDesk security rules verifier failed");
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
