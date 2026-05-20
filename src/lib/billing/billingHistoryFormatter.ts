import { aiEnhancementPacksList } from '@data/PlatformPlansList';
import { BillingHistoryItem } from '@type/razorpay';

type BillingHistoryRawEvent = Record<string, any>;

interface BillingHistoryFormatOptions {
    formatBillingCycle?: (startSeconds: number, endSeconds: number, event: BillingHistoryRawEvent) => string | undefined;
}

const asRecord = (value: unknown): Record<string, any> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, any>;
};

const asNumber = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const toMilliseconds = (value: unknown): number => {
    const parsed = asNumber(value, 0);
    if (!parsed) return Date.now();
    return parsed > 9999999999 ? parsed : parsed * 1000;
};

const getPaymentEntity = (event: BillingHistoryRawEvent) => {
    const payload = asRecord(event.payload);
    const payment = asRecord(asRecord(payload.payment).entity);

    return {
        id: payment.id || event.paymentId || event.providerPaymentId || event.id,
        amount: asNumber(payment.amount ?? event.amount, 0),
        currency: String(payment.currency || event.currency || 'INR').toUpperCase(),
        description: payment.description || event.description,
        invoice_id: payment.invoice_id || event.invoiceId,
        status: payment.status || event.status || 'paid',
        created_at: payment.created_at || event.created_at,
    };
};

const getSubscriptionEntity = (event: BillingHistoryRawEvent) => {
    const payload = asRecord(event.payload);
    const subscription = asRecord(asRecord(payload.subscription).entity);

    return {
        current_start: subscription.current_start || event.current_start || event.created_at,
        current_end: subscription.current_end || event.current_end || event.created_at,
    };
};

const getOrderNotes = (event: BillingHistoryRawEvent) => {
    const payload = asRecord(event.payload);
    const order = asRecord(asRecord(payload.order).entity);
    const notes = asRecord(order.notes);
    const packId = notes.packId || event.packId;
    const packName = notes.packName || event.packName;
    const configuredPack = aiEnhancementPacksList.find((pack) => (
        pack.packId === packId
        || pack.name === packName
        || pack.priceINR?.price === asNumber(event.amount, -1)
        || pack.priceUSD?.price === asNumber(event.amount, -1)
    ));

    return {
        packId,
        packName,
        creditAmount: asNumber(notes.creditAmount ?? event.creditAmount, 0) || configuredPack?.creditAmount || 0,
    };
};

export const formatBillingHistoryEvents = (
    rawHistory: BillingHistoryRawEvent[],
    options: BillingHistoryFormatOptions = {},
): BillingHistoryItem[] => {
    return rawHistory
        .map((event): BillingHistoryItem | null => {
            if (event.event === 'subscription.charged') {
                const payment = getPaymentEntity(event);
                const subscription = getSubscriptionEntity(event);
                const startSeconds = asNumber(subscription.current_start, 0);
                const endSeconds = asNumber(subscription.current_end, 0);

                return {
                    id: String(payment.id || event.id),
                    type: 'Subscription Payment',
                    date: toMilliseconds(payment.created_at),
                    description: payment.description || 'Subscription Payment',
                    amount: payment.amount,
                    currency: payment.currency,
                    status: payment.status,
                    invoiceId: payment.invoice_id,
                    invoiceUrl: event.invoiceUrl,
                    billingCycle: options.formatBillingCycle?.(startSeconds, endSeconds, event),
                };
            }

            if (event.event === 'order.paid' && event.transactionType === 'topup') {
                const payment = getPaymentEntity(event);
                const orderNotes = getOrderNotes(event);

                if (!orderNotes.packId && !orderNotes.packName && !orderNotes.creditAmount) {
                    return null;
                }

                return {
                    id: String(payment.id || event.orderId || event.id),
                    type: 'Enhancement Pack',
                    date: toMilliseconds(payment.created_at),
                    description: payment.description || orderNotes.packName || 'Enhancement Pack',
                    amount: payment.amount,
                    currency: payment.currency,
                    status: payment.status,
                    invoiceId: payment.invoice_id,
                    invoiceUrl: event.invoiceUrl,
                    credits: orderNotes.creditAmount || undefined,
                };
            }

            return null;
        })
        .filter((item): item is BillingHistoryItem => Boolean(item));
};
