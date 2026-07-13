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
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';
import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';

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

export class AnswerlatticeAiCapacityExceededError extends Error {
    readonly remaining: number;
    readonly required: number;

    constructor(remaining: number, required: number) {
        super('Not enough Answerlattice support credits for this operation.');
        this.name = 'AnswerlatticeAiCapacityExceededError';
        Object.setPrototypeOf(this, new.target.prototype);
        this.remaining = Math.max(0, Number(remaining) || 0);
        this.required = Math.max(0, Number(required) || 0);
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
        && Number.isFinite(Number((error as { remaining?: unknown }).remaining))
        && Number.isFinite(Number((error as { required?: unknown }).required)),
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
    ['active', 'trialing'].includes(String(subscription.status || '').trim().toLowerCase())
);

async function refreshMonthlyCreditsIfNeeded(
    subscription: FirestoreSubscriptionDoc,
): Promise<FirestoreSubscriptionDoc> {
    const normalizedSubscriptionId = normalizeAnswerlatticeSubscriptionId(subscription?.id);
    if (!normalizedSubscriptionId || Number(subscription.monthlyCreditsAllowance || 0) <= 0) {
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
        const currentBillingPeriod = getBillingPeriodKey(current.cycleStartDate);
        const allowance = Number(current.monthlyCreditsAllowance || 0);
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

    const normalizedQuantity = Number(quantity);
    const unitsRequired = getUnitCost(actionType) * (
        Number.isSafeInteger(normalizedQuantity) && normalizedQuantity > 0 ? normalizedQuantity : 1
    );
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

    subscription = await refreshMonthlyCreditsIfNeeded(subscription);
    const remaining = Number(subscription.monthlyCredits || 0) + Number(subscription.topUpCredits || 0);

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
    if (!Number.isFinite(unitsToConsume) || unitsToConsume <= 0) return null;

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

        let monthlyCredits = Number(current.monthlyCredits || 0);
        let topUpCredits = Number(current.topUpCredits || 0);
        const monthlyCreditsAllowance = Number(current.monthlyCreditsAllowance || 0);
        const billingPeriod = getBillingPeriodKey(current.cycleStartDate);

        if (
            !Number.isFinite(monthlyCredits)
            || !Number.isFinite(topUpCredits)
            || monthlyCredits < 0
            || topUpCredits < 0
            || !Number.isFinite(monthlyCreditsAllowance)
            || monthlyCreditsAllowance < 0
        ) {
            throw new Error('Answerlattice subscription credit balance is invalid.');
        }

        if (billingPeriod !== null && monthlyCreditsAllowance > 0 && current.creditsLastResetMonth !== billingPeriod) {
            monthlyCredits = monthlyCreditsAllowance;
        }

        const remaining = monthlyCredits + topUpCredits;
        if (remaining < unitsToConsume) {
            throw new AnswerlatticeAiCapacityExceededError(remaining, unitsToConsume);
        }

        const monthlyDebit = Math.min(monthlyCredits, unitsToConsume);
        const topUpDebit = unitsToConsume - monthlyDebit;
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
    const normalized = String(value || '').trim();
    return normalized.length >= 8 && normalized.length <= 500 ? normalized : null;
};

const buildAccountingContextSummary = (context?: Record<string, unknown>) => Object.fromEntries(
    Object.entries(context || {})
        .slice(0, 12)
        .map(([key, value]) => [
            String(key).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80),
            typeof value === 'string'
                ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 180)
                : typeof value === 'number' || typeof value === 'boolean' || value === null
                    ? value
                    : null,
        ])
        .filter(([key]) => Boolean(key)),
);

const getStoredIdempotentBalance = (value: unknown): AnswerlatticeRemainingBalance | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const data = value as Record<string, unknown>;
    const monthlyCredits = Number(data.monthlyCreditsAfter);
    const topUpCredits = Number(data.topUpCreditsAfter);
    if (!Number.isFinite(monthlyCredits) || monthlyCredits < 0 || !Number.isFinite(topUpCredits) || topUpCredits < 0) {
        return null;
    }
    return {
        monthlyCreditsBefore: Number(data.monthlyCreditsBefore || 0),
        topUpCreditsBefore: Number(data.topUpCreditsBefore || 0),
        totalCreditsBefore: Number(data.totalCreditsBefore || 0),
        monthlyCreditsDebited: Number(data.monthlyCreditsDebited || 0),
        topUpCreditsDebited: Number(data.topUpCreditsDebited || 0),
        monthlyCredits,
        topUpCredits,
        totalCreditsAfter: Number(data.totalCreditsAfter ?? (monthlyCredits + topUpCredits)),
    };
};

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
                || String(existing.action || '') !== String(operationInput.action || '')
                || normalizeAnswerlatticeBillingScopeDocumentId(existing.tId)?.numericId !== tenantScope.numericId
                || normalizeAnswerlatticeBillingScopeDocumentId(existing.sId)?.numericId !== storeScope.numericId
            ) {
                throw new Error('Answerlattice AI accounting idempotency record is invalid.');
            }
            const storedBalance = getStoredIdempotentBalance(existing.creditConsumption);
            if (!storedBalance) {
                throw new Error('Answerlattice AI accounting balance evidence is invalid.');
            }
            return {
                remainingBalance: storedBalance,
                transactionId: operationSnapshot.id,
                unitsConsumed: Number(existing.unitsConsumed || unitsConsumed),
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

        let monthlyCredits = Number(current.monthlyCredits || 0);
        let topUpCredits = Number(current.topUpCredits || 0);
        const monthlyCreditsAllowance = Number(current.monthlyCreditsAllowance || 0);
        const billingPeriod = getBillingPeriodKey(current.cycleStartDate);
        if (
            !Number.isFinite(monthlyCredits)
            || !Number.isFinite(topUpCredits)
            || monthlyCredits < 0
            || topUpCredits < 0
            || !Number.isFinite(monthlyCreditsAllowance)
            || monthlyCreditsAllowance < 0
        ) {
            throw new Error('Answerlattice subscription credit balance is invalid.');
        }
        if (billingPeriod !== null && monthlyCreditsAllowance > 0 && current.creditsLastResetMonth !== billingPeriod) {
            monthlyCredits = monthlyCreditsAllowance;
        }

        const totalCreditsBefore = monthlyCredits + topUpCredits;
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
            uId: String(operationInput.uId ?? actor?.id ?? '').slice(0, 180) || null,
            action: operationInput.action,
            source: String(operationInput.source || '').slice(0, 120) || null,
            model: String(operationInput.model || '').slice(0, 120) || null,
            billingMode: operation.billingMode || 'billable',
            aiLogMode: 'accounting_only',
            processingTime: Number(operation.processingTime || 0),
            promptTokenCount: Number(operation.promptTokenCount || 0),
            candidatesTokenCount: Number(operation.candidatesTokenCount || 0),
            totalTokenCount: Number(operation.totalTokenCount || 0),
            totalCredits: Number(operation.totalCredits || 0),
            totalCharge: Number(operation.totalCharge || 0),
            realCostPaise: Number(operation.realCostPaise || 0),
            ourChargePaise: Number(operation.ourChargePaise || 0),
            marginPaise: Number(operation.marginPaise || 0),
            unitsConsumed,
            clientResponse: operation.clientResponse ?? null,
            context: buildAccountingContextSummary(context),
            accountingIdempotencyHash: idempotencyHash,
            accountingStatus: 'succeeded',
            creditConsumption,
            billingPeriod: billingPeriod || null,
            createdBy: String(actor?.email || actor?.name || actor?.id || 'answerlattice').slice(0, 180),
            modifiedBy: String(actor?.email || actor?.name || actor?.id || 'answerlattice').slice(0, 180),
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
    const unitsConsumed = Number(input.unitsConsumed ?? getUnitCost(input.action));
    if (!Number.isFinite(unitsConsumed) || unitsConsumed < 0) {
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
