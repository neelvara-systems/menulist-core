import type { Timestamp } from 'firebase-admin/firestore';
import { normalizeSubscriptionDocumentId } from '../billing/reconcileSubscriptions';
import { getExactMenuListSubscriptionScope } from '../billing/subscriptionScope';
import { DB_COLLECTIONS } from '../constants/database';
import {
    getCreditBillingPeriodKey,
    getNonNegativeCreditInteger,
} from '../sharedData/aiCreditScalarContract';

const DAY_MS = 24 * 60 * 60 * 1000;
const AI_CAPACITY_REFUND_RETENTION_MS = 14 * DAY_MS;

function timestampMillis(value: unknown): number | null {
    if (!value) return null;
    if (value instanceof Date) {
        const millis = value.getTime();
        return Number.isFinite(millis) ? millis : null;
    }
    try {
        if (typeof (value as any).toMillis === 'function') {
            const millis = Number((value as any).toMillis());
            return Number.isFinite(millis) ? millis : null;
        }
        if (typeof (value as any).seconds === 'number') {
            const millis = Number((value as any).seconds) * 1000;
            return Number.isFinite(millis) ? millis : null;
        }
    } catch {
        return null;
    }
    return null;
}

function getReservationBillingPeriodKey(cycleStartDate: unknown, referenceDate: Date): number | null {
    const cycleStartMillis = timestampMillis(cycleStartDate);
    if (cycleStartMillis === null || !Number.isFinite(referenceDate.getTime())) return null;
    const cycleStart = new Date(cycleStartMillis);
    let year = referenceDate.getUTCFullYear();
    let month = referenceDate.getUTCMonth() + 1;
    const daysInCurrentMonth = new Date(Date.UTC(year, referenceDate.getUTCMonth() + 1, 0)).getUTCDate();
    const anchorDay = Math.min(cycleStart.getUTCDate(), daysInCurrentMonth);
    if (referenceDate.getUTCDate() < anchorDay) {
        month -= 1;
        if (month === 0) {
            month = 12;
            year -= 1;
        }
    }
    return (year * 100) + month;
}

export async function recoverAiCapacityReservationsInCollectionRef(params: {
    collectionRef: FirebaseFirestore.CollectionReference;
    db: FirebaseFirestore.Firestore;
    now: Timestamp;
    sId: string;
    tId: string;
    limit?: number;
}): Promise<{ scanned: number; refunded: number; deleted: number; errors: number }> {
    const queryLimit = Number.isSafeInteger(params.limit) && Number(params.limit) > 0
        ? Math.min(Number(params.limit), 50)
        : 10;
    const snapshot = await params.collectionRef
        .where('reservationRecoveryAt', '<=', params.now)
        .limit(queryLimit)
        .get();
    let refunded = 0;
    let deleted = 0;
    let errors = 0;

    for (const operationDoc of snapshot.docs) {
        try {
            const result = await params.db.runTransaction(async (transaction) => {
                const currentOperationSnap = await transaction.get(operationDoc.ref);
                if (!currentOperationSnap.exists) return 'none' as const;
                const operation = currentOperationSnap.data() || {};
                const currentRecoveryAt = timestampMillis(operation.reservationRecoveryAt);
                if (currentRecoveryAt === null || currentRecoveryAt > params.now.toMillis()) {
                    return 'none' as const;
                }
                if (String(operation.tId) !== params.tId || String(operation.sId) !== params.sId) {
                    transaction.update(operationDoc.ref, { reservationRecoveryAt: null });
                    return 'none' as const;
                }
                if (operation.accountingStatus === 'refunded') {
                    transaction.delete(operationDoc.ref);
                    return 'deleted' as const;
                }
                if (
                    operation.accountingStatus !== 'reserved'
                    || operation.accountingRecoveryMode !== 'automatic_refund'
                ) {
                    transaction.update(operationDoc.ref, { reservationRecoveryAt: null });
                    return 'none' as const;
                }

                const subscriptionId = normalizeSubscriptionDocumentId(operation.accountingSubscriptionId);
                if (!subscriptionId) throw new Error('AI capacity reservation subscription ID is invalid.');
                const subscriptionRef = params.db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);
                const subscriptionSnap = await transaction.get(subscriptionRef);
                if (!subscriptionSnap.exists) throw new Error('AI capacity reservation subscription is unavailable.');
                const subscription = subscriptionSnap.data() || {};
                const subscriptionScope = getExactMenuListSubscriptionScope(subscription);
                const billingStoreId = String(operation.accountingBillingStoreId || operation.sId || '');
                if (!subscriptionScope
                    || String(subscriptionScope.tenantId) !== params.tId
                    || !billingStoreId
                    || String(subscriptionScope.storeId) !== billingStoreId) {
                    throw new Error('AI capacity reservation subscription scope mismatch.');
                }

                const currentMonthlyCredits = getNonNegativeCreditInteger(subscription.monthlyCredits ?? 0);
                const currentTopUpCredits = getNonNegativeCreditInteger(subscription.topUpCredits ?? 0);
                const chargedMonthlyCredits = getNonNegativeCreditInteger(operation.accountingChargedMonthlyCredits ?? 0);
                const chargedTopUpCredits = getNonNegativeCreditInteger(operation.accountingChargedTopUpCredits ?? 0);
                const monthlyCreditCeiling = getNonNegativeCreditInteger(
                    operation.accountingMonthlyCreditCeiling ?? subscription.monthlyCreditsAllowance ?? 0,
                );
                if (
                    currentMonthlyCredits === null
                    || currentTopUpCredits === null
                    || chargedMonthlyCredits === null
                    || chargedTopUpCredits === null
                    || monthlyCreditCeiling === null
                ) {
                    throw new Error('AI capacity reservation refund credit evidence is invalid.');
                }

                const currentBillingPeriod = getReservationBillingPeriodKey(subscription.cycleStartDate, params.now.toDate());
                const rawReservedBillingPeriod = operation.accountingReservationBillingPeriod;
                const reservedBillingPeriod = rawReservedBillingPeriod === null
                    ? null
                    : getCreditBillingPeriodKey(rawReservedBillingPeriod);
                if (rawReservedBillingPeriod !== null && reservedBillingPeriod === null) {
                    throw new Error('AI capacity reservation refund billing period is invalid.');
                }
                const sameBillingPeriod = currentBillingPeriod === null
                    ? rawReservedBillingPeriod === null
                    : currentBillingPeriod === reservedBillingPeriod;
                const refundedMonthlyCredits = sameBillingPeriod
                    ? Math.min(chargedMonthlyCredits, Math.max(0, monthlyCreditCeiling - currentMonthlyCredits))
                    : 0;
                const nextMonthlyCredits = currentMonthlyCredits + refundedMonthlyCredits;
                const nextTopUpCredits = currentTopUpCredits + chargedTopUpCredits;
                if (!Number.isSafeInteger(nextMonthlyCredits) || !Number.isSafeInteger(nextTopUpCredits)) {
                    throw new Error('AI capacity reservation refund credit balance overflowed.');
                }

                transaction.set(subscriptionRef, {
                    monthlyCredits: nextMonthlyCredits,
                    topUpCredits: nextTopUpCredits,
                    modifiedOn: params.now,
                }, { merge: true });
                transaction.set(operationDoc.ref, {
                    accountingExpiredMonthlyCredits: chargedMonthlyCredits - refundedMonthlyCredits,
                    accountingStatus: 'refunded',
                    refundReason: 'stale_interactive_reservation_recovered',
                    refundRemainingMonthlyCredits: nextMonthlyCredits,
                    refundRemainingTopUpCredits: nextTopUpCredits,
                    refundedMonthlyCredits,
                    refundedOn: params.now,
                    refundedTopUpCredits: chargedTopUpCredits,
                    reservationRecoveryAt: new Date(params.now.toMillis() + AI_CAPACITY_REFUND_RETENTION_MS),
                    modifiedOn: params.now,
                }, { merge: true });
                return 'refunded' as const;
            });
            if (result === 'refunded') refunded++;
            if (result === 'deleted') deleted++;
        } catch {
            errors++;
        }
    }

    return { scanned: snapshot.size, refunded, deleted, errors };
}
