export const dynamic = 'force-dynamic';
/**
 * Approve API Route — Trigger publish pipeline
 *
 * Token-based access (no NextAuth — ADR-13/INV-2).
 * Double-publish protection via Firestore transaction (§8.2.7).
 * Publish failure recovery: PUBLISHING → AWAITING_APPROVAL on failure.
 *
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §4.2, §8.2.7
 */

import { DB_COLLECTIONS } from "@constant/database";
import { FALLBACK_BUSINESS_TYPE, getBusinessTypeConfig } from "@data/shared/businessTypes";
import { getSuggestionValue } from "@data/shared/extractedBusinessProfile";
import { admin, storageAdmin } from "@lib/firebase/firebaseAdmin";
import { sanitizeMessagingOnboardingEventMetadata } from "@lib/messaging-onboarding/eventMetadata";
import { isMessagingOwnerClaimConflictError } from "@lib/messaging-onboarding/messagingOwnerClaim";
import { normalizeMessagingPreviewSessionId } from "@lib/messaging-onboarding/previewRouteBoundary";
import { executeMessagingOnboardingPublish } from "@lib/messaging-onboarding/publish";
import {
  isMessagingPublishClaimStale,
  isMessagingPublishRetryableError,
} from "@lib/messaging-onboarding/publishRetryBoundary";
import {
  getMessagingCommittedPublishResult,
  normalizeMessagingPublishSession,
  type MessagingPublishSession,
} from "@lib/messaging-onboarding/publishSessionBoundary";
import { validateMessagingPublishMenu } from "@lib/messaging-onboarding/publishValidationBoundary";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { readBoundedJsonBody, rejectInvalidOrOversizedDeclaredBody } from "@lib/security/boundedRequestBody";
import { getSafeZodValidationDetails } from "@lib/security/inputValidation";
import crypto from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { z } from "zod";

const db = admin.firestore();
const MSG_PREVIEW_ACTION_MAX_BODY_BYTES = 4 * 1024;
const PUBLISH_FAILED_CODE = "PUBLISH_FAILED";
const PUBLISH_FAILED_REASON = "Publish failed";
const PUBLISH_FAILED_AFTER_RETRY_REASON = "Publish failed after retry";
type PreviewApproveTransactionErrorCode =
  | "SESSION_NOT_FOUND"
  | "INVALID_TOKEN"
  | "PUBLISH_IN_PROGRESS"
  | "SESSION_NOT_READY"
  | "SESSION_EXPIRED"
  | "SESSION_INVALID";

const PREVIEW_APPROVE_TRANSACTION_ERROR_CODES = new Set<PreviewApproveTransactionErrorCode>([
  "SESSION_NOT_FOUND",
  "INVALID_TOKEN",
  "PUBLISH_IN_PROGRESS",
  "SESSION_NOT_READY",
  "SESSION_EXPIRED",
  "SESSION_INVALID",
]);

class PreviewApproveTransactionError extends Error {
  readonly code: PreviewApproveTransactionErrorCode;

  constructor(code: PreviewApproveTransactionErrorCode) {
    super(code);
    this.name = "PreviewApproveTransactionError";
    this.code = code;
  }
}

const isPreviewApproveTransactionErrorCode = (
  code: unknown,
): code is PreviewApproveTransactionErrorCode => (
  typeof code === "string"
  && PREVIEW_APPROVE_TRANSACTION_ERROR_CODES.has(code as PreviewApproveTransactionErrorCode)
);

const isPreviewApproveTransactionError = (
  error: unknown,
): error is PreviewApproveTransactionError => (
  error instanceof PreviewApproveTransactionError
  || (
    typeof error === "object"
    && error !== null
    && isPreviewApproveTransactionErrorCode((error as { code?: unknown }).code)
  )
);

const ApproveSchema = z.object({
  token: z.string().trim().regex(/^[A-Za-z0-9_-]{20,256}$/),
  businessName: z.string().trim().min(1).max(100),
  businessType: z.string().trim().max(50)
    .refine((value) => !value || Boolean(getBusinessTypeConfig(value)), "Invalid business type")
    .optional(),
  phone: z.string().trim().max(20)
    .refine((value) => value === "" || /^\+?[1-9]\d{6,14}$/.test(value), "Invalid phone")
    .optional(),
  address: z.string().trim().max(200).optional(),
}).strict();

const getPreviewApproveLogContext = (
  sessionId: unknown,
  sessionData?: MessagingPublishSession | null,
) => ({
  route: "/api/msg-preview/[sessionId]/approve",
  ...getBoundedRuntimeStringContext("sessionId", sessionId),
  ...getBoundedRuntimeStringContext("provider", sessionData?.provider),
  hasPublishedResult: Boolean(sessionData?.publishedResult),
  hasExtractedMenuData: Boolean(sessionData?.extractedMenuData),
  correctionCount: sessionData?.correctionCount || 0,
});

function tokensMatch(expected: string, provided: string): boolean {
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length
    && crypto.timingSafeEqual(expectedBytes, providedBytes);
}

async function recoverPublishingSession(
  sessionRef: FirebaseFirestore.DocumentReference,
  reason: string,
): Promise<boolean> {
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(sessionRef);
    if (!snapshot.exists || snapshot.get("state") !== "PUBLISHING") return false;
    const now = Timestamp.now();
    transaction.update(sessionRef, {
      state: "AWAITING_APPROVAL",
      stateHistory: FieldValue.arrayUnion({
        reason,
        state: "AWAITING_APPROVAL",
        timestamp: now,
      }),
      updatedAt: now,
    });
    return true;
  });
}

async function recordPublishingFailure(params: {
  error: unknown;
  reason: string;
  retryable: boolean;
  sessionData: MessagingPublishSession;
  sessionId: string;
  sessionRef: FirebaseFirestore.DocumentReference;
}): Promise<void> {
  const recovered = await recoverPublishingSession(params.sessionRef, params.reason);
  logRuntimeFailure(
    params.retryable
      ? "messaging_preview_publish_retry_failed"
      : "messaging_preview_publish_permanent_failure",
    params.error,
    {
      ...getPreviewApproveLogContext(params.sessionId, params.sessionData),
      recovered,
      retryable: params.retryable,
    },
  );

  const now = Timestamp.now();
  const eventId = crypto.randomUUID();
  db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
    .doc(eventId)
    .set({
      eventId,
      sessionId: params.sessionId,
      provider: params.sessionData.provider,
      eventType: "PUBLISH_FAILED",
      sessionState: recovered ? "AWAITING_APPROVAL" : "PUBLISHING",
      userIdMasked: (params.sessionData.providerUserId || "").slice(-4),
      metadata: {},
      timestamp: now,
      expiresAt: Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000),
      sessionAgeMs: Math.max(0, now.toMillis() - params.sessionData.createdAtMillis),
      error: {
        code: PUBLISH_FAILED_CODE,
        retryable: params.retryable,
      },
    })
    .catch((eventError) => {
      logRuntimeFailure("messaging_preview_event_write_failed", eventError, {
        ...getPreviewApproveLogContext(params.sessionId, params.sessionData),
        eventType: "PUBLISH_FAILED",
        hasErrorCode: true,
        metadataKeyCount: 0,
        sessionState: recovered ? "AWAITING_APPROVAL" : "PUBLISHING",
      });
    });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    const declaredBodyResponse = rejectInvalidOrOversizedDeclaredBody(
      request,
      MSG_PREVIEW_ACTION_MAX_BODY_BYTES,
    );
    if (declaredBodyResponse) return declaredBodyResponse;

    const sessionId = normalizeMessagingPreviewSessionId(params?.sessionId);
    if (!sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    // 🛡️ PUBLISH THROTTLE: Prevent rapid-fire publishes (IP-based)
    const { checkRateLimit } = await import('@lib/rateLimit');
    const { getRateLimitForFeature } = await import('@lib/rateLimit/configs');
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ipHash = hashPublicRateLimitValue(ip);
    const sessionHash = hashPublicRateLimitValue(sessionId);
    const publishLimitConfig = getRateLimitForFeature('PUBLISH_OPERATION');
    const publishLimit = await checkRateLimit({
      key: `msg-preview-publish:${sessionHash}:${ipHash}`,
      ...publishLimitConfig,
    });
    if (!publishLimit.allowed) {
      return NextResponse.json(
        { error: "Too many publish attempts. Wait before trying again." },
        { status: 429 }
      );
    }

    const bodyResult = await readBoundedJsonBody(request, MSG_PREVIEW_ACTION_MAX_BODY_BYTES);
    if (bodyResult.ok === false) return bodyResult.response;

    const validation = ApproveSchema.safeParse(bodyResult.data);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: getSafeZodValidationDetails(validation.error) },
        { status: 400 },
      );
    }

    const { token, businessName, businessType, phone, address } = validation.data;
    const sessionRef = db
      .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS)
      .doc(sessionId);

    // Double-publish protection: atomic state check + transition (§8.2.7)
    let sessionData: MessagingPublishSession;
    let alreadyLive = false;
    let stalePublishRecovered = false;
    const expectedBucket = storageAdmin.bucket().name;
    try {
      const claim = await db.runTransaction(async (tx) => {
        const sessionDoc = await tx.get(sessionRef);
        if (!sessionDoc.exists) {
          throw new PreviewApproveTransactionError("SESSION_NOT_FOUND");
        }

        const data = normalizeMessagingPublishSession(sessionDoc.data(), sessionId, expectedBucket);
        if (!data) throw new PreviewApproveTransactionError("SESSION_INVALID");

        // Validate token
        if (!tokensMatch(data.previewToken, token)) {
          throw new PreviewApproveTransactionError("INVALID_TOKEN");
        }

        if (data.state === "LIVE" && data.publishedResult) {
          return { alreadyLive: true, session: data, stalePublishRecovered: false };
        }

        if (data.state === "PUBLISHING") {
          if (isMessagingPublishClaimStale(data.stateEnteredAtMillis, Date.now())) {
            const now = Timestamp.now();
            tx.update(sessionRef, {
              state: "AWAITING_APPROVAL",
              stateHistory: FieldValue.arrayUnion({
                reason: "Recovered interrupted publish attempt",
                state: "AWAITING_APPROVAL",
                timestamp: now,
              }),
              updatedAt: now,
            });
            return { alreadyLive: false, session: data, stalePublishRecovered: true };
          }
          throw new PreviewApproveTransactionError("PUBLISH_IN_PROGRESS");
        }

        // Check session is in correct state
        if (data.state !== "AWAITING_APPROVAL") {
          throw new PreviewApproveTransactionError("SESSION_NOT_READY");
        }

        // Check not expired
        if (data.expiresAtMillis <= Date.now()) {
          throw new PreviewApproveTransactionError("SESSION_EXPIRED");
        }

        // Atomically transition to PUBLISHING
        const now = Timestamp.now();
        tx.update(sessionRef, {
          state: "PUBLISHING",
          stateHistory: FieldValue.arrayUnion({
            state: "PUBLISHING",
            timestamp: now,
            reason: "Owner approved publish",
          }),
          updatedAt: now,
        });

        return { alreadyLive: false, session: data, stalePublishRecovered: false };
      });
      sessionData = claim.session;
      alreadyLive = claim.alreadyLive;
      stalePublishRecovered = claim.stalePublishRecovered === true;
    } catch (txError) {
      if (isPreviewApproveTransactionError(txError)) {
        switch (txError.code) {
          case "INVALID_TOKEN":
            return NextResponse.json({ error: "Invalid token" }, { status: 403 });
          case "SESSION_NOT_FOUND":
            return NextResponse.json({ error: "Not found" }, { status: 404 });
          case "SESSION_NOT_READY":
            return NextResponse.json({ error: "Session is not ready to publish." }, { status: 409 });
          case "PUBLISH_IN_PROGRESS":
            return NextResponse.json({ error: "Publishing is already in progress." }, { status: 409 });
          case "SESSION_EXPIRED":
            return NextResponse.json({ error: "Session expired" }, { status: 410 });
          case "SESSION_INVALID":
            return NextResponse.json({ error: "Session data is unavailable." }, { status: 409 });
          default:
            break;
        }
      }
      throw txError;
    }

    if (alreadyLive && sessionData.publishedResult) {
      return NextResponse.json({
        success: true,
        publishedResult: sessionData.publishedResult,
      });
    }

    if (stalePublishRecovered) {
      return NextResponse.json(
        { error: "The previous publish attempt was reset. Try publishing again." },
        { status: 409 },
      );
    }

    // Log preview approved event
    const approvalEventId = crypto.randomUUID();
    db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
      .doc(approvalEventId)
      .set({
        eventId: approvalEventId,
        sessionId,
        provider: sessionData.provider,
        eventType: "PREVIEW_APPROVED",
        sessionState: "PUBLISHING",
        userIdMasked: (sessionData.providerUserId || "").slice(-4),
        metadata: sanitizeMessagingOnboardingEventMetadata({ businessName, businessType }),
        timestamp: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
        sessionAgeMs: Math.max(0, Date.now() - sessionData.createdAtMillis),
      })
      .catch((error) => {
        logRuntimeFailure("messaging_preview_event_write_failed", error, {
          ...getPreviewApproveLogContext(sessionId, sessionData),
          eventType: "PREVIEW_APPROVED",
          metadataKeyCount: 2,
          sessionState: "PUBLISHING",
        });
      });

    // Publish validation gate (spec §Failure Handling — M-2)
    const menuData = sessionData.extractedMenuData;
    const menuValidation = validateMessagingPublishMenu(menuData);

    if (!menuValidation.valid) {
      // Revert to AWAITING_APPROVAL — don't lose data
      await recoverPublishingSession(
        sessionRef,
        "Publish validation failed: menu must have at least 1 category and 1 item with a price",
      );
      return NextResponse.json(
        { error: "Menu must have at least 1 category and 1 item with a price." },
        { status: 422 },
      );
    }

    // Execute publish with retry (§8.2.7 — Publish Failure Recovery)
    const extractedProfile = sessionData.extractedBusinessProfile;
    const resolvedBusinessType = businessType ||
      sessionData.detectedBusinessType ||
      getSuggestionValue(extractedProfile?.identity?.businessType, "medium") ||
      FALLBACK_BUSINESS_TYPE;
    const resolvedPhone = phone || sessionData.providerDisplayId;
    const resolvedAddress = address ||
      sessionData.extractedBusinessInfoAddress ||
      getSuggestionValue(extractedProfile?.identity?.addressLine, "medium") ||
      "";

    try {
      const result = await executeMessagingOnboardingPublish(sessionId, {
        businessName,
        businessType: resolvedBusinessType,
        phone: resolvedPhone,
        address: resolvedAddress,
        sessionData,
      });

      return NextResponse.json({
        success: true,
        publishedResult: result,
      });
    } catch (publishError) {
      if (isMessagingOwnerClaimConflictError(publishError)) {
        await recoverPublishingSession(sessionRef, "Owner account is already linked");
        return NextResponse.json(
          { error: "This phone number is already linked to an owner account." },
          { status: 409 },
        );
      }
      if (!isMessagingPublishRetryableError(publishError)) {
        await recordPublishingFailure({
          error: publishError,
          reason: PUBLISH_FAILED_REASON,
          retryable: false,
          sessionData,
          sessionId,
          sessionRef,
        });
        return NextResponse.json(
          { error: "Publishing failed. Try again." },
          { status: 500 },
        );
      }

      logRuntimeFailure(
        "messaging_preview_publish_transient_failure_retrying",
        publishError,
        getPreviewApproveLogContext(sessionId, sessionData),
      );

      // A transient Firestore response can be ambiguous after commit. Check the
      // canonical session before repeating preflight reads or attempting another
      // transaction, so a committed publish is replayed as success.
      try {
        const committedSnapshot = await sessionRef.get();
        const committedResult = committedSnapshot.exists
          ? getMessagingCommittedPublishResult(
            committedSnapshot.data(),
            sessionId,
            expectedBucket,
          )
          : null;
        if (committedResult) {
          return NextResponse.json({ success: true, publishedResult: committedResult });
        }
      } catch (replayCheckError) {
        logRuntimeFailure(
          "messaging_preview_publish_commit_replay_check_failed",
          replayCheckError,
          getPreviewApproveLogContext(sessionId, sessionData),
        );
      }

      // Retry once only for explicit transient Firebase/gRPC failures.
      try {
        const result = await executeMessagingOnboardingPublish(sessionId, {
          businessName,
          businessType: resolvedBusinessType,
          phone: resolvedPhone,
          address: resolvedAddress,
          sessionData,
        });

        return NextResponse.json({
          success: true,
          publishedResult: result,
        });
      } catch (retryError) {
        if (isMessagingOwnerClaimConflictError(retryError)) {
          await recoverPublishingSession(sessionRef, "Owner account is already linked");
          return NextResponse.json(
            { error: "This phone number is already linked to an owner account." },
            { status: 409 },
          );
        }
        const retryable = isMessagingPublishRetryableError(retryError);
        await recordPublishingFailure({
          error: retryError,
          reason: PUBLISH_FAILED_AFTER_RETRY_REASON,
          retryable,
          sessionData,
          sessionId,
          sessionRef,
        });

        return NextResponse.json(
          { error: "Publishing failed. Try again." },
          { status: retryable ? 503 : 500 },
        );
      }
    }
  } catch (error) {
    logRuntimeFailure(
      "messaging_preview_approve_route_failed",
      error,
      getPreviewApproveLogContext(params?.sessionId),
    );
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 },
    );
  }
}
