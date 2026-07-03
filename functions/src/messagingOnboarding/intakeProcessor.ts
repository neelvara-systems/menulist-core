/**
 * Intake Processor — Scheduled Cloud Function (every 2 min)
 *
 * Checks for sessions whose intake window has closed,
 * runs Asset Intelligence validation, and triggers extraction.
 *
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §7 Phase 2
 */

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import { DB_COLLECTIONS } from "../constants/database";
import { firestoreAdmin } from "../firebaseAdmin";
import {
  buildMenuExtractionRoutingFields,
  buildMessagingOnboardingMenuExtractionDestination,
  MENU_EXTRACTION_SOURCES,
} from "../sharedData/menuExtractionJob";
import {
  FALLBACK_BUSINESS_TYPE,
  resolveStoreBusinessCategory,
} from "../sharedData/businessTypes";
import { MENU_IMAGE_PROCESSING_JOBS_COLLECTION } from "../types";
import {
  MessagingOnboardingSession,
  MessagingOnboardingState,
} from "../types/messagingOnboarding.types";
import { validateAssets } from "./assetIntelligence";
import { FEATURE_FLAGS, MESSAGES, PROCESSING, RATE_LIMITS } from "./constants";
import { logOnboardingEvent, maskUserId } from "./eventLogger";
import { recordMessagingOnboardingHealth } from "./healthMonitor";
import { drainPendingInboundMessages } from "./inboundQueue";
import { getProviderAdapter } from "./providers/providerRegistry";
import { transitionState } from "./sessionEngine";

const logger = functions.logger;
const db = firestoreAdmin;
const sessionsCol = DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS;
const INTAKE_PROVIDER_MESSAGE_SEND_FAILED_CODE = "INTAKE_PROVIDER_MESSAGE_SEND_FAILED";
const INTAKE_RATE_LIMIT_COUNTER_UPDATE_FAILED_CODE = "INTAKE_RATE_LIMIT_COUNTER_UPDATE_FAILED";

function getIntakeProcessorErrorContext(error: unknown): {
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

function getIntakeProcessorIdLogContext(
  label: string,
  value: unknown,
): Record<string, boolean | number> {
  const normalized = value === undefined || value === null ? "" : String(value);
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

function logProviderMessageSendFailed(
  session: MessagingOnboardingSession,
  messageTrigger: string,
  sessionState: MessagingOnboardingState,
  error: unknown,
): void {
  logger.warn("[IntakeProcessor] Non-blocking provider message send failed", {
    failureCode: INTAKE_PROVIDER_MESSAGE_SEND_FAILED_CODE,
    messageTrigger,
    provider: session.provider,
    sessionState,
    ...getIntakeProcessorIdLogContext("sessionId", session.sessionId),
    ...getIntakeProcessorErrorContext(error),
  });
}

function logProcessingRunCounterUpdateFailed(
  session: MessagingOnboardingSession,
  error: unknown,
): void {
  logger.warn("[IntakeProcessor] Processing run counter update failed", {
    failureCode: INTAKE_RATE_LIMIT_COUNTER_UPDATE_FAILED_CODE,
    provider: session.provider,
    sessionState: "VALIDATING_ASSETS",
    ...getIntakeProcessorIdLogContext("sessionId", session.sessionId),
    ...getIntakeProcessorErrorContext(error),
  });
}

/**
 * Main intake processor logic.
 * Called by onSchedule every 2 minutes.
 */
export async function intakeProcessorLogic(): Promise<{
  inboundProcessed: number;
  processed: number;
  errors: number;
}> {
  if (!FEATURE_FLAGS.ENABLE_MESSAGING_ONBOARDING) {
    return { inboundProcessed: 0, processed: 0, errors: 0 };
  }

  const now = Timestamp.now();
  let inboundProcessed = 0;
  let processed = 0;
  let errors = 0;

  try {
    const inbound = await drainPendingInboundMessages(20);
    inboundProcessed = inbound.processed;
    errors += inbound.failed;
    if (inbound.processed > 0 || inbound.retryScheduled > 0 || inbound.failed > 0) {
      logger.info("[IntakeProcessor] Inbound queue drained", inbound);
    }
  } catch (err) {
    logger.error("[IntakeProcessor] Failed to drain inbound queue", {
      ...getIntakeProcessorErrorContext(err),
    });
    errors++;
  }

  // Find sessions in COLLECTING_INPUT or AWAITING_MORE_UPLOADS
  // whose intake window has expired
  const collectingSnapshot = await db
    .collection(sessionsCol)
    .where("state", "in", [
      "COLLECTING_INPUT",
      "AWAITING_MORE_UPLOADS",
    ] as MessagingOnboardingState[])
    .where("intakeExpiresAt", "<=", now)
    .limit(10) // Process max 10 per run to avoid timeout
    .get();

  for (const doc of collectingSnapshot.docs) {
    try {
      const session = doc.data() as MessagingOnboardingSession;
      await processSession(session);
      processed++;
    } catch (err) {
      logger.error("[IntakeProcessor] Error processing session", {
        ...getIntakeProcessorIdLogContext("sessionId", doc.id),
        ...getIntakeProcessorErrorContext(err),
      });
      errors++;
    }
  }

  // Send pending publish confirmations (M-5: WhatsApp message after publish)
  await sendPendingPreviewMessages();
  await sendPendingPublishConfirmations();

  // Send pending fix request WhatsApp messages (spec §Story 5)
  await sendPendingFixMessages();

  await recordMessagingOnboardingHealth({ inboundProcessed, processed, errors });

  return { inboundProcessed, processed, errors };
}

/**
 * Retry preview links that were generated but not successfully delivered.
 * This protects the first owner touchpoint: once the preview exists, the owner
 * must receive the next WhatsApp response even if the first send attempt fails.
 */
async function sendPendingPreviewMessages(): Promise<void> {
  try {
    const pendingSnapshot = await db
      .collection(sessionsCol)
      .where("state", "==", "AWAITING_APPROVAL")
      .where("previewMessagePending", "==", true)
      .limit(10)
      .get();

    for (const doc of pendingSnapshot.docs) {
      try {
        const session = doc.data() as MessagingOnboardingSession;
        if (!session.previewUrl) continue;

        const adapter = getProviderAdapter(session.provider);
        await adapter.sendLinkMessage(
          session.providerUserId,
          MESSAGES.PREVIEW_READY(session.previewUrl),
          session.previewUrl,
          "View Preview",
        );

        await db.collection(sessionsCol).doc(session.sessionId).update({
          previewMessagePending: false,
          updatedAt: Timestamp.now(),
        });

        logOnboardingEvent({
          sessionId: session.sessionId,
          provider: session.provider,
          eventType: "MESSAGE_SENT",
          sessionState: "AWAITING_APPROVAL",
          userIdMasked: maskUserId(session.providerUserId),
          metadata: { trigger: "preview_ready_retry" },
          sessionCreatedAt: session.createdAt,
        });

        logger.info("[IntakeProcessor] Sent pending preview link", {
          ...getIntakeProcessorIdLogContext("sessionId", session.sessionId),
        });
      } catch (err) {
        logger.error("[IntakeProcessor] Failed to send pending preview link", {
          ...getIntakeProcessorIdLogContext("sessionId", doc.id),
          ...getIntakeProcessorErrorContext(err),
        });
      }
    }
  } catch (err) {
    logger.error("[IntakeProcessor] Failed to query pending preview links", {
      ...getIntakeProcessorErrorContext(err),
    });
  }
}

/**
 * Send WhatsApp confirmation for sessions that just published.
 * The approve route sets confirmationPending=true when transitioning to LIVE.
 * This function picks them up and sends "Your menu is live" via provider adapter.
 * @see __docs__/messaging-onboarding/messaging-onboarding_spec.md §WhatsApp Message Templates
 */
async function sendPendingPublishConfirmations(): Promise<void> {
  try {
    const pendingSnapshot = await db
      .collection(sessionsCol)
      .where("state", "==", "LIVE")
      .where("confirmationPending", "==", true)
      .limit(10)
      .get();

    for (const doc of pendingSnapshot.docs) {
      try {
        const session = doc.data() as MessagingOnboardingSession;
        if (!session.publishedResult) continue;

        const adapter = getProviderAdapter(session.provider);
        const { publicUrl, dashboardUrl } = session.publishedResult;

        await adapter.sendLinkMessage(
          session.providerUserId,
          MESSAGES.PUBLISHED(publicUrl, dashboardUrl),
          publicUrl,
          "View Menu",
        );

        // Clear the pending flag
        await db.collection(sessionsCol).doc(session.sessionId).update({
          confirmationPending: false,
          updatedAt: Timestamp.now(),
        });

        logOnboardingEvent({
          sessionId: session.sessionId,
          provider: session.provider,
          eventType: "MESSAGE_SENT",
          sessionState: "LIVE",
          userIdMasked: maskUserId(session.providerUserId),
          metadata: { trigger: "publish_confirmation" },
          sessionCreatedAt: session.createdAt,
        });

        logger.info("[IntakeProcessor] Sent publish confirmation", {
          ...getIntakeProcessorIdLogContext("sessionId", session.sessionId),
        });
      } catch (err) {
        logger.error("[IntakeProcessor] Failed to send publish confirmation", {
          ...getIntakeProcessorIdLogContext("sessionId", doc.id),
          ...getIntakeProcessorErrorContext(err),
        });
        // Don't clear the flag — will retry on next run
      }
    }
  } catch (err) {
    logger.error("[IntakeProcessor] Failed to query pending confirmations", {
      ...getIntakeProcessorErrorContext(err),
    });
  }
}

/**
 * Send WhatsApp message for sessions where a fix was requested from preview page.
 * The fix route sets fixMessagePending=true when transitioning back to COLLECTING_INPUT.
 * @see __docs__/messaging-onboarding/messaging-onboarding_spec.md §Story 5
 */
async function sendPendingFixMessages(): Promise<void> {
  try {
    const pendingSnapshot = await db
      .collection(sessionsCol)
      .where("state", "==", "COLLECTING_INPUT")
      .where("fixMessagePending", "==", true)
      .limit(10)
      .get();

    for (const doc of pendingSnapshot.docs) {
      try {
        const session = doc.data() as MessagingOnboardingSession;
        const adapter = getProviderAdapter(session.provider);

        await adapter.sendTextMessage(
          session.providerUserId,
          MESSAGES.FIX_REQUEST_ACKNOWLEDGED,
        );

        // Clear the pending flag
        await db.collection(sessionsCol).doc(session.sessionId).update({
          fixMessagePending: false,
          updatedAt: Timestamp.now(),
        });

        logOnboardingEvent({
          sessionId: session.sessionId,
          provider: session.provider,
          eventType: "MESSAGE_SENT",
          sessionState: "COLLECTING_INPUT",
          userIdMasked: maskUserId(session.providerUserId),
          metadata: { trigger: "fix_request_acknowledged" },
          sessionCreatedAt: session.createdAt,
        });
      } catch (err) {
        logger.error("[IntakeProcessor] Failed to send fix message", {
          ...getIntakeProcessorIdLogContext("sessionId", doc.id),
          ...getIntakeProcessorErrorContext(err),
        });
      }
    }
  } catch (err) {
    logger.error("[IntakeProcessor] Failed to query pending fix messages", {
      ...getIntakeProcessorErrorContext(err),
    });
  }
}

/**
 * Process a single session whose intake window has closed.
 */
async function processSession(
  session: MessagingOnboardingSession,
): Promise<void> {
  const sessionRef = db.collection(sessionsCol).doc(session.sessionId);
  const userMasked = maskUserId(session.providerUserId);

  logOnboardingEvent({
    sessionId: session.sessionId,
    provider: session.provider,
    eventType: "INTAKE_WINDOW_CLOSED",
    sessionState: session.state,
    userIdMasked: userMasked,
    metadata: { uploadCount: session.uploads.length },
    sessionCreatedAt: session.createdAt,
  });

  // Check if we have any uploads
  if (session.uploads.length === 0) {
    // No uploads — expire session silently
    await transitionState(
      session.sessionId,
      session.state,
      "EXPIRED",
      "No uploads received before intake window closed",
      { _provider: session.provider, _userIdMasked: userMasked },
    );
    return;
  }

  // Check extraction cost cap — per-session (INV-3)
  if (session.processingRuns >= PROCESSING.MAX_PROCESSING_RUNS_PER_SESSION) {
    const adapter = getProviderAdapter(session.provider);
    try {
      await adapter.sendTextMessage(
        session.providerUserId,
        MESSAGES.EXTRACTION_CAP_REACHED,
      );
    } catch (err) {
      logProviderMessageSendFailed(
        session,
        "session_processing_cap_reached",
        session.state,
        err,
      );
    }

    logOnboardingEvent({
      sessionId: session.sessionId,
      provider: session.provider,
      eventType: "EXTRACTION_FAILED",
      sessionState: session.state,
      userIdMasked: userMasked,
      metadata: { reason: "extraction_cap_reached", runs: session.processingRuns },
      sessionCreatedAt: session.createdAt,
    });
    return;
  }

  // Check extraction cost cap — per-week (spec §Abuse Prevention: "Max processing runs per week per phone: 5")
  const crypto = await import("crypto");
  const userHash = crypto
    .createHash("sha256")
    .update(`${session.provider}:${session.providerUserId}`)
    .digest("hex");
  const rateLimitDoc = await db
    .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_RATE_LIMITS)
    .doc(userHash)
    .get();
  if (rateLimitDoc.exists) {
    const rateLimit = rateLimitDoc.data()!;
    if ((rateLimit.processingRunsThisWeek || 0) >= RATE_LIMITS.MAX_PROCESSING_RUNS_PER_WEEK) {
      const adapter = getProviderAdapter(session.provider);
      try {
        await adapter.sendTextMessage(
          session.providerUserId,
          MESSAGES.EXTRACTION_CAP_REACHED,
        );
      } catch (err) {
        logProviderMessageSendFailed(
          session,
          "weekly_processing_cap_reached",
          session.state,
          err,
        );
      }
      logOnboardingEvent({
        sessionId: session.sessionId,
        provider: session.provider,
        eventType: "EXTRACTION_FAILED",
        sessionState: session.state,
        userIdMasked: userMasked,
        metadata: { reason: "weekly_processing_cap_reached", runs: rateLimit.processingRunsThisWeek },
        sessionCreatedAt: session.createdAt,
      });
      return;
    }
  }

  // Transition to VALIDATING_ASSETS
  await transitionState(
    session.sessionId,
    session.state,
    "VALIDATING_ASSETS",
    "Intake window closed, starting validation",
    { _provider: session.provider, _userIdMasked: userMasked },
  );

  // Run Asset Intelligence
  logOnboardingEvent({
    sessionId: session.sessionId,
    provider: session.provider,
    eventType: "ASSET_VALIDATION_STARTED",
    sessionState: "VALIDATING_ASSETS",
    userIdMasked: userMasked,
    metadata: { fileCount: session.uploads.length },
    sessionCreatedAt: session.createdAt,
  });

  let validationResult;
  try {
    validationResult = await validateAssets(session.uploads);
  } catch (err) {
    logger.error("[IntakeProcessor] Asset validation failed", {
      ...getIntakeProcessorIdLogContext("sessionId", session.sessionId),
      ...getIntakeProcessorErrorContext(err),
    });

    logOnboardingEvent({
      sessionId: session.sessionId,
      provider: session.provider,
      eventType: "ASSET_VALIDATION_FAILED",
      sessionState: "VALIDATING_ASSETS",
      userIdMasked: userMasked,
      error: {
        code: "GEMINI_API_ERROR",
        retryable: true,
      },
      sessionCreatedAt: session.createdAt,
    });

    // Retry once
    try {
      validationResult = await validateAssets(session.uploads);
    } catch (retryErr) {
      // Ask user for clearer photos
      await transitionState(
        session.sessionId,
        "VALIDATING_ASSETS",
        "FAILED",
        "Asset validation failed after retry",
        { _provider: session.provider, _userIdMasked: userMasked },
      );

      const adapter = getProviderAdapter(session.provider);
      try {
        await adapter.sendTextMessage(
          session.providerUserId,
          MESSAGES.ASK_CLEARER_PHOTOS,
        );
      } catch (sendErr) {
        logProviderMessageSendFailed(
          session,
          "asset_validation_retry_failed",
          "FAILED",
          sendErr,
        );
      }
      return;
    }
  }

  logOnboardingEvent({
    sessionId: session.sessionId,
    provider: session.provider,
    eventType: "ASSET_VALIDATION_COMPLETED",
    sessionState: "VALIDATING_ASSETS",
    userIdMasked: userMasked,
    metadata: {
      validCount: validationResult.valid_menu_files.length,
      invalidCount: validationResult.invalid_files.length,
      completeness: validationResult.menu_completeness,
      confidence: validationResult.confidence,
      businessType: validationResult.detected_business_type?.business_type,
    },
    sessionCreatedAt: session.createdAt,
  });

  // Map file indices to upload IDs
  const validUploadIds = validationResult.valid_menu_files
    .map((idx) => session.uploads[idx - 1]?.id)
    .filter(Boolean) as string[];

  const invalidUploadIds = validationResult.invalid_files
    .map((idx) => session.uploads[idx - 1]?.id)
    .filter(Boolean) as string[];

  // Store validation results
  const bizType = validationResult.detected_business_type || {};
  const typeConfidence = bizType.type_confidence;
  const useDetectedBusinessType = typeConfidence === "high" || typeConfidence === "medium";
  const hasDetectedBusinessType = useDetectedBusinessType && Boolean(bizType.business_type);
  const detectedBusinessType =
    hasDetectedBusinessType
      ? bizType.business_type
      : FALLBACK_BUSINESS_TYPE;
  const detectedBusinessCategory = resolveStoreBusinessCategory(
    detectedBusinessType,
    bizType.business_category,
  );
  const typeSource =
    hasDetectedBusinessType
      ? "ai"
      : "fallback";

  await sessionRef.update({
    validMenuFiles: validUploadIds,
    invalidFiles: invalidUploadIds,
    menuCompleteness: validationResult.menu_completeness,
    validationConfidence: validationResult.confidence,
    extractedBusinessInfo: validationResult.extracted_business_info
      ? {
        businessName: validationResult.extracted_business_info.business_name,
        phoneNumber: validationResult.extracted_business_info.phone_number,
        address: validationResult.extracted_business_info.address,
        logoPresent: validationResult.extracted_business_info.logo_present,
        cuisineHint: validationResult.extracted_business_info.cuisine_hint,
        confidence: validationResult.extracted_business_info.confidence,
      }
      : null,
    detectedBusinessType,
    detectedBusinessCategory,
    typeConfidence: typeConfidence || "low",
    typeSource,
    updatedAt: Timestamp.now(),
  });

  // Check: are there any valid menu files?
  if (validUploadIds.length === 0) {
    // All files invalid — ask for more or better photos
    if (validationResult.menu_completeness === "insufficient") {
      await transitionState(
        session.sessionId,
        "VALIDATING_ASSETS",
        "FAILED",
        "No valid menu files found",
        { _provider: session.provider, _userIdMasked: userMasked },
      );

      const adapter = getProviderAdapter(session.provider);
      try {
        await adapter.sendTextMessage(
          session.providerUserId,
          MESSAGES.ASK_CLEARER_PHOTOS,
        );
      } catch (err) {
        logProviderMessageSendFailed(
          session,
          "no_valid_menu_files",
          "FAILED",
          err,
        );
      }
      return;
    }

    // Some files but all invalid — ask for menu photos specifically
    await transitionState(
      session.sessionId,
      "VALIDATING_ASSETS",
      "AWAITING_MORE_UPLOADS",
      "All uploaded files are non-menu — asking for menu photos",
      { _provider: session.provider, _userIdMasked: userMasked },
    );

    const adapter = getProviderAdapter(session.provider);
    try {
      await adapter.sendTextMessage(
        session.providerUserId,
        MESSAGES.NON_MENU_FILE,
      );
    } catch (err) {
      logProviderMessageSendFailed(
        session,
        "all_files_non_menu",
        "AWAITING_MORE_UPLOADS",
        err,
      );
    }
    return;
  }

  // Check: is menu complete enough?
  if (validationResult.menu_completeness === "partial") {
    // Ask for more uploads but continue to processing
    const adapter = getProviderAdapter(session.provider);
    try {
      await adapter.sendTextMessage(
        session.providerUserId,
        MESSAGES.ASK_MORE_UPLOADS,
      );
    } catch (err) {
      logProviderMessageSendFailed(
        session,
        "partial_menu_more_uploads",
        "VALIDATING_ASSETS",
        err,
      );
    }
  }

  // Trigger extraction
  await triggerExtraction(session, validUploadIds, {
    businessType: detectedBusinessType,
    businessCategory: detectedBusinessCategory,
  });
}

/**
 * Create extraction job and transition to PROCESSING_MENU
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §8.1, §19.3
 */
async function triggerExtraction(
  session: MessagingOnboardingSession,
  validUploadIds: string[],
  detected: { businessType: string; businessCategory: string },
): Promise<void> {
  const sessionRef = db.collection(sessionsCol).doc(session.sessionId);
  const userMasked = maskUserId(session.providerUserId);

  // Get valid upload objects
  const validUploads = session.uploads.filter((u) =>
    validUploadIds.includes(u.id),
  );

  // Send progress message (INV-8: System Presence)
  const adapter = getProviderAdapter(session.provider);
  try {
    await adapter.sendTextMessage(
      session.providerUserId,
      MESSAGES.EXTRACTION_PROGRESS,
    );
  } catch (err) {
    logProviderMessageSendFailed(
      session,
      "extraction_progress",
      "VALIDATING_ASSETS",
      err,
    );
  }

  logOnboardingEvent({
    sessionId: session.sessionId,
    provider: session.provider,
    eventType: "EXTRACTION_STARTED",
    sessionState: "VALIDATING_ASSETS",
    userIdMasked: userMasked,
    metadata: {
      validFileCount: validUploads.length,
      processingRun: session.processingRuns + 1,
    },
    sessionCreatedAt: session.createdAt,
  });

  // Create extraction job directly via Admin SDK (§19.3 — no NextAuth)
  const jobData = {
    projectId: `msg-onboarding-${session.sessionId}`,
    files: validUploads.map((f) => ({
      uid: f.id,
      name: f.fileName || f.id,
      size: f.fileSize,
      type: f.mimeType,
      url: f.storageUrl,
    })),
    targetLanguages: [{ code: "en", name: "English" }],
    action: "IMAGE_PROCESSING",
    businessType: detected.businessType || session.detectedBusinessType || FALLBACK_BUSINESS_TYPE,
    businessCategory: resolveStoreBusinessCategory(
      detected.businessType || session.detectedBusinessType || FALLBACK_BUSINESS_TYPE,
      detected.businessCategory || session.detectedBusinessCategory || undefined,
    ),
    ...buildMenuExtractionRoutingFields(buildMessagingOnboardingMenuExtractionDestination(session.sessionId)),
    source: MENU_EXTRACTION_SOURCES.MESSAGING_ONBOARDING,
    skipProjectSave: true,
    status: "pending",
    progress: 0,
    currentStep: "Queued",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const jobRef = await db
    .collection(MENU_IMAGE_PROCESSING_JOBS_COLLECTION)
    .add(jobData);

  // Update session
  await sessionRef.update({
    extractionJobId: jobRef.id,
    processingRuns: session.processingRuns + 1,
    updatedAt: Timestamp.now(),
  });

  // Increment weekly processing runs counter (spec §Abuse Prevention)
  const extractionUserHash = require("crypto")
    .createHash("sha256")
    .update(`${session.provider}:${session.providerUserId}`)
    .digest("hex");
  await db
    .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_RATE_LIMITS)
    .doc(extractionUserHash)
    .update({ processingRunsThisWeek: FieldValue.increment(1) })
    .catch((err) => {
      logProcessingRunCounterUpdateFailed(session, err);
    });

  // Transition to PROCESSING_MENU
  await transitionState(
    session.sessionId,
    "VALIDATING_ASSETS",
    "PROCESSING_MENU",
    "Extraction job created",
    { _provider: session.provider, _userIdMasked: userMasked },
  );
}
