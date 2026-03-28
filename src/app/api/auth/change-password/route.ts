export const dynamic = 'force-dynamic';
/**
 * Change Password API — Update logged-in user's password
 *
 * For email/password users: Requires current password verification.
 * For OAuth-only users: Returns error (they don't have a password to change).
 *
 * Requires: Active NextAuth session.
 *
 * @see __docs__/auth/README.md — Password Management
 */

import { DB_COLLECTIONS } from "@constant/database";
import { authOptions } from "@lib/auth";
import { admin, authAdmin } from "@lib/firebase/firebaseAdmin";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

const db = admin.firestore();

export async function POST(request: NextRequest) {
  try {
    // 🔒 RATE LIMITING: Prevent brute force password change attempts
    const { checkRateLimit } = await import('@lib/rateLimit');
    const { getRateLimitForFeature } = await import('@lib/rateLimit/configs');
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await checkRateLimit({ key: `auth-pwd:${ip}`, ...getRateLimitForFeature('AUTH_SENSITIVE') });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    }

    if (newPassword.length > 128) {
      return NextResponse.json({ error: "Password too long" }, { status: 400 });
    }

    // Find the Firebase Auth user for this email
    let firebaseUser;
    try {
      firebaseUser = await authAdmin.getUserByEmail(session.user.email);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        return NextResponse.json({
          error: "No password-based account found. You may be using Google sign-in only.",
        }, { status: 400 });
      }
      throw err;
    }

    // Check if user has a password provider (not just Google)
    const hasPasswordProvider = firebaseUser.providerData.some(
      (p) => p.providerId === "password"
    );

    if (!hasPasswordProvider) {
      return NextResponse.json({
        error: "Your account uses Google sign-in. There is no password to change.",
      }, { status: 400 });
    }

    // Verify current password by attempting to sign in
    // (Admin SDK doesn't have a "verify password" method, so we use a workaround)
    if (currentPassword) {
      try {
        // Use Firebase Auth REST API to verify current password
        const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`;
        const verifyRes = await fetch(verifyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: session.user.email,
            password: currentPassword,
            returnSecureToken: false,
          }),
        });

        if (!verifyRes.ok) {
          return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
        }
      } catch (verifyError) {
        return NextResponse.json({ error: "Could not verify current password" }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }

    // Update the password via Admin SDK
    await authAdmin.updateUser(firebaseUser.uid, {
      password: newPassword,
    });

    // Update modifiedOn in Firestore
    const now = admin.firestore.Timestamp.now();
    const userRef = db.collection(DB_COLLECTIONS.USERS).doc(session.user.id);
    await userRef.update({
      modifiedOn: now,
      passwordChangedAt: now,
    });

    console.log(`[change-password] Password changed for ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("[change-password] Error:", (error as Error).message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
