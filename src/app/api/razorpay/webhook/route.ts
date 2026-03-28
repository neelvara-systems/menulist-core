export const dynamic = 'force-dynamic';
import { getSubscriptionById, updateSubscription } from "@database/subscriptions";
import { createPaymentTransaction } from "@database/subscriptions/paymentTransactions"; // Assumes this function exists for auditing
import { getPlanDetailsFromConstants, getSubscriptionEndDate } from "@lib/billing/billingUtils";
import { validateTransition } from "@lib/billing/subscriptionStateMachine";
import { logger } from "@lib/monitoring/logger";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { validateRazorpayWebhookSignature } from "@lib/razorpay/webhook-validator";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { Timestamp } from "firebase/firestore";
import { writeLogEntry } from "logs/utils";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const LOG_FILE = "razorpay-subscription.log";

const getInvoiceById = async (eventPayloadToUpload: any, invoiceId: string) => {
    try {
        const invoice = await razorpayClient.invoices.fetch(invoiceId);
        const invoiceUrl = invoice.short_url;
        eventPayloadToUpload.invoiceUrl = invoiceUrl;
        eventPayloadToUpload.payload.invoice = invoice;
        return eventPayloadToUpload;
    } catch (error) {
        logger.error('Failed to fetch invoice for webhook', error, {
            invoiceId: eventPayloadToUpload.payload?.invoice?.entity?.id
        });
        return eventPayloadToUpload;
    }
}

//🔹 subscription.activated
// When it fires: Triggered once when a subscription is first activated.
// What it means: Razorpay has successfully activated the subscription(usually after the user completes the first payment authorization or after mandate approval — especially important for cards, eMandates, or UPI autopay).

//🔹 subscription.charged
// When it fires: Triggered every time a subscription payment is successfully charged(including the first and all subsequent charges).
// What it means: Razorpay has successfully debited the payment for a billing cycle.


export async function POST(request: Request) {
    // 1. Security First: Validate the webhook signature before processing anything.
    // This is a critical step to ensure the request is genuinely from Razorpay.
    const signature = headers().get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !secret) {
        logger.warn('Webhook validation failed', {
            reason: 'Missing signature or secret',
            hasSignature: !!signature,
            hasSecret: !!secret
        });
        return NextResponse.json({ error: 'Invalid request: Missing signature or secret.' }, { status: 400 });
    }

    const requestBody = await request.text();
    const isSignatureValid = await validateRazorpayWebhookSignature(requestBody, signature, secret);

    if (!isSignatureValid) {
        logger.warn('Webhook signature validation failed', {
            reason: 'Invalid signature'
        });
        return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
    }

    // 2. Process the validated event
    const event = JSON.parse(requestBody);
    logger.info('Webhook event received', {
        eventType: event.event,
        eventId: event.payload?.payment?.entity?.id || event.payload?.subscription?.entity?.id
    });

    try {
        let eventPayloadToUpload = event;
        const paymentEntity = event.payload?.payment?.entity;
        if (event.payload?.order) {
            const orderEntity = event.payload?.order?.entity;
            //if its topup credit purchase transaction event
            if (Boolean(orderEntity?.notes) && !Array.isArray(orderEntity?.notes) && orderEntity?.notes?.packId) {
                //if its topup credit purchase order.paid event
                eventPayloadToUpload.storeId = Number(orderEntity?.notes?.storeId);
                eventPayloadToUpload.tenantId = Number(orderEntity?.notes?.tenantId);
            }
            eventPayloadToUpload.transactionType = 'topup';
        } else if (event.payload?.subscription) {
            //if its subscription transaction event event
            const subscriptionEntity = event.payload?.subscription?.entity;
            eventPayloadToUpload.storeId = Number(subscriptionEntity?.notes?.storeId);
            eventPayloadToUpload.tenantId = Number(subscriptionEntity?.notes?.tenantId);
            eventPayloadToUpload.transactionType = 'subscription';
        }
        //fetch invoice data from razorpay
        if ((event.event === 'order.paid' || event.event === 'subscription.charged') && paymentEntity) {
            eventPayloadToUpload = await getInvoiceById(eventPayloadToUpload, paymentEntity?.invoice_id);
        }
        // await writeLogEntry({ logFileName: LOG_FILE, logType: `RAZORPAY_WEBHOOK_EVENT_${event.event}`, data: eventPayloadToUpload });
        await createPaymentTransaction(eventPayloadToUpload);
        if (!eventPayloadToUpload.transactionType) return NextResponse.json({ received: true });

        switch (event.event) {
            case 'order.paid': {
                await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_WEBHOOK_ORDER.PAID', data: eventPayloadToUpload });
                break;
            }

            case 'payment.failed':
            case 'subscription.halted':
            case 'subscription.pending': {
                await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_WEBHOOK_PAYMENT_FAILED', data: eventPayloadToUpload });

                // 🔔 ALERT: Payment failure — founder needs to know immediately
                try {
                    const { createAlert } = await import('@lib/ops/alerts');
                    await createAlert({
                        severity: event.event === 'subscription.halted' ? 'critical' : 'warning',
                        title: `Payment ${event.event === 'subscription.halted' ? 'HALTED' : 'Failed'}: Store ${eventPayloadToUpload.storeId}`,
                        message: `Event: ${event.event}\nStore: ${eventPayloadToUpload.storeId}\nTenant: ${eventPayloadToUpload.tenantId}\nError: ${paymentEntity?.error_description || paymentEntity?.error_reason || 'Unknown'}`,
                        sId: eventPayloadToUpload.storeId ? String(eventPayloadToUpload.storeId) : undefined,
                        tId: eventPayloadToUpload.tenantId ? String(eventPayloadToUpload.tenantId) : undefined,
                    });
                } catch { /* non-blocking */ }

                // 📧 LIFECYCLE MESSAGE: Notify store owner about payment failure
                try {
                    const { sendLifecycleMessage } = await import('@lib/messaging');
                    const subForMsg = paymentEntity?.subscription_id
                        ? await getSubscriptionById(paymentEntity.subscription_id)
                        : (event.payload?.subscription?.entity?.id ? await getSubscriptionById(event.payload.subscription.entity.id) : null);
                    if (subForMsg?.email) {
                        sendLifecycleMessage({
                            storeId: String(subForMsg.storeId),
                            tenantId: String(subForMsg.tenantId),
                            eventType: event.event === 'subscription.pending' ? 'GRACE_PERIOD_STARTED' : 'PAYMENT_FAILED',
                            referenceId: `${event.event}-${paymentEntity?.id || event.payload?.subscription?.entity?.id || Date.now()}`,
                            recipientEmail: subForMsg.email,
                            storeName: subForMsg.name || '',
                            metadata: {
                                amount: paymentEntity?.amount ? (paymentEntity.amount / 100) : subForMsg.amount || 0,
                                currency: paymentEntity?.currency?.toUpperCase() || subForMsg.currency || 'INR',
                            },
                        }).catch(() => { /* non-blocking */ });
                    }
                } catch { /* non-blocking */ }

                if (paymentEntity?.subscription_id) {
                    const internalSub = await getSubscriptionById(paymentEntity.subscription_id);
                    if (internalSub) {
                        validateTransition(internalSub.status, 'past_due', `webhook:${event.event}`);
                        const pastDueSince = internalSub.pastDueSinceAt || Timestamp.now();
                        await updateSubscription(internalSub.id, {
                            status: 'past_due',
                            pastDueSinceAt: pastDueSince,
                            lastWebhook: { event: event.event, timestamp: Timestamp.now() },
                            statuses: [
                                ...internalSub.statuses,
                                {
                                    status: event.event === 'subscription.pending' ? 'pending_retry' : 'payment.failed',
                                    timestamp: Timestamp.now(),
                                    amount: paymentEntity.amount,
                                    currency: paymentEntity.currency,
                                    remark: paymentEntity.error_description || paymentEntity.error_reason || `Subscription ${event.event}`,
                                },
                            ],
                        });
                    }
                } else if (event.event === 'subscription.pending' || event.event === 'subscription.halted') {
                    const subscriptionEntity = event.payload?.subscription?.entity;
                    if (subscriptionEntity?.id) {
                        const internalSub = await getSubscriptionById(subscriptionEntity.id);
                        if (internalSub) {
                            validateTransition(internalSub.status, 'past_due', `webhook:${event.event}`);
                            const pastDueSince = internalSub.pastDueSinceAt || Timestamp.now();
                            await updateSubscription(internalSub.id, {
                                status: 'past_due',
                                pastDueSinceAt: pastDueSince,
                                lastWebhook: { event: event.event, timestamp: Timestamp.now() },
                                statuses: [
                                    ...internalSub.statuses,
                                    {
                                        status: event.event === 'subscription.pending' ? 'pending_retry' : 'halted',
                                        timestamp: Timestamp.now(),
                                        amount: internalSub.amount,
                                        currency: internalSub.currency,
                                        remark: `Subscription ${event.event} — payment retry in progress`,
                                    },
                                ],
                            });
                        }
                    }
                }
                break;
            }
            case 'subscription.activated':
            case 'subscription.charged': {
                const subscriptionEntity = event.payload?.subscription?.entity;
                await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_ACTIVATED', data: eventPayloadToUpload });
                const internalSub = await getSubscriptionById(subscriptionEntity.id);
                const planDetails = getPlanDetailsFromConstants(subscriptionEntity.notes);

                if (internalSub && planDetails) {
                    validateTransition(internalSub.status, 'active', `webhook:${event.event}`);
                    const paymentMethod = {
                        type: paymentEntity.method,
                        brand: paymentEntity.card?.network || "",
                        last4: paymentEntity.card?.last4 || "",
                        upiId: paymentEntity.vpa || "",
                        upiTransactionId: paymentEntity?.acquirer_data?.upi_transaction_id || "",
                    };

                    // Compute billing-period key from Razorpay's new cycle start (anchor day)
                    const newCycleStart = new Date(subscriptionEntity.current_start * 1000);
                    const rawAnchorDay = newCycleStart.getDate();
                    const now = new Date();
                    let bpYear = now.getFullYear();
                    let bpMonth = now.getMonth() + 1;
                    const daysInMonth = new Date(bpYear, now.getMonth() + 1, 0).getDate();
                    const anchorDay = Math.min(rawAnchorDay, daysInMonth);
                    if (now.getDate() < anchorDay) { bpMonth -= 1; if (bpMonth === 0) { bpMonth = 12; bpYear -= 1; } }
                    const currentBillingPeriod = bpYear * 100 + bpMonth;

                    // Idempotency guard: prevent duplicate payment IDs in billingHistory
                    const updatedBillingHistory = internalSub.billingHistory.includes(paymentEntity.id)
                        ? internalSub.billingHistory
                        : [...internalSub.billingHistory, paymentEntity.id];

                    const updatePayload: Partial<FirestoreSubscriptionDoc> = {
                        status: 'active',
                        cycleStartDate: Timestamp.fromMillis(subscriptionEntity.current_start * 1000),
                        cycleEndDate: Timestamp.fromMillis(subscriptionEntity.current_end * 1000),
                        renewsOn: Timestamp.fromMillis(subscriptionEntity.charge_at * 1000),
                        subscriptionStartDate: Timestamp.fromMillis(subscriptionEntity.start_at * 1000),
                        subscriptionEndDate: getSubscriptionEndDate(subscriptionEntity),
                        pastDueSinceAt: null,
                        totalPaymentsNeededCount: subscriptionEntity.total_count,
                        totalPaymentsMadeCount: subscriptionEntity.paid_count,
                        monthlyCredits: internalSub.monthlyCreditsAllowance,
                        creditsLastResetMonth: currentBillingPeriod,
                        paymentMethod,
                        lastWebhook: { event: event.event, timestamp: Timestamp.now() },
                        billingHistory: updatedBillingHistory,
                        statuses: [
                            ...internalSub.statuses,
                            {
                                status: event.event === 'subscription.activated' ? "activated" : "charged",
                                timestamp: Timestamp.now(),
                                amount: paymentEntity.amount,
                                currency: paymentEntity.currency,
                                remark: event.event === 'subscription.activated' ? "Subscription activated" : "Subscription charged",
                            },
                        ],
                    };
                    await updateSubscription(internalSub.id, updatePayload);

                    // 📧 LIFECYCLE MESSAGE: Payment success confirmation to store owner
                    try {
                        const { sendLifecycleMessage } = await import('@lib/messaging');
                        const nextBilling = subscriptionEntity.charge_at
                            ? new Date(subscriptionEntity.charge_at * 1000).toLocaleDateString()
                            : 'See dashboard';
                        sendLifecycleMessage({
                            storeId: String(internalSub.storeId),
                            tenantId: String(internalSub.tenantId),
                            eventType: 'PAYMENT_SUCCESS',
                            referenceId: `payment-${paymentEntity.id}`,
                            recipientEmail: internalSub.email,
                            storeName: internalSub.name || '',
                            metadata: {
                                amount: paymentEntity.amount ? (paymentEntity.amount / 100) : 0,
                                currency: paymentEntity.currency?.toUpperCase() || 'INR',
                                planName: internalSub.planName || 'Subscription',
                                nextBillingDate: nextBilling,
                            },
                        }).catch(() => { /* non-blocking */ });
                    } catch { /* non-blocking */ }

                    // 📧 INTERNAL: Notify founder about renewal revenue
                    try {
                        const { sendInternalNotification } = await import('@lib/messaging');
                        sendInternalNotification({
                            eventType: event.event === 'subscription.activated' ? 'INTERNAL_SUBSCRIPTION_PURCHASED' : 'INTERNAL_SUBSCRIPTION_RENEWED',
                            storeId: String(internalSub.storeId),
                            tenantId: String(internalSub.tenantId),
                            metadata: {
                                storeName: internalSub.name || '',
                                planName: internalSub.planName || '',
                                amount: paymentEntity.amount ? (paymentEntity.amount / 100) : 0,
                                currency: paymentEntity.currency?.toUpperCase() || 'INR',
                                nextBillingDate: subscriptionEntity.charge_at
                                    ? new Date(subscriptionEntity.charge_at * 1000).toLocaleDateString()
                                    : 'N/A',
                                storeId: String(internalSub.storeId),
                                tenantId: String(internalSub.tenantId),
                            },
                        }).catch(() => { /* non-blocking */ });
                    } catch { /* non-blocking */ }
                }
                break;
            }

            case 'subscription.completed': {
                const subscriptionEntity = event.payload?.subscription?.entity;
                await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_COMPLETED', data: eventPayloadToUpload });
                const internalSub = await getSubscriptionById(subscriptionEntity.id);
                if (internalSub) {
                    validateTransition(internalSub.status, 'completed', 'webhook:subscription.completed');
                    await updateSubscription(internalSub.id, {
                        status: 'completed',
                        lastWebhook: { event: event.event, timestamp: Timestamp.now() },
                        statuses: [
                            ...internalSub.statuses,
                            {
                                status: "completed",
                                timestamp: Timestamp.now(),
                                amount: subscriptionEntity.amount,
                                currency: subscriptionEntity.currency,
                                remark: "Subscription completed",
                            },
                        ],
                        subscriptionEndDate: subscriptionEntity.ended_at ? Timestamp.fromMillis(subscriptionEntity.ended_at * 1000) : Timestamp.now(),
                    });
                }
                break;
            }

            case 'subscription.cancelled': {
                //Database handling for this event is already done in src/app/api/razorpay/cancel-subscription/route.ts
                await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_CANCELLED', data: eventPayloadToUpload });
                // Update lastWebhook for audit trail even though cancel-subscription route handles the DB update
                const cancelledSubEntity = event.payload?.subscription?.entity;
                if (cancelledSubEntity?.id) {
                    const cancelledInternalSub = await getSubscriptionById(cancelledSubEntity.id);
                    if (cancelledInternalSub) {
                        await updateSubscription(cancelledInternalSub.id, {
                            lastWebhook: { event: event.event, timestamp: Timestamp.now() },
                        });
                    }
                }
                break;
            }

            case 'subscription.paused': {
                const pausedSubEntity = event.payload?.subscription?.entity;
                await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_PAUSED', data: eventPayloadToUpload });
                if (!pausedSubEntity?.id) break;
                const pausedInternalSub = await getSubscriptionById(pausedSubEntity.id);
                if (pausedInternalSub) {
                    validateTransition(pausedInternalSub.status, 'paused', 'webhook:subscription.paused');
                    await updateSubscription(pausedInternalSub.id, {
                        status: 'paused',
                        lastWebhook: { event: event.event, timestamp: Timestamp.now() },
                        statuses: [
                            ...pausedInternalSub.statuses,
                            {
                                status: "paused",
                                timestamp: Timestamp.now(),
                                amount: pausedInternalSub.amount,
                                currency: pausedInternalSub.currency,
                                remark: `Subscription paused by ${pausedSubEntity.pause_initiated_by || 'system'}`,
                            },
                        ],
                    });
                }
                break;
            }

            // BT7: Sync quantity from Razorpay on subscription.updated (Feature #4C-B)
            case 'subscription.updated': {
                const updatedSubEntity = event.payload?.subscription?.entity;
                await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_UPDATED', data: eventPayloadToUpload });
                if (!updatedSubEntity?.id) break;
                const updatedInternalSub = await getSubscriptionById(updatedSubEntity.id);
                if (updatedInternalSub && updatedSubEntity.quantity !== undefined) {
                    await updateSubscription(updatedInternalSub.id, {
                        quantity: updatedSubEntity.quantity,
                        lastWebhook: { event: event.event, timestamp: Timestamp.now() },
                    });
                }
                break;
            }

            case 'subscription.resumed': {
                const resumedSubEntity = event.payload?.subscription?.entity;
                await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_RESUMED', data: eventPayloadToUpload });
                if (!resumedSubEntity?.id) break;
                const resumedInternalSub = await getSubscriptionById(resumedSubEntity.id);
                if (resumedInternalSub) {
                    validateTransition(resumedInternalSub.status, 'active', 'webhook:subscription.resumed');
                    await updateSubscription(resumedInternalSub.id, {
                        status: 'active',
                        lastWebhook: { event: event.event, timestamp: Timestamp.now() },
                        statuses: [
                            ...resumedInternalSub.statuses,
                            {
                                status: "resumed",
                                timestamp: Timestamp.now(),
                                amount: resumedInternalSub.amount,
                                currency: resumedInternalSub.currency,
                                remark: `Subscription resumed by ${resumedSubEntity.resume_initiated_by || 'system'}`,
                            },
                        ],
                    });
                }
                break;
            }

            default:
                logger.debug('Unhandled webhook event type', {
                    eventType: event.event,
                    payload: event.payload
                });
                await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_WEBHOOK_UNHANDLED_EVENT', data: eventPayloadToUpload });
                break;
        }

        // 3. Acknowledge receipt to Razorpay to prevent retries.
        return NextResponse.json({ status: 'ok' });

    } catch (error) {
        logger.error('Webhook processing failed', error, {
            eventType: event?.event,
            api: 'razorpay-webhook'
        });

        // 🚨 CRITICAL ALERT: Webhook processing failure = potential payment state inconsistency
        try {
            const { createAlert } = await import('@lib/ops/alerts');
            await createAlert({
                severity: 'critical',
                title: `Razorpay Webhook FAILED: ${event?.event || 'unknown'}`,
                message: `Webhook processing crashed. Payment state may be inconsistent.\nEvent: ${event?.event}\nStore: ${event?.storeId || 'unknown'}\nError: ${error instanceof Error ? error.message : 'Unknown'}`,
                sId: event?.storeId ? String(event.storeId) : undefined,
                tId: event?.tenantId ? String(event.tenantId) : undefined,
            });
        } catch { /* non-blocking */ }

        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: 'Webhook processing failed.', details: errorMessage }, { status: 500 });
    }
}