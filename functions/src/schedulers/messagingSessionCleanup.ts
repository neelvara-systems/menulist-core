/**
 * Messaging Session Cleanup — Scheduled Cloud Function (daily at 4 AM UTC)
 *
 * Handles session expiry, 12h reminders, and storage cleanup.
 *
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §7 Phase 4
 */

import { Timestamp } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import { DB_COLLECTIONS } from "../constants/database";
import { firestoreAdmin, storageAdmin } from "../firebaseAdmin";
import { FEATURE_FLAGS, TIMING } from "../messagingOnboarding/constants";
import { logOnboardingEvent, maskUserId } from "../messagingOnboarding/eventLogger";
import {
  claimMessagingReminder,
  completeMessagingReminder,
  quarantineInvalidMessagingCleanupSession,
  releaseMessagingReminder,
} from "../messagingOnboarding/reminderLease";
import { getProviderAdapter } from "../messagingOnboarding/providers/providerRegistry";
import { normalizeMessagingPreviewBaseUrl } from "../messagingOnboarding/previewUrlBoundary";
import {
  getMessagingExpiryTransitionPath,
  normalizeMessagingCleanupSession,
} from "../messagingOnboarding/sessionCleanupBoundary";
import { transitionState } from "../messagingOnboarding/sessionEngine";
import { drainMessagingPendingUploadCleanup } from "../messagingOnboarding/uploadCleanup";
import {
  MessagingOnboardingState,
} from "../types/messagingOnboarding.types";

const logger = functions.logger;
const db = firestoreAdmin;
const sessionsCol = DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS;
const inboundMessagesCol = DB_COLLECTIONS.MESSAGING_ONBOARDING_INBOUND_MESSAGES;
const SESSION_EXPIRE_FAILED_CODE = "MESSAGING_SESSION_EXPIRE_FAILED";
const EXPIRED_SESSION_QUERY_FAILED_CODE = "MESSAGING_EXPIRED_SESSION_QUERY_FAILED";
const REMINDER_SEND_FAILED_CODE = "MESSAGING_SESSION_REMINDER_SEND_FAILED";
const REMINDER_SESSION_FAILED_CODE = "MESSAGING_SESSION_REMINDER_FAILED";
const REMINDER_QUERY_FAILED_CODE = "MESSAGING_SESSION_REMINDER_QUERY_FAILED";
const SESSION_CLEAN_FAILED_CODE = "MESSAGING_SESSION_CLEAN_FAILED";
const SESSION_FILE_CLEAN_FAILED_CODE = "MESSAGING_SESSION_FILE_CLEAN_FAILED";
const TERMINAL_SESSION_INVALID_CODE = "MESSAGING_TERMINAL_SESSION_INVALID";
const CLEANUP_QUERY_FAILED_CODE = "MESSAGING_SESSION_CLEANUP_QUERY_FAILED";
const INBOUND_CLEANUP_FAILED_CODE = "MESSAGING_INBOUND_CLEANUP_FAILED";
const EXPIRABLE_STATES: MessagingOnboardingState[] = [
  "COLLECTING_INPUT",
  "VALIDATING_ASSETS",
  "AWAITING_MORE_UPLOADS",
  "PROCESSING_MENU",
  "PREVIEW_READY",
  "AWAITING_APPROVAL",
  "PUBLISHING",
  "FAILED",
];
const CLEANABLE_TERMINAL_STATES: MessagingOnboardingState[] = ["EXPIRED", "COOLDOWN"];

function getCleanupErrorName(error: unknown): string {
  if (error instanceof Error) return (error.name || "Error").slice(0, 80);
  return typeof error;
}

function getCleanupErrorCode(error: Error): string | undefined {
  const code = (error as { code?: unknown }).code;
  if (code === undefined || code === null) return undefined;
  return String(code).slice(0, 64);
}

function getCleanupErrorStatus(error: Error): number | undefined {
  const status = Number((error as { status?: unknown; statusCode?: unknown }).status
    || (error as { statusCode?: unknown }).statusCode);
  return Number.isFinite(status) ? status : undefined;
}

function getCleanupErrorContext(error: unknown): {
  sourceErrorName: string;
  sourceErrorCode?: string;
  sourceErrorStatus?: number;
} {
  if (error instanceof Error) {
    return {
      sourceErrorName: getCleanupErrorName(error),
      sourceErrorCode: getCleanupErrorCode(error),
      sourceErrorStatus: getCleanupErrorStatus(error),
    };
  }

  return {
    sourceErrorName: getCleanupErrorName(error),
  };
}

function getCleanupIdLogContext(
  label: string,
  value: unknown,
): Record<string, boolean | number> {
  const normalized = value === undefined || value === null ? "" : String(value);
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

function isMissingStorageObjectError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: unknown }).code;
  const codeText = code === undefined || code === null ? "" : String(code).toLowerCase();
  return getCleanupErrorStatus(error) === 404 || codeText === "404" || codeText === "not-found";
}

function isFailedPreconditionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: unknown }).code;
  const codeText = code === undefined || code === null ? "" : String(code).toLowerCase();
  return code === 9 || codeText === "9" || codeText === "failed-precondition";
}

/**
 * Main cleanup logic — called by onSchedule daily.
 */
export async function messagingSessionCleanupLogic(): Promise<{
  expired: number;
  reminders: number;
  cleaned: number;
  uploadCleanupDrained: number;
  inboundCleaned: number;
  errors: number;
}> {
  if (!FEATURE_FLAGS.ENABLE_MESSAGING_ONBOARDING) {
    return {
      expired: 0,
      reminders: 0,
      cleaned: 0,
      uploadCleanupDrained: 0,
      inboundCleaned: 0,
      errors: 0,
    };
  }

  const now = Timestamp.now();
  let expired = 0;
  let reminders = 0;
  let cleaned = 0;
  let inboundCleaned = 0;
  let uploadCleanupDrained = 0;
  let errors = 0;

  // 1. Expire old sessions (24h)
  try {
    const expiredSnapshot = await db
      .collection(sessionsCol)
      .where("state", "in", EXPIRABLE_STATES)
      .where("expiresAt", "<=", now)
      .limit(50)
      .get();

    for (const doc of expiredSnapshot.docs) {
      try {
        const session = normalizeMessagingCleanupSession(doc.data(), doc.id);
        if (!session || !EXPIRABLE_STATES.includes(session.state)) {
          await quarantineInvalidMessagingCleanupSession({
            docRef: doc.ref,
            lastUpdateTime: doc.updateTime,
            now,
            stage: "expiry",
          });
          errors++;
          continue;
        }
        const userMasked = maskUserId(session.providerUserId);

        let currentState = session.state;
        let transitioned = true;
        for (const nextState of getMessagingExpiryTransitionPath(session.state)) {
          transitioned = await transitionState(
            session.sessionId,
            currentState,
            nextState,
            nextState === "FAILED"
              ? "Interrupted work exceeded the session lifetime"
              : "24h session expiry",
            { _provider: session.provider, _userIdMasked: userMasked },
          );
          if (!transitioned) break;
          currentState = nextState;
        }
        if (!transitioned || currentState !== "EXPIRED") continue;

        logOnboardingEvent({
          sessionId: session.sessionId,
          provider: session.provider,
          eventType: "SESSION_EXPIRED",
          sessionState: "EXPIRED",
          userIdMasked: userMasked,
          metadata: { previousState: session.state },
          sessionCreatedAt: Timestamp.fromMillis(session.createdAtMillis),
        });

        expired++;
      } catch (err) {
        logger.error("[Cleanup] Failed to expire session", {
          sessionIdLength: doc.id.length,
          failureCode: SESSION_EXPIRE_FAILED_CODE,
          ...getCleanupErrorContext(err),
        });
        errors++;
      }
    }
  } catch (err) {
    logger.error("[Cleanup] Failed to query expired sessions", {
      failureCode: EXPIRED_SESSION_QUERY_FAILED_CODE,
      ...getCleanupErrorContext(err),
    });
    errors++;
  }

  // 2. Send 12h reminders for AWAITING_APPROVAL sessions
  try {
    const expectedPreviewBaseUrl = normalizeMessagingPreviewBaseUrl(
      process.env.NEXT_PUBLIC_MSG_PREVIEW_BASE_URL,
      process.env.FUNCTIONS_EMULATOR === "true",
    );
    if (!expectedPreviewBaseUrl) throw new Error("MESSAGING_PREVIEW_BASE_URL_INVALID");
    const reminderSnapshot = await db
      .collection(sessionsCol)
      .where("state", "==", "AWAITING_APPROVAL")
      .where("reminderSentAt", "==", null)
      .where("expiresAt", ">", now)
      .orderBy("expiresAt", "asc")
      .limit(20)
      .get();

    for (const doc of reminderSnapshot.docs) {
      const sessionDocumentId = doc.id;
      try {
        const claim = await claimMessagingReminder({
          db,
          expectedPreviewBaseUrl,
          now,
          reminderAfterMs: TIMING.REMINDER_AFTER_MS,
          sessionId: sessionDocumentId,
        });
        if (claim.status === "invalid") {
          await quarantineInvalidMessagingCleanupSession({
            docRef: doc.ref,
            lastUpdateTime: doc.updateTime,
            now,
            stage: "reminder",
          });
          errors++;
          continue;
        }
        if (claim.status !== "claimed") continue;
        const { session, token } = claim;

        // Send reminder
        const adapter = getProviderAdapter(session.provider);
        try {
          await adapter.sendLinkMessage(
            session.providerUserId,
            "Your menu preview is still waiting for your approval.",
            session.previewUrl,
            "View Preview",
          );

          // Mark reminder as sent
          const completed = await completeMessagingReminder({
            db,
            now: Timestamp.now(),
            sessionId: session.sessionId,
            token,
          });
          if (!completed) {
            logger.warn("[Cleanup] Reminder completion lease was no longer current", {
              failureCode: REMINDER_SESSION_FAILED_CODE,
              ...getCleanupIdLogContext("sessionId", session.sessionId),
            });
            errors++;
            continue;
          }

          logOnboardingEvent({
            sessionId: session.sessionId,
            provider: session.provider,
            eventType: "REMINDER_SENT",
            sessionState: "AWAITING_APPROVAL",
            userIdMasked: maskUserId(session.providerUserId),
            sessionCreatedAt: Timestamp.fromMillis(session.createdAtMillis),
          });

          reminders++;
        } catch (sendErr) {
          await releaseMessagingReminder({
            db,
            now: Timestamp.now(),
            sessionId: session.sessionId,
            token,
          }).catch((releaseError) => {
            logger.warn("[Cleanup] Failed to release reminder lease", {
              failureCode: REMINDER_SESSION_FAILED_CODE,
              ...getCleanupIdLogContext("sessionId", session.sessionId),
              ...getCleanupErrorContext(releaseError),
            });
          });
          logger.warn("[Cleanup] Failed to send reminder", {
            sessionIdLength: session.sessionId.length,
            provider: session.provider,
            failureCode: REMINDER_SEND_FAILED_CODE,
            ...getCleanupErrorContext(sendErr),
          });
          errors++;
        }
      } catch (err) {
        logger.error("[Cleanup] Failed to process reminder session", {
          sessionIdLength: doc.id.length,
          failureCode: REMINDER_SESSION_FAILED_CODE,
          ...getCleanupErrorContext(err),
        });
        errors++;
      }
    }
  } catch (err) {
    logger.error("[Cleanup] Failed to query reminder sessions", {
      failureCode: REMINDER_QUERY_FAILED_CODE,
      ...getCleanupErrorContext(err),
    });
    errors++;
  }

  // 3. Clean up storage for expired sessions (older than 48h to be safe)
  try {
    const cleanupThreshold = Timestamp.fromMillis(
      now.toMillis() - 48 * 60 * 60 * 1000,
    );

    const cleanupSnapshot = await db
      .collection(sessionsCol)
      .where("state", "in", CLEANABLE_TERMINAL_STATES)
      .where("expiresAt", "<=", cleanupThreshold)
      .limit(20)
      .get();

    const bucket = storageAdmin.bucket();

    for (const doc of cleanupSnapshot.docs) {
      try {
        const session = normalizeMessagingCleanupSession(doc.data(), doc.id);
        if (
          !session
          || !CLEANABLE_TERMINAL_STATES.includes(session.state)
          || session.expiresAtMillis > cleanupThreshold.toMillis()
        ) {
          // The queried document itself is already beyond the terminal
          // retention threshold. Never trust or delete embedded Storage paths
          // from an invalid shape, but remove the document with a snapshot
          // precondition so it cannot poison this bounded query forever or
          // target a different session.
          await doc.ref.delete({ lastUpdateTime: doc.updateTime });
          logger.error("[Cleanup] Invalid terminal session removed without Storage deletion", {
            failureCode: TERMINAL_SESSION_INVALID_CODE,
            sessionIdLength: doc.id.length,
          });
          errors++;
          continue;
        }

        // Delete all uploaded files
        let allFilesDeleted = true;
        for (const upload of session.uploads) {
          try {
            await bucket.file(upload.storagePath).delete();
          } catch (err) {
            if (isMissingStorageObjectError(err)) {
              continue;
            }
            logger.warn("[Cleanup] Failed to clean session upload file", {
              failureCode: SESSION_FILE_CLEAN_FAILED_CODE,
              sessionIdLength: session.sessionId.length,
              ...getCleanupIdLogContext("sessionId", session.sessionId),
              ...getCleanupIdLogContext("uploadId", upload.id),
              ...getCleanupIdLogContext("storagePath", upload.storagePath),
              ...getCleanupErrorContext(err),
            });
            allFilesDeleted = false;
            errors++;
          }
        }
        if (!allFilesDeleted) continue;

        // Delete session document
        await doc.ref.delete({ lastUpdateTime: doc.updateTime });
        cleaned++;
      } catch (err) {
        logger.error("[Cleanup] Failed to clean session", {
          sessionIdLength: doc.id.length,
          failureCode: SESSION_CLEAN_FAILED_CODE,
          ...getCleanupErrorContext(err),
        });
        errors++;
      }
    }
  } catch (err) {
    logger.error("[Cleanup] Failed to query cleanup sessions", {
      failureCode: CLEANUP_QUERY_FAILED_CODE,
      ...getCleanupErrorContext(err),
    });
    errors++;
  }

  // Published authoritative uploads are intentionally retained because the
  // project stores those source URLs. Unapproved replacement/superseded files
  // use a separate durable cleanup queue and are safe to remove.
  try {
    const uploadCleanupSnapshot = await db
      .collection(sessionsCol)
      .where("uploadCleanupPending", "==", true)
      .limit(20)
      .get();
    for (const doc of uploadCleanupSnapshot.docs) {
      const result = await drainMessagingPendingUploadCleanup({ sessionId: doc.id });
      if (result.status === "drained") uploadCleanupDrained += result.deleted;
      if (result.status === "failed" || result.status === "invalid") errors++;
    }
  } catch (err) {
    logger.error("[Cleanup] Failed to drain messaging upload cleanup", {
      failureCode: SESSION_FILE_CLEAN_FAILED_CODE,
      ...getCleanupErrorContext(err),
    });
    errors++;
  }

  // 4. Clean durable inbound queue docs after their retention window.
  // Firestore TTL may also be enabled, but this keeps cost bounded in projects
  // where TTL setup is delayed or disabled.
  try {
    const inboundSnapshot = await db
      .collection(inboundMessagesCol)
      .where("expiresAt", "<=", now)
      .limit(100)
      .get();

    for (const doc of inboundSnapshot.docs) {
      if (doc.get("status") === "PROCESSING") continue;
      try {
        await doc.ref.delete({ lastUpdateTime: doc.updateTime });
        inboundCleaned++;
      } catch (error) {
        // A worker changed the row after this cleanup query. Keep the newer
        // state and let a later retention pass re-evaluate it.
        if (isFailedPreconditionError(error)) continue;
        throw error;
      }
    }
  } catch (err) {
    logger.error("[Cleanup] Failed to clean inbound queue", {
      failureCode: INBOUND_CLEANUP_FAILED_CODE,
      ...getCleanupErrorContext(err),
    });
    errors++;
  }

  if (
    expired > 0
    || reminders > 0
    || cleaned > 0
    || uploadCleanupDrained > 0
    || inboundCleaned > 0
  ) {
    logger.info("[Cleanup] Run complete", {
      expired,
      reminders,
      cleaned,
      uploadCleanupDrained,
      inboundCleaned,
      errors,
    });
  }

  return { expired, reminders, cleaned, uploadCleanupDrained, inboundCleaned, errors };
}
