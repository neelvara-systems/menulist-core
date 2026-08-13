import { PRODUCT_IDS } from '@constant/product';
import { getNonNegativeCreditInteger } from '@data/shared/aiCreditScalarContract';
import { hasVerifiedSubscriptionPaymentEvidence } from '@lib/billing/subscriptionPlanEntitlement';
import type {
    Currency,
    FirestoreSubscriptionDoc,
    PaymentStatus,
    PlanInterval,
} from '@type/razorpay';

const SUBSCRIPTION_STATUSES = new Set<PaymentStatus>([
    'pending',
    'active',
    'cancelled',
    'expired',
    'paid',
    'failed',
    'past_due',
    'paused',
    'completed',
]);
const PLAN_INTERVALS = new Set<PlanInterval>(['MONTH', 'YEAR']);
const CURRENCIES = new Set<Currency>(['INR', 'USD']);
const MAX_BOUNDED_STRING_LENGTH = 512;
const MAX_SUBSCRIPTION_QUANTITY = 31;
const MAX_SUBSCRIPTION_STATUS_HISTORY = 100;
const MAX_SUBSCRIPTION_BILLING_HISTORY = 250;

const getPlainDataRecord = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    try {
        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) return null;
        const descriptors = Object.getOwnPropertyDescriptors(value);
        if (Object.values(descriptors).some((descriptor) => descriptor.get || descriptor.set)) return null;
        return Object.fromEntries(
            Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]),
        );
    } catch {
        return null;
    }
};

const readBoundedString = (
    value: unknown,
    fallback: string,
): string | null => {
    if (value === undefined || value === null) return fallback;
    return typeof value === 'string' && value.length <= MAX_BOUNDED_STRING_LENGTH
        ? value
        : null;
};

const readExactNonNegativeInteger = (
    value: unknown,
    fallback: number,
): number | null => {
    if (value === undefined || value === null) return fallback;
    return getNonNegativeCreditInteger(value);
};

const readExactPositiveQuantity = (value: unknown): number | null => {
    if (value === undefined || value === null) return 1;
    return typeof value === 'number'
        && Number.isSafeInteger(value)
        && value >= 1
        && value <= MAX_SUBSCRIPTION_QUANTITY
        ? value
        : null;
};

const readOptionalTimestamp = <T>(value: T | null | undefined): T | null => (
    value === undefined || value === null
        ? null
        : getAnswerlatticeSubscriptionTimestampMillis(value) === null
            ? null
            : value
);

const readPaymentMethod = (
    value: unknown,
): FirestoreSubscriptionDoc['paymentMethod'] | undefined => {
    if (value === undefined || value === null) return null;
    const record = getPlainDataRecord(value);
    if (!record) return undefined;
    const type = readBoundedString(record.type, '');
    const brand = readBoundedString(record.brand, '');
    const last4 = readBoundedString(record.last4, '');
    const upiId = readBoundedString(record.upiId, '');
    const upiTransactionId = readBoundedString(record.upiTransactionId, '');
    if (
        type === null
        || brand === null
        || last4 === null
        || upiId === null
        || upiTransactionId === null
    ) return undefined;
    return { type, brand, last4, upiId, upiTransactionId };
};

const readStatusHistory = (
    value: unknown,
): FirestoreSubscriptionDoc['statuses'] | null => {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value) || value.length > MAX_SUBSCRIPTION_STATUS_HISTORY) return null;
    const projected: FirestoreSubscriptionDoc['statuses'] = [];
    for (const item of value) {
        const record = getPlainDataRecord(item);
        if (!record) return null;
        const status = readBoundedString(record.status, '');
        const amount = readExactNonNegativeInteger(record.amount, 0);
        const currency = readBoundedString(record.currency, '');
        const remark = readBoundedString(record.remark, '');
        if (
            status === null
            || amount === null
            || currency === null
            || remark === null
            || getAnswerlatticeSubscriptionTimestampMillis(record.timestamp) === null
        ) return null;
        projected.push({
            status,
            timestamp: record.timestamp as FirestoreSubscriptionDoc['statuses'][number]['timestamp'],
            amount,
            currency,
            remark,
        });
    }
    return projected;
};

const readBillingHistory = (value: unknown): string[] | null => {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value) || value.length > MAX_SUBSCRIPTION_BILLING_HISTORY) return null;
    return value.every((item) => (
        typeof item === 'string' && item.length <= MAX_BOUNDED_STRING_LENGTH
    ))
        ? [...value]
        : null;
};

export const getAnswerlatticeSubscriptionTimestampMillis = (
    value: unknown,
): number | null => {
    if (value === undefined || value === null) return null;
    try {
        if (value instanceof Date) {
            const millis = Date.prototype.getTime.call(value);
            return Number.isFinite(millis) && millis >= 0 ? millis : null;
        }
        if (typeof value !== 'object' || Array.isArray(value)) return null;
        const descriptors = Object.getOwnPropertyDescriptors(value);
        if (Object.values(descriptors).some((descriptor) => descriptor.get || descriptor.set)) return null;
        const seconds = descriptors.seconds?.value ?? descriptors._seconds?.value;
        const nanoseconds = descriptors.nanoseconds?.value
            ?? descriptors._nanoseconds?.value
            ?? 0;
        if (
            typeof seconds !== 'number'
            || !Number.isSafeInteger(seconds)
            || seconds < 0
            || typeof nanoseconds !== 'number'
            || !Number.isSafeInteger(nanoseconds)
            || nanoseconds < 0
            || nanoseconds >= 1_000_000_000
        ) return null;

        const millis = (seconds * 1000) + Math.floor(nanoseconds / 1_000_000);
        return Number.isSafeInteger(millis) ? millis : null;
    } catch {
        return null;
    }
};

export const projectAnswerlatticeSubscriptionForRead = (
    value: unknown,
    id: string,
    tenantId: number,
    storeId: number,
): FirestoreSubscriptionDoc | null => {
    const record = getPlainDataRecord(value);
    if (!record) return null;
    if (
        record.pId !== PRODUCT_IDS.ANSWERLATTICE
        || record.productId !== PRODUCT_IDS.ANSWERLATTICE
        || record.tId !== tenantId
        || record.tenantId !== tenantId
        || record.sId !== storeId
        || record.storeId !== storeId
    ) return null;

    const status = record.status;
    const planType = record.planType ?? 'MONTH';
    const currency = record.currency ?? 'INR';
    if (
        typeof status !== 'string'
        || !SUBSCRIPTION_STATUSES.has(status as PaymentStatus)
        || typeof planType !== 'string'
        || !PLAN_INTERVALS.has(planType as PlanInterval)
        || typeof currency !== 'string'
        || !CURRENCIES.has(currency as Currency)
    ) return null;

    const amount = readExactNonNegativeInteger(record.amount, 0);
    const quantity = readExactPositiveQuantity(record.quantity);
    const monthlyCreditsAllowance = readExactNonNegativeInteger(record.monthlyCreditsAllowance, 0);
    const monthlyCredits = readExactNonNegativeInteger(record.monthlyCredits, 0);
    const topUpCredits = readExactNonNegativeInteger(record.topUpCredits, 0);
    const totalPaymentsNeededCount = readExactNonNegativeInteger(record.totalPaymentsNeededCount, 0);
    const totalPaymentsMadeCount = readExactNonNegativeInteger(record.totalPaymentsMadeCount, 0);
    const providerSubscriptionId = readBoundedString(
        record.providerSubscriptionId ?? record.id,
        id,
    );
    const planName = readBoundedString(record.planName, 'Answerlattice Plan');
    const planId = readBoundedString(record.planId, '');
    const shortUrl = readBoundedString(record.shortUrl, '');
    const userId = readBoundedString(record.userId, '');
    const name = readBoundedString(record.name, '');
    const email = readBoundedString(record.email, '');
    const providerPlanId = readBoundedString(record.providerPlanId, planId ?? '');
    const paymentMethod = readPaymentMethod(record.paymentMethod);
    const statuses = readStatusHistory(record.statuses);
    const billingHistory = readBillingHistory(record.billingHistory);
    if (
        amount === null
        || quantity === null
        || monthlyCreditsAllowance === null
        || monthlyCredits === null
        || topUpCredits === null
        || totalPaymentsNeededCount === null
        || totalPaymentsMadeCount === null
        || providerSubscriptionId === null
        || planName === null
        || planId === null
        || shortUrl === null
        || userId === null
        || name === null
        || email === null
        || providerPlanId === null
        || paymentMethod === undefined
        || statuses === null
        || billingHistory === null
        || totalPaymentsMadeCount > totalPaymentsNeededCount
    ) return null;

    const cycleStartDate = readOptionalTimestamp(record.cycleStartDate);
    const cycleEndDate = readOptionalTimestamp(record.cycleEndDate);
    const renewsOn = readOptionalTimestamp(record.renewsOn);
    const subscriptionStartDate = readOptionalTimestamp(record.subscriptionStartDate);
    const subscriptionEndDate = readOptionalTimestamp(record.subscriptionEndDate);
    const pastDueSinceAt = readOptionalTimestamp(record.pastDueSinceAt);
    const currentPeriodEnd = readOptionalTimestamp(record.currentPeriodEnd);
    for (const [rawValue, projectedValue] of [
        [record.cycleStartDate, cycleStartDate],
        [record.cycleEndDate, cycleEndDate],
        [record.renewsOn, renewsOn],
        [record.subscriptionStartDate, subscriptionStartDate],
        [record.subscriptionEndDate, subscriptionEndDate],
        [record.pastDueSinceAt, pastDueSinceAt],
        [record.currentPeriodEnd, currentPeriodEnd],
    ]) {
        if (rawValue !== undefined && rawValue !== null && projectedValue === null) return null;
    }

    return {
        ...record,
        id,
        providerSubscriptionId,
        providerPlanId,
        paymentProvider: 'razorpay',
        pId: PRODUCT_IDS.ANSWERLATTICE,
        productId: PRODUCT_IDS.ANSWERLATTICE,
        tId: tenantId,
        sId: storeId,
        tenantId,
        storeId,
        userId,
        name,
        email,
        userType: record.userType === 'B2C' ? 'B2C' : 'B2B',
        status: status as PaymentStatus,
        planName,
        planId,
        planType: planType as PlanInterval,
        amount,
        currency: currency as Currency,
        cycleStartDate: cycleStartDate as FirestoreSubscriptionDoc['cycleStartDate'],
        cycleEndDate: cycleEndDate as FirestoreSubscriptionDoc['cycleEndDate'],
        renewsOn: renewsOn as FirestoreSubscriptionDoc['renewsOn'],
        subscriptionStartDate: subscriptionStartDate as FirestoreSubscriptionDoc['subscriptionStartDate'],
        subscriptionEndDate: subscriptionEndDate as FirestoreSubscriptionDoc['subscriptionEndDate'],
        pastDueSinceAt: pastDueSinceAt as FirestoreSubscriptionDoc['pastDueSinceAt'],
        ...(currentPeriodEnd === null ? {} : { currentPeriodEnd }),
        quantity,
        monthlyCreditsAllowance,
        monthlyCredits,
        topUpCredits,
        totalPaymentsNeededCount,
        totalPaymentsMadeCount,
        shortUrl,
        paymentMethod,
        statuses,
        billingHistory,
    } as FirestoreSubscriptionDoc;
};

export const isAnswerlatticeSubscriptionCurrent = (
    subscription: FirestoreSubscriptionDoc,
    nowMs = Date.now(),
): boolean => {
    if (!Number.isFinite(nowMs) || nowMs < 0) return false;
    if (['pending', 'paused', 'past_due'].includes(subscription.status)) return true;
    const endValues = [
        subscription.cycleEndDate,
        subscription.subscriptionEndDate,
        (subscription as FirestoreSubscriptionDoc & { currentPeriodEnd?: unknown }).currentPeriodEnd,
    ].filter((value) => value !== undefined && value !== null);
    const endMillis = endValues
        .map(getAnswerlatticeSubscriptionTimestampMillis)
        .filter((value): value is number => value !== null);
    const effectiveEndMs = endMillis.length ? Math.min(...endMillis) : null;
    if (subscription.status === 'active') {
        return effectiveEndMs === null || effectiveEndMs >= nowMs;
    }
    return subscription.status === 'cancelled'
        && effectiveEndMs !== null
        && effectiveEndMs >= nowMs;
};

export const projectActiveAnswerlatticeSubscriptionForRead = (
    value: unknown,
    id: string,
    tenantId: number,
    storeId: number,
    nowMs = Date.now(),
): FirestoreSubscriptionDoc | null => {
    const subscription = projectAnswerlatticeSubscriptionForRead(
        value,
        id,
        tenantId,
        storeId,
    );
    return subscription?.status === 'active'
        && hasVerifiedSubscriptionPaymentEvidence(subscription)
        && isAnswerlatticeSubscriptionCurrent(subscription, nowMs)
        ? subscription
        : null;
};
