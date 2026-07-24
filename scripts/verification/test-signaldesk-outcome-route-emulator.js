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
const { FEATURE_FLAGS } = require("@config/features");
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
const approvalId = "approval_outcome_route_emulator";
const draftId = "draft_outcome_route_emulator";
const templateId = "template_outcome_route_emulator";
const evidencePacketId = `evidence_${hashValue("outcome-route-evidence").slice(0, 32)}`;
const dailyCostRef = db.collection(SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES)
  .doc(new Date().toISOString().slice(0, 10));
const readWriteEstimate = async () => Number((await dailyCostRef.get()).data()?.firestoreWriteEstimate || 0);

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
    SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE,
    SIGNALDESK_COLLECTIONS.AUDIT_EVENTS,
    SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES,
    SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES,
    SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES,
    SIGNALDESK_COLLECTIONS.DEMAND_SIGNALS,
    SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES,
    SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES,
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
    channel: "email",
    idempotencyKey: "route-token-operation-v1",
    targetId,
  };
  const routeCostBefore = await readWriteEstimate();
  const routes = await Promise.all([
    createSignalDeskRouteTokenServer(access, routeInput),
    createSignalDeskRouteTokenServer(access, routeInput),
  ]);
  assert.equal(routes.filter((route) => route.duplicate === false).length, 1, "Concurrent issuance did not elect one writer");
  assert.equal(routes.filter((route) => route.duplicate === true).length, 1, "Concurrent issuance did not return one replay");
  assert.equal(routes[0].routeTokenId, routes[1].routeTokenId);
  assert.equal(routes[0].token, routes[1].token, "Exact issuance retry did not reproduce opaque material");
  assert.equal(await readWriteEstimate(), routeCostBefore + 4, "Route issuance cost estimate did not count route, claim, audit, and cost writes exactly once");
  await expectRejects(
    "Changed issuance intent reused a claim",
    () => createSignalDeskRouteTokenServer(access, { ...routeInput, channel: "share" }),
    "ROUTE_TOKEN_IDEMPOTENCY_CONFLICT",
  );
  await expectRejects(
    "Invented source action was accepted",
    () => createSignalDeskRouteTokenServer(access, {
      ...routeInput,
      actionId: "invented_owner_action",
      idempotencyKey: "route-token-invented-action-v1",
    }),
    "ROUTE_TOKEN_SOURCE_ACTION_INVALID",
  );

  const route = routes[0];
  const routeSnapshot = await db.collection(SIGNALDESK_COLLECTIONS.ROUTE_TOKENS).doc(route.routeTokenId).get();
  const routeAuthority = parseSignalDeskRouteTokenDocument(routeSnapshot.data(), routeSnapshot.id);
  assert.equal(routeAuthority.sourcePolicyId, authority.sourcePolicyId);
  assert.equal(routeAuthority.sourceRunId, sourceRunId);
  assert.equal(routeAuthority.sourceActionId, conversationId, "Route without approved-action lineage did not use the exact interested conversation as its source");
  assert.equal(routeSnapshot.get("token"), undefined, "Raw token was persisted");

  const approvedAt = Timestamp.now();
  await Promise.all([
    db.collection(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE).doc(approvalId).set({
      approvalId,
      approvalPacketId: null,
      channel: "email",
      draftId,
      dueAt: null,
      pId: "SD",
      priority: "normal",
      reviewReason: "Approved exported route source.",
      status: "exported",
      targetId,
      targetName: "Outcome Route Fixture",
      updatedAt: approvedAt,
    }),
    db.collection(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES).doc(draftId).set({
      approvalId,
      body: "Review the current MenuList route.",
      channel: "email",
      ctaFingerprintHash: null,
      ctaId: null,
      draftId,
      evidencePacketId,
      pId: "SD",
      personalizationEvidenceIds: [evidencePacketId],
      senderDomainFingerprintHash: null,
      senderDomainId: null,
      status: "exported",
      subject: "Your current MenuList route",
      targetId,
      targetName: "Outcome Route Fixture",
      templateFingerprintHash: null,
      templateId,
      unsupportedClaims: [],
      updatedAt: approvedAt,
    }),
    db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId).set({
      latestApprovalId: approvalId,
      latestDraftId: draftId,
      updatedAt: approvedAt,
    }, { merge: true }),
  ]);
  await expectRejects(
    "Approved source accepted mismatched template lineage",
    () => createSignalDeskRouteTokenServer(access, {
      ...routeInput,
      actionId: approvalId,
      idempotencyKey: "route-token-approved-wrong-template-v1",
      templateId: "template_mismatch",
    }),
    "ROUTE_TOKEN_SOURCE_ACTION_LINEAGE_INVALID",
  );
  const approvedRoute = await createSignalDeskRouteTokenServer(access, {
    ...routeInput,
    actionId: approvalId,
    idempotencyKey: "route-token-approved-action-v1",
    templateId,
  });
  const approvedRouteSnapshot = await db.collection(SIGNALDESK_COLLECTIONS.ROUTE_TOKENS)
    .doc(approvedRoute.routeTokenId)
    .get();
  const approvedRouteAuthority = parseSignalDeskRouteTokenDocument(
    approvedRouteSnapshot.data(),
    approvedRouteSnapshot.id,
  );
  assert.equal(approvedRouteAuthority.sourceActionId, approvalId, "Approved route did not retain canonical approval lineage");
  assert.equal(approvedRouteAuthority.templateId, templateId, "Approved route did not retain canonical draft template lineage");

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
  const outcomeCostBefore = await readWriteEstimate();
  const bridgeResults = await Promise.all([
    processSignalDeskOutcomeBridge({ rawBody, requestHeaders: headers }),
    processSignalDeskOutcomeBridge({ rawBody, requestHeaders: headers }),
  ]);
  assert.equal(bridgeResults.filter((result) => result.status === "processed").length, 1);
  assert.equal(bridgeResults.filter((result) => result.status === "duplicate").length, 1);
  assert.equal(await readWriteEstimate(), outcomeCostBefore + 9, "Signed outcome cost estimate did not count the route-linked atomic writes exactly once");
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
  const revocationCostBefore = await readWriteEstimate();
  await revokeSignalDeskRouteTokenServer(access, {
    reason: "Outcome route isolated replay regression.",
    routeTokenId: route.routeTokenId,
  });
  assert.equal(await readWriteEstimate(), revocationCostBefore + 3, "Route revocation cost estimate did not count route, audit, and cost writes");
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
  const demandSignalsFlag = FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_DEMAND_SIGNALS;
  FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_DEMAND_SIGNALS = false;
  await expectRejects(
    "Demand capture bypassed the master feature flag",
    () => captureSignalDeskDemandSignalServer(access, {
      idempotencyKey: "disabled-demand-signal-v1",
      signalType: "share",
      sourceSurface: "manual",
    }),
    "SignalDesk Demand Signals is disabled",
  );
  FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_DEMAND_SIGNALS = demandSignalsFlag;
  await expectRejects(
    "General demand accepted a free-text target name",
    () => captureSignalDeskDemandSignalServer(access, {
      idempotencyKey: "general-demand-with-name-v1",
      signalType: "share",
      sourceSurface: "manual",
      targetName: "Unverified person or business",
    }),
    "DEMAND_SIGNAL_TARGET_NAME_REQUIRES_TARGET",
  );
  const targetRef = db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId);
  await targetRef.set({ pId: "XX" }, { merge: true });
  await expectRejects(
    "Target-scoped demand accepted foreign product truth",
    () => captureSignalDeskDemandSignalServer(access, {
      idempotencyKey: "foreign-target-demand-v1",
      signalType: "share",
      sourceSurface: "manual",
      targetId,
    }),
    "TARGET_PRODUCT_MISMATCH",
  );
  await targetRef.set({ pId: "SD" }, { merge: true });
  const collisionKey = "demand-summary-collision-v1";
  const collisionSummaryId = `${new Date().toISOString().slice(0, 10)}_qr_scan_other_${targetId}`;
  const collisionSummaryRef = db.collection(SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES).doc(collisionSummaryId);
  await collisionSummaryRef.set({
    count: 1,
    day: new Date().toISOString().slice(0, 10),
    demandSignalId: collisionSummaryId,
    pId: "XX",
    signalType: "qr_scan",
    sourceSurface: "other",
    targetId,
    targetName: "Outcome Route Fixture",
    updatedAt: Timestamp.now(),
  });
  await expectRejects(
    "Demand capture merged a foreign deterministic summary",
    () => captureSignalDeskDemandSignalServer(access, {
      idempotencyKey: collisionKey,
      signalType: "qr_scan",
      sourceSurface: "other",
      targetId,
    }),
    "DEMAND_SIGNAL_SUMMARY_INVALID",
  );
  const rejectedDemandId = `demand_${hashValue(`${access.userId}|${collisionKey}`).slice(0, 32)}`;
  assert.equal((await db.collection(SIGNALDESK_COLLECTIONS.DEMAND_SIGNALS).doc(rejectedDemandId).get()).exists, false, "Rejected demand wrote a partial event");
  await collisionSummaryRef.delete();
  await targetRef.set({ suppressionStatus: "suppressed", updatedAt: Timestamp.now() }, { merge: true });
  const suppressedDemand = await captureSignalDeskDemandSignalServer(access, {
    idempotencyKey: "suppressed-target-demand-v1",
    signalType: "link_click",
    sourceSurface: "manual",
    targetId,
  });
  assert(suppressedDemand.demandSignalId, "Suppressed target demand was not retained for aggregate learning");
  assert.equal((await targetRef.get()).get("suppressionStatus"), "suppressed", "Demand capture cleared target suppression");
  await targetRef.set({ suppressionStatus: "clear", updatedAt: Timestamp.now() }, { merge: true });
  const demandCostBefore = await readWriteEstimate();
  const demand = await captureSignalDeskDemandSignalServer(access, {
    idempotencyKey: "demand-source-for-outcome-v1",
    signalType: "share",
    sourceSurface: "menu",
    targetId,
  });
  const demandReplay = await captureSignalDeskDemandSignalServer(access, {
    idempotencyKey: "demand-source-for-outcome-v1",
    signalType: "share",
    sourceSurface: "menu",
    targetId,
  });
  assert.equal(demandReplay.duplicate, true, "Exact demand retry did not prove its durable event and summary");
  assert.equal(await readWriteEstimate(), demandCostBefore + 6, "Demand capture did not count event, summary, claim, audit, control, and cost writes exactly once");
  const originalDemandEventRef = db.collection(SIGNALDESK_COLLECTIONS.DEMAND_SIGNALS).doc(demand.demandSignalId);
  const originalDemandSummaryRef = db.collection(SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES).doc(demand.summaryId);
  const originalDemandSummary = (await originalDemandSummaryRef.get()).data();
  const priorDayMillis = Date.now() - (24 * 60 * 60 * 1000);
  const priorDay = new Date(priorDayMillis).toISOString().slice(0, 10);
  const priorDemandSummaryId = `${priorDay}_share_menu_${targetId}`;
  await originalDemandEventRef.set({ createdAt: Timestamp.fromMillis(priorDayMillis) }, { merge: true });
  await db.collection(SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES).doc(priorDemandSummaryId).set({
    ...originalDemandSummary,
    day: priorDay,
    demandSignalId: priorDemandSummaryId,
  });
  await originalDemandSummaryRef.delete();
  const crossDayDemandReplay = await captureSignalDeskDemandSignalServer(access, {
    idempotencyKey: "demand-source-for-outcome-v1",
    signalType: "share",
    sourceSurface: "menu",
    targetId,
  });
  assert.equal(crossDayDemandReplay.summaryId, priorDemandSummaryId, "Demand replay used the current day instead of its immutable event day");
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
  const manualOutcomeCostBefore = await readWriteEstimate();
  const manualOutcome = await recordSignalDeskOutcomeServer(access, manualOutcomeInput);
  const manualOutcomeReplay = await recordSignalDeskOutcomeServer(access, manualOutcomeInput);
  assert.equal(manualOutcome.activationWatchSyncStatus, "updated", "Manual outcome did not reconcile the existing activation watch");
  assert.equal(await readWriteEstimate(), manualOutcomeCostBefore + 14, "Manual outcome did not count eight base writes plus six activation-watch reconciliation writes exactly once");
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
