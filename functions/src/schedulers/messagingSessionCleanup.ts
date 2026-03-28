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
import { MessagingOnboardingSession } from "../types/messagingOnboarding.types";

const logger = functions.logger;
const db = firestoreAdmin;
const sessionsCol = DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS;

/**
 * Main cleanup logic — called by onSchedule daily.
 */
export async function messagingSessionCleanupLogic(): Promise<{
  expired: number;
  reminders: number;
  cleaned: number;
  errors: number;
}> {
  if (!FEATURE_FLAGS.ENABLE_MESSAGING_ONBOARDING) {
    return { expired: 0, reminders: 0, cleaned: 0, errors: 0 };
  }

  const now = Timestamp.now();
  let expired = 0;
  let reminders = 0;
  let cleaned = 0;
  let errors = 0;

  // 1. Expire old sessions (24h)
  try {
    const expiredSnapshot = await db
      .collection(sessionsCol)
      .where("state", "not-in", ["LIVE", "EXPIRED"])
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
          sessionId: doc.id,
          error: (err as Error).message,
        });
        errors++;
      }
    }
  } catch (err) {
    logger.error("[Cleanup] Failed to query expired sessions", {
      error: (err as Error).message,
    });
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
            sessionId: session.sessionId,
            error: (sendErr as Error).message,
          });
        }
      } catch (err) {
        errors++;
      }
    }
  } catch (err) {
    logger.error("[Cleanup] Failed to query reminder sessions", {
      error: (err as Error).message,
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
          } catch {
            // File may already be deleted
          }
        }

        // Delete session document
        await db.collection(sessionsCol).doc(session.sessionId).delete();
        cleaned++;
      } catch (err) {
        logger.error("[Cleanup] Failed to clean session", {
          sessionId: doc.id,
          error: (err as Error).message,
        });
        errors++;
      }
    }
  } catch (err) {
    logger.error("[Cleanup] Failed to query cleanup sessions", {
      error: (err as Error).message,
    });
  }

  // 4. Clean up storage for LIVE sessions (uploads no longer needed after publish)
  try {
    const liveCleanupSnapshot = await db
      .collection(sessionsCol)
      .where("state", "==", "LIVE")
      .where("publishedAt", "<=", now)
      .limit(20)
      .get();

    const liveBucket = storageAdmin.bucket();

    for (const doc of liveCleanupSnapshot.docs) {
      try {
        const session = doc.data() as MessagingOnboardingSession;

        // Skip if uploads already cleaned (empty array)
        if (!session.uploads || session.uploads.length === 0) continue;

        // Delete all uploaded files from staging storage
        for (const upload of session.uploads) {
          try {
            await liveBucket.file(upload.storagePath).delete();
          } catch {
            // File may already be deleted
          }
        }

        // Clear uploads array to mark as cleaned (keep session doc for audit)
        await db.collection(sessionsCol).doc(session.sessionId).update({
          uploads: [],
          updatedAt: Timestamp.now(),
        });

        cleaned++;
      } catch (err) {
        logger.error("[Cleanup] Failed to clean LIVE session storage", {
          sessionId: doc.id,
          error: (err as Error).message,
        });
        errors++;
      }
    }
  } catch (err) {
    logger.error("[Cleanup] Failed to query LIVE sessions for storage cleanup", {
      error: (err as Error).message,
    });
  }

  if (expired > 0 || reminders > 0 || cleaned > 0) {
    logger.info("[Cleanup] Run complete", {
      expired,
      reminders,
      cleaned,
      errors,
    });
  }

  return { expired, reminders, cleaned, errors };
}
