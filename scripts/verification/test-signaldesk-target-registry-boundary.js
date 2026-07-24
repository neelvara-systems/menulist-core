process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.MENULIST_SIGNALDESK_FIREBASE_MODE = process.env.MENULIST_SIGNALDESK_FIREBASE_MODE || "separate";
process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "demo-signaldesk-target-registry";
process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID || process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID;

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("SignalDesk Target Registry verification requires FIRESTORE_EMULATOR_HOST. Run it through firebase emulators:exec.");
  process.exit(1);
}

require("ts-node").register({
  compilerOptions: { module: "CommonJS", target: "ES2022" },
  transpileOnly: true,
});
require("tsconfig-paths/register");

const assert = require("assert").strict;
const fs = require("fs");
const path = require("path");
const { SIGNALDESK_COLLECTIONS } = require("@constant/signaldesk/database");
const { SIGNALDESK_PRODUCT_CODE } = require("@constant/signaldesk/product");
const { admin, signaldeskFirestoreAdmin: db } = require("@lib/firebase/signaldeskFirebaseAdmin");
const {
  getSignalDeskTargetCursor,
  parseSignalDeskTargetCursor,
  SIGNALDESK_TARGET_PAGE_SIZE,
} = require("@lib/signaldesk/targetContracts");
const { loadSignalDeskWorkspaceServer } = require("@lib/signaldesk/workflowServer");

const access = {
  active: true,
  email: "signaldesk-target-registry-test@example.invalid",
  firebaseConfigured: true,
  isPlatformAdmin: true,
  name: "SignalDesk target registry test",
  permissions: ["signaldesk.view", "target.review"],
  role: "founder-admin",
  userId: "signaldesk-target-registry-test",
};

const clearCollection = async (collectionName) => {
  const snapshot = await db.collection(collectionName).get();
  for (let offset = 0; offset < snapshot.docs.length; offset += 400) {
    const batch = db.batch();
    snapshot.docs.slice(offset, offset + 400).forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
};

const targetFixture = (targetId, updatedAt, overrides = {}) => ({
  contactability: "missing",
  displayName: `Target ${targetId}`,
  nextAction: "score",
  pId: SIGNALDESK_PRODUCT_CODE,
  primaryOpportunity: "unknown",
  segment: "c",
  sourceConfidence: "medium",
  status: "review",
  suppressionStatus: "clear",
  targetId,
  updatedAt,
  ...overrides,
});

const assertSourceContracts = () => {
  const workflow = fs.readFileSync(path.join(process.cwd(), "src/lib/signaldesk/workflowServer.ts"), "utf8");
  const actions = fs.readFileSync(path.join(process.cwd(), "src/app/api/signaldesk/actions/route.ts"), "utf8");
  const workspaceRoute = fs.readFileSync(path.join(process.cwd(), "src/app/api/signaldesk/workspace/route.ts"), "utf8");
  const workspace = fs.readFileSync(path.join(process.cwd(), "src/components/signaldesk/SignalDeskWorkspace.tsx"), "utf8");
  assert(workflow.includes("SignalDesk target imports are disabled"), "Target import server does not enforce its feature flag");
  assert(actions.includes('"SignalDesk target imports are disabled"'), "Target import disabled response is not owner-safe");
  assert(workspace.includes("FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_IMPORTS ? <form"), "Disabled target import still renders its mutation form");
  assert(workspaceRoute.includes("parseSignalDeskTargetCursor"), "Workspace route does not validate target cursors");
  assert(workflow.includes('.orderBy(admin.firestore.FieldPath.documentId(), "desc")'), "Target pagination lacks a stable document-ID tie-breaker");
};

async function main() {
  assertSourceContracts();
  assert.equal(SIGNALDESK_TARGET_PAGE_SIZE, 30, "Target Registry page size changed unexpectedly");
  assert.equal(parseSignalDeskTargetCursor(null, null), undefined, "Empty target cursor was not accepted as absent");
  assert.equal(parseSignalDeskTargetCursor("invalid", "target_001"), null, "Malformed target cursor timestamp was accepted");
  assert.equal(parseSignalDeskTargetCursor(new Date().toISOString(), "bad/id"), null, "Malformed target cursor ID was accepted");

  await Promise.all([
    clearCollection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES),
    clearCollection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES),
  ]);

  const sharedTimestamp = admin.firestore.Timestamp.fromDate(new Date("2026-07-21T12:00:00.000Z"));
  const validIds = Array.from({ length: 35 }, (_, index) => `target_${String(index).padStart(3, "0")}`);
  await Promise.all(validIds.map((targetId) => (
    db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).set(targetFixture(targetId, sharedTimestamp))
  )));
  await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc("zz_foreign_target").set(
    targetFixture("zz_foreign_target", sharedTimestamp, { pId: "ML" }),
  );

  const firstPage = await loadSignalDeskWorkspaceServer(access, "targets");
  assert.equal(firstPage.workspace.targets.length, SIGNALDESK_TARGET_PAGE_SIZE, "First Target Registry page did not contain 30 valid rows");
  assert(firstPage.workspace.targets.every((target) => target.targetId !== "zz_foreign_target"), "Foreign target truth was projected");
  const cursor = getSignalDeskTargetCursor(firstPage.workspace.targets.at(-1));
  assert(cursor, "First Target Registry page did not expose a valid continuation cursor");

  const secondPage = await loadSignalDeskWorkspaceServer(access, "targets", { targetCursor: cursor });
  assert.equal(secondPage.workspace.targets.length, 5, "Second Target Registry page did not contain the remaining valid rows");
  const combined = [...firstPage.workspace.targets, ...secondPage.workspace.targets].map((target) => target.targetId);
  assert.equal(new Set(combined).size, validIds.length, "Target pagination duplicated or omitted a same-timestamp target");
  assert.deepEqual([...combined].sort(), [...validIds].sort(), "Target pagination returned the wrong target set");

  console.log("SignalDesk Target Registry boundary verification passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await db.terminate();
    } catch {
      // The process is already terminating; no persisted emulator state remains.
    }
  });
