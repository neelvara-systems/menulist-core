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
import { executeMessagingOnboardingPublish } from "@lib/messaging-onboarding/publish";
import { secureError } from "@lib/security/secureLogger";
import crypto from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const db = admin.firestore();

const ApproveSchema = z.object({
  token: z.string().min(20),
  businessName: z.string().min(1).max(100),
  businessType: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(200).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    // 🛡️ PUBLISH THROTTLE: Prevent rapid-fire publishes (IP-based)
    const { checkRateLimit } = await import('@lib/rateLimit');
    const { getRateLimitForFeature } = await import('@lib/rateLimit/configs');
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const publishLimitConfig = getRateLimitForFeature('PUBLISH_OPERATION');
    const publishLimit = await checkRateLimit({ key: `publish:${ip}`, ...publishLimitConfig });
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

    const body = await request.json();
    const validation = ApproveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
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
          throw new Error("Session not found");
        }

        const data = sessionDoc.data()!;

        // Validate token
        if (data.previewToken !== token) {
          throw new Error("Invalid token");
        }

        if (data.state === "LIVE" && data.publishedResult) {
          return {
            ...data,
            _alreadyLive: true,
          };
        }

        if (data.state === "PUBLISHING") {
          throw new Error("Publish already in progress");
        }

        // Check session is in correct state
        if (data.state !== "AWAITING_APPROVAL") {
          throw new Error(
            `Cannot publish: session state is ${data.state}, not AWAITING_APPROVAL`,
          );
        }

        // Check not expired
        if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
          throw new Error("Session expired");
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
      const msg = (txError as Error).message;
      if (msg.includes("Invalid token")) {
        return NextResponse.json({ error: "Invalid token" }, { status: 403 });
      }
      if (msg.includes("Session not found")) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (msg.includes("Cannot publish")) {
        return NextResponse.json({ error: msg }, { status: 409 });
      }
      if (msg.includes("already in progress")) {
        return NextResponse.json({ error: "Publishing is already in progress." }, { status: 409 });
      }
      if (msg.includes("expired")) {
        return NextResponse.json({ error: "Session expired" }, { status: 410 });
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
        metadata: { businessName, businessType },
        timestamp: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
        sessionAgeMs: sessionData.createdAt
          ? Date.now() - sessionData.createdAt.toMillis()
          : 0,
      })
      .catch(() => { });

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
            reason: `Publish failed after retry: ${(retryError as Error).message}`,
          }),
          updatedAt: Timestamp.now(),
        });

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
              code: "PUBLISH_FAILED",
              message: (retryError as Error).message,
              retryable: true,
            },
          })
          .catch(() => { });

        return NextResponse.json(
          { error: "Publishing failed. Try again." },
          { status: 500 },
        );
      }
    }
  } catch (error) {
    secureError("[msg-preview/approve] Error", error as Error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 },
    );
  }
}
