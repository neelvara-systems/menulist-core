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
  MessagingOnboardingRateLimit,
  MessagingOnboardingSession,
  MessagingOnboardingState,
  MessagingProvider,
  NormalizedMessage,
  SessionUpload,
  TERMINAL_STATES,
} from "../types/messagingOnboarding.types";
import {
  isTransitionForbidden,
  MESSAGES,
  PROCESSING,
  RATE_LIMITS,
  TIMING,
  UPLOAD_LIMITS,
} from "./constants";
import { logOnboardingEvent, maskUserId } from "./eventLogger";
import { IMessagingProvider } from "./providers/IMessagingProvider";

const logger = functions.logger;
const db = firestoreAdmin;
const sessionsCol = DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS;
const rateLimitsCol = DB_COLLECTIONS.MESSAGING_ONBOARDING_RATE_LIMITS;

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
  if (error instanceof Error) return (error.name || "Error").slice(0, 80);
  return typeof error;
}

function getSessionEngineErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  const code = (error as { code?: unknown }).code;
  if (code === undefined || code === null) return undefined;
  return String(code).slice(0, 64);
}

function getSessionEngineErrorContext(error: unknown): Record<string, string | undefined> {
  return {
    errorName: getSessionEngineErrorName(error),
    errorCode: getSessionEngineErrorCode(error),
  };
}

// ═══════════════════════════════════════════════════════════════
// SESSION LOOKUP & CREATION
// ═══════════════════════════════════════════════════════════════

/** Find active (non-terminal) session for a provider+user */
export async function findActiveSession(
  provider: MessagingProvider,
  providerUserId: string,
): Promise<MessagingOnboardingSession | null> {
  const snapshot = await db
    .collection(sessionsCol)
    .where("provider", "==", provider)
    .where("providerUserId", "==", providerUserId)
    .where("state", "not-in", TERMINAL_STATES)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as MessagingOnboardingSession;
}

/** Find any LIVE session for a provider+user */
export async function findLiveSession(
  provider: MessagingProvider,
  providerUserId: string,
): Promise<MessagingOnboardingSession | null> {
  const snapshot = await db
    .collection(sessionsCol)
    .where("provider", "==", provider)
    .where("providerUserId", "==", providerUserId)
    .where("state", "==", "LIVE")
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as MessagingOnboardingSession;
}

/** Check if this phone is linked to an existing store (any onboarding source) */
export async function findExistingStoreByPhone(
  phoneDisplay: string,
): Promise<{ storeId: number; tenantId: number } | null> {
  // Check users collection for phone match
  const snapshot = await db
    .collection(DB_COLLECTIONS.USERS)
    .where("phone", "==", phoneDisplay)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const userData = snapshot.docs[0].data();
  if (userData.storeId && userData.tenantId) {
    return { storeId: userData.storeId, tenantId: userData.tenantId };
  }
  return null;
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
    pendingUploadsWhileProcessing: false,

    lastUploadAt: now,
    intakeExpiresAt,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    expiresAt,
  };

  await sessionRef.set(session);

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
  additionalUpdates: Record<string, any> = {},
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

  await sessionRef.update({
    state: newState,
    stateHistory: FieldValue.arrayUnion({
      state: newState,
      timestamp: now,
      reason,
    }),
    updatedAt: now,
    ...additionalUpdates,
  });

  logOnboardingEvent({
    sessionId,
    provider: additionalUpdates._provider || "whatsapp",
    eventType: "SESSION_STATE_CHANGED",
    sessionState: newState,
    userIdMasked: additionalUpdates._userIdMasked || "****",
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
    !UPLOAD_LIMITS.ALLOWED_MIME_TYPES.includes(
      msg.media.mimeType as (typeof UPLOAD_LIMITS.ALLOWED_MIME_TYPES)[number],
    )
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
    if (buffer.length > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) {
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
    const uploadId = crypto.randomUUID();
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

    return null;
  }
}

/** Check if upload is duplicate by SHA-256 */
export function isDuplicateUpload(
  session: MessagingOnboardingSession,
  sha256: string,
): boolean {
  return session.uploads.some((u) => u.sha256 === sha256);
}

/** Add upload to session and reset intake timer (with Fast Start logic — spec §Smart Intake Logic) */
export async function addUploadToSession(
  sessionId: string,
  upload: SessionUpload,
  session: MessagingOnboardingSession,
): Promise<void> {
  const now = Timestamp.now();
  const totalUploadsAfterAdd = session.uploads.length + 1;
  const hasPdf = upload.mimeType === "application/pdf" ||
    session.uploads.some((u) => u.mimeType === "application/pdf");

  // Smart Intake Timing (spec §Smart Intake Logic):
  // - PDF received → 60s idle window
  // - ≥4 uploads → 90s idle window
  // - Default → 10 min max wait
  let intakeDelayMs = TIMING.INTAKE_WINDOW_MS; // Default: 10 min
  if (hasPdf) {
    intakeDelayMs = TIMING.PDF_FAST_START_IDLE_MS; // 60s
  } else if (totalUploadsAfterAdd >= TIMING.FAST_START_MIN_UPLOADS) {
    intakeDelayMs = TIMING.FAST_START_IDLE_MS; // 90s
  }

  const newIntakeExpiresAt = Timestamp.fromMillis(
    now.toMillis() + intakeDelayMs,
  );

  const sessionRef = db.collection(sessionsCol).doc(sessionId);

  await sessionRef.update({
    uploads: FieldValue.arrayUnion(upload),
    lastUploadAt: now,
    intakeExpiresAt: newIntakeExpiresAt,
    updatedAt: now,
  });

  logOnboardingEvent({
    sessionId,
    provider: session.provider,
    eventType: "UPLOAD_RECEIVED",
    sessionState: session.state,
    userIdMasked: maskUserId(session.providerUserId),
    metadata: {
      mimeType: upload.mimeType,
      fileSize: upload.fileSize,
      uploadIndex: session.uploads.length + 1,
    },
    sessionCreatedAt: session.createdAt,
  });
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

  const rateLimit = doc.data() as MessagingOnboardingRateLimit;
  const now = Date.now();

  // Check cooldown
  if (rateLimit.cooldownUntil && rateLimit.cooldownUntil.toMillis() > now) {
    return "cooldown";
  }

  let sessionsToday = rateLimit.sessionsToday || 0;
  let sessionsThisWeek = rateLimit.sessionsThisWeek || 0;
  const resetUpdates: Record<string, unknown> = {};

  // Reset counters first, then still evaluate the other active windows.
  // Returning early here allowed a weekly-capped user through on day rollover.
  if (rateLimit.dayResetAt.toMillis() <= now) {
    sessionsToday = 0;
    resetUpdates.sessionsToday = 0;
    resetUpdates.dayResetAt = getNextMidnightUTC();
  }

  if (rateLimit.weekResetAt.toMillis() <= now) {
    sessionsThisWeek = 0;
    resetUpdates.sessionsThisWeek = 0;
    resetUpdates.processingRunsThisWeek = 0;
    resetUpdates.weekResetAt = getNextMondayUTC();
  }

  if (Object.keys(resetUpdates).length > 0) {
    await rateLimitRef.update(resetUpdates);
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

/** Increment session count in rate limiter */
export async function incrementSessionCount(
  provider: MessagingProvider,
  providerUserId: string,
): Promise<void> {
  const userHash = getUserHash(provider, providerUserId);
  const rateLimitRef = db.collection(rateLimitsCol).doc(userHash);
  const doc = await rateLimitRef.get();

  const now = Timestamp.now();

  if (!doc.exists) {
    const rateLimit: MessagingOnboardingRateLimit = {
      userHash,
      sessionsToday: 1,
      sessionsThisWeek: 1,
      processingRunsThisWeek: 0,
      lastSessionAt: now,
      cooldownUntil: null,
      dayResetAt: getNextMidnightUTC(),
      weekResetAt: getNextMondayUTC(),
    };
    await rateLimitRef.set(rateLimit);
  } else {
    await rateLimitRef.update({
      sessionsToday: FieldValue.increment(1),
      sessionsThisWeek: FieldValue.increment(1),
      lastSessionAt: now,
    });
  }
}

/** Apply cooldown to user */
export async function applyCooldown(
  provider: MessagingProvider,
  providerUserId: string,
): Promise<void> {
  const userHash = getUserHash(provider, providerUserId);
  const rateLimitRef = db.collection(rateLimitsCol).doc(userHash);
  const cooldownUntil = Timestamp.fromMillis(
    Date.now() + RATE_LIMITS.COOLDOWN_HOURS * 60 * 60 * 1000,
  );
  await rateLimitRef.set({ cooldownUntil }, { merge: true });
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
    // Legacy safety for sessions created before the durable inbound queue.
    // New messages are not appended here; the queue owns dedup so every active
    // session message does not pay an extra Firestore write.
    if (activeSession.providerMessageIds?.includes(msg.providerMessageId)) {
      return null; // Already processed
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

    // Create session with initial upload (using pre-generated ID)
    await createSessionWithId(preGeneratedSessionId, msg, upload);

    // Increment rate limit counter
    await incrementSessionCount(msg.provider, msg.userId);

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
  session: MessagingOnboardingSession,
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
        // Store upload, set pendingUploadsWhileProcessing
        const upload = await processAndStoreUpload(
          msg,
          session.sessionId,
          adapter,
        );
        if (upload === "PASSWORD_PROTECTED_PDF") {
          return MESSAGES.PASSWORD_PROTECTED_PDF;
        }
        if (upload && !isDuplicateUpload(session, upload.sha256)) {
          await addUploadToSession(session.sessionId, upload, session);
          await db
            .collection(sessionsCol)
            .doc(session.sessionId)
            .update({
              pendingUploadsWhileProcessing: true,
              updatedAt: Timestamp.now(),
            });
        }
      }
      return null;
    }

    case "PREVIEW_READY":
    case "AWAITING_APPROVAL": {
      if (isMedia) {
        // Count new uploads in this batch
        const recentUploads = await countRecentUploads(msg, session, adapter);
        if (recentUploads >= PROCESSING.FULL_RESEND_THRESHOLD) {
          // Full resend → restart
          logOnboardingEvent({
            sessionId: session.sessionId,
            provider: session.provider,
            eventType: "FULL_RESEND_DETECTED",
            sessionState: session.state,
            userIdMasked: maskUserId(session.providerUserId),
            metadata: { uploadCount: recentUploads },
            sessionCreatedAt: session.createdAt,
          });
          await restartSession(session);
          return MESSAGES.FIRST_UPLOAD;
        }
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
  session: MessagingOnboardingSession,
  adapter: IMessagingProvider,
): Promise<string | null> {
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
    // Invalid file type or download failed
    const newInvalidCount = session.invalidUploadAttempts + 1;
    await db
      .collection(sessionsCol)
      .doc(session.sessionId)
      .update({
        invalidUploadAttempts: newInvalidCount,
        updatedAt: Timestamp.now(),
      });

    logOnboardingEvent({
      sessionId: session.sessionId,
      provider: session.provider,
      eventType: "UPLOAD_REJECTED",
      sessionState: session.state,
      userIdMasked: maskUserId(session.providerUserId),
      metadata: {
        mimeType: msg.media?.mimeType,
        invalidCount: newInvalidCount,
      },
      sessionCreatedAt: session.createdAt,
    });

    if (newInvalidCount >= RATE_LIMITS.MAX_INVALID_UPLOAD_ATTEMPTS) {
      await applyCooldown(session.provider, session.providerUserId);
      logOnboardingEvent({
        sessionId: session.sessionId,
        provider: session.provider,
        eventType: "COOLDOWN_APPLIED",
        sessionState: session.state,
        userIdMasked: maskUserId(session.providerUserId),
        metadata: { reason: "max_invalid_uploads" },
        sessionCreatedAt: session.createdAt,
      });
    }

    return MESSAGES.NON_MENU_FILE;
  }

  // Check for duplicate
  if (typeof upload !== "string" && isDuplicateUpload(session, upload.sha256)) {
    // Delete the orphaned Storage file (already uploaded before dedup check)
    try {
      const bucket = storageAdmin.bucket();
      await bucket.file(upload.storagePath).delete();
    } catch (error) {
      logger.warn("[SessionEngine] Duplicate upload cleanup failed", {
        ...getSessionEngineIdLogContext("sessionId", session.sessionId),
        ...getSessionEngineIdLogContext("uploadId", upload.id),
        ...getSessionEngineIdLogContext("storagePath", upload.storagePath),
        ...getSessionEngineErrorContext(error),
      });
    }

    logOnboardingEvent({
      sessionId: session.sessionId,
      provider: session.provider,
      eventType: "UPLOAD_DEDUPLICATED",
      sessionState: session.state,
      userIdMasked: maskUserId(session.providerUserId),
      metadata: { sha256: upload.sha256.slice(0, 8) },
      sessionCreatedAt: session.createdAt,
    });
    // Silently ignore duplicate — no reply
    return null;
  }

  // Store upload and reset intake timer
  if (typeof upload !== "string") {
    await addUploadToSession(session.sessionId, upload, session);
  }

  // If session was in FAILED state, transition back to COLLECTING_INPUT
  if (session.state === "FAILED") {
    await transitionState(
      session.sessionId,
      "FAILED",
      "COLLECTING_INPUT",
      "Re-upload after failure",
      {
        _provider: session.provider,
        _userIdMasked: maskUserId(session.providerUserId),
      },
    );
  }

  // No reply for subsequent uploads (silent collection)
  return null;
}

/** Restart session to COLLECTING_INPUT (full resend) */
async function restartSession(
  session: MessagingOnboardingSession,
): Promise<void> {
  const now = Timestamp.now();
  const newIntakeExpiresAt = Timestamp.fromMillis(
    now.toMillis() + TIMING.INTAKE_WINDOW_MS,
  );

  await db.collection(sessionsCol).doc(session.sessionId).update({
    state: "COLLECTING_INPUT",
    stateHistory: FieldValue.arrayUnion({
      state: "COLLECTING_INPUT",
      timestamp: now,
      reason: "Full resend detected",
    }),
    // Keep uploads — they'll be re-validated
    validMenuFiles: [],
    invalidFiles: [],
    menuCompleteness: null,
    validationConfidence: null,
    extractedBusinessInfo: null,
    extractionJobId: null,
    extractedMenuData: null,
    qualityScore: null,
    previewToken: null,
    previewUrl: null,
    pendingUploadsWhileProcessing: false,
    lastUploadAt: now,
    intakeExpiresAt: newIntakeExpiresAt,
    updatedAt: now,
  });

  logOnboardingEvent({
    sessionId: session.sessionId,
    provider: session.provider,
    eventType: "SESSION_RESTARTED",
    sessionState: "COLLECTING_INPUT",
    userIdMasked: maskUserId(session.providerUserId),
    sessionCreatedAt: session.createdAt,
  });
}

/** Count recent uploads for full-resend detection.
 * NOTE: session.uploads is the LOCAL (stale) copy read before this function.
 * addUploadToSession writes to Firestore but does NOT mutate the local object.
 * So session.uploads does NOT include the just-added upload — the +1 accounts for it.
 */
async function countRecentUploads(
  msg: NormalizedMessage,
  session: MessagingOnboardingSession,
  adapter: IMessagingProvider,
): Promise<number> {
  // Process and store the new upload
  const upload = await processAndStoreUpload(
    msg,
    session.sessionId,
    adapter,
  );
  const uploadSucceeded = upload && upload !== "PASSWORD_PROTECTED_PDF" && !isDuplicateUpload(session, upload.sha256);
  if (uploadSucceeded && typeof upload !== "string") {
    await addUploadToSession(session.sessionId, upload, session);
  }

  // Count uploads in the stale local array that arrived after preview was generated
  const previewGeneratedAt = session.stateHistory.find(
    (h) => h.state === "PREVIEW_READY" || h.state === "AWAITING_APPROVAL",
  )?.timestamp;

  if (!previewGeneratedAt) return uploadSucceeded ? 1 : 0;

  const recentUploadsFromStaleArray = session.uploads.filter(
    (u) => u.uploadedAt.toMillis() > previewGeneratedAt.toMillis(),
  );

  // +1 for the just-added upload (not in stale array), +0 if upload failed/duplicate
  return recentUploadsFromStaleArray.length + (uploadSucceeded ? 1 : 0);
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/** Detect password-protected PDF by checking for /Encrypt in PDF header (spec §Failure Handling) */
function isPdfEncrypted(buffer: Buffer): boolean {
  // Check first 4KB of PDF for /Encrypt dictionary entry
  const header = buffer.subarray(0, Math.min(buffer.length, 4096)).toString("latin1");
  return header.includes("/Encrypt");
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
