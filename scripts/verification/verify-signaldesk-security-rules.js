const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID || "demo-signaldesk";

const firestoreRules = fs.readFileSync(path.join(ROOT, "firestore-signaldesk.rules"), "utf8");
const storageRules = fs.readFileSync(path.join(ROOT, "storage-signaldesk.rules"), "utf8");

const summaryCollections = [
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
  "signaldeskResearchRuns",
  "signaldeskResearchTableRows",
  "signaldeskTrustPartnerProfiles",
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
  assertIncludes(firestoreRules, "function canReadSignalDesk()", "Firestore internal read helper");
  assertIncludes(firestoreRules, "request.auth.token.platformRole == 'PLATFORM'", "Firestore platform admin helper");
  assertIncludes(firestoreRules, "signaldeskTeamMembers/$(request.auth.uid)", "Firestore SignalDesk member helper");

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
  assertIncludes(firestoreRules, "allow read: if isSignalDeskPlatformAdmin();", "Audit events platform-only read");
  assertIncludes(firestoreRules, "match /signaldeskAiOperationLedger/{docId}", "AI operation ledger rule");
}

function verifyStaticStorageRules() {
  assertIncludes(storageRules, "match /{allPaths=**}", "Storage default deny");
  assertIncludes(storageRules, "allow read, write: if false;", "Storage default deny");
  assertIncludes(storageRules, "match /signaldesk/imports/{fileName}", "Storage imports path");
  assertIncludes(storageRules, "match /signaldesk/evidence/{allPaths=**}", "Storage evidence path");
  assertIncludes(storageRules, "match /signaldesk/exports/{allPaths=**}", "Storage exports path");
  assertIncludes(storageRules, "allow write, delete: if false;", "Storage client writes denied");
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
        setDoc(doc(firestore, "signaldeskTeamMembers/active-member"), { active: true, role: "operator" }),
        setDoc(doc(firestore, "signaldeskTeamMembers/inactive-member"), { active: false, role: "operator" }),
        setDoc(doc(firestore, "signaldeskControlRoomSummaries/dashboard"), { pId: "SD", status: "ready" }),
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
    const platformAdmin = testEnv.authenticatedContext("platform-admin", {
      platformRole: "PLATFORM",
      productId: "SD",
    });

    await assertFails(getDoc(doc(publicUser.firestore(), "signaldeskControlRoomSummaries/dashboard")));
    await assertFails(getDoc(doc(menuListOwner.firestore(), "signaldeskControlRoomSummaries/dashboard")));
    await assertFails(getDoc(doc(inactiveMember.firestore(), "signaldeskControlRoomSummaries/dashboard")));
    await assertSucceeds(getDoc(doc(activeMember.firestore(), "signaldeskControlRoomSummaries/dashboard")));
    await assertSucceeds(getDocs(collection(activeMember.firestore(), "signaldeskTargetSummaries")));
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
    ]) {
      await assertFails(getDoc(doc(activeMember.firestore(), `${collectionName}/${collectionName}_doc`)));
      await assertFails(getDocs(collection(activeMember.firestore(), collectionName)));
    }

    await assertFails(getBytes(ref(publicUser.storage(), "signaldesk/imports/allowed.csv")));
    await assertFails(getBytes(ref(publicUser.storage(), "signaldesk/evidence/allowed.json")));
    await assertFails(getBytes(ref(publicUser.storage(), "signaldesk/exports/allowed.json")));
    await assertFails(getBytes(ref(publicUser.storage(), "signaldesk/incidents/admin.json")));
    await assertFails(getBytes(ref(menuListOwner.storage(), "signaldesk/imports/allowed.csv")));
    await assertSucceeds(getBytes(ref(activeMember.storage(), "signaldesk/imports/allowed.csv")));
    await assertSucceeds(getBytes(ref(activeMember.storage(), "signaldesk/evidence/allowed.json")));
    await assertSucceeds(getBytes(ref(activeMember.storage(), "signaldesk/exports/allowed.json")));
    await assertFails(getBytes(ref(activeMember.storage(), "signaldesk/incidents/admin.json")));
    await assertSucceeds(getBytes(ref(platformAdmin.storage(), "signaldesk/incidents/admin.json")));
    await assertFails(uploadString(ref(activeMember.storage(), "signaldesk/imports/client-write.csv"), "denied"));
    await assertFails(deleteObject(ref(activeMember.storage(), "signaldesk/imports/allowed.csv")));
    await assertFails(deleteDoc(doc(activeMember.firestore(), "signaldeskControlRoomSummaries/dashboard")));
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
