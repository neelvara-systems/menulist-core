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
import { NextRequest, NextResponse } from "next/server";

const db = admin.firestore();

export async function GET(request: NextRequest) {
  try {
    // 🔒 RATE LIMITING: Prevent brute force token validation
    const { checkRateLimit } = await import('@lib/rateLimit');
    const { getRateLimitForFeature } = await import('@lib/rateLimit/configs');
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await checkRateLimit({ key: `auth-validate:${ip}`, ...getRateLimitForFeature('AUTH_SENSITIVE') });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many attempts. Please wait." }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token || token.length < 20) {
      return NextResponse.json({ valid: false, error: "Invalid token" }, { status: 400 });
    }

    // Find user by claimToken
    const userQuery = await db
      .collection(DB_COLLECTIONS.USERS)
      .where("claimToken", "==", token)
      .limit(1)
      .get();

    if (userQuery.empty) {
      return NextResponse.json({ valid: false, error: "Token not found or already used" }, { status: 404 });
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

    // Token never expires — 256-bit cryptographic random, brute force impossible
    // Expiry removed to eliminate support dependency (B4)

    // Return minimal info for the login page welcome message
    return NextResponse.json({
      valid: true,
      businessName: userData.name || "Your Business",
      phone: userData.phone ? `****${(userData.phone || "").slice(-4)}` : null, // Masked for privacy
    });
  } catch (error) {
    console.error("[validate-claim] Error:", (error as Error).message);
    return NextResponse.json({ valid: false, error: "Internal error" }, { status: 500 });
  }
}
