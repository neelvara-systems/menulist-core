import { getUnitCost, isFreeTierAction } from '@constant/AI/unitCosts';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { AiOperationLogInput, recordAiOperation } from '@lib/ai/operationLog';
import { getAnswerlatticeScopeLogContext, getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import { getActiveProductSubscriptionForStore } from '@lib/billing/productBillingServer';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { admin } from '@lib/firebase/firebaseAdmin';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';

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

type FinalizeAnswerlatticeAiAccountingParams = {
    actor?: AnswerlatticeAiActor | null;
    capacitySubscription?: FirestoreSubscriptionDoc | null;
    context?: Record<string, unknown>;
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

const toMillis = (value: any): number => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (value instanceof Date) return value.getTime();
    return Number(value) || 0;
};

const getBillingPeriodKey = (cycleStartDate: any): number => {
    const current = new Date();
    const startMs = toMillis(cycleStartDate);
    if (!startMs) return current.getFullYear() * 100 + (current.getMonth() + 1);

    const start = new Date(startMs);
    const rawAnchorDay = start.getDate();
    const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
    const anchorDay = Math.min(rawAnchorDay, lastDay);

    let year = current.getFullYear();
    let month = current.getMonth() + 1;
    if (current.getDate() < anchorDay) {
        month -= 1;
        if (month === 0) {
            month = 12;
            year -= 1;
        }
    }

    return year * 100 + month;
};

const isSubscriptionInScope = (
    subscription: FirestoreSubscriptionDoc,
    scope: AnswerlatticeAiScope,
) => (
    Number(subscription.tId ?? subscription.tenantId) === Number(scope.tId)
    && Number(subscription.sId ?? subscription.storeId) === Number(scope.sId)
);

async function refreshMonthlyCreditsIfNeeded(
    subscription: FirestoreSubscriptionDoc,
): Promise<FirestoreSubscriptionDoc> {
    if (!subscription?.id || Number(subscription.monthlyCreditsAllowance || 0) <= 0) {
        return subscription;
    }

    const billingPeriod = getBillingPeriodKey(subscription.cycleStartDate);
    if (subscription.creditsLastResetMonth === billingPeriod) {
        return subscription;
    }

    const subscriptionRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscription.id);
    return db.runTransaction(async (transaction) => {
        const subscriptionSnap = await transaction.get(subscriptionRef);
        if (!subscriptionSnap.exists) return subscription;

        const current = {
            ...(subscriptionSnap.data() as FirestoreSubscriptionDoc),
            id: subscriptionSnap.id,
        };
        const currentBillingPeriod = getBillingPeriodKey(current.cycleStartDate);
        const allowance = Number(current.monthlyCreditsAllowance || 0);
        if (current.creditsLastResetMonth === currentBillingPeriod || allowance <= 0) {
            return current;
        }

        transaction.set(subscriptionRef, {
            monthlyCredits: allowance,
            creditsLastResetMonth: currentBillingPeriod,
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
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

    const unitsRequired = getUnitCost(actionType) * Math.max(1, Number(quantity || 1));
    let subscription = preloadedSubscription === undefined
        ? await getActiveProductSubscriptionForStore(PRODUCT_IDS.ANSWERLATTICE, scope.tId, scope.sId)
        : preloadedSubscription;

    if (!subscription) {
        return {
            allowed: false,
            reason: 'no_subscription',
            remaining: 0,
            subscription: null,
            unitsRequired,
        };
    }

    if (!isSubscriptionInScope(subscription, scope)) {
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
    if (!subscription?.id || unitsToConsume <= 0) return null;

    const subscriptionRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscription.id);
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.sId));

    const balance = await db.runTransaction(async (transaction) => {
        const subscriptionSnap = await transaction.get(subscriptionRef);
        if (!subscriptionSnap.exists) return null;

        const current = {
            ...(subscriptionSnap.data() as FirestoreSubscriptionDoc),
            id: subscriptionSnap.id,
        };
        if (!isSubscriptionInScope(current, scope)) {
            throw new Error('Answerlattice subscription scope does not match this workspace.');
        }

        let monthlyCredits = Number(current.monthlyCredits || 0);
        let topUpCredits = Number(current.topUpCredits || 0);
        const monthlyCreditsAllowance = Number(current.monthlyCreditsAllowance || 0);
        const billingPeriod = getBillingPeriodKey(current.cycleStartDate);

        if (monthlyCreditsAllowance > 0 && current.creditsLastResetMonth !== billingPeriod) {
            monthlyCredits = monthlyCreditsAllowance;
        }

        const remaining = monthlyCredits + topUpCredits;
        if (remaining < unitsToConsume) {
            throw new Error('Not enough Answerlattice support credits for this operation.');
        }

        const monthlyDebit = Math.min(monthlyCredits, unitsToConsume);
        const topUpDebit = unitsToConsume - monthlyDebit;
        const nextMonthlyCredits = monthlyCredits - monthlyDebit;
        const nextTopUpCredits = topUpCredits - topUpDebit;
        const timestamp = admin.firestore.FieldValue.serverTimestamp();

        transaction.set(subscriptionRef, {
            monthlyCredits: nextMonthlyCredits,
            topUpCredits: nextTopUpCredits,
            creditsLastResetMonth: billingPeriod,
            modifiedOn: timestamp,
        }, { merge: true });
        transaction.set(storeRef, {
            'answerlatticeSubscription.monthlyCredits': nextMonthlyCredits,
            'answerlatticeSubscription.topUpCredits': nextTopUpCredits,
            'answerlatticeSubscription.creditsLastResetMonth': billingPeriod,
            'answerlatticeSubscription.updatedAt': timestamp,
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

export async function recordAnswerlatticeAiOperation(
    scope: AnswerlatticeAiScope,
    input: AiOperationLogInput,
    actor?: AnswerlatticeAiActor | null,
): Promise<string> {
    return recordAiOperation({
        ...input,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: scope.tId,
        sId: scope.sId,
        uId: input.uId ?? (actor?.id != null ? String(actor.id) : undefined),
        createdBy: input.createdBy ?? actor?.email ?? actor?.name ?? 'answerlattice',
        modifiedBy: input.modifiedBy ?? actor?.email ?? actor?.name ?? 'answerlattice',
    });
}

export async function finalizeAnswerlatticeAiOperationAccounting({
    actor,
    capacitySubscription,
    context,
    input,
    logLabel,
    scope,
}: FinalizeAnswerlatticeAiAccountingParams): Promise<FinalizeAnswerlatticeAiAccountingResult> {
    const unitsConsumed = Number(input.unitsConsumed ?? getUnitCost(input.action));
    const operationInput: AiOperationLogInput = {
        ...input,
        unitsConsumed,
    };

    let transactionId: string | null = null;
    let remainingBalance: AnswerlatticeRemainingBalance | null = null;

    try {
        transactionId = await recordAnswerlatticeAiOperation(scope, operationInput, actor);
    } catch (operationLogError) {
        logAnswerlatticeFailure(
            'answerlattice_ai_accounting_operation_log_failed',
            operationLogError,
            getAnswerlatticeAiAccountingLogContext(scope, operationInput, logLabel, unitsConsumed, capacitySubscription, context),
        );
    }

    if (capacitySubscription && unitsConsumed > 0) {
        try {
            remainingBalance = await consumeAnswerlatticeAICapacity(scope, capacitySubscription, unitsConsumed);
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
                    .doc(String(scope.tId))
                    .collection(String(scope.sId))
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
                        modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
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
