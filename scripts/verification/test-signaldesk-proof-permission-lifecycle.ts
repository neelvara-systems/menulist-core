#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { admin, db } from "../../functions-signaldesk/src/firebaseAdmin";
import {
  recordSignalDeskProofPermissionLifecycleFailure,
  runSignalDeskProofPermissionLifecycle,
  signalDeskProofPermissionLifecycleAuthorityHash,
  signalDeskProofPublicationIncidentId,
} from "../../functions-signaldesk/src/schedulers/proofPermissionLifecycle";
import {
  runSignalDeskMaintenanceScheduler,
} from "../../functions-signaldesk/src/schedulers/signaldeskMaintenanceScheduler";

const Timestamp = admin.firestore.Timestamp;
const COLLECTIONS = {
  assets: "signaldeskContentAssets",
  audits: "signaldeskAuditEvents",
  calendars: "signaldeskContentCalendarItems",
  control: "signaldeskControlRoomSummaries",
  drafts: "signaldeskContentDistributionDrafts",
  incidents: "signaldeskIncidents",
  permissions: "signaldeskProofPermissions",
  queues: "signaldeskQueueSummaries",
  system: "_system",
  timelines: "signaldeskRunTimelines",
} as const;

const BASE_NOW = new Date("2026-07-15T10:15:00.000Z");
const stableHash = (value: string): string => createHash("sha256").update(value).digest("hex");

const cleanup = async (): Promise<void> => {
  for (const collectionName of Object.values(COLLECTIONS)) {
    await db.recursiveDelete(db.collection(collectionName));
  }
};

const seedPermission = async (params: {
  expiresAt?: Date;
  id: string;
  pId?: string;
  status?: "active" | "expired";
}): Promise<void> => {
  const expiresAt = params.expiresAt || new Date(BASE_NOW.getTime() - 60_000);
  await db.collection(COLLECTIONS.permissions).doc(params.id).set({
    proofPermissionId: params.id,
    pId: params.pId || "SD",
    targetId: `target_${params.id}`,
    targetName: "Lifecycle fixture",
    status: params.status || "active",
    scopes: ["business-name", "public-case-study"],
    evidenceRef: "https://example.test/proof-evidence",
    grantedAt: Timestamp.fromMillis(expiresAt.getTime() - 60 * 60 * 1000),
    expiresAt: Timestamp.fromDate(expiresAt),
    revokedAt: null,
    updatedAt: Timestamp.fromMillis(expiresAt.getTime() - 60 * 60 * 1000),
  });
};

const seedUnpublishedDependency = async (params: {
  assetId: string;
  permissionId: string;
}): Promise<void> => {
  const draftId = `draft_${params.assetId}`;
  const calendarId = `content_calendar_${draftId}`;
  await Promise.all([
    db.collection(COLLECTIONS.assets).doc(params.assetId).set({
      contentAssetId: params.assetId,
      pId: "SD",
      proofPermissionId: params.permissionId,
      status: "ready",
      hasPublishedContent: false,
      publicationStateVersion: 1,
      updatedAt: Timestamp.fromDate(BASE_NOW),
    }),
    db.collection(COLLECTIONS.drafts).doc(draftId).set({
      contentDraftId: draftId,
      pId: "SD",
      contentAssetId: params.assetId,
      approvalStatus: "pending",
      status: "draft",
      channel: "linkedin",
      updatedAt: Timestamp.fromDate(BASE_NOW),
    }),
    db.collection(COLLECTIONS.calendars).doc(calendarId).set({
      contentCalendarItemId: calendarId,
      contentDraftId: draftId,
      pId: "SD",
      contentAssetId: params.assetId,
      status: "queued",
      channel: "linkedin",
      publicationUrl: null,
      publishedAt: null,
      scheduledFor: Timestamp.fromMillis(BASE_NOW.getTime() + 60 * 60 * 1000),
      updatedAt: Timestamp.fromDate(BASE_NOW),
    }),
  ]);
};

const assertHeldDependency = async (assetId: string): Promise<void> => {
  const [asset, draft, calendar] = await Promise.all([
    db.collection(COLLECTIONS.assets).doc(assetId).get(),
    db.collection(COLLECTIONS.drafts).doc(`draft_${assetId}`).get(),
    db.collection(COLLECTIONS.calendars).doc(`content_calendar_draft_${assetId}`).get(),
  ]);
  assert.equal(asset.get("status"), "hold");
  assert.equal(draft.get("status"), "hold");
  assert.equal(draft.get("approvalStatus"), "hold");
  assert.equal(calendar.get("status"), "held");
};

const testOverlapAndDuplicateSchedulerRuns = async (): Promise<void> => {
  await cleanup();
  await seedPermission({ id: "permission_overlap" });
  await seedUnpublishedDependency({ assetId: "asset_overlap", permissionId: "permission_overlap" });
  await db.collection(COLLECTIONS.queues).doc("current").set({ pId: "SD", humanReview: 1 });

  const results = await Promise.all([
    runSignalDeskMaintenanceScheduler({ firestore: db, now: BASE_NOW, runId: "overlap_a" }),
    runSignalDeskMaintenanceScheduler({ firestore: db, now: BASE_NOW, runId: "overlap_b" }),
  ]);
  const taskStatuses = results.flatMap(result => result.tasks).reduce<Record<string, number>>((counts, task) => {
    counts[`${task.name}:${task.status}`] = (counts[`${task.name}:${task.status}`] || 0) + 1;
    return counts;
  }, {});
  assert.equal(taskStatuses["proof_permission_lifecycle:success"], 1);
  assert.equal(taskStatuses["proof_permission_lifecycle:skipped"], 1);
  assert.equal(taskStatuses["source_data_lifecycle:success"], 1);
  assert.equal(taskStatuses["source_data_lifecycle:skipped"], 1);
  assert.equal(results.some(result => result.status === "failed"), false);
  assert.equal((await db.collection(COLLECTIONS.permissions).doc("permission_overlap").get()).get("proofExpiryLifecycleState"), "completed");
  await assertHeldDependency("asset_overlap");
  assert.equal((await db.collection(COLLECTIONS.queues).doc("current").get()).get("humanReview"), 0);

  const duplicate = await runSignalDeskMaintenanceScheduler({
    firestore: db,
    now: new Date(BASE_NOW.getTime() + 10_000),
    runId: "overlap_duplicate",
  });
  assert.equal(duplicate.status, "skipped");
  assert.equal(duplicate.tasks[0].details && "reason" in duplicate.tasks[0].details
    ? duplicate.tasks[0].details.reason
    : null, "already_completed");
};

const testCrashResume = async (): Promise<void> => {
  await cleanup();
  await seedPermission({ id: "permission_resume" });
  await seedUnpublishedDependency({ assetId: "asset_resume", permissionId: "permission_resume" });

  const interrupted = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromDate(BASE_NOW),
    dependencyPageSize: 1,
    maxReconciliationSteps: 1,
  });
  assert.equal(interrupted.materializedPermissionCount, 1);
  assert.equal(interrupted.pendingPermissionCount, 1);
  assert.equal(interrupted.stepLimitReached, true);
  const pending = await db.collection(COLLECTIONS.permissions).doc("permission_resume").get();
  assert.equal(pending.get("status"), "expired");
  assert.equal(pending.get("dependentHoldReconciliationPending"), true);
  assert.equal(pending.get("proofExpiryLifecycleState"), "pending");

  const resumed = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + 1_000),
    dependencyPageSize: 1,
    maxReconciliationSteps: 50,
  });
  assert.equal(resumed.completedPermissionCount, 1);
  const completed = await db.collection(COLLECTIONS.permissions).doc("permission_resume").get();
  assert.equal(completed.get("dependentHoldReconciliationPending"), false);
  assert.equal(completed.get("proofExpiryLifecycleState"), "completed");
  assert.equal(completed.get("lastDependentHoldReconciliationResult.heldAssetCount"), 1);
  assert.equal(completed.get("lastDependentHoldReconciliationResult.heldDraftCount"), 1);
  assert.equal(completed.get("lastDependentHoldReconciliationResult.heldCalendarCount"), 1);
  await assertHeldDependency("asset_resume");
};

const testWrongProductFailsClosed = async (): Promise<void> => {
  await cleanup();
  await db.collection(COLLECTIONS.system).doc("signaldeskMaintenanceScheduler").set({ pId: "ML" });
  await assert.rejects(
    runSignalDeskMaintenanceScheduler({
      firestore: db,
      now: BASE_NOW,
      runId: "wrong_product_scheduler_state",
    }),
    /SIGNALDESK_MAINTENANCE_STATE_PRODUCT_MISMATCH/,
  );
  await cleanup();
  const foreignPermissionIds = Array.from(
    { length: 12 },
    (_, index) => `permission_foreign_${String(index).padStart(2, "0")}`,
  );
  await Promise.all(foreignPermissionIds.map(id => seedPermission({ id, pId: "ML" })));
  await seedPermission({ id: "permission_valid_after_foreign" });
  await seedUnpublishedDependency({
    assetId: "asset_after_wrong_product",
    permissionId: "permission_valid_after_foreign",
  });
  const result = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromDate(BASE_NOW),
    permissionPageSize: 1,
    maxPermissions: 2,
    maxReconciliationSteps: 50,
  });
  assert.equal(result.failedPermissionCount, 0);
  assert.equal(result.completedPermissionCount, 1, "foreign-product rows starved a valid SignalDesk expiry");
  await assertHeldDependency("asset_after_wrong_product");
  const foreignPermissions = await Promise.all(
    foreignPermissionIds.map(id => db.collection(COLLECTIONS.permissions).doc(id).get()),
  );
  for (const permission of foreignPermissions) {
    assert.equal(permission.get("pId"), "ML");
    assert.equal(permission.get("status"), "active");
    assert.equal(permission.get("dependentHoldReconciliationPending"), undefined);
    assert.equal(permission.get("proofExpiryLifecycleState"), undefined);
  }
  const failureIncidents = await db.collection(COLLECTIONS.incidents)
    .where("incidentType", "==", "proof-permission-lifecycle-failure")
    .get();
  assert.equal(failureIncidents.size, 0, "foreign-product rows were mutated into SignalDesk incidents");
};

const testMalformedPendingDoesNotStarveLaterPermission = async (): Promise<void> => {
  await cleanup();
  const poisonId = "permission_pending_00_poison";
  const validId = "permission_pending_01_valid";
  await seedPermission({ id: poisonId, status: "expired" });
  await seedPermission({ id: validId, status: "expired" });
  await Promise.all([
    db.collection(COLLECTIONS.permissions).doc(poisonId).set({
      dependentHoldReconciliationKind: "proof-permission-expiry-v1",
      dependentHoldReconciliationPending: true,
      dependentHoldReconciliationProgress: { phase: "broken" },
      dependentHoldReconciliationToken: "pending_poison_token",
      proofExpiryLifecycleState: "pending",
    }, { merge: true }),
    db.collection(COLLECTIONS.permissions).doc(validId).set({
      dependentHoldReconciliationKind: "proof-permission-expiry-v1",
      dependentHoldReconciliationPending: true,
      dependentHoldReconciliationProgress: {
        phase: "assets",
        assetCursor: null,
        currentAssetId: null,
        dependencyCursor: null,
        heldAssetCount: 0,
        heldDraftCount: 0,
        heldCalendarCount: 0,
        publicationReviewAssetCount: 0,
        publishedIncidentCount: 0,
        scannedAssetCount: 0,
        scannedDraftCount: 0,
        scannedCalendarCount: 0,
      },
      dependentHoldReconciliationToken: "pending_valid_token",
      proofExpiryLifecycleState: "pending",
    }, { merge: true }),
  ]);
  await seedUnpublishedDependency({ assetId: "asset_after_pending_poison", permissionId: validId });
  const result = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromDate(BASE_NOW),
    permissionPageSize: 1,
    maxPermissions: 10,
    maxReconciliationSteps: 50,
  });
  assert.equal(result.failedPermissionCount, 1);
  assert.equal(result.completedPermissionCount, 1, "malformed pending permission starved a later valid reconciliation");
  assert.equal((await db.collection(COLLECTIONS.permissions).doc(poisonId).get()).get("proofExpiryLifecycleState"), "failed");
  await assertHeldDependency("asset_after_pending_poison");
};

const testMalformedPermissionIdentityAndCursorFailBeforeSkippingDependencies = async (): Promise<void> => {
  await cleanup();
  const identityPermissionId = "permission_shape_00_identity";
  const cursorPermissionId = "permission_shape_01_cursor";
  const validPermissionId = "permission_shape_02_valid";
  await Promise.all([
    seedPermission({ id: identityPermissionId }),
    seedPermission({ id: cursorPermissionId, status: "expired" }),
    seedPermission({ id: validPermissionId }),
    seedUnpublishedDependency({ assetId: "asset_shape_00_identity", permissionId: identityPermissionId }),
    seedUnpublishedDependency({ assetId: "asset_shape_01_cursor", permissionId: cursorPermissionId }),
    seedUnpublishedDependency({ assetId: "asset_shape_02_valid", permissionId: validPermissionId }),
  ]);
  await Promise.all([
    db.collection(COLLECTIONS.permissions).doc(identityPermissionId).set({
      proofPermissionId: "permission_shape_wrong_identity",
    }, { merge: true }),
    db.collection(COLLECTIONS.permissions).doc(cursorPermissionId).set({
      dependentHoldReconciliationKind: "proof-permission-expiry-v1",
      dependentHoldReconciliationPending: true,
      dependentHoldReconciliationProgress: {
        phase: "drafts",
        assetCursor: null,
        currentAssetId: null,
        dependencyCursor: "zzzz_invalid_unpaired_cursor",
        heldAssetCount: 0,
        heldDraftCount: 0,
        heldCalendarCount: 0,
        publicationReviewAssetCount: 0,
        publishedIncidentCount: 0,
        scannedAssetCount: 0,
        scannedDraftCount: 0,
        scannedCalendarCount: 0,
      },
      dependentHoldReconciliationToken: "pending_cursor_poison_token",
      proofExpiryLifecycleState: "pending",
    }, { merge: true }),
  ]);

  const result = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromDate(BASE_NOW),
    dependencyPageSize: 1,
    permissionPageSize: 1,
    maxPermissions: 10,
    maxReconciliationSteps: 100,
  });
  assert.equal(result.failedPermissionCount, 2);
  assert.equal(result.completedPermissionCount, 1);
  assert.equal(
    (await db.collection(COLLECTIONS.assets).doc("asset_shape_00_identity").get()).get("status"),
    "ready",
    "mismatched permission identity mutated a dependency",
  );
  assert.equal(
    (await db.collection(COLLECTIONS.drafts).doc("draft_asset_shape_01_cursor").get()).get("status"),
    "draft",
    "malformed cursor silently skipped and completed the draft dependency",
  );
  await assertHeldDependency("asset_shape_02_valid");
  const failures = await db.collection(COLLECTIONS.incidents)
    .where("incidentType", "==", "proof-permission-lifecycle-failure")
    .get();
  const failureCodeByPermission = new Map(
    failures.docs.map(doc => [doc.get("proofPermissionId"), doc.get("failureCode")]),
  );
  assert.equal(
    failureCodeByPermission.get(identityPermissionId),
    "SIGNALDESK_PROOF_PERMISSION_IDENTITY_MISMATCH",
  );
  assert.equal(
    failureCodeByPermission.get(cursorPermissionId),
    "SIGNALDESK_PROOF_PERMISSION_RECONCILIATION_PROGRESS_INVALID",
  );
};

const testMalformedQueueSummaryFailsWithoutDestructiveNormalization = async (): Promise<void> => {
  await cleanup();
  const permissionId = "permission_malformed_queue_summary";
  const assetId = "asset_malformed_queue_summary";
  await Promise.all([
    seedPermission({ id: permissionId }),
    seedUnpublishedDependency({ assetId, permissionId }),
    db.collection(COLLECTIONS.queues).doc("current").set({
      humanReview: "1",
      pId: "SD",
    }),
  ]);

  const failed = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromDate(BASE_NOW),
    dependencyPageSize: 1,
    maxReconciliationSteps: 50,
  });
  assert.equal(failed.failedPermissionCount, 1);
  assert.equal((await db.collection(COLLECTIONS.queues).doc("current").get()).get("humanReview"), "1");
  assert.equal(
    (await db.collection(COLLECTIONS.permissions).doc(permissionId).get()).get("proofExpiryLifecycleFailureCode"),
    "SIGNALDESK_QUEUE_SUMMARY_SHAPE_INVALID",
  );
  assert.equal(
    (await db.collection(COLLECTIONS.drafts).doc(`draft_${assetId}`).get()).get("status"),
    "draft",
  );

  await db.collection(COLLECTIONS.queues).doc("current").set({ humanReview: 1 }, { merge: true });
  const recovered = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + (5 * 60 * 1000) + 1),
    dependencyPageSize: 1,
    maxReconciliationSteps: 50,
  });
  assert.equal(recovered.retriedPermissionCount, 1);
  assert.equal(recovered.completedPermissionCount, 1);
  assert.equal((await db.collection(COLLECTIONS.queues).doc("current").get()).get("humanReview"), 0);
  await assertHeldDependency(assetId);
};

const testMalformedDependenciesFailVisibleWithoutStarvation = async (): Promise<void> => {
  await cleanup();
  const fixtures = [
    ["permission_dependency_00_draft_identity", "asset_dependency_00_draft_identity"],
    ["permission_dependency_01_draft_lifecycle", "asset_dependency_01_draft_lifecycle"],
    ["permission_dependency_02_calendar_identity", "asset_dependency_02_calendar_identity"],
    ["permission_dependency_03_calendar_publication", "asset_dependency_03_calendar_publication"],
    ["permission_dependency_04_valid", "asset_dependency_04_valid"],
  ] as const;
  for (const [permissionId, assetId] of fixtures) {
    await seedPermission({ id: permissionId });
    await seedUnpublishedDependency({ assetId, permissionId });
  }
  await Promise.all([
    db.collection(COLLECTIONS.drafts).doc("draft_asset_dependency_00_draft_identity").set({
      contentDraftId: "draft_wrong_identity",
    }, { merge: true }),
    db.collection(COLLECTIONS.drafts).doc("draft_asset_dependency_01_draft_lifecycle").set({
      approvalStatus: "pending",
      status: "approved",
    }, { merge: true }),
    db.collection(COLLECTIONS.calendars)
      .doc("content_calendar_draft_asset_dependency_02_calendar_identity")
      .set({ contentCalendarItemId: "calendar_wrong_identity" }, { merge: true }),
    db.collection(COLLECTIONS.calendars)
      .doc("content_calendar_draft_asset_dependency_03_calendar_publication")
      .set({
        publicationUrl: "https://example.test/published/malformed",
        publishedAt: null,
        status: "published",
      }, { merge: true }),
  ]);

  const result = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromDate(BASE_NOW),
    dependencyPageSize: 1,
    permissionPageSize: 1,
    maxPermissions: 10,
    maxReconciliationSteps: 200,
  });
  assert.equal(result.failedPermissionCount, 4);
  assert.equal(result.completedPermissionCount, 1, "malformed dependency rows starved a later valid permission");
  await assertHeldDependency("asset_dependency_04_valid");
  const failures = await db.collection(COLLECTIONS.incidents)
    .where("incidentType", "==", "proof-permission-lifecycle-failure")
    .get();
  const failureCodeByPermission = new Map(
    failures.docs.map(doc => [doc.get("proofPermissionId"), doc.get("failureCode")]),
  );
  assert.equal(failureCodeByPermission.get("permission_dependency_00_draft_identity"), "SIGNALDESK_PROOF_PERMISSION_DRAFT_IDENTITY_MISMATCH");
  assert.equal(failureCodeByPermission.get("permission_dependency_01_draft_lifecycle"), "SIGNALDESK_PROOF_PERMISSION_DRAFT_LIFECYCLE_INVALID");
  assert.equal(failureCodeByPermission.get("permission_dependency_02_calendar_identity"), "SIGNALDESK_PROOF_PERMISSION_CALENDAR_IDENTITY_MISMATCH");
  assert.equal(failureCodeByPermission.get("permission_dependency_03_calendar_publication"), "SIGNALDESK_PROOF_PERMISSION_CALENDAR_PUBLICATION_INVALID");
  for (const [permissionId] of fixtures.slice(0, 4)) {
    assert.equal(
      (await db.collection(COLLECTIONS.permissions).doc(permissionId).get()).get("proofExpiryLifecycleState"),
      "failed",
    );
  }
};

const testMalformedPublicationMarkerFailsVisibleWithoutStarvation = async (): Promise<void> => {
  await cleanup();
  const poisonPermissionId = "permission_marker_00_poison";
  const validPermissionId = "permission_marker_01_valid";
  const poisonAssetId = "asset_marker_00_poison";
  await Promise.all([
    seedPermission({ id: poisonPermissionId }),
    seedPermission({ id: validPermissionId }),
  ]);
  await Promise.all([
    db.collection(COLLECTIONS.assets).doc(poisonAssetId).set({
      contentAssetId: poisonAssetId,
      hasPublishedContent: false,
      lastPublicationUrl: "javascript:malformed-publication-marker",
      pId: "SD",
      proofPermissionId: poisonPermissionId,
      status: "ready",
      updatedAt: Timestamp.fromDate(BASE_NOW),
    }),
    seedUnpublishedDependency({ assetId: "asset_marker_01_valid", permissionId: validPermissionId }),
  ]);

  const result = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromDate(BASE_NOW),
    dependencyPageSize: 1,
    permissionPageSize: 1,
    maxPermissions: 10,
    maxReconciliationSteps: 100,
  });
  assert.equal(result.failedPermissionCount, 1);
  assert.equal(result.completedPermissionCount, 1, "malformed publication marker starved a later valid permission");
  assert.equal((await db.collection(COLLECTIONS.assets).doc(poisonAssetId).get()).get("status"), "ready");
  await assertHeldDependency("asset_marker_01_valid");
  const failure = await db.collection(COLLECTIONS.incidents)
    .where("incidentType", "==", "proof-permission-lifecycle-failure")
    .where("proofPermissionId", "==", poisonPermissionId)
    .get();
  assert.equal(failure.size, 1);
  assert.equal(
    failure.docs[0].get("failureCode"),
    "SIGNALDESK_PROOF_PERMISSION_CONTENT_ASSET_PUBLICATION_MARKER_INVALID",
  );
};

const testForeignCurrentTruthReceivesNoSignalDeskFailureEffects = async (): Promise<void> => {
  await cleanup();
  const permissionId = "permission_foreign_current_truth";
  await seedPermission({ id: permissionId, pId: "ML" });
  await db.collection(COLLECTIONS.control).doc("dashboard").set({
    incidentCount: 7,
    openIncidentCount: 3,
    pId: "SD",
  });
  const permissionRef = db.collection(COLLECTIONS.permissions).doc(permissionId);
  const observed = await permissionRef.get();
  await recordSignalDeskProofPermissionLifecycleFailure({
    error: new Error("SIGNALDESK_PROOF_PERMISSION_PRODUCT_MISMATCH"),
    expectedAuthorityHash: signalDeskProofPermissionLifecycleAuthorityHash(observed.data()),
    firestore: db,
    now: Timestamp.fromDate(BASE_NOW),
    permissionRef,
    phase: "due",
  });
  assert.equal((await db.collection(COLLECTIONS.incidents).get()).size, 0);
  assert.equal((await db.collection(COLLECTIONS.audits).get()).size, 0);
  assert.equal((await db.collection(COLLECTIONS.timelines).get()).size, 0);
  const control = await db.collection(COLLECTIONS.control).doc("dashboard").get();
  assert.equal(control.get("incidentCount"), 7);
  assert.equal(control.get("openIncidentCount"), 3);
  const permission = await db.collection(COLLECTIONS.permissions).doc(permissionId).get();
  assert.equal(permission.get("pId"), "ML");
  assert.equal(permission.get("proofExpiryLifecycleState"), undefined);
};

const testStaleFailureDiagnosticCannotOverwriteNewFounderAuthority = async (): Promise<void> => {
  await cleanup();
  const permissionId = "permission_stale_failure_authority";
  await seedPermission({ id: permissionId });
  await db.collection(COLLECTIONS.control).doc("dashboard").set({
    incidentCount: 4,
    openIncidentCount: 2,
    pId: "SD",
  });
  const permissionRef = db.collection(COLLECTIONS.permissions).doc(permissionId);
  const observed = await permissionRef.get();
  const expectedAuthorityHash = signalDeskProofPermissionLifecycleAuthorityHash(observed.data());
  const founderChangedAt = Timestamp.fromDate(new Date(BASE_NOW.getTime() + 60_000));
  const renewedExpiry = Timestamp.fromDate(new Date(BASE_NOW.getTime() + (7 * 24 * 60 * 60 * 1000)));
  await permissionRef.set({
    expiresAt: renewedExpiry,
    grantedAt: founderChangedAt,
    proofExpiryLifecycleState: null,
    status: "active",
    updatedAt: founderChangedAt,
    updatedBy: "founder-current-authority",
  }, { merge: true });

  const recorded = await recordSignalDeskProofPermissionLifecycleFailure({
    error: new Error("SIGNALDESK_PROOF_PERMISSION_CONTENT_ASSET_PUBLICATION_MARKER_INVALID"),
    expectedAuthorityHash,
    firestore: db,
    now: Timestamp.fromDate(new Date(BASE_NOW.getTime() + 120_000)),
    permissionRef,
    phase: "due",
  });

  assert.equal(recorded, false);
  const current = await permissionRef.get();
  assert.equal(current.get("status"), "active");
  assert.equal(current.get("expiresAt").toMillis(), renewedExpiry.toMillis());
  assert.equal(current.get("updatedBy"), "founder-current-authority");
  assert.equal(current.get("proofExpiryLifecycleFailureCode"), undefined);
  assert.equal((await db.collection(COLLECTIONS.incidents).get()).size, 0);
  assert.equal((await db.collection(COLLECTIONS.audits).get()).size, 0);
  assert.equal((await db.collection(COLLECTIONS.timelines).get()).size, 0);
  const control = await db.collection(COLLECTIONS.control).doc("dashboard").get();
  assert.equal(control.get("incidentCount"), 4);
  assert.equal(control.get("openIncidentCount"), 2);
};

const testFailureDiagnosticCollisionDoesNotStarveLaterPermission = async (): Promise<void> => {
  await cleanup();
  const poisonPermissionId = "permission_diagnostic_00_poison";
  const validPermissionId = "permission_diagnostic_01_valid";
  const poisonAssetId = "asset_diagnostic_00_poison";
  await Promise.all([
    seedPermission({ id: poisonPermissionId }),
    seedPermission({ id: validPermissionId }),
  ]);
  await Promise.all([
    db.collection(COLLECTIONS.assets).doc(poisonAssetId).set({
      contentAssetId: poisonAssetId,
      hasPublishedContent: "malformed",
      pId: "SD",
      proofPermissionId: poisonPermissionId,
      status: "ready",
      updatedAt: Timestamp.fromDate(BASE_NOW),
    }),
    seedUnpublishedDependency({ assetId: "asset_diagnostic_01_valid", permissionId: validPermissionId }),
  ]);
  const failureIncidentId = `proof_lifecycle_failure_${stableHash(poisonPermissionId).slice(0, 40)}`;
  await db.collection(COLLECTIONS.incidents).doc(failureIncidentId).set({
    incidentId: failureIncidentId,
    incidentType: "proof-permission-lifecycle-failure",
    pId: "SD",
    proofPermissionId: poisonPermissionId,
    severity: "low",
    status: "open",
  });
  const collisionBefore = (await db.collection(COLLECTIONS.incidents).doc(failureIncidentId).get()).data();

  const first = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromDate(BASE_NOW),
    dependencyPageSize: 1,
    permissionPageSize: 1,
    maxPermissions: 1,
    maxReconciliationSteps: 100,
  });
  assert.equal(first.failedPermissionCount, 1);
  assert.equal(first.failureDiagnosticErrorCount, 1);
  assert.equal(first.completedPermissionCount, 0);
  const quarantined = await db.collection(COLLECTIONS.permissions).doc(poisonPermissionId).get();
  assert.equal(quarantined.get("status"), "expired");
  assert.equal(quarantined.get("proofExpiryLifecycleState"), "failed");
  assert.equal(
    quarantined.get("proofExpiryLifecycleFailureCode"),
    "SIGNALDESK_PROOF_PERMISSION_CONTENT_ASSET_PUBLICATION_MARKER_INVALID",
  );
  assert.equal(quarantined.get("proofExpiryLifecycleRetryCount"), 1);
  assert.equal(
    quarantined.get("proofExpiryLifecycleRetryAt").toMillis(),
    BASE_NOW.getTime() + (5 * 60 * 1000),
  );
  assert.deepEqual(
    (await db.collection(COLLECTIONS.incidents).doc(failureIncidentId).get()).data(),
    collisionBefore,
    "permission-only quarantine mutated the colliding diagnostic document",
  );

  const second = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + 1_000),
    dependencyPageSize: 1,
    permissionPageSize: 1,
    maxPermissions: 1,
    maxReconciliationSteps: 100,
  });
  assert.equal(second.completedPermissionCount, 1, "quarantined diagnostic collision kept starving a later permission");
  await assertHeldDependency("asset_diagnostic_01_valid");
};

const testForeignReconciliationConflictDoesNotStarveLaterExpiry = async (): Promise<void> => {
  await cleanup();
  const conflictPermissionId = "permission_due_00_foreign_reconciliation";
  const validPermissionId = "permission_due_01_valid";
  await Promise.all([
    seedPermission({ id: conflictPermissionId }),
    seedPermission({ id: validPermissionId }),
    seedUnpublishedDependency({
      assetId: "asset_due_after_foreign_reconciliation",
      permissionId: validPermissionId,
    }),
  ]);
  const conflictRef = db.collection(COLLECTIONS.permissions).doc(conflictPermissionId);
  await conflictRef.set({
    dependentHoldReconciliationKind: "content-authority-v1",
    dependentHoldReconciliationPending: true,
    dependentHoldReconciliationProgress: { phase: "assets" },
    dependentHoldReconciliationToken: "foreign_content_authority_token",
  }, { merge: true });

  const first = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromDate(BASE_NOW),
    permissionPageSize: 1,
    maxPermissions: 1,
    maxReconciliationSteps: 50,
  });
  assert.equal(first.failedPermissionCount, 1);
  assert.equal(first.completedPermissionCount, 0);
  const isolatedConflict = await conflictRef.get();
  assert.equal(isolatedConflict.get("status"), "hold");
  assert.equal(isolatedConflict.get("proofExpiryLifecycleState"), "failed");
  assert.equal(
    isolatedConflict.get("proofExpiryLifecycleFailureCode"),
    "SIGNALDESK_PROOF_PERMISSION_RECONCILIATION_CONFLICT",
  );
  assert.equal(isolatedConflict.get("dependentHoldReconciliationKind"), "content-authority-v1");
  assert.equal(isolatedConflict.get("dependentHoldReconciliationToken"), "foreign_content_authority_token");
  assert.deepEqual(isolatedConflict.get("dependentHoldReconciliationProgress"), { phase: "assets" });

  const second = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + 1_000),
    permissionPageSize: 1,
    maxPermissions: 1,
    maxReconciliationSteps: 50,
  });
  assert.equal(second.completedPermissionCount, 1, "an isolated foreign reconciliation kept starving the next due permission");
  await assertHeldDependency("asset_due_after_foreign_reconciliation");

  const firstRetryAt = BASE_NOW.getTime() + (5 * 60 * 1000);
  await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromMillis(firstRetryAt),
    permissionPageSize: 1,
    maxPermissions: 1,
    maxReconciliationSteps: 50,
  });
  const backedOffConflict = await conflictRef.get();
  assert.equal(backedOffConflict.get("status"), "hold");
  assert.equal(backedOffConflict.get("proofExpiryLifecycleState"), "failed");
  assert.equal(backedOffConflict.get("proofExpiryLifecycleRetryCount"), 2);
  assert.equal(backedOffConflict.get("proofExpiryLifecycleRetryAt").toMillis(), firstRetryAt + (10 * 60 * 1000));
  assert.equal(backedOffConflict.get("dependentHoldReconciliationKind"), "content-authority-v1");
};

const testAcknowledgedFailureIncidentIsNotCountedOpenAgain = async (): Promise<void> => {
  await cleanup();
  const permissionId = "permission_acknowledged_failure";
  await seedPermission({ id: permissionId });
  const permissionRef = db.collection(COLLECTIONS.permissions).doc(permissionId);
  let observed = await permissionRef.get();
  const firstRecorded = await recordSignalDeskProofPermissionLifecycleFailure({
    error: new Error("SIGNALDESK_PROOF_PERMISSION_EXPIRY_INVALID"),
    expectedAuthorityHash: signalDeskProofPermissionLifecycleAuthorityHash(observed.data()),
    firestore: db,
    now: Timestamp.fromDate(BASE_NOW),
    permissionRef,
    phase: "due",
  });
  assert.equal(firstRecorded, true);
  const incident = await db.collection(COLLECTIONS.incidents)
    .where("incidentType", "==", "proof-permission-lifecycle-failure")
    .where("proofPermissionId", "==", permissionId)
    .get();
  assert.equal(incident.size, 1);
  await incident.docs[0].ref.set({ status: "acknowledged" }, { merge: true });
  observed = await permissionRef.get();
  const secondRecorded = await recordSignalDeskProofPermissionLifecycleFailure({
    error: new Error("SIGNALDESK_PROOF_PERMISSION_EXPIRY_INVALID"),
    expectedAuthorityHash: signalDeskProofPermissionLifecycleAuthorityHash(observed.data()),
    firestore: db,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + 1_000),
    permissionRef,
    phase: "due",
  });
  assert.equal(secondRecorded, true);
  assert.equal((await incident.docs[0].ref.get()).get("status"), "acknowledged");
  const control = await db.collection(COLLECTIONS.control).doc("dashboard").get();
  assert.equal(control.get("incidentCount"), 1);
  assert.equal(control.get("openIncidentCount"), 1, "acknowledged unresolved incident was counted open twice");
};

const testMalformedControlSummaryFailsClosed = async (): Promise<void> => {
  await cleanup();
  const permissionId = "permission_malformed_control";
  await seedPermission({ id: permissionId });
  await db.collection(COLLECTIONS.control).doc("dashboard").set({
    incidentCount: "corrupt",
    openIncidentCount: 0,
    pId: "SD",
  });
  const permissionRef = db.collection(COLLECTIONS.permissions).doc(permissionId);
  const observed = await permissionRef.get();
  await assert.rejects(
    recordSignalDeskProofPermissionLifecycleFailure({
      error: new Error("SIGNALDESK_PROOF_PERMISSION_EXPIRY_INVALID"),
      expectedAuthorityHash: signalDeskProofPermissionLifecycleAuthorityHash(observed.data()),
      firestore: db,
      now: Timestamp.fromDate(BASE_NOW),
      permissionRef,
      phase: "due",
    }),
    /SIGNALDESK_CONTROL_ROOM_SHAPE_INVALID/,
  );
  const unchanged = await permissionRef.get();
  assert.equal(unchanged.get("status"), "active");
  assert.equal(unchanged.get("proofExpiryLifecycleState"), undefined);
  assert.equal((await db.collection(COLLECTIONS.incidents).get()).size, 0);
  assert.equal((await db.collection(COLLECTIONS.audits).get()).size, 0);
  assert.equal((await db.collection(COLLECTIONS.timelines).get()).size, 0);
};

const testSchedulerReportsIsolatedFailuresAsActivity = async (): Promise<void> => {
  await cleanup();
  const permissionId = "permission_scheduler_activity_failure";
  await seedPermission({ id: permissionId, status: "expired" });
  await db.collection(COLLECTIONS.permissions).doc(permissionId).set({
    dependentHoldReconciliationKind: "proof-permission-expiry-v1",
    dependentHoldReconciliationPending: true,
    dependentHoldReconciliationProgress: { phase: "broken" },
    dependentHoldReconciliationToken: "scheduler_activity_failure_token",
    proofExpiryLifecycleState: "pending",
  }, { merge: true });

  const scheduled = await runSignalDeskMaintenanceScheduler({
    firestore: db,
    now: BASE_NOW,
    runId: "scheduler_activity_failure",
  });
  assert.equal(scheduled.status, "success");
  assert.equal(scheduled.tasks[0].status, "success");
  assert.equal(scheduled.tasks[0].activity, true, "isolated lifecycle failure was hidden as no activity");
  assert.equal(scheduled.tasks[0].details && "failedPermissionCount" in scheduled.tasks[0].details
    ? scheduled.tasks[0].details.failedPermissionCount
    : null, 1);
  const schedulerState = await db.collection(COLLECTIONS.system).doc("signaldeskMaintenanceScheduler").get();
  assert.equal(schedulerState.get("tasks.proof_permission_lifecycle.lastStatus"), "success");
  assert.equal(
    schedulerState.get("tasks.proof_permission_lifecycle.lastDetails.failedPermissionCount"),
    1,
  );
};

const testSchedulerFailurePreservesPriorCompletion = async (): Promise<void> => {
  await cleanup();
  const priorCompletedAt = Timestamp.fromMillis(BASE_NOW.getTime() - (2 * 60 * 60 * 1000));
  const priorCompletedBucket = Math.floor(priorCompletedAt.toMillis() / (60 * 60 * 1000));
  await db.collection(COLLECTIONS.system).doc("signaldeskMaintenanceScheduler").set({
    pId: "SD",
    tasks: {
      proof_permission_lifecycle: {
        lastCompletedAt: priorCompletedAt,
        lastCompletedBucket: priorCompletedBucket,
        lastRunId: "prior_success",
        lastStatus: "success",
      },
    },
  });
  await assert.rejects(
    runSignalDeskMaintenanceScheduler({
      firestore: db,
      lifecycleRunner: async () => {
        throw new Error("SIGNALDESK_TEST_LIFECYCLE_FATAL");
      },
      now: BASE_NOW,
      runId: "scheduler_outer_failure",
    }),
    /SIGNALDESK_TEST_LIFECYCLE_FATAL/,
  );
  const schedulerState = await db.collection(COLLECTIONS.system).doc("signaldeskMaintenanceScheduler").get();
  assert.equal(
    schedulerState.get("tasks.proof_permission_lifecycle.lastCompletedAt").toMillis(),
    priorCompletedAt.toMillis(),
  );
  assert.equal(
    schedulerState.get("tasks.proof_permission_lifecycle.lastCompletedBucket"),
    priorCompletedBucket,
  );
  assert.equal(schedulerState.get("tasks.proof_permission_lifecycle.lastStatus"), "failed");
  assert.equal(
    schedulerState.get("tasks.proof_permission_lifecycle.lastFailureCode"),
    "SIGNALDESK_PROOF_PERMISSION_LIFECYCLE_FAILED",
  );
  assert.equal(schedulerState.get("tasks.proof_permission_lifecycle.lastFailedRunId"), "scheduler_outer_failure");
  assert(schedulerState.get("tasks.proof_permission_lifecycle.lastFailedAt") instanceof Timestamp);
};

const testSchedulerOutcomeCannotOverwriteLostLeaseOrForeignState = async (): Promise<void> => {
  await cleanup();
  const lockRef = db.collection(COLLECTIONS.system)
    .doc("signaldeskMaintenanceTaskLock_proof_permission_lifecycle");
  await assert.rejects(
    runSignalDeskMaintenanceScheduler({
      firestore: db,
      lifecycleRunner: async () => {
        await lockRef.set({
          leaseOwner: "replacement_scheduler_owner",
          leaseRunId: "replacement_scheduler_run",
        }, { merge: true });
        return {
          completedPermissionCount: 0,
          conflictedPermissionCount: 0,
          failedPermissionCount: 0,
          failureDiagnosticErrorCount: 0,
          heldAssetCount: 0,
          heldCalendarCount: 0,
          heldDraftCount: 0,
          materializedPermissionCount: 0,
          pendingPermissionCount: 0,
          publicationReviewAssetCount: 0,
          publishedIncidentCount: 0,
          retriedPermissionCount: 0,
          scannedAssetCount: 0,
          scannedCalendarCount: 0,
          scannedDraftCount: 0,
          scannedDuePermissionCount: 0,
          scannedPendingPermissionCount: 0,
          stepLimitReached: false,
        };
      },
      now: BASE_NOW,
      runId: "scheduler_stale_lease_outcome",
    }),
    /SIGNALDESK_MAINTENANCE_LEASE_LOST/,
  );
  const staleState = await db.collection(COLLECTIONS.system).doc("signaldeskMaintenanceScheduler").get();
  assert.equal(staleState.get("tasks.proof_permission_lifecycle.lastStatus"), "running");
  assert.equal(staleState.get("tasks.proof_permission_lifecycle.lastCompletedAt"), undefined);
  assert.equal((await lockRef.get()).get("leaseOwner"), "replacement_scheduler_owner");

  await cleanup();
  const stateRef = db.collection(COLLECTIONS.system).doc("signaldeskMaintenanceScheduler");
  await assert.rejects(
    runSignalDeskMaintenanceScheduler({
      firestore: db,
      lifecycleRunner: async () => {
        await stateRef.set({ pId: "ML" }, { merge: true });
        return {
          completedPermissionCount: 0,
          conflictedPermissionCount: 0,
          failedPermissionCount: 0,
          failureDiagnosticErrorCount: 0,
          heldAssetCount: 0,
          heldCalendarCount: 0,
          heldDraftCount: 0,
          materializedPermissionCount: 0,
          pendingPermissionCount: 0,
          publicationReviewAssetCount: 0,
          publishedIncidentCount: 0,
          retriedPermissionCount: 0,
          scannedAssetCount: 0,
          scannedCalendarCount: 0,
          scannedDraftCount: 0,
          scannedDuePermissionCount: 0,
          scannedPendingPermissionCount: 0,
          stepLimitReached: false,
        };
      },
      now: BASE_NOW,
      runId: "scheduler_foreign_state_outcome",
    }),
    /SIGNALDESK_MAINTENANCE_STATE_PRODUCT_MISMATCH/,
  );
  const foreignState = await stateRef.get();
  assert.equal(foreignState.get("pId"), "ML");
  assert.equal(foreignState.get("tasks.proof_permission_lifecycle.lastCompletedAt"), undefined);
};

const testPagination = async (): Promise<void> => {
  await cleanup();
  const permissionId = "permission_pagination";
  await seedPermission({ id: permissionId });
  await db.collection(COLLECTIONS.queues).doc("current").set({ pId: "SD", humanReview: 5 });
  for (let index = 0; index < 5; index += 1) {
    await seedUnpublishedDependency({
      assetId: `asset_page_${index}`,
      permissionId,
    });
  }

  const result = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromDate(BASE_NOW),
    dependencyPageSize: 2,
    permissionPageSize: 2,
    maxReconciliationSteps: 100,
  });
  assert.equal(result.completedPermissionCount, 1);
  assert.equal(result.heldAssetCount, 5);
  assert.equal(result.heldDraftCount, 5);
  assert.equal(result.heldCalendarCount, 5);
  assert.equal(result.scannedAssetCount, 5);
  assert.equal(result.scannedDraftCount, 5);
  assert.equal(result.scannedCalendarCount, 5);
  for (let index = 0; index < 5; index += 1) {
    await assertHeldDependency(`asset_page_${index}`);
  }
  assert.equal((await db.collection(COLLECTIONS.queues).doc("current").get()).get("humanReview"), 0);
};

const seedPublishedDependency = async (params: {
  assetId: string;
  dependencyPublishedAt?: Date;
  permissionId: string;
  publishedAt: Date;
}): Promise<{ calendarId: string; draftId: string; publicationUrl: string }> => {
  const draftId = `draft_${params.assetId}`;
  const calendarId = `content_calendar_${draftId}`;
  const publicationUrl = `https://example.test/published/${params.assetId}`;
  const dependencyPublishedAt = params.dependencyPublishedAt || params.publishedAt;
  const scheduledFor = Timestamp.fromMillis(dependencyPublishedAt.getTime() - 60 * 60 * 1000);
  await Promise.all([
    db.collection(COLLECTIONS.assets).doc(params.assetId).set({
      contentAssetId: params.assetId,
      pId: "SD",
      proofPermissionId: params.permissionId,
      status: "distributed",
      hasPublishedContent: true,
      publicationStateVersion: 1,
      lastPublishedContentDraftId: draftId,
      lastPublishedAt: Timestamp.fromDate(params.publishedAt),
      lastPublicationUrl: publicationUrl,
      updatedAt: Timestamp.fromDate(params.publishedAt),
    }),
    db.collection(COLLECTIONS.drafts).doc(draftId).set({
      contentDraftId: draftId,
      pId: "SD",
      contentAssetId: params.assetId,
      approvalStatus: "approved",
      status: "published",
      channel: "linkedin",
      scheduledFor,
      updatedAt: Timestamp.fromDate(dependencyPublishedAt),
    }),
    db.collection(COLLECTIONS.calendars).doc(calendarId).set({
      contentCalendarItemId: calendarId,
      contentDraftId: draftId,
      pId: "SD",
      contentAssetId: params.assetId,
      status: "published",
      channel: "linkedin",
      publicationUrl,
      publishedAt: Timestamp.fromDate(dependencyPublishedAt),
      scheduledFor,
      updatedAt: Timestamp.fromDate(dependencyPublishedAt),
    }),
  ]);
  return { calendarId, draftId, publicationUrl };
};

const testPublishedIncidentIdempotencyAndGrantCycles = async (): Promise<void> => {
  await cleanup();
  const permissionId = "permission_published";
  const assetId = "asset_published";
  await seedPermission({ id: permissionId });
  const publication = await seedPublishedDependency({
    assetId,
    dependencyPublishedAt: new Date(BASE_NOW.getTime() - 3 * 60 * 60 * 1000),
    permissionId,
    publishedAt: new Date(BASE_NOW.getTime() - 60 * 60 * 1000),
  });

  const first = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromDate(BASE_NOW),
    dependencyPageSize: 1,
    maxReconciliationSteps: 50,
  });
  assert.equal(first.completedPermissionCount, 1);
  assert.equal(first.publishedIncidentCount, 1);
  const incidentId = signalDeskProofPublicationIncidentId(permissionId, assetId);
  const firstIncident = await db.collection(COLLECTIONS.incidents).doc(incidentId).get();
  assert.equal(firstIncident.get("status"), "open");
  assert.equal(firstIncident.get("severity"), "high");
  assert.equal(firstIncident.get("publicationUrl"), publication.publicationUrl);
  assert.equal(firstIncident.get("publicationDraftId"), publication.draftId);
  assert.equal(firstIncident.get("publicationEvidenceSource"), "asset-marker", "older dependency evidence downgraded the newer asset marker");
  assert.equal(firstIncident.get("publishedAt"), new Date(BASE_NOW.getTime() - 60 * 60 * 1000).toISOString());
  const firstToken = firstIncident.get("proofExpiryLifecycleToken");
  assert.equal(typeof firstToken, "string");
  const firstControl = await db.collection(COLLECTIONS.control).doc("dashboard").get();
  assert.equal(firstControl.get("incidentCount"), 1);
  assert.equal(firstControl.get("openIncidentCount"), 1);
  assert.equal((await db.collection(COLLECTIONS.assets).doc(assetId).get()).get("status"), "distributed");
  assert.equal((await db.collection(COLLECTIONS.drafts).doc(publication.draftId).get()).get("status"), "published");
  assert.equal((await db.collection(COLLECTIONS.calendars).doc(publication.calendarId).get()).get("status"), "published");

  await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + 1_000),
  });
  assert.equal((await db.collection(COLLECTIONS.control).doc("dashboard").get()).get("incidentCount"), 1);
  assert.equal((await db.collection(COLLECTIONS.control).doc("dashboard").get()).get("openIncidentCount"), 1);

  const secondNow = new Date(BASE_NOW.getTime() + 4 * 60 * 60 * 1000);
  await Promise.all([
    db.collection(COLLECTIONS.permissions).doc(permissionId).set({
      status: "active",
      grantedAt: Timestamp.fromMillis(BASE_NOW.getTime() + 60 * 60 * 1000),
      expiresAt: Timestamp.fromMillis(BASE_NOW.getTime() + 3 * 60 * 60 * 1000),
      updatedAt: Timestamp.fromMillis(BASE_NOW.getTime() + 60 * 60 * 1000),
    }, { merge: true }),
    db.collection(COLLECTIONS.incidents).doc(incidentId).set({ status: "resolved" }, { merge: true }),
    db.collection(COLLECTIONS.assets).doc(assetId).set({ publicationReviewRequired: false }, { merge: true }),
    db.collection(COLLECTIONS.control).doc("dashboard").set({ openIncidentCount: 0 }, { merge: true }),
  ]);

  const second = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromDate(secondNow),
    dependencyPageSize: 1,
    maxReconciliationSteps: 50,
  });
  assert.equal(second.publishedIncidentCount, 1);
  const reopenedIncident = await db.collection(COLLECTIONS.incidents).doc(incidentId).get();
  assert.equal(reopenedIncident.get("status"), "open");
  assert.notEqual(reopenedIncident.get("proofExpiryLifecycleToken"), firstToken);
  const reopenedControl = await db.collection(COLLECTIONS.control).doc("dashboard").get();
  assert.equal(reopenedControl.get("incidentCount"), 1, "grant-cycle reopen must not create a second incident");
  assert.equal(reopenedControl.get("openIncidentCount"), 1, "grant-cycle reopen increments open count once");

  await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromMillis(secondNow.getTime() + 1_000),
  });
  assert.equal((await db.collection(COLLECTIONS.control).doc("dashboard").get()).get("openIncidentCount"), 1);
};

const testAcknowledgedPublicationIncidentRetainsOneOpenCountAcrossGrantCycle = async (): Promise<void> => {
  await cleanup();
  const permissionId = "permission_published_acknowledged";
  const assetId = "asset_published_acknowledged";
  await seedPermission({ id: permissionId });
  await seedPublishedDependency({
    assetId,
    dependencyPublishedAt: new Date(BASE_NOW.getTime() - 3 * 60 * 60 * 1000),
    permissionId,
    publishedAt: new Date(BASE_NOW.getTime() - 60 * 60 * 1000),
  });
  await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromDate(BASE_NOW),
    dependencyPageSize: 1,
    maxReconciliationSteps: 50,
  });
  const incidentId = signalDeskProofPublicationIncidentId(permissionId, assetId);
  const incidentRef = db.collection(COLLECTIONS.incidents).doc(incidentId);
  const firstIncident = await incidentRef.get();
  const firstToken = firstIncident.get("proofExpiryLifecycleToken");
  assert.equal(firstIncident.get("status"), "open");
  assert.equal((await db.collection(COLLECTIONS.control).doc("dashboard").get()).get("openIncidentCount"), 1);

  const secondNow = new Date(BASE_NOW.getTime() + 4 * 60 * 60 * 1000);
  await Promise.all([
    db.collection(COLLECTIONS.permissions).doc(permissionId).set({
      status: "active",
      grantedAt: Timestamp.fromMillis(BASE_NOW.getTime() + 60 * 60 * 1000),
      expiresAt: Timestamp.fromMillis(BASE_NOW.getTime() + 3 * 60 * 60 * 1000),
      updatedAt: Timestamp.fromMillis(BASE_NOW.getTime() + 60 * 60 * 1000),
    }, { merge: true }),
    incidentRef.set({ status: "acknowledged" }, { merge: true }),
    db.collection(COLLECTIONS.assets).doc(assetId).set({ publicationReviewRequired: false }, { merge: true }),
  ]);

  const second = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromDate(secondNow),
    dependencyPageSize: 1,
    maxReconciliationSteps: 50,
  });
  assert.equal(second.completedPermissionCount, 1);
  assert.equal(second.publishedIncidentCount, 0, "an already unresolved acknowledged incident was counted as newly opened");
  const acknowledged = await incidentRef.get();
  assert.equal(acknowledged.get("status"), "acknowledged");
  assert.notEqual(acknowledged.get("proofExpiryLifecycleToken"), firstToken);
  const control = await db.collection(COLLECTIONS.control).doc("dashboard").get();
  assert.equal(control.get("incidentCount"), 1);
  assert.equal(control.get("openIncidentCount"), 1, "acknowledged publication incident was counted open twice");
  assert.equal((await db.collection(COLLECTIONS.assets).doc(assetId).get()).get("publicationReviewRequired"), true);
};

const testNewerSparseMarkerDoesNotMixOlderDependencyEvidence = async (): Promise<void> => {
  await cleanup();
  const permissionId = "permission_sparse_marker";
  const assetId = "asset_sparse_marker";
  const markerPublishedAt = new Date(BASE_NOW.getTime() - 60 * 60 * 1000);
  await seedPermission({ id: permissionId });
  await seedPublishedDependency({
    assetId,
    dependencyPublishedAt: new Date(BASE_NOW.getTime() - 3 * 60 * 60 * 1000),
    permissionId,
    publishedAt: markerPublishedAt,
  });
  await db.collection(COLLECTIONS.assets).doc(assetId).set({
    lastPublishedContentDraftId: null,
    lastPublicationUrl: null,
  }, { merge: true });

  const result = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromDate(BASE_NOW),
    dependencyPageSize: 1,
    maxReconciliationSteps: 50,
  });
  assert.equal(result.publishedIncidentCount, 1);
  const incident = await db.collection(COLLECTIONS.incidents)
    .doc(signalDeskProofPublicationIncidentId(permissionId, assetId))
    .get();
  assert.equal(incident.get("publicationEvidenceSource"), "asset-marker");
  assert.equal(incident.get("publishedAt"), markerPublishedAt.toISOString());
  assert.equal(incident.get("publicationDraftId"), null, "older draft identity leaked into newer sparse marker evidence");
  assert.equal(incident.get("publicationUrl"), null, "older publication URL leaked into newer sparse marker evidence");
};

const testExistingIncidentShapeFailsClosed = async (): Promise<void> => {
  await cleanup();
  const permissionId = "permission_incident_shape";
  const assetId = "asset_incident_shape";
  await seedPermission({ id: permissionId });
  await seedPublishedDependency({
    assetId,
    permissionId,
    publishedAt: new Date(BASE_NOW.getTime() - 2 * 60 * 60 * 1000),
  });
  const incidentId = signalDeskProofPublicationIncidentId(permissionId, assetId);
  await db.collection(COLLECTIONS.incidents).doc(incidentId).set({
    incidentId,
    incidentType: "proof-publication-removal-review",
    pId: "SD",
    proofPermissionId: permissionId,
    contentAssetId: assetId,
    severity: "low",
    status: "open",
  });
  await db.collection(COLLECTIONS.control).doc("dashboard").set({
    pId: "SD",
    incidentCount: 1,
    openIncidentCount: 1,
  });

  const firstFailure = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromDate(BASE_NOW),
    dependencyPageSize: 1,
    maxReconciliationSteps: 50,
  });
  assert.equal(firstFailure.failedPermissionCount, 1);
  assert.equal((await db.collection(COLLECTIONS.permissions).doc(permissionId).get()).get("proofExpiryLifecycleState"), "failed");
  assert.equal((await db.collection(COLLECTIONS.incidents).doc(incidentId).get()).get("severity"), "low", "collision document was overwritten");
  const failureIncident = await db.collection(COLLECTIONS.incidents)
    .where("incidentType", "==", "proof-permission-lifecycle-failure")
    .get();
  assert.equal(failureIncident.size, 1);
  assert.equal(failureIncident.docs[0].get("failureCode"), "SIGNALDESK_PROOF_PERMISSION_INCIDENT_SHAPE_INVALID");
  const firstControl = await db.collection(COLLECTIONS.control).doc("dashboard").get();
  assert.equal(firstControl.get("incidentCount"), 2);
  assert.equal(firstControl.get("openIncidentCount"), 2);
  const failedPermission = await db.collection(COLLECTIONS.permissions).doc(permissionId).get();
  assert.equal(failedPermission.get("proofExpiryLifecycleRetryCount"), 1);
  assert.equal(
    failedPermission.get("proofExpiryLifecycleRetryAt").toMillis(),
    BASE_NOW.getTime() + (5 * 60 * 1000),
  );

  await Promise.all([
    failureIncident.docs[0].ref.set({ status: "resolved" }, { merge: true }),
    db.collection(COLLECTIONS.incidents).doc(incidentId).set({ status: "resolved" }, { merge: true }),
    db.collection(COLLECTIONS.control).doc("dashboard").set({ openIncidentCount: 0 }, { merge: true }),
  ]);
  const secondAttemptAt = BASE_NOW.getTime() + (5 * 60 * 1000) + 1_000;
  const secondFailure = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromMillis(secondAttemptAt),
    dependencyPageSize: 1,
    maxReconciliationSteps: 50,
  });
  assert.equal(secondFailure.retriedPermissionCount, 1);
  assert.equal(secondFailure.failedPermissionCount, 1);
  const secondControl = await db.collection(COLLECTIONS.control).doc("dashboard").get();
  assert.equal(secondControl.get("incidentCount"), 2, "repeated collision failure duplicated the failure incident");
  assert.equal(secondControl.get("openIncidentCount"), 1, "resolved lifecycle failure was not reopened exactly once");
  const failedAgain = await db.collection(COLLECTIONS.permissions).doc(permissionId).get();
  assert.equal(failedAgain.get("proofExpiryLifecycleRetryCount"), 2);
  assert.equal(
    failedAgain.get("proofExpiryLifecycleRetryAt").toMillis(),
    secondAttemptAt + (10 * 60 * 1000),
  );

  await Promise.all([
    failureIncident.docs[0].ref.set({ status: "resolved" }, { merge: true }),
    db.collection(COLLECTIONS.incidents).doc(incidentId).set({ severity: "high" }, { merge: true }),
    db.collection(COLLECTIONS.control).doc("dashboard").set({ openIncidentCount: 0 }, { merge: true }),
  ]);
  const recoveryAt = secondAttemptAt + (10 * 60 * 1000) + 1_000;
  const recovered = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromMillis(recoveryAt),
    dependencyPageSize: 1,
    maxReconciliationSteps: 50,
  });
  assert.equal(recovered.retriedPermissionCount, 1);
  assert.equal(recovered.completedPermissionCount, 1);
  assert.equal(recovered.publicationReviewAssetCount, 1);
  assert.equal(recovered.publishedIncidentCount, 1);
  const recoveredPermission = await db.collection(COLLECTIONS.permissions).doc(permissionId).get();
  assert.equal(recoveredPermission.get("proofExpiryLifecycleState"), "completed");
  assert.equal(recoveredPermission.get("proofExpiryLifecycleRetryAt"), null);
  assert.equal(recoveredPermission.get("proofExpiryLifecycleRetryCount"), 0);
  assert.equal(recoveredPermission.get("proofExpiryLifecycleFailureCode"), null);
  const finalControl = await db.collection(COLLECTIONS.control).doc("dashboard").get();
  assert.equal(finalControl.get("incidentCount"), 2);
  assert.equal(finalControl.get("openIncidentCount"), 1);

  const renewedGrantAt = recoveryAt + (60 * 1000);
  const renewedExpiryAt = recoveryAt + (2 * 60 * 1000);
  await Promise.all([
    db.collection(COLLECTIONS.permissions).doc(permissionId).set({
      expiresAt: Timestamp.fromMillis(renewedExpiryAt),
      grantedAt: Timestamp.fromMillis(renewedGrantAt),
      status: "active",
      updatedAt: Timestamp.fromMillis(renewedGrantAt),
    }, { merge: true }),
    db.collection(COLLECTIONS.incidents).doc(incidentId).set({ status: "resolved" }, { merge: true }),
    db.collection(COLLECTIONS.control).doc("dashboard").set({ openIncidentCount: 0 }, { merge: true }),
  ]);
  const renewed = await runSignalDeskProofPermissionLifecycle({
    firestore: db,
    now: Timestamp.fromMillis(renewedExpiryAt + 1_000),
    dependencyPageSize: 1,
    maxReconciliationSteps: 50,
  });
  assert.equal(renewed.completedPermissionCount, 1);
  assert.equal(renewed.publishedIncidentCount, 1);
  const renewedPermission = await db.collection(COLLECTIONS.permissions).doc(permissionId).get();
  assert.equal(renewedPermission.get("proofExpiryLifecycleState"), "completed");
  assert.equal(renewedPermission.get("proofExpiryLifecycleRetryAt"), null);
  assert.equal(renewedPermission.get("proofExpiryLifecycleRetryCount"), 0);
  assert.equal(renewedPermission.get("proofExpiryLifecycleFailureCode"), null);
  assert.notEqual(
    renewedPermission.get("lastDependentHoldReconciliationToken"),
    recoveredPermission.get("lastDependentHoldReconciliationToken"),
    "renewed grant reused the prior expiry token",
  );
};

async function run(): Promise<void> {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("FIRESTORE_EMULATOR_HOST is required");
  }
  await testOverlapAndDuplicateSchedulerRuns();
  await testCrashResume();
  await testWrongProductFailsClosed();
  await testMalformedPendingDoesNotStarveLaterPermission();
  await testMalformedPermissionIdentityAndCursorFailBeforeSkippingDependencies();
  await testMalformedQueueSummaryFailsWithoutDestructiveNormalization();
  await testMalformedDependenciesFailVisibleWithoutStarvation();
  await testMalformedPublicationMarkerFailsVisibleWithoutStarvation();
  await testForeignCurrentTruthReceivesNoSignalDeskFailureEffects();
  await testStaleFailureDiagnosticCannotOverwriteNewFounderAuthority();
  await testFailureDiagnosticCollisionDoesNotStarveLaterPermission();
  await testForeignReconciliationConflictDoesNotStarveLaterExpiry();
  await testAcknowledgedFailureIncidentIsNotCountedOpenAgain();
  await testMalformedControlSummaryFailsClosed();
  await testSchedulerReportsIsolatedFailuresAsActivity();
  await testSchedulerFailurePreservesPriorCompletion();
  await testSchedulerOutcomeCannotOverwriteLostLeaseOrForeignState();
  await testPagination();
  await testPublishedIncidentIdempotencyAndGrantCycles();
  await testAcknowledgedPublicationIncidentRetainsOneOpenCountAcrossGrantCycle();
  await testNewerSparseMarkerDoesNotMixOlderDependencyEvidence();
  await testExistingIncidentShapeFailsClosed();
  await cleanup();
}

run()
  .then(() => process.stdout.write("SignalDesk proof-permission lifecycle emulator tests passed.\n"))
  .catch(error => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exit(1);
  });
