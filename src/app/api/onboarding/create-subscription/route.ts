export const dynamic = 'force-dynamic';
import { getB2BPlansList, getB2CPlansList } from "@data/PlatformPlansList";
import { FALLBACK_BUSINESS_TYPE } from "@data/shared/businessTypes";
import { createInitialSubscription, getSubscriptionById } from "@database/subscriptions/server";
import { handlePaymentError } from "@lib/errors/firestoreErrors";
import { admin } from "@lib/firebase/firebaseAdmin";
import { revalidateMenuCache } from "@lib/actions/revalidateMenuCache";
import { logger } from "@lib/monitoring/logger";
import { compensateFailedTenantStoreOnboarding } from "@lib/onboarding/compensateFailedOnboarding";
import {
    assertCurrentUserAvailableForOnboardingInTransaction,
    createTenantStoreInTransaction,
    OnboardingUserUnavailableError,
    preCheckSubdomain,
    updateUserWithTenantStore,
} from "@lib/onboarding/createTenantStore";
import {
    findOnboardingProviderSubscriptionForAttempt,
    isOnboardingProviderSubscription,
    isMatchingPersistedOnboardingSubscription,
    resolveOnboardingPlanPrice,
    type OnboardingProviderSubscription,
} from "@lib/onboarding/onboardingSubscriptionBoundary";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getOrCreateRazorpayPlan } from "@lib/razorpay/plan-handler";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { normalizeRazorpaySubscriptionCheckoutUrl } from "@lib/razorpay/checkoutUrl";
import { getBoundedRazorpayStringContext, getRazorpayFailureLogData } from "@lib/billing/razorpayDiagnostics";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import {
    clearOwnerReferralCookie,
    readOwnerReferralCookie,
    resolveOwnerReferralCookieForAttribution,
    setOwnerReferralAttributionInTransaction,
} from "@lib/ownerReferral/ownerReferralAttributionServer";
import { isOwnerReferralAcquisitionEnabled } from '@lib/ownerReferral/ownerReferralFeature';
import { validateAPIInput } from "@lib/security/inputValidation";
import { OnboardingSubscriptionSchema } from "@lib/validation/apiSchemas";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { writeLogEntry } from "logs/utils";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { withAuth } from "../../../../middleware/auth";

const LOG_FILE = "razorpay-subscription.log";
const ONBOARDING_SUBSCRIPTION_MAX_BODY_BYTES = 16 * 1024;
const ONBOARDING_SUBSCRIPTION_FAILURE_CODE = 'razorpay_onboarding_subscription_failed';
const ONBOARDING_SUBSCRIPTION_CACHE_REVALIDATION_FAILURE_CODE = 'razorpay_onboarding_cache_revalidation_failed';
const ONBOARDING_SUBSCRIPTION_COMPENSATION_FAILED_CODE = 'razorpay_onboarding_compensation_failed';
const ONBOARDING_SUBSCRIPTION_COMPENSATION_CACHE_REVALIDATION_FAILED_CODE = 'razorpay_onboarding_compensation_cache_revalidation_failed';
const ONBOARDING_SUBSCRIPTION_VALIDATION_FAILED_CODE = 'razorpay_onboarding_subscription_validation_failed';
const ONBOARDING_SUBSCRIPTION_PERSISTENCE_FAILED_CODE = 'razorpay_onboarding_subscription_persistence_failed';
const ONBOARDING_SUBSCRIPTION_PROVIDER_CANCELLATION_FAILED_CODE = 'razorpay_onboarding_provider_cancellation_failed';
const ONBOARDING_SUBSCRIPTION_PROVIDER_RECOVERY_FAILED_CODE = 'razorpay_onboarding_provider_recovery_failed';
const ONBOARDING_PROVIDER_RECOVERY_WINDOW_MS = 15 * 60 * 1000;
const ONBOARDING_PROVIDER_RECOVERY_PAGE_SIZE = 100;
const ONBOARDING_PROVIDER_RECOVERY_MAX_PAGES = 3;

const getOnboardingSubscriptionLogContext = (input: {
    businessIndustry?: unknown;
    businessName?: unknown;
    currency?: unknown;
    interval?: unknown;
    planId?: unknown;
    storeId?: unknown;
    subscriptionId?: unknown;
    tenantId?: unknown;
    userId: unknown;
    userType?: unknown;
}) => ({
    endpoint: '/api/onboarding/create-subscription',
    operation: 'onboarding-create-subscription',
    businessNameLength: typeof input.businessName === 'string' ? input.businessName.length : 0,
    ...getBoundedRazorpayStringContext('businessIndustry', input.businessIndustry),
    ...getBoundedRazorpayStringContext('currency', input.currency),
    ...getBoundedRazorpayStringContext('interval', input.interval),
    ...getBoundedRazorpayStringContext('userType', input.userType),
    ...getBoundedRazorpayStringContext('userId', input.userId),
    ...getBoundedRazorpayStringContext('tenantId', input.tenantId),
    ...getBoundedRazorpayStringContext('storeId', input.storeId),
    ...getBoundedRazorpayStringContext('planId', input.planId),
    ...getBoundedRazorpayStringContext('subscriptionId', input.subscriptionId),
});

const getOnboardingSubscriptionValidationContext = (
    body: any,
    errorMsg: string,
    userId: unknown,
) => ({
    ...getOnboardingSubscriptionLogContext({
        businessIndustry: body?.businessIndustry,
        businessName: body?.businessName,
        currency: body?.currency,
        interval: body?.interval,
        planId: body?.planId,
        userId,
        userType: body?.userType,
    }),
    bodyFieldCount: body && typeof body === 'object' && !Array.isArray(body)
        ? Object.keys(body).length
        : 0,
    validationErrorPresent: errorMsg.length > 0,
    validationErrorLength: errorMsg.length,
});

async function compensateOnboardingPaymentProviderFailure(params: {
    businessIndustry?: unknown;
    businessName?: unknown;
    currency?: unknown;
    db: admin.firestore.Firestore;
    interval?: unknown;
    planId?: unknown;
    reason?: string;
    storeId: number;
    tenantId: number;
    userId: string;
    userType?: unknown;
}) {
    const context = getOnboardingSubscriptionLogContext(params);

    try {
        await compensateFailedTenantStoreOnboarding({
            db: params.db,
            reason: params.reason || ONBOARDING_SUBSCRIPTION_FAILURE_CODE,
            source: "WEBSITE_ONBOARDING",
            storeId: params.storeId,
            tenantId: params.tenantId,
            userId: params.userId,
        });
    } catch (compensationError) {
        logger.error(
            '[Onboarding] Compensation after payment provider failure failed',
            new Error(ONBOARDING_SUBSCRIPTION_COMPENSATION_FAILED_CODE),
            getRazorpayFailureLogData(
                ONBOARDING_SUBSCRIPTION_COMPENSATION_FAILED_CODE,
                compensationError,
                context,
            ),
        );
        return;
    }

    try {
        await revalidateMenuCache(params.storeId, { tId: params.tenantId });
    } catch (cacheError) {
        logger.error(
            '[Onboarding] Compensation cache revalidation failed',
            new Error(ONBOARDING_SUBSCRIPTION_COMPENSATION_CACHE_REVALIDATION_FAILED_CODE),
            getRazorpayFailureLogData(
                ONBOARDING_SUBSCRIPTION_COMPENSATION_CACHE_REVALIDATION_FAILED_CODE,
                cacheError,
                context,
            ),
        );
    }
}

async function compensateOnboardingSubscriptionPersistenceFailure(params: {
    businessIndustry?: unknown;
    businessName?: unknown;
    currency?: unknown;
    db: admin.firestore.Firestore;
    interval?: unknown;
    planId?: unknown;
    providerSubscriptionId: string;
    storeId: number;
    tenantId: number;
    userId: string;
    userType?: unknown;
}): Promise<boolean> {
    try {
        await razorpayClient.subscriptions.cancel(params.providerSubscriptionId, false);
    } catch (cancellationError) {
        logger.error(
            '[Onboarding] Provider subscription cancellation after persistence failure failed',
            new Error(ONBOARDING_SUBSCRIPTION_PROVIDER_CANCELLATION_FAILED_CODE),
            getRazorpayFailureLogData(
                ONBOARDING_SUBSCRIPTION_PROVIDER_CANCELLATION_FAILED_CODE,
                cancellationError,
                getOnboardingSubscriptionLogContext({
                    ...params,
                    subscriptionId: params.providerSubscriptionId,
                }),
            ),
        );
        return false;
    }

    await compensateOnboardingPaymentProviderFailure({
        ...params,
        reason: ONBOARDING_SUBSCRIPTION_PERSISTENCE_FAILED_CODE,
    });
    return true;
}

async function recoverOnboardingProviderSubscription(params: {
    attemptId: string;
    planId: string;
    providerPlanId: string;
    startedAtMillis: number;
    storeId: number;
    tenantId: number;
    userId: string;
}): Promise<OnboardingProviderSubscription | null> {
    const from = Math.max(
        946684800,
        Math.floor((params.startedAtMillis - ONBOARDING_PROVIDER_RECOVERY_WINDOW_MS) / 1000),
    );
    const to = Math.floor((Date.now() + ONBOARDING_PROVIDER_RECOVERY_WINDOW_MS) / 1000);
    for (let page = 0; page < ONBOARDING_PROVIDER_RECOVERY_MAX_PAGES; page += 1) {
        const response = await razorpayClient.subscriptions.all({
            count: ONBOARDING_PROVIDER_RECOVERY_PAGE_SIZE,
            from,
            plan_id: params.providerPlanId,
            skip: page * ONBOARDING_PROVIDER_RECOVERY_PAGE_SIZE,
            to,
        });
        const match = findOnboardingProviderSubscriptionForAttempt({
            ...params,
            candidates: response.items,
        });
        if (match) return match;
        if (response.items.length < ONBOARDING_PROVIDER_RECOVERY_PAGE_SIZE) break;
    }
    return null;
}

/**
 * Onboarding API - Create Tenant, Store & Subscription (New Users Only)
 * ═══════════════════════════════════════════════════════════════
 * 
 * SECURITY:
 * - Server-side tenant/store creation (no client access)
 * - Atomic transaction (prevents race conditions)
 * - Session-based auth (no client-provided IDs)
 * - Input validation (OWASP A03)
 * 
 * FLOW:
 * 1. Verify user doesn't already have tenant/store
 * 2. Validate business details + plan selection
 * 3. Create tenant, store, update user (ATOMIC)
 * 4. Create Razorpay subscription
 * 5. Create Firestore subscription record
 * 6. Return subscription + new IDs for session update
 */
export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    const userId = session.user.id;
    let onboardingLogContext = getOnboardingSubscriptionLogContext({ userId });
    let clearReferralCookieOnSuccess = false;

    try {
        // 1. CRITICAL: Verify user does NOT already have tenant/store
        if (session.user.tenantId || session.user.storeId) {
            logger.security('Onboarding Attempt by Existing User', {
                ...getBoundedSecurityRouteContext(session, request),
                endpoint: '/api/onboarding/create-subscription',
                error: 'User already has tenant/store',
                ...getBoundedRazorpayStringContext('tenantId', session.user.tenantId),
                ...getBoundedRazorpayStringContext('storeId', session.user.storeId),
            }, 'medium');

            return NextResponse.json(
                { error: 'User already onboarded. Use regular subscription endpoint.' },
                { status: 400 }
            );
        }

        // 2. 🔒 RATE LIMITING: Prevent onboarding spam (centralized config)
        const rateLimitConfig = getRateLimitForFeature('PAYMENT_ONBOARDING');
        const userRateLimitHash = hashPublicRateLimitValue(userId);
        const rateLimitResult = await checkRateLimit({
            key: `onboarding:${userRateLimitHash}`,
            ...rateLimitConfig,
            failClosedOnProviderError: true,
        });

        if (!rateLimitResult.allowed) {
            const providerUnavailable = rateLimitResult.reason === 'provider_unavailable';
            logger.security('Onboarding Rate Limit Exceeded', {
                ...getBoundedSecurityRouteContext(session, request),
                endpoint: '/api/onboarding/create-subscription',
                error: providerUnavailable
                    ? 'Rate limit provider unavailable'
                    : 'Too many onboarding attempts',
                currentAttempts: rateLimitResult.current,
                resetAt: new Date(rateLimitResult.resetAt).toISOString(),
            }, 'high');

            return NextResponse.json({
                error: providerUnavailable
                    ? 'Onboarding is temporarily unavailable. Please try again later.'
                    : 'Too many onboarding attempts. Please try again later.',
                resetAt: rateLimitResult.resetAt
            }, { status: providerUnavailable ? 503 : 429 });
        }

        // 3. Validate Input
        const bodyResult = await readBoundedJsonBody(request, ONBOARDING_SUBSCRIPTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid input',
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const body = bodyResult.data as any;
        const validation = validateAPIInput(OnboardingSubscriptionSchema, body);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            logger.security('Onboarding Input Validation Failed', {
                ...getBoundedSecurityRouteContext(session, request),
                error: ONBOARDING_SUBSCRIPTION_VALIDATION_FAILED_CODE,
                ...getOnboardingSubscriptionValidationContext(body, errorMsg, userId),
                endpoint: '/api/onboarding/create-subscription',
            }, 'critical');

            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const { businessName, businessIndustry, planId, interval, currency, userType, timeZone, businessDayEndTime } = validation.data;
        const referralCookiePresent = Boolean(readOwnerReferralCookie(request));
        const resolvedReferral = isOwnerReferralAcquisitionEnabled()
            ? await resolveOwnerReferralCookieForAttribution(request)
            : null;
        if (referralCookiePresent && !resolvedReferral) clearReferralCookieOnSuccess = true;
        onboardingLogContext = getOnboardingSubscriptionLogContext({
            businessName,
            businessIndustry,
            currency,
            interval,
            planId,
            userId,
            userType,
        });

        // 3. Find Plan Details
        const plans = userType === "B2C" ? getB2CPlansList() : getB2BPlansList();
        const selectedPlan = plans.find(p => p.planId === planId && p.billingInterval === interval);

        if (!selectedPlan) {
            return NextResponse.json({ error: "Plan not found." }, { status: 404 });
        }

        const priceKey = currency === 'USD' ? 'priceUSD' : 'priceINR';
        const selectedPrice = resolveOnboardingPlanPrice(
            currency === 'USD' ? selectedPlan.priceUSD : selectedPlan.priceINR,
        );
        if (!selectedPrice) {
            logger.error(
                '[Onboarding] Selected plan has no purchasable price',
                new Error('razorpay_onboarding_plan_price_invalid'),
                onboardingLogContext,
            );
            return NextResponse.json({ error: 'Plan is not available for purchase.' }, { status: 400 });
        }

        // 4. 🔒 ATOMIC TRANSACTION: Create Tenant, Store, Update User
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'ONBOARDING_STARTED',
            data: onboardingLogContext,
        });

        const db = admin.firestore();

        // Pre-check subdomain uniqueness (must be outside transaction)
        const preCheckedSubdomain = await preCheckSubdomain(db, businessName);

        const result = await db.runTransaction(async (transaction) => {
            await assertCurrentUserAvailableForOnboardingInTransaction(
                transaction,
                db,
                userId,
                session,
            );

            // Centralized tenant + store creation
            const core = await createTenantStoreInTransaction(transaction, db, {
                businessName,
                businessType: businessIndustry || FALLBACK_BUSINESS_TYPE,
                businessIndustry: userType,
                timeZone,
                businessDayEndTime,
                email: session.user.email,
                onboardingSource: 'WEBSITE_ONBOARDING',
                subdomain: { preChecked: preCheckedSubdomain },
                includeTimeSlotPresets: true,
            });

            // Update User with tenant/store IDs
            updateUserWithTenantStore(transaction, db, userId, core);

            const referralBound = resolvedReferral
                ? Boolean(setOwnerReferralAttributionInTransaction({
                    transaction,
                    db,
                    referredBusinessName: businessName,
                    referredScope: { tenantId: core.tenantId, storeId: core.storeId },
                    resolvedToken: resolvedReferral,
                    onboardingSource: 'WEBSITE_ONBOARDING',
                }))
                : false;

            return { tenantId: core.tenantId, storeId: core.storeId, referralBound };
        });

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'ONBOARDING_TRANSACTION_COMPLETE',
            data: getOnboardingSubscriptionLogContext({
                businessName,
                businessIndustry,
                currency,
                interval,
                planId,
                storeId: result.storeId,
                tenantId: result.tenantId,
                userId,
                userType,
            }),
        });
        onboardingLogContext = getOnboardingSubscriptionLogContext({
            businessName,
            businessIndustry,
            currency,
            interval,
            planId,
            storeId: result.storeId,
            tenantId: result.tenantId,
            userId,
            userType,
        });

        try {
            await revalidateMenuCache(result.storeId, { tId: result.tenantId });
        } catch (cacheError) {
            logger.error(
                '[Onboarding] Cache revalidation failed',
                new Error(ONBOARDING_SUBSCRIPTION_CACHE_REVALIDATION_FAILURE_CODE),
                getRazorpayFailureLogData(
                    ONBOARDING_SUBSCRIPTION_CACHE_REVALIDATION_FAILURE_CODE,
                    cacheError,
                    onboardingLogContext,
                ),
            );
        }

        // 5. Create Razorpay Subscription (AFTER transaction succeeds)
        let razorpayPlanId = '';
        let razorpaySubscription: OnboardingProviderSubscription;
        let providerCheckoutUrl = '';
        const totalCount: number = interval === 'MONTH' ? 36 : 3; // Monthly: 36 cycles (3 years), Yearly: 3 cycles (3 years)
        const onboardingAttemptId = randomUUID();
        const providerAttemptStartedAtMillis = Date.now();

        try {
            razorpayPlanId = await getOrCreateRazorpayPlan({
                price: selectedPrice.price,
                currency,
                interval,
                userType,
                planId,
            });

            const providerSubscription = await razorpayClient.subscriptions.create({
                plan_id: razorpayPlanId,
                total_count: totalCount,
                quantity: 1,
                notes: {
                    tenantId: result.tenantId,  // ← Server-created IDs (secure)
                    storeId: result.storeId,
                    userId,
                    userType,
                    planId,
                    priceKey,
                    interval,
                    name: session.user.name,
                    email: session.user.email,
                    onboardingAttemptId,
                    onboardingSource: 'WEBSITE_ONBOARDING',
                    price: selectedPrice.price,
                    remainingCredits: 0, // New user, no carry-forward credits
                },
            });
            if (!isOnboardingProviderSubscription(providerSubscription)) {
                throw new Error('Invalid payment provider subscription response');
            }
            razorpaySubscription = providerSubscription;
            providerCheckoutUrl = normalizeRazorpaySubscriptionCheckoutUrl(providerSubscription.short_url) || '';
        } catch (providerError) {
            try {
                const recoveredSubscription = razorpayPlanId
                    ? await recoverOnboardingProviderSubscription({
                        attemptId: onboardingAttemptId,
                        planId,
                        providerPlanId: razorpayPlanId,
                        startedAtMillis: providerAttemptStartedAtMillis,
                        storeId: result.storeId,
                        tenantId: result.tenantId,
                        userId,
                    })
                    : null;
                if (recoveredSubscription) {
                    razorpaySubscription = recoveredSubscription;
                    providerCheckoutUrl = normalizeRazorpaySubscriptionCheckoutUrl(recoveredSubscription.short_url) || '';
                } else {
                    throw providerError;
                }
            } catch (recoveryError) {
                logger.error(
                    '[Onboarding] Provider subscription recovery failed',
                    new Error(ONBOARDING_SUBSCRIPTION_PROVIDER_RECOVERY_FAILED_CODE),
                    getRazorpayFailureLogData(
                        ONBOARDING_SUBSCRIPTION_PROVIDER_RECOVERY_FAILED_CODE,
                        recoveryError,
                        onboardingLogContext,
                    ),
                );
                await compensateOnboardingPaymentProviderFailure({
                    businessName,
                    businessIndustry,
                    currency,
                    db,
                    interval,
                    planId,
                    reason: ONBOARDING_SUBSCRIPTION_FAILURE_CODE,
                    storeId: result.storeId,
                    tenantId: result.tenantId,
                    userId,
                    userType,
                });
                throw providerError;
            }
        }

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'ONBOARDING_RAZORPAY_SUBSCRIPTION_CREATED',
            data: getOnboardingSubscriptionLogContext({
                businessName,
                businessIndustry,
                currency,
                interval,
                planId,
                storeId: result.storeId,
                subscriptionId: razorpaySubscription.id,
                tenantId: result.tenantId,
                userId,
                userType,
            }),
        });

        // 6. Create Firestore Subscription Record
        const subscriptionPayload: Omit<FirestoreSubscriptionDoc, "id"> = {
            paymentProvider: "razorpay",
            providerSubscriptionId: razorpaySubscription.id,
            providerPlanId: razorpayPlanId,
            userId,
            name: session.user.name || '',
            email: session.user.email || '',
            tenantId: result.tenantId,
            storeId: result.storeId,
            planType: interval,
            userType,
            currency,
            amount: selectedPrice.price,
            status: "pending",
            lastWebhook: null,
            planId: planId,
            planName: selectedPlan.name,
            cycleStartDate: null,
            subscriptionEndDate: null,
            subscriptionStartDate: null,
            pastDueSinceAt: null,
            totalPaymentsNeededCount: totalCount,
            totalPaymentsMadeCount: 0,
            cycleEndDate: null,
            renewsOn: null,
            monthlyCreditsAllowance: selectedPrice.monthlyCredits,
            monthlyCredits: selectedPrice.monthlyCredits,
            topUpCredits: 0, // New user, no carry-forward
            creditsLastResetMonth: new Date().getFullYear() * 100 + (new Date().getMonth() + 1),
            shortUrl: providerCheckoutUrl,
            paymentMethod: {
                type: "",
                brand: "",
                last4: "",
                upiId: "",
                upiTransactionId: "",
            },
            statuses: [
                {
                    status: "pending",
                    timestamp: admin.firestore.Timestamp.now() as any,
                    amount: selectedPrice.price,
                    currency: currency,
                    remark: "Onboarding Subscription Initiated",
                },
            ],
            billingHistory: [],
            quantity: 1,  // Multi-Outlet Billing (Feature #4C-B): 1 = single store (master)
        };

        try {
            await createInitialSubscription(razorpaySubscription.id, subscriptionPayload);
        } catch (persistenceError) {
            const persistedSubscription = await getSubscriptionById(razorpaySubscription.id).catch((): null => null);
            if (!isMatchingPersistedOnboardingSubscription({
                planId,
                providerSubscriptionId: razorpaySubscription.id,
                storeId: result.storeId,
                subscription: persistedSubscription,
                tenantId: result.tenantId,
                userId,
            })) {
                await compensateOnboardingSubscriptionPersistenceFailure({
                    businessName,
                    businessIndustry,
                    currency,
                    db,
                    interval,
                    planId,
                    providerSubscriptionId: razorpaySubscription.id,
                    storeId: result.storeId,
                    tenantId: result.tenantId,
                    userId,
                    userType,
                });
                throw persistenceError;
            }
        }

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'ONBOARDING_COMPLETE',
            data: getOnboardingSubscriptionLogContext({
                businessName,
                businessIndustry,
                currency,
                interval,
                planId,
                storeId: result.storeId,
                subscriptionId: razorpaySubscription.id,
                tenantId: result.tenantId,
                userId,
                userType,
            }),
        });

        logger.info('[Onboarding] User onboarded successfully', getOnboardingSubscriptionLogContext({
            businessName,
            businessIndustry,
            currency,
            interval,
            planId,
            storeId: result.storeId,
            subscriptionId: razorpaySubscription.id,
            tenantId: result.tenantId,
            userId,
            userType,
        }));

        // 7. Return subscription + new IDs for session update
        if (result.referralBound) clearReferralCookieOnSuccess = true;
        const response = NextResponse.json({
            subscription: { id: razorpaySubscription.id },
            tenantId: result.tenantId,
            storeId: result.storeId
        });
        if (clearReferralCookieOnSuccess) clearOwnerReferralCookie(response);
        return response;

    } catch (error) {
        if (error instanceof OnboardingUserUnavailableError) {
            logger.security('Onboarding Attempt by Unavailable Current User', {
                ...getBoundedSecurityRouteContext(session, request),
                endpoint: '/api/onboarding/create-subscription',
            }, 'high');
            return NextResponse.json(
                { error: 'This account is not available for onboarding.' },
                { status: 409 },
            );
        }
        const failureData = getRazorpayFailureLogData(
            ONBOARDING_SUBSCRIPTION_FAILURE_CODE,
            error,
            onboardingLogContext,
        );

        logger.error('[Onboarding] Failed', new Error(ONBOARDING_SUBSCRIPTION_FAILURE_CODE), failureData);
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'ONBOARDING_ERROR',
            data: failureData,
        });

        // Use improved error handler with Firestore/Razorpay specific handling
        return handlePaymentError(error, {
            operation: 'onboarding',
            userId,
            endpoint: '/api/onboarding/create-subscription'
        });
    }
});
