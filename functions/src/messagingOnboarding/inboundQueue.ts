/**
 * Durable inbound queue for provider webhooks.
 *
 * Webhooks must be acknowledged quickly, but message processing must not be
 * lost if the function stops after the acknowledgement. This queue persists a
 * sanitized NormalizedMessage first, then processes it idempotently.
 */

import * as crypto from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import { DB_COLLECTIONS } from "../constants/database";
import { firestoreAdmin } from "../firebaseAdmin";
import {
  MessagingOnboardingInboundMessage,
  NormalizedMessage,
} from "../types/messagingOnboarding.types";
import { RETENTION } from "./constants";
import { logOnboardingEvent, maskUserId } from "./eventLogger";
import { getProviderAdapter } from "./providers/providerRegistry";
import { handleMessage } from "./sessionEngine";

const logger = functions.logger;
const db = firestoreAdmin;
const inboundCol = DB_COLLECTIONS.MESSAGING_ONBOARDING_INBOUND_MESSAGES;

const MAX_INBOUND_ATTEMPTS = 5;
const STALE_PROCESSING_MS = 10 * 60 * 1000;
const MAX_TEXT_LENGTH = 2000;
const INBOUND_PROCESSING_FAILED_CODE = "INBOUND_PROCESSING_FAILED";

function getInboundQueueErrorContext(error: unknown): {
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

function getInboundQueueIdContext(
  label: string,
  value: unknown,
): Record<string, boolean | number> {
  const normalized = value === undefined || value === null ? "" : String(value);
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

function isAlreadyExistsError(error: unknown): boolean {
  const maybeError = error as { code?: number | string; message?: string };
  return (
    maybeError.code === 6 ||
    maybeError.code === "already-exists" ||
    maybeError.message?.includes("ALREADY_EXISTS") === true
  );
}

export function getInboundMessageId(msg: NormalizedMessage): string {
  return crypto
    .createHash("sha256")
    .update(`${msg.provider}:${msg.providerMessageId}`)
    .digest("hex");
}

export async function enqueueInboundMessage(
  msg: NormalizedMessage,
): Promise<{ messageId: string; created: boolean }> {
  const messageId = getInboundMessageId(msg);
  const messageRef = db.collection(inboundCol).doc(messageId);
  const now = Timestamp.now();

  const queued: MessagingOnboardingInboundMessage = {
    messageId,
    provider: msg.provider,
    providerMessageId: msg.providerMessageId,
    providerUserId: msg.userId,
    providerDisplayId: msg.userDisplayId,
    messageType: msg.messageType,
    ...(msg.text ? { text: msg.text.slice(0, MAX_TEXT_LENGTH) } : {}),
    ...(msg.media ? { media: msg.media } : {}),
    providerTimestamp: Timestamp.fromDate(msg.timestamp || new Date()),
    status: "PENDING",
    attempts: 0,
    maxAttempts: MAX_INBOUND_ATTEMPTS,
    nextAttemptAt: now,
    processingStartedAt: null,
    processedAt: null,
    lastError: null,
    createdAt: now,
    updatedAt: now,
    expiresAt: Timestamp.fromMillis(
      now.toMillis() + RETENTION.INBOUND_MESSAGE_TTL_MS,
    ),
  };

  try {
    await messageRef.create(queued);
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      return { messageId, created: false };
    }
    throw error;
  }

  logOnboardingEvent({
    sessionId: "inbound",
    provider: msg.provider,
    eventType: "INBOUND_MESSAGE_QUEUED",
    sessionState: "COLLECTING_INPUT",
    userIdMasked: maskUserId(msg.userId),
    metadata: {
      ...getInboundQueueIdContext("messageId", messageId),
      messageType: msg.messageType,
      hasMedia: !!msg.media,
    },
  });

  return { messageId, created: true };
}

export async function processQueuedInboundMessage(
  messageId: string,
): Promise<"processed" | "skipped" | "retry_scheduled" | "failed"> {
  const messageRef = db.collection(inboundCol).doc(messageId);
  const now = Timestamp.now();

  const queued = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(messageRef);
    if (!snapshot.exists) return null;

    const data = snapshot.data() as MessagingOnboardingInboundMessage;
    if (data.status !== "PENDING") return null;
    if (data.nextAttemptAt?.toMillis?.() > now.toMillis()) return null;
    if (data.attempts >= (data.maxAttempts || MAX_INBOUND_ATTEMPTS)) return null;

    transaction.update(messageRef, {
      status: "PROCESSING",
      attempts: FieldValue.increment(1),
      processingStartedAt: now,
      updatedAt: now,
    });

    return data;
  });

  if (!queued) return "skipped";

  const msg: NormalizedMessage = {
    provider: queued.provider,
    providerMessageId: queued.providerMessageId,
    userId: queued.providerUserId,
    userDisplayId: queued.providerDisplayId,
    messageType: queued.messageType,
    ...(queued.text ? { text: queued.text } : {}),
    ...(queued.media ? { media: queued.media } : {}),
    timestamp: queued.providerTimestamp.toDate(),
    rawPayload: null,
  };

  try {
    const adapter = getProviderAdapter(msg.provider);
    const replyText = await handleMessage(msg, adapter);

    if (replyText) {
      await adapter.sendTextMessage(msg.userId, replyText);
      logOnboardingEvent({
        sessionId: "webhook-reply",
        provider: msg.provider,
        eventType: "MESSAGE_SENT",
        sessionState: "COLLECTING_INPUT",
        userIdMasked: maskUserId(msg.userId),
        metadata: {
          messageLength: replyText.length,
          trigger: "inbound_queue",
        },
      });
    }

    await messageRef.update({
      status: "PROCESSED",
      processedAt: Timestamp.now(),
      processingStartedAt: null,
      lastError: null,
      updatedAt: Timestamp.now(),
    });

    logOnboardingEvent({
      sessionId: "inbound",
      provider: msg.provider,
      eventType: "INBOUND_MESSAGE_PROCESSED",
      sessionState: "COLLECTING_INPUT",
      userIdMasked: maskUserId(msg.userId),
      metadata: {
        ...getInboundQueueIdContext("messageId", messageId),
      },
    });

    return "processed";
  } catch (error) {
    const attemptsSnapshot = await messageRef.get();
    const attempts = Number(attemptsSnapshot.data()?.attempts || 1);
    const exhausted = attempts >= Number(attemptsSnapshot.data()?.maxAttempts || MAX_INBOUND_ATTEMPTS);
    const retryDelayMs = Math.min(15 * 60 * 1000, Math.pow(2, attempts) * 60 * 1000);
    const retryAt = Timestamp.fromMillis(Date.now() + retryDelayMs);
    const errorContext = getInboundQueueErrorContext(error);

    await messageRef.update({
      status: exhausted ? "FAILED" : "PENDING",
      nextAttemptAt: exhausted ? Timestamp.now() : retryAt,
      processingStartedAt: null,
      lastError: INBOUND_PROCESSING_FAILED_CODE,
      updatedAt: Timestamp.now(),
    });

    logger.error("[InboundQueue] Failed to process inbound message", {
      ...getInboundQueueIdContext("messageId", messageId),
      provider: msg.provider,
      userIdMasked: maskUserId(msg.userId),
      attempts,
      exhausted,
      ...errorContext,
    });

    logOnboardingEvent({
      sessionId: "inbound",
      provider: msg.provider,
      eventType: "INBOUND_MESSAGE_FAILED",
      sessionState: "COLLECTING_INPUT",
      userIdMasked: maskUserId(msg.userId),
      metadata: {
        ...getInboundQueueIdContext("messageId", messageId),
        attempts,
        exhausted,
      },
      error: {
        code: INBOUND_PROCESSING_FAILED_CODE,
        retryable: !exhausted,
      },
    });

    return exhausted ? "failed" : "retry_scheduled";
  }
}

export async function drainPendingInboundMessages(limit = 20): Promise<{
  processed: number;
  retryScheduled: number;
  failed: number;
  skipped: number;
}> {
  await resetStaleProcessingInboundMessages();

  const snapshot = await db
    .collection(inboundCol)
    .where("status", "==", "PENDING")
    .where("nextAttemptAt", "<=", Timestamp.now())
    .orderBy("nextAttemptAt", "asc")
    .limit(limit)
    .get();

  const result = {
    processed: 0,
    retryScheduled: 0,
    failed: 0,
    skipped: 0,
  };

  for (const doc of snapshot.docs) {
    const status = await processQueuedInboundMessage(doc.id);
    if (status === "processed") result.processed++;
    if (status === "retry_scheduled") result.retryScheduled++;
    if (status === "failed") result.failed++;
    if (status === "skipped") result.skipped++;
  }

  return result;
}

async function resetStaleProcessingInboundMessages(): Promise<void> {
  const staleBefore = Timestamp.fromMillis(Date.now() - STALE_PROCESSING_MS);
  const snapshot = await db
    .collection(inboundCol)
    .where("status", "==", "PROCESSING")
    .where("processingStartedAt", "<=", staleBefore)
    .limit(20)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: "PENDING",
      nextAttemptAt: Timestamp.now(),
      processingStartedAt: null,
      updatedAt: Timestamp.now(),
      lastError: "Reset stale PROCESSING inbound message",
    });
  });

  if (!snapshot.empty) {
    await batch.commit();
  }
}
