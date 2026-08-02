export const dynamic = 'force-dynamic';
import { canManageAnswerlatticeBillingMutation, canManageBillingMutation } from "@lib/billing/billingAccess";
import { getPlanDetailsFromConstants, getSubscriptionEndDate } from "@lib/billing/billingUtils";
import {
    applyProductSubscriptionPayment,
    getProductSubscriptionById,
    safeSyncProductSubscriptionEntitlementFromSubscription,
    resolveBillingScopeFromSession,
} from "@lib/billing/productBillingServer";
import { getProviderCycleBillingPeriodKey } from '@lib/billing/billingPeriod';
import {
    getBoundedRazorpaySecurityContext,
    getBoundedRazorpayStringContext,
    getRazorpayFailureLogData,
    logRazorpayNonBlockingFailure,
} from "@lib/billing/razorpayDiagnostics";
import { isAnswerlatticeBillingProduct, normalizeBillingProductId, resolveProviderBillingProductId } from "@lib/billing/productBillingPlans";
import { finalizeProductSubscriptionReplacement } from '@lib/billing/subscriptionReplacementFinalization';
import { resolveSubscriptionReplacementEvidence } from '@lib/billing/subscriptionReplacementEvidence';
import {
    requireRazorpayRevenueAmountPaise,
    resolveRazorpayRevenueOccurredAtMillis,
    resolveRazorpaySubscriptionState,
} from '@lib/billing/razorpayRevenueProjectionBoundary';
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import {
    recordFounderRevenueMovement,
    recordFounderSubscriptionMrrChange,
    recordFounderSubscriptionNewMrr,
} from "@lib/ops/founderRevenueReadModel";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { markResellerTransactionsActiveForSubscription } from "@lib/reseller/resellerLedger";
import { safelyRecordOwnerReferralPaymentAndRepair } from '@lib/ownerReferral/ownerReferralSettlementServer';
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { VerifyPaymentRequestSchema } from "@lib/validation/apiSchemas";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { Timestamp } from "firebase/firestore";
import { writeLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from "crypto";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const LOG_FILE = "razorpay-subscription.log";
const RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES = 8 * 1024;

const summarizePaymentForLog = (payment: any) => ({
    ...getBoundedRazorpayStringContext('paymentId', payment?.id),
    status: payment?.status,
    amount: payment?.amount,
    currency: payment?.currency,
    method: payment?.method,
    ...getBoundedRazorpayStringContext('invoiceId', payment?.invoice_id),
    hasCard: Boolean(payment?.card),
    hasUpi: Boolean(payment?.vpa || payment?.acquirer_data?.upi_transaction_id),
});

const summarizeSubscriptionForLog = (subscription: any) => ({
    ...getBoundedRazorpayStringContext('subscriptionId', subscription?.id),
    status: subscription?.status,
    currentStart: subscription?.current_start,
    currentEnd: subscription?.current_end,
    paidCount: subscription?.paid_count,
    totalCount: subscription?.total_count,
    quantity: subscription?.quantity,
    ...getBoundedRazorpayStringContext('planId', subscription?.notes?.planId),
    ...getBoundedRazorpayStringContext('interval', subscription?.notes?.interval),
});

const verifyRazorpaySubscriptionSignature = (
    paymentId: string,
    subscriptionId: string,
    signature: string,
) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return false;

    const expectedSignature = createHmac('sha256', keySecret)
        .update(`${paymentId}|${subscriptionId}`)
        .digest('hex');
    const expected = Buffer.from(expectedSignature, 'hex');
    const actual = Buffer.from(signature, 'hex');

    return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const userId = session.user.id;

    try {
        const rateLimitConfig = getRateLimitForFeature('PAYMENT_VERIFICATION');
        const userRateLimitHash = hashPublicRateLimitValue(userId);
        const rateLimitResult = await checkRateLimit({
            failClosedOnProviderError: true,
            key: `payment-verify:subscription:${userRateLimitHash}`,
            ...rateLimitConfig,
        });

        if (!rateLimitResult.allowed) {
            const providerUnavailable = rateLimitResult.reason === 'provider_unavailable';
            const waitSeconds = Math.max(1, Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000));
            logger.security(providerUnavailable ? 'Payment Verification Rate Limit Provider Unavailable' : 'Payment Verification Rate Limit Exceeded', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-subscription',
                error: providerUnavailable ? 'Rate limit provider unavailable' : 'Too many payment verification attempts',
                feature: 'PAYMENT_VERIFICATION',
                ...(providerUnavailable ? {} : {
                    limit: rateLimitConfig.limit,
                    waitSeconds,
                    window: rateLimitConfig.window,
                }),
            }, 'high');

            return NextResponse.json(
                {
                    error: providerUnavailable
                        ? 'Payment verification is temporarily unavailable. Please try again.'
                        : 'Too many payment verification attempts. Please try again later.',
                    ...(providerUnavailable ? {} : { retryAfter: waitSeconds }),
                },
                {
                    status: providerUnavailable ? 503 : 429,
                    headers: providerUnavailable ? {} : {
                        'Retry-After': String(waitSeconds),
                        'X-RateLimit-Limit': String(rateLimitConfig.limit),
                        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
                        'X-RateLimit-Reset': String(rateLimitResult.resetAt),
                    },
                },
            );
        }

        // 2. 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const bodyResult = await readBoundedJsonBody(request, RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid input',
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const rawData = bodyResult.data as any;
        const validation = validateAPIInput(VerifyPaymentRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            // Log to Sentry (CRITICAL - payment verification)
            logger.security('Input Validation Failed', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-subscription',
                error: errorMsg,
                attemptedData: {
                    ...getBoundedRazorpayStringContext('productId', rawData?.productId),
                    hasPaymentId: !!rawData?.razorpay_payment_id,
                    hasSubscriptionId: !!rawData?.razorpay_subscription_id,
                },
            }, 'critical'); // CRITICAL - payment verification

            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = validation.data;
        if (!verifyRazorpaySubscriptionSignature(razorpay_payment_id, razorpay_subscription_id, razorpay_signature)) {
            logger.security('Invalid Subscription Payment Signature', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-subscription',
                error: 'Razorpay checkout signature mismatch',
                ...getBoundedRazorpayStringContext('subscriptionId', razorpay_subscription_id),
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - payment verification failed' },
                { status: 403 }
            );
        }

        const requestedProductId = normalizeBillingProductId(validation.data.productId);
        if (isAnswerlatticeBillingProduct(requestedProductId) && !(await canManageAnswerlatticeBillingMutation(session, request))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        // 3. --- SERVER-SIDE VERIFICATION ---
        // This is the crucial security step. We do not trust the client.
        // We ask Razorpay's servers directly about the status of this payment.

        // Step A: Fetch the payment from Razorpay to verify its status
        const payment = await razorpayClient.payments.fetch(razorpay_payment_id);
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_PAYMENT_RESPONSE_VERIFY_SUBSCRIPTION',
            data: {
                ...summarizePaymentForLog(payment),
                ...getBoundedRazorpayStringContext('userId', userId),
            },
        });

        // Step B: Fetch the full subscription details from Razorpay for accurate date info
        const providerSubscription = await razorpayClient.subscriptions.fetch(razorpay_subscription_id);
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_SUBSCRIPTION_RESPONSE_VERIFY_SUBSCRIPTION',
            data: {
                ...summarizeSubscriptionForLog(providerSubscription),
                ...getBoundedRazorpayStringContext('userId', userId),
            },
        });

        const productId = resolveProviderBillingProductId(
            validation.data.productId,
            providerSubscription?.notes?.productId ?? providerSubscription?.notes?.pId,
        );
        if (!productId) {
            logger.security('Subscription Verification Product Mismatch', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-subscription',
                error: 'Provider subscription product does not match request product',
                ...getBoundedRazorpayStringContext('requestProductId', validation.data.productId),
                ...getBoundedRazorpayStringContext('providerProductId', providerSubscription?.notes?.productId ?? providerSubscription?.notes?.pId),
            }, 'critical');
            return NextResponse.json({ error: 'Forbidden - payment mismatch' }, { status: 403 });
        }
        const scope = resolveBillingScopeFromSession(session, productId);
        if (!scope) {
            return NextResponse.json({ error: "Missing tenant/store data" }, { status: 400 });
        }

        const { tenantId, storeId } = scope;
        if (!isAnswerlatticeBillingProduct(productId) && !verifyTenantAccess(session, tenantId, storeId, request)) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (!isAnswerlatticeBillingProduct(productId) && !(await canManageBillingMutation(session, request, '/api/razorpay/verify-subscription'))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        // Step C: Find our internal Firestore document for this subscription
        const internalSub = await getProductSubscriptionById(productId, razorpay_subscription_id);
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'INTERNAL_SUBSCRIPTION_RESPONSE_VERIFY_SUBSCRIPTION',
            data: {
                ...getBoundedRazorpayStringContext('userId', userId),
                ...getBoundedRazorpayStringContext('subscriptionId', razorpay_subscription_id),
                ...getBoundedRazorpayStringContext('productId', productId),
                found: Boolean(internalSub),
                status: internalSub?.status,
                ...getBoundedRazorpayStringContext('tenantId', internalSub?.tenantId),
                ...getBoundedRazorpayStringContext('storeId', internalSub?.storeId),
                ...getBoundedRazorpayStringContext('planId', internalSub?.planId),
                quantity: internalSub?.quantity,
            },
        });

        if (providerSubscription?.id !== razorpay_subscription_id) {
            logger.security('Subscription Verification Provider Mismatch', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-subscription',
                error: 'Fetched provider subscription id mismatch',
                ...getBoundedRazorpayStringContext('requestedSubscriptionId', razorpay_subscription_id),
                ...getBoundedRazorpayStringContext('fetchedSubscriptionId', providerSubscription?.id),
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - payment mismatch' },
                { status: 403 }
            );
        }

        const paymentSubscriptionId = String(payment?.subscription_id || '');
        if (payment.status !== 'captured' || paymentSubscriptionId !== razorpay_subscription_id) {
            logger.security('Subscription Payment Verification Failed', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-subscription',
                error: 'Payment is not captured or does not belong to subscription',
                paymentStatus: payment.status,
                ...getBoundedRazorpayStringContext('paymentSubscriptionId', paymentSubscriptionId),
                ...getBoundedRazorpayStringContext('requestedSubscriptionId', razorpay_subscription_id),
            }, 'critical');

            return NextResponse.json(
                { error: 'Payment could not be verified.' },
                { status: 402 }
            );
        }

        if (!internalSub) {
            logger.error('Internal subscription not found', undefined, {
                ...getBoundedRazorpayStringContext('subscriptionId', razorpay_subscription_id),
                ...getBoundedRazorpayStringContext('userId', userId),
            });
            // The webhook will eventually handle this, but we can't activate it now.
            return NextResponse.json({ success: false, error: "Internal subscription record not found." }, { status: 404 });
        }

        // 🔒 CRITICAL: Verify user owns this subscription's tenant/store
        const subscriptionMatchesScope = Number(internalSub.tenantId) === Number(tenantId)
            && Number(internalSub.storeId) === Number(storeId);
        if (!subscriptionMatchesScope || (!isAnswerlatticeBillingProduct(productId) && !verifyTenantAccess(session, internalSub.tenantId, internalSub.storeId, request))) {
            logger.security('Unauthorized Subscription Verification Attempt', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-subscription',
                error: 'User attempted to verify subscription for different tenant/store',
                ...getBoundedRazorpayStringContext('productId', productId),
                ...getBoundedRazorpayStringContext('subscriptionTenantId', internalSub.tenantId),
                ...getBoundedRazorpayStringContext('subscriptionStoreId', internalSub.storeId),
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        // 4. --- OPTIMISTIC UPDATE ---
        // The payment is verified. We can now confidently update our own database immediately.
        logger.info('Payment verified successfully', {
            ...getBoundedRazorpayStringContext('subscriptionId', razorpay_subscription_id),
            ...getBoundedRazorpayStringContext('userId', userId),
            action: 'activating'
        });

        const planDetails = getPlanDetailsFromConstants(providerSubscription.notes);
        if (!planDetails) {
            logger.error('Plan details not found in subscription notes', undefined, {
                ...getBoundedRazorpayStringContext('subscriptionId', razorpay_subscription_id),
                ...getBoundedRazorpayStringContext('planId', providerSubscription.notes?.planId),
                ...getBoundedRazorpayStringContext('interval', providerSubscription.notes?.interval),
                ...getBoundedRazorpayStringContext('userType', providerSubscription.notes?.userType),
                ...getBoundedRazorpayStringContext('userId', userId),
            });
            return NextResponse.json({ success: false, error: "Could not derive plan details." }, { status: 500 });
        }

        const priceKey = `price${payment.currency.toUpperCase()}`;
        const creditsForPlan = planDetails[priceKey]?.monthlyCredits || 0;
        const paymentAmount = requireRazorpayRevenueAmountPaise(payment.amount);
        const paymentOccurredAt = resolveRazorpayRevenueOccurredAtMillis(payment.created_at);
        const providerState = resolveRazorpaySubscriptionState(providerSubscription, internalSub.quantity);
        const billingInterval = providerSubscription.notes?.interval;

        const billingPeriod = getProviderCycleBillingPeriodKey(providerState?.currentStartSeconds);
        if (
            !providerState
            || billingPeriod === null
            || (billingInterval !== 'MONTH' && billingInterval !== 'YEAR')
        ) {
            logger.error('Invalid provider billing cycle', undefined, {
                ...getBoundedRazorpayStringContext('subscriptionId', razorpay_subscription_id),
                ...getBoundedRazorpayStringContext('userId', userId),
            });
            return NextResponse.json({ success: false, error: 'Could not verify the billing cycle.' }, { status: 502 });
        }
        const updatePayload: Partial<FirestoreSubscriptionDoc> = {
            productId,
            pId: productId,
            tenantId,
            storeId,
            tId: tenantId,
            sId: storeId,
            userId,
            uId: userId,
            status: 'active',
            planName: planDetails.name,
            planId: planDetails.planId,

            // Set up the credit system
            monthlyCreditsAllowance: creditsForPlan,

            // Set billing cycle dates from the definitive source (Razorpay API)
            cycleStartDate: Timestamp.fromMillis(providerState.currentStartMillis),
            cycleEndDate: Timestamp.fromMillis(providerState.currentEndMillis),
            renewsOn: Timestamp.fromMillis(providerState.chargeAtMillis),
            subscriptionEndDate: getSubscriptionEndDate({
                interval: billingInterval,
                startAtMillis: providerState.startAtMillis,
                totalCount: providerState.totalCount,
            }),
            subscriptionStartDate: Timestamp.fromMillis(providerState.startAtMillis),
            totalPaymentsNeededCount: providerState.totalCount,
            totalPaymentsMadeCount: providerState.paidCount,
            pastDueSinceAt: null,
            quantity: providerState.quantity,
            // Store payment method
            paymentMethod: {
                type: payment.method,
                brand: payment.card?.network,
                last4: payment.card?.last4,
                upiId: payment.vpa ?? undefined,
                upiTransactionId: payment?.acquirer_data?.upi_transaction_id,
            },
        };

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'UPDATE_SUBSCRIPTION_VERIFY_SUBSCRIPTION',
            data: {
                ...getBoundedRazorpayStringContext('userId', userId),
                ...getBoundedRazorpayStringContext('subscriptionId', razorpay_subscription_id),
                status: updatePayload.status,
                quantity: updatePayload.quantity,
                totalPaymentsMadeCount: updatePayload.totalPaymentsMadeCount,
                totalPaymentsNeededCount: updatePayload.totalPaymentsNeededCount,
            },
        });
        const paymentApplication = await applyProductSubscriptionPayment(productId, {
            billingPeriod,
            paymentHistoryId: razorpay_payment_id,
            statusEntry: {
                status: 'verified',
                timestamp: Timestamp.now(),
                amount: Number.isFinite(paymentAmount) ? paymentAmount : 0,
                currency: payment.currency,
                remark: 'Subscription verified',
            },
            subscriptionId: razorpay_subscription_id,
            update: updatePayload,
        });
        if (!paymentApplication) {
            return NextResponse.json({ success: false, error: 'Internal subscription record not found.' }, { status: 404 });
        }
        if (!paymentApplication.applied && !paymentApplication.duplicate) {
            return NextResponse.json({ error: 'Subscription cannot be activated in its current state.' }, { status: 409 });
        }
        const replacementEvidence = resolveSubscriptionReplacementEvidence(
            paymentApplication.previousSubscription,
            internalSub,
        );
        if (replacementEvidence.outcome === 'invalid') {
            throw new Error('Subscription replacement evidence is invalid.');
        }
        const replacementSubscriptionId = replacementEvidence.outcome === 'replacement'
            ? replacementEvidence.subscriptionId
            : null;
        const replacementMrrPaise = replacementEvidence.outcome === 'replacement'
            ? replacementEvidence.previousMrrPaise
            : 0;
        let activatedSubscription = paymentApplication.subscription;
        if (replacementSubscriptionId) {
            const replacementApplication = await finalizeProductSubscriptionReplacement({
                newSubscriptionId: razorpay_subscription_id,
                oldSubscriptionId: replacementSubscriptionId,
                productId,
                source: 'api:verify-subscription:replacement',
                storeId: Number(storeId),
                tenantId: Number(tenantId),
            });
            activatedSubscription = replacementApplication.newSubscription;
        }
        if (!isAnswerlatticeBillingProduct(productId)) {
            await markResellerTransactionsActiveForSubscription(razorpay_subscription_id, 'api:verify-subscription');
        }
        await safeSyncProductSubscriptionEntitlementFromSubscription(
            productId,
            activatedSubscription,
            'api:verify-subscription',
        );
        if (!isAnswerlatticeBillingProduct(productId)) {
            await safelyRecordOwnerReferralPaymentAndRepair({
                paidScope: { tenantId: Number(tenantId), storeId: Number(storeId) },
                evidence: {
                    paidAt: new Date(paymentOccurredAt ?? Date.now()),
                    paymentEvidenceId: String(payment.id || razorpay_payment_id),
                    source: 'api:verify-subscription',
                    subscriptionId: razorpay_subscription_id,
                },
            });
        }
        await recordFounderRevenueMovement({
            amountPaise: paymentAmount,
            currency: payment.currency || 'INR',
            description: 'Razorpay subscription payment verified.',
            eventName: 'subscription.verified',
            id: `cash:${razorpay_payment_id}`,
            kind: 'cash_collected',
            occurredAt: paymentOccurredAt,
            paymentId: razorpay_payment_id,
            productId,
            requireDurableWrite: true,
            source: 'api:verify-subscription',
            storeId: internalSub.storeId,
            subscriptionId: razorpay_subscription_id,
            tenantId: internalSub.tenantId,
        });
        if (replacementSubscriptionId && replacementMrrPaise > 0) {
            await recordFounderSubscriptionMrrChange({
                eventKey: `${replacementSubscriptionId}:${razorpay_subscription_id}`,
                previousMrrPaise: replacementMrrPaise,
                productId,
                requireDurableWrite: true,
                source: 'api:verify-subscription:replacement',
                subscription: activatedSubscription,
                occurredAt: providerState.currentStartMillis,
            });
        } else {
            await recordFounderSubscriptionNewMrr({
                productId,
                requireDurableWrite: true,
                source: 'api:verify-subscription',
                subscription: activatedSubscription,
                occurredAt: providerState.currentStartMillis,
            });
        }

        if (!isAnswerlatticeBillingProduct(productId) && paymentApplication.applied) {
            // 📧 LIFECYCLE MESSAGE: First payment / subscription activation (fire-and-forget)
            try {
                const { sendLifecycleMessage } = await import('@lib/messaging');
                sendLifecycleMessage({
                    storeId: String(internalSub.storeId),
                    tenantId: String(internalSub.tenantId),
                    eventType: 'PAYMENT_SUCCESS',
                    referenceId: `payment-${razorpay_payment_id}`,
                    recipientEmail: internalSub.email || session.user.email || '',
                    storeName: internalSub.name || '',
                    metadata: {
                        amount: paymentAmount / 100,
                        currency: payment.currency?.toUpperCase() || 'INR',
                        planName: planDetails.name || 'Subscription',
                        nextBillingAt: new Date(providerState.chargeAtMillis).toISOString(),
                    },
                }).catch((notificationError) => {
                    logRazorpayNonBlockingFailure('razorpay_verify_subscription_lifecycle_message_failed', notificationError, {
                        eventType: 'PAYMENT_SUCCESS',
                        ...getBoundedRazorpayStringContext('paymentId', razorpay_payment_id),
                        ...getBoundedRazorpayStringContext('subscriptionId', razorpay_subscription_id),
                        ...getBoundedRazorpayStringContext('tenantId', internalSub.tenantId),
                        ...getBoundedRazorpayStringContext('storeId', internalSub.storeId),
                        ...getBoundedRazorpayStringContext('userId', userId),
                    });
                });
            } catch (notificationImportError) {
                logRazorpayNonBlockingFailure('razorpay_verify_subscription_lifecycle_message_import_failed', notificationImportError, {
                    eventType: 'PAYMENT_SUCCESS',
                    ...getBoundedRazorpayStringContext('paymentId', razorpay_payment_id),
                    ...getBoundedRazorpayStringContext('subscriptionId', razorpay_subscription_id),
                    ...getBoundedRazorpayStringContext('tenantId', internalSub.tenantId),
                    ...getBoundedRazorpayStringContext('storeId', internalSub.storeId),
                    ...getBoundedRazorpayStringContext('userId', userId),
                });
            }

            // 📧 INTERNAL: Notify founder about new subscription revenue
            try {
                const { sendInternalNotification } = await import('@lib/messaging');
                sendInternalNotification({
                    eventType: 'INTERNAL_SUBSCRIPTION_PURCHASED',
                    storeId: String(internalSub.storeId),
                    tenantId: String(internalSub.tenantId),
                    metadata: {
                        storeName: internalSub.name || '',
                        planName: planDetails.name || '',
                        amount: payment.amount ? (Number(payment.amount) / 100) : 0,
                        currency: payment.currency?.toUpperCase() || 'INR',
                        customerEmail: internalSub.email || session.user.email || '',
                        storeId: String(internalSub.storeId),
                        tenantId: String(internalSub.tenantId),
                    },
                }).catch((notificationError) => {
                    logRazorpayNonBlockingFailure('razorpay_verify_subscription_internal_notification_failed', notificationError, {
                        eventType: 'INTERNAL_SUBSCRIPTION_PURCHASED',
                        ...getBoundedRazorpayStringContext('paymentId', razorpay_payment_id),
                        ...getBoundedRazorpayStringContext('subscriptionId', razorpay_subscription_id),
                        ...getBoundedRazorpayStringContext('tenantId', internalSub.tenantId),
                        ...getBoundedRazorpayStringContext('storeId', internalSub.storeId),
                        ...getBoundedRazorpayStringContext('userId', userId),
                    });
                });
            } catch (notificationImportError) {
                logRazorpayNonBlockingFailure('razorpay_verify_subscription_internal_notification_import_failed', notificationImportError, {
                    eventType: 'INTERNAL_SUBSCRIPTION_PURCHASED',
                    ...getBoundedRazorpayStringContext('paymentId', razorpay_payment_id),
                    ...getBoundedRazorpayStringContext('subscriptionId', razorpay_subscription_id),
                    ...getBoundedRazorpayStringContext('tenantId', internalSub.tenantId),
                    ...getBoundedRazorpayStringContext('storeId', internalSub.storeId),
                    ...getBoundedRazorpayStringContext('userId', userId),
                });
            }
        }

        // 5. Respond to the client
        return NextResponse.json({ success: true, status: 'active' });

    } catch (error) {
        const failureData = getRazorpayFailureLogData('razorpay_verify_subscription_failed', error, {
            api: 'verify-subscription',
            ...getBoundedRazorpayStringContext('userId', userId),
        });
        logger.error('Subscription verification failed', new Error('razorpay_verify_subscription_failed'), failureData);
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'VERIFY_SUBSCRIPTION_ERROR',
            data: failureData,
        });
        return NextResponse.json(
            { error: 'Failed to verify subscription' },
            { status: 500 }
        );
    }
});
