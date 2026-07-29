export const dynamic = 'force-dynamic';
/**
 * Claim Account API — Link Account to Messaging-Onboarded Business
 *
 * Three modes:
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
 * MODE 3: WhatsApp Phone + Passcode Setup (no session required — token IS auth)
 *   Body: { claimToken, password, name?, useWhatsappPhone: true }
 *   Creates/updates Firebase Auth user with the generated messaging email.
 *   Owner logs in with the WhatsApp phone number and passcode.
 *
 * Token is high-entropy and one-time use. `claimTokenExpiresAt` is required,
 * and missing, malformed, expired, or ambiguous claim identities fail closed.
 *
 * @see __docs__/auth/README.md — Messaging Onboarding Login Flow
 */

import { DB_COLLECTIONS } from "@constant/database";
import { getGeneratedEmail } from "@constant/urls";
import { authOptions } from "@lib/auth";
import { resolveCurrentSessionUserDocumentId } from "@lib/auth/currentPlatformUser";
import {
  AUTH_CLAIM_TOKEN_MAX_LENGTH,
  AUTH_CLAIM_TOKEN_MIN_LENGTH,
  AUTH_CLAIM_TOKEN_PATTERN,
  normalizeAuthClaimToken,
} from "@lib/auth/claimTokenBoundary";
import { getBoundedAuthStringContext, logAuthFailure } from "@lib/auth/authDiagnostics";
import { runClaimAccountCacheRevalidation } from "@lib/auth/claimAccountPostCommit";
import { getGlobalEmailUserDocumentId } from "@lib/auth/serverUserContext";
import {
  assertGoogleClaimTargetIsAvailable,
  canDeleteCreatedClaimAuthUser,
  ClaimTokenUnavailableError,
  getUniqueMessagingUserByClaimToken,
  releaseClaimAccountOperation,
  reserveClaimAccountOperation,
  runClaimAccountTransaction,
  type ClaimedMessagingUser,
  type ClaimAccountMode,
} from "@lib/auth/claimAccountConcurrency";
import { isInternalAuthEmail } from "@lib/auth/loginIdentifiers";
import { admin, authAdmin } from "@lib/firebase/firebaseAdmin";
import { normalizeOnboardingUserId } from "@lib/onboarding/onboardingUserId";
import { normalizePhoneNumberForStorage } from "@lib/phone/phoneNumber";
import { revalidateMenuCache } from "@lib/actions/revalidateMenuCache";
import { validateEmail } from "@lib/validation/emailDomainValidator";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { logger } from "@lib/monitoring/logger";
import { getClientIp, hashPublicRateLimitValue } from "src/middleware/publicApi";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

const db = admin.firestore();

const AuthClaimTokenSchema = z
  .string()
  .min(AUTH_CLAIM_TOKEN_MIN_LENGTH)
  .max(AUTH_CLAIM_TOKEN_MAX_LENGTH)
  .regex(AUTH_CLAIM_TOKEN_PATTERN);

const ClaimWithPasswordSchema = z.object({
  claimToken: AuthClaimTokenSchema,
  email: z.string().email().max(180),
  password: z.string().min(6).max(128),
  name: z.string().max(100).optional(),
});

const ClaimWithWhatsappPhoneSchema = z.object({
  claimToken: AuthClaimTokenSchema,
  password: z.string().min(6).max(128),
  name: z.string().max(100).optional(),
  useWhatsappPhone: z.literal(true),
});
const CLAIM_ACCOUNT_MAX_BODY_BYTES = 16 * 1024;
const CLAIM_ACCOUNT_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
} as const;

const claimJson = (body: unknown, init: ResponseInit = {}) => {
  const headers = new Headers(init.headers);
  Object.entries(CLAIM_ACCOUNT_RESPONSE_HEADERS).forEach(([name, value]) => {
    headers.set(name, value);
  });
  return (NextResponse.json)(body, { ...init, headers });
};

const withClaimResponseHeaders = <T extends NextResponse>(response: T): T => {
  Object.entries(CLAIM_ACCOUNT_RESPONSE_HEADERS).forEach(([name, value]) => {
    response.headers.set(name, value);
  });
  return response;
};

const getMessagingPhone = (messagingUser: FirebaseFirestore.DocumentData) => (
  String(messagingUser.phone || messagingUser.providerDisplayId || "").trim()
);

const claimFailure = (message: string, status = 400) => claimJson({ error: message }, { status });

const buildAnonymousSecurityContext = (request: NextRequest) => ({
  ...getBoundedSecurityRouteContext(null, request),
  endpoint: request.nextUrl.pathname,
});

const buildClaimFailureLogContext = (request: NextRequest) => {
  return {
    endpoint: request.nextUrl.pathname,
    ...getBoundedSecurityRouteContext(null, request),
  };
};

const createOrUpdateFirebasePasswordUser = async (params: {
  displayName?: string;
  email: string;
  emailVerified: boolean;
  expectedMessagingUser?: ClaimedMessagingUser;
  messagingUserRef?: FirebaseFirestore.DocumentReference;
  password: string;
  updateIfExists?: boolean;
}) => {
  try {
    const firebaseUser = await authAdmin.createUser({
      displayName: params.displayName,
      email: params.email,
      emailVerified: params.emailVerified,
      password: params.password,
    });
    return { created: true, uid: firebaseUser.uid };
  } catch (fbError: any) {
    if (fbError?.code !== "auth/email-already-exists" || !params.updateIfExists) {
      throw fbError;
    }

    const existingUser = await authAdmin.getUserByEmail(params.email);
    if (!params.expectedMessagingUser || !params.messagingUserRef) {
      throw new ClaimTokenUnavailableError();
    }
    if (
      params.expectedMessagingUser.firebaseUid
      && params.expectedMessagingUser.firebaseUid !== existingUser.uid
    ) {
      throw new ClaimTokenUnavailableError();
    }
    const [firebaseUidUsers, emailUsers] = await Promise.all([
      db.collection(DB_COLLECTIONS.USERS).where("firebaseUid", "==", existingUser.uid).limit(2).get(),
      db.collection(DB_COLLECTIONS.USERS).where("email", "==", params.email).limit(2).get(),
    ]);
    if (
      [...firebaseUidUsers.docs, ...emailUsers.docs]
        .some((document) => document.id !== params.messagingUserRef?.id)
    ) {
      throw new ClaimTokenUnavailableError();
    }
    await authAdmin.updateUser(existingUser.uid, {
      displayName: params.displayName,
      emailVerified: params.emailVerified,
      password: params.password,
    });
    return { created: false, uid: existingUser.uid };
  }
};

const getClaimPhoneIdentity = (messagingUser: ClaimedMessagingUser) => {
  const messagingPhone = getMessagingPhone(messagingUser);
  const normalizedPhone = normalizePhoneNumberForStorage({
    countryCode: messagingUser.countryCode,
    dialCode: messagingUser.dialCode,
    phone: messagingUser.phone,
    phoneNumber: messagingUser.phoneNumber || messagingPhone,
  });
  return { messagingPhone, normalizedPhone, phoneUsername: normalizedPhone.phoneUsername };
};

const compensateFailedClaim = async ({
  authResult,
  messagingUserRef,
  operationId,
  request,
}: {
  authResult?: { created: boolean; uid: string };
  messagingUserRef: FirebaseFirestore.DocumentReference;
  operationId: string;
  request: NextRequest;
}): Promise<void> => {
  if (authResult?.created && await canDeleteCreatedClaimAuthUser(db, messagingUserRef, authResult.uid)) {
    try {
      await authAdmin.deleteUser(authResult.uid);
    } catch (error) {
      logAuthFailure("claim_account_auth_compensation_failed", error, buildClaimFailureLogContext(request));
    }
  }
  try {
    await releaseClaimAccountOperation({ db, messagingUserRef, operationId });
  } catch (error) {
    logAuthFailure("claim_account_reservation_release_failed", error, buildClaimFailureLogContext(request));
  }
};

const setClaimCustomClaims = async ({
  firebaseUid,
  request,
  scope,
  userDocumentId,
}: {
  firebaseUid: string;
  request: NextRequest;
  scope: ClaimedMessagingUser['claimAccountScope'];
  userDocumentId: string;
}): Promise<void> => {
  try {
    await authAdmin.setCustomUserClaims(firebaseUid, {
      admin: true,
      platformRole: "OWNER",
      role: "owner",
      storeId: String(scope.storeId),
      storeIds: [String(scope.storeId)],
      tenantId: String(scope.tenantId),
      uId: userDocumentId,
    });
  } catch (error) {
    // Next credential login calls /api/auth/set-claims and repairs this mirror.
    logAuthFailure("claim_account_custom_claims_sync_failed", error, buildClaimFailureLogContext(request));
  }
};

const revalidateClaimAccountPublicCache = async (
  scope: ClaimedMessagingUser['claimAccountScope'],
  request: NextRequest,
): Promise<void> => {
  await runClaimAccountCacheRevalidation(
    { storeId: scope.storeId, tenantId: scope.tenantId },
    {
      revalidate: (storeId, tenantId) => revalidateMenuCache(storeId, { tId: tenantId }),
      onFailure: (error) => {
        logAuthFailure("claim_account_cache_revalidation_failed", error, buildClaimFailureLogContext(request));
      },
    },
  );
};

export async function POST(request: NextRequest) {
  try {
    // 🔒 RATE LIMITING: Prevent brute force account claim attempts
    const { checkRateLimit } = await import('@lib/rateLimit');
    const { getRateLimitForFeature } = await import('@lib/rateLimit/configs');
    const ip = getClientIp(request);
    const ipHash = hashPublicRateLimitValue(ip);
    const rl = await checkRateLimit({
      key: `auth-claim:${ipHash}`,
      ...getRateLimitForFeature('AUTH_SENSITIVE'),
      failClosedOnProviderError: true,
    });
    if (!rl.allowed) {
      const providerUnavailable = rl.reason === 'provider_unavailable';
      return claimJson(
        {
          error: providerUnavailable
            ? "Account setup is temporarily unavailable. Please try again shortly."
            : "Too many attempts. Please wait before trying again.",
        },
        { status: providerUnavailable ? 503 : 429 },
      );
    }

    const bodyResult = await readBoundedJsonBody(request, CLAIM_ACCOUNT_MAX_BODY_BYTES, {
      invalidJsonMessage: "Unable to complete account claim.",
    });
    if (bodyResult.ok === false) return withClaimResponseHeaders(bodyResult.response);
    const body = (
      bodyResult.data && typeof bodyResult.data === "object" && !Array.isArray(bodyResult.data)
    )
      ? bodyResult.data as Record<string, any>
      : {};
    const { email, password, useWhatsappPhone } = body;
    const claimToken = normalizeAuthClaimToken(body.claimToken);

    if (!claimToken) {
      logger.security("Input Validation Failed - Claim Account", {
        ...buildAnonymousSecurityContext(request),
        reason: "invalid_claim_token",
      }, "medium");

      return claimFailure("Unable to complete account claim.");
    }

    // Find the messaging-onboarded user doc by claimToken
    const messagingUserDoc = await getUniqueMessagingUserByClaimToken(db, claimToken);

    if (!messagingUserDoc) {
      logger.security("Claim Token Not Found", {
        ...buildAnonymousSecurityContext(request),
        ...getBoundedAuthStringContext("claimToken", claimToken),
      }, "medium");

      return claimFailure("Unable to complete account claim.", 404);
    }

    const now = admin.firestore.Timestamp.now();

    // ━━━ MODE 3: WhatsApp Phone + Passcode Setup (no session required) ━━━
    if (useWhatsappPhone && password) {
      const validation = ClaimWithWhatsappPhoneSchema.safeParse(body);
      if (!validation.success) {
        logger.security("Input Validation Failed - Claim Account", {
          ...buildAnonymousSecurityContext(request),
          mode: "whatsapp_phone",
          reason: validation.error?.issues?.[0]?.message || "invalid_input",
        }, "medium");

        return claimFailure("Unable to complete account claim.");
      }

      const { password: cleanPassword, name } = validation.data;
      const mode: ClaimAccountMode = "whatsapp-phone";
      const operationId = crypto.randomUUID();
      const reservedMessagingUser = await reserveClaimAccountOperation({
        claimToken,
        db,
        messagingUserRef: messagingUserDoc.ref,
        mode,
        operationId,
      });
      let authResult: { created: boolean; uid: string } | undefined;
      let claimedMessagingUser: ClaimedMessagingUser;
      try {
        const { messagingPhone, normalizedPhone, phoneUsername } = getClaimPhoneIdentity(reservedMessagingUser);
        if (!phoneUsername) throw new ClaimTokenUnavailableError();
        const existingEmail = String(reservedMessagingUser.email || "").toLowerCase().trim();
        const loginEmail = isInternalAuthEmail(existingEmail)
          ? existingEmail
          : getGeneratedEmail(messagingPhone);
        const displayName = name || reservedMessagingUser.name || phoneUsername;
        authResult = await createOrUpdateFirebasePasswordUser({
          displayName,
          email: loginEmail,
          emailVerified: true,
          expectedMessagingUser: reservedMessagingUser,
          messagingUserRef: messagingUserDoc.ref,
          password: cleanPassword,
          updateIfExists: true,
        });
        const firebaseUid = authResult.uid;
        claimedMessagingUser = await runClaimAccountTransaction({
          claimToken,
          db,
          messagingUserRef: messagingUserDoc.ref,
          mode,
          operationId,
          subscription: {
            email: loginEmail,
            name: displayName,
            userDocId: messagingUserDoc.id,
          },
          apply: (transaction) => {
            transaction.update(messagingUserDoc.ref, {
              active: true,
              claimToken: null,
              claimTokenExpiresAt: null,
              claimedAt: now,
              claimedVia: "whatsapp-phone-passcode",
              countryCode: normalizedPhone.countryCode,
              dialCode: normalizedPhone.dialCode,
              email: loginEmail,
              firebaseUid,
              isVerified: true,
              modifiedOn: now,
              name: displayName,
              phone: normalizedPhone.phone,
              phoneLoginEnabled: true,
              phoneNumber: normalizedPhone.phoneNumber,
              phoneUsername,
            });
          },
        });
      } catch (error) {
        await compensateFailedClaim({ authResult, messagingUserRef: messagingUserDoc.ref, operationId, request });
        throw error;
      }
      const claimScope = claimedMessagingUser.claimAccountScope;
      await setClaimCustomClaims({
        firebaseUid: authResult.uid,
        request,
        scope: claimScope,
        userDocumentId: messagingUserDoc.id,
      });

      return claimJson({
        success: true,
        mode: "whatsapp-phone",
        tenantId: claimScope.tenantId,
        storeId: claimScope.storeId,
        message: "Account created. You can now log in with your WhatsApp number and passcode.",
      });
    }

    // ━━━ MODE 2: Email + Password Setup (no session required) ━━━
    if (email && password) {
      const validation = ClaimWithPasswordSchema.safeParse(body);
      if (!validation.success) {
        logger.security("Input Validation Failed - Claim Account", {
          ...buildAnonymousSecurityContext(request),
          mode: "email_password",
          reason: validation.error?.issues?.[0]?.message || "invalid_input",
        }, "medium");

        return claimFailure("Unable to complete account claim.");
      }

      const { email: cleanEmail, password: cleanPassword, name } = validation.data;
      const lowerEmail = cleanEmail.toLowerCase().trim();
      const emailValidation = validateEmail(lowerEmail);
      if (!emailValidation.valid) {
        return claimFailure("Unable to complete account claim.");
      }
      const emailUserId = getGlobalEmailUserDocumentId(lowerEmail);
      if (!emailUserId) return claimFailure("Unable to complete account claim.");
      const mode: ClaimAccountMode = "email-password";
      const operationId = crypto.randomUUID();
      const reservedMessagingUser = await reserveClaimAccountOperation({
        claimToken,
        db,
        messagingUserRef: messagingUserDoc.ref,
        mode,
        operationId,
      });
      let authResult: { created: boolean; uid: string } | undefined;
      let claimedMessagingUser: ClaimedMessagingUser;
      try {
        const existingUserQuery = await db
          .collection(DB_COLLECTIONS.USERS)
          .where("email", "==", lowerEmail)
          .limit(2)
          .get();
        if (!existingUserQuery.empty) throw new ClaimTokenUnavailableError();

        const { normalizedPhone, phoneUsername } = getClaimPhoneIdentity(reservedMessagingUser);
        const displayName = name || reservedMessagingUser.name || lowerEmail.split("@")[0];
        const emailUserRef = db.collection(DB_COLLECTIONS.USERS).doc(emailUserId);
        authResult = await createOrUpdateFirebasePasswordUser({
          displayName,
          email: lowerEmail,
          emailVerified: true,
          password: cleanPassword,
        });
        const firebaseUid = authResult.uid;
        claimedMessagingUser = await runClaimAccountTransaction({
          claimToken,
          db,
          messagingUserRef: messagingUserDoc.ref,
          mode,
          operationId,
          subscription: { email: lowerEmail, name: displayName, userDocId: emailUserId },
          apply: async (transaction, currentMessagingUser) => {
            const claimScope = currentMessagingUser.claimAccountScope;
            const emailUserSnapshot = await transaction.get(emailUserRef);
            if (emailUserSnapshot.exists) throw new ClaimTokenUnavailableError();
            transaction.create(emailUserRef, {
              active: true,
              claimedAt: now,
              claimedFrom: messagingUserDoc.id,
              countryCode: normalizedPhone.countryCode,
              createdOn: now,
              createdVia: "claim-account",
              dialCode: normalizedPhone.dialCode,
              email: lowerEmail,
              firebaseUid,
              isVerified: true,
              modifiedOn: now,
              name: displayName,
              onboardingSource: "MESSAGING_ONBOARDING",
              phone: normalizedPhone.phone || currentMessagingUser.phone,
              phoneLoginEnabled: Boolean(phoneUsername),
              phoneNumber: normalizedPhone.phoneNumber || currentMessagingUser.phoneNumber,
              ...(phoneUsername ? { phoneUsername } : {}),
              platformRole: currentMessagingUser.platformRole || "OWNER",
              storeId: claimScope.storeId,
              storeIds: [claimScope.storeId],
              stores: currentMessagingUser.stores,
              tenantId: claimScope.tenantId,
            });
            transaction.update(messagingUserDoc.ref, {
              active: false,
              claimToken: null,
              claimTokenExpiresAt: null,
              claimedAt: now,
              claimedByEmail: lowerEmail,
              claimedByUserId: emailUserId,
              deactivatedReason: "Account claimed via email and password",
              modifiedOn: now,
            });
            const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(claimScope.tenantDocumentId);
            transaction.update(tenantRef, { email: lowerEmail, modifiedOn: now });
            const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(claimScope.storeDocumentId);
            transaction.update(storeRef, { email: lowerEmail, modifiedOn: now });
          },
        });
      } catch (error: any) {
        await compensateFailedClaim({ authResult, messagingUserRef: messagingUserDoc.ref, operationId, request });
        if (error?.code === "auth/email-already-exists") {
          return claimFailure("Unable to complete account claim.", 409);
        }
        throw error;
      }
      const claimScope = claimedMessagingUser.claimAccountScope;
      await revalidateClaimAccountPublicCache(claimScope, request);
      await setClaimCustomClaims({
        firebaseUid: authResult.uid,
        request,
        scope: claimScope,
        userDocumentId: emailUserId,
      });

      return claimJson({
        success: true,
        mode: "email-password",
        tenantId: claimScope.tenantId,
        storeId: claimScope.storeId,
        message: "Account created! You can now log in with your email and password.",
      });
    }

    // ━━━ MODE 1: Google OAuth (requires active NextAuth session) ━━━
    const session = await getServerSession(authOptions);
    const sessionUserId = resolveCurrentSessionUserDocumentId(session);
    if (!session?.user?.email || !sessionUserId) {
      return claimFailure("Unable to complete account claim.", 401);
    }

    const googleEmail = session.user.email.toLowerCase().trim();
    const googleUserId = normalizeOnboardingUserId(sessionUserId);
    if (
      !googleUserId
      || googleUserId === messagingUserDoc.id
      || !validateEmail(googleEmail).valid
    ) {
      return claimFailure("Unable to complete account claim.", 409);
    }

    const googleUserRef = db.collection(DB_COLLECTIONS.USERS).doc(googleUserId);
    const mode: ClaimAccountMode = "google";
    const operationId = crypto.randomUUID();
    const reservedMessagingUser = await reserveClaimAccountOperation({
      claimToken,
      db,
      messagingUserRef: messagingUserDoc.ref,
      mode,
      operationId,
    });
    let claimedMessagingUser: ClaimedMessagingUser;
    try {
      const displayName = session.user.name || googleEmail.split("@")[0];
      claimedMessagingUser = await runClaimAccountTransaction({
        claimToken,
        db,
        messagingUserRef: messagingUserDoc.ref,
        mode,
        operationId,
        subscription: { email: googleEmail, name: displayName, userDocId: googleUserId },
        apply: async (transaction, currentMessagingUser) => {
          const claimScope = currentMessagingUser.claimAccountScope;
          const googleUserDoc = await transaction.get(googleUserRef);
          if (googleUserDoc.exists) {
            assertGoogleClaimTargetIsAvailable(googleUserDoc.data() || {}, googleEmail);
            transaction.update(googleUserRef, {
              active: true,
              claimedAt: now,
              claimedFrom: messagingUserDoc.id,
              isVerified: true,
              modifiedOn: now,
              onboardingSource: "MESSAGING_ONBOARDING",
              phone: currentMessagingUser.phone,
              platformRole: currentMessagingUser.platformRole || "OWNER",
              storeId: claimScope.storeId,
              stores: currentMessagingUser.stores,
              tenantId: claimScope.tenantId,
            });
          } else {
            transaction.create(googleUserRef, {
              active: true,
              claimedAt: now,
              claimedFrom: messagingUserDoc.id,
              createdOn: now,
              createdVia: "claim-account",
              email: googleEmail,
              image: session.user.image || "",
              isVerified: true,
              modifiedOn: now,
              name: displayName,
              onboardingSource: "MESSAGING_ONBOARDING",
              phone: currentMessagingUser.phone,
              platformRole: "OWNER",
              storeId: claimScope.storeId,
              stores: currentMessagingUser.stores,
              tenantId: claimScope.tenantId,
            });
          }
          transaction.update(messagingUserDoc.ref, {
            active: false,
            claimToken: null,
            claimTokenExpiresAt: null,
            claimedAt: now,
            claimedByEmail: googleEmail,
            claimedByUserId: googleUserId,
            deactivatedReason: "Account claimed via Google OAuth",
            modifiedOn: now,
          });
          const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(claimScope.tenantDocumentId);
          transaction.update(tenantRef, { email: googleEmail, modifiedOn: now });
          const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(claimScope.storeDocumentId);
          transaction.update(storeRef, { email: googleEmail, modifiedOn: now });
        },
      });
    } catch (error) {
      await compensateFailedClaim({ messagingUserRef: messagingUserDoc.ref, operationId, request });
      throw error;
    }
    const claimScope = claimedMessagingUser.claimAccountScope;
    await revalidateClaimAccountPublicCache(claimScope, request);

    return claimJson({
      success: true,
      mode: "google",
      tenantId: claimScope.tenantId,
      storeId: claimScope.storeId,
      message: "Account linked successfully! You can now manage your business.",
    });
  } catch (error) {
    if (error instanceof ClaimTokenUnavailableError) {
      return claimFailure(error.message, error.status);
    }

    logAuthFailure("claim_account_unexpected_error", error, buildClaimFailureLogContext(request));

    return claimJson({ error: "Internal error" }, { status: 500 });
  }
}
