import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import {
    getCreditBillingPeriodKey,
    getNonNegativeCreditInteger,
    getPositiveCreditInteger,
} from '../sharedData/aiCreditScalarContract';

const OPERATION_ID_PATTERN = /^idem_[a-f0-9]{48}$/;
const IDEMPOTENCY_HASH_PATTERN = /^[a-f0-9]{64}$/;

function getExactScope(value: unknown): number | null {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function getExactSubscriptionScope(data: Record<string, unknown>): { tId: number; sId: number } | null {
    if (data.pId !== 'AL' || data.productId !== 'AL') return null;
    const tId = getExactScope(data.tId);
    const tenantId = getExactScope(data.tenantId);
    const sId = getExactScope(data.sId);
    const storeId = getExactScope(data.storeId);
    return tId !== null && tId === tenantId && sId !== null && sId === storeId ? { tId, sId } : null;
}

function getBillingPeriodKey(value: unknown, referenceDate: Date): number | null {
    if (
        !value
        || typeof value !== 'object'
        || typeof (value as { toDate?: unknown }).toDate !== 'function'
        || !Number.isFinite(referenceDate.getTime())
    ) return null;
    const start = (value as { toDate: () => Date }).toDate();
    if (!Number.isFinite(start.getTime())) return null;
    let year = referenceDate.getUTCFullYear();
    let month = referenceDate.getUTCMonth() + 1;
    const daysInCurrentMonth = new Date(Date.UTC(year, referenceDate.getUTCMonth() + 1, 0)).getUTCDate();
    const anchorDay = Math.min(start.getUTCDate(), daysInCurrentMonth);
    if (referenceDate.getUTCDate() < anchorDay) {
        month -= 1;
        if (month === 0) {
            month = 12;
            year -= 1;
        }
    }
    return (year * 100) + month;
}

function getTimestampMillis(value: unknown): number | null {
    if (!value || typeof value !== 'object' || typeof (value as { toMillis?: unknown }).toMillis !== 'function') return null;
    const millis = (value as { toMillis: () => unknown }).toMillis();
    return typeof millis === 'number' && Number.isSafeInteger(millis) && millis >= 0 ? millis : null;
}

function getReservationEvidence(data: Record<string, unknown>, unitsReserved: number) {
    const evidence = data.creditConsumption;
    if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return null;
    const record = evidence as Record<string, unknown>;
    const monthlyBefore = getNonNegativeCreditInteger(record.monthlyCreditsBefore);
    const topUpBefore = getNonNegativeCreditInteger(record.topUpCreditsBefore);
    const totalBefore = getNonNegativeCreditInteger(record.totalCreditsBefore);
    const monthlyDebited = getNonNegativeCreditInteger(record.monthlyCreditsDebited);
    const topUpDebited = getNonNegativeCreditInteger(record.topUpCreditsDebited);
    const evidenceUnits = getPositiveCreditInteger(record.unitsConsumed);
    const monthlyAfter = getNonNegativeCreditInteger(record.monthlyCreditsAfter);
    const topUpAfter = getNonNegativeCreditInteger(record.topUpCreditsAfter);
    const totalAfter = getNonNegativeCreditInteger(record.totalCreditsAfter);
    if ([monthlyBefore, topUpBefore, totalBefore, monthlyDebited, topUpDebited, evidenceUnits, monthlyAfter, topUpAfter, totalAfter]
        .some(value => value === null)) return null;
    const beforeSum = monthlyBefore! + topUpBefore!;
    const debitSum = monthlyDebited! + topUpDebited!;
    const afterSum = monthlyAfter! + topUpAfter!;
    if (
        !Number.isSafeInteger(beforeSum)
        || !Number.isSafeInteger(debitSum)
        || !Number.isSafeInteger(afterSum)
        || totalBefore !== beforeSum
        || evidenceUnits !== unitsReserved
        || debitSum !== unitsReserved
        || monthlyAfter !== monthlyBefore! - monthlyDebited!
        || topUpAfter !== topUpBefore! - topUpDebited!
        || totalAfter !== afterSum
        || totalBefore! - unitsReserved !== totalAfter
    ) return null;
    return { monthlyDebited: monthlyDebited!, topUpDebited: topUpDebited! };
}

export async function recoverAnswerlatticeAiCapacityReservations(params: {
    db: FirebaseFirestore.Firestore;
    failFast?: boolean;
    limit?: number;
    now: Timestamp;
}): Promise<{ errors: number; refunded: number; scanned: number }> {
    const limit = Number.isSafeInteger(params.limit) && params.limit! > 0
        ? Math.min(params.limit!, 50)
        : 20;
    const snapshot = await params.db.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_CAPACITY_RESERVATIONS)
        .where('pId', '==', 'AL')
        .where('recoveryAt', '<=', params.now)
        .limit(limit)
        .get();
    let errors = 0;
    let refunded = 0;

    for (const pointerSnapshot of snapshot.docs) {
        try {
            const didRefund = await params.db.runTransaction(async (transaction) => {
                const currentPointerSnapshot = await transaction.get(pointerSnapshot.ref);
                if (!currentPointerSnapshot.exists) return false;
                const pointer = currentPointerSnapshot.data() || {};
                const recoveryAtMillis = getTimestampMillis(pointer.recoveryAt);
                if (recoveryAtMillis === null) throw new Error('Answerlattice AI recovery time is invalid.');
                if (recoveryAtMillis > params.now.toMillis()) return false;
                const tId = getExactScope(pointer.tId);
                const sId = getExactScope(pointer.sId);
                const unitsReserved = getPositiveCreditInteger(pointer.unitsReserved);
                const operationId = pointer.operationId;
                const accountingIdempotencyHash = pointer.accountingIdempotencyHash;
                const subscriptionId = pointer.subscriptionId;
                if (
                    pointer.pId !== 'AL'
                    || tId === null
                    || sId === null
                    || unitsReserved === null
                    || typeof operationId !== 'string'
                    || !OPERATION_ID_PATTERN.test(operationId)
                    || pointerSnapshot.id !== operationId
                    || typeof accountingIdempotencyHash !== 'string'
                    || !IDEMPOTENCY_HASH_PATTERN.test(accountingIdempotencyHash)
                    || operationId !== `idem_${accountingIdempotencyHash.slice(0, 48)}`
                    || typeof subscriptionId !== 'string'
                    || !subscriptionId
                    || subscriptionId.includes('/')
                ) throw new Error('Answerlattice AI recovery pointer is invalid.');
                const operationRef = params.db.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
                    .doc(String(tId)).collection(String(sId)).doc(operationId);
                const subscriptionRef = params.db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);
                const storeRef = params.db.collection(DB_COLLECTIONS.STORES).doc(String(sId));
                const [operationSnapshot, subscriptionSnapshot] = await Promise.all([
                    transaction.get(operationRef),
                    transaction.get(subscriptionRef),
                ]);
                if (!operationSnapshot.exists || ['succeeded', 'refunded'].includes(operationSnapshot.data()?.accountingStatus)) {
                    transaction.delete(currentPointerSnapshot.ref);
                    return false;
                }
                if (!subscriptionSnapshot.exists) throw new Error('Answerlattice AI recovery subscription is unavailable.');
                const operation = operationSnapshot.data() || {};
                const subscription = subscriptionSnapshot.data() || {};
                const subscriptionScope = getExactSubscriptionScope(subscription);
                if (
                    operation.accountingStatus !== 'reserved'
                    || operation.pId !== 'AL'
                    || operation.tId !== tId
                    || operation.sId !== sId
                    || operation.action !== pointer.action
                    || operation.accountingIdempotencyHash !== accountingIdempotencyHash
                    || operation.accountingSubscriptionId !== subscriptionId
                    || getPositiveCreditInteger(operation.unitsConsumed) !== unitsReserved
                    || !subscriptionScope
                    || subscriptionScope.tId !== tId
                    || subscriptionScope.sId !== sId
                ) throw new Error('Answerlattice AI recovery identity is invalid.');
                const evidence = getReservationEvidence(operation, unitsReserved);
                const currentMonthlyCredits = getNonNegativeCreditInteger(subscription.monthlyCredits ?? 0);
                const currentTopUpCredits = getNonNegativeCreditInteger(subscription.topUpCredits ?? 0);
                const monthlyCreditCeiling = getNonNegativeCreditInteger(operation.accountingMonthlyCreditCeiling);
                const reservationBillingPeriod = getCreditBillingPeriodKey(operation.accountingReservationBillingPeriod);
                const currentBillingPeriod = getBillingPeriodKey(subscription.cycleStartDate, params.now.toDate());
                if (
                    !evidence
                    || currentMonthlyCredits === null
                    || currentTopUpCredits === null
                    || monthlyCreditCeiling === null
                    || reservationBillingPeriod === null
                    || currentBillingPeriod === null
                ) throw new Error('Answerlattice AI recovery credit evidence is invalid.');
                const nextMonthlyCredits = reservationBillingPeriod === currentBillingPeriod
                    ? Math.min(monthlyCreditCeiling, currentMonthlyCredits + evidence.monthlyDebited)
                    : currentMonthlyCredits;
                const nextTopUpCredits = currentTopUpCredits + evidence.topUpDebited;
                if (!Number.isSafeInteger(nextMonthlyCredits) || !Number.isSafeInteger(nextTopUpCredits)) {
                    throw new Error('Answerlattice AI recovery balance overflowed.');
                }
                transaction.set(subscriptionRef, {
                    monthlyCredits: nextMonthlyCredits,
                    topUpCredits: nextTopUpCredits,
                    creditsLastResetMonth: currentBillingPeriod,
                    modifiedOn: params.now,
                }, { merge: true });
                transaction.set(storeRef, {
                    answerlatticeSubscription: {
                        monthlyCredits: nextMonthlyCredits,
                        topUpCredits: nextTopUpCredits,
                        creditsLastResetMonth: currentBillingPeriod,
                        updatedAt: params.now,
                    },
                }, { merge: true });
                transaction.set(operationRef, {
                    accountingStatus: 'refunded',
                    refundReason: 'stale_support_search_reservation_recovered',
                    refundedOn: params.now,
                    reservationRecoveryAt: null,
                    modifiedOn: params.now,
                }, { merge: true });
                transaction.delete(currentPointerSnapshot.ref);
                return true;
            });
            if (didRefund) refunded += 1;
        } catch (error) {
            if (params.failFast) throw error;
            errors += 1;
        }
    }
    return { errors, refunded, scanned: snapshot.size };
}
