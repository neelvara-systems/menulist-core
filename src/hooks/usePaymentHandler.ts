import { AIEnhancementPack, Currency, Plan, PurchaseIntent } from '@data/common';
import { PRODUCT_IDS, type ProductId } from '@constant/product';
import { isFeatureEnabled } from '@config/features';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { useSession } from 'next-auth/react';
import { useCallback, useState } from 'react';
import { getBoundedPaymentStringContext, getPaymentFlowLogContext, logPaymentFailure } from './paymentDiagnostics';
import useRazorpayScript from './useRazorpayScript';

declare global {
    interface Window {
        Razorpay: any;
    }
}

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

const createPaymentStatusError = (message: string, code: string, status?: number) => {
    const error = new Error(message) as Error & { code?: string; status?: number };
    error.code = code;
    if (typeof status === 'number') {
        error.status = status;
    }
    return error;
};

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

const usePaymentHandler = (dispatcher: any, options: PaymentHandlerOptions = {}) => {
    const [pendingPlan, setPendingPlan] = useState<{ plan: Plan; currency: Currency } | null>(null);
    const { data: session, update } = useSession();
    const isScriptLoaded = useRazorpayScript();
    const productId = options.productId || PRODUCT_IDS.MENULIST;
    const productName = options.productName || 'MenuList.ai';
    const subscriptionCheckoutName = options.subscriptionCheckoutName || `${productName} Subscription`;
    const topupCheckoutName = options.topupCheckoutName || `${productName} Credit Pack`;
    const hasBillingScope = Boolean(productId === PRODUCT_IDS.ANSWERLATTICE
        ? ((session?.user as any)?.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.tenantId || session?.user?.productId === PRODUCT_IDS.ANSWERLATTICE)
        : (session?.user?.tenantId && session?.user?.storeId));
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

    const createSubscription = async (plan: Plan, currency: Currency, user: any, quantity: number = 1) => {
        return new Promise<void>(async (resolve, reject) => {
            const subscriptionQuantity = Math.max(1, Number(quantity || 1));
            try {
                dispatcher(startLoader("Creating Subscription"));
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
                        quantity: subscriptionQuantity
                        // ✅ Backend gets tenantId/storeId from session (secure)
                    })
                });

                if (!subResponse.ok) {
                    await readPaymentResponseJson(subResponse, 'create_subscription_rejected', {
                        ...getBoundedPaymentStringContext('planId', plan.planId),
                        quantity: subscriptionQuantity,
                    });
                    dispatcher(stopLoader("Creating Subscription"));
                    throw createPaymentStatusError(
                        'Failed to create subscription.',
                        'payment_subscription_create_rejected',
                        subResponse.status,
                    );
                }
                const subscriptionPayload = await readPaymentResponseJson<{ subscription?: { id?: string } }>(subResponse, 'create_subscription_response', {
                    ...getBoundedPaymentStringContext('planId', plan.planId),
                    quantity: subscriptionQuantity,
                });
                const subscription = subscriptionPayload?.subscription;
                if (!subscription?.id) {
                    throw createPaymentStatusError(
                        'Failed to create subscription.',
                        'payment_subscription_create_response_invalid',
                        subResponse.status,
                    );
                }
                const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    subscription_id: subscription.id,
                    name: subscriptionCheckoutName,
                    description: subscriptionQuantity > 1
                        ? `${plan.name} for ${subscriptionQuantity} locations`
                        : plan.name,
                    handler: function (response: any) {
                        dispatcher(startLoader("Creating Subscription"));
                        verifySubscriptionPaymentResponse(response).then(() => {
                            dispatcher(stopLoader("Creating Subscription"));
                            resolve({ ...response, subscriptionId: subscription.id });
                        })
                            .catch((error) => {
                                logPaymentFailure('payment_subscription_verify_failed', error, buildPaymentLogContext('create_subscription_handler', {
                                    ...getBoundedPaymentStringContext('planId', plan.planId),
                                    quantity: subscriptionQuantity,
                                }));
                                dispatcher(stopLoader("Creating Subscription"));
                                reject(error);
                            })
                    },
                    prefill: {
                        name: session?.user?.name || '',
                        email: session?.user?.email || '',
                    },
                };
                dispatcher(stopLoader("Creating Subscription"));
                const paymentObject = new window.Razorpay(options);
                paymentObject.open();
            } catch (error) {
                dispatcher(stopLoader("Creating Subscription"));
                logPaymentFailure('payment_subscription_create_failed', error, buildPaymentLogContext('create_subscription', {
                    ...getBoundedPaymentStringContext('planId', plan.planId),
                    quantity: subscriptionQuantity,
                }));
                reject(error);
            }
        })
    }

    const onClickPaymentCard = async (plan: Plan, currency: Currency, onAuthRequired: () => void, quantity: number = 1) => {
        if (!session || !session.user || !session.user.id || !hasBillingScope) {
            setPendingPlan({ plan, currency });
            onAuthRequired();
            return;
        }
        if (!isScriptLoaded) {
            return;
        }
        return new Promise<void>(async (resolve, reject) => {
            try {
                const paymentResponse = await createSubscription(plan, currency, session?.user, quantity);
                resolve(paymentResponse);
            } catch (error) {
                logPaymentFailure('payment_card_click_failed', error, buildPaymentLogContext('payment_card_click', {
                    ...getBoundedPaymentStringContext('planId', plan.planId),
                    quantity: Math.max(1, Number(quantity || 1)),
                }));
                reject(error);
            }
        })
    };

    const onCancelSubscription = async ({ reason, otherReason, consent }: { reason: string, otherReason: string, consent: boolean }) => {
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
            return;
        }
        const targetQuantity = Math.max(1, Number(quantity || currentPlan.quantity || 1));
        return new Promise<any>(async (resolve, reject) => {
            try {
                const paymentResponse: any = await createSubscription(newPlan, currency, session?.user, targetQuantity);
                await handleUpgradeSubscription({ nSi: paymentResponse.subscriptionId, oSi: currentPlan.providerSubscriptionId });
                resolve(paymentResponse);
            } catch (error) {
                logPaymentFailure('payment_upgrade_failed', error, buildPaymentLogContext('upgrade_plan', {
                    ...getBoundedPaymentStringContext('newPlanId', newPlan.planId),
                    ...getBoundedPaymentStringContext('oldSubscriptionId', currentPlan.providerSubscriptionId),
                    quantity: targetQuantity,
                }));
                reject(error);
            }
        })
    };

    const handleTopupPurchase = async (pack: AIEnhancementPack, currency: Currency) => {
        return new Promise<any>(async (resolve, reject) => {
            const loaderLabel = "Processing Topup Payment";
            if (!isScriptLoaded) {
                reject(new Error('Razorpay checkout is not available.'));
                return;
            }
            try {
                dispatcher(startLoader(loaderLabel));
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
                    dispatcher(stopLoader(loaderLabel));
                    throw createPaymentStatusError(
                        'Failed to create top-up order.',
                        'payment_topup_order_create_rejected',
                        response.status,
                    );
                }

                const topupOrderPayload = await readPaymentResponseJson<{ order?: { id?: string } }>(response, 'topup_order_create_response', {
                    ...getBoundedPaymentStringContext('packId', pack.packId),
                });
                const order = topupOrderPayload?.order;
                if (!order?.id) {
                    throw createPaymentStatusError(
                        'Failed to create top-up order.',
                        'payment_topup_order_create_response_invalid',
                        response.status,
                    );
                }
                const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    order_id: order.id,
                    name: topupCheckoutName,
                    description: pack.name,
                    handler: async function (response: any) {
                        //this loader starts just after payment success
                        dispatcher(startLoader(loaderLabel));
                        try {
                            const verificationResponse = await fetch('/api/razorpay/verify-topup', {
                                ...PAYMENT_ROUTE_REQUEST_OPTIONS,
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    productId,
                                    razorpay_order_id: order.id,
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
                                {
                                    ...getBoundedPaymentStringContext('packId', pack.packId),
                                },
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
                    },
                    prefill: {
                        name: session?.user?.name || '',
                        email: session?.user?.email || '',
                    }
                };
                dispatcher(stopLoader(loaderLabel));//this loader stops just before opening the payment modal
                const paymentObject = new window.Razorpay(options);
                paymentObject.open();
            } catch (error) {
                logPaymentFailure('payment_topup_failed', error, buildPaymentLogContext('topup_purchase', {
                    ...getBoundedPaymentStringContext('packId', pack.packId),
                }));
                dispatcher(stopLoader(loaderLabel));
                reject(error);
            }
        })
    };

    const executePostOnboarding = useCallback(async (purchaseIntent: PurchaseIntent) => {
        return new Promise<void>(async (resolve, reject) => {
            const purchaseIntentString = localStorage.getItem('purchaseIntent');

            if (!purchaseIntentString) {
                logPaymentFailure('payment_onboarding_missing_purchase_intent', undefined, buildPaymentLogContext('post_onboarding'));
                reject(new Error('Purchase intent is missing.'));
                return;
            }

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

                const onboardingPayload = await readPaymentResponseJson<{
                    subscription?: { id?: string };
                    tenantId?: string;
                    storeId?: string;
                }>(response, 'post_onboarding_subscription_create_response', {
                    ...getBoundedPaymentStringContext('planId', plan.planId),
                });
                const { subscription, tenantId, storeId } = onboardingPayload || {};
                if (!subscription?.id || !tenantId || !storeId) {
                    throw createPaymentStatusError(
                        'Onboarding failed.',
                        'payment_onboarding_subscription_create_response_invalid',
                        response.status,
                    );
                }

                // Update NextAuth session with new IDs
                await update({
                    tenantId,
                    storeId,
                    sId: storeId,
                    tId: tenantId
                });

                dispatcher(stopLoader("Creating your account..."));

                // Open Razorpay payment modal
                const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    subscription_id: subscription.id,
                    name: 'MenuList.ai Subscription',
                    description: plan.name,
                    handler: function (response: any) {
                        dispatcher(startLoader("Verifying payment..."));
                        verifySubscriptionPaymentResponse(response).then(() => {
                            dispatcher(stopLoader("Verifying payment..."));
                            resolve({ ...response, subscriptionId: subscription.id });
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
                };

                const paymentObject = new window.Razorpay(options);
                paymentObject.open();

            } catch (error) {
                dispatcher(stopLoader("Creating your account..."));
                logPaymentFailure('payment_post_onboarding_failed', error, buildPaymentLogContext('post_onboarding'));
                reject(error);
            }
        })
    }, [buildPaymentLogContext, dispatcher, session, update]); // Add dependencies used inside the function

    const verifySubscriptionPaymentResponse = async (paymentResponse: any) => {
        return new Promise<void>(async (resolve, reject) => {
            if (Boolean(paymentResponse)) {
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
                    resolve(paymentResponse);
                } catch (error) {
                    logPaymentFailure('payment_subscription_verify_failed', error, buildPaymentLogContext('subscription_verify'));
                    reject(error);
                }
            } else {
                logPaymentFailure('payment_subscription_response_missing', undefined, buildPaymentLogContext('subscription_verify'));
                reject(createPaymentStatusError(
                    'Payment response is missing.',
                    'payment_subscription_response_missing',
                ));
            }
        })
    }
    return { onClickPaymentCard, handleTopupPurchase, pendingPlan, executePostOnboarding, isScriptLoaded, onUpgradePlan, onCancelSubscription, onPauseSubscription, onResumeSubscription };
};

export default usePaymentHandler;
