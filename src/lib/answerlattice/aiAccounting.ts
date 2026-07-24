import { getUnitCost, isFreeTierAction } from '@constant/AI/unitCosts';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    normalizeAnswerlatticeBillingScopeDocumentId,
    normalizeAnswerlatticeSubscriptionId,
} from '@lib/answerlattice/billingDocumentIdBoundary';
import { isAnswerlatticeSubscriptionInScope } from '@lib/answerlattice/billingScopeBoundary';
import { AiOperationLogInput, buildAiOperationLog, recordAiOperation } from '@lib/ai/operationLog';
import { getAnswerlatticeScopeLogContext, getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import {
    getActiveProductSubscriptionForStore,
} from '@lib/billing/productBillingServer';
import { getBillingPeriodKey } from '@lib/billing/billingPeriod';
import {
    getCreditBillingPeriodKey,
    getNonNegativeCreditInteger,
    getPositiveCreditInteger,
} from '@data/shared/aiCreditScalarContract';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';
import { createHash } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export type AnswerlatticeAiScope = {
    tId: number;
    sId: number;
};

export type AnswerlatticeAiActor = {
    id?: string | number | null;
    name?: string | null;
    email?: string | null;
};

export type AnswerlatticeRemainingBalance = {
    monthlyCreditsBefore?: number;
    topUpCreditsBefore?: number;
    totalCreditsBefore?: number;
    monthlyCreditsDebited?: number;
    topUpCreditsDebited?: number;
    monthlyCredits: number;
    topUpCredits: number;
    totalCreditsAfter?: number;
};

export type AnswerlatticeCapacityCheckResult = {
    allowed: boolean;
    reason?: 'free' | 'sufficient' | 'exhausted' | 'no_subscription';
    remaining: number;
    subscription: FirestoreSubscriptionDoc | null;
    unitsRequired: number;
};

export type AnswerlatticeAiCapacityReservation = {
    action: string;
    accountingIdempotencyHash: string;
    operationId: string;
    remainingBalance: AnswerlatticeRemainingBalance;
    scope: AnswerlatticeAiScope;
    subscriptionId: string;
    unitsReserved: number;
};

export class AnswerlatticeAiCapacityExceededError extends Error {
    readonly remaining: number;
    readonly required: number;

    constructor(remaining: number, required: number) {
        const normalizedRemaining = getNonNegativeCreditInteger(remaining);
        const normalizedRequired = getPositiveCreditInteger(required);
        if (normalizedRemaining === null || normalizedRequired === null) {
            throw new Error('Answerlattice AI capacity evidence is invalid.');
        }
        super('Not enough Answerlattice support credits for this operation.');
        this.name = 'AnswerlatticeAiCapacityExceededError';
        Object.setPrototypeOf(this, new.target.prototype);
        this.remaining = normalizedRemaining;
        this.required = normalizedRequired;
    }
}

export const isAnswerlatticeAiCapacityExceededError = (
    error: unknown,
): error is AnswerlatticeAiCapacityExceededError => (
    error instanceof AnswerlatticeAiCapacityExceededError
    || Boolean(
        error
        && typeof error === 'object'
        && (error as { name?: unknown }).name === 'AnswerlatticeAiCapacityExceededError'
        && getNonNegativeCreditInteger((error as { remaining?: unknown }).remaining) !== null
        && getPositiveCreditInteger((error as { required?: unknown }).required) !== null,
    )
);

type FinalizeAnswerlatticeAiAccountingParams = {
    actor?: AnswerlatticeAiActor | null;
    capacitySubscription?: FirestoreSubscriptionDoc | null;
    context?: Record<string, unknown>;
    idempotencyKey?: string;
    input: AiOperationLogInput;
    logLabel: string;
    scope: AnswerlatticeAiScope;
};

type FinalizeAnswerlatticeAiAccountingResult = {
    remainingBalance: AnswerlatticeRemainingBalance | null;
    transactionId: string | null;
    unitsConsumed: number;
};

const db = answerlatticeFirestoreAdmin as FirebaseFirestore.Firestore;
const ANSWERLATTICE_AI_RESERVATION_RECOVERY_MS = 10 * 60 * 1000;

const getAnswerlatticeAccountingContextShape = (context?: Record<string, unknown>) => ({
    contextPresent: Boolean(context),
    contextKeyCount: context ? Object.keys(context).length : 0,
});

const getAnswerlatticeAiAccountingLogContext = (
    scope: AnswerlatticeAiScope,
    input: AiOperationLogInput,
    logLabel: string,
    unitsConsumed: number,
    capacitySubscription: unknown,
    context?: Record<string, unknown>,
) => ({
    ...getAnswerlatticeScopeLogContext(scope),
    ...getBoundedAnswerlatticeStringContext('action', input.action),
    ...getBoundedAnswerlatticeStringContext('logLabel', logLabel),
    ...getBoundedAnswerlatticeStringContext('productId', PRODUCT_IDS.ANSWERLATTICE),
    ...getBoundedAnswerlatticeStringContext('userId', input.uId),
    ...getAnswerlatticeAccountingContextShape(context),
    hasCapacitySubscription: Boolean(capacitySubscription),
    unitsConsumed,
});

const isActiveAnswerlatticeAiSubscription = (subscription: FirestoreSubscriptionDoc): boolean => (
    subscription.status === 'active'
);

const getExactSubscriptionCredits = (subscription: FirestoreSubscriptionDoc) => {
    const monthlyCredits = getNonNegativeCreditInteger(subscription.monthlyCredits ?? 0);
    const topUpCredits = getNonNegativeCreditInteger(subscription.topUpCredits ?? 0);
    const monthlyCreditsAllowance = getNonNegativeCreditInteger(subscription.monthlyCreditsAllowance ?? 0);
    if (monthlyCredits === null || topUpCredits === null || monthlyCreditsAllowance === null) {
        throw new Error('Answerlattice subscription credit balance is invalid.');
    }
    const totalCredits = monthlyCredits + topUpCredits;
    if (!Number.isSafeInteger(totalCredits)) {
        throw new Error('Answerlattice subscription credit balance is invalid.');
    }
    return { monthlyCredits, monthlyCreditsAllowance, topUpCredits, totalCredits };
};

async function refreshMonthlyCreditsIfNeeded(
    subscription: FirestoreSubscriptionDoc,
    scope: AnswerlatticeAiScope,
): Promise<FirestoreSubscriptionDoc> {
    const normalizedSubscriptionId = normalizeAnswerlatticeSubscriptionId(subscription?.id);
    const initialCredits = getExactSubscriptionCredits(subscription);
    if (!normalizedSubscriptionId || initialCredits.monthlyCreditsAllowance <= 0) {
        return subscription;
    }

    const billingPeriod = getBillingPeriodKey(subscription.cycleStartDate);
    if (billingPeriod === null) return subscription;
    if (subscription.creditsLastResetMonth === billingPeriod) {
        return subscription;
    }

    const subscriptionRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(normalizedSubscriptionId);
    return db.runTransaction(async (transaction) => {
        const subscriptionSnap = await transaction.get(subscriptionRef);
        if (!subscriptionSnap.exists) return subscription;

        const current = {
            ...(subscriptionSnap.data() as FirestoreSubscriptionDoc),
            id: subscriptionSnap.id,
        };
        if (!isActiveAnswerlatticeAiSubscription(current) || !isAnswerlatticeSubscriptionInScope(current, scope)) {
            return current;
        }
        const currentBillingPeriod = getBillingPeriodKey(current.cycleStartDate);
        const currentCredits = getExactSubscriptionCredits(current);
        const allowance = currentCredits.monthlyCreditsAllowance;
        if (currentBillingPeriod === null || current.creditsLastResetMonth === currentBillingPeriod || allowance <= 0) {
            return current;
        }

        transaction.set(subscriptionRef, {
            monthlyCredits: allowance,
            creditsLastResetMonth: currentBillingPeriod,
            modifiedOn: FieldValue.serverTimestamp(),
        }, { merge: true });

        return {
            ...current,
            monthlyCredits: allowance,
            creditsLastResetMonth: currentBillingPeriod,
        };
    });
}

export async function checkAnswerlatticeAICapacity(
    scope: AnswerlatticeAiScope,
    actionType: string,
    quantity = 1,
    preloadedSubscription?: FirestoreSubscriptionDoc | null,
): Promise<AnswerlatticeCapacityCheckResult> {
    if (isFreeTierAction(actionType)) {
        return {
            allowed: true,
            reason: 'free',
            remaining: Infinity,
            subscription: null,
            unitsRequired: 0,
        };
    }

    const normalizedQuantity = getPositiveCreditInteger(quantity);
    if (normalizedQuantity === null) {
        throw new Error('Answerlattice AI capacity quantity is invalid.');
    }
    const unitsRequired = getUnitCost(actionType) * normalizedQuantity;
    if (!Number.isSafeInteger(unitsRequired) || unitsRequired <= 0) {
        throw new Error('Answerlattice AI capacity units are invalid.');
    }
    let subscription = preloadedSubscription === undefined
        ? await getActiveProductSubscriptionForStore(PRODUCT_IDS.ANSWERLATTICE, scope.tId, scope.sId)
        : preloadedSubscription;

    if (!subscription || !isActiveAnswerlatticeAiSubscription(subscription)) {
        return {
            allowed: false,
            reason: 'no_subscription',
            remaining: 0,
            subscription: null,
            unitsRequired,
        };
    }

    if (!isAnswerlatticeSubscriptionInScope(subscription, scope)) {
        return {
            allowed: false,
            reason: 'no_subscription',
            remaining: 0,
            subscription: null,
            unitsRequired,
        };
    }

    subscription = await refreshMonthlyCreditsIfNeeded(subscription, scope);
    if (!isActiveAnswerlatticeAiSubscription(subscription) || !isAnswerlatticeSubscriptionInScope(subscription, scope)) {
        return {
            allowed: false,
            reason: 'no_subscription',
            remaining: 0,
            subscription: null,
            unitsRequired,
        };
    }
    const remaining = getExactSubscriptionCredits(subscription).totalCredits;

    return {
        allowed: remaining >= unitsRequired,
        reason: remaining >= unitsRequired ? 'sufficient' : 'exhausted',
        remaining,
        subscription,
        unitsRequired,
    };
}

export async function consumeAnswerlatticeAICapacity(
    scope: AnswerlatticeAiScope,
    subscription: FirestoreSubscriptionDoc,
    unitsToConsume: number,
): Promise<AnswerlatticeRemainingBalance | null> {
    const normalizedUnitsToConsume = getPositiveCreditInteger(unitsToConsume);
    if (normalizedUnitsToConsume === null) {
        throw new Error('Answerlattice AI capacity units are invalid.');
    }

    const normalizedSubscriptionId = normalizeAnswerlatticeSubscriptionId(subscription?.id);
    if (!normalizedSubscriptionId) {
        throw new Error('Answerlattice subscription is not available.');
    }
    const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.tId);
    const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.sId);
    if (!tenantScope || !storeScope) {
        throw new Error('Answerlattice workspace is not available.');
    }

    const subscriptionRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(normalizedSubscriptionId);
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId);

    const balance = await db.runTransaction(async (transaction) => {
        const subscriptionSnap = await transaction.get(subscriptionRef);
        if (!subscriptionSnap.exists) return null;

        const current = {
            ...(subscriptionSnap.data() as FirestoreSubscriptionDoc),
            id: subscriptionSnap.id,
        };
        if (!isAnswerlatticeSubscriptionInScope(current, { tId: tenantScope.numericId, sId: storeScope.numericId })) {
            throw new Error('Answerlattice subscription scope does not match this workspace.');
        }

        const currentCredits = getExactSubscriptionCredits(current);
        let monthlyCredits = currentCredits.monthlyCredits;
        const topUpCredits = currentCredits.topUpCredits;
        const monthlyCreditsAllowance = currentCredits.monthlyCreditsAllowance;
        const billingPeriod = getBillingPeriodKey(current.cycleStartDate);

        if (billingPeriod !== null && monthlyCreditsAllowance > 0 && current.creditsLastResetMonth !== billingPeriod) {
            monthlyCredits = monthlyCreditsAllowance;
        }

        const remaining = monthlyCredits + topUpCredits;
        if (!Number.isSafeInteger(remaining)) {
            throw new Error('Answerlattice subscription credit balance is invalid.');
        }
        if (remaining < normalizedUnitsToConsume) {
            throw new AnswerlatticeAiCapacityExceededError(remaining, normalizedUnitsToConsume);
        }

        const monthlyDebit = Math.min(monthlyCredits, normalizedUnitsToConsume);
        const topUpDebit = normalizedUnitsToConsume - monthlyDebit;
        const nextMonthlyCredits = monthlyCredits - monthlyDebit;
        const nextTopUpCredits = topUpCredits - topUpDebit;
        const timestamp = FieldValue.serverTimestamp();

        transaction.set(subscriptionRef, {
            monthlyCredits: nextMonthlyCredits,
            topUpCredits: nextTopUpCredits,
            ...(billingPeriod !== null ? { creditsLastResetMonth: billingPeriod } : {}),
            modifiedOn: timestamp,
        }, { merge: true });
        transaction.set(storeRef, {
            answerlatticeSubscription: {
                monthlyCredits: nextMonthlyCredits,
                topUpCredits: nextTopUpCredits,
                ...(billingPeriod !== null ? { creditsLastResetMonth: billingPeriod } : {}),
                updatedAt: timestamp,
            },
        }, { merge: true });

        return {
            monthlyCreditsBefore: monthlyCredits,
            topUpCreditsBefore: topUpCredits,
            totalCreditsBefore: remaining,
            monthlyCreditsDebited: monthlyDebit,
            topUpCreditsDebited: topUpDebit,
            monthlyCredits: nextMonthlyCredits,
            topUpCredits: nextTopUpCredits,
            totalCreditsAfter: nextMonthlyCredits + nextTopUpCredits,
        };
    });

    return balance;
}

const normalizeAccountingIdempotencyKey = (value: unknown): string | null => {
    if (typeof value !== 'string' || value !== value.trim()) return null;
    return value.length >= 8 && value.length <= 500 ? value : null;
};

const buildAccountingContextSummary = (context?: Record<string, unknown>) => Object.fromEntries(
    Object.entries(context || {})
        .slice(0, 12)
        .map(([key, value]) => [
            String(key).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80),
            typeof value === 'string'
                ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 180)
                : (typeof value === 'number' && Number.isFinite(value)) || typeof value === 'boolean' || value === null
                    ? value
                    : null,
        ])
        .filter(([key]) => Boolean(key)),
);

const getStoredIdempotentBalance = (
    value: unknown,
    expectedUnitsConsumed: number,
): AnswerlatticeRemainingBalance | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const data = value as Record<string, unknown>;
    const monthlyCreditsBefore = getNonNegativeCreditInteger(data.monthlyCreditsBefore);
    const topUpCreditsBefore = getNonNegativeCreditInteger(data.topUpCreditsBefore);
    const totalCreditsBefore = getNonNegativeCreditInteger(data.totalCreditsBefore);
    const monthlyCreditsDebited = getNonNegativeCreditInteger(data.monthlyCreditsDebited);
    const topUpCreditsDebited = getNonNegativeCreditInteger(data.topUpCreditsDebited);
    const unitsConsumed = getPositiveCreditInteger(data.unitsConsumed);
    const monthlyCredits = getNonNegativeCreditInteger(data.monthlyCreditsAfter);
    const topUpCredits = getNonNegativeCreditInteger(data.topUpCreditsAfter);
    const totalCreditsAfter = getNonNegativeCreditInteger(data.totalCreditsAfter);
    if (
        monthlyCreditsBefore === null
        || topUpCreditsBefore === null
        || totalCreditsBefore === null
        || monthlyCreditsDebited === null
        || topUpCreditsDebited === null
        || unitsConsumed === null
        || monthlyCredits === null
        || topUpCredits === null
        || totalCreditsAfter === null
    ) {
        return null;
    }
    const beforeSum = monthlyCreditsBefore + topUpCreditsBefore;
    const debitSum = monthlyCreditsDebited + topUpCreditsDebited;
    const afterSum = monthlyCredits + topUpCredits;
    if (
        !Number.isSafeInteger(beforeSum)
        || !Number.isSafeInteger(debitSum)
        || !Number.isSafeInteger(afterSum)
        || unitsConsumed !== expectedUnitsConsumed
        || totalCreditsBefore !== beforeSum
        || debitSum !== unitsConsumed
        || monthlyCredits !== monthlyCreditsBefore - monthlyCreditsDebited
        || topUpCredits !== topUpCreditsBefore - topUpCreditsDebited
        || totalCreditsAfter !== afterSum
        || totalCreditsBefore - unitsConsumed !== totalCreditsAfter
    ) return null;
    return {
        monthlyCreditsBefore,
        topUpCreditsBefore,
        totalCreditsBefore,
        monthlyCreditsDebited,
        topUpCreditsDebited,
        monthlyCredits,
        topUpCredits,
        totalCreditsAfter,
    };
};

const getAnswerlatticeActorLabel = (actor?: AnswerlatticeAiActor | null): string => {
    for (const value of [actor?.email, actor?.name, actor?.id]) {
        if (typeof value === 'string' && value.length > 0 && value.length <= 180) return value;
        if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
    }
    return 'answerlattice';
};

const getAnswerlatticeAccountingIdentity = (
    scope: AnswerlatticeAiScope,
    idempotencyKey: unknown,
) => {
    const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.tId);
    const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.sId);
    const normalizedIdempotencyKey = normalizeAccountingIdempotencyKey(idempotencyKey);
    if (!tenantScope || !storeScope || !normalizedIdempotencyKey) {
        throw new Error('Answerlattice AI accounting identity is invalid.');
    }
    const accountingIdempotencyHash = createHash('sha256')
        .update(`${PRODUCT_IDS.ANSWERLATTICE}:${tenantScope.numericId}:${storeScope.numericId}:${normalizedIdempotencyKey}`)
        .digest('hex');
    const operationId = `idem_${accountingIdempotencyHash.slice(0, 48)}`;
    return {
        accountingIdempotencyHash,
        operationId,
        operationRef: db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
            .doc(tenantScope.documentId)
            .collection(storeScope.documentId)
            .doc(operationId),
        recoveryRef: db.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_CAPACITY_RESERVATIONS).doc(operationId),
        scope: { tId: tenantScope.numericId, sId: storeScope.numericId },
        storeDocumentId: storeScope.documentId,
        tenantDocumentId: tenantScope.documentId,
    };
};

const assertAnswerlatticeReservationRecord = (params: {
    action: string;
    accountingIdempotencyHash: string;
    data: Record<string, unknown>;
    scope: AnswerlatticeAiScope;
    subscriptionId: string;
    unitsReserved: number;
}): AnswerlatticeRemainingBalance => {
    if (
        params.data.accountingIdempotencyHash !== params.accountingIdempotencyHash
        || params.data.action !== params.action
        || params.data.accountingSubscriptionId !== params.subscriptionId
        || getPositiveCreditInteger(params.data.unitsConsumed) !== params.unitsReserved
        || normalizeAnswerlatticeBillingScopeDocumentId(params.data.tId)?.numericId !== params.scope.tId
        || normalizeAnswerlatticeBillingScopeDocumentId(params.data.sId)?.numericId !== params.scope.sId
    ) {
        throw new Error('Answerlattice AI capacity reservation identity is invalid.');
    }
    const balance = getStoredIdempotentBalance(params.data.creditConsumption, params.unitsReserved);
    if (!balance) throw new Error('Answerlattice AI capacity reservation evidence is invalid.');
    return balance;
};

export async function reserveAnswerlatticeAiOperationCapacity(params: {
    action: string;
    idempotencyKey: string;
    scope: AnswerlatticeAiScope;
    subscription: FirestoreSubscriptionDoc;
    unitsToReserve: number;
}): Promise<AnswerlatticeAiCapacityReservation> {
    const unitsToReserve = getPositiveCreditInteger(params.unitsToReserve);
    const subscriptionId = normalizeAnswerlatticeSubscriptionId(params.subscription.id);
    if (
        unitsToReserve === null
        || typeof params.action !== 'string'
        || params.action.length === 0
        || params.action.length > 160
        || !subscriptionId
        || !isAnswerlatticeSubscriptionInScope(params.subscription, params.scope)
    ) {
        throw new Error('Answerlattice AI capacity reservation input is invalid.');
    }
    const identity = getAnswerlatticeAccountingIdentity(params.scope, params.idempotencyKey);
    const subscriptionRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(identity.storeDocumentId);

    return db.runTransaction(async (transaction) => {
        const [operationSnapshot, subscriptionSnapshot] = await Promise.all([
            transaction.get(identity.operationRef),
            transaction.get(subscriptionRef),
        ]);
        const existing = operationSnapshot.data() || {};
        if (!subscriptionSnapshot.exists) {
            throw new Error('An active Answerlattice subscription is required for this operation.');
        }
        const current = {
            ...(subscriptionSnapshot.data() as FirestoreSubscriptionDoc),
            id: subscriptionSnapshot.id,
        };
        if (!isAnswerlatticeSubscriptionInScope(current, identity.scope) || !isActiveAnswerlatticeAiSubscription(current)) {
            throw new Error('An active Answerlattice subscription is required for this operation.');
        }
        if (operationSnapshot.exists && existing.accountingStatus !== 'refunded') {
            const remainingBalance = assertAnswerlatticeReservationRecord({
                action: params.action,
                accountingIdempotencyHash: identity.accountingIdempotencyHash,
                data: existing,
                scope: identity.scope,
                subscriptionId,
                unitsReserved: unitsToReserve,
            });
            if (existing.accountingStatus === 'succeeded') {
                throw new Error('Answerlattice AI capacity reservation is already settled.');
            }
            if (existing.accountingStatus !== 'reserved') {
                throw new Error('Answerlattice AI capacity reservation state is invalid.');
            }
            transaction.set(identity.operationRef, {
                reservationRecoveryAt: Timestamp.fromMillis(Date.now() + ANSWERLATTICE_AI_RESERVATION_RECOVERY_MS),
                modifiedOn: FieldValue.serverTimestamp(),
            }, { merge: true });
            transaction.set(identity.recoveryRef, {
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: identity.scope.tId,
                sId: identity.scope.sId,
                action: params.action,
                operationId: identity.operationId,
                accountingIdempotencyHash: identity.accountingIdempotencyHash,
                subscriptionId,
                unitsReserved: unitsToReserve,
                recoveryAt: Timestamp.fromMillis(Date.now() + ANSWERLATTICE_AI_RESERVATION_RECOVERY_MS),
                modifiedOn: FieldValue.serverTimestamp(),
            }, { merge: true });
            return {
                action: params.action,
                accountingIdempotencyHash: identity.accountingIdempotencyHash,
                operationId: identity.operationId,
                remainingBalance,
                scope: identity.scope,
                subscriptionId,
                unitsReserved: unitsToReserve,
            };
        }
        const credits = getExactSubscriptionCredits(current);
        const billingPeriod = getBillingPeriodKey(current.cycleStartDate);
        if (billingPeriod === null) {
            throw new Error('Answerlattice subscription billing period is invalid.');
        }
        const storedBillingPeriod = current.creditsLastResetMonth == null
            ? null
            : getCreditBillingPeriodKey(current.creditsLastResetMonth);
        let monthlyCredits = credits.monthlyCredits;
        if (credits.monthlyCreditsAllowance > 0 && storedBillingPeriod !== billingPeriod) {
            monthlyCredits = credits.monthlyCreditsAllowance;
        }
        const totalCreditsBefore = monthlyCredits + credits.topUpCredits;
        if (!Number.isSafeInteger(totalCreditsBefore)) {
            throw new Error('Answerlattice subscription credit balance is invalid.');
        }
        if (totalCreditsBefore < unitsToReserve) {
            throw new AnswerlatticeAiCapacityExceededError(totalCreditsBefore, unitsToReserve);
        }
        const monthlyCreditsDebited = Math.min(monthlyCredits, unitsToReserve);
        const topUpCreditsDebited = unitsToReserve - monthlyCreditsDebited;
        const nextMonthlyCredits = monthlyCredits - monthlyCreditsDebited;
        const nextTopUpCredits = credits.topUpCredits - topUpCreditsDebited;
        const timestamp = FieldValue.serverTimestamp();
        const creditConsumption = {
            monthlyCreditsBefore: monthlyCredits,
            topUpCreditsBefore: credits.topUpCredits,
            totalCreditsBefore,
            monthlyCreditsDebited,
            topUpCreditsDebited,
            unitsConsumed: unitsToReserve,
            monthlyCreditsAfter: nextMonthlyCredits,
            topUpCreditsAfter: nextTopUpCredits,
            totalCreditsAfter: nextMonthlyCredits + nextTopUpCredits,
        };
        const priorAttempt = operationSnapshot.exists
            ? getNonNegativeCreditInteger(existing.accountingReservationAttempt)
            : 0;
        if (priorAttempt === null || priorAttempt >= Number.MAX_SAFE_INTEGER) {
            throw new Error('Answerlattice AI capacity reservation attempt is invalid.');
        }

        transaction.set(subscriptionRef, {
            monthlyCredits: nextMonthlyCredits,
            topUpCredits: nextTopUpCredits,
            creditsLastResetMonth: billingPeriod,
            modifiedOn: timestamp,
        }, { merge: true });
        transaction.set(storeRef, {
            answerlatticeSubscription: {
                monthlyCredits: nextMonthlyCredits,
                topUpCredits: nextTopUpCredits,
                creditsLastResetMonth: billingPeriod,
                updatedAt: timestamp,
            },
        }, { merge: true });
        transaction.set(identity.operationRef, {
            id: identity.operationId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: identity.scope.tId,
            sId: identity.scope.sId,
            action: params.action,
            billingMode: 'billable',
            aiLogMode: 'accounting_only',
            unitsConsumed: unitsToReserve,
            accountingIdempotencyHash: identity.accountingIdempotencyHash,
            accountingStatus: 'reserved',
            accountingSubscriptionId: subscriptionId,
            accountingReservationAttempt: priorAttempt + 1,
            accountingReservationBillingPeriod: billingPeriod,
            accountingMonthlyCreditCeiling: Math.max(monthlyCredits, credits.monthlyCreditsAllowance),
            creditConsumption,
            reservationRecoveryAt: Timestamp.fromMillis(Date.now() + ANSWERLATTICE_AI_RESERVATION_RECOVERY_MS),
            createdOn: FieldValue.delete(),
            modifiedOn: timestamp,
            refundedOn: FieldValue.delete(),
            refundReason: FieldValue.delete(),
        }, { merge: true });
        transaction.set(identity.recoveryRef, {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: identity.scope.tId,
            sId: identity.scope.sId,
            action: params.action,
            operationId: identity.operationId,
            accountingIdempotencyHash: identity.accountingIdempotencyHash,
            subscriptionId,
            unitsReserved: unitsToReserve,
            recoveryAt: Timestamp.fromMillis(Date.now() + ANSWERLATTICE_AI_RESERVATION_RECOVERY_MS),
            createdOn: timestamp,
            modifiedOn: timestamp,
        });

        return {
            action: params.action,
            accountingIdempotencyHash: identity.accountingIdempotencyHash,
            operationId: identity.operationId,
            remainingBalance: {
                monthlyCreditsBefore: monthlyCredits,
                topUpCreditsBefore: credits.topUpCredits,
                totalCreditsBefore,
                monthlyCreditsDebited,
                topUpCreditsDebited,
                monthlyCredits: nextMonthlyCredits,
                topUpCredits: nextTopUpCredits,
                totalCreditsAfter: nextMonthlyCredits + nextTopUpCredits,
            },
            scope: identity.scope,
            subscriptionId,
            unitsReserved: unitsToReserve,
        };
    });
}

export async function settleAnswerlatticeAiOperationReservation(params: {
    actor?: AnswerlatticeAiActor | null;
    context?: Record<string, unknown>;
    input: AiOperationLogInput;
    reservation: AnswerlatticeAiCapacityReservation;
}): Promise<FinalizeAnswerlatticeAiAccountingResult> {
    const operation = buildAiOperationLog(params.input);
    if (operation.unitsConsumed !== params.reservation.unitsReserved || operation.action !== params.reservation.action) {
        throw new Error('Answerlattice AI capacity settlement identity is invalid.');
    }
    const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(params.reservation.scope.tId);
    const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(params.reservation.scope.sId);
    if (
        !tenantScope
        || !storeScope
        || !/^idem_[a-f0-9]{48}$/.test(params.reservation.operationId)
        || !/^[a-f0-9]{64}$/.test(params.reservation.accountingIdempotencyHash)
        || params.reservation.operationId !== `idem_${params.reservation.accountingIdempotencyHash.slice(0, 48)}`
    ) {
        throw new Error('Answerlattice AI capacity settlement reservation is invalid.');
    }

    return db.runTransaction(async (transaction) => {
        const operationSnapshot = await transaction.get(
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
                .doc(tenantScope.documentId)
                .collection(storeScope.documentId)
                .doc(params.reservation.operationId),
        );
        if (!operationSnapshot.exists) throw new Error('Answerlattice AI capacity reservation is not available.');
        const existing = operationSnapshot.data() || {};
        const remainingBalance = assertAnswerlatticeReservationRecord({
            action: operation.action,
            accountingIdempotencyHash: params.reservation.accountingIdempotencyHash,
            data: existing,
            scope: params.reservation.scope,
            subscriptionId: params.reservation.subscriptionId,
            unitsReserved: params.reservation.unitsReserved,
        });
        if (existing.accountingStatus === 'succeeded') {
            return {
                remainingBalance,
                transactionId: params.reservation.operationId,
                unitsConsumed: params.reservation.unitsReserved,
            };
        }
        if (existing.accountingStatus !== 'reserved') {
            throw new Error('Answerlattice AI capacity reservation cannot be settled.');
        }
        const timestamp = FieldValue.serverTimestamp();
        transaction.set(operationSnapshot.ref, {
            uId: operation.uId ?? (params.actor?.id !== undefined && params.actor?.id !== null
                ? getAnswerlatticeActorLabel({ id: params.actor.id })
                : null),
            action: operation.action,
            source: operation.source ?? null,
            model: operation.model ?? null,
            billingMode: operation.billingMode,
            aiLogMode: 'accounting_only',
            processingTime: operation.processingTime ?? 0,
            promptTokenCount: operation.promptTokenCount ?? 0,
            candidatesTokenCount: operation.candidatesTokenCount ?? 0,
            totalTokenCount: operation.totalTokenCount ?? 0,
            totalCredits: operation.totalCredits ?? 0,
            totalCharge: operation.totalCharge ?? 0,
            realCostPaise: operation.realCostPaise ?? 0,
            ourChargePaise: operation.ourChargePaise ?? 0,
            marginPaise: operation.marginPaise ?? 0,
            clientResponse: operation.clientResponse ?? null,
            context: buildAccountingContextSummary(params.context),
            accountingStatus: 'succeeded',
            createdBy: getAnswerlatticeActorLabel(params.actor),
            modifiedBy: getAnswerlatticeActorLabel(params.actor),
            createdOn: existing.createdOn ?? timestamp,
            reservationRecoveryAt: FieldValue.delete(),
            modifiedOn: timestamp,
        }, { merge: true });
        transaction.delete(db.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_CAPACITY_RESERVATIONS)
            .doc(params.reservation.operationId));
        return {
            remainingBalance,
            transactionId: params.reservation.operationId,
            unitsConsumed: params.reservation.unitsReserved,
        };
    });
}

export async function refundAnswerlatticeAiOperationReservation(params: {
    reason: string;
    reservation: AnswerlatticeAiCapacityReservation;
}): Promise<void> {
    if (typeof params.reason !== 'string' || !/^[a-z0-9_-]{3,80}$/.test(params.reason)) {
        throw new Error('Answerlattice AI capacity refund reason is invalid.');
    }
    const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(params.reservation.scope.tId);
    const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(params.reservation.scope.sId);
    const subscriptionId = normalizeAnswerlatticeSubscriptionId(params.reservation.subscriptionId);
    if (
        !tenantScope
        || !storeScope
        || !subscriptionId
        || !/^idem_[a-f0-9]{48}$/.test(params.reservation.operationId)
        || !/^[a-f0-9]{64}$/.test(params.reservation.accountingIdempotencyHash)
        || params.reservation.operationId !== `idem_${params.reservation.accountingIdempotencyHash.slice(0, 48)}`
    ) {
        throw new Error('Answerlattice AI capacity refund identity is invalid.');
    }
    const operationRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
        .doc(tenantScope.documentId)
        .collection(storeScope.documentId)
        .doc(params.reservation.operationId);
    const subscriptionRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId);
    const recoveryRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_CAPACITY_RESERVATIONS)
        .doc(params.reservation.operationId);

    await db.runTransaction(async (transaction) => {
        const [operationSnapshot, subscriptionSnapshot] = await Promise.all([
            transaction.get(operationRef),
            transaction.get(subscriptionRef),
        ]);
        if (!operationSnapshot.exists) throw new Error('Answerlattice AI capacity reservation is not available.');
        const operation = operationSnapshot.data() || {};
        if (operation.accountingStatus === 'succeeded' || operation.accountingStatus === 'refunded') return;
        if (operation.accountingStatus !== 'reserved' || !subscriptionSnapshot.exists) {
            throw new Error('Answerlattice AI capacity reservation cannot be refunded.');
        }
        const balance = assertAnswerlatticeReservationRecord({
            action: params.reservation.action,
            accountingIdempotencyHash: params.reservation.accountingIdempotencyHash,
            data: operation,
            scope: params.reservation.scope,
            subscriptionId,
            unitsReserved: params.reservation.unitsReserved,
        });
        const current = {
            ...(subscriptionSnapshot.data() as FirestoreSubscriptionDoc),
            id: subscriptionSnapshot.id,
        };
        if (!isAnswerlatticeSubscriptionInScope(current, params.reservation.scope)) {
            throw new Error('Answerlattice subscription scope does not match this workspace.');
        }
        const currentCredits = getExactSubscriptionCredits(current);
        const reservationBillingPeriod = getCreditBillingPeriodKey(operation.accountingReservationBillingPeriod);
        const currentBillingPeriod = getBillingPeriodKey(current.cycleStartDate);
        const monthlyCreditCeiling = getNonNegativeCreditInteger(operation.accountingMonthlyCreditCeiling);
        if (reservationBillingPeriod === null || currentBillingPeriod === null || monthlyCreditCeiling === null) {
            throw new Error('Answerlattice AI capacity refund period evidence is invalid.');
        }
        const monthlyCreditsDebited = balance.monthlyCreditsDebited ?? 0;
        const topUpCreditsDebited = balance.topUpCreditsDebited ?? 0;
        const nextMonthlyCredits = reservationBillingPeriod === currentBillingPeriod
            ? Math.min(monthlyCreditCeiling, currentCredits.monthlyCredits + monthlyCreditsDebited)
            : currentCredits.monthlyCredits;
        const nextTopUpCredits = currentCredits.topUpCredits + topUpCreditsDebited;
        if (!Number.isSafeInteger(nextMonthlyCredits) || !Number.isSafeInteger(nextTopUpCredits)) {
            throw new Error('Answerlattice AI capacity refund balance is invalid.');
        }
        const timestamp = FieldValue.serverTimestamp();
        transaction.set(subscriptionRef, {
            monthlyCredits: nextMonthlyCredits,
            topUpCredits: nextTopUpCredits,
            creditsLastResetMonth: currentBillingPeriod,
            modifiedOn: timestamp,
        }, { merge: true });
        transaction.set(storeRef, {
            answerlatticeSubscription: {
                monthlyCredits: nextMonthlyCredits,
                topUpCredits: nextTopUpCredits,
                creditsLastResetMonth: currentBillingPeriod,
                updatedAt: timestamp,
            },
        }, { merge: true });
        transaction.set(operationRef, {
            accountingStatus: 'refunded',
            refundReason: params.reason,
            refundedOn: timestamp,
            reservationRecoveryAt: FieldValue.delete(),
            modifiedOn: timestamp,
        }, { merge: true });
        transaction.delete(recoveryRef);
    });
}

async function finalizeIdempotentAnswerlatticeAiOperation({
    actor,
    capacitySubscription,
    context,
    idempotencyKey,
    operationInput,
    scope,
    unitsConsumed,
}: {
    actor?: AnswerlatticeAiActor | null;
    capacitySubscription: FirestoreSubscriptionDoc;
    context?: Record<string, unknown>;
    idempotencyKey: string;
    operationInput: AiOperationLogInput;
    scope: AnswerlatticeAiScope;
    unitsConsumed: number;
}): Promise<FinalizeAnswerlatticeAiAccountingResult> {
    const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.tId);
    const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.sId);
    const subscriptionId = normalizeAnswerlatticeSubscriptionId(capacitySubscription.id);
    if (!tenantScope || !storeScope || !subscriptionId || !isAnswerlatticeSubscriptionInScope(capacitySubscription, scope)) {
        throw new Error('Answerlattice AI accounting scope is not available.');
    }

    const idempotencyHash = createHash('sha256')
        .update(`${PRODUCT_IDS.ANSWERLATTICE}:${tenantScope.numericId}:${storeScope.numericId}:${idempotencyKey}`)
        .digest('hex');
    const operationId = `idem_${idempotencyHash.slice(0, 48)}`;
    const operationRef = db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
        .doc(tenantScope.documentId)
        .collection(storeScope.documentId)
        .doc(operationId);
    const subscriptionRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId);
    const operation = buildAiOperationLog(operationInput);

    return db.runTransaction(async (transaction) => {
        const operationSnapshot = await transaction.get(operationRef);

        if (operationSnapshot.exists) {
            const existing = operationSnapshot.data() || {};
            if (
                existing.accountingIdempotencyHash !== idempotencyHash
                || existing.accountingStatus !== 'succeeded'
                || existing.action !== operation.action
                || normalizeAnswerlatticeBillingScopeDocumentId(existing.tId)?.numericId !== tenantScope.numericId
                || normalizeAnswerlatticeBillingScopeDocumentId(existing.sId)?.numericId !== storeScope.numericId
            ) {
                throw new Error('Answerlattice AI accounting idempotency record is invalid.');
            }
            const storedUnitsConsumed = getPositiveCreditInteger(existing.unitsConsumed);
            const storedBalance = getStoredIdempotentBalance(existing.creditConsumption, unitsConsumed);
            if (!storedBalance || storedUnitsConsumed !== unitsConsumed) {
                throw new Error('Answerlattice AI accounting balance evidence is invalid.');
            }
            return {
                remainingBalance: storedBalance,
                transactionId: operationSnapshot.id,
                unitsConsumed,
            };
        }

        const subscriptionSnapshot = await transaction.get(subscriptionRef);
        if (!subscriptionSnapshot.exists) {
            throw new Error('An active Answerlattice subscription is required for this operation.');
        }
        const current = {
            ...(subscriptionSnapshot.data() as FirestoreSubscriptionDoc),
            id: subscriptionSnapshot.id,
        };
        if (!isAnswerlatticeSubscriptionInScope(current, { tId: tenantScope.numericId, sId: storeScope.numericId })) {
            throw new Error('Answerlattice subscription scope does not match this workspace.');
        }
        if (!isActiveAnswerlatticeAiSubscription(current)) {
            throw new Error('An active Answerlattice subscription is required for this operation.');
        }

        const currentCredits = getExactSubscriptionCredits(current);
        let monthlyCredits = currentCredits.monthlyCredits;
        const topUpCredits = currentCredits.topUpCredits;
        const monthlyCreditsAllowance = currentCredits.monthlyCreditsAllowance;
        const billingPeriod = getBillingPeriodKey(current.cycleStartDate);
        if (billingPeriod !== null && monthlyCreditsAllowance > 0 && current.creditsLastResetMonth !== billingPeriod) {
            monthlyCredits = monthlyCreditsAllowance;
        }

        const totalCreditsBefore = monthlyCredits + topUpCredits;
        if (!Number.isSafeInteger(totalCreditsBefore)) {
            throw new Error('Answerlattice subscription credit balance is invalid.');
        }
        if (totalCreditsBefore < unitsConsumed) {
            throw new AnswerlatticeAiCapacityExceededError(totalCreditsBefore, unitsConsumed);
        }
        const monthlyCreditsDebited = Math.min(monthlyCredits, unitsConsumed);
        const topUpCreditsDebited = unitsConsumed - monthlyCreditsDebited;
        const nextMonthlyCredits = monthlyCredits - monthlyCreditsDebited;
        const nextTopUpCredits = topUpCredits - topUpCreditsDebited;
        const timestamp = FieldValue.serverTimestamp();
        const creditConsumption = {
            monthlyCreditsBefore: monthlyCredits,
            topUpCreditsBefore: topUpCredits,
            totalCreditsBefore,
            monthlyCreditsDebited,
            topUpCreditsDebited,
            unitsConsumed,
            monthlyCreditsAfter: nextMonthlyCredits,
            topUpCreditsAfter: nextTopUpCredits,
            totalCreditsAfter: nextMonthlyCredits + nextTopUpCredits,
        };

        transaction.set(subscriptionRef, {
            monthlyCredits: nextMonthlyCredits,
            topUpCredits: nextTopUpCredits,
            ...(billingPeriod !== null ? { creditsLastResetMonth: billingPeriod } : {}),
            modifiedOn: timestamp,
        }, { merge: true });
        transaction.set(storeRef, {
            answerlatticeSubscription: {
                monthlyCredits: nextMonthlyCredits,
                topUpCredits: nextTopUpCredits,
                ...(billingPeriod !== null ? { creditsLastResetMonth: billingPeriod } : {}),
                updatedAt: timestamp,
            },
        }, { merge: true });
        transaction.set(operationRef, {
            id: operationId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: tenantScope.numericId,
            sId: storeScope.numericId,
            uId: operation.uId ?? (actor?.id !== undefined && actor?.id !== null ? getAnswerlatticeActorLabel({ id: actor.id }) : null),
            action: operation.action,
            source: operation.source ?? null,
            model: operation.model ?? null,
            billingMode: operation.billingMode,
            aiLogMode: 'accounting_only',
            processingTime: operation.processingTime ?? 0,
            promptTokenCount: operation.promptTokenCount ?? 0,
            candidatesTokenCount: operation.candidatesTokenCount ?? 0,
            totalTokenCount: operation.totalTokenCount ?? 0,
            totalCredits: operation.totalCredits ?? 0,
            totalCharge: operation.totalCharge ?? 0,
            realCostPaise: operation.realCostPaise ?? 0,
            ourChargePaise: operation.ourChargePaise ?? 0,
            marginPaise: operation.marginPaise ?? 0,
            unitsConsumed,
            clientResponse: operation.clientResponse ?? null,
            context: buildAccountingContextSummary(context),
            accountingIdempotencyHash: idempotencyHash,
            accountingStatus: 'succeeded',
            creditConsumption,
            billingPeriod: billingPeriod ?? null,
            createdBy: getAnswerlatticeActorLabel(actor),
            modifiedBy: getAnswerlatticeActorLabel(actor),
            createdOn: timestamp,
            modifiedOn: timestamp,
        });

        return {
            remainingBalance: {
                monthlyCreditsBefore: monthlyCredits,
                topUpCreditsBefore: topUpCredits,
                totalCreditsBefore,
                monthlyCreditsDebited,
                topUpCreditsDebited,
                monthlyCredits: nextMonthlyCredits,
                topUpCredits: nextTopUpCredits,
                totalCreditsAfter: nextMonthlyCredits + nextTopUpCredits,
            },
            transactionId: operationId,
            unitsConsumed,
        };
    });
}

export async function recordAnswerlatticeAiOperation(
    scope: AnswerlatticeAiScope,
    input: AiOperationLogInput,
    actor?: AnswerlatticeAiActor | null,
): Promise<string> {
    const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.tId);
    const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.sId);
    if (!tenantScope || !storeScope) {
        throw new Error('Answerlattice workspace is not available.');
    }
    return recordAiOperation({
        ...input,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: tenantScope.numericId,
        sId: storeScope.numericId,
        uId: input.uId ?? (actor?.id != null ? String(actor.id) : undefined),
        createdBy: input.createdBy ?? actor?.email ?? actor?.name ?? 'answerlattice',
        modifiedBy: input.modifiedBy ?? actor?.email ?? actor?.name ?? 'answerlattice',
    });
}

export async function finalizeAnswerlatticeAiOperationAccounting({
    actor,
    capacitySubscription,
    context,
    idempotencyKey,
    input,
    logLabel,
    scope,
}: FinalizeAnswerlatticeAiAccountingParams): Promise<FinalizeAnswerlatticeAiAccountingResult> {
    const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.tId);
    const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.sId);
    if (!tenantScope || !storeScope) {
        throw new Error('Answerlattice workspace is not available.');
    }
    const normalizedScope = { tId: tenantScope.numericId, sId: storeScope.numericId };
    const unitsConsumed = getNonNegativeCreditInteger(input.unitsConsumed ?? getUnitCost(input.action));
    if (unitsConsumed === null) {
        throw new Error('Answerlattice AI accounting units are invalid.');
    }
    const operationInput: AiOperationLogInput = {
        ...input,
        unitsConsumed,
    };

    const normalizedIdempotencyKey = normalizeAccountingIdempotencyKey(idempotencyKey);
    if (idempotencyKey !== undefined && !normalizedIdempotencyKey) {
        throw new Error('Answerlattice AI accounting idempotency key is invalid.');
    }
    if (normalizedIdempotencyKey && unitsConsumed > 0) {
        if (!capacitySubscription) {
            throw new Error('Answerlattice AI accounting requires an active subscription.');
        }
        try {
            return await finalizeIdempotentAnswerlatticeAiOperation({
                actor,
                capacitySubscription,
                context,
                idempotencyKey: normalizedIdempotencyKey,
                operationInput,
                scope: normalizedScope,
                unitsConsumed,
            });
        } catch (idempotentAccountingError) {
            if (isAnswerlatticeAiCapacityExceededError(idempotentAccountingError)) {
                throw idempotentAccountingError;
            }
            logAnswerlatticeFailure(
                'answerlattice_ai_accounting_idempotent_settlement_failed',
                idempotentAccountingError,
                getAnswerlatticeAiAccountingLogContext(scope, operationInput, logLabel, unitsConsumed, capacitySubscription, context),
            );
            throw idempotentAccountingError;
        }
    }

    let transactionId: string | null = null;
    let remainingBalance: AnswerlatticeRemainingBalance | null = null;

    try {
        transactionId = await recordAnswerlatticeAiOperation(normalizedScope, operationInput, actor);
    } catch (operationLogError) {
        logAnswerlatticeFailure(
            'answerlattice_ai_accounting_operation_log_failed',
            operationLogError,
            getAnswerlatticeAiAccountingLogContext(scope, operationInput, logLabel, unitsConsumed, capacitySubscription, context),
        );
    }

    if (capacitySubscription && unitsConsumed > 0) {
        try {
            remainingBalance = await consumeAnswerlatticeAICapacity(normalizedScope, capacitySubscription, unitsConsumed);
            if (!remainingBalance) {
                throw new Error(`${logLabel} Answerlattice credit consumption returned no balance`);
            }
        } catch (creditConsumptionError) {
            logAnswerlatticeFailure(
                'answerlattice_ai_accounting_credit_consumption_failed',
                creditConsumptionError,
                getAnswerlatticeAiAccountingLogContext(scope, operationInput, logLabel, unitsConsumed, capacitySubscription, context),
            );
            throw creditConsumptionError;
        }

        if (transactionId && remainingBalance) {
            try {
                await db
                    .collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
                    .doc(tenantScope.documentId)
                    .collection(storeScope.documentId)
                    .doc(transactionId)
                    .set({
                        creditConsumption: {
                            monthlyCreditsBefore: remainingBalance.monthlyCreditsBefore ?? null,
                            topUpCreditsBefore: remainingBalance.topUpCreditsBefore ?? null,
                            totalCreditsBefore: remainingBalance.totalCreditsBefore ?? null,
                            monthlyCreditsDebited: remainingBalance.monthlyCreditsDebited ?? 0,
                            topUpCreditsDebited: remainingBalance.topUpCreditsDebited ?? 0,
                            unitsConsumed,
                            monthlyCreditsAfter: remainingBalance.monthlyCredits,
                            topUpCreditsAfter: remainingBalance.topUpCredits,
                            totalCreditsAfter: remainingBalance.totalCreditsAfter ?? (remainingBalance.monthlyCredits + remainingBalance.topUpCredits),
                        },
                        modifiedOn: FieldValue.serverTimestamp(),
                    }, { merge: true });
            } catch (operationUpdateError) {
                logAnswerlatticeFailure(
                    'answerlattice_ai_accounting_operation_balance_update_failed',
                    operationUpdateError,
                    getAnswerlatticeAiAccountingLogContext(scope, operationInput, logLabel, unitsConsumed, capacitySubscription, context),
                );
            }
        }
    }

    return {
        remainingBalance,
        transactionId,
        unitsConsumed,
    };
}
