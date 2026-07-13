/**
 * Extraction Watcher — onDocumentUpdated trigger on menuImageProcessingJobs
 *
 * Detects when extraction completes for messaging onboarding jobs,
 * stores result in session, generates preview token, and sends preview link.
 *
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §8.2.6, §8.1.1
 */

import * as crypto from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import { DB_COLLECTIONS } from "../constants/database";
import { firestoreAdmin } from "../firebaseAdmin";
import { processParallelResponse } from "../logic/redistributeUtils";
import {
  MENU_EXTRACTION_DESTINATION_TYPES,
  MENU_EXTRACTION_SOURCES,
} from "../sharedData/menuExtractionJob";
import { findDuplicateMenuExtractionFileUids } from "../sharedData/menuExtractionIntegrity";
import { normalizeExtractedBusinessProfile } from "../sharedData/extractedBusinessProfile";
import type { MenuImageProcessingJob } from "../types/menuProcessingJob.types";
import { MessagingOnboardingSession, SessionUpload } from "../types/messagingOnboarding.types";
import { MESSAGES } from "./constants";
import { logOnboardingEvent, maskUserId } from "./eventLogger";
import {
  finalizeMessagingExtractionFailure,
  finalizeMessagingExtractionSuccess,
  readMessagingLifecycleSession,
} from "./extractionLifecycle";
import type { MessagingLifecycleSession } from "./extractionLifecycle";
import {
  claimMessagingPendingMessage,
  completeMessagingPendingMessage,
  releaseMessagingPendingMessage,
} from "./messageDeliveryLease";
import { getProviderAdapter } from "./providers/providerRegistry";
import { normalizeMessagingPreviewBaseUrl } from "./previewUrlBoundary";

const logger = functions.logger;
const db = firestoreAdmin;
const sessionsCol = DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS;
const EXTRACTION_FAILED_CODE = "EXTRACTION_FAILED";
const EXTRACTION_RESULT_INVALID_CODE = "EXTRACTION_RESULT_INVALID";
const EXTRACTION_PREVIEW_SEND_FAILED_CODE = "EXTRACTION_PREVIEW_SEND_FAILED";
const EXTRACTION_CLEARER_PHOTOS_SEND_FAILED_CODE = "EXTRACTION_CLEARER_PHOTOS_SEND_FAILED";
const EXTRACTION_PREVIEW_LEASE_RELEASE_FAILED_CODE = "EXTRACTION_PREVIEW_LEASE_RELEASE_FAILED";
const MESSAGING_SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function getPreviewBaseUrl(): string {
  const previewBaseUrl = normalizeMessagingPreviewBaseUrl(
    process.env.NEXT_PUBLIC_MSG_PREVIEW_BASE_URL,
    process.env.FUNCTIONS_EMULATOR === "true",
  );
  if (!previewBaseUrl) {
    logger.error("[ExtractionWatcher] Missing NEXT_PUBLIC_MSG_PREVIEW_BASE_URL");
    throw new Error("NEXT_PUBLIC_MSG_PREVIEW_BASE_URL is required for messaging onboarding preview links");
  }
  return previewBaseUrl;
}

function getExtractionWatcherIdContext(label: string, value: unknown): Record<string, boolean | number> {
  const normalized = value === undefined || value === null ? "" : String(value);
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

function getExtractionWatcherErrorName(error: unknown): string {
  if (error instanceof Error) return (error.name || "Error").slice(0, 80);
  return typeof error;
}

function getExtractionWatcherErrorCode(error: Error): string | undefined {
  const code = (error as { code?: unknown }).code;
  if (code === undefined || code === null) return undefined;
  return String(code).slice(0, 64);
}

function getExtractionWatcherErrorContext(error: unknown): {
  sourceErrorName: string;
  sourceErrorCode?: string;
} {
  if (error instanceof Error) {
    return {
      sourceErrorName: getExtractionWatcherErrorName(error),
      sourceErrorCode: getExtractionWatcherErrorCode(error),
    };
  }

  return {
    sourceErrorName: getExtractionWatcherErrorName(error),
  };
}

function logExpiredExtractionSession(
  session: MessagingLifecycleSession | null,
  sessionId: string,
): void {
  if (!session) return;
  logOnboardingEvent({
    eventType: "SESSION_EXPIRED",
    metadata: { previousState: "PROCESSING_MENU" },
    provider: session.provider,
    sessionCreatedAt: session.createdAt,
    sessionId,
    sessionState: "EXPIRED",
    userIdMasked: maskUserId(session.providerUserId),
  });
}

function logClearerPhotosMessageSendFailed(
  session: Pick<MessagingOnboardingSession, "provider" | "sessionId" | "state">,
  error: unknown,
): void {
  logger.warn("[ExtractionWatcher] Failed to send clearer photos message", {
    failureCode: EXTRACTION_CLEARER_PHOTOS_SEND_FAILED_CODE,
    ...getExtractionWatcherIdContext("sessionId", session.sessionId),
    provider: session.provider,
    sessionState: session.state,
    ...getExtractionWatcherErrorContext(error),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isSafeHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4096 || value !== value.trim()) return false;
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

export function isMessagingExtractionJob(value: unknown): value is MenuImageProcessingJob {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== "string"
    || typeof value.projectId !== "string"
    || (value.status !== "completed" && value.status !== "failed")
    || readTimestampMillis(value.createdAt) === null
    || readTimestampMillis(value.updatedAt) === null
    || !Array.isArray(value.files)
    || value.files.length === 0
    || value.files.length > 15
    || !Array.isArray(value.targetLanguages)
    || value.targetLanguages.length === 0
    || value.targetLanguages.length > 12
  ) {
    return false;
  }

  const languageCodes = new Set<string>();
  for (const language of value.targetLanguages) {
    if (!isRecord(language)) return false;
    const code = typeof language.code === "string" ? language.code.trim().toLowerCase() : "";
    const name = typeof language.name === "string" ? language.name.trim() : "";
    if (!code || !name || languageCodes.has(code)) return false;
    languageCodes.add(code);
  }

  const fileIds = new Set<string>();
  for (const file of value.files) {
    if (!isRecord(file)) return false;
    const size = file.size;
    if (
      typeof file.uid !== "string"
      || !file.uid.trim()
      || file.uid !== file.uid.trim()
      || fileIds.has(file.uid)
      || typeof file.name !== "string"
      || !file.name.trim()
      || typeof file.type !== "string"
      || !file.type.trim()
      || file.type !== file.type.trim()
      || !isSafeHttpsUrl(file.url)
      || typeof size !== "number"
      || !Number.isSafeInteger(size)
      || size <= 0
      || size > 10 * 1024 * 1024
    ) {
      return false;
    }
    fileIds.add(file.uid);
  }
  if (value.status === "failed") {
    if (value.error === undefined) return true;
    return isRecord(value.error)
      && typeof value.error.code === "string"
      && typeof value.error.message === "string"
      && typeof value.error.retryable === "boolean";
  }
  const result = asRecord(value.result);
  const qualityDetails = asRecord(result?.qualityDetails);
  const combinedData = result?.combinedData;
  return Boolean(
    result
    && isFiniteNumber(result.qualityScore)
    && isFiniteNumber(result.processingTime)
    && qualityDetails
    && isFiniteNumber(qualityDetails.categoryQuality)
    && isFiniteNumber(qualityDetails.itemQuality)
    && isFiniteNumber(qualityDetails.priceQuality)
    && isFiniteNumber(qualityDetails.descriptionQuality)
    && (
      combinedData === undefined
      || isRecord(combinedData)
      && Array.isArray(combinedData.categories)
      && Array.isArray(combinedData.items)
      && Array.isArray(combinedData.languages)
    )
    && (result.redistributedFiles === undefined || isRecord(result.redistributedFiles))
  );
}

function getBoundMessagingSessionId(
  jobId: string,
  jobData: unknown,
): string | null {
  const job = asRecord(jobData);
  const destination = asRecord(job?.destination);
  const sessionId = typeof destination?.sessionId === "string"
    ? destination.sessionId
    : "";
  if (!MESSAGING_SESSION_ID_PATTERN.test(sessionId)) return null;

  return job?.id === jobId
    && job?.projectId === `msg-onboarding-${sessionId}`
    && job?.destinationType === MENU_EXTRACTION_DESTINATION_TYPES.MESSAGING_ONBOARDING
    && destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.MESSAGING_ONBOARDING
    && job?.source === MENU_EXTRACTION_SOURCES.MESSAGING_ONBOARDING
    && job?.skipProjectSave === true
    ? sessionId
    : null;
}

function getJobBoundUploads(
  session: Pick<MessagingLifecycleSession, "uploads">,
  jobData: MenuImageProcessingJob,
): SessionUpload[] {
  if (!Array.isArray(jobData.files) || jobData.files.length === 0) {
    throw new Error("MESSAGING_EXTRACTION_JOB_FILES_REQUIRED");
  }
  if (findDuplicateMenuExtractionFileUids(jobData.files).length > 0) {
    throw new Error("MESSAGING_EXTRACTION_JOB_FILE_UID_DUPLICATE");
  }

  const uploadsById = new Map<string, SessionUpload>();
  for (const upload of Array.isArray(session.uploads) ? session.uploads : []) {
    if (!upload || typeof upload.id !== "string" || uploadsById.has(upload.id)) {
      throw new Error("MESSAGING_EXTRACTION_SESSION_UPLOADS_INVALID");
    }
    uploadsById.set(upload.id, upload);
  }

  return jobData.files.map((jobFile) => {
    const upload = uploadsById.get(jobFile.uid);
    if (
      !upload
      || upload.storageUrl !== jobFile.url
      || upload.mimeType !== jobFile.type
      || upload.fileSize !== jobFile.size
    ) {
      throw new Error("MESSAGING_EXTRACTION_JOB_FILE_BINDING_MISMATCH");
    }
    return upload;
  });
}

function getFiniteQualityScore(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : null;
}

/**
 * Handle extraction job completion for messaging onboarding sessions.
 * Called by the onDocumentUpdated trigger in index.ts.
 */
export async function handleExtractionJobUpdate(
  jobId: string,
  beforeData: unknown,
  afterData: unknown,
): Promise<void> {
  const before = asRecord(beforeData);
  const after = asRecord(afterData);
  if (!before || !after) return;

  const sessionId = getBoundMessagingSessionId(jobId, after);
  if (!sessionId) return;

  // Only trigger on status change (not progress updates)
  if (before.status === after.status) return;

  if (!isMessagingExtractionJob(after)) {
    if (after.status === "completed" || after.status === "failed") {
      await handleInvalidExtractionJob(jobId, sessionId);
    }
    return;
  }

  try {
    if (after.status === "completed") {
      await handleExtractionComplete(jobId, sessionId, after);
    } else if (after.status === "failed") {
      await handleExtractionFailed(jobId, sessionId, after);
    }
  } catch (error) {
    logger.error("[ExtractionWatcher] Terminal extraction result rejected", {
      failureCode: EXTRACTION_RESULT_INVALID_CODE,
      ...getExtractionWatcherIdContext("jobId", jobId),
      ...getExtractionWatcherIdContext("sessionId", sessionId),
      ...getExtractionWatcherErrorContext(error),
    });
    await handleInvalidExtractionJob(jobId, sessionId);
  }
}

async function handleInvalidExtractionJob(jobId: string, sessionId: string): Promise<void> {
  const finalized = await finalizeMessagingExtractionFailure({
    jobId,
    reason: EXTRACTION_RESULT_INVALID_CODE,
    sessionId,
  });
  if (finalized.status === "expired") {
    logExpiredExtractionSession(finalized.session, sessionId);
    return;
  }
  if (finalized.status !== "finalized" || !finalized.session) return;
  const session = finalized.session;
  logOnboardingEvent({
    error: { code: EXTRACTION_RESULT_INVALID_CODE, retryable: false },
    eventType: "EXTRACTION_FAILED",
    provider: session.provider,
    sessionCreatedAt: session.createdAt,
    sessionId,
    sessionState: "FAILED",
    userIdMasked: maskUserId(session.providerUserId),
  });
  try {
    await getProviderAdapter(session.provider).sendTextMessage(
      session.providerUserId,
      MESSAGES.ASK_CLEARER_PHOTOS,
    );
  } catch (error) {
    logClearerPhotosMessageSendFailed(session, error);
  }
}

/**
 * Handle successful extraction completion.
 * Stores extracted data in session, generates preview, sends link.
 */
async function handleExtractionComplete(
  jobId: string,
  sessionId: string,
  jobData: MenuImageProcessingJob,
): Promise<void> {
  const sessionDoc = await db.collection(sessionsCol).doc(sessionId).get();

  if (!sessionDoc.exists) {
    logger.warn("[ExtractionWatcher] Session not found", getExtractionWatcherIdContext("sessionId", sessionId));
    return;
  }

  const session = readMessagingLifecycleSession(sessionDoc.data(), sessionId);
  const userMasked = maskUserId(session.providerUserId);

  // Cheap preflight; the final transaction repeats both checks and is authoritative.
  if (session.state !== "PROCESSING_MENU" || session.extractionJobId !== jobId) {
    logger.warn("[ExtractionWatcher] Stale or unbound extraction result ignored", {
      ...getExtractionWatcherIdContext("sessionId", sessionId),
      currentState: session.state,
      jobBound: session.extractionJobId === jobId,
    });
    return;
  }

  // Read extraction result from job document (not temp project)
  const combinedData = jobData.result?.combinedData;
  const qualityScore = getFiniteQualityScore(jobData.result?.qualityScore);
  const extractedBusinessProfile = normalizeExtractedBusinessProfile(
    jobData.result?.extractedBusinessProfile || combinedData?.extractedBusinessProfile,
  ) || null;

  // Structural validation: ensure combinedData has valid arrays (not null/undefined/non-array)
  const categories = Array.isArray(combinedData?.categories) ? combinedData.categories : [];
  const items = Array.isArray(combinedData?.items) ? combinedData.items : [];
  const categoryCount = categories.length;
  const itemCount = items.length;

  // Blank prevention gate: 0 items → FAILED, not preview
  if (!combinedData || categoryCount === 0 || itemCount === 0) {
    const finalized = await finalizeMessagingExtractionFailure({
      jobId,
      reason: `Blank prevention: ${categoryCount} categories, ${itemCount} items`,
      sessionId,
    });
    if (finalized.status === "expired") {
      logExpiredExtractionSession(finalized.session, sessionId);
      return;
    }
    if (finalized.status !== "finalized" || !finalized.session) return;

    logOnboardingEvent({
      sessionId,
      provider: finalized.session.provider,
      eventType: "BLANK_PREVENTION_TRIGGERED",
      sessionState: "FAILED",
      userIdMasked: userMasked,
      metadata: { categoryCount, itemCount },
      sessionCreatedAt: finalized.session.createdAt,
    });

    // Send message asking for clearer photos
    const adapter = getProviderAdapter(finalized.session.provider);
    try {
      await adapter.sendTextMessage(
        finalized.session.providerUserId,
        MESSAGES.ASK_CLEARER_PHOTOS,
      );
    } catch (error) {
      logClearerPhotosMessageSendFailed(finalized.session, error);
    }
    return;
  }

  const validUploads = getJobBoundUploads(session, jobData);
  const persistedRedistributedFiles = asRecord(jobData.result?.redistributedFiles);
  const redistributedFiles: Record<string, unknown> = persistedRedistributedFiles
    ? persistedRedistributedFiles
    : Object.fromEntries(
      processParallelResponse(
        {
          data: combinedData,
          qualityScore: qualityScore ?? undefined,
          qualityDetails: jobData.result?.qualityDetails,
        },
        validUploads.map((upload) => ({
          uid: upload.id,
          name: upload.fileName || upload.id,
          size: upload.fileSize,
          type: upload.mimeType,
          url: upload.storageUrl,
        })),
      ).entries(),
    );

  const extractedAt = Timestamp.now();
  const extractedProjectFiles = validUploads.map((upload, index) => {
    const extractedData = Object.prototype.hasOwnProperty.call(redistributedFiles, upload.id)
      ? asRecord(redistributedFiles[upload.id])
      : null;
    const rawData = asRecord(extractedData?.data);
    const clonedData = rawData
      ? {
        ...rawData,
        ...(Array.isArray(rawData.items)
          ? {
            items: rawData.items.map((item) => {
              const record = asRecord(item);
              return record ? { ...record, _extractedAt: record._extractedAt || extractedAt } : item;
            }),
          }
          : {}),
      }
      : null;
    const processingMessages = Array.isArray(extractedData?.processingMessages)
      ? extractedData.processingMessages
      : [];
    const fileQualityScore = getFiniteQualityScore(extractedData?.qualityScore);

    return {
      uid: upload.id,
      name: upload.fileName || upload.id,
      size: upload.fileSize,
      type: upload.mimeType,
      url: upload.storageUrl,
      active: true,
      deleted: false,
      index,
      extractedData: extractedData
        ? {
          message: typeof extractedData.message === "string" ? extractedData.message : "",
          ...(processingMessages.length
            ? { processingMessages }
            : {}),
          data: clonedData,
        }
        : null,
      ...(fileQualityScore !== null ? { qualityScore: fileQualityScore } : {}),
    };
  });
  const extractedFileData = extractedProjectFiles
    .map((file) => file.extractedData?.data)
    .filter((data): data is Record<string, unknown> => Boolean(data));
  const previewMenuData = extractedFileData.length
    ? {
      ...combinedData,
      languages: combinedData.languages || [],
      categories: extractedFileData.flatMap((data) => Array.isArray(data.categories) ? data.categories : []),
      items: extractedFileData.flatMap((data) => Array.isArray(data.items) ? data.items : []),
      ...(extractedBusinessProfile ? { extractedBusinessProfile } : {}),
    }
    : combinedData;

  // Generate preview token (cryptographically random, 32 chars)
  const previewToken = crypto.randomBytes(24).toString("base64url");
  const previewBaseUrl = getPreviewBaseUrl();
  const previewUrl = `${previewBaseUrl}/msg-preview/${sessionId}?token=${previewToken}`;

  const finalized = await finalizeMessagingExtractionSuccess({
    data: {
      extractedMenuData: previewMenuData,
      extractedBusinessProfile,
      extractedProjectFiles,
      qualityScore,
      previewToken,
      previewUrl,
    },
    jobId,
    sessionId,
  });
  if (finalized.status === "expired") {
    logExpiredExtractionSession(finalized.session, sessionId);
    return;
  }
  if (finalized.status !== "finalized" || !finalized.session) return;
  const finalizedSession = finalized.session;

  logOnboardingEvent({
    sessionId,
    provider: finalizedSession.provider,
    eventType: "EXTRACTION_COMPLETED",
    sessionState: "AWAITING_APPROVAL",
    userIdMasked: userMasked,
    metadata: {
      categoryCount,
      itemCount,
      qualityScore,
      processingTime: jobData.result?.processingTime,
    },
    sessionCreatedAt: finalizedSession.createdAt,
  });

  logOnboardingEvent({
    sessionId,
    provider: finalizedSession.provider,
    eventType: "PREVIEW_GENERATED",
    sessionState: "AWAITING_APPROVAL",
    userIdMasked: userMasked,
    metadata: {
      categoryCount,
      itemCount,
      qualityScore,
      previewUrlPresent: true,
    },
    sessionCreatedAt: finalizedSession.createdAt,
  });

  // Send preview link via provider. The pending flag remains durable until the
  // leased delivery is acknowledged after provider success.
  const deliveryClaim = await claimMessagingPendingMessage({
    expectedState: "AWAITING_APPROVAL",
    kind: "preview",
    sessionId,
  });
  if (!deliveryClaim) return;
  if (deliveryClaim.status === "discarded") {
    logger.error("[ExtractionWatcher] Invalid preview delivery state discarded", {
      failureCode: EXTRACTION_RESULT_INVALID_CODE,
      reason: deliveryClaim.reason,
      ...getExtractionWatcherIdContext("sessionId", sessionId),
    });
    return;
  }

  const adapter = getProviderAdapter(deliveryClaim.session.provider);
  try {
    await adapter.sendLinkMessage(
      deliveryClaim.session.providerUserId,
      MESSAGES.PREVIEW_READY(previewUrl),
      previewUrl,
      "View Preview",
    );

    await completeMessagingPendingMessage({
      kind: "preview",
      leaseToken: deliveryClaim.leaseToken,
      sessionId,
    });

    logOnboardingEvent({
      sessionId,
      provider: finalizedSession.provider,
      eventType: "MESSAGE_SENT",
      sessionState: "AWAITING_APPROVAL",
      userIdMasked: userMasked,
      metadata: { trigger: "preview_ready" },
      sessionCreatedAt: finalizedSession.createdAt,
    });
  } catch (err) {
    try {
      await releaseMessagingPendingMessage({
        kind: "preview",
        leaseToken: deliveryClaim.leaseToken,
        sessionId,
      });
    } catch (releaseError) {
      logger.warn("[ExtractionWatcher] Preview message lease release failed", {
        failureCode: EXTRACTION_PREVIEW_LEASE_RELEASE_FAILED_CODE,
        ...getExtractionWatcherIdContext("sessionId", sessionId),
        ...getExtractionWatcherErrorContext(releaseError),
      });
    }
    logger.error("[ExtractionWatcher] Failed to send preview link", {
      failureCode: EXTRACTION_PREVIEW_SEND_FAILED_CODE,
      ...getExtractionWatcherIdContext("sessionId", sessionId),
      ...getExtractionWatcherErrorContext(err),
    });

    logOnboardingEvent({
      sessionId,
      provider: finalizedSession.provider,
      eventType: "MESSAGE_SEND_FAILED",
      sessionState: "AWAITING_APPROVAL",
      userIdMasked: userMasked,
      error: {
        code: "SEND_FAILED",
        retryable: true,
      },
      sessionCreatedAt: finalizedSession.createdAt,
    });
  }

  // Check for pending uploads while processing
  if (finalizedSession.pendingUploadsWhileProcessing) {
    logger.info("[ExtractionWatcher] Pending uploads detected — owner may re-send", {
      ...getExtractionWatcherIdContext("sessionId", sessionId),
    });
  }
}

/**
 * Handle extraction failure.
 */
async function handleExtractionFailed(
  jobId: string,
  sessionId: string,
  jobData: MenuImageProcessingJob,
): Promise<void> {
  const finalized = await finalizeMessagingExtractionFailure({
    jobId,
    reason: EXTRACTION_FAILED_CODE,
    sessionId,
  });
  if (finalized.status === "expired") {
    logExpiredExtractionSession(finalized.session, sessionId);
    return;
  }
  if (finalized.status !== "finalized" || !finalized.session) return;

  const session = finalized.session;
  const userMasked = maskUserId(session.providerUserId);

  logOnboardingEvent({
    sessionId,
    provider: session.provider,
    eventType: "EXTRACTION_FAILED",
    sessionState: "FAILED",
    userIdMasked: userMasked,
    error: {
      code: jobData.error?.code || EXTRACTION_FAILED_CODE,
      retryable: jobData.error?.retryable === true,
    },
    sessionCreatedAt: session.createdAt,
  });

  const adapter = getProviderAdapter(session.provider);
  try {
    await adapter.sendTextMessage(
      session.providerUserId,
      MESSAGES.ASK_CLEARER_PHOTOS,
    );
  } catch (error) {
    logClearerPhotosMessageSendFailed(session, error);
  }
}
