process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.MENULIST_SIGNALDESK_FIREBASE_MODE = process.env.MENULIST_SIGNALDESK_FIREBASE_MODE || "separate";
process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID
  || process.env.GCLOUD_PROJECT
  || "demo-signaldesk";
process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID
  || process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID;

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("SignalDesk audit-boundary tests require FIRESTORE_EMULATOR_HOST.");
  process.exit(1);
}

require("ts-node").register({
  compilerOptions: { module: "CommonJS" },
  transpileOnly: true,
});
require("tsconfig-paths/register");

const assert = require("assert/strict");
const { SIGNALDESK_COLLECTIONS } = require("@constant/signaldesk/database");
const { admin, signaldeskFirestoreAdmin: db } = require("@lib/firebase/signaldeskFirebaseAdmin");
const {
  getSignalDeskAuditCursor,
  parseSignalDeskAuditCursor,
  SIGNALDESK_AUDIT_PAGE_SIZE,
} = require("@lib/signaldesk/auditContracts");
const { loadSignalDeskWorkspaceServer } = require("@lib/signaldesk/workflowServer");

const access = {
  active: true,
  email: "audit-founder@example.invalid",
  firebaseConfigured: true,
  isPlatformAdmin: true,
  name: "Audit Founder",
  permissions: ["signaldesk.view", "audit.view"],
  role: "founder-admin",
  userId: "audit-founder",
};

async function main() {
  assert.equal(parseSignalDeskAuditCursor(null, null), undefined);
  assert.equal(parseSignalDeskAuditCursor("2026-07-21T10:00:00.000Z", null), null);
  assert.equal(parseSignalDeskAuditCursor("not-a-time", "audit_boundary_001"), null);

  const collection = db.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS);
  const batch = db.batch();
  const baseMillis = Date.parse("2026-07-21T12:00:00.000Z");
  const validIds = [];
  for (let index = 0; index < 55; index += 1) {
    const auditEventId = `audit_boundary_${String(index).padStart(3, "0")}`;
    validIds.push(auditEventId);
    batch.set(collection.doc(auditEventId), {
      action: "audit_boundary_test",
      actorId: access.userId,
      actorRole: access.role,
      auditEventId,
      createdAt: admin.firestore.Timestamp.fromMillis(baseMillis - (Math.floor(index / 3) * 1000)),
      entityId: `entity_${index}`,
      entityType: "auditBoundary",
      pId: "SD",
      reason: "event:audit_boundary_test",
    });
  }
  batch.set(collection.doc("audit_boundary_foreign"), {
    action: "audit_boundary_test",
    actorId: access.userId,
    actorRole: access.role,
    auditEventId: "audit_boundary_foreign",
    createdAt: admin.firestore.Timestamp.fromMillis(baseMillis + 1000),
    entityId: "foreign",
    entityType: "auditBoundary",
    pId: "AL",
    reason: "event:audit_boundary_test",
  });
  await batch.commit();

  const first = await loadSignalDeskWorkspaceServer(access, "audit");
  assert.equal(first.workspace.auditEvents.length, SIGNALDESK_AUDIT_PAGE_SIZE, "First audit page was not bounded to 50 valid events");
  assert.equal(first.workspace.auditEvents.some((event) => event.auditEventId === "audit_boundary_foreign"), false, "Foreign audit truth was projected");
  const cursor = getSignalDeskAuditCursor(first.workspace.auditEvents.at(-1));
  assert(cursor, "First audit page did not provide a valid stable cursor");

  const second = await loadSignalDeskWorkspaceServer(access, "audit", { auditCursor: cursor });
  assert.equal(second.workspace.auditEvents.length, 5, "Second audit page did not return the exact remainder");
  const combinedIds = [...first.workspace.auditEvents, ...second.workspace.auditEvents]
    .map((event) => event.auditEventId);
  assert.equal(new Set(combinedIds).size, 55, "Audit pagination duplicated or omitted a same-timestamp event");
  assert.deepEqual(new Set(combinedIds), new Set(validIds), "Audit pagination did not return the complete valid event set");

  console.log("SignalDesk audit-boundary tests passed");
}

main()
  .catch((error) => {
    console.error("SignalDesk audit-boundary tests failed");
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const snapshot = await db.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
      .where("action", "==", "audit_boundary_test")
      .get();
    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
  });
