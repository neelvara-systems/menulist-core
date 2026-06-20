export const dynamic = 'force-dynamic';

/**
 * Answerlattice Client Onboarding API
 *
 * Creates a new Answerlattice tenant (tenant + store + subscription) for a SaaS founder.
 * Reuses the existing atomic transaction pattern from product subscription creation.
 *
 * Flow:
 * 1. User signs up via Google OAuth (existing NextAuth)
 * 2. User selects plan on answerlattice.com/get-started
 * 3. This route creates: tenant, store, user update, Razorpay subscription
 * 4. User completes payment → subscription activates via existing webhook
 *
 * During beta: creates subscription with $0 plan (no Razorpay needed)
 *
 * @see __docs__/answerlattice/client-onboarding/
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { getAnswerlatticeBetaPlan, getAnswerlatticePlanById } from '@data/answerlattice/plans';
import { getOwnerRoleId } from '@data/defaultRoles';
import { ANSWERLATTICE_PRODUCT_ACCOUNT_KEY } from '@lib/answerlattice/sessionScope';
import { buildAnswerlatticeWidgetApiStateWithNewKey } from '@lib/answerlattice/widgetKeyManager';
import {
    getContextContentSummaryDocId,
    parseProductSurfaceSaveInput,
} from '@lib/answerlattice/productSurfaceContent';
import { upsertAnswerlatticeTenantSummaryAdmin } from '@lib/answerlattice/tenantSummaryAdmin';
import {
    initializeAnswerlatticeCompiledContextControlPlaneAdmin,
    markAnswerlatticeCompiledContextSourceChangedAdmin,
} from '@lib/answerlattice/compiledSourceVersionsAdmin';
import {
    normalizeAnswerlatticeBusinessDayEndTime,
    normalizeAnswerlatticeTimeZone,
} from '@lib/answerlattice/schedulerSettings';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { shouldUseSharedAnswerlatticeFirebase } from '@lib/firebase/answerlatticeConfig';
import { admin } from '@lib/firebase/firebaseAdmin';
import { createTenantStoreInTransaction } from '@lib/onboarding/createTenantStore';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { secureError } from '@lib/security/secureLogger';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { hashApiKey } from '@lib/publicApi/auth';
import { writeLogEntry } from 'logs/utils';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const LOG_FILE = 'answerlattice-onboarding.log';
const OptionalUrlSchema = z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().url().max(300).optional(),
);
const OptionalEmailSchema = z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().email().max(160).optional(),
);
const BillingModelSchema = z.enum(['free', 'subscription', 'usage', 'one_time', 'not_sure']);
const OnboardRequestSchema = z.object({
    companyName: z.string().trim().min(2).max(120),
    productName: z.string().trim().max(120).optional(),
    productUrl: OptionalUrlSchema,
    supportEmail: OptionalEmailSchema,
    billingModel: BillingModelSchema.optional().default('subscription'),
    primarySurfaces: z.array(z.string().trim().min(1).max(80)).max(8).optional().default([]),
    timeZone: z.string().trim().max(80).optional(),
    businessDayEndTime: z.string().trim().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    planId: z.string().trim().max(80).optional().default('answerlattice_beta'),
    interval: z.enum(['MONTH', 'YEAR']).optional().default('MONTH'),
    currency: z.enum(['INR', 'USD']).optional().default('INR'),
});

const ONBOARDING_SURFACE_TEMPLATES: Record<string, {
    label: string;
    routePatterns: string[];
    feature: string;
    page: string;
    workflow?: string;
    entityHints: string[];
    tags: string[];
    priority: number;
}> = {
    billing: {
        label: 'Billing',
        routePatterns: ['/billing', '/billing/*', '/settings/billing/*'],
        feature: 'billing',
        page: 'billing',
        workflow: 'manage_subscription',
        entityHints: ['invoice', 'subscription', 'payment'],
        tags: ['billing', 'subscription'],
        priority: 120,
    },
    onboarding: {
        label: 'Onboarding',
        routePatterns: ['/onboarding', '/setup/*', '/get-started/*'],
        feature: 'onboarding',
        page: 'setup',
        workflow: 'complete_setup',
        entityHints: ['setup', 'import', 'activation'],
        tags: ['onboarding', 'setup'],
        priority: 110,
    },
    settings: {
        label: 'Settings',
        routePatterns: ['/settings', '/settings/*'],
        feature: 'settings',
        page: 'settings',
        workflow: 'manage_workspace',
        entityHints: ['settings', 'workspace', 'configuration'],
        tags: ['settings'],
        priority: 100,
    },
    team: {
        label: 'Team',
        routePatterns: ['/team', '/settings/team/*', '/users/*'],
        feature: 'team',
        page: 'members',
        workflow: 'manage_team',
        entityHints: ['user', 'role', 'permission'],
        tags: ['team', 'permissions'],
        priority: 90,
    },
    integrations: {
        label: 'Integrations',
        routePatterns: ['/integrations', '/integrations/*', '/settings/integrations/*'],
        feature: 'integrations',
        page: 'integrations',
        workflow: 'connect_integration',
        entityHints: ['integration', 'api', 'connection'],
        tags: ['integrations'],
        priority: 80,
    },
    release_notes: {
        label: 'Release Notes',
        routePatterns: ['/releases', '/changelog', '/whats-new'],
        feature: 'release_notes',
        page: 'releases',
        workflow: 'review_changes',
        entityHints: ['release', 'change', 'update'],
        tags: ['release_notes', 'changelog'],
        priority: 70,
    },
};

const DEFAULT_ONBOARDING_SURFACES = ['billing', 'onboarding', 'settings'];

const normalizeOnboardingSurfaces = (values: string[]): string[] => {
    const selected = Array.from(new Set(
        values
            .map(value => value.trim().toLowerCase())
            .filter(value => Boolean(ONBOARDING_SURFACE_TEMPLATES[value]))
    ));

    return selected.length ? selected : DEFAULT_ONBOARDING_SURFACES;
};

const bootstrapInitialProductSurfaces = async (params: {
    db: FirebaseFirestore.Firestore;
    tId: number;
    sId: number;
    userId: string;
    surfaceKeys: string[];
}): Promise<number> => {
    const surfaceKeys = normalizeOnboardingSurfaces(params.surfaceKeys);
    const batch = params.db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const surfaceSummary: Record<string, any> = {};

    surfaceKeys.forEach((surfaceKey) => {
        const template = ONBOARDING_SURFACE_TEMPLATES[surfaceKey];
        const parsed = parseProductSurfaceSaveInput({
            key: surfaceKey,
            label: template.label,
            description: `Initial ${template.label.toLowerCase()} product surface from Answerlattice onboarding.`,
            routePatterns: template.routePatterns,
            feature: template.feature,
            page: template.page,
            workflow: template.workflow,
            entityHints: template.entityHints,
            tags: template.tags,
            active: true,
            priority: template.priority,
            visibility: { helpWidget: true, helpCenter: true, changelog: true },
        }, { tId: params.tId, sId: params.sId });
        const docId = `${params.tId}_${params.sId}_${parsed.key}`;
        const docRef = params.db.collection(DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES).doc(docId);

        batch.set(docRef, {
            ...parsed,
            createdOn: now,
            modifiedOn: now,
            createdBy: params.userId,
            modifiedBy: params.userId,
            uId: params.userId,
            onboardingSource: 'ANSWERLATTICE_ONBOARDING',
        }, { merge: true });

        surfaceSummary[parsed.key] = {
            key: parsed.key,
            label: parsed.label,
            routePatterns: parsed.routePatterns,
            feature: parsed.feature,
            page: parsed.page,
            workflow: parsed.workflow,
            entityHints: parsed.entityHints,
            entityIds: [],
            tags: parsed.tags,
            visibility: parsed.visibility,
            articles: [],
            changelogs: [],
            tickets: { total: 0, open: 0, recentDisplayIds: [] },
        };
    });

    batch.set(
        params.db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getContextContentSummaryDocId(params.tId, params.sId)),
        {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: params.tId,
            sId: params.sId,
            generatedAt: now,
            source: 'client_onboarding_surface_bootstrap',
            surfaceCount: surfaceKeys.length,
            articleCount: 0,
            changelogCount: 0,
            ticketCount: 0,
            surfaces: surfaceSummary,
        },
        { merge: true },
    );

    await batch.commit();
    return surfaceKeys.length;
};

const getAnswerlatticeDb = () => {
    const db = shouldUseSharedAnswerlatticeFirebase
        ? admin.firestore()
        : answerlatticeFirestoreAdmin;

    return db && typeof (db as any).collection === 'function' ? db : null;
};

const getAnswerlatticeUserByEmail = async (db: FirebaseFirestore.Firestore, email?: string | null) => {
    const normalizedEmail = String(email || '').toLowerCase().trim();
    if (!normalizedEmail) return null;

    const snapshot = await db.collection(DB_COLLECTIONS.USERS)
        .where('email', '==', normalizedEmail)
        .limit(1)
        .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Record<string, any>;
};

const createAnswerlatticeSubscription = async (
    db: FirebaseFirestore.Firestore,
    providerSubscriptionId: string,
    data: Omit<FirestoreSubscriptionDoc, 'id'>,
) => {
    const now = admin.firestore.Timestamp.now();
    await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(providerSubscriptionId).set({
        ...data,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        productId: PRODUCT_IDS.ANSWERLATTICE,
        tId: data.tenantId,
        sId: data.storeId,
        uId: data.userId,
        role: 'owner',
        modifiedOn: now,
        createdOn: now,
        createdBy: data.name || data.email || 'Answerlattice',
        modifiedBy: data.name || data.email || 'Answerlattice',
    });
};

const syncDefaultAuthProductAccount = async (params: {
    userId: string;
    session: any;
    tenantId: number;
    storeId: number;
    storeName: string;
}) => {
    const now = admin.firestore.Timestamp.now();
    const role = getOwnerRoleId();
    const rootTenantMissing = !params.session?.user?.tenantId;
    const rootStoreMissing = !params.session?.user?.storeId;
    const answerlatticeProductAccount = {
        tenantId: params.tenantId,
        storeId: params.storeId,
        role,
        platformRole: params.session?.user?.platformRole || 'OWNER',
        storeIds: [params.storeId],
        updatedAt: now,
    };
    const defaultUserUpdate: Record<string, any> = {
        productAccounts: {
            [ANSWERLATTICE_PRODUCT_ACCOUNT_KEY]: answerlatticeProductAccount,
        },
        modifiedOn: now,
    };

    if (rootTenantMissing && rootStoreMissing) {
        defaultUserUpdate.tenantId = params.tenantId;
        defaultUserUpdate.storeId = params.storeId;
        defaultUserUpdate.pId = PRODUCT_IDS.ANSWERLATTICE;
        defaultUserUpdate.productId = PRODUCT_IDS.ANSWERLATTICE;
        defaultUserUpdate.role = role;
        defaultUserUpdate.stores = [{
            storeId: params.storeId,
            name: params.storeName,
            role,
        }];
    }

    await admin.firestore()
        .collection(DB_COLLECTIONS.USERS)
        .doc(params.userId)
        .set(defaultUserUpdate, { merge: true });
};

export const POST = withAuth(async (request: NextRequest, session) => {
    const userId = session.user.id;

    try {
        // 0. Feature flag check — widget flag acts as the Answerlattice distribution gate
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET) {
            return NextResponse.json(
                { error: 'Answerlattice onboarding is not available yet.' },
                { status: 403 }
            );
        }

        const db = getAnswerlatticeDb();
        if (!db) {
            return NextResponse.json(
                { error: 'Answerlattice Firebase is not configured.' },
                { status: 503 }
            );
        }

        // 1. Verify user doesn't already have an Answerlattice tenant. A separate
        // tenant/store on the same login must not block Answerlattice onboarding.
        const existingProductAccount = (session.user as any)?.productAccounts?.[ANSWERLATTICE_PRODUCT_ACCOUNT_KEY];
        const existingAnswerlatticeUser = await getAnswerlatticeUserByEmail(db, session.user.email);
        if (
            (existingProductAccount?.tenantId && existingProductAccount?.storeId)
            || (existingAnswerlatticeUser?.tenantId && existingAnswerlatticeUser?.storeId)
        ) {
            return NextResponse.json(
                { error: 'You already have an account. Go to your dashboard.' },
                { status: 400 }
            );
        }

        // 2. Rate limiting
        const rateLimitConfig = getRateLimitForFeature('PAYMENT_ONBOARDING');
        const rateLimitResult = await checkRateLimit({
            key: `answerlattice-onboard:${userId}`,
            ...rateLimitConfig,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({
                error: 'Too many attempts. Please try again later.',
                resetAt: rateLimitResult.resetAt,
            }, { status: 429 });
        }

        // 3. Parse input
        const validation = OnboardRequestSchema.safeParse(await request.json());
        if (!validation.success) {
            return NextResponse.json({ error: 'Company name is required (min 2 chars).' }, { status: 400 });
        }
        const {
            companyName,
            productName,
            productUrl,
            supportEmail,
            billingModel,
            primarySurfaces,
            planId,
            interval,
            currency,
            timeZone,
            businessDayEndTime,
        } = validation.data;

        // 4. Resolve plan
        const plan = planId === 'answerlattice_beta'
            ? getAnswerlatticeBetaPlan()
            : getAnswerlatticePlanById(planId, interval);

        if (!plan) {
            return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
        }

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'ANSWERLATTICE_ONBOARD_STARTED',
            data: { userId, companyName, productName, planId },
        });

        // 5. ATOMIC TRANSACTION: Create Tenant + Store + Update User
        const cleanCompany = companyName.trim();
        const storeName = productName || companyName;
        const ownerRole = getOwnerRoleId();
        const launchProfileCreatedAt = admin.firestore.Timestamp.now();
        const schedulerTimeZone = normalizeAnswerlatticeTimeZone(timeZone);
        const schedulerBusinessDayEndTime = normalizeAnswerlatticeBusinessDayEndTime(businessDayEndTime);

        const result = await db.runTransaction(async (transaction) => {
            // Centralized tenant + store creation
            const core = await createTenantStoreInTransaction(transaction, db, {
                businessName: cleanCompany,
                businessType: 'SaaS',
                businessIndustry: 'B2B',
                email: session.user.email,
                onboardingSource: 'ANSWERLATTICE_ONBOARDING',
                storeName,
                allowInitialCounters: true,
                tenantExtra: {
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    productId: PRODUCT_IDS.ANSWERLATTICE,
                    productName: productName || '',
                    productUrl: productUrl || '',
                    supportEmail: supportEmail || '',
                    billingModel,
                },
                storeExtra: {
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    productId: PRODUCT_IDS.ANSWERLATTICE,
                    productName: productName || storeName,
                    productUrl: productUrl || '',
                    supportEmail: supportEmail || '',
                    billingModel,
                    timeZone: schedulerTimeZone,
                    businessDayEndTime: schedulerBusinessDayEndTime,
                    primarySurfaces: normalizeOnboardingSurfaces(primarySurfaces),
                    answerlatticeLaunchProfile: {
                        productUrl: productUrl || '',
                        supportEmail: supportEmail || '',
                        billingModel,
                        timeZone: schedulerTimeZone,
                        businessDayEndTime: schedulerBusinessDayEndTime,
                        primarySurfaces: normalizeOnboardingSurfaces(primarySurfaces),
                        createdAt: launchProfileCreatedAt,
                    },
                },
            });

            const userRef = db.collection(DB_COLLECTIONS.USERS).doc(userId);
            transaction.set(userRef, {
                id: userId,
                email: String(session.user.email || '').toLowerCase().trim(),
                name: session.user.name || session.user.email || 'Answerlattice user',
                image: session.user.image || '',
                isVerified: true,
                active: true,
                tenantId: core.tenantId,
                storeId: core.storeId,
                stores: [
                    {
                        storeId: core.storeId,
                        name: core.storeName,
                        role: ownerRole,
                    },
                ],
                storeIds: [core.storeId],
                pId: PRODUCT_IDS.ANSWERLATTICE,
                productId: PRODUCT_IDS.ANSWERLATTICE,
                role: ownerRole,
                platformRole: 'OWNER',
                tId: core.tenantId,
                sId: core.storeId,
                uId: userId,
                onboardingSource: 'ANSWERLATTICE_ONBOARDING',
                modifiedOn: core.now,
                createdOn: core.now,
            }, { merge: true });

            return { tenantId: core.tenantId, storeId: core.storeId, storeName: core.storeName };
        });

        await syncDefaultAuthProductAccount({
            userId,
            session,
            tenantId: result.tenantId,
            storeId: result.storeId,
            storeName: result.storeName,
        });

        let initialSurfaceCount = 0;
        await bootstrapInitialProductSurfaces({
            db,
            tId: result.tenantId,
            sId: result.storeId,
            userId,
            surfaceKeys: primarySurfaces,
        }).then((count) => {
            initialSurfaceCount = count;
        }).catch((surfaceError) => {
            secureError('[Answerlattice Onboard] Initial surface bootstrap failed', surfaceError as Error, {
                tenantId: result.tenantId,
                storeId: result.storeId,
            });
        });

        await upsertAnswerlatticeTenantSummaryAdmin({
            tId: result.tenantId,
            sId: result.storeId,
            source: 'client_onboarding',
            hasEntities: false,
            timeZone: schedulerTimeZone,
            businessDayEndTime: schedulerBusinessDayEndTime,
        }).catch((summaryError) => {
            secureError('[Answerlattice Onboard] Tenant summary sync failed', summaryError as Error, {
                tenantId: result.tenantId,
                storeId: result.storeId,
            });
        });

        await initializeAnswerlatticeCompiledContextControlPlaneAdmin(result.tenantId, result.storeId, {
            reason: 'client_onboarding',
            sourceType: 'answerlattice_workspace',
        }).then(async () => {
            if (initialSurfaceCount > 0) {
                await markAnswerlatticeCompiledContextSourceChangedAdmin('surfaces', result.tenantId, result.storeId, {
                    reason: 'initial_surfaces_created',
                    sourceType: 'answerlattice_product_surfaces',
                });
            }
        }).catch((bundleInitError) => {
            secureError('[Answerlattice Onboard] Compiled context control-plane init failed', bundleInitError as Error, {
                tenantId: result.tenantId,
                storeId: result.storeId,
            });
        });

        // 6. Create Subscription (Beta: free, no Razorpay needed; paid: Razorpay recurring)
        const isBeta = planId === 'answerlattice_beta';
        let subscriptionId = isBeta
            ? `answerlattice_beta_${result.tenantId}_${result.storeId}_${Date.now()}`
            : `answerlattice_${result.tenantId}_${result.storeId}_${Date.now()}`;
        let razorpaySubscription: any = null;
        let subscriptionSummary: Record<string, any> | null = null;

        if (isBeta) {
            // Beta: Create free subscription directly (no Razorpay)
            const betaEnd = new Date();
            betaEnd.setMonth(betaEnd.getMonth() + 6); // 6-month beta

            const subscriptionPayload: Omit<FirestoreSubscriptionDoc, 'id'> = {
                paymentProvider: 'razorpay',
                providerSubscriptionId: subscriptionId,
                providerPlanId: '',
                userId,
                name: session.user.name || '',
                email: session.user.email || '',
                tenantId: result.tenantId,
                storeId: result.storeId,
                tId: result.tenantId,
                sId: result.storeId,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                productId: PRODUCT_IDS.ANSWERLATTICE,
                planType: 'MONTH',
                userType: 'B2B',
                currency: 'INR',
                amount: 0,
                status: 'active',
                lastWebhook: null,
                planId: 'answerlattice_beta',
                planName: 'Answerlattice Beta',
                cycleStartDate: admin.firestore.Timestamp.now() as any,
                subscriptionEndDate: admin.firestore.Timestamp.fromDate(betaEnd) as any,
                subscriptionStartDate: admin.firestore.Timestamp.now() as any,
                pastDueSinceAt: null as any,
                totalPaymentsNeededCount: 0,
                totalPaymentsMadeCount: 0,
                cycleEndDate: admin.firestore.Timestamp.fromDate(betaEnd) as any,
                renewsOn: null as any,
                monthlyCreditsAllowance: plan.priceINR.monthlyCredits,
                monthlyCredits: plan.priceINR.monthlyCredits,
                topUpCredits: 0,
                creditsLastResetMonth: new Date().getFullYear() * 100 + (new Date().getMonth() + 1),
                shortUrl: '',
                paymentMethod: { type: 'beta', brand: '', last4: '', upiId: '', upiTransactionId: '' },
                statuses: [{
                    status: 'active',
                    timestamp: admin.firestore.Timestamp.now() as any,
                    amount: 0,
                    currency: 'INR',
                    remark: 'Answerlattice Beta — 6 months free access',
                }],
                billingHistory: [],
                quantity: 1,
                billingMode: 'auto' as any,
                onboardingSource: 'ANSWERLATTICE_ONBOARDING' as any,
            };

            await createAnswerlatticeSubscription(db, subscriptionId, subscriptionPayload);
            subscriptionSummary = {
                id: subscriptionId,
                providerSubscriptionId: subscriptionId,
                planId: 'answerlattice_beta',
                planName: 'Answerlattice Beta',
                status: 'active',
                currency: 'INR',
                amount: 0,
                isBeta: true,
                subscriptionEndDate: admin.firestore.Timestamp.fromDate(betaEnd),
                monthlyCreditsAllowance: plan.priceINR.monthlyCredits,
                monthlyCredits: plan.priceINR.monthlyCredits,
                topUpCredits: 0,
                creditsLastResetMonth: subscriptionPayload.creditsLastResetMonth,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
        } else {
            const { getOrCreateRazorpayPlan } = await import('@lib/razorpay/plan-handler');
            const { razorpayClient } = await import('@lib/razorpay/razorpay');
            const price = currency === 'USD' ? plan.priceUSD.price : plan.priceINR.price;
            const monthlyCredits = currency === 'USD' ? plan.priceUSD.monthlyCredits : plan.priceINR.monthlyCredits;
            const razorpayPlanId = await getOrCreateRazorpayPlan({
                productId: PRODUCT_IDS.ANSWERLATTICE,
                price,
                currency,
                interval,
                userType: 'B2B',
                planId: plan.planId,
            });
            const totalCount = interval === 'MONTH' ? 36 : 3;

            razorpaySubscription = await razorpayClient.subscriptions.create({
                plan_id: razorpayPlanId,
                total_count: totalCount,
                quantity: 1,
                notes: {
                    productId: PRODUCT_IDS.ANSWERLATTICE,
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    tenantId: result.tenantId,
                    storeId: result.storeId,
                    tId: result.tenantId,
                    sId: result.storeId,
                    userId,
                    uId: userId,
                    userType: 'B2B',
                    planId: plan.planId,
                    interval,
                    currency,
                    name: session.user.name,
                    email: session.user.email,
                    price,
                    remainingCredits: 0,
                    onboardingSource: 'ANSWERLATTICE_ONBOARDING',
                },
            });
            subscriptionId = razorpaySubscription.id;

            const subscriptionPayload: Omit<FirestoreSubscriptionDoc, 'id'> = {
                paymentProvider: 'razorpay',
                providerSubscriptionId: razorpaySubscription.id,
                providerPlanId: razorpayPlanId,
                userId,
                name: session.user.name || '',
                email: session.user.email || '',
                tenantId: result.tenantId,
                storeId: result.storeId,
                tId: result.tenantId,
                sId: result.storeId,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                productId: PRODUCT_IDS.ANSWERLATTICE,
                planType: interval,
                userType: 'B2B',
                currency,
                amount: price,
                status: 'pending',
                lastWebhook: null,
                planId: plan.planId,
                planName: plan.name,
                cycleStartDate: null as any,
                subscriptionEndDate: null as any,
                subscriptionStartDate: null as any,
                pastDueSinceAt: null as any,
                totalPaymentsNeededCount: razorpaySubscription.total_count,
                totalPaymentsMadeCount: 0,
                cycleEndDate: null as any,
                renewsOn: null as any,
                monthlyCreditsAllowance: monthlyCredits,
                monthlyCredits,
                topUpCredits: 0,
                creditsLastResetMonth: new Date().getFullYear() * 100 + (new Date().getMonth() + 1),
                shortUrl: razorpaySubscription.short_url || '',
                paymentMethod: { type: '', brand: '', last4: '', upiId: '', upiTransactionId: '' },
                statuses: [{
                    status: 'pending',
                    timestamp: admin.firestore.Timestamp.now() as any,
                    amount: price,
                    currency,
                    remark: 'Answerlattice paid subscription initiated',
                }],
                billingHistory: [],
                quantity: 1,
                billingMode: 'auto' as any,
                onboardingSource: 'ANSWERLATTICE_ONBOARDING' as any,
            };

            await createAnswerlatticeSubscription(db, razorpaySubscription.id, subscriptionPayload);
            subscriptionSummary = {
                id: razorpaySubscription.id,
                providerSubscriptionId: razorpaySubscription.id,
                planId: plan.planId,
                planName: plan.name,
                status: 'pending',
                currency,
                amount: price,
                isBeta: false,
                subscriptionEndDate: null,
                monthlyCreditsAllowance: monthlyCredits,
                monthlyCredits,
                topUpCredits: 0,
                creditsLastResetMonth: subscriptionPayload.creditsLastResetMonth,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
        }

        // 7. Generate API key for the widget
        const apiKey = `al_${randomUUID().replace(/-/g, '')}`;
        const apiKeyHash = hashApiKey(apiKey);
        const widgetKeyState = buildAnswerlatticeWidgetApiStateWithNewKey({
            apiKey,
            keyHash: apiKeyHash,
            name: 'Default widget key',
        });
        await db.collection(DB_COLLECTIONS.STORES).doc(String(result.storeId)).update({
            answerlatticeSubscription: subscriptionSummary,
            answerlatticeWidgetApi: widgetKeyState.state,
        });

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'ANSWERLATTICE_ONBOARD_COMPLETE',
            data: {
                userId,
                tenantId: result.tenantId,
                storeId: result.storeId,
                subscriptionId,
                planId,
                initialSurfaceCount,
            },
        });

        return NextResponse.json({
            tenantId: result.tenantId,
            storeId: result.storeId,
            subscriptionId,
            apiKey,
            subscription: razorpaySubscription ? {
                id: razorpaySubscription.id,
                shortUrl: razorpaySubscription.short_url || null,
                status: razorpaySubscription.status || 'created',
            } : null,
            plan: {
                id: plan.planId,
                name: plan.name,
                isBeta,
            },
            initialSurfaceCount,
        });

    } catch (error) {
        secureError('[Answerlattice Onboard] Failed', error as Error, { userId });
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'ANSWERLATTICE_ONBOARD_ERROR',
            data: { userId, error: (error as Error).message },
        });
        return NextResponse.json(
            { error: 'Failed to create account. Please try again.' },
            { status: 500 }
        );
    }
});
