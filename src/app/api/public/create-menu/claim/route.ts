export const dynamic = 'force-dynamic';
/**
 * Public Menu Entry — Claim API
 * 
 * POST /api/public/create-menu/claim
 * 
 * Converts a public menu draft into a real tenant + store + project.
 * REQUIRES authentication (user must sign up first).
 * Reuses atomic transaction pattern from create-subscription/route.ts.
 * 
 * @see __docs__/public-menu-entry/public-menu-entry_impl.md §4.3
 */

import { FEATURE_FLAGS } from '@config/features';
import countryData from '@atoms/phoneNumberInput/countryData';
import { DB_COLLECTIONS } from '@constant/database';
import { PERMISSIONS } from '@constant/permissions';
import { appendPublicPath, getMenuUrl } from '@constant/urls';
import { FALLBACK_BUSINESS_TYPE, getBusinessTypeConfig, resolveStoreBusinessCategory } from '@data/shared/businessTypes';
import { getSuggestionValue, normalizeExtractedBusinessProfile } from '@data/shared/extractedBusinessProfile';
import {
    getPublicMenuDraftTimestampMillis,
    hasCompletePublicMenuDraftSourceAttribution,
    normalizePublicMenuDraftExtractedData,
    type PublicMenuDraftLanguage,
} from '@data/shared/publicMenuDraftData';
import { PUBLIC_MENU_DRAFT_SOURCE_FILES_VERSION } from '@data/shared/publicMenuDraftSource';
import { admin, storageAdmin } from '@lib/firebase/firebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { normalizeGrowthAcquisitionAttribution } from '@lib/growth/acquisitionAttribution';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import { normalizeMenuListPublicEntityIdentityAliases } from '@lib/publicTruth/entityEligibility';
import { mceValidate, toMCEMetadata } from '@lib/mce';
import { CANONICAL_SOURCE_LANGUAGE, normalizeProjectLanguages } from '@lib/localization/languagePolicy';
import { getBusinessAttributesWithMenuDefaults } from '@lib/obp/inferBusinessAttributesFromMenu';
import {
    assertCurrentUserAvailableForOnboardingInTransaction,
    createTenantStoreInTransaction,
    normalizeSubdomainCandidate,
    OnboardingUserUnavailableError,
    preCheckSubdomain,
    updateUserWithTenantStore,
} from '@lib/onboarding/createTenantStore';
import { STARTER_ACTIVATION_MS, STARTER_ACTIVATION_STATUS } from '@lib/onboarding/starterActivation';
import { normalizePhoneNumberForStorage } from '@lib/phone/phoneNumber';
import { requireAnyStorePermissionForStoreData } from '@lib/permissions/server';
import { normalizeExtractedMenuPriceTruth } from '@lib/pricing/projectPriceTruth';
import { redistributeExtractedData } from '@lib/extraction/redistribute';
import { normalizePublicDraftSourcesForProject } from '@lib/public-menu-entry/publicDraftSource';
import { normalizePublicMenuDraftId } from '@lib/public-menu-entry/publicDraftId';
import { resolvePublicMenuEntryProjectSlug } from '@lib/public-menu-entry/claimProjectSlug';
import { resolvePublicMenuClaimUserAuthority } from '@lib/public-menu-entry/claimUserAuthority';
import { invalidateOwnerBusinessAssistantPacketCache } from '@lib/ownerBusinessAssistant/server/contextPacketCache';
import { recordFounderGrowthEvent } from '@lib/ops/founderGrowthReadModel';
import {
    clearOwnerReferralCookie,
    readOwnerReferralCookie,
    resolveOwnerReferralCookieForAttribution,
    setOwnerReferralAttributionInTransaction,
} from '@lib/ownerReferral/ownerReferralAttributionServer';
import { isOwnerReferralAcquisitionEnabled } from '@lib/ownerReferral/ownerReferralFeature';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { getBoundedSecurityStringContext, logSecurityDiagnostic, logSecurityFailure } from '@lib/security/securityDiagnostics';
import { touchDigitalScreenContentVersionForStoreServer } from '@lib/screen/serverScreenInvalidation';
import { parseSummaryProjects } from '@lib/firestore/parseSummaryProjects';
import { sanitizeForFirestore } from '@lib/firestore/sanitizeForFirestore';
import { buildSummaryProjectPayload } from '@lib/firestore/summaryProjectsWriter';
import { slugify } from '@lib/utils/slugify';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { type AuthenticatedHandler, withAuth } from 'src/middleware/auth';
import { hashPublicRateLimitValue, sanitizeString } from 'src/middleware/publicApi';
import { z } from 'zod';

const COLLECTION = DB_COLLECTIONS.PUBLIC_MENU_DRAFTS;
const PUBLIC_MENU_CLAIM_MAX_BODY_BYTES = 8 * 1024;
const PUBLIC_MENU_CLAIM_PRIVATE_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
} as const;

const withPublicMenuClaimPrivateResponse = (handler: AuthenticatedHandler) => {
    const authenticatedHandler = withAuth(handler);
    return async (...args: Parameters<typeof authenticatedHandler>): Promise<NextResponse> => {
        const response = await authenticatedHandler(...args);
        Object.entries(PUBLIC_MENU_CLAIM_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
            response.headers.set(name, value);
        });
        return response;
    };
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

function normalizePublicMenuClaimNumericDocumentId(
    value: unknown,
): { numericId: number; documentId: string } | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    if (documentId !== raw || !isValidFirestoreDocumentId(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { numericId, documentId }
        : null;
}

const getCanonicalExtractionLanguages = (languages: PublicMenuDraftLanguage[]): string[] => normalizeProjectLanguages(
    languages.map((language) => language.code),
);

const getDetectedDefaultLanguage = (languages: PublicMenuDraftLanguage[]): string => {
    const primary = languages.find((language) => language.isPrimary)?.code;
    return primary || languages[0]?.code || CANONICAL_SOURCE_LANGUAGE;
};

const getCurrencySymbolFromCode = (currencyCode?: string | null): string | undefined => {
    if (!currencyCode) return undefined;
    return countryData.find((entry) => entry.currencyCode === currencyCode)?.currencySymbol;
};

const hasValue = (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0;

function getDefaultPublicDescriptor(businessType: string): string | undefined {
    const descriptor = String(businessType || '').trim();
    if (!descriptor || descriptor === FALLBACK_BUSINESS_TYPE) return undefined;
    return descriptor.slice(0, 40);
}

function buildPublicPresenceDefaults(params: {
    addressLine?: string;
    brandAccentColor?: string | null;
    businessType: string;
    existingPublicPresence?: Record<string, unknown> | null;
    phone?: string;
}) {
    const existing = params.existingPublicPresence || {};
    const defaults: Record<string, unknown> = {};
    const descriptor = getDefaultPublicDescriptor(params.businessType);

    if (!hasValue(existing.descriptor) && descriptor) {
        defaults.descriptor = descriptor;
    }

    if (!hasValue(existing.accentColor) && hasValue(params.brandAccentColor)) {
        defaults.accentColor = params.brandAccentColor;
    }

    if (!hasValue(existing.whatsappNumber) && hasValue(params.phone)) {
        defaults.whatsappNumber = params.phone;
    }

    if (typeof existing.showCall !== 'boolean') defaults.showCall = true;
    if (typeof existing.showWhatsApp !== 'boolean') defaults.showWhatsApp = true;
    if (typeof existing.showFeedback !== 'boolean') defaults.showFeedback = true;
    if (hasValue(params.addressLine) && typeof existing.showDirections !== 'boolean') {
        defaults.showDirections = true;
    }

    return defaults;
}

function mergeDefinedObject<T extends Record<string, unknown>>(value: T | null | undefined): T | undefined {
    if (!value || Object.keys(value).length === 0) return undefined;
    return value;
}

const ClaimSchema = z.object({
    draftId: z.string().refine((value) => normalizePublicMenuDraftId(value) === value),
    businessName: z.string().trim().min(2).max(100),
    businessType: z.string().trim().max(80).optional(),
    businessCategory: z.string().trim().max(80).optional(),
    phone: z.string().trim().max(40).optional(),
    city: z.string().trim().max(80).optional(),
    addressLine: z.string().trim().max(250).optional(),
}).strict();

class PublicMenuClaimError extends Error {
    constructor(
        readonly status: number,
        readonly clientMessage: string,
    ) {
        super(clientMessage);
        this.name = 'PublicMenuClaimError';
    }
}

type PublicMenuClaimTransactionResult = {
    growthAcquisition: ReturnType<typeof normalizeGrowthAcquisitionAttribution>;
    idempotent: boolean;
    isNewAccount: boolean;
    projectId: string;
    projectSlug: string;
    referralBoundInTransaction: boolean;
    storeId: number;
    subdomain: string;
    tenantId: number;
};

function normalizeCompletedClaimResult(
    draft: Record<string, unknown>,
    userId: string,
): Omit<PublicMenuClaimTransactionResult, 'growthAcquisition'> | null {
    if (draft.claimed !== true || draft.claimedByUId !== userId) return null;
    const tenantScope = normalizePublicMenuClaimNumericDocumentId(draft.convertedTenantId);
    const storeScope = normalizePublicMenuClaimNumericDocumentId(draft.convertedStoreId);
    const projectId = typeof draft.convertedProjectId === 'string' ? draft.convertedProjectId.trim() : '';
    const projectSlug = typeof draft.convertedProjectSlug === 'string' ? draft.convertedProjectSlug.trim() : '';
    const subdomain = typeof draft.convertedSubdomain === 'string' ? draft.convertedSubdomain.trim() : '';
    if (
        !tenantScope
        || !storeScope
        || !isValidFirestoreDocumentId(projectId)
        || projectId !== draft.convertedProjectId
        || !projectSlug
        || slugify(projectSlug) !== projectSlug
        || projectSlug.length > 160
        || !subdomain
        || normalizeSubdomainCandidate(subdomain) !== subdomain
    ) {
        return null;
    }
    return {
        tenantId: tenantScope.numericId,
        storeId: storeScope.numericId,
        projectId,
        projectSlug,
        subdomain,
        isNewAccount: draft.convertedWasNewAccount === true,
        idempotent: true,
        referralBoundInTransaction: false,
    };
}

type PublicMenuClaimDiagnosticContext = {
    draftId?: unknown;
    hasExistingAccount?: boolean;
    isNewAccount?: boolean;
    projectId?: unknown;
    storeId?: unknown;
    tenantId?: unknown;
    userId?: unknown;
};

const getPublicMenuClaimDiagnosticContext = (
    context: PublicMenuClaimDiagnosticContext,
) => ({
    ...getBoundedSecurityStringContext('draftId', context.draftId),
    ...getBoundedSecurityStringContext('userId', context.userId),
    ...getBoundedSecurityStringContext('tenantId', context.tenantId),
    ...getBoundedSecurityStringContext('storeId', context.storeId),
    ...getBoundedSecurityStringContext('projectId', context.projectId),
    hasExistingAccount: context.hasExistingAccount,
    isNewAccount: context.isNewAccount,
});

/**
 * POST /api/public/create-menu/claim
 * 
 * Convert draft → tenant + store + project (authenticated)
 */
export const POST = withPublicMenuClaimPrivateResponse(async (request: NextRequest, session) => {
    // 1. Feature gate
    if (!FEATURE_FLAGS.ENABLE_PUBLIC_MENU_ENTRY) {
        return NextResponse.json(
            { success: false, error: 'This feature is not available.' },
            { status: 404 }
        );
    }

    const userId = session.user.id;
    const sessionTenantPresent = session.user.tenantId !== undefined
        && session.user.tenantId !== null
        && String(session.user.tenantId).trim().length > 0;
    const sessionStorePresent = session.user.storeId !== undefined
        && session.user.storeId !== null
        && String(session.user.storeId).trim().length > 0;
    if (sessionTenantPresent !== sessionStorePresent) {
        return NextResponse.json(
            { success: false, error: 'Your account setup is incomplete. Please sign in again.' },
            { status: 409 },
        );
    }
    const hasExistingAccount = sessionTenantPresent && sessionStorePresent;
    let draftIdForDiagnostics: string | undefined;
    let clearReferralCookieOnResponse = false;

    try {
        const rateLimitConfig = getRateLimitForFeature('PAYMENT_ONBOARDING');
        const userRateLimitHash = hashPublicRateLimitValue(userId);
        const rateLimitResult = await checkRateLimit({
            key: `public-menu-claim:${userRateLimitHash}`,
            ...rateLimitConfig,
            failClosedOnProviderError: true,
        });

        if (!rateLimitResult.allowed) {
            const providerUnavailable = rateLimitResult.reason === 'provider_unavailable';
            return NextResponse.json(
                {
                    success: false,
                    error: providerUnavailable
                        ? 'Publishing is temporarily unavailable. Please try again in a minute.'
                        : 'Too many publish attempts. Please try again later.',
                },
                providerUnavailable
                    ? { status: 503 }
                    : {
                        status: 429,
                        headers: {
                            'Retry-After': String(Math.max(1, Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000))),
                        },
                    },
            );
        }

        // 2. Parse and validate input
        const bodyResult = await readBoundedJsonBody(request, PUBLIC_MENU_CLAIM_MAX_BODY_BYTES);
        if (bodyResult.ok === false) return bodyResult.response;

        const validation = ClaimSchema.safeParse(bodyResult.data);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid input.' },
                { status: 400 }
            );
        }

        const {
            draftId,
            businessName: rawBusinessName,
            businessType: rawBusinessType,
            businessCategory: rawBusinessCategory,
            phone: rawPhone,
            city: rawCity,
            addressLine: rawAddressLine,
        } = validation.data;
        draftIdForDiagnostics = draftId;
        const businessName = sanitizeString(rawBusinessName) || '';
        const businessType = sanitizeString(rawBusinessType) || '';
        const businessCategory = sanitizeString(rawBusinessCategory) || '';
        const phone = sanitizeString(rawPhone) || '';
        const normalizedPhone = normalizePhoneNumberForStorage({ phoneNumber: phone });
        if (
            phone
            && (
                !normalizedPhone.phone
                || normalizedPhone.internationalDigits.length < 8
                || normalizedPhone.internationalDigits.length > 15
            )
        ) {
            return NextResponse.json(
                { success: false, error: 'Enter a valid phone number.' },
                { status: 400 },
            );
        }
        const city = sanitizeString(rawCity) || '';
        const addressLine = sanitizeString(rawAddressLine) || '';

        if (businessName.length < 2) {
            return NextResponse.json(
                { success: false, error: 'Business name is required.' },
                { status: 400 },
            );
        }

        // 3. Look up draft
        const db = admin.firestore();
        const draftRef = db.collection(COLLECTION).doc(draftId);
        const referralCookiePresent = Boolean(readOwnerReferralCookie(request));
        const shouldBindReferralOnClaim = isOwnerReferralAcquisitionEnabled() && !hasExistingAccount;
        const resolvedReferral = shouldBindReferralOnClaim
            ? await resolveOwnerReferralCookieForAttribution(request)
            : null;
        if (shouldBindReferralOnClaim && referralCookiePresent && !resolvedReferral) {
            clearReferralCookieOnResponse = true;
        }

        // 5. Check if user already has a tenant/store
        // If they do, create a new project under existing tenant
        // If they don't, create new tenant + store (full onboarding)
        const preCheckedSubdomain = hasExistingAccount
            ? ''
            : await preCheckSubdomain(db, businessName, city);

        const result = await db.runTransaction<PublicMenuClaimTransactionResult>(async (transaction) => {
            const draftDoc = await transaction.get(draftRef);
            if (!draftDoc.exists) {
                throw new PublicMenuClaimError(404, 'Draft not found or expired.');
            }

            const draftData = draftDoc.data();
            if (!isRecord(draftData)) {
                throw new PublicMenuClaimError(422, 'This menu could not be validated. Please upload it again.');
            }
            const draft = draftData;
            const growthAcquisition = normalizeGrowthAcquisitionAttribution(draft.growthAcquisition);
            if (draft.createdByUId !== userId) {
                throw new PublicMenuClaimError(403, 'This draft belongs to another account.');
            }

            if (draft.claimed) {
                const completedClaim = normalizeCompletedClaimResult(draft, userId);
                if (!completedClaim) {
                    throw new PublicMenuClaimError(409, 'This menu has already been claimed.');
                }
                return {
                    ...completedClaim,
                    growthAcquisition,
                };
            }

            const expiresAtMillis = getPublicMenuDraftTimestampMillis(draft.expiresAt);
            if (expiresAtMillis === null || expiresAtMillis <= Date.now()) {
                throw new PublicMenuClaimError(410, 'Draft expired. Please upload again.');
            }

            if (draft.extractionStatus !== 'completed' || !draft.extractedData) {
                throw new PublicMenuClaimError(400, 'Menu extraction is not complete yet.');
            }

            const draftSources = normalizePublicDraftSourcesForProject(draft, draftId, {
                allowedBucket: storageAdmin.bucket().name,
                allowLocalEmulator: process.env.NODE_ENV !== 'production',
            });
            if (!draftSources) {
                throw new PublicMenuClaimError(422, 'This menu source could not be validated. Please upload it again.');
            }
            const extractedData = normalizePublicMenuDraftExtractedData(draft.extractedData, {
                maxSourceFiles: draftSources.length,
                preserveSourceFileIndex: true,
            });
            if (!extractedData) {
                throw new PublicMenuClaimError(422, 'This menu could not be validated. Please upload it again.');
            }
            if (
                draft.sourceFilesVersion === PUBLIC_MENU_DRAFT_SOURCE_FILES_VERSION
                && !hasCompletePublicMenuDraftSourceAttribution(extractedData, draftSources.length)
            ) {
                throw new PublicMenuClaimError(422, 'This menu source could not be matched to every page. Please upload it again.');
            }
            try {
                normalizeExtractedMenuPriceTruth(extractedData);
            } catch {
                throw new PublicMenuClaimError(422, 'This menu contains an invalid price. Please upload it again.');
            }
            const extractedLanguageCodes = getCanonicalExtractionLanguages(extractedData.languages);
            const detectedDefaultLanguage = getDetectedDefaultLanguage(extractedData.languages);
            const draftExtractedDataRecord = isRecord(draft.extractedData) ? draft.extractedData : null;
            const extractedProfile = normalizeExtractedBusinessProfile(
                draft.extractedBusinessProfile || draftExtractedDataRecord?.extractedBusinessProfile,
            ) || null;
            const suggestedCurrencyCode = getSuggestionValue(extractedProfile?.identity?.currencyCode, 'medium');
            const detectedCurrencyCode = typeof draft.detectedCurrencyCode === 'string'
                ? draft.detectedCurrencyCode.trim()
                : '';
            const profileCurrencyCode = suggestedCurrencyCode || detectedCurrencyCode || null;
            const profileCurrencySymbol = getCurrencySymbolFromCode(profileCurrencyCode);
            const persistedSuggestedProjectName = typeof draft.suggestedProjectName === 'string'
                ? draft.suggestedProjectName
                : '';
            const profileProjectName = getSuggestionValue(extractedProfile?.project?.projectName, 'medium') || persistedSuggestedProjectName;
            const projectName = hasValue(profileProjectName) ? profileProjectName.trim() : businessName;
            const brandAccentColor = getSuggestionValue(extractedProfile?.visualBrand?.brandAccentColor, 'medium')
                || (typeof draft.detectedBrandAccentColor === 'string' ? draft.detectedBrandAccentColor : null);
            const imageBackgroundColor = getSuggestionValue(extractedProfile?.visualBrand?.imageBackgroundColor, 'medium')
                || (typeof draft.detectedImageBackgroundColor === 'string' ? draft.detectedImageBackgroundColor : null);
            const now = admin.firestore.Timestamp.now();
            const activationDeadline = admin.firestore.Timestamp.fromMillis(Date.now() + STARTER_ACTIVATION_MS);
            let tenantId: number;
            let storeId: number;
            let tenantDocumentId: string;
            let storeDocumentId: string;
            let subdomain: string;
            let referralBoundInTransaction = false;
            const detectedBusinessType = typeof draft.detectedBusinessType === 'string'
                ? draft.detectedBusinessType
                : undefined;
            const detectedBusinessCategory = typeof draft.detectedBusinessCategory === 'string'
                ? draft.detectedBusinessCategory
                : undefined;
            let resolvedBusinessType = getBusinessTypeConfig(
                businessType || detectedBusinessType || FALLBACK_BUSINESS_TYPE,
            )?.value || FALLBACK_BUSINESS_TYPE;
            let resolvedBusinessCategory = resolveStoreBusinessCategory(
                resolvedBusinessType,
                businessCategory || detectedBusinessCategory,
            );
            const extractedMenuData = {
                categories: extractedData.categories || [],
                items: extractedData.items || [],
                languages: extractedData.languages || [],
            };
            let existingSummaryProjectsForDefaultDemotion: Record<string, Record<string, unknown>> = {};

            if (hasExistingAccount) {
                const tenantScope = normalizePublicMenuClaimNumericDocumentId(session.user.tenantId);
                const storeScope = normalizePublicMenuClaimNumericDocumentId(session.user.storeId);
                if (!tenantScope || !storeScope) {
                    throw new PublicMenuClaimError(403, 'Account is not ready to publish this menu.');
                }
                tenantId = tenantScope.numericId;
                storeId = storeScope.numericId;
                tenantDocumentId = tenantScope.documentId;
                storeDocumentId = storeScope.documentId;

                const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId);
                const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(tenantDocumentId);
                const userRef = db.collection(DB_COLLECTIONS.USERS).doc(userId);
                const existingProjectsSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${storeDocumentId}`);
                const storeDoc = await transaction.get(storeRef);
                const tenantDoc = await transaction.get(tenantRef);
                const currentUserDoc = await transaction.get(userRef);
                const existingSummaryDoc = await transaction.get(existingProjectsSummaryRef);
                if (!storeDoc.exists || !tenantDoc.exists || !currentUserDoc.exists) {
                    throw new PublicMenuClaimError(403, 'Account is not ready to publish this menu.');
                }
                const storeData = storeDoc.data() || {};
                existingSummaryProjectsForDefaultDemotion = existingSummaryDoc.exists
                    ? parseSummaryProjects(existingSummaryDoc.data())
                    : {};
                const storeTenantScope = normalizeMenuListPublicEntityIdentityAliases([
                    storeData.tenantId,
                    storeData.tId,
                ]);
                const storeIdentityAliases = [storeData.storeId, storeData.sId]
                    .filter((value) => value !== undefined && value !== null);
                if (
                    storeTenantScope?.numericId !== tenantId
                    || (
                        storeIdentityAliases.length > 0
                        && normalizeMenuListPublicEntityIdentityAliases(storeIdentityAliases)?.numericId !== storeId
                    )
                    || storeData.active === false
                    || storeData.deleted === true
                    || isPlatformEntityBlocked(storeData)
                    || isPlatformEntityBlocked(tenantDoc.data())
                ) {
                    throw new PublicMenuClaimError(403, 'Account is not ready to publish this menu.');
                }
                const currentUserAuthority = resolvePublicMenuClaimUserAuthority({
                    documentId: currentUserDoc.id,
                    expectedStoreId: storeId,
                    expectedTenantId: tenantId,
                    session,
                    userData: currentUserDoc.data(),
                });
                if (!currentUserAuthority) {
                    throw new PublicMenuClaimError(403, 'Account is not ready to publish this menu.');
                }
                const currentAuthoritySession = {
                    ...session,
                    role: currentUserAuthority.role,
                    user: {
                        ...session.user,
                        role: currentUserAuthority.role,
                        storeIds: currentUserAuthority.storeIds,
                        stores: currentUserAuthority.stores,
                    },
                };
                const permissionError = await requireAnyStorePermissionForStoreData(
                    request,
                    currentAuthoritySession,
                    storeData,
                    [PERMISSIONS.PUBLISH_MENU],
                    'Public menu setup publish',
                    storeId,
                    tenantId,
                );
                if (permissionError) {
                    throw new PublicMenuClaimError(403, 'You do not have permission to publish this menu.');
                }
                const persistedBusinessType = typeof storeData.businessType === 'string'
                    ? getBusinessTypeConfig(storeData.businessType)?.value
                    : undefined;
                const persistedBusinessCategory = typeof storeData.businessCategory === 'string'
                    ? storeData.businessCategory
                    : undefined;
                resolvedBusinessType = persistedBusinessType || resolvedBusinessType;
                resolvedBusinessCategory = resolveStoreBusinessCategory(
                    resolvedBusinessType,
                    persistedBusinessCategory || resolvedBusinessCategory,
                );
                const persistedSubdomain = typeof storeData.subdomain === 'string'
                    ? storeData.subdomain.trim()
                    : '';
                subdomain = persistedSubdomain
                    && normalizeSubdomainCandidate(persistedSubdomain) === persistedSubdomain
                    ? persistedSubdomain
                    : `store-${storeId}`;
                const existingPublicPresence = isRecord(storeData.publicPresence)
                    ? storeData.publicPresence
                    : {};

                const publicPresenceDefaults = buildPublicPresenceDefaults({
                    addressLine,
                    brandAccentColor,
                    businessType: resolvedBusinessType,
                    existingPublicPresence,
                    phone: normalizedPhone.phone,
                });
                const nextBusinessAttributes = getBusinessAttributesWithMenuDefaults(
                    extractedMenuData,
                    {
                        businessAttributes: isRecord(storeData.businessAttributes)
                            ? storeData.businessAttributes
                            : undefined,
                        businessCategory: resolvedBusinessCategory,
                        businessType: resolvedBusinessType,
                    },
                );
                const storeDefaultsPatch: Record<string, unknown> = {
                    ...(mergeDefinedObject(publicPresenceDefaults)
                        ? { publicPresence: { ...existingPublicPresence, ...publicPresenceDefaults } }
                        : {}),
                    ...(nextBusinessAttributes ? { businessAttributes: nextBusinessAttributes } : {}),
                    lastPublishedAt: now,
                };

                if (Object.keys(storeDefaultsPatch).length > 0) {
                    transaction.update(storeRef, {
                        ...storeDefaultsPatch,
                        modifiedOn: now,
                    });
                }
            } else {
                await assertCurrentUserAvailableForOnboardingInTransaction(
                    transaction,
                    db,
                    userId,
                    session,
                );
                const starterActivatedAt = admin.firestore.Timestamp.now();
                const initialPublicPresence = buildPublicPresenceDefaults({
                    addressLine,
                    brandAccentColor,
                    businessType: resolvedBusinessType,
                    phone: normalizedPhone.phone,
                });
                const initialBusinessAttributes = getBusinessAttributesWithMenuDefaults(
                    extractedMenuData,
                    {
                        businessCategory: resolvedBusinessCategory,
                        businessType: resolvedBusinessType,
                    },
                );
                const core = await createTenantStoreInTransaction(transaction, db, {
                    businessName,
                    businessType: resolvedBusinessType,
                    businessCategory: resolvedBusinessCategory,
                    businessIndustry: 'B2C',
                    email: session.user.email,
                    onboardingSource: 'PUBLIC_MENU_ENTRY',
                    subdomain: { preChecked: preCheckedSubdomain },
                    includeTimeSlotPresets: true,
                    tenantExtra: {
                        ...(growthAcquisition ? { growthAcquisition } : {}),
                        countryCode: normalizedPhone.phone ? normalizedPhone.countryCode : undefined,
                        dialCode: normalizedPhone.phone ? normalizedPhone.dialCode : undefined,
                        phone: normalizedPhone.phone || '',
                        phoneNumber: normalizedPhone.phoneNumber || '',
                        starterActivationStatus: STARTER_ACTIVATION_STATUS.STARTER_ACTIVE,
                        starterActivatedAt,
                        activationDeadline,
                    },
                    storeExtra: {
                        ...(growthAcquisition ? { growthAcquisition } : {}),
                        countryCode: normalizedPhone.phone ? normalizedPhone.countryCode : undefined,
                        dialCode: normalizedPhone.phone ? normalizedPhone.dialCode : undefined,
                        phoneNumber: normalizedPhone.phoneNumber || '',
                        phone: normalizedPhone.phone || '',
                        city: city || '',
                        addressLine: addressLine || '',
                        starterActivationStatus: STARTER_ACTIVATION_STATUS.STARTER_ACTIVE,
                        starterActivatedAt,
                        activationDeadline,
                        lastPublishedAt: now,
                        activeLanguages: extractedLanguageCodes,
                        defaultLanguage: detectedDefaultLanguage,
                        ...(mergeDefinedObject(initialPublicPresence) ? { publicPresence: initialPublicPresence } : {}),
                        ...(initialBusinessAttributes ? { businessAttributes: initialBusinessAttributes } : {}),
                        ...(profileCurrencyCode ? { currencyCode: profileCurrencyCode } : {}),
                        ...(profileCurrencySymbol ? { currencySymbol: profileCurrencySymbol } : {}),
                    },
                });

                // Update User with tenant/store IDs
                const tenantScope = normalizePublicMenuClaimNumericDocumentId(core.tenantId);
                const storeScope = normalizePublicMenuClaimNumericDocumentId(core.storeId);
                if (!tenantScope || !storeScope) {
                    throw new PublicMenuClaimError(403, 'Account is not ready to publish this menu.');
                }
                updateUserWithTenantStore(transaction, db, userId, core);

                tenantId = tenantScope.numericId;
                storeId = storeScope.numericId;
                tenantDocumentId = tenantScope.documentId;
                storeDocumentId = storeScope.documentId;
                subdomain = core.subdomain!;

                if (resolvedReferral) {
                    referralBoundInTransaction = Boolean(setOwnerReferralAttributionInTransaction({
                        transaction,
                        db,
                        referredBusinessName: businessName,
                        referredScope: { tenantId, storeId },
                        resolvedToken: resolvedReferral,
                        onboardingSource: 'PUBLIC_MENU_ENTRY',
                    }));
                }
            }

            const projectId = `${tenantId}-${Date.now().toString(36)}-${storeId}`;
            const projectRef = db
                .collection(DB_COLLECTIONS.PROJECTS)
                .doc(tenantDocumentId)
                .collection(storeDocumentId)
                .doc(projectId);
            const projectsSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${storeDocumentId}`);
            const summaryUpdate: Record<string, unknown> = { lastUpdated: now };
            if (hasExistingAccount) {
                Object.entries(existingSummaryProjectsForDefaultDemotion).forEach(([existingProjectId, existingProject]) => {
                    if (
                        existingProjectId !== projectId
                        && existingProject?.isDefault === true
                        && existingProject?.deleted !== true
                    ) {
                        Object.assign(summaryUpdate, buildSummaryProjectPayload(existingProjectId, {
                            ...existingProject,
                            isDefault: false,
                            modifiedOn: now,
                        }));
                    }
                });
            }
            const fileUidSeed = Date.now();
            const fileMappings = draftSources.map((_, index) => ({
                index,
                uid: `file_${fileUidSeed}_${index + 1}`,
            }));
            const redistributedFiles = redistributeExtractedData({
                data: {
                    categories: extractedData.categories || [],
                    items: extractedData.items || [],
                    languages: extractedData.languages || [],
                },
            }, fileMappings);
            const redistributedContentCount = Array.from(redistributedFiles.values()).reduce((count, fileData) => (
                count
                + (fileData.data?.categories?.length || 0)
                + (fileData.data?.items?.length || 0)
            ), 0);
            const combinedContentCount = (extractedData.categories?.length || 0) + (extractedData.items?.length || 0);
            const useCombinedFirstFileFallback = combinedContentCount > 0 && redistributedContentCount === 0;
            const fileEntries = draftSources.map((draftSource, index) => {
                const mapping = fileMappings[index];
                const redistributed = redistributedFiles.get(mapping.uid);
                const fileData = useCombinedFirstFileFallback && index === 0
                    ? {
                        message: '',
                        data: {
                            categories: extractedData.categories || [],
                            items: extractedData.items || [],
                            languages: extractedData.languages || [],
                        },
                    }
                    : redistributed || {
                        message: '',
                        data: {
                            categories: [],
                            items: [],
                            languages: extractedData.languages || [],
                        },
                    };
                return {
                    uid: mapping.uid,
                    name: draftSource.fileName,
                    url: draftSource.imageUrl,
                    type: draftSource.fileType,
                    size: draftSource.fileSize,
                    active: true,
                    deleted: false,
                    index,
                    extractedData: fileData,
                };
            });
            const projectSlug = resolvePublicMenuEntryProjectSlug(
                existingSummaryProjectsForDefaultDemotion,
                projectName,
                projectId,
            );
            const projectData: Record<string, unknown> = {
                projectId,
                name: projectName,
                description: projectName === businessName ? `Menu for ${businessName}` : `${projectName} for ${businessName}`,
                businessType: resolvedBusinessType,
                businessCategory: resolvedBusinessCategory,
                active: true,
                deleted: false,
                isDefault: true,
                slug: projectSlug,
                files: fileEntries,
                languages: extractedLanguageCodes,
                defaultLanguage: detectedDefaultLanguage,
                config: brandAccentColor ? { design: { brand: { accentColor: brandAccentColor } } } : {},
                ...(imageBackgroundColor ? { aiPreferences: { image: { backgroundColor: imageBackgroundColor } } } : {}),
                tId: tenantId,
                sId: storeId,
                createdBy: userId,
                onboardingSource: 'PUBLIC_MENU_ENTRY',
                ...(growthAcquisition ? { growthAcquisition } : {}),
                createdOn: now,
                modifiedOn: now,
                lastPublishedAt: now,
            };

            if (FEATURE_FLAGS.ENABLE_MCE) {
                try {
                    projectData._mce = toMCEMetadata(mceValidate({
                        isOutlet: false,
                        projectData,
                    }));
                } catch (error) {
                    logSecurityFailure('public_menu_claim_mce_validation_failed', error, getPublicMenuClaimDiagnosticContext({
                        draftId,
                        userId,
                        tenantId,
                        storeId,
                        projectId,
                        hasExistingAccount,
                        isNewAccount: !hasExistingAccount,
                    }));
                }
            }

            const safeProjectData = sanitizeForFirestore(projectData, {
                undefinedObjectValue: 'omit',
            });
            transaction.set(projectRef, safeProjectData);

            Object.assign(summaryUpdate, buildSummaryProjectPayload(projectId, {
                    name: projectName,
                    description: projectName === businessName ? `Menu for ${businessName}` : `${projectName} for ${businessName}`,
                    businessType: resolvedBusinessType,
                    businessCategory: resolvedBusinessCategory,
                    active: true,
                    isDefault: true,
                    slug: projectSlug,
                    createdOn: now,
                    modifiedOn: now,
                    lastPublishedAt: now,
            }));
            transaction.set(projectsSummaryRef, summaryUpdate, { merge: true });

            transaction.update(draftRef, {
                claimed: true,
                claimedByUId: userId,
                claimedAt: now,
                convertedTenantId: tenantId,
                convertedProjectId: projectId,
                convertedProjectSlug: projectSlug,
                convertedStoreId: storeId,
                convertedSubdomain: subdomain,
                convertedWasNewAccount: !hasExistingAccount,
            });

            return {
                tenantId,
                storeId,
                subdomain,
                projectId,
                projectSlug,
                referralBoundInTransaction,
                growthAcquisition,
                idempotent: false,
                isNewAccount: !hasExistingAccount,
            };
        });

        if (result.referralBoundInTransaction) clearReferralCookieOnResponse = true;
        if (result.idempotent && result.isNewAccount && referralCookiePresent) {
            clearReferralCookieOnResponse = true;
        }

        if (!result.idempotent) {
            await recordFounderGrowthEvent({
                attribution: result.growthAcquisition,
                draftId,
                stage: 'business_claimed',
            });
        }

        logSecurityDiagnostic('public_menu_claim_succeeded', getPublicMenuClaimDiagnosticContext({
            draftId,
            userId,
            tenantId: result.tenantId,
            storeId: result.storeId,
            projectId: result.projectId,
            hasExistingAccount,
            isNewAccount: result.isNewAccount,
        }));

        const cacheEffects = [
            { name: 'menu-store-tag', run: async () => revalidateTag(`menu-store-${result.storeId}`, { expire: 0 }) },
            { name: 'store-tag', run: async () => revalidateTag(`store-${result.storeId}`, { expire: 0 }) },
            { name: 'client-stores-tag', run: async () => revalidateTag('client-stores', { expire: 0 }) },
            {
                name: 'screen-content-version',
                run: async () => touchDigitalScreenContentVersionForStoreServer(result.storeId, 'publicCreateMenuClaim'),
            },
            {
                name: 'owner-business-assistant-packet',
                run: async () => invalidateOwnerBusinessAssistantPacketCache({
                    tId: result.tenantId,
                    sId: result.storeId,
                    projectId: result.projectId,
                }),
            },
        ];
        const cacheResults = await Promise.allSettled(cacheEffects.map((effect) => effect.run()));
        cacheResults.forEach((cacheResult, index) => {
            if (cacheResult.status !== 'rejected') return;
            logSecurityFailure('public_menu_claim_cache_revalidation_failed', cacheResult.reason, {
                ...getPublicMenuClaimDiagnosticContext({
                    draftId,
                    userId,
                    tenantId: result.tenantId,
                    storeId: result.storeId,
                    projectId: result.projectId,
                    hasExistingAccount,
                    isNewAccount: result.isNewAccount,
                }),
                cacheEffect: cacheEffects[index].name,
            });
        });

        // 9. Return success with URLs
        const officialPageUrl = getMenuUrl(result.subdomain);
        const menuUrl = appendPublicPath(officialPageUrl, result.projectSlug || 'menu');

        const response = NextResponse.json({
            success: true,
            storeId: result.storeId,
            tenantId: result.tenantId,
            projectId: result.projectId,
            subdomain: result.subdomain,
            officialPageUrl,
            menuUrl,
            isNewAccount: result.isNewAccount,
            idempotent: result.idempotent,
        });
        if (clearReferralCookieOnResponse) clearOwnerReferralCookie(response);
        return response;

    } catch (error) {
        if (error instanceof OnboardingUserUnavailableError) {
            logSecurityDiagnostic('public_menu_claim_current_user_unavailable', getPublicMenuClaimDiagnosticContext({
                draftId: draftIdForDiagnostics,
                userId,
                hasExistingAccount,
                isNewAccount: true,
            }));
            return NextResponse.json(
                { success: false, error: 'This account is not available for setup.' },
                { status: 409 },
            );
        }
        if (error instanceof PublicMenuClaimError) {
            return NextResponse.json(
                { success: false, error: error.clientMessage },
                { status: error.status },
            );
        }

        logSecurityFailure('public_menu_claim_failed', error, getPublicMenuClaimDiagnosticContext({
            draftId: draftIdForDiagnostics,
            userId,
            hasExistingAccount,
        }));
        const response = NextResponse.json(
            { success: false, error: 'Failed to publish your menu. Please try again.' },
            { status: 500 }
        );
        if (clearReferralCookieOnResponse) clearOwnerReferralCookie(response);
        return response;
    }
});
