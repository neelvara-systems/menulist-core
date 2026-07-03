export const dynamic = 'force-dynamic';
/**
 * Fix Request API Route — Submit correction request from preview page
 *
 * Token-based access (no NextAuth — ADR-13/INV-2).
 * Max 3 corrections per session.
 *
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §4.2
 */

import { DB_COLLECTIONS } from "@constant/database";
import { admin } from "@lib/firebase/firebaseAdmin";
import { sanitizeMessagingOnboardingEventMetadata } from "@lib/messaging-onboarding/eventMetadata";
import { checkRateLimit } from "@lib/rateLimit";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { readBoundedJsonBody, rejectInvalidOrOversizedDeclaredBody } from "@lib/security/boundedRequestBody";
import { getSafeZodValidationDetails } from "@lib/security/inputValidation";
import crypto from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { z } from "zod";

const db = admin.firestore();

// Must match RATE_LIMITS.MAX_CORRECTIONS_PER_SESSION in functions/src/messagingOnboarding/constants.ts
const MAX_CORRECTIONS_PER_SESSION = 3;
const MSG_PREVIEW_ACTION_MAX_BODY_BYTES = 4 * 1024;

const FixRequestSchema = z.object({
  token: z.string().min(20).max(256),
  issues: z
    .array(
      z.enum([
        "price_incorrect",
        "item_missing",
        "spelling_error",
        "wrong_category",
        "other",
      ]),
    )
    .min(1)
    .max(5),
  note: z.string().max(200).optional(),
});

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
}

const getPreviewFixLogContext = (
  sessionId: unknown,
  session?: Record<string, any> | null,
) => ({
  route: "/api/msg-preview/[sessionId]/fix",
  ...getBoundedRuntimeStringContext("sessionId", sessionId),
  ...getBoundedRuntimeStringContext("provider", session?.provider),
  sessionState: typeof session?.state === "string" ? session.state.slice(0, 64) : undefined,
  correctionCount: Number.isFinite(Number(session?.correctionCount))
    ? Number(session?.correctionCount)
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

    const { sessionId } = params;

    if (!sessionId || sessionId.length < 10) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const ipHash = hashPublicRateLimitValue(ip);
    const sessionHash = hashPublicRateLimitValue(sessionId);
    const rateLimit = await checkRateLimit({
      key: `msg-preview-fix:${sessionHash}:${ipHash}`,
      limit: 10,
      window: 3600,
    });
    if (!rateLimit.allowed) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Too many correction requests", retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    const bodyResult = await readBoundedJsonBody(request, MSG_PREVIEW_ACTION_MAX_BODY_BYTES);
    if (bodyResult.ok === false) return bodyResult.response;

    const validation = FixRequestSchema.safeParse(bodyResult.data);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: getSafeZodValidationDetails(validation.error) },
        { status: 400 },
      );
    }

    const { token, issues, note } = validation.data;
    const sessionRef = db
      .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS)
      .doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const session = sessionDoc.data()!;

    // Validate token
    if (session.previewToken !== token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    // Check session state
    if (
      session.state !== "AWAITING_APPROVAL" &&
      session.state !== "PREVIEW_READY"
    ) {
      return NextResponse.json(
        { error: "Fix requests not accepted in current state" },
        { status: 409 },
      );
    }

    // Check correction limit (max 3 per session)
    const currentCorrections = session.correctionCount || 0;
    if (currentCorrections >= MAX_CORRECTIONS_PER_SESSION) {
      return NextResponse.json(
        {
          error: "Maximum corrections reached. Send new menu photos.",
          maxReached: true,
        },
        { status: 429 },
      );
    }

    // Store fix request and transition to COLLECTING_INPUT
    // NOTE: Direct state write (not via transitionState() which lives in CF)
    // Safe because: AWAITING_APPROVAL/PREVIEW_READY → COLLECTING_INPUT is allowed per spec
    const fixRequest = {
      issues,
      note: note || null,
      requestedAt: Timestamp.now(),
    };

    await sessionRef.update({
      fixRequests: FieldValue.arrayUnion(fixRequest),
      correctionCount: currentCorrections + 1,
      state: "COLLECTING_INPUT",
      stateHistory: FieldValue.arrayUnion({
        state: "COLLECTING_INPUT",
        timestamp: Timestamp.now(),
        reason: `Fix requested: ${issues.join(", ")}`,
      }),
      // Reset extraction state for re-processing
      extractionJobId: null,
      extractedMenuData: null,
      qualityScore: null,
      previewToken: null,
      previewUrl: null,
      // Reset intake timer
      lastUploadAt: Timestamp.now(),
      intakeExpiresAt: Timestamp.fromMillis(
        Date.now() + 10 * 60 * 1000, // 10 min intake window
      ),
      fixMessagePending: true, // Signal intakeProcessor to send WhatsApp message (spec §Story 5)
      updatedAt: Timestamp.now(),
    });

    // Log fix request event (fire-and-forget)
    db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
      .add({
        eventId: crypto.randomUUID(),
        sessionId,
        provider: session.provider,
        eventType: "PREVIEW_FIX_REQUESTED",
        sessionState: "COLLECTING_INPUT",
        userIdMasked: (session.providerUserId || "").slice(-4),
        metadata: sanitizeMessagingOnboardingEventMetadata({
          issueCount: issues.length,
          correctionNumber: currentCorrections + 1,
          hasNote: !!note,
        }),
        timestamp: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
	        sessionAgeMs: session.createdAt
	          ? Date.now() - session.createdAt.toMillis()
	          : 0,
	      })
	      .catch((error) => {
	        logRuntimeFailure("messaging_preview_event_write_failed", error, {
	          ...getPreviewFixLogContext(sessionId, session),
	          eventType: "PREVIEW_FIX_REQUESTED",
	          metadataKeyCount: 3,
	          sessionState: "COLLECTING_INPUT",
	        });
	      });

	    return NextResponse.json({
      success: true,
      correctionNumber: currentCorrections + 1,
      maxCorrections: MAX_CORRECTIONS_PER_SESSION,
      message:
        "Correction request sent. Send clearer photos of the affected pages.",
    });
  } catch (error) {
    logRuntimeFailure(
      "messaging_preview_fix_route_failed",
      error,
      getPreviewFixLogContext(params?.sessionId),
    );
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 },
    );
  }
}
