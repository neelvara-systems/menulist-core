export const dynamic = 'force-dynamic';
/**
 * Preview API Route — GET session data for preview rendering
 *
 * No auth required (token-based access — ADR-13/INV-2).
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §4.2
 */

import { DB_COLLECTIONS } from "@constant/database";
import { FALLBACK_BUSINESS_TYPE, resolveStoreBusinessCategory } from "@data/shared/businessTypes";
import { getSuggestionValue } from "@data/shared/extractedBusinessProfile";
import { admin } from "@lib/firebase/firebaseAdmin";
import { checkRateLimit } from "@lib/rateLimit";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { z } from "zod";

const db = admin.firestore();

const PreviewQuerySchema = z.object({
  token: z.string().min(20).max(256),
});

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
}

const getPreviewGetLogContext = (
  sessionId: unknown,
  session?: Record<string, any> | null,
) => ({
  route: "/api/msg-preview/[sessionId]",
  ...getBoundedRuntimeStringContext("sessionId", sessionId),
  ...getBoundedRuntimeStringContext("provider", session?.provider),
  sessionState: typeof session?.state === "string" ? session.state.slice(0, 64) : undefined,
  hasPreviewToken: Boolean(session?.previewToken),
  hasExtractedMenuData: Boolean(session?.extractedMenuData),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  const { sessionId } = params;
  let failureContext = getPreviewGetLogContext(sessionId);

  try {
    if (!sessionId || sessionId.length < 10) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

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
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const session = sessionDoc.data()!;
    failureContext = {
      ...failureContext,
      ...getPreviewGetLogContext(sessionId, session),
    };

    // Validate token matches
    if (session.previewToken !== validation.data.token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    // Check session not expired
    if (session.expiresAt && session.expiresAt.toMillis() < Date.now()) {
      return NextResponse.json(
        { error: "Preview expired" },
        { status: 410 },
      );
    }

    // Check session is in a viewable state
    const viewableStates = [
      "PREVIEW_READY",
      "AWAITING_APPROVAL",
      "PUBLISHING",
      "LIVE",
    ];
    if (!viewableStates.includes(session.state)) {
      return NextResponse.json(
        { error: "Preview not available" },
        { status: 404 },
      );
    }

    if (!session.previewViewedAt) {
      const viewedAt = admin.firestore.Timestamp.now();
      sessionRef
        .set({ previewViewedAt: viewedAt, updatedAt: viewedAt }, { merge: true })
        .then(() => db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
	          .add({
	            eventId: crypto.randomUUID(),
	            sessionId,
            provider: session.provider,
            eventType: "PREVIEW_VIEWED",
            sessionState: session.state,
            userIdMasked: (session.providerUserId || "").slice(-4),
            metadata: {},
            timestamp: viewedAt,
            expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
            sessionAgeMs: session.createdAt
	              ? Date.now() - session.createdAt.toMillis()
	              : 0,
	          }))
	        .catch((error) => {
	          logRuntimeFailure("messaging_preview_event_write_failed", error, {
	            ...getPreviewGetLogContext(sessionId, session),
	            eventType: "PREVIEW_VIEWED",
	            metadataKeyCount: 0,
	          });
	        });
	    }

    const extractedProfile = session.extractedBusinessProfile || session.extractedMenuData?.extractedBusinessProfile || null;
    const resolvedBusinessType = session.detectedBusinessType ||
      getSuggestionValue(extractedProfile?.identity?.businessType, "medium") ||
      FALLBACK_BUSINESS_TYPE;
    const resolvedBusinessCategory = resolveStoreBusinessCategory(
      resolvedBusinessType,
      session.detectedBusinessCategory || getSuggestionValue(extractedProfile?.identity?.businessCategory, "medium"),
    );

    // Return preview data (sanitized — no tokens or internal fields)
    return NextResponse.json({
      sessionId,
      state: session.state,
      businessName:
        session.extractedBusinessInfo?.businessName ||
        getSuggestionValue(extractedProfile?.identity?.businessName, "medium") ||
        "Your Business",
      businessType: resolvedBusinessType,
      businessCategory: resolvedBusinessCategory,
      phone: session.providerDisplayId || "",
      address: session.extractedBusinessInfo?.address || getSuggestionValue(extractedProfile?.identity?.addressLine, "medium") || "",
      menuData: session.extractedMenuData,
      qualityScore: session.qualityScore,
      publishedResult: session.publishedResult,
      correctionCount: session.correctionCount || 0,
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
