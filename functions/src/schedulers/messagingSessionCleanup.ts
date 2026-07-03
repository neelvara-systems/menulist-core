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
import { getProviderAdapter } from "../messagingOnboarding/providers/providerRegistry";
import { transitionState } from "../messagingOnboarding/sessionEngine";
import {
  MessagingOnboardingSession,
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

/**
 * Main cleanup logic — called by onSchedule daily.
 */
export async function messagingSessionCleanupLogic(): Promise<{
  expired: number;
  reminders: number;
  cleaned: number;
  inboundCleaned: number;
  errors: number;
}> {
  if (!FEATURE_FLAGS.ENABLE_MESSAGING_ONBOARDING) {
    return { expired: 0, reminders: 0, cleaned: 0, inboundCleaned: 0, errors: 0 };
  }

  const now = Timestamp.now();
  let expired = 0;
  let reminders = 0;
  let cleaned = 0;
  let inboundCleaned = 0;
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
        const session = doc.data() as MessagingOnboardingSession;
        const userMasked = maskUserId(session.providerUserId);

        await transitionState(
          session.sessionId,
          session.state,
          "EXPIRED",
          "24h session expiry",
          { _provider: session.provider, _userIdMasked: userMasked },
        );

        logOnboardingEvent({
          sessionId: session.sessionId,
          provider: session.provider,
          eventType: "SESSION_EXPIRED",
          sessionState: "EXPIRED",
          userIdMasked: userMasked,
          metadata: { previousState: session.state },
          sessionCreatedAt: session.createdAt,
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
    const reminderThreshold = Timestamp.fromMillis(
      now.toMillis() - TIMING.REMINDER_AFTER_MS,
    );

    const reminderSnapshot = await db
      .collection(sessionsCol)
      .where("state", "==", "AWAITING_APPROVAL")
      .where("reminderSentAt", "==", null)
      .limit(20)
      .get();

    for (const doc of reminderSnapshot.docs) {
      try {
        const session = doc.data() as MessagingOnboardingSession;

        // Check if 12h has passed since preview was generated
        const previewEntry = session.stateHistory.find(
          (h) => h.state === "AWAITING_APPROVAL",
        );
        if (
          !previewEntry ||
          previewEntry.timestamp.toMillis() > reminderThreshold.toMillis()
        ) {
          continue; // Not yet 12h since preview
        }

        // Send reminder
        const adapter = getProviderAdapter(session.provider);
        try {
          if (session.previewUrl) {
            await adapter.sendLinkMessage(
              session.providerUserId,
              "Your menu preview is still waiting for your approval.",
              session.previewUrl,
              "View Preview",
            );
          }

          // Mark reminder as sent
          await db.collection(sessionsCol).doc(session.sessionId).update({
            reminderSentAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });

          logOnboardingEvent({
            sessionId: session.sessionId,
            provider: session.provider,
            eventType: "REMINDER_SENT",
            sessionState: "AWAITING_APPROVAL",
            userIdMasked: maskUserId(session.providerUserId),
            sessionCreatedAt: session.createdAt,
          });

          reminders++;
        } catch (sendErr) {
          logger.warn("[Cleanup] Failed to send reminder", {
            sessionIdLength: session.sessionId.length,
            provider: session.provider,
            failureCode: REMINDER_SEND_FAILED_CODE,
            ...getCleanupErrorContext(sendErr),
          });
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
  }

  // 3. Clean up storage for expired sessions (older than 48h to be safe)
  try {
    const cleanupThreshold = Timestamp.fromMillis(
      now.toMillis() - 48 * 60 * 60 * 1000,
    );

    const cleanupSnapshot = await db
      .collection(sessionsCol)
      .where("state", "==", "EXPIRED")
      .where("expiresAt", "<=", cleanupThreshold)
      .limit(20)
      .get();

    const bucket = storageAdmin.bucket();

    for (const doc of cleanupSnapshot.docs) {
      try {
        const session = doc.data() as MessagingOnboardingSession;

        // Delete all uploaded files
        for (const upload of session.uploads) {
          try {
            await bucket.file(upload.storagePath).delete();
          } catch (err) {
            if (isMissingStorageObjectError(err)) {
              continue;
            }
            logger.warn("[Cleanup] Failed to clean session upload file", {
              failureCode: SESSION_FILE_CLEAN_FAILED_CODE,
              ...getCleanupIdLogContext("sessionId", session.sessionId),
              ...getCleanupIdLogContext("uploadId", upload.id),
              ...getCleanupIdLogContext("storagePath", upload.storagePath),
              ...getCleanupErrorContext(err),
            });
            errors++;
          }
        }

        // Delete session document
        await db.collection(sessionsCol).doc(session.sessionId).delete();
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
  }

  // Published uploads are intentionally retained because the created project
  // stores those file URLs for owner dashboard source preview and extraction
  // retry workflows. Expired/non-published sessions are still cleaned above.

  // 4. Clean durable inbound queue docs after their retention window.
  // Firestore TTL may also be enabled, but this keeps cost bounded in projects
  // where TTL setup is delayed or disabled.
  try {
    const inboundSnapshot = await db
      .collection(inboundMessagesCol)
      .where("expiresAt", "<=", now)
      .limit(100)
      .get();

    if (!inboundSnapshot.empty) {
      const batch = db.batch();
      inboundSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      inboundCleaned = inboundSnapshot.size;
    }
  } catch (err) {
    logger.error("[Cleanup] Failed to clean inbound queue", {
      failureCode: INBOUND_CLEANUP_FAILED_CODE,
      ...getCleanupErrorContext(err),
    });
    errors++;
  }

  if (expired > 0 || reminders > 0 || cleaned > 0 || inboundCleaned > 0) {
    logger.info("[Cleanup] Run complete", {
      expired,
      reminders,
      cleaned,
      inboundCleaned,
      errors,
    });
  }

  return { expired, reminders, cleaned, inboundCleaned, errors };
}
