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

const toMilliseconds = (value: unknown): number | null => {
    try {
        let candidate: Date | null = null;
        if (value instanceof Date) {
            candidate = value;
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            const record = value as Record<string, unknown>;
            if (typeof record.toMillis === 'function') {
                const millis = (record.toMillis as (this: unknown) => unknown).call(value);
                candidate = typeof millis === 'number' ? new Date(millis) : null;
            } else if (typeof record.toDate === 'function') {
                const date = (record.toDate as (this: unknown) => unknown).call(value);
                candidate = date instanceof Date ? date : null;
            } else {
                const seconds = typeof record.seconds === 'number'
                    ? record.seconds
                    : typeof record._seconds === 'number'
                        ? record._seconds
                        : null;
                if (seconds !== null) candidate = new Date(seconds * 1000);
            }
        } else if (typeof value === 'number' || (typeof value === 'string' && value.trim() === value && value !== '')) {
            const parsed = Number(value);
            if (Number.isFinite(parsed) && parsed > 0) {
                candidate = new Date(parsed > 99_999_999_999 ? parsed : parsed * 1000);
            }
        }
        return candidate && Number.isFinite(candidate.getTime()) ? candidate.getTime() : null;
    } catch {
        return null;
    }
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
                const date = toMilliseconds(payment.created_at);
                if (date === null) return null;
                const startSeconds = asNumber(subscription.current_start, 0);
                const endSeconds = asNumber(subscription.current_end, 0);

                return {
                    id: String(payment.id || event.id),
                    type: 'Subscription Payment',
                    date,
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
                const date = toMilliseconds(payment.created_at);

                if (date === null || (!orderNotes.packId && !orderNotes.packName && !orderNotes.creditAmount)) {
                    return null;
                }

                return {
                    id: String(payment.id || event.orderId || event.id),
                    type: 'Enhancement Pack',
                    date,
                    description: payment.description || orderNotes.packName || 'Enhancement Pack',
                    amount: payment.amount,
                    currency: payment.currency,
                    status: payment.status,
                    invoiceId: payment.invoice_id,
                    invoiceUrl: event.invoiceUrl,
                    credits: orderNotes.creditAmount || undefined,
                };
            }

            if (event.event === 'owner_referral.reward_issued' && event.transactionType === 'reward_credit') {
                const credits = asNumber(event.credits ?? event.creditAmount, 0);
                const date = toMilliseconds(event.created_at);
                if (credits <= 0 || date === null) return null;

                return {
                    id: String(event.id || event.rewardIssueId),
                    type: 'Referral reward',
                    date,
                    description: 'Owner referral reward',
                    amount: 0,
                    currency: 'CREDITS',
                    status: String(event.status || 'credited'),
                    credits,
                };
            }

            return null;
        })
        .filter((item): item is BillingHistoryItem => Boolean(item));
};
