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
import { appendPublicPath, getMenuUrl } from '@constant/urls';
import { FALLBACK_BUSINESS_TYPE, resolveStoreBusinessCategory } from '@data/shared/businessTypes';
import { getSuggestionValue } from '@data/shared/extractedBusinessProfile';
import { admin } from '@lib/firebase/firebaseAdmin';
import { CANONICAL_SOURCE_LANGUAGE, normalizeProjectLanguages } from '@lib/localization/languagePolicy';
import { getBusinessAttributesWithMenuDefaults } from '@lib/obp/inferBusinessAttributesFromMenu';
import { createTenantStoreInTransaction, preCheckSubdomain, updateUserWithTenantStore } from '@lib/onboarding/createTenantStore';
import { STARTER_ACTIVATION_MS, STARTER_ACTIVATION_STATUS } from '@lib/onboarding/starterActivation';
import { normalizePhoneNumberForStorage } from '@lib/phone/phoneNumber';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { slugify } from '@lib/utils/slugify';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from 'src/middleware/auth';
import { sanitizeString } from 'src/middleware/publicApi';
import { z } from 'zod';

const COLLECTION = DB_COLLECTIONS.PUBLIC_MENU_DRAFTS;

const getCanonicalExtractionLanguages = (languages: any): string[] => normalizeProjectLanguages(
    Array.isArray(languages)
        ? languages.map((language) => typeof language === 'string' ? language : language?.code)
        : [],
);

const getDetectedDefaultLanguage = (languages: any): string => {
    if (Array.isArray(languages)) {
        const primary = languages.find((language) => language?.isPrimary)?.code;
        if (primary) return String(primary).trim().toLowerCase();

        const firstCode = typeof languages[0] === 'string' ? languages[0] : languages[0]?.code;
        if (firstCode) return String(firstCode).trim().toLowerCase();
    }
    return CANONICAL_SOURCE_LANGUAGE;
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
    existingPublicPresence?: Record<string, any> | null;
    phone?: string;
}) {
    const existing = params.existingPublicPresence || {};
    const defaults: Record<string, any> = {};
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

function mergeDefinedObject<T extends Record<string, any>>(value: T | null | undefined): T | undefined {
    if (!value || Object.keys(value).length === 0) return undefined;
    return value;
}

const ClaimSchema = z.object({
    draftId: z.string().min(1),
    businessName: z.string().min(2).max(100),
    businessType: z.string().max(80).optional(),
    businessCategory: z.string().max(80).optional(),
    phone: z.string().max(40).optional(),
    city: z.string().max(80).optional(),
    addressLine: z.string().max(250).optional(),
});

class PublicMenuClaimError extends Error {
    constructor(
        readonly status: number,
        readonly clientMessage: string,
    ) {
        super(clientMessage);
        this.name = 'PublicMenuClaimError';
    }
}

/**
 * POST /api/public/create-menu/claim
 * 
 * Convert draft → tenant + store + project (authenticated)
 */
export const POST = withAuth(async (request: NextRequest, session) => {
    // 1. Feature gate
    if (!FEATURE_FLAGS.ENABLE_PUBLIC_MENU_ENTRY) {
        return NextResponse.json(
            { success: false, error: 'This feature is not available.' },
            { status: 404 }
        );
    }

    const userId = session.user.id;

    try {
        const rateLimitConfig = getRateLimitForFeature('PAYMENT_ONBOARDING');
        const rateLimitResult = await checkRateLimit({
            key: `public-menu-claim:${userId}`,
            ...rateLimitConfig,
        });

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { success: false, error: 'Too many publish attempts. Please try again later.' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
                    },
                },
            );
        }

        // 2. Parse and validate input
        const body = await request.json();
        const validation = ClaimSchema.safeParse(body);

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
        const businessName = sanitizeString(rawBusinessName) || '';
        const businessType = sanitizeString(rawBusinessType) || '';
        const businessCategory = sanitizeString(rawBusinessCategory) || '';
        const phone = sanitizeString(rawPhone) || '';
        const normalizedPhone = normalizePhoneNumberForStorage({ phoneNumber: phone });
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

        // 5. Check if user already has a tenant/store
        // If they do, create a new project under existing tenant
        // If they don't, create new tenant + store (full onboarding)
        const hasExistingAccount = !!(session.user.tenantId && session.user.storeId);
        const preCheckedSubdomain = hasExistingAccount
            ? ''
            : await preCheckSubdomain(db, businessName, city);

        const result = await db.runTransaction(async (transaction) => {
            const draftDoc = await transaction.get(draftRef);
            if (!draftDoc.exists) {
                throw new PublicMenuClaimError(404, 'Draft not found or expired.');
            }

            const draft = draftDoc.data()!;
            if (draft.claimed) {
                throw new PublicMenuClaimError(409, 'This menu has already been claimed.');
            }

            if (draft.expiresAt && draft.expiresAt.toMillis() < Date.now()) {
                throw new PublicMenuClaimError(410, 'Draft expired. Please upload again.');
            }

            if (draft.createdByUId !== userId) {
                throw new PublicMenuClaimError(403, 'This draft belongs to another account.');
            }

            if (draft.extractionStatus !== 'completed' || !draft.extractedData) {
                throw new PublicMenuClaimError(400, 'Menu extraction is not complete yet.');
            }

            const extractedLanguageCodes = getCanonicalExtractionLanguages(draft.extractedData?.languages);
            const detectedDefaultLanguage = getDetectedDefaultLanguage(draft.extractedData?.languages);
            const extractedProfile = draft.extractedBusinessProfile || draft.extractedData?.extractedBusinessProfile || null;
            const profileCurrencyCode = getSuggestionValue(extractedProfile?.identity?.currencyCode, 'medium') || draft.detectedCurrencyCode || null;
            const profileCurrencySymbol = getCurrencySymbolFromCode(profileCurrencyCode);
            const profileProjectName = getSuggestionValue(extractedProfile?.project?.projectName, 'medium') || draft.suggestedProjectName || '';
            const projectName = hasValue(profileProjectName) ? String(profileProjectName).trim() : businessName;
            const brandAccentColor = getSuggestionValue(extractedProfile?.visualBrand?.brandAccentColor, 'medium') || draft.detectedBrandAccentColor || null;
            const imageBackgroundColor = getSuggestionValue(extractedProfile?.visualBrand?.imageBackgroundColor, 'medium') || draft.detectedImageBackgroundColor || null;
            const now = admin.firestore.Timestamp.now();
            const activationDeadline = admin.firestore.Timestamp.fromMillis(Date.now() + STARTER_ACTIVATION_MS);
            let tenantId: number;
            let storeId: number;
            let subdomain: string;
            let resolvedBusinessType = businessType || draft.detectedBusinessType || FALLBACK_BUSINESS_TYPE;
            let resolvedBusinessCategory = resolveStoreBusinessCategory(
                resolvedBusinessType,
                businessCategory || draft.detectedBusinessCategory,
            );
            const extractedData = draft.extractedData;
            const extractedMenuData = {
                businessAttributeSuggestions: extractedData.businessAttributeSuggestions || [],
                categories: extractedData.categories || [],
                items: extractedData.items || [],
                languages: extractedData.languages || [],
            };

            if (hasExistingAccount) {
                tenantId = Number(session.user.tenantId);
                storeId = Number(session.user.storeId);

                const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(storeId));
                const storeDoc = await transaction.get(storeRef);
                const storeData = storeDoc.data() || {};
                resolvedBusinessType = storeData.businessType || resolvedBusinessType;
                resolvedBusinessCategory = resolveStoreBusinessCategory(resolvedBusinessType, storeData.businessCategory || resolvedBusinessCategory);
                subdomain = storeData.subdomain || `store-${storeId}`;

                const publicPresenceDefaults = buildPublicPresenceDefaults({
                    addressLine,
                    brandAccentColor,
                    businessType: resolvedBusinessType,
                    existingPublicPresence: storeData.publicPresence,
                    phone,
                });
                const nextBusinessAttributes = getBusinessAttributesWithMenuDefaults(
                    extractedMenuData,
                    {
                        businessAttributes: storeData.businessAttributes,
                        businessCategory: resolvedBusinessCategory,
                        businessType: resolvedBusinessType,
                    },
                );
                const storeDefaultsPatch: Record<string, any> = {
                    ...(mergeDefinedObject(publicPresenceDefaults)
                        ? { publicPresence: { ...(storeData.publicPresence || {}), ...publicPresenceDefaults } }
                        : {}),
                    ...(nextBusinessAttributes ? { businessAttributes: nextBusinessAttributes } : {}),
                };

                if (Object.keys(storeDefaultsPatch).length > 0) {
                    transaction.update(storeRef, {
                        ...storeDefaultsPatch,
                        modifiedOn: now,
                    });
                }
            } else {
                const starterActivatedAt = admin.firestore.Timestamp.now();
                const initialPublicPresence = buildPublicPresenceDefaults({
                    addressLine,
                    brandAccentColor,
                    businessType: resolvedBusinessType,
                    phone: normalizedPhone.phone || phone,
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
                        countryCode: normalizedPhone.phone ? normalizedPhone.countryCode : undefined,
                        dialCode: normalizedPhone.phone ? normalizedPhone.dialCode : undefined,
                        phone: normalizedPhone.phone || '',
                        phoneNumber: normalizedPhone.phoneNumber || '',
                        starterActivationStatus: STARTER_ACTIVATION_STATUS.STARTER_ACTIVE,
                        starterActivatedAt,
                        activationDeadline,
                    },
                    storeExtra: {
                        countryCode: normalizedPhone.phone ? normalizedPhone.countryCode : undefined,
                        dialCode: normalizedPhone.phone ? normalizedPhone.dialCode : undefined,
                        phoneNumber: normalizedPhone.phoneNumber || '',
                        phone: normalizedPhone.phone || '',
                        city: city || '',
                        addressLine: addressLine || '',
                        starterActivationStatus: STARTER_ACTIVATION_STATUS.STARTER_ACTIVE,
                        starterActivatedAt,
                        activationDeadline,
                        activeLanguages: extractedLanguageCodes,
                        defaultLanguage: detectedDefaultLanguage,
                        ...(mergeDefinedObject(initialPublicPresence) ? { publicPresence: initialPublicPresence } : {}),
                        ...(initialBusinessAttributes ? { businessAttributes: initialBusinessAttributes } : {}),
                        ...(profileCurrencyCode ? { currencyCode: profileCurrencyCode } : {}),
                        ...(profileCurrencySymbol ? { currencySymbol: profileCurrencySymbol } : {}),
                    },
                });

                // Update User with tenant/store IDs
                updateUserWithTenantStore(transaction, db, userId, core);

                tenantId = core.tenantId;
                storeId = core.storeId;
                subdomain = core.subdomain!;
            }

            const projectCollectionPath = `${DB_COLLECTIONS.PROJECTS}/${tenantId}/${storeId}`;
            const projectId = `${tenantId}-${Date.now().toString(36)}-${storeId}`;
            const projectRef = db.collection(projectCollectionPath).doc(projectId);
            const fileEntry = {
                uid: `file_${Date.now()}`,
                name: draft.originalFileName || 'menu.jpg',
                url: draft.imageUrl,
                type: draft.fileType || 'image/jpeg',
                size: Number(draft.fileSize || 0),
                active: true,
                deleted: false,
                index: 0,
                extractedData: {
                    message: '',
                    data: {
                        categories: extractedData.categories || [],
                        items: extractedData.items || [],
                        languages: extractedData.languages || [],
                    },
                },
            };
            const projectData = {
                name: projectName,
                description: projectName === businessName ? `Menu for ${businessName}` : `${projectName} for ${businessName}`,
                businessType: resolvedBusinessType,
                businessCategory: resolvedBusinessCategory,
                active: true,
                isDefault: true,
                files: [fileEntry],
                languages: extractedLanguageCodes,
                defaultLanguage: detectedDefaultLanguage,
                config: brandAccentColor ? { design: { brand: { accentColor: brandAccentColor } } } : {},
                ...(imageBackgroundColor ? { aiPreferences: { image: { backgroundColor: imageBackgroundColor } } } : {}),
                tId: tenantId,
                sId: storeId,
                createdBy: userId,
                onboardingSource: 'PUBLIC_MENU_ENTRY',
                createdOn: now,
                modifiedOn: now,
            };

            transaction.set(projectRef, projectData);

            const projectsSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${storeId}`);
            const projectSlug = slugify(projectName) || 'menu';
            transaction.set(projectsSummaryRef, {
                lastUpdated: now,
                [`projects.${projectId}`]: {
                    name: projectName,
                    description: projectName === businessName ? `Menu for ${businessName}` : `${projectName} for ${businessName}`,
                    businessType: resolvedBusinessType,
                    businessCategory: resolvedBusinessCategory,
                    active: true,
                    isDefault: true,
                    slug: projectSlug,
                    createdOn: now,
                    modifiedOn: now,
                },
            }, { merge: true });

            transaction.update(draftRef, {
                claimed: true,
                claimedByUId: userId,
                claimedAt: now,
                convertedProjectId: projectId,
                convertedStoreId: storeId,
            });

            return { tenantId, storeId, subdomain, projectId, projectSlug };
        });

        secureLog('[PublicMenuEntry] Draft claimed successfully', {
            draftId,
            userId,
            tenantId: result.tenantId,
            storeId: result.storeId,
            projectId: result.projectId,
            isExistingUser: hasExistingAccount,
        });

        try {
            revalidateTag(`menu-store-${result.storeId}`);
            revalidateTag(`store-${result.storeId}`);
            revalidateTag('client-stores');
        } catch (cacheError) {
            secureError('[PublicMenuEntry] Cache revalidation failed', cacheError instanceof Error ? cacheError : new Error(String(cacheError)), { draftId, storeId: result.storeId });
        }

        // 9. Return success with URLs
        const officialPageUrl = getMenuUrl(result.subdomain);
        const menuUrl = appendPublicPath(officialPageUrl, result.projectSlug || 'menu');

        return NextResponse.json({
            success: true,
            storeId: result.storeId,
            tenantId: result.tenantId,
            projectId: result.projectId,
            subdomain: result.subdomain,
            officialPageUrl,
            menuUrl,
            isNewAccount: !hasExistingAccount,
        });

    } catch (error) {
        if (error instanceof PublicMenuClaimError) {
            return NextResponse.json(
                { success: false, error: error.clientMessage },
                { status: error.status },
            );
        }

        secureError('[PublicMenuEntry] Claim failed', error instanceof Error ? error : new Error(String(error)), { userId });
        return NextResponse.json(
            { success: false, error: 'Failed to publish your menu. Please try again.' },
            { status: 500 }
        );
    }
});
