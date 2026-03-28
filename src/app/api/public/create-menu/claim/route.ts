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
import { admin } from '@lib/firebase/firebaseAdmin';
import { createTenantStoreInTransaction, preCheckSubdomain, updateUserWithTenantStore } from '@lib/onboarding/createTenantStore';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from 'src/middleware/auth';
import { z } from 'zod';

const COLLECTION = DB_COLLECTIONS.PUBLIC_MENU_DRAFTS;

const ClaimSchema = z.object({
    draftId: z.string().min(1),
    businessName: z.string().min(2).max(100),
    businessType: z.string().optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
});

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
        // 2. Parse and validate input
        const body = await request.json();
        const validation = ClaimSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid input.', details: validation.error.issues },
                { status: 400 }
            );
        }

        const { draftId, businessName, businessType, phone, city } = validation.data;

        // 3. Look up draft
        const db = admin.firestore();
        const draftRef = db.collection(COLLECTION).doc(draftId);
        const draftDoc = await draftRef.get();

        if (!draftDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Draft not found or expired.' },
                { status: 404 }
            );
        }

        const draft = draftDoc.data()!;

        // 4. Validate draft state
        if (draft.claimed) {
            return NextResponse.json(
                { success: false, error: 'This menu has already been claimed.' },
                { status: 409 }
            );
        }

        if (draft.expiresAt && draft.expiresAt.toMillis() < Date.now()) {
            return NextResponse.json(
                { success: false, error: 'Draft expired. Please upload again.' },
                { status: 410 }
            );
        }

        if (draft.extractionStatus !== 'completed' || !draft.extractedData) {
            return NextResponse.json(
                { success: false, error: 'Menu extraction is not complete yet.' },
                { status: 400 }
            );
        }

        // 5. Check if user already has a tenant/store
        // If they do, create a new project under existing tenant
        // If they don't, create new tenant + store (full onboarding)
        const hasExistingAccount = !!(session.user.tenantId && session.user.storeId);

        let tenantId: number;
        let storeId: number;
        let subdomain: string;

        if (hasExistingAccount) {
            // Existing user — add project to their existing store
            tenantId = Number(session.user.tenantId);
            storeId = Number(session.user.storeId);

            // Get existing store subdomain
            const storeDoc = await db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).get();
            subdomain = storeDoc.data()?.subdomain || `store-${storeId}`;

        } else {
            // New user — create tenant + store (centralized utility)
            const resolvedBusinessType = businessType || draft.detectedBusinessType || 'Restaurant';
            const preCheckedSubdomain = await preCheckSubdomain(db, businessName);

            const result = await db.runTransaction(async (transaction) => {
                const core = await createTenantStoreInTransaction(transaction, db, {
                    businessName,
                    businessType: resolvedBusinessType,
                    businessIndustry: 'B2C',
                    email: session.user.email,
                    onboardingSource: 'PUBLIC_MENU_ENTRY',
                    subdomain: { preChecked: preCheckedSubdomain },
                    includeTimeSlotPresets: true,
                    tenantExtra: { phone: phone || '' },
                    storeExtra: { phone: phone || '', city: city || '' },
                });

                // Update User with tenant/store IDs
                updateUserWithTenantStore(transaction, db, userId, core);

                return { tenantId: core.tenantId, storeId: core.storeId, subdomain: core.subdomain! };
            });

            tenantId = result.tenantId;
            storeId = result.storeId;
            subdomain = result.subdomain;
        }

        // 6. Create project with extracted data
        const now = admin.firestore.Timestamp.now();
        const projectCollectionPath = `${DB_COLLECTIONS.PROJECTS}/${tenantId}/${storeId}`;
        const projectRef = db.collection(projectCollectionPath).doc();
        const projectId = projectRef.id;

        // Build project data from extraction
        const extractedData = draft.extractedData;
        const language = extractedData.languages?.[0] || 'en';

        // Create a single file entry with the extracted data
        const fileEntry = {
            uid: `file_${Date.now()}`,
            name: draft.originalFileName || 'menu.jpg',
            url: draft.imageUrl,
            type: 'image/jpeg',
            size: 0,
            extractedData: {
                data: {
                    categories: extractedData.categories || [],
                    items: extractedData.items || [],
                },
            },
        };

        const projectData = {
            name: businessName,
            description: `Menu for ${businessName}`,
            active: true,
            isDefault: true,
            files: [fileEntry],
            languages: [{ code: language, name: language === 'en' ? 'English' : language }],
            config: {},
            tId: tenantId,
            sId: storeId,
            createdBy: userId,
            onboardingSource: 'PUBLIC_MENU_ENTRY',
            createdOn: now,
            modifiedOn: now,
        };

        await projectRef.set(projectData);

        // 7. Sync projectsSummary
        const projectsSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${storeId}`);
        await projectsSummaryRef.set({
            lastUpdated: now,
            [`projects.${projectId}`]: {
                name: businessName,
                active: true,
                isDefault: true,
                createdOn: now,
            },
        }, { merge: true });

        // 8. Mark draft as claimed
        await draftRef.update({
            claimed: true,
            claimedByUId: userId,
            claimedAt: now,
            convertedProjectId: projectId,
            convertedStoreId: storeId,
        });

        secureLog('[PublicMenuEntry] Draft claimed successfully', {
            draftId,
            userId,
            tenantId,
            storeId,
            projectId,
            isExistingUser: hasExistingAccount,
        });

        // 9. Return success with URLs
        const menuUrl = `https://${subdomain}.menulist.site`;

        return NextResponse.json({
            success: true,
            storeId,
            tenantId,
            projectId,
            subdomain,
            menuUrl,
            isNewAccount: !hasExistingAccount,
        });

    } catch (error) {
        secureError('[PublicMenuEntry] Claim failed', error instanceof Error ? error : new Error(String(error)), { userId });
        return NextResponse.json(
            { success: false, error: 'Failed to publish your menu. Please try again.' },
            { status: 500 }
        );
    }
});
