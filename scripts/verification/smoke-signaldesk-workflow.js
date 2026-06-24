process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.MENULIST_SIGNALDESK_FIREBASE_MODE = process.env.MENULIST_SIGNALDESK_FIREBASE_MODE || "separate";
process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "demo-signaldesk";
process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID || process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID;

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("SignalDesk workflow smoke requires FIRESTORE_EMULATOR_HOST. Run it through firebase emulators:exec.");
  process.exit(1);
}

require("ts-node").register({
  compilerOptions: { module: "CommonJS" },
  transpileOnly: true,
});
require("tsconfig-paths/register");

const { SIGNALDESK_COLLECTIONS } = require("@constant/signaldesk/database");
const { signaldeskFirestoreAdmin } = require("@lib/firebase/signaldeskFirebaseAdmin");
const {
  captureSignalDeskDemandSignalServer,
  captureSignalDeskReplyServer,
  createSignalDeskDraftServer,
  createSignalDeskEvidenceServer,
  createSignalDeskSourcePolicyServer,
  exportSignalDeskMessageServer,
  importSignalDeskTargetsServer,
  loadSignalDeskWorkspaceServer,
  recordSignalDeskOutcomeServer,
  reviewSignalDeskApprovalServer,
  scoreSignalDeskTargetServer,
  seedSignalDeskDefaultsServer,
  upsertSignalDeskSenderDomainServer,
} = require("@lib/signaldesk/workflowServer");

const db = signaldeskFirestoreAdmin;

const access = {
  active: true,
  email: "signaldesk-smoke@example.invalid",
  firebaseConfigured: true,
  isPlatformAdmin: true,
  name: "SignalDesk Smoke",
  permissions: [],
  role: "founder-admin",
  userId: "signaldesk-smoke",
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
    ...Object.values(SIGNALDESK_COLLECTIONS),
    "stores",
    "menus",
    "projects",
    "billing",
  ];
  await Promise.all(collections.map((collectionName) => deleteCollection(collectionName)));
}

async function expectRejects(fn, expectedMessage) {
  try {
    await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(message.includes(expectedMessage), `Expected "${expectedMessage}", received "${message}"`);
    return;
  }
  throw new Error(`Expected rejection: ${expectedMessage}`);
}

async function assertNoMenuListTruthWrites() {
  for (const collectionName of ["stores", "menus", "projects", "billing"]) {
    const snap = await db.collection(collectionName).limit(1).get();
    assert(snap.empty, `SignalDesk smoke wrote MenuList truth collection ${collectionName}`);
  }
}

async function main() {
  await cleanSignalDeskData();
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

  const sourcePolicy = await createSignalDeskSourcePolicyServer(access, {
    allowContact: true,
    allowEvidence: true,
    allowPersonalization: true,
    name: "Smoke approved source",
    notes: "Local emulator workflow source policy.",
    retentionDays: 30,
    sourceType: "manual-research",
  });

  const expiredPolicy = await createSignalDeskSourcePolicyServer(access, {
    allowContact: true,
    allowEvidence: true,
    allowPersonalization: true,
    expiresAt: "2000-01-01T00:00:00.000Z",
    name: "Expired smoke source",
    notes: "Used only to assert expired source policy is blocked.",
    retentionDays: 1,
    sourceType: "manual-research",
  });

  await expectRejects(() => importSignalDeskTargetsServer(access, {
    rows: [{ displayName: "Expired Cafe", email: "expired@example.invalid" }],
    sourceName: "expired smoke",
    sourcePolicyId: expiredPolicy.sourcePolicyId,
  }), "SOURCE_POLICY_EXPIRED");

  const importResult = await importSignalDeskTargetsServer(access, {
    rows: [{
      category: "restaurant",
      city: "Mumbai",
      country: "India",
      currentListUrl: "",
      displayName: "SignalDesk Smoke Cafe",
      email: "owner@example.invalid",
      notes: "Local smoke target.",
      phone: "+10000000000",
      website: "https://example.invalid",
    }],
    sourceName: "smoke manual import",
    sourcePolicyId: sourcePolicy.sourcePolicyId,
  });
  assert(importResult.run.status === "completed", "Import run did not complete");
  assert(importResult.targets.length === 1, "Import did not create one target");

  const targetId = importResult.targets[0].targetId;
  const score = await scoreSignalDeskTargetServer(access, targetId);
  assert(score.segment === "a", `Expected segment a, received ${score.segment}`);

  const evidence = await createSignalDeskEvidenceServer(access, targetId);
  assert(evidence.allowedUse.includes("draft-personalization"), "Evidence did not preserve draft personalization use");

  const draftResult = await createSignalDeskDraftServer(access, { targetId });
  assert(draftResult.approval.status === "pending", "Draft approval was not pending");

  const approval = await reviewSignalDeskApprovalServer(access, {
    approvalId: draftResult.approval.approvalId,
    reason: "Smoke approved after evidence and sender readiness checks.",
    status: "approved",
  });
  assert(approval.status === "approved", "Approval did not move to approved");

  const exportResult = await exportSignalDeskMessageServer(access, draftResult.approval.approvalId);
  assert(exportResult.status === "exported", "Export did not create an exported handoff");

  const reply = await captureSignalDeskReplyServer(access, {
    channel: "email",
    message: "Yes, send details.",
    targetId,
  });
  assert(reply.state === "interested", `Expected interested reply, received ${reply.state}`);

  const outcome = await recordSignalDeskOutcomeServer(access, {
    channel: "email",
    outcomeType: "two_surface_activation",
    source: "manual",
    targetId,
  });
  assert(outcome.outcomeEventId, "Outcome event was not recorded");

  const demand = await captureSignalDeskDemandSignalServer(access, {
    signalType: "claim_attempt",
    sourceSurface: "manual",
    targetId,
    targetName: "SignalDesk Smoke Cafe",
  });
  assert(demand.demandSignalId, "Demand signal was not recorded");

  const workspace = await loadSignalDeskWorkspaceServer(access, "dashboard");
  assert(workspace.workspace.targets.some((target) => target.targetId === targetId), "Workspace did not include smoke target");
  const outcomeSummarySnap = await db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES).limit(1).get();
  assert(!outcomeSummarySnap.empty, "Outcome summary did not update");

  const auditSnap = await db.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS).limit(20).get();
  assert(!auditSnap.empty, "Workflow did not write audit events");

  await assertNoMenuListTruthWrites();
  console.log("SignalDesk workflow smoke passed");
}

main()
  .catch((error) => {
    console.error("SignalDesk workflow smoke failed");
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exit(1);
  });
