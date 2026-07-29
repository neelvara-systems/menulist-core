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

import { normalizeAuthClaimToken } from "@lib/auth/claimTokenBoundary";
import { authPrivateJson } from "@lib/auth/authApiResponse";
import {
  assertMessagingUserClaimIsAvailable,
  claimTokenTimestampLikeToMillis,
  ClaimTokenUnavailableError,
  getUniqueMessagingUserByClaimToken,
} from "@lib/auth/claimAccountConcurrency";
import { admin } from "@lib/firebase/firebaseAdmin";
import { getBoundedAuthStringContext, logAuthFailure } from "@lib/auth/authDiagnostics";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { NextRequest } from "next/server";

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

const getClaimPreviewText = (value: unknown, fallback: string, maxLength: number): string => {
  if (typeof value !== "string") return fallback;
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
  return normalized || fallback;
};

const clearExpiredClaimTokenIfUnchanged = async (
  userRef: FirebaseFirestore.DocumentReference,
  token: string,
): Promise<void> => {
  await db.runTransaction(async (transaction) => {
    const currentSnapshot = await transaction.get(userRef);
    if (!currentSnapshot.exists) return;
    const current = currentSnapshot.data() || {};
    const expiresAt = claimTokenTimestampLikeToMillis(current.claimTokenExpiresAt);
    if (current.claimToken !== token || expiresAt === null || expiresAt > Date.now()) return;
    const now = admin.firestore.Timestamp.now();
    transaction.update(userRef, {
      claimToken: null,
      claimTokenExpiresAt: null,
      claimTokenExpiredAt: now,
      modifiedOn: now,
    });
  });
};

export async function GET(request: NextRequest) {
  try {
    // 🔒 RATE LIMITING: Prevent brute force token validation
    const { checkRateLimit } = await import('@lib/rateLimit');
    const { getRateLimitForFeature } = await import('@lib/rateLimit/configs');
    const ip = getRequestIp(request);
    const ipHash = hashPublicRateLimitValue(ip);
    const rl = await checkRateLimit({
      key: `auth-validate:${ipHash}`,
      ...getRateLimitForFeature('AUTH_SENSITIVE'),
      failClosedOnProviderError: true,
    });
    if (!rl.allowed) {
      const providerUnavailable = rl.reason === 'provider_unavailable';
      return authPrivateJson(
        {
          error: providerUnavailable
            ? "Account setup is temporarily unavailable. Please try again shortly."
            : "Too many attempts. Please wait.",
        },
        { status: providerUnavailable ? 503 : 429 },
      );
    }

    const { searchParams } = new URL(request.url);
    const token = normalizeAuthClaimToken(searchParams.get("token"));

    if (!token) {
      return authPrivateJson({ valid: false, error: "Invalid or expired claim link." }, { status: 400 });
    }

    // Find user by claimToken
    const userDoc = await getUniqueMessagingUserByClaimToken(db, token);

    if (!userDoc) {
      return authPrivateJson({ valid: false, error: "Invalid or expired claim link." }, { status: 404 });
    }

    const userData = userDoc.data();
    try {
      assertMessagingUserClaimIsAvailable(userData, token);
    } catch (error) {
      if (!(error instanceof ClaimTokenUnavailableError)) throw error;
      if (error.status === 410) {
        await clearExpiredClaimTokenIfUnchanged(userDoc.ref, token);
      }
      return authPrivateJson(
        {
          valid: false,
          error: error.status === 410
            ? "This claim link has expired."
            : "Invalid or expired claim link.",
        },
        { status: error.status },
      );
    }

    // Return minimal info for the login page welcome message
    const phone = getClaimPreviewText(userData.phone, "", 40);
    return authPrivateJson({
      valid: true,
      status: "valid",
      preview: "claim-token",
      businessName: getClaimPreviewText(userData.name, "Your Business", 100),
      phone: phone ? `****${phone.slice(-4)}` : null,
    });
  } catch (error) {
    if (error instanceof ClaimTokenUnavailableError) {
      return authPrivateJson(
        { valid: false, error: "Invalid or expired claim link." },
        { status: error.status },
      );
    }
    const { searchParams } = new URL(request.url);
    logAuthFailure(
      "validate_claim_unexpected_error",
      error,
      buildValidateClaimFailureLogContext(request, searchParams.get("token")),
    );
    return authPrivateJson({ valid: false, error: "Internal error" }, { status: 500 });
  }
}
