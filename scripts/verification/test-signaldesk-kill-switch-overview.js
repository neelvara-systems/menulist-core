process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.MENULIST_SIGNALDESK_FIREBASE_MODE = process.env.MENULIST_SIGNALDESK_FIREBASE_MODE || "separate";
process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "demo-signaldesk";
process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID || process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID;

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("SignalDesk kill-switch verification requires FIRESTORE_EMULATOR_HOST. Run it through firebase emulators:exec.");
  process.exit(1);
}

require("ts-node").register({
  compilerOptions: { module: "CommonJS" },
  transpileOnly: true,
});
require("tsconfig-paths/register");

const assert = require("assert").strict;
const fs = require("fs");
const path = require("path");
const { SIGNALDESK_COLLECTIONS, SIGNALDESK_SUMMARY_DOCS } = require("@constant/signaldesk/database");
const { SIGNALDESK_PRODUCT_CODE } = require("@constant/signaldesk/product");
const { admin, signaldeskFirestoreAdmin: db } = require("@lib/firebase/signaldeskFirebaseAdmin");
const {
  loadSignalDeskOverviewServer,
  parseSignalDeskKillSwitchDocument,
  projectSignalDeskControlRoomDocument,
  projectSignalDeskCostDocument,
  projectSignalDeskQueueDocument,
  setSignalDeskKillSwitchServer,
  SIGNALDESK_KILL_SWITCH_SCOPE_VALUES,
} = require("@lib/signaldesk/server");

const access = {
  active: true,
  email: "signaldesk-kill-switch-test@example.invalid",
  firebaseConfigured: true,
  isPlatformAdmin: true,
  name: "SignalDesk kill-switch test",
  permissions: ["signaldesk.view", "kill-switch.activate", "kill-switch.deactivate"],
  role: "founder-admin",
  userId: "signaldesk-kill-switch-test",
};

const timestampNow = () => admin.firestore.Timestamp.now();
const collectionNames = [
  SIGNALDESK_COLLECTIONS.AUDIT_EVENTS,
  SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES,
  SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES,
  SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS,
  SIGNALDESK_COLLECTIONS.INCIDENTS,
  SIGNALDESK_COLLECTIONS.KILL_SWITCHES,
  SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES,
];

const clearCollection = async (collectionName) => {
  const snapshot = await db.collection(collectionName).get();
  for (let offset = 0; offset < snapshot.docs.length; offset += 400) {
    const batch = db.batch();
    snapshot.docs.slice(offset, offset + 400).forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
};

const countWhere = async (collectionName, field, value) => {
  const snapshot = await db.collection(collectionName).where(field, "==", value).get();
  return snapshot.size;
};

const readWriteEstimate = async () => {
  const day = new Date().toISOString().slice(0, 10);
  const snapshot = await db.collection(SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES).doc(day).get();
  return Number(snapshot.data()?.firestoreWriteEstimate || 0);
};

const expectRejects = async (label, operation, expectedMessage) => {
  let rejected = false;
  try {
    await operation();
  } catch (error) {
    rejected = true;
    assert.equal(error instanceof Error ? error.message : String(error), expectedMessage, `${label} returned the wrong error`);
  }
  assert.equal(rejected, true, `${label} did not reject`);
};

const activeSwitchFixture = (scope, overrides = {}) => {
  const timestamp = timestampNow();
  return {
    activatedAt: timestamp,
    activatedBy: "signaldesk-system-test",
    deactivatedAt: null,
    deactivatedBy: null,
    killSwitchId: `scope_${scope}`,
    pId: SIGNALDESK_PRODUCT_CODE,
    reason: `Active ${scope} test pause.`,
    scope,
    status: "active",
    updatedAt: timestamp,
    updatedBy: "signaldesk-system-test",
    ...overrides,
  };
};

const seedOverviewSummaries = async () => {
  const timestamp = timestampNow();
  const day = new Date().toISOString().slice(0, 10);
  await Promise.all([
    db.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM).set({
      activeKillSwitchCount: 999,
      channelStatus: "healthy",
      controlRoomSummaryId: SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM,
      costStatus: "healthy",
      demandSignalCount: 4,
      openIncidentCount: 999,
      outcomeCount: 3,
      pId: SIGNALDESK_PRODUCT_CODE,
      sourceStatus: "healthy",
      targetCount: 2,
      updatedAt: timestamp,
    }),
    db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.QUEUES).set({
      approvalBacklog: 1,
      humanReview: 2,
      inboxBacklog: 3,
      overdue: 4,
      pId: SIGNALDESK_PRODUCT_CODE,
      queueSummaryId: SIGNALDESK_SUMMARY_DOCS.QUEUES,
      updatedAt: timestamp,
    }),
    db.collection(SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES).doc(day).set({
      aiCostEstimate: 1,
      day,
      firestoreReadEstimate: 2,
      firestoreWriteEstimate: 3,
      pId: SIGNALDESK_PRODUCT_CODE,
      providerCostEstimate: 4,
      updatedAt: timestamp,
    }),
  ]);
};

const assertSourceOrder = () => {
  const routeSource = fs.readFileSync(path.join(process.cwd(), "src/app/api/signaldesk/kill-switches/route.ts"), "utf8");
  const workspaceRouteSource = fs.readFileSync(path.join(process.cwd(), "src/app/api/signaldesk/workspace/route.ts"), "utf8");
  const workspaceSource = fs.readFileSync(path.join(process.cwd(), "src/components/signaldesk/SignalDeskWorkspace.tsx"), "utf8");
  const controlPageSource = fs.readFileSync(path.join(process.cwd(), "src/app/(signaldesk)/signaldesk/control-room/page.tsx"), "utf8");
  const controlsPageSource = fs.readFileSync(path.join(process.cwd(), "src/app/(signaldesk)/signaldesk/controls/page.tsx"), "utf8");
  const rateLimitIndex = routeSource.indexOf("const rateLimit = await applySignalDeskRateLimit");
  const blockedAuditIndex = routeSource.indexOf("await recordSignalDeskMobileActionBlockedServer");
  assert(rateLimitIndex > 0 && blockedAuditIndex > rateLimitIndex, "Mobile blocked-audit write occurs before the write limiter");
  assert(routeSource.includes("idempotencyKey: z.string().trim().min(8).max(180)"), "Kill-switch route does not require a bounded idempotency key");

  const hookSource = fs.readFileSync(path.join(process.cwd(), "src/hooks/signaldesk/useSignalDeskOverview.ts"), "utf8");
  assert(hookSource.includes("killSwitchRetryRef.current?.requestKey === requestKey"), "Kill-switch browser retry does not retain the key for unchanged input");

  const serverSource = fs.readFileSync(path.join(process.cwd(), "src/lib/signaldesk/server.ts"), "utf8");
  const setterSource = serverSource.slice(serverSource.indexOf("export async function setSignalDeskKillSwitchServer"));
  assert(!setterSource.includes("channelStatus:"), "Kill-switch settlement still overwrites provider-derived channel health");
  assert(!setterSource.includes("expiresAt"), "Kill-switch settlement exposes unsupported automatic expiry");
  assert(!serverSource.includes('.where("status", "==", "active").limit(10)'), "Overview still truncates active kill-switch truth at ten rows");
  assert(serverSource.includes('reason: `event:${isActive ? "kill_switch_activate" : "kill_switch_deactivate"}`'), "Kill-switch audit still persists free-form operator reason text");

  assert(routeSource.includes('validatedInput.scope !== "global-outbound"'), "Mobile kill-switch API still accepts hidden scoped-pause actions");
  assert(workspaceRouteSource.includes('section === "control-room" && !FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_CONTROL_ROOM'), "Control Room workspace ignores its master flag");
  assert(controlPageSource.includes("notFound()") && controlsPageSource.includes("notFound()"), "Control Room routes ignore their master flag");
  assert(workspaceSource.includes("Modal.confirm({"), "Pause transitions do not require explicit UI confirmation");
  assert(workspaceSource.includes("data.controlRoom.openIncidentCount"), "Control Room incident badge still reports only the capped list length");
  const controlUi = workspaceSource.slice(
    workspaceSource.indexOf('if (activeSection === "control-room") {'),
    workspaceSource.indexOf('if (activeSection === "audit") {'),
  );
  assert(!controlUi.includes("<DashboardSection"), "Control Room still exposes dashboard research or lead mutations");
  assert(controlUi.includes("<OperatingPanels data={data} />"), "Control Room lost its summary-first safety view");

  const typeSource = fs.readFileSync(path.join(process.cwd(), "src/types/signaldesk/index.ts"), "utf8");
  const killSwitchType = typeSource.slice(
    typeSource.indexOf("export interface SignalDeskKillSwitch"),
    typeSource.indexOf("export interface SignalDeskMetricCard"),
  );
  assert(!killSwitchType.includes("expiresAt"), "Kill-switch DTO still claims unsupported automatic expiry");
};

async function main() {
  assertSourceOrder();
  await Promise.all(collectionNames.map(clearCollection));
  await seedOverviewSummaries();

  const today = new Date().toISOString().slice(0, 10);
  const [controlSnapshot, queueSnapshot, costSnapshot] = await Promise.all([
    db.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM).get(),
    db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.QUEUES).get(),
    db.collection(SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES).doc(today).get(),
  ]);
  assert(projectSignalDeskControlRoomDocument(controlSnapshot.data(), controlSnapshot.id), "Valid control summary did not project");
  assert.equal(projectSignalDeskControlRoomDocument({ ...controlSnapshot.data(), pId: "ML" }, controlSnapshot.id), null, "Foreign control summary projected");
  assert.equal(projectSignalDeskControlRoomDocument({ ...controlSnapshot.data(), updatedAt: "invalid" }, controlSnapshot.id), null, "Malformed control timestamp projected");
  assert.deepEqual(projectSignalDeskQueueDocument(queueSnapshot.data(), queueSnapshot.id), {
    approvalBacklog: 1,
    humanReview: 2,
    inboxBacklog: 3,
    overdue: 4,
  }, "Queue projection did not validate freshness while returning the count-only DTO");
  assert.equal(projectSignalDeskQueueDocument({ ...queueSnapshot.data(), updatedAt: "invalid" }, queueSnapshot.id), null, "Malformed queue timestamp projected");
  assert(projectSignalDeskCostDocument(costSnapshot.data(), costSnapshot.id), "Valid cost summary did not project");
  assert.equal(projectSignalDeskCostDocument({ ...costSnapshot.data(), day: "1999-01-01" }, costSnapshot.id), null, "Mismatched cost identity projected");
  assert.equal(projectSignalDeskCostDocument({ ...costSnapshot.data(), pId: "ML" }, costSnapshot.id), null, "Foreign cost summary projected");
  assert.equal(projectSignalDeskCostDocument({ ...costSnapshot.data(), providerCostEstimate: -0.01 }, costSnapshot.id), null, "Negative provider cost projected");
  assert.equal(projectSignalDeskCostDocument({ ...costSnapshot.data(), firestoreWriteEstimate: "4" }, costSnapshot.id), null, "String write estimate projected");
  assert.equal(projectSignalDeskCostDocument({ ...costSnapshot.data(), updatedAt: "invalid" }, costSnapshot.id), null, "Malformed cost timestamp projected");
  assert.equal(projectSignalDeskCostDocument({ ...costSnapshot.data(), privateNotes: "must-not-project" }, costSnapshot.id), null, "Unexpected persistence-private cost field was accepted");
  assert.throws(
    () => parseSignalDeskKillSwitchDocument(activeSwitchFixture("email", { status: "paused" }), "scope_email"),
    /KILL_SWITCH_SHAPE_INVALID/,
    "Invalid kill-switch status projected",
  );

  await Promise.all([
    controlSnapshot.ref.set({
      activeKillSwitchCount: 7,
      channelStatus: "healthy",
      costStatus: "warning",
      demandSignalCount: 6,
      openIncidentCount: 5,
      outcomeCount: 4,
      sourceStatus: "stale",
      targetCount: 3,
      updatedAt: timestampNow(),
    }),
    queueSnapshot.ref.set({
      approvalBacklog: 7,
      humanReview: 6,
      inboxBacklog: 5,
      overdue: 4,
    }),
    costSnapshot.ref.set({
      aiCostEstimate: 7,
      firestoreReadEstimate: 6,
      firestoreWriteEstimate: 5,
      providerCostEstimate: 4,
      updatedAt: timestampNow(),
    }),
  ]);
  const legacyOverview = await loadSignalDeskOverviewServer(access);
  assert.equal(legacyOverview.controlRoom.targetCount, 3, "Legacy control summary truth was discarded");
  assert.equal(legacyOverview.queues.approvalBacklog, 7, "Legacy queue summary truth was discarded");
  assert.equal(legacyOverview.cost.aiCostEstimate, 7, "Legacy cost summary truth was discarded");
  const [migratedControl, migratedQueue, migratedCost] = await Promise.all([
    controlSnapshot.ref.get(),
    queueSnapshot.ref.get(),
    costSnapshot.ref.get(),
  ]);
  assert.equal(migratedControl.data()?.pId, SIGNALDESK_PRODUCT_CODE, "Legacy control summary product identity was not migrated");
  assert.equal(migratedControl.data()?.controlRoomSummaryId, migratedControl.id, "Legacy control summary document identity was not migrated");
  assert.equal(migratedQueue.data()?.pId, SIGNALDESK_PRODUCT_CODE, "Legacy queue summary product identity was not migrated");
  assert.equal(migratedQueue.data()?.queueSummaryId, migratedQueue.id, "Legacy queue summary document identity was not migrated");
  assert(migratedQueue.data()?.updatedAt, "Legacy queue summary freshness was not materialized");
  assert.equal(migratedCost.data()?.pId, SIGNALDESK_PRODUCT_CODE, "Legacy cost summary product identity was not migrated");
  assert.equal(migratedCost.data()?.day, migratedCost.id, "Legacy cost summary document identity was not migrated");
  await seedOverviewSummaries();

  assert.equal(SIGNALDESK_KILL_SWITCH_SCOPE_VALUES.length, 11, "Expected all eleven governed kill-switch scopes");
  await Promise.all(SIGNALDESK_KILL_SWITCH_SCOPE_VALUES.map((scope) => (
    db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc(`scope_${scope}`).set(activeSwitchFixture(scope))
  )));

  let overview = await loadSignalDeskOverviewServer(access);
  assert.equal(overview.activeKillSwitches.length, 11, "Overview truncated one of eleven active scopes");
  assert.equal(overview.controlRoom.activeKillSwitchCount, 11, "Derived active-switch count is not exact");
  assert.equal(overview.controlRoom.channelStatus, "healthy", "Kill state overwrote provider-derived channel health");
  assert.equal(new Set(overview.metrics.map((metric) => metric.key)).size, overview.metrics.length, "Overview emitted duplicate metric keys");

  await db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc("scope_ai-worker").set(activeSwitchFixture("ai-worker", { pId: "ML" }));
  await db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc("scope_campaign").set(activeSwitchFixture("campaign", { killSwitchId: "scope_email" }));
  overview = await loadSignalDeskOverviewServer(access);
  assert.equal(overview.activeKillSwitches.length, 9, "Foreign or identity-mismatched pause leaked into overview truth");
  assert.equal(overview.controlRoom.activeKillSwitchCount, 9, "Invalid pause altered the derived active count");

  await Promise.all(Array.from({ length: 60 }, (_, index) => {
    const incidentId = `incident_${String(index).padStart(3, "0")}`;
    return db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS).doc(incidentId).set({
      incidentId,
      pId: SIGNALDESK_PRODUCT_CODE,
      severity: index % 2 ? "high" : "medium",
      status: "open",
      title: `Open incident ${index}`,
      updatedAt: timestampNow(),
    });
  }));
  await db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS).doc("incident_acknowledged").set({
    incidentId: "incident_acknowledged",
    pId: SIGNALDESK_PRODUCT_CODE,
    severity: "high",
    status: "acknowledged",
    title: "Acknowledged but unresolved incident",
    updatedAt: timestampNow(),
  });
  await Promise.all([
    db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS).doc("incident_foreign").set({
      incidentId: "incident_foreign",
      pId: "ML",
      severity: "critical",
      status: "open",
      title: "Foreign incident",
      updatedAt: timestampNow(),
    }),
    db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS).doc("incident_malformed_identity").set({
      incidentId: "incident_other",
      pId: SIGNALDESK_PRODUCT_CODE,
      severity: "high",
      status: "open",
      title: "Malformed identity",
      updatedAt: timestampNow(),
    }),
    db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS).doc("incident_malformed_timestamp").set({
      incidentId: "incident_malformed_timestamp",
      pId: SIGNALDESK_PRODUCT_CODE,
      severity: "high",
      status: "open",
      title: "Malformed timestamp",
      updatedAt: "2026-07-15T00:00:00.000Z",
    }),
  ]);
  overview = await loadSignalDeskOverviewServer(access);
  assert.equal(overview.incidents.length, 50, "Overview did not retain its bounded incident list cap");
  assert.equal(overview.controlRoom.openIncidentCount, 61, "Bounded list cap, acknowledged state, or malformed rows changed exact unresolved-incident count");
  assert(overview.incidents.every((incident) => incident.incidentId.startsWith("incident_0")), "Malformed incident leaked into the projected list");

  await Promise.all([
    db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS).doc("incident_malformed_identity").delete(),
    db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS).doc("incident_malformed_timestamp").delete(),
  ]);
  await Promise.all(Array.from({ length: 440 }, (_, offset) => {
    const index = offset + 60;
    const incidentId = `incident_${String(index).padStart(3, "0")}`;
    return db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS).doc(incidentId).set({
      incidentId,
      pId: SIGNALDESK_PRODUCT_CODE,
      severity: "medium",
      status: "open",
      title: `Ceiling incident ${index}`,
      updatedAt: timestampNow(),
    });
  }));
  await db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS).doc("incident_zzz_malformed_tail").set({
    incidentId: "incident_wrong_tail_identity",
    pId: SIGNALDESK_PRODUCT_CODE,
    severity: "high",
    status: "open",
    title: "Malformed row beyond the former ten-page scan",
    updatedAt: timestampNow(),
  });
  await expectRejects(
    "Incident strict-count ceiling",
    () => loadSignalDeskOverviewServer(access),
    "SIGNALDESK_INCIDENT_STRICT_COUNT_LIMIT_EXCEEDED",
  );
  await clearCollection(SIGNALDESK_COLLECTIONS.INCIDENTS);

  await clearCollection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES);
  await clearCollection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS);
  await clearCollection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS);

  const exactRequest = {
    access,
    idempotencyKey: "kill-switch-exact-retry",
    reason: "Pause email while the route is inspected.",
    scope: "email",
    status: "active",
  };
  const killSwitchCostBefore = await readWriteEstimate();
  const first = await setSignalDeskKillSwitchServer(exactRequest);
  const duplicate = await setSignalDeskKillSwitchServer(exactRequest);
  assert.deepEqual(duplicate, first, "Exact retry did not return the first durable result");
  assert.equal(await countWhere(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, "entityId", "scope_email"), 1, "Exact retry duplicated the kill-switch audit");
  assert.equal(await readWriteEstimate(), killSwitchCostBefore + 4, "Kill-switch transition did not count switch, audit, claim, and cost writes exactly once");
  const activationAuditSnapshot = await db.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
    .where("entityId", "==", "scope_email")
    .limit(1)
    .get();
  assert.equal(activationAuditSnapshot.docs[0]?.data()?.reason, "event:kill_switch_activate", "Activation audit persisted operator free text");
  await expectRejects("Changed kill-switch idempotency facts", () => setSignalDeskKillSwitchServer({
    ...exactRequest,
    status: "inactive",
  }), "KILL_SWITCH_IDEMPOTENCY_CONFLICT");

  const cleared = await setSignalDeskKillSwitchServer({
    access,
    idempotencyKey: "kill-switch-clear-email",
    reason: "Clear email after the route inspection completes.",
    scope: "email",
    status: "inactive",
  });
  assert(cleared.deactivatedAt && cleared.deactivatedBy, "Deactivation did not retain actor and timestamp evidence");
  const reactivated = await setSignalDeskKillSwitchServer({
    access,
    idempotencyKey: "kill-switch-reactivate-email",
    reason: "Pause email again for the recovery-state test.",
    scope: "email",
    status: "active",
  });
  assert.equal(reactivated.deactivatedAt, null, "Reactivation retained a stale deactivation timestamp");
  assert.equal(reactivated.deactivatedBy, null, "Reactivation retained a stale deactivation actor");
  const emailAuditSnapshot = await db.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
    .where("entityId", "==", "scope_email")
    .get();
  assert.deepEqual(
    emailAuditSnapshot.docs.map((document) => document.data().reason).sort(),
    ["event:kill_switch_activate", "event:kill_switch_activate", "event:kill_switch_deactivate"],
    "Kill-switch transition audits do not use stable event classifications",
  );

  const concurrentExactRequest = {
    access,
    idempotencyKey: "kill-switch-concurrent-exact",
    reason: "Pause WhatsApp while the route is inspected.",
    scope: "whatsapp",
    status: "active",
  };
  const concurrentExact = await Promise.all([
    setSignalDeskKillSwitchServer(concurrentExactRequest),
    setSignalDeskKillSwitchServer(concurrentExactRequest),
  ]);
  assert.deepEqual(concurrentExact[0], concurrentExact[1], "Concurrent exact retry returned divergent state");
  assert.equal(await countWhere(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, "entityId", "scope_whatsapp"), 1, "Concurrent exact retry duplicated the audit");

  await Promise.all([
    setSignalDeskKillSwitchServer({
      access,
      idempotencyKey: "kill-switch-opposite-active",
      reason: "Pause Instagram for the active transition test.",
      scope: "instagram",
      status: "active",
    }),
    setSignalDeskKillSwitchServer({
      access,
      idempotencyKey: "kill-switch-opposite-inactive",
      reason: "Clear Instagram for the inactive transition test.",
      scope: "instagram",
      status: "inactive",
    }),
  ]);
  const oppositeSnapshot = await db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc("scope_instagram").get();
  const oppositeState = parseSignalDeskKillSwitchDocument(oppositeSnapshot.data(), oppositeSnapshot.id);
  assert(["active", "inactive"].includes(oppositeState.status), "Concurrent opposite transitions left invalid state");
  assert.equal(await countWhere(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, "entityId", "scope_instagram"), 2, "Concurrent opposite transitions lost or duplicated an audit");

  overview = await loadSignalDeskOverviewServer(access);
  assert.equal(overview.controlRoom.channelStatus, "healthy", "Kill-switch settlement clobbered channel health");
  assert.equal(
    overview.controlRoom.activeKillSwitchCount,
    overview.activeKillSwitches.length,
    "Overview active count diverged after concurrent transitions",
  );

  await db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc("scope_ai-worker").set(activeSwitchFixture("ai-worker", { pId: "ML" }));
  const auditCountBeforeForeignWrite = await countWhere(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, "entityId", "scope_ai-worker");
  await expectRejects("Foreign kill-switch overwrite", () => setSignalDeskKillSwitchServer({
    access,
    idempotencyKey: "kill-switch-foreign-overwrite",
    reason: "Do not overwrite a foreign product pause.",
    scope: "ai-worker",
    status: "inactive",
  }), "KILL_SWITCH_PRODUCT_MISMATCH");
  assert.equal(await countWhere(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, "entityId", "scope_ai-worker"), auditCountBeforeForeignWrite, "Rejected foreign overwrite emitted an audit");

  await db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc("scope_source-provider").set(activeSwitchFixture("source-provider", { updatedAt: "invalid" }));
  await expectRejects("Malformed kill-switch overwrite", () => setSignalDeskKillSwitchServer({
    access,
    idempotencyKey: "kill-switch-malformed-overwrite",
    reason: "Do not overwrite a malformed pause row.",
    scope: "source-provider",
    status: "inactive",
  }), "KILL_SWITCH_SHAPE_INVALID");

  const automaticPauseTimestamp = timestampNow();
  await db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc("scope_campaign").set({
    activatedAt: automaticPauseTimestamp,
    activatedBy: "signaldesk-system-test",
    killSwitchId: "scope_campaign",
    pId: SIGNALDESK_PRODUCT_CODE,
    reason: "Automatic complaint pause pending founder review.",
    scope: "campaign",
    status: "active",
    updatedAt: automaticPauseTimestamp,
  });
  overview = await loadSignalDeskOverviewServer(access);
  assert(overview.activeKillSwitches.some((item) => item.scope === "campaign"), "Automatic/system pause was not derived from its strict scope document");

  console.log("SignalDesk kill-switch/overview verification passed");
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
