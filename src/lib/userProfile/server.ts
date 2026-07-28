import { DB_COLLECTIONS } from "@constant/database";
import {
  getAuthSessionLogContext,
  getBoundedAuthStringContext,
  logAuthDiagnostic,
  logAuthFailure,
} from "@lib/auth/authDiagnostics";
import { resolveCurrentSessionUserDocumentId } from "@lib/auth/currentPlatformUser";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { logger } from "@lib/monitoring/logger";
import { normalizePhoneNumberForStorage } from "@lib/phone/phoneNumber";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import {
  getBoundedSecurityRouteContext,
  getBoundedSecurityStringContext,
} from "@lib/security/securityDiagnostics";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
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

const USER_PROFILE_UPDATE_MAX_BODY_BYTES = 4 * 1024;
const USER_PROFILE_DOCUMENT_ID_MAX_LENGTH = 160;

function normalizeProfileUserDocumentId(value: unknown): string | null {
  const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";
  const userId = raw.trim();
  return userId === raw
    && userId.length > 0
    && userId.length <= USER_PROFILE_DOCUMENT_ID_MAX_LENGTH
    && isValidFirestoreDocumentId(userId)
    ? userId
    : null;
}

export async function updateCurrentUserProfile(request: NextRequest, session: any) {
  try {
    const userId = normalizeProfileUserDocumentId(resolveCurrentSessionUserDocumentId(session));
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userRateLimitHash = hashPublicRateLimitValue(userId);
    const profileWriteLimit = await checkRateLimit({
      key: `profile-update:${userRateLimitHash}`,
      ...getRateLimitForFeature("DATA_WRITE"),
    });
    if (!profileWriteLimit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const bodyResult = await readBoundedJsonBody(request, USER_PROFILE_UPDATE_MAX_BODY_BYTES, {
      invalidJsonMessage: "Invalid profile details",
      tooLargeMessage: "Request body too large",
    });
    if (bodyResult.ok === false) return bodyResult.response;

    const validation = validateAPIInput(UpdateProfileSchema, bodyResult.data);
    if (validation.success === false) {
      logger.security("Input Validation Failed - Update Profile", {
        ...getBoundedSecurityRouteContext(session, request),
        ...getBoundedSecurityStringContext("endpoint", request.nextUrl.pathname),
        ...getBoundedSecurityStringContext("validationError", validation.error),
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
    const updatedFieldNames = Object.keys(updates).filter((key) => key !== "modifiedOn");

    logAuthDiagnostic("profile_update_succeeded", {
      ...getAuthSessionLogContext(session),
      ...getBoundedAuthStringContext("endpoint", request.nextUrl.pathname),
      updatedFieldCount: updatedFieldNames.length,
      updatedName: updatedFieldNames.includes("name"),
      updatedDisplayEmail: updatedFieldNames.includes("displayEmail"),
      updatedPhone: updatedFieldNames.some((key) => key.startsWith("phone") || key === "countryCode" || key === "dialCode"),
    });

    return NextResponse.json({
      success: true,
      updated: updatedFieldNames,
      updates: Object.fromEntries(Object.entries(updates).filter(([key]) => key !== "modifiedOn")),
    });
  } catch (error) {
    logAuthFailure("profile_update_failed", error, {
      ...getAuthSessionLogContext(session),
      ...getBoundedAuthStringContext("endpoint", request.nextUrl.pathname),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
