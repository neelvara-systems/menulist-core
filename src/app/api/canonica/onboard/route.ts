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
import { getCanonicaBetaPlan, getCanonicaPlanById } from '@data/canonica/plans';
import { createInitialSubscription } from '@database/subscriptions';
import { admin } from '@lib/firebase/firebaseAdmin';
import { createTenantStoreInTransaction, updateUserWithTenantStore } from '@lib/onboarding/createTenantStore';
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
});

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

        // 1. Verify user doesn't already have a Canonica tenant
        if (session.user.tenantId && session.user.storeId) {
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
        const { companyName, productName, planId, interval } = validation.data;

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
        const db = admin.firestore();
        const cleanCompany = companyName.trim();
        const storeName = productName || companyName;

        const result = await db.runTransaction(async (transaction) => {
            // Centralized tenant + store creation
            const core = await createTenantStoreInTransaction(transaction, db, {
                businessName: cleanCompany,
                businessType: 'SaaS',
                businessIndustry: 'B2B',
                email: session.user.email,
                onboardingSource: 'CANONICA_ONBOARDING',
                storeName,
                tenantExtra: { productId: 'CN', productName: productName || '' },
                storeExtra: { productId: 'CN' },
            });

            // Update User with tenant/store IDs
            updateUserWithTenantStore(transaction, db, userId, core);

            return { tenantId: core.tenantId, storeId: core.storeId };
        });

        // 6. Create Subscription (Beta: free, no Razorpay needed)
        const isBeta = planId === 'canonica_beta';
        const subscriptionId = isBeta
            ? `canonica_beta_${result.tenantId}_${result.storeId}_${Date.now()}`
            : `canonica_${result.tenantId}_${result.storeId}_${Date.now()}`;

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

            await createInitialSubscription(subscriptionId, subscriptionPayload);
        }
        // TODO: For paid plans, create Razorpay subscription (same pattern as MenuList)

        // 7. Generate API key for the widget
        const apiKey = `cn_${randomUUID().replace(/-/g, '')}`;
        await db.collection(DB_COLLECTIONS.STORES).doc(String(result.storeId)).update({
            publicApi: {
                apiKeyHash: hashApiKey(apiKey),
                keyPrefix: apiKey.slice(0, 7),
                createdAt: new Date().toISOString(),
                productId: 'CN',
                purpose: 'canonica_widget',
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
