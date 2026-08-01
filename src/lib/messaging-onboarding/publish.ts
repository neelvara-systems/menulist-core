import countryData from "@atoms/phoneNumberInput/countryData";
import {
  FALLBACK_BUSINESS_TYPE,
  getBusinessTypeConfig,
  resolveStoreBusinessCategory,
} from "@data/shared/businessTypes";
import { DB_COLLECTIONS } from "@constant/database";
import { DEFAULT_PRODUCT_ID } from "@constant/product";
import { getGeneratedEmail, getMenuUrl, SIGNIN_URL } from "@constant/urls";
import { getOwnerRoleId } from "@data/defaultRoles";
import { getSuggestionValue } from "@data/shared/extractedBusinessProfile";
import { getPhoneLookupCandidates } from "@lib/auth/loginIdentifiers";
import { runStorePublicTruthPostCommitEffects } from "@lib/cache/storePublicTruthPostCommit";
import {
  getMessagingOwnerDocumentId,
  MessagingOwnerClaimConflictError,
  readMessagingOwnerClaimInTransaction,
} from "@lib/messaging-onboarding/messagingOwnerClaim";
import { admin, storageAdmin } from "@lib/firebase/firebaseAdmin";
import { CANONICAL_SOURCE_LANGUAGE, normalizeProjectLanguages } from "@lib/localization/languagePolicy";
import { getMenuDesignPresetPatch, getRecommendedMenuDesignPresets } from "@lib/menu/menuDesignPresets";
import { getBusinessAttributesWithMenuDefaults } from "@lib/obp/inferBusinessAttributesFromMenu";
import { buildSummaryProjectPayload } from "@lib/firestore/summaryProjectsWriter";
import { createTenantStoreInTransaction, preCheckSubdomain } from "@lib/onboarding/createTenantStore";
import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import { STARTER_ACTIVATION_MS, STARTER_ACTIVATION_STATUS } from "@lib/onboarding/starterActivation";
import { inferPhoneCountryFromInternationalNumber, normalizePhoneNumberForStorage } from "@lib/phone/phoneNumber";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { touchDigitalScreenContentVersionForStoreServer } from "@lib/screen/serverScreenInvalidation";
import { slugify } from "@lib/utils/slugify";
import { DEFAULTS } from "@template/main-app/projects/b2cView/designSystem";
import crypto from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { revalidateTag } from "next/cache";
import { sanitizeMessagingOnboardingEventMetadata } from "./eventMetadata";
import { normalizeMessagingPreviewSessionId } from "./previewRouteBoundary";
import {
  buildMessagingPublishDeliveryState,
  buildMessagingPublishUploadCleanupState,
  getMessagingPublishSourceFingerprint,
  normalizeMessagingPublishSession,
  type MessagingPublishSession,
} from "./publishSessionBoundary";
import { validateMessagingPublishProjectFiles } from "./publishValidationBoundary";
import { drainMessagingPendingUploadCleanupServer } from "./uploadCleanup";

const db = admin.firestore();

export interface MessagingOnboardingPublishParams {
  businessName: string;
  businessType: string;
  phone: string;
  address: string;
  sessionData: unknown;
}

export interface MessagingOnboardingPublishResult {
  tenantId: number;
  storeId: number;
  projectId: string;
  publicUrl: string;
  dashboardUrl: string;
}

type MessagingOnboardingPublishTransactionResult = MessagingOnboardingPublishResult & {
  claimToken: string | null;
  subdomain?: string;
  userId: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const asRecord = (value: unknown): Record<string, unknown> | null => (
  isRecord(value) ? value : null
);

const getLanguageCode = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  const source = asRecord(value);
  return typeof source?.code === "string" ? source.code : null;
};

const getCanonicalExtractionLanguages = (languages: unknown): string[] => normalizeProjectLanguages(
  Array.isArray(languages)
    ? languages.map(getLanguageCode).filter((code): code is string => Boolean(code))
    : [],
);

const getDetectedDefaultLanguage = (languages: unknown): string => {
  if (Array.isArray(languages)) {
    const primary = languages.find((language) => asRecord(language)?.isPrimary === true);
    const primaryCode = getLanguageCode(primary);
    if (primaryCode) return primaryCode.trim().toLowerCase();

    const firstCode = getLanguageCode(languages[0]);
    if (firstCode) return firstCode.trim().toLowerCase();
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
  const normalizedSessionId = normalizeMessagingPreviewSessionId(sessionId);
  if (!normalizedSessionId) {
    throw new Error("Invalid messaging preview session");
  }

  const expectedBucket = storageAdmin.bucket().name;
  const sessionData = normalizeMessagingPublishSession(
    params.sessionData,
    normalizedSessionId,
    expectedBucket,
  );
  if (!sessionData) throw new Error("Invalid messaging publish source");
  if (!validateMessagingPublishProjectFiles(sessionData.extractedProjectFiles).valid) {
    throw new Error("Invalid messaging publish project menu");
  }
  const sourceFingerprint = getMessagingPublishSourceFingerprint(sessionData);
  const businessName = typeof params.businessName === "string" ? params.businessName.trim() : "";
  const address = typeof params.address === "string" ? params.address.trim() : "";
  const phone = typeof params.phone === "string" ? params.phone.trim() : "";
  if (!businessName || businessName.length > 100 || address.length > 200 || phone.length > 20) {
    throw new Error("Invalid messaging publish input");
  }
  const menuData = sessionData.extractedMenuData;
  const extractedProfile = sessionData.extractedBusinessProfile;
  const requestedBusinessType = typeof params.businessType === "string" ? params.businessType.trim() : "";
  const businessTypeCandidate = requestedBusinessType ||
    sessionData.detectedBusinessType ||
    getSuggestionValue(extractedProfile?.identity?.businessType, "medium") ||
    FALLBACK_BUSINESS_TYPE;
  const businessType = getBusinessTypeConfig(businessTypeCandidate)?.value
    || FALLBACK_BUSINESS_TYPE;

  logPublishEvent(normalizedSessionId, sessionData, "PUBLISH_STARTED", "PUBLISHING", {
    businessName,
    businessType,
  });

  const sourcePhone = phone || sessionData.providerDisplayId || "";
  const normalizedPhone = normalizePhoneNumberForStorage({ phoneNumber: sourcePhone });
  if (!normalizedPhone.phone || !normalizedPhone.phoneUsername) {
    throw new Error("Invalid messaging publish phone");
  }

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
  const existingUserDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const [field, candidates] of [
    ["phoneUsername", phoneUsername ? [phoneUsername] : []],
    ["phone", getPhoneLookupCandidates(normalizedPhone.phone || sourcePhone)],
  ] as Array<[string, string[]]>) {
    for (const candidate of Array.from(new Set(candidates))) {
      const existingUserQuery = await db
        .collection(DB_COLLECTIONS.USERS)
        .where(field, "==", candidate)
        .limit(2)
        .get();
      if (existingUserQuery.size > 1) throw new MessagingOwnerClaimConflictError();
      for (const doc of existingUserQuery.docs) existingUserDocs.set(doc.id, doc);
      if (existingUserDocs.size > 1) throw new MessagingOwnerClaimConflictError();
    }
  }
  const existingUserDoc = Array.from(existingUserDocs.values())[0] || null;

  // Pre-check subdomain uniqueness (must be outside transaction)
  const preCheckedSubdomain = await preCheckSubdomain(db, businessName);
  const sessionRef = db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS).doc(normalizedSessionId);
  const newOwnerDocumentId = getMessagingOwnerDocumentId(normalizedPhone.phone || phoneUsername);
  const ownerUserId = existingUserDoc?.id || newOwnerDocumentId;
  if (!ownerUserId) throw new MessagingOwnerClaimConflictError();

  // Atomic transaction
  const result = await db.runTransaction<MessagingOnboardingPublishTransactionResult>(async (transaction) => {
    const publishedAt = Timestamp.now();
    const sessionSnapshot = await transaction.get(sessionRef);
    if (!sessionSnapshot.exists) {
      throw new Error("Session not found");
    }

    const currentSession = normalizeMessagingPublishSession(
      sessionSnapshot.data(),
      normalizedSessionId,
      expectedBucket,
    );
    if (!currentSession) throw new Error("Invalid messaging publish session state");
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
    if (getMessagingPublishSourceFingerprint(currentSession) !== sourceFingerprint) {
      throw new Error("Messaging publish source changed");
    }

    const ownerClaim = await readMessagingOwnerClaimInTransaction({
      db,
      existingUserExpected: Boolean(existingUserDoc),
      expectedPhone: normalizedPhone.phone,
      expectedPhoneUsername: phoneUsername,
      transaction,
      userId: ownerUserId,
    });

    // Centralized tenant + store creation
    const core = await createTenantStoreInTransaction(transaction, db, {
      businessName,
      businessType,
      businessCategory: resolvedBusinessCategory,
      email: generatedEmail,
      onboardingSource: "MESSAGING_ONBOARDING",
      subdomain: { preChecked: preCheckedSubdomain },
      includeTimeSlotPresets: true,
      timeZone: currency.timezone,
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
        logo: "",
        lastPublishedAt: publishedAt,
        ...(initialBusinessAttributes ? { businessAttributes: initialBusinessAttributes } : {}),
      },
    });

    // Create or Update User (Story 3B: link to existing user doc if phone exists)
    let claimToken: string | null = null;
    let userRef;
    if (existingUserDoc) {
      userRef = ownerClaim.ref;
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
        ...(phoneUsername ? { phoneUsername, phoneLoginEnabled: true } : {}),
        onboardingSource: "MESSAGING_ONBOARDING",
        modifiedOn: core.now,
      });
    } else {
      claimToken = crypto.randomBytes(32).toString("base64url");
      const claimTokenExpiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);

      userRef = ownerClaim.ref;
      transaction.create(userRef, {
        countryCode: normalizedPhone.countryCode,
        dialCode: normalizedPhone.dialCode,
        phone: normalizedPhone.phone,
        phoneNumber: normalizedPhone.phoneNumber,
        email: generatedEmail,
        name: businessName,
        isVerified: true,
        active: true,
        platformRole: "OWNER",
        ...(phoneUsername ? { phoneUsername } : {}),
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
    const projectFiles = sessionData.extractedProjectFiles;
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
      lastPublishedAt: publishedAt,
    });

    // URL Routing Architecture: Create projectsSummary with slug
    // Ensures slug-based URL routing works for messaging-onboarded stores
    const projectSlug = slugify(projectName) || "menu-1";
    const projectsSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${core.storeId}`);
    transaction.set(projectsSummaryRef, {
      lastUpdated: core.now,
      ...buildSummaryProjectPayload(projectId, {
        name: projectName,
        description: `Digital menu for ${businessName}`,
        active: true,
        isDefault: true,
        slug: projectSlug,
        lastPublishedAt: publishedAt,
      }),
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
      ...buildMessagingPublishDeliveryState(),
      ...buildMessagingPublishUploadCleanupState(currentSession),
      publishedAt,
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

  const uploadCleanup = await drainMessagingPendingUploadCleanupServer({
    sessionId: normalizedSessionId,
  });
  if (uploadCleanup.status === "invalid") {
    logRuntimeFailure(
      "messaging_onboarding_upload_cleanup_failed",
      new Error("MESSAGING_UPLOAD_CLEANUP_STATE_INVALID"),
      {
        ...getBoundedRuntimeStringContext("sessionId", normalizedSessionId),
        cleanupPathCount: 0,
        operation: "cleanup_state_validation",
      },
    );
  }

  const postCommit = await runStorePublicTruthPostCommitEffects({
    chunkSize: 1,
    deps: {
      invalidateAssistant: () => invalidateOwnerBusinessAssistantPacketCache({
        tId: result.tenantId,
        sId: result.storeId,
        projectId: result.projectId,
      }),
      revalidate: (tag) => revalidateTag(tag, { expire: 0 }),
      touchScreen: () => touchDigitalScreenContentVersionForStoreServer(
        result.storeId,
        "messagingOnboardingPublish",
      ),
    },
    storeIds: [String(result.storeId)],
    tenantId: String(result.tenantId),
  });
  if (postCommit.effectsPending) {
    logRuntimeFailure("messaging_onboarding_publish_cache_revalidation_failed", postCommit.firstError, {
      ...getBoundedRuntimeStringContext("tenantId", result.tenantId),
      ...getBoundedRuntimeStringContext("storeId", result.storeId),
      ...getBoundedRuntimeStringContext("projectId", result.projectId),
      ...getBoundedRuntimeStringContext("userId", result.userId),
      failedEffectCount: postCommit.failedEffectCount,
      operation: "post_commit_effects",
      tagCount: 3,
    });
  }

  logPublishEvent(normalizedSessionId, sessionData, "PUBLISH_COMPLETED", "LIVE", {
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
  sessionData: MessagingPublishSession,
  eventType: "PUBLISH_STARTED" | "PUBLISH_COMPLETED",
  sessionState: "PUBLISHING" | "LIVE",
  metadata: Record<string, unknown>,
): void {
  const eventId = crypto.randomUUID();
  db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
    .doc(eventId)
    .set({
      eventId,
      sessionId,
      provider: sessionData.provider,
      eventType,
      sessionState,
      userIdMasked: (sessionData.providerUserId || "").slice(-4),
      metadata: sanitizeMessagingOnboardingEventMetadata(metadata),
      timestamp: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
      sessionAgeMs: Math.max(0, Date.now() - sessionData.createdAtMillis),
    })
    .catch((error) => {
      logRuntimeFailure("messaging_onboarding_publish_event_write_failed", error, {
        ...getBoundedRuntimeStringContext("sessionId", sessionId),
        ...getBoundedRuntimeStringContext("provider", sessionData.provider),
        eventType,
        sessionState,
        metadataKeyCount: Object.keys(metadata || {}).length,
      });
    });
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
