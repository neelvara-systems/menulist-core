process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.MENULIST_SIGNALDESK_FIREBASE_MODE = process.env.MENULIST_SIGNALDESK_FIREBASE_MODE || "separate";
process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "demo-signaldesk-outcome-route";
process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID || process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID;
process.env.MENULIST_SIGNALDESK_OUTCOME_BRIDGE_SECRET = process.env.MENULIST_SIGNALDESK_OUTCOME_BRIDGE_SECRET || "local-signaldesk-outcome-route-emulator-secret-v1";
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("SignalDesk outcome/route regression requires FIRESTORE_EMULATOR_HOST.");
  process.exit(1);
}

require("ts-node").register({
  compilerOptions: { module: "CommonJS", target: "ES2022" },
  transpileOnly: true,
});
require("tsconfig-paths/register");

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { SIGNALDESK_COLLECTIONS } = require("@constant/signaldesk/database");
const { admin, signaldeskFirestoreAdmin: db } = require("@lib/firebase/signaldeskFirebaseAdmin");
const {
  assertSignalDeskOutcomeSummaryMatchesEvent,
  parseSignalDeskOutcomeEventDocument,
  parseSignalDeskOutcomeSummaryDocument,
  parseSignalDeskRouteTokenDocument,
} = require("@lib/signaldesk/outcomeContracts");
const { processSignalDeskOutcomeBridge } = require("@lib/signaldesk/outcomeBridgeServer");
const {
  captureSignalDeskDemandSignalServer,
  createSignalDeskRouteTokenServer,
  createSignalDeskSourcePolicyServer,
  qualifySignalDeskRevenueAccountServer,
  recordSignalDeskOutcomeServer,
  revokeSignalDeskRouteTokenServer,
} = require("@lib/signaldesk/workflowServer");

const Timestamp = admin.firestore.Timestamp;
const hashValue = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const targetId = "target_outcome_route_emulator";
const sourceRunId = "run_outcome_route_emulator";
const conversationId = "conv_outcome_route_emulator";
const evidencePacketId = `evidence_${hashValue("outcome-route-evidence").slice(0, 32)}`;

const access = {
  active: true,
  email: "signaldesk-outcome-route@example.invalid",
  firebaseConfigured: true,
  isPlatformAdmin: true,
  name: "SignalDesk outcome route regression",
  permissions: ["signaldesk.configure", "target.review", "policy.approve"],
  role: "founder-admin",
  userId: "outcome-route-test-actor",
};

const signedHeaders = (rawBody) => {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = crypto.createHmac("sha256", process.env.MENULIST_SIGNALDESK_OUTCOME_BRIDGE_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return new Headers({
    "x-signaldesk-outcome-signature": `sha256=${signature}`,
    "x-signaldesk-outcome-timestamp": timestamp,
  });
};

const expectRejects = async (label, operation, expectedMessage) => {
  await assert.rejects(operation, (error) => {
    assert.equal(error instanceof Error ? error.message : String(error), expectedMessage, label);
    return true;
  });
};

const cleanup = async () => {
  const collections = [
    SIGNALDESK_COLLECTIONS.ATTRIBUTION_TOUCHES,
    SIGNALDESK_COLLECTIONS.AUDIT_EVENTS,
    SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES,
    SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES,
    SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES,
    SIGNALDESK_COLLECTIONS.DEMAND_SIGNALS,
    SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES,
    SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES,
    SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS,
    SIGNALDESK_COLLECTIONS.OUTCOME_EVENTS,
    SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES,
    SIGNALDESK_COLLECTIONS.ACTIVATION_WATCHES,
    SIGNALDESK_COLLECTIONS.COMMERCIAL_OPPORTUNITIES,
    SIGNALDESK_COLLECTIONS.REVENUE_ACCOUNTS,
    SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES,
    SIGNALDESK_COLLECTIONS.ROUTE_TOKENS,
    SIGNALDESK_COLLECTIONS.RUN_TIMELINES,
    SIGNALDESK_COLLECTIONS.SOURCE_POLICIES,
    SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES,
  ];
  for (const collection of collections) await db.recursiveDelete(db.collection(collection));
};

const seedAuthority = async () => {
  const now = Date.now();
  const expiresAt = new Date(now + (30 * 24 * 60 * 60 * 1000));
  const sourcePolicy = await createSignalDeskSourcePolicyServer(access, {
    accessMethod: "permissioned-referral",
    allowContact: true,
    allowEvidence: true,
    allowPersonalization: true,
    allowedContactChannels: ["email", "manual"],
    allowedFields: ["displayName", "currentListUrl", "website", "email"],
    attributionRequirements: ["Keep the source reference attached."],
    blockedFields: ["personal-profile"],
    expiresAt: expiresAt.toISOString(),
    idempotencyKey: "outcome-route-policy-create-v1",
    lastReviewedAt: new Date(now - 60_000).toISOString(),
    name: "Outcome route emulator policy",
    notes: "Isolated local regression authority.",
    policyOwner: access.userId,
    prohibitedUses: ["unapproved send"],
    rawPayloadPolicy: "never-store",
    refreshMethod: "manual-review",
    retentionDays: 30,
    sourceType: "manual-research",
    termsVersion: "outcome-route-emulator-v1",
  });
  const observedAt = Timestamp.fromMillis(now - 120_000);
  const ownerQualifiedAt = Timestamp.fromMillis(now - 60_000);
  const currentAt = Timestamp.fromMillis(now - 1_000);
  const expiryTimestamp = Timestamp.fromDate(expiresAt);
  await Promise.all([
    db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).set({
      contactability: "ready",
      currentListUrl: "https://example.test/menu",
      displayName: "Outcome Route Fixture",
      latestConversationId: conversationId,
      nextAction: "outcome",
      ownerQualifiedAt,
      pId: "SD",
      primaryOpportunity: "missing-current-list",
      segment: "a",
      sourceConfidence: "high",
      sourceDataExpiresAt: expiryTimestamp,
      sourceDataLifecycleState: "active",
      sourceDataObservedAt: observedAt,
      sourcePolicyId: sourcePolicy.sourcePolicyId,
      sourceRunId,
      status: "replied",
      suppressionStatus: "clear",
      targetId,
      updatedAt: currentAt,
      website: "https://example.test/",
    }),
    db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES).doc(conversationId).set({
      channel: "email",
      conversationId,
      lastInboundAt: ownerQualifiedAt,
      lastMessagePreview: "Yes, prepare the route.",
      pId: "SD",
      state: "interested",
      targetId,
      targetName: "Outcome Route Fixture",
      updatedAt: currentAt,
    }),
    db.collection(SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES).doc(evidencePacketId).set({
      allowedUse: ["evidence", "draft-personalization"],
      confidence: "high",
      createdAt: currentAt,
      currentMenuPresence: { observedFormat: "web-page" },
      evidencePacketId,
      pId: "SD",
      rejectedFacts: ["Owner control was not verified."],
      summary: "Current MenuList evidence is available for this target.",
      targetId,
      targetName: "Outcome Route Fixture",
      updatedAt: currentAt,
    }),
  ]);
  return { ownerQualifiedAt: ownerQualifiedAt.toDate().toISOString(), sourcePolicyId: sourcePolicy.sourcePolicyId };
};

const main = async () => {
  await cleanup();
  const authority = await seedAuthority();
  const routeInput = {
    actionId: "owner_route_action_v1",
    channel: "email",
    idempotencyKey: "route-token-operation-v1",
    targetId,
  };
  const routes = await Promise.all([
    createSignalDeskRouteTokenServer(access, routeInput),
    createSignalDeskRouteTokenServer(access, routeInput),
  ]);
  assert.equal(routes.filter((route) => route.duplicate === false).length, 1, "Concurrent issuance did not elect one writer");
  assert.equal(routes.filter((route) => route.duplicate === true).length, 1, "Concurrent issuance did not return one replay");
  assert.equal(routes[0].routeTokenId, routes[1].routeTokenId);
  assert.equal(routes[0].token, routes[1].token, "Exact issuance retry did not reproduce opaque material");
  await expectRejects(
    "Changed issuance intent reused a claim",
    () => createSignalDeskRouteTokenServer(access, { ...routeInput, channel: "share" }),
    "ROUTE_TOKEN_IDEMPOTENCY_CONFLICT",
  );

  const route = routes[0];
  const routeSnapshot = await db.collection(SIGNALDESK_COLLECTIONS.ROUTE_TOKENS).doc(route.routeTokenId).get();
  const routeAuthority = parseSignalDeskRouteTokenDocument(routeSnapshot.data(), routeSnapshot.id);
  assert.equal(routeAuthority.sourcePolicyId, authority.sourcePolicyId);
  assert.equal(routeAuthority.sourceRunId, sourceRunId);
  assert.equal(routeSnapshot.get("token"), undefined, "Raw token was persisted");

  const payload = {
    evidenceRef: `menulist-event:${targetId}`,
    eventId: "menulist.outcome.route.emulator.001",
    outcomeType: "two_surface_activation",
    ownerQualifiedAt: routeAuthority.ownerQualifiedAt,
    ownerReviewedAt: new Date().toISOString(),
    routeToken: route.token,
    surfaces: ["qr", "website"],
    targetId,
  };
  const rawBody = JSON.stringify(payload);
  const headers = signedHeaders(rawBody);
  const bridgeResults = await Promise.all([
    processSignalDeskOutcomeBridge({ rawBody, requestHeaders: headers }),
    processSignalDeskOutcomeBridge({ rawBody, requestHeaders: headers }),
  ]);
  assert.equal(bridgeResults.filter((result) => result.status === "processed").length, 1);
  assert.equal(bridgeResults.filter((result) => result.status === "duplicate").length, 1);
  const routeOutcomeEventId = bridgeResults[0].eventId;
  const routeOutcomeSnapshot = await db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_EVENTS).doc(routeOutcomeEventId).get();
  const routeOutcome = parseSignalDeskOutcomeEventDocument(routeOutcomeSnapshot.data(), routeOutcomeSnapshot.id);
  const routeSummarySnapshot = (await db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES)
    .where("latestOutcomeEventId", "==", routeOutcomeEventId)
    .limit(1)
    .get()).docs[0];
  assert(routeSummarySnapshot, "Route outcome summary was not written");
  const routeSummary = parseSignalDeskOutcomeSummaryDocument(routeSummarySnapshot.data(), routeSummarySnapshot.id);
  assertSignalDeskOutcomeSummaryMatchesEvent(routeSummary, routeOutcome);
  assert.equal(routeSummary.source, "route-token");
  const routeTouch = await db.collection(SIGNALDESK_COLLECTIONS.ATTRIBUTION_TOUCHES)
    .doc(`touch_${hashValue(routeOutcomeEventId).slice(0, 32)}`)
    .get();
  assert.equal(routeTouch.get("actionId"), routeAuthority.sourceActionId);
  assert.equal(routeTouch.get("method"), "route-token-direct-v1");

  const malformedActivationBatch = db.batch();
  const malformedActivationRefs = [];
  for (let index = 0; index < 31; index += 1) {
    const malformedRef = db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES)
      .doc(`000_malformed_activation_${String(index).padStart(2, "0")}_${targetId}`);
    malformedActivationRefs.push(malformedRef);
    malformedActivationBatch.set(malformedRef, {
      channel: "manual",
      count: 1,
      day: "2026-07-15",
      outcomeSummaryId: malformedRef.id,
      outcomeType: "two_surface_activation",
      pId: "SD",
      source: "manual",
      targetId,
      updatedAt: Timestamp.now(),
    });
  }
  await malformedActivationBatch.commit();
  const qualification = await qualifySignalDeskRevenueAccountServer(access, {
    locationType: "single-location",
    organizationName: "Outcome Route Fixture",
    targetId,
  });
  assert.equal(qualification.account.lifecycleStage, "customer", "Malformed legacy summaries hid verified activation during qualification");
  assert.equal(qualification.opportunity?.status, "won", "Verified activation did not settle the new opportunity as won");
  assert.equal(qualification.activationWatch?.status, "activated", "Malformed legacy summaries hid verified activation during watch refresh");
  const malformedCleanupBatch = db.batch();
  malformedActivationRefs.forEach((reference) => malformedCleanupBatch.delete(reference));
  await malformedCleanupBatch.commit();

  await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).set({
    sourceDataLifecycleState: "pending",
    updatedAt: Timestamp.now(),
  }, { merge: true });
  const issuanceReplayAfterLifecycleHold = await createSignalDeskRouteTokenServer(access, routeInput);
  assert.equal(issuanceReplayAfterLifecycleHold.duplicate, true, "Exact issuance replay was not stable after lifecycle hold");
  for (const lifecycleState of ["pending", "failed", "completed"]) {
    await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).set({
      sourceDataLifecycleState: lifecycleState,
      updatedAt: Timestamp.now(),
    }, { merge: true });
    await expectRejects(
      `New issuance passed a ${lifecycleState} source lifecycle`,
      () => createSignalDeskRouteTokenServer(access, {
        ...routeInput,
        idempotencyKey: `route-token-operation-${lifecycleState}`,
      }),
      "OUTCOME_TARGET_SOURCE_LIFECYCLE_INACTIVE",
    );
    await expectRejects(
      `New manual outcome passed a ${lifecycleState} source lifecycle`,
      () => recordSignalDeskOutcomeServer(access, {
        channel: "manual",
        evidenceRef: `operator-note:${lifecycleState}-lifecycle`,
        idempotencyKey: `manual-outcome-${lifecycleState}-lifecycle`,
        outcomeType: "published",
        source: "manual",
        targetId,
      }),
      "OUTCOME_TARGET_SOURCE_LIFECYCLE_INACTIVE",
    );
  }
  await revokeSignalDeskRouteTokenServer(access, {
    reason: "Outcome route isolated replay regression.",
    routeTokenId: route.routeTokenId,
  });
  const retainedRouteAt = Timestamp.now();
  await routeSnapshot.ref.set({
    sourceDataLifecycleCompletedAt: retainedRouteAt,
    sourceDataLifecycleKind: "source-data-retention-v1",
    sourceDataLifecycleState: "completed",
    sourceDataLifecycleToken: `source_data_target_${"c".repeat(40)}`,
    targetName: "Retained target record",
    updatedAt: retainedRouteAt,
    updatedBy: "signaldesk-source-data-lifecycle",
  }, { merge: true });
  const retainedRouteSnapshot = await routeSnapshot.ref.get();
  const retainedRouteAuthority = parseSignalDeskRouteTokenDocument(
    retainedRouteSnapshot.data(),
    retainedRouteSnapshot.id,
  );
  assert.equal(retainedRouteAuthority.status, "revoked", "Completed retention route tombstone was not strict parse authority");
  const replayAfterRevocationAndLifecycleHold = await processSignalDeskOutcomeBridge({ rawBody, requestHeaders: headers });
  assert.equal(replayAfterRevocationAndLifecycleHold.status, "duplicate", "Recorded replay was blocked by current revocation or retention tombstone state");
  const newPayload = { ...payload, eventId: "menulist.outcome.route.emulator.002" };
  const newRawBody = JSON.stringify(newPayload);
  await expectRejects(
    "New signed outcome passed revoked route/lifecycle authority",
    () => processSignalDeskOutcomeBridge({ rawBody: newRawBody, requestHeaders: signedHeaders(newRawBody) }),
    "Invalid SignalDesk route token",
  );

  await db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).set({
    sourceDataLifecycleState: "active",
    updatedAt: Timestamp.now(),
  }, { merge: true });
  const currentEvidenceSnapshot = await db.collection(SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES)
    .doc(evidencePacketId)
    .get();
  const staleEvidenceTimestamp = Timestamp.fromMillis(Date.now() - (10 * 60 * 1000));
  await currentEvidenceSnapshot.ref.set({
    createdAt: staleEvidenceTimestamp,
    updatedAt: staleEvidenceTimestamp,
  }, { merge: true });
  await expectRejects(
    "New outcome accepted evidence older than current target observation",
    () => recordSignalDeskOutcomeServer(access, {
      channel: "manual",
      evidenceRef: "operator-note:stale-evidence",
      idempotencyKey: "manual-outcome-stale-evidence",
      outcomeType: "published",
      source: "manual",
      targetId,
    }),
    "OUTCOME_EVIDENCE_STALE",
  );
  await currentEvidenceSnapshot.ref.set({
    createdAt: currentEvidenceSnapshot.get("createdAt"),
    updatedAt: currentEvidenceSnapshot.get("updatedAt"),
  }, { merge: true });
  const demand = await captureSignalDeskDemandSignalServer(access, {
    idempotencyKey: "demand-source-for-outcome-v1",
    signalType: "share",
    sourceSurface: "menu",
    targetId,
  });
  const demandOutcome = await recordSignalDeskOutcomeServer(access, {
    channel: "share",
    evidenceRef: `demand-signal:${demand.demandSignalId}`,
    idempotencyKey: "demand-source-outcome-v1",
    outcomeType: "published",
    source: "demand-signal",
    sourceEventId: demand.demandSignalId,
    targetId,
  });
  const demandTouch = await db.collection(SIGNALDESK_COLLECTIONS.ATTRIBUTION_TOUCHES)
    .doc(`touch_${hashValue(demandOutcome.outcomeEventId).slice(0, 32)}`)
    .get();
  assert.equal(demandTouch.get("actionId"), demand.demandSignalId);
  assert.equal(demandTouch.get("method"), "demand-signal-direct-v1");
  await expectRejects(
    "Demand outcome accepted invented lineage",
    () => recordSignalDeskOutcomeServer(access, {
      channel: "share",
      evidenceRef: "demand-signal:invented",
      idempotencyKey: "demand-source-outcome-v2",
      outcomeType: "published",
      source: "demand-signal",
      sourceEventId: "demand_00000000000000000000000000000000",
      targetId,
    }),
    "OUTCOME_DEMAND_SOURCE_EVENT_INVALID",
  );

  const manualOutcomeInput = {
    channel: "manual",
    evidenceRef: "operator-note:manual-outcome",
    idempotencyKey: "manual-source-outcome-v1",
    outcomeType: "published",
    source: "manual",
    targetId,
  };
  const manualOutcome = await recordSignalDeskOutcomeServer(access, manualOutcomeInput);
  const manualOutcomeReplay = await recordSignalDeskOutcomeServer(access, manualOutcomeInput);
  assert.equal(manualOutcomeReplay.duplicate, true);
  assert.equal(manualOutcomeReplay.outcomeSummaryId, manualOutcome.outcomeSummaryId, "Exact replay changed its source-scoped summary identity");
  assert.notEqual(manualOutcome.outcomeSummaryId, demandOutcome.outcomeSummaryId, "Manual and demand outcomes shared one summary identity");
  const manualTouch = await db.collection(SIGNALDESK_COLLECTIONS.ATTRIBUTION_TOUCHES)
    .doc(`touch_${hashValue(manualOutcome.outcomeEventId).slice(0, 32)}`)
    .get();
  assert.equal(manualTouch.get("actionId"), manualOutcome.outcomeEventId);
  assert.equal(manualTouch.get("method"), "manual-direct-v1");
  const publishedSummaries = await db.collection(SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES)
    .where("targetId", "==", targetId)
    .where("outcomeType", "==", "published")
    .get();
  assert.deepEqual(
    new Set(publishedSummaries.docs.map((document) => document.get("source"))),
    new Set(["manual", "demand-signal"]),
    "Different sources collapsed into one summary identity",
  );

  console.log("SignalDesk outcome/route emulator regressions passed");
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
