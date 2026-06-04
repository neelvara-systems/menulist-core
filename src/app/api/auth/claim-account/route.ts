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
 * Token never expires (256-bit random, brute force impossible).
 *
 * @see __docs__/auth/README.md — Messaging Onboarding Login Flow
 */

import { DB_COLLECTIONS } from "@constant/database";
import { getGeneratedEmail } from "@constant/urls";
import { authOptions } from "@lib/auth";
import { isInternalAuthEmail } from "@lib/auth/loginIdentifiers";
import { admin, authAdmin } from "@lib/firebase/firebaseAdmin";
import { normalizePhoneNumberForStorage } from "@lib/phone/phoneNumber";
import { getEmailValidationError, validateEmail } from "@lib/validation/emailDomainValidator";
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

const ClaimWithWhatsappPhoneSchema = z.object({
  claimToken: z.string().min(20),
  password: z.string().min(6),
  name: z.string().max(100).optional(),
  useWhatsappPhone: z.literal(true),
});

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
    const { claimToken, email, password, useWhatsappPhone } = body;

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
        return NextResponse.json(
          { error: "Invalid input", details: validation.error.flatten() },
          { status: 400 },
        );
      }

      if (!phoneUsername) {
        return NextResponse.json({ error: "No WhatsApp phone number found for this claim" }, { status: 400 });
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

      const batch = db.batch();

      batch.update(messagingUserDoc.ref, {
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

      await batch.commit();

      await linkClaimedSubscriptions({
        email: loginEmail,
        name: displayName,
        now,
        storeId: Number(messagingUser.storeId),
        tenantId: Number(messagingUser.tenantId),
        userDocId: messagingUserDoc.id,
      });

      await authAdmin.setCustomUserClaims(firebaseUid, {
        role: "owner",
        platformRole: "OWNER",
        tenantId: String(messagingUser.tenantId),
        storeId: String(messagingUser.storeId),
        uId: messagingUserDoc.id,
        admin: true,
        storeIds: [String(messagingUser.storeId)],
      });

      console.log(`[claim-account] ✅ WhatsApp phone setup: ${phoneUsername.slice(-4)} → tenant ${messagingUser.tenantId}`);

      return NextResponse.json({
        success: true,
        mode: "whatsapp-phone",
        tenantId: messagingUser.tenantId,
        storeId: messagingUser.storeId,
        message: "Account created. You can now log in with your WhatsApp number and passcode.",
      });
    }

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
      const emailValidation = validateEmail(lowerEmail);
      if (!emailValidation.valid) {
        return NextResponse.json({
          error: getEmailValidationError(lowerEmail),
        }, { status: 400 });
      }

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
        countryCode: normalizedPhone.countryCode,
        dialCode: normalizedPhone.dialCode,
        phone: normalizedPhone.phone || messagingUser.phone,
        phoneNumber: normalizedPhone.phoneNumber || messagingUser.phoneNumber,
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

      // Update tenant & store email
      const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(String(messagingUser.tenantId));
      batch.update(tenantRef, { email: lowerEmail, modifiedOn: now });

      const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(messagingUser.storeId));
      batch.update(storeRef, { email: lowerEmail, modifiedOn: now });

      await batch.commit();

      await linkClaimedSubscriptions({
        email: lowerEmail,
        name: name || messagingUser.name,
        now,
        storeId: Number(messagingUser.storeId),
        tenantId: Number(messagingUser.tenantId),
        userDocId: messagingUserDoc.id,
      });

      // Set custom claims on Firebase Auth
      await authAdmin.setCustomUserClaims(firebaseUid, {
        role: "owner",
        platformRole: "OWNER",
        tenantId: String(messagingUser.tenantId),
        storeId: String(messagingUser.storeId),
        uId: messagingUserDoc.id,
        admin: true,
        storeIds: [String(messagingUser.storeId)],
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

    await linkClaimedSubscriptions({
      email: googleEmail,
      name: session.user.name || googleEmail.split("@")[0],
      now,
      storeId: Number(messagingUser.storeId),
      tenantId: Number(messagingUser.tenantId),
      userDocId: googleUserId,
    });

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
