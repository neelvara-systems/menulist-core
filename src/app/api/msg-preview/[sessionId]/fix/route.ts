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
import {
  applyMessagingOnboardingFixRequest,
  MAX_MESSAGING_ONBOARDING_CORRECTIONS_PER_SESSION,
  MESSAGING_ONBOARDING_FIX_ISSUES,
  type MessagingFixSessionContext,
} from "@lib/messaging-onboarding/fixRequestTransaction";
import { normalizeMessagingPreviewSessionId } from "@lib/messaging-onboarding/previewRouteBoundary";
import { checkRateLimit } from "@lib/rateLimit";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { readBoundedJsonBody, rejectInvalidOrOversizedDeclaredBody } from "@lib/security/boundedRequestBody";
import { getSafeZodValidationDetails } from "@lib/security/inputValidation";
import crypto from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { z } from "zod";

const db = admin.firestore();

const MSG_PREVIEW_ACTION_MAX_BODY_BYTES = 4 * 1024;

const FixRequestSchema = z.object({
  token: z.string().trim().regex(/^[A-Za-z0-9_-]{20,256}$/),
  issues: z
    .array(z.enum(MESSAGING_ONBOARDING_FIX_ISSUES))
    .min(1)
    .max(5)
    .refine((issues) => new Set(issues).size === issues.length, "Duplicate issues are not allowed"),
  note: z.string().trim().max(200).optional(),
}).strict();

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
}

const getPreviewFixLogContext = (
  sessionId: unknown,
  session?: MessagingFixSessionContext | null,
) => ({
  route: "/api/msg-preview/[sessionId]/fix",
  ...getBoundedRuntimeStringContext("sessionId", sessionId),
  ...getBoundedRuntimeStringContext("provider", session?.provider),
  sessionState: typeof session?.state === "string" ? session.state.slice(0, 64) : undefined,
  correctionCount: session?.correctionCount || 0,
});

export async function POST(request: NextRequest, props: { params: Promise<{ sessionId: string }> }) {
  const params = await props.params;
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
    const now = Timestamp.now();
    const mutation = await applyMessagingOnboardingFixRequest({
      issues,
      note,
      now,
      sessionId,
      token,
    });

    if (mutation.status === "not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (mutation.status === "invalid_token") {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }
    if (mutation.status === "invalid_state") {
      return NextResponse.json(
        { error: "Fix requests not accepted in current state" },
        { status: 409 },
      );
    }
    if (mutation.status === "max_reached") {
      return NextResponse.json(
        {
          error: "Maximum corrections reached. Send new menu photos.",
          maxReached: true,
        },
        { status: 429 },
      );
    }
    if (mutation.status === "expired") {
      return NextResponse.json({ error: "Session expired" }, { status: 410 });
    }
    if (mutation.status === "invalid_session") {
      return NextResponse.json({ error: "Invalid session" }, { status: 409 });
    }
    if (mutation.status === "invalid_input") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    if (mutation.status !== "updated") {
      return NextResponse.json({ error: "Unable to apply fix request" }, { status: 409 });
    }

    const { correctionNumber, session } = mutation;

    // Log fix request event (fire-and-forget)
    const eventId = crypto.randomUUID();
    db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
      .doc(eventId)
      .set({
        eventId,
        sessionId,
        provider: session.provider,
        eventType: "PREVIEW_FIX_REQUESTED",
        sessionState: "COLLECTING_INPUT",
        userIdMasked: (session.providerUserId || "").slice(-4),
        metadata: sanitizeMessagingOnboardingEventMetadata({
          issueCount: issues.length,
          correctionNumber,
          hasNote: !!note,
        }),
        timestamp: now,
        expiresAt: Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000),
        sessionAgeMs: Math.max(0, now.toMillis() - session.createdAtMillis),
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
      correctionNumber,
      maxCorrections: MAX_MESSAGING_ONBOARDING_CORRECTIONS_PER_SESSION,
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
