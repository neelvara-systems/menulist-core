import type {
  MessagingOnboardingState,
  MessagingProvider,
} from "../types/messagingOnboarding.types";
import { UPLOAD_LIMITS } from "./constants";
import {
  MAX_MESSAGING_REPLACEMENT_UPLOADS,
  normalizeMessagingPendingUploadCleanupPaths,
} from "../sharedData/messagingReplacementUploads";

const SESSION_ID_PATTERN = /^[A-Za-z0-9]{20}$/;
const MIME_EXTENSION: Record<string, string> = {
  "application/pdf": "pdf",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type MessagingCleanupSession = {
  createdAtMillis: number;
  expiresAtMillis: number;
  previewToken: string | null;
  previewUrl: string | null;
  provider: MessagingProvider;
  providerUserId: string;
  reminderLeaseToken: string | null;
  reminderLeaseUntilMillis: number | null;
  reminderSentAtMillis: number | null;
  sessionId: string;
  state: MessagingOnboardingState;
  stateEnteredAtMillis: number;
  uploads: MessagingCleanupUpload[];
  storagePaths: string[];
};

export type MessagingCleanupUpload = {
  id: string;
  storagePath: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedString(value: unknown, maxLength: number): string | null {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maxLength
    && value === value.trim()
    && !value.includes("\0")
    ? value
    : null;
}

function timestampMillis(value: unknown): number | null {
  if (!isRecord(value) || typeof value.toMillis !== "function") return null;
  try {
    const millis = value.toMillis.call(value);
    return typeof millis === "number" && Number.isFinite(millis) ? millis : null;
  } catch {
    return null;
  }
}

function nullableTimestampMillis(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  return timestampMillis(value) ?? undefined;
}

function isMessagingState(value: unknown): value is MessagingOnboardingState {
  return typeof value === "string" && [
    "COLLECTING_INPUT",
    "VALIDATING_ASSETS",
    "AWAITING_MORE_UPLOADS",
    "PROCESSING_MENU",
    "PREVIEW_READY",
    "AWAITING_APPROVAL",
    "PUBLISHING",
    "LIVE",
    "FAILED",
    "EXPIRED",
    "COOLDOWN",
  ].includes(value);
}

function getCurrentStateTimestamp(value: unknown, state: MessagingOnboardingState): number | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) return null;
  const last = value[value.length - 1];
  return isRecord(last) && last.state === state ? timestampMillis(last.timestamp) : null;
}

function normalizeCleanupUploads(
  value: unknown,
  sessionId: string,
  max = UPLOAD_LIMITS.MAX_IMAGES_PER_SESSION,
): MessagingCleanupUpload[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const uploads: MessagingCleanupUpload[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    if (!isRecord(candidate)) return null;
    const id = typeof candidate.id === "string" && /^[0-9a-f]{40}$/.test(candidate.id)
      ? candidate.id
      : null;
    const mimeType = typeof candidate.mimeType === "string" ? candidate.mimeType : "";
    const extension = MIME_EXTENSION[mimeType];
    const storagePath = boundedString(candidate.storagePath, 512);
    if (!id || !extension || !storagePath) return null;
    const expectedPath = `messagingOnboarding/${sessionId}/${id}.${extension}`;
    if (storagePath !== expectedPath || seen.has(storagePath)) return null;
    seen.add(storagePath);
    uploads.push({ id, storagePath });
  }
  return uploads;
}

function normalizePreviewUrl(
  value: unknown,
  sessionId: string,
  token: string,
  expectedPreviewBaseUrl?: string,
): string | null {
  const raw = boundedString(value, 2048);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const localhostHttp = url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname);
    const expectedBase = expectedPreviewBaseUrl ? new URL(expectedPreviewBaseUrl) : null;
    const expectedPath = expectedBase
      ? `${expectedBase.pathname.replace(/\/$/, "")}/msg-preview/${sessionId}`
      : null;
    const pathSuffix = `/msg-preview/${sessionId}`;
    if (
      (url.protocol !== "https:" && !localhostHttp)
      || url.username
      || url.password
      || (expectedBase
        ? url.origin !== expectedBase.origin || url.pathname !== expectedPath
        : !url.pathname.endsWith(pathSuffix))
      || url.searchParams.size !== 1
      || url.searchParams.get("token") !== token
      || url.hash
    ) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeMessagingCleanupSession(
  value: unknown,
  expectedSessionId: string,
  expectedPreviewBaseUrl?: string,
): MessagingCleanupSession | null {
  if (!SESSION_ID_PATTERN.test(expectedSessionId) || !isRecord(value) || value.sessionId !== expectedSessionId) {
    return null;
  }
  const provider = value.provider === "whatsapp" || value.provider === "telegram"
    ? value.provider
    : null;
  const providerUserId = boundedString(value.providerUserId, 160);
  const state = isMessagingState(value.state) ? value.state : null;
  const createdAtMillis = timestampMillis(value.createdAt);
  const expiresAtMillis = timestampMillis(value.expiresAt);
  const stateEnteredAtMillis = state ? getCurrentStateTimestamp(value.stateHistory, state) : null;
  const uploads = normalizeCleanupUploads(value.uploads, expectedSessionId);
  const replacementUploads = normalizeCleanupUploads(
    value.replacementUploads ?? [],
    expectedSessionId,
    MAX_MESSAGING_REPLACEMENT_UPLOADS,
  );
  const pendingUploadCleanupPaths = normalizeMessagingPendingUploadCleanupPaths(
    value.pendingUploadCleanupPaths ?? [],
    expectedSessionId,
  );
  const uploadCleanupPending = value.uploadCleanupPending ?? false;
  const reminderSentAtMillis = nullableTimestampMillis(value.reminderSentAt);
  const reminderLeaseUntilMillis = nullableTimestampMillis(value.reminderMessageLeaseUntil);
  const reminderLeaseToken = value.reminderMessageLeaseToken === null
    || value.reminderMessageLeaseToken === undefined
    ? null
    : boundedString(value.reminderMessageLeaseToken, 128);
  const previewToken = value.previewToken === null || value.previewToken === undefined
    ? null
    : boundedString(value.previewToken, 256);
  const previewUrl = previewToken
    ? normalizePreviewUrl(
      value.previewUrl,
      expectedSessionId,
      previewToken,
      expectedPreviewBaseUrl,
    )
    : value.previewUrl === null || value.previewUrl === undefined
      ? null
      : undefined;

  if (
    !provider
    || !providerUserId
    || !state
    || createdAtMillis === null
    || expiresAtMillis === null
    || stateEnteredAtMillis === null
    || !uploads
    || !replacementUploads
    || !pendingUploadCleanupPaths
    || typeof uploadCleanupPending !== "boolean"
    || uploadCleanupPending !== (pendingUploadCleanupPaths.length > 0)
    || reminderSentAtMillis === undefined
    || reminderLeaseUntilMillis === undefined
    || reminderLeaseToken === null && value.reminderMessageLeaseToken !== null && value.reminderMessageLeaseToken !== undefined
    || (reminderLeaseToken === null) !== (reminderLeaseUntilMillis === null)
    || previewUrl === undefined
    || (state === "AWAITING_APPROVAL" && (!previewToken || !previewUrl))
  ) return null;

  const cleanupUploads = [...uploads, ...replacementUploads];
  for (const storagePath of pendingUploadCleanupPaths) {
    if (cleanupUploads.some((upload) => upload.storagePath === storagePath)) continue;
    const fileName = storagePath.slice(storagePath.lastIndexOf("/") + 1);
    cleanupUploads.push({ id: fileName.slice(0, fileName.lastIndexOf(".")), storagePath });
  }

  return {
    createdAtMillis,
    expiresAtMillis,
    previewToken,
    previewUrl,
    provider,
    providerUserId,
    reminderLeaseToken,
    reminderLeaseUntilMillis,
    reminderSentAtMillis,
    sessionId: expectedSessionId,
    state,
    stateEnteredAtMillis,
    uploads: cleanupUploads,
    storagePaths: cleanupUploads.map((upload) => upload.storagePath),
  };
}

export function isMessagingReminderDue(
  session: MessagingCleanupSession,
  nowMillis: number,
  reminderAfterMs: number,
): boolean {
  return session.state === "AWAITING_APPROVAL"
    && session.reminderSentAtMillis === null
    && Boolean(session.previewUrl)
    && session.expiresAtMillis > nowMillis
    && session.stateEnteredAtMillis <= nowMillis - reminderAfterMs;
}

export function getMessagingExpiryTransitionPath(
  state: MessagingOnboardingState,
): MessagingOnboardingState[] {
  if (["VALIDATING_ASSETS", "PROCESSING_MENU", "PUBLISHING"].includes(state)) {
    return ["FAILED", "EXPIRED"];
  }
  if ([
    "COLLECTING_INPUT",
    "AWAITING_MORE_UPLOADS",
    "PREVIEW_READY",
    "AWAITING_APPROVAL",
    "FAILED",
  ].includes(state)) {
    return ["EXPIRED"];
  }
  return [];
}
