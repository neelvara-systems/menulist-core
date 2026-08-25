export const dynamic = 'force-dynamic';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { MENULIST_B2C_PLAN_IDS } from '@constant/menulistPlans';
import { resolveMenuListMonthlyCreditAllowance } from '@data/shared/contentCreditPolicy';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { canManageAnswerlatticeBillingMutation, canManageBillingMutation } from "@lib/billing/billingAccess";
import {
    claimBillingCheckoutLease,
    completeBillingCheckoutLease,
    markBillingCheckoutProviderCreateStarted,
    markBillingCheckoutProviderCreated,
    releaseBillingCheckoutLease,
    renewExpiredBillingCheckoutLease,
} from '@lib/billing/billingCheckoutLease';
import {
    createProductInitialSubscription,
    getBillingFirestoreAdminForProduct,
    getDirectActiveProductSubscriptionForStore,
    getProductSubscriptionById,
    resolveBillingScopeFromSession,
} from "@lib/billing/productBillingServer";
import { getProductSubscriptionBillingScope } from '@lib/billing/productSubscriptionScopeBoundary';
import { isMatchingCheckoutProviderSubscription } from '@lib/billing/checkoutProviderSubscriptionRecovery';
import { resolveSubscriptionReplacementEvidence } from '@lib/billing/subscriptionReplacementEvidence';
import { hasVerifiedSubscriptionPaymentEvidence } from '@lib/billing/subscriptionPlanEntitlement';
import {
    getBillingPlansForProduct,
    isAnswerlatticeBillingProduct,
    normalizeBillingProductId,
} from "@lib/billing/productBillingPlans";
import {
    getBoundedRazorpaySecurityContext,
    getBoundedRazorpayStringContext,
    getRazorpayFailureLogData,
    getRazorpaySubscriptionMutationLogContext,
} from "@lib/billing/razorpayDiagnostics";
import { logger } from "@lib/monitoring/logger";
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { getFounderSubscriptionMrrPaise } from '@lib/ops/founderRevenueReadModel';
import { projectRazorpaySubscriptionCheckoutResponse } from '@lib/billing/paymentCheckoutBoundary';
import {
    clearOwnerReferralCookie,
    readOwnerReferralCookie,
    resolveOwnerReferralCookieForAttribution,
    setOwnerReferralAttributionBeforeSubscription,
} from '@lib/ownerReferral/ownerReferralAttributionServer';
import { isOwnerReferralAcquisitionEnabled } from '@lib/ownerReferral/ownerReferralFeature';
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getOrCreateRazorpayPlan } from "@lib/razorpay/plan-handler";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { normalizeRazorpaySubscriptionCheckoutUrl } from '@lib/razorpay/checkoutUrl';
import { getRazorpayManagedSubscriptionId } from '@lib/billing/subscriptionProviderSync';
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CreateSubscriptionRequestSchema } from "@lib/validation/apiSchemas";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import {
    resolveRazorpayPendingCheckoutAction,
    resolveRazorpayProviderSubscriptionStatus,
} from '@data/shared/razorpaySubscriptionLifecycle';
import { Timestamp } from "firebase-admin/firestore";
import { writeLogEntry } from "logs/utils";
import { NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";
import { isValidMenuListPlanQuantity } from '@lib/billing/menulistPricingPolicy';
import { isMultiOutletTenantStoreListEntryInScope } from '@lib/multiOutlet/projectIdBoundary';
import {
    calculateConfiguredProductTax,
    getBillingProfileFromTaxSnapshot,
    productUsesConfiguredTax,
} from '@lib/billing/productTaxServer';
import { BillingTaxConfigurationError, BillingTaxProfileError } from '@data/shared/billingTaxPolicy';

const LOG_FILE = "razorpay-subscription.log";
const RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES = 8 * 1024;
const CHECKOUT_PROVIDER_RECOVERY_WINDOW_MS = 10 * 60 * 1000;
const CHECKOUT_PROVIDER_RECOVERY_PAGE_SIZE = 100;
const CHECKOUT_PROVIDER_RECOVERY_MAX_PAGES = 5;

const createSubscriptionLogSummary = (input: {
    currency: string;
    interval: string;
    planId: string;
    quantity: number;
    remainingCredits: number;
    storeId: string | number;
    tenantId: string | number;
    unitAmount: number;
    userType?: string;
}) => ({
    ...getBoundedRazorpayStringContext('currency', input.currency),
    ...getBoundedRazorpayStringContext('interval', input.interval),
    ...getBoundedRazorpayStringContext('planId', input.planId),
    quantity: input.quantity,
    hasCarriedCredits: input.remainingCredits > 0,
    ...getBoundedRazorpayStringContext('storeId', input.storeId),
    ...getBoundedRazorpayStringContext('tenantId', input.tenantId),
    unitAmount: input.unitAmount,
    ...getBoundedRazorpayStringContext('userType', input.userType),
});

async function recoverCheckoutProviderSubscription(params: {
    attemptId: string;
    planId: string;
    providerPlanId: string;
    productId: string;
    quantity: number;
    startedAtMillis: number;
    storeId: string | number;
    tenantId: string | number;
}): Promise<any | null> {
    const from = Math.max(946684800, Math.floor((params.startedAtMillis - CHECKOUT_PROVIDER_RECOVERY_WINDOW_MS) / 1000));
    const to = Math.floor((Date.now() + CHECKOUT_PROVIDER_RECOVERY_WINDOW_MS) / 1000);
    for (let page = 0; page < CHECKOUT_PROVIDER_RECOVERY_MAX_PAGES; page += 1) {
        const response = await razorpayClient.subscriptions.all({
            count: CHECKOUT_PROVIDER_RECOVERY_PAGE_SIZE,
            from,
            plan_id: params.providerPlanId,
            skip: page * CHECKOUT_PROVIDER_RECOVERY_PAGE_SIZE,
            to,
        });
        const match = response.items.find((candidate) => isMatchingCheckoutProviderSubscription(candidate, params));
        if (match) return match;
        if (response.items.length < CHECKOUT_PROVIDER_RECOVERY_PAGE_SIZE) break;
    }
    return null;
}

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const userId = session.user.id;
    let subscriptionForLog: any = null;
    let providerSubscriptionCreated = false;
    let providerSubscriptionCompensated = false;
    let providerSubscriptionCreateAttempted = false;
    let providerSubscriptionCheckpointLost = false;
    let subscriptionPersisted = false;
    let clearReferralCookieOnResponse = false;
    let checkoutLeaseIdentity: Parameters<typeof claimBillingCheckoutLease>[0] | null = null;
    let checkoutAttemptId: string | null = null;
    let checkoutAttemptStartedAtMillis: number | null = null;
    let checkoutFailureStage = 'request_admission';

    try {
        const bodyResult = await readBoundedJsonBody(request, RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid input',
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const body = bodyResult.data as any;

        // 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const validation = validateAPIInput(CreateSubscriptionRequestSchema, body);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            logger.security('Input Validation Failed', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/create-subscription',
                error: errorMsg,
                attemptedData: {
                    ...getBoundedRazorpayStringContext('productId', body?.productId),
                    ...getBoundedRazorpayStringContext('planId', body?.planId),
                    ...getBoundedRazorpayStringContext('interval', body?.interval),
                    ...getBoundedRazorpayStringContext('currency', body?.currency),
                    ...getBoundedRazorpayStringContext('userType', body?.userType),
                    quantity: Number.isFinite(Number(body?.quantity)) ? Number(body.quantity) : undefined,
                },
            }, 'critical');

            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const productId = normalizeBillingProductId(validation.data.productId);
        const scope = resolveBillingScopeFromSession(session, productId);
        if (!scope) {
            logger.security('User Not Onboarded - Create Subscription', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/create-subscription',
                error: 'User attempted to create subscription without product tenant/store',
                productId,
            }, 'high');

            return NextResponse.json(
                { error: 'User not onboarded. Complete onboarding first.' },
                { status: 400 }
            );
        }

        const { tenantId, storeId } = scope;

        // Rate-limit before current-role/store authorization reads so denied
        // callers cannot turn the permission boundary into an unbounded read path.
        const rateLimitConfig = getRateLimitForFeature('PAYMENT_SUBSCRIPTION');
        const userRateLimitHash = hashPublicRateLimitValue(userId);
        const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);
        const rateLimitResult = await checkRateLimit({
            failClosedOnProviderError: true,
            key: `subscription:${productId}:${userRateLimitHash}:${tenantRateLimitHash}`,
            ...rateLimitConfig
        });

        if (!rateLimitResult.allowed) {
            const providerUnavailable = rateLimitResult.reason === 'provider_unavailable';
            logger.security(providerUnavailable ? 'Subscription Creation Rate Limit Provider Unavailable' : 'Subscription Creation Rate Limit Exceeded', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/create-subscription',
                error: providerUnavailable ? 'Rate limit provider unavailable' : 'Too many subscription attempts',
                productId,
                ...(providerUnavailable ? {} : {
                    currentAttempts: rateLimitResult.current,
                    resetAt: new Date(rateLimitResult.resetAt).toISOString(),
                }),
            }, 'high');

            return NextResponse.json({
                error: providerUnavailable
                    ? 'Billing checkout is temporarily unavailable. Please try again.'
                    : 'Too many subscription attempts. Please try again later.',
                ...(providerUnavailable ? {} : { resetAt: rateLimitResult.resetAt }),
            }, { status: providerUnavailable ? 503 : 429 });
        }

        if (isAnswerlatticeBillingProduct(productId) && !(await canManageAnswerlatticeBillingMutation(session, request))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (!isAnswerlatticeBillingProduct(productId) && !verifyTenantAccess(session, tenantId, storeId, request)) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (!isAnswerlatticeBillingProduct(productId) && !(await canManageBillingMutation(session, request, '/api/razorpay/create-subscription'))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        // 2. Extract validated data
        const {
            planId,
            interval,
            currency,
            userType,
            quantity: requestedQuantity = 1,
            replacementForSubscriptionId,
            billingProfile,
        } = validation.data;
        const resolvedUserType = userType ?? "B2C";
        const name = session?.user?.name || '';
        const email = session?.user?.email || '';
        const remainingCredits = 0;
        const quantity = Math.max(1, requestedQuantity);

        if (
            productId === PRODUCT_IDS.MENULIST
            && !isValidMenuListPlanQuantity({ planId, quantity, userType: resolvedUserType })
        ) {
            return NextResponse.json(
                { error: 'The selected plan and location count do not match.' },
                { status: 400 },
            );
        }

        const currentSubscription = await getDirectActiveProductSubscriptionForStore(productId, tenantId, storeId);
        const replacementSubscription = replacementForSubscriptionId
            ? await getProductSubscriptionById(productId, replacementForSubscriptionId)
            : null;
        if (replacementForSubscriptionId) {
            const replacementProviderId = replacementSubscription
                ? getRazorpayManagedSubscriptionId(replacementSubscription)
                : null;
            if (
                !replacementSubscription
                || replacementProviderId !== replacementForSubscriptionId
                || Number(replacementSubscription.tenantId ?? replacementSubscription.tId) !== Number(tenantId)
                || Number(replacementSubscription.storeId ?? replacementSubscription.sId) !== Number(storeId)
                || !['active', 'past_due', 'paused', 'cancelled'].includes(String(replacementSubscription.status))
                || (
                    currentSubscription
                    && currentSubscription.status !== 'pending'
                    && currentSubscription.id !== replacementForSubscriptionId
                    && currentSubscription.providerSubscriptionId !== replacementForSubscriptionId
                )
            ) {
                return NextResponse.json(
                    { error: 'The current subscription is not eligible for replacement.' },
                    { status: 409 },
                );
            }

            if (
                productId === PRODUCT_IDS.MENULIST
                && resolvedUserType === 'B2C'
                && replacementSubscription?.planId === MENULIST_B2C_PLAN_IDS.MULTI_LOCATION
                && planId !== MENULIST_B2C_PLAN_IDS.MULTI_LOCATION
            ) {
                const tenantSnapshot = await firestoreAdmin
                    .collection(DB_COLLECTIONS.TENANTS)
                    .doc(String(tenantId))
                    .get();
                const storesList = tenantSnapshot.data()?.storesList;
                if (!tenantSnapshot.exists || !Array.isArray(storesList)) {
                    return NextResponse.json(
                        { error: 'Location status is unavailable. Try again before changing plans.' },
                        { status: 409 },
                    );
                }
                const activeStoreCount = storesList.filter((store: unknown) => (
                    isMultiOutletTenantStoreListEntryInScope(store, {})
                )).length;
                if (activeStoreCount > 1) {
                    return NextResponse.json(
                        { error: 'Move to one active location before changing to a single-location plan.' },
                        { status: 409 },
                    );
                }
            }
        } else if (currentSubscription && currentSubscription.status !== 'pending') {
            return NextResponse.json(
                { error: 'A current subscription already exists. Use the change-plan flow.' },
                { status: 409 },
            );
        }

        if (!isAnswerlatticeBillingProduct(productId)) {
            const referralCookiePresent = Boolean(readOwnerReferralCookie(request));
            const resolvedReferral = isOwnerReferralAcquisitionEnabled()
                ? await resolveOwnerReferralCookieForAttribution(request)
                : null;
            if (referralCookiePresent && !resolvedReferral) clearReferralCookieOnResponse = true;

            if (resolvedReferral) {
                const storeSnapshot = await firestoreAdmin
                    .collection(DB_COLLECTIONS.STORES)
                    .doc(String(storeId))
                    .get();
                const referredBusinessName = getStoreContextName(
                    storeSnapshot.exists ? storeSnapshot.data() as any : null,
                    name || 'Invited business',
                );
                await setOwnerReferralAttributionBeforeSubscription({
                    referredBusinessName,
                    referredScope: { tenantId: Number(tenantId), storeId: Number(storeId) },
                    resolvedToken: resolvedReferral,
                    onboardingSource: 'REGULAR_SUBSCRIPTION',
                });
                clearReferralCookieOnResponse = true;
            }
        }

        // 3. Find Plan Details from Local Constants
        const plans = getBillingPlansForProduct(productId, resolvedUserType);
        const selectedPlan = plans.find((p) => p.planId === planId && p.billingInterval === interval);

        if (!selectedPlan) {
            return NextResponse.json({ error: "Plan not found." }, { status: 404 });
        }

        const selectedPrice = currency === 'USD' ? selectedPlan.priceUSD : selectedPlan.priceINR;
        const unitAmount = selectedPrice.price;
        const monthlyCredits = productId === PRODUCT_IDS.MENULIST
            ? resolveMenuListMonthlyCreditAllowance({
                fallbackAllowance: selectedPrice.monthlyCredits,
                planId: selectedPlan.planId,
                quantity,
            })
            : selectedPrice.monthlyCredits;

        if (typeof unitAmount !== "number" || typeof monthlyCredits !== "number") {
            return NextResponse.json({ error: "Plan price not available." }, { status: 400 });
        }
        const taxSnapshot = productUsesConfiguredTax(productId)
            ? calculateConfiguredProductTax({
                productId,
                baseUnitAmount: unitAmount,
                billingProfile: billingProfile
                    || getBillingProfileFromTaxSnapshot(replacementSubscription?.taxSnapshot)
                    || getBillingProfileFromTaxSnapshot(currentSubscription?.taxSnapshot)
                    || (() => { throw new BillingTaxProfileError('Complete billing details before checkout.'); })(),
                currency,
                quantity,
            })
            : null;
        const providerUnitAmount = taxSnapshot?.grossUnitAmount ?? unitAmount;
        const providerTotalAmount = taxSnapshot?.grossAmount ?? unitAmount * quantity;

        const billingDb = getBillingFirestoreAdminForProduct(productId);
        checkoutFailureStage = 'pending_subscription_query';
        const unresolvedSubscriptions = await billingDb.collection(DB_COLLECTIONS.SUBSCRIPTIONS)
            .where('pId', '==', productId)
            .where('productId', '==', productId)
            .where('status', 'in', ['pending', 'active'])
            .where('tenantId', '==', Number(tenantId))
            .where('storeId', '==', Number(storeId))
            .where('tId', '==', Number(tenantId))
            .where('sId', '==', Number(storeId))
            .limit(10)
            .get();
        for (const pendingDoc of unresolvedSubscriptions.docs) {
            const pending = { ...pendingDoc.data(), id: pendingDoc.id } as FirestoreSubscriptionDoc;
            const pendingScope = getProductSubscriptionBillingScope(productId, pending);
            if (
                !pendingScope
                || pendingScope.tenantId !== Number(tenantId)
                || pendingScope.storeId !== Number(storeId)
            ) {
                continue;
            }
            if (pending.status === 'active' && hasVerifiedSubscriptionPaymentEvidence(pending)) {
                return NextResponse.json(
                    { error: 'A current subscription already exists. Use the change-plan flow.' },
                    { status: 409 },
                );
            }
            const pendingReplacementEvidence = resolveSubscriptionReplacementEvidence(pending);
            const expectedReplacementMrrPaise = replacementSubscription
                ? getFounderSubscriptionMrrPaise(replacementSubscription)
                : null;
            const sameReplacementIntent = replacementForSubscriptionId
                ? pendingReplacementEvidence.outcome === 'replacement'
                    && pendingReplacementEvidence.subscriptionId === replacementForSubscriptionId
                    && pendingReplacementEvidence.previousMrrPaise === expectedReplacementMrrPaise
                : pendingReplacementEvidence.outcome === 'none';
            const pendingQuantity = pending.quantity == null ? 1 : pending.quantity;
            const sameIntent = (
                pending.planId === planId
                && pending.planType === interval
                && pending.currency === currency
                && pendingQuantity === quantity
                && sameReplacementIntent
            );
            if (pendingReplacementEvidence.outcome === 'invalid') {
                return NextResponse.json(
                    { error: 'The pending subscription requires billing support.' },
                    { status: 409 },
                );
            }

            const pendingProviderId = getRazorpayManagedSubscriptionId(pending);
            if (!pendingProviderId) {
                return NextResponse.json(
                    { error: 'The pending subscription requires billing support.' },
                    { status: 409 },
                );
            }
            checkoutFailureStage = 'pending_provider_fetch';
            const providerPendingSubscription = await razorpayClient.subscriptions.fetch(pendingProviderId);
            const pendingCheckoutAction = resolveRazorpayPendingCheckoutAction(providerPendingSubscription);
            if (pendingCheckoutAction === 'checkout' && sameIntent) {
                const responsePayload = projectRazorpaySubscriptionCheckoutResponse(
                    providerPendingSubscription,
                    true,
                );
                if (!responsePayload) {
                    throw new Error('razorpay_subscription_checkout_response_invalid');
                }
                const response = NextResponse.json(responsePayload);
                if (clearReferralCookieOnResponse) clearOwnerReferralCookie(response);
                return response;
            }
            if (pendingCheckoutAction === 'processing') {
                if (!sameIntent) {
                    return NextResponse.json(
                        { error: 'The current checkout is still being confirmed. Wait for confirmation before choosing another plan.' },
                        { status: 409 },
                    );
                }
                const response = NextResponse.json({
                    success: true,
                    status: 'processing',
                    subscriptionId: pendingProviderId,
                }, { status: 202 });
                if (clearReferralCookieOnResponse) clearOwnerReferralCookie(response);
                return response;
            }

            if (!pendingCheckoutAction) {
                throw new Error('razorpay_pending_subscription_state_invalid');
            }

            let cleanupProviderStatus = resolveRazorpayProviderSubscriptionStatus(
                providerPendingSubscription.status,
            );
            if (cleanupProviderStatus === 'created') {
                try {
                    checkoutFailureStage = 'pending_provider_cancel';
                    const cancelledSubscription = await razorpayClient.subscriptions.cancel(pendingProviderId);
                    cleanupProviderStatus = resolveRazorpayProviderSubscriptionStatus(
                        cancelledSubscription.status,
                    );
                } catch (cancellationError) {
                    const refreshedSubscription = await razorpayClient.subscriptions.fetch(pendingProviderId);
                    const refreshedAction = resolveRazorpayPendingCheckoutAction(refreshedSubscription);
                    cleanupProviderStatus = resolveRazorpayProviderSubscriptionStatus(
                        refreshedSubscription.status,
                    );
                    if (refreshedAction === 'processing' || refreshedAction === 'checkout') {
                        const response = NextResponse.json({
                            success: true,
                            status: 'processing',
                            subscriptionId: pendingProviderId,
                        }, { status: 202 });
                        if (clearReferralCookieOnResponse) clearOwnerReferralCookie(response);
                        return response;
                    }
                    if (refreshedAction !== 'replace') throw cancellationError;
                }
            }
            if (
                cleanupProviderStatus !== 'cancelled'
                && cleanupProviderStatus !== 'completed'
                && cleanupProviderStatus !== 'expired'
            ) {
                throw new Error('razorpay_pending_subscription_not_terminal');
            }

            checkoutFailureStage = 'pending_local_expiry';
            const cleanupResult = await billingDb.runTransaction(async (transaction) => {
                const currentSnapshot = await transaction.get(pendingDoc.ref);
                if (!currentSnapshot.exists) return 'missing' as const;
                const current = {
                    ...currentSnapshot.data(),
                    id: currentSnapshot.id,
                } as FirestoreSubscriptionDoc;
                const currentScope = getProductSubscriptionBillingScope(productId, current);
                const currentReplacementEvidence = resolveSubscriptionReplacementEvidence(current);
                const currentProviderId = getRazorpayManagedSubscriptionId(current);
                const currentQuantity = current.quantity == null ? 1 : current.quantity;
                const currentReplacementIntentMatches = pendingReplacementEvidence.outcome === 'replacement'
                    ? currentReplacementEvidence.outcome === 'replacement'
                        && currentReplacementEvidence.subscriptionId === pendingReplacementEvidence.subscriptionId
                        && currentReplacementEvidence.previousMrrPaise === pendingReplacementEvidence.previousMrrPaise
                    : currentReplacementEvidence.outcome === 'none';
                if (
                    current.status !== 'pending'
                    || currentProviderId !== pendingProviderId
                    || currentScope?.tenantId !== Number(tenantId)
                    || currentScope?.storeId !== Number(storeId)
                    || current.planId !== pending.planId
                    || current.planType !== pending.planType
                    || current.currency !== pending.currency
                    || currentQuantity !== pendingQuantity
                    || !currentReplacementIntentMatches
                ) {
                    return 'changed' as const;
                }
                const expiredAt = Timestamp.now();
                transaction.set(pendingDoc.ref, {
                    status: 'expired',
                    providerStatus: cleanupProviderStatus,
                    subscriptionEndDate: expiredAt,
                    cycleEndDate: expiredAt,
                    pastDueSinceAt: null,
                    statuses: [
                        ...(Array.isArray(current.statuses) ? current.statuses : []),
                        {
                            status: 'expired',
                            timestamp: expiredAt,
                            amount: current.amount,
                            currency: current.currency,
                            remark: 'Expired after the provider checkout became terminal.',
                        },
                    ],
                }, { merge: true });
                return 'expired' as const;
            });
            if (cleanupResult === 'changed') {
                return NextResponse.json(
                    { error: 'Subscription state changed while billing was checked. Refresh billing before trying again.' },
                    { status: 409 },
                );
            }
        }

        checkoutLeaseIdentity = {
            actorId: userId,
            kind: 'subscription',
            productId,
            tenantId,
            storeId,
            requestFacts: {
                currency,
                interval,
                planId,
                productId,
                quantity,
                replacementForSubscriptionId: replacementForSubscriptionId || null,
                storeId: String(storeId),
                tenantId: String(tenantId),
                unitAmount,
                providerUnitAmount,
                taxPolicyVersion: taxSnapshot?.policyVersion || null,
                userType: resolvedUserType,
            },
        };
        const checkoutClaim = await claimBillingCheckoutLease(checkoutLeaseIdentity);
        if (checkoutClaim.outcome === 'in_progress' || checkoutClaim.outcome === 'conflict') {
            return NextResponse.json(
                { error: 'A billing checkout is already being prepared. Please wait and try again.' },
                { status: 409 },
            );
        }
        checkoutAttemptId = checkoutClaim.attemptId;
        checkoutAttemptStartedAtMillis = checkoutClaim.startedAtMillis;

        // 4. Orchestration Logic
        // Step A: Get Provider Plan
        const razorpayPlanId = await getOrCreateRazorpayPlan({
            productId,
            price: providerUnitAmount,
            currency,
            interval,
            userType: resolvedUserType,
            planId,
        });

        let totalCount: number = 3; // Yearly: 3 cycles (auto-renewal for up to 3 years)
        if (interval === 'MONTH') totalCount = 36; // Monthly: 36 cycles (3 years)

        let recoveredProviderSubscription: any | null = null;
        if (checkoutClaim.outcome === 'provider_created') {
            const candidate = await razorpayClient.subscriptions.fetch(checkoutClaim.providerEntityId);
            if (!isMatchingCheckoutProviderSubscription(candidate, {
                attemptId: checkoutClaim.attemptId,
                planId,
                providerPlanId: razorpayPlanId,
                productId,
                quantity,
                storeId,
                tenantId,
            })) throw new Error('billing_checkout_provider_subscription_mismatch');
            recoveredProviderSubscription = candidate;
        } else if (checkoutClaim.outcome === 'recover_attempt') {
            const renewed = await renewExpiredBillingCheckoutLease(
                checkoutLeaseIdentity,
                checkoutClaim.attemptId,
            );
            if (
                !renewed.acquired
                || !renewed.attemptId
                || typeof renewed.startedAtMillis !== 'number'
            ) {
                return NextResponse.json(
                    { error: 'A billing checkout is already being prepared. Please wait and try again.' },
                    { status: 409 },
                );
            }
            checkoutAttemptId = renewed.attemptId;
            checkoutAttemptStartedAtMillis = renewed.startedAtMillis;
        } else if (checkoutClaim.outcome === 'recover_provider') {
            recoveredProviderSubscription = await recoverCheckoutProviderSubscription({
                attemptId: checkoutClaim.attemptId,
                planId,
                providerPlanId: razorpayPlanId,
                productId,
                quantity,
                startedAtMillis: checkoutClaim.startedAtMillis,
                storeId,
                tenantId,
            });
            if (!recoveredProviderSubscription) {
                return NextResponse.json(
                    { error: 'The provider is still resolving this checkout. Please wait and try again.' },
                    { status: 409 },
                );
            }
        }

        // Razorpay subscription notes allow max 15 keys; keep provider notes canonical and compact.
        const subscriptionNotes = {
            productId,
            tenantId,
            storeId,
            userId,
            userType: resolvedUserType,
            planId,
            quantity,
            interval,
            name,
            email,
            price: providerUnitAmount,
            ...(taxSnapshot ? {
                basePrice: unitAmount,
                taxPolicyVersion: taxSnapshot.policyVersion,
            } : {}),
            checkoutAttemptId,
            ...(replacementForSubscriptionId ? { replacementForSubscriptionId } : {}),
        };

        // Step B: Create Provider Subscription
        const RazorpayCreateObj: any = {
            plan_id: razorpayPlanId,
            total_count: totalCount, // 36 cycles for monthly (3 years), 3 cycles for yearly (3 years)
            quantity,
            notes: subscriptionNotes,
        }
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CREATE_SUBSCRIPTION_REQUEST',
            data: createSubscriptionLogSummary({
                currency,
                interval,
                planId,
                quantity,
                remainingCredits,
                storeId,
                tenantId,
                unitAmount,
                userType: resolvedUserType,
            }),
        });
        let razorpaySubscription: any;
        if (recoveredProviderSubscription) {
            razorpaySubscription = recoveredProviderSubscription;
        } else {
            if (!checkoutAttemptId || !checkoutLeaseIdentity || !(await markBillingCheckoutProviderCreateStarted({
                attemptId: checkoutAttemptId,
                identity: checkoutLeaseIdentity,
            }))) throw new Error('billing_checkout_provider_subscription_start_claim_lost');
            providerSubscriptionCreateAttempted = true;
            try {
                razorpaySubscription = await razorpayClient.subscriptions.create(RazorpayCreateObj);
            } catch (providerCreateError) {
                const recovered = await recoverCheckoutProviderSubscription({
                    attemptId: checkoutAttemptId,
                    planId,
                    providerPlanId: razorpayPlanId,
                    productId,
                    quantity,
                    startedAtMillis: checkoutAttemptStartedAtMillis ?? Date.now(),
                    storeId,
                    tenantId,
                });
                if (!recovered) throw providerCreateError;
                razorpaySubscription = recovered;
            }
        }
        subscriptionForLog = razorpaySubscription;
        providerSubscriptionCreated = true;
        if (!checkoutAttemptId || !checkoutLeaseIdentity || !(await markBillingCheckoutProviderCreated({
            attemptId: checkoutAttemptId,
            identity: checkoutLeaseIdentity,
            providerEntityId: razorpaySubscription.id,
        }))) {
            providerSubscriptionCheckpointLost = true;
            if (!recoveredProviderSubscription && typeof razorpaySubscription?.id === 'string') {
                try {
                    await razorpayClient.subscriptions.cancel(razorpaySubscription.id);
                    providerSubscriptionCompensated = true;
                } catch (compensationError) {
                    logger.error(
                        'Subscription checkout fence compensation failed',
                        new Error('razorpay_create_subscription_fence_compensation_failed'),
                        getRazorpayFailureLogData('razorpay_create_subscription_fence_compensation_failed', compensationError, {
                            ...getRazorpaySubscriptionMutationLogContext(razorpaySubscription),
                            ...getBoundedRazorpayStringContext('productId', productId),
                            ...getBoundedRazorpayStringContext('tenantId', tenantId),
                            ...getBoundedRazorpayStringContext('storeId', storeId),
                        }),
                    );
                }
            }
            throw new Error('billing_checkout_provider_subscription_claim_lost');
        }
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CREATE_SUBSCRIPTION_RESPONSE',
            data: {
                ...getRazorpaySubscriptionMutationLogContext(razorpaySubscription),
                totalCount: razorpaySubscription.total_count,
                hasShortUrl: Boolean(razorpaySubscription.short_url),
            },
        });

        // Step C: Create Firestore Record
        const subscriptionPayload: Omit<FirestoreSubscriptionDoc, "id"> = {
            paymentProvider: "razorpay",
            providerSubscriptionId: razorpaySubscription.id,
            providerPlanId: razorpayPlanId,
            productId,
            pId: productId,
            userId,
            uId: userId,
            name,
            email,
            tenantId,
            storeId,
            tId: tenantId,
            sId: storeId,
            planType: interval,
            userType: resolvedUserType,
            currency,
            amount: unitAmount,
            ...(taxSnapshot ? {
                chargedUnitAmount: providerUnitAmount,
                taxSnapshot,
            } : {}),
            status: "pending",
            providerStatus: "created",
            lastWebhook: null,
            planId: planId,
            planName: selectedPlan.name,
            cycleStartDate: null,
            subscriptionEndDate: null,
            subscriptionStartDate: null,
            pastDueSinceAt: null,
            totalPaymentsNeededCount: razorpaySubscription.total_count,
            totalPaymentsMadeCount: 0,
            cycleEndDate: null,
            renewsOn: null,
            monthlyCreditsAllowance: monthlyCredits,
            monthlyCredits: monthlyCredits,
            topUpCredits: 0,
            promotionalCredits: 0,
            promotionalCreditsExpireAt: null,
            creditsLastResetMonth: new Date().getFullYear() * 100 + (new Date().getMonth() + 1),
            shortUrl: normalizeRazorpaySubscriptionCheckoutUrl(razorpaySubscription.short_url) || '',
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
                    timestamp: Timestamp.now(),
                    amount: providerTotalAmount,
                    currency: currency,
                    remark: `Subscription Initiated; quantity ${quantity}`,
                },
            ],
            billingHistory: [],
            quantity,  // Multi-Outlet Billing (Feature #4C-B): master + paid outlet locations
            ...(replacementSubscription ? {
                founderMonitorReplacementForSubscriptionId: replacementForSubscriptionId,
                founderMonitorReplacementMrrPaise: getFounderSubscriptionMrrPaise(replacementSubscription),
                founderMonitorReplacementPlanId: replacementSubscription.planId || null,
                founderMonitorReplacementPlanName: replacementSubscription.planName || null,
            } : {}),
        };

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CREATE_SUBSCRIPTION_INTERNAL',
            data: {
                ...getRazorpaySubscriptionMutationLogContext({
                    id: razorpaySubscription.id,
                    planId,
                    providerSubscriptionId: razorpaySubscription.id,
                    status: subscriptionPayload.status,
                    storeId,
                    tenantId,
                }),
                ...getBoundedRazorpayStringContext('interval', interval),
                ...getBoundedRazorpayStringContext('currency', currency),
                quantity,
            },
        });
        try {
            await createProductInitialSubscription(productId, razorpaySubscription.id, subscriptionPayload);
            subscriptionPersisted = true;
        } catch (persistenceError) {
            const persistedSubscription = await getProductSubscriptionById(productId, razorpaySubscription.id)
                .catch((): null => null);
            if (persistedSubscription?.providerSubscriptionId === razorpaySubscription.id) {
                subscriptionPersisted = true;
            } else {
                try {
                    await razorpayClient.subscriptions.cancel(razorpaySubscription.id);
                    providerSubscriptionCompensated = true;
                } catch (compensationError) {
                    logger.error(
                        'Subscription persistence compensation failed',
                        new Error('razorpay_create_subscription_compensation_failed'),
                        getRazorpayFailureLogData('razorpay_create_subscription_compensation_failed', compensationError, {
                            ...getRazorpaySubscriptionMutationLogContext(razorpaySubscription),
                            ...getBoundedRazorpayStringContext('productId', productId),
                            ...getBoundedRazorpayStringContext('tenantId', tenantId),
                            ...getBoundedRazorpayStringContext('storeId', storeId),
                        }),
                    );
                }
                throw persistenceError;
            }
        }

        await completeBillingCheckoutLease({
            attemptId: checkoutAttemptId,
            identity: checkoutLeaseIdentity,
        }).catch((completionError) => {
            logger.warn('Subscription checkout replay checkpoint failed', {
                ...getRazorpayFailureLogData('razorpay_subscription_checkout_completion_failed', completionError),
            });
            return false;
        });

        // 5. Response
        const responsePayload = projectRazorpaySubscriptionCheckoutResponse(razorpaySubscription);
        if (!responsePayload) {
            throw new Error('razorpay_subscription_checkout_response_invalid');
        }
        const response = NextResponse.json(responsePayload);
        if (clearReferralCookieOnResponse) clearOwnerReferralCookie(response);
        return response;
    } catch (error) {
        if (error instanceof BillingTaxProfileError) {
            const response = NextResponse.json({ error: error.message }, { status: 400 });
            if (clearReferralCookieOnResponse) clearOwnerReferralCookie(response);
            return response;
        }
        if (error instanceof BillingTaxConfigurationError) {
            logger.error('MenuList billing tax configuration unavailable', error, {
                ...getBoundedRazorpayStringContext('userId', userId),
            });
            const response = NextResponse.json(
                { error: 'Checkout is temporarily unavailable while billing details are being configured.' },
                { status: 503 },
            );
            if (clearReferralCookieOnResponse) clearOwnerReferralCookie(response);
            return response;
        }
        if (
            checkoutLeaseIdentity
            && checkoutAttemptId
            && !providerSubscriptionCheckpointLost
            && (
                (!providerSubscriptionCreated && !providerSubscriptionCreateAttempted)
                || providerSubscriptionCompensated
            )
        ) {
            await releaseBillingCheckoutLease({
                attemptId: checkoutAttemptId,
                identity: checkoutLeaseIdentity,
                ...(providerSubscriptionCompensated && typeof subscriptionForLog?.id === 'string'
                    ? { providerEntityId: subscriptionForLog.id }
                    : {}),
            }).catch(() => false);
        }
        const failureData = getRazorpayFailureLogData('razorpay_create_subscription_failed', error, {
            failureStage: checkoutFailureStage,
            ...getRazorpaySubscriptionMutationLogContext(subscriptionForLog),
            ...getBoundedRazorpayStringContext('userId', userId),
            ...getBoundedRazorpayStringContext('tenantId', session.user.tenantId),
            ...getBoundedRazorpayStringContext('storeId', session.user.storeId),
        });
        logger.error('Subscription creation failed', new Error('razorpay_create_subscription_failed'), failureData);

        if (providerSubscriptionCreated && !subscriptionPersisted) {
            logger.warn('Provider subscription was not persisted locally', {
                ...getRazorpaySubscriptionMutationLogContext(subscriptionForLog),
            });
        }

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CREATE_SUBSCRIPTION_ERROR',
            data: failureData,
        });

        const response = NextResponse.json(
            { error: 'Failed to create subscription' },
            { status: 500 }
        );
        if (clearReferralCookieOnResponse) clearOwnerReferralCookie(response);
        return response;
    }
});
