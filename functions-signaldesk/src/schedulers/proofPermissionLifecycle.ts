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
import {
  getBoundedFunctionsErrorCode,
  getBoundedFunctionsErrorMessage,
  getBoundedFunctionsErrorName,
} from "../utils/boundedErrorContext";

const SIGNALDESK_PRODUCT_CODE = "SD";
const SYSTEM_ACTOR_ID = "signaldesk-proof-permission-lifecycle";
const SYSTEM_ACTOR_ROLE = "system";
const LIFECYCLE_KIND = "proof-permission-expiry-v1";
const DEFAULT_PERMISSION_PAGE_SIZE = 25;
const DEFAULT_DEPENDENCY_PAGE_SIZE = 50;
const DEFAULT_MAX_PERMISSIONS = 25;
const DEFAULT_MAX_RECONCILIATION_STEPS = 120;
const MAX_PAGE_SIZE = 100;
const MAX_DEPENDENCY_PAGE_SIZE = 50;
const MAX_ID_LENGTH = 180;
const MAX_PUBLICATION_URL_LENGTH = 500;
const FAILURE_RETRY_BASE_MS = 5 * 60 * 1000;
const FAILURE_RETRY_MAX_MS = 24 * 60 * 60 * 1000;
const CONTENT_CHANNELS = new Set([
  "linkedin",
  "x",
  "email",
  "newsletter",
  "partner-brief",
  "blog",
  "short-video",
  "other",
]);

type ReconciliationPhase = "assets" | "drafts" | "calendars" | "complete";

interface ReconciliationProgress {
  phase: ReconciliationPhase;
  assetCursor: string | null;
  currentAssetId: string | null;
  dependencyCursor: string | null;
  heldAssetCount: number;
  heldDraftCount: number;
  heldCalendarCount: number;
  publicationReviewAssetCount: number;
  publishedIncidentCount: number;
  scannedAssetCount: number;
  scannedDraftCount: number;
  scannedCalendarCount: number;
}

interface PublicationEvidence {
  contentDraftId: string | null;
  publicationUrl: string | null;
  publishedAt: string | null;
  channel: string | null;
  source: "asset-marker" | "published-draft" | "published-calendar";
}

interface ReconciliationStepResult {
  stale: boolean;
  completedResult?: SignalDeskProofPermissionLifecycleReconciliationResult;
}

export interface SignalDeskProofPermissionLifecycleReconciliationResult {
  heldAssetCount: number;
  heldDraftCount: number;
  heldCalendarCount: number;
  publicationReviewAssetCount: number;
  publishedIncidentCount: number;
  scannedAssetCount: number;
  scannedDraftCount: number;
  scannedCalendarCount: number;
}

export interface SignalDeskProofPermissionLifecycleResult
  extends SignalDeskProofPermissionLifecycleReconciliationResult {
  completedPermissionCount: number;
  conflictedPermissionCount: number;
  failedPermissionCount: number;
  failureDiagnosticErrorCount: number;
  materializedPermissionCount: number;
  pendingPermissionCount: number;
  retriedPermissionCount: number;
  scannedDuePermissionCount: number;
  scannedPendingPermissionCount: number;
  stepLimitReached: boolean;
}

export interface RunSignalDeskProofPermissionLifecycleOptions {
  firestore?: Firestore;
  now?: Timestamp;
  permissionPageSize?: number;
  dependencyPageSize?: number;
  maxPermissions?: number;
  maxReconciliationSteps?: number;
}

const emptyResult = (): SignalDeskProofPermissionLifecycleResult => ({
  completedPermissionCount: 0,
  conflictedPermissionCount: 0,
  failedPermissionCount: 0,
  failureDiagnosticErrorCount: 0,
  heldAssetCount: 0,
  heldCalendarCount: 0,
  heldDraftCount: 0,
  materializedPermissionCount: 0,
  pendingPermissionCount: 0,
  retriedPermissionCount: 0,
  publicationReviewAssetCount: 0,
  publishedIncidentCount: 0,
  scannedAssetCount: 0,
  scannedCalendarCount: 0,
  scannedDraftCount: 0,
  scannedDuePermissionCount: 0,
  scannedPendingPermissionCount: 0,
  stepLimitReached: false,
});

const emptyProgress = (): ReconciliationProgress => ({
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
});

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
);

const boundedCount = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
};

const lifecycleCount = (value: unknown): number => {
  if (value === undefined || value === null) return 0;
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_RECONCILIATION_COUNT_INVALID");
  }
  return value as number;
};

const summaryCount = (value: unknown, errorCode: string): number => {
  if (value === undefined || value === null) return 0;
  if (!Number.isInteger(value) || (value as number) < 0) throw new Error(errorCode);
  return value as number;
};

const boundedPageSize = (
  value: number | undefined,
  fallback: number,
  maximum = MAX_PAGE_SIZE,
): number => {
  if (!Number.isInteger(value) || (value as number) < 1) return fallback;
  return Math.min(value as number, maximum);
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
  const normalized = normalizeId(value);
  if (!normalized) throw new Error(errorCode);
  return normalized;
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

const timestampIso = (value: unknown): string | null => {
  const millis = timestampMillis(value);
  if (millis === null) return null;
  const date = new Date(millis);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const boundedString = (value: unknown, maximum: number): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) return null;
  return normalized;
};

const boundedPublicationUrl = (value: unknown): string | null => {
  const candidate = boundedString(value, MAX_PUBLICATION_URL_LENGTH);
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      || !parsed.hostname
      || parsed.username
      || parsed.password
    ) return null;
    parsed.hash = "";
    const canonical = parsed.href;
    return canonical.length <= MAX_PUBLICATION_URL_LENGTH ? canonical : null;
  } catch {
    return null;
  }
};

const stableHash = (value: string): string => createHash("sha256").update(value).digest("hex");

export const signalDeskProofPermissionLifecycleAuthorityHash = (
  value: unknown,
): string => {
  const data = asRecord(value);
  const scopes = Array.isArray(data.scopes)
    ? data.scopes.map(scope => typeof scope === "string" ? scope : `invalid:${typeof scope}`)
    : [`invalid:${typeof data.scopes}`];
  const timestampAuthority = (field: unknown): number | string | null => {
    if (field === null || field === undefined) return null;
    const millis = timestampMillis(field);
    return millis === null ? `invalid:${typeof field}` : millis;
  };
  return stableHash(JSON.stringify({
    dependentHoldReconciliationKind: data.dependentHoldReconciliationKind ?? null,
    dependentHoldReconciliationPending: data.dependentHoldReconciliationPending ?? null,
    dependentHoldReconciliationToken: data.dependentHoldReconciliationToken ?? null,
    evidenceRef: data.evidenceRef ?? null,
    expiresAt: timestampAuthority(data.expiresAt),
    grantedAt: timestampAuthority(data.grantedAt),
    pId: data.pId ?? null,
    proofExpiryLifecycleState: data.proofExpiryLifecycleState ?? null,
    proofExpiryLifecycleToken: data.proofExpiryLifecycleToken ?? null,
    proofPermissionId: data.proofPermissionId ?? null,
    revokedAt: timestampAuthority(data.revokedAt),
    scopes,
    status: data.status ?? null,
    targetId: data.targetId ?? null,
  }));
};

export const signalDeskProofPublicationIncidentId = (
  proofPermissionId: string,
  contentAssetId: string,
): string => `proof_removal_${stableHash(`${proofPermissionId}|${contentAssetId}`).slice(0, 40)}`;

const proofPermissionLifecycleToken = (
  proofPermissionId: string,
  expiresAtMillis: number,
): string => `proof_expiry_${stableHash(`${proofPermissionId}|${expiresAtMillis}`).slice(0, 40)}`;

const lifecycleAuditId = (event: string, identity: string): string => (
  `proof_lifecycle_${stableHash(`${event}|${identity}`).slice(0, 40)}`
);

const readProgress = (value: unknown): ReconciliationProgress => {
  const source = asRecord(value);
  const phase = source.phase;
  if (phase !== "assets" && phase !== "drafts" && phase !== "calendars" && phase !== "complete") {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_RECONCILIATION_PROGRESS_INVALID");
  }
  const assetCursor = source.assetCursor === null || source.assetCursor === undefined
    ? null
    : normalizeId(source.assetCursor);
  const currentAssetId = source.currentAssetId === null || source.currentAssetId === undefined
    ? null
    : normalizeId(source.currentAssetId);
  const dependencyCursor = source.dependencyCursor === null || source.dependencyCursor === undefined
    ? null
    : normalizeId(source.dependencyCursor);
  if (
    (source.assetCursor != null && !assetCursor)
    || (source.currentAssetId != null && !currentAssetId)
    || (source.dependencyCursor != null && !dependencyCursor)
    || (phase === "assets" && (currentAssetId || dependencyCursor))
    || ((phase === "drafts" || phase === "calendars") && Boolean(currentAssetId) !== Boolean(dependencyCursor))
    || (phase === "complete" && (assetCursor || currentAssetId || dependencyCursor))
  ) throw new Error("SIGNALDESK_PROOF_PERMISSION_RECONCILIATION_PROGRESS_INVALID");

  return {
    phase,
    assetCursor,
    currentAssetId,
    dependencyCursor,
    heldAssetCount: lifecycleCount(source.heldAssetCount),
    heldDraftCount: lifecycleCount(source.heldDraftCount),
    heldCalendarCount: lifecycleCount(source.heldCalendarCount),
    publicationReviewAssetCount: lifecycleCount(source.publicationReviewAssetCount),
    publishedIncidentCount: lifecycleCount(source.publishedIncidentCount),
    scannedAssetCount: lifecycleCount(source.scannedAssetCount),
    scannedDraftCount: lifecycleCount(source.scannedDraftCount),
    scannedCalendarCount: lifecycleCount(source.scannedCalendarCount),
  };
};

const progressResult = (
  progress: ReconciliationProgress,
): SignalDeskProofPermissionLifecycleReconciliationResult => ({
  heldAssetCount: progress.heldAssetCount,
  heldDraftCount: progress.heldDraftCount,
  heldCalendarCount: progress.heldCalendarCount,
  publicationReviewAssetCount: progress.publicationReviewAssetCount,
  publishedIncidentCount: progress.publishedIncidentCount,
  scannedAssetCount: progress.scannedAssetCount,
  scannedDraftCount: progress.scannedDraftCount,
  scannedCalendarCount: progress.scannedCalendarCount,
});

const sameProgressPosition = (
  left: ReconciliationProgress,
  right: ReconciliationProgress,
): boolean => (
  left.phase === right.phase
  && left.assetCursor === right.assetCursor
  && left.currentAssetId === right.currentAssetId
  && left.dependencyCursor === right.dependencyCursor
);

const readPendingPermission = (
  snapshot: DocumentSnapshot,
  expectedToken?: string,
): { data: Record<string, unknown>; progress: ReconciliationProgress; token: string } => {
  if (!snapshot.exists) throw new Error("SIGNALDESK_PROOF_PERMISSION_MISSING");
  const data = asRecord(snapshot.data());
  if (data.pId !== SIGNALDESK_PRODUCT_CODE) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_PRODUCT_MISMATCH");
  }
  if (data.proofPermissionId !== snapshot.id) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_IDENTITY_MISMATCH");
  }
  if (data.status !== "expired") {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_RECONCILIATION_STATUS_INVALID");
  }
  if (data.proofExpiryLifecycleState !== "pending" || data.dependentHoldReconciliationPending !== true) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_RECONCILIATION_STATE_INVALID");
  }
  if (data.dependentHoldReconciliationKind !== LIFECYCLE_KIND) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_RECONCILIATION_KIND_INVALID");
  }
  const token = requireId(
    data.dependentHoldReconciliationToken,
    "SIGNALDESK_PROOF_PERMISSION_RECONCILIATION_TOKEN_INVALID",
  );
  if (expectedToken && token !== expectedToken) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_RECONCILIATION_SUPERSEDED");
  }
  return {
    data,
    progress: readProgress(data.dependentHoldReconciliationProgress),
    token,
  };
};

const assertOptionalProduct = (data: Record<string, unknown>, errorCode: string): void => {
  if (data.pId !== undefined && data.pId !== null && data.pId !== SIGNALDESK_PRODUCT_CODE) {
    throw new Error(errorCode);
  }
};

const assertControlRoomSummary = (snapshot: DocumentSnapshot): Record<string, unknown> => {
  const data = asRecord(snapshot.data());
  assertOptionalProduct(data, "SIGNALDESK_CONTROL_ROOM_PRODUCT_MISMATCH");
  for (const field of ["incidentCount", "openIncidentCount"] as const) {
    if (data[field] !== undefined && data[field] !== null && (
      !Number.isInteger(data[field])
      || (data[field] as number) < 0
    )) throw new Error("SIGNALDESK_CONTROL_ROOM_SHAPE_INVALID");
  }
  return data;
};

const assertContentAsset = (
  snapshot: DocumentSnapshot,
  proofPermissionId: string,
): Record<string, unknown> => {
  if (!snapshot.exists) throw new Error("SIGNALDESK_PROOF_PERMISSION_CONTENT_ASSET_MISSING");
  const data = asRecord(snapshot.data());
  if (data.pId !== SIGNALDESK_PRODUCT_CODE) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_CONTENT_ASSET_PRODUCT_MISMATCH");
  }
  if (data.contentAssetId !== undefined && data.contentAssetId !== snapshot.id) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_CONTENT_ASSET_IDENTITY_MISMATCH");
  }
  if (data.proofPermissionId !== proofPermissionId) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_CONTENT_ASSET_AUTHORITY_MISMATCH");
  }
  if (
    (data.hasPublishedContent != null && typeof data.hasPublishedContent !== "boolean")
    || (data.lastPublishedContentDraftId != null && normalizeId(data.lastPublishedContentDraftId) === null)
    || (data.lastPublishedChannel != null && boundedString(data.lastPublishedChannel, 80) === null)
    || (data.lastPublicationUrl != null && boundedPublicationUrl(data.lastPublicationUrl) === null)
    || (data.lastPublishedAt != null && timestampMillis(data.lastPublishedAt) === null)
  ) throw new Error("SIGNALDESK_PROOF_PERMISSION_CONTENT_ASSET_PUBLICATION_MARKER_INVALID");
  return data;
};

const assetHasPublishedTruth = (data: Record<string, unknown>): boolean => (
  data.hasPublishedContent === true
  || data.status === "distributed"
  || normalizeId(data.lastPublishedContentDraftId) !== null
  || boundedPublicationUrl(data.lastPublicationUrl) !== null
  || timestampMillis(data.lastPublishedAt) !== null
);

const publicationEvidenceFromAsset = (data: Record<string, unknown>): PublicationEvidence => ({
  channel: boundedString(data.lastPublishedChannel, 80),
  contentDraftId: normalizeId(data.lastPublishedContentDraftId),
  publicationUrl: boundedPublicationUrl(data.lastPublicationUrl),
  publishedAt: timestampIso(data.lastPublishedAt),
  source: "asset-marker",
});

const publicationEvidenceFromDraft = (
  draftId: string,
  data: Record<string, unknown>,
): PublicationEvidence => ({
  channel: boundedString(data.channel, 80),
  contentDraftId: normalizeId(data.contentDraftId) || draftId,
  publicationUrl: boundedPublicationUrl(data.publicationUrl),
  publishedAt: timestampIso(data.publishedAt) || timestampIso(data.updatedAt),
  source: "published-draft",
});

const publicationEvidenceFromCalendar = (
  data: Record<string, unknown>,
): PublicationEvidence => ({
  channel: boundedString(data.channel, 80),
  contentDraftId: normalizeId(data.contentDraftId),
  publicationUrl: boundedPublicationUrl(data.publicationUrl),
  publishedAt: timestampIso(data.publishedAt),
  source: "published-calendar",
});

const assertDraftDependency = (
  snapshot: DocumentSnapshot,
  assetId: string,
): Record<string, unknown> => {
  if (!snapshot.exists) throw new Error("SIGNALDESK_PROOF_PERMISSION_DEPENDENCY_MISSING");
  const draft = asRecord(snapshot.data());
  if (draft.pId !== SIGNALDESK_PRODUCT_CODE) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_DEPENDENCY_PRODUCT_MISMATCH");
  }
  if (draft.contentAssetId !== assetId) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_DEPENDENCY_ASSET_MISMATCH");
  }
  const storedId = normalizeId(draft.contentDraftId);
  if (draft.contentDraftId != null && storedId !== snapshot.id) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_DRAFT_IDENTITY_MISMATCH");
  }
  const channel = boundedString(draft.channel, 80);
  if (!channel || !CONTENT_CHANNELS.has(channel)) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_DRAFT_CHANNEL_INVALID");
  }
  const approvalStatus = boundedString(draft.approvalStatus, 40);
  const status = boundedString(draft.status, 40);
  const lifecyclePairValid = (
    (approvalStatus === "pending" && status === "draft")
    || (approvalStatus === "approved" && ["approved", "queued", "hold", "published"].includes(status || ""))
    || (approvalStatus === "rejected" && status === "rejected")
    || (approvalStatus === "hold" && status === "hold")
  );
  if (!lifecyclePairValid) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_DRAFT_LIFECYCLE_INVALID");
  }
  const scheduledFor = timestampMillis(draft.scheduledFor);
  if (["queued", "published"].includes(status || "") && scheduledFor === null) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_DRAFT_SCHEDULE_INVALID");
  }
  const hasPublicationUrl = draft.publicationUrl != null;
  const hasPublishedAt = draft.publishedAt != null;
  if (
    hasPublicationUrl !== hasPublishedAt
    || (hasPublicationUrl && boundedPublicationUrl(draft.publicationUrl) === null)
    || (hasPublishedAt && timestampMillis(draft.publishedAt) === null)
    || ((hasPublicationUrl || hasPublishedAt) && status !== "published")
  ) throw new Error("SIGNALDESK_PROOF_PERMISSION_DRAFT_PUBLICATION_INVALID");
  return draft;
};

const assertCalendarDependency = (
  snapshot: DocumentSnapshot,
  assetId: string,
): Record<string, unknown> => {
  if (!snapshot.exists) throw new Error("SIGNALDESK_PROOF_PERMISSION_DEPENDENCY_MISSING");
  const calendar = asRecord(snapshot.data());
  if (calendar.pId !== SIGNALDESK_PRODUCT_CODE) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_DEPENDENCY_PRODUCT_MISMATCH");
  }
  if (calendar.contentAssetId !== assetId) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_DEPENDENCY_ASSET_MISMATCH");
  }
  const storedId = normalizeId(calendar.contentCalendarItemId);
  if (calendar.contentCalendarItemId != null && storedId !== snapshot.id) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_CALENDAR_IDENTITY_MISMATCH");
  }
  const draftId = normalizeId(calendar.contentDraftId);
  if (!draftId || snapshot.id !== `content_calendar_${draftId}`) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_CALENDAR_LINK_INVALID");
  }
  const channel = boundedString(calendar.channel, 80);
  if (!channel || !CONTENT_CHANNELS.has(channel)) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_CALENDAR_CHANNEL_INVALID");
  }
  const status = boundedString(calendar.status, 40);
  if (!status || !["planned", "queued", "approved", "published", "held", "missed"].includes(status)) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_CALENDAR_STATUS_INVALID");
  }
  if (timestampMillis(calendar.scheduledFor) === null) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_CALENDAR_SCHEDULE_INVALID");
  }
  const hasPublicationUrl = calendar.publicationUrl != null;
  const hasPublishedAt = calendar.publishedAt != null;
  if (
    hasPublicationUrl !== hasPublishedAt
    || (hasPublicationUrl && boundedPublicationUrl(calendar.publicationUrl) === null)
    || (hasPublishedAt && timestampMillis(calendar.publishedAt) === null)
    || (status === "published" && (!hasPublicationUrl || !hasPublishedAt))
    || (status !== "published" && (hasPublicationUrl || hasPublishedAt))
  ) throw new Error("SIGNALDESK_PROOF_PERMISSION_CALENDAR_PUBLICATION_INVALID");
  return calendar;
};

const publicationEvidenceFromIncident = (
  data: Record<string, unknown>,
): PublicationEvidence => {
  const source = boundedString(data.publicationEvidenceSource, 40);
  if (source !== "asset-marker" && source !== "published-draft" && source !== "published-calendar") {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_INCIDENT_SHAPE_INVALID");
  }
  const channel = boundedString(data.publicationChannel, 80);
  const contentDraftId = normalizeId(data.publicationDraftId);
  const publicationUrl = boundedPublicationUrl(data.publicationUrl);
  const publishedAtValue = boundedString(data.publishedAt, 80);
  const publishedAtDate = publishedAtValue ? new Date(publishedAtValue) : null;
  const publishedAt = publishedAtDate && !Number.isNaN(publishedAtDate.getTime())
    ? publishedAtDate.toISOString()
    : null;
  if (
    (data.publicationChannel != null && !channel)
    || (data.publicationDraftId != null && !contentDraftId)
    || (data.publicationUrl != null && !publicationUrl)
    || (data.publishedAt != null && !publishedAt)
  ) throw new Error("SIGNALDESK_PROOF_PERMISSION_INCIDENT_SHAPE_INVALID");
  return { channel, contentDraftId, publicationUrl, publishedAt, source };
};

const evidenceMillis = (value: PublicationEvidence): number => (
  value.publishedAt ? Date.parse(value.publishedAt) : Number.NEGATIVE_INFINITY
);

const chooseBestEvidence = (
  values: PublicationEvidence[],
): PublicationEvidence | null => {
  if (!values.length) return null;
  return values.reduce((best, candidate) => {
    const bestMillis = evidenceMillis(best);
    const candidateMillis = evidenceMillis(candidate);
    if (candidateMillis > bestMillis) return candidate;
    if (candidateMillis < bestMillis) return best;
    const bestScore = Number(Boolean(best.channel))
      + Number(Boolean(best.publicationUrl))
      + Number(Boolean(best.publishedAt))
      + Number(Boolean(best.contentDraftId))
      + (best.source === "published-calendar" ? 4 : best.source === "asset-marker" ? 2 : 0);
    const candidateScore = Number(Boolean(candidate.channel))
      + Number(Boolean(candidate.publicationUrl))
      + Number(Boolean(candidate.publishedAt))
      + Number(Boolean(candidate.contentDraftId))
      + (candidate.source === "published-calendar" ? 4 : candidate.source === "asset-marker" ? 2 : 0);
    return candidateScore > bestScore ? candidate : best;
  });
};

const publicationMetadataPatch = (evidence: PublicationEvidence): Record<string, unknown> => ({
  publicationChannel: evidence.channel,
  publicationDraftId: evidence.contentDraftId,
  publicationEvidenceSource: evidence.source,
  publicationUrl: evidence.publicationUrl,
  publishedAt: evidence.publishedAt,
});

const incidentMetadataNeedsUpdate = (
  current: Record<string, unknown>,
  evidence: PublicationEvidence,
): boolean => {
  const patch = publicationMetadataPatch(evidence);
  return Object.entries(patch).some(([key, value]) => current[key] !== value);
};

const markPublishedAssetForReview = (params: {
  assetData: Record<string, unknown>;
  assetRef: DocumentReference;
  controlSnapshot: DocumentSnapshot;
  evidence: PublicationEvidence;
  incidentSnapshot: DocumentSnapshot;
  lifecycleToken: string;
  now: Timestamp;
  permissionId: string;
  transaction: Transaction;
}): {
  incidentCreated: boolean;
  incidentOpened: boolean;
  openIncidentDelta: number;
  reviewMarked: boolean;
} => {
  const incidentId = signalDeskProofPublicationIncidentId(params.permissionId, params.assetRef.id);
  const incidentRef = params.incidentSnapshot.ref;
  if (incidentRef.id !== incidentId) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_INCIDENT_IDENTITY_MISMATCH");
  }
  const incidentData = asRecord(params.incidentSnapshot.data());
  if (params.incidentSnapshot.exists) {
    if (
      incidentData.pId !== SIGNALDESK_PRODUCT_CODE
      || incidentData.incidentId !== incidentId
      || incidentData.proofPermissionId !== params.permissionId
      || incidentData.contentAssetId !== params.assetRef.id
      || incidentData.incidentType !== "proof-publication-removal-review"
      || incidentData.severity !== "high"
      || !["open", "acknowledged", "resolved"].includes(String(incidentData.status || ""))
    ) throw new Error("SIGNALDESK_PROOF_PERMISSION_INCIDENT_SHAPE_INVALID");
  }

  assertControlRoomSummary(params.controlSnapshot);
  const evidence = incidentData.publicationEvidenceSource
    ? chooseBestEvidence([publicationEvidenceFromIncident(incidentData), params.evidence])!
    : params.evidence;
  const metadataPatch = publicationMetadataPatch(evidence);
  const incidentCreated = !params.incidentSnapshot.exists;
  const incidentNeedsReopen = params.incidentSnapshot.exists
    && incidentData.status === "resolved"
    && incidentData.proofExpiryLifecycleToken !== params.lifecycleToken;
  const incidentOpened = incidentCreated || incidentNeedsReopen;
  const reviewMarked = params.assetData.publicationReviewRequired !== true
    || params.assetData.publicationReviewIncidentId !== incidentId
    || params.assetData.publicationReviewProofPermissionId !== params.permissionId
    || params.assetData.publicationReviewLifecycleToken !== params.lifecycleToken;

  if (reviewMarked || incidentCreated) {
    params.transaction.set(params.assetRef, {
      pId: SIGNALDESK_PRODUCT_CODE,
      publicationReviewIncidentId: incidentId,
      publicationReviewProofPermissionId: params.permissionId,
      publicationReviewLifecycleToken: params.lifecycleToken,
      publicationReviewReason: "proof-permission-expired",
      publicationReviewRequestedAt: params.assetData.publicationReviewLifecycleToken === params.lifecycleToken
        ? params.assetData.publicationReviewRequestedAt || params.now
        : params.now,
      publicationReviewRequired: true,
      updatedAt: params.now,
      updatedBy: SYSTEM_ACTOR_ID,
    }, { merge: true });
  }

  if (incidentCreated) {
    params.transaction.create(incidentRef, {
      incidentId,
      incidentType: "proof-publication-removal-review",
      pId: SIGNALDESK_PRODUCT_CODE,
      severity: "high",
      status: "open",
      title: "Published customer proof requires removal review",
      proofPermissionId: params.permissionId,
      contentAssetId: params.assetRef.id,
      proofExpiryLifecycleToken: params.lifecycleToken,
      ...metadataPatch,
      createdAt: params.now,
      updatedAt: params.now,
    });
    const auditRef = params.assetRef.firestore
      .collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
      .doc(lifecycleAuditId("publication-removal-review", `${incidentId}|${params.lifecycleToken}`));
    params.transaction.create(auditRef, {
      auditEventId: auditRef.id,
      pId: SIGNALDESK_PRODUCT_CODE,
      actorId: SYSTEM_ACTOR_ID,
      actorRole: SYSTEM_ACTOR_ROLE,
      action: "proof_permission_publication_removal_review_opened",
      entityType: "contentAsset",
      entityId: params.assetRef.id,
      reason: `proofPermissionId=${params.permissionId};incidentId=${incidentId}`,
      createdAt: params.now,
    });

    const timelineRef = params.assetRef.firestore
      .collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES)
      .doc(`proof_removal_${stableHash(incidentId).slice(0, 40)}`);
    params.transaction.set(timelineRef, {
      runTimelineId: timelineRef.id,
      pId: SIGNALDESK_PRODUCT_CODE,
      entityType: "content",
      entityId: params.assetRef.id,
      label: "Published proof removal review",
      status: "blocked",
      steps: [{
        label: "Proof permission expired; founder removal review required",
        status: "blocked",
        at: params.now.toDate().toISOString(),
      }],
      updatedAt: params.now,
    }, { merge: true });
  } else if (incidentNeedsReopen) {
    params.transaction.set(incidentRef, {
      ...metadataPatch,
      proofExpiryLifecycleToken: params.lifecycleToken,
      severity: "high",
      status: "open",
      reopenedAt: params.now,
      updatedAt: params.now,
    }, { merge: true });
    const auditRef = params.assetRef.firestore
      .collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
      .doc(lifecycleAuditId("publication-removal-review", `${incidentId}|${params.lifecycleToken}`));
    params.transaction.create(auditRef, {
      auditEventId: auditRef.id,
      pId: SIGNALDESK_PRODUCT_CODE,
      actorId: SYSTEM_ACTOR_ID,
      actorRole: SYSTEM_ACTOR_ROLE,
      action: "proof_permission_publication_removal_review_reopened",
      entityType: "contentAsset",
      entityId: params.assetRef.id,
      reason: `proofPermissionId=${params.permissionId};incidentId=${incidentId}`,
      createdAt: params.now,
    });

    const timelineRef = params.assetRef.firestore
      .collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES)
      .doc(`proof_removal_${stableHash(incidentId).slice(0, 40)}`);
    params.transaction.set(timelineRef, {
      status: "blocked",
      steps: [{
        label: "A renewed proof grant expired; founder removal review reopened",
        status: "blocked",
        at: params.now.toDate().toISOString(),
      }],
      updatedAt: params.now,
    }, { merge: true });
  } else if (
    incidentMetadataNeedsUpdate(incidentData, evidence)
    || incidentData.proofExpiryLifecycleToken !== params.lifecycleToken
  ) {
    params.transaction.set(incidentRef, {
      ...metadataPatch,
      proofExpiryLifecycleToken: params.lifecycleToken,
      updatedAt: params.now,
    }, { merge: true });
  }

  return {
    incidentCreated,
    incidentOpened,
    openIncidentDelta: incidentOpened ? 1 : 0,
    reviewMarked,
  };
};

const materializeExpiredPermission = async (params: {
  firestore: Firestore;
  now: Timestamp;
  permissionRef: DocumentReference;
}): Promise<{ conflict: boolean; token: string | null }> => params.firestore.runTransaction(async transaction => {
  const snapshot = await transaction.get(params.permissionRef);
  if (!snapshot.exists) return { conflict: false, token: null };
  const data = asRecord(snapshot.data());
  if (data.pId !== SIGNALDESK_PRODUCT_CODE) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_PRODUCT_MISMATCH");
  }
  if (data.proofPermissionId !== snapshot.id) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_IDENTITY_MISMATCH");
  }
  if (data.status !== "active") return { conflict: false, token: null };
  const expiresAtMillis = timestampMillis(data.expiresAt);
  if (expiresAtMillis === null) throw new Error("SIGNALDESK_PROOF_PERMISSION_EXPIRY_INVALID");
  if (expiresAtMillis > params.now.toMillis()) return { conflict: false, token: null };
  if (data.dependentHoldReconciliationPending === true) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_RECONCILIATION_CONFLICT");
  }

  const token = proofPermissionLifecycleToken(params.permissionRef.id, expiresAtMillis);
  const progress = emptyProgress();
  transaction.set(params.permissionRef, {
    status: "expired",
    naturalExpiryMaterializedAt: params.now,
    proofExpiryLifecycleFailedAt: null,
    proofExpiryLifecycleFailureCode: null,
    proofExpiryLifecycleFailurePhase: null,
    proofExpiryLifecycleLastRetryAt: null,
    proofExpiryLifecycleRetryAt: null,
    proofExpiryLifecycleRetryCount: 0,
    proofExpiryLifecycleState: "pending",
    proofExpiryLifecycleToken: token,
    dependentHoldReconciliationKind: LIFECYCLE_KIND,
    dependentHoldReconciliationPending: true,
    dependentHoldReconciliationProgress: progress,
    dependentHoldReconciliationToken: token,
    updatedAt: params.now,
    updatedBy: SYSTEM_ACTOR_ID,
  }, { merge: true });

  const auditRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
    .doc(lifecycleAuditId("permission-expired", token));
  transaction.create(auditRef, {
    auditEventId: auditRef.id,
    pId: SIGNALDESK_PRODUCT_CODE,
    actorId: SYSTEM_ACTOR_ID,
    actorRole: SYSTEM_ACTOR_ROLE,
    action: "proof_permission_expired",
    entityType: "proofPermission",
    entityId: params.permissionRef.id,
    reason: "Natural proof-permission expiry materialized by the leased lifecycle task",
    createdAt: params.now,
  });

  const timelineRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES)
    .doc(`proof_expiry_${stableHash(token).slice(0, 40)}`);
  transaction.set(timelineRef, {
    runTimelineId: timelineRef.id,
    pId: SIGNALDESK_PRODUCT_CODE,
    entityType: "content",
    entityId: params.permissionRef.id,
    label: "Proof permission expiry",
    status: "held",
    steps: [{
      label: "Permission expired; dependent content reconciliation started",
      status: "held",
      at: params.now.toDate().toISOString(),
    }],
    updatedAt: params.now,
  }, { merge: true });
  return { conflict: false, token };
});

const transitionEmptyPhase = async (params: {
  firestore: Firestore;
  permissionRef: DocumentReference;
  token: string;
  expectedProgress: ReconciliationProgress;
  nextPhase: ReconciliationPhase;
}): Promise<ReconciliationStepResult> => params.firestore.runTransaction(async transaction => {
  const permissionSnapshot = await transaction.get(params.permissionRef);
  const current = readPendingPermission(permissionSnapshot, params.token);
  if (!sameProgressPosition(current.progress, params.expectedProgress)) return { stale: true };
  const nextProgress: ReconciliationProgress = {
    ...current.progress,
    phase: params.nextPhase,
    assetCursor: null,
    currentAssetId: null,
    dependencyCursor: null,
  };
  transaction.update(params.permissionRef, {
    dependentHoldReconciliationProgress: nextProgress,
  });
  return { stale: false };
});

const processAssetPage = async (params: {
  dependencyPageSize: number;
  firestore: Firestore;
  now: Timestamp;
  permissionRef: DocumentReference;
  progress: ReconciliationProgress;
  token: string;
}): Promise<ReconciliationStepResult> => {
  let query = params.firestore.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS)
    .where("proofPermissionId", "==", params.permissionRef.id)
    .orderBy(FieldPath.documentId())
    .limit(params.dependencyPageSize);
  if (params.progress.assetCursor) query = query.startAfter(params.progress.assetCursor);
  const page = await query.get();
  if (page.empty) {
    return transitionEmptyPhase({
      firestore: params.firestore,
      permissionRef: params.permissionRef,
      token: params.token,
      expectedProgress: params.progress,
      nextPhase: "drafts",
    });
  }

  const incidentRefs = page.docs.map(asset => params.firestore
    .collection(SIGNALDESK_COLLECTIONS.INCIDENTS)
    .doc(signalDeskProofPublicationIncidentId(params.permissionRef.id, asset.id)));
  const controlRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM);

  return params.firestore.runTransaction(async transaction => {
    const snapshots = await Promise.all([
      transaction.get(params.permissionRef),
      ...page.docs.map(asset => transaction.get(asset.ref)),
      ...incidentRefs.map(ref => transaction.get(ref)),
      transaction.get(controlRef),
    ]);
    const permissionSnapshot = snapshots[0];
    const assetSnapshots = snapshots.slice(1, 1 + page.size);
    const incidentSnapshots = snapshots.slice(1 + page.size, 1 + (2 * page.size));
    const controlSnapshot = snapshots[snapshots.length - 1];
    const current = readPendingPermission(permissionSnapshot, params.token);
    if (!sameProgressPosition(current.progress, params.progress)) return { stale: true };

    let held = 0;
    let incidentsCreated = 0;
    let incidentCreated = 0;
    let openIncidentDelta = 0;
    let reviewMarked = 0;
    assetSnapshots.forEach((assetSnapshot, index) => {
      const asset = assertContentAsset(assetSnapshot, params.permissionRef.id);
      const status = boundedString(asset.status, 40);
      if (!status || !["draft", "ready", "distributed", "hold", "archived"].includes(status)) {
        throw new Error("SIGNALDESK_PROOF_PERMISSION_CONTENT_ASSET_STATUS_INVALID");
      }
      if (assetHasPublishedTruth(asset)) {
        const review = markPublishedAssetForReview({
          assetData: asset,
          assetRef: assetSnapshot.ref,
          controlSnapshot,
          evidence: publicationEvidenceFromAsset(asset),
          incidentSnapshot: incidentSnapshots[index],
          lifecycleToken: params.token,
          now: params.now,
          permissionId: params.permissionRef.id,
          transaction,
        });
        if (review.incidentCreated) incidentsCreated += 1;
        if (review.incidentOpened) incidentCreated += 1;
        openIncidentDelta += review.openIncidentDelta;
        if (review.reviewMarked) reviewMarked += 1;
      } else if (status !== "hold" && status !== "archived") {
        transaction.set(assetSnapshot.ref, {
          status: "hold",
          updatedAt: params.now,
          updatedBy: SYSTEM_ACTOR_ID,
        }, { merge: true });
        held += 1;
      }
    });

    if (incidentsCreated > 0 || openIncidentDelta > 0) {
      transaction.set(controlRef, {
        controlRoomSummaryId: SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM,
        pId: SIGNALDESK_PRODUCT_CODE,
        ...(incidentsCreated > 0 ? { incidentCount: FieldValue.increment(incidentsCreated) } : {}),
        ...(openIncidentDelta > 0 ? { openIncidentCount: FieldValue.increment(openIncidentDelta) } : {}),
        safetyStatus: "blocked",
        updatedAt: params.now,
      }, { merge: true });
    }

    const lastId = page.docs[page.docs.length - 1].id;
    const nextProgress: ReconciliationProgress = {
      ...current.progress,
      phase: page.size < params.dependencyPageSize ? "drafts" : "assets",
      assetCursor: page.size < params.dependencyPageSize ? null : lastId,
      currentAssetId: null,
      dependencyCursor: null,
      heldAssetCount: current.progress.heldAssetCount + held,
      publicationReviewAssetCount: current.progress.publicationReviewAssetCount + reviewMarked,
      publishedIncidentCount: current.progress.publishedIncidentCount + incidentCreated,
      scannedAssetCount: current.progress.scannedAssetCount + page.size,
    };
    transaction.update(params.permissionRef, {
      dependentHoldReconciliationProgress: nextProgress,
    });
    return { stale: false };
  });
};

const findDependencyAsset = async (params: {
  firestore: Firestore;
  permissionId: string;
  progress: ReconciliationProgress;
}): Promise<QueryDocumentSnapshot | DocumentSnapshot | null> => {
  if (params.progress.currentAssetId) {
    return params.firestore.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS)
      .doc(params.progress.currentAssetId)
      .get();
  }
  let query = params.firestore.collection(SIGNALDESK_COLLECTIONS.CONTENT_ASSETS)
    .where("proofPermissionId", "==", params.permissionId)
    .orderBy(FieldPath.documentId())
    .limit(1);
  if (params.progress.assetCursor) query = query.startAfter(params.progress.assetCursor);
  const snapshot = await query.get();
  return snapshot.docs[0] || null;
};

const processDependencyPage = async (params: {
  dependencyPageSize: number;
  firestore: Firestore;
  now: Timestamp;
  permissionRef: DocumentReference;
  progress: ReconciliationProgress;
  token: string;
  phase: "drafts" | "calendars";
}): Promise<ReconciliationStepResult> => {
  const assetSnapshot = await findDependencyAsset({
    firestore: params.firestore,
    permissionId: params.permissionRef.id,
    progress: params.progress,
  });
  if (!assetSnapshot) {
    return transitionEmptyPhase({
      firestore: params.firestore,
      permissionRef: params.permissionRef,
      token: params.token,
      expectedProgress: params.progress,
      nextPhase: params.phase === "drafts" ? "calendars" : "complete",
    });
  }
  const assetId = assetSnapshot.id;
  const collectionName = params.phase === "drafts"
    ? SIGNALDESK_COLLECTIONS.CONTENT_DISTRIBUTION_DRAFTS
    : SIGNALDESK_COLLECTIONS.CONTENT_CALENDAR_ITEMS;
  let query = params.firestore.collection(collectionName)
    .where("contentAssetId", "==", assetId)
    .orderBy(FieldPath.documentId())
    .limit(params.dependencyPageSize);
  if (params.progress.dependencyCursor) query = query.startAfter(params.progress.dependencyCursor);
  const page = await query.get();
  const incidentRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.INCIDENTS)
    .doc(signalDeskProofPublicationIncidentId(params.permissionRef.id, assetId));
  const controlRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM);
  const queueRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES).doc("current");

  return params.firestore.runTransaction(async transaction => {
    const snapshots = await Promise.all([
      transaction.get(params.permissionRef),
      transaction.get(assetSnapshot.ref),
      ...page.docs.map(dependency => transaction.get(dependency.ref)),
      transaction.get(incidentRef),
      transaction.get(controlRef),
      ...(params.phase === "drafts" ? [transaction.get(queueRef)] : []),
    ]);
    const permissionSnapshot = snapshots[0];
    const currentAssetSnapshot = snapshots[1];
    const dependencySnapshots = snapshots.slice(2, 2 + page.size);
    const incidentSnapshot = snapshots[2 + page.size];
    const controlSnapshot = snapshots[3 + page.size];
    const queueSnapshot = params.phase === "drafts" ? snapshots[4 + page.size] : null;
    const current = readPendingPermission(permissionSnapshot, params.token);
    if (!sameProgressPosition(current.progress, params.progress)) return { stale: true };
    const asset = assertContentAsset(currentAssetSnapshot, params.permissionRef.id);
    if (params.progress.currentAssetId && params.progress.currentAssetId !== assetId) {
      throw new Error("SIGNALDESK_PROOF_PERMISSION_RECONCILIATION_ASSET_CURSOR_INVALID");
    }

    let held = 0;
    let pendingHeld = 0;
    const publishedEvidence: PublicationEvidence[] = [];
    dependencySnapshots.forEach(dependencySnapshot => {
      if (params.phase === "drafts") {
        const dependency = assertDraftDependency(dependencySnapshot, assetId);
        const status = boundedString(dependency.status, 40)!;
        if (status === "published") {
          publishedEvidence.push(publicationEvidenceFromDraft(dependencySnapshot.id, dependency));
        } else if (status !== "rejected" && !(status === "hold" && dependency.approvalStatus === "hold")) {
          transaction.set(dependencySnapshot.ref, {
            approvalStatus: "hold",
            reviewReason: "Proof permission expired. Review before distribution.",
            status: "hold",
            updatedAt: params.now,
            updatedBy: SYSTEM_ACTOR_ID,
          }, { merge: true });
          if (dependency.approvalStatus === "pending") pendingHeld += 1;
          held += 1;
        }
      } else {
        const dependency = assertCalendarDependency(dependencySnapshot, assetId);
        const status = boundedString(dependency.status, 40)!;
        if (status === "published") {
          publishedEvidence.push(publicationEvidenceFromCalendar(dependency));
        } else if (status !== "held" && status !== "missed") {
          transaction.set(dependencySnapshot.ref, {
            status: "held",
            updatedAt: params.now,
            updatedBy: SYSTEM_ACTOR_ID,
          }, { merge: true });
          held += 1;
        }
      }
    });

    let incidentCreated = 0;
    let incidentsCreated = 0;
    let openIncidentDelta = 0;
    let reviewMarked = 0;
    const bestEvidence = chooseBestEvidence(publishedEvidence);
    if (bestEvidence) {
      const review = markPublishedAssetForReview({
        assetData: asset,
        assetRef: currentAssetSnapshot.ref,
        controlSnapshot,
        evidence: bestEvidence,
        incidentSnapshot,
        lifecycleToken: params.token,
        now: params.now,
        permissionId: params.permissionRef.id,
        transaction,
      });
      incidentsCreated = review.incidentCreated ? 1 : 0;
      incidentCreated = review.incidentOpened ? 1 : 0;
      openIncidentDelta = review.openIncidentDelta;
      reviewMarked = review.reviewMarked ? 1 : 0;
    }

    if (incidentsCreated > 0 || openIncidentDelta > 0) {
      transaction.set(controlRef, {
        controlRoomSummaryId: SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM,
        pId: SIGNALDESK_PRODUCT_CODE,
        ...(incidentsCreated > 0 ? { incidentCount: FieldValue.increment(incidentsCreated) } : {}),
        ...(openIncidentDelta > 0 ? { openIncidentCount: FieldValue.increment(openIncidentDelta) } : {}),
        safetyStatus: "blocked",
        updatedAt: params.now,
      }, { merge: true });
    }

    if (params.phase === "drafts" && pendingHeld > 0) {
      if (!queueSnapshot) throw new Error("SIGNALDESK_QUEUE_SUMMARY_MISSING");
      const queueData = asRecord(queueSnapshot.data());
      assertOptionalProduct(queueData, "SIGNALDESK_QUEUE_SUMMARY_PRODUCT_MISMATCH");
      transaction.set(queueRef, {
        pId: SIGNALDESK_PRODUCT_CODE,
        queueSummaryId: SIGNALDESK_SUMMARY_DOCS.QUEUES,
        humanReview: Math.max(
          0,
          summaryCount(queueData.humanReview, "SIGNALDESK_QUEUE_SUMMARY_SHAPE_INVALID") - pendingHeld,
        ),
        updatedAt: params.now,
      }, { merge: true });
    }

    const pageComplete = page.size < params.dependencyPageSize;
    const lastDependencyId = page.docs[page.docs.length - 1]?.id || null;
    const nextProgress: ReconciliationProgress = {
      ...current.progress,
      assetCursor: pageComplete ? assetId : current.progress.assetCursor,
      currentAssetId: pageComplete ? null : assetId,
      dependencyCursor: pageComplete ? null : lastDependencyId,
      heldDraftCount: current.progress.heldDraftCount + (params.phase === "drafts" ? held : 0),
      heldCalendarCount: current.progress.heldCalendarCount + (params.phase === "calendars" ? held : 0),
      publicationReviewAssetCount: current.progress.publicationReviewAssetCount + reviewMarked,
      publishedIncidentCount: current.progress.publishedIncidentCount + incidentCreated,
      scannedDraftCount: current.progress.scannedDraftCount + (params.phase === "drafts" ? page.size : 0),
      scannedCalendarCount: current.progress.scannedCalendarCount + (params.phase === "calendars" ? page.size : 0),
    };
    transaction.update(params.permissionRef, {
      dependentHoldReconciliationProgress: nextProgress,
    });
    return { stale: false };
  });
};

const readCompletedResult = (
  data: Record<string, unknown>,
): SignalDeskProofPermissionLifecycleReconciliationResult => {
  const source = asRecord(data.lastDependentHoldReconciliationResult);
  return {
    heldAssetCount: lifecycleCount(source.heldAssetCount),
    heldDraftCount: lifecycleCount(source.heldDraftCount),
    heldCalendarCount: lifecycleCount(source.heldCalendarCount),
    publicationReviewAssetCount: lifecycleCount(source.publicationReviewAssetCount),
    publishedIncidentCount: lifecycleCount(source.publishedIncidentCount),
    scannedAssetCount: lifecycleCount(source.scannedAssetCount),
    scannedDraftCount: lifecycleCount(source.scannedDraftCount),
    scannedCalendarCount: lifecycleCount(source.scannedCalendarCount),
  };
};

const completePermissionReconciliation = async (params: {
  firestore: Firestore;
  now: Timestamp;
  permissionRef: DocumentReference;
  token: string;
}): Promise<{ newlyCompleted: boolean; result: SignalDeskProofPermissionLifecycleReconciliationResult }> => (
  params.firestore.runTransaction(async transaction => {
    const snapshot = await transaction.get(params.permissionRef);
    if (!snapshot.exists) throw new Error("SIGNALDESK_PROOF_PERMISSION_MISSING");
    const data = asRecord(snapshot.data());
    if (data.pId !== SIGNALDESK_PRODUCT_CODE) {
      throw new Error("SIGNALDESK_PROOF_PERMISSION_PRODUCT_MISMATCH");
    }
    if (
      data.proofExpiryLifecycleState === "completed"
      && data.lastDependentHoldReconciliationToken === params.token
      && data.dependentHoldReconciliationPending !== true
    ) return { newlyCompleted: false, result: readCompletedResult(data) };

    const current = readPendingPermission(snapshot, params.token);
    if (current.progress.phase !== "complete") {
      throw new Error("SIGNALDESK_PROOF_PERMISSION_RECONCILIATION_INCOMPLETE");
    }
    const result = progressResult(current.progress);
    transaction.set(params.permissionRef, {
      proofExpiryLifecycleState: "completed",
      proofExpiryLifecycleCompletedAt: params.now,
      proofExpiryLifecycleFailedAt: null,
      proofExpiryLifecycleFailureCode: null,
      proofExpiryLifecycleFailurePhase: null,
      proofExpiryLifecycleLastRetryAt: null,
      proofExpiryLifecycleRetryAt: null,
      proofExpiryLifecycleRetryCount: 0,
      dependentHoldReconciliationKind: null,
      dependentHoldReconciliationPending: false,
      dependentHoldReconciliationProgress: null,
      dependentHoldReconciliationToken: null,
      lastDependentHoldReconciliationAt: params.now,
      lastDependentHoldReconciliationResult: result,
      lastDependentHoldReconciliationToken: params.token,
      updatedAt: params.now,
      updatedBy: SYSTEM_ACTOR_ID,
    }, { merge: true });

    const auditRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
      .doc(lifecycleAuditId("permission-reconciliation-completed", params.token));
    transaction.create(auditRef, {
      auditEventId: auditRef.id,
      pId: SIGNALDESK_PRODUCT_CODE,
      actorId: SYSTEM_ACTOR_ID,
      actorRole: SYSTEM_ACTOR_ROLE,
      action: "proof_permission_expiry_reconciliation_completed",
      entityType: "proofPermission",
      entityId: params.permissionRef.id,
      reason: `assets=${result.heldAssetCount};drafts=${result.heldDraftCount};calendars=${result.heldCalendarCount};incidents=${result.publishedIncidentCount}`,
      createdAt: params.now,
    });

    const timelineRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES)
      .doc(`proof_expiry_${stableHash(params.token).slice(0, 40)}`);
    transaction.set(timelineRef, {
      status: result.publishedIncidentCount > 0 ? "blocked" : "completed",
      steps: [{
        label: result.publishedIncidentCount > 0
          ? "Dependencies held; published proof requires removal review"
          : "Unpublished dependencies held",
        status: result.publishedIncidentCount > 0 ? "blocked" : "completed",
        at: params.now.toDate().toISOString(),
      }],
      updatedAt: params.now,
    }, { merge: true });
    return { newlyCompleted: true, result };
  })
);

const reconcilePendingPermission = async (params: {
  dependencyPageSize: number;
  firestore: Firestore;
  now: Timestamp;
  permissionRef: DocumentReference;
  stepBudget: { remaining: number };
  token: string;
}): Promise<{ completed: boolean; newlyCompleted: boolean; result?: SignalDeskProofPermissionLifecycleReconciliationResult }> => {
  while (params.stepBudget.remaining > 0) {
    const snapshot = await params.permissionRef.get();
    if (!snapshot.exists) throw new Error("SIGNALDESK_PROOF_PERMISSION_MISSING");
    const data = asRecord(snapshot.data());
    if (
      data.proofExpiryLifecycleState === "completed"
      && data.lastDependentHoldReconciliationToken === params.token
      && data.dependentHoldReconciliationPending !== true
    ) return { completed: true, newlyCompleted: false, result: readCompletedResult(data) };
    const current = readPendingPermission(snapshot, params.token);
    if (current.progress.phase === "complete") {
      const completion = await completePermissionReconciliation({
        firestore: params.firestore,
        now: params.now,
        permissionRef: params.permissionRef,
        token: params.token,
      });
      return { completed: true, ...completion };
    }

    params.stepBudget.remaining -= 1;
    let step: ReconciliationStepResult;
    if (current.progress.phase === "assets") {
      step = await processAssetPage({
        dependencyPageSize: params.dependencyPageSize,
        firestore: params.firestore,
        now: params.now,
        permissionRef: params.permissionRef,
        progress: current.progress,
        token: params.token,
      });
    } else {
      step = await processDependencyPage({
        dependencyPageSize: params.dependencyPageSize,
        firestore: params.firestore,
        now: params.now,
        permissionRef: params.permissionRef,
        progress: current.progress,
        token: params.token,
        phase: current.progress.phase,
      });
    }
    if (step.completedResult) {
      return { completed: true, newlyCompleted: false, result: step.completedResult };
    }
  }

  const finalSnapshot = await params.permissionRef.get();
  if (finalSnapshot.exists) {
    const data = asRecord(finalSnapshot.data());
    if (
      data.proofExpiryLifecycleState === "completed"
      && data.lastDependentHoldReconciliationToken === params.token
      && data.dependentHoldReconciliationPending !== true
    ) return { completed: true, newlyCompleted: false, result: readCompletedResult(data) };
    const current = readPendingPermission(finalSnapshot, params.token);
    if (current.progress.phase === "complete") {
      const completion = await completePermissionReconciliation({
        firestore: params.firestore,
        now: params.now,
        permissionRef: params.permissionRef,
        token: params.token,
      });
      return { completed: true, ...completion };
    }
  }
  return { completed: false, newlyCompleted: false };
};

const addCompletedResult = (
  aggregate: SignalDeskProofPermissionLifecycleResult,
  value: SignalDeskProofPermissionLifecycleReconciliationResult,
): void => {
  aggregate.heldAssetCount += value.heldAssetCount;
  aggregate.heldDraftCount += value.heldDraftCount;
  aggregate.heldCalendarCount += value.heldCalendarCount;
  aggregate.publicationReviewAssetCount += value.publicationReviewAssetCount;
  aggregate.publishedIncidentCount += value.publishedIncidentCount;
  aggregate.scannedAssetCount += value.scannedAssetCount;
  aggregate.scannedDraftCount += value.scannedDraftCount;
  aggregate.scannedCalendarCount += value.scannedCalendarCount;
};

const lifecycleFailureCode = (error: unknown): string => {
  const raw = getBoundedFunctionsErrorMessage(error) || "unknown";
  const normalized = raw.trim().toUpperCase();
  return /^SIGNALDESK_[A-Z0-9_]+$/.test(normalized)
    ? normalized.slice(0, 160)
    : "SIGNALDESK_PROOF_PERMISSION_LIFECYCLE_PROCESSING_FAILED";
};

export const recordSignalDeskProofPermissionLifecycleFailure = async (params: {
  error: unknown;
  expectedAuthorityHash: string;
  firestore: Firestore;
  now: Timestamp;
  permissionRef: DocumentReference;
  phase: "due" | "pending" | "retry";
}): Promise<boolean> => {
  const failureCode = lifecycleFailureCode(params.error);
  const incidentId = `proof_lifecycle_failure_${stableHash(params.permissionRef.id).slice(0, 40)}`;
  const failureFingerprint = stableHash(`${params.permissionRef.id}|${params.phase}|${failureCode}`);
  const incidentRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.INCIDENTS).doc(incidentId);
  const controlRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES)
    .doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM);
  const auditRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
    .doc(lifecycleAuditId("permission-lifecycle-failed", failureFingerprint));
  return params.firestore.runTransaction(async transaction => {
    const [permissionSnapshot, incidentSnapshot, controlSnapshot, auditSnapshot] = await Promise.all([
      transaction.get(params.permissionRef),
      transaction.get(incidentRef),
      transaction.get(controlRef),
      transaction.get(auditRef),
    ]);
    if (!permissionSnapshot.exists) return false;
    const permission = asRecord(permissionSnapshot.data());
    if (permission.pId !== SIGNALDESK_PRODUCT_CODE) return false;
    if (signalDeskProofPermissionLifecycleAuthorityHash(permission) !== params.expectedAuthorityHash) return false;
    const incident = asRecord(incidentSnapshot.data());
    if (incidentSnapshot.exists && (
      incident.pId !== SIGNALDESK_PRODUCT_CODE
      || incident.incidentId !== incidentId
      || incident.incidentType !== "proof-permission-lifecycle-failure"
      || incident.proofPermissionId !== params.permissionRef.id
      || incident.severity !== "high"
      || !["open", "acknowledged", "resolved"].includes(String(incident.status || ""))
    )) throw new Error("SIGNALDESK_PROOF_PERMISSION_LIFECYCLE_FAILURE_INCIDENT_SHAPE_INVALID");
    assertControlRoomSummary(controlSnapshot);

    const incidentCreated = !incidentSnapshot.exists;
    const incidentReopened = incidentSnapshot.exists && incident.status === "resolved";
    if (incidentCreated) {
      transaction.create(incidentRef, {
        incidentId,
        incidentType: "proof-permission-lifecycle-failure",
        pId: SIGNALDESK_PRODUCT_CODE,
        severity: "high",
        status: "open",
        title: "Proof permission lifecycle requires operator review",
        proofPermissionId: params.permissionRef.id,
        failureCode,
        failureFingerprint,
        failurePhase: params.phase,
        createdAt: params.now,
        updatedAt: params.now,
      });
    } else if (incidentReopened) {
      transaction.set(incidentRef, {
        failureCode,
        failureFingerprint,
        failurePhase: params.phase,
        reopenedAt: params.now,
        status: "open",
        updatedAt: params.now,
      }, { merge: true });
    } else if (
      incident.failureCode !== failureCode
      || incident.failurePhase !== params.phase
      || incident.failureFingerprint !== failureFingerprint
    ) {
      transaction.set(incidentRef, {
        failureCode,
        failureFingerprint,
        failurePhase: params.phase,
        updatedAt: params.now,
      }, { merge: true });
    }

    if (permission.pId === SIGNALDESK_PRODUCT_CODE) {
      const priorRetryCount = boundedCount(permission.proofExpiryLifecycleRetryCount);
      const retryCount = priorRetryCount + 1;
      const retryDelayMs = Math.min(
        FAILURE_RETRY_MAX_MS,
        FAILURE_RETRY_BASE_MS * (2 ** Math.min(priorRetryCount, 8)),
      );
      transaction.set(params.permissionRef, {
        ...(params.phase === "due" && permission.status === "active" ? { status: "hold" } : {}),
        proofExpiryLifecycleFailedAt: params.now,
        proofExpiryLifecycleFailureCode: failureCode,
        proofExpiryLifecycleFailurePhase: params.phase,
        proofExpiryLifecycleRetryAt: Timestamp.fromMillis(params.now.toMillis() + retryDelayMs),
        proofExpiryLifecycleRetryCount: retryCount,
        proofExpiryLifecycleState: "failed",
        updatedAt: params.now,
        updatedBy: SYSTEM_ACTOR_ID,
      }, { merge: true });
    }

    const incidentOpened = incidentCreated || incidentReopened;
    if (incidentCreated || incidentOpened) {
      transaction.set(controlRef, {
        controlRoomSummaryId: SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM,
        pId: SIGNALDESK_PRODUCT_CODE,
        ...(incidentCreated ? { incidentCount: FieldValue.increment(1) } : {}),
        ...(incidentOpened ? { openIncidentCount: FieldValue.increment(1) } : {}),
        safetyStatus: "blocked",
        updatedAt: params.now,
      }, { merge: true });
    }

    if (!auditSnapshot.exists) {
      transaction.create(auditRef, {
        auditEventId: auditRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        actorId: SYSTEM_ACTOR_ID,
        actorRole: SYSTEM_ACTOR_ROLE,
        action: "proof_permission_lifecycle_failed",
        entityType: "proofPermission",
        entityId: params.permissionRef.id,
        reason: `${params.phase}:${failureCode}`,
        createdAt: params.now,
      });
    }
    const timelineRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.RUN_TIMELINES)
      .doc(`proof_lifecycle_failure_${stableHash(params.permissionRef.id).slice(0, 40)}`);
    transaction.set(timelineRef, {
      runTimelineId: timelineRef.id,
      pId: SIGNALDESK_PRODUCT_CODE,
      entityType: "content",
      entityId: params.permissionRef.id,
      label: "Proof permission lifecycle failure",
      status: "blocked",
      steps: [{
        label: "Lifecycle processing failed; operator review required",
        status: "blocked",
        at: params.now.toDate().toISOString(),
      }],
      updatedAt: params.now,
    }, { merge: true });
    return true;
  });
};

const diagnosticSourceContext = (error: unknown): {
  sourceErrorCode?: string;
  sourceErrorName: string;
} => {
  return {
    sourceErrorName: getBoundedFunctionsErrorName(error) || typeof error,
    ...(getBoundedFunctionsErrorCode(error)
      ? { sourceErrorCode: getBoundedFunctionsErrorCode(error) }
      : {}),
  };
};

const quarantinePermissionAfterFailureDiagnosticError = async (params: {
  error: unknown;
  expectedAuthorityHash: string;
  firestore: Firestore;
  now: Timestamp;
  permissionRef: DocumentReference;
  phase: "due" | "pending" | "retry";
}): Promise<boolean> => {
  const failureCode = lifecycleFailureCode(params.error);
  return params.firestore.runTransaction(async transaction => {
    const permissionSnapshot = await transaction.get(params.permissionRef);
    if (!permissionSnapshot.exists) return false;
    const permission = asRecord(permissionSnapshot.data());
    if (permission.pId !== SIGNALDESK_PRODUCT_CODE) return false;
    if (signalDeskProofPermissionLifecycleAuthorityHash(permission) !== params.expectedAuthorityHash) return false;

    const priorRetryCount = boundedCount(permission.proofExpiryLifecycleRetryCount);
    const retryDelayMs = Math.min(
      FAILURE_RETRY_MAX_MS,
      FAILURE_RETRY_BASE_MS * (2 ** Math.min(priorRetryCount, 8)),
    );
    transaction.set(params.permissionRef, {
      ...(params.phase === "due" && permission.status === "active" ? { status: "hold" } : {}),
      proofExpiryLifecycleFailedAt: params.now,
      proofExpiryLifecycleFailureCode: failureCode,
      proofExpiryLifecycleFailurePhase: params.phase,
      proofExpiryLifecycleRetryAt: Timestamp.fromMillis(params.now.toMillis() + retryDelayMs),
      proofExpiryLifecycleRetryCount: priorRetryCount + 1,
      proofExpiryLifecycleState: "failed",
      updatedAt: params.now,
      updatedBy: SYSTEM_ACTOR_ID,
    }, { merge: true });
    return true;
  });
};

const isolatePermissionFailure = async (params: {
  error: unknown;
  expectedAuthorityHash: string;
  firestore: Firestore;
  now: Timestamp;
  permissionRef: DocumentReference;
  phase: "due" | "pending" | "retry";
  result: SignalDeskProofPermissionLifecycleResult;
}): Promise<void> => {
  try {
    const recorded = await recordSignalDeskProofPermissionLifecycleFailure(params);
    if (recorded) params.result.failedPermissionCount += 1;
    else params.result.conflictedPermissionCount += 1;
  } catch (diagnosticError) {
    params.result.failureDiagnosticErrorCount += 1;
    logger.error("[SignalDesk Proof Lifecycle] Failed to persist isolated permission failure", {
      failureCode: "SIGNALDESK_PROOF_PERMISSION_LIFECYCLE_FAILURE_DIAGNOSTIC_FAILED",
      failurePhase: params.phase,
      ...diagnosticSourceContext(diagnosticError),
    });
    const quarantined = await quarantinePermissionAfterFailureDiagnosticError(params);
    if (quarantined) params.result.failedPermissionCount += 1;
    else params.result.conflictedPermissionCount += 1;
  }
};

const rearmFailedProofPermission = async (params: {
  firestore: Firestore;
  now: Timestamp;
  permissionRef: DocumentReference;
}): Promise<boolean> => params.firestore.runTransaction(async transaction => {
  const snapshot = await transaction.get(params.permissionRef);
  if (!snapshot.exists) return false;
  const permission = asRecord(snapshot.data());
  if (permission.pId !== SIGNALDESK_PRODUCT_CODE) {
    throw new Error("SIGNALDESK_PROOF_PERMISSION_PRODUCT_MISMATCH");
  }
  if (permission.proofExpiryLifecycleState !== "failed") return false;
  const retryAtMillis = timestampMillis(permission.proofExpiryLifecycleRetryAt);
  if (retryAtMillis === null || retryAtMillis > params.now.toMillis()) return false;
  const hasPendingReconciliation = permission.dependentHoldReconciliationPending === true;
  if (
    hasPendingReconciliation
    && permission.dependentHoldReconciliationKind !== LIFECYCLE_KIND
  ) {
    const retryCount = boundedCount(permission.proofExpiryLifecycleRetryCount);
    const retryDelayMs = Math.min(
      FAILURE_RETRY_MAX_MS,
      FAILURE_RETRY_BASE_MS * (2 ** Math.min(retryCount, 8)),
    );
    transaction.set(params.permissionRef, {
      proofExpiryLifecycleLastRetryAt: params.now,
      proofExpiryLifecycleRetryAt: Timestamp.fromMillis(params.now.toMillis() + retryDelayMs),
      proofExpiryLifecycleRetryCount: retryCount + 1,
      updatedAt: params.now,
      updatedBy: SYSTEM_ACTOR_ID,
    }, { merge: true });
    return false;
  }
  transaction.set(params.permissionRef, {
    ...(hasPendingReconciliation
      ? { proofExpiryLifecycleState: "pending" }
      : { proofExpiryLifecycleState: null, status: "active" }),
    proofExpiryLifecycleLastRetryAt: params.now,
    proofExpiryLifecycleRetryAt: null,
    updatedAt: params.now,
    updatedBy: SYSTEM_ACTOR_ID,
  }, { merge: true });
  return true;
});

export async function runSignalDeskProofPermissionLifecycle(
  options: RunSignalDeskProofPermissionLifecycleOptions = {},
): Promise<SignalDeskProofPermissionLifecycleResult> {
  const firestore = options.firestore || defaultDb;
  const now = options.now || Timestamp.now();
  const permissionPageSize = boundedPageSize(options.permissionPageSize, DEFAULT_PERMISSION_PAGE_SIZE);
  const dependencyPageSize = boundedPageSize(
    options.dependencyPageSize,
    DEFAULT_DEPENDENCY_PAGE_SIZE,
    MAX_DEPENDENCY_PAGE_SIZE,
  );
  const maxPermissions = Number.isInteger(options.maxPermissions) && (options.maxPermissions as number) > 0
    ? Math.min(options.maxPermissions as number, 100)
    : DEFAULT_MAX_PERMISSIONS;
  const maxReconciliationSteps = Number.isInteger(options.maxReconciliationSteps)
    && (options.maxReconciliationSteps as number) >= 0
    ? Math.min(options.maxReconciliationSteps as number, 1_000)
    : DEFAULT_MAX_RECONCILIATION_STEPS;
  const result = emptyResult();
  const stepBudget = { remaining: maxReconciliationSteps };
  const permissionCollection = firestore.collection(SIGNALDESK_COLLECTIONS.PROOF_PERMISSIONS);

  let retryProcessed = 0;
  let retryCursor: QueryDocumentSnapshot | null = null;
  while (retryProcessed < maxPermissions) {
    let retryQuery = permissionCollection
      .where("pId", "==", SIGNALDESK_PRODUCT_CODE)
      .where("proofExpiryLifecycleState", "==", "failed")
      .where("proofExpiryLifecycleRetryAt", "<=", now)
      .orderBy("proofExpiryLifecycleRetryAt", "asc")
      .orderBy(FieldPath.documentId(), "asc")
      .limit(Math.min(permissionPageSize, maxPermissions - retryProcessed));
    if (retryCursor) retryQuery = retryQuery.startAfter(retryCursor);
    const retryPage = await retryQuery.get();
    if (retryPage.empty) break;
    for (const permission of retryPage.docs) {
      retryProcessed += 1;
      const expectedAuthorityHash = signalDeskProofPermissionLifecycleAuthorityHash(permission.data());
      try {
        if (await rearmFailedProofPermission({ firestore, now, permissionRef: permission.ref })) {
          result.retriedPermissionCount += 1;
        }
      } catch (error) {
        await isolatePermissionFailure({
          error,
          expectedAuthorityHash,
          firestore,
          now,
          permissionRef: permission.ref,
          phase: "retry",
          result,
        });
      }
    }
    retryCursor = retryPage.docs[retryPage.docs.length - 1] || null;
    if (retryPage.size < permissionPageSize) break;
  }

  let pendingProcessed = 0;
  let pendingCursorId: string | null = null;
  while (pendingProcessed < maxPermissions) {
    let pendingQuery = permissionCollection
      .where("pId", "==", SIGNALDESK_PRODUCT_CODE)
      .where("proofExpiryLifecycleState", "==", "pending")
      .orderBy(FieldPath.documentId())
      .limit(Math.min(permissionPageSize, maxPermissions - pendingProcessed));
    if (pendingCursorId) pendingQuery = pendingQuery.startAfter(pendingCursorId);
    const pendingPage = await pendingQuery.get();
    if (pendingPage.empty) break;
    result.scannedPendingPermissionCount += pendingPage.size;
    let leftPending = false;
    for (const permission of pendingPage.docs) {
      pendingProcessed += 1;
      pendingCursorId = permission.id;
      const expectedAuthorityHash = signalDeskProofPermissionLifecycleAuthorityHash(permission.data());
      try {
        const current = readPendingPermission(permission);
        const reconciliation = await reconcilePendingPermission({
          dependencyPageSize,
          firestore,
          now,
          permissionRef: permission.ref,
          stepBudget,
          token: current.token,
        });
        if (reconciliation.completed && reconciliation.newlyCompleted && reconciliation.result) {
          result.completedPermissionCount += 1;
          addCompletedResult(result, reconciliation.result);
        } else if (!reconciliation.completed) {
          result.pendingPermissionCount += 1;
          leftPending = true;
        }
      } catch (error) {
        await isolatePermissionFailure({
          error,
          expectedAuthorityHash,
          firestore,
          now,
          permissionRef: permission.ref,
          phase: "pending",
          result,
        });
      }
      if (stepBudget.remaining <= 0) break;
    }
    if (leftPending || stepBudget.remaining <= 0 || pendingPage.size < permissionPageSize) break;
  }

  let dueProcessed = 0;
  let dueCursor: QueryDocumentSnapshot | null = null;
  while (dueProcessed < maxPermissions) {
    let dueQuery = permissionCollection
      .where("pId", "==", SIGNALDESK_PRODUCT_CODE)
      .where("status", "==", "active")
      .where("expiresAt", "<=", now)
      .orderBy("expiresAt", "asc")
      .orderBy(FieldPath.documentId(), "asc")
      .limit(Math.min(permissionPageSize, maxPermissions - dueProcessed));
    if (dueCursor) dueQuery = dueQuery.startAfter(dueCursor);
    const duePage = await dueQuery.get();
    if (duePage.empty) break;
    result.scannedDuePermissionCount += duePage.size;
    for (const permission of duePage.docs) {
      dueProcessed += 1;
      const raw = asRecord(permission.data());
      let expectedAuthorityHash = signalDeskProofPermissionLifecycleAuthorityHash(raw);
      try {
        if (raw.pId !== SIGNALDESK_PRODUCT_CODE) {
          throw new Error("SIGNALDESK_PROOF_PERMISSION_PRODUCT_MISMATCH");
        }
        const materialized = await materializeExpiredPermission({ firestore, now, permissionRef: permission.ref });
        if (materialized.conflict) {
          result.conflictedPermissionCount += 1;
          continue;
        }
        if (!materialized.token) continue;
        expectedAuthorityHash = signalDeskProofPermissionLifecycleAuthorityHash({
          ...raw,
          dependentHoldReconciliationKind: LIFECYCLE_KIND,
          dependentHoldReconciliationPending: true,
          dependentHoldReconciliationToken: materialized.token,
          proofExpiryLifecycleState: "pending",
          proofExpiryLifecycleToken: materialized.token,
          status: "expired",
        });
        result.materializedPermissionCount += 1;
        if (stepBudget.remaining > 0) {
          const reconciliation = await reconcilePendingPermission({
            dependencyPageSize,
            firestore,
            now,
            permissionRef: permission.ref,
            stepBudget,
            token: materialized.token,
          });
          if (reconciliation.completed && reconciliation.newlyCompleted && reconciliation.result) {
            result.completedPermissionCount += 1;
            addCompletedResult(result, reconciliation.result);
          } else if (!reconciliation.completed) {
            result.pendingPermissionCount += 1;
          }
        } else {
          result.pendingPermissionCount += 1;
        }
      } catch (error) {
        await isolatePermissionFailure({
          error,
          expectedAuthorityHash,
          firestore,
          now,
          permissionRef: permission.ref,
          phase: "due",
          result,
        });
      }
    }
    const last = duePage.docs[duePage.docs.length - 1];
    dueCursor = last;
    if (duePage.size < permissionPageSize) break;
  }

  result.stepLimitReached = stepBudget.remaining <= 0 && result.pendingPermissionCount > 0;
  return result;
}
