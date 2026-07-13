/**
 * Intake Processor — Scheduled Cloud Function (every 2 min)
 *
 * Checks for sessions whose intake window has closed,
 * runs Asset Intelligence validation, and triggers extraction.
 *
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §7 Phase 2
 */

import { Timestamp } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import { DB_COLLECTIONS } from "../constants/database";
import { firestoreAdmin } from "../firebaseAdmin";
import {
  FALLBACK_BUSINESS_TYPE,
  resolveStoreBusinessCategory,
} from "../sharedData/businessTypes";
import {
  MessagingOnboardingSession,
  MessagingOnboardingState,
} from "../types/messagingOnboarding.types";
import { validateAssets } from "./assetIntelligence";
import { FEATURE_FLAGS, MESSAGES } from "./constants";
import {
  claimMessagingIntakeSession,
  commitMessagingAssetValidation,
  enqueueMessagingExtractionJob,
  failMessagingAssetValidation,
} from "./extractionLifecycle";
import type { MessagingLifecycleSession } from "./extractionLifecycle";
import { logOnboardingEvent, maskUserId } from "./eventLogger";
import { recordMessagingOnboardingHealth } from "./healthMonitor";
import { drainPendingInboundMessages } from "./inboundQueue";
import {
  claimMessagingPendingMessage,
  completeMessagingPendingMessage,
  MessagingPendingMessageClaim,
  MessagingPendingMessageKind,
  MessagingPendingMessageSession,
  releaseMessagingPendingMessage,
} from "./messageDeliveryLease";
import { getProviderAdapter } from "./providers/providerRegistry";
import { transitionState } from "./sessionEngine";

const logger = functions.logger;
const db = firestoreAdmin;
const sessionsCol = DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS;
const INTAKE_PROVIDER_MESSAGE_SEND_FAILED_CODE = "INTAKE_PROVIDER_MESSAGE_SEND_FAILED";
const INTAKE_MESSAGE_LEASE_RELEASE_FAILED_CODE = "INTAKE_MESSAGE_LEASE_RELEASE_FAILED";
const INTAKE_ASSET_VALIDATION_RETRY_FAILED_CODE = "INTAKE_ASSET_VALIDATION_RETRY_FAILED";

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
  session: Pick<MessagingOnboardingSession, "provider" | "sessionId">,
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

function logLifecycleSessionExpired(
  session: MessagingLifecycleSession,
  previousState: MessagingOnboardingState,
): void {
  logOnboardingEvent({
    eventType: "SESSION_EXPIRED",
    metadata: { previousState },
    provider: session.provider,
    sessionCreatedAt: session.createdAt,
    sessionId: session.sessionId,
    sessionState: "EXPIRED",
    userIdMasked: maskUserId(session.providerUserId),
  });
}

async function releasePendingMessageLease(
  kind: MessagingPendingMessageKind,
  claim: { leaseToken: string; session: MessagingPendingMessageSession },
): Promise<void> {
  try {
    await releaseMessagingPendingMessage({
      kind,
      leaseToken: claim.leaseToken,
      sessionId: claim.session.sessionId,
    });
  } catch (error) {
    logger.warn("[IntakeProcessor] Pending message lease release failed", {
      failureCode: INTAKE_MESSAGE_LEASE_RELEASE_FAILED_CODE,
      kind,
      ...getIntakeProcessorIdLogContext("sessionId", claim.session.sessionId),
      ...getIntakeProcessorErrorContext(error),
    });
  }
}

function logDiscardedPendingMessage(
  kind: MessagingPendingMessageKind,
  sessionId: string,
  claim: Extract<MessagingPendingMessageClaim, { status: "discarded" }>,
): void {
  logger.error("[IntakeProcessor] Invalid pending message discarded", {
    failureCode: "INTAKE_PENDING_MESSAGE_INVALID",
    kind,
    reason: claim.reason,
    ...getIntakeProcessorIdLogContext("sessionId", sessionId),
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
    const inbound = await drainPendingInboundMessages(2);
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
    ] satisfies MessagingOnboardingState[])
    .where("intakeExpiresAt", "<=", now)
    .limit(2) // Scan past one corrupt/raced row while still running at most one model session.
    .get();

  for (const doc of collectingSnapshot.docs) {
    try {
      if (await processSession(doc.id)) {
        processed++;
        break;
      }
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
      .limit(1)
      .get();

    for (const doc of pendingSnapshot.docs) {
      let deliveryClaim: MessagingPendingMessageClaim | null = null;
      try {
        deliveryClaim = await claimMessagingPendingMessage({
          expectedState: "AWAITING_APPROVAL",
          kind: "preview",
          sessionId: doc.id,
        });
        if (!deliveryClaim) continue;
        if (deliveryClaim.status === "discarded") {
          logDiscardedPendingMessage("preview", doc.id, deliveryClaim);
          continue;
        }
        const session = deliveryClaim.session;
        if (!session.previewUrl) {
          await releasePendingMessageLease("preview", deliveryClaim);
          continue;
        }

        const adapter = getProviderAdapter(session.provider);
        await adapter.sendLinkMessage(
          session.providerUserId,
          MESSAGES.PREVIEW_READY(session.previewUrl),
          session.previewUrl,
          "View Preview",
        );

        await completeMessagingPendingMessage({
          kind: "preview",
          leaseToken: deliveryClaim.leaseToken,
          sessionId: session.sessionId,
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
        if (deliveryClaim?.status === "claimed") {
          await releasePendingMessageLease("preview", deliveryClaim);
        }
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
      .limit(1)
      .get();

    for (const doc of pendingSnapshot.docs) {
      let deliveryClaim: MessagingPendingMessageClaim | null = null;
      try {
        deliveryClaim = await claimMessagingPendingMessage({
          expectedState: "LIVE",
          kind: "confirmation",
          sessionId: doc.id,
        });
        if (!deliveryClaim) continue;
        if (deliveryClaim.status === "discarded") {
          logDiscardedPendingMessage("confirmation", doc.id, deliveryClaim);
          continue;
        }
        const session = deliveryClaim.session;
        if (!session.publishedResult) {
          await releasePendingMessageLease("confirmation", deliveryClaim);
          continue;
        }

        const adapter = getProviderAdapter(session.provider);
        const { publicUrl, dashboardUrl } = session.publishedResult;

        await adapter.sendLinkMessage(
          session.providerUserId,
          MESSAGES.PUBLISHED(publicUrl, dashboardUrl),
          publicUrl,
          "View Menu",
        );

        await completeMessagingPendingMessage({
          kind: "confirmation",
          leaseToken: deliveryClaim.leaseToken,
          sessionId: session.sessionId,
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
        if (deliveryClaim?.status === "claimed") {
          await releasePendingMessageLease("confirmation", deliveryClaim);
        }
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
      .limit(1)
      .get();

    for (const doc of pendingSnapshot.docs) {
      let deliveryClaim: MessagingPendingMessageClaim | null = null;
      try {
        deliveryClaim = await claimMessagingPendingMessage({
          expectedState: "COLLECTING_INPUT",
          kind: "fix",
          sessionId: doc.id,
        });
        if (!deliveryClaim) continue;
        if (deliveryClaim.status === "discarded") {
          logDiscardedPendingMessage("fix", doc.id, deliveryClaim);
          continue;
        }
        const session = deliveryClaim.session;
        const adapter = getProviderAdapter(session.provider);

        await adapter.sendTextMessage(
          session.providerUserId,
          MESSAGES.FIX_REQUEST_ACKNOWLEDGED,
        );

        await completeMessagingPendingMessage({
          kind: "fix",
          leaseToken: deliveryClaim.leaseToken,
          sessionId: session.sessionId,
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
        if (deliveryClaim?.status === "claimed") {
          await releasePendingMessageLease("fix", deliveryClaim);
        }
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
  sessionId: string,
): Promise<boolean> {
  const claim = await claimMessagingIntakeSession(sessionId);
  if (claim.status === "invalid") {
    throw new Error("MESSAGING_INTAKE_SESSION_QUARANTINED");
  }
  if (claim.status === "skipped" || !claim.session) return false;

  const session = claim.session;
  const userMasked = maskUserId(session.providerUserId);

  if (claim.status === "expired") {
    logOnboardingEvent({
      sessionId: session.sessionId,
      provider: session.provider,
      eventType: "SESSION_EXPIRED",
      sessionState: "EXPIRED",
      userIdMasked: userMasked,
      sessionCreatedAt: session.createdAt,
    });
    return true;
  }

  if (claim.status === "session_cap" || claim.status === "weekly_cap") {
    const adapter = getProviderAdapter(session.provider);
    try {
      await adapter.sendTextMessage(session.providerUserId, MESSAGES.EXTRACTION_CAP_REACHED);
    } catch (err) {
      logProviderMessageSendFailed(
        session,
        claim.status,
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
      metadata: {
        reason: claim.status,
        runs: session.processingRuns,
      },
      sessionCreatedAt: session.createdAt,
    });
    return true;
  }

  logOnboardingEvent({
    sessionId: session.sessionId,
    provider: session.provider,
    eventType: "INTAKE_WINDOW_CLOSED",
    sessionState: session.state,
    userIdMasked: userMasked,
    metadata: { uploadCount: session.uploads.length },
    sessionCreatedAt: session.createdAt,
  });

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
    validationResult = await validateAssets(session.sessionId, session.uploads);
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

    // The AI gateway owns bounded transport retries. validateAssets retries only
    // malformed semantic output against the same prepared model inputs.
    const failureStatus = await failMessagingAssetValidation({
      expectedUploads: session.uploads,
      sessionId: session.sessionId,
    });
    if (failureStatus === "expired") {
      logLifecycleSessionExpired(session, "VALIDATING_ASSETS");
      return true;
    }
    if (failureStatus !== "failed") {
      logger.warn("[IntakeProcessor] Asset validation failure reopened intake", {
        failureCode: INTAKE_ASSET_VALIDATION_RETRY_FAILED_CODE,
        reason: "asset_validation_retry_failed",
        failureStatus,
        ...getIntakeProcessorIdLogContext("sessionId", session.sessionId),
      });
      return true;
    }

    const adapter = getProviderAdapter(session.provider);
    try {
      await adapter.sendTextMessage(
        session.providerUserId,
        MESSAGES.ASK_CLEARER_PHOTOS,
      );
    } catch (sendErr) {
      logProviderMessageSendFailed(
        session,
        "asset_validation_failed",
        "FAILED",
        sendErr,
      );
    }
    return true;
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
    .filter((id): id is string => typeof id === "string");

  const invalidUploadIds = validationResult.invalid_files
    .map((idx) => session.uploads[idx - 1]?.id)
    .filter((id): id is string => typeof id === "string");

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

  const validationCommit = await commitMessagingAssetValidation({
    data: {
      detectedBusinessCategory,
      detectedBusinessType,
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
      invalidFiles: invalidUploadIds,
      menuCompleteness: validationResult.menu_completeness,
      typeConfidence: typeConfidence || "low",
      typeSource,
      validationConfidence: validationResult.confidence,
      validMenuFiles: validUploadIds,
    },
    expectedUploads: session.uploads,
    sessionId: session.sessionId,
  });
  if (validationCommit === "expired") {
    logLifecycleSessionExpired(session, "VALIDATING_ASSETS");
    return true;
  }
  if (validationCommit !== "committed") return true;

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
      return true;
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
    return true;
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
  return true;
}

/**
 * Create extraction job and transition to PROCESSING_MENU
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §8.1, §19.3
 */
async function triggerExtraction(
  session: MessagingLifecycleSession,
  validUploadIds: string[],
  detected: { businessType: string; businessCategory: string },
): Promise<void> {
  const userMasked = maskUserId(session.providerUserId);
  const businessType = detected.businessType || session.detectedBusinessType || FALLBACK_BUSINESS_TYPE;
  const businessCategory = resolveStoreBusinessCategory(
    businessType,
    detected.businessCategory || session.detectedBusinessCategory || undefined,
  );
  const enqueueResult = await enqueueMessagingExtractionJob({
    businessCategory,
    businessType,
    sessionId: session.sessionId,
    validUploadIds,
  });

  if (enqueueResult.status === "expired") {
    logLifecycleSessionExpired(session, "VALIDATING_ASSETS");
    return;
  }

  if (enqueueResult.status === "session_cap" || enqueueResult.status === "weekly_cap") {
    const capAdapter = getProviderAdapter(session.provider);
    try {
      await capAdapter.sendTextMessage(session.providerUserId, MESSAGES.EXTRACTION_CAP_REACHED);
    } catch (err) {
      logProviderMessageSendFailed(
        session,
        enqueueResult.status,
        "AWAITING_MORE_UPLOADS",
        err,
      );
    }
    return;
  }

  if (enqueueResult.status !== "created") {
    logger.warn("[IntakeProcessor] Extraction enqueue skipped after validation", {
      ...getIntakeProcessorIdLogContext("sessionId", session.sessionId),
      sessionState: session.state,
    });
    return;
  }

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
    sessionState: "PROCESSING_MENU",
    userIdMasked: userMasked,
    metadata: {
      validFileCount: validUploadIds.length,
      processingRun: enqueueResult.processingRun,
    },
    sessionCreatedAt: session.createdAt,
  });
}
