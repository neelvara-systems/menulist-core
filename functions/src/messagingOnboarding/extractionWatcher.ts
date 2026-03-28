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
import { MessagingOnboardingSession } from "../types/messagingOnboarding.types";
import { MESSAGES } from "./constants";
import { logOnboardingEvent, maskUserId } from "./eventLogger";
import { getProviderAdapter } from "./providers/providerRegistry";
import { transitionState } from "./sessionEngine";

const logger = functions.logger;
const db = firestoreAdmin;
const sessionsCol = DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS;

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
    logger.warn("[ExtractionWatcher] Session not found", { sessionId });
    return;
  }

  const session = sessionDoc.data() as MessagingOnboardingSession;
  const userMasked = maskUserId(session.providerUserId);

  // State guard: only process if session is still in PROCESSING_MENU
  // Prevents generating previews for expired/failed sessions where extraction finished late
  if (session.state !== "PROCESSING_MENU") {
    logger.warn("[ExtractionWatcher] Session not in PROCESSING_MENU, ignoring extraction result", {
      sessionId,
      currentState: session.state,
    });
    await cleanupTempProject(sessionId);
    return;
  }

  // Read extraction result from job document (not temp project)
  const combinedData = jobData.result?.combinedData;
  const qualityScore = jobData.result?.qualityScore;

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
    } catch {
      // Non-critical
    }

    // Cleanup temp project
    await cleanupTempProject(sessionId);
    return;
  }

  // Generate preview token (cryptographically random, 32 chars)
  const previewToken = crypto.randomBytes(24).toString("base64url");
  const previewBaseUrl =
    process.env.NEXT_PUBLIC_MSG_PREVIEW_BASE_URL || "https://menulist.ai";
  const previewUrl = `${previewBaseUrl}/msg-preview/${sessionId}?token=${previewToken}`;

  // Store extraction result in session
  await sessionRef.update({
    extractedMenuData: combinedData,
    qualityScore,
    previewToken,
    previewUrl,
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
  } catch (err) {
    logger.error("[ExtractionWatcher] Failed to send preview link", {
      sessionId,
      error: (err as Error).message,
    });

    logOnboardingEvent({
      sessionId,
      provider: session.provider,
      eventType: "MESSAGE_SEND_FAILED",
      sessionState: "AWAITING_APPROVAL",
      userIdMasked: userMasked,
      error: {
        code: "SEND_FAILED",
        message: (err as Error).message,
        retryable: true,
      },
      sessionCreatedAt: session.createdAt,
    });
  }

  // Check for pending uploads while processing
  if (session.pendingUploadsWhileProcessing) {
    logger.info("[ExtractionWatcher] Pending uploads detected — owner may re-send", {
      sessionId,
    });
    // Don't auto-restart — owner will see preview and decide
    // If they send 3+ more images, full resend logic in sessionEngine handles it
  }

  // Cleanup temp project (§8.1.1)
  await cleanupTempProject(sessionId);
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
      code: jobData.error?.code || "EXTRACTION_FAILED",
      message: jobData.error?.message || "Unknown extraction error",
      retryable: jobData.error?.retryable || false,
    },
    sessionCreatedAt: session.createdAt,
  });

  await transitionState(
    sessionId,
    session.state,
    "FAILED",
    `Extraction failed: ${jobData.error?.message || "unknown error"}`,
    { _provider: session.provider, _userIdMasked: userMasked },
  );

  // Send message asking for clearer photos
  const adapter = getProviderAdapter(session.provider);
  try {
    await adapter.sendTextMessage(
      session.providerUserId,
      MESSAGES.ASK_CLEARER_PHOTOS,
    );
  } catch {
    // Non-critical
  }

  // Cleanup temp project
  await cleanupTempProject(sessionId);
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
    await db.collection("projects").doc(tId).collection(sId).doc(tempProjectId).delete();
    logger.info("[ExtractionWatcher] Cleaned up temp project", {
      tempProjectId,
      path: `projects/${tId}/${sId}/${tempProjectId}`,
    });
  } catch {
    // Silent failure — temp project may not exist if extraction failed before save
  }
}
