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
import { admin, authAdmin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "../../../../middleware/auth";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(6).max(128),
});

const getRequestIp = (request: NextRequest) => (
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  || request.headers.get("x-real-ip")
  || "unknown"
);

export const POST = withAuth(async (request: NextRequest, session) => {
  try {
    const userId = String(session?.uId || session?.user?.id || "");
    const email = String(session?.user?.email || "").toLowerCase().trim();
    if (!userId || !email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const rl = await checkRateLimit({
      key: `auth-pwd:${userId || getRequestIp(request)}`,
      ...getRateLimitForFeature("AUTH_SENSITIVE"),
    });
    if (!rl.allowed) {
      logger.security("Rate Limit Exceeded", {
        ...buildSecurityContext(session, request),
        endpoint: request.nextUrl.pathname,
        feature: "AUTH_SENSITIVE",
      }, "medium");

      return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
    }

    const body = await request.json();
    const validation = validateAPIInput(ChangePasswordSchema, body);
    if (validation.success === false) {
      logger.security("Input Validation Failed - Change Password", {
        ...buildSecurityContext(session, request),
        endpoint: request.nextUrl.pathname,
        error: validation.error,
      }, "medium");

      return NextResponse.json({ error: "Invalid password details" }, { status: 400 });
    }

    const { currentPassword, newPassword } = validation.data;

    // Find the Firebase Auth user for this email
    let firebaseUser;
    try {
      firebaseUser = await authAdmin.getUserByEmail(email);
    } catch {
      return NextResponse.json({
        error: "Unable to verify current credentials.",
      }, { status: 400 });
    }

    // Check if user has a password provider (not just Google)
    const hasPasswordProvider = firebaseUser.providerData.some(
      (p) => p.providerId === "password"
    );

    if (!hasPasswordProvider) {
      return NextResponse.json({
        error: "Unable to verify current credentials.",
      }, { status: 400 });
    }

    // Verify current password by attempting to sign in
    // (Admin SDK doesn't have a "verify password" method, so we use a workaround)
    const firebaseApiKey = process.env.FIREBASE_API_KEY;
    if (!firebaseApiKey) {
      logger.error("[change-password] Firebase API key missing", undefined, {
        ...buildSecurityContext(session, request),
        endpoint: request.nextUrl.pathname,
      });

      return NextResponse.json({ error: "Could not verify current password" }, { status: 500 });
    }

    try {
      // Admin SDK does not expose password verification; use Firebase Auth REST API.
      const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`;
      const verifyRes = await fetch(verifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: currentPassword,
          returnSecureToken: false,
        }),
      });

      if (!verifyRes.ok) {
        return NextResponse.json({ error: "Unable to verify current credentials." }, { status: 403 });
      }
    } catch (verifyError) {
      logger.error("[change-password] Current password verification failed", verifyError, {
        ...buildSecurityContext(session, request),
        endpoint: request.nextUrl.pathname,
      });

      return NextResponse.json({ error: "Could not verify current password" }, { status: 500 });
    }

    // Update the password via Admin SDK
    await authAdmin.updateUser(firebaseUser.uid, {
      password: newPassword,
    });

    // Update modifiedOn in Firestore
    const now = admin.firestore.Timestamp.now();
    const userRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userId);
    await userRef.update({
      modifiedOn: now,
      passwordChangedAt: now,
    });

    logger.info("[change-password] Password changed", {
      ...buildSecurityContext(session, request),
      endpoint: request.nextUrl.pathname,
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    logger.error("[change-password] Error", error, {
      ...buildSecurityContext(session, request),
      endpoint: request.nextUrl.pathname,
    });

    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});
