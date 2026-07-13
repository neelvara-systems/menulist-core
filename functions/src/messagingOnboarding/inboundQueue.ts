/**
 * Durable inbound queue for provider webhooks.
 *
 * Webhooks must be acknowledged quickly, but message processing must not be
 * lost if the function stops after the acknowledgement. This queue persists a
 * sanitized NormalizedMessage first, then processes it idempotently.
 */

import * as crypto from "crypto";
import { Timestamp } from "firebase-admin/firestore";
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
import { isRetryableMessagingProviderError } from "./providers/IMessagingProvider";
import { handleMessage } from "./sessionEngine";

const logger = functions.logger;
const db = firestoreAdmin;
const inboundCol = DB_COLLECTIONS.MESSAGING_ONBOARDING_INBOUND_MESSAGES;

const MAX_INBOUND_ATTEMPTS = 5;
const STALE_PROCESSING_MS = 10 * 60 * 1000;
const MAX_TEXT_LENGTH = 2000;
const MAX_REPLY_TEXT_LENGTH = 4096;
const INBOUND_PROCESSING_FAILED_CODE = "INBOUND_PROCESSING_FAILED";
const INBOUND_PAYLOAD_INVALID_CODE = "INBOUND_PAYLOAD_INVALID";
const INBOUND_PAYLOAD_EXPIRED_CODE = "INBOUND_PAYLOAD_EXPIRED";
const INBOUND_STALE_PROCESSING_RESET_CODE = "INBOUND_STALE_PROCESSING_RESET";
const PROVIDER_ID_MAX_LENGTH = 256;
const USER_ID_MAX_LENGTH = 128;
const DISPLAY_ID_MAX_LENGTH = 160;
const FILE_NAME_MAX_LENGTH = 180;
const MIME_TYPE_MAX_LENGTH = 120;

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

function normalizeRequiredString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string" || value !== value.trim()) return null;
  if (!value || value.length > maxLength || value.includes("\0")) return null;
  return value;
}

function normalizeOptionalText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

function normalizeInboundMessage(msg: NormalizedMessage): NormalizedMessage {
  const provider = msg?.provider;
  const providerMessageId = normalizeRequiredString(msg?.providerMessageId, PROVIDER_ID_MAX_LENGTH);
  const userId = normalizeRequiredString(msg?.userId, USER_ID_MAX_LENGTH);
  const userDisplayId = normalizeRequiredString(msg?.userDisplayId, DISPLAY_ID_MAX_LENGTH);
  const messageType = msg?.messageType;
  const timestampMillis = msg?.timestamp instanceof Date ? msg.timestamp.getTime() : Number.NaN;
  const nowMillis = Date.now();

  if (
    (provider !== "whatsapp" && provider !== "telegram")
    || !providerMessageId
    || !userId
    || !userDisplayId
    || !["image", "document", "text", "unsupported"].includes(messageType)
    || !Number.isFinite(timestampMillis)
    || timestampMillis < nowMillis - RETENTION.INBOUND_MESSAGE_TTL_MS
    || timestampMillis > nowMillis + 24 * 60 * 60 * 1000
  ) {
    throw new Error(INBOUND_PAYLOAD_INVALID_CODE);
  }

  let media: NormalizedMessage["media"];
  if (messageType === "image" || messageType === "document") {
    const providerMediaId = normalizeRequiredString(msg.media?.providerMediaId, PROVIDER_ID_MAX_LENGTH);
    const mimeType = normalizeRequiredString(msg.media?.mimeType, MIME_TYPE_MAX_LENGTH);
    const fileName = normalizeOptionalText(msg.media?.fileName, FILE_NAME_MAX_LENGTH);
    const fileSize = msg.media?.fileSize;
    if (
      !providerMediaId
      || !mimeType
      || (fileSize !== undefined && (!Number.isSafeInteger(fileSize) || fileSize <= 0))
    ) {
      throw new Error(INBOUND_PAYLOAD_INVALID_CODE);
    }
    media = {
      providerMediaId,
      mimeType,
      ...(fileSize !== undefined ? { fileSize } : {}),
      ...(fileName ? { fileName } : {}),
    };
  }

  const text = normalizeOptionalText(msg.text, MAX_TEXT_LENGTH);
  if (messageType === "text" && !text) {
    throw new Error(INBOUND_PAYLOAD_INVALID_CODE);
  }
  return {
    provider,
    providerMessageId,
    userId,
    userDisplayId,
    messageType,
    ...(text ? { text } : {}),
    ...(media ? { media } : {}),
    timestamp: new Date(timestampMillis),
    rawPayload: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isMessagingProvider(value: unknown): value is NormalizedMessage["provider"] {
  return value === "whatsapp" || value === "telegram";
}

function isMessagingMessageType(value: unknown): value is NormalizedMessage["messageType"] {
  return value === "image"
    || value === "document"
    || value === "text"
    || value === "unsupported";
}

function normalizeTimestamp(value: unknown): Timestamp | null {
  const millis = readTimestampMillis(value);
  return millis === null ? null : Timestamp.fromMillis(millis);
}

function readPersistedInboundMessage(
  messageId: string,
  value: unknown,
): MessagingOnboardingInboundMessage | null {
  if (!isRecord(value)) return null;
  const attempts = value.attempts;
  const maxAttempts = value.maxAttempts;
  const nextAttemptAt = normalizeTimestamp(value.nextAttemptAt);
  const providerTimestamp = normalizeTimestamp(value.providerTimestamp);
  const handlerCompletedAt = value.handlerCompletedAt === null
    ? null
    : normalizeTimestamp(value.handlerCompletedAt);
  const createdAt = normalizeTimestamp(value.createdAt);
  const updatedAt = normalizeTimestamp(value.updatedAt);
  const expiresAt = normalizeTimestamp(value.expiresAt);
  const replyText = value.replyText;
  const lastError = value.lastError;
  const provider = isMessagingProvider(value.provider) ? value.provider : null;
  const messageType = isMessagingMessageType(value.messageType) ? value.messageType : null;
  if (
    value.messageId !== messageId
    || value.status !== "PENDING"
    || !isSafeInteger(attempts)
    || attempts < 0
    || !isSafeInteger(maxAttempts)
    || maxAttempts < 1
    || maxAttempts > MAX_INBOUND_ATTEMPTS
    || attempts > maxAttempts
    || !provider
    || !messageType
    || !nextAttemptAt
    || !providerTimestamp
    || value.processingStartedAt !== null
    || value.processingToken !== null
    || !handlerCompletedAt && value.handlerCompletedAt !== null
    || value.processedAt !== null
    || !createdAt
    || !updatedAt
    || !expiresAt
    || createdAt.toMillis() > updatedAt.toMillis()
    || updatedAt.toMillis() > expiresAt.toMillis()
    || nextAttemptAt.toMillis() > expiresAt.toMillis()
    || (replyText != null
      && (typeof replyText !== "string" || replyText.length > MAX_REPLY_TEXT_LENGTH))
    || (lastError != null
      && (typeof lastError !== "string" || !lastError || lastError.length > 128))
    || (handlerCompletedAt === null && replyText != null)
    || (handlerCompletedAt !== null
      && (handlerCompletedAt.toMillis() < createdAt.toMillis()
        || handlerCompletedAt.toMillis() > updatedAt.toMillis()))
  ) {
    return null;
  }

  try {
    const normalized = normalizeInboundMessage({
      provider,
      providerMessageId: typeof value.providerMessageId === "string" ? value.providerMessageId : "",
      userId: typeof value.providerUserId === "string" ? value.providerUserId : "",
      userDisplayId: typeof value.providerDisplayId === "string" ? value.providerDisplayId : "",
      messageType,
      ...(typeof value.text === "string" ? { text: value.text } : {}),
      ...(isRecord(value.media) ? { media: {
        providerMediaId: typeof value.media.providerMediaId === "string" ? value.media.providerMediaId : "",
        mimeType: typeof value.media.mimeType === "string" ? value.media.mimeType : "",
        ...(typeof value.media.fileSize === "number" ? { fileSize: value.media.fileSize } : {}),
        ...(typeof value.media.fileName === "string" ? { fileName: value.media.fileName } : {}),
      } } : {}),
      timestamp: providerTimestamp.toDate(),
      rawPayload: null,
    });
    if (getInboundMessageId(normalized) !== messageId) return null;
    return {
      attempts,
      createdAt,
      expiresAt,
      handlerCompletedAt,
      lastError: typeof lastError === "string" ? lastError : null,
      maxAttempts,
      messageId,
      messageType: normalized.messageType,
      nextAttemptAt,
      provider: normalized.provider,
      providerDisplayId: normalized.userDisplayId,
      providerMessageId: normalized.providerMessageId,
      providerUserId: normalized.userId,
      providerTimestamp,
      processedAt: null,
      processingStartedAt: null,
      processingToken: null,
      replyText: typeof replyText === "string" ? replyText : null,
      status: "PENDING",
      updatedAt,
      ...(normalized.text ? { text: normalized.text } : {}),
      ...(normalized.media ? { media: normalized.media } : {}),
    };
  } catch {
    return null;
  }
}

export function getInboundMessageId(msg: NormalizedMessage): string {
  return crypto
    .createHash("sha256")
    .update(`${msg.provider}:${msg.providerMessageId}`)
    .digest("hex");
}

function buildQueuedInboundMessage(
  normalized: NormalizedMessage,
  messageId: string,
  now: Timestamp,
): MessagingOnboardingInboundMessage {
  return {
    messageId,
    provider: normalized.provider,
    providerMessageId: normalized.providerMessageId,
    providerUserId: normalized.userId,
    providerDisplayId: normalized.userDisplayId,
    messageType: normalized.messageType,
    ...(normalized.text ? { text: normalized.text } : {}),
    ...(normalized.media ? { media: normalized.media } : {}),
    providerTimestamp: Timestamp.fromDate(normalized.timestamp),
    status: "PENDING",
    attempts: 0,
    maxAttempts: MAX_INBOUND_ATTEMPTS,
    nextAttemptAt: now,
    processingStartedAt: null,
    processingToken: null,
    handlerCompletedAt: null,
    replyText: null,
    processedAt: null,
    lastError: null,
    createdAt: now,
    updatedAt: now,
    expiresAt: Timestamp.fromMillis(
      now.toMillis() + RETENTION.INBOUND_MESSAGE_TTL_MS,
    ),
  };
}

function logQueuedInboundMessage(normalized: NormalizedMessage, messageId: string): void {
  logOnboardingEvent({
    sessionId: "inbound",
    provider: normalized.provider,
    eventType: "INBOUND_MESSAGE_QUEUED",
    sessionState: "COLLECTING_INPUT",
    userIdMasked: maskUserId(normalized.userId),
    metadata: {
      ...getInboundQueueIdContext("messageId", messageId),
      messageType: normalized.messageType,
      hasMedia: !!normalized.media,
    },
  });
}

export async function enqueueInboundMessage(
  msg: NormalizedMessage,
): Promise<{ messageId: string; created: boolean }> {
  const normalized = normalizeInboundMessage(msg);
  const messageId = getInboundMessageId(normalized);
  const messageRef = db.collection(inboundCol).doc(messageId);
  const now = Timestamp.now();
  const queued = buildQueuedInboundMessage(normalized, messageId, now);

  try {
    await messageRef.create(queued);
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      return { messageId, created: false };
    }
    throw error;
  }

  logQueuedInboundMessage(normalized, messageId);

  return { messageId, created: true };
}

export async function enqueueInboundMessages(
  messages: readonly NormalizedMessage[],
): Promise<Array<{ messageId: string; created: boolean; userId: string }>> {
  if (messages.length === 0) return [];

  const normalizedMessages = messages.map(normalizeInboundMessage);
  const writer = db.bulkWriter();
  writer.onWriteError((error) => (
    !isAlreadyExistsError(error) && error.failedAttempts < 3
  ));

  const operationPromises = normalizedMessages.map(async (normalized) => {
    const messageId = getInboundMessageId(normalized);
    const now = Timestamp.now();
    try {
      await writer.create(
        db.collection(inboundCol).doc(messageId),
        buildQueuedInboundMessage(normalized, messageId, now),
      );
      logQueuedInboundMessage(normalized, messageId);
      return { messageId, created: true, userId: normalized.userId };
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        return { messageId, created: false, userId: normalized.userId };
      }
      throw error;
    }
  });
  const closePromise = writer.close();
  try {
    const results = await Promise.all(operationPromises);
    await closePromise;
    return results;
  } catch (error) {
    await closePromise.catch(() => undefined);
    throw error;
  }
}

export async function processQueuedInboundMessage(
  messageId: string,
): Promise<"processed" | "skipped" | "retry_scheduled" | "failed"> {
  const messageRef = db.collection(inboundCol).doc(messageId);
  const now = Timestamp.now();
  const processingToken = crypto.randomUUID();

  const claim = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(messageRef);
    if (!snapshot.exists) return null;

    if (snapshot.get("status") !== "PENDING") return null;
    const data = readPersistedInboundMessage(messageId, snapshot.data());
    if (!data) {
      transaction.update(messageRef, {
        lastError: INBOUND_PAYLOAD_INVALID_CODE,
        processingStartedAt: null,
        processingToken: null,
        status: "FAILED",
        updatedAt: now,
      });
      return { invalid: true as const };
    }

    if (data.expiresAt.toMillis() <= now.toMillis()) {
      transaction.update(messageRef, {
        lastError: INBOUND_PAYLOAD_EXPIRED_CODE,
        processingStartedAt: null,
        processingToken: null,
        status: "FAILED",
        updatedAt: now,
      });
      return { invalid: true as const };
    }

    if (data.nextAttemptAt.toMillis() > now.toMillis()) return null;
    if (data.attempts >= data.maxAttempts) {
      transaction.update(messageRef, {
        lastError: INBOUND_PROCESSING_FAILED_CODE,
        processingStartedAt: null,
        processingToken: null,
        status: "FAILED",
        updatedAt: now,
      });
      return { invalid: true as const };
    }

    const attempts = data.attempts + 1;

    transaction.update(messageRef, {
      status: "PROCESSING",
      attempts,
      processingStartedAt: now,
      processingToken,
      updatedAt: now,
    });

    return { attempts, data, invalid: false as const, processingToken };
  });

  if (!claim) return "skipped";
  if (claim.invalid) return "failed";
  const queued = claim.data;

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
    let replyText = queued.replyText ?? null;
    if (!queued.handlerCompletedAt) {
      replyText = await handleMessage(msg, adapter);
      if (replyText !== null && replyText.length > MAX_REPLY_TEXT_LENGTH) {
        throw new Error("INBOUND_REPLY_TOO_LARGE");
      }

      const handlerCompletedAt = Timestamp.now();
      const checkpointed = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(messageRef);
        if (
          !snapshot.exists
          || snapshot.get("status") !== "PROCESSING"
          || snapshot.get("processingToken") !== claim.processingToken
        ) {
          return false;
        }
        transaction.update(messageRef, {
          handlerCompletedAt,
          replyText,
          updatedAt: handlerCompletedAt,
        });
        return true;
      });
      if (!checkpointed) return "skipped";
    }

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

    const completedAt = Timestamp.now();
    const completed = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(messageRef);
      if (
        !snapshot.exists
        || snapshot.get("status") !== "PROCESSING"
        || snapshot.get("processingToken") !== claim.processingToken
      ) {
        return false;
      }
      transaction.update(messageRef, {
        status: "PROCESSED",
        processedAt: completedAt,
        processingStartedAt: null,
        processingToken: null,
        lastError: null,
        updatedAt: completedAt,
      });
      return true;
    });
    if (!completed) return "skipped";

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
    const attempts = claim.attempts;
    const providerRetryable = isRetryableMessagingProviderError(error);
    const exhaustedByAttempts = !providerRetryable || attempts >= queued.maxAttempts;
    const retryDelayMs = Math.min(15 * 60 * 1000, Math.pow(2, attempts) * 60 * 1000);
    const retryAt = Timestamp.fromMillis(Date.now() + retryDelayMs);
    const exhausted = exhaustedByAttempts || retryAt.toMillis() >= queued.expiresAt.toMillis();
    const errorContext = getInboundQueueErrorContext(error);

    const failureRecorded = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(messageRef);
      if (
        !snapshot.exists
        || snapshot.get("status") !== "PROCESSING"
        || snapshot.get("processingToken") !== claim.processingToken
      ) {
        return false;
      }
      const failedAt = Timestamp.now();
      transaction.update(messageRef, {
        status: exhausted ? "FAILED" : "PENDING",
        nextAttemptAt: exhausted ? failedAt : retryAt,
        processingStartedAt: null,
        processingToken: null,
        lastError: INBOUND_PROCESSING_FAILED_CODE,
        updatedAt: failedAt,
      });
      return true;
    });
    if (!failureRecorded) return "skipped";

    logger.error("[InboundQueue] Failed to process inbound message", {
      ...getInboundQueueIdContext("messageId", messageId),
      provider: msg.provider,
      userIdMasked: maskUserId(msg.userId),
      attempts,
      exhausted,
      providerRetryable,
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
        providerRetryable,
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

  let resetCount = 0;
  for (const candidate of snapshot.docs) {
    const candidateToken = candidate.get("processingToken");
    const reset = await db.runTransaction(async (transaction) => {
      const current = await transaction.get(candidate.ref);
      if (!current.exists || current.get("status") !== "PROCESSING") return false;

      const currentStartedAt = readTimestampMillis(current.get("processingStartedAt"));
      if (
        currentStartedAt === null
        || currentStartedAt > staleBefore.toMillis()
        || current.get("processingToken") !== candidateToken
      ) {
        return false;
      }

      const resetAt = Timestamp.now();
      transaction.update(candidate.ref, {
        status: "PENDING",
        nextAttemptAt: resetAt,
        processingStartedAt: null,
        processingToken: null,
        updatedAt: resetAt,
        lastError: INBOUND_STALE_PROCESSING_RESET_CODE,
      });
      return true;
    });
    if (reset) resetCount++;
  }

  if (resetCount > 0) {
    logger.warn("[InboundQueue] Reset stale PROCESSING inbound messages", {
      failureCode: INBOUND_STALE_PROCESSING_RESET_CODE,
      resetCount,
      staleWindowMs: STALE_PROCESSING_MS,
    });
  }
}
