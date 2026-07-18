import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
    assertSignalDeskAttributionTouchMatchesOutcome,
    assertSignalDeskOutcomeClaimMatchesEvent,
    assertSignalDeskOutcomeEventMatchesRouteToken,
    assertSignalDeskOutcomeSummaryMatchesEvent,
    assertSignalDeskRouteTokenClaimMatchesDocument,
    createSignalDeskRouteTokenIntentFingerprint,
    createSignalDeskRouteTokenRequestFingerprint,
    deriveSignalDeskRouteTokenMaterial,
    isSignalDeskRouteTokenActiveAt,
    parseSignalDeskAttributionTouchDocument,
    parseSignalDeskConversationSummaryDocument,
    parseSignalDeskOutcomeDemandSourceDocument,
    parseSignalDeskOutcomeEvidenceAuthority,
    parseSignalDeskOutcomeEventDocument,
    parseSignalDeskOutcomeIdempotencyClaimDocument,
    parseSignalDeskOutcomeSummaryDocument,
    parseSignalDeskOutcomeTargetAuthority,
    parseSignalDeskRouteTokenDocument,
    parseSignalDeskRouteTokenIdempotencyClaimDocument,
    projectSignalDeskOutcomeSummary,
    projectSignalDeskOutcomeEvent,
    signalDeskOutcomeDayForMillis,
    signalDeskOutcomeSummaryIdFor,
    signalDeskRouteTokenIdempotencyHashFor,
} from "../../src/lib/signaldesk/outcomeContracts";

class TestTimestamp {
    constructor(private readonly value: string) {}

    toDate() {
        return new Date(this.value);
    }
}

const timestamp = (value: string) => new TestTimestamp(value);
const hashValue = (value: string) => createHash("sha256").update(value).digest("hex");
const expectCode = (callback: () => unknown, code: string) => {
    assert.throws(callback, (error: unknown) => error instanceof Error && error.message === code);
};

const bridgeSecret = "signaldesk-outcome-contract-test-secret-v1";
const fingerprintInput = {
    actorId: "founder_admin",
    channel: "qr" as const,
    ctaId: "cta_001",
    expiresAt: "2026-07-29T10:00:00.000Z",
    ownerQualifiedAt: "2026-07-15T09:00:00.000Z",
    sourceActionId: "action_001",
    sourcePolicyId: "policy_001",
    sourceRunId: "run_001",
    targetId: "target_123",
    templateId: "template_001",
};
const routeRequestFingerprintHash = createSignalDeskRouteTokenRequestFingerprint(fingerprintInput);
const routeIntentFingerprintHash = createSignalDeskRouteTokenIntentFingerprint({
    actionId: "action_001",
    actorId: "founder_admin",
    channel: "qr",
    ctaId: "cta_001",
    targetId: "target_123",
    templateId: "template_001",
});
const routeIdempotencyKeyHash = signalDeskRouteTokenIdempotencyHashFor({
    actorId: "founder_admin",
    idempotencyKey: "route-operation-0001",
});
const routeMaterial = deriveSignalDeskRouteTokenMaterial({
    bridgeSecret,
    idempotencyKey: "route-operation-0001",
    requestFingerprintHash: routeRequestFingerprintHash,
});

const routeRaw = () => ({
    channel: "qr" as const,
    createdAt: timestamp("2026-07-15T10:00:00.000Z"),
    createdBy: "founder_admin",
    ctaId: "cta_001",
    expiresAt: timestamp("2026-07-29T10:00:00.000Z"),
    lastOutcomeAt: timestamp("2026-07-15T10:15:00.000Z"),
    lastOutcomeEventIdHash: hashValue("menulist.event.001"),
    ownerQualifiedAt: timestamp("2026-07-15T09:00:00.000Z"),
    pId: "SD",
    revokedAt: null,
    revokedBy: null,
    routeTokenId: routeMaterial.routeTokenId,
    scope: "menulist-activation-outcomes-v1",
    sourceActionId: "action_001",
    sourcePolicyId: "policy_001",
    sourceRunId: "run_001",
    status: "active" as const,
    targetId: "target_123",
    targetName: "Example Restaurant",
    templateId: "template_001",
    tokenHash: routeMaterial.tokenHash,
    updatedAt: timestamp("2026-07-15T10:15:00.000Z"),
});

const routeClaimDocumentId = `route_token_${routeIdempotencyKeyHash}`;
const routeClaimRaw = () => ({
    actorId: "founder_admin",
    entityId: routeMaterial.routeTokenId,
    idempotencyKeyHash: routeIdempotencyKeyHash,
    operation: "route_token_create" as const,
    pId: "SD",
    requestFingerprintHash: routeIntentFingerprintHash,
    tokenFingerprintHash: routeRequestFingerprintHash,
    updatedAt: timestamp("2026-07-15T10:00:00.000Z"),
});

const outcomeIdempotencyKeyHash = hashValue("outcome-operation-0001");
const outcomeEventId = `outcome_${outcomeIdempotencyKeyHash.slice(0, 32)}`;
const eventRaw = () => ({
    channel: "qr" as const,
    createdAt: timestamp("2026-07-15T10:15:00.000Z"),
    createdBy: "menulist_outcome_bridge",
    evidenceRef: "menu_record:store_123",
    idempotencyKeyHash: outcomeIdempotencyKeyHash,
    integrityStatus: "menulist-signed" as const,
    outcomeEventId,
    outcomeType: "two_surface_activation" as const,
    ownerQualifiedAt: timestamp("2026-07-15T09:00:00.000Z"),
    ownerReviewedAt: timestamp("2026-07-15T09:30:00.000Z"),
    pId: "SD",
    routeTokenId: routeMaterial.routeTokenId,
    source: "route-token" as const,
    sourceEventId: "menulist.event.001",
    surfaces: ["qr", "website"] as const,
    targetId: "target_123",
    targetName: "Example Restaurant",
});

const outcomeSummaryId = "2026-07-15_two_surface_activation_route-token_qr_target_123";
const summaryRaw = () => ({
    channel: "qr" as const,
    count: 1,
    day: "2026-07-15",
    evidenceRef: "menu_record:store_123",
    integrityStatus: "menulist-signed" as const,
    latestOutcomeEventId: outcomeEventId,
    outcomeSummaryId,
    outcomeType: "two_surface_activation" as const,
    ownerQualifiedAt: timestamp("2026-07-15T09:00:00.000Z"),
    ownerReviewedAt: timestamp("2026-07-15T09:30:00.000Z"),
    pId: "SD",
    routeTokenId: routeMaterial.routeTokenId,
    source: "route-token" as const,
    sourceEventId: "menulist.event.001",
    surfaces: ["qr", "website"] as const,
    targetId: "target_123",
    targetName: "Example Restaurant",
    updatedAt: timestamp("2026-07-15T10:15:00.000Z"),
});

const claimDocumentId = `outcome_${outcomeIdempotencyKeyHash}`;
const claimRaw = () => ({
    actorId: "menulist_outcome_bridge",
    entityId: outcomeEventId,
    entityType: "outcome" as const,
    idempotencyKeyHash: outcomeIdempotencyKeyHash,
    operation: "outcome_record" as const,
    pId: "SD",
    requestFingerprintHash: hashValue("outcome-request-fingerprint"),
    updatedAt: timestamp("2026-07-15T10:15:00.000Z"),
});

const targetRaw = (lifecycleState: "active" | "pending" | "failed" | "completed" = "active") => ({
    contactability: "ready",
    currentListUrl: "https://example.test/menu",
    displayName: "Example Restaurant",
    nextAction: "outcome",
    pId: "SD",
    primaryOpportunity: "missing-current-list",
    segment: "a",
    sourceConfidence: "high",
    sourceDataExpiresAt: timestamp("2026-07-29T10:00:00.000Z"),
    sourceDataLifecycleState: lifecycleState,
    sourceDataObservedAt: timestamp("2026-07-15T09:00:00.000Z"),
    sourcePolicyId: "policy_001",
    sourceRunId: "run_001",
    status: "replied",
    suppressionStatus: "clear",
    targetId: "target_123",
    updatedAt: timestamp("2026-07-15T10:00:00.000Z"),
    website: "https://example.test/",
});

const evidenceRaw = () => ({
    allowedUse: ["evidence", "draft-personalization"],
    confidence: "high",
    createdAt: timestamp("2026-07-15T10:01:00.000Z"),
    currentMenuPresence: { observedFormat: "web-page" },
    evidencePacketId: "evidence_00000000000000000000000000000001",
    pId: "SD",
    rejectedFacts: ["Owner control was not verified."],
    summary: "Current-list evidence was reviewed.",
    targetId: "target_123",
    targetName: "Example Restaurant",
    updatedAt: timestamp("2026-07-15T10:01:00.000Z"),
});

const touchId = `touch_${hashValue(outcomeEventId).slice(0, 32)}`;
const touchRaw = () => ({
    actionId: "action_001",
    channel: "qr" as const,
    createdAt: timestamp("2026-07-15T10:15:00.000Z"),
    eventId: outcomeEventId,
    method: "route-token-direct-v1" as const,
    pId: "SD",
    targetId: "target_123",
    touchId,
    touchType: "direct" as const,
    weight: 1 as const,
});

const conversationRaw = () => ({
    channel: "email" as const,
    conversationId: "conv_target_123",
    lastInboundAt: timestamp("2026-07-15T09:00:00.000Z"),
    lastInboundOccurredAt: timestamp("2026-07-15T08:59:00.000Z"),
    lastMessagePreview: "I am interested",
    lastOutboundAt: timestamp("2026-07-14T12:00:00.000Z"),
    pId: "SD",
    state: "interested" as const,
    targetId: "target_123",
    targetName: "Example Restaurant",
    updatedAt: timestamp("2026-07-15T10:00:00.000Z"),
});

const assertTokenPlanningContracts = () => {
    const sameFingerprint = createSignalDeskRouteTokenRequestFingerprint({
        ...fingerprintInput,
        expiresAt: "2026-07-29T15:30:00.000+05:30",
        ownerQualifiedAt: "2026-07-15T14:30:00.000+05:30",
    });
    assert.equal(routeRequestFingerprintHash, sameFingerprint, "Equivalent instants must have one fingerprint");
    assert.notEqual(
        routeRequestFingerprintHash,
        createSignalDeskRouteTokenRequestFingerprint({ ...fingerprintInput, channel: "share" }),
        "Changed route facts must change the fingerprint",
    );
    assert.notEqual(
        routeIntentFingerprintHash,
        createSignalDeskRouteTokenIntentFingerprint({
            actionId: "action_001",
            actorId: "founder_admin",
            channel: "share",
            ctaId: "cta_001",
            targetId: "target_123",
            templateId: "template_001",
        }),
        "Changed route intent must conflict before authority is re-read",
    );
    assert.notEqual(
        routeIdempotencyKeyHash,
        signalDeskRouteTokenIdempotencyHashFor({
            actorId: "different_actor",
            idempotencyKey: "route-operation-0001",
        }),
        "Route-token idempotency ownership must be actor-bound",
    );
    const replay = deriveSignalDeskRouteTokenMaterial({
        bridgeSecret,
        idempotencyKey: "route-operation-0001",
        requestFingerprintHash: routeRequestFingerprintHash,
    });
    assert.deepEqual(replay, routeMaterial, "Exact route retries must derive the same opaque token");
    const changedOperation = deriveSignalDeskRouteTokenMaterial({
        bridgeSecret,
        idempotencyKey: "route-operation-0002",
        requestFingerprintHash: routeRequestFingerprintHash,
    });
    assert.notEqual(changedOperation.token, routeMaterial.token);
    assert.match(routeMaterial.token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(routeMaterial.routeTokenId, `route_${routeMaterial.tokenHash.slice(0, 32)}`);
    assert.equal(JSON.stringify(routeMaterial).includes(bridgeSecret), false, "Derived material must not expose the bridge secret");
    expectCode(() => deriveSignalDeskRouteTokenMaterial({
        bridgeSecret: "too-short",
        idempotencyKey: "route-operation-0001",
        requestFingerprintHash: routeRequestFingerprintHash,
    }), "ROUTE_TOKEN_DERIVATION_INPUT_INVALID");
    expectCode(() => createSignalDeskRouteTokenRequestFingerprint({
        ...fingerprintInput,
        targetId: "target/escape",
    }), "ROUTE_TOKEN_FINGERPRINT_INPUT_INVALID");
};

const assertRouteTokenContracts = () => {
    const projected = parseSignalDeskRouteTokenDocument(routeRaw(), routeMaterial.routeTokenId);
    const claim = parseSignalDeskRouteTokenIdempotencyClaimDocument(routeClaimRaw(), routeClaimDocumentId);
    assert.equal(projected.routeTokenId, routeMaterial.routeTokenId);
    assert.equal(projected.sourcePolicyId, "policy_001");
    assert.equal(projected.sourceActionId, "action_001");
    assert.equal("rawToken" in projected, false);
    assert.equal(projected.createdBy, "founder_admin");
    assert.equal(claim.actorId, "founder_admin");
    assert.equal(claim.entityId, projected.routeTokenId);
    assertSignalDeskRouteTokenClaimMatchesDocument(claim, projected);
    assert.equal(isSignalDeskRouteTokenActiveAt(projected, Date.parse("2026-07-15T10:15:00.000Z")), true);
    assert.equal(isSignalDeskRouteTokenActiveAt(projected, Date.parse(projected.expiresAt)), false);

    expectCode(() => parseSignalDeskRouteTokenDocument({ ...routeRaw(), pId: "ML" }, routeMaterial.routeTokenId), "ROUTE_TOKEN_PRODUCT_MISMATCH");
    expectCode(() => parseSignalDeskRouteTokenDocument({ ...routeRaw(), rawToken: "must-never-be-accepted" }, routeMaterial.routeTokenId), "ROUTE_TOKEN_SHAPE_INVALID");
    expectCode(() => parseSignalDeskRouteTokenIdempotencyClaimDocument({ ...routeClaimRaw(), privateActorEmail: "owner@example.test" }, routeClaimDocumentId), "ROUTE_TOKEN_CLAIM_SHAPE_INVALID");
    expectCode(() => parseSignalDeskRouteTokenIdempotencyClaimDocument({ ...routeClaimRaw(), actorId: "" }, routeClaimDocumentId), "ROUTE_TOKEN_CLAIM_SHAPE_INVALID");
    expectCode(() => parseSignalDeskRouteTokenIdempotencyClaimDocument({ ...routeClaimRaw(), pId: "ML" }, routeClaimDocumentId), "ROUTE_TOKEN_CLAIM_PRODUCT_MISMATCH");
    expectCode(() => assertSignalDeskRouteTokenClaimMatchesDocument({ ...claim, actorId: "different_actor" }, projected), "ROUTE_TOKEN_CLAIM_DOCUMENT_COUPLING_INVALID");
    expectCode(() => parseSignalDeskRouteTokenDocument({ ...routeRaw(), routeTokenId: "route_00000000000000000000000000000000" }, routeMaterial.routeTokenId), "ROUTE_TOKEN_IDENTITY_MISMATCH");
    expectCode(() => parseSignalDeskRouteTokenDocument({ ...routeRaw(), sourcePolicyId: null }, routeMaterial.routeTokenId), "ROUTE_TOKEN_SHAPE_INVALID");
    const routeWithoutRevocationField = routeRaw() as Record<string, unknown>;
    delete routeWithoutRevocationField.revokedAt;
    expectCode(() => parseSignalDeskRouteTokenDocument(routeWithoutRevocationField, routeMaterial.routeTokenId), "ROUTE_TOKEN_SHAPE_INVALID");
    expectCode(() => parseSignalDeskRouteTokenDocument({ ...routeRaw(), expiresAt: "2026-07-29T10:00:00.000Z" }, routeMaterial.routeTokenId), "ROUTE_TOKEN_TIMESTAMP_INVALID");
    expectCode(() => parseSignalDeskRouteTokenDocument({
        ...routeRaw(),
        revokedAt: timestamp("2026-07-15T10:10:00.000Z"),
        revokedBy: "founder_admin",
    }, routeMaterial.routeTokenId), "ROUTE_TOKEN_STATUS_INVALID");

    const revoked = parseSignalDeskRouteTokenDocument({
        ...routeRaw(),
        revokedAt: timestamp("2026-07-15T10:20:00.000Z"),
        revokedBy: "founder_admin",
        revocationReason: "Owner requested revocation",
        status: "revoked",
        updatedAt: timestamp("2026-07-15T10:20:00.000Z"),
    }, routeMaterial.routeTokenId);
    assert.equal(isSignalDeskRouteTokenActiveAt(revoked, Date.parse("2026-07-15T10:15:00.000Z")), false);
    const acceptedBeforeRevocation = parseSignalDeskOutcomeEventDocument(eventRaw(), outcomeEventId);
    assert.doesNotThrow(
        () => assertSignalDeskOutcomeEventMatchesRouteToken(acceptedBeforeRevocation, revoked),
        "An accepted event remains valid evidence after its route token is later revoked",
    );
    const retainedRoute = parseSignalDeskRouteTokenDocument({
        ...routeRaw(),
        revocationReason: "Source-data retention lifecycle completed.",
        revokedAt: timestamp("2026-07-16T10:00:00.000Z"),
        revokedBy: "signaldesk-source-data-lifecycle",
        sourceDataLifecycleCompletedAt: timestamp("2026-07-16T10:00:00.000Z"),
        sourceDataLifecycleKind: "source-data-retention-v1",
        sourceDataLifecycleState: "completed",
        sourceDataLifecycleToken: `source_data_target_${"a".repeat(40)}`,
        status: "revoked",
        targetName: "Retained target record",
        updatedAt: timestamp("2026-07-16T10:00:00.000Z"),
        updatedBy: "signaldesk-source-data-lifecycle",
    }, routeMaterial.routeTokenId);
    assert.equal(retainedRoute.status, "revoked", "Completed retention route tombstone must remain strict replay authority");
    assertSignalDeskRouteTokenClaimMatchesDocument(claim, retainedRoute);
    expectCode(() => parseSignalDeskRouteTokenDocument({
        ...routeRaw(),
        sourceDataLifecycleState: "completed",
    }, routeMaterial.routeTokenId), "ROUTE_TOKEN_LIFECYCLE_STATE_INVALID");
    expectCode(() => parseSignalDeskRouteTokenDocument({
        ...routeRaw(),
        revocationReason: "Source-data retention lifecycle completed.",
        revokedAt: timestamp("2026-07-16T10:00:00.000Z"),
        revokedBy: "signaldesk-source-data-lifecycle",
        sourceDataLifecycleCompletedAt: timestamp("2026-07-16T10:00:00.000Z"),
        sourceDataLifecycleKind: "source-data-retention-v1",
        sourceDataLifecycleState: "completed",
        sourceDataLifecycleToken: `source_data_target_${"a".repeat(40)}`,
        status: "revoked",
        updatedAt: timestamp("2026-07-16T10:00:00.000Z"),
        updatedBy: "signaldesk-source-data-lifecycle",
    }, routeMaterial.routeTokenId), "ROUTE_TOKEN_LIFECYCLE_STATE_INVALID");

    const expiredMaterial = deriveSignalDeskRouteTokenMaterial({
        bridgeSecret,
        idempotencyKey: "route-operation-old1",
        requestFingerprintHash: hashValue("old-route-request"),
    });
    const expired = parseSignalDeskRouteTokenDocument({
        ...routeRaw(),
        createdAt: timestamp("2026-06-01T10:00:00.000Z"),
        expiresAt: timestamp("2026-06-15T10:00:00.000Z"),
        lastOutcomeAt: null,
        lastOutcomeEventIdHash: null,
        ownerQualifiedAt: timestamp("2026-06-01T09:00:00.000Z"),
        routeTokenId: expiredMaterial.routeTokenId,
        tokenHash: expiredMaterial.tokenHash,
        updatedAt: timestamp("2026-06-01T10:00:00.000Z"),
    }, expiredMaterial.routeTokenId);
    assert.equal(isSignalDeskRouteTokenActiveAt(expired, Date.parse("2026-07-15T10:00:00.000Z")), false);
};

const manualEvent = () => {
    const idempotencyKeyHash = hashValue("manual-outcome-operation-001");
    const eventId = `outcome_${idempotencyKeyHash.slice(0, 32)}`;
    return parseSignalDeskOutcomeEventDocument({
        channel: "manual",
        createdAt: timestamp("2026-07-15T11:00:00.000Z"),
        createdBy: "founder_admin",
        evidenceRef: "operator_note:001",
        idempotencyKeyHash,
        integrityStatus: "unverified",
        outcomeEventId: eventId,
        outcomeType: "published",
        ownerQualifiedAt: null,
        ownerReviewedAt: null,
        pId: "SD",
        routeTokenId: null,
        source: "manual",
        sourceEventId: null,
        surfaces: [],
        targetId: "target_123",
        targetName: "Example Restaurant",
    }, eventId);
};

const demandSignalId = "demand_00000000000000000000000000000001";

const demandSignalEvent = () => {
    const idempotencyKeyHash = hashValue("demand-outcome-operation-001");
    const eventId = `outcome_${idempotencyKeyHash.slice(0, 32)}`;
    return parseSignalDeskOutcomeEventDocument({
        channel: "share",
        createdAt: timestamp("2026-07-15T11:10:00.000Z"),
        createdBy: "founder_admin",
        evidenceRef: "demand_signal:signal_001",
        idempotencyKeyHash,
        integrityStatus: "unverified",
        outcomeEventId: eventId,
        outcomeType: "route_created",
        ownerQualifiedAt: null,
        ownerReviewedAt: null,
        pId: "SD",
        routeTokenId: null,
        source: "demand-signal",
        sourceEventId: demandSignalId,
        surfaces: [],
        targetId: "target_123",
        targetName: "Example Restaurant",
    }, eventId);
};

const assertOutcomeEventContracts = () => {
    const event = parseSignalDeskOutcomeEventDocument(eventRaw(), outcomeEventId);
    const projection = projectSignalDeskOutcomeEvent(event);
    assert.equal(projection.outcomeEventId, outcomeEventId);
    assert.equal("idempotencyKeyHash" in projection, false);
    assert.equal("createdBy" in projection, false);
    assert.equal("privateOwnerEmail" in projection, false);
    assert.equal(manualEvent().source, "manual");
    assert.equal(demandSignalEvent().sourceEventId, demandSignalId);

    expectCode(() => parseSignalDeskOutcomeEventDocument({ ...eventRaw(), pId: "ML" }, outcomeEventId), "OUTCOME_EVENT_PRODUCT_MISMATCH");
    expectCode(() => parseSignalDeskOutcomeEventDocument({ ...eventRaw(), privateOwnerEmail: "owner@example.test" }, outcomeEventId), "OUTCOME_EVENT_SHAPE_INVALID");
    expectCode(() => parseSignalDeskOutcomeEventDocument({ ...eventRaw(), idempotencyKeyHash: hashValue("changed") }, outcomeEventId), "OUTCOME_EVENT_IDEMPOTENCY_IDENTITY_MISMATCH");
    expectCode(() => parseSignalDeskOutcomeEventDocument({ ...eventRaw(), evidenceRef: null }, outcomeEventId), "OUTCOME_EVENT_SHAPE_INVALID");
    const eventWithoutRouteIdentity = eventRaw() as Record<string, unknown>;
    delete eventWithoutRouteIdentity.routeTokenId;
    expectCode(() => parseSignalDeskOutcomeEventDocument(eventWithoutRouteIdentity, outcomeEventId), "OUTCOME_EVENT_SHAPE_INVALID");
    expectCode(() => parseSignalDeskOutcomeEventDocument({ ...eventRaw(), surfaces: ["qr", "qr"] }, outcomeEventId), "OUTCOME_EVENT_INTEGRITY_INVALID");
    expectCode(() => parseSignalDeskOutcomeEventDocument({
        ...eventRaw(),
        ownerQualifiedAt: timestamp("2026-07-15T09:30:00.000Z"),
        ownerReviewedAt: timestamp("2026-07-15T09:00:00.000Z"),
    }, outcomeEventId), "OUTCOME_EVENT_INTEGRITY_INVALID");
    expectCode(() => parseSignalDeskOutcomeEventDocument({ ...eventRaw(), integrityStatus: "unverified" }, outcomeEventId), "OUTCOME_EVENT_INTEGRITY_INVALID");
    expectCode(() => parseSignalDeskOutcomeEventDocument({
        ...eventRaw(),
        integrityStatus: "owner-reviewed-manual",
        routeTokenId: null,
        source: "demand-signal",
        sourceEventId: null,
    }, outcomeEventId), "OUTCOME_EVENT_INTEGRITY_INVALID");
};

const assertTargetEvidenceAndDemandLineageContracts = () => {
    const target = parseSignalDeskOutcomeTargetAuthority(
        targetRaw(),
        "target_123",
        Date.parse("2026-07-15T10:02:00.000Z"),
    );
    const evidence = parseSignalDeskOutcomeEvidenceAuthority(
        evidenceRaw(),
        "evidence_00000000000000000000000000000001",
        target,
        Date.parse("2026-07-15T10:02:00.000Z"),
    );
    assert.equal(target.sourceDataLifecycleState, "active");
    assert.equal(target.sourceRunId, "run_001");
    assert.equal(evidence.targetId, target.target.targetId);
    expectCode(() => parseSignalDeskOutcomeTargetAuthority(
        targetRaw("pending"),
        "target_123",
        Date.parse("2026-07-15T10:02:00.000Z"),
    ), "OUTCOME_TARGET_SOURCE_LIFECYCLE_INACTIVE");
    expectCode(() => parseSignalDeskOutcomeTargetAuthority(
        targetRaw("completed"),
        "target_123",
        Date.parse("2026-07-15T10:02:00.000Z"),
    ), "OUTCOME_TARGET_SOURCE_LIFECYCLE_INACTIVE");
    expectCode(() => parseSignalDeskOutcomeTargetAuthority(
        targetRaw(),
        "target_123",
        Date.parse("2026-07-30T10:02:00.000Z"),
    ), "OUTCOME_TARGET_SOURCE_LIFECYCLE_INACTIVE");
    expectCode(() => parseSignalDeskOutcomeEvidenceAuthority(
        { ...evidenceRaw(), allowedUse: ["draft-personalization"] },
        "evidence_00000000000000000000000000000001",
        target,
        Date.parse("2026-07-15T10:02:00.000Z"),
    ), "OUTCOME_EVIDENCE_USE_INVALID");
    expectCode(() => parseSignalDeskOutcomeEvidenceAuthority(
        {
            ...evidenceRaw(),
            createdAt: timestamp("2026-07-14T08:00:00.000Z"),
            updatedAt: timestamp("2026-07-14T08:00:00.000Z"),
        },
        "evidence_00000000000000000000000000000001",
        target,
        Date.parse("2026-07-15T10:02:00.000Z"),
    ), "OUTCOME_EVIDENCE_STALE");

    const demandSource = parseSignalDeskOutcomeDemandSourceDocument({
        createdAt: timestamp("2026-07-15T10:05:00.000Z"),
        createdBy: "founder_admin",
        demandSignalId,
        pId: "SD",
        signalType: "share",
        sourceSurface: "menu",
        targetId: "target_123",
        targetName: "Example Restaurant",
    }, demandSignalId, Date.parse("2026-07-15T10:06:00.000Z"));
    assert.equal(demandSource.targetId, "target_123");
    expectCode(() => parseSignalDeskOutcomeDemandSourceDocument({
        createdAt: timestamp("2026-07-15T10:05:00.000Z"),
        createdBy: "founder_admin",
        demandSignalId,
        pId: "ML",
        signalType: "share",
        sourceSurface: "menu",
        targetId: "target_123",
        targetName: "Example Restaurant",
    }, demandSignalId, Date.parse("2026-07-15T10:06:00.000Z")), "OUTCOME_DEMAND_SOURCE_PRODUCT_MISMATCH");
    expectCode(() => parseSignalDeskOutcomeDemandSourceDocument({
        createdAt: timestamp("2026-07-15T10:05:00.000Z"),
        createdBy: "founder_admin",
        demandSignalId,
        pId: "SD",
        privateContact: "must-not-be-accepted",
        signalType: "share",
        sourceSurface: "menu",
        targetId: "target_123",
        targetName: "Example Restaurant",
    }, demandSignalId, Date.parse("2026-07-15T10:06:00.000Z")), "OUTCOME_DEMAND_SOURCE_SHAPE_INVALID");
    expectCode(() => parseSignalDeskOutcomeDemandSourceDocument({
        createdAt: timestamp("2026-07-15T10:20:00.000Z"),
        createdBy: "founder_admin",
        demandSignalId,
        pId: "SD",
        signalType: "share",
        sourceSurface: "menu",
        targetId: "target_123",
        targetName: "Example Restaurant",
    }, demandSignalId, Date.parse("2026-07-15T10:06:00.000Z")), "OUTCOME_DEMAND_SOURCE_TIMESTAMP_INVALID");
};

const assertSummaryAndClaimContracts = () => {
    const event = parseSignalDeskOutcomeEventDocument(eventRaw(), outcomeEventId);
    const summary = parseSignalDeskOutcomeSummaryDocument(summaryRaw(), outcomeSummaryId);
    const summaryProjection = projectSignalDeskOutcomeSummary(summary);
    const claim = parseSignalDeskOutcomeIdempotencyClaimDocument(claimRaw(), claimDocumentId);
    assert.equal(summary.count, 1);
    assert.equal(summary.latestOutcomeEventId, outcomeEventId);
    assert.equal("latestOutcomeEventId" in summaryProjection, false);
    assert.equal("privateContact" in summary, false);
    assert.equal("privateActorEmail" in claim, false);
    assertSignalDeskOutcomeSummaryMatchesEvent(summary, event);
    assertSignalDeskOutcomeClaimMatchesEvent(claim, event);
    assert.equal(signalDeskOutcomeSummaryIdFor({
        channel: "qr",
        day: "2026-07-15",
        outcomeType: "two_surface_activation",
        source: "route-token",
        targetId: "target_123",
    }), outcomeSummaryId);
    assert.notEqual(
        signalDeskOutcomeSummaryIdFor({
            channel: "qr",
            day: "2026-07-15",
            outcomeType: "two_surface_activation",
            source: "manual",
            targetId: "target_123",
        }),
        outcomeSummaryId,
        "Different provenance sources must never aggregate into one summary document",
    );
    assert.equal(
        signalDeskOutcomeDayForMillis(Date.parse("2026-07-15T23:59:59.999Z")),
        "2026-07-15",
        "Outcome day must remain in the event timestamp's UTC day before midnight",
    );
    assert.equal(
        signalDeskOutcomeDayForMillis(Date.parse("2026-07-16T00:00:00.000Z")),
        "2026-07-16",
        "Outcome day must roll with the event timestamp at UTC midnight",
    );
    expectCode(() => signalDeskOutcomeDayForMillis(Number.NaN), "OUTCOME_DAY_INPUT_INVALID");

    expectCode(() => parseSignalDeskOutcomeSummaryDocument({ ...summaryRaw(), pId: "ML" }, outcomeSummaryId), "OUTCOME_SUMMARY_PRODUCT_MISMATCH");
    expectCode(() => parseSignalDeskOutcomeSummaryDocument({ ...summaryRaw(), privateContact: "must-not-be-accepted" }, outcomeSummaryId), "OUTCOME_SUMMARY_SHAPE_INVALID");
    expectCode(() => parseSignalDeskOutcomeSummaryDocument({ ...summaryRaw(), targetId: "target_456" }, outcomeSummaryId), "OUTCOME_SUMMARY_IDENTITY_MISMATCH");
    expectCode(() => parseSignalDeskOutcomeSummaryDocument({ ...summaryRaw(), count: -1 }, outcomeSummaryId), "OUTCOME_SUMMARY_SHAPE_INVALID");
    expectCode(() => parseSignalDeskOutcomeSummaryDocument({ ...summaryRaw(), count: 1.5 }, outcomeSummaryId), "OUTCOME_SUMMARY_SHAPE_INVALID");
    const mismatchedLatestEvent = parseSignalDeskOutcomeSummaryDocument({
        ...summaryRaw(),
        latestOutcomeEventId: "outcome_00000000000000000000000000000000",
    }, outcomeSummaryId);
    expectCode(
        () => assertSignalDeskOutcomeSummaryMatchesEvent(mismatchedLatestEvent, event),
        "OUTCOME_SUMMARY_EVENT_COUPLING_INVALID",
    );
    expectCode(() => parseSignalDeskOutcomeSummaryDocument({
        ...summaryRaw(),
        day: "2026-02-30",
        outcomeSummaryId: "2026-02-30_two_surface_activation_route-token_qr_target_123",
    }, "2026-02-30_two_surface_activation_route-token_qr_target_123"), "OUTCOME_SUMMARY_SHAPE_INVALID");
    expectCode(() => parseSignalDeskOutcomeSummaryDocument({ ...summaryRaw(), surfaces: ["qr"] }, outcomeSummaryId), "OUTCOME_SUMMARY_INTEGRITY_INVALID");
    expectCode(() => parseSignalDeskOutcomeIdempotencyClaimDocument({ ...claimRaw(), pId: "ML" }, claimDocumentId), "OUTCOME_CLAIM_PRODUCT_MISMATCH");
    expectCode(() => parseSignalDeskOutcomeIdempotencyClaimDocument({ ...claimRaw(), privateActorEmail: "must-not-be-accepted" }, claimDocumentId), "OUTCOME_CLAIM_SHAPE_INVALID");
    expectCode(() => parseSignalDeskOutcomeIdempotencyClaimDocument({ ...claimRaw(), entityId: "outcome_00000000000000000000000000000000" }, claimDocumentId), "OUTCOME_CLAIM_IDENTITY_MISMATCH");
    expectCode(() => assertSignalDeskOutcomeClaimMatchesEvent({ ...claim, updatedAt: "2026-07-15T09:00:00.000Z" }, event), "OUTCOME_CLAIM_EVENT_COUPLING_INVALID");
};

const assertAttributionContracts = () => {
    const route = parseSignalDeskRouteTokenDocument(routeRaw(), routeMaterial.routeTokenId);
    const event = parseSignalDeskOutcomeEventDocument(eventRaw(), outcomeEventId);
    const touch = parseSignalDeskAttributionTouchDocument(touchRaw(), touchId);
    assert.equal("privateContact" in touch, false);
    assertSignalDeskOutcomeEventMatchesRouteToken(event, route);
    assertSignalDeskAttributionTouchMatchesOutcome(touch, event, route);

    expectCode(() => parseSignalDeskAttributionTouchDocument({ ...touchRaw(), pId: "ML" }, touchId), "ATTRIBUTION_TOUCH_PRODUCT_MISMATCH");
    expectCode(() => parseSignalDeskAttributionTouchDocument({ ...touchRaw(), privateContact: "must-not-be-accepted" }, touchId), "ATTRIBUTION_TOUCH_SHAPE_INVALID");
    expectCode(() => parseSignalDeskAttributionTouchDocument({ ...touchRaw(), weight: 0 }, touchId), "ATTRIBUTION_TOUCH_SHAPE_INVALID");
    expectCode(() => parseSignalDeskAttributionTouchDocument({ ...touchRaw(), touchId: "touch_00000000000000000000000000000000" }, touchId), "ATTRIBUTION_TOUCH_IDENTITY_MISMATCH");
    expectCode(() => assertSignalDeskOutcomeEventMatchesRouteToken({ ...event, channel: "share" }, route), "OUTCOME_ROUTE_TOKEN_COUPLING_INVALID");
    expectCode(() => assertSignalDeskOutcomeEventMatchesRouteToken(event, {
        ...route,
        revokedAt: "2026-07-15T10:10:00.000Z",
        revokedBy: "founder_admin",
        revocationReason: "Revoked before event",
        status: "revoked",
    }), "OUTCOME_ROUTE_TOKEN_COUPLING_INVALID");

    const manual = manualEvent();
    const manualTouchId = `touch_${hashValue(manual.outcomeEventId).slice(0, 32)}`;
    const manualTouch = parseSignalDeskAttributionTouchDocument({
        actionId: manual.outcomeEventId,
        channel: manual.channel,
        createdAt: timestamp(manual.createdAt),
        eventId: manual.outcomeEventId,
        method: "manual-direct-v1",
        pId: "SD",
        targetId: manual.targetId,
        touchId: manualTouchId,
        touchType: "direct",
        weight: 1,
    }, manualTouchId);
    assertSignalDeskAttributionTouchMatchesOutcome(manualTouch, manual);

    const demand = demandSignalEvent();
    const demandTouchId = `touch_${hashValue(demand.outcomeEventId).slice(0, 32)}`;
    const demandTouch = parseSignalDeskAttributionTouchDocument({
        actionId: demand.sourceEventId,
        channel: demand.channel,
        createdAt: timestamp(demand.createdAt),
        eventId: demand.outcomeEventId,
        method: "demand-signal-direct-v1",
        pId: "SD",
        targetId: demand.targetId,
        touchId: demandTouchId,
        touchType: "direct",
        weight: 1,
    }, demandTouchId);
    assertSignalDeskAttributionTouchMatchesOutcome(demandTouch, demand);
    expectCode(() => assertSignalDeskAttributionTouchMatchesOutcome({
        ...demandTouch,
        method: "manual-direct-v1",
    }, demand), "ATTRIBUTION_TOUCH_OUTCOME_COUPLING_INVALID");
};

const assertConversationContracts = () => {
    const conversation = parseSignalDeskConversationSummaryDocument(conversationRaw(), "conv_target_123");
    assert.equal(conversation.state, "interested");
    assert.equal("privateRecipientEmail" in conversation, false);
    assert.equal("pId" in conversation, false);
    const retainedConversationRaw = {
        ...conversationRaw(),
        legalRetentionReviewReason: "conversation-record",
        legalRetentionReviewRequired: true,
        sourceDataLifecycleCompletedAt: timestamp("2026-07-16T10:00:00.000Z"),
        sourceDataLifecycleKind: "source-data-retention-v1",
        sourceDataLifecycleState: "completed",
        sourceDataLifecycleToken: `source_data_target_${"b".repeat(40)}`,
        updatedAt: timestamp("2026-07-16T10:00:00.000Z"),
        updatedBy: "signaldesk-source-data-lifecycle",
    };
    const retainedConversation = parseSignalDeskConversationSummaryDocument(
        retainedConversationRaw,
        "conv_target_123",
    );
    assert.equal(retainedConversation.state, "interested", "Retained conversation must remain strict inbound authority");
    assert.equal("sourceDataLifecycleToken" in retainedConversation, false, "Lifecycle token must not enter the client conversation DTO");
    assert.equal("legalRetentionReviewReason" in retainedConversation, false, "Legal-retention reason must remain internal");
    const postRetentionInbound = parseSignalDeskConversationSummaryDocument({
        ...retainedConversationRaw,
        lastInboundAt: timestamp("2026-07-17T10:00:00.000Z"),
        lastInboundOccurredAt: timestamp("2026-07-17T09:59:00.000Z"),
        legalRetentionReviewReason: "post-retention-inbound-communication",
        state: "privacy_request",
        updatedAt: timestamp("2026-07-17T10:00:00.000Z"),
    }, "conv_target_123");
    assert.equal(postRetentionInbound.state, "privacy_request", "Post-retention inbound merge must remain parseable");
    expectCode(() => parseSignalDeskConversationSummaryDocument({ ...conversationRaw(), pId: "ML" }, "conv_target_123"), "CONVERSATION_SUMMARY_PRODUCT_MISMATCH");
    expectCode(() => parseSignalDeskConversationSummaryDocument({ ...conversationRaw(), privateRecipientEmail: "must-not-be-accepted" }, "conv_target_123"), "CONVERSATION_SUMMARY_SHAPE_INVALID");
    expectCode(() => parseSignalDeskConversationSummaryDocument({ ...conversationRaw(), legalRetentionReviewRequired: true }, "conv_target_123"), "CONVERSATION_SUMMARY_SHAPE_INVALID");
    expectCode(() => parseSignalDeskConversationSummaryDocument({
        ...conversationRaw(),
        legalRetentionReviewReason: "conversation-record",
        legalRetentionReviewRequired: true,
    }, "conv_target_123"), "CONVERSATION_SUMMARY_LIFECYCLE_STATE_INVALID");
    expectCode(() => parseSignalDeskConversationSummaryDocument({
        ...retainedConversationRaw,
        sourceDataLifecycleToken: "wrong-token",
    }, "conv_target_123"), "CONVERSATION_SUMMARY_LIFECYCLE_STATE_INVALID");
    expectCode(() => parseSignalDeskConversationSummaryDocument({ ...conversationRaw(), conversationId: "conv_other" }, "conv_target_123"), "CONVERSATION_SUMMARY_IDENTITY_MISMATCH");
    expectCode(() => parseSignalDeskConversationSummaryDocument({ ...conversationRaw(), state: "unknown" }, "conv_target_123"), "CONVERSATION_SUMMARY_SHAPE_INVALID");
    expectCode(() => parseSignalDeskConversationSummaryDocument({ ...conversationRaw(), targetName: null }, "conv_target_123"), "CONVERSATION_SUMMARY_SHAPE_INVALID");
    expectCode(() => parseSignalDeskConversationSummaryDocument({ ...conversationRaw(), updatedAt: "2026-07-15T10:00:00.000Z" }, "conv_target_123"), "CONVERSATION_SUMMARY_TIMESTAMP_INVALID");
    expectCode(() => parseSignalDeskConversationSummaryDocument({
        ...conversationRaw(),
        lastInboundAt: timestamp("2026-07-15T12:00:00.000Z"),
    }, "conv_target_123"), "CONVERSATION_SUMMARY_TIME_ORDER_INVALID");
};

const main = () => {
    assertTokenPlanningContracts();
    assertRouteTokenContracts();
    assertOutcomeEventContracts();
    assertTargetEvidenceAndDemandLineageContracts();
    assertSummaryAndClaimContracts();
    assertAttributionContracts();
    assertConversationContracts();
    console.log("SignalDesk outcome contract tests passed");
};

main();
