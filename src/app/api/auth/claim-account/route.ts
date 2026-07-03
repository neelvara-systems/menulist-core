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
 * Token is high-entropy and one-time use. If `claimTokenExpiresAt` is present,
 * the claim link expires at that timestamp.
 *
 * @see __docs__/auth/README.md — Messaging Onboarding Login Flow
 */

import { DB_COLLECTIONS } from "@constant/database";
import { getGeneratedEmail } from "@constant/urls";
import { authOptions } from "@lib/auth";
import { getBoundedAuthStringContext, logAuthFailure } from "@lib/auth/authDiagnostics";
import { isInternalAuthEmail } from "@lib/auth/loginIdentifiers";
import { admin, authAdmin } from "@lib/firebase/firebaseAdmin";
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

const db = admin.firestore();

const ClaimWithPasswordSchema = z.object({
  claimToken: z.string().min(20).max(256),
  email: z.string().email().max(180),
  password: z.string().min(6).max(128),
  name: z.string().max(100).optional(),
});

const ClaimWithWhatsappPhoneSchema = z.object({
  claimToken: z.string().min(20).max(256),
  password: z.string().min(6).max(128),
  name: z.string().max(100).optional(),
  useWhatsappPhone: z.literal(true),
});
const CLAIM_ACCOUNT_MAX_BODY_BYTES = 16 * 1024;

async function linkClaimedSubscriptions(params: {
  email: string;
  name?: string;
  now: FirebaseFirestore.Timestamp;
  storeId: number;
  tenantId: number;
  userDocId: string;
}) {
  const subscriptionsSnapshot = await db
    .collection(DB_COLLECTIONS.SUBSCRIPTIONS)
    .where("tenantId", "==", params.tenantId)
    .where("storeId", "==", params.storeId)
    .get();

  if (subscriptionsSnapshot.empty) return;

  const batch = db.batch();
  subscriptionsSnapshot.docs.forEach((subscriptionDoc) => {
    batch.update(subscriptionDoc.ref, {
      userId: params.userDocId,
      email: params.email,
      ...(params.name ? { name: params.name } : {}),
      modifiedOn: params.now,
    });
  });
  await batch.commit();
}

const getMessagingPhone = (messagingUser: FirebaseFirestore.DocumentData) => (
  String(messagingUser.phone || messagingUser.providerDisplayId || "").trim()
);

const claimFailure = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

class ClaimTokenUnavailableError extends Error {
  status: number;

  constructor(message = "Unable to complete account claim.", status = 409) {
    super(message);
    this.name = "ClaimTokenUnavailableError";
    this.status = status;
  }
}

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
    return firebaseUser.uid;
  } catch (fbError: any) {
    if (fbError?.code !== "auth/email-already-exists" || !params.updateIfExists) {
      throw fbError;
    }

    const existingUser = await authAdmin.getUserByEmail(params.email);
    await authAdmin.updateUser(existingUser.uid, {
      displayName: params.displayName,
      emailVerified: params.emailVerified,
      password: params.password,
    });
    return existingUser.uid;
  }
};

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

const assertMessagingUserClaimIsAvailable = (
  data: FirebaseFirestore.DocumentData | undefined,
  claimToken: string,
): FirebaseFirestore.DocumentData => {
  if (!data) {
    throw new ClaimTokenUnavailableError("Unable to complete account claim.", 404);
  }

  if (data.claimToken !== claimToken) {
    throw new ClaimTokenUnavailableError();
  }

  const claimTokenExpiresAtMs = timestampLikeToMillis(data.claimTokenExpiresAt);
  if (claimTokenExpiresAtMs && claimTokenExpiresAtMs <= Date.now()) {
    throw new ClaimTokenUnavailableError("This claim link has expired.", 410);
  }

  if (!data.tenantId || !data.storeId) {
    throw new ClaimTokenUnavailableError("Unable to complete account claim.", 400);
  }

  return data;
};

const runClaimAccountTransaction = async (params: {
  apply: (
    transaction: FirebaseFirestore.Transaction,
    currentMessagingUser: FirebaseFirestore.DocumentData,
  ) => Promise<void> | void;
  claimToken: string;
  messagingUserRef: FirebaseFirestore.DocumentReference;
}): Promise<FirebaseFirestore.DocumentData> => {
  return db.runTransaction(async (transaction) => {
    const latestMessagingUserDoc = await transaction.get(params.messagingUserRef);
    const currentMessagingUser = assertMessagingUserClaimIsAvailable(
      latestMessagingUserDoc.data(),
      params.claimToken,
    );

    await params.apply(transaction, currentMessagingUser);
    return currentMessagingUser;
  });
};

export async function POST(request: NextRequest) {
  try {
    // 🔒 RATE LIMITING: Prevent brute force account claim attempts
    const { checkRateLimit } = await import('@lib/rateLimit');
    const { getRateLimitForFeature } = await import('@lib/rateLimit/configs');
    const ip = getClientIp(request);
    const ipHash = hashPublicRateLimitValue(ip);
    const rl = await checkRateLimit({ key: `auth-claim:${ipHash}`, ...getRateLimitForFeature('AUTH_SENSITIVE') });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
    }

    const bodyResult = await readBoundedJsonBody(request, CLAIM_ACCOUNT_MAX_BODY_BYTES, {
      invalidJsonMessage: "Unable to complete account claim.",
    });
    if (bodyResult.ok === false) return bodyResult.response;
    const body = (
      bodyResult.data && typeof bodyResult.data === "object" && !Array.isArray(bodyResult.data)
    )
      ? bodyResult.data as Record<string, any>
      : {};
    const { claimToken, email, password, useWhatsappPhone } = body;

    if (!claimToken || typeof claimToken !== "string" || claimToken.length < 20 || claimToken.length > 256) {
      logger.security("Input Validation Failed - Claim Account", {
        ...buildAnonymousSecurityContext(request),
        reason: "invalid_claim_token",
      }, "medium");

      return claimFailure("Unable to complete account claim.");
    }

    // Find the messaging-onboarded user doc by claimToken
    const messagingUserQuery = await db
      .collection(DB_COLLECTIONS.USERS)
      .where("claimToken", "==", claimToken)
      .limit(1)
      .get();

    if (messagingUserQuery.empty) {
      logger.security("Claim Token Not Found", {
        ...buildAnonymousSecurityContext(request),
        ...getBoundedAuthStringContext("claimToken", claimToken),
      }, "medium");

      return claimFailure("Unable to complete account claim.", 404);
    }

    const messagingUserDoc = messagingUserQuery.docs[0];
    const messagingUser = messagingUserDoc.data();
    const now = admin.firestore.Timestamp.now();

    const claimTokenExpiresAtMs = timestampLikeToMillis(messagingUser.claimTokenExpiresAt);
    if (claimTokenExpiresAtMs && claimTokenExpiresAtMs <= Date.now()) {
      await messagingUserDoc.ref.update({
        claimToken: null,
        claimTokenExpiresAt: null,
        claimTokenExpiredAt: now,
        modifiedOn: now,
      });
      return claimFailure("This claim link has expired.", 410);
    }

    // Check the messaging user actually has a tenant/store
    if (!messagingUser.tenantId || !messagingUser.storeId) {
      return claimFailure("Unable to complete account claim.");
    }

    const messagingPhone = getMessagingPhone(messagingUser);
    const normalizedPhone = normalizePhoneNumberForStorage({
      countryCode: messagingUser.countryCode,
      dialCode: messagingUser.dialCode,
      phone: messagingUser.phone,
      phoneNumber: messagingUser.phoneNumber || messagingPhone,
    });
    const phoneUsername = normalizedPhone.phoneUsername;

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

      if (!phoneUsername) {
        return claimFailure("Unable to complete account claim.");
      }

      const { password: cleanPassword, name } = validation.data;
      const existingEmail = String(messagingUser.email || "").toLowerCase().trim();
      const loginEmail = isInternalAuthEmail(existingEmail)
        ? existingEmail
        : getGeneratedEmail(messagingPhone);
      const displayName = name || messagingUser.name || phoneUsername;
      const firebaseUid = await createOrUpdateFirebasePasswordUser({
        displayName,
        email: loginEmail,
        emailVerified: true,
        password: cleanPassword,
        updateIfExists: true,
      });

      const claimedMessagingUser = await runClaimAccountTransaction({
        claimToken,
        messagingUserRef: messagingUserDoc.ref,
        apply: (transaction) => {
          transaction.update(messagingUserDoc.ref, {
            email: loginEmail,
            name: displayName,
            countryCode: normalizedPhone.countryCode,
            dialCode: normalizedPhone.dialCode,
            phone: normalizedPhone.phone,
            phoneNumber: normalizedPhone.phoneNumber,
            phoneUsername,
            phoneLoginEnabled: true,
            isVerified: true,
            active: true,
            claimToken: null,
            claimTokenExpiresAt: null,
            claimedAt: now,
            claimedVia: "whatsapp-phone-passcode",
            firebaseUid,
            modifiedOn: now,
          });
        },
      });

      await linkClaimedSubscriptions({
        email: loginEmail,
        name: displayName,
        now,
        storeId: Number(claimedMessagingUser.storeId),
        tenantId: Number(claimedMessagingUser.tenantId),
        userDocId: messagingUserDoc.id,
      });

      await authAdmin.setCustomUserClaims(firebaseUid, {
        role: "owner",
        platformRole: "OWNER",
        tenantId: String(claimedMessagingUser.tenantId),
        storeId: String(claimedMessagingUser.storeId),
        uId: messagingUserDoc.id,
        admin: true,
        storeIds: [String(claimedMessagingUser.storeId)],
      });

      return NextResponse.json({
        success: true,
        mode: "whatsapp-phone",
        tenantId: claimedMessagingUser.tenantId,
        storeId: claimedMessagingUser.storeId,
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

      // Check if email already exists in Firestore users
      const existingUserQuery = await db
        .collection(DB_COLLECTIONS.USERS)
        .where("email", "==", lowerEmail)
        .limit(1)
        .get();

      if (!existingUserQuery.empty) {
        return claimFailure("Unable to complete account claim.", 409);
      }

      let firebaseUid: string;
      try {
        firebaseUid = await createOrUpdateFirebasePasswordUser({
          displayName: name || messagingUser.name || lowerEmail.split("@")[0],
          email: lowerEmail,
          emailVerified: true,
          password: cleanPassword,
        });
      } catch (fbError: any) {
        if (fbError.code === "auth/email-already-exists") {
          return claimFailure("Unable to complete account claim.", 409);
        }
        throw fbError;
      }

      const claimedMessagingUser = await runClaimAccountTransaction({
        claimToken,
        messagingUserRef: messagingUserDoc.ref,
        apply: (transaction, currentMessagingUser) => {
          transaction.update(messagingUserDoc.ref, {
            email: lowerEmail,
            name: name || currentMessagingUser.name,
            countryCode: normalizedPhone.countryCode,
            dialCode: normalizedPhone.dialCode,
            phone: normalizedPhone.phone || currentMessagingUser.phone,
            phoneNumber: normalizedPhone.phoneNumber || currentMessagingUser.phoneNumber,
            phoneUsername: phoneUsername || undefined,
            phoneLoginEnabled: Boolean(phoneUsername),
            isVerified: true,
            active: true,
            claimToken: null, // One-time use — clear token
            claimTokenExpiresAt: null,
            claimedAt: now,
            claimedVia: "email-password",
            firebaseUid,
            modifiedOn: now,
          });

          const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(String(currentMessagingUser.tenantId));
          transaction.update(tenantRef, { email: lowerEmail, modifiedOn: now });

          const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(currentMessagingUser.storeId));
          transaction.update(storeRef, { email: lowerEmail, modifiedOn: now });
        },
      });
      await revalidateMenuCache(claimedMessagingUser.storeId, { tId: claimedMessagingUser.tenantId });

      await linkClaimedSubscriptions({
        email: lowerEmail,
        name: name || claimedMessagingUser.name,
        now,
        storeId: Number(claimedMessagingUser.storeId),
        tenantId: Number(claimedMessagingUser.tenantId),
        userDocId: messagingUserDoc.id,
      });

      // Set custom claims on Firebase Auth
      await authAdmin.setCustomUserClaims(firebaseUid, {
        role: "owner",
        platformRole: "OWNER",
        tenantId: String(claimedMessagingUser.tenantId),
        storeId: String(claimedMessagingUser.storeId),
        uId: messagingUserDoc.id,
        admin: true,
        storeIds: [String(claimedMessagingUser.storeId)],
      });

      return NextResponse.json({
        success: true,
        mode: "email-password",
        tenantId: claimedMessagingUser.tenantId,
        storeId: claimedMessagingUser.storeId,
        message: "Account created! You can now log in with your email and password.",
      });
    }

    // ━━━ MODE 1: Google OAuth (requires active NextAuth session) ━━━
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !session?.user?.id) {
      return claimFailure("Unable to complete account claim.", 401);
    }

    const googleEmail = session.user.email;
    const googleUserId = session.user.id;

    const googleUserRef = db.collection(DB_COLLECTIONS.USERS).doc(googleUserId);

    const claimedMessagingUser = await runClaimAccountTransaction({
      claimToken,
      messagingUserRef: messagingUserDoc.ref,
      apply: async (transaction, currentMessagingUser) => {
        const googleUserDoc = await transaction.get(googleUserRef);
        if (googleUserDoc.exists && googleUserDoc.data()?.tenantId) {
          throw new ClaimTokenUnavailableError("Unable to complete account claim.", 409);
        }

        if (googleUserDoc.exists) {
          transaction.update(googleUserRef, {
            tenantId: currentMessagingUser.tenantId,
            storeId: currentMessagingUser.storeId,
            stores: currentMessagingUser.stores,
            platformRole: currentMessagingUser.platformRole || "OWNER",
            phone: currentMessagingUser.phone,
            isVerified: true,
            active: true,
            onboardingSource: "MESSAGING_ONBOARDING",
            claimedFrom: messagingUserDoc.id,
            claimedAt: now,
            modifiedOn: now,
          });
        } else {
          transaction.set(googleUserRef, {
            email: googleEmail,
            name: session.user.name || googleEmail.split("@")[0],
            image: (session.user as any).image || "",
            tenantId: currentMessagingUser.tenantId,
            storeId: currentMessagingUser.storeId,
            stores: currentMessagingUser.stores,
            platformRole: "OWNER",
            phone: currentMessagingUser.phone,
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

        transaction.update(messagingUserDoc.ref, {
          active: false,
          claimToken: null,
          claimTokenExpiresAt: null,
          claimedByEmail: googleEmail,
          claimedByUserId: googleUserId,
          claimedAt: now,
          deactivatedReason: "Account claimed via Google OAuth",
          modifiedOn: now,
        });

        const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(String(currentMessagingUser.tenantId));
        transaction.update(tenantRef, { email: googleEmail, modifiedOn: now });

        const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(currentMessagingUser.storeId));
        transaction.update(storeRef, { email: googleEmail, modifiedOn: now });
      },
    });
    await revalidateMenuCache(claimedMessagingUser.storeId, { tId: claimedMessagingUser.tenantId });

    await linkClaimedSubscriptions({
      email: googleEmail,
      name: session.user.name || googleEmail.split("@")[0],
      now,
      storeId: Number(claimedMessagingUser.storeId),
      tenantId: Number(claimedMessagingUser.tenantId),
      userDocId: googleUserId,
    });

    return NextResponse.json({
      success: true,
      mode: "google",
      tenantId: claimedMessagingUser.tenantId,
      storeId: claimedMessagingUser.storeId,
      message: "Account linked successfully! You can now manage your business.",
    });
  } catch (error) {
    if (error instanceof ClaimTokenUnavailableError) {
      return claimFailure(error.message, error.status);
    }

    logAuthFailure("claim_account_unexpected_error", error, buildClaimFailureLogContext(request));

    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
