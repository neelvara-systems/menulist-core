import countryData from "@atoms/phoneNumberInput/countryData";
import { FALLBACK_BUSINESS_TYPE, resolveStoreBusinessCategory } from "@constant/common";
import { DB_COLLECTIONS } from "@constant/database";
import { DEFAULT_PRODUCT_ID } from "@constant/product";
import { getGeneratedEmail, getMenuUrl, SIGNIN_URL } from "@constant/urls";
import { getOwnerRoleId } from "@data/defaultRoles";
import { getSuggestionValue } from "@data/shared/extractedBusinessProfile";
import { getPhoneLookupCandidates } from "@lib/auth/loginIdentifiers";
import { admin } from "@lib/firebase/firebaseAdmin";
import { CANONICAL_SOURCE_LANGUAGE, normalizeProjectLanguages } from "@lib/localization/languagePolicy";
import { getMenuDesignPresetPatch, getRecommendedMenuDesignPresets } from "@lib/menu/menuDesignPresets";
import { getBusinessAttributesWithMenuDefaults } from "@lib/obp/inferBusinessAttributesFromMenu";
import { createTenantStoreInTransaction, preCheckSubdomain } from "@lib/onboarding/createTenantStore";
import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import { STARTER_ACTIVATION_MS, STARTER_ACTIVATION_STATUS } from "@lib/onboarding/starterActivation";
import { inferPhoneCountryFromInternationalNumber, normalizePhoneNumberForStorage } from "@lib/phone/phoneNumber";
import { secureError } from "@lib/security/secureLogger";
import { slugify } from "@lib/utils/slugify";
import { DEFAULTS } from "@template/main-app/projects/b2cView/designSystem";
import crypto from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { revalidateTag } from "next/cache";

const db = admin.firestore();

export interface MessagingOnboardingPublishParams {
  businessName: string;
  businessType: string;
  phone: string;
  address: string;
  sessionData: any;
}

export interface MessagingOnboardingPublishResult {
  tenantId: number;
  storeId: number;
  projectId: string;
  publicUrl: string;
  dashboardUrl: string;
}

const getCanonicalExtractionLanguages = (languages: any): string[] => normalizeProjectLanguages(
  Array.isArray(languages)
    ? languages.map((language) => typeof language === "string" ? language : language?.code)
    : [],
);

const getDetectedDefaultLanguage = (languages: any): string => {
  if (Array.isArray(languages)) {
    const primary = languages.find((language) => language?.isPrimary)?.code;
    if (primary) return String(primary).trim().toLowerCase();

    const firstCode = typeof languages[0] === "string" ? languages[0] : languages[0]?.code;
    if (firstCode) return String(firstCode).trim().toLowerCase();
  }
  return CANONICAL_SOURCE_LANGUAGE;
};

/**
 * Central active publish executor for messaging onboarding.
 *
 * This is called by the token-based approve API route. It intentionally owns
 * the full tenant/store/user/project/session finalization transaction so
 * retries cannot create duplicate public entities after a partial success.
 */
export async function executeMessagingOnboardingPublish(
  sessionId: string,
  params: MessagingOnboardingPublishParams,
): Promise<MessagingOnboardingPublishResult> {
  const { businessName, address, phone, sessionData } = params;
  const menuData = sessionData.extractedMenuData;
  const extractedProfile = sessionData.extractedBusinessProfile || menuData?.extractedBusinessProfile || null;
  const businessType = params.businessType ||
    sessionData.detectedBusinessType ||
    getSuggestionValue(extractedProfile?.identity?.businessType, "medium") ||
    FALLBACK_BUSINESS_TYPE;

  logPublishEvent(sessionId, sessionData, "PUBLISH_STARTED", "PUBLISHING", {
    businessName,
    businessType,
  });

  const sourcePhone = phone || sessionData.providerDisplayId || "";
  const normalizedPhone = normalizePhoneNumberForStorage({ phoneNumber: sourcePhone });

  // Infer country/currency from phone (uses frontend countryData.ts — 252 countries)
  const countryInfo = inferCountryFromPhone(normalizedPhone.phone || sourcePhone);
  const country = countryInfo.code;
  const extractedCurrencyCode = getSuggestionValue(extractedProfile?.identity?.currencyCode, "medium");
  const resolvedCurrencyInfo = extractedCurrencyCode
    ? countryData.find((entry) => entry.currencyCode === extractedCurrencyCode)
    : null;
  const currency = {
    code: extractedCurrencyCode || countryInfo.currencyCode,
    symbol: resolvedCurrencyInfo?.currencySymbol || countryInfo.currencySymbol,
    timezone: countryInfo.timeZone,
  };

  // Generate placeholder email
  const generatedEmail = getGeneratedEmail(normalizedPhone.phone || sourcePhone);

  const extractedLanguageCodes = getCanonicalExtractionLanguages(menuData?.languages);
  const detectedDefaultLanguage = getDetectedDefaultLanguage(menuData?.languages);
  const resolvedBusinessCategory = resolveStoreBusinessCategory(
    businessType,
    sessionData.detectedBusinessCategory || getSuggestionValue(extractedProfile?.identity?.businessCategory, "medium"),
  );
  const brandAccentColor = getSuggestionValue<string>(extractedProfile?.visualBrand?.brandAccentColor, "medium");
  const imageBackgroundColor = getSuggestionValue<string>(extractedProfile?.visualBrand?.imageBackgroundColor, "medium");
  const initialBusinessAttributes = getBusinessAttributesWithMenuDefaults(
    menuData,
    {
      businessCategory: resolvedBusinessCategory,
      businessType,
    },
  );
  const profileProjectName = getSuggestionValue<string>(extractedProfile?.project?.projectName, "medium");
  const projectName = typeof profileProjectName === "string" && profileProjectName.trim()
    ? profileProjectName.trim()
    : "Menu";
  const recommendedDesignPreset = getRecommendedMenuDesignPresets({
    businessType,
    businessCategory: resolvedBusinessCategory,
  })[0];
  const designPresetPatch = recommendedDesignPreset
    ? getMenuDesignPresetPatch(recommendedDesignPreset)
    : null;
  const projectConfig = {
    design: {
      menu: designPresetPatch?.menu || {
        mood: DEFAULTS.menu.mood,
        layout: DEFAULTS.menu.layout,
        showItemPrices: DEFAULTS.menu.showItemPrices,
        showImages: DEFAULTS.menu.showImages,
        showCategoryIcons: DEFAULTS.menu.showCategoryIcons,
        showCategoryTabs: DEFAULTS.menu.showCategoryTabs,
      },
      ...(designPresetPatch?.brand || brandAccentColor ? {
        brand: {
          ...(designPresetPatch?.brand || {}),
          ...(brandAccentColor ? { accentColor: brandAccentColor } : {}),
        },
      } : {}),
    },
  };

  // Story 3B: Check if user with this phone already exists (spec §Story 3B)
  // Query BEFORE transaction — if exists, we UPDATE instead of CREATE
  const phoneUsername = normalizedPhone.phoneUsername;
  let existingUserDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  for (const [field, candidates] of [
    ["phoneUsername", phoneUsername ? [phoneUsername] : []],
    ["phone", getPhoneLookupCandidates(normalizedPhone.phone || sourcePhone)],
  ] as Array<[string, string[]]>) {
    for (const candidate of candidates) {
      const existingUserQuery = await db
        .collection(DB_COLLECTIONS.USERS)
        .where(field, "==", candidate)
        .limit(1)
        .get();
      if (!existingUserQuery.empty) {
        existingUserDoc = existingUserQuery.docs[0];
        break;
      }
    }
    if (existingUserDoc) break;
  }

  // Pre-check subdomain uniqueness (must be outside transaction)
  const preCheckedSubdomain = await preCheckSubdomain(db, businessName);
  const sessionRef = db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS).doc(sessionId);

  // Atomic transaction
  const result = await db.runTransaction(async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);
    if (!sessionSnapshot.exists) {
      throw new Error("Session not found");
    }

    const currentSession = sessionSnapshot.data() || {};
    if (currentSession.state === "LIVE" && currentSession.publishedResult) {
      return {
        tenantId: currentSession.publishedResult.tenantId,
        storeId: currentSession.publishedResult.storeId,
        projectId: currentSession.publishedResult.projectId,
        userId: currentSession.publishedResult.userId,
        publicUrl: currentSession.publishedResult.publicUrl,
        dashboardUrl: currentSession.publishedResult.dashboardUrl,
        claimToken: null,
      };
    }

    if (currentSession.state !== "PUBLISHING") {
      throw new Error(`Cannot publish: session state is ${currentSession.state}`);
    }

    // Centralized tenant + store creation
    const core = await createTenantStoreInTransaction(transaction, db, {
      businessName,
      businessType,
      businessCategory: resolvedBusinessCategory,
      email: generatedEmail,
      onboardingSource: "MESSAGING_ONBOARDING",
      subdomain: { preChecked: preCheckedSubdomain },
      includeTimeSlotPresets: true,
      storeExtra: {
        activationDeadline: Timestamp.fromMillis(Date.now() + STARTER_ACTIVATION_MS),
        starterActivationStatus: STARTER_ACTIVATION_STATUS.STARTER_ACTIVE,
        starterActivatedAt: Timestamp.now(),
        countryCode: normalizedPhone.countryCode,
        dialCode: normalizedPhone.dialCode,
        phoneNumber: normalizedPhone.phoneNumber,
        phone: normalizedPhone.phone,
        addressLine: address || "",
        activeLanguages: extractedLanguageCodes,
        defaultLanguage: detectedDefaultLanguage,
        country,
        currencyCode: currency.code,
        currencySymbol: currency.symbol,
        timeZone: currency.timezone,
        logo: "",
        ...(initialBusinessAttributes ? { businessAttributes: initialBusinessAttributes } : {}),
      },
    });

    // Create or Update User (Story 3B: link to existing user doc if phone exists)
    let claimToken: string | null = null;
    let userRef;
    if (existingUserDoc) {
      userRef = existingUserDoc.ref;
      transaction.update(userRef, {
        tenantId: core.tenantId,
        storeId: core.storeId,
        stores: [{ storeId: core.storeId, name: core.storeName, role: getOwnerRoleId() }],
        provider: sessionData.provider,
        providerUserId: sessionData.providerUserId,
        countryCode: normalizedPhone.countryCode,
        dialCode: normalizedPhone.dialCode,
        phone: normalizedPhone.phone,
        phoneNumber: normalizedPhone.phoneNumber,
        phoneUsername: phoneUsername || undefined,
        phoneLoginEnabled: phoneUsername ? true : undefined,
        onboardingSource: "MESSAGING_ONBOARDING",
        modifiedOn: core.now,
      });
    } else {
      claimToken = crypto.randomBytes(32).toString("base64url");
      const claimTokenExpiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);

      userRef = db.collection(DB_COLLECTIONS.USERS).doc();
      transaction.set(userRef, {
        countryCode: normalizedPhone.countryCode,
        dialCode: normalizedPhone.dialCode,
        phone: normalizedPhone.phone,
        phoneNumber: normalizedPhone.phoneNumber,
        email: generatedEmail,
        name: businessName,
        isVerified: true,
        active: true,
        platformRole: "OWNER",
        phoneUsername: phoneUsername || undefined,
        tenantId: core.tenantId,
        storeId: core.storeId,
        stores: [{ storeId: core.storeId, name: core.storeName, role: getOwnerRoleId() }],
        profileImage: "",
        provider: sessionData.provider,
        providerUserId: sessionData.providerUserId,
        createdVia: "messaging-onboarding",
        onboardingSource: "MESSAGING_ONBOARDING",
        claimToken,
        claimTokenExpiresAt,
        createdOn: core.now,
        modifiedOn: core.now,
      });
    }

    // Create Project
    // Path: projects/{tId}/{sId}/{projectId} — matches database/projects/index.ts DAL pattern
    const projectId = `${core.tenantId}-default-${core.storeId}`;
    const projectRef = db.collection(`projects/${core.tenantId}/${core.storeId}`).doc(projectId);
    const validUploads = (sessionData.uploads || []).filter(
      (u: any) => (sessionData.validMenuFiles || []).includes(u.id),
    );
    const projectFiles = (
      Array.isArray(sessionData.extractedProjectFiles) && sessionData.extractedProjectFiles.length > 0
        ? sessionData.extractedProjectFiles
        : validUploads.map((upload: any, index: number) => ({
          uid: upload.id,
          name: upload.fileName || upload.id,
          size: upload.fileSize,
          type: upload.mimeType,
          url: upload.storageUrl,
          active: true,
          deleted: false,
          index,
          // CRITICAL: Must wrap in { data: ... } to match ExtractedData schema.
          // Dashboard editor reads extractedData.data.categories / extractedData.data.items.
          extractedData: index === 0 ? { data: menuData } : null,
        }))
    ).map((file: any, index: number) => ({
      uid: file.uid,
      name: file.name || file.uid,
      size: Number(file.size || 0),
      type: file.type || "",
      url: file.url || "",
      active: file.active !== false,
      deleted: file.deleted === true,
      index: typeof file.index === "number" ? file.index : index,
      extractedData: file.extractedData ?? null,
      ...(file.qualityScore != null ? { qualityScore: file.qualityScore } : {}),
    }));
    const projectDescription = `Digital menu for ${businessName}`;

    transaction.set(projectRef, {
      projectId,
      name: projectName,
      description: projectDescription,
      tenantId: core.tenantId,
      storeId: core.storeId,
      tId: core.tenantId,
      sId: core.storeId,
      uId: userRef.id,
      pId: DEFAULT_PRODUCT_ID,
      role: getOwnerRoleId(),
      createdBy: businessName,
      modifiedBy: businessName,
      onboardingSource: "MESSAGING_ONBOARDING",
      businessType,
      ...(resolvedBusinessCategory ? { businessCategory: resolvedBusinessCategory } : {}),
      isDefault: true,
      config: projectConfig,
      ...(imageBackgroundColor ? { aiPreferences: { image: { backgroundColor: imageBackgroundColor } } } : {}),
      files: projectFiles,
      languages: extractedLanguageCodes,
      defaultLanguage: detectedDefaultLanguage,
      active: true,
      deleted: false,
      createdOn: core.now,
      modifiedOn: core.now,
    });

    // URL Routing Architecture: Create projectsSummary with slug
    // Ensures slug-based URL routing works for messaging-onboarded stores
    const projectSlug = slugify(projectName) || "menu-1";
    const projectsSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${core.storeId}`);
    transaction.set(projectsSummaryRef, {
      lastUpdated: core.now,
      [`projects.${projectId}`]: {
        name: projectName,
        description: `Digital menu for ${businessName}`,
        active: true,
        isDefault: true,
        slug: projectSlug,
      },
    }, { merge: true });

    // Finalize the onboarding session in the same transaction as the public
    // store/project writes. This prevents duplicate tenant/store creation if a
    // retry happens after the transaction commits but before the session update.
    const subdomain = core.subdomain || `store-${core.storeId}`;
    const publicUrl = getMenuUrl(subdomain);
    const dashboardUrl = claimToken
      ? `${SIGNIN_URL}?claim=${claimToken}`
      : SIGNIN_URL;

    transaction.update(sessionRef, {
      state: "LIVE",
      stateHistory: FieldValue.arrayUnion({
        state: "LIVE",
        timestamp: core.now,
        reason: "Published successfully",
      }),
      publishedResult: {
        tenantId: core.tenantId,
        storeId: core.storeId,
        projectId,
        userId: userRef.id,
        publicUrl,
        dashboardUrl,
      },
      extractedProjectFiles: FieldValue.delete(),
      confirmationPending: true,
      publishedAt: core.now,
      updatedAt: core.now,
    });

    return {
      tenantId: core.tenantId,
      storeId: core.storeId,
      projectId,
      userId: userRef.id,
      subdomain,
      claimToken,
      publicUrl,
      dashboardUrl,
    };
  });

  try {
    revalidateTag(`menu-store-${result.storeId}`);
    revalidateTag(`store-${result.storeId}`);
    revalidateTag("client-stores");
    await invalidateOwnerBusinessAssistantPacketCache({
      tId: result.tenantId,
      sId: result.storeId,
      projectId: result.projectId,
    });
  } catch (cacheError) {
    secureError("[msg-preview/approve] Cache revalidation failed", cacheError as Error);
  }

  logPublishEvent(sessionId, sessionData, "PUBLISH_COMPLETED", "LIVE", {
    tenantId: result.tenantId,
    storeId: result.storeId,
    projectId: result.projectId,
  });

  return {
    tenantId: result.tenantId,
    storeId: result.storeId,
    projectId: result.projectId,
    publicUrl: result.publicUrl,
    dashboardUrl: result.dashboardUrl,
  };
}

function logPublishEvent(
  sessionId: string,
  sessionData: any,
  eventType: "PUBLISH_STARTED" | "PUBLISH_COMPLETED",
  sessionState: "PUBLISHING" | "LIVE",
  metadata: Record<string, any>,
): void {
  db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
    .add({
      eventId: crypto.randomUUID(),
      sessionId,
      provider: sessionData.provider,
      eventType,
      sessionState,
      userIdMasked: (sessionData.providerUserId || "").slice(-4),
      metadata,
      timestamp: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
      sessionAgeMs: sessionData.createdAt
        ? Date.now() - sessionData.createdAt.toMillis()
        : 0,
    })
    .catch(() => {});
}

// ═══════════════════════════════════════════════════════════════
// COUNTRY / CURRENCY INFERENCE (derived from frontend countryData.ts — 252 countries)
// ═══════════════════════════════════════════════════════════════

const DEFAULT_COUNTRY_INFO = countryData.find((c) => c.code === "IN") || countryData[0];

/**
 * Infer country from E.164 phone number using frontend countryData.
 * Sorts dial codes by length DESC so longer codes match first.
 */
function inferCountryFromPhone(phone: string): typeof countryData[number] {
  return inferPhoneCountryFromInternationalNumber(phone) || DEFAULT_COUNTRY_INFO;
}
