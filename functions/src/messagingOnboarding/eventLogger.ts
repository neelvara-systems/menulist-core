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
import { FEATURE_FLAGS, RETENTION } from "./constants";

const logger = functions.logger;
const db = firestoreAdmin;
const MSG_ONBOARDING_EVENT_WRITE_FAILED = "MSG_ONBOARDING_EVENT_WRITE_FAILED";
const MSG_ONBOARDING_EVENT_PREPARE_FAILED = "MSG_ONBOARDING_EVENT_PREPARE_FAILED";
const MAX_EVENT_METADATA_KEYS = 40;
const MAX_EVENT_METADATA_STRING_LENGTH = 96;

const SAFE_EVENT_METADATA_KEYS = new Set([
  "attempts",
  "businessType",
  "categoryCount",
  "completeness",
  "confidence",
  "currentCount",
  "exhausted",
  "fileCount",
  "fileSize",
  "fromState",
  "hasMedia",
  "invalidCount",
  "itemCount",
  "maxSize",
  "menuCompleteness",
  "messageLength",
  "messageType",
  "metadataDroppedCount",
  "mimeType",
  "processingRuns",
  "processingTime",
  "qualityScore",
  "reason",
  "reportedSize",
  "runs",
  "sessionIdLength",
  "sessionIdPresent",
  "targetPublishRate",
  "toState",
  "trigger",
  "uploadCount",
  "validCount",
]);

const BOUNDED_EVENT_METADATA_KEYS = new Set([
  "businessName",
  "dashboardUrl",
  "extractionJobId",
  "imageUrl",
  "ip",
  "messageId",
  "path",
  "phone",
  "phoneNumber",
  "previewUrl",
  "projectId",
  "providerMessageId",
  "providerUserId",
  "publicUrl",
  "sessionId",
  "sha256",
  "storagePath",
  "storageUrl",
  "storeId",
  "tempProjectId",
  "tenantId",
]);

type SanitizedEventMetadataValue = boolean | number | string | null;

function getEventLoggerErrorContext(error: unknown): {
  errorName: string;
  errorCode?: string;
} {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return {
      errorName: (error.name || "Error").slice(0, 80),
      ...(code === undefined || code === null ? {} : { errorCode: String(code).slice(0, 64) }),
    };
  }

  return {
    errorName: typeof error,
  };
}

export function sanitizeEventError(
  error?: MsgOnboardingEvent["error"],
): MsgOnboardingEvent["error"] | undefined {
  if (!error?.code) return undefined;

  const retryCount = typeof error.retryCount === "number"
    && Number.isSafeInteger(error.retryCount)
    && error.retryCount >= 0
    && error.retryCount <= 100
    ? error.retryCount
    : undefined;

  return {
    code: String(error.code).slice(0, 96),
    retryable: error.retryable === true,
    ...(retryCount === undefined ? {} : { retryCount }),
  };
}

export const sanitizeMessagingOnboardingEventError = sanitizeEventError;

function getBoundedEventMetadataContext(
  label: string,
  value: unknown,
): Record<string, boolean | number> {
  const normalized = value === undefined || value === null ? "" : String(value);
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

function isSafeEventMetadataKey(key: string): boolean {
  return SAFE_EVENT_METADATA_KEYS.has(key) || /^[A-Za-z][A-Za-z0-9]*(Present|Length)$/.test(key);
}

function sanitizeEventMetadata(
  metadata?: Record<string, unknown>,
): Record<string, SanitizedEventMetadataValue> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};

  const sanitized: Record<string, SanitizedEventMetadataValue> = {};
  let droppedCount = 0;

  for (const [key, value] of Object.entries(metadata)) {
    if (Object.keys(sanitized).length >= MAX_EVENT_METADATA_KEYS) {
      droppedCount++;
      continue;
    }

    if (BOUNDED_EVENT_METADATA_KEYS.has(key)) {
      Object.assign(sanitized, getBoundedEventMetadataContext(key, value));
      continue;
    }

    if (!isSafeEventMetadataKey(key)) {
      droppedCount++;
      continue;
    }

    if (value === null) {
      sanitized[key] = null;
      continue;
    }

    if (typeof value === "boolean") {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === "string") {
      sanitized[key] = value.slice(0, MAX_EVENT_METADATA_STRING_LENGTH);
      continue;
    }

    droppedCount++;
  }

  if (droppedCount > 0 && Object.keys(sanitized).length < MAX_EVENT_METADATA_KEYS) {
    sanitized.metadataDroppedCount = droppedCount;
  }

  return sanitized;
}

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
  metadata?: Record<string, unknown>;
  sessionCreatedAt?: Timestamp;
  error?: MsgOnboardingEvent["error"];
}): Promise<void> {
  if (!FEATURE_FLAGS.ENABLE_MESSAGING_ONBOARDING_TRACKING) return;

  try {
    const now = Timestamp.now();
    const sessionAgeMs = params.sessionCreatedAt
      ? Math.max(0, now.toMillis() - params.sessionCreatedAt.toMillis())
      : 0;

    const eventId = db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS).doc().id;

    const eventError = sanitizeEventError(params.error);
    const event: MsgOnboardingEvent = {
      eventId,
      sessionId: params.sessionId,
      provider: params.provider,
      eventType: params.eventType,
      sessionState: params.sessionState,
      userIdMasked: params.userIdMasked,
      metadata: sanitizeEventMetadata(params.metadata),
      timestamp: now,
      expiresAt: Timestamp.fromMillis(now.toMillis() + RETENTION.EVENT_TTL_MS),
      sessionAgeMs,
      ...(eventError && { error: eventError }),
    };

    // Fire-and-forget write
    db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
      .doc(eventId)
      .set(event)
      .catch((err) => {
        logger.warn("[Msg-Tracking] Failed to log event", {
          eventType: params.eventType,
          failureCode: MSG_ONBOARDING_EVENT_WRITE_FAILED,
          sessionIdLength: params.sessionId.length,
          ...getEventLoggerErrorContext(err),
        });
      });
  } catch (err) {
    // Silent failure — tracking is non-critical
    logger.warn("[Msg-Tracking] Error preparing event", {
      eventType: params.eventType,
      failureCode: MSG_ONBOARDING_EVENT_PREPARE_FAILED,
      ...getEventLoggerErrorContext(err),
    });
  }
}

/** Helper: mask user ID for PII protection */
export function maskUserId(providerUserId: string): string {
  return providerUserId.slice(-4);
}
