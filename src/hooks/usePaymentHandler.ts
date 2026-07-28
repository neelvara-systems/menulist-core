import { AIEnhancementPack, Currency, Plan, PurchaseIntent } from '@data/common';
import { PRODUCT_IDS, type ProductId } from '@constant/product';
import { isFeatureEnabled } from '@config/features';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import type { CancellationReasonCode } from '@lib/billing/cancellationReasons';
import {
    createCheckoutDismissedError,
    createPaymentStatusError,
    isPaymentCheckoutDismissedError,
    isRazorpayPaymentResponse,
    MAX_SUBSCRIPTION_QUANTITY,
    normalizeSubscriptionQuantity,
    parseRazorpaySubscriptionCheckoutResponse,
    parseRazorpayTopupCheckoutResponse,
    type RazorpayPaymentResponse,
} from '@lib/billing/paymentCheckoutBoundary';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { normalizeBillingSubscriptionScopeDocumentId } from '@lib/billing/subscriptionDocumentIdBoundary';
import { getMenuListSessionProviderScopeKey } from '@lib/multiOutlet/sessionProviderScopeBoundary';
import { useSession } from 'next-auth/react';
import { useCallback, useRef, useState } from 'react';
import { getBoundedPaymentStringContext, getPaymentFlowLogContext, logPaymentFailure } from './paymentDiagnostics';
import useRazorpayScript from './useRazorpayScript';
import { isRazorpayCheckoutConfigurationReady } from '@lib/billing/razorpayScriptBoundary';

declare global {
    interface Window {
        Razorpay: new (options: RazorpayCheckoutOptions) => { open: () => void };
    }
}

type SubscriptionCheckoutResult = RazorpayPaymentResponse & {
    subscriptionId: string;
};

type TopupCheckoutResult = RazorpayPaymentResponse & PaymentTopupVerifyResponse;

type RazorpayCheckoutOptions = {
    description: string;
    handler: (response: unknown) => void;
    key: string | undefined;
    modal: { ondismiss: () => void };
    name: string;
    order_id?: string;
    prefill: { email: string; name: string };
    subscription_id?: string;
};

type PaymentHandlerOptions = {
    productId?: ProductId;
    productName?: string;
    subscriptionCheckoutName?: string;
    topupCheckoutName?: string;
};

const PAYMENT_RESPONSE_JSON_MAX_BYTES = 32 * 1024;
const PAYMENT_ROUTE_REQUEST_OPTIONS: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

const isBoundedProviderString = (value: unknown): value is string => (
    typeof value === 'string' && value.length > 0 && value.length <= 512
);

const isScopeIdentifier = (value: unknown): value is string | number => {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    if (!/^[1-9]\d*$/.test(raw)) return false;
    const numeric = Number(raw);
    return Number.isSafeInteger(numeric) && String(numeric) === raw;
};

export { isPaymentCheckoutDismissedError } from '@lib/billing/paymentCheckoutBoundary';

type PaymentSubscriptionActionResponse = {
    success: true;
    message?: string;
};

type PaymentSubscriptionVerifyResponse = {
    success: true;
    status: 'active';
};

type PaymentTopupVerifyResponse = {
    success: true;
    newCreditBalance: number;
    alreadyVerified?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null
);

const isPaymentSubscriptionActionResponse = (value: unknown): value is PaymentSubscriptionActionResponse => (
    isRecord(value) && value.success === true
);

const isPaymentSubscriptionVerifyResponse = (value: unknown): value is PaymentSubscriptionVerifyResponse => (
    isRecord(value)
    && value.success === true
    && value.status === 'active'
);

const isPaymentTopupVerifyResponse = (value: unknown): value is PaymentTopupVerifyResponse => (
    isRecord(value)
    && value.success === true
    && typeof value.newCreditBalance === 'number'
    && Number.isFinite(value.newCreditBalance)
);

const hasPaymentResponseError = (value: unknown): boolean => (
    isRecord(value) && 'error' in value && value.error !== undefined && value.error !== null
);

type PaymentLoaderDispatch = (
    action: ReturnType<typeof startLoader> | ReturnType<typeof stopLoader>,
) => unknown;

const usePaymentHandler = (dispatcher: PaymentLoaderDispatch, options: PaymentHandlerOptions = {}) => {
    const [pendingPlan, setPendingPlan] = useState<{ plan: Plan; currency: Currency } | null>(null);
    const { data: session, update } = useSession();
    const isScriptLoaded = useRazorpayScript();
    const checkoutInFlightRef = useRef(false);
    const productId = options.productId || PRODUCT_IDS.MENULIST;
    const productName = options.productName || 'MenuList.ai';
    const subscriptionCheckoutName = options.subscriptionCheckoutName || `${productName} Subscription`;
    const topupCheckoutName = options.topupCheckoutName || `${productName} Credit Pack`;
    const hasBillingScope = productId === PRODUCT_IDS.ANSWERLATTICE
        ? Boolean(resolveAnswerlatticeSessionScope(session))
        : Boolean(
            getMenuListSessionProviderScopeKey(session)
            &&
            normalizeBillingSubscriptionScopeDocumentId(session?.user?.tenantId)
            && normalizeBillingSubscriptionScopeDocumentId(session?.user?.storeId)
        );
    const buildPaymentLogContext = useCallback((flow: string, metadata: Record<string, unknown> = {}) => ({
        ...getPaymentFlowLogContext(flow, productId),
        hasSession: Boolean(session?.user?.id),
        hasBillingScope,
        ...metadata,
    }), [hasBillingScope, productId, session?.user?.id]);
    const readPaymentResponseJson = useCallback(async <T,>(
        response: Response,
        flow: string,
        metadata: Record<string, unknown> = {},
    ): Promise<T | null> => {
        try {
            return await readJsonResponseWithLimit<T>(response, PAYMENT_RESPONSE_JSON_MAX_BYTES);
        } catch (error) {
            logPaymentFailure('payment_response_parse_failed', error, buildPaymentLogContext(flow, {
                responseOk: response.ok,
                responseStatus: response.status,
                maxBytes: PAYMENT_RESPONSE_JSON_MAX_BYTES,
                ...metadata,
            }));
            return null;
        }
    }, [buildPaymentLogContext]);

    const readPaymentSubscriptionActionResponse = useCallback(async (
        response: Response,
        flow: string,
        invalidCode: string,
        failureMessage: string,
        metadata: Record<string, unknown> = {},
    ): Promise<PaymentSubscriptionActionResponse> => {
        const result = await readPaymentResponseJson<unknown>(response, flow, metadata);
        if (!isPaymentSubscriptionActionResponse(result)) {
            logPaymentFailure(invalidCode, undefined, buildPaymentLogContext(flow, {
                responseOk: response.ok,
                responseStatus: response.status,
                hasResultError: hasPaymentResponseError(result),
                ...metadata,
            }));
            throw createPaymentStatusError(failureMessage, invalidCode, response.status);
        }
        return result;
    }, [buildPaymentLogContext, readPaymentResponseJson]);

    const readPaymentVerificationResponse = useCallback(async <T,>(
        response: Response,
        flow: string,
        isValid: (value: unknown) => value is T,
        rejectedCode: string,
        invalidCode: string,
        failureMessage: string,
        metadata: Record<string, unknown> = {},
    ): Promise<T> => {
        const result = await readPaymentResponseJson<unknown>(response, flow, metadata);
        if (response.ok && isValid(result)) {
            return result;
        }

        const failureCode = response.ok ? invalidCode : rejectedCode;
        logPaymentFailure(failureCode, undefined, buildPaymentLogContext(flow, {
            responseOk: response.ok,
            responseStatus: response.status,
            hasResultError: hasPaymentResponseError(result),
            ...metadata,
        }));
        throw createPaymentStatusError(failureMessage, failureCode, response.status);
    }, [buildPaymentLogContext, readPaymentResponseJson]);

    const createSubscription = async (
        plan: Plan,
        currency: Currency,
        quantity: number = 1,
        replacementForSubscriptionId?: string,
    ): Promise<SubscriptionCheckoutResult> => {
        if (!isRazorpayCheckoutConfigurationReady(isScriptLoaded, process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)) {
            throw createPaymentStatusError(
                'Razorpay checkout is not available.',
                'payment_checkout_unavailable',
            );
        }
        const subscriptionQuantity = normalizeSubscriptionQuantity(quantity);
        let subscriptionId: string;

        dispatcher(startLoader("Creating Subscription"));
        try {
            const subResponse = await fetch('/api/razorpay/create-subscription', {
                ...PAYMENT_ROUTE_REQUEST_OPTIONS,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: plan.planId,
                    productId,
                    interval: plan.billingInterval,
                    currency,
                    userType: plan.type,
                    quantity: subscriptionQuantity,
                    replacementForSubscriptionId,
                })
            });

            if (!subResponse.ok) {
                await readPaymentResponseJson(subResponse, 'create_subscription_rejected', {
                    ...getBoundedPaymentStringContext('planId', plan.planId),
                    quantity: subscriptionQuantity,
                });
                throw createPaymentStatusError(
                    'Failed to create subscription.',
                    'payment_subscription_create_rejected',
                    subResponse.status,
                );
            }
            const subscriptionPayload = await readPaymentResponseJson<unknown>(subResponse, 'create_subscription_response', {
                ...getBoundedPaymentStringContext('planId', plan.planId),
                quantity: subscriptionQuantity,
            });
            const subscriptionResponse = parseRazorpaySubscriptionCheckoutResponse(subscriptionPayload);
            if (!subscriptionResponse) {
                throw createPaymentStatusError(
                    'Failed to create subscription.',
                    'payment_subscription_create_response_invalid',
                    subResponse.status,
                );
            }
            subscriptionId = subscriptionResponse.subscription.id;
        } catch (error) {
            logPaymentFailure('payment_subscription_create_failed', error, buildPaymentLogContext('create_subscription', {
                ...getBoundedPaymentStringContext('planId', plan.planId),
                quantity: subscriptionQuantity,
            }));
            throw error;
        } finally {
            dispatcher(stopLoader("Creating Subscription"));
        }

        return new Promise<SubscriptionCheckoutResult>((resolve, reject) => {
            const options: RazorpayCheckoutOptions = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                subscription_id: subscriptionId,
                name: subscriptionCheckoutName,
                description: subscriptionQuantity > 1
                    ? `${plan.name} for ${subscriptionQuantity} locations`
                    : plan.name,
                handler: (response: unknown) => {
                    dispatcher(startLoader("Creating Subscription"));
                    void verifySubscriptionPaymentResponse(response)
                        .then((verifiedResponse) => {
                            resolve({ ...verifiedResponse, subscriptionId });
                        })
                        .catch((error) => {
                            logPaymentFailure('payment_subscription_verify_failed', error, buildPaymentLogContext('create_subscription_handler', {
                                ...getBoundedPaymentStringContext('planId', plan.planId),
                                quantity: subscriptionQuantity,
                            }));
                            reject(error);
                        })
                        .finally(() => dispatcher(stopLoader("Creating Subscription")));
                },
                modal: { ondismiss: () => reject(createCheckoutDismissedError()) },
                prefill: {
                    name: session?.user?.name || '',
                    email: session?.user?.email || '',
                },
            };

            try {
                new window.Razorpay(options).open();
            } catch (error) {
                logPaymentFailure('payment_subscription_checkout_open_failed', error, buildPaymentLogContext('create_subscription_checkout', {
                    ...getBoundedPaymentStringContext('planId', plan.planId),
                }));
                reject(error);
            }
        });
    }

    const onClickPaymentCard = async (plan: Plan, currency: Currency, onAuthRequired: () => void, quantity: number = 1) => {
        if (!session || !session.user || !session.user.id || !hasBillingScope) {
            setPendingPlan({ plan, currency });
            onAuthRequired();
            return;
        }
        if (!isScriptLoaded) {
            throw createPaymentStatusError(
                'Razorpay checkout is not available.',
                'payment_checkout_unavailable',
            );
        }
        if (checkoutInFlightRef.current) {
            throw createPaymentStatusError(
                'A checkout is already in progress.',
                'payment_checkout_in_progress',
            );
        }
        checkoutInFlightRef.current = true;
        try {
            return await createSubscription(plan, currency, quantity);
        } catch (error) {
            if (!isPaymentCheckoutDismissedError(error)) {
                logPaymentFailure('payment_card_click_failed', error, buildPaymentLogContext('payment_card_click', {
                    ...getBoundedPaymentStringContext('planId', plan.planId),
                    requestedQuantityValid: Number.isSafeInteger(quantity)
                        && quantity >= 1
                        && quantity <= MAX_SUBSCRIPTION_QUANTITY,
                }));
            }
            throw error;
        } finally {
            checkoutInFlightRef.current = false;
        }
    };

    const onCancelSubscription = async ({
        reason,
        otherReason,
        consent,
    }: {
        reason: CancellationReasonCode;
        otherReason?: string;
        consent: boolean;
    }) => {
        const response = await fetch('/api/razorpay/cancel-subscription', {
            ...PAYMENT_ROUTE_REQUEST_OPTIONS,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, reason, otherReason, consent }),
        });

        if (!response.ok) {
            await readPaymentResponseJson(response, 'cancel_subscription_rejected');
            throw createPaymentStatusError(
                'Failed to cancel subscription.',
                'payment_subscription_cancel_rejected',
                response.status,
            );
        }

        await readPaymentSubscriptionActionResponse(
            response,
            'cancel_subscription_response',
            'payment_subscription_cancel_response_invalid',
            'Failed to cancel subscription.',
        );
    }

    const onPauseSubscription = async ({ reason }: { reason?: string } = {}) => {
        if (!isFeatureEnabled('ENABLE_SUBSCRIPTION_PAUSE')) {
            throw new Error('Subscription pause is not available.');
        }

        const response = await fetch('/api/razorpay/pause-subscription', {
            ...PAYMENT_ROUTE_REQUEST_OPTIONS,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, reason }),
        });

        if (!response.ok) {
            await readPaymentResponseJson(response, 'pause_subscription_rejected');
            throw createPaymentStatusError(
                'Failed to pause subscription.',
                'payment_subscription_pause_rejected',
                response.status,
            );
        }

        await readPaymentSubscriptionActionResponse(
            response,
            'pause_subscription_response',
            'payment_subscription_pause_response_invalid',
            'Failed to pause subscription.',
        );
    }

    const onResumeSubscription = async () => {
        if (!isFeatureEnabled('ENABLE_SUBSCRIPTION_PAUSE')) {
            throw new Error('Subscription resume is not available.');
        }

        const response = await fetch('/api/razorpay/resume-subscription', {
            ...PAYMENT_ROUTE_REQUEST_OPTIONS,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId }),
        });

        if (!response.ok) {
            await readPaymentResponseJson(response, 'resume_subscription_rejected');
            throw createPaymentStatusError(
                'Failed to resume subscription.',
                'payment_subscription_resume_rejected',
                response.status,
            );
        }

        await readPaymentSubscriptionActionResponse(
            response,
            'resume_subscription_response',
            'payment_subscription_resume_response_invalid',
            'Failed to resume subscription.',
        );
    }

    const handleUpgradeSubscription = async ({ nSi, oSi }: { nSi: string, oSi: string }) => {
        const actionMetadata = {
            ...getBoundedPaymentStringContext('newSubscriptionId', nSi),
            ...getBoundedPaymentStringContext('oldSubscriptionId', oSi),
        };
        const response = await fetch('/api/razorpay/upgrade-subscription', {
            ...PAYMENT_ROUTE_REQUEST_OPTIONS,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, nSi, oSi }),
        });

        if (!response.ok) {
            await readPaymentResponseJson(response, 'upgrade_subscription_rejected', actionMetadata);
            throw createPaymentStatusError(
                'Failed to upgrade subscription.',
                'payment_subscription_upgrade_rejected',
                response.status,
            );
        }

        await readPaymentSubscriptionActionResponse(
            response,
            'upgrade_subscription_response',
            'payment_subscription_upgrade_response_invalid',
            'Failed to upgrade subscription.',
            actionMetadata,
        );
    }

    const onUpgradePlan = async (currentPlan: FirestoreSubscriptionDoc, newPlan: Plan, currency: Currency, quantity?: number) => {
        if (!isScriptLoaded) {
            throw createPaymentStatusError(
                'Razorpay checkout is not available.',
                'payment_checkout_unavailable',
            );
        }
        if (checkoutInFlightRef.current) {
            throw createPaymentStatusError(
                'A checkout is already in progress.',
                'payment_checkout_in_progress',
            );
        }
        checkoutInFlightRef.current = true;
        const targetQuantity = normalizeSubscriptionQuantity(quantity ?? currentPlan.quantity ?? 1);
        try {
            const paymentResponse = await createSubscription(
                newPlan,
                currency,
                targetQuantity,
                currentPlan.providerSubscriptionId,
            );
            await handleUpgradeSubscription({ nSi: paymentResponse.subscriptionId, oSi: currentPlan.providerSubscriptionId });
            return paymentResponse;
        } catch (error) {
            if (!isPaymentCheckoutDismissedError(error)) {
                logPaymentFailure('payment_upgrade_failed', error, buildPaymentLogContext('upgrade_plan', {
                    ...getBoundedPaymentStringContext('newPlanId', newPlan.planId),
                    ...getBoundedPaymentStringContext('oldSubscriptionId', currentPlan.providerSubscriptionId),
                    quantity: targetQuantity,
                }));
            }
            throw error;
        } finally {
            checkoutInFlightRef.current = false;
        }
    };

    const handleTopupPurchase = async (pack: AIEnhancementPack, currency: Currency): Promise<TopupCheckoutResult> => {
        const loaderLabel = "Processing Topup Payment";
        if (!isRazorpayCheckoutConfigurationReady(isScriptLoaded, process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)) {
            throw createPaymentStatusError(
                'Razorpay checkout is not available.',
                'payment_checkout_unavailable',
            );
        }
        if (checkoutInFlightRef.current) {
            throw createPaymentStatusError(
                'A checkout is already in progress.',
                'payment_checkout_in_progress',
            );
        }
        checkoutInFlightRef.current = true;

        try {
        let orderId: string;
        dispatcher(startLoader(loaderLabel));
        try {
            const response = await fetch('/api/razorpay/create-topup-order', {
                ...PAYMENT_ROUTE_REQUEST_OPTIONS,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, packId: pack.packId, currency }),
            });

            if (!response.ok) {
                await readPaymentResponseJson(response, 'topup_order_create_rejected', {
                    ...getBoundedPaymentStringContext('packId', pack.packId),
                });
                throw createPaymentStatusError(
                    'Failed to create top-up order.',
                    'payment_topup_order_create_rejected',
                    response.status,
                );
            }

            const topupOrderPayload = await readPaymentResponseJson<unknown>(response, 'topup_order_create_response', {
                ...getBoundedPaymentStringContext('packId', pack.packId),
            });
            const topupOrderResponse = parseRazorpayTopupCheckoutResponse(topupOrderPayload);
            if (!topupOrderResponse) {
                throw createPaymentStatusError(
                    'Failed to create top-up order.',
                    'payment_topup_order_create_response_invalid',
                    response.status,
                );
            }
            orderId = topupOrderResponse.order.id;
        } catch (error) {
            logPaymentFailure('payment_topup_failed', error, buildPaymentLogContext('topup_purchase', {
                ...getBoundedPaymentStringContext('packId', pack.packId),
            }));
            throw error;
        } finally {
            dispatcher(stopLoader(loaderLabel));
        }

        return await new Promise<TopupCheckoutResult>((resolve, reject) => {
            const options: RazorpayCheckoutOptions = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                order_id: orderId,
                name: topupCheckoutName,
                description: pack.name,
                handler: (response: unknown) => {
                    if (!isRazorpayPaymentResponse(response, 'topup')) {
                        reject(createPaymentStatusError(
                            'Payment response is invalid.',
                            'payment_topup_response_invalid',
                        ));
                        return;
                    }

                    dispatcher(startLoader(loaderLabel));
                    void (async () => {
                        try {
                            const verificationResponse = await fetch('/api/razorpay/verify-topup', {
                                ...PAYMENT_ROUTE_REQUEST_OPTIONS,
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    productId,
                                    razorpay_order_id: orderId,
                                    razorpay_signature: response.razorpay_signature,
                                }),
                            });

                            const result = await readPaymentVerificationResponse<PaymentTopupVerifyResponse>(
                                verificationResponse,
                                'topup_verify_response',
                                isPaymentTopupVerifyResponse,
                                'payment_topup_verify_rejected',
                                'payment_topup_verify_response_invalid',
                                'Payment verification failed.',
                                { ...getBoundedPaymentStringContext('packId', pack.packId) },
                            );
                            resolve({ ...response, ...result });
                        } catch (error) {
                            logPaymentFailure('payment_topup_verify_failed', error, buildPaymentLogContext('topup_verify', {
                                ...getBoundedPaymentStringContext('packId', pack.packId),
                            }));
                            reject(error);
                        } finally {
                            dispatcher(stopLoader(loaderLabel));
                        }
                    })();
                },
                modal: { ondismiss: () => reject(createCheckoutDismissedError()) },
                prefill: {
                    name: session?.user?.name || '',
                    email: session?.user?.email || '',
                }
            };

            try {
                new window.Razorpay(options).open();
            } catch (error) {
                logPaymentFailure('payment_topup_checkout_open_failed', error, buildPaymentLogContext('topup_checkout', {
                    ...getBoundedPaymentStringContext('packId', pack.packId),
                }));
                reject(error);
            }
        });
        } finally {
            checkoutInFlightRef.current = false;
        }
    };

    const executePostOnboarding = useCallback(async (purchaseIntent: PurchaseIntent) => {
        if (!isRazorpayCheckoutConfigurationReady(isScriptLoaded, process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)) {
            throw createPaymentStatusError(
                'Razorpay checkout is not available.',
                'payment_checkout_unavailable',
            );
        }
        if (checkoutInFlightRef.current) {
            throw createPaymentStatusError(
                'A checkout is already in progress.',
                'payment_checkout_in_progress',
            );
        }
        checkoutInFlightRef.current = true;
        try {
        return await new Promise<SubscriptionCheckoutResult>((resolve, reject) => {
            void (async () => {
            try {
                const { businessName, businessIndustry, currency, plan, timeZone, businessDayEndTime } = purchaseIntent;

                if (!session?.user) {
                    throw new Error('Unauthorized');
                }

                if (session.user.tenantId) {
                    throw new Error('User is already onboarded');
                }

                if (!businessName) {
                    throw new Error('Missing required fields: businessName');
                }

                if (!businessIndustry) {
                    throw new Error('Missing required fields: businessIndustry');
                }

                // ✅ Call SERVER-SIDE onboarding API (secure, atomic transaction)
                dispatcher(startLoader("Creating your account..."));

                const response = await fetch('/api/onboarding/create-subscription', {
                    ...PAYMENT_ROUTE_REQUEST_OPTIONS,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        businessName,
                        businessIndustry,
                        planId: plan.planId,
                        interval: plan.billingInterval,
                        currency,
                        userType: plan.type,
                        timeZone,
                        businessDayEndTime
                    })
                });

                if (!response.ok) {
                    await readPaymentResponseJson(response, 'post_onboarding_subscription_create_rejected', {
                        ...getBoundedPaymentStringContext('planId', plan.planId),
                    });
                    dispatcher(stopLoader("Creating your account..."));
                    throw createPaymentStatusError(
                        'Onboarding failed.',
                        'payment_onboarding_subscription_create_rejected',
                        response.status,
                    );
                }

                const onboardingPayload = await readPaymentResponseJson<unknown>(response, 'post_onboarding_subscription_create_response', {
                    ...getBoundedPaymentStringContext('planId', plan.planId),
                });
                const subscription = isRecord(onboardingPayload) && isRecord(onboardingPayload.subscription)
                    ? onboardingPayload.subscription
                    : null;
                const tenantId = isRecord(onboardingPayload) ? onboardingPayload.tenantId : undefined;
                const storeId = isRecord(onboardingPayload) ? onboardingPayload.storeId : undefined;
                if (!subscription || !isBoundedProviderString(subscription.id) || !isScopeIdentifier(tenantId) || !isScopeIdentifier(storeId)) {
                    throw createPaymentStatusError(
                        'Onboarding failed.',
                        'payment_onboarding_subscription_create_response_invalid',
                        response.status,
                    );
                }
                const subscriptionId = subscription.id;

                // Update NextAuth session with new IDs
                await update({
                    tenantId,
                    storeId,
                    sId: storeId,
                    tId: tenantId
                });

                dispatcher(stopLoader("Creating your account..."));

                // Open Razorpay payment modal
                const options: RazorpayCheckoutOptions = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    subscription_id: subscriptionId,
                    name: 'MenuList.ai Subscription',
                    description: plan.name,
                    handler: (response: unknown) => {
                        dispatcher(startLoader("Verifying payment..."));
                        verifySubscriptionPaymentResponse(response).then((verifiedResponse) => {
                            dispatcher(stopLoader("Verifying payment..."));
                            resolve({ ...verifiedResponse, subscriptionId });
                        })
                            .catch((error) => {
                                logPaymentFailure('payment_onboarding_subscription_verify_failed', error, buildPaymentLogContext('post_onboarding_verify', {
                                    ...getBoundedPaymentStringContext('planId', plan.planId),
                                }));
                                dispatcher(stopLoader("Verifying payment..."));
                                reject(error);
                            })
                    },
                    prefill: {
                        name: session.user.name || '',
                        email: session.user.email || '',
                    },
                    modal: { ondismiss: () => reject(createCheckoutDismissedError()) },
                };

                const paymentObject = new window.Razorpay(options);
                paymentObject.open();

            } catch (error) {
                dispatcher(stopLoader("Creating your account..."));
                logPaymentFailure('payment_post_onboarding_failed', error, buildPaymentLogContext('post_onboarding'));
                reject(error);
            }
            })().catch((error) => {
                logPaymentFailure('payment_post_onboarding_executor_failed', error, buildPaymentLogContext('post_onboarding'));
                reject(error);
            });
        });
        } finally {
            checkoutInFlightRef.current = false;
        }
    }, [buildPaymentLogContext, dispatcher, isScriptLoaded, session, update]); // Add dependencies used inside the function

    const verifySubscriptionPaymentResponse = async (paymentResponse: unknown): Promise<RazorpayPaymentResponse> => {
        if (!isRazorpayPaymentResponse(paymentResponse, 'subscription')) {
            logPaymentFailure('payment_subscription_response_invalid', undefined, buildPaymentLogContext('subscription_verify'));
            throw createPaymentStatusError(
                'Payment response is invalid.',
                'payment_subscription_response_invalid',
            );
        }

        try {
            const verificationResponse = await fetch('/api/razorpay/verify-subscription', {
                ...PAYMENT_ROUTE_REQUEST_OPTIONS,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    razorpay_payment_id: paymentResponse.razorpay_payment_id,
                    productId,
                    razorpay_subscription_id: paymentResponse.razorpay_subscription_id,
                    razorpay_signature: paymentResponse.razorpay_signature,
                }),
            });

            await readPaymentVerificationResponse<PaymentSubscriptionVerifyResponse>(
                verificationResponse,
                'subscription_verify_response',
                isPaymentSubscriptionVerifyResponse,
                'payment_subscription_verify_rejected',
                'payment_subscription_verify_response_invalid',
                'Payment verification failed.',
            );
            return paymentResponse;
        } catch (error) {
            logPaymentFailure('payment_subscription_verify_failed', error, buildPaymentLogContext('subscription_verify'));
            throw error;
        }
    }
    return { onClickPaymentCard, handleTopupPurchase, pendingPlan, executePostOnboarding, isScriptLoaded, onUpgradePlan, onCancelSubscription, onPauseSubscription, onResumeSubscription };
};

export default usePaymentHandler;
