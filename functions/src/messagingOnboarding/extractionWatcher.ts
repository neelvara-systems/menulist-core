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
import { MessagingOnboardingSession } from "../types/messagingOnboarding.types";
import { MESSAGES } from "./constants";
import { logOnboardingEvent, maskUserId } from "./eventLogger";
import { getProviderAdapter } from "./providers/providerRegistry";
import { transitionState } from "./sessionEngine";

const logger = functions.logger;
const db = firestoreAdmin;
const sessionsCol = DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS;
const EXTRACTION_FAILED_CODE = "EXTRACTION_FAILED";
const EXTRACTION_PREVIEW_SEND_FAILED_CODE = "EXTRACTION_PREVIEW_SEND_FAILED";
const EXTRACTION_CLEARER_PHOTOS_SEND_FAILED_CODE = "EXTRACTION_CLEARER_PHOTOS_SEND_FAILED";

const normalizeBaseUrl = (value?: string): string => {
  const trimmed = value?.trim().replace(/\/+$/, "") || "";
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

function getPreviewBaseUrl(): string {
  const previewBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_MSG_PREVIEW_BASE_URL);
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

function logClearerPhotosMessageSendFailed(
  session: MessagingOnboardingSession,
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

/**
 * Handle extraction job completion for messaging onboarding sessions.
 * Called by the onDocumentUpdated trigger in index.ts.
 */
export async function handleExtractionJobUpdate(
  jobId: string,
  beforeData: any,
  afterData: any,
): Promise<void> {
  // Only handle messaging onboarding jobs (prefix: msg-onboarding-)
  if (!afterData.projectId?.startsWith("msg-onboarding-")) return;

  // Only trigger on status change (not progress updates)
  if (beforeData.status === afterData.status) return;

  const sessionId = afterData.projectId.replace("msg-onboarding-", "");

  if (afterData.status === "completed") {
    await handleExtractionComplete(sessionId, afterData);
  } else if (afterData.status === "failed") {
    await handleExtractionFailed(sessionId, afterData);
  }
}

/**
 * Handle successful extraction completion.
 * Stores extracted data in session, generates preview, sends link.
 */
async function handleExtractionComplete(
  sessionId: string,
  jobData: any,
): Promise<void> {
  const sessionRef = db.collection(sessionsCol).doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    logger.warn("[ExtractionWatcher] Session not found", getExtractionWatcherIdContext("sessionId", sessionId));
    return;
  }

  const session = sessionDoc.data() as MessagingOnboardingSession;
  const userMasked = maskUserId(session.providerUserId);

  // State guard: only process if session is still in PROCESSING_MENU
  // Prevents generating previews for expired/failed sessions where extraction finished late
  if (session.state !== "PROCESSING_MENU") {
    logger.warn("[ExtractionWatcher] Session not in PROCESSING_MENU, ignoring extraction result", {
      ...getExtractionWatcherIdContext("sessionId", sessionId),
      currentState: session.state,
    });
    if (!jobData.skipProjectSave) await cleanupTempProject(sessionId);
    return;
  }

  // Read extraction result from job document (not temp project)
  const combinedData = jobData.result?.combinedData;
  const qualityScore = jobData.result?.qualityScore;
  const extractedBusinessProfile = jobData.result?.extractedBusinessProfile || combinedData?.extractedBusinessProfile || null;

  logOnboardingEvent({
    sessionId,
    provider: session.provider,
    eventType: "EXTRACTION_COMPLETED",
    sessionState: session.state,
    userIdMasked: userMasked,
    metadata: {
      categoryCount: combinedData?.categories?.length || 0,
      itemCount: combinedData?.items?.length || 0,
      qualityScore,
      processingTime: jobData.result?.processingTime,
    },
    sessionCreatedAt: session.createdAt,
  });

  // Structural validation: ensure combinedData has valid arrays (not null/undefined/non-array)
  const categories = Array.isArray(combinedData?.categories) ? combinedData.categories : [];
  const items = Array.isArray(combinedData?.items) ? combinedData.items : [];
  const categoryCount = categories.length;
  const itemCount = items.length;

  // Blank prevention gate: 0 items → FAILED, not preview
  if (!combinedData || categoryCount === 0 || itemCount === 0) {
    logOnboardingEvent({
      sessionId,
      provider: session.provider,
      eventType: "BLANK_PREVENTION_TRIGGERED",
      sessionState: session.state,
      userIdMasked: userMasked,
      metadata: { categoryCount, itemCount },
      sessionCreatedAt: session.createdAt,
    });

    await transitionState(
      sessionId,
      session.state,
      "FAILED",
      `Blank prevention: ${categoryCount} categories, ${itemCount} items`,
      { _provider: session.provider, _userIdMasked: userMasked },
    );

    // Send message asking for clearer photos
    const adapter = getProviderAdapter(session.provider);
    try {
      await adapter.sendTextMessage(
        session.providerUserId,
        MESSAGES.ASK_CLEARER_PHOTOS,
      );
    } catch (error) {
      logClearerPhotosMessageSendFailed(session, error);
    }

    // Cleanup temp project
    if (!jobData.skipProjectSave) await cleanupTempProject(sessionId);
    return;
  }

  const validUploads = session.uploads.filter((upload) =>
    (session.validMenuFiles || []).includes(upload.id),
  );
  const redistributedFiles: Record<string, any> = jobData.result?.redistributedFiles
    && typeof jobData.result.redistributedFiles === "object"
    ? jobData.result.redistributedFiles
    : Object.fromEntries(
      processParallelResponse(
        {
          data: combinedData,
          qualityScore,
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
    const extractedData = redistributedFiles[upload.id] || null;
    if (Array.isArray(extractedData?.data?.items)) {
      extractedData.data.items = extractedData.data.items.map((item: any) => ({
        ...item,
        _extractedAt: item._extractedAt || extractedAt,
      }));
    }

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
          message: extractedData.message || "",
          ...(Array.isArray(extractedData.processingMessages) && extractedData.processingMessages.length
            ? { processingMessages: extractedData.processingMessages }
            : {}),
          data: extractedData.data,
        }
        : null,
      ...(extractedData?.qualityScore != null ? { qualityScore: extractedData.qualityScore } : {}),
    };
  });
  const extractedFileData = extractedProjectFiles
    .map((file) => file.extractedData?.data)
    .filter(Boolean);
  const previewMenuData = extractedFileData.length
    ? {
      ...combinedData,
      languages: combinedData.languages || [],
      categories: extractedFileData.flatMap((data: any) => data.categories || []),
      items: extractedFileData.flatMap((data: any) => data.items || []),
      ...(extractedBusinessProfile ? { extractedBusinessProfile } : {}),
    }
    : combinedData;

  // Generate preview token (cryptographically random, 32 chars)
  const previewToken = crypto.randomBytes(24).toString("base64url");
  const previewBaseUrl = getPreviewBaseUrl();
  const previewUrl = `${previewBaseUrl}/msg-preview/${sessionId}?token=${previewToken}`;

  // Store extraction result in session
  await sessionRef.update({
    extractedMenuData: previewMenuData,
    extractedBusinessProfile,
    extractedProjectFiles,
    qualityScore,
    previewToken,
    previewUrl,
    previewMessagePending: true,
    updatedAt: Timestamp.now(),
  });

  // Transition to PREVIEW_READY
  await transitionState(
    sessionId,
    session.state,
    "PREVIEW_READY",
    "Extraction complete, preview generated",
    { _provider: session.provider, _userIdMasked: userMasked },
  );

  // Then immediately to AWAITING_APPROVAL
  await transitionState(
    sessionId,
    "PREVIEW_READY",
    "AWAITING_APPROVAL",
    "Preview ready, awaiting owner approval",
    { _provider: session.provider, _userIdMasked: userMasked },
  );

  logOnboardingEvent({
    sessionId,
    provider: session.provider,
    eventType: "PREVIEW_GENERATED",
    sessionState: "AWAITING_APPROVAL",
    userIdMasked: userMasked,
    metadata: {
      categoryCount,
      itemCount,
      qualityScore,
      previewUrl,
    },
    sessionCreatedAt: session.createdAt,
  });

  // Send preview link via provider
  const adapter = getProviderAdapter(session.provider);
  try {
    await adapter.sendLinkMessage(
      session.providerUserId,
      MESSAGES.PREVIEW_READY(previewUrl),
      previewUrl,
      "View Preview",
    );

    logOnboardingEvent({
      sessionId,
      provider: session.provider,
      eventType: "MESSAGE_SENT",
      sessionState: "AWAITING_APPROVAL",
      userIdMasked: userMasked,
      metadata: { trigger: "preview_ready" },
      sessionCreatedAt: session.createdAt,
    });

    await sessionRef.update({
      previewMessagePending: false,
      updatedAt: Timestamp.now(),
    });
  } catch (err) {
    logger.error("[ExtractionWatcher] Failed to send preview link", {
      failureCode: EXTRACTION_PREVIEW_SEND_FAILED_CODE,
      ...getExtractionWatcherIdContext("sessionId", sessionId),
      ...getExtractionWatcherErrorContext(err),
    });

    logOnboardingEvent({
      sessionId,
      provider: session.provider,
      eventType: "MESSAGE_SEND_FAILED",
      sessionState: "AWAITING_APPROVAL",
      userIdMasked: userMasked,
      error: {
        code: "SEND_FAILED",
        retryable: true,
      },
      sessionCreatedAt: session.createdAt,
    });
  }

  // Check for pending uploads while processing
  if (session.pendingUploadsWhileProcessing) {
    logger.info("[ExtractionWatcher] Pending uploads detected — owner may re-send", {
      ...getExtractionWatcherIdContext("sessionId", sessionId),
    });
    // Don't auto-restart — owner will see preview and decide
    // If they send 3+ more images, full resend logic in sessionEngine handles it
  }

  // Cleanup temp project (§8.1.1)
  if (!jobData.skipProjectSave) await cleanupTempProject(sessionId);
}

/**
 * Handle extraction failure.
 */
async function handleExtractionFailed(
  sessionId: string,
  jobData: any,
): Promise<void> {
  const sessionRef = db.collection(sessionsCol).doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) return;

  const session = sessionDoc.data() as MessagingOnboardingSession;
  const userMasked = maskUserId(session.providerUserId);

  logOnboardingEvent({
    sessionId,
    provider: session.provider,
    eventType: "EXTRACTION_FAILED",
    sessionState: session.state,
    userIdMasked: userMasked,
    error: {
      code: jobData.error?.code || EXTRACTION_FAILED_CODE,
      retryable: jobData.error?.retryable || false,
    },
    sessionCreatedAt: session.createdAt,
  });

  await transitionState(
    sessionId,
    session.state,
    "FAILED",
    EXTRACTION_FAILED_CODE,
    { _provider: session.provider, _userIdMasked: userMasked },
  );

  // Send message asking for clearer photos
  const adapter = getProviderAdapter(session.provider);
  try {
    await adapter.sendTextMessage(
      session.providerUserId,
      MESSAGES.ASK_CLEARER_PHOTOS,
    );
  } catch (error) {
    logClearerPhotosMessageSendFailed(session, error);
  }

  // Cleanup temp project
  if (!jobData.skipProjectSave) await cleanupTempProject(sessionId);
}

/**
 * Delete temporary project created by saveFilesToProject.
 * saveFilesToProject uses parseProjectId() which splits by "-":
 *   "msg-onboarding-{sessionId}" → tId="msg", sId="{sessionId}"
 *   → nested path: projects/msg/{sessionId}/msg-onboarding-{sessionId}
 * The cleanup must use the same path resolution.
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §8.1.1
 */
async function cleanupTempProject(sessionId: string): Promise<void> {
  const tempProjectId = `msg-onboarding-${sessionId}`;
  try {
    // Must match saveFilesToProject's parseProjectId path resolution:
    // "msg-onboarding-{sessionId}" → tId="msg", sId="{sessionId}"
    // → projects/msg/{sessionId}/msg-onboarding-{sessionId}
    const parts = tempProjectId.split("-");
    const tId = parts[0]; // "msg"
    const sId = parts[parts.length - 1]; // sessionId
    await db.collection(DB_COLLECTIONS.PROJECTS).doc(tId).collection(sId).doc(tempProjectId).delete();
    logger.info("[ExtractionWatcher] Cleaned up temp project", {
      ...getExtractionWatcherIdContext("sessionId", sessionId),
      ...getExtractionWatcherIdContext("tempProjectId", tempProjectId),
    });
  } catch (error) {
    logger.warn("[ExtractionWatcher] Temp project cleanup failed", {
      ...getExtractionWatcherIdContext("sessionId", sessionId),
      ...getExtractionWatcherIdContext("tempProjectId", tempProjectId),
      ...getExtractionWatcherErrorContext(error),
      cleanupTarget: "messaging_onboarding_temp_project",
    });
  }
}
