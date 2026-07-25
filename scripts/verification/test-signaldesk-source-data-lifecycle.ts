#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  db,
  FieldValue,
  Timestamp,
} from "../../functions-signaldesk/src/firebaseAdmin";
import {
  recordSignalDeskSourceDataLifecycleFailure,
  runSignalDeskSourceDataLifecycle,
  signalDeskProviderSourceDataLifecycleAuthorityHash,
  signalDeskSourcePolicyLifecycleAuthorityHash,
  signalDeskSourceDataLifecycleAuthorityHash,
} from "../../functions-signaldesk/src/schedulers/sourceDataLifecycle";
import { runSignalDeskMaintenanceScheduler } from "../../functions-signaldesk/src/schedulers/signaldeskMaintenanceScheduler";

const BASE_NOW = new Date("2026-07-15T10:15:00.000Z");
const COLLECTIONS = {
  aiRuns: "signaldeskAiWorkerRuns",
  approvalPackets: "signaldeskApprovalPackets",
  approvals: "signaldeskApprovalQueue",
  audits: "signaldeskAuditEvents",
  contacts: "signaldeskContactIdentities",
  channelWindows: "signaldeskChannelWindowStates",
  control: "signaldeskControlRoomSummaries",
  conversations: "signaldeskConversationSummaries",
  drafts: "signaldeskDraftSummaries",
  decisionSnapshots: "signaldeskDecisionSnapshots",
  enrichment: "signaldeskEnrichmentResults",
  evidence: "signaldeskEvidencePackets",
  evidenceSummaries: "signaldeskEvidencePacketSummaries",
  exports: "signaldeskMessageExports",
  handoffs: "signaldeskSequencerHandoffs",
  idempotency: "signaldeskIdempotencyKeys",
  incidents: "signaldeskIncidents",
  messages: "signaldeskMessages",
  outcomes: "signaldeskOutcomeEvents",
  policies: "signaldeskSourcePolicies",
  proofPermissions: "signaldeskProofPermissions",
  providerRetention: "signaldeskProviderSourceRetention",
  queueSummaries: "signaldeskQueueSummaries",
  replyClassifications: "signaldeskReplyClassifications",
  research: "signaldeskResearchTableRows",
  routeTokens: "signaldeskRouteTokens",
  revenueAccounts: "signaldeskRevenueAccounts",
  revenueOpportunities: "signaldeskCommercialOpportunities",
  revenueSummaries: "signaldeskRevenueControlSummaries",
  sourceCandidates: "signaldeskSourceCandidates",
  sourceRuns: "signaldeskSourceRunSummaries",
  steps: "signaldeskSequencerSteps",
  suppression: "signaldeskSuppressionLedger",
  system: "_system",
  targetDetails: "signaldeskTargets",
  targets: "signaldeskTargetSummaries",
  timelines: "signaldeskRunTimelines",
  vendorRuns: "signaldeskVendorRuns",
} as const;

const cleanup = async (): Promise<void> => {
  for (const collection of Object.values(COLLECTIONS)) {
    await db.recursiveDelete(db.collection(collection));
  }
};

const seedPolicy = async (params: {
  expiresAt?: Date;
  id: string;
  status?: "active" | "approved" | "inactive" | "review_required" | "blocked";
}): Promise<void> => {
  const createdAt = new Date(BASE_NOW.getTime() - (30 * 24 * 60 * 60 * 1000));
  await db.collection(COLLECTIONS.policies).doc(params.id).set({
    allowedContactChannels: ["email"],
    allowedUse: {
      contact: true,
      evidence: true,
      import: true,
      personalization: true,
      providerRun: true,
      storage: true,
    },
    approvedAt: Timestamp.fromDate(createdAt),
    createdAt: Timestamp.fromDate(createdAt),
    expiresAt: Timestamp.fromDate(params.expiresAt || new Date(BASE_NOW.getTime() - 60_000)),
    lastReviewedAt: Timestamp.fromDate(createdAt),
    name: "Retention fixture",
    pId: "SD",
    provider: "google-places",
    retentionDays: 30,
    sourcePolicyId: params.id,
    sourceType: "provider",
    status: params.status || "active",
    updatedAt: Timestamp.fromDate(createdAt),
  });
};

const targetBase = (targetId: string, sourcePolicyId: string) => ({
  category: "Restaurant",
  city: "Pune",
  contactability: "ready",
  contactabilityScore: 90,
  country: "India",
  currentListGapScore: 80,
  currentListUrl: "https://example.test/menu",
  displayName: `Fixture ${targetId}`,
  fitScore: 85,
  nextAction: "draft",
  pId: "SD",
  primaryOpportunity: "stale-menu",
  riskScore: 10,
  segment: "a",
  sourceConfidence: "high",
  sourceDataLifecycleState: "active",
  sourceDataExpiresAt: Timestamp.fromMillis(BASE_NOW.getTime() - 60_000),
  sourceDataObservedAt: Timestamp.fromMillis(BASE_NOW.getTime() - (2 * 86_400_000)),
  sourcePolicyId,
  sourceRunId: `run_${targetId}`,
  status: "ready",
  suppressionStatus: "clear",
  targetId,
  updatedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 10_000),
  website: "https://example.test/",
});

const seedSourceRun = async (params: {
  createdAt?: Date;
  sourcePolicyId: string;
  sourceRunId: string;
}): Promise<void> => {
  const createdAt = Timestamp.fromDate(params.createdAt || new Date(BASE_NOW.getTime() - (2 * 86_400_000)));
  await db.collection(COLLECTIONS.sourceRuns).doc(params.sourceRunId).set({
    blockedCount: 0,
    createdAt,
    duplicateCount: 0,
    importedCount: 1,
    pId: "SD",
    sourceName: "Lifecycle fixture import",
    sourcePolicyId: params.sourcePolicyId,
    sourceRunId: params.sourceRunId,
    status: "completed",
    suppressedCount: 0,
    updatedAt: createdAt,
  });
};

const seedTarget = async (targetId: string, sourcePolicyId: string): Promise<void> => {
  const policy = await db.collection(COLLECTIONS.policies).doc(sourcePolicyId).get();
  const sourceDataExpiresAt = policy.get("expiresAt");
  const base = {
    ...targetBase(targetId, sourcePolicyId),
    ...(sourceDataExpiresAt ? { sourceDataExpiresAt } : {}),
  };
  await Promise.all([
    seedSourceRun({
      createdAt: new Date((base.sourceDataObservedAt as FirebaseFirestore.Timestamp).toMillis()),
      sourcePolicyId,
      sourceRunId: `run_${targetId}`,
    }),
    db.collection(COLLECTIONS.targets).doc(targetId).set(base),
    db.collection(COLLECTIONS.targetDetails).doc(targetId).set({
      ...base,
      email: "owner@example.test",
      identityHash: "a".repeat(64),
      identityVersion: "provider-record-v1",
      instagram: "fixture_owner",
      messengerPsid: "raw-messenger-id",
      notes: "Private research note",
      permissionEvidenceRef: "https://example.test/permission",
      phone: "+919999999999",
      provider: "google-places",
      providerRecordId: "place-sensitive-id",
      providerRecordUrl: "https://example.test/place-sensitive-id",
    }),
  ]);
};

const dependencyBase = (targetId: string, identityField: string, identity: string) => ({
  [identityField]: identity,
  pId: "SD",
  targetId,
  updatedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 5_000),
});

const seedDependencies = async (targetId: string, sourcePolicyId: string): Promise<void> => {
  const sourceRunId = `run_${targetId}`;
  const activeRouteTokenHash = "c".repeat(64);
  const revokedRouteTokenHash = "d".repeat(64);
  await Promise.all([
    db.collection(COLLECTIONS.routeTokens).doc(`route_${activeRouteTokenHash.slice(0, 32)}`).set({
      ...dependencyBase(targetId, "routeTokenId", `route_${activeRouteTokenHash.slice(0, 32)}`),
      createdAt: Timestamp.fromMillis(BASE_NOW.getTime() - 60_000),
      createdBy: "fixture-operator",
      expiresAt: Timestamp.fromMillis(BASE_NOW.getTime() + 86_400_000),
      ownerQualifiedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 50_000),
      revokedAt: null,
      revokedBy: null,
      revocationReason: null,
      scope: "menulist-activation-outcomes-v1",
      sourceActionId: "fixture-action",
      sourcePolicyId,
      status: "active",
      targetName: "Sensitive target",
      tokenHash: activeRouteTokenHash,
    }),
    db.collection(COLLECTIONS.routeTokens).doc(`route_${revokedRouteTokenHash.slice(0, 32)}`).set({
      ...dependencyBase(targetId, "routeTokenId", `route_${revokedRouteTokenHash.slice(0, 32)}`),
      createdAt: Timestamp.fromMillis(BASE_NOW.getTime() - 60_000),
      createdBy: "fixture-operator",
      expiresAt: Timestamp.fromMillis(BASE_NOW.getTime() + 86_400_000),
      ownerQualifiedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 50_000),
      revokedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 20_000),
      revokedBy: "fixture-operator",
      revocationReason: "Fixture revocation",
      scope: "menulist-activation-outcomes-v1",
      sourceActionId: "fixture-action",
      sourcePolicyId,
      status: "revoked",
      targetName: "Sensitive target",
      tokenHash: revokedRouteTokenHash,
    }),
    db.collection(COLLECTIONS.contacts).doc(`contact_${targetId}`).set({
      ...dependencyBase(targetId, "identityId", `contact_${targetId}`),
      channel: "email",
      permissionEvidenceRef: "https://example.test/contact-proof",
      permissionState: "permissioned",
      sourcePolicyId,
      sourceRunId,
      value: "owner@example.test",
    }),
    db.collection(COLLECTIONS.contacts).doc(`foreign_${targetId}`).set({
      identityId: `foreign_${targetId}`,
      pId: "ML",
      permissionState: "permissioned",
      targetId,
      value: "foreign@example.test",
    }),
    db.collection(COLLECTIONS.providerRetention).doc(`retention_${targetId}`).set({
      ...dependencyBase(targetId, "providerSourceRetentionId", `retention_${targetId}`),
      lastRefreshedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 20_000),
      provider: "google-places",
      providerRecordId: "provider-sensitive-id",
      providerRecordUrl: "https://example.test/provider-sensitive-id",
      rawPayloadStored: false,
      refreshDueAt: Timestamp.fromMillis(BASE_NOW.getTime() - 2_000),
      retentionExpiresAt: Timestamp.fromMillis(BASE_NOW.getTime() - 1_000),
      sourcePolicyId,
      sourceRunId,
      status: "active",
      targetName: "Sensitive target name",
    }),
    db.collection(COLLECTIONS.sourceCandidates).doc(`candidate_${targetId}`).set({
      ...dependencyBase(targetId, "sourceCandidateId", `candidate_${targetId}`),
      blocked: false,
      displayName: "Sensitive candidate",
      permissionEvidenceRef: "https://example.test/source-proof",
      providerRecordId: "candidate-provider-id",
      providerRecordUrl: "https://example.test/candidate",
      sourcePolicyId,
      sourceRunId,
      website: "https://example.test/candidate-site",
    }),
    db.collection(COLLECTIONS.enrichment).doc(`enrichment_${targetId}`).set({
      ...dependencyBase(targetId, "enrichmentResultId", `enrichment_${targetId}`),
      confidence: "high",
      expiresAt: Timestamp.fromMillis(BASE_NOW.getTime() + 86_400_000),
      field: "email",
      provider: "google-places",
      sourcePolicyId,
      status: "verified",
      targetName: "Sensitive target",
      value: "owner@example.test",
      valuePreview: "owner@...",
    }),
    db.collection(COLLECTIONS.research).doc(`research_${targetId}`).set({
      ...dependencyBase(targetId, "researchRowId", `research_${targetId}`),
      actionabilityState: "actionable",
      allowedRoute: "email-export",
      allowedRouteReason: "Permissioned",
      category: "Restaurant",
      city: "Pune",
      contactability: "ready",
      country: "India",
      currentListGap: "stale-menu",
      displayName: "Sensitive target",
      enrichment: [{ key: "email", label: "Email", sourceRef: "https://example.test", value: "owner@example.test", verdict: "pass" }],
      evidenceSummary: "Sensitive evidence",
      fitDecision: "pass",
      fitScore: 90,
      hardGateFailures: [],
      provider: "google-places",
      providerRecordUrl: "https://example.test/provider",
      recommendedChannel: "email-export",
      recommendedCta: "Book a call",
      recommendedMessageAngle: "Personalized angle",
      recommendedNextAction: "evidence",
      researchRunId: `research_run_${targetId}`,
      routePermissionState: "permissioned",
      sourcePolicyId,
      sourceRefs: ["https://example.test/provider"],
      sourceRunId,
      website: "https://example.test/",
    }),
    ...[COLLECTIONS.evidenceSummaries, COLLECTIONS.evidence].map((collection, index) => db.collection(collection)
      .doc(`evidence_${index}_${targetId}`).set({
        ...dependencyBase(targetId, "evidencePacketId", `evidence_${index}_${targetId}`),
        allowedUse: ["personalization"],
        confidence: "high",
        ...(index === 1 ? {
          facts: [{
            category: "Restaurant",
            city: "Pune",
            currentListUrl: "https://example.test/sensitive-menu",
            website: "https://example.test/sensitive-business",
          }],
        } : {}),
        rejectedFacts: [],
        sourcePolicyId,
        sourceRefs: ["https://example.test/evidence"],
        summary: "Sensitive evidence summary",
        targetName: "Sensitive target",
      })),
    db.collection(COLLECTIONS.approvalPackets).doc(`packet_${targetId}`).set({
      ...dependencyBase(targetId, "approvalPacketId", `packet_${targetId}`),
      channelReadiness: "ready",
      evidenceRejectedFacts: [],
      evidenceSummary: "Sensitive evidence",
      expectedOutcome: "Reply",
      messageBody: "Personalized body",
      messageSubject: "Personalized subject",
      recommendedAction: "approve",
      riskSummary: "Low risk",
      sourcePolicyId,
      status: "pending",
      targetName: "Sensitive target",
    }),
    ...["draft", "sent"].map(status => db.collection(COLLECTIONS.drafts)
      .doc(`${status}_draft_${targetId}`).set({
        ...dependencyBase(targetId, "draftId", `${status}_draft_${targetId}`),
        body: `${status} personalized body`,
        personalizationEvidenceIds: ["sensitive-evidence"],
        status,
        subject: `${status} personalized subject`,
        targetName: "Sensitive target",
      })),
    ...["pending", "sent"].map(status => db.collection(COLLECTIONS.approvals)
      .doc(`${status}_approval_${targetId}`).set({
        ...dependencyBase(targetId, "approvalId", `${status}_approval_${targetId}`),
        reviewReason: "Sensitive review",
        status,
        targetName: "Sensitive target",
      })),
    ...["ready", "sent"].map(status => db.collection(COLLECTIONS.handoffs)
      .doc(`${status}_handoff_${targetId}`).set({
        ...dependencyBase(targetId, "sequencerHandoffId", `${status}_handoff_${targetId}`),
        provider: "manual",
        providerLeadId: "sensitive-provider-lead",
        recipientPreview: "owner@...",
        status,
        targetName: "Sensitive target",
      })),
    ...["ready", "sent"].map(status => db.collection(COLLECTIONS.steps)
      .doc(`${status}_step_${targetId}`).set({
        ...dependencyBase(targetId, "sequenceStepId", `${status}_step_${targetId}`),
        bodyPreview: `${status} body preview`,
        channel: "email",
        sequencerHandoffId: `${status}_handoff_${targetId}`,
        status,
        stepNumber: 1,
        subject: `${status} subject`,
        targetName: "Sensitive target",
      })),
    ...["exported", "sent"].map(status => db.collection(COLLECTIONS.exports)
      .doc(`${status}_export_${targetId}`).set({
        ...dependencyBase(targetId, "exportId", `${status}_export_${targetId}`),
        body: `${status} body`,
        providerMessageId: `${status}-provider-message`,
        status,
        subject: `${status} subject`,
        targetName: "Sensitive target",
      })),
    db.collection(COLLECTIONS.conversations).doc(`conversation_${targetId}`).set({
      ...dependencyBase(targetId, "conversationId", `conversation_${targetId}`),
      channel: "email",
      lastMessagePreview: "Preserved conversation preview",
      state: "contacted",
      targetName: "Sensitive target",
    }),
    db.collection(COLLECTIONS.messages).doc(`message_${targetId}`).set({
      ...dependencyBase(targetId, "messageId", `message_${targetId}`),
      body: "Preserved inbound message",
      channel: "email",
      direction: "inbound",
    }),
    db.collection(COLLECTIONS.replyClassifications).doc(`classification_${targetId}`).set({
      ...dependencyBase(targetId, "classificationId", `classification_${targetId}`),
      classifierVersion: "rules-v1",
      confidence: "high",
      conversationId: `conversation_${targetId}`,
      createdAt: Timestamp.fromMillis(BASE_NOW.getTime() - 5_000),
      state: "interested",
    }),
    db.collection(COLLECTIONS.suppression).doc(`suppression_${targetId}`).set({
      pId: "SD", suppressionId: `suppression_${targetId}`, targetId, identityHash: "b".repeat(64), reason: "dnc",
    }),
    db.collection(COLLECTIONS.outcomes).doc(`outcome_${targetId}`).set({
      pId: "SD", outcomeEventId: `outcome_${targetId}`, targetId, outcome: "reply",
    }),
    db.collection(COLLECTIONS.idempotency).doc(`idempotency_${targetId}`).set({
      pId: "SD", claimId: `idempotency_${targetId}`, targetId, status: "completed",
    }),
  ]);
};

const testHoldFirstScrubAndLegalSurvival = async (): Promise<void> => {
  await cleanup();
  const policyId = "policy_retention_main";
  const targetId = "target_retention_main";
  await seedPolicy({ id: policyId });
  await seedTarget(targetId, policyId);
  await seedDependencies(targetId, policyId);

  const held = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxReconciliationSteps: 0,
    now: Timestamp.fromDate(BASE_NOW),
  });
  assert.equal(held.materializedPolicyCount, 1);
  assert.equal(held.materializedProviderRetentionCount, 1);
  assert.equal(held.materializedTargetCount, 1);
  assert.equal(held.pendingTargetCount, 1);
  const heldTarget = await db.collection(COLLECTIONS.targets).doc(targetId).get();
  assert.equal(heldTarget.get("status"), "held");
  assert.equal(heldTarget.get("contactability"), "blocked");
  assert.equal(heldTarget.get("sourceDataLifecycleState"), "pending");
  assert.equal((await db.collection(COLLECTIONS.contacts).doc(`contact_${targetId}`).get()).get("value"), "owner@example.test");

  const completed = await runSignalDeskSourceDataLifecycle({
    dependencyPageSize: 2,
    firestore: db,
    maxReconciliationSteps: 200,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + 1_000),
  });
  assert.equal(completed.completedTargetCount, 1);
  assert.equal(completed.materializedProviderRetentionCount, 0);
  assert.equal(completed.revokedRouteTokenCount, 1);
  assert.equal(completed.scrubbedRouteTokenCount, 2);
  assert.equal(completed.scrubbedTargetDetailCount, 1);
  assert.equal(completed.scrubbedContactIdentityCount, 1);
  assert.equal(completed.scrubbedSourceCandidateCount, 1);
  assert.equal(completed.scrubbedEnrichmentResultCount, 1);
  assert.equal(completed.scrubbedResearchRowCount, 1);
  assert.equal(completed.scrubbedEvidenceCount, 2);
  assert.equal(completed.scrubbedApprovalPacketCount, 1);
  assert.equal(completed.scrubbedDraftCount, 1);
  assert.equal(completed.heldApprovalCount, 1);
  assert.equal(completed.stoppedHandoffCount, 1);
  assert.equal(completed.scrubbedSequenceStepCount, 1);
  assert.equal(completed.scrubbedMessageExportCount, 1);
  assert.equal(completed.legalRetentionReviewCount, 8);
  assert.equal(completed.foreignDependencyCount, 1);
  assert.equal(completed.scannedDependencyCount, 24);

  const [target, detail, activeRouteToken, revokedRouteToken, contact, provider, unsentDraft, sentDraft, sentExport, conversation, message] = await Promise.all([
    db.collection(COLLECTIONS.targets).doc(targetId).get(),
    db.collection(COLLECTIONS.targetDetails).doc(targetId).get(),
    db.collection(COLLECTIONS.routeTokens).doc(`route_${"c".repeat(32)}`).get(),
    db.collection(COLLECTIONS.routeTokens).doc(`route_${"d".repeat(32)}`).get(),
    db.collection(COLLECTIONS.contacts).doc(`contact_${targetId}`).get(),
    db.collection(COLLECTIONS.providerRetention).doc(`retention_${targetId}`).get(),
    db.collection(COLLECTIONS.drafts).doc(`draft_draft_${targetId}`).get(),
    db.collection(COLLECTIONS.drafts).doc(`sent_draft_${targetId}`).get(),
    db.collection(COLLECTIONS.exports).doc(`sent_export_${targetId}`).get(),
    db.collection(COLLECTIONS.conversations).doc(`conversation_${targetId}`).get(),
    db.collection(COLLECTIONS.messages).doc(`message_${targetId}`).get(),
  ]);
  assert.equal(target.get("sourceDataLifecycleState"), "completed");
  assert.equal(target.get("displayName"), "Retained target record");
  assert.equal(detail.get("email"), null);
  assert.equal(detail.get("phone"), null);
  assert.equal(detail.get("providerRecordId"), null);
  assert.equal(detail.get("messengerPsid"), undefined);
  assert.equal(activeRouteToken.get("status"), "revoked");
  assert.equal(activeRouteToken.get("revokedBy"), "signaldesk-source-data-lifecycle");
  assert.equal(activeRouteToken.get("targetName"), "Retained target record");
  assert.equal(revokedRouteToken.get("status"), "revoked");
  assert.equal(revokedRouteToken.get("revocationReason"), "Fixture revocation");
  assert.equal(revokedRouteToken.get("targetName"), "Retained target record");
  assert.equal(contact.get("value"), undefined);
  assert.equal(contact.get("rawValueStored"), false);
  assert.match(contact.get("identityHash"), /^[a-f0-9]{64}$/);
  assert.equal(provider.get("providerRecordId"), null);
  assert.match(provider.get("providerIdentityHash"), /^[a-f0-9]{64}$/);
  assert.equal(unsentDraft.get("body"), "Source-derived draft removed by retention policy.");
  assert.equal(unsentDraft.get("status"), "rejected");
  assert.equal(sentDraft.get("body"), "sent personalized body");
  assert.equal(sentDraft.get("legalRetentionReviewRequired"), true);
  assert.equal(sentExport.get("body"), "sent body");
  assert.equal(sentExport.get("providerMessageId"), "sent-provider-message");
  assert.equal(sentExport.get("legalRetentionReviewRequired"), true);
  assert.equal(conversation.get("lastMessagePreview"), "Preserved conversation preview");
  assert.equal(conversation.get("legalRetentionReviewRequired"), true);
  assert.equal(message.get("body"), "Preserved inbound message");
  assert.equal(message.get("legalRetentionReviewRequired"), true);
  const replyClassification = await db.collection(COLLECTIONS.replyClassifications)
    .doc(`classification_${targetId}`).get();
  assert.equal(replyClassification.get("state"), "interested");
  assert.equal(replyClassification.get("legalRetentionReviewRequired"), true);
  assert.equal(replyClassification.get("legalRetentionReviewReason"), "reply-classification-record");
  const policyScrubbedEnrichment = await db.collection(COLLECTIONS.enrichment)
    .doc(`enrichment_${targetId}`).get();
  const policyScrubbedEvidence = await db.collection(COLLECTIONS.evidence)
    .doc(`evidence_1_${targetId}`).get();
  assert.equal(policyScrubbedEnrichment.get("expiresAt"), null);
  assert.equal(policyScrubbedEnrichment.get("sourceDataPayloadStored"), false);
  assert.equal(policyScrubbedEvidence.get("facts"), undefined, "evidence detail retained raw source facts");
  const afterOriginalEnrichmentExpiry = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxReconciliationSteps: 0,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + (2 * 86_400_000)),
  });
  assert.equal(
    afterOriginalEnrichmentExpiry.scannedDueEnrichmentCount,
    0,
    "policy scrub left enrichment due for a second retention token",
  );
  assert.equal((await db.collection(COLLECTIONS.suppression).doc(`suppression_${targetId}`).get()).get("reason"), "dnc");
  assert.equal((await db.collection(COLLECTIONS.outcomes).doc(`outcome_${targetId}`).get()).get("outcome"), "reply");
  assert.equal((await db.collection(COLLECTIONS.idempotency).doc(`idempotency_${targetId}`).get()).get("status"), "completed");
  assert.equal((await db.collection(COLLECTIONS.contacts).doc(`foreign_${targetId}`).get()).get("value"), "foreign@example.test");

  const repeated = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxReconciliationSteps: 200,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + 2_000),
  });
  assert.equal(repeated.materializedPolicyCount, 0);
  assert.equal(repeated.materializedProviderRetentionCount, 0);
  assert.equal(repeated.materializedTargetCount, 0);
  assert.equal(repeated.completedTargetCount, 0);

  await db.collection(COLLECTIONS.policies).doc(policyId).set({
    approvedAt: Timestamp.fromMillis(BASE_NOW.getTime() + 3_000),
    expiresAt: Timestamp.fromMillis(BASE_NOW.getTime() + (30 * 24 * 60 * 60 * 1000)),
    lastReviewedAt: Timestamp.fromMillis(BASE_NOW.getTime() + 3_000),
    status: "active",
    updatedAt: Timestamp.fromMillis(BASE_NOW.getTime() + 3_000),
  }, { merge: true });
  await runSignalDeskSourceDataLifecycle({
    firestore: db,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + 4_000),
  });
  const afterRenewal = await db.collection(COLLECTIONS.targets).doc(targetId).get();
  assert.equal(afterRenewal.get("sourceDataLifecycleState"), "completed");
  assert.equal(afterRenewal.get("status"), "held", "same-policy renewal revived scrubbed target data");
  await db.collection(COLLECTIONS.targets).doc(targetId).set({
    contactability: "ready",
    nextAction: "outcome",
    segment: "a",
    sourceConfidence: "high",
    status: "replied",
  }, { merge: true });
  const renewedExpiry = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + (31 * 24 * 60 * 60 * 1000)),
  });
  assert.equal(renewedExpiry.materializedPolicyCount, 1, "renewed policy did not open a new expiry epoch");
  assert.equal(renewedExpiry.materializedTargetCount, 1, "corrupt completed tombstone was not re-opened for repair");
  const repairedCompletedTarget = await db.collection(COLLECTIONS.targets).doc(targetId).get();
  assert.equal(repairedCompletedTarget.get("status"), "held");
  assert.equal(repairedCompletedTarget.get("sourceDataLifecycleState"), "completed");
  assert.equal(
    repairedCompletedTarget.get("sourceDataLifecycleInputFailureCode"),
    "SIGNALDESK_SOURCE_DATA_COMPLETED_TOMBSTONE_INVALID",
  );
};

const testScrubReadyProviderNegative = async (): Promise<void> => {
  await cleanup();
  const policyId = "policy_future_negative";
  const targetId = "target_future_negative";
  await seedPolicy({ id: policyId, expiresAt: new Date(BASE_NOW.getTime() + (30 * 24 * 60 * 60 * 1000)) });
  await seedTarget(targetId, policyId);
  await db.collection(COLLECTIONS.providerRetention).doc(`retention_${targetId}`).set({
    ...dependencyBase(targetId, "providerSourceRetentionId", `retention_${targetId}`),
    lastRefreshedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 10_000),
    provider: "google-places",
    providerRecordId: "blocked-provider-id",
    providerRecordUrl: "https://example.test/blocked-provider-id",
    rawPayloadStored: false,
    refreshDueAt: Timestamp.fromMillis(BASE_NOW.getTime() + 20_000),
    retentionExpiresAt: Timestamp.fromMillis(BASE_NOW.getTime() + 30_000),
    sourceDataLifecycleState: "scrub_ready",
    sourcePolicyId: policyId,
    sourceRunId: `run_${targetId}`,
    status: "blocked",
  });
  const result = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxReconciliationSteps: 0,
    now: Timestamp.fromDate(BASE_NOW),
  });
  assert.equal(result.materializedProviderRetentionCount, 1);
  assert.equal(result.materializedTargetCount, 1);
  assert.equal((await db.collection(COLLECTIONS.targets).doc(targetId).get()).get("status"), "held");
  const retention = await db.collection(COLLECTIONS.providerRetention).doc(`retention_${targetId}`).get();
  assert.equal(retention.get("sourceDataLifecycleState"), "completed");
  assert.equal(retention.get("providerRecordId"), null);
};

const testPolicyPageMalformedSummaryAndDetailIsolation = async (): Promise<void> => {
  await cleanup();
  const policyId = "policy_same_page_isolation";
  const malformedTargetId = "target_00_malformed_summary";
  const missingDetailTargetId = "target_01_missing_detail";
  const foreignDetailTargetId = "target_02_foreign_detail";
  const missingRunTargetId = "target_03_missing_summary_run";
  const legacyDetailTargetId = "target_04_legacy_detail";
  const mismatchedRunTargetId = "target_05_mismatched_detail_run";
  const cleanTargetId = "target_06_clean";
  await seedPolicy({ id: policyId });
  for (const targetId of [
    malformedTargetId,
    missingDetailTargetId,
    foreignDetailTargetId,
    missingRunTargetId,
    legacyDetailTargetId,
    mismatchedRunTargetId,
    cleanTargetId,
  ]) {
    await seedTarget(targetId, policyId);
  }
  await db.collection(COLLECTIONS.targets).doc(malformedTargetId).set({ status: "corrupt-status" }, { merge: true });
  await db.collection(COLLECTIONS.targetDetails).doc(missingDetailTargetId).delete();
  await db.collection(COLLECTIONS.targetDetails).doc(foreignDetailTargetId).set({
    email: "foreign-preserved@example.test",
    pId: "ML",
    sourcePolicyId: policyId,
    sourceRunId: `run_${foreignDetailTargetId}`,
    targetId: foreignDetailTargetId,
  });
  await db.collection(COLLECTIONS.targets).doc(missingRunTargetId).set({
    sourceRunId: FieldValue.delete(),
  }, { merge: true });
  await db.collection(COLLECTIONS.targetDetails).doc(legacyDetailTargetId).set({
    pId: FieldValue.delete(),
  }, { merge: true });
  await db.collection(COLLECTIONS.targetDetails).doc(mismatchedRunTargetId).set({
    sourceRunId: "run_older_same_policy",
  }, { merge: true });
  for (const targetId of [missingDetailTargetId, foreignDetailTargetId]) {
    await db.collection(COLLECTIONS.contacts).doc(`contact_${targetId}`).set({
      ...dependencyBase(targetId, "identityId", `contact_${targetId}`),
      channel: "email",
      permissionState: "permissioned",
      sourcePolicyId: policyId,
      sourceRunId: `run_${targetId}`,
      value: `${targetId}@example.test`,
    });
  }

  const result = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxAuthorities: 10,
    maxReconciliationSteps: 400,
    maxTargets: 10,
    now: Timestamp.fromDate(BASE_NOW),
  });
  assert.equal(result.completedPolicyCount, 1, "a malformed same-policy summary starved policy completion");
  assert.equal(result.completedTargetCount, 7, "a malformed or absent detail starved later target phases");
  assert.equal(result.scrubbedContactIdentityCount, 2);
  assert.equal(result.foreignDependencyCount, 1);
  const malformed = await db.collection(COLLECTIONS.targets).doc(malformedTargetId).get();
  assert.equal(malformed.get("sourceDataLifecycleState"), "completed");
  assert.equal(malformed.get("status"), "held");
  assert.match(String(malformed.get("sourceDataLifecycleInputFailureCode")), /^SIGNALDESK_/);
  assert.equal(
    (await db.collection(COLLECTIONS.contacts).doc(`contact_${missingDetailTargetId}`).get()).get("value"),
    undefined,
  );
  assert.equal(
    (await db.collection(COLLECTIONS.contacts).doc(`contact_${foreignDetailTargetId}`).get()).get("value"),
    undefined,
  );
  const foreignDetail = await db.collection(COLLECTIONS.targetDetails).doc(foreignDetailTargetId).get();
  assert.equal(foreignDetail.get("pId"), "ML");
  assert.equal(foreignDetail.get("email"), "foreign-preserved@example.test");
  assert.equal(
    (await db.collection(COLLECTIONS.targetDetails).doc(missingRunTargetId).get()).get("email"),
    null,
    "missing summary run left deterministic same-policy detail raw",
  );
  const normalizedLegacyDetail = await db.collection(COLLECTIONS.targetDetails).doc(legacyDetailTargetId).get();
  assert.equal(normalizedLegacyDetail.get("pId"), "SD");
  assert.equal(normalizedLegacyDetail.get("email"), null, "legacy detail without pId was not scrubbed");
  const normalizedRunMismatch = await db.collection(COLLECTIONS.targetDetails).doc(mismatchedRunTargetId).get();
  assert.equal(normalizedRunMismatch.get("email"), null, "same-policy run mismatch left detail raw");
  assert.equal(
    normalizedRunMismatch.get("sourceDataLifecycleInputFailureCode"),
    "SIGNALDESK_SOURCE_DATA_TARGET_DETAIL_RUN_MISMATCH",
  );
  const malformedIncidents = await db.collection(COLLECTIONS.incidents)
    .where("incidentType", "==", "source-data-malformed-authority")
    .get();
  assert.equal(malformedIncidents.empty, false, "malformed authority normalization did not emit a high-severity incident");
  const allIncidents = await db.collection(COLLECTIONS.incidents).get();
  const control = await db.collection(COLLECTIONS.control).doc("dashboard").get();
  assert.equal(control.get("incidentCount"), allIncidents.size);
  assert.equal(control.get("openIncidentCount"), allIncidents.size);
  assert.equal(control.get("safetyStatus"), "blocked");
};

const testProviderAndAuthorityLineageIsolation = async (): Promise<void> => {
  await cleanup();
  const policyId = "policy_provider_lineage";
  const targetId = "target_provider_lineage";
  const futureExpiry = new Date(BASE_NOW.getTime() + 86_400_000);
  await seedPolicy({ expiresAt: futureExpiry, id: policyId });
  await seedTarget(targetId, policyId);
  const providerRef = db.collection(COLLECTIONS.providerRetention).doc("retention_provider_lineage");
  await providerRef.set({
    ...dependencyBase(targetId, "providerSourceRetentionId", providerRef.id),
    lastRefreshedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 20_000),
    provider: "google-places",
    providerRecordId: "stale-provider-record",
    providerRecordUrl: "https://example.test/stale-provider-record",
    rawPayloadStored: false,
    refreshDueAt: Timestamp.fromMillis(BASE_NOW.getTime() - 2_000),
    retentionExpiresAt: Timestamp.fromMillis(BASE_NOW.getTime() - 1_000),
    sourcePolicyId: policyId,
    sourceRunId: "run_older_observation",
    status: "active",
    targetName: "Stale provider target",
  });
  const lineageResult = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxReconciliationSteps: 0,
    now: Timestamp.fromDate(BASE_NOW),
  });
  assert.equal(lineageResult.failedAuthorityCount, 1);
  const target = await db.collection(COLLECTIONS.targets).doc(targetId).get();
  assert.equal(target.get("sourceDataLifecycleState"), "active");
  assert.equal(target.get("status"), "ready", "a stale provider lineage quarantined a fresh target");

  const providerSnapshot = await providerRef.get();
  const staleProviderHash = signalDeskProviderSourceDataLifecycleAuthorityHash(providerSnapshot.data());
  const stableUpdatedAt = providerSnapshot.get("updatedAt");
  await providerRef.set({
    sourceDataLifecycleFailedAt: null,
    sourceDataLifecycleFailureCode: null,
    sourceDataLifecycleFailurePhase: null,
    sourceDataLifecycleRetryAt: null,
    sourceDataLifecycleRetryCount: 0,
    sourceDataLifecycleState: null,
    sourceRunId: "run_fresh_observation",
    status: "active",
    updatedAt: stableUpdatedAt,
  }, { merge: true });
  const staleProviderFailureRecorded = await recordSignalDeskSourceDataLifecycleFailure({
    authorityKind: "provider",
    authorityRef: providerRef,
    error: new Error("SIGNALDESK_STALE_PROVIDER_FAILURE"),
    expectedAuthorityHash: staleProviderHash,
    firestore: db,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + 1_000),
    phase: "due",
  });
  assert.equal(staleProviderFailureRecorded, false);
  assert.equal((await providerRef.get()).get("sourceRunId"), "run_fresh_observation");
  assert.notEqual(
    signalDeskSourceDataLifecycleAuthorityHash({
      ...targetBase("target_hash_lineage", policyId),
      sourceRunId: "run_old",
    }),
    signalDeskSourceDataLifecycleAuthorityHash({
      ...targetBase("target_hash_lineage", policyId),
      sourceRunId: "run_new",
    }),
    "target authority hash ignored source-run-only lineage changes",
  );
  const policyRef = db.collection(COLLECTIONS.policies).doc(policyId);
  const policySnapshot = await policyRef.get();
  const stalePolicyHash = signalDeskSourcePolicyLifecycleAuthorityHash(policySnapshot.data());
  await policyRef.set({ retentionDays: 31, updatedAt: policySnapshot.get("updatedAt") }, { merge: true });
  const stalePolicyFailureRecorded = await recordSignalDeskSourceDataLifecycleFailure({
    authorityKind: "policy",
    authorityRef: policyRef,
    error: new Error("SIGNALDESK_STALE_POLICY_FAILURE"),
    expectedAuthorityHash: stalePolicyHash,
    firestore: db,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + 2_000),
    phase: "due",
  });
  assert.equal(stalePolicyFailureRecorded, false);
  assert.equal((await policyRef.get()).get("retentionDays"), 31);
};

const revenueAccountFixture = (params: {
  engagementState: "contactable" | "replied";
  id: string;
  sourcePolicyId: string;
  targetId: string;
}) => ({
  activationState: params.engagementState === "replied" ? "in-progress" : "not-started",
  automationState: "manual",
  category: "Restaurant",
  city: "Pune",
  complianceState: "eligible",
  country: "India",
  displayName: `Sensitive ${params.targetId}`,
  engagementState: params.engagementState,
  lifecycleStage: params.engagementState === "replied" ? "engaged" : "opportunity",
  locationType: "single-location",
  nextAction: "Review commercial fit",
  organizationId: `organization_${params.targetId}`,
  pId: "SD",
  primaryTargetId: params.targetId,
  revenueAccountId: params.id,
  sourcePolicyId: params.sourcePolicyId,
  targetIds: [params.targetId],
  updatedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 5_000),
});

const opportunityFixture = (params: {
  id: string;
  probabilityPercent: number;
  revenueAccountId: string;
  targetId: string;
  valueMinor: number;
}) => ({
  commercialOfferId: "offer_fixture",
  currency: "USD",
  expectedCloseAt: Timestamp.fromMillis(BASE_NOW.getTime() + 86_400_000),
  founderAttentionMinutes: 0,
  nextAction: "Review offer",
  nextActionDueAt: Timestamp.fromMillis(BASE_NOW.getTime() + 60_000),
  opportunityId: params.id,
  pId: "SD",
  probabilityPercent: params.probabilityPercent,
  revenueAccountId: params.revenueAccountId,
  stage: "qualified",
  stalledReason: null,
  status: "open",
  targetId: params.targetId,
  title: `Sensitive ${params.targetId} opportunity`,
  updatedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 5_000),
  valueMinor: params.valueMinor,
  winLossReason: null,
});

const testExpandedDependencyRetentionAndSummaryReconciliation = async (): Promise<void> => {
  await cleanup();
  const policyId = "policy_expanded_dependencies";
  const unengagedTargetId = "target_expanded_unengaged";
  const engagedTargetId = "target_expanded_engaged";
  const unengagedAccountId = "revenue_expanded_unengaged";
  const engagedAccountId = "revenue_expanded_engaged";
  await seedPolicy({ id: policyId });
  await Promise.all([
    seedTarget(unengagedTargetId, policyId),
    seedTarget(engagedTargetId, policyId),
  ]);
  await Promise.all([
    db.collection(COLLECTIONS.aiRuns).doc("ai_expanded_unengaged").set({
      aiRunId: "ai_expanded_unengaged",
      confidence: "high",
      costEstimate: 0.2,
      createdAt: Timestamp.fromMillis(BASE_NOW.getTime() - 5_000),
      criticReasons: ["Sensitive evidence reason"],
      initialOutput: { body: "Sensitive initial output" },
      model: "gemini-fixture",
      output: { body: "Sensitive final output" },
      pId: "SD",
      reviewReason: "Sensitive review",
      targetId: unengagedTargetId,
      workerType: "ai_assist_draft",
      workerVersion: "fixture-v1",
    }),
    db.collection(COLLECTIONS.decisionSnapshots).doc("decision_expanded_unengaged").set({
      confidence: "low",
      createdAt: Timestamp.fromMillis(BASE_NOW.getTime() - 5_000),
      decisionType: "score",
      evidenceRefs: ["sensitive_evidence"],
      pId: "SD",
      rejectedFacts: ["Sensitive rejected fact"],
      snapshotId: "decision_expanded_unengaged",
      targetId: unengagedTargetId,
    }),
    db.collection(COLLECTIONS.channelWindows).doc("window_expanded_unengaged").set({
      channel: "whatsapp",
      channelWindowId: "window_expanded_unengaged",
      eligibleForHandoff: true,
      expiresAt: Timestamp.fromMillis(BASE_NOW.getTime() + 86_400_000),
      lastInteractionAt: Timestamp.fromMillis(BASE_NOW.getTime() - 5_000),
      openedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 10_000),
      pId: "SD",
      reason: "Inbound reply",
      source: "inbound",
      status: "open",
      targetId: unengagedTargetId,
      targetName: "Sensitive target",
      updatedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 5_000),
    }),
    db.collection(COLLECTIONS.vendorRuns).doc("vendor_expanded_unengaged").set({
      blockedReason: null,
      costEstimateUsd: 0.1,
      pId: "SD",
      provider: "google-places",
      requestedField: "email",
      resultCount: 1,
      status: "ready",
      targetId: unengagedTargetId,
      targetName: "Sensitive target",
      updatedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 5_000),
      vendorRunId: "vendor_expanded_unengaged",
      waterfallId: "waterfall_fixture",
    }),
    db.collection(COLLECTIONS.approvals).doc("approval_expanded_unengaged").set({
      ...dependencyBase(unengagedTargetId, "approvalId", "approval_expanded_unengaged"),
      reviewReason: "Sensitive review",
      status: "pending",
      targetName: "Sensitive target",
    }),
    db.collection(COLLECTIONS.queueSummaries).doc("current").set({
      approvalBacklog: 1,
      humanReview: 1,
      inboxBacklog: 0,
      overdue: 0,
      pId: "SD",
      queueSummaryId: "current",
      updatedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 5_000),
    }),
    db.collection(COLLECTIONS.revenueAccounts).doc(unengagedAccountId).set(revenueAccountFixture({
      engagementState: "contactable",
      id: unengagedAccountId,
      sourcePolicyId: policyId,
      targetId: unengagedTargetId,
    })),
    db.collection(COLLECTIONS.revenueAccounts).doc(engagedAccountId).set(revenueAccountFixture({
      engagementState: "replied",
      id: engagedAccountId,
      sourcePolicyId: policyId,
      targetId: engagedTargetId,
    })),
    db.collection(COLLECTIONS.revenueOpportunities).doc("opportunity_expanded_unengaged").set(opportunityFixture({
      id: "opportunity_expanded_unengaged",
      probabilityPercent: 20,
      revenueAccountId: unengagedAccountId,
      targetId: unengagedTargetId,
      valueMinor: 10_000,
    })),
    db.collection(COLLECTIONS.revenueOpportunities).doc("opportunity_expanded_orphan").set(opportunityFixture({
      id: "opportunity_expanded_orphan",
      probabilityPercent: 10,
      revenueAccountId: "missing_revenue_account",
      targetId: unengagedTargetId,
      valueMinor: 1_000,
    })),
    db.collection(COLLECTIONS.revenueOpportunities).doc("opportunity_expanded_orphan_won").set({
      ...opportunityFixture({
        id: "opportunity_expanded_orphan_won",
        probabilityPercent: 100,
        revenueAccountId: "missing_won_revenue_account",
        targetId: unengagedTargetId,
        valueMinor: 4_000,
      }),
      stage: "won",
      status: "won",
      winLossReason: "Recorded customer activation",
    }),
    db.collection(COLLECTIONS.revenueOpportunities).doc("opportunity_expanded_engaged").set(opportunityFixture({
      id: "opportunity_expanded_engaged",
      probabilityPercent: 40,
      revenueAccountId: engagedAccountId,
      targetId: engagedTargetId,
      valueMinor: 2_000,
    })),
    db.collection(COLLECTIONS.revenueOpportunities).doc("opportunity_unrelated").set(opportunityFixture({
      id: "opportunity_unrelated",
      probabilityPercent: 50,
      revenueAccountId: "revenue_unrelated",
      targetId: "target_unrelated",
      valueMinor: 5_000,
    })),
    db.collection(COLLECTIONS.revenueSummaries).doc("current").set({
      openOpportunityCount: 4,
      pId: "SD",
      pipelineCurrency: "USD",
      pipelineValueMinor: 18_000,
      revenueControlSummaryId: "current",
      updatedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 5_000),
      weightedPipelineValueMinor: 5_400,
    }),
  ]);

  const result = await runSignalDeskSourceDataLifecycle({
    dependencyPageSize: 10,
    firestore: db,
    maxAuthorities: 10,
    maxReconciliationSteps: 500,
    maxTargets: 10,
    now: Timestamp.fromDate(BASE_NOW),
  });
  assert.equal(result.completedTargetCount, 2);
  assert.equal(result.scrubbedAiWorkerRunCount, 1);
  assert.equal(result.closedChannelWindowCount, 1);
  assert.equal(result.scrubbedVendorRunCount, 1);
  assert.equal(result.scrubbedRevenueAccountCount, 1);
  assert.equal(result.closedCommercialOpportunityCount, 2);
  const [aiRun, decisionSnapshot, channelWindow, vendorRun, queue, unengagedAccount, engagedAccount, unengagedOpportunity, orphanOpportunity, orphanWonOpportunity, engagedOpportunity, revenueSummary] = await Promise.all([
    db.collection(COLLECTIONS.aiRuns).doc("ai_expanded_unengaged").get(),
    db.collection(COLLECTIONS.decisionSnapshots).doc("decision_expanded_unengaged").get(),
    db.collection(COLLECTIONS.channelWindows).doc("window_expanded_unengaged").get(),
    db.collection(COLLECTIONS.vendorRuns).doc("vendor_expanded_unengaged").get(),
    db.collection(COLLECTIONS.queueSummaries).doc("current").get(),
    db.collection(COLLECTIONS.revenueAccounts).doc(unengagedAccountId).get(),
    db.collection(COLLECTIONS.revenueAccounts).doc(engagedAccountId).get(),
    db.collection(COLLECTIONS.revenueOpportunities).doc("opportunity_expanded_unengaged").get(),
    db.collection(COLLECTIONS.revenueOpportunities).doc("opportunity_expanded_orphan").get(),
    db.collection(COLLECTIONS.revenueOpportunities).doc("opportunity_expanded_orphan_won").get(),
    db.collection(COLLECTIONS.revenueOpportunities).doc("opportunity_expanded_engaged").get(),
    db.collection(COLLECTIONS.revenueSummaries).doc("current").get(),
  ]);
  assert.equal(aiRun.get("output"), null);
  assert.deepEqual(aiRun.get("criticReasons"), []);
  assert.deepEqual(
    decisionSnapshot.get("rejectedFacts"),
    ["Sensitive rejected fact"],
    "immutable decision snapshot was mutated by source-data retention",
  );
  assert.deepEqual(decisionSnapshot.get("evidenceRefs"), ["sensitive_evidence"]);
  assert.equal(channelWindow.get("eligibleForHandoff"), false);
  assert.equal(channelWindow.get("status"), "closed");
  assert.equal(vendorRun.get("targetName"), "Retained target record");
  assert.equal(vendorRun.get("resultCount"), 0);
  assert.equal(queue.get("approvalBacklog"), 0);
  assert.equal(queue.get("humanReview"), 0);
  assert.equal(unengagedAccount.get("displayName"), "Retained revenue account");
  assert.equal(unengagedAccount.get("lifecycleStage"), "nurture");
  assert.equal(engagedAccount.get("displayName"), `Sensitive ${engagedTargetId}`);
  assert.equal(engagedAccount.get("legalRetentionReviewRequired"), true);
  assert.equal(unengagedOpportunity.get("status"), "nurture");
  assert.equal(unengagedOpportunity.get("valueMinor"), 0);
  assert.equal(orphanOpportunity.get("status"), "nurture");
  assert.equal(orphanWonOpportunity.get("status"), "won");
  assert.equal(orphanWonOpportunity.get("valueMinor"), 4_000);
  assert.equal(orphanWonOpportunity.get("legalRetentionReviewRequired"), true);
  assert.equal(engagedOpportunity.get("status"), "open");
  assert.equal(engagedOpportunity.get("legalRetentionReviewRequired"), true);
  assert.equal(revenueSummary.get("openOpportunityCount"), 2);
  assert.equal(revenueSummary.get("pipelineValueMinor"), 7_000);
  assert.equal(revenueSummary.get("weightedPipelineValueMinor"), 3_300);
  assert.equal(revenueSummary.get("pipelineCurrency"), "USD");

  await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxReconciliationSteps: 500,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + 1_000),
  });
  const repeatedQueue = await db.collection(COLLECTIONS.queueSummaries).doc("current").get();
  const repeatedRevenue = await db.collection(COLLECTIONS.revenueSummaries).doc("current").get();
  assert.equal(repeatedQueue.get("approvalBacklog"), 0, "approval summary decremented more than once");
  assert.equal(repeatedRevenue.get("openOpportunityCount"), 2, "opportunity summary decremented more than once");
  assert.equal(repeatedRevenue.get("pipelineValueMinor"), 7_000);
  assert.equal(repeatedRevenue.get("weightedPipelineValueMinor"), 3_300);
};

const testMalformedProviderQuarantineAndPolicyBinding = async (): Promise<void> => {
  await cleanup();
  const rawTargetId = "target_provider_raw_payload";
  const negativeTargetId = "target_provider_negative_missing_expiry";
  const mismatchTargetId = "target_provider_policy_mismatch";
  const rawPolicyId = "policy_provider_raw_payload";
  const negativePolicyId = "policy_provider_negative_missing_expiry";
  const mismatchPolicyId = "policy_provider_mismatch";
  const futureExpiry = new Date(BASE_NOW.getTime() + (30 * 24 * 60 * 60 * 1000));
  await Promise.all([
    seedPolicy({ expiresAt: futureExpiry, id: rawPolicyId }),
    seedPolicy({ expiresAt: futureExpiry, id: negativePolicyId }),
    seedPolicy({ expiresAt: futureExpiry, id: mismatchPolicyId }),
  ]);
  await Promise.all([
    seedTarget(rawTargetId, rawPolicyId),
    seedTarget(negativeTargetId, negativePolicyId),
    seedTarget(mismatchTargetId, mismatchPolicyId),
  ]);
  const providerRows = [
    {
      id: "retention_provider_raw_payload",
      policyId: rawPolicyId,
      provider: "google-places",
      rawPayloadStored: true,
      retentionExpiresAt: Timestamp.fromMillis(BASE_NOW.getTime() - 1_000),
      sourceDataLifecycleState: null,
      status: "active",
      targetId: rawTargetId,
    },
    {
      id: "retention_provider_negative_missing_expiry",
      policyId: negativePolicyId,
      provider: "google-places",
      rawPayloadStored: false,
      retentionExpiresAt: null,
      sourceDataLifecycleState: "scrub_ready",
      status: "blocked",
      targetId: negativeTargetId,
    },
    {
      id: "retention_provider_policy_mismatch",
      policyId: mismatchPolicyId,
      provider: "apify",
      rawPayloadStored: false,
      retentionExpiresAt: Timestamp.fromMillis(BASE_NOW.getTime() - 1_000),
      sourceDataLifecycleState: null,
      status: "active",
      targetId: mismatchTargetId,
    },
  ] as const;
  await Promise.all([
    ...providerRows.map(row => db.collection(COLLECTIONS.providerRetention).doc(row.id).set({
      ...dependencyBase(row.targetId, "providerSourceRetentionId", row.id),
      lastRefreshedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 20_000),
      provider: row.provider,
      providerRecordId: `sensitive_${row.id}`,
      providerRecordUrl: `https://example.test/${row.id}`,
      rawPayloadStored: row.rawPayloadStored,
      refreshDueAt: Timestamp.fromMillis(BASE_NOW.getTime() - 2_000),
      ...(row.retentionExpiresAt ? { retentionExpiresAt: row.retentionExpiresAt } : {}),
      ...(row.sourceDataLifecycleState ? { sourceDataLifecycleState: row.sourceDataLifecycleState } : {}),
      sourcePolicyId: row.policyId,
      sourceRunId: `run_${row.targetId}`,
      status: row.status,
      targetName: `Sensitive ${row.targetId}`,
    })),
    ...[rawTargetId, negativeTargetId].map(targetId => db.collection(COLLECTIONS.contacts)
      .doc(`contact_${targetId}`).set({
        ...dependencyBase(targetId, "identityId", `contact_${targetId}`),
        channel: "email",
        permissionState: "permissioned",
        sourcePolicyId: targetId === rawTargetId ? rawPolicyId : negativePolicyId,
        sourceRunId: `run_${targetId}`,
        value: `${targetId}@example.test`,
      })),
  ]);

  const result = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxAuthorities: 10,
    maxReconciliationSteps: 500,
    maxTargets: 10,
    now: Timestamp.fromDate(BASE_NOW),
  });
  assert.equal(result.failedAuthorityCount, 3);
  assert.equal(result.materializedTargetCount, 2);
  assert.equal(result.completedTargetCount, 2);
  for (const targetId of [rawTargetId, negativeTargetId]) {
    const target = await db.collection(COLLECTIONS.targets).doc(targetId).get();
    const contact = await db.collection(COLLECTIONS.contacts).doc(`contact_${targetId}`).get();
    assert.equal(target.get("sourceDataLifecycleState"), "completed");
    assert.match(String(target.get("lastSourceDataLifecycleToken")), /^source_data_target_/);
    assert.equal(contact.get("value"), undefined, "provider quarantine did not progress target dependency scrub");
  }
  const mismatchTarget = await db.collection(COLLECTIONS.targets).doc(mismatchTargetId).get();
  assert.equal(mismatchTarget.get("sourceDataLifecycleState"), "active");
  assert.equal(mismatchTarget.get("status"), "ready", "provider-policy mismatch held an unrelated target");
  for (const row of providerRows) {
    const provider = await db.collection(COLLECTIONS.providerRetention).doc(row.id).get();
    assert.equal(provider.get("providerRecordId"), null);
    assert.equal(provider.get("providerRecordUrl"), null);
    assert.equal(provider.get("sourceDataLifecycleRetryAt"), null);
  }
  assert.equal(
    (await db.collection(COLLECTIONS.providerRetention).doc("retention_provider_policy_mismatch").get())
      .get("sourceDataLifecycleState"),
    "failed",
  );

  await seedTarget(rawTargetId, rawPolicyId);
  await Promise.all([
    db.collection(COLLECTIONS.targets).doc(rawTargetId).set({
      sourceDataObservedAt: Timestamp.fromMillis(BASE_NOW.getTime() + 1_000),
      updatedAt: Timestamp.fromMillis(BASE_NOW.getTime() + 1_000),
    }, { merge: true }),
    db.collection(COLLECTIONS.targetDetails).doc(rawTargetId).set({
      sourceDataObservedAt: Timestamp.fromMillis(BASE_NOW.getTime() + 1_000),
      updatedAt: Timestamp.fromMillis(BASE_NOW.getTime() + 1_000),
    }, { merge: true }),
    db.collection(COLLECTIONS.providerRetention).doc("retention_provider_raw_payload").set({
      ...dependencyBase(rawTargetId, "providerSourceRetentionId", "retention_provider_raw_payload"),
      lastRefreshedAt: Timestamp.fromMillis(BASE_NOW.getTime() + 1_000),
      provider: "google-places",
      providerRecordId: "sensitive_provider_refresh_epoch_2",
      providerRecordUrl: "https://example.test/provider-refresh-epoch-2",
      rawPayloadStored: true,
      refreshDueAt: Timestamp.fromMillis(BASE_NOW.getTime() - 2_000),
      retentionExpiresAt: Timestamp.fromMillis(BASE_NOW.getTime() - 1_000),
      sourcePolicyId: rawPolicyId,
      sourceRunId: `run_${rawTargetId}`,
      status: "active",
      targetName: `Sensitive ${rawTargetId}`,
    }),
    db.collection(COLLECTIONS.contacts).doc(`contact_${rawTargetId}`).set({
      ...dependencyBase(rawTargetId, "identityId", `contact_${rawTargetId}`),
      channel: "email",
      permissionState: "permissioned",
      sourcePolicyId: rawPolicyId,
      sourceRunId: `run_${rawTargetId}`,
      value: "refresh-epoch-2@example.test",
    }),
  ]);
  const secondEpoch = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxAuthorities: 10,
    maxReconciliationSteps: 500,
    maxTargets: 10,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + 2_000),
  });
  assert.equal(secondEpoch.completedTargetCount, 1);
  assert.equal(
    (await db.collection(COLLECTIONS.contacts).doc(`contact_${rawTargetId}`).get()).get("value"),
    undefined,
    "second malformed provider epoch collided with the first quarantine token",
  );
  assert.equal(
    (await db.collection(COLLECTIONS.audits)
      .where("action", "==", "provider_source_retention_quarantined_target_held")
      .get()).size,
    3,
  );
};

const testPerRecordEnrichmentExpiry = async (): Promise<void> => {
  await cleanup();
  const policyId = "policy_future_enrichment_record";
  const targetId = "target_future_enrichment_record";
  await seedPolicy({
    expiresAt: new Date(BASE_NOW.getTime() + (30 * 24 * 60 * 60 * 1000)),
    id: policyId,
  });
  await seedTarget(targetId, policyId);
  const enrichmentRef = db.collection(COLLECTIONS.enrichment).doc("enrichment_record_expired");
  const malformedEnrichmentRef = db.collection(COLLECTIONS.enrichment).doc("00_enrichment_record_malformed");
  await Promise.all([
    enrichmentRef.set({
      ...dependencyBase(targetId, "enrichmentResultId", enrichmentRef.id),
      confidence: "high",
      expiresAt: Timestamp.fromMillis(BASE_NOW.getTime() - 1_000),
      field: "email",
      provider: "google-places",
      sourcePolicyId: policyId,
      status: "verified",
      targetName: "Sensitive target",
      value: "owner@example.test",
      valuePreview: "owner@...",
    }),
    malformedEnrichmentRef.set({
      ...dependencyBase(targetId, "enrichmentResultId", "wrong_enrichment_identity"),
      confidence: "high",
      expiresAt: Timestamp.fromMillis(BASE_NOW.getTime() - 1_000),
      field: "phone",
      provider: "google-places",
      sourcePolicyId: policyId,
      status: "verified",
      targetName: "Sensitive target",
      value: "+919999999999",
      valuePreview: "+91...",
    }),
  ]);
  const result = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxReconciliationSteps: 0,
    now: Timestamp.fromDate(BASE_NOW),
  });
  assert.equal(result.scannedDueEnrichmentCount, 2);
  assert.equal(result.scrubbedExpiredEnrichmentCount, 2);
  const [target, enrichment, malformedEnrichment, control] = await Promise.all([
    db.collection(COLLECTIONS.targets).doc(targetId).get(),
    enrichmentRef.get(),
    malformedEnrichmentRef.get(),
    db.collection(COLLECTIONS.control).doc("dashboard").get(),
  ]);
  assert.equal(target.get("sourceDataLifecycleState"), "active", "record expiry held the whole target");
  assert.equal(target.get("status"), "ready");
  assert.equal(enrichment.get("value"), undefined);
  assert.equal(enrichment.get("valuePreview"), null);
  assert.equal(enrichment.get("expiresAt"), null);
  assert.equal(enrichment.get("sourceDataLifecycleState"), "completed");
  assert.equal(malformedEnrichment.get("value"), undefined);
  assert.equal(malformedEnrichment.get("expiresAt"), null);
  assert.match(String(malformedEnrichment.get("sourceDataLifecycleInputFailureCode")), /^SIGNALDESK_/);
  assert.equal(control.get("incidentCount"), 1);
  assert.equal(control.get("openIncidentCount"), 1);
  assert.equal(control.get("safetyStatus"), "blocked");
  const repeated = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxReconciliationSteps: 0,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + 1_000),
  });
  assert.equal(repeated.scannedDueEnrichmentCount, 0);
  assert.equal(repeated.scrubbedExpiredEnrichmentCount, 0);
};

const testHistoricalEvidenceExpiresAfterTargetRefresh = async (): Promise<void> => {
  await cleanup();
  const policyId = "policy_future_evidence_record";
  const targetId = "target_future_evidence_record";
  const evidencePacketId = "evidence_historical_source_run";
  const observedAt = Timestamp.fromMillis(BASE_NOW.getTime() - (5 * 86_400_000));
  const expiresAt = Timestamp.fromMillis(BASE_NOW.getTime() - 1_000);
  await seedPolicy({
    expiresAt: new Date(BASE_NOW.getTime() + (30 * 24 * 60 * 60 * 1000)),
    id: policyId,
  });
  await seedTarget(targetId, policyId);
  const commonEvidence = {
    allowedUse: ["evidence", "draft-personalization"],
    confidence: "high",
    createdAt: observedAt,
    evidencePacketId,
    pId: "SD",
    rejectedFacts: ["Owner control was not verified."],
    summary: "Sensitive historical evidence summary.",
    targetId,
    targetName: "Sensitive historical target",
    updatedAt: observedAt,
  };
  await Promise.all([
    db.collection(COLLECTIONS.evidence).doc(evidencePacketId).set({
      ...commonEvidence,
      facts: { currentListUrl: "https://example.test/historical-menu" },
      sourceDataExpiresAt: expiresAt,
      sourceDataLifecycleState: "active",
      sourceDataObservedAt: observedAt,
      sourcePolicyId: policyId,
      sourceRunId: "run_historical_evidence",
    }),
    db.collection(COLLECTIONS.evidenceSummaries).doc(evidencePacketId).set(commonEvidence),
  ]);

  const result = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxReconciliationSteps: 0,
    now: Timestamp.fromDate(BASE_NOW),
  });
  assert.equal(result.scannedDueEvidenceCount, 1);
  assert.equal(result.scrubbedExpiredEvidenceCount, 1);
  const [target, detail, summary] = await Promise.all([
    db.collection(COLLECTIONS.targets).doc(targetId).get(),
    db.collection(COLLECTIONS.evidence).doc(evidencePacketId).get(),
    db.collection(COLLECTIONS.evidenceSummaries).doc(evidencePacketId).get(),
  ]);
  assert.equal(target.get("sourceDataLifecycleState"), "active", "historical evidence expiry held the refreshed target");
  for (const snapshot of [detail, summary]) {
    assert.equal(snapshot.get("sourceDataLifecycleState"), "completed");
    assert.equal(snapshot.get("targetName"), "Retained target record");
    assert.equal(snapshot.get("summary"), "Source-derived evidence removed by retention policy.");
    assert.deepEqual(snapshot.get("allowedUse"), []);
    assert.equal(snapshot.get("sourceDataPayloadStored"), false);
  }
  assert.equal(detail.get("facts"), undefined);

  const repeated = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxReconciliationSteps: 0,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + 1_000),
  });
  assert.equal(repeated.scannedDueEvidenceCount, 0);
  assert.equal(repeated.scrubbedExpiredEvidenceCount, 0);
};

const testAiDetailBackfillAndNinetyDayExpiry = async (): Promise<void> => {
  await cleanup();
  const oldCreatedAt = Timestamp.fromMillis(BASE_NOW.getTime() - (91 * 86_400_000));
  const recentCreatedAt = Timestamp.fromMillis(BASE_NOW.getTime() - (10 * 86_400_000));
  const oldScoreId = "score_ai_detail_old";
  const oldVolumeId = "ai_volume_detail_old";
  const recentAssistId = "ai_assist_detail_recent";
  const lockId = "ai_volume_global_lock";
  await Promise.all([
    db.collection(COLLECTIONS.aiRuns).doc(oldScoreId).set({
      contactabilityScore: 80,
      costEstimate: 0,
      createdAt: oldCreatedAt,
      currentListGapScore: 75,
      fitScore: 85,
      nextAction: "review",
      pId: "SD",
      reasons: ["Sensitive source-derived score reason"],
      riskScore: 15,
      scoreId: oldScoreId,
      segment: "a",
      targetId: "target_ai_detail_old",
      updatedAt: oldCreatedAt,
      workerType: "target_score",
      workerVersion: "rules-v1",
    }),
    db.collection(COLLECTIONS.aiRuns).doc(oldVolumeId).set({
      aiRunId: oldVolumeId,
      childRunIds: ["ai_child_detail_old"],
      completedAt: oldCreatedAt,
      completedPairCount: 1,
      createdAt: oldCreatedAt,
      createdBy: "fixture-operator",
      estimatedCostUsd: 0.01,
      failedPairCount: 0,
      failureCodes: [],
      instruction: "Sensitive founder instruction",
      lockExpiresAt: null,
      maxEstimatedCostUsd: 1,
      modelCallCount: 1,
      pId: "SD",
      requestedPairCount: 1,
      status: "completed",
      targetIds: ["target_ai_volume_old"],
      tasks: ["score"],
      updatedAt: oldCreatedAt,
      volumeRunId: oldVolumeId,
      workerType: "ai_volume_batch",
      workerVersion: "ai-volume-v1",
    }),
    db.collection(COLLECTIONS.aiRuns).doc(recentAssistId).set({
      aiRunId: recentAssistId,
      confidence: "high",
      costEstimate: 0.01,
      createdAt: recentCreatedAt,
      initialOutput: { body: "Sensitive recent initial output" },
      model: "gemini-fixture",
      modelEvalId: "model_eval_fixture",
      modelRouteId: "model_route_draft",
      output: { body: "Sensitive recent output" },
      pId: "SD",
      provider: "gemini",
      targetId: "target_ai_detail_recent",
      task: "draft",
      updatedAt: recentCreatedAt,
      workerType: "ai_assist_draft",
      workerVersion: "fixture-v1",
    }),
    db.collection(COLLECTIONS.aiRuns).doc(lockId).set({
      activeVolumeRunId: oldVolumeId,
      createdAt: oldCreatedAt,
      expiresAt: oldCreatedAt,
      pId: "SD",
      status: "completed",
      updatedAt: oldCreatedAt,
      workerType: "ai_volume_lock",
    }),
  ]);

  const first = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxAuthorities: 20,
    maxReconciliationSteps: 0,
    now: Timestamp.fromDate(BASE_NOW),
  });
  assert.equal(first.aiDetailBackfillCompleted, true);
  assert.equal(first.backfilledAiDetailCount, 4);
  assert.equal(first.scrubbedExpiredAiDetailCount, 2);
  const [oldScore, oldVolume, recentAssist, volumeLock] = await Promise.all([
    db.collection(COLLECTIONS.aiRuns).doc(oldScoreId).get(),
    db.collection(COLLECTIONS.aiRuns).doc(oldVolumeId).get(),
    db.collection(COLLECTIONS.aiRuns).doc(recentAssistId).get(),
    db.collection(COLLECTIONS.aiRuns).doc(lockId).get(),
  ]);
  assert.deepEqual(oldScore.get("reasons"), ["Source-derived details expired; re-score after a verified source refresh."]);
  assert.equal(oldScore.get("aiDetailLifecycleState"), "completed");
  assert.equal(oldVolume.get("instruction"), null);
  assert.deepEqual(oldVolume.get("targetIds"), []);
  assert.equal(oldVolume.get("requestedPairCount"), 1, "AI volume summary count was erased with detail");
  assert.equal(recentAssist.get("aiDetailLifecycleState"), "active");
  assert.deepEqual(recentAssist.get("output"), { body: "Sensitive recent output" });
  assert.equal(volumeLock.get("aiDetailLifecycleState"), "not-applicable");

  const afterRecentExpiry = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxAuthorities: 20,
    maxReconciliationSteps: 0,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + (81 * 86_400_000)),
  });
  assert.equal(afterRecentExpiry.scannedDueAiDetailCount, 1);
  assert.equal(afterRecentExpiry.scrubbedExpiredAiDetailCount, 1);
  const expiredRecentAssist = await db.collection(COLLECTIONS.aiRuns).doc(recentAssistId).get();
  assert.equal(expiredRecentAssist.get("output"), null);
  assert.equal(expiredRecentAssist.get("initialOutput"), null);
  assert.equal(expiredRecentAssist.get("aiDetailLifecycleState"), "completed");
};

const testTargetSpecificExpirySurvivesPolicyRenewal = async (): Promise<void> => {
  await cleanup();
  const policyId = "policy_renewed_after_target_observation";
  const targetId = "target_with_older_record_expiry";
  await seedPolicy({
    expiresAt: new Date(BASE_NOW.getTime() + (60 * 86_400_000)),
    id: policyId,
  });
  await seedTarget(targetId, policyId);
  await db.collection(COLLECTIONS.targets).doc(targetId).set({
    sourceDataExpiresAt: Timestamp.fromMillis(BASE_NOW.getTime() - 1_000),
  }, { merge: true });
  await db.collection(COLLECTIONS.targetDetails).doc(targetId).set({
    sourceDataExpiresAt: Timestamp.fromMillis(BASE_NOW.getTime() - 1_000),
  }, { merge: true });
  await db.collection(COLLECTIONS.contacts).doc(`contact_${targetId}`).set({
    ...dependencyBase(targetId, "identityId", `contact_${targetId}`),
    channel: "email",
    permissionState: "permissioned",
    sourcePolicyId: policyId,
    sourceRunId: `run_${targetId}`,
    value: "renewal-stale@example.test",
  });

  const result = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxAuthorities: 10,
    maxReconciliationSteps: 200,
    maxTargets: 10,
    now: Timestamp.fromDate(BASE_NOW),
  });
  assert.equal(result.scannedDuePolicyCount, 0, "future policy was incorrectly treated as expired");
  assert.equal(result.scannedDueTargetCount, 1);
  assert.equal(result.completedTargetCount, 1);
  const [target, contact] = await Promise.all([
    db.collection(COLLECTIONS.targets).doc(targetId).get(),
    db.collection(COLLECTIONS.contacts).doc(`contact_${targetId}`).get(),
  ]);
  assert.equal(target.get("sourceDataLifecycleState"), "completed");
  assert.equal(target.get("sourceDataLifecycleReason"), "target-expired");
  assert.equal(contact.get("value"), undefined, "renewed policy preserved expired target contact data");

  await cleanup();
  const missingPolicyId = "policy_missing_for_expired_target";
  const missingPolicyTargetId = "target_expired_with_missing_policy";
  const expiredBase = targetBase(missingPolicyTargetId, missingPolicyId);
  await Promise.all([
    db.collection(COLLECTIONS.targets).doc(missingPolicyTargetId).set(expiredBase),
    db.collection(COLLECTIONS.targetDetails).doc(missingPolicyTargetId).set({
      ...expiredBase,
      email: "missing-policy@example.test",
      identityHash: "e".repeat(64),
    }),
    db.collection(COLLECTIONS.contacts).doc(`contact_${missingPolicyTargetId}`).set({
      ...dependencyBase(missingPolicyTargetId, "identityId", `contact_${missingPolicyTargetId}`),
      channel: "email",
      permissionState: "permissioned",
      sourcePolicyId: missingPolicyId,
      sourceRunId: `run_${missingPolicyTargetId}`,
      value: "missing-policy@example.test",
    }),
  ]);
  const missingPolicyResult = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxAuthorities: 10,
    maxReconciliationSteps: 200,
    maxTargets: 10,
    now: Timestamp.fromDate(BASE_NOW),
  });
  assert.equal(missingPolicyResult.quarantinedLegacyTargetCount, 1);
  assert.equal(missingPolicyResult.scannedDueTargetCount, 0);
  assert.equal(missingPolicyResult.completedTargetCount, 1);
  assert.equal(
    (await db.collection(COLLECTIONS.contacts).doc(`contact_${missingPolicyTargetId}`).get()).get("value"),
    undefined,
    "missing policy permanently blocked expired target scrub",
  );
};

const testMalformedCommercialOpportunityIsolation = async (): Promise<void> => {
  await cleanup();
  const policyId = "policy_commercial_poison_isolation";
  const poisonTargetId = "target_00_commercial_poison";
  const cleanTargetId = "target_01_commercial_clean";
  const accountId = "revenue_commercial_poison";
  const opportunityId = "opportunity_commercial_poison";
  await seedPolicy({ id: policyId });
  await Promise.all([
    seedTarget(poisonTargetId, policyId),
    seedTarget(cleanTargetId, policyId),
  ]);
  await Promise.all([
    db.collection(COLLECTIONS.revenueAccounts).doc(accountId).set(revenueAccountFixture({
      engagementState: "contactable",
      id: accountId,
      sourcePolicyId: policyId,
      targetId: poisonTargetId,
    })),
    db.collection(COLLECTIONS.revenueOpportunities).doc(opportunityId).set({
      ...opportunityFixture({
        id: opportunityId,
        probabilityPercent: 20,
        revenueAccountId: accountId,
        targetId: poisonTargetId,
        valueMinor: 1_000,
      }),
      stage: "won",
      status: "open",
    }),
    db.collection(COLLECTIONS.revenueSummaries).doc("current").set({
      openOpportunityCount: 1,
      pId: "SD",
      pipelineCurrency: "USD",
      pipelineValueMinor: 1_000,
      revenueControlSummaryId: "current",
      updatedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 5_000),
      weightedPipelineValueMinor: 200,
    }),
  ]);

  const first = await runSignalDeskSourceDataLifecycle({
    dependencyPageSize: 10,
    firestore: db,
    maxAuthorities: 10,
    maxReconciliationSteps: 500,
    maxTargets: 10,
    now: Timestamp.fromDate(BASE_NOW),
  });
  assert.equal(first.failedTargetCount, 1);
  assert.equal(first.completedTargetCount, 1, "malformed commercial target starved a later clean target");
  const unchangedSummary = await db.collection(COLLECTIONS.revenueSummaries).doc("current").get();
  assert.equal(unchangedSummary.get("openOpportunityCount"), 1);
  assert.equal(unchangedSummary.get("pipelineValueMinor"), 1_000);
  assert.equal(unchangedSummary.get("weightedPipelineValueMinor"), 200);

  await db.collection(COLLECTIONS.revenueOpportunities).doc(opportunityId).set({
    stage: "qualified",
    status: "open",
  }, { merge: true });
  const retried = await runSignalDeskSourceDataLifecycle({
    dependencyPageSize: 10,
    firestore: db,
    maxAuthorities: 10,
    maxReconciliationSteps: 500,
    maxTargets: 10,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + (5 * 60 * 1_000)),
  });
  assert.equal(retried.retriedTargetCount, 1);
  assert.equal(retried.completedTargetCount, 1);
  const [opportunity, reconciledSummary] = await Promise.all([
    db.collection(COLLECTIONS.revenueOpportunities).doc(opportunityId).get(),
    db.collection(COLLECTIONS.revenueSummaries).doc("current").get(),
  ]);
  assert.equal(opportunity.get("status"), "nurture");
  assert.equal(opportunity.get("currency"), null);
  assert.equal(reconciledSummary.get("openOpportunityCount"), 0);
  assert.equal(reconciledSummary.get("pipelineValueMinor"), 0);
  assert.equal(reconciledSummary.get("weightedPipelineValueMinor"), 0);
  assert.equal(reconciledSummary.get("pipelineCurrency"), null);
};

const testPoisonIsolationRetryAndStaleFailure = async (): Promise<void> => {
  await cleanup();
  const poisonPolicy = "policy_poison";
  const cleanPolicy = "policy_clean";
  const poisonTarget = "target_00_poison";
  const cleanTarget = "target_01_clean";
  await Promise.all([seedPolicy({ id: poisonPolicy }), seedPolicy({ id: cleanPolicy })]);
  await Promise.all([seedTarget(poisonTarget, poisonPolicy), seedTarget(cleanTarget, cleanPolicy)]);
  await db.collection(COLLECTIONS.contacts).doc(`contact_${poisonTarget}`).set({
    ...dependencyBase(poisonTarget, "identityId", `contact_${poisonTarget}`),
    channel: "email",
    permissionState: "permissioned",
    sourcePolicyId: poisonPolicy,
    sourceRunId: `run_${poisonTarget}`,
  });
  const first = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxAuthorities: 10,
    maxReconciliationSteps: 200,
    now: Timestamp.fromDate(BASE_NOW),
  });
  assert.equal(first.failedTargetCount, 1);
  assert.equal(first.completedTargetCount, 1, "poison target starved a later clean target");
  assert.equal((await db.collection(COLLECTIONS.targets).doc(poisonTarget).get()).get("sourceDataLifecycleState"), "failed");
  assert.equal((await db.collection(COLLECTIONS.targets).doc(cleanTarget).get()).get("sourceDataLifecycleState"), "completed");

  await db.collection(COLLECTIONS.contacts).doc(`contact_${poisonTarget}`).set({ value: "fixed@example.test" }, { merge: true });
  const retried = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxReconciliationSteps: 200,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + (5 * 60 * 1000)),
  });
  assert.equal(retried.retriedTargetCount, 1);
  assert.equal(retried.completedTargetCount, 1);
  assert.equal((await db.collection(COLLECTIONS.targets).doc(poisonTarget).get()).get("sourceDataLifecycleState"), "completed");

  const staleTargetRef = db.collection(COLLECTIONS.targets).doc(poisonTarget);
  const staleSnapshot = await staleTargetRef.get();
  const staleHash = signalDeskSourceDataLifecycleAuthorityHash(staleSnapshot.data());
  await staleTargetRef.set({
    ...targetBase(poisonTarget, poisonPolicy),
    sourceDataObservedAt: Timestamp.fromMillis(BASE_NOW.getTime() + (10 * 60 * 1000)),
    updatedAt: Timestamp.fromMillis(BASE_NOW.getTime() + (10 * 60 * 1000)),
  });
  const recorded = await recordSignalDeskSourceDataLifecycleFailure({
    authorityKind: "target",
    authorityRef: staleTargetRef,
    error: new Error("SIGNALDESK_STALE_TEST_FAILURE"),
    expectedAuthorityHash: staleHash,
    firestore: db,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + (11 * 60 * 1000)),
    phase: "pending",
  });
  assert.equal(recorded, false);
  const freshTarget = await staleTargetRef.get();
  assert.equal(freshTarget.get("sourceDataLifecycleState"), "active");
  assert.equal(freshTarget.get("status"), "ready");
};

const testLegacyTargetLifecycleBackfillAndMalformedConvergence = async (): Promise<void> => {
  await cleanup();
  const policyId = "policy_legacy_target_backfill";
  const legacyTargetId = "target_legacy_initial";
  const legacySourceRunId = `run_${legacyTargetId}`;
  const observedAt = new Date(BASE_NOW.getTime() - (10 * 86_400_000));
  await seedPolicy({
    expiresAt: new Date(BASE_NOW.getTime() + (90 * 86_400_000)),
    id: policyId,
  });
  await seedSourceRun({ createdAt: observedAt, sourcePolicyId: policyId, sourceRunId: legacySourceRunId });
  const legacy = {
    ...targetBase(legacyTargetId, policyId),
    sourceRunId: legacySourceRunId,
    unexpectedSourcePayload: { email: "legacy-sensitive@example.test" },
  } as Record<string, unknown>;
  delete legacy.sourceDataExpiresAt;
  delete legacy.sourceDataLifecycleState;
  delete legacy.sourceDataObservedAt;
  await db.collection(COLLECTIONS.targets).doc(legacyTargetId).set(legacy);

  const initial = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxAuthorities: 20,
    maxReconciliationSteps: 0,
    maxTargets: 20,
    now: Timestamp.fromDate(BASE_NOW),
  });
  assert.equal(initial.scannedTargetLifecycleBackfillCount, 1);
  assert.equal(initial.backfilledTargetLifecycleCount, 1);
  assert.equal(initial.targetLifecycleBackfillCompleted, true);
  const migrated = await db.collection(COLLECTIONS.targets).doc(legacyTargetId).get();
  const frozenExpiry = migrated.get("sourceDataExpiresAt") as FirebaseFirestore.Timestamp;
  assert.equal(migrated.get("sourceDataLifecycleState"), "active");
  assert.equal(migrated.get("sourceDataObservedAt").toMillis(), observedAt.getTime());
  assert.equal(frozenExpiry.toMillis(), observedAt.getTime() + (30 * 86_400_000));
  assert.equal(migrated.get("sourceDataRetentionDaysApplied"), 30);
  assert.equal(migrated.get("unexpectedSourcePayload"), undefined);

  await db.collection(COLLECTIONS.policies).doc(policyId).set({
    expiresAt: Timestamp.fromMillis(BASE_NOW.getTime() + (180 * 86_400_000)),
    retentionDays: 60,
    updatedAt: Timestamp.fromMillis(BASE_NOW.getTime() + 1_000),
  }, { merge: true });
  await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxAuthorities: 20,
    maxReconciliationSteps: 0,
    maxTargets: 20,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + 2_000),
  });
  assert.equal(
    (await db.collection(COLLECTIONS.targets).doc(legacyTargetId).get()).get("sourceDataExpiresAt").toMillis(),
    frozenExpiry.toMillis(),
    "same-policy renewal extended a previously frozen source observation",
  );

  const catchupTargetId = "target_legacy_post_completion";
  const catchupRunId = `run_${catchupTargetId}`;
  await seedSourceRun({ createdAt: observedAt, sourcePolicyId: policyId, sourceRunId: catchupRunId });
  const catchup = {
    ...targetBase(catchupTargetId, policyId),
    sourceRunId: catchupRunId,
  } as Record<string, unknown>;
  delete catchup.sourceDataExpiresAt;
  delete catchup.sourceDataLifecycleState;
  delete catchup.sourceDataObservedAt;
  await db.collection(COLLECTIONS.targets).doc(catchupTargetId).set(catchup);
  const incremental = await runSignalDeskSourceDataLifecycle({
    firestore: db,
    maxAuthorities: 20,
    maxReconciliationSteps: 0,
    maxTargets: 20,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + 3_000),
  });
  assert.equal(incremental.backfilledTargetLifecycleCount, 1, "completed initial cursor did not catch a later legacy target");
  assert.equal(
    (await db.collection(COLLECTIONS.targets).doc(catchupTargetId).get()).get("sourceDataLifecycleState"),
    "active",
  );

  const malformedTargetId = "target_legacy_unverifiable_due";
  const missingPolicyId = "policy_legacy_missing";
  const malformed = {
    ...targetBase(malformedTargetId, missingPolicyId),
    sourceDataObservedAt: "not-a-timestamp",
    sourceRunId: null,
    unexpectedSourcePayload: "must-be-removed",
  };
  await Promise.all([
    db.collection(COLLECTIONS.targets).doc(malformedTargetId).set(malformed),
    db.collection(COLLECTIONS.targetDetails).doc(malformedTargetId).set({
      ...malformed,
      email: "unverifiable@example.test",
      identityHash: "9".repeat(64),
      rawProviderPayload: { placeId: "sensitive" },
    }),
    db.collection(COLLECTIONS.contacts).doc(`contact_${malformedTargetId}`).set({
      ...dependencyBase(malformedTargetId, "identityId", `contact_${malformedTargetId}`),
      channel: "email",
      permissionState: "permissioned",
      rawLegacyPayload: "sensitive-contact-payload",
      sourcePolicyId: missingPolicyId,
      sourceRunId: `run_${malformedTargetId}`,
      value: "unverifiable@example.test",
    }),
    db.collection(COLLECTIONS.sourceCandidates).doc(`candidate_${malformedTargetId}`).set({
      ...dependencyBase(malformedTargetId, "sourceCandidateId", `candidate_${malformedTargetId}`),
      blocked: false,
      displayName: "Unverifiable candidate",
      permissionEvidenceRef: "https://example.test/proof",
      rawLegacyPayload: { owner: "sensitive" },
      sourcePolicyId: missingPolicyId,
      sourceRunId: `run_${malformedTargetId}`,
    }),
  ]);
  const converged = await runSignalDeskSourceDataLifecycle({
    dependencyPageSize: 10,
    firestore: db,
    maxAuthorities: 20,
    maxReconciliationSteps: 500,
    maxTargets: 1,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + 4_000),
  });
  assert.equal(converged.quarantinedLegacyTargetCount, 0);
  assert.equal(converged.scannedDueTargetCount, 1);
  assert.equal(converged.materializedTargetCount, 1);
  assert.equal(converged.completedTargetCount, 1);
  assert.equal(converged.failedTargetCount, 0, "malformed due authority entered an unrearmable failed state");
  const [quarantined, detail, contact, candidate] = await Promise.all([
    db.collection(COLLECTIONS.targets).doc(malformedTargetId).get(),
    db.collection(COLLECTIONS.targetDetails).doc(malformedTargetId).get(),
    db.collection(COLLECTIONS.contacts).doc(`contact_${malformedTargetId}`).get(),
    db.collection(COLLECTIONS.sourceCandidates).doc(`candidate_${malformedTargetId}`).get(),
  ]);
  assert.equal(quarantined.get("sourceDataLifecycleState"), "completed");
  assert.equal(quarantined.get("sourceDataLifecycleReason"), "legacy-unverifiable");
  assert.match(String(quarantined.get("sourceDataLifecycleInputFailureCode")), /^SIGNALDESK_/);
  assert.equal(quarantined.get("unexpectedSourcePayload"), undefined);
  assert.equal(detail.get("rawProviderPayload"), undefined);
  assert.equal(contact.get("value"), undefined);
  assert.equal(contact.get("rawLegacyPayload"), undefined);
  assert.equal(candidate.get("rawLegacyPayload"), undefined);
};

const testCompletedTombstoneRepairAndLegalRecount = async (): Promise<void> => {
  await cleanup();
  const policyId = "policy_completed_tombstone_repair";
  const targetId = "target_completed_tombstone_repair";
  await seedPolicy({ id: policyId });
  await seedTarget(targetId, policyId);
  await seedDependencies(targetId, policyId);
  const aiRunId = `ai_${targetId}`;
  const providerTokenId = `retention_completed_provider_token_${targetId}`;
  const providerToken = `source_data_provider_${"7".repeat(40)}`;
  await Promise.all([
    db.collection(COLLECTIONS.aiRuns).doc(aiRunId).set({
      ...dependencyBase(targetId, "aiRunId", aiRunId),
      criticReasons: ["sensitive critic detail"],
      initialOutput: { score: 90 },
      instruction: "Sensitive source-derived instruction",
      output: { decision: "contact" },
      reasons: ["Sensitive source reason"],
      reviewReason: "Sensitive review detail",
      sourcePolicyId: policyId,
      workerType: "target_score",
      workerVersion: "rules-v1",
    }),
    db.collection(COLLECTIONS.providerRetention).doc(providerTokenId).set({
      ...dependencyBase(targetId, "providerSourceRetentionId", providerTokenId),
      lastRefreshedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 20_000),
      provider: "google-places",
      providerIdentityHash: "8".repeat(64),
      providerRecordId: null,
      providerRecordUrl: null,
      rawPayloadStored: false,
      refreshDueAt: Timestamp.fromMillis(BASE_NOW.getTime() - 2_000),
      retentionExpiresAt: Timestamp.fromMillis(BASE_NOW.getTime() - 1_000),
      sourceDataLifecycleCompletedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 500),
      sourceDataLifecycleKind: "source-data-retention-v1",
      sourceDataLifecycleState: "completed",
      sourceDataLifecycleToken: providerToken,
      sourcePolicyId: policyId,
      sourceRunId: `run_${targetId}`,
      status: "expired",
      targetName: "Retained target record",
      updatedAt: Timestamp.fromMillis(BASE_NOW.getTime() - 400),
      updatedBy: "signaldesk-source-data-lifecycle",
    }),
  ]);
  const initial = await runSignalDeskSourceDataLifecycle({
    dependencyPageSize: 10,
    firestore: db,
    maxAuthorities: 20,
    maxReconciliationSteps: 500,
    maxTargets: 20,
    now: Timestamp.fromDate(BASE_NOW),
  });
  assert.equal(initial.completedTargetCount, 1);
  assert.equal((await db.collection(COLLECTIONS.aiRuns).doc(aiRunId).get()).get("instruction"), null);
  assert.equal(
    (await db.collection(COLLECTIONS.providerRetention).doc(providerTokenId).get()).get("sourceDataLifecycleToken"),
    providerToken,
    "valid provider-token tombstone was rewritten",
  );

  await Promise.all([
    db.collection(COLLECTIONS.targets).doc(targetId).set({
      unexpectedSourcePayload: { privateOwnerData: "repopulated" },
    }, { merge: true }),
    db.collection(COLLECTIONS.targetDetails).doc(targetId).set({
      rawProviderPayload: { placeId: "repopulated" },
    }, { merge: true }),
    db.collection(COLLECTIONS.contacts).doc(`contact_${targetId}`).set({
      rawLegacyPayload: "repopulated-contact",
      value: "repopulated@example.test",
    }, { merge: true }),
    db.collection(COLLECTIONS.providerRetention).doc(`retention_${targetId}`).set({
      providerRecordId: "repopulated-provider-id",
      providerRecordUrl: "https://example.test/repopulated-provider-id",
      rawLegacyPayload: { place: "repopulated" },
    }, { merge: true }),
    db.collection(COLLECTIONS.sourceCandidates).doc(`candidate_${targetId}`).set({
      rawLegacyPayload: { candidate: "repopulated" },
      sourceDataLifecycleKind: "malformed-lifecycle-kind",
      updatedBy: "untrusted-writer",
      website: "https://example.test/repopulated",
    }, { merge: true }),
    db.collection(COLLECTIONS.aiRuns).doc(aiRunId).set({
      instruction: "Repopulated sensitive instruction",
      rawLegacyPayload: { prompt: "repopulated" },
    }, { merge: true }),
  ]);
  const repaired = await runSignalDeskSourceDataLifecycle({
    dependencyPageSize: 10,
    firestore: db,
    maxAuthorities: 20,
    maxReconciliationSteps: 500,
    maxTargets: 20,
    now: Timestamp.fromMillis(BASE_NOW.getTime() + 1_000),
  });
  assert.equal(repaired.materializedTargetCount, 1);
  assert.equal(repaired.completedTargetCount, 1);
  assert.equal(repaired.legalRetentionReviewCount, 8, "old-token legal rows were not recounted");
  const [target, detail, contact, provider, candidate, aiRun, providerTokenRow] = await Promise.all([
    db.collection(COLLECTIONS.targets).doc(targetId).get(),
    db.collection(COLLECTIONS.targetDetails).doc(targetId).get(),
    db.collection(COLLECTIONS.contacts).doc(`contact_${targetId}`).get(),
    db.collection(COLLECTIONS.providerRetention).doc(`retention_${targetId}`).get(),
    db.collection(COLLECTIONS.sourceCandidates).doc(`candidate_${targetId}`).get(),
    db.collection(COLLECTIONS.aiRuns).doc(aiRunId).get(),
    db.collection(COLLECTIONS.providerRetention).doc(providerTokenId).get(),
  ]);
  assert.equal(target.get("unexpectedSourcePayload"), undefined);
  assert.equal(target.get("lastSourceDataLifecycleResult.legalRetentionReviewCount"), 8);
  assert.equal(detail.get("rawProviderPayload"), undefined);
  assert.equal(contact.get("value"), undefined);
  assert.equal(contact.get("rawLegacyPayload"), undefined);
  assert.equal(provider.get("providerRecordId"), null);
  assert.equal(provider.get("providerRecordUrl"), null);
  assert.equal(provider.get("rawLegacyPayload"), undefined);
  assert.equal(candidate.get("website"), undefined);
  assert.equal(candidate.get("rawLegacyPayload"), undefined);
  assert.equal(candidate.get("sourceDataLifecycleKind"), "source-data-retention-v1");
  assert.equal(candidate.get("updatedBy"), "signaldesk-source-data-lifecycle");
  assert.equal(aiRun.get("instruction"), null);
  assert.equal(aiRun.get("rawLegacyPayload"), undefined);
  assert.equal(providerTokenRow.get("sourceDataLifecycleToken"), providerToken);
  const completionToken = String(target.get("lastSourceDataLifecycleToken"));
  const completionTimelineId = `source_data_${createHash("sha256")
    .update(`target|${completionToken}`)
    .digest("hex")
    .slice(0, 40)}`;
  assert.equal(
    (await db.collection(COLLECTIONS.timelines).doc(completionTimelineId).get()).get("status"),
    "held",
    "legal-review recount did not keep the completed lifecycle timeline held",
  );
};

const testOverflowAndIndependentSchedulerLeases = async (): Promise<void> => {
  await cleanup();
  for (let index = 0; index < 3; index += 1) {
    await seedPolicy({ id: `policy_overflow_${index}` });
  }
  const overflow = await runSignalDeskSourceDataLifecycle({
    authorityPageSize: 2,
    firestore: db,
    maxAuthorities: 2,
    maxReconciliationSteps: 0,
    now: Timestamp.fromDate(BASE_NOW),
  });
  assert.equal(overflow.duePolicyOverflow, true);
  assert.equal(overflow.scannedDuePolicyCount, 2);

  await cleanup();
  const results = await Promise.all([
    runSignalDeskMaintenanceScheduler({ firestore: db, now: BASE_NOW, runId: "source_overlap_a" }),
    runSignalDeskMaintenanceScheduler({ firestore: db, now: BASE_NOW, runId: "source_overlap_b" }),
  ]);
  const taskStatuses = results.flatMap(result => result.tasks).reduce<Record<string, number>>((counts, task) => {
    counts[`${task.name}:${task.status}`] = (counts[`${task.name}:${task.status}`] || 0) + 1;
    return counts;
  }, {});
  assert.equal(taskStatuses["proof_permission_lifecycle:success"], 1);
  assert.equal(taskStatuses["source_data_lifecycle:success"], 1);
  assert.equal(taskStatuses["proof_permission_lifecycle:skipped"], 1);
  assert.equal(taskStatuses["source_data_lifecycle:skipped"], 1);
  const state = await db.collection(COLLECTIONS.system).doc("signaldeskMaintenanceScheduler").get();
  assert.equal(state.get("tasks.proof_permission_lifecycle.lastStatus"), "success");
  assert.equal(state.get("tasks.source_data_lifecycle.lastStatus"), "success");
  const duplicate = await runSignalDeskMaintenanceScheduler({
    firestore: db,
    now: new Date(BASE_NOW.getTime() + 1_000),
    runId: "source_overlap_duplicate",
  });
  assert.equal(duplicate.status, "skipped");
  assert(duplicate.tasks.every(task => task.status === "skipped"));

  await cleanup();
  const corruptProofLockRef = db.collection(COLLECTIONS.system)
    .doc("signaldeskMaintenanceTaskLock_proof_permission_lifecycle");
  await corruptProofLockRef.set({
    leaseOwner: "foreign-owner",
    pId: "ML",
  });
  await assert.rejects(
    runSignalDeskMaintenanceScheduler({
      firestore: db,
      now: new Date(BASE_NOW.getTime() + 2 * 60 * 60 * 1_000),
      runId: "source_after_corrupt_proof_lock",
    }),
    /SIGNALDESK_MAINTENANCE_LEASE_PRODUCT_MISMATCH/,
  );
  const isolatedState = await db.collection(COLLECTIONS.system).doc("signaldeskMaintenanceScheduler").get();
  assert.equal(
    isolatedState.get("tasks.source_data_lifecycle.lastStatus"),
    "success",
    "proof task lease corruption suppressed the source-data sibling task",
  );
  assert.equal((await corruptProofLockRef.get()).get("pId"), "ML");
};

const main = async (): Promise<void> => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("FIRESTORE_EMULATOR_HOST is required; refusing to run against a real project");
  }
  await testHoldFirstScrubAndLegalSurvival();
  await testScrubReadyProviderNegative();
  await testPolicyPageMalformedSummaryAndDetailIsolation();
  await testProviderAndAuthorityLineageIsolation();
  await testExpandedDependencyRetentionAndSummaryReconciliation();
  await testMalformedProviderQuarantineAndPolicyBinding();
  await testPerRecordEnrichmentExpiry();
  await testHistoricalEvidenceExpiresAfterTargetRefresh();
  await testAiDetailBackfillAndNinetyDayExpiry();
  await testTargetSpecificExpirySurvivesPolicyRenewal();
  await testMalformedCommercialOpportunityIsolation();
  await testPoisonIsolationRetryAndStaleFailure();
  await testLegacyTargetLifecycleBackfillAndMalformedConvergence();
  await testCompletedTombstoneRepairAndLegalRecount();
  await testOverflowAndIndependentSchedulerLeases();
  await cleanup();
  console.log("SignalDesk source-data lifecycle emulator tests passed");
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
