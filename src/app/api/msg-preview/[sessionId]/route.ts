export const dynamic = 'force-dynamic';
/**
 * Preview API Route — GET session data for preview rendering
 *
 * No auth required (token-based access — ADR-13/INV-2).
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §4.2
 */

import { DB_COLLECTIONS } from "@constant/database";
import {
  FALLBACK_BUSINESS_TYPE,
  getBusinessTypeConfig,
  resolveStoreBusinessCategory,
} from "@data/shared/businessTypes";
import { getSuggestionValue } from "@data/shared/extractedBusinessProfile";
import { admin } from "@lib/firebase/firebaseAdmin";
import { normalizeMessagingPreviewSessionId } from "@lib/messaging-onboarding/previewRouteBoundary";
import {
  isMessagingPreviewViewableState,
  normalizeMessagingPreviewMenuData,
  normalizeMessagingPreviewPublishedResult,
} from "@lib/messaging-onboarding/previewResponseBoundary";
import {
  normalizeMessagingPreviewReadSession,
  type MessagingPreviewReadSession,
} from "@lib/messaging-onboarding/previewReadSessionBoundary";
import { checkRateLimit } from "@lib/rateLimit";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { z } from "zod";

const db = admin.firestore();

const PreviewQuerySchema = z.object({
  token: z.string().trim().regex(/^[A-Za-z0-9_-]{20,256}$/),
}).strict();

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
}

const getPreviewGetLogContext = (
  sessionId: unknown,
  session?: MessagingPreviewReadSession | null,
) => ({
  route: "/api/msg-preview/[sessionId]",
  ...getBoundedRuntimeStringContext("sessionId", sessionId),
  ...getBoundedRuntimeStringContext("provider", session?.provider),
  sessionState: session?.state,
  hasPreviewToken: Boolean(session?.previewToken),
  hasExtractedMenuData: Boolean(session?.menuData),
});

function tokensMatch(expected: string, provided: string): boolean {
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length
    && crypto.timingSafeEqual(expectedBytes, providedBytes);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  const rawSessionId = params?.sessionId;
  let failureContext = getPreviewGetLogContext(rawSessionId);

  try {
    const sessionId = normalizeMessagingPreviewSessionId(rawSessionId);
    if (!sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }
    failureContext = getPreviewGetLogContext(sessionId);

    const ip = getClientIp(request);
    const ipHash = hashPublicRateLimitValue(ip);
    const sessionHash = hashPublicRateLimitValue(sessionId);
    failureContext = {
      ...failureContext,
      ...getBoundedRuntimeStringContext("requestIp", ip),
    };
    const rateLimit = await checkRateLimit({
      key: `msg-preview-read:${sessionHash}:${ipHash}`,
      limit: 60,
      window: 600,
    });
    if (!rateLimit.allowed) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Too many preview requests", retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    // Validate token from query params
    const token = request.nextUrl.searchParams.get("token");
    const validation = PreviewQuerySchema.safeParse({ token });

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Read session
    const sessionRef = db
      .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS)
      .doc(sessionId);
    const viewedAt = admin.firestore.Timestamp.now();
    const lookup = await db.runTransaction(async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      if (!sessionDoc.exists) return { status: "not_found" as const };
      const rawSession: unknown = sessionDoc.data();
      const rawState = rawSession && typeof rawSession === "object" && !Array.isArray(rawSession)
        ? Reflect.get(rawSession, "state")
        : undefined;
      if (
        rawState !== undefined
        && !isMessagingPreviewViewableState(rawState)
      ) {
        return { status: "not_viewable" as const };
      }
      const session = normalizeMessagingPreviewReadSession(rawSession, sessionId);
      if (!session) return { status: "invalid" as const };
      if (!tokensMatch(session.previewToken, validation.data.token)) {
        return { status: "invalid_token" as const };
      }
      if (session.expiresAtMillis <= viewedAt.toMillis()) {
        return { status: "expired" as const };
      }
      const firstView = session.previewViewedAtMillis === null;
      if (firstView) {
        transaction.update(sessionRef, { previewViewedAt: viewedAt, updatedAt: viewedAt });
      }
      return { firstView, session, status: "ready" as const };
    });

    if (lookup.status === "not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (lookup.status === "not_viewable") {
      return NextResponse.json({ error: "Preview not available" }, { status: 404 });
    }
    if (lookup.status === "invalid_token") {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }
    if (lookup.status === "expired") {
      return NextResponse.json({ error: "Preview expired" }, { status: 410 });
    }
    if (lookup.status === "invalid") {
      logRuntimeFailure(
        "messaging_preview_persisted_output_invalid",
        new Error("MESSAGING_PREVIEW_PERSISTED_OUTPUT_INVALID"),
        failureContext,
      );
      return NextResponse.json({ error: "Preview unavailable" }, { status: 503 });
    }
    const session = lookup.session;
    failureContext = {
      ...failureContext,
      ...getPreviewGetLogContext(sessionId, session),
    };
    const menuData = normalizeMessagingPreviewMenuData(session.menuData);
    const publishedResult = session.publishedResult === null
      ? null
      : normalizeMessagingPreviewPublishedResult(session.publishedResult);
    if (!menuData || (session.publishedResult !== null && !publishedResult)) {
      logRuntimeFailure(
        "messaging_preview_persisted_output_invalid",
        new Error("MESSAGING_PREVIEW_PERSISTED_OUTPUT_INVALID"),
        failureContext,
      );
      return NextResponse.json({ error: "Preview unavailable" }, { status: 503 });
    }

    if (lookup.firstView) {
      const eventId = crypto.randomUUID();
      db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
        .doc(eventId)
        .set({
          eventId,
          sessionId,
          provider: session.provider,
          eventType: "PREVIEW_VIEWED",
          sessionState: session.state,
          userIdMasked: session.providerUserId.slice(-4),
          metadata: {},
          timestamp: viewedAt,
          expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
          sessionAgeMs: Math.max(0, viewedAt.toMillis() - session.createdAtMillis),
        })
        .catch((error) => {
          logRuntimeFailure("messaging_preview_event_write_failed", error, {
            ...getPreviewGetLogContext(sessionId, session),
            eventType: "PREVIEW_VIEWED",
            metadataKeyCount: 0,
          });
        });
    }

    const extractedProfile = session.extractedBusinessProfile;
    const businessTypeCandidate = session.detectedBusinessType ||
      getSuggestionValue(extractedProfile?.identity?.businessType, "medium") ||
      FALLBACK_BUSINESS_TYPE;
    const resolvedBusinessType = getBusinessTypeConfig(businessTypeCandidate)?.value
      || FALLBACK_BUSINESS_TYPE;
    const resolvedBusinessCategory = resolveStoreBusinessCategory(
      resolvedBusinessType,
      session.detectedBusinessCategory || getSuggestionValue(extractedProfile?.identity?.businessCategory, "medium"),
    );

    return NextResponse.json({
      sessionId,
      state: session.state,
      businessName:
        session.businessName ||
        getSuggestionValue(extractedProfile?.identity?.businessName, "medium") ||
        "Your Business",
      businessType: resolvedBusinessType,
      businessCategory: resolvedBusinessCategory,
      phone: session.providerDisplayId,
      address: session.businessAddress || getSuggestionValue(extractedProfile?.identity?.addressLine, "medium") || "",
      menuData,
      qualityScore: session.qualityScore,
      publishedResult,
      correctionCount: session.correctionCount,
      maxCorrections: 3,
    });
  } catch (error) {
    logRuntimeFailure("messaging_preview_get_route_failed", error, failureContext);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 },
    );
  }
}
