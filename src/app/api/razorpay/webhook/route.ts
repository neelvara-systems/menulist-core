export const dynamic = 'force-dynamic';
import { menulistServerEnv } from '@lib/env/menulistServerEnv';
import { DEFAULT_PRODUCT_ID, PRODUCT_IDS, type ProductId } from '@constant/product';
import {
    getRazorpaySubscriptionWebhookPolicy,
    isRazorpaySubscriptionWebhookProviderStatusValid,
    resolveRazorpayProviderSubscriptionStatus,
} from '@data/shared/razorpaySubscriptionLifecycle';
import { getPlanDetailsFromConstants, getSubscriptionEndDate } from "@lib/billing/billingUtils";
import {
    applyProductSubscriptionPayment,
    applyProductSubscriptionWebhookEvent,
    getProductSubscriptionById,
    isProductBillingFirestoreConfigured,
    safeSyncProductSubscriptionEntitlementFromSubscription,
    writeProductPaymentTransactionAudit,
} from "@lib/billing/productBillingServer";
import { getProviderCycleBillingPeriodKey } from '@lib/billing/billingPeriod';
import {
    claimRazorpayWebhookEvent,
    completeRazorpayWebhookEvent,
} from '@lib/billing/razorpayWebhookLease';
import {
    getBoundedRazorpayStringContext,
    getRazorpayFailureLogData,
    logRazorpayNonBlockingFailure,
} from "@lib/billing/razorpayDiagnostics";
import { isAnswerlatticeBillingProduct } from "@lib/billing/productBillingPlans";
import { getProductSubscriptionBillingScope } from '@lib/billing/productSubscriptionScopeBoundary';
import {
    requireRazorpayRevenueAmountPaise,
    resolveRazorpayAuthenticatedSubscriptionState,
    resolveRazorpayAuditAmountPaise,
    resolveRazorpayFailedPaymentAmountPaise,
    resolveRazorpayPaymentTransactionType,
    resolveRazorpayRevenueOccurredAtMillis,
    resolveRazorpaySubscriptionQuantity,
    resolveRazorpaySubscriptionState,
    resolveRazorpayWebhookProductDeclaration,
    resolveRazorpayWebhookSubscriptionId,
    resolveRazorpayWebhookSubscriptionLookupProducts,
    resolveRazorpayWebhookSubscriptionProduct,
} from '@lib/billing/razorpayRevenueProjectionBoundary';
import { finalizeProductSubscriptionReplacement } from '@lib/billing/subscriptionReplacementFinalization';
import { resolveSubscriptionReplacementEvidence } from '@lib/billing/subscriptionReplacementEvidence';
import { hasVerifiedSubscriptionPaymentEvidence } from '@lib/billing/subscriptionPlanEntitlement';
import { settleProductTopupFromProvider } from "@lib/billing/topupSettlementServer";
import { logger } from "@lib/monitoring/logger";
import {
    recordFounderRevenueMovement,
    recordFounderSubscriptionChurn,
    recordFounderSubscriptionMrrChange,
    recordFounderSubscriptionNewMrr,
} from "@lib/ops/founderRevenueReadModel";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { normalizeRazorpayInvoiceUrl } from '@lib/razorpay/checkoutUrl';
import { validateRazorpayWebhookSignature } from "@lib/razorpay/webhook-validator";
import { markResellerTransactionsActiveForSubscription } from "@lib/reseller/resellerLedger";
import { safelyRecordOwnerReferralPaymentAndRepair } from '@lib/ownerReferral/ownerReferralSettlementServer';
import { sanitizeForFirestore } from '@lib/firestore/sanitizeForFirestore';
import { normalizeBillingSubscriptionDocumentId } from '@lib/billing/subscriptionDocumentIdBoundary';
import { readBoundedTextBody, rejectInvalidOrOversizedDeclaredBody } from "@lib/security/boundedRequestBody";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { Timestamp } from "firebase/firestore";
import { writeLogEntry } from "logs/utils";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { checkPublicRateLimit } from "src/middleware/publicApi";

const LOG_FILE = "razorpay-subscription.log";
const RAZORPAY_WEBHOOK_MAX_BODY_BYTES = 256 * 1024;
const RAZORPAY_WEBHOOK_RETRY_AFTER_SECONDS = 30;

const sanitizeForAdminFirestore = (value: any): any => {
    return sanitizeForFirestore(value);
};

const normalizeNumericId = (value: unknown): number | null => {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
        ? value
        : null;
};

const requireInternalSubscriptionId = (subscription: FirestoreSubscriptionDoc): string => {
    const id = normalizeBillingSubscriptionDocumentId(subscription.id);
    if (!id) throw new Error('Internal subscription identity is missing.');
    return id;
};

type ResolvedWebhookEventProduct = {
    productId: ProductId;
    subscriptionId: string | null;
    subscription: FirestoreSubscriptionDoc | null;
};

const resolveWebhookEventProduct = async (eventPayload: any): Promise<ResolvedWebhookEventProduct | null> => {
    const declaration = resolveRazorpayWebhookProductDeclaration(eventPayload);
    if (declaration.outcome === 'invalid') return null;
    const subscriptionDeclaration = resolveRazorpayWebhookSubscriptionId(eventPayload);
    if (subscriptionDeclaration.outcome === 'invalid') return null;
    if (subscriptionDeclaration.outcome === 'missing') {
        return {
            productId: declaration.outcome === 'declared' ? declaration.productId : DEFAULT_PRODUCT_ID,
            subscriptionId: null,
            subscription: null,
        };
    }
    const { subscriptionId } = subscriptionDeclaration;

    const subscriptionProducts = resolveRazorpayWebhookSubscriptionLookupProducts({
        answerlatticeConfigured: isProductBillingFirestoreConfigured(PRODUCT_IDS.ANSWERLATTICE),
        declaration,
    });
    const subscriptionEntries = await Promise.all(subscriptionProducts.map(async (productId) => ([
        productId,
        await getProductSubscriptionById(productId, subscriptionId),
    ] as const)));
    const subscriptionsByProduct = new Map<ProductId, FirestoreSubscriptionDoc | null>(subscriptionEntries);
    const menuListSubscription = subscriptionsByProduct.get(PRODUCT_IDS.MENULIST) ?? null;
    const answerlatticeSubscription = subscriptionsByProduct.get(PRODUCT_IDS.ANSWERLATTICE) ?? null;
    const productResolution = resolveRazorpayWebhookSubscriptionProduct({
        declaration,
        hasAnswerlatticeSubscription: Boolean(answerlatticeSubscription),
        hasMenuListSubscription: Boolean(menuListSubscription),
    });
    if (productResolution.outcome === 'conflict') return null;
    if (productResolution.outcome === 'unresolved') {
        throw new Error('Razorpay webhook subscription product is unresolved.');
    }
    return {
        productId: productResolution.productId,
        subscriptionId,
        subscription: productResolution.productId === PRODUCT_IDS.MENULIST
            ? menuListSubscription
            : answerlatticeSubscription,
    };
};

const getWebhookNonBlockingContext = ({
    notificationEventType,
    webhookEventType,
    productId,
    paymentEntity,
    subscription,
    fallbackSubscriptionId,
    tenantId,
    storeId,
}: {
    notificationEventType?: string;
    webhookEventType?: string;
    productId?: unknown;
    paymentEntity?: any;
    subscription?: any;
    fallbackSubscriptionId?: unknown;
    tenantId?: unknown;
    storeId?: unknown;
}) => ({
    notificationEventType,
    webhookEventType,
    ...getBoundedRazorpayStringContext('productId', productId),
    ...getBoundedRazorpayStringContext('paymentId', paymentEntity?.id),
    ...getBoundedRazorpayStringContext(
        'subscriptionId',
        subscription?.id || subscription?.providerSubscriptionId || fallbackSubscriptionId || paymentEntity?.subscription_id,
    ),
    ...getBoundedRazorpayStringContext('tenantId', subscription?.tenantId ?? subscription?.tId ?? tenantId),
    ...getBoundedRazorpayStringContext('storeId', subscription?.storeId ?? subscription?.sId ?? storeId),
});

const normalizeRazorpayWebhookEventId = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    return value.length > 0 && value.length <= 180 && value === value.trim()
        ? value
        : null;
};

const buildWebhookEventKey = (
    eventPayload: any,
    rawBody: string,
    webhookEventId: string | null,
): string => {
    const payment = eventPayload?.payload?.payment?.entity;
    const subscription = eventPayload?.payload?.subscription?.entity;
    const order = eventPayload?.payload?.order?.entity;
    const stableFallback = createHash('sha256').update(rawBody).digest('hex').slice(0, 32);
    const normalizeProviderId = (value: unknown): string | null => {
        if (typeof value !== 'string') return null;
        const normalized = value.trim();
        return normalized && normalized.length <= 180 ? normalized : null;
    };
    const providerEventId = webhookEventId || normalizeProviderId(eventPayload?.id);
    const entityId = normalizeProviderId(payment?.id)
        || normalizeProviderId(subscription?.id)
        || normalizeProviderId(order?.id)
        || stableFallback;
    const createdAt = Number(eventPayload?.created_at);
    const createdAtIdentity = Number.isSafeInteger(createdAt) && createdAt > 0
        ? String(createdAt)
        : stableFallback;
    const rawKey = providerEventId
        || `${eventPayload.event}:${entityId}:${createdAtIdentity}`;

    const safeKey = rawKey.trim();
    if (safeKey.length <= 180 && !/[\/\\#?]/.test(safeKey)) return safeKey;

    return `evt_${createHash('sha256').update(rawKey).digest('hex')}`;
};

const retryableWebhookResponse = () => NextResponse.json(
    { status: 'processing' },
    {
        status: 503,
        headers: { 'Retry-After': String(RAZORPAY_WEBHOOK_RETRY_AFTER_SECONDS) },
    },
);

const getWebhookAlertDocumentId = (kind: string, eventKey: string): string => (
    `razorpay-${kind}-${createHash('sha256').update(eventKey).digest('hex').slice(0, 40)}`
);

const buildPaymentTransactionAudit = (eventPayload: any, productId: ProductId) => {
    const payment = eventPayload?.payload?.payment?.entity || {};
    const subscription = eventPayload?.payload?.subscription?.entity || {};
    const order = eventPayload?.payload?.order?.entity || {};
    const orderNotes = !Array.isArray(order?.notes) ? (order?.notes || {}) : {};
    const subscriptionNotes = !Array.isArray(subscription?.notes) ? (subscription?.notes || {}) : {};
    const tenantId = normalizeNumericId(eventPayload?.tenantId ?? orderNotes?.tenantId ?? subscriptionNotes?.tenantId);
    const storeId = normalizeNumericId(eventPayload?.storeId ?? orderNotes?.storeId ?? subscriptionNotes?.storeId);

    const createdAtMillis = resolveRazorpayRevenueOccurredAtMillis(
        eventPayload?.created_at ?? payment?.created_at ?? subscription?.created_at ?? order?.created_at,
    );
    const amount = resolveRazorpayAuditAmountPaise(
        payment?.amount ?? order?.amount_paid ?? order?.amount ?? subscription?.amount,
    );

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
        created_at: createdAtMillis == null ? null : createdAtMillis / 1000,
        paymentId: payment?.id || null,
        subscriptionId: subscription?.id || payment?.subscription_id || null,
        orderId: order?.id || payment?.order_id || null,
        invoiceId: payment?.invoice_id || null,
        invoiceUrl: eventPayload?.invoiceUrl || null,
        amount,
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

const getRazorpayPaymentFailureRemark = (eventType: string | undefined) => {
    if (eventType === 'subscription.pending') return 'Payment retry pending';
    if (eventType === 'subscription.halted') return 'Payment retry halted';
    return 'Payment failed';
};

const getInvoiceById = async (eventPayloadToUpload: any, invoiceId: string) => {
    try {
        const invoice = await razorpayClient.invoices.fetch(invoiceId);
        const invoiceUrl = normalizeRazorpayInvoiceUrl(invoice.short_url);
        eventPayloadToUpload.invoiceUrl = invoiceUrl;
        eventPayloadToUpload.payload.invoice = invoice;
        return eventPayloadToUpload;
    } catch (error) {
        logger.error('Failed to fetch invoice for webhook', new Error('razorpay_webhook_invoice_fetch_failed'), getRazorpayFailureLogData('razorpay_webhook_invoice_fetch_failed', error, {
            ...getBoundedRazorpayStringContext('invoiceId', eventPayloadToUpload.payload?.invoice?.entity?.id ?? invoiceId),
        }));
        return eventPayloadToUpload;
    }
}

//🔹 subscription.activated
// When it fires: Triggered once when a subscription is first activated.
// What it means: Razorpay activated the provider lifecycle. This event alone is not
// captured-payment evidence and must not grant local paid entitlement.

//🔹 subscription.charged
// When it fires: Triggered every time a subscription payment is successfully charged(including the first and all subsequent charges).
// What it means: Razorpay has successfully debited the payment for a billing cycle.


export async function POST(request: NextRequest) {
    // 1. Security First: Validate the webhook signature before processing anything.
    // This is a critical step to ensure the request is genuinely from Razorpay.
    const signature = request.headers.get('x-razorpay-signature');
    const secret = menulistServerEnv.razorpayWebhookSecret;

    if (!signature || !secret) {
        logger.warn('Webhook validation failed', {
            reason: 'Missing signature or secret',
            hasSignature: !!signature,
            hasSecret: !!secret
        });
        return NextResponse.json({ error: 'Invalid request: Missing signature or secret.' }, { status: 400 });
    }

    const declaredBodyResponse = rejectInvalidOrOversizedDeclaredBody(
        request,
        RAZORPAY_WEBHOOK_MAX_BODY_BYTES,
        { tooLargeMessage: 'Webhook payload too large.' },
    );
    if (declaredBodyResponse) return declaredBodyResponse;

    const rateLimitResponse = await checkPublicRateLimit(request, 'WEBHOOK');
    if (rateLimitResponse) return rateLimitResponse;

    const boundedBody = await readBoundedTextBody(
        request,
        RAZORPAY_WEBHOOK_MAX_BODY_BYTES,
        { tooLargeMessage: 'Webhook payload too large.' },
    );
    if (boundedBody.ok === false) return boundedBody.response;

    const requestBody = boundedBody.body;
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
    if (
        !event
        || typeof event !== 'object'
        || Array.isArray(event)
        || typeof event.event !== 'string'
        || event.event !== event.event.trim()
        || event.event.length === 0
        || event.event.length > 120
        || !event.payload
        || typeof event.payload !== 'object'
        || Array.isArray(event.payload)
    ) {
        logger.warn('Webhook payload shape validation failed', {
            provider: 'razorpay',
        });
        return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const subscriptionWebhookPolicy = getRazorpaySubscriptionWebhookPolicy(event.event);
    const subscriptionWebhookEntity = event.payload?.subscription?.entity;
    if (
        subscriptionWebhookPolicy
        && (
            !subscriptionWebhookEntity
            || typeof subscriptionWebhookEntity !== 'object'
            || Array.isArray(subscriptionWebhookEntity)
            || typeof subscriptionWebhookEntity.id !== 'string'
            || subscriptionWebhookEntity.id.length === 0
            || subscriptionWebhookEntity.id.length > 180
            || subscriptionWebhookEntity.id !== subscriptionWebhookEntity.id.trim()
            || !isRazorpaySubscriptionWebhookProviderStatusValid(
                event.event,
                subscriptionWebhookEntity.status,
            )
        )
    ) {
        logger.warn('Subscription webhook payload validation failed', {
            eventType: event.event,
        });
        return NextResponse.json({ error: 'Invalid subscription event.' }, { status: 400 });
    }
    if (
        event.event === 'subscription.charged'
        && (
            typeof event.payload?.payment?.entity?.id !== 'string'
            || event.payload.payment.entity.id.length === 0
            || event.payload.payment.entity.status !== 'captured'
            || event.payload.payment.entity.subscription_id !== subscriptionWebhookEntity.id
        )
    ) {
        logger.warn('Subscription charge evidence validation failed', {
            eventType: event.event,
        });
        return NextResponse.json({ error: 'Invalid subscription charge.' }, { status: 400 });
    }

    const webhookEventIdHeader = request.headers.get('x-razorpay-event-id');
    const webhookEventId = normalizeRazorpayWebhookEventId(webhookEventIdHeader);
    if (webhookEventIdHeader !== null && webhookEventId === null) {
        logger.warn('Webhook event identity validation failed', {
            provider: 'razorpay',
        });
        return NextResponse.json({ error: 'Invalid webhook event identity.' }, { status: 400 });
    }

    let eventProductResolution: ResolvedWebhookEventProduct | null;
    try {
        eventProductResolution = await resolveWebhookEventProduct(event);
    } catch (error) {
        logger.error(
            'Webhook product resolution failed',
            new Error('razorpay_webhook_product_resolution_failed'),
            getRazorpayFailureLogData('razorpay_webhook_product_resolution_failed', error, {
                eventType: event.event,
            }),
        );
        return retryableWebhookResponse();
    }
    if (!eventProductResolution) {
        logger.warn('Webhook product identity conflict', {
            eventType: event.event,
        });
        return NextResponse.json({ error: 'Invalid product identity.' }, { status: 400 });
    }
    const eventProductId = eventProductResolution.productId;

    logger.info('Webhook event received', {
        eventType: event.event,
        ...getBoundedRazorpayStringContext(
            'eventId',
            event.id || event.payload?.payment?.entity?.id || event.payload?.subscription?.entity?.id,
        ),
        ...getBoundedRazorpayStringContext('productId', eventProductId),
    });

    let webhookClaim;
    try {
        webhookClaim = await claimRazorpayWebhookEvent({
            eventId: webhookEventId || event.id,
            eventKey: buildWebhookEventKey(event, requestBody, webhookEventId),
            eventType: event.event,
        });
    } catch (error) {
        logger.error(
            'Webhook idempotency claim failed',
            new Error('razorpay_webhook_claim_failed'),
            getRazorpayFailureLogData('razorpay_webhook_claim_failed', error, {
                eventType: event.event,
                productId: eventProductId,
            }),
        );
        return retryableWebhookResponse();
    }
    if (webhookClaim.outcome === 'processed') {
        logger.info('Duplicate Razorpay webhook skipped', {
            eventType: event.event,
            ...getBoundedRazorpayStringContext('eventKey', webhookClaim.eventKey),
        });
        return NextResponse.json({ status: 'duplicate' });
    }
    if (webhookClaim.outcome === 'processing') {
        logger.info('Concurrent Razorpay webhook remains in progress', {
            eventType: event.event,
            ...getBoundedRazorpayStringContext('eventKey', webhookClaim.eventKey),
        });
        return retryableWebhookResponse();
    }
    const webhookAttemptId = webhookClaim.attemptId;

    try {
        let eventPayloadToUpload = event;
        eventPayloadToUpload.productId = eventProductId;
        eventPayloadToUpload.pId = eventProductId;
        const subscriptionReads = new Map<string, Promise<FirestoreSubscriptionDoc | null>>();
        if (eventProductResolution.subscription && eventProductResolution.subscriptionId) {
            subscriptionReads.set(
                eventProductResolution.subscriptionId,
                Promise.resolve(eventProductResolution.subscription),
            );
        }
        const getSubscription = (id: string) => {
            const subscriptionId = String(id || '').trim();
            if (!subscriptionId) return Promise.resolve(null);
            const existingRead = subscriptionReads.get(subscriptionId);
            if (existingRead) return existingRead;
            const subscriptionRead = getProductSubscriptionById(eventProductId, subscriptionId);
            subscriptionReads.set(subscriptionId, subscriptionRead);
            return subscriptionRead;
        };
        const syncSubscriptionForProduct = (subscription: FirestoreSubscriptionDoc, source: string) =>
            safeSyncProductSubscriptionEntitlementFromSubscription(eventProductId, subscription, source);
        const markResellerTransactionsForProduct = async (subscriptionId: string, source: string) => {
            if (!isAnswerlatticeBillingProduct(eventProductId)) {
                await markResellerTransactionsActiveForSubscription(subscriptionId, source);
            }
        };
        const shouldSendProductBillingMessages = (
            eventProductId === PRODUCT_IDS.MENULIST
            || eventProductId === PRODUCT_IDS.ANSWERLATTICE
        );
        const shouldSendMenuListInternalMessages = !isAnswerlatticeBillingProduct(eventProductId);
        const paymentEntity = event.payload?.payment?.entity;
        const refundEntity = event.payload?.refund?.entity;
        const eventSubscriptionId = eventProductResolution.subscriptionId;
        const eventSubscription = eventSubscriptionId
            ? await getSubscription(eventSubscriptionId)
            : null;
        const eventSubscriptionScope = eventSubscription
            ? getProductSubscriptionBillingScope(eventProductId, eventSubscription)
            : null;
        if (event.payload?.order) {
            const orderEntity = event.payload?.order?.entity;
            //if its topup credit purchase transaction event
            if (Boolean(orderEntity?.notes) && !Array.isArray(orderEntity?.notes) && orderEntity?.notes?.packId) {
                //if its topup credit purchase order.paid event
                eventPayloadToUpload.storeId = Number(
                    orderEntity?.notes?.billingStoreId || orderEntity?.notes?.storeId,
                );
                eventPayloadToUpload.tenantId = Number(orderEntity?.notes?.tenantId);
                eventPayloadToUpload.transactionType = 'topup';
            } else {
                eventPayloadToUpload.storeId = null;
                eventPayloadToUpload.tenantId = null;
                eventPayloadToUpload.transactionType = 'payment';
            }
        } else if (event.payload?.subscription) {
            //if its subscription transaction event event
            const subscriptionEntity = event.payload?.subscription?.entity;
            eventPayloadToUpload.storeId = Number(subscriptionEntity?.notes?.storeId);
            eventPayloadToUpload.tenantId = Number(subscriptionEntity?.notes?.tenantId);
            eventPayloadToUpload.transactionType = 'subscription';
        } else if (paymentEntity) {
            const paymentNotes = !Array.isArray(paymentEntity?.notes) ? (paymentEntity?.notes || {}) : {};
            eventPayloadToUpload.storeId = Number(paymentNotes.storeId);
            eventPayloadToUpload.tenantId = Number(paymentNotes.tenantId);
            eventPayloadToUpload.transactionType = resolveRazorpayPaymentTransactionType(paymentEntity);
        }
        if (eventSubscriptionId) {
            eventPayloadToUpload.tenantId = eventSubscriptionScope?.tenantId ?? null;
            eventPayloadToUpload.storeId = eventSubscriptionScope?.storeId ?? null;
        }
        //fetch invoice data from razorpay
        if ((event.event === 'order.paid' || event.event === 'subscription.charged') && paymentEntity?.invoice_id) {
            eventPayloadToUpload = await getInvoiceById(eventPayloadToUpload, paymentEntity?.invoice_id);
        }
        // await writeLogEntry({ logFileName: LOG_FILE, logType: `RAZORPAY_WEBHOOK_EVENT_${event.event}`, data: eventPayloadToUpload });
        const auditSummary = buildPaymentTransactionAudit(eventPayloadToUpload, eventProductId);
        const resolvePaymentRevenueAmountPaise = () => requireRazorpayRevenueAmountPaise(
            paymentEntity?.amount ?? event.payload?.subscription?.entity?.amount,
        );
        const resolvePaymentOccurredAt = () => resolveRazorpayRevenueOccurredAtMillis(
            paymentEntity?.created_at ?? event.created_at,
        );
        const orderEntity = event.payload?.order?.entity;
        const isSettledTopupEvent = event.event === 'order.paid'
            && Boolean(orderEntity?.notes)
            && !Array.isArray(orderEntity.notes)
            && Boolean(orderEntity.notes.packId);
        if (!isSettledTopupEvent) {
            await writeProductPaymentTransactionAudit(eventProductId, auditSummary, webhookClaim.eventKey);
        }
        if (event.event === 'subscription.charged') {
            await recordFounderRevenueMovement({
                amountPaise: resolvePaymentRevenueAmountPaise(),
                currency: paymentEntity?.currency || auditSummary.currency || 'INR',
                description: event.event === 'subscription.charged' ? 'Razorpay subscription payment collected.' : 'Razorpay order payment collected.',
                eventName: event.event,
                id: `cash:${paymentEntity?.id || webhookClaim.eventKey}`,
                kind: 'cash_collected',
                occurredAt: resolvePaymentOccurredAt(),
                paymentId: paymentEntity?.id || null,
                productId: eventProductId,
                requireDurableWrite: true,
                source: `webhook:${event.event}`,
                storeId: eventSubscriptionScope?.storeId ?? null,
                subscriptionId: eventSubscriptionId,
                tenantId: eventSubscriptionScope?.tenantId ?? null,
            });
        }
        if (event.event === 'payment.failed' || event.event === 'subscription.pending' || event.event === 'subscription.halted') {
            await recordFounderRevenueMovement({
                amountPaise: resolveRazorpayFailedPaymentAmountPaise({
                    providerAmountPaise: paymentEntity?.amount,
                    subscriptionQuantity: eventSubscription?.quantity,
                    subscriptionUnitAmountPaise: eventSubscription?.amount,
                }),
                currency: paymentEntity?.currency || auditSummary.currency || 'INR',
                description: getRazorpayPaymentFailureRemark(event.event),
                eventName: event.event,
                id: `failed_payment:${paymentEntity?.id || webhookClaim.eventKey}`,
                kind: 'failed_payment',
                occurredAt: resolvePaymentOccurredAt(),
                paymentId: paymentEntity?.id || null,
                productId: eventProductId,
                requireDurableWrite: true,
                source: `webhook:${event.event}`,
                storeId: eventSubscriptionScope?.storeId ?? null,
                subscriptionId: eventSubscriptionId,
                tenantId: eventSubscriptionScope?.tenantId ?? null,
            });
        }
        if (event.event === 'payment.refunded' || event.event === 'refund.processed') {
            const refundAmountPaise = requireRazorpayRevenueAmountPaise(
                refundEntity?.amount ?? paymentEntity?.amount_refunded ?? paymentEntity?.amount,
            );
            const refundPaymentId = refundEntity?.payment_id || paymentEntity?.id || null;
            await recordFounderRevenueMovement({
                amountPaise: refundAmountPaise,
                currency: refundEntity?.currency || paymentEntity?.currency || auditSummary.currency || 'INR',
                description: 'Razorpay refund processed.',
                eventName: event.event,
                id: `refund:${refundEntity?.id || refundPaymentId || webhookClaim.eventKey}`,
                kind: 'refund',
                occurredAt: resolveRazorpayRevenueOccurredAtMillis(
                    refundEntity?.created_at ?? paymentEntity?.created_at ?? event.created_at,
                ),
                paymentId: refundPaymentId,
                productId: eventProductId,
                requireDurableWrite: true,
                source: `webhook:${event.event}`,
                storeId: eventSubscriptionScope?.storeId ?? null,
                subscriptionId: eventSubscriptionId,
                tenantId: eventSubscriptionScope?.tenantId ?? null,
            });
            if (event.event === 'refund.processed' && shouldSendProductBillingMessages && eventSubscription && eventSubscriptionScope) {
                try {
                    const { sendLifecycleMessage } = await import('@lib/messaging');
                    await sendLifecycleMessage({
                        productId: eventProductId,
                        storeId: String(eventSubscriptionScope.storeId),
                        tenantId: String(eventSubscriptionScope.tenantId),
                        eventType: 'REFUND_PROCESSED',
                        referenceId: `refund-${refundEntity?.id || webhookClaim.eventKey}`,
                        recipientEmail: eventSubscription.email || '',
                        storeName: eventSubscription.name || '',
                        metadata: {
                            amount: refundAmountPaise / 100,
                            currency: String(
                                refundEntity?.currency || paymentEntity?.currency || auditSummary.currency || 'INR',
                            ).toUpperCase(),
                            refundReference: refundEntity?.id || refundPaymentId || '',
                        },
                    }).catch((notificationError) => {
                        logRazorpayNonBlockingFailure('razorpay_webhook_refund_lifecycle_message_failed', notificationError, {
                            notificationEventType: 'REFUND_PROCESSED',
                            webhookEventType: event.event,
                            productId: eventProductId,
                            ...getBoundedRazorpayStringContext('subscriptionId', eventSubscriptionId),
                        });
                    });
                } catch (notificationSetupError) {
                    logRazorpayNonBlockingFailure('razorpay_webhook_refund_lifecycle_message_setup_failed', notificationSetupError, {
                        notificationEventType: 'REFUND_PROCESSED',
                        webhookEventType: event.event,
                        productId: eventProductId,
                        ...getBoundedRazorpayStringContext('subscriptionId', eventSubscriptionId),
                    });
                }
            }
        }
        if (!eventPayloadToUpload.transactionType) {
            const completionOutcome = await completeRazorpayWebhookEvent({
                attemptId: webhookAttemptId,
                data: sanitizeForAdminFirestore({
                    transactionType: null,
                    productId: eventProductId,
                    tenantId: eventPayloadToUpload.tenantId ?? null,
                    storeId: eventPayloadToUpload.storeId ?? null,
                }),
                eventKey: webhookClaim.eventKey,
                status: 'processed',
            });
            if (completionOutcome === 'ownership_lost') return retryableWebhookResponse();
            return NextResponse.json({ received: true });
        }

        switch (event.event) {
            case 'order.paid': {
                await writeLogEntry({
                    logFileName: LOG_FILE,
                    logType: 'RAZORPAY_WEBHOOK_ORDER.PAID',
                    data: auditSummary,
                });
                const orderNotes = orderEntity?.notes && !Array.isArray(orderEntity.notes)
                    ? orderEntity.notes
                    : null;
                if (orderNotes?.packId) {
                    if (!paymentEntity) {
                        throw new Error('Paid top-up webhook is missing its payment entity.');
                    }

                    const topupApplication = await settleProductTopupFromProvider({
                        order: orderEntity,
                        payment: paymentEntity,
                        productId: eventProductId,
                    });
                    const topupSubscriptionScope = getProductSubscriptionBillingScope(
                        eventProductId,
                        topupApplication.subscription,
                    );
                    if (!topupSubscriptionScope) {
                        throw new Error('Paid top-up subscription scope is invalid after settlement.');
                    }
                    await writeProductPaymentTransactionAudit(eventProductId, {
                        ...auditSummary,
                        amount: topupApplication.settlement.amount,
                        currency: topupApplication.settlement.currency,
                        pId: eventProductId,
                        productId: eventProductId,
                        sId: topupSubscriptionScope.storeId,
                        storeId: topupSubscriptionScope.storeId,
                        tId: topupSubscriptionScope.tenantId,
                        tenantId: topupSubscriptionScope.tenantId,
                    }, webhookClaim.eventKey);
                    await recordFounderRevenueMovement({
                        amountPaise: topupApplication.settlement.amount,
                        currency: topupApplication.settlement.currency,
                        description: 'Razorpay top-up payment collected.',
                        eventName: event.event,
                        id: `cash:${paymentEntity.id || webhookClaim.eventKey}`,
                        kind: 'cash_collected',
                        occurredAt: resolvePaymentOccurredAt(),
                        paymentId: paymentEntity.id || null,
                        productId: eventProductId,
                        requireDurableWrite: true,
                        source: `webhook:${event.event}:topup`,
                        storeId: topupSubscriptionScope.storeId,
                        tenantId: topupSubscriptionScope.tenantId,
                    });

                    if (topupApplication.applied && shouldSendProductBillingMessages) {
                        try {
                            const { sendLifecycleMessage, sendInternalNotification } = await import('@lib/messaging');
                            const notificationMetadata = {
                                amount: topupApplication.settlement.amount / 100,
                                creditsAdded: topupApplication.settlement.creditsToAdd,
                                currency: topupApplication.settlement.currency,
                                newBalance: topupApplication.newBalance,
                                storeId: String(topupApplication.subscription.storeId),
                                tenantId: String(topupApplication.subscription.tenantId),
                            };
                            await sendLifecycleMessage({
                                productId: eventProductId,
                                storeId: String(topupApplication.subscription.storeId),
                                tenantId: String(topupApplication.subscription.tenantId),
                                eventType: 'CREDIT_PURCHASE_SUCCESS',
                                referenceId: `topup-${orderEntity.id}`,
                                recipientEmail: topupApplication.subscription.email || '',
                                storeName: topupApplication.subscription.name || '',
                                metadata: notificationMetadata,
                            }).catch((notificationError) => {
                                logRazorpayNonBlockingFailure('razorpay_webhook_topup_lifecycle_message_failed', notificationError, {
                                    eventType: 'CREDIT_PURCHASE_SUCCESS',
                                    ...getBoundedRazorpayStringContext('orderId', orderEntity.id),
                                    ...getBoundedRazorpayStringContext('paymentId', paymentEntity.id),
                                    ...getBoundedRazorpayStringContext('productId', eventProductId),
                                });
                            });
                            if (shouldSendMenuListInternalMessages) {
                                sendInternalNotification({
                                    eventType: 'INTERNAL_CREDIT_PACK_PURCHASED',
                                    storeId: String(topupApplication.subscription.storeId),
                                    tenantId: String(topupApplication.subscription.tenantId),
                                    metadata: {
                                        ...notificationMetadata,
                                        storeName: topupApplication.subscription.name || '',
                                    },
                                }).catch((notificationError) => {
                                    logRazorpayNonBlockingFailure('razorpay_webhook_topup_internal_notification_failed', notificationError, {
                                        eventType: 'INTERNAL_CREDIT_PACK_PURCHASED',
                                        ...getBoundedRazorpayStringContext('orderId', orderEntity.id),
                                        ...getBoundedRazorpayStringContext('paymentId', paymentEntity.id),
                                        ...getBoundedRazorpayStringContext('productId', eventProductId),
                                    });
                                });
                            }
                        } catch (notificationSetupError) {
                            logRazorpayNonBlockingFailure('razorpay_webhook_topup_notification_setup_failed', notificationSetupError, {
                                ...getBoundedRazorpayStringContext('orderId', orderEntity.id),
                                ...getBoundedRazorpayStringContext('paymentId', paymentEntity.id),
                                ...getBoundedRazorpayStringContext('productId', eventProductId),
                            });
                        }
                    }
                }
                break;
            }

            case 'payment.failed':
            case 'subscription.halted':
            case 'subscription.pending': {
                await writeLogEntry({
                    logFileName: LOG_FILE,
                    logType: 'RAZORPAY_WEBHOOK_PAYMENT_FAILED',
                    data: auditSummary,
                });

                // 🔔 ALERT: Payment failure — founder needs to know immediately
                try {
                    const { createAlert } = await import('@lib/ops/alerts');
                    const { PLATFORM_NOTIFICATION_TRIGGER_TYPES } = await import('@data/shared/platformNotificationRegistry');
                    await createAlert({
                        severity: event.event === 'subscription.halted' ? 'critical' : 'warning',
                        title: event.event === 'subscription.halted'
                            ? 'Razorpay payment halted'
                            : 'Razorpay payment failed',
                        message: 'Razorpay reported a payment failure. Check bounded payment metadata and the provider dashboard.',
                        sId: eventPayloadToUpload.storeId ? String(eventPayloadToUpload.storeId) : undefined,
                        tId: eventPayloadToUpload.tenantId ? String(eventPayloadToUpload.tenantId) : undefined,
                        triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.PAYMENT_FAILURE,
                        productId: eventProductId,
                        category: 'payments',
                        metadata: getRazorpayFailureLogData('razorpay_webhook_payment_failure_event', undefined, {
                            eventType: event.event,
                            productId: eventProductId,
                            ...getBoundedRazorpayStringContext('tenantId', eventPayloadToUpload.tenantId),
                            ...getBoundedRazorpayStringContext('storeId', eventPayloadToUpload.storeId),
                            ...getBoundedRazorpayStringContext('paymentId', paymentEntity?.id),
                            ...getBoundedRazorpayStringContext(
                                'subscriptionId',
                                eventSubscriptionId,
                            ),
                            ...getBoundedRazorpayStringContext('providerErrorDescription', paymentEntity?.error_description),
                            ...getBoundedRazorpayStringContext('providerErrorReason', paymentEntity?.error_reason),
                        }),
                    }, {
                        documentId: getWebhookAlertDocumentId('payment-failure', webhookClaim.eventKey),
                    });
                } catch (alertError) {
                    logRazorpayNonBlockingFailure('razorpay_webhook_payment_failure_alert_failed', alertError, getWebhookNonBlockingContext({
                        webhookEventType: event.event,
                        productId: eventProductId,
                        paymentEntity,
                        fallbackSubscriptionId: event.payload?.subscription?.entity?.id,
                        tenantId: eventPayloadToUpload.tenantId,
                        storeId: eventPayloadToUpload.storeId,
                    }));
                }

                if (shouldSendProductBillingMessages) {
                    // 📧 LIFECYCLE MESSAGE: Notify store owner about payment failure
                    try {
                        const { sendLifecycleMessage } = await import('@lib/messaging');
                        const subForMsg = paymentEntity?.subscription_id
                            ? await getSubscription(paymentEntity.subscription_id)
                            : (event.payload?.subscription?.entity?.id ? await getSubscription(event.payload.subscription.entity.id) : null);
                        if (subForMsg) {
                            await sendLifecycleMessage({
                                productId: eventProductId,
                                storeId: String(subForMsg.storeId),
                                tenantId: String(subForMsg.tenantId),
                                eventType: event.event === 'subscription.pending' ? 'GRACE_PERIOD_STARTED' : 'PAYMENT_FAILED',
                                referenceId: `${event.event}-${paymentEntity?.id || event.payload?.subscription?.entity?.id || webhookClaim.eventKey}`,
                                recipientEmail: subForMsg.email || '',
                                storeName: subForMsg.name || '',
                                metadata: {
                                    amount: paymentEntity?.amount ? (paymentEntity.amount / 100) : subForMsg.amount || 0,
                                    currency: paymentEntity?.currency?.toUpperCase() || subForMsg.currency || 'INR',
                                },
                            }).catch((notificationError) => {
                                logRazorpayNonBlockingFailure('razorpay_webhook_payment_failure_lifecycle_message_failed', notificationError, getWebhookNonBlockingContext({
                                    notificationEventType: event.event === 'subscription.pending' ? 'GRACE_PERIOD_STARTED' : 'PAYMENT_FAILED',
                                    webhookEventType: event.event,
                                    productId: eventProductId,
                                    paymentEntity,
                                    subscription: subForMsg,
                                    fallbackSubscriptionId: event.payload?.subscription?.entity?.id,
                                }));
                            });
                        }
                    } catch (notificationSetupError) {
                        logRazorpayNonBlockingFailure('razorpay_webhook_payment_failure_lifecycle_message_setup_failed', notificationSetupError, getWebhookNonBlockingContext({
                            notificationEventType: event.event === 'subscription.pending' ? 'GRACE_PERIOD_STARTED' : 'PAYMENT_FAILED',
                            webhookEventType: event.event,
                            productId: eventProductId,
                            paymentEntity,
                            fallbackSubscriptionId: event.payload?.subscription?.entity?.id,
                            tenantId: eventPayloadToUpload.tenantId,
                            storeId: eventPayloadToUpload.storeId,
                        }));
                    }
                }

                if (paymentEntity?.subscription_id) {
                    const internalSub = await getSubscription(paymentEntity.subscription_id);
                    if (internalSub) {
                        const pastDueSince = internalSub.pastDueSinceAt || Timestamp.now();
                        const statusApplication = await applyProductSubscriptionWebhookEvent(eventProductId, {
                            eventKey: webhookClaim.eventKey,
                            nextStatus: 'past_due',
                            statusEntry: {
                                status: event.event === 'subscription.pending' ? 'pending_retry' : 'payment.failed',
                                timestamp: Timestamp.now(),
                                amount: paymentEntity.amount,
                                currency: paymentEntity.currency,
                                remark: getRazorpayPaymentFailureRemark(event.event),
                            },
                            subscriptionId: requireInternalSubscriptionId(internalSub),
                            update: {
                                ...(event.event === 'subscription.pending'
                                    ? { providerStatus: 'pending' as const }
                                    : event.event === 'subscription.halted'
                                        ? { providerStatus: 'halted' as const }
                                        : {}),
                                pastDueSinceAt: pastDueSince,
                                lastWebhook: {
                                    event: event.event,
                                    timestamp: Timestamp.now(),
                                },
                            },
                        });
                        if (!statusApplication || (!statusApplication.applied && !statusApplication.duplicate)) break;
                        await syncSubscriptionForProduct(
                            statusApplication.subscription,
                            `webhook:${event.event}`,
                        );
                    }
                } else if (event.event === 'subscription.pending' || event.event === 'subscription.halted') {
                    const subscriptionEntity = event.payload?.subscription?.entity;
                    if (subscriptionEntity?.id) {
                        const internalSub = await getSubscription(subscriptionEntity.id);
                        if (internalSub) {
                            const pastDueSince = internalSub.pastDueSinceAt || Timestamp.now();
                            const statusApplication = await applyProductSubscriptionWebhookEvent(eventProductId, {
                                eventKey: webhookClaim.eventKey,
                                nextStatus: 'past_due',
                                statusEntry: {
                                    status: event.event === 'subscription.pending' ? 'pending_retry' : 'halted',
                                    timestamp: Timestamp.now(),
                                    amount: internalSub.amount,
                                    currency: internalSub.currency,
                                    remark: `Subscription ${event.event} — payment retry in progress`,
                                },
                                subscriptionId: requireInternalSubscriptionId(internalSub),
                                update: {
                                    providerStatus: event.event === 'subscription.pending'
                                        ? 'pending'
                                        : 'halted',
                                    pastDueSinceAt: pastDueSince,
                                    lastWebhook: {
                                        event: event.event,
                                        timestamp: Timestamp.now(),
                                    },
                                },
                            });
                            if (!statusApplication || (!statusApplication.applied && !statusApplication.duplicate)) break;
                            await syncSubscriptionForProduct(
                                statusApplication.subscription,
                                `webhook:${event.event}`,
                            );
                        }
                    }
                }
                break;
            }
            case 'subscription.authenticated': {
                const subscriptionEntity = event.payload?.subscription?.entity;
                await writeLogEntry({
                    logFileName: LOG_FILE,
                    logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_AUTHENTICATED',
                    data: auditSummary,
                });
                if (!subscriptionEntity?.id) throw new Error('Authenticated webhook is missing its subscription entity.');
                if (subscriptionEntity.status !== 'authenticated') {
                    throw new Error('Authenticated webhook has an invalid provider status.');
                }
                const internalSub = await getSubscription(subscriptionEntity.id);
                const providerState = resolveRazorpayAuthenticatedSubscriptionState(
                    subscriptionEntity,
                    internalSub?.quantity,
                );
                const billingInterval = subscriptionEntity.notes?.interval;
                if (
                    !internalSub
                    || !providerState
                    || (billingInterval !== 'MONTH' && billingInterval !== 'YEAR')
                ) {
                    throw new Error('Invalid authenticated provider subscription state.');
                }
                await applyProductSubscriptionWebhookEvent(eventProductId, {
                    eventKey: webhookClaim.eventKey,
                    expectedStatuses: ['pending'],
                    statusEntry: {
                        status: 'authenticated',
                        timestamp: Timestamp.now(),
                        amount: 0,
                        currency: internalSub.currency || 'INR',
                        remark: 'Subscription mandate authenticated; billing has not started',
                    },
                    subscriptionId: requireInternalSubscriptionId(internalSub),
                    update: {
                        providerStatus: 'authenticated',
                        renewsOn: Timestamp.fromMillis(providerState.chargeAtMillis),
                        subscriptionStartDate: Timestamp.fromMillis(providerState.startAtMillis),
                        subscriptionEndDate: getSubscriptionEndDate({
                            interval: billingInterval,
                            startAtMillis: providerState.startAtMillis,
                            totalCount: providerState.totalCount,
                        }),
                        totalPaymentsNeededCount: providerState.totalCount,
                        totalPaymentsMadeCount: providerState.paidCount,
                        quantity: providerState.quantity,
                        lastWebhook: { event: event.event, timestamp: Timestamp.now() },
                    },
                });
                break;
            }

            case 'subscription.activated': {
                const subscriptionEntity = event.payload?.subscription?.entity;
                await writeLogEntry({
                    logFileName: LOG_FILE,
                    logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_ACTIVATED',
                    data: auditSummary,
                });
                if (!subscriptionEntity?.id) throw new Error('Activated webhook is missing its subscription entity.');
                if (subscriptionEntity.status !== 'active') {
                    throw new Error('Activated webhook has an invalid provider status.');
                }
                const internalSub = await getSubscription(subscriptionEntity.id);
                const providerState = resolveRazorpaySubscriptionState(subscriptionEntity, internalSub?.quantity);
                const billingInterval = subscriptionEntity.notes?.interval;
                if (
                    !internalSub
                    || !providerState
                    || (billingInterval !== 'MONTH' && billingInterval !== 'YEAR')
                ) {
                    throw new Error('Invalid activated provider subscription state.');
                }
                const statusApplication = await applyProductSubscriptionWebhookEvent(eventProductId, {
                    eventKey: webhookClaim.eventKey,
                    expectedStatuses: ['pending', 'active'],
                    statusEntry: {
                        status: 'activated',
                        timestamp: Timestamp.now(),
                        amount: 0,
                        currency: internalSub.currency || 'INR',
                        remark: 'Subscription billing cycle activated; awaiting captured-payment settlement',
                    },
                    subscriptionId: requireInternalSubscriptionId(internalSub),
                    update: {
                        capturedPaymentSyncPending: true,
                        providerStatus: 'active',
                        cycleStartDate: Timestamp.fromMillis(providerState.currentStartMillis),
                        cycleEndDate: Timestamp.fromMillis(providerState.currentEndMillis),
                        renewsOn: Timestamp.fromMillis(providerState.chargeAtMillis),
                        subscriptionStartDate: Timestamp.fromMillis(providerState.startAtMillis),
                        subscriptionEndDate: getSubscriptionEndDate({
                            interval: billingInterval,
                            startAtMillis: providerState.startAtMillis,
                            totalCount: providerState.totalCount,
                        }),
                        pastDueSinceAt: null,
                        totalPaymentsNeededCount: providerState.totalCount,
                        quantity: providerState.quantity,
                        lastWebhook: { event: event.event, timestamp: Timestamp.now() },
                    },
                });
                if (!statusApplication || (!statusApplication.applied && !statusApplication.duplicate)) break;
                if (shouldSendProductBillingMessages && statusApplication.applied) {
                    try {
                        const { sendLifecycleMessage } = await import('@lib/messaging');
                        await sendLifecycleMessage({
                            productId: eventProductId,
                            storeId: String(internalSub.storeId),
                            tenantId: String(internalSub.tenantId),
                            eventType: 'SUBSCRIPTION_ACTIVATED',
                            referenceId: `subscription-activated-${subscriptionEntity.id}`,
                            recipientEmail: internalSub.email || '',
                            storeName: internalSub.name || '',
                            metadata: { planName: internalSub.planName || 'Subscription' },
                        }).catch((notificationError) => {
                            logRazorpayNonBlockingFailure(
                                'razorpay_webhook_subscription_activated_lifecycle_message_failed',
                                notificationError,
                                {
                                    notificationEventType: 'SUBSCRIPTION_ACTIVATED',
                                    webhookEventType: event.event,
                                    productId: eventProductId,
                                    ...getBoundedRazorpayStringContext('subscriptionId', subscriptionEntity.id),
                                },
                            );
                        });
                    } catch (notificationSetupError) {
                        logRazorpayNonBlockingFailure(
                            'razorpay_webhook_subscription_activated_lifecycle_message_setup_failed',
                            notificationSetupError,
                            {
                                notificationEventType: 'SUBSCRIPTION_ACTIVATED',
                                webhookEventType: event.event,
                                productId: eventProductId,
                                ...getBoundedRazorpayStringContext('subscriptionId', subscriptionEntity.id),
                            },
                        );
                    }
                }
                break;
            }

            case 'subscription.charged': {
                const subscriptionEntity = event.payload?.subscription?.entity;
                await writeLogEntry({
                    logFileName: LOG_FILE,
                    logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_CHARGED',
                    data: auditSummary,
                });
                if (!subscriptionEntity?.id) throw new Error('Charged webhook is missing its subscription entity.');
                if (
                    !paymentEntity?.id
                    || paymentEntity.status !== 'captured'
                    || paymentEntity.subscription_id !== subscriptionEntity.id
                ) {
                    throw new Error('Subscription charge is missing captured payment evidence.');
                }
                const internalSub = await getSubscription(subscriptionEntity.id);
                const planDetails = getPlanDetailsFromConstants(subscriptionEntity.notes);
                if (!internalSub || !planDetails) {
                    throw new Error('Charged subscription cannot be resolved to a local plan.');
                }
                {
                    const chargedProviderStatus = resolveRazorpayProviderSubscriptionStatus(
                        subscriptionEntity.status,
                    );
                    const providerState = resolveRazorpaySubscriptionState(subscriptionEntity, internalSub.quantity);
                    const billingInterval = subscriptionEntity.notes?.interval;
                    if (
                        chargedProviderStatus !== 'active'
                        ||
                        !providerState
                        || (billingInterval !== 'MONTH' && billingInterval !== 'YEAR')
                    ) {
                        throw new Error('Invalid provider subscription state.');
                    }
                    const paymentMethod = {
                        type: paymentEntity?.method || "",
                        brand: paymentEntity?.card?.network || "",
                        last4: paymentEntity?.card?.last4 || "",
                        upiId: paymentEntity?.vpa || "",
                        upiTransactionId: paymentEntity?.acquirer_data?.upi_transaction_id || "",
                    };

                    const currentBillingPeriod = getProviderCycleBillingPeriodKey(providerState.currentStartSeconds);
                    if (currentBillingPeriod === null) {
                        throw new Error('Invalid provider billing cycle.');
                    }
                    const paymentHistoryId = paymentEntity.id;
                    const updatePayload: Partial<FirestoreSubscriptionDoc> = {
                        status: 'active',
                        providerStatus: chargedProviderStatus,
                        cycleStartDate: Timestamp.fromMillis(providerState.currentStartMillis),
                        cycleEndDate: Timestamp.fromMillis(providerState.currentEndMillis),
                        renewsOn: Timestamp.fromMillis(providerState.chargeAtMillis),
                        subscriptionStartDate: Timestamp.fromMillis(providerState.startAtMillis),
                        subscriptionEndDate: getSubscriptionEndDate({
                            interval: billingInterval,
                            startAtMillis: providerState.startAtMillis,
                            totalCount: providerState.totalCount,
                        }),
                        pastDueSinceAt: null,
                        totalPaymentsNeededCount: providerState.totalCount,
                        totalPaymentsMadeCount: providerState.paidCount,
                        quantity: providerState.quantity,
                        paymentMethod,
                        lastWebhook: { event: event.event, timestamp: Timestamp.now() },
                    };
                    const paymentApplication = await applyProductSubscriptionPayment(eventProductId, {
                        billingPeriod: currentBillingPeriod,
                        paymentHistoryId,
                        statusEntry: {
                            status: 'charged',
                            timestamp: Timestamp.now(),
                            amount: paymentEntity?.amount || internalSub.amount || 0,
                            currency: paymentEntity?.currency || internalSub.currency || 'INR',
                            remark: 'Subscription charged',
                        },
                        subscriptionId: requireInternalSubscriptionId(internalSub),
                        terminalSettlementPaymentId: paymentHistoryId,
                        update: updatePayload,
                    });
                    if (!paymentApplication || (!paymentApplication.applied && !paymentApplication.duplicate)) {
                        break;
                    }
                    const previousBillingHistory = Array.isArray(
                        paymentApplication.previousSubscription.billingHistory,
                    )
                        ? paymentApplication.previousSubscription.billingHistory
                        : [];
                    const isInitialCapturedPayment = previousBillingHistory.length === 0
                        || previousBillingHistory[0] === paymentHistoryId;
                    const preservesTerminalLifecycle = paymentApplication.previousSubscription.status === 'cancelled'
                        || paymentApplication.previousSubscription.status === 'completed';
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
                    let appliedSubscription = paymentApplication.subscription;
                    if (
                        replacementSubscriptionId
                        && paymentApplication.previousSubscription.carryForwardFromSubscriptionId !== replacementSubscriptionId
                    ) {
                        const replacementApplication = await finalizeProductSubscriptionReplacement({
                            newSubscriptionId: subscriptionEntity.id,
                            oldSubscriptionId: replacementSubscriptionId,
                            productId: eventProductId,
                            source: `webhook:${event.event}:replacement`,
                            storeId: Number(internalSub.storeId),
                            terminalCapturedPaymentId: preservesTerminalLifecycle
                                ? paymentHistoryId
                                : undefined,
                            tenantId: Number(internalSub.tenantId),
                        });
                        appliedSubscription = replacementApplication.newSubscription;
                    }
                    await markResellerTransactionsForProduct(requireInternalSubscriptionId(internalSub), `webhook:${event.event}`);
                    await syncSubscriptionForProduct(
                        {
                            ...appliedSubscription,
                            planId: planDetails.planId || appliedSubscription.planId,
                        } as FirestoreSubscriptionDoc,
                        `webhook:${event.event}`,
                    );
                    if (eventProductId === DEFAULT_PRODUCT_ID) {
                        await safelyRecordOwnerReferralPaymentAndRepair({
                            paidScope: {
                                tenantId: Number(internalSub.tenantId),
                                storeId: Number(internalSub.storeId),
                            },
                            evidence: {
                                paidAt: new Date(resolvePaymentOccurredAt() ?? Date.now()),
                                paymentEvidenceId: paymentHistoryId,
                                source: `webhook:${event.event}`,
                                subscriptionId: requireInternalSubscriptionId(internalSub),
                            },
                        });
                    }
                    const activatedSubscription = {
                        ...appliedSubscription,
                        id: requireInternalSubscriptionId(internalSub),
                        planId: planDetails.planId || appliedSubscription.planId,
                        status: 'active',
                    } as FirestoreSubscriptionDoc;
                    if (!preservesTerminalLifecycle && replacementSubscriptionId && replacementMrrPaise > 0) {
                        await recordFounderSubscriptionMrrChange({
                            eventKey: `${replacementSubscriptionId}:${requireInternalSubscriptionId(internalSub)}`,
                            previousMrrPaise: replacementMrrPaise,
                            productId: eventProductId,
                            requireDurableWrite: true,
                            source: `webhook:${event.event}:replacement`,
                            subscription: activatedSubscription,
                            occurredAt: providerState.currentStartMillis,
                        });
                    } else if (!preservesTerminalLifecycle && isInitialCapturedPayment) {
                        await recordFounderSubscriptionNewMrr({
                            productId: eventProductId,
                            requireDurableWrite: true,
                            source: `webhook:${event.event}`,
                            subscription: activatedSubscription,
                            occurredAt: providerState.currentStartMillis,
                        });
                    }

                    if (shouldSendProductBillingMessages && paymentApplication.applied) {
                        // 📧 LIFECYCLE MESSAGE: Payment success confirmation to store owner
                        const paymentRecovered =
                            paymentApplication.previousSubscription.status === 'past_due' ||
                            Boolean(paymentApplication.previousSubscription.pastDueSinceAt);
                        const ownerPaymentEventType = paymentRecovered ? 'PAYMENT_RECOVERED' : 'PAYMENT_SUCCESS';
                        try {
                            const { sendLifecycleMessage } = await import('@lib/messaging');
                            await sendLifecycleMessage({
                                productId: eventProductId,
                                storeId: String(internalSub.storeId),
                                tenantId: String(internalSub.tenantId),
                                eventType: ownerPaymentEventType,
                                referenceId: `payment-${paymentEntity?.id || subscriptionEntity.id}`,
                                recipientEmail: internalSub.email,
                                storeName: internalSub.name || '',
                                metadata: {
                                    amount: paymentEntity?.amount ? (paymentEntity.amount / 100) : 0,
                                    currency: paymentEntity?.currency?.toUpperCase() || internalSub.currency || 'INR',
                                    planName: internalSub.planName || 'Subscription',
                                    nextBillingAt: new Date(providerState.chargeAtMillis).toISOString(),
                                },
                            }).catch((notificationError) => {
                                logRazorpayNonBlockingFailure('razorpay_webhook_subscription_success_lifecycle_message_failed', notificationError, getWebhookNonBlockingContext({
                                    notificationEventType: ownerPaymentEventType,
                                    webhookEventType: event.event,
                                    productId: eventProductId,
                                    paymentEntity,
                                    subscription: internalSub,
                                    fallbackSubscriptionId: subscriptionEntity.id,
                                }));
                            });
                        } catch (notificationSetupError) {
                            logRazorpayNonBlockingFailure('razorpay_webhook_subscription_success_lifecycle_message_setup_failed', notificationSetupError, getWebhookNonBlockingContext({
                                notificationEventType: ownerPaymentEventType,
                                webhookEventType: event.event,
                                productId: eventProductId,
                                paymentEntity,
                                subscription: internalSub,
                                fallbackSubscriptionId: subscriptionEntity.id,
                            }));
                        }

                        // 📧 INTERNAL: Distinguish first purchase from later renewal revenue.
                        try {
                            const { sendInternalNotification } = await import('@lib/messaging');
                            const internalNotificationEvent = isInitialCapturedPayment
                                ? 'INTERNAL_SUBSCRIPTION_PURCHASED'
                                : 'INTERNAL_SUBSCRIPTION_RENEWED';
                            sendInternalNotification({
                                eventType: internalNotificationEvent,
                                storeId: String(internalSub.storeId),
                                tenantId: String(internalSub.tenantId),
                                metadata: {
                                    storeName: internalSub.name || '',
                                    planName: internalSub.planName || '',
                                    amount: paymentEntity?.amount ? (paymentEntity.amount / 100) : 0,
                                    currency: paymentEntity?.currency?.toUpperCase() || internalSub.currency || 'INR',
                                    nextBillingDate: new Date(providerState.chargeAtMillis).toLocaleDateString(),
                                    storeId: String(internalSub.storeId),
                                    tenantId: String(internalSub.tenantId),
                                },
                            }).catch((notificationError) => {
                                logRazorpayNonBlockingFailure('razorpay_webhook_subscription_success_internal_notification_failed', notificationError, getWebhookNonBlockingContext({
                                    notificationEventType: internalNotificationEvent,
                                    webhookEventType: event.event,
                                    productId: eventProductId,
                                    paymentEntity,
                                    subscription: internalSub,
                                    fallbackSubscriptionId: subscriptionEntity.id,
                                }));
                            });
                        } catch (notificationSetupError) {
                            logRazorpayNonBlockingFailure('razorpay_webhook_subscription_success_internal_notification_setup_failed', notificationSetupError, getWebhookNonBlockingContext({
                                notificationEventType: isInitialCapturedPayment
                                    ? 'INTERNAL_SUBSCRIPTION_PURCHASED'
                                    : 'INTERNAL_SUBSCRIPTION_RENEWED',
                                webhookEventType: event.event,
                                productId: eventProductId,
                                paymentEntity,
                                subscription: internalSub,
                                fallbackSubscriptionId: subscriptionEntity.id,
                            }));
                        }
                    }
                }
                break;
            }

            case 'subscription.completed': {
                const subscriptionEntity = event.payload?.subscription?.entity;
                await writeLogEntry({
                    logFileName: LOG_FILE,
                    logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_COMPLETED',
                    data: auditSummary,
                });
                if (!subscriptionEntity?.id) throw new Error('Completed webhook is missing its subscription entity.');
                const endedAtMillis = resolveRazorpayRevenueOccurredAtMillis(subscriptionEntity.ended_at);
                const internalSub = await getSubscription(subscriptionEntity.id);
                if (internalSub) {
                    const statusApplication = await applyProductSubscriptionWebhookEvent(eventProductId, {
                        eventKey: webhookClaim.eventKey,
                        nextStatus: 'completed',
                        statusEntry: {
                            status: 'completed',
                            timestamp: Timestamp.now(),
                            amount: subscriptionEntity.amount,
                            currency: subscriptionEntity.currency,
                            remark: 'Subscription completed',
                        },
                        subscriptionId: requireInternalSubscriptionId(internalSub),
                        update: {
                            providerStatus: 'completed',
                            lastWebhook: { event: event.event, timestamp: Timestamp.now() },
                            subscriptionEndDate: endedAtMillis == null ? Timestamp.now() : Timestamp.fromMillis(endedAtMillis),
                        },
                    });
                    if (!statusApplication || (!statusApplication.applied && !statusApplication.duplicate)) break;
                    await syncSubscriptionForProduct(
                        statusApplication.subscription,
                        'webhook:subscription.completed',
                    );
                    await recordFounderSubscriptionChurn({
                        productId: eventProductId,
                        requireDurableWrite: true,
                        source: 'webhook:subscription.completed',
                        subscription: statusApplication.subscription,
                        occurredAt: endedAtMillis,
                    });
                    if (shouldSendProductBillingMessages && statusApplication.applied) {
                        try {
                            const { sendLifecycleMessage } = await import('@lib/messaging');
                            await sendLifecycleMessage({
                                productId: eventProductId,
                                storeId: String(internalSub.storeId),
                                tenantId: String(internalSub.tenantId),
                                eventType: 'SUBSCRIPTION_COMPLETED',
                                referenceId: `subscription-completed-${subscriptionEntity.id}`,
                                recipientEmail: internalSub.email || '',
                                storeName: internalSub.name || '',
                                metadata: { planName: internalSub.planName || 'Subscription' },
                            }).catch((notificationError) => {
                                logRazorpayNonBlockingFailure(
                                    'razorpay_webhook_subscription_completed_lifecycle_message_failed',
                                    notificationError,
                                    {
                                        notificationEventType: 'SUBSCRIPTION_COMPLETED',
                                        webhookEventType: event.event,
                                        productId: eventProductId,
                                        ...getBoundedRazorpayStringContext('subscriptionId', subscriptionEntity.id),
                                    },
                                );
                            });
                        } catch (notificationSetupError) {
                            logRazorpayNonBlockingFailure(
                                'razorpay_webhook_subscription_completed_lifecycle_message_setup_failed',
                                notificationSetupError,
                                {
                                    notificationEventType: 'SUBSCRIPTION_COMPLETED',
                                    webhookEventType: event.event,
                                    productId: eventProductId,
                                    ...getBoundedRazorpayStringContext('subscriptionId', subscriptionEntity.id),
                                },
                            );
                        }
                    }
                }
                break;
            }

            case 'subscription.cancelled': {
                await writeLogEntry({
                    logFileName: LOG_FILE,
                    logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_CANCELLED',
                    data: auditSummary,
                });
                const cancelledSubEntity = event.payload?.subscription?.entity;
                if (!cancelledSubEntity?.id) {
                    throw new Error('Cancelled webhook is missing its subscription entity.');
                }
                {
                    const endedAtMillis = resolveRazorpayRevenueOccurredAtMillis(cancelledSubEntity.ended_at);
                    const cancelledInternalSub = await getSubscription(cancelledSubEntity.id);
                    if (cancelledInternalSub) {
                        const statusApplication = await applyProductSubscriptionWebhookEvent(eventProductId, {
                            eventKey: webhookClaim.eventKey,
                            nextStatus: 'cancelled',
                            statusEntry: {
                                status: 'cancelled',
                                timestamp: Timestamp.now(),
                                amount: cancelledInternalSub.amount,
                                currency: cancelledInternalSub.currency,
                                remark: 'Subscription cancelled by Razorpay webhook',
                            },
                            subscriptionId: requireInternalSubscriptionId(cancelledInternalSub),
                            update: {
                                providerStatus: 'cancelled',
                                lastWebhook: {
                                    event: event.event,
                                    timestamp: Timestamp.now(),
                                },
                                subscriptionEndDate: endedAtMillis == null
                                    ? (cancelledInternalSub.cycleEndDate || Timestamp.now())
                                    : Timestamp.fromMillis(endedAtMillis),
                            },
                        });
                        if (!statusApplication || (!statusApplication.applied && !statusApplication.duplicate)) break;
                        await syncSubscriptionForProduct(
                            statusApplication.subscription,
                            'webhook:subscription.cancelled',
                        );
                        await recordFounderSubscriptionChurn({
                            productId: eventProductId,
                            requireDurableWrite: true,
                            source: 'webhook:subscription.cancelled',
                            subscription: statusApplication.subscription,
                            occurredAt: endedAtMillis,
                        });
                        if (shouldSendProductBillingMessages && statusApplication.applied) {
                            try {
                                const { sendLifecycleMessage } = await import('@lib/messaging');
                                await sendLifecycleMessage({
                                    productId: eventProductId,
                                    storeId: String(cancelledInternalSub.storeId),
                                    tenantId: String(cancelledInternalSub.tenantId),
                                    eventType: 'SUBSCRIPTION_CANCELLED',
                                    referenceId: `subscription-cancelled-${requireInternalSubscriptionId(cancelledInternalSub)}`,
                                    recipientEmail: cancelledInternalSub.email || '',
                                    storeName: cancelledInternalSub.name || '',
                                    metadata: {
                                        amount: cancelledInternalSub.amount,
                                        currency: cancelledInternalSub.currency || 'INR',
                                        planName: cancelledInternalSub.planName || 'Subscription',
                                        sentAt: new Date().toISOString(),
                                    },
                                }).catch((notificationError) => {
                                    logRazorpayNonBlockingFailure('razorpay_webhook_subscription_cancelled_lifecycle_message_failed', notificationError, getWebhookNonBlockingContext({
                                        notificationEventType: 'SUBSCRIPTION_CANCELLED',
                                        webhookEventType: event.event,
                                        productId: eventProductId,
                                        subscription: cancelledInternalSub,
                                        fallbackSubscriptionId: cancelledSubEntity.id,
                                    }));
                                });
                            } catch (notificationSetupError) {
                                logRazorpayNonBlockingFailure('razorpay_webhook_subscription_cancelled_lifecycle_message_setup_failed', notificationSetupError, getWebhookNonBlockingContext({
                                    notificationEventType: 'SUBSCRIPTION_CANCELLED',
                                    webhookEventType: event.event,
                                    productId: eventProductId,
                                    subscription: cancelledInternalSub,
                                    fallbackSubscriptionId: cancelledSubEntity.id,
                                }));
                            }
                        }
                    }
                }
                break;
            }

            case 'subscription.paused': {
                const pausedSubEntity = event.payload?.subscription?.entity;
                await writeLogEntry({
                    logFileName: LOG_FILE,
                    logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_PAUSED',
                    data: auditSummary,
                });
                if (!pausedSubEntity?.id) throw new Error('Paused webhook is missing its subscription entity.');
                const pausedInternalSub = await getSubscription(pausedSubEntity.id);
                if (pausedInternalSub) {
                    const statusApplication = await applyProductSubscriptionWebhookEvent(eventProductId, {
                        eventKey: webhookClaim.eventKey,
                        nextStatus: 'paused',
                        statusEntry: {
                            status: 'paused',
                            timestamp: Timestamp.now(),
                            amount: pausedInternalSub.amount,
                            currency: pausedInternalSub.currency,
                            remark: `Subscription paused by ${pausedSubEntity.pause_initiated_by || 'system'}`,
                        },
                        subscriptionId: requireInternalSubscriptionId(pausedInternalSub),
                        update: {
                            providerStatus: 'paused',
                            lastWebhook: { event: event.event, timestamp: Timestamp.now() },
                        },
                    });
                    if (!statusApplication || (!statusApplication.applied && !statusApplication.duplicate)) break;
                    await syncSubscriptionForProduct(
                        statusApplication.subscription,
                        'webhook:subscription.paused',
                    );
                    if (shouldSendProductBillingMessages && statusApplication.applied) {
                        try {
                            const { sendLifecycleMessage } = await import('@lib/messaging');
                            await sendLifecycleMessage({
                                productId: eventProductId,
                                storeId: String(pausedInternalSub.storeId),
                                tenantId: String(pausedInternalSub.tenantId),
                                eventType: 'SUBSCRIPTION_PAUSED',
                                referenceId: `subscription-paused-${requireInternalSubscriptionId(pausedInternalSub)}`,
                                recipientEmail: pausedInternalSub.email || '',
                                storeName: pausedInternalSub.name || '',
                                metadata: {
                                    amount: pausedInternalSub.amount,
                                    currency: pausedInternalSub.currency || 'INR',
                                    planName: pausedInternalSub.planName || 'Subscription',
                                    sentAt: new Date().toISOString(),
                                },
                            }).catch((notificationError) => {
                                logRazorpayNonBlockingFailure('razorpay_webhook_subscription_paused_lifecycle_message_failed', notificationError, getWebhookNonBlockingContext({
                                    notificationEventType: 'SUBSCRIPTION_PAUSED',
                                    webhookEventType: event.event,
                                    productId: eventProductId,
                                    subscription: pausedInternalSub,
                                    fallbackSubscriptionId: pausedSubEntity.id,
                                }));
                            });
                        } catch (notificationSetupError) {
                            logRazorpayNonBlockingFailure('razorpay_webhook_subscription_paused_lifecycle_message_setup_failed', notificationSetupError, getWebhookNonBlockingContext({
                                notificationEventType: 'SUBSCRIPTION_PAUSED',
                                webhookEventType: event.event,
                                productId: eventProductId,
                                subscription: pausedInternalSub,
                                fallbackSubscriptionId: pausedSubEntity.id,
                            }));
                        }
                    }
                }
                break;
            }

            // BT7: Sync quantity from Razorpay on subscription.updated (Feature #4C-B)
            case 'subscription.updated': {
                const updatedSubEntity = event.payload?.subscription?.entity;
                await writeLogEntry({
                    logFileName: LOG_FILE,
                    logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_UPDATED',
                    data: auditSummary,
                });
                if (!updatedSubEntity?.id) throw new Error('Updated webhook is missing its subscription entity.');
                const updatedInternalSub = await getSubscription(updatedSubEntity.id);
                if (updatedInternalSub) {
                    const hasQuantity = updatedSubEntity.quantity !== undefined;
                    const quantity = hasQuantity
                        ? resolveRazorpaySubscriptionQuantity(updatedSubEntity.quantity)
                        : undefined;
                    const providerStatus = resolveRazorpayProviderSubscriptionStatus(updatedSubEntity.status);
                    if (!providerStatus || (hasQuantity && quantity == null)) {
                        throw new Error('Invalid updated provider subscription state.');
                    }
                    if (quantity != null && (updatedInternalSub.status === 'active' || updatedInternalSub.status === 'past_due')) {
                        await recordFounderSubscriptionMrrChange({
                            eventKey: webhookClaim.eventKey,
                            productId: eventProductId,
                            previousSubscription: updatedInternalSub,
                            requireDurableWrite: true,
                            source: 'webhook:subscription.updated',
                            subscription: {
                                ...updatedInternalSub,
                                quantity,
                            },
                            occurredAt: resolveRazorpayRevenueOccurredAtMillis(updatedSubEntity.updated_at),
                        });
                    }
                    const statusApplication = await applyProductSubscriptionWebhookEvent(eventProductId, {
                        eventKey: webhookClaim.eventKey,
                        subscriptionId: requireInternalSubscriptionId(updatedInternalSub),
                        update: {
                            providerStatus,
                            ...(quantity == null ? {} : { quantity }),
                            lastWebhook: { event: event.event, timestamp: Timestamp.now() },
                        },
                    });
                    if (!statusApplication || (!statusApplication.applied && !statusApplication.duplicate)) break;
                }
                break;
            }

            case 'subscription.resumed': {
                const resumedSubEntity = event.payload?.subscription?.entity;
                await writeLogEntry({
                    logFileName: LOG_FILE,
                    logType: 'RAZORPAY_WEBHOOK_SUBSCRIPTION_RESUMED',
                    data: auditSummary,
                });
                if (!resumedSubEntity?.id) throw new Error('Resumed webhook is missing its subscription entity.');
                const resumedInternalSub = await getSubscription(resumedSubEntity.id);
                if (resumedInternalSub) {
                    const hasCapturedPayment = hasVerifiedSubscriptionPaymentEvidence(resumedInternalSub);
                    const statusApplication = await applyProductSubscriptionWebhookEvent(eventProductId, {
                        eventKey: webhookClaim.eventKey,
                        expectedStatuses: ['paused', 'active'],
                        ...(hasCapturedPayment ? { nextStatus: 'active' as const } : {}),
                        statusEntry: {
                            status: 'resumed',
                            timestamp: Timestamp.now(),
                            amount: resumedInternalSub.amount,
                            currency: resumedInternalSub.currency,
                            remark: `Subscription resumed by ${resumedSubEntity.resume_initiated_by || 'system'}`,
                        },
                        subscriptionId: requireInternalSubscriptionId(resumedInternalSub),
                        update: {
                            capturedPaymentSyncPending: !hasCapturedPayment,
                            providerStatus: 'active',
                            lastWebhook: { event: event.event, timestamp: Timestamp.now() },
                        },
                    });
                    if (!statusApplication || (!statusApplication.applied && !statusApplication.duplicate)) break;
                    await syncSubscriptionForProduct(statusApplication.subscription, 'webhook:subscription.resumed');
                    if (shouldSendProductBillingMessages && statusApplication.applied) {
                        try {
                            const { sendLifecycleMessage } = await import('@lib/messaging');
                            await sendLifecycleMessage({
                                productId: eventProductId,
                                storeId: String(resumedInternalSub.storeId),
                                tenantId: String(resumedInternalSub.tenantId),
                                eventType: 'SUBSCRIPTION_RESUMED',
                                referenceId: `subscription-resumed-${requireInternalSubscriptionId(resumedInternalSub)}`,
                                recipientEmail: resumedInternalSub.email || '',
                                storeName: resumedInternalSub.name || '',
                                metadata: {
                                    amount: resumedInternalSub.amount,
                                    currency: resumedInternalSub.currency || 'INR',
                                    planName: resumedInternalSub.planName || 'Subscription',
                                    sentAt: new Date().toISOString(),
                                },
                            }).catch((notificationError) => {
                                logRazorpayNonBlockingFailure('razorpay_webhook_subscription_resumed_lifecycle_message_failed', notificationError, getWebhookNonBlockingContext({
                                    notificationEventType: 'SUBSCRIPTION_RESUMED',
                                    webhookEventType: event.event,
                                    productId: eventProductId,
                                    subscription: resumedInternalSub,
                                    fallbackSubscriptionId: resumedSubEntity.id,
                                }));
                            });
                        } catch (notificationSetupError) {
                            logRazorpayNonBlockingFailure('razorpay_webhook_subscription_resumed_lifecycle_message_setup_failed', notificationSetupError, getWebhookNonBlockingContext({
                                notificationEventType: 'SUBSCRIPTION_RESUMED',
                                webhookEventType: event.event,
                                productId: eventProductId,
                                subscription: resumedInternalSub,
                                fallbackSubscriptionId: resumedSubEntity.id,
                            }));
                        }
                    }
                }
                break;
            }

            default:
                await writeLogEntry({
                    logFileName: LOG_FILE,
                    logType: 'RAZORPAY_WEBHOOK_UNHANDLED_EVENT',
                    data: auditSummary,
                });
                break;
        }

        // 3. Acknowledge receipt to Razorpay to prevent retries.
        const completionOutcome = await completeRazorpayWebhookEvent({
            attemptId: webhookAttemptId,
            data: sanitizeForAdminFirestore({
                transactionType: eventPayloadToUpload.transactionType || null,
                productId: eventProductId,
                tenantId: eventPayloadToUpload.tenantId ?? null,
                storeId: eventPayloadToUpload.storeId ?? null,
            }),
            eventKey: webhookClaim.eventKey,
            status: 'processed',
        });
        if (completionOutcome === 'ownership_lost') return retryableWebhookResponse();
        return NextResponse.json({ status: 'ok' });

    } catch (error) {
        const failureData = getRazorpayFailureLogData('razorpay_webhook_processing_failed', error, {
            eventType: event?.event,
            api: 'razorpay-webhook'
        });
        logger.error('Webhook processing failed', new Error('razorpay_webhook_processing_failed'), failureData);

        let failureCompletionOutcome: Awaited<ReturnType<typeof completeRazorpayWebhookEvent>> | null = null;
        await completeRazorpayWebhookEvent({
            attemptId: webhookAttemptId,
            data: sanitizeForAdminFirestore({
                eventType: event?.event || null,
                productId: eventProductId,
                tenantId: event?.tenantId ?? null,
                storeId: event?.storeId ?? null,
                ...failureData,
            }),
            eventKey: webhookClaim.eventKey,
            status: 'failed',
        }).then((outcome) => {
            failureCompletionOutcome = outcome;
        }).catch((markError) => {
            logRazorpayNonBlockingFailure('razorpay_webhook_failed_status_mark_failed', markError, {
                ...getWebhookNonBlockingContext({
                    webhookEventType: event?.event,
                    productId: eventProductId,
                    tenantId: event?.tenantId,
                    storeId: event?.storeId,
                }),
                ...getBoundedRazorpayStringContext('eventKey', webhookClaim.eventKey),
            });
        });

        if (failureCompletionOutcome === 'already_processed') {
            return NextResponse.json({ status: 'duplicate' });
        }
        if (failureCompletionOutcome === 'ownership_lost') {
            return retryableWebhookResponse();
        }

        // 🚨 CRITICAL ALERT: Webhook processing failure = potential payment state inconsistency
        try {
            const { createAlert } = await import('@lib/ops/alerts');
            const { PLATFORM_NOTIFICATION_TRIGGER_TYPES } = await import('@data/shared/platformNotificationRegistry');
            await createAlert({
                severity: 'critical',
                title: `Razorpay Webhook FAILED: ${event?.event || 'unknown'}`,
                message: 'Webhook processing crashed. Payment state may be inconsistent. See bounded Razorpay webhook diagnostics.',
                sId: event?.storeId ? String(event.storeId) : undefined,
                tId: event?.tenantId ? String(event.tenantId) : undefined,
                triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.PAYMENT_WEBHOOK_FAILURE,
                productId: eventProductId,
                category: 'payments',
                metadata: {
                    eventType: event?.event || 'unknown',
                    ...getBoundedRazorpayStringContext('storeId', event?.storeId),
                    ...getBoundedRazorpayStringContext('tenantId', event?.tenantId),
                    ...getRazorpayFailureLogData('razorpay_webhook_processing_failed', error),
                },
            }, {
                documentId: getWebhookAlertDocumentId('processing-failure', webhookClaim.eventKey),
            });
        } catch (alertError) {
            logRazorpayNonBlockingFailure('razorpay_webhook_processing_alert_failed', alertError, getWebhookNonBlockingContext({
                webhookEventType: event?.event,
                productId: eventProductId,
                tenantId: event?.tenantId,
                storeId: event?.storeId,
            }));
        }

        return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
    }
}
