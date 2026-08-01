/**
 * Session Engine — Core State Machine Logic (Provider-Agnostic)
 *
 * Handles session CRUD, state transitions, upload management,
 * rate limiting, and message routing.
 *
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §4.1, §7 Phase 1
 */

import * as crypto from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import { DB_COLLECTIONS } from "../constants/database";
import { firestoreAdmin, storageAdmin } from "../firebaseAdmin";
import {
  MAX_MESSAGING_REPLACEMENT_UPLOADS,
  mergeMessagingPendingUploadCleanupPaths,
  normalizeMessagingPendingUploadCleanupPaths,
} from "../sharedData/messagingReplacementUploads";
import {
  MessagingOnboardingRateLimit,
  MessagingOnboardingSession,
  MessagingOnboardingState,
  MessagingProvider,
  NormalizedMessage,
  SessionUpload,
  StateHistoryEntry,
  TERMINAL_STATES,
} from "../types/messagingOnboarding.types";
import {
  isTransitionForbidden,
  MESSAGES,
  PROCESSING,
  RATE_LIMITS,
  RETENTION,
  TIMING,
  UPLOAD_LIMITS,
} from "./constants";
import { logOnboardingEvent, maskUserId } from "./eventLogger";
import { normalizeMessagingPublishedResult } from "./publishedResultBoundary";
import { IMessagingProvider } from "./providers/IMessagingProvider";
import { validateMessagingUploadContent } from "./uploadContentValidation";
import { drainMessagingPendingUploadCleanup } from "./uploadCleanup";
import { getBoundedFunctionsErrorName, getBoundedFunctionsErrorCode } from '../utils/boundedErrorContext';

const logger = functions.logger;
const db = firestoreAdmin;
const sessionsCol = DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS;
const rateLimitsCol = DB_COLLECTIONS.MESSAGING_ONBOARDING_RATE_LIMITS;
const SESSION_ADMISSION_ACTIVE_CODE = "SESSION_ADMISSION_ACTIVE";
const SESSION_ADMISSION_INVALID_CODE = "SESSION_ADMISSION_INVALID";
const SESSION_LOOKUP_INVALID_CODE = "MESSAGING_SESSION_LOOKUP_INVALID";
const SESSION_LOOKUP_AMBIGUOUS_CODE = "MESSAGING_SESSION_LOOKUP_AMBIGUOUS";
const SESSION_UPLOAD_MIME_TYPES = new Set<string>(UPLOAD_LIMITS.ALLOWED_MIME_TYPES);

type MessagingOnboardingRoutingSession = Pick<
MessagingOnboardingSession,
| "createdAt"
| "expiresAt"
| "processingRuns"
| "provider"
| "providerDisplayId"
| "providerMessageIds"
| "providerUserId"
| "replacementUploads"
| "pendingUploadCleanupPaths"
| "previewUrl"
| "publishedResult"
| "sessionId"
| "state"
| "stateHistory"
| "uploads"
| "uploadCleanupPending"
>;

type SessionAdmissionReason =
  | "active_session"
  | "cooldown"
  | "daily_limit"
  | "invalid_state"
  | "weekly_limit";

class SessionAdmissionError extends Error {
  readonly code: string;
  readonly reason: SessionAdmissionReason;

  constructor(reason: SessionAdmissionReason) {
    super(reason === "active_session" ? SESSION_ADMISSION_ACTIVE_CODE : SESSION_ADMISSION_INVALID_CODE);
    this.name = "SessionAdmissionError";
    this.code = this.message;
    this.reason = reason;
  }
}

function isSessionAdmissionError(error: unknown): error is SessionAdmissionError {
  return error instanceof SessionAdmissionError;
}

function readTimestampMillis(value: unknown): number | null {
  if (!isSessionRecord(value) || typeof value.toMillis !== "function") return null;
  try {
    const millis = value.toMillis.call(value);
    return typeof millis === "number" && Number.isFinite(millis) ? millis : null;
  } catch {
    return null;
  }
}

function readNonNegativeCounter(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function normalizeRateLimitDocument(
  value: unknown,
  expectedUserHash: string,
): MessagingOnboardingRateLimit | null {
  if (!isSessionRecord(value) || value.userHash !== expectedUserHash) return null;
  const sessionsToday = readNonNegativeCounter(value.sessionsToday);
  const sessionsThisWeek = readNonNegativeCounter(value.sessionsThisWeek);
  const processingRunsThisWeek = readNonNegativeCounter(value.processingRunsThisWeek);
  const lastSessionAt = readTimestampMillis(value.lastSessionAt);
  const dayResetAt = readTimestampMillis(value.dayResetAt);
  const weekResetAt = readTimestampMillis(value.weekResetAt);
  const cooldownUntil = value.cooldownUntil === null
    ? null
    : readTimestampMillis(value.cooldownUntil);
  const rawActiveSessionId = value.activeSessionId;
  let activeSessionId: string | null | undefined;
  if (rawActiveSessionId === undefined) {
    activeSessionId = undefined;
  } else if (rawActiveSessionId === null) {
    activeSessionId = null;
  } else if (
    isBoundedSessionString(rawActiveSessionId, 160)
    && /^[A-Za-z0-9_-]+$/.test(rawActiveSessionId)
  ) {
    activeSessionId = rawActiveSessionId;
  } else {
    return null;
  }
  if (
    sessionsToday === null
    || sessionsThisWeek === null
    || processingRunsThisWeek === null
    || lastSessionAt === null
    || dayResetAt === null
    || weekResetAt === null
    || cooldownUntil === null && value.cooldownUntil !== null
  ) {
    return null;
  }
  return {
    ...(activeSessionId === undefined ? {} : { activeSessionId }),
    cooldownUntil: cooldownUntil === null ? null : Timestamp.fromMillis(cooldownUntil),
    dayResetAt: Timestamp.fromMillis(dayResetAt),
    lastSessionAt: Timestamp.fromMillis(lastSessionAt),
    processingRunsThisWeek,
    sessionsThisWeek,
    sessionsToday,
    userHash: expectedUserHash,
    weekResetAt: Timestamp.fromMillis(weekResetAt),
  };
}

function getSessionEngineIdLogContext(
  label: string,
  value: unknown,
): Record<string, boolean | number> {
  const normalized = value === undefined || value === null ? "" : String(value);
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

function getSessionEngineErrorName(error: unknown): string {
    return getBoundedFunctionsErrorName(error) || 'Error';
}

function getSessionEngineErrorCode(error: unknown): string | undefined {
    return getBoundedFunctionsErrorCode(error);
}

function getSessionEngineErrorContext(error: unknown): Record<string, string | undefined> {
  return {
    errorName: getSessionEngineErrorName(error),
    errorCode: getSessionEngineErrorCode(error),
  };
}

function isBoundedSessionString(value: unknown, maxLength: number): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maxLength
    && value === value.trim()
    && !value.includes("\0");
}

function isSessionRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMessagingOnboardingState(value: unknown): value is MessagingOnboardingState {
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

function isSafeMessagingOwnerUrl(value: unknown): value is string {
  if (!isBoundedSessionString(value, 2048)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && Boolean(url.hostname)
      && !url.username
      && !url.password;
  } catch {
    return false;
  }
}

function normalizeSessionStateHistory(value: unknown): StateHistoryEntry[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) return null;
  const history: StateHistoryEntry[] = [];
  for (const candidate of value) {
    if (!isSessionRecord(candidate) || !isMessagingOnboardingState(candidate.state)) {
      return null;
    }
    const reason = candidate.reason;
    const timestampMillis = readTimestampMillis(candidate.timestamp);
    if (timestampMillis === null) return null;
    let normalizedReason: string | undefined;
    if (reason !== undefined) {
      if (!isBoundedSessionString(reason, 500)) return null;
      normalizedReason = reason;
    }
    history.push({
      ...(normalizedReason === undefined ? {} : { reason: normalizedReason }),
      state: candidate.state,
      timestamp: Timestamp.fromMillis(timestampMillis),
    });
  }
  return history;
}

function normalizeRoutingUpload(value: unknown): SessionUpload | null {
  if (!isSessionRecord(value)) return null;
  const uploadedAtMillis = readTimestampMillis(value.uploadedAt);
  const fileName = value.fileName;
  let normalizedFileName: string | undefined;
  if (fileName !== undefined) {
    if (!isBoundedSessionString(fileName, 180)) return null;
    normalizedFileName = fileName;
  }
  if (
    !isBoundedSessionString(value.id, 160)
    || !isBoundedSessionString(value.providerMediaId, 256)
    || !isBoundedSessionString(value.storagePath, 512)
    || !value.storagePath.startsWith("messagingOnboarding/")
    || !isSafeMessagingOwnerUrl(value.storageUrl)
    || typeof value.mimeType !== "string"
    || !SESSION_UPLOAD_MIME_TYPES.has(value.mimeType)
    || typeof value.fileSize !== "number"
    || !Number.isSafeInteger(value.fileSize)
    || value.fileSize <= 0
    || value.fileSize > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES
    || typeof value.sha256 !== "string"
    || !/^[0-9a-f]{64}$/.test(value.sha256)
    || uploadedAtMillis === null
  ) {
    return null;
  }
  return {
    fileSize: value.fileSize,
    id: value.id,
    mimeType: value.mimeType,
    providerMediaId: value.providerMediaId,
    sha256: value.sha256,
    storagePath: value.storagePath,
    storageUrl: value.storageUrl,
    uploadedAt: Timestamp.fromMillis(uploadedAtMillis),
    ...(normalizedFileName === undefined ? {} : { fileName: normalizedFileName }),
  };
}

function normalizeRoutingUploads(
  value: unknown,
  expectedSessionId: string,
  options: { allowEmpty?: boolean; max?: number } = {},
): SessionUpload[] | null {
  if (
    !Array.isArray(value)
    || (!options.allowEmpty && value.length === 0)
    || value.length > (options.max ?? UPLOAD_LIMITS.MAX_IMAGES_PER_SESSION)
  ) {
    return null;
  }
  const uploads: SessionUpload[] = [];
  const uploadIds = new Set<string>();
  const mediaIds = new Set<string>();
  const hashes = new Set<string>();
  for (const candidate of value) {
    const upload = normalizeRoutingUpload(candidate);
    if (
      !upload
      || !upload.storagePath.startsWith(`messagingOnboarding/${expectedSessionId}/`)
      || uploadIds.has(upload.id)
      || mediaIds.has(upload.providerMediaId)
      || hashes.has(upload.sha256)
    ) {
      return null;
    }
    uploadIds.add(upload.id);
    mediaIds.add(upload.providerMediaId);
    hashes.add(upload.sha256);
    uploads.push(upload);
  }
  return uploads;
}

function readSessionLookupDocument(
  doc: FirebaseFirestore.QueryDocumentSnapshot,
  provider: MessagingProvider,
  providerUserId: string,
): MessagingOnboardingRoutingSession {
  const value: unknown = doc.data();
  if (!isSessionRecord(value)) {
    throw new Error(SESSION_LOOKUP_INVALID_CODE);
  }
  const state = isMessagingOnboardingState(value.state)
    ? value.state
    : null;
  const stateHistory = normalizeSessionStateHistory(value.stateHistory);
  const persistedUploads = normalizeRoutingUploads(value.uploads, doc.id, {
    allowEmpty: state === "COLLECTING_INPUT" || state === "AWAITING_MORE_UPLOADS",
  });
  const latestPreviewMillis = stateHistory
    ? getLatestPreviewTimestampMillis(stateHistory)
    : null;
  const legacyReplacementUploads = value.replacementUploads === undefined
    && persistedUploads
    && latestPreviewMillis !== null
    && (state === "PREVIEW_READY" || state === "AWAITING_APPROVAL" || state === "PUBLISHING")
    ? persistedUploads.filter((upload) => upload.uploadedAt.toMillis() > latestPreviewMillis)
    : [];
  const replacementUploads = value.replacementUploads === undefined
    ? legacyReplacementUploads
    : normalizeRoutingUploads(value.replacementUploads, doc.id, {
      allowEmpty: true,
      max: MAX_MESSAGING_REPLACEMENT_UPLOADS,
    });
  const uploads = persistedUploads && legacyReplacementUploads.length > 0
    ? persistedUploads.filter((upload) => !legacyReplacementUploads.some(({ id }) => id === upload.id))
    : persistedUploads;
  const pendingUploadCleanupPaths = normalizeMessagingPendingUploadCleanupPaths(
    value.pendingUploadCleanupPaths ?? [],
    doc.id,
  );
  const uploadCleanupPending = value.uploadCleanupPending ?? false;
  const createdAtMillis = readTimestampMillis(value.createdAt);
  const expiresAtMillis = readTimestampMillis(value.expiresAt);
  const processingRuns = readNonNegativeCounter(value.processingRuns);
  const publishedResult = value.publishedResult === null
    ? null
    : normalizeMessagingPublishedResult(value.publishedResult);
  const previewUrl = value.previewUrl === null
    ? null
    : isSafeMessagingOwnerUrl(value.previewUrl)
      ? value.previewUrl
      : undefined;
  const previewRequired = state === "PREVIEW_READY"
    || state === "AWAITING_APPROVAL"
    || state === "PUBLISHING"
    || state === "LIVE";
  if (
    value.sessionId !== doc.id
    || !isBoundedSessionString(value.sessionId, 160)
    || value.provider !== provider
    || value.providerUserId !== providerUserId
    || !isBoundedSessionString(value.providerDisplayId, 160)
    || state === null
    || !Array.isArray(value.providerMessageIds)
    || value.providerMessageIds.length > 500
    || value.providerMessageIds.some((id) => !isBoundedSessionString(id, 256))
    || new Set(value.providerMessageIds).size !== value.providerMessageIds.length
    || !stateHistory
    || stateHistory[stateHistory.length - 1]?.state !== state
    || !uploads
    || !replacementUploads
    || !pendingUploadCleanupPaths
    || typeof uploadCleanupPending !== "boolean"
    || uploadCleanupPending !== (pendingUploadCleanupPaths.length > 0)
    || replacementUploads.some((replacement) => (
      uploads.some((upload) => (
        upload.id === replacement.id
        || upload.providerMediaId === replacement.providerMediaId
        || upload.sha256 === replacement.sha256
        || upload.storagePath === replacement.storagePath
      ))
    ))
    || [...uploads, ...replacementUploads].some((upload) => (
      pendingUploadCleanupPaths.includes(upload.storagePath)
    ))
    || (replacementUploads.length > 0
      && state !== "PREVIEW_READY"
      && state !== "AWAITING_APPROVAL"
      && state !== "PUBLISHING")
    || createdAtMillis === null
    || expiresAtMillis === null
    || expiresAtMillis <= createdAtMillis
    || processingRuns === null
    || previewUrl === undefined
    || (previewRequired && previewUrl === null)
    || (value.publishedResult !== null && !publishedResult)
    || (state === "LIVE" && !publishedResult)
    || (state !== "LIVE" && publishedResult !== null)
  ) {
    throw new Error(SESSION_LOOKUP_INVALID_CODE);
  }
  return {
    createdAt: Timestamp.fromMillis(createdAtMillis),
    expiresAt: Timestamp.fromMillis(expiresAtMillis),
    processingRuns,
    provider,
    providerDisplayId: value.providerDisplayId,
    providerMessageIds: [...value.providerMessageIds],
    providerUserId,
    replacementUploads,
    pendingUploadCleanupPaths,
    previewUrl,
    publishedResult,
    sessionId: value.sessionId,
    state,
    stateHistory,
    uploads,
    uploadCleanupPending,
  };
}

function readSingleSessionLookup(
  docs: readonly FirebaseFirestore.QueryDocumentSnapshot[],
  provider: MessagingProvider,
  providerUserId: string,
): MessagingOnboardingRoutingSession | null {
  if (docs.length === 0) return null;
  if (docs.length > 1) throw new Error(SESSION_LOOKUP_AMBIGUOUS_CODE);
  return readSessionLookupDocument(docs[0], provider, providerUserId);
}

async function deleteStoredUpload(
  upload: SessionUpload,
  sessionId: string,
  reason: string,
): Promise<void> {
  try {
    await storageAdmin.bucket().file(upload.storagePath).delete({ ignoreNotFound: true });
  } catch (error) {
    const cleanupContext = {
      ...getSessionEngineIdLogContext("sessionId", sessionId),
      ...getSessionEngineIdLogContext("uploadId", upload.id),
      ...getSessionEngineIdLogContext("storagePath", upload.storagePath),
      cleanupReason: reason.slice(0, 64),
      ...getSessionEngineErrorContext(error),
    };

    if (reason === "duplicate") {
      logger.warn("[SessionEngine] Duplicate upload cleanup failed", cleanupContext);
      return;
    }

    logger.warn("[SessionEngine] Stored upload cleanup failed", cleanupContext);
  }
}

export function isMessagingUploadPathReferencedBySession(
  value: unknown,
  expectedSessionId: string,
  storagePath: string,
): boolean | null {
  if (!isSessionRecord(value) || value.sessionId !== expectedSessionId) return null;
  const uploads = normalizeRoutingUploads(value.uploads, expectedSessionId, { allowEmpty: true });
  const replacementUploads = value.replacementUploads === undefined
    ? []
    : normalizeRoutingUploads(value.replacementUploads, expectedSessionId, {
      allowEmpty: true,
      max: MAX_MESSAGING_REPLACEMENT_UPLOADS,
    });
  if (!uploads || !replacementUploads) return null;
  return [...uploads, ...replacementUploads].some((upload) => upload.storagePath === storagePath);
}

async function deleteStoredUploadIfUnreferenced(
  upload: SessionUpload,
  sessionId: string,
  reason: string,
): Promise<void> {
  try {
    const snapshot = await db.collection(sessionsCol).doc(sessionId).get();
    if (snapshot.exists) {
      const referenced = isMessagingUploadPathReferencedBySession(
        snapshot.data(),
        sessionId,
        upload.storagePath,
      );
      if (referenced !== false) {
        logger.warn("[SessionEngine] Stored upload cleanup deferred after persistence check", {
          ...getSessionEngineIdLogContext("sessionId", sessionId),
          ...getSessionEngineIdLogContext("uploadId", upload.id),
          cleanupReason: reason.slice(0, 64),
          persistenceState: referenced ? "referenced" : "invalid",
        });
        return;
      }
    }
  } catch (error) {
    logger.warn("[SessionEngine] Stored upload cleanup deferred after persistence read failure", {
      ...getSessionEngineIdLogContext("sessionId", sessionId),
      ...getSessionEngineIdLogContext("uploadId", upload.id),
      cleanupReason: reason.slice(0, 64),
      ...getSessionEngineErrorContext(error),
    });
    return;
  }
  await deleteStoredUpload(upload, sessionId, reason);
}

async function expireActiveRoutingSession(
  session: MessagingOnboardingRoutingSession,
  now: Timestamp,
): Promise<boolean> {
  const sessionRef = db.collection(sessionsCol).doc(session.sessionId);
  const outcome = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(sessionRef);
    if (!snapshot.exists) return "gone" as const;
    const state = snapshot.get("state");
    if (!isMessagingOnboardingState(state)) throw new Error(SESSION_LOOKUP_INVALID_CODE);
    if (TERMINAL_STATES.includes(state)) return "gone" as const;

    const expiresAtMillis = readTimestampMillis(snapshot.get("expiresAt"));
    const stateHistory = normalizeSessionStateHistory(snapshot.get("stateHistory"));
    if (
      snapshot.get("sessionId") !== session.sessionId
      || snapshot.get("provider") !== session.provider
      || snapshot.get("providerUserId") !== session.providerUserId
      || expiresAtMillis === null
      || !stateHistory
      || stateHistory[stateHistory.length - 1]?.state !== state
    ) {
      throw new Error(SESSION_LOOKUP_INVALID_CODE);
    }
    if (expiresAtMillis > now.toMillis()) return "current" as const;

    transaction.update(sessionRef, buildRoutingExpiryUpdate(state, stateHistory, now));
    return "expired" as const;
  });

  if (outcome === "expired") {
    logOnboardingEvent({
      eventType: "SESSION_EXPIRED",
      provider: session.provider,
      sessionCreatedAt: session.createdAt,
      sessionId: session.sessionId,
      sessionState: "EXPIRED",
      userIdMasked: maskUserId(session.providerUserId),
    });
  }
  return outcome !== "current";
}

function buildRoutingExpiryUpdate(
  state: MessagingOnboardingState,
  stateHistory: readonly StateHistoryEntry[],
  now: Timestamp,
) {
  const expiryHistory: StateHistoryEntry[] = [];
  if (state === "VALIDATING_ASSETS" || state === "PROCESSING_MENU" || state === "PUBLISHING") {
    expiryHistory.push({
      reason: "Interrupted work exceeded the session lifetime",
      state: "FAILED",
      timestamp: now,
    });
  }
  expiryHistory.push({ reason: "24h session expiry", state: "EXPIRED", timestamp: now });
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
    stateHistory: [...stateHistory, ...expiryHistory],
    updatedAt: now,
  };
}

// ═══════════════════════════════════════════════════════════════
// SESSION LOOKUP & CREATION
// ═══════════════════════════════════════════════════════════════

/** Find active (non-terminal) session for a provider+user */
export async function findActiveSession(
  provider: MessagingProvider,
  providerUserId: string,
): Promise<MessagingOnboardingRoutingSession | null> {
  const snapshot = await db
    .collection(sessionsCol)
    .where("provider", "==", provider)
    .where("providerUserId", "==", providerUserId)
    .where("state", "not-in", TERMINAL_STATES)
    .limit(2)
    .get();

  const session = readSingleSessionLookup(snapshot.docs, provider, providerUserId);
  if (!session || session.expiresAt.toMillis() > Date.now()) return session;
  return await expireActiveRoutingSession(session, Timestamp.now()) ? null : session;
}

/** Find any LIVE session for a provider+user */
export async function findLiveSession(
  provider: MessagingProvider,
  providerUserId: string,
): Promise<MessagingOnboardingRoutingSession | null> {
  const snapshot = await db
    .collection(sessionsCol)
    .where("provider", "==", provider)
    .where("providerUserId", "==", providerUserId)
    .where("state", "==", "LIVE")
    .limit(2)
    .get();

  return readSingleSessionLookup(snapshot.docs, provider, providerUserId);
}

/** Check if this phone is linked to an existing store (any onboarding source) */
export async function findExistingStoreByPhone(
  phoneDisplay: string,
): Promise<{ storeId: number; tenantId: number } | null> {
  if (!/^\+[1-9]\d{6,14}$/.test(phoneDisplay)) return null;
  // Check users collection for phone match
  const snapshot = await db
    .collection(DB_COLLECTIONS.USERS)
    .where("phone", "==", phoneDisplay)
    .limit(2)
    .get();

  const matches = snapshot.docs.flatMap((doc) => {
    const userData: unknown = doc.data();
    if (!isSessionRecord(userData)) return [];
    const storeId = userData.storeId;
    const tenantId = userData.tenantId;
    return typeof storeId === "number"
      && Number.isSafeInteger(storeId)
      && storeId > 0
      && typeof tenantId === "number"
      && Number.isSafeInteger(tenantId)
      && tenantId > 0
      ? [{ storeId, tenantId }]
      : [];
  });
  if (snapshot.size > 1) {
    throw new Error("MESSAGING_EXISTING_STORE_LOOKUP_AMBIGUOUS");
  }
  return matches[0] || null;
}

/** Create a new session (only on first valid media — spec §Session Creation Trigger) */
export async function createSession(
  msg: NormalizedMessage,
  upload: SessionUpload,
): Promise<MessagingOnboardingSession> {
  const sessionId = db.collection(sessionsCol).doc().id;
  return createSessionWithId(sessionId, msg, upload);
}

/** Create a new session with a pre-generated ID (used when sessionId is needed before upload) */
export async function createSessionWithId(
  sessionId: string,
  msg: NormalizedMessage,
  upload: SessionUpload,
): Promise<MessagingOnboardingSession> {
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(
    now.toMillis() + TIMING.SESSION_EXPIRY_MS,
  );
  const intakeExpiresAt = Timestamp.fromMillis(
    now.toMillis() + TIMING.INTAKE_WINDOW_MS,
  );

  const sessionRef = db.collection(sessionsCol).doc(sessionId);

  const session: MessagingOnboardingSession = {
    sessionId,
    provider: msg.provider,
    providerUserId: msg.userId,
    providerDisplayId: msg.userDisplayId,
    providerMessageIds: [msg.providerMessageId],

    state: "COLLECTING_INPUT",
    stateHistory: [
      { state: "COLLECTING_INPUT", timestamp: now, reason: "Session created" },
    ],

    uploads: [upload],
    replacementUploads: [],
    pendingUploadCleanupPaths: [],
    uploadCleanupPending: false,

    validMenuFiles: [],
    invalidFiles: [],
    menuCompleteness: null,
    validationConfidence: null,

    extractedBusinessInfo: null,

    detectedBusinessType: null,
    detectedBusinessCategory: null,
    typeConfidence: null,
    typeSource: "fallback",

    extractionJobId: null,
    extractionCompletedJobId: null,
    extractedMenuData: null,
    qualityScore: null,

    previewToken: null,
    previewUrl: null,

    publishedResult: null,

    fixRequests: [],

    acquisitionSource: "unknown", // Refined by UTM params on WhatsApp link (e.g., ?src=obp → 'obp_page')

    invalidUploadAttempts: 0,
    processingRuns: 0,
    correctionCount: 0,
    reminderSentAt: null,
    reminderMessageLeaseToken: null,
    reminderMessageLeaseUntil: null,
    pendingUploadsWhileProcessing: false,

    lastUploadAt: now,
    intakeExpiresAt,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    expiresAt,
  };

  const userHash = getUserHash(msg.provider, msg.userId);
  const rateLimitRef = db.collection(rateLimitsCol).doc(userHash);

  await db.runTransaction(async (transaction) => {
    const [existingSession, rateLimitSnapshot] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(rateLimitRef),
    ]);
    if (existingSession.exists) throw new SessionAdmissionError("invalid_state");

    const rateLimitData = rateLimitSnapshot.exists
      ? normalizeRateLimitDocument(rateLimitSnapshot.data(), userHash)
      : null;
    if (rateLimitSnapshot.exists && !rateLimitData) throw new SessionAdmissionError("invalid_state");
    const activeSessionId = rateLimitData?.activeSessionId || null;

    if (activeSessionId && activeSessionId !== sessionId) {
      const activeSnapshot = await transaction.get(db.collection(sessionsCol).doc(activeSessionId));
      if (activeSnapshot.exists) {
        const activeState = activeSnapshot.get("state");
        if (!isMessagingOnboardingState(activeState)) {
          throw new SessionAdmissionError("invalid_state");
        }
        if (!TERMINAL_STATES.includes(activeState)) {
          throw new SessionAdmissionError("active_session");
        }
      }
    }

    const nowMillis = now.toMillis();
    let sessionsToday = 0;
    let sessionsThisWeek = 0;
    let processingRunsThisWeek = 0;
    let dayResetAt = getNextMidnightUTC();
    let weekResetAt = getNextMondayUTC();
    let cooldownUntil: Timestamp | null = null;

    if (rateLimitSnapshot.exists) {
      if (!rateLimitData) throw new SessionAdmissionError("invalid_state");
      const persistedToday = rateLimitData.sessionsToday;
      const persistedWeek = rateLimitData.sessionsThisWeek;
      const persistedProcessing = rateLimitData.processingRunsThisWeek;
      const persistedDayReset = rateLimitData.dayResetAt.toMillis();
      const persistedWeekReset = rateLimitData.weekResetAt.toMillis();
      const persistedCooldown = rateLimitData.cooldownUntil == null
        ? null
        : readTimestampMillis(rateLimitData.cooldownUntil);
      if (
        persistedToday === null
        || persistedWeek === null
        || persistedProcessing === null
        || persistedDayReset === null
        || persistedWeekReset === null
        || persistedCooldown === null && rateLimitData.cooldownUntil != null
      ) {
        throw new SessionAdmissionError("invalid_state");
      }

      sessionsToday = persistedDayReset <= nowMillis ? 0 : persistedToday;
      sessionsThisWeek = persistedWeekReset <= nowMillis ? 0 : persistedWeek;
      processingRunsThisWeek = persistedWeekReset <= nowMillis ? 0 : persistedProcessing;
      dayResetAt = persistedDayReset <= nowMillis
        ? getNextMidnightUTC()
        : rateLimitData.dayResetAt;
      weekResetAt = persistedWeekReset <= nowMillis
        ? getNextMondayUTC()
        : rateLimitData.weekResetAt;
      cooldownUntil = persistedCooldown === null
        ? null
        : rateLimitData.cooldownUntil;
    }

    if (cooldownUntil && cooldownUntil.toMillis() > nowMillis) {
      throw new SessionAdmissionError("cooldown");
    }
    if (sessionsToday >= RATE_LIMITS.SESSIONS_PER_DAY) {
      throw new SessionAdmissionError("daily_limit");
    }
    if (sessionsThisWeek >= RATE_LIMITS.SESSIONS_PER_WEEK) {
      throw new SessionAdmissionError("weekly_limit");
    }

    transaction.create(sessionRef, session);
    transaction.set(rateLimitRef, {
      activeSessionId: sessionId,
      cooldownUntil,
      dayResetAt,
      expiresAt: Timestamp.fromMillis(nowMillis + RETENTION.RATE_LIMIT_TTL_MS),
      lastSessionAt: now,
      processingRunsThisWeek,
      sessionsToday: sessionsToday + 1,
      sessionsThisWeek: sessionsThisWeek + 1,
      userHash,
      weekResetAt,
    } satisfies MessagingOnboardingRateLimit, { merge: false });
  });

  logOnboardingEvent({
    sessionId,
    provider: msg.provider,
    eventType: "SESSION_CREATED",
    sessionState: "COLLECTING_INPUT",
    userIdMasked: maskUserId(msg.userId),
    metadata: { messageType: msg.messageType },
    sessionCreatedAt: now,
  });

  return session;
}

// ═══════════════════════════════════════════════════════════════
// STATE TRANSITIONS
// ═══════════════════════════════════════════════════════════════

/** Transition session to a new state with safety checks */
export async function transitionState(
  sessionId: string,
  currentState: MessagingOnboardingState,
  newState: MessagingOnboardingState,
  reason: string,
  context: {
    _provider?: MessagingProvider;
    _userIdMasked?: string;
  } = {},
): Promise<boolean> {
  // Check forbidden transitions
  const forbidden = isTransitionForbidden(currentState, newState);
  if (forbidden) {
    logger.error("[SessionEngine] Forbidden state transition attempted", {
      ...getSessionEngineIdLogContext("sessionId", sessionId),
      from: currentState,
      to: newState,
      reason: forbidden,
    });
    return false;
  }

  const now = Timestamp.now();
  const sessionRef = db.collection(sessionsCol).doc(sessionId);

  const {
    _provider: eventProvider = "whatsapp",
    _userIdMasked: eventUserIdMasked = "****",
  } = context;

  const transitioned = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(sessionRef);
    if (!snapshot.exists) return false;

    const actualState = snapshot.get("state");
    if (actualState !== currentState) {
      logger.warn("[SessionEngine] Stale state transition ignored", {
        ...getSessionEngineIdLogContext("sessionId", sessionId),
        expectedState: currentState,
        actualState: typeof actualState === "string" ? actualState.slice(0, 40) : typeof actualState,
        requestedState: newState,
      });
      return false;
    }

    transaction.update(sessionRef, {
      state: newState,
      stateHistory: FieldValue.arrayUnion({
        state: newState,
        timestamp: now,
        reason,
      }),
      updatedAt: now,
    });
    return true;
  });

  if (!transitioned) return false;

  logOnboardingEvent({
    sessionId,
    provider: eventProvider,
    eventType: "SESSION_STATE_CHANGED",
    sessionState: newState,
    userIdMasked: eventUserIdMasked,
    metadata: { fromState: currentState, toState: newState, reason },
  });

  return true;
}

// ═══════════════════════════════════════════════════════════════
// UPLOAD HANDLING
// ═══════════════════════════════════════════════════════════════

/** Download media from provider and upload to Firebase Storage.
 * Returns SessionUpload on success, null on rejection, or "PASSWORD_PROTECTED_PDF" for locked PDFs. */
export async function processAndStoreUpload(
  msg: NormalizedMessage,
  sessionId: string,
  adapter: IMessagingProvider,
): Promise<SessionUpload | null | "PASSWORD_PROTECTED_PDF"> {
  if (!msg.media) return null;

  // Check MIME type
  if (
    !SESSION_UPLOAD_MIME_TYPES.has(msg.media.mimeType)
  ) {
    return null; // Silently reject unsupported types
  }

  if (
    msg.media.fileSize &&
    msg.media.fileSize > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES
  ) {
    logOnboardingEvent({
      sessionId,
      provider: msg.provider,
      eventType: "UPLOAD_REJECTED",
      sessionState: "COLLECTING_INPUT",
      userIdMasked: maskUserId(msg.userId),
      metadata: {
        reason: "file_size_precheck",
        reportedSize: msg.media.fileSize,
        maxSize: UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES,
        mimeType: msg.media.mimeType,
      },
    });
    return null;
  }

  try {
    // Download from provider
    const buffer = await adapter.downloadMedia(msg.media.providerMediaId);

    // Check file size
    if (buffer.length === 0 || buffer.length > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) {
      return null;
    }

    const contentValidation = validateMessagingUploadContent(buffer, msg.media.mimeType);
    if (contentValidation.valid === false) {
      logOnboardingEvent({
        sessionId,
        provider: msg.provider,
        eventType: "UPLOAD_REJECTED",
        sessionState: "COLLECTING_INPUT",
        userIdMasked: maskUserId(msg.userId),
        metadata: {
          reason: contentValidation.reason,
          mimeType: msg.media.mimeType,
          fileSize: buffer.length,
        },
      });
      return null;
    }

    // Check for password-protected PDF (spec §Failure Handling)
    if (msg.media.mimeType === "application/pdf" && isPdfEncrypted(buffer)) {
      return "PASSWORD_PROTECTED_PDF";
    }

    // Generate SHA-256 for dedup
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    // Upload to Firebase Storage with a stable Firebase download token.
    // Project files keep this URL after publish; a short-lived signed URL would
    // break source-file preview/retry flows once the owner claims the dashboard.
    const uploadId = crypto.randomUUID().replace(/-/g, "");
    const downloadToken = crypto.randomUUID();
    const ext = getExtensionFromMime(msg.media.mimeType);
    const storagePath = `messagingOnboarding/${sessionId}/${uploadId}.${ext}`;
    const bucket = storageAdmin.bucket();
    const file = bucket.file(storagePath);

    await file.save(buffer, {
      metadata: {
        contentType: msg.media.mimeType,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
          sessionId,
          uploadId,
          providerMediaId: msg.media.providerMediaId,
        },
      },
    });

    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;

    const upload: SessionUpload = {
      id: uploadId,
      fileName: msg.media.fileName || uploadId,
      providerMediaId: msg.media.providerMediaId,
      storagePath,
      storageUrl: downloadUrl,
      mimeType: msg.media.mimeType,
      fileSize: buffer.length,
      sha256,
      uploadedAt: Timestamp.now(),
    };

    return upload;
  } catch (err) {
    logger.error("[SessionEngine] Failed to process upload", {
      ...getSessionEngineIdLogContext("sessionId", sessionId),
      ...getSessionEngineErrorContext(err),
    });

    logOnboardingEvent({
      sessionId,
      provider: msg.provider,
      eventType: "PROVIDER_MEDIA_DOWNLOAD_FAILED",
      sessionState: "COLLECTING_INPUT",
      userIdMasked: maskUserId(msg.userId),
      error: {
        code: "MEDIA_DOWNLOAD_FAILED",
        retryable: true,
      },
    });

    throw err;
  }
}

/** Check if upload is duplicate by SHA-256 */
export function isDuplicateUpload(
  session: Pick<MessagingOnboardingSession, "uploads">,
  sha256: string,
): boolean {
  return session.uploads.some((u) => u.sha256 === sha256);
}

function hasProviderMediaUpload(
  session: Pick<MessagingOnboardingSession, "uploads" | "replacementUploads">,
  providerMediaId: string | undefined,
): boolean {
  return !!providerMediaId
    && [...session.uploads, ...(session.replacementUploads || [])]
      .some((upload) => upload.providerMediaId === providerMediaId);
}

type UploadAppendStatus =
  | "added"
  | "duplicate"
  | "expired"
  | "limit_reached"
  | "missing_session"
  | "state_changed";

interface UploadAppendResult {
  cleanupScheduled?: boolean;
  reopenedFromFailure: boolean;
  status: UploadAppendStatus;
  recentUploadCount: number;
  sessionRestarted: boolean;
}

function getLatestPreviewTimestampMillis(stateHistory: unknown): number | null {
  if (!Array.isArray(stateHistory)) return null;
  for (let index = stateHistory.length - 1; index >= 0; index--) {
    const entry = stateHistory[index];
    if (
      isSessionRecord(entry)
      && (entry.state === "PREVIEW_READY" || entry.state === "AWAITING_APPROVAL")
    ) {
      return readTimestampMillis(entry.timestamp);
    }
  }
  return null;
}

/** Add upload to session and reset intake timer (with Fast Start logic — spec §Smart Intake Logic) */
export async function addUploadToSession(
  sessionId: string,
  upload: SessionUpload,
  session: MessagingOnboardingRoutingSession,
  options: {
    cleanupPendingUploads?: (sessionId: string) => Promise<unknown>;
    markPendingWhileProcessing?: boolean;
    restartProviderMessageId?: string;
    restartOnRecentThreshold?: number;
  } = {},
): Promise<UploadAppendResult> {
  const sessionRef = db.collection(sessionsCol).doc(sessionId);
  const result = await db.runTransaction(async (transaction): Promise<UploadAppendResult> => {
    const snapshot = await transaction.get(sessionRef);
    if (!snapshot.exists) {
      return {
        reopenedFromFailure: false,
        status: "missing_session",
        recentUploadCount: 0,
        sessionRestarted: false,
      };
    }
    if (snapshot.get("state") !== session.state) {
      return {
        reopenedFromFailure: false,
        status: "state_changed",
        recentUploadCount: 0,
        sessionRestarted: false,
      };
    }

    const now = Timestamp.now();
    const expiresAtMillis = readTimestampMillis(snapshot.get("expiresAt"));
    const stateHistory = normalizeSessionStateHistory(snapshot.get("stateHistory"));
    if (
      expiresAtMillis === null
      || !stateHistory
      || stateHistory[stateHistory.length - 1]?.state !== session.state
    ) {
      throw new Error("MESSAGING_SESSION_EXPIRY_STATE_INVALID");
    }
    if (expiresAtMillis <= now.toMillis()) {
      transaction.update(
        sessionRef,
        buildRoutingExpiryUpdate(session.state, stateHistory, now),
      );
      return {
        reopenedFromFailure: false,
        status: "expired",
        recentUploadCount: 0,
        sessionRestarted: false,
      };
    }

    const persistedUploads = normalizeRoutingUploads(snapshot.get("uploads"), sessionId, {
      allowEmpty: session.state === "COLLECTING_INPUT" || session.state === "AWAITING_MORE_UPLOADS",
    });
    const latestPreviewMillis = getLatestPreviewTimestampMillis(stateHistory);
    const legacyReplacementUploads = snapshot.get("replacementUploads") === undefined
      && latestPreviewMillis !== null
      && options.restartOnRecentThreshold !== undefined
      && persistedUploads
      ? persistedUploads.filter((current) => current.uploadedAt.toMillis() > latestPreviewMillis)
      : [];
    const replacementUploads = snapshot.get("replacementUploads") === undefined
      ? legacyReplacementUploads
      : normalizeRoutingUploads(snapshot.get("replacementUploads"), sessionId, {
        allowEmpty: true,
        max: MAX_MESSAGING_REPLACEMENT_UPLOADS,
      });
    const uploads = persistedUploads && legacyReplacementUploads.length > 0
      ? persistedUploads.filter((current) => (
        !legacyReplacementUploads.some(({ id }) => id === current.id)
      ))
      : persistedUploads;
    const pendingUploadCleanupPaths = normalizeMessagingPendingUploadCleanupPaths(
      snapshot.get("pendingUploadCleanupPaths") ?? [],
      sessionId,
    );
    const uploadCleanupPending = snapshot.get("uploadCleanupPending") ?? false;
    if (
      !uploads
      || !replacementUploads
      || !pendingUploadCleanupPaths
      || typeof uploadCleanupPending !== "boolean"
      || uploadCleanupPending !== (pendingUploadCleanupPaths.length > 0)
    ) {
      throw new Error("MESSAGING_SESSION_UPLOADS_INVALID");
    }
    if ([...uploads, ...replacementUploads].some((current) => (
      current?.providerMediaId === upload.providerMediaId || current?.sha256 === upload.sha256
    ))) {
      return {
        reopenedFromFailure: false,
        status: "duplicate",
        recentUploadCount: 0,
        sessionRestarted: false,
      };
    }
    const isReplacementUpload = options.restartOnRecentThreshold !== undefined;
    if (
      isReplacementUpload
        ? replacementUploads.length >= MAX_MESSAGING_REPLACEMENT_UPLOADS
        : uploads.length >= UPLOAD_LIMITS.MAX_IMAGES_PER_SESSION
    ) {
      return {
        reopenedFromFailure: false,
        status: "limit_reached",
        recentUploadCount: 0,
        sessionRestarted: false,
      };
    }

    const nextUploads = isReplacementUpload ? uploads : [...uploads, upload];
    const nextReplacementUploads = isReplacementUpload
      ? [...replacementUploads, upload]
      : replacementUploads;
    const intakeUploads = isReplacementUpload ? nextReplacementUploads : nextUploads;
    const hasPdf = intakeUploads.some((current) => current?.mimeType === "application/pdf");
    const intakeDelayMs = hasPdf
      ? TIMING.PDF_FAST_START_IDLE_MS
      : intakeUploads.length >= TIMING.FAST_START_MIN_UPLOADS
        ? TIMING.FAST_START_IDLE_MS
        : TIMING.INTAKE_WINDOW_MS;
    const recentUploads = isReplacementUpload
      ? nextReplacementUploads
      : latestPreviewMillis === null
        ? nextUploads
        : nextUploads.filter((current) => current.uploadedAt.toMillis() > latestPreviewMillis);
    const recentUploadCount = recentUploads.length;
    const sessionRestarted = options.restartOnRecentThreshold !== undefined
      && recentUploadCount >= options.restartOnRecentThreshold;
    const nextCleanupPaths = sessionRestarted
      ? mergeMessagingPendingUploadCleanupPaths(
        pendingUploadCleanupPaths,
        uploads.map(({ storagePath }) => storagePath),
        sessionId,
      )
      : pendingUploadCleanupPaths;
    if (!nextCleanupPaths) throw new Error("MESSAGING_UPLOAD_CLEANUP_QUEUE_FULL");
    const reopenedFromFailure = session.state === "FAILED";
    if (sessionRestarted) {
      const transitionError = isTransitionForbidden(session.state, "COLLECTING_INPUT");
      if (transitionError) throw new Error("MESSAGING_SESSION_RESTART_FORBIDDEN");
    }
    if (reopenedFromFailure) {
      const transitionError = isTransitionForbidden("FAILED", "COLLECTING_INPUT");
      if (transitionError) throw new Error("MESSAGING_SESSION_REOPEN_FORBIDDEN");
    }
    const rawProviderMessageIds = snapshot.get("providerMessageIds");
    if (
      !Array.isArray(rawProviderMessageIds)
      || rawProviderMessageIds.length > 500
      || rawProviderMessageIds.some((id) => !isBoundedSessionString(id, 256))
      || new Set(rawProviderMessageIds).size !== rawProviderMessageIds.length
    ) {
      throw new Error("MESSAGING_PROVIDER_MESSAGE_IDS_INVALID");
    }
    let restartProviderMessageIds = rawProviderMessageIds;
    if (sessionRestarted) {
      const restartProviderMessageId = options.restartProviderMessageId;
      if (!isBoundedSessionString(restartProviderMessageId, 256)) {
        throw new Error("MESSAGING_SESSION_RESTART_MESSAGE_ID_INVALID");
      }
      restartProviderMessageIds = Array.from(new Set([
        ...rawProviderMessageIds,
        restartProviderMessageId,
      ]));
    }
    if (restartProviderMessageIds.length > 500) {
      throw new Error("MESSAGING_PROVIDER_MESSAGE_IDS_FULL");
    }

    transaction.update(sessionRef, {
      uploads: sessionRestarted ? recentUploads : nextUploads,
      replacementUploads: sessionRestarted ? [] : nextReplacementUploads,
      pendingUploadCleanupPaths: nextCleanupPaths,
      uploadCleanupPending: nextCleanupPaths.length > 0,
      lastUploadAt: now,
      intakeExpiresAt: Timestamp.fromMillis(
        now.toMillis() + (sessionRestarted ? TIMING.INTAKE_WINDOW_MS : intakeDelayMs),
      ),
      ...(options.markPendingWhileProcessing ? { pendingUploadsWhileProcessing: true } : {}),
      ...(reopenedFromFailure ? {
        extractedBusinessInfo: null,
        extractedBusinessProfile: null,
        extractedMenuData: null,
        extractedProjectFiles: null,
        extractionCompletedJobId: null,
        extractionJobId: null,
        invalidFiles: [],
        menuCompleteness: null,
        pendingUploadsWhileProcessing: false,
        previewMessageDeliveryAttempts: 0,
        previewMessageLeaseToken: null,
        previewMessageLeaseUntil: null,
        previewMessagePending: false,
        previewToken: null,
        previewUrl: null,
        qualityScore: null,
        reminderMessageLeaseToken: null,
        reminderMessageLeaseUntil: null,
        reminderSentAt: null,
        state: "COLLECTING_INPUT",
        stateHistory: [...stateHistory, {
          reason: "Valid upload received after failure",
          state: "COLLECTING_INPUT",
          timestamp: now,
        }],
        validMenuFiles: [],
        validationConfidence: null,
      } : {}),
      ...(sessionRestarted ? {
        detectedBusinessCategory: null,
        detectedBusinessType: null,
        extractedBusinessInfo: null,
        extractedBusinessProfile: null,
        extractedMenuData: null,
        extractedProjectFiles: null,
        extractionCompletedJobId: null,
        extractionJobId: null,
        fixMessageDeliveryAttempts: 0,
        fixMessageLeaseToken: null,
        fixMessageLeaseUntil: null,
        fixMessagePending: false,
        invalidFiles: [],
        menuCompleteness: null,
        pendingUploadsWhileProcessing: false,
        previewMessageDeliveryAttempts: 0,
        previewMessageLeaseToken: null,
        previewMessageLeaseUntil: null,
        previewMessagePending: false,
        previewToken: null,
        previewUrl: null,
        qualityScore: null,
        reminderMessageLeaseToken: null,
        reminderMessageLeaseUntil: null,
        reminderSentAt: null,
        providerMessageIds: restartProviderMessageIds,
        state: "COLLECTING_INPUT",
        stateHistory: [...stateHistory, {
          reason: "Full resend detected",
          state: "COLLECTING_INPUT",
          timestamp: now,
        }],
        validMenuFiles: [],
        validationConfidence: null,
        typeConfidence: null,
        typeSource: "fallback",
      } : {}),
      updatedAt: now,
    });
    return {
      cleanupScheduled: sessionRestarted && nextCleanupPaths.length > 0,
      reopenedFromFailure,
      status: "added",
      recentUploadCount,
      sessionRestarted,
    };
  });

  if (result.cleanupScheduled) {
    const cleanupPendingUploads = options.cleanupPendingUploads
      || ((pendingSessionId: string) => drainMessagingPendingUploadCleanup({ sessionId: pendingSessionId }));
    await cleanupPendingUploads(sessionId);
  }

  if (result.status === "expired") {
    logOnboardingEvent({
      eventType: "SESSION_EXPIRED",
      provider: session.provider,
      sessionCreatedAt: session.createdAt,
      sessionId,
      sessionState: "EXPIRED",
      userIdMasked: maskUserId(session.providerUserId),
    });
  }

  if (result.status === "added") {
    logOnboardingEvent({
      sessionId,
      provider: session.provider,
      eventType: "UPLOAD_RECEIVED",
      sessionState: session.state,
      userIdMasked: maskUserId(session.providerUserId),
      metadata: {
        mimeType: upload.mimeType,
        fileSize: upload.fileSize,
      },
      sessionCreatedAt: session.createdAt,
    });
    if (result.sessionRestarted) {
      logOnboardingEvent({
        sessionId,
        provider: session.provider,
        eventType: "SESSION_RESTARTED",
        sessionState: "COLLECTING_INPUT",
        userIdMasked: maskUserId(session.providerUserId),
        metadata: { uploadCount: result.recentUploadCount },
        sessionCreatedAt: session.createdAt,
      });
    }
    if (result.reopenedFromFailure) {
      logOnboardingEvent({
        sessionId,
        provider: session.provider,
        eventType: "SESSION_STATE_CHANGED",
        sessionState: "COLLECTING_INPUT",
        userIdMasked: maskUserId(session.providerUserId),
        metadata: {
          fromState: "FAILED",
          reason: "Valid upload received after failure",
          toState: "COLLECTING_INPUT",
        },
        sessionCreatedAt: session.createdAt,
      });
    }
  }
  return result;
}

export async function appendStoredUploadOrCleanup(
  upload: SessionUpload,
  session: MessagingOnboardingRoutingSession,
  options: {
    cleanupPendingUploads?: (sessionId: string) => Promise<unknown>;
    markPendingWhileProcessing?: boolean;
    restartProviderMessageId?: string;
    restartOnRecentThreshold?: number;
  } = {},
): Promise<UploadAppendResult> {
  let result: UploadAppendResult;
  try {
    result = await addUploadToSession(session.sessionId, upload, session, options);
  } catch (error) {
    await deleteStoredUploadIfUnreferenced(upload, session.sessionId, "session_append_failed");
    throw error;
  }

  if (result.status === "added") return result;
  await deleteStoredUploadIfUnreferenced(upload, session.sessionId, result.status);

  if (result.status === "duplicate") {
    logOnboardingEvent({
      sessionId: session.sessionId,
      provider: session.provider,
      eventType: "UPLOAD_DEDUPLICATED",
      sessionState: session.state,
      userIdMasked: maskUserId(session.providerUserId),
      metadata: { sha256: upload.sha256.slice(0, 8) },
      sessionCreatedAt: session.createdAt,
    });
  }
  if (result.status === "missing_session" || result.status === "state_changed") {
    throw new Error(`MESSAGING_SESSION_${result.status.toUpperCase()}`);
  }
  if (result.status === "expired") {
    throw new Error("MESSAGING_SESSION_EXPIRED_DURING_UPLOAD");
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════

/** Generate user hash for rate limit tracking */
export function getUserHash(
  provider: MessagingProvider,
  providerUserId: string,
): string {
  return crypto
    .createHash("sha256")
    .update(`${provider}:${providerUserId}`)
    .digest("hex");
}

/** Check if user is rate limited. Returns null if OK, or reason string if blocked. */
export async function checkRateLimit(
  provider: MessagingProvider,
  providerUserId: string,
): Promise<string | null> {
  const userHash = getUserHash(provider, providerUserId);
  const rateLimitRef = db.collection(rateLimitsCol).doc(userHash);
  const doc = await rateLimitRef.get();

  if (!doc.exists) return null; // No rate limit record = first session

  const rateLimit = normalizeRateLimitDocument(doc.data(), userHash);
  if (!rateLimit) return "invalid_state";
  const now = Date.now();

  // Check cooldown
  if (rateLimit.cooldownUntil) {
    const cooldownUntil = readTimestampMillis(rateLimit.cooldownUntil);
    if (cooldownUntil === null) return "invalid_state";
    if (cooldownUntil > now) return "cooldown";
  }

  const persistedToday = readNonNegativeCounter(rateLimit.sessionsToday);
  const persistedWeek = readNonNegativeCounter(rateLimit.sessionsThisWeek);
  const dayResetAt = readTimestampMillis(rateLimit.dayResetAt);
  const weekResetAt = readTimestampMillis(rateLimit.weekResetAt);
  if (
    persistedToday === null
    || persistedWeek === null
    || dayResetAt === null
    || weekResetAt === null
  ) {
    return "invalid_state";
  }

  let sessionsToday = persistedToday;
  let sessionsThisWeek = persistedWeek;

  // Reset counters first, then still evaluate the other active windows.
  // Returning early here allowed a weekly-capped user through on day rollover.
  if (dayResetAt <= now) {
    sessionsToday = 0;
  }

  if (weekResetAt <= now) {
    sessionsThisWeek = 0;
  }

  // Check daily limit
  if (sessionsToday >= RATE_LIMITS.SESSIONS_PER_DAY) {
    return "daily_limit";
  }

  // Check weekly limit
  if (sessionsThisWeek >= RATE_LIMITS.SESSIONS_PER_WEEK) {
    return "weekly_limit";
  }

  return null;
}

async function recordInvalidUploadAttempt(
  session: MessagingOnboardingRoutingSession,
  providerMessageId: string,
): Promise<{ count: number; cooldownApplied: boolean; duplicate: boolean }> {
  if (!isBoundedSessionString(providerMessageId, 256)) {
    throw new Error("MESSAGING_PROVIDER_MESSAGE_ID_INVALID");
  }
  const sessionRef = db.collection(sessionsCol).doc(session.sessionId);
  const userHash = getUserHash(session.provider, session.providerUserId);
  const rateLimitRef = db.collection(rateLimitsCol).doc(userHash);
  const result = await db.runTransaction(async (transaction) => {
    const [sessionSnapshot, rateLimitSnapshot] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(rateLimitRef),
    ]);
    if (!sessionSnapshot.exists) throw new Error("MESSAGING_SESSION_MISSING");
    if (
      sessionSnapshot.get("provider") !== session.provider
      || sessionSnapshot.get("providerUserId") !== session.providerUserId
      || sessionSnapshot.get("state") !== session.state
    ) {
      throw new Error("MESSAGING_SESSION_IDENTITY_MISMATCH");
    }

    const now = Timestamp.now();
    const expiresAtMillis = readTimestampMillis(sessionSnapshot.get("expiresAt"));
    const stateHistory = normalizeSessionStateHistory(sessionSnapshot.get("stateHistory"));
    if (
      expiresAtMillis === null
      || !stateHistory
      || stateHistory[stateHistory.length - 1]?.state !== session.state
    ) {
      throw new Error("MESSAGING_SESSION_EXPIRY_STATE_INVALID");
    }
    if (expiresAtMillis <= now.toMillis()) {
      transaction.update(
        sessionRef,
        buildRoutingExpiryUpdate(session.state, stateHistory, now),
      );
      return { count: 0, cooldownApplied: false, duplicate: false, expired: true as const };
    }

    const persistedCount = readNonNegativeCounter(sessionSnapshot.get("invalidUploadAttempts"));
    if (persistedCount === null) throw new Error("MESSAGING_INVALID_UPLOAD_COUNT_INVALID");
    const providerMessageIds = sessionSnapshot.get("providerMessageIds");
    if (
      !Array.isArray(providerMessageIds)
      || providerMessageIds.length > 500
      || providerMessageIds.some((id) => !isBoundedSessionString(id, 256))
      || new Set(providerMessageIds).size !== providerMessageIds.length
    ) {
      throw new Error("MESSAGING_PROVIDER_MESSAGE_IDS_INVALID");
    }
    if (providerMessageIds.includes(providerMessageId)) {
      return { count: persistedCount, cooldownApplied: false, duplicate: true };
    }
    if (providerMessageIds.length >= 500) {
      throw new Error("MESSAGING_PROVIDER_MESSAGE_IDS_FULL");
    }
    const count = persistedCount + 1;
    const cooldownApplied = count >= RATE_LIMITS.MAX_INVALID_UPLOAD_ATTEMPTS;
    transaction.update(sessionRef, {
      invalidUploadAttempts: count,
      providerMessageIds: FieldValue.arrayUnion(providerMessageId),
      ...(cooldownApplied ? {
        intakeExpiresAt: null,
        state: "COOLDOWN",
        stateHistory: FieldValue.arrayUnion({
          reason: "Maximum invalid upload attempts reached",
          state: "COOLDOWN",
          timestamp: now,
        }),
      } : {}),
      updatedAt: now,
    });

    if (cooldownApplied) {
      const cooldownUntil = Timestamp.fromMillis(
        now.toMillis() + RATE_LIMITS.COOLDOWN_HOURS * 60 * 60 * 1000,
      );
      if (rateLimitSnapshot.exists) {
        if (!normalizeRateLimitDocument(rateLimitSnapshot.data(), userHash)) {
          throw new Error("MESSAGING_RATE_LIMIT_INVALID");
        }
        transaction.update(rateLimitRef, {
          cooldownUntil,
          expiresAt: Timestamp.fromMillis(now.toMillis() + RETENTION.RATE_LIMIT_TTL_MS),
        });
      } else {
        transaction.create(rateLimitRef, {
          activeSessionId: session.sessionId,
          cooldownUntil,
          dayResetAt: getNextMidnightUTC(),
          expiresAt: Timestamp.fromMillis(now.toMillis() + RETENTION.RATE_LIMIT_TTL_MS),
          lastSessionAt: session.createdAt,
          processingRunsThisWeek: session.processingRuns,
          sessionsThisWeek: 1,
          sessionsToday: 1,
          userHash,
          weekResetAt: getNextMondayUTC(),
        } satisfies MessagingOnboardingRateLimit);
      }
    }
    return { count, cooldownApplied, duplicate: false, expired: false as const };
  });
  if (result.expired) {
    logOnboardingEvent({
      eventType: "SESSION_EXPIRED",
      provider: session.provider,
      sessionCreatedAt: session.createdAt,
      sessionId: session.sessionId,
      sessionState: "EXPIRED",
      userIdMasked: maskUserId(session.providerUserId),
    });
    throw new Error("MESSAGING_SESSION_EXPIRED_DURING_INVALID_UPLOAD");
  }
  return result;
}

async function recordRejectedUpload(
  session: MessagingOnboardingRoutingSession,
  msg: NormalizedMessage,
): Promise<{ count: number; cooldownApplied: boolean }> {
  const invalidAttempt = await recordInvalidUploadAttempt(session, msg.providerMessageId);
  if (!invalidAttempt.duplicate) {
    logOnboardingEvent({
      sessionId: session.sessionId,
      provider: session.provider,
      eventType: "UPLOAD_REJECTED",
      sessionState: invalidAttempt.cooldownApplied ? "COOLDOWN" : session.state,
      userIdMasked: maskUserId(session.providerUserId),
      metadata: {
        invalidCount: invalidAttempt.count,
        mimeType: msg.media?.mimeType,
      },
      sessionCreatedAt: session.createdAt,
    });
  }

  if (invalidAttempt.cooldownApplied && !invalidAttempt.duplicate) {
    logOnboardingEvent({
      sessionId: session.sessionId,
      provider: session.provider,
      eventType: "COOLDOWN_APPLIED",
      sessionState: "COOLDOWN",
      userIdMasked: maskUserId(session.providerUserId),
      metadata: { reason: "max_invalid_uploads" },
      sessionCreatedAt: session.createdAt,
    });
  }
  return invalidAttempt;
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE HANDLING (Core — §4.1)
// ═══════════════════════════════════════════════════════════════

/**
 * Handle an incoming normalized message.
 * Follows the exact check order from impl.md §4.1.
 *
 * Returns the reply text to send (or null for no reply).
 */
export async function handleMessage(
  msg: NormalizedMessage,
  adapter: IMessagingProvider,
): Promise<string | null> {
  // Step 1-2: Feature flag checks are done in webhookHandler before calling this

  // Step 3: Provider message dedup is handled by the durable inbound queue.

  // Step 4: Check for LIVE session (tunnel closed — INV-7)
  const liveSession = await findLiveSession(msg.provider, msg.userId);
  if (liveSession && liveSession.publishedResult) {
    logOnboardingEvent({
      sessionId: liveSession.sessionId,
      provider: msg.provider,
      eventType: "POST_PUBLISH_MESSAGE",
      sessionState: "LIVE",
      userIdMasked: maskUserId(msg.userId),
    });
    return MESSAGES.POST_PUBLISH(liveSession.publishedResult.dashboardUrl);
  }

  // Step 5: Check for existing store by phone (any source)
  const existingStore = await findExistingStoreByPhone(msg.userDisplayId);
  if (existingStore) {
    logOnboardingEvent({
      sessionId: "no-session",
      provider: msg.provider,
      eventType: "EXISTING_STORE_DETECTED",
      sessionState: "COLLECTING_INPUT",
      userIdMasked: maskUserId(msg.userId),
      metadata: { storeId: existingStore.storeId },
    });
    const dashboardUrl = "https://menulist.ai/login";
    return MESSAGES.EXISTING_STORE(dashboardUrl);
  }

  // Step 6: Check for active session
  const activeSession = await findActiveSession(msg.provider, msg.userId);

  if (activeSession) {
    // First-session admission, full-resend restart, legacy sessions, and
    // invalid-upload counters record the IDs needed to reconstruct a reply
    // after a mutation/checkpoint crash. General deduplication remains in the
    // durable inbound queue.
    if (activeSession.providerMessageIds?.includes(msg.providerMessageId)) {
      const isMedia = msg.messageType === "image" || msg.messageType === "document";
      if (!isMedia) return null;

      // Session creation and invalid-upload accounting can commit before the
      // inbound queue stores its handler/reply checkpoint. Reconstruct those
      // deterministic replies on replay so idempotency does not become a lost
      // owner response in that crash window.
      return hasProviderMediaUpload(activeSession, msg.media?.providerMediaId)
        ? MESSAGES.FIRST_UPLOAD
        : MESSAGES.NON_MENU_FILE;
    }

    return await handleMessageForExistingSession(msg, activeSession, adapter);
  }

  // Step 7: Rate limit check (only for new session creation)
  const rateLimitReason = await checkRateLimit(msg.provider, msg.userId);
  if (rateLimitReason) {
    logOnboardingEvent({
      sessionId: "no-session",
      provider: msg.provider,
      eventType: "RATE_LIMIT_HIT",
      sessionState: "COOLDOWN",
      userIdMasked: maskUserId(msg.userId),
      metadata: { reason: rateLimitReason },
    });
    return MESSAGES.RATE_LIMITED;
  }

  // Step 8: Session creation — ONLY if first valid media
  if (msg.messageType === "image" || msg.messageType === "document") {
    // Pre-generate sessionId so upload goes to correct Storage path from the start
    // (avoids Firestore array-element-update issue — arrays can't be updated by index)
    const preGeneratedSessionId = db.collection(sessionsCol).doc().id;

    // Process and store the upload with the real sessionId
    const upload = await processAndStoreUpload(msg, preGeneratedSessionId, adapter);
    if (upload === "PASSWORD_PROTECTED_PDF") {
      return MESSAGES.PASSWORD_PROTECTED_PDF;
    }
    if (!upload) {
      return MESSAGES.NON_MENU_FILE;
    }

    // Create session and consume the rate-limit slot atomically.
    try {
      await createSessionWithId(preGeneratedSessionId, msg, upload);
    } catch (error) {
      await deleteStoredUploadIfUnreferenced(upload, preGeneratedSessionId, "session_create_failed");
      if (isSessionAdmissionError(error) && error.reason !== "active_session") {
        return MESSAGES.RATE_LIMITED;
      }
      throw error;
    }

    return MESSAGES.FIRST_UPLOAD;
  }

  // Text/sticker/emoji without active session → ignored, no session created (spec §Session Creation Trigger)
  if (msg.messageType === "text") {
    return null;
  }

  // Unsupported message type (video, audio, voice) → reply with guidance (spec §Session Creation Trigger)
  if (msg.messageType === "unsupported") {
    return MESSAGES.NON_MENU_FILE;
  }

  return null;
}

/**
 * Handle message for an existing active session.
 * State-specific media handling per impl.md §4.1 table.
 */
async function handleMessageForExistingSession(
  msg: NormalizedMessage,
  session: MessagingOnboardingRoutingSession,
  adapter: IMessagingProvider,
): Promise<string | null> {
  const isMedia =
    msg.messageType === "image" || msg.messageType === "document";

  switch (session.state) {
    case "COLLECTING_INPUT":
    case "AWAITING_MORE_UPLOADS": {
      if (isMedia) {
        return await handleUploadInCollectingState(msg, session, adapter);
      }
      // Text during collecting → no reply (waiting for more uploads)
      return null;
    }

    case "VALIDATING_ASSETS": {
      if (isMedia) {
        // Store upload, mark as pending
        return await handleUploadInCollectingState(msg, session, adapter);
      }
      return null;
    }

    case "PROCESSING_MENU": {
      if (isMedia) {
        if (hasProviderMediaUpload(session, msg.media?.providerMediaId)) return null;
        // Store upload, set pendingUploadsWhileProcessing
        const upload = await processAndStoreUpload(
          msg,
          session.sessionId,
          adapter,
        );
        if (upload === "PASSWORD_PROTECTED_PDF") {
          return MESSAGES.PASSWORD_PROTECTED_PDF;
        }
        if (!upload) {
          const invalidAttempt = await recordRejectedUpload(session, msg);
          return invalidAttempt.cooldownApplied ? MESSAGES.RATE_LIMITED : MESSAGES.NON_MENU_FILE;
        }
        await appendStoredUploadOrCleanup(upload, session, {
          markPendingWhileProcessing: true,
        });
      }
      return null;
    }

    case "PREVIEW_READY":
    case "AWAITING_APPROVAL": {
      if (isMedia) {
        // Count new uploads in this batch
        const recentUpload = await processRecentUpload(msg, session, adapter);
        if (recentUpload === "password_protected") return MESSAGES.PASSWORD_PROTECTED_PDF;
        if (recentUpload === "cooldown") return MESSAGES.RATE_LIMITED;
        if (recentUpload === "invalid") return MESSAGES.NON_MENU_FILE;
        if (recentUpload?.sessionRestarted) {
          // Full resend → restart
          logOnboardingEvent({
            sessionId: session.sessionId,
            provider: session.provider,
            eventType: "FULL_RESEND_DETECTED",
            sessionState: session.state,
            userIdMasked: maskUserId(session.providerUserId),
            metadata: { uploadCount: recentUpload.recentUploadCount },
            sessionCreatedAt: session.createdAt,
          });
          return MESSAGES.FIRST_UPLOAD;
        }
        if (recentUpload?.status === "limit_reached") return MESSAGES.UPLOAD_LIMIT_REACHED;
        // Partial addition → reply with update guidance + preview link (spec §Failure Handling)
        if (session.previewUrl) {
          return MESSAGES.PARTIAL_UPLOAD_AFTER_PREVIEW(session.previewUrl);
        }
        return null;
      }
      // Text message → reply with preview link (spec §Failure Handling)
      if (session.previewUrl) {
        return MESSAGES.PREVIEW_READY(session.previewUrl);
      }
      return null;
    }

    case "PUBLISHING": {
      // Ignore everything during publish
      return null;
    }

    case "FAILED": {
      if (isMedia) {
        // Allow re-upload after failure
        return await handleUploadInCollectingState(msg, session, adapter);
      }
      return MESSAGES.ASK_CLEARER_PHOTOS;
    }

    case "COOLDOWN": {
      return MESSAGES.RATE_LIMITED;
    }

    default:
      return null;
  }
}

/** Handle upload during COLLECTING_INPUT / AWAITING_MORE_UPLOADS states */
async function handleUploadInCollectingState(
  msg: NormalizedMessage,
  session: MessagingOnboardingRoutingSession,
  adapter: IMessagingProvider,
): Promise<string | null> {
  if (hasProviderMediaUpload(session, msg.media?.providerMediaId)) return null;

  // Check upload limit
  if (session.uploads.length >= UPLOAD_LIMITS.MAX_IMAGES_PER_SESSION) {
    logOnboardingEvent({
      sessionId: session.sessionId,
      provider: session.provider,
      eventType: "UPLOAD_LIMIT_REACHED",
      sessionState: session.state,
      userIdMasked: maskUserId(session.providerUserId),
      metadata: { currentCount: session.uploads.length },
      sessionCreatedAt: session.createdAt,
    });
    return MESSAGES.UPLOAD_LIMIT_REACHED;
  }

  const upload = await processAndStoreUpload(
    msg,
    session.sessionId,
    adapter,
  );

  if (upload === "PASSWORD_PROTECTED_PDF") {
    return MESSAGES.PASSWORD_PROTECTED_PDF;
  }

  if (!upload) {
    // Invalid file type/content. Provider and Storage failures throw and are
    // retried by the durable inbound queue instead of consuming this counter.
    const invalidAttempt = await recordRejectedUpload(session, msg);

    return invalidAttempt.cooldownApplied ? MESSAGES.RATE_LIMITED : MESSAGES.NON_MENU_FILE;
  }

  // Store upload and reset intake timer
  if (typeof upload !== "string") {
    const appendResult = await appendStoredUploadOrCleanup(upload, session);
    if (appendResult.status === "duplicate") return null;
    if (appendResult.status === "limit_reached") return MESSAGES.UPLOAD_LIMIT_REACHED;
  }

  // No reply for subsequent uploads (silent collection)
  return null;
}

/** Persist one post-preview upload and atomically restart after a full resend. */
async function processRecentUpload(
  msg: NormalizedMessage,
  session: MessagingOnboardingRoutingSession,
  adapter: IMessagingProvider,
): Promise<UploadAppendResult | "cooldown" | "invalid" | "password_protected" | null> {
  if (hasProviderMediaUpload(session, msg.media?.providerMediaId)) return null;

  // Process and store the new upload
  const upload = await processAndStoreUpload(
    msg,
    session.sessionId,
    adapter,
  );
  if (upload === "PASSWORD_PROTECTED_PDF") return "password_protected";
  if (!upload) {
    const invalidAttempt = await recordRejectedUpload(session, msg);
    return invalidAttempt.cooldownApplied ? "cooldown" : "invalid";
  }
  return appendStoredUploadOrCleanup(upload, session, {
    restartProviderMessageId: msg.providerMessageId,
    restartOnRecentThreshold: PROCESSING.FULL_RESEND_THRESHOLD,
  });
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/** Detect password-protected PDF by checking for an encryption dictionary. */
function isPdfEncrypted(buffer: Buffer): boolean {
  return buffer.includes(Buffer.from("/Encrypt", "latin1"));
}

function getExtensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "application/pdf": "pdf",
  };
  return map[mimeType] || "bin";
}

function getNextMidnightUTC(): Timestamp {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return Timestamp.fromDate(tomorrow);
}

function getNextMondayUTC(): Timestamp {
  const now = new Date();
  const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
  const nextMonday = new Date(now);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);
  return Timestamp.fromDate(nextMonday);
}
