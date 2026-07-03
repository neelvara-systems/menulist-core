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
import { getAuthSessionLogContext, getBoundedAuthStringContext, logAuthFailure } from "@lib/auth/authDiagnostics";
import { admin, authAdmin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { z } from "zod";
import { withAuth } from "../../../../middleware/auth";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(6).max(128),
});
const CHANGE_PASSWORD_MAX_BODY_BYTES = 2 * 1024;
const FIREBASE_AUTH_SIGN_IN_WITH_PASSWORD_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword";

const normalizeFirebaseAuthApiKey = (value?: string) => {
  const apiKey = String(value || "").trim();
  if (!apiKey || /[\s\x00-\x1F\x7F]/.test(apiKey)) return null;
  return apiKey;
};

const buildFirebasePasswordVerificationEndpoint = (apiKey: string) => {
  const endpoint = new URL(FIREBASE_AUTH_SIGN_IN_WITH_PASSWORD_URL);
  endpoint.searchParams.set("key", apiKey);
  return endpoint.toString();
};

const getRequestIp = (request: NextRequest) => (
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  || request.headers.get("x-real-ip")
  || "unknown"
);

const getChangePasswordLogContext = (request: NextRequest, session: any) => ({
  endpoint: request.nextUrl.pathname,
  ...getAuthSessionLogContext(session),
  ...getBoundedAuthStringContext("requestIp", getRequestIp(request)),
});

export const POST = withAuth(async (request: NextRequest, session) => {
  try {
    const userId = String(session?.uId || session?.user?.id || "");
    const email = String(session?.user?.email || "").toLowerCase().trim();
    if (!userId || !email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userRateLimitHash = hashPublicRateLimitValue(userId);
    const rl = await checkRateLimit({
      key: `auth-pwd:${userRateLimitHash}`,
      ...getRateLimitForFeature("AUTH_SENSITIVE"),
    });
    if (!rl.allowed) {
      logger.security("Rate Limit Exceeded", {
        ...getBoundedSecurityRouteContext(session, request),
        endpoint: request.nextUrl.pathname,
        feature: "AUTH_SENSITIVE",
      }, "medium");

      return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
    }

    const bodyResult = await readBoundedJsonBody(request, CHANGE_PASSWORD_MAX_BODY_BYTES, {
      invalidJsonMessage: "Invalid password details",
    });
    if (bodyResult.ok === false) return bodyResult.response;
    const body = bodyResult.data;
    const validation = validateAPIInput(ChangePasswordSchema, body);
    if (validation.success === false) {
      logger.security("Input Validation Failed - Change Password", {
        ...getBoundedSecurityRouteContext(session, request),
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
    const firebaseApiKey = normalizeFirebaseAuthApiKey(process.env.FIREBASE_API_KEY);
    if (!firebaseApiKey) {
      logAuthFailure(
        "change_password_firebase_api_key_missing",
        undefined,
        getChangePasswordLogContext(request, session),
      );

      return NextResponse.json({ error: "Could not verify current password" }, { status: 500 });
    }

    try {
      // Admin SDK does not expose password verification; use Firebase Auth REST API.
      const verifyRes = await fetch(buildFirebasePasswordVerificationEndpoint(firebaseApiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: currentPassword,
          returnSecureToken: false,
        }),
        redirect: "manual",
      });

      if (!verifyRes.ok) {
        return NextResponse.json({ error: "Unable to verify current credentials." }, { status: 403 });
      }
    } catch (verifyError) {
      logAuthFailure(
        "change_password_current_password_verification_failed",
        verifyError,
        getChangePasswordLogContext(request, session),
      );

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

    logger.info("[change-password] Password changed", getChangePasswordLogContext(request, session));

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    logAuthFailure(
      "change_password_unexpected_error",
      error,
      getChangePasswordLogContext(request, session),
    );

    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});
