export const dynamic = 'force-dynamic';
/**
 * Claim Account API — Link Account to Messaging-Onboarded Business
 *
 * Two modes:
 *
 * MODE 1: Google OAuth (requires active NextAuth session)
 *   Body: { claimToken }
 *   Transfers tenant/store from messaging user to Google user doc.
 *
 * MODE 2: Email + Password Setup (no session required — token IS auth)
 *   Body: { claimToken, email, password, name? }
 *   Creates Firebase Auth user, updates messaging user doc with real email.
 *   Owner can then login via email/password OR Google.
 *
 * Token never expires (256-bit random, brute force impossible).
 *
 * @see __docs__/auth/README.md — Messaging Onboarding Login Flow
 */

import { DB_COLLECTIONS } from "@constant/database";
import { authOptions } from "@lib/auth";
import { admin, authAdmin } from "@lib/firebase/firebaseAdmin";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const db = admin.firestore();

const ClaimWithPasswordSchema = z.object({
  claimToken: z.string().min(20),
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 🔒 RATE LIMITING: Prevent brute force account claim attempts
    const { checkRateLimit } = await import('@lib/rateLimit');
    const { getRateLimitForFeature } = await import('@lib/rateLimit/configs');
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await checkRateLimit({ key: `auth-claim:${ip}`, ...getRateLimitForFeature('AUTH_SENSITIVE') });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
    }

    const body = await request.json();
    const { claimToken, email, password } = body;

    if (!claimToken || typeof claimToken !== "string" || claimToken.length < 20) {
      return NextResponse.json({ error: "Invalid claim token" }, { status: 400 });
    }

    // Find the messaging-onboarded user doc by claimToken
    const messagingUserQuery = await db
      .collection(DB_COLLECTIONS.USERS)
      .where("claimToken", "==", claimToken)
      .limit(1)
      .get();

    if (messagingUserQuery.empty) {
      return NextResponse.json({ error: "Claim token not found or already used" }, { status: 404 });
    }

    const messagingUserDoc = messagingUserQuery.docs[0];
    const messagingUser = messagingUserDoc.data();

    // Token never expires — 256-bit cryptographic random, brute force impossible
    // Expiry removed to eliminate support dependency (B4)

    // Check the messaging user actually has a tenant/store
    if (!messagingUser.tenantId || !messagingUser.storeId) {
      return NextResponse.json({ error: "No business found for this claim" }, { status: 400 });
    }

    const now = admin.firestore.Timestamp.now();

    // ━━━ MODE 2: Email + Password Setup (no session required) ━━━
    if (email && password) {
      const validation = ClaimWithPasswordSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: "Invalid input", details: validation.error.flatten() },
          { status: 400 },
        );
      }

      const { email: cleanEmail, password: cleanPassword, name } = validation.data;
      const lowerEmail = cleanEmail.toLowerCase().trim();

      // Check if email already exists in Firestore users
      const existingUserQuery = await db
        .collection(DB_COLLECTIONS.USERS)
        .where("email", "==", lowerEmail)
        .limit(1)
        .get();

      if (!existingUserQuery.empty) {
        return NextResponse.json({
          error: "This email is already registered. Please sign in with Google or use a different email.",
        }, { status: 409 });
      }

      // Create Firebase Auth user
      let firebaseUid: string;
      try {
        const firebaseUser = await authAdmin.createUser({
          email: lowerEmail,
          password: cleanPassword,
          emailVerified: true,
          displayName: name || messagingUser.name || lowerEmail.split("@")[0],
        });
        firebaseUid = firebaseUser.uid;
      } catch (fbError: any) {
        if (fbError.code === "auth/email-already-exists") {
          return NextResponse.json({
            error: "This email is already registered. Please use a different email or sign in with Google.",
          }, { status: 409 });
        }
        throw fbError;
      }

      // Update the messaging user doc directly (convert placeholder to real account)
      const batch = db.batch();

      batch.update(messagingUserDoc.ref, {
        email: lowerEmail,
        name: name || messagingUser.name,
        isVerified: true,
        active: true,
        claimToken: null, // One-time use — clear token
        claimTokenExpiresAt: null,
        claimedAt: now,
        claimedVia: "email-password",
        firebaseUid,
        modifiedOn: now,
      });

      // Update tenant & store email
      const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(String(messagingUser.tenantId));
      batch.update(tenantRef, { email: lowerEmail, modifiedOn: now });

      const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(messagingUser.storeId));
      batch.update(storeRef, { email: lowerEmail, modifiedOn: now });

      await batch.commit();

      // Set custom claims on Firebase Auth
      await authAdmin.setCustomUserClaims(firebaseUid, {
        role: "owner",
        tenantId: String(messagingUser.tenantId),
        storeId: String(messagingUser.storeId),
        uId: messagingUserDoc.id,
      });

      console.log(`[claim-account] ✅ Email/password setup: ${lowerEmail} → tenant ${messagingUser.tenantId}`);

      return NextResponse.json({
        success: true,
        mode: "email-password",
        tenantId: messagingUser.tenantId,
        storeId: messagingUser.storeId,
        message: "Account created! You can now log in with your email and password.",
      });
    }

    // ━━━ MODE 1: Google OAuth (requires active NextAuth session) ━━━
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated. Please sign in with Google first." }, { status: 401 });
    }

    const googleEmail = session.user.email;
    const googleUserId = session.user.id;

    // Check if the Google user already has a tenant (prevent double-claiming)
    const googleUserRef = db.collection(DB_COLLECTIONS.USERS).doc(googleUserId);
    const googleUserDoc = await googleUserRef.get();

    if (googleUserDoc.exists) {
      const googleUserData = googleUserDoc.data();
      if (googleUserData?.tenantId) {
        return NextResponse.json({
          error: "Your Google account is already linked to a business.",
        }, { status: 409 });
      }
    }

    // Execute transfer in a batch
    const batch = db.batch();

    // 1. Update Google user doc with tenant/store ownership
    if (googleUserDoc.exists) {
      batch.update(googleUserRef, {
        tenantId: messagingUser.tenantId,
        storeId: messagingUser.storeId,
        stores: messagingUser.stores,
        platformRole: messagingUser.platformRole || "OWNER",
        phone: messagingUser.phone,
        isVerified: true,
        active: true,
        onboardingSource: "MESSAGING_ONBOARDING",
        claimedFrom: messagingUserDoc.id,
        claimedAt: now,
        modifiedOn: now,
      });
    } else {
      batch.set(googleUserRef, {
        email: googleEmail,
        name: session.user.name || googleEmail.split("@")[0],
        image: (session.user as any).image || "",
        tenantId: messagingUser.tenantId,
        storeId: messagingUser.storeId,
        stores: messagingUser.stores,
        platformRole: "OWNER",
        phone: messagingUser.phone,
        isVerified: true,
        active: true,
        onboardingSource: "MESSAGING_ONBOARDING",
        createdVia: "claim-account",
        claimedFrom: messagingUserDoc.id,
        claimedAt: now,
        createdOn: now,
        modifiedOn: now,
      });
    }

    // 2. Deactivate the old messaging user doc (keep for audit)
    batch.update(messagingUserDoc.ref, {
      active: false,
      claimToken: null,
      claimTokenExpiresAt: null,
      claimedByEmail: googleEmail,
      claimedByUserId: googleUserId,
      claimedAt: now,
      deactivatedReason: "Account claimed via Google OAuth",
      modifiedOn: now,
    });

    // 3. Update tenant email
    const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(String(messagingUser.tenantId));
    batch.update(tenantRef, { email: googleEmail, modifiedOn: now });

    // 4. Update store email
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(messagingUser.storeId));
    batch.update(storeRef, { email: googleEmail, modifiedOn: now });

    await batch.commit();

    console.log(`[claim-account] ✅ Google OAuth claim: ${googleEmail} → tenant ${messagingUser.tenantId}`);

    return NextResponse.json({
      success: true,
      mode: "google",
      tenantId: messagingUser.tenantId,
      storeId: messagingUser.storeId,
      message: "Account linked successfully! You can now manage your business.",
    });
  } catch (error) {
    console.error("[claim-account] Error:", (error as Error).message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
