export const dynamic = 'force-dynamic';
/**
 * Validate Claim Token API
 * 
 * Called when a messaging-onboarded owner opens the dashboard URL with ?claim= param.
 * Returns business info so the login page can show a personalized welcome.
 * No authentication required (token IS the authentication).
 *
 * @see __docs__/auth/README.md — Messaging Onboarding Login Flow
 */

import { DB_COLLECTIONS } from "@constant/database";
import { admin } from "@lib/firebase/firebaseAdmin";
import { getBoundedAuthStringContext, logAuthFailure } from "@lib/auth/authDiagnostics";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { NextRequest, NextResponse } from "next/server";

const db = admin.firestore();

const getRequestIp = (request: NextRequest) => (
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  || request.headers.get("x-real-ip")
  || "unknown"
);

const buildValidateClaimFailureLogContext = (request: NextRequest, token: string | null) => ({
  endpoint: "/api/auth/validate-claim",
  ...getBoundedAuthStringContext("claimToken", token),
  ...getBoundedAuthStringContext("requestIp", getRequestIp(request)),
  ...getBoundedAuthStringContext("userAgent", request.headers.get("user-agent")),
});

const timestampLikeToMillis = (value: unknown): number | null => {
  if (!value) return null;
  if (typeof (value as any).toMillis === "function") return (value as any).toMillis();
  if (typeof (value as any).toDate === "function") return (value as any).toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export async function GET(request: NextRequest) {
  try {
    // 🔒 RATE LIMITING: Prevent brute force token validation
    const { checkRateLimit } = await import('@lib/rateLimit');
    const { getRateLimitForFeature } = await import('@lib/rateLimit/configs');
    const ip = getRequestIp(request);
    const ipHash = hashPublicRateLimitValue(ip);
    const rl = await checkRateLimit({ key: `auth-validate:${ipHash}`, ...getRateLimitForFeature('AUTH_SENSITIVE') });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many attempts. Please wait." }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token || token.length < 20) {
      return NextResponse.json({ valid: false, error: "Invalid or expired claim link." }, { status: 400 });
    }

    // Find user by claimToken
    const userQuery = await db
      .collection(DB_COLLECTIONS.USERS)
      .where("claimToken", "==", token)
      .limit(1)
      .get();

    if (userQuery.empty) {
      return NextResponse.json({ valid: false, error: "Invalid or expired claim link." }, { status: 404 });
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

    const claimTokenExpiresAtMs = timestampLikeToMillis(userData.claimTokenExpiresAt);
    if (claimTokenExpiresAtMs && claimTokenExpiresAtMs <= Date.now()) {
      const now = admin.firestore.Timestamp.now();
      await userDoc.ref.update({
        claimToken: null,
        claimTokenExpiresAt: null,
        claimTokenExpiredAt: now,
        modifiedOn: now,
      });
      return NextResponse.json({ valid: false, error: "This claim link has expired." }, { status: 410 });
    }

    // Return minimal info for the login page welcome message
    return NextResponse.json({
      valid: true,
      status: "valid",
      preview: "claim-token",
      businessName: userData.name || "Your Business",
      phone: userData.phone ? `****${(userData.phone || "").slice(-4)}` : null, // Masked for privacy
    });
  } catch (error) {
    const { searchParams } = new URL(request.url);
    logAuthFailure(
      "validate_claim_unexpected_error",
      error,
      buildValidateClaimFailureLogContext(request, searchParams.get("token")),
    );
    return NextResponse.json({ valid: false, error: "Internal error" }, { status: 500 });
  }
}
