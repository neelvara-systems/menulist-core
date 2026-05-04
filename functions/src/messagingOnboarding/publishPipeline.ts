/**
 * Publish Pipeline — Atomic Store/Tenant/User/Project Creation
 *
 * Reuses the transaction pattern from create-subscription/route.ts
 * but adapted for messaging onboarding (no Razorpay, no NextAuth, phone-based identity).
 *
 * NOTE: If reviving this code, use the centralized utility at
 * src/lib/onboarding/createTenantStore.ts (createTenantStoreInTransaction)
 * instead of the inline tenant/store creation below. You'll need to create
 * a Cloud Functions-compatible copy in functions/src/onboarding/.
 *
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §8.2
 */

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import { DB_COLLECTIONS } from "../constants/database";
import { admin, firestoreAdmin } from "../firebaseAdmin";
import { resolveBusinessCategory } from "../sharedData/businessTypes";
import { createDefaultRoles } from "../sharedData/defaultRoles";
import { resolveBusinessDayEndTime } from "../utils/businessDay";
import { computeSchedulerHour } from "../utils/schedulerHour";
import {
  MessagingOnboardingSession,
  PublishedResult,
} from "../types/messagingOnboarding.types";
import { MESSAGES, TIMING } from "./constants";
import { inferCountryFromPhone } from "./countryData";
import { logOnboardingEvent, maskUserId } from "./eventLogger";
import { getProviderAdapter } from "./providers/providerRegistry";

const logger = functions.logger;
const db = firestoreAdmin;
const sessionsCol = DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS;
const CANONICAL_SOURCE_LANGUAGE = "en";

function normalizeProjectLanguages(languages: any): string[] {
  const collected = Array.isArray(languages)
    ? languages.map((language: any) => typeof language === "string" ? language : language?.code)
    : [];
  const deduped = Array.from(new Set(collected.map((language) => String(language || "").trim().toLowerCase()).filter(Boolean)));

  return [
    CANONICAL_SOURCE_LANGUAGE,
    ...deduped.filter((language) => language !== CANONICAL_SOURCE_LANGUAGE),
  ];
}

function getDetectedDefaultLanguage(languages: any): string {
  if (Array.isArray(languages)) {
    const primary = languages.find((language: any) => language?.isPrimary)?.code;
    if (primary) return String(primary).trim().toLowerCase();

    const firstCode = typeof languages[0] === "string" ? languages[0] : languages[0]?.code;
    if (firstCode) return String(firstCode).trim().toLowerCase();
  }
  return CANONICAL_SOURCE_LANGUAGE;
}

// ═══════════════════════════════════════════════════════════════
// HELPER IMPORTS
// getBusinessCategory → from ../sharedData/businessTypes.ts (copy of src/data/shared/businessTypes.ts)
// createDefaultRoles → from ../sharedData/defaultRoles.ts (copy of src/data/shared/defaultRoles.ts)
// inferCountryFromPhone → from ./countryData.ts (uses ../sharedData/countryData.ts)
// ═══════════════════════════════════════════════════════════════

/** Generate placeholder email from phone number (§8.2.2) */
function generatePlaceholderEmail(phoneDisplay: string): string {
  const cleaned = phoneDisplay.replace(/[^0-9]/g, "");
  return `${cleaned}@msg.menulist.ai`;
}

// ═══════════════════════════════════════════════════════════════
// PUBLISH EXECUTION
// ═══════════════════════════════════════════════════════════════

export interface PublishParams {
  sessionId: string;
  businessName: string;
  businessType?: string;
  phone?: string;
  address?: string;
}

/**
 * Execute the publish pipeline (Cloud Functions version).
 *
 * ⚠️ DEAD CODE — NOT CURRENTLY CALLED.
 * Per ADR-10, publish executes in the Next.js API route directly:
 *   src/app/api/msg-preview/[sessionId]/approve/route.ts → executePublishFromApiRoute()
 *
 * This CF version exists as a reference/backup but is MISSING:
 *   - timeSlotPresets (approve route has it)
 *   - getDefaultTimeSlotPresets import (approve route has it)
 *
 * If you need to call publish from a Cloud Function context in the future,
 * sync this function with executePublishFromApiRoute() first.
 *
 * @returns Published result with tenant/store/project IDs
 */
export async function executePublish(
  params: PublishParams,
): Promise<PublishedResult> {
  const { sessionId, businessName } = params;
  const sessionRef = db.collection(sessionsCol).doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    throw new Error("Session not found");
  }

  const session = sessionDoc.data() as MessagingOnboardingSession;
  const userMasked = maskUserId(session.providerUserId);

  // Publish validation gate (min items)
  const menuData = session.extractedMenuData;
  const extractedLanguageCodes = normalizeProjectLanguages(menuData?.languages);
  const detectedDefaultLanguage = getDetectedDefaultLanguage(menuData?.languages);
  if (!menuData?.categories?.length || !menuData?.items?.length) {
    throw new Error("Insufficient menu data for publishing");
  }

  // Check at least 1 item with a price
  const hasPrice = menuData.items.some(
    (item: any) => item.price && item.price !== "" && item.price !== "0",
  );
  if (!hasPrice && menuData.items.length > 0) {
    // Allow publish even without prices — some menus don't have prices
    logger.warn("[PublishPipeline] Publishing without priced items", {
      sessionId,
      itemCount: menuData.items.length,
    });
  }

  logOnboardingEvent({
    sessionId,
    provider: session.provider,
    eventType: "PUBLISH_STARTED",
    sessionState: "PUBLISHING",
    userIdMasked: userMasked,
    metadata: {
      businessName,
      categoryCount: menuData.categories.length,
      itemCount: menuData.items.length,
    },
    sessionCreatedAt: session.createdAt,
  });

  // Determine business type and category
  const finalBusinessType =
    params.businessType || session.detectedBusinessType || "Restaurant";
  const finalBusinessCategory = resolveBusinessCategory(finalBusinessType) || "specialty";

  // Infer country/currency/timezone from phone (uses sharedData/countryData.ts — 252 countries)
  const phoneDisplay = session.providerDisplayId;
  const countryInfo = inferCountryFromPhone(phoneDisplay);
  const country = countryInfo.code;
  const currencyInfo = { code: countryInfo.currencyCode, symbol: countryInfo.currencySymbol, timezone: countryInfo.timeZone };

  // Generate placeholder email
  const generatedEmail = generatePlaceholderEmail(phoneDisplay);

  // Execute atomic transaction
  const result = await db.runTransaction(async (transaction) => {
    // Read platform summary (with lock)
    const platformSummaryRef = db.collection("platformSummary").doc("summary");
    const platformSummary = await transaction.get(platformSummaryRef);

    if (!platformSummary.exists) {
      throw new Error("Platform summary not found");
    }

    const summaryData = platformSummary.data()!;
    const newTenantId = (summaryData?.tenants?.count || 0) + 1;
    const newStoreId = (summaryData?.stores?.count || 0) + 1;
    const now = admin.firestore.Timestamp.now();
    const storeName = "Main Store";
    const storeKey = storeName.toLowerCase().replaceAll(" ", "_");
    const tenantKey = businessName.toLowerCase().replaceAll(" ", "_");
    const businessDayEndTime = resolveBusinessDayEndTime(finalBusinessType, undefined, finalBusinessCategory);
    const schedulerHour = computeSchedulerHour(currencyInfo.timezone, businessDayEndTime);

    // Create Tenant (§8.2.1)
    const tenantRef = db.collection("tenants").doc(String(newTenantId));
    transaction.set(tenantRef, {
      name: businessName,
      businessType: finalBusinessType,
      businessIndustry: "",
      email: generatedEmail,
      active: true,
      verified: false,
      storesList: [
        {
          storeId: newStoreId,
          name: storeName,
          tenantName: businessName,
          isMaster: true,
        },
      ],
      tenantId: newTenantId,
      tenantKey,
      createdOn: now,
      modifiedOn: now,
    });

    // Create Store (§8.2.1)
    const storeRef = db.collection("stores").doc(String(newStoreId));
    const defaultRoles = createDefaultRoles(newStoreId, generatedEmail);

    transaction.set(storeRef, {
      name: storeName,
      tenantName: businessName,
      businessType: finalBusinessType,
      businessCategory: finalBusinessCategory,
      businessIndustry: "",
      email: generatedEmail,
      active: true,
      verified: false,
      tenantId: newTenantId,
      storeId: newStoreId,
      storeKey,
      roles: defaultRoles,
      isMaster: true,
      onboardingSource: "messaging",
      activationDeadline: Timestamp.fromMillis(
        Date.now() + TIMING.ACTIVATION_DEADLINE_MS,
      ),
      phoneNumber: phoneDisplay,
      activeLanguages: extractedLanguageCodes,
      defaultLanguage: detectedDefaultLanguage,
      country,
      currencyCode: currencyInfo.code,
      currencySymbol: currencyInfo.symbol,
      timeZone: currencyInfo.timezone,
      businessDayEndTime,
      schedulerHour,
      logo: "",
      createdOn: now,
      modifiedOn: now,
    });

    // Sync to storesSummary
    const storesSummaryRef = db
      .collection("platformSummary")
      .doc("storesSummary");
    transaction.set(
      storesSummaryRef,
      {
        lastUpdated: now,
        [`stores.${newStoreId}`]: {
          tId: newTenantId,
          businessType: finalBusinessType,
          businessCategory: finalBusinessCategory,
          active: true,
          name: storeName,
          tenantName: businessName,
          timeZone: currencyInfo.timezone,
          businessDayEndTime,
          schedulerHour,
        },
      },
      { merge: true },
    );

    // Create User (§8.2.1 — CREATED, not updated)
    const userRef = db.collection("users").doc();
    const userId = userRef.id;

    transaction.set(userRef, {
      phone: phoneDisplay,
      email: generatedEmail,
      name: businessName,
      tenantId: newTenantId,
      storeId: newStoreId,
      stores: [
        {
          storeId: newStoreId,
          name: storeName,
          role: "owner",
        },
      ],
      profileImage: "",
      active: true,
      provider: session.provider,
      providerUserId: session.providerUserId,
      createdVia: "messaging-onboarding",
      onboardingSource: "messaging",
      createdOn: now,
      modifiedOn: now,
    });

    // Update Platform Summary Counts
    transaction.update(platformSummaryRef, {
      "tenants.count": newTenantId,
      "stores.count": newStoreId,
    });

    // Create Project with extracted menu data
    const projectId = `${newTenantId}-default-${newStoreId}`;
    const projectRef = db.collection("projects").doc(projectId);

    // Build files array from extracted data
    const files = session.uploads
      .filter((u) => session.validMenuFiles.includes(u.id))
      .map((upload, index) => ({
        uid: upload.id,
        name: upload.id,
        size: upload.fileSize,
        type: upload.mimeType,
        url: upload.storageUrl,
        extractedData: index === 0 ? menuData : null, // Combined data on first file
      }));

    transaction.set(projectRef, {
      projectId,
      tenantId: newTenantId,
      storeId: newStoreId,
      files,
      languages: extractedLanguageCodes,
      defaultLanguage: detectedDefaultLanguage,
      active: true,
      deleted: false,
      createdOn: now,
      modifiedOn: now,
    });

    return {
      tenantId: newTenantId,
      storeId: newStoreId,
      projectId,
      userId,
    };
  });

  // Build URLs
  const publicUrl = `https://menulist.ai/menu/${result.storeId}`;
  const dashboardUrl = "https://menulist.ai/login";

  const publishedResult: PublishedResult = {
    tenantId: result.tenantId,
    storeId: result.storeId,
    projectId: result.projectId,
    userId: result.userId,
    publicUrl,
    dashboardUrl,
  };

  // Update session as LIVE
  await sessionRef.update({
    state: "LIVE",
    stateHistory: FieldValue.arrayUnion({
      state: "LIVE",
      timestamp: Timestamp.now(),
      reason: "Published successfully",
    }),
    publishedResult,
    publishedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  logOnboardingEvent({
    sessionId,
    provider: session.provider,
    eventType: "PUBLISH_COMPLETED",
    sessionState: "LIVE",
    userIdMasked: userMasked,
    metadata: {
      tenantId: result.tenantId,
      storeId: result.storeId,
      projectId: result.projectId,
    },
    sessionCreatedAt: session.createdAt,
  });

  // Send publish confirmation via provider
  const adapter = getProviderAdapter(session.provider);
  try {
    await adapter.sendLinkMessage(
      session.providerUserId,
      MESSAGES.PUBLISHED(publicUrl, dashboardUrl),
      publicUrl,
      "View Your Menu",
    );

    logOnboardingEvent({
      sessionId,
      provider: session.provider,
      eventType: "MESSAGE_SENT",
      sessionState: "LIVE",
      userIdMasked: userMasked,
      metadata: { trigger: "publish_confirmation" },
      sessionCreatedAt: session.createdAt,
    });
  } catch (err) {
    logger.error("[PublishPipeline] Failed to send confirmation", {
      sessionId,
      error: (err as Error).message,
    });
  }

  logger.info("[PublishPipeline] Published successfully", {
    sessionId,
    tenantId: result.tenantId,
    storeId: result.storeId,
  });

  return publishedResult;
}
