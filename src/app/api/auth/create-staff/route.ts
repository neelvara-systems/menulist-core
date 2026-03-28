export const dynamic = 'force-dynamic';
/**
 * Create Staff User API — Server-side staff user creation
 *
 * Handles three cases (ADR: Global Email Uniqueness):
 * 1. New email → Create Firebase Auth user + Firestore user doc
 * 2. Email exists, same tenant → Add store mapping to existing user (multi-store)
 * 3. Email exists, different tenant → Reject (email belongs to another business)
 *
 * Requires: Active NextAuth session with owner/manager role.
 *
 * @see __docs__/auth/ADR-email-uniqueness-strategy.md
 * @see __docs__/auth/README.md — Staff User Creation
 */

import { DB_COLLECTIONS } from "@constant/database";
import { authOptions } from "@lib/auth";
import { admin, authAdmin } from "@lib/firebase/firebaseAdmin";
import { validateAPIInput } from "@lib/security/inputValidation";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const db = admin.firestore();

const CreateStaffSchema = z.object({
  email: z.string().email().transform(v => v.toLowerCase().trim()),
  name: z.string().optional(),
  tenantId: z.number().int().positive(),
  storeId: z.number().int().positive(),
  storeName: z.string().optional(),
  role: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 🔒 RATE LIMITING: Prevent abuse of staff creation
    const { checkRateLimit } = await import('@lib/rateLimit');
    const { getRateLimitForFeature } = await import('@lib/rateLimit/configs');
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await checkRateLimit({ key: `auth-staff:${ip}`, ...getRateLimitForFeature('AUTH_SENSITIVE') });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
    }

    // Require active session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateAPIInput(CreateStaffSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { email, name, tenantId, storeId, storeName, role } = validation.data;

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Check if email already exists in Firestore users
    // ═══════════════════════════════════════════════════════════════
    const existingUserQuery = await db
      .collection(DB_COLLECTIONS.USERS)
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!existingUserQuery.empty) {
      const existingUser = existingUserQuery.docs[0];
      const existingData = existingUser.data();

      // Case 2: Same tenant → add store mapping (multi-store staff)
      if (existingData.tenantId === tenantId) {
        const currentStores: any[] = existingData.stores || [];
        const alreadyHasStore = currentStores.some((s: any) => s.storeId === storeId);

        if (alreadyHasStore) {
          return NextResponse.json({
            error: "This user is already assigned to this store",
            code: "ALREADY_ASSIGNED",
          }, { status: 409 });
        }

        // Add new store mapping
        const newStoreMapping = {
          storeId,
          name: storeName || `Store ${storeId}`,
          role: role || "staff",
        };

        const updatedStores = [...currentStores, newStoreMapping];
        const currentStoreIds: number[] = existingData.storeIds || [];
        const updatedStoreIds = Array.from(new Set([...currentStoreIds, storeId]));

        await existingUser.ref.update({
          stores: updatedStores,
          storeIds: updatedStoreIds,
          modifiedOn: admin.firestore.Timestamp.now(),
        });

        console.log(`[create-staff] Added store ${storeId} to existing user ${email} (tenant ${tenantId})`);

        return NextResponse.json({
          success: true,
          mode: "existing_user_added_to_store",
          userId: existingUser.id,
          email,
          message: "Existing staff member added to this store.",
        });
      }

      // Case 3: Different tenant → reject
      return NextResponse.json({
        error: "This email is registered with another business. Staff can only belong to one business.",
        code: "EMAIL_OTHER_TENANT",
      }, { status: 409 });
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: New user — Create Firebase Auth account
    // ═══════════════════════════════════════════════════════════════
    const tempPassword = randomBytes(24).toString("base64url");

    let firebaseUid: string;
    try {
      const firebaseUser = await authAdmin.createUser({
        email,
        password: tempPassword,
        displayName: name || email.split("@")[0],
        emailVerified: false,
      });
      firebaseUid = firebaseUser.uid;
    } catch (fbError: any) {
      if (fbError.code === "auth/email-already-exists") {
        // Firebase Auth user exists but no Firestore doc — get existing UID
        try {
          const existingFbUser = await authAdmin.getUserByEmail(email);
          firebaseUid = existingFbUser.uid;
        } catch {
          return NextResponse.json({
            error: "This email is already registered in the auth system",
            code: "EMAIL_EXISTS",
          }, { status: 409 });
        }
      } else if (fbError.code === "auth/invalid-email") {
        return NextResponse.json({
          error: "Invalid email address",
          code: "INVALID_EMAIL",
        }, { status: 400 });
      } else {
        throw fbError;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Create Firestore user document
    // ═══════════════════════════════════════════════════════════════
    const now = admin.firestore.Timestamp.now();
    const newUserDoc = {
      email,
      name: name || email.split("@")[0],
      isVerified: false,
      active: true,
      tenantId,
      storeId,
      stores: [{
        storeId,
        name: storeName || `Store ${storeId}`,
        role: role || "staff",
      }],
      storeIds: [storeId],
      platformRole: "USER",
      firebaseUid,
      createdVia: "staff-invite",
      createdBy: session.user.email,
      createdOn: now,
      modifiedOn: now,
    };

    const docRef = await db.collection(DB_COLLECTIONS.USERS).add(newUserDoc);

    // Generate password reset link (fire-and-forget)
    try {
      const resetLink = await authAdmin.generatePasswordResetLink(email);
      console.log(`[create-staff] Password reset link for ${email}: ${resetLink}`);
    } catch (resetError) {
      console.warn("[create-staff] Could not generate password reset link:", resetError);
    }

    console.log(`[create-staff] New staff user created: ${email} → tenant ${tenantId}, store ${storeId}`);

    return NextResponse.json({
      success: true,
      mode: "new_user_created",
      userId: docRef.id,
      uid: firebaseUid,
      email,
      message: "Staff user created. They can set their password via the login page.",
    });
  } catch (error) {
    console.error("[create-staff] Error:", (error as Error).message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
