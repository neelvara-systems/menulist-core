import { getAnswerlatticePlanById } from '@data/answerlattice/plans';
import { normalizeRazorpaySubscriptionCheckoutUrl } from '@lib/razorpay/checkoutUrl';

export type AnswerlatticeOnboardingCurrency = 'INR' | 'USD';

export interface AnswerlatticeOnboardResult {
    apiKey: string | null;
    billing: {
        amount: number;
        currency: AnswerlatticeOnboardingCurrency;
        interval: 'MONTH';
    };
    recovered: boolean;
    subscription: {
        id: string;
        shortUrl: string | null;
        status: 'created' | 'pending';
    };
    plan: { id: string; name: string; isBeta: false };
    widgetKeyNeedsRotation: boolean;
    workspaceCreated: true;
}

const ANSWERLATTICE_WIDGET_KEY_PATTERN = /^al_[A-Za-z0-9_-]{20,128}$/;
const ANSWERLATTICE_SUBSCRIPTION_ID_PATTERN = /^[A-Za-z0-9_-]{3,160}$/;

const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

/**
 * Projects the one-time onboarding acknowledgement into current plan,
 * financial, provider-checkout, and widget-key truth before the browser can
 * display success.
 */
export function normalizeAnswerlatticeOnboardResult(
    value: unknown,
): AnswerlatticeOnboardResult | null {
    if (!isPlainRecord(value) || value.workspaceCreated !== true) return null;
    if (
        typeof value.recovered !== 'boolean'
        || typeof value.widgetKeyNeedsRotation !== 'boolean'
        || !isPlainRecord(value.billing)
        || !isPlainRecord(value.plan)
        || !isPlainRecord(value.subscription)
    ) return null;

    const currency = value.billing.currency;
    if (currency !== 'INR' && currency !== 'USD') return null;
    if (value.billing.interval !== 'MONTH') return null;
    if (typeof value.plan.id !== 'string') return null;
    const plan = getAnswerlatticePlanById(value.plan.id, 'MONTH');
    if (!plan || value.plan.name !== plan.name || value.plan.isBeta !== false) return null;

    const expectedAmount = currency === 'USD'
        ? plan.priceUSD.price
        : plan.priceINR.price;
    if (
        !Number.isSafeInteger(value.billing.amount)
        || value.billing.amount !== expectedAmount
    ) return null;

    const apiKey = typeof value.apiKey === 'string' ? value.apiKey.trim() : null;
    if (
        value.widgetKeyNeedsRotation
            ? value.apiKey !== null
            : !apiKey
                || value.apiKey !== apiKey
                || !ANSWERLATTICE_WIDGET_KEY_PATTERN.test(apiKey)
    ) return null;

    const subscriptionId = typeof value.subscription.id === 'string'
        ? value.subscription.id.trim()
        : '';
    if (
        value.subscription.id !== subscriptionId
        || !ANSWERLATTICE_SUBSCRIPTION_ID_PATTERN.test(subscriptionId)
    ) return null;
    if (value.subscription.status !== 'created' && value.subscription.status !== 'pending') {
        return null;
    }
    const shortUrl = value.subscription.shortUrl === undefined
        || value.subscription.shortUrl === null
        ? null
        : normalizeRazorpaySubscriptionCheckoutUrl(value.subscription.shortUrl);
    if (
        value.subscription.shortUrl !== undefined
        && value.subscription.shortUrl !== null
        && shortUrl === null
    ) return null;

    return {
        apiKey,
        billing: {
            amount: expectedAmount,
            currency,
            interval: 'MONTH',
        },
        recovered: value.recovered,
        subscription: {
            id: subscriptionId,
            shortUrl,
            status: value.subscription.status,
        },
        plan: {
            id: plan.planId,
            name: plan.name,
            isBeta: false,
        },
        widgetKeyNeedsRotation: value.widgetKeyNeedsRotation,
        workspaceCreated: true,
    };
}
