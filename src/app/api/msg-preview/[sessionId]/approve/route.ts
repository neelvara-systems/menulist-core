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
import { FALLBACK_BUSINESS_TYPE } from "@data/shared/businessTypes";
import { getSuggestionValue } from "@data/shared/extractedBusinessProfile";
import { admin } from "@lib/firebase/firebaseAdmin";
import { sanitizeMessagingOnboardingEventMetadata } from "@lib/messaging-onboarding/eventMetadata";
import { executeMessagingOnboardingPublish } from "@lib/messaging-onboarding/publish";
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
const PUBLISH_FAILED_REASON = "Publish failed after retry";
type PreviewApproveTransactionErrorCode =
  | "SESSION_NOT_FOUND"
  | "INVALID_TOKEN"
  | "PUBLISH_IN_PROGRESS"
  | "SESSION_NOT_READY"
  | "SESSION_EXPIRED";

const PREVIEW_APPROVE_TRANSACTION_ERROR_CODES = new Set<PreviewApproveTransactionErrorCode>([
  "SESSION_NOT_FOUND",
  "INVALID_TOKEN",
  "PUBLISH_IN_PROGRESS",
  "SESSION_NOT_READY",
  "SESSION_EXPIRED",
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
  token: z.string().min(20).max(256),
  businessName: z.string().min(1).max(100),
  businessType: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(200).optional(),
});

const getPreviewApproveLogContext = (
  sessionId: unknown,
  sessionData?: Record<string, any> | null,
) => ({
  route: "/api/msg-preview/[sessionId]/approve",
  ...getBoundedRuntimeStringContext("sessionId", sessionId),
  ...getBoundedRuntimeStringContext("provider", sessionData?.provider),
  hasPublishedResult: Boolean(sessionData?.publishedResult),
  hasExtractedMenuData: Boolean(sessionData?.extractedMenuData),
  correctionCount: Number.isFinite(Number(sessionData?.correctionCount))
    ? Number(sessionData?.correctionCount)
    : 0,
});

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

    // 🛡️ PUBLISH THROTTLE: Prevent rapid-fire publishes (IP-based)
    const { checkRateLimit } = await import('@lib/rateLimit');
    const { getRateLimitForFeature } = await import('@lib/rateLimit/configs');
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ipHash = hashPublicRateLimitValue(ip);
    const publishLimitConfig = getRateLimitForFeature('PUBLISH_OPERATION');
    const publishLimit = await checkRateLimit({ key: `publish:${ipHash}`, ...publishLimitConfig });
    if (!publishLimit.allowed) {
      return NextResponse.json(
        { error: "Too many publish attempts. Wait before trying again." },
        { status: 429 }
      );
    }

    const { sessionId } = params;

    if (!sessionId || sessionId.length < 10) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
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
    let sessionData: any;
    try {
      sessionData = await db.runTransaction(async (tx) => {
        const sessionDoc = await tx.get(sessionRef);
        if (!sessionDoc.exists) {
          throw new PreviewApproveTransactionError("SESSION_NOT_FOUND");
        }

        const data = sessionDoc.data()!;

        // Validate token
        if (data.previewToken !== token) {
          throw new PreviewApproveTransactionError("INVALID_TOKEN");
        }

        if (data.state === "LIVE" && data.publishedResult) {
          return {
            ...data,
            _alreadyLive: true,
          };
        }

        if (data.state === "PUBLISHING") {
          throw new PreviewApproveTransactionError("PUBLISH_IN_PROGRESS");
        }

        // Check session is in correct state
        if (data.state !== "AWAITING_APPROVAL") {
          throw new PreviewApproveTransactionError("SESSION_NOT_READY");
        }

        // Check not expired
        if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
          throw new PreviewApproveTransactionError("SESSION_EXPIRED");
        }

        // Atomically transition to PUBLISHING
        tx.update(sessionRef, {
          state: "PUBLISHING",
          stateHistory: FieldValue.arrayUnion({
            state: "PUBLISHING",
            timestamp: Timestamp.now(),
            reason: "Owner approved publish",
          }),
          updatedAt: Timestamp.now(),
        });

        return data;
      });
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
          default:
            break;
        }
      }
      throw txError;
    }

    if (sessionData._alreadyLive && sessionData.publishedResult) {
      return NextResponse.json({
        success: true,
        publishedResult: sessionData.publishedResult,
      });
    }

    // Log preview approved event
    db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
      .add({
        eventId: crypto.randomUUID(),
        sessionId,
        provider: sessionData.provider,
        eventType: "PREVIEW_APPROVED",
        sessionState: "PUBLISHING",
        userIdMasked: (sessionData.providerUserId || "").slice(-4),
        metadata: sanitizeMessagingOnboardingEventMetadata({ businessName, businessType }),
        timestamp: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
	        sessionAgeMs: sessionData.createdAt
	          ? Date.now() - sessionData.createdAt.toMillis()
	          : 0,
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
    const categoryCount = menuData?.categories?.length || 0;
    const itemCount = menuData?.items?.length || 0;
    const hasItemWithPrice = (menuData?.items || []).some(
      (item: any) => item.price !== undefined && item.price !== null && item.price !== "",
    );

    if (categoryCount < 1 || itemCount < 1 || !hasItemWithPrice) {
      // Revert to AWAITING_APPROVAL — don't lose data
      await sessionRef.update({
        state: "AWAITING_APPROVAL",
        stateHistory: FieldValue.arrayUnion({
          state: "AWAITING_APPROVAL",
          timestamp: Timestamp.now(),
          reason: "Publish validation failed: menu must have at least 1 category and 1 item with a price",
        }),
        updatedAt: Timestamp.now(),
      });
      return NextResponse.json(
        { error: "Menu must have at least 1 category and 1 item with a price." },
        { status: 422 },
      );
    }

    // Execute publish with retry (§8.2.7 — Publish Failure Recovery)
    const extractedProfile = sessionData.extractedBusinessProfile || sessionData.extractedMenuData?.extractedBusinessProfile || null;
    const resolvedBusinessType = businessType ||
      sessionData.detectedBusinessType ||
      getSuggestionValue(extractedProfile?.identity?.businessType, "medium") ||
      FALLBACK_BUSINESS_TYPE;
    const resolvedPhone = phone || sessionData.providerDisplayId;
    const resolvedAddress = address ||
      sessionData.extractedBusinessInfo?.address ||
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
      // Retry once
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
        // Recovery: return to AWAITING_APPROVAL (not FAILED)
        await sessionRef.update({
          state: "AWAITING_APPROVAL",
          stateHistory: FieldValue.arrayUnion({
            state: "AWAITING_APPROVAL",
            timestamp: Timestamp.now(),
            reason: PUBLISH_FAILED_REASON,
          }),
          updatedAt: Timestamp.now(),
        });

        logRuntimeFailure(
          "messaging_preview_publish_retry_failed",
          retryError,
          getPreviewApproveLogContext(sessionId, sessionData),
        );

        // Log failure
        db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
          .add({
            eventId: crypto.randomUUID(),
            sessionId,
            provider: sessionData.provider,
            eventType: "PUBLISH_FAILED",
            sessionState: "AWAITING_APPROVAL",
            userIdMasked: (sessionData.providerUserId || "").slice(-4),
            metadata: {},
            timestamp: Timestamp.now(),
            expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
            sessionAgeMs: 0,
	            error: {
	              code: PUBLISH_FAILED_CODE,
	              retryable: true,
	            },
	          })
	          .catch((eventError) => {
	            logRuntimeFailure("messaging_preview_event_write_failed", eventError, {
	              ...getPreviewApproveLogContext(sessionId, sessionData),
	              eventType: "PUBLISH_FAILED",
	              hasErrorCode: true,
	              metadataKeyCount: 0,
	              sessionState: "AWAITING_APPROVAL",
	            });
	          });

	        return NextResponse.json(
          { error: "Publishing failed. Try again." },
          { status: 500 },
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
