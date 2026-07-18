import { createHash } from "crypto";
import {
  DocumentReference,
  DocumentSnapshot,
  FieldPath,
  FieldValue,
  Firestore,
  QueryDocumentSnapshot,
  Timestamp,
  Transaction,
} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { SIGNALDESK_COLLECTIONS, SIGNALDESK_SUMMARY_DOCS } from "../constants/database";
import { db as defaultDb } from "../firebaseAdmin";

const SIGNALDESK_PRODUCT_CODE = "SD";
const SYSTEM_ACTOR_ID = "signaldesk-source-data-lifecycle";
const SYSTEM_ACTOR_ROLE = "system";
const POLICY_LIFECYCLE_KIND = "source-policy-retention-v1";
const TARGET_LIFECYCLE_KIND = "source-data-retention-v1";
const DEFAULT_AUTHORITY_PAGE_SIZE = 20;
const DEFAULT_DEPENDENCY_PAGE_SIZE = 40;
const DEFAULT_MAX_AUTHORITIES = 20;
const DEFAULT_MAX_TARGETS = 30;
const DEFAULT_MAX_RECONCILIATION_STEPS = 160;
const MAX_PAGE_SIZE = 100;
const MAX_DEPENDENCY_PAGE_SIZE = 50;
const MAX_LIFECYCLE_COUNT = 100_000_000;
const MAX_ID_LENGTH = 180;
const MAX_TEXT_LENGTH = 2_000;
const FAILURE_RETRY_BASE_MS = 5 * 60 * 1000;
const FAILURE_RETRY_MAX_MS = 24 * 60 * 60 * 1000;
const AI_DETAIL_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const AI_DETAIL_BACKFILL_STATE_ID = "signaldeskSourceDataAiDetailBackfillV1";
const TARGET_LIFECYCLE_BACKFILL_STATE_ID = "signaldeskSourceDataTargetLifecycleBackfillV1";
const TARGET_LIFECYCLE_BACKFILL_VERSION = "target-lifecycle-backfill-v1";

const POLICY_STATUSES = new Set(["active", "approved", "inactive", "review_required", "blocked"]);
const TARGET_STATUSES = new Set(["new", "review", "ready", "held", "rejected", "contacted", "replied", "converted"]);
const TARGET_SEGMENTS = new Set(["a", "b", "c", "hold", "reject"]);
const TARGET_NEXT_ACTIONS = new Set([
  "review", "enrich", "score", "evidence", "draft", "approve", "export", "contact", "reply", "outcome", "hold", "reject",
]);
const TARGET_CONTACTABILITY = new Set(["ready", "limited", "missing", "blocked"]);
const TARGET_CONFIDENCE = new Set(["high", "medium", "low", "blocked"]);
const PROVIDERS = new Set(["google-places", "apify", "fhrs-fhis"]);
const PROVIDER_RETENTION_STATUSES = new Set(["active", "refresh-due", "refreshed", "expired", "blocked"]);
const CONTACT_CHANNELS = new Set(["email", "phone", "whatsapp", "instagram", "messenger"]);
const CONTACT_PERMISSION_STATES = new Set(["permissioned", "research_only", "blocked", "review_required", "expired"]);

type PolicyLifecycleState = "pending" | "completed" | "failed";
type TargetLifecycleState = "active" | "pending" | "completed" | "failed";
type TargetLifecyclePhase =
  | "target-detail"
  | "route-tokens"
  | "channel-windows"
  | "contact-identities"
  | "provider-retention"
  | "source-candidates"
  | "enrichment-results"
  | "vendor-runs"
  | "research-rows"
  | "evidence-summaries"
  | "evidence-packets"
  | "ai-worker-runs"
  | "approval-packets"
  | "drafts"
  | "approvals"
  | "sequencer-handoffs"
  | "sequencer-steps"
  | "message-exports"
  | "conversation-summaries"
  | "messages"
  | "reply-classifications"
  | "revenue-accounts"
  | "commercial-opportunities"
  | "complete";

type DependencyAction =
  | "contact"
  | "provider"
  | "source-candidate"
  | "enrichment"
  | "research"
  | "evidence"
  | "approval-packet"
  | "draft"
  | "approval"
  | "handoff"
  | "sequence-step"
  | "message-export"
  | "route-token"
  | "channel-window"
  | "conversation"
  | "message"
  | "reply-classification"
  | "ai-run"
  | "vendor-run"
  | "revenue-account"
  | "commercial-opportunity";

interface PolicyProgress {
  cursor: string | null;
  heldTargetCount: number;
  scannedTargetCount: number;
}

export interface SignalDeskSourceDataLifecycleReconciliationResult {
  closedChannelWindowCount: number;
  foreignDependencyCount: number;
  heldApprovalCount: number;
  legalRetentionReviewCount: number;
  scannedDependencyCount: number;
  scrubbedApprovalPacketCount: number;
  scrubbedAiWorkerRunCount: number;
  scrubbedContactIdentityCount: number;
  scrubbedDraftCount: number;
  scrubbedEnrichmentResultCount: number;
  scrubbedEvidenceCount: number;
  scrubbedMessageExportCount: number;
  scrubbedProviderRetentionCount: number;
  scrubbedResearchRowCount: number;
  scrubbedRouteTokenCount: number;
  scrubbedSequenceStepCount: number;
  scrubbedSourceCandidateCount: number;
  scrubbedTargetDetailCount: number;
  scrubbedVendorRunCount: number;
  scrubbedRevenueAccountCount: number;
  closedCommercialOpportunityCount: number;
  stoppedHandoffCount: number;
  revokedRouteTokenCount: number;
}

interface TargetProgress extends SignalDeskSourceDataLifecycleReconciliationResult {
  cursor: string | null;
  phase: TargetLifecyclePhase;
}

export interface SignalDeskSourceDataLifecycleResult
  extends SignalDeskSourceDataLifecycleReconciliationResult {
  aiDetailBackfillCompleted: boolean;
  backfilledAiDetailCount: number;
  backfilledTargetLifecycleCount: number;
  blockedPolicyOverflow: boolean;
  completedPolicyCount: number;
  completedTargetCount: number;
  conflictedAuthorityCount: number;
  conflictedProviderCount: number;
  conflictedTargetCount: number;
  duePolicyOverflow: boolean;
  dueAiDetailOverflow: boolean;
  dueEnrichmentOverflow: boolean;
  dueProviderOverflow: boolean;
  dueTargetOverflow: boolean;
  failedAuthorityCount: number;
  failedTargetCount: number;
  failureDiagnosticErrorCount: number;
  materializedPolicyCount: number;
  materializedProviderRetentionCount: number;
  materializedTargetCount: number;
  negativeProviderOverflow: boolean;
  pendingPolicyCount: number;
  pendingPolicyOverflow: boolean;
  pendingTargetCount: number;
  pendingTargetOverflow: boolean;
  quarantinedLegacyTargetCount: number;
  retriedPolicyCount: number;
  retriedProviderCount: number;
  retriedTargetCount: number;
  retryPolicyOverflow: boolean;
  retryProviderOverflow: boolean;
  retryTargetOverflow: boolean;
  scannedBlockedPolicyCount: number;
  scannedDuePolicyCount: number;
  scannedDueAiDetailCount: number;
  scannedDueEnrichmentCount: number;
  scannedDueProviderCount: number;
  scannedDueTargetCount: number;
  scannedNegativeProviderCount: number;
  scannedPendingPolicyCount: number;
  scannedPendingTargetCount: number;
  scannedRetryPolicyCount: number;
  scannedRetryProviderCount: number;
  scannedRetryTargetCount: number;
  scannedTargetLifecycleBackfillCount: number;
  stepLimitReached: boolean;
  scrubbedExpiredAiDetailCount: number;
  scrubbedExpiredEnrichmentCount: number;
  targetLifecycleBackfillCompleted: boolean;
}

export interface RunSignalDeskSourceDataLifecycleOptions {
  authorityPageSize?: number;
  dependencyPageSize?: number;
  firestore?: Firestore;
  maxAuthorities?: number;
  maxReconciliationSteps?: number;
  maxTargets?: number;
  now?: Timestamp;
}

interface ParsedPolicy {
  data: Record<string, unknown>;
  expiresAtMillis: number;
  lifecycleState: PolicyLifecycleState | null;
  progress: PolicyProgress | null;
  sourcePolicyId: string;
  status: string;
  token: string | null;
}

interface ParsedProviderRetention {
  data: Record<string, unknown>;
  lastRefreshedAtMillis: number | null;
  provider: string;
  retentionExpiresAtMillis: number;
  sourcePolicyId: string;
  sourceRunId: string;
  status: string;
  targetId: string;
}

interface ParsedProviderRetentionLineage {
  provider: string;
  retentionExpiresAtMillis: number | null;
  sourcePolicyId: string;
  sourceRunId: string;
  targetId: string;
}

interface ParsedTarget {
  data: Record<string, unknown>;
  lifecycleState: TargetLifecycleState | null;
  progress: TargetProgress | null;
  sourcePolicyId: string;
  targetId: string;
  token: string | null;
}

interface TargetLifecycleBackfillState {
  completedPassCount: number;
  cursor: string | null;
}

type TargetLifecycleReason =
  | "legacy-unverifiable"
  | "policy-blocked"
  | "policy-expired"
  | "provider-retention"
  | "target-expired";

interface DependencyPhaseDefinition {
  action: DependencyAction;
  collection: string;
  identityField: string;
  phase: Exclude<TargetLifecyclePhase, "target-detail" | "complete">;
  queryField?: "primaryTargetId" | "targetId";
}

const DEPENDENCY_PHASES: readonly DependencyPhaseDefinition[] = [
  { action: "route-token", collection: SIGNALDESK_COLLECTIONS.ROUTE_TOKENS, identityField: "routeTokenId", phase: "route-tokens" },
  { action: "channel-window", collection: SIGNALDESK_COLLECTIONS.CHANNEL_WINDOW_STATES, identityField: "channelWindowId", phase: "channel-windows" },
  { action: "contact", collection: SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES, identityField: "identityId", phase: "contact-identities" },
  { action: "provider", collection: SIGNALDESK_COLLECTIONS.PROVIDER_SOURCE_RETENTION, identityField: "providerSourceRetentionId", phase: "provider-retention" },
  { action: "source-candidate", collection: SIGNALDESK_COLLECTIONS.SOURCE_CANDIDATES, identityField: "sourceCandidateId", phase: "source-candidates" },
  { action: "enrichment", collection: SIGNALDESK_COLLECTIONS.ENRICHMENT_RESULTS, identityField: "enrichmentResultId", phase: "enrichment-results" },
  { action: "vendor-run", collection: SIGNALDESK_COLLECTIONS.VENDOR_RUNS, identityField: "vendorRunId", phase: "vendor-runs" },
  { action: "research", collection: SIGNALDESK_COLLECTIONS.RESEARCH_TABLE_ROWS, identityField: "researchRowId", phase: "research-rows" },
  { action: "evidence", collection: SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES, identityField: "evidencePacketId", phase: "evidence-summaries" },
  { action: "evidence", collection: SIGNALDESK_COLLECTIONS.EVIDENCE_PACKETS, identityField: "evidencePacketId", phase: "evidence-packets" },
  { action: "ai-run", collection: SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS, identityField: "aiRunId", phase: "ai-worker-runs" },
  { action: "approval-packet", collection: SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS, identityField: "approvalPacketId", phase: "approval-packets" },
  { action: "draft", collection: SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES, identityField: "draftId", phase: "drafts" },
  { action: "approval", collection: SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE, identityField: "approvalId", phase: "approvals" },
  { action: "handoff", collection: SIGNALDESK_COLLECTIONS.SEQUENCER_HANDOFFS, identityField: "sequencerHandoffId", phase: "sequencer-handoffs" },
  { action: "sequence-step", collection: SIGNALDESK_COLLECTIONS.SEQUENCER_STEPS, identityField: "sequenceStepId", phase: "sequencer-steps" },
  { action: "message-export", collection: SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS, identityField: "exportId", phase: "message-exports" },
  { action: "conversation", collection: SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES, identityField: "conversationId", phase: "conversation-summaries" },
  { action: "message", collection: SIGNALDESK_COLLECTIONS.MESSAGES, identityField: "messageId", phase: "messages" },
  {
    action: "reply-classification",
    collection: SIGNALDESK_COLLECTIONS.REPLY_CLASSIFICATIONS,
    identityField: "classificationId",
    phase: "reply-classifications",
  },
  {
    action: "revenue-account",
    collection: SIGNALDESK_COLLECTIONS.REVENUE_ACCOUNTS,
    identityField: "revenueAccountId",
    phase: "revenue-accounts",
    queryField: "primaryTargetId",
  },
  {
    action: "commercial-opportunity",
    collection: SIGNALDESK_COLLECTIONS.COMMERCIAL_OPPORTUNITIES,
    identityField: "opportunityId",
    phase: "commercial-opportunities",
  },
] as const;

const PHASE_ORDER: readonly TargetLifecyclePhase[] = [
  "target-detail",
  ...DEPENDENCY_PHASES.map(definition => definition.phase),
  "complete",
];

const emptyReconciliationResult = (): SignalDeskSourceDataLifecycleReconciliationResult => ({
  closedChannelWindowCount: 0,
  closedCommercialOpportunityCount: 0,
  foreignDependencyCount: 0,
  heldApprovalCount: 0,
  legalRetentionReviewCount: 0,
  scannedDependencyCount: 0,
  scrubbedApprovalPacketCount: 0,
  scrubbedAiWorkerRunCount: 0,
  scrubbedContactIdentityCount: 0,
  scrubbedDraftCount: 0,
  scrubbedEnrichmentResultCount: 0,
  scrubbedEvidenceCount: 0,
  scrubbedMessageExportCount: 0,
  scrubbedProviderRetentionCount: 0,
  scrubbedResearchRowCount: 0,
  scrubbedRouteTokenCount: 0,
  scrubbedSequenceStepCount: 0,
  scrubbedSourceCandidateCount: 0,
  scrubbedTargetDetailCount: 0,
  scrubbedVendorRunCount: 0,
  scrubbedRevenueAccountCount: 0,
  stoppedHandoffCount: 0,
  revokedRouteTokenCount: 0,
});

const emptyTargetProgress = (): TargetProgress => ({
  ...emptyReconciliationResult(),
  cursor: null,
  phase: "target-detail",
});

const emptyResult = (): SignalDeskSourceDataLifecycleResult => ({
  ...emptyReconciliationResult(),
  aiDetailBackfillCompleted: false,
  backfilledAiDetailCount: 0,
  backfilledTargetLifecycleCount: 0,
  blockedPolicyOverflow: false,
  completedPolicyCount: 0,
  completedTargetCount: 0,
  conflictedAuthorityCount: 0,
  conflictedProviderCount: 0,
  conflictedTargetCount: 0,
  duePolicyOverflow: false,
  dueAiDetailOverflow: false,
  dueEnrichmentOverflow: false,
  dueProviderOverflow: false,
  dueTargetOverflow: false,
  failedAuthorityCount: 0,
  failedTargetCount: 0,
  failureDiagnosticErrorCount: 0,
  materializedPolicyCount: 0,
  materializedProviderRetentionCount: 0,
  materializedTargetCount: 0,
  negativeProviderOverflow: false,
  pendingPolicyCount: 0,
  pendingPolicyOverflow: false,
  pendingTargetCount: 0,
  pendingTargetOverflow: false,
  quarantinedLegacyTargetCount: 0,
  retriedPolicyCount: 0,
  retriedProviderCount: 0,
  retriedTargetCount: 0,
  retryPolicyOverflow: false,
  retryProviderOverflow: false,
  retryTargetOverflow: false,
  scannedBlockedPolicyCount: 0,
  scannedDuePolicyCount: 0,
  scannedDueAiDetailCount: 0,
  scannedDueEnrichmentCount: 0,
  scannedDueProviderCount: 0,
  scannedDueTargetCount: 0,
  scannedNegativeProviderCount: 0,
  scannedPendingPolicyCount: 0,
  scannedPendingTargetCount: 0,
  scannedRetryPolicyCount: 0,
  scannedRetryProviderCount: 0,
  scannedRetryTargetCount: 0,
  scannedTargetLifecycleBackfillCount: 0,
  stepLimitReached: false,
  scrubbedExpiredAiDetailCount: 0,
  scrubbedExpiredEnrichmentCount: 0,
  targetLifecycleBackfillCompleted: false,
});

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
);

const stableHash = (value: string): string => createHash("sha256").update(value).digest("hex");

const boundedPageSize = (value: number | undefined, fallback: number, maximum = MAX_PAGE_SIZE): number => {
  if (!Number.isInteger(value) || (value as number) < 1) return fallback;
  return Math.min(value as number, maximum);
};

const boundedCount = (value: unknown): number => {
  if (value === undefined || value === null) return 0;
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > MAX_LIFECYCLE_COUNT) {
    throw new Error("SIGNALDESK_SOURCE_DATA_LIFECYCLE_COUNT_INVALID");
  }
  return value as number;
};

const normalizeId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  if (
    !value
    || value !== value.trim()
    || value.length > MAX_ID_LENGTH
    || value === "."
    || value === ".."
    || value.includes("/")
    || value.includes("\0")
    || /^__.*__$/.test(value)
  ) return null;
  return value;
};

const requireId = (value: unknown, errorCode: string): string => {
  const id = normalizeId(value);
  if (!id) throw new Error(errorCode);
  return id;
};

const boundedString = (value: unknown, maximum = MAX_TEXT_LENGTH): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maximum ? normalized : null;
};

const timestampMillis = (value: unknown): number | null => {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) {
    const millis = value.getTime();
    return Number.isFinite(millis) ? millis : null;
  }
  const source = asRecord(value);
  if (typeof source.seconds === "number" && Number.isFinite(source.seconds)) {
    const nanoseconds = typeof source.nanoseconds === "number" && Number.isFinite(source.nanoseconds)
      ? source.nanoseconds
      : 0;
    return (source.seconds * 1000) + Math.floor(nanoseconds / 1_000_000);
  }
  return null;
};

const hasOwn = (data: Record<string, unknown>, field: string): boolean => (
  Object.prototype.hasOwnProperty.call(data, field)
);

const TARGET_SUMMARY_RETAINED_FIELDS = new Set([
  "category",
  "city",
  "contactability",
  "country",
  "currentListUrl",
  "displayName",
  "lastSourceDataLifecycleAt",
  "lastSourceDataLifecycleResult",
  "lastSourceDataLifecycleToken",
  "latestApprovalId",
  "latestConversationId",
  "latestDraftId",
  "latestManualContactAt",
  "latestManualContactResult",
  "latestManualContactRoute",
  "latestOutcomeAt",
  "latestVerifiedActivationAt",
  "latestVerifiedActivationEvidenceRef",
  "latestVerifiedActivationIntegrityStatus",
  "latestVerifiedActivationSurfaces",
  "nextAction",
  "ownerQualifiedAt",
  "pId",
  "primaryOpportunity",
  "segment",
  "sourceConfidence",
  "sourceDataExpiresAt",
  "sourceDataLifecycleBackfillVersion",
  "sourceDataLifecycleBackfilledAt",
  "sourceDataLifecycleCompletedAt",
  "sourceDataLifecycleFailedAt",
  "sourceDataLifecycleFailureCode",
  "sourceDataLifecycleFailurePhase",
  "sourceDataLifecycleInputFailureCode",
  "sourceDataLifecycleInputNormalizedAt",
  "sourceDataLifecycleKind",
  "sourceDataLifecycleLastRetryAt",
  "sourceDataLifecyclePriorState",
  "sourceDataLifecyclePriorStatus",
  "sourceDataLifecycleProgress",
  "sourceDataLifecycleQuarantinedAt",
  "sourceDataLifecycleQuarantineReason",
  "sourceDataLifecycleReason",
  "sourceDataLifecycleRetryAt",
  "sourceDataLifecycleRetryCount",
  "sourceDataLifecycleState",
  "sourceDataLifecycleToken",
  "sourceDataObservedAt",
  "sourceDataRetentionDaysApplied",
  "sourceDataTombstoneVersion",
  "sourcePolicyId",
  "sourceRunId",
  "status",
  "suppressionStatus",
  "targetId",
  "updatedAt",
  "updatedBy",
  "website",
]);

const TARGET_DETAIL_RETAINED_FIELDS = new Set([
  ...TARGET_SUMMARY_RETAINED_FIELDS,
  "email",
  "identityHash",
  "identityVersion",
  "instagram",
  "legacyIdentityHash",
  "notes",
  "permissionEvidenceRef",
  "phone",
  "provider",
  "providerIdentityHash",
  "providerRecordId",
  "providerRecordUrl",
]);

const TARGET_ACTIVE_ALLOWED_FIELDS = new Set([
  ...TARGET_SUMMARY_RETAINED_FIELDS,
  "contactabilityScore",
  "currentListGapScore",
  "fitScore",
  "riskScore",
]);

const hasOnlyAllowedFields = (data: Record<string, unknown>, allowed: ReadonlySet<string>): boolean => (
  Object.keys(data).every(field => allowed.has(field))
);

const deleteFieldsOutside = (
  data: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): Record<string, FieldValue> => Object.fromEntries(
  Object.keys(data)
    .filter(field => !allowed.has(field))
    .map(field => [field, FieldValue.delete()]),
);

const requireTimestamp = (value: unknown, errorCode: string): number => {
  const millis = timestampMillis(value);
  if (millis === null) throw new Error(errorCode);
  return millis;
};

const assertOptionalTimestamp = (value: unknown, errorCode: string): void => {
  if (value !== undefined && value !== null && timestampMillis(value) === null) throw new Error(errorCode);
};

const lifecycleToken = (kind: "policy" | "provider" | "target", values: Array<string | number | null>): string => (
  `source_data_${kind}_${stableHash(JSON.stringify(values)).slice(0, 40)}`
);

const lifecycleAuditId = (event: string, identity: string): string => (
  `source_data_${stableHash(`${event}|${identity}`).slice(0, 40)}`
);

const lifecycleTimelineId = (identity: string): string => (
  `source_data_${stableHash(identity).slice(0, 40)}`
);

const assertLifecycleTimeline = (params: {
  entityId: string;
  entityType: "source-quality" | "target";
  snapshot: DocumentSnapshot;
}): void => {
  if (!params.snapshot.exists) throw new Error("SIGNALDESK_SOURCE_DATA_LIFECYCLE_TIMELINE_MISSING");
  const data = asRecord(params.snapshot.data());
  if (
    data.pId !== SIGNALDESK_PRODUCT_CODE
    || data.runTimelineId !== params.snapshot.id
    || data.entityId !== params.entityId
    || data.entityType !== params.entityType
    || !boundedString(data.label, 180)
    || !["held", "completed", "blocked"].includes(String(data.status || ""))
  ) throw new Error("SIGNALDESK_SOURCE_DATA_LIFECYCLE_TIMELINE_SHAPE_INVALID");
};

const nextPhase = (phase: TargetLifecyclePhase): TargetLifecyclePhase => {
  const index = PHASE_ORDER.indexOf(phase);
  if (index < 0 || index >= PHASE_ORDER.length - 1) return "complete";
  return PHASE_ORDER[index + 1];
};

const samePolicyPosition = (left: PolicyProgress, right: PolicyProgress): boolean => left.cursor === right.cursor;

const sameTargetPosition = (left: TargetProgress, right: TargetProgress): boolean => (
  left.phase === right.phase && left.cursor === right.cursor
);

const readPolicyProgress = (value: unknown): PolicyProgress => {
  const data = asRecord(value);
  const cursor = data.cursor === undefined || data.cursor === null ? null : normalizeId(data.cursor);
  if (data.cursor != null && !cursor) throw new Error("SIGNALDESK_SOURCE_POLICY_LIFECYCLE_PROGRESS_INVALID");
  return {
    cursor,
    heldTargetCount: boundedCount(data.heldTargetCount),
    scannedTargetCount: boundedCount(data.scannedTargetCount),
  };
};

const readTargetProgress = (value: unknown): TargetProgress => {
  const data = asRecord(value);
  const phase = data.phase;
  if (!PHASE_ORDER.includes(phase as TargetLifecyclePhase)) {
    throw new Error("SIGNALDESK_SOURCE_DATA_LIFECYCLE_PROGRESS_INVALID");
  }
  const cursor = data.cursor === undefined || data.cursor === null ? null : normalizeId(data.cursor);
  if (data.cursor != null && !cursor) throw new Error("SIGNALDESK_SOURCE_DATA_LIFECYCLE_PROGRESS_INVALID");
  const counts = emptyReconciliationResult();
  for (const key of Object.keys(counts) as Array<keyof SignalDeskSourceDataLifecycleReconciliationResult>) {
    counts[key] = boundedCount(data[key]);
  }
  return { ...counts, cursor, phase: phase as TargetLifecyclePhase };
};

const parsePolicy = (snapshot: DocumentSnapshot): ParsedPolicy => {
  if (!snapshot.exists) throw new Error("SIGNALDESK_SOURCE_POLICY_MISSING");
  const data = asRecord(snapshot.data());
  if (data.pId !== SIGNALDESK_PRODUCT_CODE) throw new Error("SIGNALDESK_SOURCE_POLICY_PRODUCT_MISMATCH");
  const sourcePolicyId = requireId(data.sourcePolicyId, "SIGNALDESK_SOURCE_POLICY_IDENTITY_INVALID");
  if (sourcePolicyId !== snapshot.id) throw new Error("SIGNALDESK_SOURCE_POLICY_IDENTITY_MISMATCH");
  const status = boundedString(data.status, 40);
  if (!status || !POLICY_STATUSES.has(status)) throw new Error("SIGNALDESK_SOURCE_POLICY_STATUS_INVALID");
  const expiresAtMillis = requireTimestamp(data.expiresAt, "SIGNALDESK_SOURCE_POLICY_EXPIRY_INVALID");
  requireTimestamp(data.approvedAt, "SIGNALDESK_SOURCE_POLICY_APPROVAL_TIMESTAMP_INVALID");
  requireTimestamp(data.createdAt, "SIGNALDESK_SOURCE_POLICY_CREATED_TIMESTAMP_INVALID");
  requireTimestamp(data.lastReviewedAt, "SIGNALDESK_SOURCE_POLICY_REVIEW_TIMESTAMP_INVALID");
  assertOptionalTimestamp(data.updatedAt, "SIGNALDESK_SOURCE_POLICY_UPDATED_TIMESTAMP_INVALID");
  if (!Number.isInteger(data.retentionDays) || (data.retentionDays as number) < 1 || (data.retentionDays as number) > 365) {
    throw new Error("SIGNALDESK_SOURCE_POLICY_RETENTION_INVALID");
  }
  const lifecycleState = data.sourceDataPolicyLifecycleState == null
    ? null
    : boundedString(data.sourceDataPolicyLifecycleState, 40);
  if (lifecycleState !== null && !["pending", "completed", "failed"].includes(lifecycleState)) {
    throw new Error("SIGNALDESK_SOURCE_POLICY_LIFECYCLE_STATE_INVALID");
  }
  const token = data.sourceDataPolicyLifecycleToken == null
    ? null
    : requireId(data.sourceDataPolicyLifecycleToken, "SIGNALDESK_SOURCE_POLICY_LIFECYCLE_TOKEN_INVALID");
  const progress = lifecycleState === "pending" || lifecycleState === "failed"
    ? readPolicyProgress(data.sourceDataPolicyLifecycleProgress)
    : null;
  if ((lifecycleState === "pending" || lifecycleState === "failed") && !token) {
    throw new Error("SIGNALDESK_SOURCE_POLICY_LIFECYCLE_TOKEN_INVALID");
  }
  if (lifecycleState === "completed" && data.sourceDataPolicyLifecycleProgress != null) {
    throw new Error("SIGNALDESK_SOURCE_POLICY_LIFECYCLE_PROGRESS_INVALID");
  }
  return {
    data,
    expiresAtMillis,
    lifecycleState: lifecycleState as PolicyLifecycleState | null,
    progress,
    sourcePolicyId,
    status,
    token,
  };
};

const parseProviderRetention = (snapshot: DocumentSnapshot): ParsedProviderRetention => {
  if (!snapshot.exists) throw new Error("SIGNALDESK_PROVIDER_RETENTION_MISSING");
  const data = asRecord(snapshot.data());
  if (data.pId !== SIGNALDESK_PRODUCT_CODE) throw new Error("SIGNALDESK_PROVIDER_RETENTION_PRODUCT_MISMATCH");
  const identity = requireId(data.providerSourceRetentionId, "SIGNALDESK_PROVIDER_RETENTION_IDENTITY_INVALID");
  if (identity !== snapshot.id) throw new Error("SIGNALDESK_PROVIDER_RETENTION_IDENTITY_MISMATCH");
  const provider = boundedString(data.provider, 80);
  if (!provider || !PROVIDERS.has(provider)) throw new Error("SIGNALDESK_PROVIDER_RETENTION_PROVIDER_INVALID");
  const status = boundedString(data.status, 40);
  if (!status || !PROVIDER_RETENTION_STATUSES.has(status)) throw new Error("SIGNALDESK_PROVIDER_RETENTION_STATUS_INVALID");
  if (data.rawPayloadStored !== false) throw new Error("SIGNALDESK_PROVIDER_RETENTION_RAW_PAYLOAD_INVALID");
  const sourcePolicyId = requireId(data.sourcePolicyId, "SIGNALDESK_PROVIDER_RETENTION_POLICY_INVALID");
  const sourceRunId = requireId(data.sourceRunId, "SIGNALDESK_PROVIDER_RETENTION_RUN_INVALID");
  const targetId = requireId(data.targetId, "SIGNALDESK_PROVIDER_RETENTION_TARGET_INVALID");
  const retentionExpiresAtMillis = requireTimestamp(
    data.retentionExpiresAt,
    "SIGNALDESK_PROVIDER_RETENTION_EXPIRY_INVALID",
  );
  const lastRefreshedAtMillis = data.lastRefreshedAt == null
    ? null
    : requireTimestamp(data.lastRefreshedAt, "SIGNALDESK_PROVIDER_RETENTION_REFRESH_TIMESTAMP_INVALID");
  assertOptionalTimestamp(data.refreshDueAt, "SIGNALDESK_PROVIDER_RETENTION_DUE_TIMESTAMP_INVALID");
  requireTimestamp(data.updatedAt, "SIGNALDESK_PROVIDER_RETENTION_UPDATED_TIMESTAMP_INVALID");
  const lifecycleState = data.sourceDataLifecycleState == null
    ? null
    : boundedString(data.sourceDataLifecycleState, 40);
  if (lifecycleState !== null && !["active", "scrub_ready", "completed", "failed"].includes(lifecycleState)) {
    throw new Error("SIGNALDESK_PROVIDER_RETENTION_LIFECYCLE_STATE_INVALID");
  }
  return {
    data,
    lastRefreshedAtMillis,
    provider,
    retentionExpiresAtMillis,
    sourcePolicyId,
    sourceRunId,
    status,
    targetId,
  };
};

const parseProviderRetentionLineage = (snapshot: DocumentSnapshot): ParsedProviderRetentionLineage => {
  if (!snapshot.exists) throw new Error("SIGNALDESK_PROVIDER_RETENTION_MISSING");
  const data = asRecord(snapshot.data());
  if (data.pId !== SIGNALDESK_PRODUCT_CODE) throw new Error("SIGNALDESK_PROVIDER_RETENTION_PRODUCT_MISMATCH");
  const identity = requireId(data.providerSourceRetentionId, "SIGNALDESK_PROVIDER_RETENTION_IDENTITY_INVALID");
  if (identity !== snapshot.id) throw new Error("SIGNALDESK_PROVIDER_RETENTION_IDENTITY_MISMATCH");
  const provider = boundedString(data.provider, 80);
  if (!provider || !PROVIDERS.has(provider)) throw new Error("SIGNALDESK_PROVIDER_RETENTION_PROVIDER_INVALID");
  return {
    provider,
    retentionExpiresAtMillis: timestampMillis(data.retentionExpiresAt),
    sourcePolicyId: requireId(data.sourcePolicyId, "SIGNALDESK_PROVIDER_RETENTION_POLICY_INVALID"),
    sourceRunId: requireId(data.sourceRunId, "SIGNALDESK_PROVIDER_RETENTION_RUN_INVALID"),
    targetId: requireId(data.targetId, "SIGNALDESK_PROVIDER_RETENTION_TARGET_INVALID"),
  };
};

const parseTarget = (snapshot: DocumentSnapshot): ParsedTarget => {
  if (!snapshot.exists) throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_MISSING");
  const data = asRecord(snapshot.data());
  if (data.pId !== SIGNALDESK_PRODUCT_CODE) throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_PRODUCT_MISMATCH");
  const targetId = requireId(data.targetId, "SIGNALDESK_SOURCE_DATA_TARGET_IDENTITY_INVALID");
  if (targetId !== snapshot.id) throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_IDENTITY_MISMATCH");
  const sourcePolicyId = requireId(data.sourcePolicyId, "SIGNALDESK_SOURCE_DATA_TARGET_POLICY_INVALID");
  const status = boundedString(data.status, 40);
  const segment = boundedString(data.segment, 20);
  const nextAction = boundedString(data.nextAction, 40);
  const contactability = boundedString(data.contactability, 40);
  const sourceConfidence = boundedString(data.sourceConfidence, 40);
  if (!status || !TARGET_STATUSES.has(status)) throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_STATUS_INVALID");
  if (!segment || !TARGET_SEGMENTS.has(segment)) throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_SEGMENT_INVALID");
  if (!nextAction || !TARGET_NEXT_ACTIONS.has(nextAction)) throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_NEXT_ACTION_INVALID");
  if (!contactability || !TARGET_CONTACTABILITY.has(contactability)) {
    throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_CONTACTABILITY_INVALID");
  }
  if (!sourceConfidence || !TARGET_CONFIDENCE.has(sourceConfidence)) {
    throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_CONFIDENCE_INVALID");
  }
  requireTimestamp(data.updatedAt, "SIGNALDESK_SOURCE_DATA_TARGET_UPDATED_TIMESTAMP_INVALID");
  assertOptionalTimestamp(data.sourceDataExpiresAt, "SIGNALDESK_SOURCE_DATA_TARGET_EXPIRY_INVALID");
  assertOptionalTimestamp(data.sourceDataObservedAt, "SIGNALDESK_SOURCE_DATA_TARGET_OBSERVED_TIMESTAMP_INVALID");
  const lifecycleState = data.sourceDataLifecycleState == null
    ? null
    : boundedString(data.sourceDataLifecycleState, 40);
  if (lifecycleState !== null && !["active", "pending", "completed", "failed"].includes(lifecycleState)) {
    throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_LIFECYCLE_STATE_INVALID");
  }
  const token = data.sourceDataLifecycleToken == null
    ? null
    : requireId(data.sourceDataLifecycleToken, "SIGNALDESK_SOURCE_DATA_TARGET_LIFECYCLE_TOKEN_INVALID");
  const progress = lifecycleState === "pending" || lifecycleState === "failed"
    ? readTargetProgress(data.sourceDataLifecycleProgress)
    : null;
  if ((lifecycleState === "pending" || lifecycleState === "failed") && (!token || !progress)) {
    throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_LIFECYCLE_SHAPE_INVALID");
  }
  if (lifecycleState === "completed" && data.sourceDataLifecycleProgress != null) {
    throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_LIFECYCLE_PROGRESS_INVALID");
  }
  return {
    data,
    lifecycleState: lifecycleState as TargetLifecycleState | null,
    progress,
    sourcePolicyId,
    targetId,
    token,
  };
};

const readPendingPolicy = (snapshot: DocumentSnapshot, expectedToken?: string): ParsedPolicy => {
  const policy = parsePolicy(snapshot);
  if (policy.lifecycleState !== "pending" || !policy.progress || !policy.token) {
    throw new Error("SIGNALDESK_SOURCE_POLICY_LIFECYCLE_STATE_INVALID");
  }
  if (policy.status !== "inactive") throw new Error("SIGNALDESK_SOURCE_POLICY_LIFECYCLE_STATUS_INVALID");
  if (expectedToken && policy.token !== expectedToken) {
    throw new Error("SIGNALDESK_SOURCE_POLICY_LIFECYCLE_SUPERSEDED");
  }
  return policy;
};

const readPendingTarget = (snapshot: DocumentSnapshot, expectedToken?: string): ParsedTarget => {
  const target = parseTarget(snapshot);
  if (target.lifecycleState !== "pending" || !target.progress || !target.token) {
    throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_LIFECYCLE_STATE_INVALID");
  }
  if (
    target.data.status !== "held"
    || target.data.segment !== "hold"
    || target.data.nextAction !== "hold"
    || target.data.contactability !== "blocked"
    || target.data.sourceConfidence !== "blocked"
  ) throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_HOLD_INVALID");
  if (target.data.sourceDataLifecycleKind !== TARGET_LIFECYCLE_KIND) {
    throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_LIFECYCLE_KIND_INVALID");
  }
  if (expectedToken && target.token !== expectedToken) {
    throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_LIFECYCLE_SUPERSEDED");
  }
  return target;
};

export const signalDeskSourcePolicyLifecycleAuthorityHash = (value: unknown): string => {
  const data = asRecord(value);
  return stableHash(JSON.stringify({
    approvedAt: timestampMillis(data.approvedAt),
    createdAt: timestampMillis(data.createdAt),
    expiresAt: timestampMillis(data.expiresAt),
    lastReviewedAt: timestampMillis(data.lastReviewedAt),
    pId: data.pId ?? null,
    provider: data.provider ?? null,
    retentionDays: data.retentionDays ?? null,
    sourceDataPolicyLifecycleProgress: data.sourceDataPolicyLifecycleProgress ?? null,
    sourceDataPolicyLifecycleRetryAt: timestampMillis(data.sourceDataPolicyLifecycleRetryAt),
    sourceDataPolicyLifecycleRetryCount: data.sourceDataPolicyLifecycleRetryCount ?? null,
    sourceDataPolicyLifecycleState: data.sourceDataPolicyLifecycleState ?? null,
    sourceDataPolicyLifecycleToken: data.sourceDataPolicyLifecycleToken ?? null,
    sourcePolicyId: data.sourcePolicyId ?? null,
    sourceType: data.sourceType ?? null,
    status: data.status ?? null,
    updatedAt: timestampMillis(data.updatedAt),
  }));
};

export const signalDeskSourceDataLifecycleAuthorityHash = (value: unknown): string => {
  const data = asRecord(value);
  return stableHash(JSON.stringify({
    contactability: data.contactability ?? null,
    nextAction: data.nextAction ?? null,
    pId: data.pId ?? null,
    segment: data.segment ?? null,
    sourceConfidence: data.sourceConfidence ?? null,
    sourceDataExpiresAt: timestampMillis(data.sourceDataExpiresAt),
    sourceDataLifecycleKind: data.sourceDataLifecycleKind ?? null,
    sourceDataLifecycleProgress: data.sourceDataLifecycleProgress ?? null,
    sourceDataLifecycleState: data.sourceDataLifecycleState ?? null,
    sourceDataLifecycleToken: data.sourceDataLifecycleToken ?? null,
    sourceDataObservedAt: timestampMillis(data.sourceDataObservedAt),
    sourcePolicyId: data.sourcePolicyId ?? null,
    sourceRunId: data.sourceRunId ?? null,
    status: data.status ?? null,
    targetId: data.targetId ?? null,
    updatedAt: timestampMillis(data.updatedAt),
  }));
};

export const signalDeskProviderSourceDataLifecycleAuthorityHash = (value: unknown): string => {
  const data = asRecord(value);
  return stableHash(JSON.stringify({
    lastRefreshedAt: timestampMillis(data.lastRefreshedAt),
    pId: data.pId ?? null,
    provider: data.provider ?? null,
    providerRecordId: data.providerRecordId ?? null,
    providerRecordUrl: data.providerRecordUrl ?? null,
    providerSourceRetentionId: data.providerSourceRetentionId ?? null,
    rawPayloadStored: data.rawPayloadStored ?? null,
    refreshDueAt: timestampMillis(data.refreshDueAt),
    retentionExpiresAt: timestampMillis(data.retentionExpiresAt),
    sourceDataLifecycleProgress: data.sourceDataLifecycleProgress ?? null,
    sourceDataLifecycleRetryAt: timestampMillis(data.sourceDataLifecycleRetryAt),
    sourceDataLifecycleRetryCount: data.sourceDataLifecycleRetryCount ?? null,
    sourceDataLifecycleState: data.sourceDataLifecycleState ?? null,
    sourceDataLifecycleToken: data.sourceDataLifecycleToken ?? null,
    sourcePolicyId: data.sourcePolicyId ?? null,
    sourceRunId: data.sourceRunId ?? null,
    status: data.status ?? null,
    targetId: data.targetId ?? null,
    updatedAt: timestampMillis(data.updatedAt),
  }));
};

const sourceErrorContext = (error: unknown): { sourceErrorCode?: string; sourceErrorName: string } => {
  if (!error || typeof error !== "object") return { sourceErrorName: typeof error };
  const data = error as { code?: unknown; name?: unknown };
  return {
    sourceErrorName: typeof data.name === "string" ? data.name.slice(0, 80) : "Error",
    ...(typeof data.code === "string" || typeof data.code === "number"
      ? { sourceErrorCode: String(data.code).slice(0, 80) }
      : {}),
  };
};

const lifecycleFailureCode = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error || "unknown");
  const normalized = raw.trim().toUpperCase();
  return /^SIGNALDESK_[A-Z0-9_]+$/.test(normalized)
    ? normalized.slice(0, 160)
    : "SIGNALDESK_SOURCE_DATA_LIFECYCLE_PROCESSING_FAILED";
};

const retryDelay = (priorRetryCount: number): number => Math.min(
  FAILURE_RETRY_MAX_MS,
  FAILURE_RETRY_BASE_MS * (2 ** Math.min(priorRetryCount, 8)),
);

const assertControlRoomSummary = (snapshot: DocumentSnapshot): void => {
  const data = asRecord(snapshot.data());
  if (data.pId !== undefined && data.pId !== null && data.pId !== SIGNALDESK_PRODUCT_CODE) {
    throw new Error("SIGNALDESK_CONTROL_ROOM_PRODUCT_MISMATCH");
  }
  for (const field of ["incidentCount", "openIncidentCount"]) {
    if (data[field] !== undefined && data[field] !== null && (
      !Number.isInteger(data[field]) || (data[field] as number) < 0
    )) throw new Error("SIGNALDESK_CONTROL_ROOM_SHAPE_INVALID");
  }
};

const summaryCount = (data: Record<string, unknown>, field: string): number => {
  const value = data[field];
  if (value == null) return 0;
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > MAX_LIFECYCLE_COUNT) {
    throw new Error("SIGNALDESK_SOURCE_DATA_SUMMARY_COUNT_INVALID");
  }
  return value as number;
};

const stageNewHighIncidentSummary = (params: {
  count: number;
  controlRef: DocumentReference;
  controlSnapshot: DocumentSnapshot;
  now: Timestamp;
  transaction: Transaction;
}): void => {
  if (!Number.isSafeInteger(params.count) || params.count < 1) {
    throw new Error("SIGNALDESK_SOURCE_DATA_INCIDENT_INCREMENT_INVALID");
  }
  assertControlRoomSummary(params.controlSnapshot);
  const current = asRecord(params.controlSnapshot.data());
  const incidentCount = summaryCount(current, "incidentCount") + params.count;
  const openIncidentCount = summaryCount(current, "openIncidentCount") + params.count;
  if (incidentCount > MAX_LIFECYCLE_COUNT || openIncidentCount > MAX_LIFECYCLE_COUNT) {
    throw new Error("SIGNALDESK_SOURCE_DATA_INCIDENT_COUNT_OVERFLOW");
  }
  params.transaction.set(params.controlRef, {
    controlRoomSummaryId: SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM,
    incidentCount,
    openIncidentCount,
    pId: SIGNALDESK_PRODUCT_CODE,
    safetyStatus: "blocked",
    updatedAt: params.now,
  }, { merge: true });
};

const summaryAmount = (data: Record<string, unknown>, field: string): number => {
  const value = data[field];
  if (value == null) return 0;
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error("SIGNALDESK_SOURCE_DATA_SUMMARY_AMOUNT_INVALID");
  }
  return value as number;
};

const assertOperationalSummary = (params: {
  idField: "queueSummaryId" | "revenueControlSummaryId";
  snapshot: DocumentSnapshot;
}): Record<string, unknown> => {
  if (!params.snapshot.exists) return {};
  const data = asRecord(params.snapshot.data());
  if (
    (data.pId != null && data.pId !== SIGNALDESK_PRODUCT_CODE)
    || (data[params.idField] != null && data[params.idField] !== params.snapshot.id)
  ) {
    throw new Error("SIGNALDESK_SOURCE_DATA_SUMMARY_IDENTITY_INVALID");
  }
  return data;
};

const reconciliationResultFromProgress = (
  progress: TargetProgress,
): SignalDeskSourceDataLifecycleReconciliationResult => {
  const result = emptyReconciliationResult();
  for (const key of Object.keys(result) as Array<keyof SignalDeskSourceDataLifecycleReconciliationResult>) {
    result[key] = progress[key];
  }
  return result;
};

const addReconciliationResult = (
  aggregate: SignalDeskSourceDataLifecycleResult,
  value: SignalDeskSourceDataLifecycleReconciliationResult,
): void => {
  for (const key of Object.keys(value) as Array<keyof SignalDeskSourceDataLifecycleReconciliationResult>) {
    aggregate[key] += value[key];
  }
};

const targetLifecycleToken = (target: ParsedTarget, expiresAtMillis: number): string => lifecycleToken("target", [
  target.targetId,
  target.sourcePolicyId,
  expiresAtMillis,
  timestampMillis(target.data.sourceDataObservedAt),
  boundedString(target.data.sourceRunId, MAX_ID_LENGTH),
]);

const targetSummaryScrubPatch = (params: {
  allowedFields?: ReadonlySet<string>;
  expiresAtMillis: number;
  existingData?: Record<string, unknown>;
  now: Timestamp;
  progress: TargetProgress;
  reason: TargetLifecycleReason;
  token: string;
}): Record<string, unknown> => ({
  ...(params.existingData
    ? deleteFieldsOutside(params.existingData, params.allowedFields || TARGET_SUMMARY_RETAINED_FIELDS)
    : {}),
  category: null,
  city: null,
  contactability: "blocked",
  contactabilityScore: FieldValue.delete(),
  country: null,
  currentListGapScore: FieldValue.delete(),
  currentListUrl: null,
  displayName: "Retained target record",
  fitScore: FieldValue.delete(),
  nextAction: "hold",
  primaryOpportunity: "unknown",
  riskScore: FieldValue.delete(),
  segment: "hold",
  sourceConfidence: "blocked",
  sourceDataExpiresAt: Timestamp.fromMillis(params.expiresAtMillis),
  sourceDataLifecycleCompletedAt: null,
  sourceDataLifecycleFailedAt: null,
  sourceDataLifecycleFailureCode: null,
  sourceDataLifecycleFailurePhase: null,
  sourceDataLifecycleKind: TARGET_LIFECYCLE_KIND,
  sourceDataLifecycleLastRetryAt: null,
  sourceDataLifecycleProgress: params.progress,
  sourceDataLifecycleReason: params.reason,
  sourceDataLifecycleRetryAt: null,
  sourceDataLifecycleRetryCount: 0,
  sourceDataLifecycleState: "pending",
  sourceDataLifecycleToken: params.token,
  sourceDataTombstoneVersion: "source-data-tombstone-v1",
  status: "held",
  updatedAt: params.now,
  updatedBy: SYSTEM_ACTOR_ID,
  website: null,
});

const isCanonicalLifecycleToken = (value: unknown, allowProvider = false): boolean => (
  typeof value === "string"
  && new RegExp(`^source_data_${allowProvider ? "(?:target|provider)" : "target"}_[a-f0-9]{40}$`).test(value)
);

const hasCommonCompletedLifecycleInvariant = (
  data: Record<string, unknown>,
  allowProviderToken = false,
): boolean => {
  const completedAt = timestampMillis(data.sourceDataLifecycleCompletedAt);
  const updatedAt = timestampMillis(data.updatedAt);
  return data.sourceDataLifecycleState === "completed"
    && data.sourceDataLifecycleKind === TARGET_LIFECYCLE_KIND
    && completedAt !== null
    && updatedAt !== null
    && completedAt <= updatedAt
    && data.updatedBy === SYSTEM_ACTOR_ID
    && isCanonicalLifecycleToken(data.sourceDataLifecycleToken, allowProviderToken);
};

const isRetainedTargetSummary = (data: Record<string, unknown>): boolean => (
  hasCommonCompletedLifecycleInvariant(data)
  && hasOnlyAllowedFields(data, TARGET_SUMMARY_RETAINED_FIELDS)
  && data.status === "held"
  && data.segment === "hold"
  && data.nextAction === "hold"
  && data.contactability === "blocked"
  && data.sourceConfidence === "blocked"
  && data.displayName === "Retained target record"
  && data.category === null
  && data.city === null
  && data.country === null
  && data.currentListUrl === null
  && data.website === null
  && data.primaryOpportunity === "unknown"
  && !hasOwn(data, "contactabilityScore")
  && !hasOwn(data, "currentListGapScore")
  && !hasOwn(data, "fitScore")
  && !hasOwn(data, "riskScore")
);

const isRetainedTargetDetail = (data: Record<string, unknown>): boolean => (
  hasCommonCompletedLifecycleInvariant(data)
  && hasOnlyAllowedFields(data, TARGET_DETAIL_RETAINED_FIELDS)
  && data.sourceDataLifecycleProgress == null
  && data.status === "held"
  && data.segment === "hold"
  && data.nextAction === "hold"
  && data.contactability === "blocked"
  && data.sourceConfidence === "blocked"
  && data.displayName === "Retained target record"
  && data.category === null
  && data.city === null
  && data.country === null
  && data.currentListUrl === null
  && data.website === null
  && data.primaryOpportunity === "unknown"
  && data.email === null
  && data.instagram === null
  && data.notes === null
  && data.permissionEvidenceRef === null
  && data.phone === null
  && data.provider === null
  && data.providerRecordId === null
  && data.providerRecordUrl === null
  && /^[a-f0-9]{64}$/.test(boundedString(data.identityHash, 64) || "")
  && /^[a-f0-9]{64}$/.test(boundedString(data.providerIdentityHash, 64) || "")
  && !hasOwn(data, "contactabilityScore")
  && !hasOwn(data, "currentListGapScore")
  && !hasOwn(data, "fitScore")
  && !hasOwn(data, "instagramRecipientId")
  && !hasOwn(data, "messengerPsid")
  && !hasOwn(data, "messengerRecipientId")
  && !hasOwn(data, "recipient")
  && !hasOwn(data, "riskScore")
);

const stageTargetHold = (params: {
  expiresAtMillis: number;
  now: Timestamp;
  reason: TargetLifecycleReason;
  snapshot: DocumentSnapshot;
  sourcePolicyId: string;
  transaction: Transaction;
}): { newHighIncidentCount: number; newlyMaterialized: boolean; token: string | null } => {
  let target: ParsedTarget;
  try {
    target = parseTarget(params.snapshot);
  } catch (error) {
    const data = asRecord(params.snapshot.data());
    const targetId = normalizeId(params.snapshot.id);
    if (
      !targetId
      || data.pId !== SIGNALDESK_PRODUCT_CODE
      || data.sourcePolicyId !== params.sourcePolicyId
    ) throw error;
    const failureCode = lifecycleFailureCode(error);
    const token = lifecycleToken("target", [
      "malformed-authority",
      targetId,
      params.sourcePolicyId,
      params.expiresAtMillis,
      timestampMillis(data.sourceDataObservedAt),
      timestampMillis(data.updatedAt),
      failureCode,
    ]);
    const progress = emptyTargetProgress();
    params.transaction.set(params.snapshot.ref, {
      ...targetSummaryScrubPatch({
        existingData: data,
        expiresAtMillis: params.expiresAtMillis,
        now: params.now,
        progress,
        reason: params.reason,
        token,
      }),
      pId: SIGNALDESK_PRODUCT_CODE,
      sourceDataLifecycleInputFailureCode: failureCode,
      sourceDataLifecycleInputNormalizedAt: params.now,
      sourceDataObservedAt: timestampMillis(data.sourceDataObservedAt) === null
        ? null
        : data.sourceDataObservedAt,
      sourcePolicyId: params.sourcePolicyId,
      targetId,
    }, { merge: true });
    const auditRef = params.snapshot.ref.firestore.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
      .doc(lifecycleAuditId("target-source-data-malformed-held", token));
    params.transaction.create(auditRef, {
      action: "source_data_target_malformed_authority_normalized",
      actorId: SYSTEM_ACTOR_ID,
      actorRole: SYSTEM_ACTOR_ROLE,
      auditEventId: auditRef.id,
      createdAt: params.now,
      entityId: targetId,
      entityType: "target",
      pId: SIGNALDESK_PRODUCT_CODE,
      reason: failureCode,
    });
    const incidentRef = params.snapshot.ref.firestore.collection(SIGNALDESK_COLLECTIONS.INCIDENTS)
      .doc(`source_data_malformed_target_${stableHash(token).slice(0, 40)}`);
    params.transaction.create(incidentRef, {
      authorityId: targetId,
      authorityKind: "target",
      createdAt: params.now,
      failureCode,
      failurePhase: "materialize",
      incidentId: incidentRef.id,
      incidentType: "source-data-malformed-authority",
      pId: SIGNALDESK_PRODUCT_CODE,
      severity: "high",
      status: "open",
      title: "Malformed source-data authority was held and normalized",
      updatedAt: params.now,
    });
    const timelineRef = params.snapshot.ref.firestore.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES)
      .doc(lifecycleTimelineId(`target|${token}`));
    params.transaction.create(timelineRef, {
      entityId: targetId,
      entityType: "target",
      label: "Source-data retention lifecycle",
      pId: SIGNALDESK_PRODUCT_CODE,
      runTimelineId: timelineRef.id,
      status: "held",
      steps: [{
        at: params.now.toDate().toISOString(),
        label: "Malformed target authority normalized and held before source-data scrub",
        status: "held",
      }],
      updatedAt: params.now,
    });
    return { newHighIncidentCount: 1, newlyMaterialized: true, token };
  }
  if (target.sourcePolicyId !== params.sourcePolicyId) {
    throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_POLICY_MISMATCH");
  }
  if (target.lifecycleState === "pending" || target.lifecycleState === "failed") {
    const holdInvariantValid = target.data.status === "held"
      && target.data.segment === "hold"
      && target.data.nextAction === "hold"
      && target.data.contactability === "blocked"
      && target.data.sourceConfidence === "blocked"
      && target.data.sourceDataLifecycleKind === TARGET_LIFECYCLE_KIND;
    if (!holdInvariantValid) {
      params.transaction.set(params.snapshot.ref, {
        contactability: "blocked",
        nextAction: "hold",
        segment: "hold",
        sourceConfidence: "blocked",
        sourceDataLifecycleInputFailureCode: "SIGNALDESK_SOURCE_DATA_TARGET_HOLD_REPAIRED",
        sourceDataLifecycleInputNormalizedAt: params.now,
        sourceDataLifecycleKind: TARGET_LIFECYCLE_KIND,
        sourceDataLifecycleReason: params.reason,
        status: "held",
        updatedAt: params.now,
        updatedBy: SYSTEM_ACTOR_ID,
      }, { merge: true });
    }
    return { newHighIncidentCount: 0, newlyMaterialized: false, token: target.token };
  }
  if (target.lifecycleState === "completed") {
    if (isRetainedTargetSummary(target.data)) {
      return { newHighIncidentCount: 0, newlyMaterialized: false, token: null };
    }
    const repairToken = lifecycleToken("target", [
      "completed-summary-repair",
      target.targetId,
      target.sourcePolicyId,
      params.expiresAtMillis,
      timestampMillis(target.data.sourceDataObservedAt),
      timestampMillis(target.data.updatedAt),
    ]);
    params.transaction.set(params.snapshot.ref, {
      ...targetSummaryScrubPatch({
        existingData: target.data,
        expiresAtMillis: params.expiresAtMillis,
        now: params.now,
        progress: emptyTargetProgress(),
        reason: params.reason,
        token: repairToken,
      }),
      sourceDataLifecycleInputFailureCode: "SIGNALDESK_SOURCE_DATA_COMPLETED_TOMBSTONE_REPAIRED",
      sourceDataLifecycleInputNormalizedAt: params.now,
    }, { merge: true });
    const auditRef = params.snapshot.ref.firestore.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
      .doc(lifecycleAuditId("target-source-data-completed-tombstone-repaired", repairToken));
    params.transaction.create(auditRef, {
      action: "source_data_target_completed_tombstone_repaired",
      actorId: SYSTEM_ACTOR_ID,
      actorRole: SYSTEM_ACTOR_ROLE,
      auditEventId: auditRef.id,
      createdAt: params.now,
      entityId: target.targetId,
      entityType: "target",
      pId: SIGNALDESK_PRODUCT_CODE,
      reason: "SIGNALDESK_SOURCE_DATA_COMPLETED_TOMBSTONE_REPAIRED",
    });
    const timelineRef = params.snapshot.ref.firestore.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES)
      .doc(lifecycleTimelineId(`target|${repairToken}`));
    params.transaction.create(timelineRef, {
      entityId: target.targetId,
      entityType: "target",
      label: "Source-data retention lifecycle",
      pId: SIGNALDESK_PRODUCT_CODE,
      runTimelineId: timelineRef.id,
      status: "held",
      steps: [{
        at: params.now.toDate().toISOString(),
        label: "Corrupt completed tombstone re-opened for source-data scrub",
        status: "held",
      }],
      updatedAt: params.now,
    });
    return { newHighIncidentCount: 0, newlyMaterialized: true, token: repairToken };
  }

  const token = targetLifecycleToken(target, params.expiresAtMillis);
  const progress = emptyTargetProgress();
  params.transaction.set(params.snapshot.ref, targetSummaryScrubPatch({
    existingData: target.data,
    expiresAtMillis: params.expiresAtMillis,
    now: params.now,
    progress,
    reason: params.reason,
    token,
  }), { merge: true });

  const auditRef = params.snapshot.ref.firestore.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
    .doc(lifecycleAuditId("target-source-data-held", token));
  params.transaction.create(auditRef, {
    action: "source_data_target_held_for_retention_scrub",
    actorId: SYSTEM_ACTOR_ID,
    actorRole: SYSTEM_ACTOR_ROLE,
    auditEventId: auditRef.id,
    createdAt: params.now,
    entityId: target.targetId,
    entityType: "target",
    pId: SIGNALDESK_PRODUCT_CODE,
    reason: params.reason,
  });
  const timelineRef = params.snapshot.ref.firestore.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES)
    .doc(lifecycleTimelineId(`target|${token}`));
  params.transaction.create(timelineRef, {
    entityId: target.targetId,
    entityType: "target",
    label: "Source-data retention lifecycle",
    pId: SIGNALDESK_PRODUCT_CODE,
    runTimelineId: timelineRef.id,
    status: "held",
    steps: [{
      at: params.now.toDate().toISOString(),
      label: "Target held before source-derived records are scrubbed",
      status: "held",
    }],
    updatedAt: params.now,
  });
  return { newHighIncidentCount: 0, newlyMaterialized: true, token };
};

const stageUnverifiableTargetHold = (params: {
  expiresAtMillis?: number | null;
  failureCode: string;
  now: Timestamp;
  snapshot: DocumentSnapshot;
  transaction: Transaction;
}): { newHighIncidentCount: number; newlyMaterialized: boolean; token: string | null } => {
  if (!params.snapshot.exists) return { newHighIncidentCount: 0, newlyMaterialized: false, token: null };
  const data = asRecord(params.snapshot.data());
  if (data.pId !== SIGNALDESK_PRODUCT_CODE) {
    throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_PRODUCT_MISMATCH");
  }
  const targetId = requireId(params.snapshot.id, "SIGNALDESK_SOURCE_DATA_TARGET_IDENTITY_INVALID");
  if (
    data.sourceDataLifecycleState === "pending"
    && isCanonicalLifecycleToken(data.sourceDataLifecycleToken)
    && data.sourceDataLifecycleProgress != null
    && data.sourceDataLifecycleReason === "legacy-unverifiable"
  ) return { newHighIncidentCount: 0, newlyMaterialized: false, token: data.sourceDataLifecycleToken as string };

  const sourcePolicyId = normalizeId(data.sourcePolicyId)
    || `retained_policy_${stableHash(`${targetId}|${String(data.sourcePolicyId)}`).slice(0, 32)}`;
  const sourceRunId = normalizeId(data.sourceRunId)
    || `retained_run_${stableHash(`${targetId}|${String(data.sourceRunId)}`).slice(0, 32)}`;
  const observedAtMillis = timestampMillis(data.sourceDataObservedAt);
  const existingExpiryMillis = timestampMillis(data.sourceDataExpiresAt);
  const expiresAtMillis = params.expiresAtMillis !== undefined && params.expiresAtMillis !== null
    ? params.expiresAtMillis
    : existingExpiryMillis ?? params.now.toMillis();
  const token = lifecycleToken("target", [
    "legacy-unverifiable",
    targetId,
    sourcePolicyId,
    sourceRunId,
    observedAtMillis,
    expiresAtMillis,
    timestampMillis(data.updatedAt),
    params.failureCode,
  ]);
  params.transaction.set(params.snapshot.ref, {
    ...targetSummaryScrubPatch({
      existingData: data,
      expiresAtMillis,
      now: params.now,
      progress: emptyTargetProgress(),
      reason: "legacy-unverifiable",
      token,
    }),
    pId: SIGNALDESK_PRODUCT_CODE,
    sourceDataLifecycleInputFailureCode: params.failureCode,
    sourceDataLifecycleInputNormalizedAt: params.now,
    sourceDataLifecycleQuarantinedAt: params.now,
    sourceDataLifecycleQuarantineReason: "legacy-unverifiable-source-lineage",
    sourceDataObservedAt: observedAtMillis === null ? null : Timestamp.fromMillis(observedAtMillis),
    sourcePolicyId,
    sourceRunId,
    targetId,
  }, { merge: true });
  const auditRef = params.snapshot.ref.firestore.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
    .doc(lifecycleAuditId("target-source-data-legacy-unverifiable-held", token));
  params.transaction.create(auditRef, {
    action: "source_data_target_legacy_unverifiable_held",
    actorId: SYSTEM_ACTOR_ID,
    actorRole: SYSTEM_ACTOR_ROLE,
    auditEventId: auditRef.id,
    createdAt: params.now,
    entityId: targetId,
    entityType: "target",
    pId: SIGNALDESK_PRODUCT_CODE,
    reason: params.failureCode,
  });
  const incidentRef = params.snapshot.ref.firestore.collection(SIGNALDESK_COLLECTIONS.INCIDENTS)
    .doc(`source_data_legacy_target_${stableHash(token).slice(0, 40)}`);
  params.transaction.create(incidentRef, {
    authorityId: targetId,
    authorityKind: "target",
    createdAt: params.now,
    failureCode: params.failureCode,
    failurePhase: "legacy-backfill",
    incidentId: incidentRef.id,
    incidentType: "source-data-unverifiable-lineage",
    pId: SIGNALDESK_PRODUCT_CODE,
    severity: "high",
    status: "open",
    title: "Unverifiable legacy source-data target was held",
    updatedAt: params.now,
  });
  const timelineRef = params.snapshot.ref.firestore.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES)
    .doc(lifecycleTimelineId(`target|${token}`));
  params.transaction.create(timelineRef, {
    entityId: targetId,
    entityType: "target",
    label: "Source-data retention lifecycle",
    pId: SIGNALDESK_PRODUCT_CODE,
    runTimelineId: timelineRef.id,
    status: "held",
    steps: [{
      at: params.now.toDate().toISOString(),
      label: "Unverifiable legacy source lineage quarantined before scrub",
      status: "held",
    }],
    updatedAt: params.now,
  });
  return { newHighIncidentCount: 1, newlyMaterialized: true, token };
};

const readTargetLifecycleBackfillState = (snapshot: DocumentSnapshot): TargetLifecycleBackfillState => {
  if (!snapshot.exists) return { completedPassCount: 0, cursor: null };
  const data = asRecord(snapshot.data());
  if (
    data.pId !== SIGNALDESK_PRODUCT_CODE
    || data.backfillStateId !== TARGET_LIFECYCLE_BACKFILL_STATE_ID
  ) throw new Error("SIGNALDESK_TARGET_LIFECYCLE_BACKFILL_STATE_INVALID");
  const cursor = data.cursor == null ? null : normalizeId(data.cursor);
  if (data.cursor != null && !cursor) {
    throw new Error("SIGNALDESK_TARGET_LIFECYCLE_BACKFILL_CURSOR_INVALID");
  }
  return {
    completedPassCount: boundedCount(data.completedPassCount),
    cursor,
  };
};

const parseBackfillSourceRun = (params: {
  snapshot: DocumentSnapshot;
  sourcePolicyId: string;
  sourceRunId: string;
}): { createdAtMillis: number } => {
  if (!params.snapshot.exists) throw new Error("SIGNALDESK_TARGET_LIFECYCLE_SOURCE_RUN_MISSING");
  const data = asRecord(params.snapshot.data());
  if (
    data.pId !== SIGNALDESK_PRODUCT_CODE
    || data.sourceRunId !== params.sourceRunId
    || params.snapshot.id !== params.sourceRunId
    || data.sourcePolicyId !== params.sourcePolicyId
  ) throw new Error("SIGNALDESK_TARGET_LIFECYCLE_SOURCE_RUN_LINEAGE_INVALID");
  const importedCount = data.importedCount;
  const blockedCount = data.blockedCount;
  const duplicateCount = data.duplicateCount;
  const suppressedCount = data.suppressedCount;
  if (
    !Number.isSafeInteger(importedCount)
    || (importedCount as number) < 1
    || (importedCount as number) > 50
    || !Number.isSafeInteger(blockedCount)
    || (blockedCount as number) < 0
    || (blockedCount as number) > (importedCount as number)
    || !Number.isSafeInteger(duplicateCount)
    || (duplicateCount as number) < 0
    || (duplicateCount as number) > (importedCount as number)
    || !Number.isSafeInteger(suppressedCount)
    || (suppressedCount as number) < 0
    || (suppressedCount as number) > (importedCount as number)
  ) throw new Error("SIGNALDESK_TARGET_LIFECYCLE_SOURCE_RUN_COUNTS_INVALID");
  const expectedStatus = blockedCount === importedCount
    ? "blocked"
    : (blockedCount as number) > 0 ? "partial" : "completed";
  if (data.status !== expectedStatus || !boundedString(data.sourceName, 160)) {
    throw new Error("SIGNALDESK_TARGET_LIFECYCLE_SOURCE_RUN_SHAPE_INVALID");
  }
  const createdAtMillis = requireTimestamp(
    data.createdAt,
    "SIGNALDESK_TARGET_LIFECYCLE_SOURCE_RUN_CREATED_AT_INVALID",
  );
  const updatedAtMillis = requireTimestamp(
    data.updatedAt,
    "SIGNALDESK_TARGET_LIFECYCLE_SOURCE_RUN_UPDATED_AT_INVALID",
  );
  if (updatedAtMillis < createdAtMillis) {
    throw new Error("SIGNALDESK_TARGET_LIFECYCLE_SOURCE_RUN_TIMELINE_INVALID");
  }
  return { createdAtMillis };
};

const reconcileTargetLifecycleBackfill = async (params: {
  firestore: Firestore;
  limit: number;
  now: Timestamp;
}): Promise<{
  backfilled: number;
  completed: boolean;
  quarantined: number;
  scanned: number;
}> => {
  const stateRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.SYSTEM)
    .doc(TARGET_LIFECYCLE_BACKFILL_STATE_ID);
  const initialState = readTargetLifecycleBackfillState(await stateRef.get());
  let query = params.firestore.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES)
    .where("pId", "==", SIGNALDESK_PRODUCT_CODE)
    .orderBy(FieldPath.documentId())
    .limit(params.limit);
  if (initialState.cursor) query = query.startAfter(initialState.cursor);
  const page = await query.get();
  const policyRefs = new Map<string, DocumentReference>();
  const sourceRunRefs = new Map<string, DocumentReference>();
  for (const document of page.docs) {
    const data = asRecord(document.data());
    const sourcePolicyId = normalizeId(data.sourcePolicyId);
    const sourceRunId = normalizeId(data.sourceRunId);
    if (sourcePolicyId) {
      policyRefs.set(sourcePolicyId, params.firestore.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(sourcePolicyId));
    }
    if (sourceRunId) {
      sourceRunRefs.set(sourceRunId, params.firestore.collection(SIGNALDESK_COLLECTIONS.SOURCE_RUN_SUMMARIES).doc(sourceRunId));
    }
  }
  return params.firestore.runTransaction(async transaction => {
    const controlRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES)
      .doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM);
    const policyRefList = Array.from(policyRefs.values());
    const sourceRunRefList = Array.from(sourceRunRefs.values());
    const snapshots = await Promise.all([
      transaction.get(stateRef),
      transaction.get(controlRef),
      ...page.docs.map(document => transaction.get(document.ref)),
      ...policyRefList.map(reference => transaction.get(reference)),
      ...sourceRunRefList.map(reference => transaction.get(reference)),
    ]);
    const currentState = readTargetLifecycleBackfillState(snapshots[0]);
    if (
      currentState.cursor !== initialState.cursor
      || currentState.completedPassCount !== initialState.completedPassCount
    ) throw new Error("SIGNALDESK_TARGET_LIFECYCLE_BACKFILL_STATE_CONFLICT");
    const controlSnapshot = snapshots[1];
    const targetOffset = 2;
    const policyOffset = targetOffset + page.docs.length;
    const runOffset = policyOffset + policyRefList.length;
    const policySnapshots = new Map(
      snapshots.slice(policyOffset, runOffset).map(snapshot => [snapshot.id, snapshot]),
    );
    const runSnapshots = new Map(
      snapshots.slice(runOffset).map(snapshot => [snapshot.id, snapshot]),
    );
    let backfilled = 0;
    let quarantined = 0;
    let highIncidentCount = 0;
    for (const targetSnapshot of snapshots.slice(targetOffset, policyOffset)) {
      if (!targetSnapshot.exists) continue;
      const data = asRecord(targetSnapshot.data());
      if (data.pId !== SIGNALDESK_PRODUCT_CODE) continue;
      if (data.sourceDataLifecycleState === "pending") continue;
      if (
        data.sourceDataLifecycleState === "failed"
        && data.sourceDataLifecycleToken
        && data.sourceDataLifecycleProgress
      ) continue;
      if (data.sourceDataLifecycleState === "completed" && isRetainedTargetSummary(data)) continue;

      try {
        if (data.sourceDataLifecycleState === "completed") {
          throw new Error("SIGNALDESK_SOURCE_DATA_COMPLETED_TOMBSTONE_INVALID");
        }
        const parsed = parseTarget(targetSnapshot);
        if (parsed.lifecycleState !== null && parsed.lifecycleState !== "active") {
          throw new Error("SIGNALDESK_TARGET_LIFECYCLE_LEGACY_STATE_INVALID");
        }
        const sourceRunId = requireId(data.sourceRunId, "SIGNALDESK_SOURCE_DATA_TARGET_RUN_INVALID");
        const policySnapshot = policySnapshots.get(parsed.sourcePolicyId);
        if (!policySnapshot) throw new Error("SIGNALDESK_SOURCE_POLICY_MISSING");
        const policy = parsePolicy(policySnapshot);
        if (policy.sourcePolicyId !== parsed.sourcePolicyId) {
          throw new Error("SIGNALDESK_TARGET_LIFECYCLE_POLICY_LINEAGE_INVALID");
        }
        const sourceRunSnapshot = runSnapshots.get(sourceRunId);
        if (!sourceRunSnapshot) throw new Error("SIGNALDESK_TARGET_LIFECYCLE_SOURCE_RUN_MISSING");
        const sourceRun = parseBackfillSourceRun({
          snapshot: sourceRunSnapshot,
          sourcePolicyId: parsed.sourcePolicyId,
          sourceRunId,
        });
        const observedAtMillis = data.sourceDataObservedAt == null
          ? sourceRun.createdAtMillis
          : requireTimestamp(
            data.sourceDataObservedAt,
            "SIGNALDESK_SOURCE_DATA_TARGET_OBSERVED_TIMESTAMP_INVALID",
          );
        if (observedAtMillis < sourceRun.createdAtMillis) {
          throw new Error("SIGNALDESK_TARGET_LIFECYCLE_OBSERVATION_PRECEDES_SOURCE_RUN");
        }
        const retentionWindowMillis = (policy.data.retentionDays as number) * 24 * 60 * 60 * 1000;
        const derivedExpiryMillis = Math.min(
          policy.expiresAtMillis,
          observedAtMillis + retentionWindowMillis,
        );
        if (derivedExpiryMillis <= observedAtMillis) {
          throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_RETENTION_WINDOW_INVALID");
        }
        const existingExpiryMillis = data.sourceDataExpiresAt == null
          ? null
          : requireTimestamp(data.sourceDataExpiresAt, "SIGNALDESK_SOURCE_DATA_TARGET_EXPIRY_INVALID");
        if (existingExpiryMillis !== null && existingExpiryMillis <= observedAtMillis) {
          throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_RETENTION_WINDOW_INVALID");
        }
        const expiresAtMillis = existingExpiryMillis === null
          ? derivedExpiryMillis
          : Math.min(existingExpiryMillis, derivedExpiryMillis);
        const requiresBackfill = parsed.lifecycleState !== "active"
          || data.sourceDataObservedAt == null
          || existingExpiryMillis !== expiresAtMillis
          || data.sourceDataLifecycleBackfillVersion !== TARGET_LIFECYCLE_BACKFILL_VERSION
          || !hasOnlyAllowedFields(data, TARGET_ACTIVE_ALLOWED_FIELDS);
        if (!requiresBackfill) continue;
        transaction.set(targetSnapshot.ref, {
          ...deleteFieldsOutside(data, TARGET_ACTIVE_ALLOWED_FIELDS),
          sourceDataExpiresAt: Timestamp.fromMillis(expiresAtMillis),
          sourceDataLifecycleBackfillVersion: TARGET_LIFECYCLE_BACKFILL_VERSION,
          sourceDataLifecycleBackfilledAt: params.now,
          sourceDataLifecycleCompletedAt: null,
          sourceDataLifecycleFailedAt: null,
          sourceDataLifecycleFailureCode: null,
          sourceDataLifecycleFailurePhase: null,
          sourceDataLifecycleKind: null,
          sourceDataLifecycleLastRetryAt: null,
          sourceDataLifecycleProgress: null,
          sourceDataLifecycleReason: null,
          sourceDataLifecycleRetryAt: null,
          sourceDataLifecycleRetryCount: 0,
          sourceDataLifecycleState: "active",
          sourceDataLifecycleToken: null,
          sourceDataObservedAt: Timestamp.fromMillis(observedAtMillis),
          sourceDataRetentionDaysApplied: policy.data.retentionDays,
          sourceDataTombstoneVersion: null,
          updatedAt: params.now,
          updatedBy: SYSTEM_ACTOR_ID,
        }, { merge: true });
        backfilled += 1;
      } catch (error) {
        const held = stageUnverifiableTargetHold({
          expiresAtMillis: timestampMillis(data.sourceDataExpiresAt),
          failureCode: lifecycleFailureCode(error),
          now: params.now,
          snapshot: targetSnapshot,
          transaction,
        });
        if (held.newlyMaterialized) quarantined += 1;
        highIncidentCount += held.newHighIncidentCount;
      }
    }
    if (highIncidentCount > 0) {
      stageNewHighIncidentSummary({
        controlRef,
        controlSnapshot,
        count: highIncidentCount,
        now: params.now,
        transaction,
      });
    }
    const completed = page.size < params.limit;
    transaction.set(stateRef, {
      backfillStateId: TARGET_LIFECYCLE_BACKFILL_STATE_ID,
      completedPassCount: initialState.completedPassCount + (completed ? 1 : 0),
      cursor: completed ? null : page.docs[page.docs.length - 1]?.id || null,
      lastCompletedAt: completed ? params.now : null,
      pId: SIGNALDESK_PRODUCT_CODE,
      updatedAt: params.now,
    }, { merge: true });
    return { backfilled, completed, quarantined, scanned: page.size };
  });
};

const completePolicy = (params: {
  now: Timestamp;
  policy: ParsedPolicy;
  policyRef: DocumentReference;
  progress: PolicyProgress;
  timelineSnapshot: DocumentSnapshot;
  transaction: Transaction;
}): void => {
  if (!params.policy.token) throw new Error("SIGNALDESK_SOURCE_POLICY_LIFECYCLE_TOKEN_INVALID");
  const token = params.policy.token;
  assertLifecycleTimeline({
    entityId: params.policy.sourcePolicyId,
    entityType: "source-quality",
    snapshot: params.timelineSnapshot,
  });
  params.transaction.set(params.policyRef, {
    lastSourceDataPolicyLifecycleAt: params.now,
    lastSourceDataPolicyLifecycleResult: {
      ...params.progress,
      cursor: null,
    },
    lastSourceDataPolicyLifecycleToken: token,
    sourceDataPolicyLifecycleCompletedAt: params.now,
    sourceDataPolicyLifecycleFailedAt: null,
    sourceDataPolicyLifecycleFailureCode: null,
    sourceDataPolicyLifecycleFailurePhase: null,
    sourceDataPolicyLifecycleLastRetryAt: null,
    sourceDataPolicyLifecycleProgress: null,
    sourceDataPolicyLifecycleRetryAt: null,
    sourceDataPolicyLifecycleRetryCount: 0,
    sourceDataPolicyLifecycleState: "completed",
    updatedAt: params.now,
    updatedBy: SYSTEM_ACTOR_ID,
  }, { merge: true });
  const auditRef = params.policyRef.firestore.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
    .doc(lifecycleAuditId("policy-source-data-completed", token));
  params.transaction.create(auditRef, {
    action: "source_policy_retention_materialization_completed",
    actorId: SYSTEM_ACTOR_ID,
    actorRole: SYSTEM_ACTOR_ROLE,
    auditEventId: auditRef.id,
    createdAt: params.now,
    entityId: params.policy.sourcePolicyId,
    entityType: "sourcePolicy",
    pId: SIGNALDESK_PRODUCT_CODE,
    reason: `targets=${params.progress.heldTargetCount};scanned=${params.progress.scannedTargetCount}`,
  });
  const timelineRef = params.policyRef.firestore.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES)
    .doc(lifecycleTimelineId(`policy|${token}`));
  params.transaction.set(timelineRef, {
    status: "completed",
    steps: [{
      at: params.now.toDate().toISOString(),
      label: "All matching targets were held for retention scrub",
      status: "completed",
    }],
    updatedAt: params.now,
  }, { merge: true });
};

const materializePolicy = async (params: {
  firestore: Firestore;
  now: Timestamp;
  policyRef: DocumentReference;
  reason: "policy-blocked" | "policy-expired";
}): Promise<{ newlyMaterialized: boolean; token: string | null }> => params.firestore.runTransaction(async transaction => {
  const snapshot = await transaction.get(params.policyRef);
  if (!snapshot.exists) return { newlyMaterialized: false, token: null };
  const policy = parsePolicy(snapshot);
  if (policy.lifecycleState === "pending" && policy.token) {
    return { newlyMaterialized: false, token: policy.token };
  }
  if (policy.lifecycleState === "failed") return { newlyMaterialized: false, token: null };
  const blocked = policy.status === "blocked";
  const due = policy.expiresAtMillis <= params.now.toMillis();
  if ((params.reason === "policy-blocked" && !blocked) || (params.reason === "policy-expired" && !due)) {
    return { newlyMaterialized: false, token: null };
  }
  if (policy.status === "inactive") return { newlyMaterialized: false, token: null };
  const token = lifecycleToken("policy", [
    policy.sourcePolicyId,
    policy.expiresAtMillis,
    blocked ? "blocked" : "expired",
    blocked ? timestampMillis(policy.data.updatedAt) : null,
  ]);
  if (
    policy.lifecycleState === "completed"
    && policy.data.lastSourceDataPolicyLifecycleToken === token
  ) return { newlyMaterialized: false, token: null };
  transaction.set(params.policyRef, {
    naturalExpiryMaterializedAt: due ? params.now : null,
    sourceDataPolicyLifecycleCompletedAt: null,
    sourceDataPolicyLifecycleFailedAt: null,
    sourceDataPolicyLifecycleFailureCode: null,
    sourceDataPolicyLifecycleFailurePhase: null,
    sourceDataPolicyLifecycleKind: POLICY_LIFECYCLE_KIND,
    sourceDataPolicyLifecycleLastRetryAt: null,
    sourceDataPolicyLifecycleProgress: { cursor: null, heldTargetCount: 0, scannedTargetCount: 0 },
    sourceDataPolicyLifecycleReason: params.reason,
    sourceDataPolicyLifecycleRetryAt: null,
    sourceDataPolicyLifecycleRetryCount: 0,
    sourceDataPolicyLifecycleState: "pending",
    sourceDataPolicyLifecycleToken: token,
    status: "inactive",
    updatedAt: params.now,
    updatedBy: SYSTEM_ACTOR_ID,
  }, { merge: true });
  const auditRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
    .doc(lifecycleAuditId("policy-source-data-started", token));
  transaction.create(auditRef, {
    action: "source_policy_retention_materialized",
    actorId: SYSTEM_ACTOR_ID,
    actorRole: SYSTEM_ACTOR_ROLE,
    auditEventId: auditRef.id,
    createdAt: params.now,
    entityId: policy.sourcePolicyId,
    entityType: "sourcePolicy",
    pId: SIGNALDESK_PRODUCT_CODE,
    reason: params.reason,
  });
  const timelineRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES)
    .doc(lifecycleTimelineId(`policy|${token}`));
  transaction.create(timelineRef, {
    entityId: policy.sourcePolicyId,
    entityType: "source-quality",
    label: "Source-policy retention lifecycle",
    pId: SIGNALDESK_PRODUCT_CODE,
    runTimelineId: timelineRef.id,
    status: "held",
    steps: [{
      at: params.now.toDate().toISOString(),
      label: "Policy disabled; matching targets are being held",
      status: "held",
    }],
    updatedAt: params.now,
  });
  return { newlyMaterialized: true, token };
});

const processPolicyTargetPage = async (params: {
  firestore: Firestore;
  now: Timestamp;
  pageSize: number;
  policyRef: DocumentReference;
  progress: PolicyProgress;
  reason: "policy-blocked" | "policy-expired";
  token: string;
}): Promise<{ completed: boolean; newlyHeld: number; stale: boolean }> => {
  let query = params.firestore.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES)
    .where("pId", "==", SIGNALDESK_PRODUCT_CODE)
    .where("sourcePolicyId", "==", params.policyRef.id)
    .orderBy(FieldPath.documentId())
    .limit(params.pageSize);
  if (params.progress.cursor) query = query.startAfter(params.progress.cursor);
  const page = await query.get();
  return params.firestore.runTransaction(async transaction => {
    const timelineRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES)
      .doc(lifecycleTimelineId(`policy|${params.token}`));
    const controlRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES)
      .doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM);
    const snapshots = await Promise.all([
      transaction.get(params.policyRef),
      transaction.get(timelineRef),
      transaction.get(controlRef),
      ...page.docs.map(document => transaction.get(document.ref)),
    ]);
    const current = readPendingPolicy(snapshots[0], params.token);
    const timelineSnapshot = snapshots[1];
    const controlSnapshot = snapshots[2];
    if (!samePolicyPosition(current.progress!, params.progress)) {
      return { completed: false, newlyHeld: 0, stale: true };
    }
    let newlyHeld = 0;
    let newHighIncidentCount = 0;
    for (const targetSnapshot of snapshots.slice(3)) {
      const held = stageTargetHold({
        expiresAtMillis: current.expiresAtMillis,
        now: params.now,
        reason: params.reason,
        snapshot: targetSnapshot,
        sourcePolicyId: current.sourcePolicyId,
        transaction,
      });
      if (held.newlyMaterialized) newlyHeld += 1;
      newHighIncidentCount += held.newHighIncidentCount;
    }
    if (newHighIncidentCount > 0) {
      stageNewHighIncidentSummary({
        controlRef,
        controlSnapshot,
        count: newHighIncidentCount,
        now: params.now,
        transaction,
      });
    }
    const progress: PolicyProgress = {
      cursor: page.size < params.pageSize ? null : page.docs[page.docs.length - 1]?.id || null,
      heldTargetCount: current.progress!.heldTargetCount + newlyHeld,
      scannedTargetCount: current.progress!.scannedTargetCount + page.size,
    };
    const completed = page.size < params.pageSize;
    if (completed) {
      completePolicy({ now: params.now, policy: current, policyRef: params.policyRef, progress, timelineSnapshot, transaction });
    } else {
      transaction.update(params.policyRef, { sourceDataPolicyLifecycleProgress: progress });
    }
    return { completed, newlyHeld, stale: false };
  });
};

const providerIdentityHash = (provider: ParsedProviderRetention): string => stableHash(JSON.stringify([
  provider.provider,
  boundedString(provider.data.providerRecordId, 240) || "",
  boundedString(provider.data.providerRecordUrl, 500) || "",
]));

const materializeProviderRetention = async (params: {
  firestore: Firestore;
  mode: "due" | "scrub_ready";
  now: Timestamp;
  retentionRef: DocumentReference;
}): Promise<{ newlyMaterialized: boolean; targetMaterialized: boolean }> => params.firestore.runTransaction(async transaction => {
  const retentionSnapshot = await transaction.get(params.retentionRef);
  if (!retentionSnapshot.exists) return { newlyMaterialized: false, targetMaterialized: false };
  const provider = parseProviderRetention(retentionSnapshot);
  if (provider.data.sourceDataLifecycleState === "completed") {
    return { newlyMaterialized: false, targetMaterialized: false };
  }
  const isDue = provider.retentionExpiresAtMillis <= params.now.toMillis()
    && ["active", "refresh-due", "refreshed"].includes(provider.status);
  const isScrubReady = provider.data.sourceDataLifecycleState === "scrub_ready"
    && ["blocked", "expired"].includes(provider.status);
  if ((params.mode === "due" && !isDue) || (params.mode === "scrub_ready" && !isScrubReady)) {
    return { newlyMaterialized: false, targetMaterialized: false };
  }

  const targetRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(provider.targetId);
  const policyRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(provider.sourcePolicyId);
  const controlRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM);
  const [targetSnapshot, policySnapshot, controlSnapshot] = await Promise.all([
    transaction.get(targetRef),
    transaction.get(policyRef),
    transaction.get(controlRef),
  ]);
  const targetData = asRecord(targetSnapshot.data());
  const policy = parsePolicy(policySnapshot);
  const policySourceType = boundedString(policy.data.sourceType, 40);
  const policyProvider = boundedString(policy.data.provider, 80);
  if (policySourceType !== "provider" || policyProvider !== provider.provider) {
    throw new Error("SIGNALDESK_PROVIDER_RETENTION_POLICY_PROVIDER_MISMATCH");
  }
  if (
    !targetSnapshot.exists
    || targetData.pId !== SIGNALDESK_PRODUCT_CODE
    || targetData.targetId !== provider.targetId
    || targetData.sourcePolicyId !== provider.sourcePolicyId
    || targetData.sourceRunId !== provider.sourceRunId
    || policy.sourcePolicyId !== provider.sourcePolicyId
  ) {
    throw new Error("SIGNALDESK_PROVIDER_RETENTION_LINEAGE_MISMATCH");
  }
  const held = stageTargetHold({
    expiresAtMillis: Math.min(provider.retentionExpiresAtMillis, policy.expiresAtMillis),
    now: params.now,
    reason: "provider-retention",
    snapshot: targetSnapshot,
    sourcePolicyId: provider.sourcePolicyId,
    transaction,
  });
  if (held.newHighIncidentCount > 0) {
    stageNewHighIncidentSummary({
      controlRef,
      controlSnapshot,
      count: held.newHighIncidentCount,
      now: params.now,
      transaction,
    });
  }
  const token = lifecycleToken("provider", [
    params.retentionRef.id,
    provider.sourcePolicyId,
    provider.sourceRunId,
    provider.retentionExpiresAtMillis,
    provider.lastRefreshedAtMillis,
    provider.targetId,
  ]);
  transaction.set(params.retentionRef, {
    ...deleteFieldsOutside(provider.data, dependencyAllowedFields("provider")),
    providerIdentityHash: providerIdentityHash(provider),
    providerRecordId: null,
    providerRecordUrl: null,
    sourceDataLifecycleCompletedAt: params.now,
    sourceDataLifecycleKind: TARGET_LIFECYCLE_KIND,
    sourceDataLifecycleReason: params.mode === "due" ? "provider-retention-expired" : "provider-retention-blocked",
    sourceDataLifecycleState: "completed",
    sourceDataLifecycleToken: token,
    status: provider.status === "blocked" ? "blocked" : "expired",
    targetName: "Retained target record",
    updatedAt: params.now,
    updatedBy: SYSTEM_ACTOR_ID,
  }, { merge: true });
  const auditRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
    .doc(lifecycleAuditId("provider-retention-scrubbed", token));
  transaction.create(auditRef, {
    action: "provider_source_retention_scrubbed",
    actorId: SYSTEM_ACTOR_ID,
    actorRole: SYSTEM_ACTOR_ROLE,
    auditEventId: auditRef.id,
    createdAt: params.now,
    entityId: params.retentionRef.id,
    entityType: "providerSourceRetention",
    pId: SIGNALDESK_PRODUCT_CODE,
    reason: params.mode,
  });
  return { newlyMaterialized: true, targetMaterialized: held.newlyMaterialized };
});

const materializeExpiredTarget = async (params: {
  firestore: Firestore;
  now: Timestamp;
  targetRef: DocumentReference;
}): Promise<boolean> => params.firestore.runTransaction(async transaction => {
  const controlRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM);
  const initialTargetSnapshot = await transaction.get(params.targetRef);
  if (!initialTargetSnapshot.exists) return false;
  const initialTargetData = asRecord(initialTargetSnapshot.data());
  if (initialTargetData.pId !== SIGNALDESK_PRODUCT_CODE || initialTargetData.sourceDataLifecycleState !== "active") {
    return false;
  }
  const expiresAtMillis = requireTimestamp(
    initialTargetData.sourceDataExpiresAt,
    "SIGNALDESK_SOURCE_DATA_TARGET_EXPIRY_INVALID",
  );
  if (expiresAtMillis > params.now.toMillis()) return false;
  const sourcePolicyId = normalizeId(initialTargetData.sourcePolicyId);
  const sourceRunId = normalizeId(initialTargetData.sourceRunId);
  const policyRef = sourcePolicyId
    ? params.firestore.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(sourcePolicyId)
    : null;
  const sourceRunRef = sourceRunId
    ? params.firestore.collection(SIGNALDESK_COLLECTIONS.SOURCE_RUN_SUMMARIES).doc(sourceRunId)
    : null;
  const [controlSnapshot, policySnapshot, sourceRunSnapshot] = await Promise.all([
    transaction.get(controlRef),
    ...(policyRef ? [transaction.get(policyRef)] : [Promise.resolve(null)]),
    ...(sourceRunRef ? [transaction.get(sourceRunRef)] : [Promise.resolve(null)]),
  ]);
  let lineageFailureCode: string | null = null;
  try {
    if (!sourcePolicyId) throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_POLICY_INVALID");
    if (!sourceRunId) throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_RUN_INVALID");
    const observedAtMillis = requireTimestamp(
      initialTargetData.sourceDataObservedAt,
      "SIGNALDESK_SOURCE_DATA_TARGET_OBSERVED_TIMESTAMP_INVALID",
    );
    if (expiresAtMillis <= observedAtMillis) {
      throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_RETENTION_WINDOW_INVALID");
    }
    if (!policySnapshot) throw new Error("SIGNALDESK_SOURCE_POLICY_MISSING");
    const policy = parsePolicy(policySnapshot);
    if (policy.sourcePolicyId !== sourcePolicyId) {
      throw new Error("SIGNALDESK_TARGET_LIFECYCLE_POLICY_LINEAGE_INVALID");
    }
    if (!sourceRunSnapshot) throw new Error("SIGNALDESK_TARGET_LIFECYCLE_SOURCE_RUN_MISSING");
    parseBackfillSourceRun({ snapshot: sourceRunSnapshot, sourcePolicyId, sourceRunId });
  } catch (error) {
    lineageFailureCode = lifecycleFailureCode(error);
  }
  const held = lineageFailureCode
    ? stageUnverifiableTargetHold({
      expiresAtMillis,
      failureCode: lineageFailureCode,
      now: params.now,
      snapshot: initialTargetSnapshot,
      transaction,
    })
    : stageTargetHold({
      expiresAtMillis,
      now: params.now,
      reason: "target-expired",
      snapshot: initialTargetSnapshot,
      sourcePolicyId: sourcePolicyId!,
      transaction,
    });
  if (held.newHighIncidentCount > 0) {
    stageNewHighIncidentSummary({
      controlRef,
      controlSnapshot,
      count: held.newHighIncidentCount,
      now: params.now,
      transaction,
    });
  }
  return held.newlyMaterialized;
});

interface ParsedDependency {
  data: Record<string, unknown>;
  foreign: boolean;
  status: string | null;
}

const DEPENDENCY_STATUSES: Record<DependencyAction, ReadonlySet<string>> = {
  "ai-run": new Set(["recorded"]),
  approval: new Set(["pending", "approved", "rejected", "queued", "exported", "sent", "failed"]),
  "approval-packet": new Set(["pending", "approved", "rejected", "held"]),
  "channel-window": new Set(["open", "closed", "expired", "blocked", "needs-template"]),
  "commercial-opportunity": new Set(["open", "won", "lost", "nurture"]),
  contact: CONTACT_PERMISSION_STATES,
  conversation: new Set([
    "new", "exported", "contacted", "interested", "not_interested", "dnc", "wrong_contact", "complaint",
    "privacy_request", "legal_request", "needs_review",
  ]),
  draft: new Set(["draft", "queued", "approved", "rejected", "exported", "sent", "failed"]),
  enrichment: new Set(["verified", "candidate", "blocked", "missing"]),
  evidence: new Set(["high", "medium", "low", "blocked"]),
  handoff: new Set(["blocked", "ready", "queued", "exported", "sent", "stopped", "failed"]),
  message: new Set(["inbound", "outbound"]),
  "reply-classification": new Set(["recorded"]),
  "message-export": new Set(["exported", "sent"]),
  provider: PROVIDER_RETENTION_STATUSES,
  research: new Set(["pass", "fail", "unsure"]),
  "revenue-account": new Set(["prospect", "engaged", "opportunity", "customer", "nurture", "lost"]),
  "route-token": new Set(["active", "revoked"]),
  "sequence-step": new Set(["blocked", "queued", "ready", "sent", "skipped", "failed"]),
  "source-candidate": new Set(["active", "blocked"]),
  "vendor-run": new Set(["ready", "blocked", "skipped", "completed", "failed"]),
};

const dependencyStatus = (action: DependencyAction, data: Record<string, unknown>): string | null => {
  if (action === "ai-run") return "recorded";
  if (action === "reply-classification") return "recorded";
  if (action === "contact") return boundedString(data.permissionState, 40);
  if (action === "research") return boundedString(data.fitDecision, 40);
  if (action === "source-candidate") return data.blocked === true ? "blocked" : data.blocked === false ? "active" : null;
  if (action === "evidence") return boundedString(data.confidence, 40);
  if (action === "message") return boundedString(data.direction, 40);
  if (action === "conversation") return boundedString(data.state, 40);
  if (action === "revenue-account") return boundedString(data.lifecycleStage, 40);
  return boundedString(data.status, 40);
};

const parseDependency = (params: {
  allowUnverifiableLineage: boolean;
  definition: DependencyPhaseDefinition;
  snapshot: DocumentSnapshot;
  sourcePolicyId: string;
  targetId: string;
}): ParsedDependency => {
  if (!params.snapshot.exists) throw new Error("SIGNALDESK_SOURCE_DATA_DEPENDENCY_MISSING");
  const data = asRecord(params.snapshot.data());
  const queryField = params.definition.queryField || "targetId";
  if (data[queryField] !== params.targetId) throw new Error("SIGNALDESK_SOURCE_DATA_DEPENDENCY_TARGET_MISMATCH");
  if (data.pId !== SIGNALDESK_PRODUCT_CODE) {
    if (typeof data.pId === "string" && data.pId.length > 0) return { data, foreign: true, status: null };
    throw new Error("SIGNALDESK_SOURCE_DATA_DEPENDENCY_PRODUCT_INVALID");
  }
  const identity = requireId(
    params.definition.action === "ai-run" ? data.aiRunId ?? data.scoreId : data[params.definition.identityField],
    "SIGNALDESK_SOURCE_DATA_DEPENDENCY_IDENTITY_INVALID",
  );
  if (identity !== params.snapshot.id) throw new Error("SIGNALDESK_SOURCE_DATA_DEPENDENCY_IDENTITY_MISMATCH");
  if (data.sourcePolicyId != null) {
    const sourcePolicyId = requireId(data.sourcePolicyId, "SIGNALDESK_SOURCE_DATA_DEPENDENCY_POLICY_INVALID");
    if (sourcePolicyId !== params.sourcePolicyId && !params.allowUnverifiableLineage) {
      throw new Error("SIGNALDESK_SOURCE_DATA_DEPENDENCY_POLICY_MISMATCH");
    }
  }
  if (timestampMillis(data.updatedAt) === null && timestampMillis(data.createdAt) === null) {
    throw new Error("SIGNALDESK_SOURCE_DATA_DEPENDENCY_TIMESTAMP_INVALID");
  }
  const status = dependencyStatus(params.definition.action, data);
  if (!status || !DEPENDENCY_STATUSES[params.definition.action].has(status)) {
    throw new Error("SIGNALDESK_SOURCE_DATA_DEPENDENCY_STATUS_INVALID");
  }
  if (params.definition.action === "contact") {
    const channel = boundedString(data.channel, 40);
    if (!channel || !CONTACT_CHANNELS.has(channel)) throw new Error("SIGNALDESK_CONTACT_IDENTITY_CHANNEL_INVALID");
    const tombstoned = data.sourceDataLifecycleState === "completed" && data.rawValueStored === false;
    if (!tombstoned && !boundedString(data.value, 180)) throw new Error("SIGNALDESK_CONTACT_IDENTITY_VALUE_INVALID");
    requireId(data.sourcePolicyId, "SIGNALDESK_CONTACT_IDENTITY_POLICY_INVALID");
    requireId(data.sourceRunId, "SIGNALDESK_CONTACT_IDENTITY_RUN_INVALID");
  }
  if (params.definition.action === "route-token") {
    const tokenHash = boundedString(data.tokenHash, 64);
    const createdAt = requireTimestamp(data.createdAt, "SIGNALDESK_ROUTE_TOKEN_TIMESTAMP_INVALID");
    const expiresAt = requireTimestamp(data.expiresAt, "SIGNALDESK_ROUTE_TOKEN_TIMESTAMP_INVALID");
    const ownerQualifiedAt = requireTimestamp(
      data.ownerQualifiedAt,
      "SIGNALDESK_ROUTE_TOKEN_TIMESTAMP_INVALID",
    );
    const updatedAt = requireTimestamp(data.updatedAt, "SIGNALDESK_ROUTE_TOKEN_TIMESTAMP_INVALID");
    if (
      !tokenHash
      || !/^[a-f0-9]{64}$/.test(tokenHash)
      || params.snapshot.id !== `route_${tokenHash.slice(0, 32)}`
      || data.scope !== "menulist-activation-outcomes-v1"
      || !boundedString(data.targetName, 180)
      || expiresAt <= createdAt
      || ownerQualifiedAt > updatedAt
      || updatedAt < createdAt
    ) throw new Error("SIGNALDESK_ROUTE_TOKEN_SHAPE_INVALID");
    requireId(data.createdBy, "SIGNALDESK_ROUTE_TOKEN_ACTOR_INVALID");
    requireId(data.sourceActionId, "SIGNALDESK_ROUTE_TOKEN_SOURCE_ACTION_INVALID");
    const revokedAt = timestampMillis(data.revokedAt);
    const revokedBy = data.revokedBy == null ? null : normalizeId(data.revokedBy);
    const revocationReason = data.revocationReason == null ? null : boundedString(data.revocationReason, 500);
    const hasRevocationData = data.revokedAt != null || data.revokedBy != null || data.revocationReason != null;
    if (
      (status === "active" && hasRevocationData)
      || (status === "revoked" && (
        revokedAt === null
        || revokedAt < createdAt
        || revokedAt > updatedAt
        || !revokedBy
        || !revocationReason
      ))
    ) throw new Error("SIGNALDESK_ROUTE_TOKEN_STATUS_INVALID");
  }
  if (params.definition.action === "channel-window") {
    const channel = boundedString(data.channel, 40);
    const source = boundedString(data.source, 40);
    if (
      !channel
      || !["whatsapp", "instagram", "messenger"].includes(channel)
      || !source
      || !["inbound", "opt-in", "ad-click", "template", "manual"].includes(source)
      || typeof data.eligibleForHandoff !== "boolean"
    ) throw new Error("SIGNALDESK_CHANNEL_WINDOW_SHAPE_INVALID");
  }
  if (params.definition.action === "ai-run") {
    if (!boundedString(data.workerType, 120) || !boundedString(data.workerVersion, 160)) {
      throw new Error("SIGNALDESK_AI_WORKER_RUN_SHAPE_INVALID");
    }
  }
  if (params.definition.action === "reply-classification") {
    if (
      !boundedString(data.conversationId, 200)
      || ![
        "new", "exported", "contacted", "interested", "not_interested", "dnc", "wrong_contact", "complaint",
        "privacy_request", "legal_request", "needs_review",
      ].includes(boundedString(data.state, 40) || "")
      || !["high", "medium", "low"].includes(boundedString(data.confidence, 20) || "")
      || !boundedString(data.classifierVersion, 120)
    ) throw new Error("SIGNALDESK_REPLY_CLASSIFICATION_SHAPE_INVALID");
  }
  if (params.definition.action === "vendor-run" && !boundedString(data.provider, 80)) {
    throw new Error("SIGNALDESK_VENDOR_RUN_SHAPE_INVALID");
  }
  if (params.definition.action === "revenue-account") {
    if (
      !boundedString(data.displayName, 240)
      || !boundedString(data.organizationId, 180)
      || !Array.isArray(data.targetIds)
      || !(data.targetIds as unknown[]).includes(params.targetId)
      || !["none", "contactable", "contacted", "replied", "waiting-for-customer", "opted-out"]
        .includes(boundedString(data.engagementState, 40) || "")
    ) throw new Error("SIGNALDESK_REVENUE_ACCOUNT_SHAPE_INVALID");
  }
  if (params.definition.action === "commercial-opportunity") {
    const opportunityStage = boundedString(data.stage, 40);
    const opportunityStatus = boundedString(data.status, 40);
    const stageStatusValid = opportunityStatus === "open"
      ? ["qualified", "discovery", "offer", "decision"].includes(opportunityStage || "")
      : opportunityStatus === "won" || opportunityStatus === "lost" || opportunityStatus === "nurture"
        ? opportunityStage === opportunityStatus
        : false;
    if (
      !boundedString(data.revenueAccountId, 180)
      || !boundedString(data.title, 300)
      || !["qualified", "discovery", "offer", "decision", "won", "lost", "nurture"]
        .includes(boundedString(data.stage, 40) || "")
      || !Number.isSafeInteger(data.valueMinor)
      || (data.valueMinor as number) < 0
      || !Number.isSafeInteger(data.probabilityPercent)
      || (data.probabilityPercent as number) < 0
      || (data.probabilityPercent as number) > 100
      || ((data.valueMinor as number) > 0 && !/^[A-Z]{3}$/.test(boundedString(data.currency, 3) || ""))
      || !stageStatusValid
    ) throw new Error("SIGNALDESK_COMMERCIAL_OPPORTUNITY_SHAPE_INVALID");
  }
  if (params.definition.action === "provider") parseProviderRetention(params.snapshot);
  return { data, foreign: false, status };
};

const commonScrubPatch = (params: {
  now: Timestamp;
  token: string;
}): Record<string, unknown> => ({
  sourceDataLifecycleCompletedAt: params.now,
  sourceDataLifecycleKind: TARGET_LIFECYCLE_KIND,
  sourceDataLifecycleState: "completed",
  sourceDataLifecycleToken: params.token,
  updatedAt: params.now,
  updatedBy: SYSTEM_ACTOR_ID,
});

const revenueAccountHasIndependentRetentionBasis = (data: Record<string, unknown>): boolean => {
  const engagementState = boundedString(data.engagementState, 40);
  const lifecycleStage = boundedString(data.lifecycleStage, 40);
  const activationState = boundedString(data.activationState, 40);
  return ["contacted", "replied", "waiting-for-customer", "opted-out"].includes(engagementState || "")
    || ["engaged", "customer"].includes(lifecycleStage || "")
    || ["routed", "in-progress", "stalled", "activated"].includes(activationState || "");
};

const DEPENDENCY_COMMON_ALLOWED_FIELDS = new Set([
  "createdAt",
  "legalRetentionReviewReason",
  "legalRetentionReviewRequired",
  "pId",
  "primaryTargetId",
  "sourceDataExpiredAt",
  "sourceDataExpiresAt",
  "sourceDataLifecycleCompletedAt",
  "sourceDataLifecycleFailedAt",
  "sourceDataLifecycleFailureCode",
  "sourceDataLifecycleFailurePhase",
  "sourceDataLifecycleInputFailureCode",
  "sourceDataLifecycleInputNormalizedAt",
  "sourceDataLifecycleKind",
  "sourceDataLifecycleLastRetryAt",
  "sourceDataLifecyclePriorState",
  "sourceDataLifecyclePriorStatus",
  "sourceDataLifecycleProgress",
  "sourceDataLifecycleReason",
  "sourceDataLifecycleRetryAt",
  "sourceDataLifecycleRetryCount",
  "sourceDataLifecycleState",
  "sourceDataLifecycleToken",
  "sourceDataObservedAt",
  "sourceDataPayloadStored",
  "sourceDataRecordExpiresAt",
  "sourceDataTombstoneVersion",
  "sourcePolicyId",
  "sourceRunId",
  "targetId",
  "updatedAt",
  "updatedBy",
]);

const DEPENDENCY_ACTION_ALLOWED_FIELDS: Record<DependencyAction, readonly string[]> = {
  "ai-run": [
    "aiDetailCompletedAt", "aiDetailExpiresAt", "aiDetailLifecycleState", "aiDetailLifecycleUpdatedAt",
    "aiDetailRetentionAnchorAt", "aiRunId", "confidence", "contactabilityScore", "costEstimate", "createdBy",
    "criticConfidence", "criticModel", "criticPromptVersion", "criticReasons", "criticRejectedFactCount",
    "criticVerdict", "currentListGapScore", "escalated", "escalationBlocked", "escalationModel", "fitScore",
    "founderAttentionMinutes", "initialOutput", "instruction", "model", "modelCallCount", "modelEvalId",
    "modelRouteId", "nextAction", "output", "promptVersion", "provider", "reasons", "rejectedFactCount",
    "reviewDecision", "reviewReason", "reviewedAt", "reviewedBy", "riskScore", "scoreId", "segment", "task",
    "volumeRunId", "workerType", "workerVersion",
  ],
  approval: ["approvalId", "rejectionReason", "reviewReason", "status", "targetName"],
  "approval-packet": [
    "approvalPacketId", "channelReadiness", "currentMenuPresence", "evidenceRejectedFacts", "evidenceSummary",
    "expectedOutcome", "messageBody", "messageSubject", "recommendedAction", "riskSummary", "status", "targetName",
    "unsupportedClaims",
  ],
  "channel-window": [
    "channel", "channelWindowId", "eligibleForHandoff", "expiresAt", "reason", "source", "status", "targetName",
  ],
  "commercial-opportunity": [
    "currency", "expectedCloseAt", "nextAction", "nextActionDueAt", "opportunityId", "probabilityPercent",
    "revenueAccountId", "stage", "stalledReason", "status", "title", "valueMinor", "winLossReason",
  ],
  contact: [
    "channel", "expiresAt", "identityHash", "identityId", "observedAt", "permissionEvidenceRef", "permissionState",
    "rawValueStored", "value",
  ],
  conversation: ["channel", "conversationId", "lastMessagePreview", "state", "targetName"],
  draft: ["body", "draftId", "personalizationEvidenceIds", "status", "subject", "targetName", "unsupportedClaims"],
  enrichment: [
    "confidence", "enrichmentResultId", "expiresAt", "field", "provider", "status", "targetName", "value", "valuePreview",
  ],
  evidence: [
    "allowedUse", "confidence", "currentMenuPresence", "evidencePacketId", "evidenceQuality", "facts", "rejectedFacts",
    "sourceRefs", "summary", "targetName",
  ],
  handoff: [
    "blockedReason", "provider", "providerLeadId", "recipientPreview", "sequencerHandoffId", "status", "targetName",
  ],
  message: ["body", "channel", "direction", "messageId"],
  "message-export": ["body", "exportId", "providerMessageId", "status", "subject", "targetName"],
  provider: [
    "lastRefreshedAt", "provider", "providerIdentityHash", "providerRecordId", "providerRecordUrl",
    "providerSourceRetentionId", "rawPayloadStored", "refreshDueAt", "retentionExpiresAt", "status", "targetName",
  ],
  "reply-classification": [
    "classificationId", "classifierVersion", "confidence", "conversationId", "state",
  ],
  research: [
    "actionabilityState", "allowedRoute", "allowedRouteReason", "category", "city", "contactability", "country",
    "currentListGap", "displayName", "enrichment", "evidenceSummary", "fitDecision", "fitScore", "hardGateFailures",
    "provider", "providerRecordUrl", "recommendedChannel", "recommendedCta", "recommendedMessageAngle",
    "recommendedNextAction", "researchRowId", "researchRunId", "routePermissionState", "sourceRefs", "website",
  ],
  "revenue-account": [
    "activationState", "automationState", "category", "city", "complianceState", "country", "displayName",
    "engagementState", "lifecycleStage", "nextAction", "organizationId", "revenueAccountId", "sourceDataCommercialState",
    "targetIds",
  ],
  "route-token": [
    "createdBy", "expiresAt", "ownerQualifiedAt", "revocationReason", "revokedAt", "revokedBy", "routeTokenId",
    "scope", "sourceActionId", "status", "targetName", "tokenHash",
  ],
  "sequence-step": [
    "bodyPreview", "channel", "sequenceStepId", "sequencerHandoffId", "status", "stepNumber", "subject", "targetName",
  ],
  "source-candidate": [
    "blocked", "category", "city", "country", "currentListUrl", "displayName", "permissionEvidenceRef",
    "providerRecordId", "providerRecordUrl", "sourceCandidateId", "website",
  ],
  "vendor-run": [
    "blockedReason", "provider", "resultCount", "status", "targetName", "vendorRunId",
  ],
};

const dependencyAllowedFields = (action: DependencyAction): ReadonlySet<string> => new Set([
  ...DEPENDENCY_COMMON_ALLOWED_FIELDS,
  ...DEPENDENCY_ACTION_ALLOWED_FIELDS[action],
]);

const emptyArrayField = (data: Record<string, unknown>, field: string): boolean => (
  Array.isArray(data[field]) && (data[field] as unknown[]).length === 0
);

const dependencyLegalRetentionReason = (
  action: DependencyAction,
  data: Record<string, unknown>,
): string | null => {
  if (["draft", "approval", "handoff", "sequence-step", "message-export"].includes(action)) {
    return data.status === "sent" ? "sent-communication" : null;
  }
  if (action === "message") return "communication-record";
  if (action === "reply-classification") return "reply-classification-record";
  if (action === "conversation") return "conversation-record";
  if (action === "revenue-account" && revenueAccountHasIndependentRetentionBasis(data)) {
    return "commercial-engagement-record";
  }
  if (
    action === "commercial-opportunity"
    && (data.status === "won" || data.status === "lost")
  ) return "commercial-engagement-record";
  return null;
};

const dependencyCompletedInvariant = (params: {
  action: DependencyAction;
  data: Record<string, unknown>;
  legalRetentionReason: string | null;
}): boolean => {
  if (!hasCommonCompletedLifecycleInvariant(params.data, params.action === "provider")) return false;
  if (params.legalRetentionReason) {
    return params.data.legalRetentionReviewRequired === true
      && params.data.legalRetentionReviewReason === params.legalRetentionReason;
  }
  if (
    params.data.legalRetentionReviewRequired === true
    || params.data.legalRetentionReviewReason != null
    || !hasOnlyAllowedFields(params.data, dependencyAllowedFields(params.action))
  ) return false;
  switch (params.action) {
    case "ai-run":
      return emptyArrayField(params.data, "criticReasons")
        && params.data.initialOutput === null
        && params.data.instruction === null
        && params.data.output === null
        && params.data.reviewReason === null
        && params.data.sourceDataPayloadStored === false
        && Array.isArray(params.data.reasons)
        && (params.data.reasons as unknown[]).length === 1
        && params.data.reasons[0] === "Source-derived details expired; re-score after a verified source refresh.";
    case "approval":
      return params.data.status === "rejected"
        && params.data.rejectionReason === "other"
        && params.data.reviewReason === "Source-data retention lifecycle completed."
        && params.data.targetName === "Retained target record";
    case "approval-packet":
      return params.data.status === "held"
        && params.data.channelReadiness === "blocked"
        && params.data.currentMenuPresence === null
        && params.data.evidenceSummary === null
        && params.data.expectedOutcome === null
        && params.data.messageBody === null
        && params.data.messageSubject === null
        && params.data.recommendedAction === "hold"
        && Array.isArray(params.data.evidenceRejectedFacts)
        && (params.data.evidenceRejectedFacts as unknown[]).includes("source-data-retention")
        && params.data.riskSummary === "Source-derived approval payload removed by retention policy."
        && params.data.targetName === "Retained target record"
        && emptyArrayField(params.data, "unsupportedClaims");
    case "channel-window":
      return params.data.status === "closed"
        && params.data.eligibleForHandoff === false
        && params.data.reason === "Source-data retention lifecycle completed."
        && params.data.targetName === "Retained target record"
        && timestampMillis(params.data.expiresAt) !== null
        && timestampMillis(params.data.expiresAt)! <= timestampMillis(params.data.sourceDataLifecycleCompletedAt)!;
    case "commercial-opportunity":
      return params.data.currency === null
        && params.data.expectedCloseAt === null
        && params.data.nextAction === "No action; source-data retention completed."
        && params.data.nextActionDueAt === null
        && params.data.probabilityPercent === 0
        && params.data.stage === "nurture"
        && params.data.stalledReason === "source-data-retention"
        && params.data.status === "nurture"
        && params.data.title === "Retained commercial opportunity"
        && params.data.valueMinor === 0
        && params.data.winLossReason === null;
    case "contact":
      return params.data.permissionState === "expired"
        && params.data.rawValueStored === false
        && !hasOwn(params.data, "value")
        && params.data.permissionEvidenceRef === null
        && /^[a-f0-9]{64}$/.test(boundedString(params.data.identityHash, 64) || "");
    case "draft":
      return params.data.status === "rejected"
        && params.data.body === "Source-derived draft removed by retention policy."
        && params.data.subject === "Retained draft"
        && params.data.targetName === "Retained target record"
        && emptyArrayField(params.data, "personalizationEvidenceIds")
        && emptyArrayField(params.data, "unsupportedClaims");
    case "enrichment":
      return params.data.status === "blocked"
        && params.data.confidence === "low"
        && params.data.expiresAt === null
        && params.data.field === "retained-source-field"
        && params.data.sourceDataPayloadStored === false
        && params.data.targetName === "Retained target record"
        && !hasOwn(params.data, "value")
        && params.data.valuePreview === null;
    case "evidence":
      return params.data.confidence === "low"
        && emptyArrayField(params.data, "allowedUse")
        && emptyArrayField(params.data, "sourceRefs")
        && Array.isArray(params.data.rejectedFacts)
        && (params.data.rejectedFacts as unknown[]).includes("source-data-retention")
        && !hasOwn(params.data, "currentMenuPresence")
        && !hasOwn(params.data, "facts")
        && params.data.summary === "Source-derived evidence removed by retention policy."
        && params.data.targetName === "Retained target record";
    case "handoff":
      return params.data.status === "stopped"
        && params.data.blockedReason === null
        && params.data.providerLeadId === null
        && params.data.recipientPreview === null
        && params.data.targetName === "Retained target record";
    case "message-export":
      return params.data.status === "exported"
        && params.data.body === ""
        && params.data.subject === ""
        && params.data.providerMessageId === null
        && params.data.targetName === "Retained target record";
    case "provider":
      return ["blocked", "expired"].includes(String(params.data.status || ""))
        && params.data.rawPayloadStored === false
        && params.data.providerRecordId === null
        && params.data.providerRecordUrl === null
        && params.data.targetName === "Retained target record"
        && /^[a-f0-9]{64}$/.test(boundedString(params.data.providerIdentityHash, 64) || "");
    case "research":
      return params.data.actionabilityState === "blocked"
        && params.data.allowedRoute === "none"
        && params.data.contactability === "blocked"
        && params.data.currentListGap === "unknown"
        && params.data.category === null
        && params.data.city === null
        && params.data.country === null
        && params.data.displayName === "Retained target record"
        && emptyArrayField(params.data, "enrichment")
        && params.data.evidenceSummary === ""
        && params.data.fitDecision === "fail"
        && params.data.fitScore === 0
        && Array.isArray(params.data.hardGateFailures)
        && (params.data.hardGateFailures as unknown[]).includes("source-data-retention")
        && params.data.providerRecordUrl === null
        && params.data.recommendedCta === ""
        && params.data.recommendedMessageAngle === ""
        && params.data.recommendedNextAction === "hold"
        && params.data.routePermissionState === "expired"
        && emptyArrayField(params.data, "sourceRefs")
        && params.data.website === null;
    case "revenue-account":
      return params.data.activationState === "not-started"
        && params.data.automationState === "paused"
        && params.data.category === null
        && params.data.city === null
        && params.data.complianceState === "blocked"
        && params.data.country === null
        && params.data.displayName === "Retained revenue account"
        && params.data.engagementState === "none"
        && params.data.lifecycleStage === "nurture"
        && params.data.nextAction === "No action; source-data retention completed."
        && /^retained_[a-f0-9]{24}$/.test(boundedString(params.data.organizationId, 40) || "")
        && params.data.sourceDataCommercialState === "closed";
    case "route-token":
      return params.data.status === "revoked" && params.data.targetName === "Retained target record";
    case "sequence-step":
      return params.data.status === "blocked"
        && params.data.bodyPreview === "Source-derived message removed by retention policy."
        && params.data.subject === "Retained sequence step"
        && params.data.targetName === "Retained target record";
    case "source-candidate":
      return params.data.blocked === true
        && params.data.displayName === "Retained target record"
        && params.data.permissionEvidenceRef === null
        && !hasOwn(params.data, "category")
        && !hasOwn(params.data, "city")
        && !hasOwn(params.data, "country")
        && !hasOwn(params.data, "currentListUrl")
        && !hasOwn(params.data, "providerRecordId")
        && !hasOwn(params.data, "providerRecordUrl")
        && !hasOwn(params.data, "website");
    case "vendor-run":
      return params.data.status === "blocked"
        && params.data.blockedReason === "Source-data retention lifecycle completed."
        && params.data.resultCount === 0
        && params.data.sourceDataPayloadStored === false
        && params.data.targetName === "Retained target record";
    case "conversation":
    case "message":
    case "reply-classification":
      return false;
  }
};

const dependencyPatch = (params: {
  action: DependencyAction;
  companionData?: Record<string, unknown> | null;
  data: Record<string, unknown>;
  now: Timestamp;
  token: string;
}): {
  additionalCounter?: keyof SignalDeskSourceDataLifecycleReconciliationResult;
  commercialSummaryDecrement?: { pipelineValueMinor: number; weightedPipelineValueMinor: number };
  decrementApprovalQueue?: boolean;
  counter: keyof SignalDeskSourceDataLifecycleReconciliationResult;
  patch: Record<string, unknown>;
} => {
  const common = commonScrubPatch(params);
  switch (params.action) {
    case "ai-run":
      return {
        counter: "scrubbedAiWorkerRunCount",
        patch: {
          ...common,
          criticReasons: [],
          initialOutput: null,
          instruction: null,
          output: null,
          reasons: ["Source-derived details expired; re-score after a verified source refresh."],
          reviewReason: null,
          sourceDataPayloadStored: false,
        },
      };
    case "channel-window":
      return {
        counter: "closedChannelWindowCount",
        patch: {
          ...common,
          eligibleForHandoff: false,
          expiresAt: params.now,
          reason: "Source-data retention lifecycle completed.",
          status: "closed",
          targetName: "Retained target record",
        },
      };
    case "contact": {
      const rawValue = boundedString(params.data.value, 180);
      const channel = boundedString(params.data.channel, 40) || "unknown";
      return {
        counter: "scrubbedContactIdentityCount",
        patch: {
          ...common,
          identityHash: stableHash(JSON.stringify([channel, rawValue || "already-scrubbed"])),
          permissionEvidenceRef: null,
          permissionState: "expired",
          rawValueStored: false,
          value: FieldValue.delete(),
        },
      };
    }
    case "provider": {
      const provider = boundedString(params.data.provider, 80) || "unknown";
      const recordId = boundedString(params.data.providerRecordId, 240) || "";
      const recordUrl = boundedString(params.data.providerRecordUrl, 500) || "";
      return {
        counter: "scrubbedProviderRetentionCount",
        patch: {
          ...common,
          providerIdentityHash: stableHash(JSON.stringify([provider, recordId, recordUrl])),
          providerRecordId: null,
          providerRecordUrl: null,
          rawPayloadStored: false,
          status: params.data.status === "blocked" ? "blocked" : "expired",
          targetName: "Retained target record",
        },
      };
    }
    case "source-candidate":
      return {
        counter: "scrubbedSourceCandidateCount",
        patch: {
          ...common,
          blocked: true,
          category: FieldValue.delete(),
          city: FieldValue.delete(),
          country: FieldValue.delete(),
          currentListUrl: FieldValue.delete(),
          displayName: "Retained target record",
          permissionEvidenceRef: null,
          providerRecordId: FieldValue.delete(),
          providerRecordUrl: FieldValue.delete(),
          website: FieldValue.delete(),
        },
      };
    case "enrichment":
      return {
        counter: "scrubbedEnrichmentResultCount",
        patch: {
          ...common,
          expiresAt: null,
          confidence: "low",
          field: "retained-source-field",
          sourceDataPayloadStored: false,
          sourceDataRecordExpiresAt: timestampMillis(params.data.expiresAt) === null
            ? null
            : params.data.expiresAt,
          status: "blocked",
          targetName: "Retained target record",
          value: FieldValue.delete(),
          valuePreview: null,
        },
      };
    case "vendor-run":
      return {
        counter: "scrubbedVendorRunCount",
        patch: {
          ...common,
          blockedReason: "Source-data retention lifecycle completed.",
          resultCount: 0,
          sourceDataPayloadStored: false,
          status: "blocked",
          targetName: "Retained target record",
        },
      };
    case "research":
      return {
        counter: "scrubbedResearchRowCount",
        patch: {
          ...common,
          actionabilityState: "blocked",
          allowedRoute: "none",
          allowedRouteReason: "Source-data retention lifecycle completed.",
          category: null,
          city: null,
          contactability: "blocked",
          country: null,
          currentListGap: "unknown",
          displayName: "Retained target record",
          enrichment: [],
          evidenceSummary: "",
          fitDecision: "fail",
          fitScore: 0,
          hardGateFailures: ["source-data-retention"],
          providerRecordUrl: null,
          recommendedChannel: "hold",
          recommendedCta: "",
          recommendedMessageAngle: "",
          recommendedNextAction: "hold",
          routePermissionState: "expired",
          sourceRefs: [],
          website: null,
        },
      };
    case "evidence":
      return {
        counter: "scrubbedEvidenceCount",
        patch: {
          ...common,
          allowedUse: [],
          confidence: "low",
          currentMenuPresence: FieldValue.delete(),
          facts: FieldValue.delete(),
          rejectedFacts: ["source-data-retention"],
          sourceRefs: [],
          summary: "Source-derived evidence removed by retention policy.",
          targetName: "Retained target record",
        },
      };
    case "approval-packet":
      return {
        counter: "scrubbedApprovalPacketCount",
        patch: {
          ...common,
          channelReadiness: "blocked",
          currentMenuPresence: null,
          evidenceRejectedFacts: ["source-data-retention"],
          evidenceSummary: null,
          expectedOutcome: null,
          messageBody: null,
          messageSubject: null,
          recommendedAction: "hold",
          riskSummary: "Source-derived approval payload removed by retention policy.",
          status: "held",
          targetName: "Retained target record",
          unsupportedClaims: [],
        },
      };
    case "draft": {
      const sent = params.data.status === "sent";
      return sent
        ? {
          counter: "legalRetentionReviewCount",
          patch: {
            ...common,
            legalRetentionReviewReason: "sent-communication",
            legalRetentionReviewRequired: true,
          },
        }
        : {
          counter: "scrubbedDraftCount",
          patch: {
            ...common,
            body: "Source-derived draft removed by retention policy.",
            personalizationEvidenceIds: [],
            status: "rejected",
            subject: "Retained draft",
            targetName: "Retained target record",
            unsupportedClaims: [],
          },
        };
    }
    case "approval": {
      const sent = params.data.status === "sent";
      return sent
        ? {
          counter: "legalRetentionReviewCount",
          patch: {
            ...common,
            legalRetentionReviewReason: "sent-communication",
            legalRetentionReviewRequired: true,
          },
        }
        : {
          ...(params.data.status === "pending" ? { decrementApprovalQueue: true as const } : {}),
          counter: "heldApprovalCount",
          patch: {
            ...common,
            rejectionReason: "other",
            reviewReason: "Source-data retention lifecycle completed.",
            status: "rejected",
            targetName: "Retained target record",
          },
        };
    }
    case "handoff": {
      const sent = params.data.status === "sent";
      return sent
        ? {
          counter: "legalRetentionReviewCount",
          patch: {
            ...common,
            legalRetentionReviewReason: "sent-communication",
            legalRetentionReviewRequired: true,
          },
        }
        : {
          counter: "stoppedHandoffCount",
          patch: {
            ...common,
            blockedReason: null,
            providerLeadId: null,
            recipientPreview: null,
            status: "stopped",
            targetName: "Retained target record",
          },
        };
    }
    case "sequence-step": {
      const sent = params.data.status === "sent";
      return sent
        ? {
          counter: "legalRetentionReviewCount",
          patch: {
            ...common,
            legalRetentionReviewReason: "sent-communication",
            legalRetentionReviewRequired: true,
          },
        }
        : {
          counter: "scrubbedSequenceStepCount",
          patch: {
            ...common,
            bodyPreview: "Source-derived message removed by retention policy.",
            status: "blocked",
            subject: "Retained sequence step",
            targetName: "Retained target record",
          },
        };
    }
    case "message-export": {
      const sent = params.data.status === "sent";
      return sent
        ? {
          counter: "legalRetentionReviewCount",
          patch: {
            ...common,
            legalRetentionReviewReason: "sent-communication",
            legalRetentionReviewRequired: true,
          },
        }
        : {
          counter: "scrubbedMessageExportCount",
          patch: {
            ...common,
            body: "",
            providerMessageId: null,
            subject: "",
            targetName: "Retained target record",
          },
        };
    }
    case "route-token":
      return {
        ...(params.data.status === "active" ? { additionalCounter: "revokedRouteTokenCount" as const } : {}),
        counter: "scrubbedRouteTokenCount",
        patch: {
          ...common,
          ...(params.data.status === "active" ? {
            revocationReason: "Source-data retention lifecycle completed.",
            revokedAt: params.now,
            revokedBy: SYSTEM_ACTOR_ID,
            status: "revoked",
          } : {}),
          targetName: "Retained target record",
        },
      };
    case "conversation":
    case "message":
    case "reply-classification":
      return {
        counter: "legalRetentionReviewCount",
        patch: {
          ...common,
          legalRetentionReviewReason: params.action === "message"
            ? "communication-record"
            : params.action === "reply-classification"
              ? "reply-classification-record"
              : "conversation-record",
          legalRetentionReviewRequired: true,
        },
      };
    case "revenue-account": {
      if (revenueAccountHasIndependentRetentionBasis(params.data)) {
        return {
          counter: "legalRetentionReviewCount",
          patch: {
            ...common,
            legalRetentionReviewReason: "commercial-engagement-record",
            legalRetentionReviewRequired: true,
          },
        };
      }
      return {
        counter: "scrubbedRevenueAccountCount",
        patch: {
          ...common,
          activationState: "not-started",
          automationState: "paused",
          category: null,
          city: null,
          complianceState: "blocked",
          country: null,
          displayName: "Retained revenue account",
          engagementState: "none",
          lifecycleStage: "nurture",
          nextAction: "No action; source-data retention completed.",
          organizationId: `retained_${stableHash(String(params.data.revenueAccountId || "unknown")).slice(0, 24)}`,
          sourceDataCommercialState: "closed",
        },
      };
    }
    case "commercial-opportunity": {
      if (
        params.data.status === "won"
        || params.data.status === "lost"
        || (params.companionData && revenueAccountHasIndependentRetentionBasis(params.companionData))
      ) {
        return {
          counter: "legalRetentionReviewCount",
          patch: {
            ...common,
            legalRetentionReviewReason: "commercial-engagement-record",
            legalRetentionReviewRequired: true,
          },
        };
      }
      const valueMinor = params.data.valueMinor as number;
      const probabilityPercent = params.data.probabilityPercent as number;
      return {
        ...(params.data.status === "open" ? {
          commercialSummaryDecrement: {
            pipelineValueMinor: valueMinor,
            weightedPipelineValueMinor: Math.round(valueMinor * probabilityPercent / 100),
          },
        } : {}),
        counter: "closedCommercialOpportunityCount",
          patch: {
            ...common,
            currency: null,
            expectedCloseAt: null,
          nextAction: "No action; source-data retention completed.",
          nextActionDueAt: null,
          probabilityPercent: 0,
          stage: "nurture",
          stalledReason: "source-data-retention",
          status: "nurture",
          title: "Retained commercial opportunity",
          valueMinor: 0,
          winLossReason: null,
        },
      };
    }
  }
};

interface ReconciliationStepResult {
  stale: boolean;
}

const processTargetDetail = async (params: {
  firestore: Firestore;
  now: Timestamp;
  progress: TargetProgress;
  targetRef: DocumentReference;
  token: string;
}): Promise<ReconciliationStepResult> => {
  const detailRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.TARGETS).doc(params.targetRef.id);
  const controlRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM);
  return params.firestore.runTransaction(async transaction => {
    const [targetSnapshot, detailSnapshot, controlSnapshot] = await Promise.all([
      transaction.get(params.targetRef),
      transaction.get(detailRef),
      transaction.get(controlRef),
    ]);
    const current = readPendingTarget(targetSnapshot, params.token);
    if (!sameTargetPosition(current.progress!, params.progress)) return { stale: true };
    const targetSummaryUnknownFieldDeletions = deleteFieldsOutside(
      current.data,
      TARGET_SUMMARY_RETAINED_FIELDS,
    );
    if (!detailSnapshot.exists) {
      transaction.update(params.targetRef, {
        ...targetSummaryUnknownFieldDeletions,
        sourceDataLifecycleProgress: {
          ...current.progress!,
          phase: nextPhase("target-detail"),
        },
      });
      return { stale: false };
    }
    const detailData = asRecord(detailSnapshot.data());
    const currentSourceRunId = normalizeId(current.data.sourceRunId);
    const detailSourceRunId = normalizeId(detailData.sourceRunId);
    const runMismatch = Boolean(currentSourceRunId && detailSourceRunId && detailSourceRunId !== currentSourceRunId);
    const providerSpecificLifecycle = current.data.sourceDataLifecycleReason === "provider-retention";
    const unverifiableLifecycle = current.data.sourceDataLifecycleReason === "legacy-unverifiable";
    const detailProduct = boundedString(detailData.pId, 20);
    const detailBelongsToLifecycle = (!detailProduct || detailProduct === SIGNALDESK_PRODUCT_CODE)
      && (detailData.targetId == null || detailData.targetId === current.targetId)
      && (unverifiableLifecycle || detailData.sourcePolicyId === current.sourcePolicyId)
      && (!providerSpecificLifecycle || !runMismatch);
    if (!detailBelongsToLifecycle) {
      transaction.update(params.targetRef, {
        sourceDataLifecycleProgress: {
          ...current.progress!,
          foreignDependencyCount: current.progress!.foreignDependencyCount + 1,
          phase: nextPhase("target-detail"),
        },
      });
      return { stale: false };
    }
    let detailFailureCode: string | null = runMismatch
      ? "SIGNALDESK_SOURCE_DATA_TARGET_DETAIL_RUN_MISMATCH"
      : null;
    try {
      const parsedDetail = parseTarget(detailSnapshot);
      const identityHash = boundedString(parsedDetail.data.identityHash, 64);
      if (!identityHash || !/^[a-f0-9]{64}$/.test(identityHash)) {
        throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_DETAIL_IDENTITY_INVALID");
      }
    } catch (error) {
      detailFailureCode = lifecycleFailureCode(error);
    }
    const identityHash = boundedString(detailData.identityHash, 64);
    const provider = boundedString(detailData.provider, 80) || "";
    const providerRecordId = boundedString(detailData.providerRecordId, 240) || "";
    const providerRecordUrl = boundedString(detailData.providerRecordUrl, 500) || "";
    const alreadyCompleted = isRetainedTargetDetail(detailData);
    if (!alreadyCompleted) {
      transaction.set(detailRef, {
        ...targetSummaryScrubPatch({
          allowedFields: TARGET_DETAIL_RETAINED_FIELDS,
          expiresAtMillis: requireTimestamp(
            current.data.sourceDataExpiresAt,
            "SIGNALDESK_SOURCE_DATA_TARGET_EXPIRY_INVALID",
          ),
          existingData: detailData,
          now: params.now,
          progress: current.progress!,
          reason: current.data.sourceDataLifecycleReason === "provider-retention"
            ? "provider-retention"
            : current.data.sourceDataLifecycleReason === "policy-blocked"
              ? "policy-blocked"
              : current.data.sourceDataLifecycleReason === "target-expired"
                ? "target-expired"
                : current.data.sourceDataLifecycleReason === "legacy-unverifiable"
                  ? "legacy-unverifiable"
                : "policy-expired",
          token: params.token,
        }),
        email: null,
        identityHash: identityHash && /^[a-f0-9]{64}$/.test(identityHash)
          ? identityHash
          : stableHash(JSON.stringify([current.targetId, current.sourcePolicyId, currentSourceRunId])),
        identityVersion: "legacy-business-v1",
        instagram: null,
        instagramRecipientId: FieldValue.delete(),
        messengerPsid: FieldValue.delete(),
        messengerRecipientId: FieldValue.delete(),
        notes: null,
        permissionEvidenceRef: null,
        phone: null,
        provider: null,
        providerIdentityHash: stableHash(JSON.stringify([provider, providerRecordId, providerRecordUrl])),
        providerRecordId: null,
        providerRecordUrl: null,
        pId: SIGNALDESK_PRODUCT_CODE,
        recipient: FieldValue.delete(),
        ...(detailFailureCode ? {
          sourceDataLifecycleInputFailureCode: detailFailureCode,
          sourceDataLifecycleInputNormalizedAt: params.now,
        } : {}),
        sourceDataLifecycleCompletedAt: params.now,
        sourceDataLifecycleProgress: null,
        sourceDataLifecycleState: "completed",
        sourcePolicyId: current.sourcePolicyId,
        sourceRunId: currentSourceRunId || detailSourceRunId || null,
        targetId: current.targetId,
      }, { merge: true });
      if (detailFailureCode) {
        const auditRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
          .doc(lifecycleAuditId("target-detail-source-data-malformed-scrubbed", `${params.token}|${current.targetId}`));
        transaction.create(auditRef, {
          action: "source_data_target_detail_malformed_authority_scrubbed",
          actorId: SYSTEM_ACTOR_ID,
          actorRole: SYSTEM_ACTOR_ROLE,
          auditEventId: auditRef.id,
          createdAt: params.now,
          entityId: current.targetId,
          entityType: "targetDetail",
          pId: SIGNALDESK_PRODUCT_CODE,
          reason: detailFailureCode,
        });
        const incidentRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.INCIDENTS)
          .doc(`source_data_malformed_detail_${stableHash(`${params.token}|${current.targetId}`).slice(0, 40)}`);
        transaction.create(incidentRef, {
          authorityId: current.targetId,
          authorityKind: "target-detail",
          createdAt: params.now,
          failureCode: detailFailureCode,
          failurePhase: "target-detail",
          incidentId: incidentRef.id,
          incidentType: "source-data-malformed-authority",
          pId: SIGNALDESK_PRODUCT_CODE,
          severity: "high",
          status: "open",
          title: "Malformed source-data detail was scrubbed and normalized",
          updatedAt: params.now,
        });
        stageNewHighIncidentSummary({
          controlRef,
          controlSnapshot,
          count: 1,
          now: params.now,
          transaction,
        });
      }
    }
    const nextProgress: TargetProgress = {
      ...current.progress!,
      phase: nextPhase("target-detail"),
      scrubbedTargetDetailCount: current.progress!.scrubbedTargetDetailCount + (alreadyCompleted ? 0 : 1),
    };
    transaction.update(params.targetRef, {
      ...targetSummaryUnknownFieldDeletions,
      sourceDataLifecycleProgress: nextProgress,
      sourceRunId: currentSourceRunId || detailSourceRunId || null,
    });
    return { stale: false };
  });
};

const definitionForPhase = (phase: TargetLifecyclePhase): DependencyPhaseDefinition => {
  const definition = DEPENDENCY_PHASES.find(candidate => candidate.phase === phase);
  if (!definition) throw new Error("SIGNALDESK_SOURCE_DATA_LIFECYCLE_PHASE_INVALID");
  return definition;
};

const processDependencyPage = async (params: {
  definition: DependencyPhaseDefinition;
  firestore: Firestore;
  now: Timestamp;
  pageSize: number;
  progress: TargetProgress;
  targetRef: DocumentReference;
  token: string;
}): Promise<ReconciliationStepResult> => {
  let query = params.firestore.collection(params.definition.collection)
    .where(params.definition.queryField || "targetId", "==", params.targetRef.id)
    .orderBy(FieldPath.documentId())
    .limit(params.pageSize);
  if (params.progress.cursor) query = query.startAfter(params.progress.cursor);
  const page = await query.get();
  const summaryRef = params.definition.action === "approval"
    ? params.firestore.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.QUEUES)
    : params.definition.action === "commercial-opportunity"
      ? params.firestore.collection(SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.REVENUE)
      : null;
  const companionRefs = params.definition.action === "commercial-opportunity"
    ? Array.from(new Set(page.docs
      .map(document => normalizeId(asRecord(document.data()).revenueAccountId))
      .filter((value): value is string => Boolean(value))))
      .map(revenueAccountId => params.firestore.collection(SIGNALDESK_COLLECTIONS.REVENUE_ACCOUNTS).doc(revenueAccountId))
    : [];
  return params.firestore.runTransaction(async transaction => {
    const snapshots = await Promise.all([
      transaction.get(params.targetRef),
      ...(summaryRef ? [transaction.get(summaryRef)] : []),
      ...page.docs.map(document => transaction.get(document.ref)),
      ...companionRefs.map(reference => transaction.get(reference)),
    ]);
    const current = readPendingTarget(snapshots[0], params.token);
    if (!sameTargetPosition(current.progress!, params.progress)) return { stale: true };
    const summarySnapshot = summaryRef ? snapshots[1] : null;
    const dependencyOffset = summaryRef ? 2 : 1;
    const dependencySnapshots = snapshots.slice(dependencyOffset, dependencyOffset + page.docs.length);
    const companionSnapshots = snapshots.slice(dependencyOffset + page.docs.length);
    const companions = new Map(companionSnapshots.map(snapshot => [snapshot.id, snapshot]));
    const increments = emptyReconciliationResult();
    let approvalQueueDecrement = 0;
    let openOpportunityDecrement = 0;
    let pipelineValueDecrement = 0;
    let weightedPipelineValueDecrement = 0;
    for (const dependencySnapshot of dependencySnapshots) {
      const dependency = parseDependency({
        allowUnverifiableLineage: current.data.sourceDataLifecycleReason === "legacy-unverifiable",
        definition: params.definition,
        snapshot: dependencySnapshot,
        sourcePolicyId: current.sourcePolicyId,
        targetId: current.targetId,
      });
      increments.scannedDependencyCount += 1;
      if (dependency.foreign) {
        increments.foreignDependencyCount += 1;
        continue;
      }
      const companionId = params.definition.action === "commercial-opportunity"
        ? normalizeId(dependency.data.revenueAccountId)
        : null;
      const companionSnapshot = companionId ? companions.get(companionId) : null;
      const rawCompanion = companionSnapshot?.exists ? asRecord(companionSnapshot.data()) : null;
      const companionData = rawCompanion
        && rawCompanion.pId === SIGNALDESK_PRODUCT_CODE
        && rawCompanion.revenueAccountId === companionId
        && rawCompanion.primaryTargetId === current.targetId
        ? rawCompanion
        : null;
      const operation = dependencyPatch({
        action: params.definition.action,
        companionData,
        data: dependency.data,
        now: params.now,
        token: params.token,
      });
      const legalRetentionReason = operation.counter === "legalRetentionReviewCount"
        ? dependencyLegalRetentionReason(params.definition.action, dependency.data)
          || "commercial-engagement-record"
        : null;
      const alreadyCompleted = dependencyCompletedInvariant({
        action: params.definition.action,
        data: dependency.data,
        legalRetentionReason,
      });
      if (alreadyCompleted) {
        if (legalRetentionReason) increments.legalRetentionReviewCount += 1;
        continue;
      }
      if (
        params.definition.action === "commercial-opportunity"
        && operation.counter !== "legalRetentionReviewCount"
        && dependency.data.status === "open"
        && (dependency.data.valueMinor as number) > 0
      ) {
        if (!summarySnapshot?.exists) throw new Error("SIGNALDESK_REVENUE_SUMMARY_MISSING");
        const revenueSummary = assertOperationalSummary({
          idField: "revenueControlSummaryId",
          snapshot: summarySnapshot,
        });
        if (revenueSummary.pipelineCurrency !== dependency.data.currency) {
          throw new Error("SIGNALDESK_COMMERCIAL_OPPORTUNITY_CURRENCY_MISMATCH");
        }
      }
      transaction.set(dependencySnapshot.ref, {
        ...(legalRetentionReason ? {} : {
          ...deleteFieldsOutside(dependency.data, dependencyAllowedFields(params.definition.action)),
          legalRetentionReviewReason: FieldValue.delete(),
          legalRetentionReviewRequired: FieldValue.delete(),
        }),
        ...operation.patch,
      }, { merge: true });
      increments[operation.counter] += 1;
      if (operation.additionalCounter) increments[operation.additionalCounter] += 1;
      if (operation.decrementApprovalQueue) approvalQueueDecrement += 1;
      if (operation.commercialSummaryDecrement) {
        openOpportunityDecrement += 1;
        pipelineValueDecrement += operation.commercialSummaryDecrement.pipelineValueMinor;
        weightedPipelineValueDecrement += operation.commercialSummaryDecrement.weightedPipelineValueMinor;
        if (!Number.isSafeInteger(pipelineValueDecrement) || !Number.isSafeInteger(weightedPipelineValueDecrement)) {
          throw new Error("SIGNALDESK_SOURCE_DATA_SUMMARY_AMOUNT_INVALID");
        }
      }
    }
    if (approvalQueueDecrement && summaryRef && summarySnapshot) {
      const summary = assertOperationalSummary({ idField: "queueSummaryId", snapshot: summarySnapshot });
      transaction.set(summaryRef, {
        approvalBacklog: Math.max(0, summaryCount(summary, "approvalBacklog") - approvalQueueDecrement),
        humanReview: Math.max(0, summaryCount(summary, "humanReview") - approvalQueueDecrement),
        pId: SIGNALDESK_PRODUCT_CODE,
        queueSummaryId: SIGNALDESK_SUMMARY_DOCS.QUEUES,
        updatedAt: params.now,
      }, { merge: true });
    }
    if (openOpportunityDecrement && summaryRef && summarySnapshot) {
      const summary = assertOperationalSummary({ idField: "revenueControlSummaryId", snapshot: summarySnapshot });
      const pipelineValueMinor = Math.max(0, summaryAmount(summary, "pipelineValueMinor") - pipelineValueDecrement);
      const weightedPipelineValueMinor = Math.max(
        0,
        summaryAmount(summary, "weightedPipelineValueMinor") - weightedPipelineValueDecrement,
      );
      transaction.set(summaryRef, {
        openOpportunityCount: Math.max(0, summaryCount(summary, "openOpportunityCount") - openOpportunityDecrement),
        pId: SIGNALDESK_PRODUCT_CODE,
        pipelineCurrency: pipelineValueMinor === 0 ? null : summary.pipelineCurrency ?? null,
        pipelineValueMinor,
        revenueControlSummaryId: SIGNALDESK_SUMMARY_DOCS.REVENUE,
        updatedAt: params.now,
        weightedPipelineValueMinor,
      }, { merge: true });
    }
    const pageComplete = page.size < params.pageSize;
    const nextProgress: TargetProgress = {
      ...current.progress!,
      cursor: pageComplete ? null : page.docs[page.docs.length - 1]?.id || null,
      phase: pageComplete ? nextPhase(params.definition.phase) : params.definition.phase,
    };
    for (const key of Object.keys(increments) as Array<keyof SignalDeskSourceDataLifecycleReconciliationResult>) {
      nextProgress[key] = current.progress![key] + increments[key];
    }
    transaction.update(params.targetRef, { sourceDataLifecycleProgress: nextProgress });
    return { stale: false };
  });
};

const readCompletedTargetResult = (
  data: Record<string, unknown>,
): SignalDeskSourceDataLifecycleReconciliationResult => {
  const source = asRecord(data.lastSourceDataLifecycleResult);
  const result = emptyReconciliationResult();
  for (const key of Object.keys(result) as Array<keyof SignalDeskSourceDataLifecycleReconciliationResult>) {
    result[key] = boundedCount(source[key]);
  }
  return result;
};

const completeTarget = async (params: {
  firestore: Firestore;
  now: Timestamp;
  targetRef: DocumentReference;
  token: string;
}): Promise<{ newlyCompleted: boolean; result: SignalDeskSourceDataLifecycleReconciliationResult }> => (
  params.firestore.runTransaction(async transaction => {
    const timelineRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES)
      .doc(lifecycleTimelineId(`target|${params.token}`));
    const [snapshot, timelineSnapshot] = await Promise.all([
      transaction.get(params.targetRef),
      transaction.get(timelineRef),
    ]);
    if (!snapshot.exists) throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_MISSING");
    const data = asRecord(snapshot.data());
    if (
      data.sourceDataLifecycleState === "completed"
      && data.lastSourceDataLifecycleToken === params.token
      && data.sourceDataLifecycleProgress == null
    ) return { newlyCompleted: false, result: readCompletedTargetResult(data) };
    const current = readPendingTarget(snapshot, params.token);
    if (current.progress!.phase !== "complete") {
      throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_RECONCILIATION_INCOMPLETE");
    }
    assertLifecycleTimeline({
      entityId: current.targetId,
      entityType: "target",
      snapshot: timelineSnapshot,
    });
    const result = reconciliationResultFromProgress(current.progress!);
    transaction.set(params.targetRef, {
      lastSourceDataLifecycleAt: params.now,
      lastSourceDataLifecycleResult: result,
      lastSourceDataLifecycleToken: params.token,
      sourceDataLifecycleCompletedAt: params.now,
      sourceDataLifecycleFailedAt: null,
      sourceDataLifecycleFailureCode: null,
      sourceDataLifecycleFailurePhase: null,
      sourceDataLifecycleLastRetryAt: null,
      sourceDataLifecycleProgress: null,
      sourceDataLifecycleRetryAt: null,
      sourceDataLifecycleRetryCount: 0,
      sourceDataLifecycleState: "completed",
      updatedAt: params.now,
      updatedBy: SYSTEM_ACTOR_ID,
    }, { merge: true });
    const auditRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
      .doc(lifecycleAuditId("target-source-data-completed", params.token));
    transaction.create(auditRef, {
      action: "source_data_target_scrub_completed",
      actorId: SYSTEM_ACTOR_ID,
      actorRole: SYSTEM_ACTOR_ROLE,
      auditEventId: auditRef.id,
      createdAt: params.now,
      entityId: current.targetId,
      entityType: "target",
      pId: SIGNALDESK_PRODUCT_CODE,
      reason: `dependencies=${result.scannedDependencyCount};legalReview=${result.legalRetentionReviewCount}`,
    });
    transaction.set(timelineRef, {
      status: result.legalRetentionReviewCount > 0 ? "held" : "completed",
      steps: [{
        at: params.now.toDate().toISOString(),
        label: result.legalRetentionReviewCount > 0
          ? "Source data scrubbed; communication records await legal-retention review"
          : "Source data scrubbed and tombstones retained",
        status: result.legalRetentionReviewCount > 0 ? "held" : "completed",
      }],
      updatedAt: params.now,
    }, { merge: true });
    return { newlyCompleted: true, result };
  })
);

const reconcilePendingTarget = async (params: {
  firestore: Firestore;
  now: Timestamp;
  pageSize: number;
  stepBudget: { remaining: number };
  targetRef: DocumentReference;
  token: string;
}): Promise<{
  completed: boolean;
  newlyCompleted: boolean;
  result?: SignalDeskSourceDataLifecycleReconciliationResult;
}> => {
  while (params.stepBudget.remaining > 0) {
    const snapshot = await params.targetRef.get();
    if (!snapshot.exists) throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_MISSING");
    const data = asRecord(snapshot.data());
    if (
      data.sourceDataLifecycleState === "completed"
      && data.lastSourceDataLifecycleToken === params.token
      && data.sourceDataLifecycleProgress == null
    ) return { completed: true, newlyCompleted: false, result: readCompletedTargetResult(data) };
    const current = readPendingTarget(snapshot, params.token);
    if (current.progress!.phase === "complete") {
      const completion = await completeTarget({
        firestore: params.firestore,
        now: params.now,
        targetRef: params.targetRef,
        token: params.token,
      });
      return { completed: true, ...completion };
    }
    params.stepBudget.remaining -= 1;
    if (current.progress!.phase === "target-detail") {
      await processTargetDetail({
        firestore: params.firestore,
        now: params.now,
        progress: current.progress!,
        targetRef: params.targetRef,
        token: params.token,
      });
    } else {
      await processDependencyPage({
        definition: definitionForPhase(current.progress!.phase),
        firestore: params.firestore,
        now: params.now,
        pageSize: params.pageSize,
        progress: current.progress!,
        targetRef: params.targetRef,
        token: params.token,
      });
    }
  }
  const finalSnapshot = await params.targetRef.get();
  if (finalSnapshot.exists) {
    const data = asRecord(finalSnapshot.data());
    if (
      data.sourceDataLifecycleState === "completed"
      && data.lastSourceDataLifecycleToken === params.token
      && data.sourceDataLifecycleProgress == null
    ) return { completed: true, newlyCompleted: false, result: readCompletedTargetResult(data) };
    const current = readPendingTarget(finalSnapshot, params.token);
    if (current.progress!.phase === "complete") {
      const completion = await completeTarget({
        firestore: params.firestore,
        now: params.now,
        targetRef: params.targetRef,
        token: params.token,
      });
      return { completed: true, ...completion };
    }
  }
  return { completed: false, newlyCompleted: false };
};

type LifecycleAuthorityKind = "policy" | "provider" | "target";
type LifecycleFailurePhase = "blocked" | "due" | "pending" | "retry" | "scrub_ready";

const authorityHash = (kind: LifecycleAuthorityKind, data: unknown): string => {
  if (kind === "policy") return signalDeskSourcePolicyLifecycleAuthorityHash(data);
  if (kind === "provider") return signalDeskProviderSourceDataLifecycleAuthorityHash(data);
  return signalDeskSourceDataLifecycleAuthorityHash(data);
};

const authorityRetryCountField = (kind: LifecycleAuthorityKind): string => (
  kind === "policy" ? "sourceDataPolicyLifecycleRetryCount" : "sourceDataLifecycleRetryCount"
);

const authorityFailurePatch = (params: {
  data: Record<string, unknown>;
  failureCode: string;
  kind: LifecycleAuthorityKind;
  now: Timestamp;
  phase: LifecycleFailurePhase;
}): Record<string, unknown> => {
  const retryCountField = authorityRetryCountField(params.kind);
  const priorRetryCount = boundedCount(params.data[retryCountField]);
  const retryAt = Timestamp.fromMillis(params.now.toMillis() + retryDelay(priorRetryCount));
  if (params.kind === "policy") {
    return {
      sourceDataPolicyLifecycleFailedAt: params.now,
      sourceDataPolicyLifecycleFailureCode: params.failureCode,
      sourceDataPolicyLifecycleFailurePhase: params.phase,
      sourceDataPolicyLifecyclePriorStatus: params.data.sourceDataPolicyLifecyclePriorStatus || params.data.status || null,
      sourceDataPolicyLifecycleRetryAt: retryAt,
      sourceDataPolicyLifecycleRetryCount: priorRetryCount + 1,
      sourceDataPolicyLifecycleState: "failed",
      status: "inactive",
      updatedAt: params.now,
      updatedBy: SYSTEM_ACTOR_ID,
    };
  }
  if (params.kind === "provider") {
    const provider = boundedString(params.data.provider, 80) || "unknown";
    const providerRecordId = boundedString(params.data.providerRecordId, 240) || "";
    const providerRecordUrl = boundedString(params.data.providerRecordUrl, 500) || "";
    return {
      providerIdentityHash: stableHash(JSON.stringify([provider, providerRecordId, providerRecordUrl])),
      providerRecordId: null,
      providerRecordUrl: null,
      rawPayloadStored: false,
      sourceDataLifecycleFailedAt: params.now,
      sourceDataLifecycleFailureCode: params.failureCode,
      sourceDataLifecycleFailurePhase: params.phase,
      sourceDataLifecyclePriorState: params.data.sourceDataLifecyclePriorState
        || params.data.sourceDataLifecycleState
        || null,
      sourceDataLifecyclePriorStatus: params.data.sourceDataLifecyclePriorStatus || params.data.status || null,
      sourceDataLifecycleRetryAt: retryAt,
      sourceDataLifecycleRetryCount: priorRetryCount + 1,
      sourceDataLifecycleState: "failed",
      status: "blocked",
      targetName: "Retained target record",
      updatedAt: params.now,
      updatedBy: SYSTEM_ACTOR_ID,
    };
  }
  return {
    contactability: "blocked",
    nextAction: "hold",
    segment: "hold",
    sourceConfidence: "blocked",
    sourceDataLifecycleFailedAt: params.now,
    sourceDataLifecycleFailureCode: params.failureCode,
    sourceDataLifecycleFailurePhase: params.phase,
    sourceDataLifecycleRetryAt: retryAt,
    sourceDataLifecycleRetryCount: priorRetryCount + 1,
    sourceDataLifecycleState: "failed",
    status: "held",
    updatedAt: params.now,
    updatedBy: SYSTEM_ACTOR_ID,
  };
};

export const recordSignalDeskSourceDataLifecycleFailure = async (params: {
  authorityKind: LifecycleAuthorityKind;
  authorityRef: DocumentReference;
  error: unknown;
  expectedAuthorityHash: string;
  firestore: Firestore;
  now: Timestamp;
  phase: LifecycleFailurePhase;
}): Promise<boolean> => {
  const failureCode = lifecycleFailureCode(params.error);
  const identity = `${params.authorityKind}|${params.authorityRef.id}`;
  const incidentId = `source_data_lifecycle_failure_${stableHash(identity).slice(0, 40)}`;
  const fingerprint = stableHash(`${identity}|${params.phase}|${failureCode}`);
  const incidentRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.INCIDENTS).doc(incidentId);
  const controlRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM);
  const auditRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
    .doc(lifecycleAuditId("source-data-lifecycle-failed", fingerprint));
  const timelineRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES)
    .doc(lifecycleTimelineId(`failure|${identity}`));
  return params.firestore.runTransaction(async transaction => {
    const [authoritySnapshot, incidentSnapshot, controlSnapshot, auditSnapshot, timelineSnapshot] = await Promise.all([
      transaction.get(params.authorityRef),
      transaction.get(incidentRef),
      transaction.get(controlRef),
      transaction.get(auditRef),
      transaction.get(timelineRef),
    ]);
    if (!authoritySnapshot.exists) return false;
    const data = asRecord(authoritySnapshot.data());
    if (data.pId !== SIGNALDESK_PRODUCT_CODE) return false;
    if (authorityHash(params.authorityKind, data) !== params.expectedAuthorityHash) return false;
    const incident = asRecord(incidentSnapshot.data());
    if (incidentSnapshot.exists && (
      incident.pId !== SIGNALDESK_PRODUCT_CODE
      || incident.incidentId !== incidentId
      || incident.incidentType !== "source-data-lifecycle-failure"
      || incident.authorityKind !== params.authorityKind
      || incident.authorityId !== params.authorityRef.id
      || !["open", "acknowledged", "resolved"].includes(String(incident.status || ""))
    )) throw new Error("SIGNALDESK_SOURCE_DATA_LIFECYCLE_FAILURE_INCIDENT_SHAPE_INVALID");
    assertControlRoomSummary(controlSnapshot);
    const incidentCreated = !incidentSnapshot.exists;
    const incidentReopened = incidentSnapshot.exists && incident.status === "resolved";
    const timelineEntityType = params.authorityKind === "target" ? "target" : "source-quality";
    if (timelineSnapshot.exists) {
      assertLifecycleTimeline({
        entityId: params.authorityRef.id,
        entityType: timelineEntityType,
        snapshot: timelineSnapshot,
      });
    }
    if (incidentCreated) {
      transaction.create(incidentRef, {
        authorityId: params.authorityRef.id,
        authorityKind: params.authorityKind,
        createdAt: params.now,
        failureCode,
        failureFingerprint: fingerprint,
        failurePhase: params.phase,
        incidentId,
        incidentType: "source-data-lifecycle-failure",
        pId: SIGNALDESK_PRODUCT_CODE,
        severity: "high",
        status: "open",
        title: "Source-data lifecycle requires operator review",
        updatedAt: params.now,
      });
    } else {
      transaction.set(incidentRef, {
        failureCode,
        failureFingerprint: fingerprint,
        failurePhase: params.phase,
        ...(incidentReopened ? { reopenedAt: params.now, status: "open" } : {}),
        updatedAt: params.now,
      }, { merge: true });
    }
    transaction.set(params.authorityRef, authorityFailurePatch({
      data,
      failureCode,
      kind: params.authorityKind,
      now: params.now,
      phase: params.phase,
    }), { merge: true });
    if (incidentCreated || incidentReopened) {
      transaction.set(controlRef, {
        pId: SIGNALDESK_PRODUCT_CODE,
        ...(incidentCreated ? { incidentCount: FieldValue.increment(1) } : {}),
        openIncidentCount: FieldValue.increment(1),
        safetyStatus: "blocked",
        updatedAt: params.now,
      }, { merge: true });
    }
    if (!auditSnapshot.exists) {
      transaction.create(auditRef, {
        action: "source_data_lifecycle_failed",
        actorId: SYSTEM_ACTOR_ID,
        actorRole: SYSTEM_ACTOR_ROLE,
        auditEventId: auditRef.id,
        createdAt: params.now,
        entityId: params.authorityRef.id,
        entityType: params.authorityKind,
        pId: SIGNALDESK_PRODUCT_CODE,
        reason: `${params.phase}:${failureCode}`,
      });
    }
    const timelineData = {
      entityId: params.authorityRef.id,
      entityType: timelineEntityType,
      label: "Source-data lifecycle failure",
      pId: SIGNALDESK_PRODUCT_CODE,
      runTimelineId: timelineRef.id,
      status: "blocked",
      steps: [{
        at: params.now.toDate().toISOString(),
        label: "Lifecycle processing failed; retry scheduled",
        status: "blocked",
      }],
      updatedAt: params.now,
    };
    if (timelineSnapshot.exists) transaction.set(timelineRef, timelineData, { merge: true });
    else transaction.create(timelineRef, timelineData);
    return true;
  });
};

const quarantineAfterFailureDiagnosticError = async (params: {
  authorityKind: LifecycleAuthorityKind;
  authorityRef: DocumentReference;
  error: unknown;
  expectedAuthorityHash: string;
  firestore: Firestore;
  now: Timestamp;
  phase: LifecycleFailurePhase;
}): Promise<boolean> => params.firestore.runTransaction(async transaction => {
  const snapshot = await transaction.get(params.authorityRef);
  if (!snapshot.exists) return false;
  const data = asRecord(snapshot.data());
  if (data.pId !== SIGNALDESK_PRODUCT_CODE) return false;
  if (authorityHash(params.authorityKind, data) !== params.expectedAuthorityHash) return false;
  transaction.set(params.authorityRef, authorityFailurePatch({
    data,
    failureCode: lifecycleFailureCode(params.error),
    kind: params.authorityKind,
    now: params.now,
    phase: params.phase,
  }), { merge: true });
  return true;
});

const isolateLifecycleFailure = async (params: {
  authorityKind: LifecycleAuthorityKind;
  authorityRef: DocumentReference;
  error: unknown;
  expectedAuthorityHash: string;
  firestore: Firestore;
  now: Timestamp;
  phase: LifecycleFailurePhase;
  result: SignalDeskSourceDataLifecycleResult;
}): Promise<void> => {
  try {
    const recorded = await recordSignalDeskSourceDataLifecycleFailure(params);
    if (!recorded) {
      if (params.authorityKind === "target") params.result.conflictedTargetCount += 1;
      else if (params.authorityKind === "provider") params.result.conflictedProviderCount += 1;
      else params.result.conflictedAuthorityCount += 1;
    } else if (params.authorityKind === "target") params.result.failedTargetCount += 1;
    else params.result.failedAuthorityCount += 1;
  } catch (diagnosticError) {
    params.result.failureDiagnosticErrorCount += 1;
    logger.error("[SignalDesk Source Data Lifecycle] Failure diagnostic could not be persisted", {
      authorityKind: params.authorityKind,
      failureCode: "SIGNALDESK_SOURCE_DATA_LIFECYCLE_FAILURE_DIAGNOSTIC_FAILED",
      failurePhase: params.phase,
      ...sourceErrorContext(diagnosticError),
    });
    try {
      const quarantined = await quarantineAfterFailureDiagnosticError(params);
      if (!quarantined) {
        if (params.authorityKind === "target") params.result.conflictedTargetCount += 1;
        else if (params.authorityKind === "provider") params.result.conflictedProviderCount += 1;
        else params.result.conflictedAuthorityCount += 1;
      } else if (params.authorityKind === "target") params.result.failedTargetCount += 1;
      else params.result.failedAuthorityCount += 1;
    } catch (quarantineError) {
      params.result.failureDiagnosticErrorCount += 1;
      if (params.authorityKind === "target") params.result.conflictedTargetCount += 1;
      else if (params.authorityKind === "provider") params.result.conflictedProviderCount += 1;
      else params.result.conflictedAuthorityCount += 1;
      logger.error("[SignalDesk Source Data Lifecycle] Authority quarantine also failed", {
        authorityKind: params.authorityKind,
        failureCode: "SIGNALDESK_SOURCE_DATA_LIFECYCLE_QUARANTINE_FAILED",
        failurePhase: params.phase,
        ...sourceErrorContext(quarantineError),
      });
    }
  }
};

const rearmFailedAuthority = async (params: {
  authorityKind: LifecycleAuthorityKind;
  authorityRef: DocumentReference;
  firestore: Firestore;
  now: Timestamp;
}): Promise<boolean> => params.firestore.runTransaction(async transaction => {
  const snapshot = await transaction.get(params.authorityRef);
  if (!snapshot.exists) return false;
  const data = asRecord(snapshot.data());
  if (data.pId !== SIGNALDESK_PRODUCT_CODE) throw new Error("SIGNALDESK_SOURCE_DATA_AUTHORITY_PRODUCT_MISMATCH");
  const stateField = params.authorityKind === "policy"
    ? "sourceDataPolicyLifecycleState"
    : "sourceDataLifecycleState";
  const retryAtField = params.authorityKind === "policy"
    ? "sourceDataPolicyLifecycleRetryAt"
    : "sourceDataLifecycleRetryAt";
  if (data[stateField] !== "failed") return false;
  const retryAt = timestampMillis(data[retryAtField]);
  if (retryAt === null || retryAt > params.now.toMillis()) return false;
  if (params.authorityKind === "policy") {
    const hasPending = Boolean(data.sourceDataPolicyLifecycleToken && data.sourceDataPolicyLifecycleProgress);
    const priorStatus = boundedString(data.sourceDataPolicyLifecyclePriorStatus, 40);
    transaction.set(params.authorityRef, {
      sourceDataPolicyLifecycleLastRetryAt: params.now,
      sourceDataPolicyLifecycleRetryAt: null,
      sourceDataPolicyLifecycleState: hasPending ? "pending" : null,
      status: hasPending
        ? "inactive"
        : priorStatus && POLICY_STATUSES.has(priorStatus) ? priorStatus : "blocked",
      updatedAt: params.now,
      updatedBy: SYSTEM_ACTOR_ID,
    }, { merge: true });
  } else if (params.authorityKind === "provider") {
    const priorState = boundedString(data.sourceDataLifecyclePriorState, 40);
    const priorStatus = boundedString(data.sourceDataLifecyclePriorStatus, 40);
    transaction.set(params.authorityRef, {
      sourceDataLifecycleLastRetryAt: params.now,
      sourceDataLifecycleRetryAt: null,
      sourceDataLifecycleState: priorState === "scrub_ready" ? "scrub_ready" : null,
      status: priorStatus && PROVIDER_RETENTION_STATUSES.has(priorStatus) ? priorStatus : "blocked",
      updatedAt: params.now,
      updatedBy: SYSTEM_ACTOR_ID,
    }, { merge: true });
  } else {
    if (!data.sourceDataLifecycleToken || !data.sourceDataLifecycleProgress) {
      throw new Error("SIGNALDESK_SOURCE_DATA_TARGET_LIFECYCLE_SHAPE_INVALID");
    }
    transaction.set(params.authorityRef, {
      sourceDataLifecycleLastRetryAt: params.now,
      sourceDataLifecycleRetryAt: null,
      sourceDataLifecycleState: "pending",
      updatedAt: params.now,
      updatedBy: SYSTEM_ACTOR_ID,
    }, { merge: true });
  }
  return true;
});

const boundedDocuments = (
  documents: QueryDocumentSnapshot[],
  maximum: number,
): { documents: QueryDocumentSnapshot[]; overflow: boolean } => ({
  documents: documents.slice(0, maximum),
  overflow: documents.length > maximum,
});

const pendingPolicyReason = (policy: ParsedPolicy): "policy-blocked" | "policy-expired" => (
  policy.data.sourceDataPolicyLifecycleReason === "policy-blocked" ? "policy-blocked" : "policy-expired"
);

const quarantineProviderAuthority = async (params: {
  expectedAuthorityHash: string;
  firestore: Firestore;
  lineage: ParsedProviderRetentionLineage;
  now: Timestamp;
  providerRef: DocumentReference;
}): Promise<{ providerQuarantined: boolean; targetMaterialized: boolean }> => {
  const targetRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(params.lineage.targetId);
  const policyRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES).doc(params.lineage.sourcePolicyId);
  const controlRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM);
  return params.firestore.runTransaction(async transaction => {
    const [providerSnapshot, targetSnapshot, policySnapshot, controlSnapshot] = await Promise.all([
      transaction.get(params.providerRef),
      transaction.get(targetRef),
      transaction.get(policyRef),
      transaction.get(controlRef),
    ]);
    if (!providerSnapshot.exists) return { providerQuarantined: false, targetMaterialized: false };
    const providerData = asRecord(providerSnapshot.data());
    if (
      signalDeskProviderSourceDataLifecycleAuthorityHash(providerData) !== params.expectedAuthorityHash
      || providerData.sourceDataLifecycleState !== "failed"
    ) return { providerQuarantined: false, targetMaterialized: false };
    const currentLineage = parseProviderRetentionLineage(providerSnapshot);
    if (
      currentLineage.provider !== params.lineage.provider
      || currentLineage.sourcePolicyId !== params.lineage.sourcePolicyId
      || currentLineage.sourceRunId !== params.lineage.sourceRunId
      || currentLineage.targetId !== params.lineage.targetId
      || currentLineage.retentionExpiresAtMillis !== params.lineage.retentionExpiresAtMillis
    ) return { providerQuarantined: false, targetMaterialized: false };

    let policy: ParsedPolicy | null = null;
    try {
      const parsedPolicy = parsePolicy(policySnapshot);
      if (
        boundedString(parsedPolicy.data.sourceType, 40) === "provider"
        && boundedString(parsedPolicy.data.provider, 80) === currentLineage.provider
      ) policy = parsedPolicy;
    } catch {
      policy = null;
    }
    const targetData = asRecord(targetSnapshot.data());
    const targetBound = targetSnapshot.exists
      && targetData.pId === SIGNALDESK_PRODUCT_CODE
      && targetData.targetId === currentLineage.targetId
      && targetData.sourcePolicyId === currentLineage.sourcePolicyId
      && targetData.sourceRunId === currentLineage.sourceRunId;
    const canHoldTarget = Boolean(policy && targetBound);
    const held = canHoldTarget
      ? stageTargetHold({
        expiresAtMillis: currentLineage.retentionExpiresAtMillis === null
          ? policy!.expiresAtMillis
          : Math.min(currentLineage.retentionExpiresAtMillis, policy!.expiresAtMillis),
        now: params.now,
        reason: "provider-retention",
        snapshot: targetSnapshot,
        sourcePolicyId: currentLineage.sourcePolicyId,
        transaction,
      })
      : { newHighIncidentCount: 0, newlyMaterialized: false, token: null };
    if (held.newHighIncidentCount > 0) {
      stageNewHighIncidentSummary({
        controlRef,
        controlSnapshot,
        count: held.newHighIncidentCount,
        now: params.now,
        transaction,
      });
    }
    const token = lifecycleToken("provider", [
      "quarantine",
      params.providerRef.id,
      currentLineage.provider,
      currentLineage.sourcePolicyId,
      currentLineage.sourceRunId,
      currentLineage.targetId,
      currentLineage.retentionExpiresAtMillis,
      timestampMillis(providerData.lastRefreshedAt),
      boundedString(providerData.sourceDataLifecycleFailureCode, 160),
    ]);
    transaction.set(params.providerRef, {
      ...deleteFieldsOutside(providerData, dependencyAllowedFields("provider")),
      providerRecordId: null,
      providerRecordUrl: null,
      rawPayloadStored: false,
      ...(canHoldTarget && currentLineage.retentionExpiresAtMillis === null ? {
        retentionExpiresAt: Timestamp.fromMillis(policy!.expiresAtMillis),
      } : {}),
      sourceDataLifecycleCompletedAt: canHoldTarget ? params.now : null,
      sourceDataLifecycleKind: TARGET_LIFECYCLE_KIND,
      sourceDataLifecycleQuarantinedAt: params.now,
      sourceDataLifecycleQuarantineReason: canHoldTarget
        ? "provider-retention-processing-failed-target-held"
        : "provider-retention-authority-invalid",
      sourceDataLifecycleRetryAt: null,
      sourceDataLifecycleState: canHoldTarget ? "completed" : "failed",
      sourceDataLifecycleToken: token,
      status: "blocked",
      targetName: "Retained target record",
      updatedAt: params.now,
      updatedBy: SYSTEM_ACTOR_ID,
    }, { merge: true });
    const auditRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
      .doc(lifecycleAuditId("provider-retention-quarantined", token));
    transaction.create(auditRef, {
      action: canHoldTarget
        ? "provider_source_retention_quarantined_target_held"
        : "provider_source_retention_authority_quarantined",
      actorId: SYSTEM_ACTOR_ID,
      actorRole: SYSTEM_ACTOR_ROLE,
      auditEventId: auditRef.id,
      createdAt: params.now,
      entityId: params.providerRef.id,
      entityType: "providerSourceRetention",
      pId: SIGNALDESK_PRODUCT_CODE,
      reason: boundedString(providerData.sourceDataLifecycleFailureCode, 160)
        || "SIGNALDESK_PROVIDER_RETENTION_PROCESSING_FAILED",
    });
    return { providerQuarantined: true, targetMaterialized: held.newlyMaterialized };
  });
};

const handleProviderLifecycleFailure = async (params: {
  error: unknown;
  expectedAuthorityHash: string;
  firestore: Firestore;
  now: Timestamp;
  phase: "due" | "scrub_ready";
  providerRef: DocumentReference;
  result: SignalDeskSourceDataLifecycleResult;
}): Promise<void> => {
  const current = await params.providerRef.get();
  let lineage: ParsedProviderRetentionLineage | null = null;
  if (current.exists && signalDeskProviderSourceDataLifecycleAuthorityHash(current.data()) === params.expectedAuthorityHash) {
    try {
      lineage = parseProviderRetentionLineage(current);
    } catch {
      lineage = null;
    }
  }
  await isolateLifecycleFailure({
    authorityKind: "provider",
    authorityRef: params.providerRef,
    error: params.error,
    expectedAuthorityHash: params.expectedAuthorityHash,
    firestore: params.firestore,
    now: params.now,
    phase: params.phase,
    result: params.result,
  });
  if (!lineage) return;
  try {
    const failedSnapshot = await params.providerRef.get();
    if (!failedSnapshot.exists) return;
    const quarantined = await quarantineProviderAuthority({
      expectedAuthorityHash: signalDeskProviderSourceDataLifecycleAuthorityHash(failedSnapshot.data()),
      firestore: params.firestore,
      lineage,
      now: params.now,
      providerRef: params.providerRef,
    });
    if (quarantined.targetMaterialized) params.result.materializedTargetCount += 1;
  } catch (quarantineError) {
    params.result.failureDiagnosticErrorCount += 1;
    logger.error("[SignalDesk Source Data Lifecycle] Provider quarantine reconciliation failed", {
      authorityKind: "provider",
      failureCode: "SIGNALDESK_PROVIDER_RETENTION_QUARANTINE_FAILED",
      failurePhase: params.phase,
      ...sourceErrorContext(quarantineError),
    });
  }
};

const quarantineMalformedDueEnrichmentResult = async (params: {
  candidateRef: DocumentReference;
  error: unknown;
  firestore: Firestore;
  now: Timestamp;
}): Promise<boolean> => params.firestore.runTransaction(async transaction => {
  const controlRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM);
  const [snapshot, controlSnapshot] = await Promise.all([
    transaction.get(params.candidateRef),
    transaction.get(controlRef),
  ]);
  if (!snapshot.exists) return false;
  const data = asRecord(snapshot.data());
  if (data.pId !== SIGNALDESK_PRODUCT_CODE) return false;
  const expiresAtMillis = timestampMillis(data.expiresAt);
  if (expiresAtMillis === null || expiresAtMillis > params.now.toMillis()) return false;
  const failureCode = lifecycleFailureCode(params.error);
  const token = lifecycleToken("target", [
    "enrichment-record-malformed",
    snapshot.id,
    expiresAtMillis,
    timestampMillis(data.updatedAt),
    failureCode,
  ]);
  transaction.set(snapshot.ref, {
    ...deleteFieldsOutside(data, dependencyAllowedFields("enrichment")),
    confidence: "low",
    expiresAt: null,
    field: "retained-source-field",
    sourceDataExpiredAt: params.now,
    sourceDataLifecycleCompletedAt: params.now,
    sourceDataLifecycleInputFailureCode: failureCode,
    sourceDataLifecycleInputNormalizedAt: params.now,
    sourceDataLifecycleKind: TARGET_LIFECYCLE_KIND,
    sourceDataLifecycleReason: "malformed-enrichment-record-expired",
    sourceDataLifecycleState: "completed",
    sourceDataLifecycleToken: token,
    sourceDataPayloadStored: false,
    sourceDataRecordExpiresAt: Timestamp.fromMillis(expiresAtMillis),
    status: "blocked",
    targetName: "Retained target record",
    updatedAt: params.now,
    updatedBy: SYSTEM_ACTOR_ID,
    value: FieldValue.delete(),
    valuePreview: null,
  }, { merge: true });
  const auditRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
    .doc(lifecycleAuditId("enrichment-record-malformed-expired", token));
  transaction.create(auditRef, {
    action: "source_data_enrichment_record_malformed_scrubbed",
    actorId: SYSTEM_ACTOR_ID,
    actorRole: SYSTEM_ACTOR_ROLE,
    auditEventId: auditRef.id,
    createdAt: params.now,
    entityId: snapshot.id,
    entityType: "enrichmentResult",
    pId: SIGNALDESK_PRODUCT_CODE,
    reason: failureCode,
  });
  const incidentRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.INCIDENTS)
    .doc(`source_data_malformed_enrichment_${stableHash(token).slice(0, 40)}`);
  transaction.create(incidentRef, {
    authorityId: snapshot.id,
    authorityKind: "enrichment-result",
    createdAt: params.now,
    failureCode,
    failurePhase: "record-expiry",
    incidentId: incidentRef.id,
    incidentType: "source-data-malformed-authority",
    pId: SIGNALDESK_PRODUCT_CODE,
    severity: "high",
    status: "open",
    title: "Malformed expired enrichment data was scrubbed",
    updatedAt: params.now,
  });
  stageNewHighIncidentSummary({
    controlRef,
    controlSnapshot,
    count: 1,
    now: params.now,
    transaction,
  });
  return true;
});

const reconcileDueEnrichmentResults = async (params: {
  firestore: Firestore;
  limit: number;
  now: Timestamp;
}): Promise<{ overflow: boolean; scanned: number; scrubbed: number }> => {
  const bounded = boundedDocuments((await params.firestore
    .collection(SIGNALDESK_COLLECTIONS.ENRICHMENT_RESULTS)
    .where("pId", "==", SIGNALDESK_PRODUCT_CODE)
    .where("expiresAt", "<=", params.now)
    .orderBy("expiresAt", "asc")
    .orderBy(FieldPath.documentId(), "asc")
    .limit(params.limit + 1)
    .get()).docs, params.limit);
  let scrubbed = 0;
  for (const candidate of bounded.documents) {
    try {
      const changed = await params.firestore.runTransaction(async transaction => {
        const snapshot = await transaction.get(candidate.ref);
        if (!snapshot.exists) return false;
        const data = asRecord(snapshot.data());
        if (data.pId !== SIGNALDESK_PRODUCT_CODE) return false;
        const identity = requireId(data.enrichmentResultId, "SIGNALDESK_ENRICHMENT_RESULT_IDENTITY_INVALID");
        if (identity !== snapshot.id) throw new Error("SIGNALDESK_ENRICHMENT_RESULT_IDENTITY_MISMATCH");
        requireId(data.targetId, "SIGNALDESK_ENRICHMENT_RESULT_TARGET_INVALID");
        const expiresAtMillis = requireTimestamp(data.expiresAt, "SIGNALDESK_ENRICHMENT_RESULT_EXPIRY_INVALID");
        if (expiresAtMillis > params.now.toMillis()) return false;
        const token = lifecycleToken("target", ["enrichment-record-expiry", snapshot.id, expiresAtMillis]);
        const alreadyScrubbed = data.sourceDataLifecycleState === "completed"
          && data.sourceDataPayloadStored === false;
        transaction.set(snapshot.ref, {
          ...deleteFieldsOutside(data, dependencyAllowedFields("enrichment")),
          confidence: "low",
          expiresAt: null,
          sourceDataExpiredAt: params.now,
          sourceDataLifecycleCompletedAt: params.now,
          sourceDataLifecycleKind: TARGET_LIFECYCLE_KIND,
          sourceDataLifecycleReason: "enrichment-record-expired",
          sourceDataLifecycleState: "completed",
          sourceDataLifecycleToken: token,
          sourceDataPayloadStored: false,
          sourceDataRecordExpiresAt: Timestamp.fromMillis(expiresAtMillis),
          status: "blocked",
          targetName: "Retained target record",
          updatedAt: params.now,
          updatedBy: SYSTEM_ACTOR_ID,
          value: FieldValue.delete(),
          valuePreview: null,
        }, { merge: true });
        if (!alreadyScrubbed) {
          const auditRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
            .doc(lifecycleAuditId("enrichment-record-expired", token));
          transaction.create(auditRef, {
            action: "source_data_enrichment_record_expired",
            actorId: SYSTEM_ACTOR_ID,
            actorRole: SYSTEM_ACTOR_ROLE,
            auditEventId: auditRef.id,
            createdAt: params.now,
            entityId: snapshot.id,
            entityType: "enrichmentResult",
            pId: SIGNALDESK_PRODUCT_CODE,
            reason: "record-retention-expired",
          });
        }
        return !alreadyScrubbed;
      });
      if (changed) scrubbed += 1;
    } catch (error) {
      try {
        if (await quarantineMalformedDueEnrichmentResult({
          candidateRef: candidate.ref,
          error,
          firestore: params.firestore,
          now: params.now,
        })) scrubbed += 1;
      } catch (quarantineError) {
        logger.error("[SignalDesk Source Data Lifecycle] Malformed enrichment quarantine failed", {
          authorityKind: "enrichment-result",
          failureCode: "SIGNALDESK_ENRICHMENT_RESULT_QUARANTINE_FAILED",
          ...sourceErrorContext(quarantineError),
        });
      }
    }
  }
  return { overflow: bounded.overflow, scanned: bounded.documents.length, scrubbed };
};

const aiDetailIdentity = (snapshot: DocumentSnapshot): string => {
  const data = asRecord(snapshot.data());
  const identity = requireId(data.aiRunId ?? data.scoreId, "SIGNALDESK_AI_DETAIL_IDENTITY_INVALID");
  if (identity !== snapshot.id) throw new Error("SIGNALDESK_AI_DETAIL_IDENTITY_MISMATCH");
  if (!boundedString(data.workerType, 120)) throw new Error("SIGNALDESK_AI_DETAIL_WORKER_TYPE_INVALID");
  return identity;
};

const aiDetailScrubPatch = (params: {
  anchorMillis: number | null;
  failureCode?: string | null;
  now: Timestamp;
}): Record<string, unknown> => ({
  aiDetailExpiredAt: params.now,
  aiDetailExpiresAt: null,
  aiDetailLifecycleState: "completed",
  aiDetailLifecycleUpdatedAt: params.now,
  aiDetailRetentionAnchorAt: params.anchorMillis === null ? null : Timestamp.fromMillis(params.anchorMillis),
  criticReasons: [],
  initialOutput: null,
  instruction: null,
  output: null,
  reasons: ["Source-derived details expired; re-score after a verified source refresh."],
  reviewReason: null,
  sourceDataPayloadStored: false,
  targetIds: [],
  ...(params.failureCode ? {
    aiDetailLifecycleInputFailureCode: params.failureCode,
    aiDetailLifecycleInputNormalizedAt: params.now,
  } : {}),
});

const writeAiDetailExpiryAudit = (params: {
  failureCode?: string | null;
  firestore: Firestore;
  identity: string;
  now: Timestamp;
  transaction: Transaction;
}): void => {
  const auditRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
    .doc(lifecycleAuditId("ai-detail-expired", params.identity));
  params.transaction.create(auditRef, {
    action: params.failureCode ? "ai_detail_malformed_scrubbed" : "ai_detail_retention_expired",
    actorId: SYSTEM_ACTOR_ID,
    actorRole: SYSTEM_ACTOR_ROLE,
    auditEventId: auditRef.id,
    createdAt: params.now,
    entityId: params.identity,
    entityType: "aiWorkerRun",
    pId: SIGNALDESK_PRODUCT_CODE,
    reason: params.failureCode || "ai-detail-90-day-retention",
  });
};

const reconcileAiDetailBackfill = async (params: {
  firestore: Firestore;
  limit: number;
  now: Timestamp;
}): Promise<{ backfilled: number; completed: boolean; scrubbed: number }> => {
  const stateRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.SYSTEM).doc(AI_DETAIL_BACKFILL_STATE_ID);
  const initialStateSnapshot = await stateRef.get();
  const initialState = asRecord(initialStateSnapshot.data());
  if (initialStateSnapshot.exists && (
    initialState.pId !== SIGNALDESK_PRODUCT_CODE
    || initialState.backfillStateId !== AI_DETAIL_BACKFILL_STATE_ID
  )) throw new Error("SIGNALDESK_AI_DETAIL_BACKFILL_STATE_INVALID");
  if (initialState.completed === true) return { backfilled: 0, completed: true, scrubbed: 0 };
  const cursor = initialState.cursor == null
    ? null
    : requireId(initialState.cursor, "SIGNALDESK_AI_DETAIL_BACKFILL_CURSOR_INVALID");
  let query = params.firestore.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS)
    .orderBy(FieldPath.documentId())
    .limit(params.limit);
  if (cursor) query = query.startAfter(cursor);
  const page = await query.get();
  return params.firestore.runTransaction(async transaction => {
    const snapshots = await Promise.all([
      transaction.get(stateRef),
      ...page.docs.map(document => transaction.get(document.ref)),
    ]);
    const stateSnapshot = snapshots[0];
    const state = asRecord(stateSnapshot.data());
    if (stateSnapshot.exists && (
      state.pId !== SIGNALDESK_PRODUCT_CODE
      || state.backfillStateId !== AI_DETAIL_BACKFILL_STATE_ID
      || (state.cursor ?? null) !== cursor
      || state.completed === true
    )) return { backfilled: 0, completed: state.completed === true, scrubbed: 0 };
    let backfilled = 0;
    let scrubbed = 0;
    for (const snapshot of snapshots.slice(1)) {
      const data = asRecord(snapshot.data());
      if (data.pId !== SIGNALDESK_PRODUCT_CODE) continue;
      if (data.aiDetailLifecycleState === "active" || data.aiDetailLifecycleState === "completed") continue;
      if (data.workerType === "ai_volume_lock") {
        transaction.set(snapshot.ref, {
          aiDetailExpiresAt: null,
          aiDetailLifecycleState: "not-applicable",
          aiDetailLifecycleUpdatedAt: params.now,
        }, { merge: true });
        backfilled += 1;
        continue;
      }
      let identity = snapshot.id;
      let failureCode: string | null = null;
      try {
        identity = aiDetailIdentity(snapshot);
      } catch (error) {
        failureCode = lifecycleFailureCode(error);
      }
      const anchorMillis = timestampMillis(data.createdAt) ?? timestampMillis(data.updatedAt);
      if (anchorMillis === null) failureCode ||= "SIGNALDESK_AI_DETAIL_RETENTION_ANCHOR_INVALID";
      const expiresAtMillis = anchorMillis === null ? null : anchorMillis + AI_DETAIL_RETENTION_MS;
      const due = failureCode !== null || (expiresAtMillis !== null && expiresAtMillis <= params.now.toMillis());
      if (due) {
        transaction.set(snapshot.ref, aiDetailScrubPatch({ anchorMillis, failureCode, now: params.now }), { merge: true });
        writeAiDetailExpiryAudit({
          failureCode,
          firestore: params.firestore,
          identity,
          now: params.now,
          transaction,
        });
        scrubbed += 1;
      } else {
        transaction.set(snapshot.ref, {
          aiDetailExpiresAt: Timestamp.fromMillis(expiresAtMillis!),
          aiDetailLifecycleState: "active",
          aiDetailLifecycleUpdatedAt: params.now,
          aiDetailRetentionAnchorAt: Timestamp.fromMillis(anchorMillis!),
          sourceDataPayloadStored: true,
        }, { merge: true });
      }
      backfilled += 1;
    }
    const completed = page.size < params.limit;
    transaction.set(stateRef, {
      backfillStateId: AI_DETAIL_BACKFILL_STATE_ID,
      completed,
      completedAt: completed ? params.now : null,
      cursor: completed ? null : page.docs[page.docs.length - 1]?.id || null,
      pId: SIGNALDESK_PRODUCT_CODE,
      updatedAt: params.now,
    }, { merge: true });
    return { backfilled, completed, scrubbed };
  });
};

const reconcileDueAiDetails = async (params: {
  firestore: Firestore;
  limit: number;
  now: Timestamp;
}): Promise<{ overflow: boolean; scanned: number; scrubbed: number }> => {
  const bounded = boundedDocuments((await params.firestore.collection(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS)
    .where("pId", "==", SIGNALDESK_PRODUCT_CODE)
    .where("aiDetailLifecycleState", "==", "active")
    .where("aiDetailExpiresAt", "<=", params.now)
    .orderBy("aiDetailExpiresAt", "asc")
    .orderBy(FieldPath.documentId(), "asc")
    .limit(params.limit + 1)
    .get()).docs, params.limit);
  let scrubbed = 0;
  for (const candidate of bounded.documents) {
    const changed = await params.firestore.runTransaction(async transaction => {
      const snapshot = await transaction.get(candidate.ref);
      if (!snapshot.exists) return false;
      const data = asRecord(snapshot.data());
      if (data.pId !== SIGNALDESK_PRODUCT_CODE || data.aiDetailLifecycleState !== "active") return false;
      const expiresAtMillis = requireTimestamp(data.aiDetailExpiresAt, "SIGNALDESK_AI_DETAIL_EXPIRY_INVALID");
      if (expiresAtMillis > params.now.toMillis()) return false;
      const identity = aiDetailIdentity(snapshot);
      const anchorMillis = timestampMillis(data.aiDetailRetentionAnchorAt)
        ?? timestampMillis(data.createdAt)
        ?? timestampMillis(data.updatedAt);
      transaction.set(snapshot.ref, aiDetailScrubPatch({ anchorMillis, now: params.now }), { merge: true });
      writeAiDetailExpiryAudit({ firestore: params.firestore, identity, now: params.now, transaction });
      return true;
    });
    if (changed) scrubbed += 1;
  }
  return { overflow: bounded.overflow, scanned: bounded.documents.length, scrubbed };
};

export async function runSignalDeskSourceDataLifecycle(
  options: RunSignalDeskSourceDataLifecycleOptions = {},
): Promise<SignalDeskSourceDataLifecycleResult> {
  const firestore = options.firestore || defaultDb;
  const now = options.now || Timestamp.now();
  const authorityPageSize = boundedPageSize(options.authorityPageSize, DEFAULT_AUTHORITY_PAGE_SIZE);
  const dependencyPageSize = boundedPageSize(
    options.dependencyPageSize,
    DEFAULT_DEPENDENCY_PAGE_SIZE,
    MAX_DEPENDENCY_PAGE_SIZE,
  );
  const maxAuthorities = Number.isInteger(options.maxAuthorities) && (options.maxAuthorities as number) > 0
    ? Math.min(options.maxAuthorities as number, 100)
    : DEFAULT_MAX_AUTHORITIES;
  const maxTargets = Number.isInteger(options.maxTargets) && (options.maxTargets as number) > 0
    ? Math.min(options.maxTargets as number, 100)
    : DEFAULT_MAX_TARGETS;
  const maxReconciliationSteps = Number.isInteger(options.maxReconciliationSteps)
    && (options.maxReconciliationSteps as number) >= 0
    ? Math.min(options.maxReconciliationSteps as number, 2_000)
    : DEFAULT_MAX_RECONCILIATION_STEPS;
  const result = emptyResult();
  const stepBudget = { remaining: maxReconciliationSteps };
  const authorityLimit = Math.min(authorityPageSize, maxAuthorities);
  const targetLimit = Math.min(authorityPageSize, maxTargets);
  const policyCollection = firestore.collection(SIGNALDESK_COLLECTIONS.SOURCE_POLICIES);
  const providerCollection = firestore.collection(SIGNALDESK_COLLECTIONS.PROVIDER_SOURCE_RETENTION);
  const targetCollection = firestore.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES);

  const targetLifecycleBackfill = await reconcileTargetLifecycleBackfill({
    firestore,
    limit: targetLimit,
    now,
  });
  result.backfilledTargetLifecycleCount = targetLifecycleBackfill.backfilled;
  result.materializedTargetCount += targetLifecycleBackfill.quarantined;
  result.quarantinedLegacyTargetCount = targetLifecycleBackfill.quarantined;
  result.scannedTargetLifecycleBackfillCount = targetLifecycleBackfill.scanned;
  result.targetLifecycleBackfillCompleted = targetLifecycleBackfill.completed;

  const aiDetailBackfill = await reconcileAiDetailBackfill({
    firestore,
    limit: authorityLimit,
    now,
  });
  result.aiDetailBackfillCompleted = aiDetailBackfill.completed;
  result.backfilledAiDetailCount = aiDetailBackfill.backfilled;
  result.scrubbedExpiredAiDetailCount = aiDetailBackfill.scrubbed;

  const dueAiDetails = await reconcileDueAiDetails({
    firestore,
    limit: authorityLimit,
    now,
  });
  result.dueAiDetailOverflow = dueAiDetails.overflow;
  result.scannedDueAiDetailCount = dueAiDetails.scanned;
  result.scrubbedExpiredAiDetailCount += dueAiDetails.scrubbed;

  const dueEnrichment = await reconcileDueEnrichmentResults({
    firestore,
    limit: authorityLimit,
    now,
  });
  result.dueEnrichmentOverflow = dueEnrichment.overflow;
  result.scannedDueEnrichmentCount = dueEnrichment.scanned;
  result.scrubbedExpiredEnrichmentCount = dueEnrichment.scrubbed;

  const dueTargets = boundedDocuments((await targetCollection
    .where("pId", "==", SIGNALDESK_PRODUCT_CODE)
    .where("sourceDataLifecycleState", "==", "active")
    .where("sourceDataExpiresAt", "<=", now)
    .orderBy("sourceDataExpiresAt", "asc")
    .orderBy(FieldPath.documentId(), "asc")
    .limit(targetLimit + 1)
    .get()).docs, targetLimit);
  result.dueTargetOverflow = dueTargets.overflow;
  result.scannedDueTargetCount = dueTargets.documents.length;
  for (const targetSnapshot of dueTargets.documents) {
    const expectedAuthorityHash = signalDeskSourceDataLifecycleAuthorityHash(targetSnapshot.data());
    try {
      if (await materializeExpiredTarget({
        firestore,
        now,
        targetRef: targetSnapshot.ref,
      })) result.materializedTargetCount += 1;
    } catch (error) {
      await isolateLifecycleFailure({
        authorityKind: "target",
        authorityRef: targetSnapshot.ref,
        error,
        expectedAuthorityHash,
        firestore,
        now,
        phase: "due",
        result,
      });
    }
  }

  const retryPolicies = boundedDocuments((await policyCollection
    .where("pId", "==", SIGNALDESK_PRODUCT_CODE)
    .where("sourceDataPolicyLifecycleState", "==", "failed")
    .where("sourceDataPolicyLifecycleRetryAt", "<=", now)
    .orderBy("sourceDataPolicyLifecycleRetryAt", "asc")
    .orderBy(FieldPath.documentId(), "asc")
    .limit(authorityLimit + 1)
    .get()).docs, authorityLimit);
  result.retryPolicyOverflow = retryPolicies.overflow;
  result.scannedRetryPolicyCount = retryPolicies.documents.length;
  for (const policy of retryPolicies.documents) {
    const expectedAuthorityHash = signalDeskSourcePolicyLifecycleAuthorityHash(policy.data());
    try {
      if (await rearmFailedAuthority({
        authorityKind: "policy",
        authorityRef: policy.ref,
        firestore,
        now,
      })) result.retriedPolicyCount += 1;
    } catch (error) {
      await isolateLifecycleFailure({
        authorityKind: "policy",
        authorityRef: policy.ref,
        error,
        expectedAuthorityHash,
        firestore,
        now,
        phase: "retry",
        result,
      });
    }
  }

  const pendingPolicies = boundedDocuments((await policyCollection
    .where("pId", "==", SIGNALDESK_PRODUCT_CODE)
    .where("sourceDataPolicyLifecycleState", "==", "pending")
    .orderBy(FieldPath.documentId())
    .limit(authorityLimit + 1)
    .get()).docs, authorityLimit);
  result.pendingPolicyOverflow = pendingPolicies.overflow;
  result.scannedPendingPolicyCount = pendingPolicies.documents.length;
  for (const policySnapshot of pendingPolicies.documents) {
    const expectedAuthorityHash = signalDeskSourcePolicyLifecycleAuthorityHash(policySnapshot.data());
    try {
      const policy = readPendingPolicy(policySnapshot);
      const page = await processPolicyTargetPage({
        firestore,
        now,
        pageSize: Math.min(dependencyPageSize, maxTargets),
        policyRef: policySnapshot.ref,
        progress: policy.progress!,
        reason: pendingPolicyReason(policy),
        token: policy.token!,
      });
      result.materializedTargetCount += page.newlyHeld;
      if (page.completed) result.completedPolicyCount += 1;
      else result.pendingPolicyCount += 1;
    } catch (error) {
      await isolateLifecycleFailure({
        authorityKind: "policy",
        authorityRef: policySnapshot.ref,
        error,
        expectedAuthorityHash,
        firestore,
        now,
        phase: "pending",
        result,
      });
    }
  }

  const blockedPolicies = boundedDocuments((await policyCollection
    .where("pId", "==", SIGNALDESK_PRODUCT_CODE)
    .where("status", "==", "blocked")
    .orderBy(FieldPath.documentId())
    .limit(authorityLimit + 1)
    .get()).docs, authorityLimit);
  result.blockedPolicyOverflow = blockedPolicies.overflow;
  result.scannedBlockedPolicyCount = blockedPolicies.documents.length;
  for (const policySnapshot of blockedPolicies.documents) {
    let expectedAuthorityHash = signalDeskSourcePolicyLifecycleAuthorityHash(policySnapshot.data());
    try {
      const materialized = await materializePolicy({
        firestore,
        now,
        policyRef: policySnapshot.ref,
        reason: "policy-blocked",
      });
      if (!materialized.token) continue;
      if (materialized.newlyMaterialized) result.materializedPolicyCount += 1;
      const currentSnapshot = await policySnapshot.ref.get();
      expectedAuthorityHash = signalDeskSourcePolicyLifecycleAuthorityHash(currentSnapshot.data());
      const current = readPendingPolicy(currentSnapshot, materialized.token);
      const page = await processPolicyTargetPage({
        firestore,
        now,
        pageSize: Math.min(dependencyPageSize, maxTargets),
        policyRef: policySnapshot.ref,
        progress: current.progress!,
        reason: "policy-blocked",
        token: materialized.token,
      });
      result.materializedTargetCount += page.newlyHeld;
      if (page.completed) result.completedPolicyCount += 1;
      else result.pendingPolicyCount += 1;
    } catch (error) {
      await isolateLifecycleFailure({
        authorityKind: "policy",
        authorityRef: policySnapshot.ref,
        error,
        expectedAuthorityHash,
        firestore,
        now,
        phase: "blocked",
        result,
      });
    }
  }

  const duePolicies = boundedDocuments((await policyCollection
    .where("pId", "==", SIGNALDESK_PRODUCT_CODE)
    .where("status", "in", ["active", "approved", "review_required"])
    .where("expiresAt", "<=", now)
    .orderBy("expiresAt", "asc")
    .orderBy(FieldPath.documentId(), "asc")
    .limit(authorityLimit + 1)
    .get()).docs, authorityLimit);
  result.duePolicyOverflow = duePolicies.overflow;
  result.scannedDuePolicyCount = duePolicies.documents.length;
  for (const policySnapshot of duePolicies.documents) {
    let expectedAuthorityHash = signalDeskSourcePolicyLifecycleAuthorityHash(policySnapshot.data());
    try {
      const materialized = await materializePolicy({
        firestore,
        now,
        policyRef: policySnapshot.ref,
        reason: "policy-expired",
      });
      if (!materialized.token) continue;
      if (materialized.newlyMaterialized) result.materializedPolicyCount += 1;
      const currentSnapshot = await policySnapshot.ref.get();
      expectedAuthorityHash = signalDeskSourcePolicyLifecycleAuthorityHash(currentSnapshot.data());
      const current = readPendingPolicy(currentSnapshot, materialized.token);
      const page = await processPolicyTargetPage({
        firestore,
        now,
        pageSize: Math.min(dependencyPageSize, maxTargets),
        policyRef: policySnapshot.ref,
        progress: current.progress!,
        reason: "policy-expired",
        token: materialized.token,
      });
      result.materializedTargetCount += page.newlyHeld;
      if (page.completed) result.completedPolicyCount += 1;
      else result.pendingPolicyCount += 1;
    } catch (error) {
      await isolateLifecycleFailure({
        authorityKind: "policy",
        authorityRef: policySnapshot.ref,
        error,
        expectedAuthorityHash,
        firestore,
        now,
        phase: "due",
        result,
      });
    }
  }

  const retryProviders = boundedDocuments((await providerCollection
    .where("pId", "==", SIGNALDESK_PRODUCT_CODE)
    .where("sourceDataLifecycleState", "==", "failed")
    .where("sourceDataLifecycleRetryAt", "<=", now)
    .orderBy("sourceDataLifecycleRetryAt", "asc")
    .orderBy(FieldPath.documentId(), "asc")
    .limit(authorityLimit + 1)
    .get()).docs, authorityLimit);
  result.retryProviderOverflow = retryProviders.overflow;
  result.scannedRetryProviderCount = retryProviders.documents.length;
  for (const provider of retryProviders.documents) {
    const expectedAuthorityHash = signalDeskProviderSourceDataLifecycleAuthorityHash(provider.data());
    try {
      if (await rearmFailedAuthority({
        authorityKind: "provider",
        authorityRef: provider.ref,
        firestore,
        now,
      })) result.retriedProviderCount += 1;
    } catch (error) {
      await isolateLifecycleFailure({
        authorityKind: "provider",
        authorityRef: provider.ref,
        error,
        expectedAuthorityHash,
        firestore,
        now,
        phase: "retry",
        result,
      });
    }
  }

  const scrubReadyProviders = boundedDocuments((await providerCollection
    .where("pId", "==", SIGNALDESK_PRODUCT_CODE)
    .where("sourceDataLifecycleState", "==", "scrub_ready")
    .where("status", "in", ["blocked", "expired"])
    .orderBy("updatedAt", "asc")
    .orderBy(FieldPath.documentId(), "asc")
    .limit(authorityLimit + 1)
    .get()).docs, authorityLimit);
  result.negativeProviderOverflow = scrubReadyProviders.overflow;
  result.scannedNegativeProviderCount = scrubReadyProviders.documents.length;
  for (const providerSnapshot of scrubReadyProviders.documents) {
    const providerData = asRecord(providerSnapshot.data());
    const expectedAuthorityHash = signalDeskProviderSourceDataLifecycleAuthorityHash(providerData);
    try {
      const materialized = await materializeProviderRetention({
        firestore,
        mode: "scrub_ready",
        now,
        retentionRef: providerSnapshot.ref,
      });
      if (materialized.newlyMaterialized) result.materializedProviderRetentionCount += 1;
      if (materialized.targetMaterialized) result.materializedTargetCount += 1;
    } catch (error) {
      await handleProviderLifecycleFailure({
        error,
        expectedAuthorityHash,
        firestore,
        now,
        phase: "scrub_ready",
        providerRef: providerSnapshot.ref,
        result,
      });
    }
  }

  const dueProviders = boundedDocuments((await providerCollection
    .where("pId", "==", SIGNALDESK_PRODUCT_CODE)
    .where("status", "in", ["active", "refresh-due", "refreshed"])
    .where("retentionExpiresAt", "<=", now)
    .orderBy("retentionExpiresAt", "asc")
    .orderBy(FieldPath.documentId(), "asc")
    .limit(authorityLimit + 1)
    .get()).docs, authorityLimit);
  result.dueProviderOverflow = dueProviders.overflow;
  result.scannedDueProviderCount = dueProviders.documents.length;
  for (const providerSnapshot of dueProviders.documents) {
    const providerData = asRecord(providerSnapshot.data());
    const expectedAuthorityHash = signalDeskProviderSourceDataLifecycleAuthorityHash(providerData);
    try {
      const materialized = await materializeProviderRetention({
        firestore,
        mode: "due",
        now,
        retentionRef: providerSnapshot.ref,
      });
      if (materialized.newlyMaterialized) result.materializedProviderRetentionCount += 1;
      if (materialized.targetMaterialized) result.materializedTargetCount += 1;
    } catch (error) {
      await handleProviderLifecycleFailure({
        error,
        expectedAuthorityHash,
        firestore,
        now,
        phase: "due",
        providerRef: providerSnapshot.ref,
        result,
      });
    }
  }

  const retryTargets = boundedDocuments((await targetCollection
    .where("pId", "==", SIGNALDESK_PRODUCT_CODE)
    .where("sourceDataLifecycleState", "==", "failed")
    .where("sourceDataLifecycleRetryAt", "<=", now)
    .orderBy("sourceDataLifecycleRetryAt", "asc")
    .orderBy(FieldPath.documentId(), "asc")
    .limit(targetLimit + 1)
    .get()).docs, targetLimit);
  result.retryTargetOverflow = retryTargets.overflow;
  result.scannedRetryTargetCount = retryTargets.documents.length;
  for (const target of retryTargets.documents) {
    const expectedAuthorityHash = signalDeskSourceDataLifecycleAuthorityHash(target.data());
    try {
      if (await rearmFailedAuthority({
        authorityKind: "target",
        authorityRef: target.ref,
        firestore,
        now,
      })) result.retriedTargetCount += 1;
    } catch (error) {
      await isolateLifecycleFailure({
        authorityKind: "target",
        authorityRef: target.ref,
        error,
        expectedAuthorityHash,
        firestore,
        now,
        phase: "retry",
        result,
      });
    }
  }

  const pendingTargets = boundedDocuments((await targetCollection
    .where("pId", "==", SIGNALDESK_PRODUCT_CODE)
    .where("sourceDataLifecycleState", "==", "pending")
    .orderBy(FieldPath.documentId())
    .limit(targetLimit + 1)
    .get()).docs, targetLimit);
  result.pendingTargetOverflow = pendingTargets.overflow;
  result.scannedPendingTargetCount = pendingTargets.documents.length;
  for (const targetSnapshot of pendingTargets.documents) {
    let expectedAuthorityHash = signalDeskSourceDataLifecycleAuthorityHash(targetSnapshot.data());
    let processingToken: string | null = null;
    try {
      const target = readPendingTarget(targetSnapshot);
      processingToken = target.token;
      if (stepBudget.remaining <= 0) {
        result.pendingTargetCount += 1;
        continue;
      }
      const reconciliation = await reconcilePendingTarget({
        firestore,
        now,
        pageSize: dependencyPageSize,
        stepBudget,
        targetRef: targetSnapshot.ref,
        token: target.token!,
      });
      if (reconciliation.completed && reconciliation.newlyCompleted && reconciliation.result) {
        result.completedTargetCount += 1;
        addReconciliationResult(result, reconciliation.result);
      } else if (!reconciliation.completed) {
        result.pendingTargetCount += 1;
      }
    } catch (error) {
      const currentSnapshot = await targetSnapshot.ref.get();
      const currentData = asRecord(currentSnapshot.data());
      if (
        currentSnapshot.exists
        && processingToken
        && currentData.sourceDataLifecycleToken === processingToken
        && currentData.sourceDataLifecycleState === "pending"
      ) expectedAuthorityHash = signalDeskSourceDataLifecycleAuthorityHash(currentData);
      await isolateLifecycleFailure({
        authorityKind: "target",
        authorityRef: targetSnapshot.ref,
        error,
        expectedAuthorityHash,
        firestore,
        now,
        phase: "pending",
        result,
      });
    }
  }
  result.stepLimitReached = stepBudget.remaining <= 0 && result.pendingTargetCount > 0;
  return result;
}
