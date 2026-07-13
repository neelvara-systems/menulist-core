import * as crypto from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { DB_COLLECTIONS } from "../constants/database";
import { firestoreAdmin } from "../firebaseAdmin";
import {
  buildMenuExtractionRoutingFields,
  buildMessagingOnboardingMenuExtractionDestination,
  MENU_EXTRACTION_SOURCES,
  MESSAGING_ONBOARDING_MENU_UPLOAD_MIME_TYPES,
} from "../sharedData/menuExtractionJob";
import {
  FALLBACK_BUSINESS_TYPE,
  getBusinessTypeConfig,
  resolveStoreBusinessCategory,
} from "../sharedData/businessTypes";
import { MENU_IMAGE_PROCESSING_JOBS_COLLECTION } from "../types";
import type { ExtractedBusinessProfile } from "../sharedData/extractedBusinessProfile";
import type {
  ExtractedBusinessInfo,
  MessagingOnboardingSession,
  MessagingOnboardingState,
  SessionUpload,
} from "../types/messagingOnboarding.types";
import { PROCESSING, RATE_LIMITS, UPLOAD_LIMITS } from "./constants";

const db = firestoreAdmin;
const sessionsCol = DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS;
const rateLimitsCol = DB_COLLECTIONS.MESSAGING_ONBOARDING_RATE_LIMITS;
const MAX_MESSAGING_SESSION_DOCUMENT_JSON_BYTES = 850_000;

type IntakeClaimStatus =
  | "claimed"
  | "expired"
  | "invalid"
  | "session_cap"
  | "weekly_cap"
  | "skipped";

export type MessagingLifecycleSession = Pick<
MessagingOnboardingSession,
| "createdAt"
| "detectedBusinessCategory"
| "detectedBusinessType"
| "expiresAt"
| "extractionJobId"
| "intakeExpiresAt"
| "pendingUploadsWhileProcessing"
| "processingRuns"
| "provider"
| "providerUserId"
| "sessionId"
| "state"
| "updatedAt"
| "uploads"
>;

export type MessagingIntakeClaimResult = {
  session: MessagingLifecycleSession | null;
  status: IntakeClaimStatus;
};

export type MessagingExtractionEnqueueResult = {
  jobId: string | null;
  processingRun: number | null;
  status: "created" | "expired" | "session_cap" | "weekly_cap" | "skipped";
};

export type MessagingExtractionFinalizeResult = {
  session: MessagingLifecycleSession | null;
  status: "expired" | "finalized" | "skipped" | "uploads_changed";
};

export interface MessagingAssetValidationCommitData {
  detectedBusinessCategory: string;
  detectedBusinessType: string;
  extractedBusinessInfo: ExtractedBusinessInfo | null;
  invalidFiles: string[];
  menuCompleteness: MessagingOnboardingSession["menuCompleteness"];
  typeConfidence: MessagingOnboardingSession["typeConfidence"];
  typeSource: MessagingOnboardingSession["typeSource"];
  validationConfidence: MessagingOnboardingSession["validationConfidence"];
  validMenuFiles: string[];
}

export interface MessagingExtractionSuccessData {
  extractedBusinessProfile: ExtractedBusinessProfile | null;
  extractedMenuData: unknown;
  extractedProjectFiles: unknown[];
  previewToken: string;
  previewUrl: string;
  qualityScore: number | null;
}

function readNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function readTimestampMillis(value: unknown): number | null {
  if (!isRecord(value) || typeof value.toMillis !== "function") return null;
  try {
    const millis = value.toMillis.call(value);
    return typeof millis === "number" && Number.isFinite(millis) ? millis : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertMessagingSessionDocumentSize(value: unknown): void {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new Error("MESSAGING_ONBOARDING_SESSION_DOCUMENT_INVALID");
  }
  if (Buffer.byteLength(serialized, "utf8") > MAX_MESSAGING_SESSION_DOCUMENT_JSON_BYTES) {
    throw new Error("MESSAGING_ONBOARDING_SESSION_DOCUMENT_TOO_LARGE");
  }
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maxLength
    && value === value.trim()
    && !value.includes("\0");
}

function normalizeNullableBoundedString(value: unknown, maxLength: number): string | null | undefined {
  if (value === null) return null;
  return isBoundedString(value, maxLength) ? value : undefined;
}

function isMessagingState(value: unknown): value is MessagingOnboardingState {
  switch (value) {
    case "COLLECTING_INPUT":
    case "VALIDATING_ASSETS":
    case "AWAITING_MORE_UPLOADS":
    case "PROCESSING_MENU":
    case "PREVIEW_READY":
    case "AWAITING_APPROVAL":
    case "PUBLISHING":
    case "LIVE":
    case "FAILED":
    case "EXPIRED":
    case "COOLDOWN":
      return true;
    default:
      return false;
  }
}

function isAllowedExtractionUploadMime(value: unknown): value is string {
  return typeof value === "string"
    && MESSAGING_ONBOARDING_MENU_UPLOAD_MIME_TYPES.some((mimeType) => mimeType === value);
}

function isSafeStoredUrl(value: unknown): value is string {
  if (!isBoundedString(value, 2048)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function normalizeLifecycleUpload(value: unknown): SessionUpload | null {
  if (!isRecord(value)) return null;
  const uploadedAt = readTimestampMillis(value.uploadedAt);
  const fileName = value.fileName;
  let normalizedFileName: string | undefined;
  if (fileName !== undefined) {
    if (!isBoundedString(fileName, 180)) return null;
    normalizedFileName = fileName;
  }
  if (
    !isBoundedString(value.id, 160)
    || !isBoundedString(value.providerMediaId, 256)
    || !isBoundedString(value.storagePath, 512)
    || !value.storagePath.startsWith("messagingOnboarding/")
    || !isSafeStoredUrl(value.storageUrl)
    || !isAllowedExtractionUploadMime(value.mimeType)
    || typeof value.fileSize !== "number"
    || !Number.isSafeInteger(value.fileSize)
    || value.fileSize <= 0
    || value.fileSize > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES
    || typeof value.sha256 !== "string"
    || !/^[0-9a-f]{64}$/.test(value.sha256)
    || uploadedAt === null
  ) {
    return null;
  }
  return {
    ...(normalizedFileName === undefined ? {} : { fileName: normalizedFileName }),
    fileSize: value.fileSize,
    id: value.id,
    mimeType: value.mimeType,
    providerMediaId: value.providerMediaId,
    sha256: value.sha256,
    storagePath: value.storagePath,
    storageUrl: value.storageUrl,
    uploadedAt: Timestamp.fromMillis(uploadedAt),
  };
}

function normalizeLifecycleUploads(value: unknown): SessionUpload[] | null {
  if (!Array.isArray(value) || value.length > UPLOAD_LIMITS.MAX_IMAGES_PER_SESSION) {
    return null;
  }
  const uploads: SessionUpload[] = [];
  const ids = new Set<string>();
  const providerMediaIds = new Set<string>();
  const hashes = new Set<string>();
  for (const candidate of value) {
    const upload = normalizeLifecycleUpload(candidate);
    if (
      !upload
      || ids.has(upload.id)
      || providerMediaIds.has(upload.providerMediaId)
      || hashes.has(upload.sha256)
    ) {
      return null;
    }
    ids.add(upload.id);
    providerMediaIds.add(upload.providerMediaId);
    hashes.add(upload.sha256);
    uploads.push(upload);
  }
  return uploads;
}

function hasCurrentStateHistory(value: unknown, currentState: MessagingOnboardingState): boolean {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) return false;
  const last = value[value.length - 1];
  return isRecord(last)
    && last.state === currentState
    && readTimestampMillis(last.timestamp) !== null;
}

export function readMessagingLifecycleSession(
  value: unknown,
  expectedSessionId: string,
): MessagingLifecycleSession {
  if (!isRecord(value)) throw new Error("MESSAGING_ONBOARDING_SESSION_INVALID");
  const sessionId = isBoundedString(value.sessionId, 160) ? value.sessionId : null;
  const provider = value.provider === "whatsapp" || value.provider === "telegram"
    ? value.provider
    : null;
  const providerUserId = isBoundedString(value.providerUserId, 160)
    ? value.providerUserId
    : null;
  const state = isMessagingState(value.state) ? value.state : null;
  const createdAt = readTimestampMillis(value.createdAt);
  const expiresAt = readTimestampMillis(value.expiresAt);
  const updatedAt = readTimestampMillis(value.updatedAt);
  const intakeExpiresAt = value.intakeExpiresAt === null
    ? null
    : readTimestampMillis(value.intakeExpiresAt);
  const processingRuns = readNonNegativeInteger(value.processingRuns);
  const uploads = normalizeLifecycleUploads(value.uploads);
  const extractionJobId = normalizeNullableBoundedString(value.extractionJobId, 160);
  const detectedBusinessType = normalizeNullableBoundedString(value.detectedBusinessType, 160);
  const detectedBusinessCategory = normalizeNullableBoundedString(value.detectedBusinessCategory, 160);
  if (processingRuns === null) {
    throw new Error("MESSAGING_ONBOARDING_SESSION_PROCESSING_COUNT_INVALID");
  }
  const pendingUploadsWhileProcessing = typeof value.pendingUploadsWhileProcessing === "boolean"
    ? value.pendingUploadsWhileProcessing
    : null;
  if (
    sessionId !== expectedSessionId
    || provider === null
    || providerUserId === null
    || state === null
    || !hasCurrentStateHistory(value.stateHistory, state)
    || createdAt === null
    || expiresAt === null
    || expiresAt <= createdAt
    || updatedAt === null
    || intakeExpiresAt === null && value.intakeExpiresAt !== null
    || !uploads
    || (sessionId !== null
      && uploads?.some((upload) => !upload.storagePath.startsWith(`messagingOnboarding/${sessionId}/`)))
    || extractionJobId === undefined
    || detectedBusinessType === undefined
    || detectedBusinessCategory === undefined
    || pendingUploadsWhileProcessing === null
    || (uploads?.length === 0
      && state !== "COLLECTING_INPUT"
      && state !== "AWAITING_MORE_UPLOADS")
  ) {
    throw new Error("MESSAGING_ONBOARDING_SESSION_INVALID");
  }
  return {
    createdAt: Timestamp.fromMillis(createdAt),
    detectedBusinessCategory,
    detectedBusinessType,
    expiresAt: Timestamp.fromMillis(expiresAt),
    extractionJobId,
    intakeExpiresAt: intakeExpiresAt === null ? null : Timestamp.fromMillis(intakeExpiresAt),
    pendingUploadsWhileProcessing,
    processingRuns,
    provider,
    providerUserId,
    sessionId,
    state,
    updatedAt: Timestamp.fromMillis(updatedAt),
    uploads,
  };
}

function isLifecycleSessionExpired(
  session: Pick<MessagingLifecycleSession, "expiresAt">,
  now: Timestamp,
): boolean {
  return session.expiresAt.toMillis() <= now.toMillis();
}

function buildLifecycleExpiryUpdate(
  state: MessagingOnboardingState,
  now: Timestamp,
  reason: string,
): Record<string, unknown> {
  const interrupted = state === "VALIDATING_ASSETS"
    || state === "PROCESSING_MENU"
    || state === "PUBLISHING";
  const historyEntries = interrupted
    ? [
      buildStateHistoryEntry("FAILED", now, "Interrupted work exceeded the session lifetime"),
      buildStateHistoryEntry("EXPIRED", now, reason),
    ]
    : [buildStateHistoryEntry("EXPIRED", now, reason)];

  return {
    confirmationPending: false,
    confirmationMessageLeaseToken: null,
    confirmationMessageLeaseUntil: null,
    fixMessagePending: false,
    fixMessageLeaseToken: null,
    fixMessageLeaseUntil: null,
    intakeExpiresAt: null,
    pendingUploadsWhileProcessing: false,
    previewMessagePending: false,
    previewMessageLeaseToken: null,
    previewMessageLeaseUntil: null,
    reminderMessageLeaseToken: null,
    reminderMessageLeaseUntil: null,
    state: "EXPIRED",
    stateHistory: FieldValue.arrayUnion(...historyEntries),
    updatedAt: now,
  };
}

function getNextMidnightUtc(nowMillis: number): Timestamp {
  const next = new Date(nowMillis);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(0, 0, 0, 0);
  return Timestamp.fromDate(next);
}

function getNextMondayUtc(nowMillis: number): Timestamp {
  const next = new Date(nowMillis);
  const daysUntilMonday = (8 - next.getUTCDay()) % 7 || 7;
  next.setUTCDate(next.getUTCDate() + daysUntilMonday);
  next.setUTCHours(0, 0, 0, 0);
  return Timestamp.fromDate(next);
}

function getUserHash(session: Pick<MessagingOnboardingSession, "provider" | "providerUserId">): string {
  return crypto
    .createHash("sha256")
    .update(`${session.provider}:${session.providerUserId}`)
    .digest("hex");
}

function buildStateHistoryEntry(
  state: MessagingOnboardingState,
  timestamp: Timestamp,
  reason: string,
) {
  return { reason, state, timestamp };
}

function getUploadFingerprint(upload: SessionUpload): string {
  if (
    typeof upload?.id !== "string"
    || typeof upload?.providerMediaId !== "string"
    || typeof upload?.sha256 !== "string"
    || typeof upload?.storagePath !== "string"
  ) {
    throw new Error("MESSAGING_ONBOARDING_SESSION_UPLOAD_INVALID");
  }
  return `${upload.id}\u0000${upload.providerMediaId}\u0000${upload.sha256}\u0000${upload.storagePath}`;
}

function getNextIntakeAt(uploads: SessionUpload[], now: Timestamp): Timestamp {
  const hasPdf = uploads.some((upload) => upload.mimeType === "application/pdf");
  const delayMs = hasPdf
    ? 60_000
    : uploads.length >= 4
      ? 90_000
      : 10 * 60_000;
  return Timestamp.fromMillis(now.toMillis() + delayMs);
}

/**
 * Commits a model validation only if the exact upload snapshot is still current.
 * A new upload during model execution returns the session to intake atomically.
 */
export async function commitMessagingAssetValidation(params: {
  data: MessagingAssetValidationCommitData;
  expectedUploads: readonly SessionUpload[];
  now?: Timestamp;
  sessionId: string;
}): Promise<"committed" | "expired" | "skipped" | "uploads_changed"> {
  const now = params.now || Timestamp.now();
  const sessionRef = db.collection(sessionsCol).doc(params.sessionId);
  const expectedFingerprints = params.expectedUploads.map(getUploadFingerprint);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(sessionRef);
    if (!snapshot.exists || snapshot.get("state") !== "VALIDATING_ASSETS") return "skipped";
    const session = readMessagingLifecycleSession(snapshot.data(), params.sessionId);
    if (isLifecycleSessionExpired(session, now)) {
      transaction.update(
        sessionRef,
        buildLifecycleExpiryUpdate(session.state, now, "24h session expiry during asset validation"),
      );
      return "expired";
    }

    const currentFingerprints = session.uploads.map(getUploadFingerprint);
    const uploadsChanged = currentFingerprints.length !== expectedFingerprints.length
      || currentFingerprints.some((fingerprint, index) => fingerprint !== expectedFingerprints[index]);
    if (uploadsChanged) {
      transaction.update(sessionRef, {
        extractedBusinessInfo: null,
        intakeExpiresAt: getNextIntakeAt(session.uploads, now),
        invalidFiles: [],
        menuCompleteness: null,
        pendingUploadsWhileProcessing: false,
        state: "AWAITING_MORE_UPLOADS",
        stateHistory: FieldValue.arrayUnion(
          buildStateHistoryEntry(
            "AWAITING_MORE_UPLOADS",
            now,
            "Uploads changed during validation; validating the current set",
          ),
        ),
        validMenuFiles: [],
        validationConfidence: null,
        updatedAt: now,
      });
      return "uploads_changed";
    }

    transaction.update(sessionRef, {
      detectedBusinessCategory: params.data.detectedBusinessCategory,
      detectedBusinessType: params.data.detectedBusinessType,
      extractedBusinessInfo: params.data.extractedBusinessInfo,
      invalidFiles: params.data.invalidFiles,
      menuCompleteness: params.data.menuCompleteness,
      typeConfidence: params.data.typeConfidence,
      typeSource: params.data.typeSource,
      validMenuFiles: params.data.validMenuFiles,
      validationConfidence: params.data.validationConfidence,
      updatedAt: now,
    });
    return "committed";
  });
}

/**
 * Finalizes validation failure against the same upload snapshot used by the
 * model. A concurrent upload returns the session to intake instead of losing
 * that new owner input behind a stale FAILED state.
 */
export async function failMessagingAssetValidation(params: {
  expectedUploads: readonly SessionUpload[];
  now?: Timestamp;
  sessionId: string;
}): Promise<"expired" | "failed" | "skipped" | "uploads_changed"> {
  const now = params.now || Timestamp.now();
  const sessionRef = db.collection(sessionsCol).doc(params.sessionId);
  const expectedFingerprints = params.expectedUploads.map(getUploadFingerprint);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(sessionRef);
    if (!snapshot.exists || snapshot.get("state") !== "VALIDATING_ASSETS") return "skipped";
    const session = readMessagingLifecycleSession(snapshot.data(), params.sessionId);
    if (isLifecycleSessionExpired(session, now)) {
      transaction.update(
        sessionRef,
        buildLifecycleExpiryUpdate(session.state, now, "24h session expiry during asset validation"),
      );
      return "expired";
    }
    const currentFingerprints = session.uploads.map(getUploadFingerprint);
    const uploadsChanged = currentFingerprints.length !== expectedFingerprints.length
      || currentFingerprints.some((fingerprint, index) => fingerprint !== expectedFingerprints[index]);

    if (uploadsChanged) {
      transaction.update(sessionRef, {
        extractedBusinessInfo: null,
        intakeExpiresAt: getNextIntakeAt(session.uploads, now),
        invalidFiles: [],
        menuCompleteness: null,
        pendingUploadsWhileProcessing: false,
        state: "AWAITING_MORE_UPLOADS",
        stateHistory: FieldValue.arrayUnion(
          buildStateHistoryEntry(
            "AWAITING_MORE_UPLOADS",
            now,
            "Uploads changed during failed validation; validating the current set",
          ),
        ),
        updatedAt: now,
        validMenuFiles: [],
        validationConfidence: null,
      });
      return "uploads_changed";
    }

    transaction.update(sessionRef, {
      intakeExpiresAt: null,
      pendingUploadsWhileProcessing: false,
      state: "FAILED",
      stateHistory: FieldValue.arrayUnion(
        buildStateHistoryEntry("FAILED", now, "Asset validation failed after bounded provider retries"),
      ),
      updatedAt: now,
    });
    return "failed";
  });
}

type MessagingWeeklyProcessingRateLimit = {
  processingRunsThisWeek: number;
  weekResetAt: Timestamp;
};

function readWeeklyProcessingRateLimit(
  value: unknown,
  expectedUserHash: string,
): MessagingWeeklyProcessingRateLimit {
  if (!isRecord(value) || value.userHash !== expectedUserHash) {
    throw new Error("MESSAGING_ONBOARDING_RATE_LIMIT_INVALID");
  }
  const count = readNonNegativeInteger(value.processingRunsThisWeek);
  const weekResetAt = readTimestampMillis(value.weekResetAt);
  if (count === null) throw new Error("MESSAGING_ONBOARDING_RATE_LIMIT_PROCESSING_COUNT_INVALID");
  if (weekResetAt === null) throw new Error("MESSAGING_ONBOARDING_RATE_LIMIT_WEEK_RESET_INVALID");
  return {
    processingRunsThisWeek: count,
    weekResetAt: Timestamp.fromMillis(weekResetAt),
  };
}

function getCurrentWeeklyProcessingState(
  rateLimit: MessagingWeeklyProcessingRateLimit | null,
  now: Timestamp,
): { count: number; resetAt: Timestamp; resetRequired: boolean } {
  const nowMillis = now.toMillis();
  if (!rateLimit) {
    return {
      count: 0,
      resetAt: getNextMondayUtc(nowMillis),
      resetRequired: true,
    };
  }
  const resetMillis = rateLimit.weekResetAt.toMillis();
  const resetRequired = resetMillis <= nowMillis;
  return {
    count: resetRequired ? 0 : rateLimit.processingRunsThisWeek,
    resetAt: resetRequired ? getNextMondayUtc(nowMillis) : rateLimit.weekResetAt,
    resetRequired,
  };
}

/**
 * Serializes overlapping scheduler runs and rechecks the mutable intake timer.
 */
export async function claimMessagingIntakeSession(
  sessionId: string,
  now: Timestamp = Timestamp.now(),
): Promise<MessagingIntakeClaimResult> {
  const sessionRef = db.collection(sessionsCol).doc(sessionId);

  return db.runTransaction(async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);
    if (!sessionSnapshot.exists) return { session: null, status: "skipped" };

    const persistedState = sessionSnapshot.get("state");
    if (persistedState !== "COLLECTING_INPUT" && persistedState !== "AWAITING_MORE_UPLOADS") {
      return { session: null, status: "skipped" };
    }

    let session: MessagingLifecycleSession;
    try {
      session = readMessagingLifecycleSession(sessionSnapshot.data(), sessionId);
    } catch {
      transaction.update(sessionRef, {
        intakeExpiresAt: null,
        state: "FAILED",
        stateHistory: [
          buildStateHistoryEntry("FAILED", now, "Persisted intake session data was invalid"),
        ],
        updatedAt: now,
      });
      return { session: null, status: "invalid" };
    }

    if (isLifecycleSessionExpired(session, now)) {
      transaction.update(
        sessionRef,
        buildLifecycleExpiryUpdate(session.state, now, "24h session expiry before intake processing"),
      );
      return {
        session: { ...session, intakeExpiresAt: null, state: "EXPIRED", updatedAt: now },
        status: "expired",
      };
    }

    const intakeExpiresAtMillis = readTimestampMillis(session.intakeExpiresAt);
    if (intakeExpiresAtMillis === null || intakeExpiresAtMillis > now.toMillis()) {
      return { session, status: "skipped" };
    }

    if (!Array.isArray(session.uploads) || session.uploads.length === 0) {
      transaction.update(sessionRef, {
        intakeExpiresAt: null,
        state: "EXPIRED",
        stateHistory: FieldValue.arrayUnion(
          buildStateHistoryEntry("EXPIRED", now, "No uploads received before intake window closed"),
        ),
        updatedAt: now,
      });
      return { session: { ...session, state: "EXPIRED" }, status: "expired" };
    }

    const processingRuns = readNonNegativeInteger(session.processingRuns);
    if (processingRuns === null) {
      throw new Error("MESSAGING_ONBOARDING_SESSION_PROCESSING_COUNT_INVALID");
    }
    if (processingRuns >= PROCESSING.MAX_PROCESSING_RUNS_PER_SESSION) {
      transaction.update(sessionRef, { intakeExpiresAt: null, updatedAt: now });
      return { session, status: "session_cap" };
    }

    const rateLimitRef = db.collection(rateLimitsCol).doc(getUserHash(session));
    const rateLimitSnapshot = await transaction.get(rateLimitRef);
    let weekly: ReturnType<typeof getCurrentWeeklyProcessingState>;
    try {
      weekly = getCurrentWeeklyProcessingState(
        rateLimitSnapshot.exists
          ? readWeeklyProcessingRateLimit(rateLimitSnapshot.data(), rateLimitRef.id)
          : null,
        now,
      );
    } catch {
      transaction.update(sessionRef, {
        intakeExpiresAt: null,
        state: "FAILED",
        stateHistory: FieldValue.arrayUnion(
          buildStateHistoryEntry("FAILED", now, "Persisted processing quota data was invalid"),
        ),
        updatedAt: now,
      });
      return { session: { ...session, intakeExpiresAt: null, state: "FAILED", updatedAt: now }, status: "invalid" };
    }

    if (weekly.count >= RATE_LIMITS.MAX_PROCESSING_RUNS_PER_WEEK) {
      transaction.update(sessionRef, {
        intakeExpiresAt: weekly.resetAt,
        updatedAt: now,
      });
      return { session, status: "weekly_cap" };
    }

    transaction.update(sessionRef, {
      intakeExpiresAt: null,
      state: "VALIDATING_ASSETS",
      stateHistory: FieldValue.arrayUnion(
        buildStateHistoryEntry("VALIDATING_ASSETS", now, "Intake window closed, starting validation"),
      ),
      updatedAt: now,
    });

    return {
      session: { ...session, intakeExpiresAt: null, state: "VALIDATING_ASSETS", updatedAt: now },
      status: "claimed",
    };
  });
}

function selectJobUploads(
  session: MessagingLifecycleSession,
  validUploadIds: readonly string[],
): SessionUpload[] {
  if (!Array.isArray(validUploadIds) || validUploadIds.length === 0) {
    throw new Error("MESSAGING_ONBOARDING_EXTRACTION_FILES_REQUIRED");
  }

  const requestedIds = new Set<string>();
  for (const value of validUploadIds) {
    if (typeof value !== "string" || !value.trim() || requestedIds.has(value)) {
      throw new Error("MESSAGING_ONBOARDING_EXTRACTION_FILE_IDS_INVALID");
    }
    requestedIds.add(value);
  }

  if (!Array.isArray(session.uploads)) {
    throw new Error("MESSAGING_ONBOARDING_SESSION_UPLOADS_INVALID");
  }

  const selected = session.uploads.filter((upload) => requestedIds.has(upload.id));
  if (selected.length !== requestedIds.size) {
    throw new Error("MESSAGING_ONBOARDING_EXTRACTION_FILE_NOT_FOUND");
  }

  for (const upload of selected) {
    if (
      typeof upload.id !== "string"
      || !upload.id.trim()
      || typeof upload.storageUrl !== "string"
      || !upload.storageUrl.startsWith("https://")
      || typeof upload.fileSize !== "number"
      || !Number.isSafeInteger(upload.fileSize)
      || upload.fileSize <= 0
      || upload.fileSize > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES
      || !MESSAGING_ONBOARDING_MENU_UPLOAD_MIME_TYPES.includes(
        upload.mimeType as (typeof MESSAGING_ONBOARDING_MENU_UPLOAD_MIME_TYPES)[number],
      )
    ) {
      throw new Error("MESSAGING_ONBOARDING_EXTRACTION_FILE_INVALID");
    }
  }

  return selected;
}

/**
 * Atomically creates the job, binds it to the session, advances the state, and
 * consumes the weekly processing quota.
 */
export async function enqueueMessagingExtractionJob(params: {
  businessCategory: string;
  businessType: string;
  sessionId: string;
  validUploadIds: readonly string[];
  now?: Timestamp;
}): Promise<MessagingExtractionEnqueueResult> {
  const now = params.now || Timestamp.now();
  const sessionRef = db.collection(sessionsCol).doc(params.sessionId);
  const jobRef = db.collection(MENU_IMAGE_PROCESSING_JOBS_COLLECTION).doc();

  return db.runTransaction(async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);
    if (!sessionSnapshot.exists) return { jobId: null, processingRun: null, status: "skipped" };

    const session = readMessagingLifecycleSession(sessionSnapshot.data(), params.sessionId);
    if (session.state !== "VALIDATING_ASSETS" || session.extractionJobId) {
      return { jobId: null, processingRun: null, status: "skipped" };
    }
    if (isLifecycleSessionExpired(session, now)) {
      transaction.update(
        sessionRef,
        buildLifecycleExpiryUpdate(session.state, now, "24h session expiry before extraction enqueue"),
      );
      return { jobId: null, processingRun: null, status: "expired" };
    }

    const processingRuns = readNonNegativeInteger(session.processingRuns);
    if (processingRuns === null) {
      throw new Error("MESSAGING_ONBOARDING_SESSION_PROCESSING_COUNT_INVALID");
    }
    if (processingRuns >= PROCESSING.MAX_PROCESSING_RUNS_PER_SESSION) {
      transaction.update(sessionRef, {
        intakeExpiresAt: null,
        state: "AWAITING_MORE_UPLOADS",
        stateHistory: FieldValue.arrayUnion(
          buildStateHistoryEntry("AWAITING_MORE_UPLOADS", now, "Session extraction cap reached"),
        ),
        updatedAt: now,
      });
      return { jobId: null, processingRun: null, status: "session_cap" };
    }

    const rateLimitRef = db.collection(rateLimitsCol).doc(getUserHash(session));
    const rateLimitSnapshot = await transaction.get(rateLimitRef);
    const rateLimit = rateLimitSnapshot.exists
      ? readWeeklyProcessingRateLimit(rateLimitSnapshot.data(), rateLimitRef.id)
      : null;
    const weekly = getCurrentWeeklyProcessingState(rateLimit, now);

    if (weekly.count >= RATE_LIMITS.MAX_PROCESSING_RUNS_PER_WEEK) {
      transaction.update(sessionRef, {
        intakeExpiresAt: weekly.resetAt,
        state: "AWAITING_MORE_UPLOADS",
        stateHistory: FieldValue.arrayUnion(
          buildStateHistoryEntry("AWAITING_MORE_UPLOADS", now, "Weekly extraction cap reached"),
        ),
        updatedAt: now,
      });
      return { jobId: null, processingRun: null, status: "weekly_cap" };
    }

    const selectedUploads = selectJobUploads(session, params.validUploadIds);
    const processingRun = processingRuns + 1;
    const destination = buildMessagingOnboardingMenuExtractionDestination(params.sessionId);
    const businessTypeConfig = getBusinessTypeConfig(params.businessType);
    const businessType = businessTypeConfig?.value || FALLBACK_BUSINESS_TYPE;
    const businessCategory = resolveStoreBusinessCategory(businessType, params.businessCategory);
    const jobData = {
      action: "IMAGE_PROCESSING",
      businessCategory,
      businessType,
      createdAt: now,
      currentStep: "Queued",
      files: selectedUploads.map((upload) => ({
        name: upload.fileName || upload.id,
        size: upload.fileSize,
        type: upload.mimeType,
        uid: upload.id,
        url: upload.storageUrl,
      })),
      id: jobRef.id,
      progress: 0,
      projectId: `msg-onboarding-${params.sessionId}`,
      skipProjectSave: true,
      source: MENU_EXTRACTION_SOURCES.MESSAGING_ONBOARDING,
      status: "pending",
      targetLanguages: [{ code: "en", name: "English" }],
      updatedAt: now,
      ...buildMenuExtractionRoutingFields(destination),
    };

    transaction.create(jobRef, jobData);
    transaction.update(sessionRef, {
      extractionJobId: jobRef.id,
      processingRuns: processingRun,
      state: "PROCESSING_MENU",
      stateHistory: FieldValue.arrayUnion(
        buildStateHistoryEntry("PROCESSING_MENU", now, "Extraction job created"),
      ),
      updatedAt: now,
    });

    const rateLimitUpdate: Record<string, unknown> = {
      lastSessionAt: now,
      processingRunsThisWeek: weekly.count + 1,
      userHash: getUserHash(session),
      weekResetAt: weekly.resetAt,
    };
    if (weekly.resetRequired) rateLimitUpdate.sessionsThisWeek = rateLimitSnapshot.exists ? 0 : 1;
    if (!rateLimitSnapshot.exists) {
      Object.assign(rateLimitUpdate, {
        cooldownUntil: null,
        dayResetAt: getNextMidnightUtc(now.toMillis()),
        sessionsToday: 1,
      });
    }
    transaction.set(rateLimitRef, rateLimitUpdate, { merge: true });

    return { jobId: jobRef.id, processingRun, status: "created" };
  });
}

export async function finalizeMessagingExtractionSuccess(params: {
  data: MessagingExtractionSuccessData;
  jobId: string;
  sessionId: string;
  now?: Timestamp;
}): Promise<MessagingExtractionFinalizeResult> {
  const now = params.now || Timestamp.now();
  const sessionRef = db.collection(sessionsCol).doc(params.sessionId);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(sessionRef);
    if (!snapshot.exists) return { session: null, status: "skipped" };
    const session = readMessagingLifecycleSession(snapshot.data(), params.sessionId);
    if (session.state !== "PROCESSING_MENU" || session.extractionJobId !== params.jobId) {
      return { session, status: "skipped" };
    }
    if (isLifecycleSessionExpired(session, now)) {
      transaction.update(sessionRef, {
        ...buildLifecycleExpiryUpdate(
          session.state,
          now,
          "24h session expiry before extraction completion",
        ),
        extractionCompletedJobId: params.jobId,
        extractionJobId: null,
      });
      return {
        session: {
          ...session,
          extractionJobId: null,
          intakeExpiresAt: null,
          pendingUploadsWhileProcessing: false,
          state: "EXPIRED",
          updatedAt: now,
        },
        status: "expired",
      };
    }

    if (session.pendingUploadsWhileProcessing) {
      transaction.update(sessionRef, {
        extractionCompletedJobId: params.jobId,
        extractionJobId: null,
        intakeExpiresAt: getNextIntakeAt(session.uploads, now),
        invalidFiles: [],
        menuCompleteness: null,
        pendingUploadsWhileProcessing: false,
        state: "AWAITING_MORE_UPLOADS",
        stateHistory: FieldValue.arrayUnion(
          buildStateHistoryEntry(
            "AWAITING_MORE_UPLOADS",
            now,
            "New uploads arrived during extraction; validating the current set",
          ),
        ),
        updatedAt: now,
        validMenuFiles: [],
        validationConfidence: null,
      });
      return {
        session: {
          ...session,
          extractionJobId: null,
          intakeExpiresAt: getNextIntakeAt(session.uploads, now),
          pendingUploadsWhileProcessing: false,
          state: "AWAITING_MORE_UPLOADS",
          updatedAt: now,
        },
        status: "uploads_changed",
      };
    }

    const previewReadyHistoryEntry = buildStateHistoryEntry(
      "PREVIEW_READY",
      now,
      "Extraction complete, preview generated",
    );
    const awaitingApprovalHistoryEntry = buildStateHistoryEntry(
      "AWAITING_APPROVAL",
      now,
      "Preview ready, awaiting owner approval",
    );
    const successUpdate = {
      extractedBusinessProfile: params.data.extractedBusinessProfile,
      extractedMenuData: params.data.extractedMenuData,
      extractedProjectFiles: params.data.extractedProjectFiles,
      extractionCompletedJobId: params.jobId,
      fixMessageDeliveryAttempts: 0,
      fixMessageLeaseToken: null,
      fixMessageLeaseUntil: null,
      fixMessagePending: false,
      previewMessageDeliveryAttempts: 0,
      previewMessageLeaseToken: null,
      previewMessageLeaseUntil: null,
      previewMessagePending: true,
      previewToken: params.data.previewToken,
      previewUrl: params.data.previewUrl,
      qualityScore: params.data.qualityScore,
      reminderMessageLeaseToken: null,
      reminderMessageLeaseUntil: null,
      reminderSentAt: null,
      replacementUploads: [],
      state: "AWAITING_APPROVAL",
      stateHistory: FieldValue.arrayUnion(
        previewReadyHistoryEntry,
        awaitingApprovalHistoryEntry,
      ),
      updatedAt: now,
    };
    const persisted = snapshot.data();
    assertMessagingSessionDocumentSize({
      ...persisted,
      ...successUpdate,
      stateHistory: [
        ...(Array.isArray(persisted?.stateHistory) ? persisted.stateHistory : []),
        previewReadyHistoryEntry,
        awaitingApprovalHistoryEntry,
      ],
    });
    transaction.update(sessionRef, successUpdate);

    return {
      session: {
        ...session,
        extractedBusinessProfile: params.data.extractedBusinessProfile,
        extractedMenuData: params.data.extractedMenuData,
        extractedProjectFiles: params.data.extractedProjectFiles,
        previewMessagePending: true,
        previewToken: params.data.previewToken,
        previewUrl: params.data.previewUrl,
        qualityScore: params.data.qualityScore,
        state: "AWAITING_APPROVAL",
        updatedAt: now,
      },
      status: "finalized",
    };
  });
}

export async function finalizeMessagingExtractionFailure(params: {
  jobId: string;
  reason: string;
  sessionId: string;
  now?: Timestamp;
}): Promise<MessagingExtractionFinalizeResult> {
  const now = params.now || Timestamp.now();
  const sessionRef = db.collection(sessionsCol).doc(params.sessionId);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(sessionRef);
    if (!snapshot.exists) return { session: null, status: "skipped" };
    const session = readMessagingLifecycleSession(snapshot.data(), params.sessionId);
    if (session.state !== "PROCESSING_MENU" || session.extractionJobId !== params.jobId) {
      return { session, status: "skipped" };
    }
    if (isLifecycleSessionExpired(session, now)) {
      transaction.update(sessionRef, {
        ...buildLifecycleExpiryUpdate(
          session.state,
          now,
          "24h session expiry before extraction failure handling",
        ),
        extractionCompletedJobId: params.jobId,
        extractionJobId: null,
      });
      return {
        session: {
          ...session,
          extractionJobId: null,
          intakeExpiresAt: null,
          pendingUploadsWhileProcessing: false,
          state: "EXPIRED",
          updatedAt: now,
        },
        status: "expired",
      };
    }

    if (session.pendingUploadsWhileProcessing) {
      const intakeExpiresAt = getNextIntakeAt(session.uploads, now);
      transaction.update(sessionRef, {
        extractionCompletedJobId: params.jobId,
        extractionJobId: null,
        intakeExpiresAt,
        invalidFiles: [],
        menuCompleteness: null,
        pendingUploadsWhileProcessing: false,
        state: "AWAITING_MORE_UPLOADS",
        stateHistory: FieldValue.arrayUnion(
          buildStateHistoryEntry(
            "AWAITING_MORE_UPLOADS",
            now,
            "New uploads arrived before extraction failed; validating the current set",
          ),
        ),
        updatedAt: now,
        validMenuFiles: [],
        validationConfidence: null,
      });
      return {
        session: {
          ...session,
          extractionJobId: null,
          intakeExpiresAt,
          pendingUploadsWhileProcessing: false,
          state: "AWAITING_MORE_UPLOADS",
          updatedAt: now,
        },
        status: "uploads_changed",
      };
    }

    transaction.update(sessionRef, {
      extractionCompletedJobId: params.jobId,
      state: "FAILED",
      stateHistory: FieldValue.arrayUnion(
        buildStateHistoryEntry("FAILED", now, params.reason),
      ),
      updatedAt: now,
    });

    return { session: { ...session, state: "FAILED", updatedAt: now }, status: "finalized" };
  });
}
