export const dynamic = 'force-dynamic';
import { DB_COLLECTIONS } from "@constant/database";
import { getPlanDetailsFromConstants, getSubscriptionEndDate } from "@lib/billing/billingUtils";
import {
    getProductSubscriptionById,
    safeSyncProductSubscriptionEntitlementFromSubscription,
    updateProductSubscription,
    writeProductPaymentTransactionAudit,
} from "@lib/billing/productBillingServer";
import { isAnswerlatticeBillingProduct, normalizeBillingProductId } from "@lib/billing/productBillingPlans";
import { validateTransition } from "@lib/billing/subscriptionStateMachine";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { validateRazorpayWebhookSignature } from "@lib/razorpay/webhook-validator";
import { markResellerTransactionsActiveForSubscription } from "@lib/reseller/resellerLedger";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { Timestamp } from "firebase/firestore";
import { writeLogEntry } from "logs/utils";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

const LOG_FILE = "razorpay-subscription.log";

const sanitizeForAdminFirestore = (value: any): any => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (Array.isArray(value)) return value.map(sanitizeForAdminFirestore);
    if (value instanceof Date) return value;
    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [key, sanitizeForAdminFirestore(nestedValue)])
        );
    }

    return value;
};

const normalizeNumericId = (value: unknown): number | null => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
};

const getEventProductId = (eventPayload: any) => {
    const payment = eventPayload?.payload?.payment?.entity || {};
    const subscription = eventPayload?.payload?.subscription?.entity || {};
    const order = eventPayload?.payload?.order?.entity || {};
    const orderNotes = !Array.isArray(order?.notes) ? (order?.notes || {}) : {};
    const subscriptionNotes = !Array.isArray(subscription?.notes) ? (subscription?.notes || {}) : {};
    const paymentNotes = !Array.isArray(payment?.notes) ? (payment?.notes || {}) : {};

    return normalizeBillingProductId(
        eventPayload?.productId
        || eventPayload?.pId
        || orderNotes?.productId
        || orderNotes?.pId
        || subscriptionNotes?.productId
        || subscriptionNotes?.pId
        || paymentNotes?.productId
        || paymentNotes?.pId,
    );
};

const buildWebhookEventKey = (eventPayload: any, rawBody: string): string => {
    const payment = eventPayload?.payload?.payment?.entity;
    const subscription = eventPayload?.payload?.subscription?.entity;
    const order = eventPayload?.payload?.order?.entity;
    const stableFallback = createHash('sha256').update(rawBody).digest('hex').slice(0, 32);
    const rawKey = eventPayload?.id
        || `${eventPayload?.event || 'unknown'}:${payment?.id || subscription?.id || order?.id || stableFallback}:${eventPayload?.created_at || stableFallback}`;

    return String(rawKey).replace(/[\/\\#?]/g, '_').slice(0, 180);
};

const claimWebhookEventForProcessing = async (
    eventPayload: any,
    rawBody: string,
): Promise<{ eventKey: string; shouldProcess: boolean }> => {
    const eventKey = buildWebhookEventKey(eventPayload, rawBody);
    const eventRef = firestoreAdmin.collection(DB_COLLECTIONS.RAZORPAY_WEBHOOK_EVENTS).doc(eventKey);
    const processingExpiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 15 * 60 * 1000);

    const shouldProcess = await firestoreAdmin.runTransaction(async (tx) => {
        const snap = await tx.get(eventRef);
        if (snap.exists) {
            const data = snap.data() || {};
            const lockExpiry = data.processingExpiresAt?.toMillis?.() || 0;
            const lockIsActive = data.status === 'processing' && lockExpiry > Date.now();

            if (data.status === 'processed' || lockIsActive) {
                return false;
            }

            tx.set(eventRef, {
                status: 'processing',
                eventType: eventPayload?.event || null,
                retryCount: admin.firestore.FieldValue.increment(1),
                processingExpiresAt,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            return true;
        }

        tx.create(eventRef, {
            status: 'processing',
            eventType: eventPayload?.event || null,
            eventId: eventPayload?.id || null,
            transactionType: null,
            retryCount: 0,
            processingExpiresAt,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return true;
    });

    return { eventKey, shouldProcess };
};

const markWebhookEvent = async (
    eventKey: string,
    status: 'processed' | 'failed',
    data: Record<string, any> = {},
) => {
    await firestoreAdmin.collection(DB_COLLECTIONS.RAZORPAY_WEBHOOK_EVENTS).doc(eventKey).set({
        status,
        ...sanitizeForAdminFirestore(data),
        processingExpiresAt: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
};

const buildPaymentTransactionAudit = (eventPayload: any) => {
    const payment = eventPayload?.payload?.payment?.entity || {};
    const subscription = eventPayload?.payload?.subscription?.entity || {};
    const order = eventPayload?.payload?.order?.entity || {};
    const orderNotes = !Array.isArray(order?.notes) ? (order?.notes || {}) : {};
    const subscriptionNotes = !Array.isArray(subscription?.notes) ? (subscription?.notes || {}) : {};
    const tenantId = normalizeNumericId(eventPayload?.tenantId ?? orderNotes?.tenantId ?? subscriptionNotes?.tenantId);
    const storeId = normalizeNumericId(eventPayload?.storeId ?? orderNotes?.storeId ?? subscriptionNotes?.storeId);
    const productId = getEventProductId(eventPayload);

    return {
        auditVersion: 2,
        productId,
        pId: productId,
        event: eventPayload?.event,
        transactionType: eventPayload?.transactionType || null,
        tenantId,
        storeId,
        tId: tenantId,
        sId: storeId,
        created_at: Number(eventPayload?.created_at || payment?.created_at || subscription?.created_at || order?.created_at || Math.floor(Date.now() / 1000)),
        paymentId: payment?.id || null,
        subscriptionId: subscription?.id || payment?.subscription_id || null,
        orderId: order?.id || payment?.order_id || null,
        invoiceId: payment?.invoice_id || null,
        invoiceUrl: eventPayload?.invoiceUrl || null,
        amount: Number(payment?.amount ?? order?.amount_paid ?? order?.amount ?? subscription?.amount ?? 0),
        currency: payment?.currency || order?.currency || subscription?.currency || 'INR',
        status: payment?.status || order?.status || subscription?.status || null,
        description: payment?.description || null,
        method: payment?.method || null,
        cardNetwork: payment?.card?.network || null,
        hasUpi: Boolean(payment?.vpa || payment?.acquirer_data?.upi_transaction_id),
        current_start: subscription?.current_start || null,
        current_end: subscription?.current_end || null,
        quantity: subscription?.quantity ?? null,
        packId: orderNotes?.packId || null,
        packName: orderNotes?.packName || null,
        creditAmount: orderNotes?.creditAmount ?? null,
    };
};

const writePaymentTransactionAudit = async (data: any): Promise<string> => {
    const tenantId = normalizeNumericId(data?.tenantId ?? data?.tId);
    const storeId = normalizeNumericId(data?.storeId ?? data?.sId);
    const now = admin.firestore.FieldValue.serverTimestamp();

    const docRef = await firestoreAdmin.collection(DB_COLLECTIONS.PAYMENT_TRANSACTIONS).add({
        ...sanitizeForAdminFirestore(data),
        tenantId,
        storeId,
        tId: data?.tId ?? tenantId,
        sId: data?.sId ?? storeId,
        createdOn: now,
        modifiedOn: now,
    });

    return docRef.id;
};

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
    let event: any;
    try {
        event = JSON.parse(requestBody);
    } catch {
        logger.warn('Webhook payload JSON parse failed', {
            provider: 'razorpay',
        });
        return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const eventProductId = getEventProductId(event);

    logger.info('Webhook event received', {
        eventType: event.event,
        eventId: event.id || event.payload?.payment?.entity?.id || event.payload?.subscription?.entity?.id,
        productId: eventProductId,
    });

    const webhookClaim = await claimWebhookEventForProcessing(event, requestBody);
    if (!webhookClaim.shouldProcess) {
        logger.info('Duplicate Razorpay webhook skipped', {
            eventType: event.event,
            eventKey: webhookClaim.eventKey,
        });
        return NextResponse.json({ status: 'duplicate' });
    }

    try {
        let eventPayloadToUpload = event;
        eventPayloadToUpload.productId = eventProductId;
        eventPayloadToUpload.pId = eventProductId;
        const getSubscription = (id: string) => getProductSubscriptionById(eventProductId, id);
        const updateSubscriptionForProduct = (id: string, data: Partial<FirestoreSubscriptionDoc>) => updateProductSubscription(eventProductId, id, data);
        const syncSubscriptionForProduct = (subscription: FirestoreSubscriptionDoc, source: string) =>
            safeSyncProductSubscriptionEntitlementFromSubscription(eventProductId, subscription, source);
        const markResellerTransactionsForProduct = async (subscriptionId: string, source: string) => {
            if (!isAnswerlatticeBillingProduct(eventProductId)) {
                await markResellerTransactionsActiveForSubscription(subscriptionId, source);
            }
        };
        const shouldSendMenuListBillingMessages = !isAnswerlatticeBillingProduct(eventProductId);
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
        if ((event.event === 'order.paid' || event.event === 'subscription.charged') && paymentEntity?.invoice_id) {
            eventPayloadToUpload = await getInvoiceById(eventPayloadToUpload, paymentEntity?.invoice_id);
        }
        // await writeLogEntry({ logFileName: LOG_FILE, logType: `RAZORPAY_WEBHOOK_EVENT_${event.event}`, data: eventPayloadToUpload });
        const auditSummary = buildPaymentTransactionAudit(eventPayloadToUpload);
        await writeProductPaymentTransactionAudit(eventProductId, auditSummary);
        if (!eventPayloadToUpload.transactionType) {
            await markWebhookEvent(webhookClaim.eventKey, 'processed', {
                transactionType: null,
                productId: eventProductId,
                tenantId: eventPayloadToUpload.tenantId ?? null,
                storeId: eventPayloadToUpload.storeId ?? null,
            });
            return NextResponse.json({ received: true });
        }

        switch (event.event) {
            case 'order.paid': {
                await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_WEBHOOK_ORDER.PAID', data: auditSummary });
                break;
            }

            case 'payment.failed':
            case 'subscription.halted':
            case 'subscription.pending': {
                await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_WEBHOOK_PAYMENT_FAILED', data: auditSummary });

                // 🔔 ALERT: Payment failure — founder needs to know immediately
                try {
                    const { createAlert } = await import('@lib/ops/alerts');
                    const { PLATFORM_NOTIFICATION_TRIGGER_TYPES } = await import('@data/shared/platformNotificationRegistry');
                    await createAlert({
                        severity: event.event === 'subscription.halted' ? 'critical' : 'warning',
                        title: `Payment ${event.event === 'subscription.halted' ? 'HALTED' : 'Failed'}: Store ${eventPayloadToUpload.storeId}`,
                        message: `Event: ${event.event}\nStore: ${eventPayloadToUpload.storeId}\nTenant: ${eventPayloadToUpload.tenantId}\nError: ${paymentEntity?.error_description || paymentEntity?.error_reason || 'Unknown'}`,
                        sId: eventPayloadToUpload.storeId ? String(eventPayloadToUpload.storeId) : undefined,
                        tId: eventPayloadToUpload.tenantId ? String(eventPayloadToUpload.tenantId) : undefined,
                        triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.PAYMENT_FAILURE,
                        productId: 'ML',
                        category: 'payments',
                    });
                } catch { /* non-blocking */ }

                if (shouldSendMenuListBillingMessages) {
                    // 📧 LIFECYCLE MESSAGE: Notify store owner about payment failure
                    try {
                        const { sendLifecycleMessage } = await import('@lib/messaging');
                        const subForMsg = paymentEntity?.subscription_id
                            ? await getSubscription(paymentEntity.subscription_id)
                            : (event.payload?.subscription?.entity?.id ? await getSubscription(event.payload.subscription.entity.id) : null);
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
                }

                if (paymentEntity?.subscription_id) {
                    const internalSub = await getSubscription(paymentEntity.subscription_id);
                    if (internalSub) {
                        if (!validateTransition(internalSub.status, 'past_due', `webhook:${event.event}`)) {
                            break;
                        }
                        const pastDueSince = internalSub.pastDueSinceAt || Timestamp.now();
                        await updateSubscriptionForProduct(internalSub.id, {
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
                        await syncSubscriptionForProduct(
                            { ...internalSub, status: 'past_due' },
                            `webhook:${event.event}`,
                        );
                    }
                } else if (event.event === 'subscription.pending' || event.event === 'subscription.halted') {
                    const subscriptionEntity = event.payload?.subscription?.entity;
                    if (subscriptionEntity?.id) {
                        const internalSub = await getSubscription(subscriptionEntity.id);
                        if (internalSub) {
                            if (!validateTransition(internalSub.status, 'past_due', `webhook:${event.event}`)) {
                                break;
                            }
                            const pastDueSince = internalSub.pastDueSinceAt || Timestamp.now();
                            await updateSubscriptionForProduct(internalSub.id, {
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
                            await syncSubscriptionForProduct(
                                { ...internalSub, status: 'past_due' },
                                `webhook:${event.event}`,
                            );
                        }
                    }
                }
                break;
            }
            case 'subscription.activated':
            case 'subscription.charged': {
                const subscriptionEntity = event.payload?.subscription?.entity;
                await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_ACTIVATED', data: auditSummary });
                if (!subscriptionEntity?.id) break;
                const internalSub = await getSubscription(subscriptionEntity.id);
                const planDetails = getPlanDetailsFromConstants(subscriptionEntity.notes);

                if (internalSub && planDetails) {
                    if (!validateTransition(internalSub.status, 'active', `webhook:${event.event}`)) {
                        break;
                    }
                    const paymentMethod = {
                        type: paymentEntity?.method || "",
                        brand: paymentEntity?.card?.network || "",
                        last4: paymentEntity?.card?.last4 || "",
                        upiId: paymentEntity?.vpa || "",
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
                    const paymentHistoryId = paymentEntity?.id || `${event.event}-${subscriptionEntity.id}-${subscriptionEntity.current_start || Date.now()}`;
                    const updatedBillingHistory = internalSub.billingHistory.includes(paymentHistoryId)
                        ? internalSub.billingHistory
                        : [...internalSub.billingHistory, paymentHistoryId];

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
                                amount: paymentEntity?.amount || internalSub.amount || 0,
                                currency: paymentEntity?.currency || internalSub.currency || 'INR',
                                remark: event.event === 'subscription.activated' ? "Subscription activated" : "Subscription charged",
                            },
                        ],
                    };
                    await updateSubscriptionForProduct(internalSub.id, updatePayload);
                    await markResellerTransactionsForProduct(internalSub.id, `webhook:${event.event}`);
                    await syncSubscriptionForProduct(
                        {
                            ...internalSub,
                            ...updatePayload,
                            status: 'active',
                            planId: planDetails.planId || internalSub.planId,
                        } as FirestoreSubscriptionDoc,
                        `webhook:${event.event}`,
                    );

                    if (shouldSendMenuListBillingMessages) {
                        // 📧 LIFECYCLE MESSAGE: Payment success confirmation to store owner
                        try {
                            const { sendLifecycleMessage } = await import('@lib/messaging');
                            sendLifecycleMessage({
                                storeId: String(internalSub.storeId),
                                tenantId: String(internalSub.tenantId),
                                eventType: 'PAYMENT_SUCCESS',
                                referenceId: `payment-${paymentEntity?.id || subscriptionEntity.id}`,
                                recipientEmail: internalSub.email,
                                storeName: internalSub.name || '',
                                metadata: {
                                    amount: paymentEntity?.amount ? (paymentEntity.amount / 100) : 0,
                                    currency: paymentEntity?.currency?.toUpperCase() || internalSub.currency || 'INR',
                                    planName: internalSub.planName || 'Subscription',
                                    nextBillingAt: subscriptionEntity.charge_at
                                        ? new Date(subscriptionEntity.charge_at * 1000).toISOString()
                                        : null,
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
                                    amount: paymentEntity?.amount ? (paymentEntity.amount / 100) : 0,
                                    currency: paymentEntity?.currency?.toUpperCase() || internalSub.currency || 'INR',
                                    nextBillingDate: subscriptionEntity.charge_at
                                        ? new Date(subscriptionEntity.charge_at * 1000).toLocaleDateString()
                                        : 'N/A',
                                    storeId: String(internalSub.storeId),
                                    tenantId: String(internalSub.tenantId),
                                },
                            }).catch(() => { /* non-blocking */ });
                        } catch { /* non-blocking */ }
                    }
                }
                break;
            }

            case 'subscription.completed': {
                const subscriptionEntity = event.payload?.subscription?.entity;
                await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_COMPLETED', data: auditSummary });
                if (!subscriptionEntity?.id) break;
                const internalSub = await getSubscription(subscriptionEntity.id);
                if (internalSub) {
                    if (!validateTransition(internalSub.status, 'completed', 'webhook:subscription.completed')) {
                        break;
                    }
                    await updateSubscriptionForProduct(internalSub.id, {
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
                    await syncSubscriptionForProduct(
                        { ...internalSub, status: 'completed' },
                        'webhook:subscription.completed',
                    );
                }
                break;
            }

            case 'subscription.cancelled': {
                await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_CANCELLED', data: auditSummary });
                const cancelledSubEntity = event.payload?.subscription?.entity;
                if (cancelledSubEntity?.id) {
                    const cancelledInternalSub = await getSubscription(cancelledSubEntity.id);
                    if (cancelledInternalSub) {
                        if (!validateTransition(cancelledInternalSub.status, 'cancelled', 'webhook:subscription.cancelled')) {
                            break;
                        }
                        await updateSubscriptionForProduct(cancelledInternalSub.id, {
                            status: 'cancelled',
                            lastWebhook: { event: event.event, timestamp: Timestamp.now() },
                            subscriptionEndDate: cancelledSubEntity.ended_at ? Timestamp.fromMillis(cancelledSubEntity.ended_at * 1000) : (cancelledInternalSub.cycleEndDate || Timestamp.now()),
                            statuses: [
                                ...cancelledInternalSub.statuses,
                                {
                                    status: "cancelled",
                                    timestamp: Timestamp.now(),
                                    amount: cancelledInternalSub.amount,
                                    currency: cancelledInternalSub.currency,
                                    remark: "Subscription cancelled by Razorpay webhook",
                                },
                            ],
                        });
                        await syncSubscriptionForProduct(
                            { ...cancelledInternalSub, status: 'cancelled' },
                            'webhook:subscription.cancelled',
                        );
                        if (shouldSendMenuListBillingMessages) {
                            try {
                                const { sendLifecycleMessage } = await import('@lib/messaging');
                                sendLifecycleMessage({
                                    storeId: String(cancelledInternalSub.storeId),
                                    tenantId: String(cancelledInternalSub.tenantId),
                                    eventType: 'SUBSCRIPTION_CANCELLED',
                                    referenceId: `subscription-cancelled-${cancelledInternalSub.id}`,
                                    recipientEmail: cancelledInternalSub.email || '',
                                    storeName: cancelledInternalSub.name || '',
                                    metadata: {
                                        amount: cancelledInternalSub.amount,
                                        currency: cancelledInternalSub.currency || 'INR',
                                        planName: cancelledInternalSub.planName || 'Subscription',
                                        sentAt: new Date().toISOString(),
                                    },
                                }).catch(() => { /* non-blocking */ });
                            } catch { /* non-blocking */ }
                        }
                    }
                }
                break;
            }

            case 'subscription.paused': {
                const pausedSubEntity = event.payload?.subscription?.entity;
                await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_PAUSED', data: auditSummary });
                if (!pausedSubEntity?.id) break;
                const pausedInternalSub = await getSubscription(pausedSubEntity.id);
                if (pausedInternalSub) {
                    if (!validateTransition(pausedInternalSub.status, 'paused', 'webhook:subscription.paused')) {
                        break;
                    }
                    await updateSubscriptionForProduct(pausedInternalSub.id, {
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
                    await syncSubscriptionForProduct(
                        { ...pausedInternalSub, status: 'paused' },
                        'webhook:subscription.paused',
                    );
                    if (shouldSendMenuListBillingMessages) {
                        try {
                            const { sendLifecycleMessage } = await import('@lib/messaging');
                            sendLifecycleMessage({
                                storeId: String(pausedInternalSub.storeId),
                                tenantId: String(pausedInternalSub.tenantId),
                                eventType: 'SUBSCRIPTION_PAUSED',
                                referenceId: `subscription-paused-${pausedInternalSub.id}`,
                                recipientEmail: pausedInternalSub.email || '',
                                storeName: pausedInternalSub.name || '',
                                metadata: {
                                    amount: pausedInternalSub.amount,
                                    currency: pausedInternalSub.currency || 'INR',
                                    planName: pausedInternalSub.planName || 'Subscription',
                                    sentAt: new Date().toISOString(),
                                },
                            }).catch(() => { /* non-blocking */ });
                        } catch { /* non-blocking */ }
                    }
                }
                break;
            }

            // BT7: Sync quantity from Razorpay on subscription.updated (Feature #4C-B)
            case 'subscription.updated': {
                const updatedSubEntity = event.payload?.subscription?.entity;
                await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_UPDATED', data: auditSummary });
                if (!updatedSubEntity?.id) break;
                const updatedInternalSub = await getSubscription(updatedSubEntity.id);
                if (updatedInternalSub && updatedSubEntity.quantity !== undefined) {
                    await updateSubscriptionForProduct(updatedInternalSub.id, {
                        quantity: updatedSubEntity.quantity,
                        lastWebhook: { event: event.event, timestamp: Timestamp.now() },
                    });
                }
                break;
            }

            case 'subscription.resumed': {
                const resumedSubEntity = event.payload?.subscription?.entity;
                await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_RESUMED', data: auditSummary });
                if (!resumedSubEntity?.id) break;
                const resumedInternalSub = await getSubscription(resumedSubEntity.id);
                if (resumedInternalSub) {
                    if (!validateTransition(resumedInternalSub.status, 'active', 'webhook:subscription.resumed')) {
                        break;
                    }
                    await updateSubscriptionForProduct(resumedInternalSub.id, {
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
                    await syncSubscriptionForProduct(
                        { ...resumedInternalSub, status: 'active' },
                        'webhook:subscription.resumed',
                    );
                    if (shouldSendMenuListBillingMessages) {
                        try {
                            const { sendLifecycleMessage } = await import('@lib/messaging');
                            sendLifecycleMessage({
                                storeId: String(resumedInternalSub.storeId),
                                tenantId: String(resumedInternalSub.tenantId),
                                eventType: 'SUBSCRIPTION_RESUMED',
                                referenceId: `subscription-resumed-${resumedInternalSub.id}`,
                                recipientEmail: resumedInternalSub.email || '',
                                storeName: resumedInternalSub.name || '',
                                metadata: {
                                    amount: resumedInternalSub.amount,
                                    currency: resumedInternalSub.currency || 'INR',
                                    planName: resumedInternalSub.planName || 'Subscription',
                                    sentAt: new Date().toISOString(),
                                },
                            }).catch(() => { /* non-blocking */ });
                        } catch { /* non-blocking */ }
                    }
                }
                break;
            }

            default:
                logger.debug('Unhandled webhook event type', {
                    eventType: event.event,
                });
                await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_WEBHOOK_UNHANDLED_EVENT', data: auditSummary });
                break;
        }

        // 3. Acknowledge receipt to Razorpay to prevent retries.
        await markWebhookEvent(webhookClaim.eventKey, 'processed', {
            transactionType: eventPayloadToUpload.transactionType || null,
            productId: eventProductId,
            tenantId: eventPayloadToUpload.tenantId ?? null,
            storeId: eventPayloadToUpload.storeId ?? null,
        });
        return NextResponse.json({ status: 'ok' });

    } catch (error) {
        logger.error('Webhook processing failed', error, {
            eventType: event?.event,
            api: 'razorpay-webhook'
        });

        await markWebhookEvent(webhookClaim.eventKey, 'failed', {
            eventType: event?.event || null,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
        }).catch(() => { /* non-blocking */ });

        // 🚨 CRITICAL ALERT: Webhook processing failure = potential payment state inconsistency
        try {
            const { createAlert } = await import('@lib/ops/alerts');
            const { PLATFORM_NOTIFICATION_TRIGGER_TYPES } = await import('@data/shared/platformNotificationRegistry');
            await createAlert({
                severity: 'critical',
                title: `Razorpay Webhook FAILED: ${event?.event || 'unknown'}`,
                message: `Webhook processing crashed. Payment state may be inconsistent.\nEvent: ${event?.event}\nStore: ${event?.storeId || 'unknown'}\nError: ${error instanceof Error ? error.message : 'Unknown'}`,
                sId: event?.storeId ? String(event.storeId) : undefined,
                tId: event?.tenantId ? String(event.tenantId) : undefined,
                triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.PAYMENT_WEBHOOK_FAILURE,
                productId: eventProductId,
                category: 'payments',
            });
        } catch { /* non-blocking */ }

        return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
    }
}
