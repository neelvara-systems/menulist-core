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
import { secureError } from "@lib/security/secureLogger";
import crypto from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const db = admin.firestore();

// Must match RATE_LIMITS.MAX_CORRECTIONS_PER_SESSION in functions/src/messagingOnboarding/constants.ts
const MAX_CORRECTIONS_PER_SESSION = 3;

const FixRequestSchema = z.object({
  token: z.string().min(20),
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
    .min(1),
  note: z.string().max(200).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    const { sessionId } = params;

    if (!sessionId || sessionId.length < 10) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    const body = await request.json();
    const validation = FixRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
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
          error: "Maximum corrections reached. Please send new menu photos.",
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
        metadata: {
          issues,
          correctionNumber: currentCorrections + 1,
          hasNote: !!note,
        },
        timestamp: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
        sessionAgeMs: session.createdAt
          ? Date.now() - session.createdAt.toMillis()
          : 0,
      })
      .catch(() => { });

    return NextResponse.json({
      success: true,
      correctionNumber: currentCorrections + 1,
      maxCorrections: MAX_CORRECTIONS_PER_SESSION,
      message:
        "Fix request submitted. Please send clearer photos of the affected pages.",
    });
  } catch (error) {
    secureError("[msg-preview/fix] Error", error as Error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 },
    );
  }
}
