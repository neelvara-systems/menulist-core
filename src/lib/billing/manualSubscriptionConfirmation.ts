import { DEFAULT_PRODUCT_ID } from '@constant/product';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { normalizeBillingSubscriptionScopeDocumentId } from './subscriptionDocumentIdBoundary';

const MAX_MANUAL_PAYMENT_STATUS_HISTORY = 200;
const MAX_MANUAL_PAYMENT_PLAN_ID_LENGTH = 160;

type ManualSubscriptionConfirmationScope = {
    amount: number;
    currency: 'INR';
    planId: string | null;
    statuses: unknown[];
    storeId: number;
    tenantId: number;
};

export type ManualSubscriptionConfirmationAdmission =
    | ({ kind: 'already_confirmed' } & ManualSubscriptionConfirmationScope)
    | ({ kind: 'eligible' } & ManualSubscriptionConfirmationScope)
    | { kind: 'forbidden' }
    | { kind: 'invalid_state' }
    | { kind: 'malformed' }
    | { kind: 'wrong_mode' };

const isUnknownRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeOptionalProductId = (value: unknown): string | null | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized === value && normalized ? normalized : null;
};

const normalizeOptionalPlanId = (value: unknown): string | null | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (
        normalized !== value
        || !normalized
        || normalized.length > MAX_MANUAL_PAYMENT_PLAN_ID_LENGTH
        || /[\u0000-\u001f\u007f]/.test(normalized)
    ) {
        return null;
    }
    return normalized;
};

const normalizeRequiredScopeAliases = (
    primary: unknown,
    compact: unknown,
): { numericId: number } | null => {
    const primaryScope = primary === undefined || primary === null
        ? undefined
        : normalizeBillingSubscriptionScopeDocumentId(primary);
    const compactScope = compact === undefined || compact === null
        ? undefined
        : normalizeBillingSubscriptionScopeDocumentId(compact);
    if (primaryScope === null || compactScope === null) return null;
    const resolved = primaryScope || compactScope;
    if (!resolved) return null;
    if (primaryScope && compactScope && primaryScope.numericId !== compactScope.numericId) return null;
    return { numericId: resolved.numericId };
};

export function admitManualSubscriptionConfirmation(params: {
    actorId: string;
    isPlatformUser: boolean;
    subscriptionData: unknown;
}): ManualSubscriptionConfirmationAdmission {
    if (!isUnknownRecord(params.subscriptionData)) return { kind: 'malformed' };
    if (!isValidFirestoreDocumentId(params.actorId) || params.actorId.trim() !== params.actorId) {
        return { kind: 'forbidden' };
    }

    const data = params.subscriptionData;
    const resellerId = typeof data.resellerId === 'string' ? data.resellerId : '';
    if (
        !isValidFirestoreDocumentId(resellerId)
        || resellerId.trim() !== resellerId
        || (!params.isPlatformUser && resellerId !== params.actorId)
    ) {
        return { kind: 'forbidden' };
    }

    const productId = normalizeOptionalProductId(data.productId);
    const compactProductId = normalizeOptionalProductId(data.pId);
    if (
        productId === null
        || compactProductId === null
        || (productId && compactProductId && productId !== compactProductId)
        || (productId ?? compactProductId ?? DEFAULT_PRODUCT_ID) !== DEFAULT_PRODUCT_ID
    ) {
        return { kind: 'malformed' };
    }

    if (data.billingMode !== 'manual') return { kind: 'wrong_mode' };

    const tenantScope = normalizeRequiredScopeAliases(data.tenantId, data.tId);
    const storeScope = normalizeRequiredScopeAliases(data.storeId, data.sId);
    const amount = data.amount;
    const currency = data.currency;
    const planId = normalizeOptionalPlanId(data.planId);
    const statuses = data.statuses === undefined || data.statuses === null
        ? []
        : data.statuses;
    if (
        !tenantScope
        || !storeScope
        || typeof amount !== 'number'
        || !Number.isSafeInteger(amount)
        || amount < 0
        || currency !== 'INR'
        || planId === null
        || !Array.isArray(statuses)
        || statuses.length >= MAX_MANUAL_PAYMENT_STATUS_HISTORY
    ) {
        return { kind: 'malformed' };
    }

    const normalized = {
        amount,
        currency,
        planId: planId ?? null,
        statuses: [...statuses],
        storeId: storeScope.numericId,
        tenantId: tenantScope.numericId,
    } satisfies ManualSubscriptionConfirmationScope;

    if (data.status === 'active' && data.manualPaymentConfirmed === true) {
        return { kind: 'already_confirmed', ...normalized };
    }
    if (data.status !== 'pending' || data.manualPaymentConfirmed === true) {
        return { kind: 'invalid_state' };
    }
    if (data.manualPaymentConfirmed !== undefined && data.manualPaymentConfirmed !== null && data.manualPaymentConfirmed !== false) {
        return { kind: 'malformed' };
    }

    return { kind: 'eligible', ...normalized };
}
