/**
 * Onboarding Event Logger — Fire-and-Forget Tracking (MOL-Inspired)
 *
 * Pattern: Same as MOL's logMOLEvent — NEVER blocks the main operation.
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §16
 */

import * as functions from "firebase-functions";
import { Timestamp } from "firebase-admin/firestore";
import { DB_COLLECTIONS } from "../constants/database";
import { firestoreAdmin } from "../firebaseAdmin";
import {
  MessagingOnboardingState,
  MessagingProvider,
  MsgOnboardingEvent,
  MsgOnboardingEventType,
} from "../types/messagingOnboarding.types";
import { FEATURE_FLAGS } from "./constants";

const logger = functions.logger;
const db = firestoreAdmin;

/**
 * Log an onboarding event (fire-and-forget, non-blocking)
 *
 * Failures are logged to Cloud Functions logger but do not throw.
 */
export async function logOnboardingEvent(params: {
  sessionId: string;
  provider: MessagingProvider;
  eventType: MsgOnboardingEventType;
  sessionState: MessagingOnboardingState;
  userIdMasked: string;
  metadata?: Record<string, any>;
  sessionCreatedAt?: Timestamp;
  error?: MsgOnboardingEvent["error"];
}): Promise<void> {
  if (!FEATURE_FLAGS.ENABLE_MESSAGING_ONBOARDING_TRACKING) return;

  try {
    const now = Timestamp.now();
    const sessionAgeMs = params.sessionCreatedAt
      ? now.toMillis() - params.sessionCreatedAt.toMillis()
      : 0;

    const eventId = db.collection("_").doc().id;

    const event: MsgOnboardingEvent = {
      eventId,
      sessionId: params.sessionId,
      provider: params.provider,
      eventType: params.eventType,
      sessionState: params.sessionState,
      userIdMasked: params.userIdMasked,
      metadata: params.metadata || {},
      timestamp: now,
      sessionAgeMs,
      ...(params.error && { error: params.error }),
    };

    // Fire-and-forget write
    db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
      .doc(eventId)
      .set(event)
      .catch((err) => {
        logger.warn("[Msg-Tracking] Failed to log event", {
          eventType: params.eventType,
          sessionId: params.sessionId,
          error: (err as Error).message,
        });
      });
  } catch (err) {
    // Silent failure — tracking is non-critical
    logger.warn("[Msg-Tracking] Error preparing event", {
      eventType: params.eventType,
      error: (err as Error).message,
    });
  }
}

/** Helper: mask user ID for PII protection */
export function maskUserId(providerUserId: string): string {
  return providerUserId.slice(-4);
}
