import { DB_COLLECTIONS } from "@constant/database";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { normalizePhoneNumberForStorage } from "@lib/phone/phoneNumber";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  countryCode: z.string().trim().max(8).optional(),
  dialCode: z.string().trim().max(12).optional(),
  displayEmail: z.union([
    z.string().trim().email().max(254),
    z.literal(""),
  ]).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  phoneNumber: z.string().trim().max(40).optional(),
});

export async function updateCurrentUserProfile(request: NextRequest, session: any) {
  try {
    const userId = String(session?.uId || session?.user?.id || "");
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateAPIInput(UpdateProfileSchema, body);
    if (validation.success === false) {
      logger.security("Input Validation Failed - Update Profile", {
        ...buildSecurityContext(session, request),
        endpoint: request.nextUrl.pathname,
        error: validation.error,
      }, "medium");

      return NextResponse.json({ error: "Invalid profile details" }, { status: 400 });
    }

    const data = validation.data;
    const userRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingData = userDoc.data() || {};
    const updates: Record<string, any> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.displayEmail !== undefined) updates.displayEmail = data.displayEmail.toLowerCase();

    const shouldNormalizePhone = data.phone !== undefined
      || data.phoneNumber !== undefined
      || data.countryCode !== undefined
      || data.dialCode !== undefined;

    if (shouldNormalizePhone) {
      const normalizedPhone = normalizePhoneNumberForStorage({
        countryCode: data.countryCode ?? existingData.countryCode,
        dialCode: data.dialCode ?? existingData.dialCode,
        phone: data.phone,
        phoneNumber: data.phoneNumber ?? existingData.phoneNumber ?? existingData.phone,
      });
      updates.countryCode = normalizedPhone.countryCode;
      updates.dialCode = normalizedPhone.dialCode;
      updates.phone = normalizedPhone.phone;
      updates.phoneNumber = normalizedPhone.phoneNumber;
      updates.phoneUsername = normalizedPhone.phoneUsername;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.modifiedOn = admin.firestore.Timestamp.now();

    await userRef.update(updates);

    logger.info("[update-profile] Updated profile", {
      ...buildSecurityContext(session, request),
      endpoint: request.nextUrl.pathname,
      updatedFields: Object.keys(updates),
    });

    return NextResponse.json({
      success: true,
      updated: Object.keys(updates).filter((key) => key !== "modifiedOn"),
      updates: Object.fromEntries(Object.entries(updates).filter(([key]) => key !== "modifiedOn")),
    });
  } catch (error) {
    logger.error("[update-profile] Error", error, {
      ...buildSecurityContext(session, request),
      endpoint: request.nextUrl.pathname,
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
