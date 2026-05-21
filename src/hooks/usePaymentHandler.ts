import { AIEnhancementPack, Currency, Plan, PurchaseIntent } from '@data/common';
import { isFeatureEnabled } from '@config/features';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { calculateRemainingCredits } from '@util/razorpay';
import { useSession } from 'next-auth/react';
import { useCallback, useState } from 'react';
import useRazorpayScript from './useRazorpayScript';

declare global {
    interface Window {
        Razorpay: any;
    }
}

const usePaymentHandler = (dispatcher: any) => {
    const [pendingPlan, setPendingPlan] = useState<{ plan: Plan; currency: Currency } | null>(null);
    const { data: session, update } = useSession();
    const isScriptLoaded = useRazorpayScript();

    const createSubscription = async (plan: Plan, currency: Currency, user: any, remainingCredits: number = 0, quantity: number = 1) => {
        return new Promise<void>(async (resolve, reject) => {
            try {
                const subscriptionQuantity = Math.max(1, Number(quantity || 1));
                dispatcher(startLoader("Creating Subscription"));
                const subResponse = await fetch('/api/razorpay/create-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        planId: plan.planId,
                        interval: plan.billingInterval,
                        currency,
                        userType: plan.type,
                        rc: remainingCredits,
                        quantity: subscriptionQuantity
                        // ✅ Backend gets tenantId/storeId from session (secure)
                    })
                });

                if (!subResponse.ok) {
                    const errorData = await subResponse.json();
                    dispatcher(stopLoader("Creating Subscription"));
                    throw new Error(errorData.error || 'Failed to create subscription.');
                }
                const { subscription } = await subResponse.json();
                const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    subscription_id: subscription.id,
                    name: 'MenuList.ai Subscription',
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
                                console.error('Payment flow failed in createSubscription', error);
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
                console.error('Payment flow failed in createSubscription', error);
                reject(error);
            }
        })
    }

    const onClickPaymentCard = async (plan: Plan, currency: Currency, onAuthRequired: () => void, quantity: number = 1) => {
        if (!session || !session.user || !session.user.tenantId || !session.user.storeId || !session.user.id) {
            setPendingPlan({ plan, currency });
            onAuthRequired();
            return;
        }
        if (!isScriptLoaded) {
            console.log('Razorpay script not loaded or a payment is already in progress.');
            return;
        }
        return new Promise<void>(async (resolve, reject) => {
            try {
                const paymentResponse = await createSubscription(plan, currency, session?.user, 0, quantity);
                resolve(paymentResponse);
            } catch (error) {
                console.error('Payment flow failed in onClickPaymentCard', error);
                reject(error);
            }
        })
    };

    const onCancelSubscription = ({ reason, otherReason, consent }: { reason: string, otherReason: string, consent: boolean }) => {
        return new Promise<void>(async (resolve, reject) => {
            const response = await fetch('/api/razorpay/cancel-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason, otherReason, consent }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                reject(new Error(errorData.error || errorData.message || 'Failed to cancel subscription.'));
                return;
            }
            resolve();
        })
    }

    const onPauseSubscription = ({ reason }: { reason?: string } = {}) => {
        return new Promise<void>(async (resolve, reject) => {
            if (!isFeatureEnabled('ENABLE_SUBSCRIPTION_PAUSE')) {
                reject(new Error('Subscription pause is not available.'));
                return;
            }
            try {
                const response = await fetch('/api/razorpay/pause-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    reject(new Error(errorData.error || 'Failed to pause subscription.'));
                    return;
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        })
    }

    const onResumeSubscription = () => {
        return new Promise<void>(async (resolve, reject) => {
            if (!isFeatureEnabled('ENABLE_SUBSCRIPTION_PAUSE')) {
                reject(new Error('Subscription resume is not available.'));
                return;
            }
            try {
                const response = await fetch('/api/razorpay/resume-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    reject(new Error(errorData.error || 'Failed to resume subscription.'));
                    return;
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        })
    }

    const handleUpgradeSubscription = ({ rc, nSi, oSi }: { rc: number, nSi: string, oSi: string }) => {
        return new Promise<void>(async (resolve, reject) => {
            const response = await fetch('/api/razorpay/upgrade-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rc, nSi, oSi }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                reject(new Error(errorData.error || errorData.message || 'Failed to upgrade subscription.'));
                return;
            }
            resolve();
        })
    }

    const onUpgradePlan = async (currentPlan: FirestoreSubscriptionDoc, newPlan: Plan, currency: Currency, quantity?: number) => {
        if (!isScriptLoaded) {
            console.log('Razorpay script not loaded or a payment is already in progress.');
            return;
        }
        let { totalRemainingCredits } = calculateRemainingCredits(currentPlan);
        const targetQuantity = Math.max(1, Number(quantity || currentPlan.quantity || 1));
        return new Promise<any>(async (resolve, reject) => {
            try {
                const paymentResponse: any = await createSubscription(newPlan, currency, session?.user, totalRemainingCredits, targetQuantity);
                await handleUpgradeSubscription({ rc: totalRemainingCredits, nSi: paymentResponse.subscriptionId, oSi: currentPlan.providerSubscriptionId });
                resolve(paymentResponse);
            } catch (error) {
                console.error('Upgrade Payment flow failed in onUpgradePlan', error);
                reject(error);
            }
        })
    };

    const handleTopupPurchase = async (pack: AIEnhancementPack, currency: Currency) => {
        return new Promise<any>(async (resolve, reject) => {
            const loaderLabel = "Processing Topup Payment";
            if (!isScriptLoaded) {
                console.log('Razorpay script not loaded or a payment is already in progress.');
                reject('Razorpay script not loaded or a payment is already in progress.');
                return;
            }
            try {
                dispatcher(startLoader(loaderLabel));
                const response = await fetch('/api/razorpay/create-topup-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ packId: pack.packId, currency }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    dispatcher(stopLoader(loaderLabel));
                    throw new Error(errorData.error || 'Failed to create top-up order.');
                }

                const { order } = await response.json();
                const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    order_id: order.id,
                    name: 'MenuList.ai AI Enhancement Pack',
                    description: pack.name,
                    handler: async function (response: any) {
                        //this loader starts just after payment success
                        dispatcher(startLoader(loaderLabel));
                        try {
                            const verificationResponse = await fetch('/api/razorpay/verify-topup', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_order_id: order.id,
                                    razorpay_signature: response.razorpay_signature,
                                }),
                            });

                            const result = await verificationResponse.json();
                            if (result.success) {
                                resolve({ ...response, ...result });
                            } else {
                                console.error("Verification failed:", result.error);
                                reject(result.error);
                            }
                        } catch (error) {
                            console.error("Verification failed:", error);
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
                console.error('Payment failed:', error);
                dispatcher(stopLoader(loaderLabel));
                reject(error);
            }
        })
    };

    const executePostOnboarding = useCallback(async (purchaseIntent: PurchaseIntent) => {
        return new Promise<void>(async (resolve, reject) => {
            const purchaseIntentString = localStorage.getItem('purchaseIntent');

            if (!purchaseIntentString) {
                console.error('No purchase intent found in local storage.');
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
                    const errorData = await response.json();
                    dispatcher(stopLoader("Creating your account..."));
                    throw new Error(errorData.error || 'Onboarding failed');
                }

                const { subscription, tenantId, storeId } = await response.json();

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
                                console.error('Payment verification failed', error);
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
                console.error('Post-onboarding process failed:', error);
                reject(error);
            }
        })
    }, [session, update, isScriptLoaded]); // Add dependencies used inside the function

    const verifySubscriptionPaymentResponse = async (paymentResponse: any) => {
        return new Promise<void>(async (resolve, reject) => {
            if (Boolean(paymentResponse)) {
                try {
                    const verificationResponse = await fetch('/api/razorpay/verify-subscription', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_payment_id: paymentResponse.razorpay_payment_id,
                            razorpay_subscription_id: paymentResponse.razorpay_subscription_id,
                        }),
                    });

                    const result = await verificationResponse.json();
                    console.log("verificationResponse", result)
                    if (result.success) {
                        resolve(paymentResponse);
                    } else {
                        console.error("Verification failed:", result.error);
                        reject(result.error);
                    }
                } catch (error) {
                    console.error("Verification failed:", error);
                    reject(error);
                }
            } else {
                reject("Payment response is missing");
            }
        })
    }
    return { onClickPaymentCard, handleTopupPurchase, pendingPlan, executePostOnboarding, isScriptLoaded, onUpgradePlan, onCancelSubscription, onPauseSubscription, onResumeSubscription };
};

export default usePaymentHandler;
