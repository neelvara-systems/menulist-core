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
import { DB_COLLECTIONS } from '@constant/database';
import { getMenuUrl } from '@constant/urls';
import { admin } from '@lib/firebase/firebaseAdmin';
import { CANONICAL_SOURCE_LANGUAGE, normalizeProjectLanguages } from '@lib/localization/languagePolicy';
import { createTenantStoreInTransaction, preCheckSubdomain, updateUserWithTenantStore } from '@lib/onboarding/createTenantStore';
import { STARTER_ACTIVATION_MS, STARTER_ACTIVATION_STATUS } from '@lib/onboarding/starterActivation';
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

const ClaimSchema = z.object({
    draftId: z.string().min(1),
    businessName: z.string().min(2).max(100),
    businessType: z.string().max(80).optional(),
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
            phone: rawPhone,
            city: rawCity,
            addressLine: rawAddressLine,
        } = validation.data;
        const businessName = sanitizeString(rawBusinessName) || '';
        const businessType = sanitizeString(rawBusinessType) || '';
        const phone = sanitizeString(rawPhone) || '';
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

            if (draft.createdByUId && draft.createdByUId !== userId) {
                throw new PublicMenuClaimError(403, 'This draft belongs to another account.');
            }

            if (draft.extractionStatus !== 'completed' || !draft.extractedData) {
                throw new PublicMenuClaimError(400, 'Menu extraction is not complete yet.');
            }

            const extractedLanguageCodes = getCanonicalExtractionLanguages(draft.extractedData?.languages);
            const detectedDefaultLanguage = getDetectedDefaultLanguage(draft.extractedData?.languages);
            const now = admin.firestore.Timestamp.now();
            const activationDeadline = admin.firestore.Timestamp.fromMillis(Date.now() + STARTER_ACTIVATION_MS);
            let tenantId: number;
            let storeId: number;
            let subdomain: string;

            if (hasExistingAccount) {
                tenantId = Number(session.user.tenantId);
                storeId = Number(session.user.storeId);

                const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(storeId));
                const storeDoc = await transaction.get(storeRef);
                subdomain = storeDoc.data()?.subdomain || `store-${storeId}`;
            } else {
                const resolvedBusinessType = businessType || draft.detectedBusinessType || 'Restaurant';
                const starterActivatedAt = admin.firestore.Timestamp.now();
                const core = await createTenantStoreInTransaction(transaction, db, {
                    businessName,
                    businessType: resolvedBusinessType,
                    businessIndustry: 'B2C',
                    email: session.user.email,
                    onboardingSource: 'PUBLIC_MENU_ENTRY',
                    subdomain: { preChecked: preCheckedSubdomain },
                    includeTimeSlotPresets: true,
                    tenantExtra: {
                        phone: phone || '',
                        starterActivationStatus: STARTER_ACTIVATION_STATUS.STARTER_ACTIVE,
                        starterActivatedAt,
                        activationDeadline,
                    },
                    storeExtra: {
                        phone: phone || '',
                        city: city || '',
                        addressLine: addressLine || '',
                        starterActivationStatus: STARTER_ACTIVATION_STATUS.STARTER_ACTIVE,
                        starterActivatedAt,
                        activationDeadline,
                        activeLanguages: extractedLanguageCodes,
                        defaultLanguage: detectedDefaultLanguage,
                    },
                });

                // Update User with tenant/store IDs
                updateUserWithTenantStore(transaction, db, userId, core);

                tenantId = core.tenantId;
                storeId = core.storeId;
                subdomain = core.subdomain!;
            }

            const projectCollectionPath = `${DB_COLLECTIONS.PROJECTS}/${tenantId}/${storeId}`;
            const projectRef = db.collection(projectCollectionPath).doc();
            const projectId = projectRef.id;
            const extractedData = draft.extractedData;
            const fileEntry = {
                uid: `file_${Date.now()}`,
                name: draft.originalFileName || 'menu.jpg',
                url: draft.imageUrl,
                type: draft.fileType || 'image/jpeg',
                size: Number(draft.fileSize || 0),
                extractedData: {
                    data: {
                        categories: extractedData.categories || [],
                        items: extractedData.items || [],
                        languages: extractedData.languages || [],
                    },
                },
            };
            const projectData = {
                name: businessName,
                description: `Menu for ${businessName}`,
                active: true,
                isDefault: true,
                files: [fileEntry],
                languages: extractedLanguageCodes,
                defaultLanguage: detectedDefaultLanguage,
                config: {},
                tId: tenantId,
                sId: storeId,
                createdBy: userId,
                onboardingSource: 'PUBLIC_MENU_ENTRY',
                createdOn: now,
                modifiedOn: now,
            };

            transaction.set(projectRef, projectData);

            const projectsSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${storeId}`);
            const projectSlug = slugify(businessName) || 'menu';
            transaction.set(projectsSummaryRef, {
                lastUpdated: now,
                [`projects.${projectId}`]: {
                    name: businessName,
                    description: `Menu for ${businessName}`,
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

            return { tenantId, storeId, subdomain, projectId };
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
        const menuUrl = getMenuUrl(result.subdomain);

        return NextResponse.json({
            success: true,
            storeId: result.storeId,
            tenantId: result.tenantId,
            projectId: result.projectId,
            subdomain: result.subdomain,
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
