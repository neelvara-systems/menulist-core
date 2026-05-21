export const dynamic = 'force-dynamic';

/**
 * Canonica Client Onboarding API
 *
 * Creates a new Canonica tenant (tenant + store + subscription) for a SaaS founder.
 * Reuses the same atomic transaction pattern as MenuList's create-subscription.
 *
 * Flow:
 * 1. User signs up via Google OAuth (existing NextAuth)
 * 2. User selects plan on canonica.app/get-started
 * 3. This route creates: tenant, store, user update, Razorpay subscription
 * 4. User completes payment → subscription activates via existing webhook
 *
 * During beta: creates subscription with $0 plan (no Razorpay needed)
 *
 * @see __docs__/canonica/client-onboarding/
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { getCanonicaBetaPlan, getCanonicaPlanById } from '@data/canonica/plans';
import { getOwnerRoleId } from '@data/defaultRoles';
import { CANONICA_PRODUCT_ACCOUNT_KEY } from '@lib/canonica/sessionScope';
import { CANONICA_WIDGET_SCOPES } from '@lib/canonica/widgetConfig';
import { upsertCanonicaTenantSummaryAdmin } from '@lib/canonica/tenantSummaryAdmin';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { shouldUseSharedCanonicaFirebase } from '@lib/firebase/canonicaConfig';
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

const LOG_FILE = 'canonica-onboarding.log';
const OnboardRequestSchema = z.object({
    companyName: z.string().trim().min(2).max(120),
    productName: z.string().trim().max(120).optional(),
    planId: z.string().trim().max(80).optional().default('canonica_beta'),
    interval: z.enum(['MONTH', 'YEAR']).optional().default('MONTH'),
    currency: z.enum(['INR', 'USD']).optional().default('INR'),
});

const getCanonicaDb = () => {
    const db = shouldUseSharedCanonicaFirebase
        ? admin.firestore()
        : canonicaFirestoreAdmin;

    return db && typeof (db as any).collection === 'function' ? db : null;
};

const getCanonicaUserByEmail = async (db: FirebaseFirestore.Firestore, email?: string | null) => {
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

const createCanonicaSubscription = async (
    db: FirebaseFirestore.Firestore,
    providerSubscriptionId: string,
    data: Omit<FirestoreSubscriptionDoc, 'id'>,
) => {
    const now = admin.firestore.Timestamp.now();
    await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(providerSubscriptionId).set({
        ...data,
        pId: PRODUCT_IDS.CANONICA,
        productId: PRODUCT_IDS.CANONICA,
        tId: data.tenantId,
        sId: data.storeId,
        uId: data.userId,
        role: 'owner',
        modifiedOn: now,
        createdOn: now,
        createdBy: data.name || data.email || 'Canonica',
        modifiedBy: data.name || data.email || 'Canonica',
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
    const canonicaProductAccount = {
        tenantId: params.tenantId,
        storeId: params.storeId,
        role,
        platformRole: params.session?.user?.platformRole || 'OWNER',
        storeIds: [params.storeId],
        updatedAt: now,
    };
    const defaultUserUpdate: Record<string, any> = {
        productAccounts: {
            [CANONICA_PRODUCT_ACCOUNT_KEY]: canonicaProductAccount,
        },
        modifiedOn: now,
    };

    if (rootTenantMissing && rootStoreMissing) {
        defaultUserUpdate.tenantId = params.tenantId;
        defaultUserUpdate.storeId = params.storeId;
        defaultUserUpdate.pId = PRODUCT_IDS.CANONICA;
        defaultUserUpdate.productId = PRODUCT_IDS.CANONICA;
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
        // 0. Feature flag check — widget flag acts as the Canonica distribution gate
        if (!FEATURE_FLAGS.ENABLE_CANONICA_WIDGET) {
            return NextResponse.json(
                { error: 'Canonica onboarding is not available yet.' },
                { status: 403 }
            );
        }

        const db = getCanonicaDb();
        if (!db) {
            return NextResponse.json(
                { error: 'Canonica Firebase is not configured.' },
                { status: 503 }
            );
        }

        // 1. Verify user doesn't already have a Canonica tenant. A MenuList
        // tenant/store on the same login must not block Canonica onboarding.
        const existingProductAccount = (session.user as any)?.productAccounts?.[CANONICA_PRODUCT_ACCOUNT_KEY];
        const existingCanonicaUser = await getCanonicaUserByEmail(db, session.user.email);
        if (
            (existingProductAccount?.tenantId && existingProductAccount?.storeId)
            || (existingCanonicaUser?.tenantId && existingCanonicaUser?.storeId)
        ) {
            return NextResponse.json(
                { error: 'You already have an account. Go to your dashboard.' },
                { status: 400 }
            );
        }

        // 2. Rate limiting
        const rateLimitConfig = getRateLimitForFeature('PAYMENT_ONBOARDING');
        const rateLimitResult = await checkRateLimit({
            key: `canonica-onboard:${userId}`,
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
        const { companyName, productName, planId, interval, currency } = validation.data;

        // 4. Resolve plan
        const plan = planId === 'canonica_beta'
            ? getCanonicaBetaPlan()
            : getCanonicaPlanById(planId, interval);

        if (!plan) {
            return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
        }

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'CANONICA_ONBOARD_STARTED',
            data: { userId, companyName, productName, planId },
        });

        // 5. ATOMIC TRANSACTION: Create Tenant + Store + Update User
        const cleanCompany = companyName.trim();
        const storeName = productName || companyName;
        const ownerRole = getOwnerRoleId();

        const result = await db.runTransaction(async (transaction) => {
            // Centralized tenant + store creation
            const core = await createTenantStoreInTransaction(transaction, db, {
                businessName: cleanCompany,
                businessType: 'SaaS',
                businessIndustry: 'B2B',
                email: session.user.email,
                onboardingSource: 'CANONICA_ONBOARDING',
                storeName,
                allowInitialCounters: true,
                tenantExtra: {
                    pId: PRODUCT_IDS.CANONICA,
                    productId: PRODUCT_IDS.CANONICA,
                    productName: productName || '',
                },
                storeExtra: {
                    pId: PRODUCT_IDS.CANONICA,
                    productId: PRODUCT_IDS.CANONICA,
                },
            });

            const userRef = db.collection(DB_COLLECTIONS.USERS).doc(userId);
            transaction.set(userRef, {
                id: userId,
                email: String(session.user.email || '').toLowerCase().trim(),
                name: session.user.name || session.user.email || 'Canonica user',
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
                pId: PRODUCT_IDS.CANONICA,
                productId: PRODUCT_IDS.CANONICA,
                role: ownerRole,
                platformRole: 'OWNER',
                tId: core.tenantId,
                sId: core.storeId,
                uId: userId,
                onboardingSource: 'CANONICA_ONBOARDING',
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

        await upsertCanonicaTenantSummaryAdmin({
            tId: result.tenantId,
            sId: result.storeId,
            source: 'client_onboarding',
            hasEntities: false,
        }).catch((summaryError) => {
            secureError('[Canonica Onboard] Tenant summary sync failed', summaryError as Error, {
                tenantId: result.tenantId,
                storeId: result.storeId,
            });
        });

        // 6. Create Subscription (Beta: free, no Razorpay needed; paid: Razorpay recurring)
        const isBeta = planId === 'canonica_beta';
        let subscriptionId = isBeta
            ? `canonica_beta_${result.tenantId}_${result.storeId}_${Date.now()}`
            : `canonica_${result.tenantId}_${result.storeId}_${Date.now()}`;
        let razorpaySubscription: any = null;

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
                planType: 'MONTH',
                userType: 'B2B',
                currency: 'INR',
                amount: 0,
                status: 'active',
                lastWebhook: null,
                planId: 'canonica_beta',
                planName: 'Canonica Beta',
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
                    remark: 'Canonica Beta — 6 months free access',
                }],
                billingHistory: [],
                quantity: 1,
                billingMode: 'auto' as any,
                onboardingSource: 'CANONICA_ONBOARDING' as any,
            };

            await createCanonicaSubscription(db, subscriptionId, subscriptionPayload);
        } else {
            const { getOrCreateRazorpayPlan } = await import('@lib/razorpay/plan-handler');
            const { razorpayClient } = await import('@lib/razorpay/razorpay');
            const price = currency === 'USD' ? plan.priceUSD.price : plan.priceINR.price;
            const monthlyCredits = currency === 'USD' ? plan.priceUSD.monthlyCredits : plan.priceINR.monthlyCredits;
            const razorpayPlanId = await getOrCreateRazorpayPlan({
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
                    productId: PRODUCT_IDS.CANONICA,
                    tenantId: result.tenantId,
                    storeId: result.storeId,
                    userId,
                    userType: 'B2B',
                    planId: plan.planId,
                    interval,
                    currency,
                    name: session.user.name,
                    email: session.user.email,
                    price,
                    remainingCredits: 0,
                    onboardingSource: 'CANONICA_ONBOARDING',
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
                    remark: 'Canonica paid subscription initiated',
                }],
                billingHistory: [],
                quantity: 1,
                billingMode: 'auto' as any,
                onboardingSource: 'CANONICA_ONBOARDING' as any,
            };

            await createCanonicaSubscription(db, razorpaySubscription.id, subscriptionPayload);
        }

        // 7. Generate API key for the widget
        const apiKey = `cn_${randomUUID().replace(/-/g, '')}`;
        await db.collection(DB_COLLECTIONS.STORES).doc(String(result.storeId)).update({
            canonicaWidgetApi: {
                apiKeyHash: hashApiKey(apiKey),
                keyPrefix: apiKey.slice(0, 7),
                createdAt: new Date().toISOString(),
                productId: PRODUCT_IDS.CANONICA,
                purpose: 'canonica_widget',
                scopes: [...CANONICA_WIDGET_SCOPES],
            },
        });

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'CANONICA_ONBOARD_COMPLETE',
            data: {
                userId,
                tenantId: result.tenantId,
                storeId: result.storeId,
                subscriptionId,
                planId,
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
        });

    } catch (error) {
        secureError('[Canonica Onboard] Failed', error as Error, { userId });
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'CANONICA_ONBOARD_ERROR',
            data: { userId, error: (error as Error).message },
        });
        return NextResponse.json(
            { error: 'Failed to create account. Please try again.' },
            { status: 500 }
        );
    }
});
