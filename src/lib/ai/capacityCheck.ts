import { FEATURE_FLAGS } from "@config/features";
import { getUnitCost, isFreeTierAction, OVERDRAFT_BUFFER_PERCENT } from "@constant/AI/unitCosts";
import { DB_COLLECTIONS } from "@constant/database";
import { getActiveSubscriptionForStore } from "@database/subscriptions/server";
import { normalizeBillingSubscriptionDocumentId } from "@lib/billing/subscriptionDocumentIdBoundary";
import { getBillingPeriodKey } from "@lib/billing/billingPeriod";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { normalizeAiOperationDocumentId } from "./operationLog";

/**
 * AI Capacity Check & Consumption Module
 *
 * Per-store capacity enforcement using existing subscription credits.
 * No new documents, no new collections — uses subscription.monthlyCredits + subscription.topUpCredits.
 *
 * Architecture: Per-store (not per-tenant). See spec doc §Multi-Outlet Pack Logic.
 *
 * @see __docs__/ai-enhancement-packs/ai-enhancement-packs_impl.md
 */

export interface CapacityCheckResult {
    allowed: boolean;
    unitsRequired: number;
    remaining: number;
    reason?: "free" | "sufficient" | "overdraft" | "exhausted" | "maintenance" | "no_subscription";
    subscription: FirestoreSubscriptionDoc | null;
}

async function refreshMonthlyCreditsIfNeeded(
    subscription: FirestoreSubscriptionDoc,
): Promise<FirestoreSubscriptionDoc> {
    const normalizedSubscriptionId = normalizeBillingSubscriptionDocumentId(subscription.id);
    const initialAllowance = Number(subscription.monthlyCreditsAllowance);
    if (!normalizedSubscriptionId || !Number.isFinite(initialAllowance) || initialAllowance <= 0) {
        return subscription;
    }

    const currentBillingPeriod = getBillingPeriodKey(subscription.cycleStartDate);
    if (currentBillingPeriod === null) return subscription;
    if (subscription.creditsLastResetMonth === currentBillingPeriod) {
        return subscription;
    }

    const subscriptionRef = firestoreAdmin
        .collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .doc(normalizedSubscriptionId);

    return firestoreAdmin.runTransaction(async (tx) => {
        const subscriptionSnap = await tx.get(subscriptionRef);
        if (!subscriptionSnap.exists) return subscription;

        const current = {
            ...(subscriptionSnap.data() as FirestoreSubscriptionDoc),
            id: subscriptionSnap.id,
        };
        const billingPeriod = getBillingPeriodKey(current.cycleStartDate);
        const allowance = Number(current.monthlyCreditsAllowance);

        if (billingPeriod === null || current.creditsLastResetMonth === billingPeriod || !Number.isFinite(allowance) || allowance <= 0) {
            return current;
        }

        tx.set(subscriptionRef, {
            monthlyCredits: allowance,
            creditsLastResetMonth: billingPeriod,
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        return {
            ...current,
            monthlyCredits: allowance,
            creditsLastResetMonth: billingPeriod,
        };
    });
}

/**
 * Check if a store's subscription has sufficient AI capacity for an action.
 *
 * Checks in order:
 * 1. Kill switch (ENABLE_AI_ENHANCEMENTS) — if OFF, block paid actions
 * 2. Free tier check — free actions always pass
 * 3. Subscription lookup — per-store
 * 4. Capacity check with overdraft buffer (soft enforcement at launch)
 *
 * IMPORTANT: This check happens BEFORE the Gemini API call.
 * If capacity is insufficient, the API call is never made.
 *
 * @param tenantId - Tenant ID from session
 * @param storeId - Store ID from session (capacity is per-store)
 * @param actionType - AI_ACTIONS_TYPES value
 * @param quantity - Number of items (for batch operations)
 */
export async function checkAICapacity(
    tenantId: number,
    storeId: number,
    actionType: string,
    quantity: number = 1,
    preloadedSubscription?: FirestoreSubscriptionDoc | null,
): Promise<CapacityCheckResult> {
    // Free actions always allowed (even when kill switch is OFF)
    if (isFreeTierAction(actionType)) {
        return {
            allowed: true,
            unitsRequired: 0,
            remaining: Infinity,
            reason: "free",
            subscription: null,
        };
    }

    // Kill switch check — block all paid operations when OFF
    if (!FEATURE_FLAGS.ENABLE_AI_ENHANCEMENTS) {
        return {
            allowed: false,
            unitsRequired: 0,
            remaining: 0,
            reason: "maintenance",
            subscription: null,
        };
    }

    const normalizedQuantity = Number(quantity);
    const unitsRequired = getUnitCost(actionType) * (
        Number.isSafeInteger(normalizedQuantity) && normalizedQuantity > 0 ? normalizedQuantity : 1
    );
    let subscription = preloadedSubscription === undefined
        ? await getActiveSubscriptionForStore(tenantId, storeId)
        : preloadedSubscription;

    if (!subscription) {
        return { allowed: false, unitsRequired, remaining: 0, reason: "no_subscription", subscription: null };
    }

    // Lazy monthly credit reset: handles yearly plans (no monthly webhook) 
    // and acts as safety net for monthly plans. Race-safe (idempotent reset value).
    // Uses billing-cycle anchor day (not calendar month) to avoid premature resets.
    // E.g. sub starts Feb 15 → anchor=15 → billing months are 15th-to-15th.
    subscription = await refreshMonthlyCreditsIfNeeded(subscription);

    const monthlyCredits = Number(subscription.monthlyCredits ?? 0);
    const topUpCredits = Number(subscription.topUpCredits ?? 0);
    if (
        !Number.isFinite(monthlyCredits)
        || !Number.isFinite(topUpCredits)
        || monthlyCredits < 0
        || topUpCredits < 0
    ) {
        return { allowed: false, unitsRequired, remaining: 0, reason: 'exhausted', subscription };
    }
    const remaining = monthlyCredits + topUpCredits;

    // Soft enforcement: allow overdraft up to OVERDRAFT_BUFFER_PERCENT
    const overdraftAllowance = remaining * (OVERDRAFT_BUFFER_PERCENT / 100);
    const effectiveCapacity = remaining + overdraftAllowance;
    const isOverdraft = remaining < unitsRequired && effectiveCapacity >= unitsRequired;

    return {
        allowed: effectiveCapacity >= unitsRequired,
        unitsRequired,
        remaining,
        reason: remaining >= unitsRequired ? "sufficient" : isOverdraft ? "overdraft" : "exhausted",
        subscription,
    };
}

export interface RemainingBalance {
    billingStoreId?: number;
    monthlyCredits: number;
    topUpCredits: number;
}

export type AiCapacityReservationRecoveryMode = "automatic_refund" | "durable_retry";

export interface AiCapacityReservation {
    action: string;
    billingStoreId: string;
    id: string;
    recoveryMode: AiCapacityReservationRecoveryMode;
    remainingBalance: RemainingBalance;
    sId: string;
    state: "reserved" | "consumed";
    subscriptionId: string;
    tId: string;
    unitsReserved: number;
}

type ReserveAiCapacityParams = {
    action: string;
    idempotencyKey?: string;
    pId?: string | number;
    recoveryMode?: AiCapacityReservationRecoveryMode;
    sId: string | number;
    source?: string;
    subscription: FirestoreSubscriptionDoc;
    tId: string | number;
    uId?: string | number;
    unitsToReserve: number;
};

const AI_CAPACITY_RESERVATION_TTL_MS = 30 * 60 * 1000;
const AI_CAPACITY_REFUND_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

function normalizeAccountingScope(value: unknown): string | null {
    const normalized = typeof value === "string" || typeof value === "number" ? String(value) : "";
    const numeric = Number(normalized);
    return normalized.length > 0
        && Number.isSafeInteger(numeric)
        && numeric > 0
        && String(numeric) === normalized
        ? normalized
        : null;
}

function getReservationOperationRef(tId: string, sId: string, id: string) {
    return firestoreAdmin
        .collection(DB_COLLECTIONS.MENULIST_AI_OPERATIONS)
        .doc(tId)
        .collection(sId)
        .doc(id);
}

function getPersistedBillingStoreId(data: Record<string, any>): string | null {
    return normalizeAccountingScope(data.accountingBillingStoreId)
        ?? normalizeAccountingScope(data.sId ?? data.storeId);
}

function assertReservationContract(
    data: Record<string, any>,
    expected: Pick<AiCapacityReservation, "action" | "billingStoreId" | "id" | "sId" | "subscriptionId" | "tId" | "unitsReserved">,
): void {
    if (
        data.accountingIdempotencyKey !== expected.id
        || data.action !== expected.action
        || Number(data.accountingUnits) !== expected.unitsReserved
        || normalizeAccountingScope(data.tId ?? data.tenantId) !== expected.tId
        || normalizeAccountingScope(data.sId ?? data.storeId) !== expected.sId
        || getPersistedBillingStoreId(data) !== expected.billingStoreId
        || data.accountingSubscriptionId !== expected.subscriptionId
    ) {
        throw new Error("AI capacity reservation idempotency conflict.");
    }
}

function readPersistedReservation(
    data: Record<string, any>,
    expected: Pick<AiCapacityReservation, "action" | "billingStoreId" | "id" | "sId" | "subscriptionId" | "tId" | "unitsReserved">,
): AiCapacityReservation {
    assertReservationContract(data, expected);
    if (data.accountingStatus !== "reserved" && data.accountingStatus !== "consumed") {
        throw new Error("AI capacity reservation is not available.");
    }
    const monthlyCredits = Number(data.remainingMonthlyCredits);
    const topUpCredits = Number(data.remainingTopUpCredits);
    if (!Number.isFinite(monthlyCredits) || monthlyCredits < 0 || !Number.isFinite(topUpCredits) || topUpCredits < 0) {
        throw new Error("AI capacity reservation balance is invalid.");
    }
    return {
        ...expected,
        recoveryMode: data.accountingRecoveryMode === "durable_retry" ? "durable_retry" : "automatic_refund",
        remainingBalance: { billingStoreId: Number(expected.billingStoreId), monthlyCredits, topUpCredits },
        state: data.accountingStatus,
    };
}

async function sendCreditsExhaustedLifecycleMessage(
    subscription: FirestoreSubscriptionDoc,
    unitsToConsume: number,
    balance: RemainingBalance,
) {
    if (balance.monthlyCredits !== 0 || balance.topUpCredits !== 0) return;
    try {
        const { sendLifecycleMessage } = await import('@lib/messaging');
        sendLifecycleMessage({
            storeId: String(subscription.storeId),
            tenantId: String(subscription.tenantId),
            eventType: 'CREDITS_EXHAUSTED',
            referenceId: `credits-exhausted-${subscription.storeId}-${new Date().toISOString().split('T')[0]}`,
            recipientEmail: subscription.email || '',
            storeName: subscription.name || '',
            metadata: {},
        }).catch((notificationError) => {
            logRuntimeFailure('ai_capacity_credits_exhausted_lifecycle_message_failed', notificationError, {
                eventType: 'CREDITS_EXHAUSTED',
                unitsToConsume,
                monthlyCredits: balance.monthlyCredits,
                topUpCredits: balance.topUpCredits,
                ...getBoundedRuntimeStringContext('subscriptionId', subscription.id),
                ...getBoundedRuntimeStringContext('tenantId', subscription.tenantId),
                ...getBoundedRuntimeStringContext('storeId', subscription.storeId),
            });
        });
    } catch (notificationImportError) {
        logRuntimeFailure('ai_capacity_credits_exhausted_lifecycle_message_import_failed', notificationImportError, {
            eventType: 'CREDITS_EXHAUSTED',
            unitsToConsume,
            monthlyCredits: balance.monthlyCredits,
            topUpCredits: balance.topUpCredits,
            ...getBoundedRuntimeStringContext('subscriptionId', subscription.id),
            ...getBoundedRuntimeStringContext('tenantId', subscription.tenantId),
            ...getBoundedRuntimeStringContext('storeId', subscription.storeId),
        });
    }
}

function calculateConsumedBalance(
    current: FirestoreSubscriptionDoc,
    unitsToConsume: number,
): {
    balance: RemainingBalance;
    beforeBalance: RemainingBalance;
    billingPeriod: number | null;
    chargedBalance: RemainingBalance;
} {
    const billingPeriod = getBillingPeriodKey(current.cycleStartDate);
    const monthlyAllowance = Number(current.monthlyCreditsAllowance ?? 0);
    const monthlyRemaining = billingPeriod !== null
        && current.creditsLastResetMonth !== billingPeriod
        && Number.isFinite(monthlyAllowance)
        && monthlyAllowance > 0
        ? monthlyAllowance
        : Number(current.monthlyCredits ?? 0);
    const topUpRemaining = Number(current.topUpCredits ?? 0);
    const totalRemaining = monthlyRemaining + topUpRemaining;
    const effectiveCapacity = totalRemaining * (1 + (OVERDRAFT_BUFFER_PERCENT / 100));
    if (
        !Number.isFinite(monthlyRemaining)
        || !Number.isFinite(topUpRemaining)
        || monthlyRemaining < 0
        || topUpRemaining < 0
        || totalRemaining < 0
        || unitsToConsume > effectiveCapacity
    ) {
        throw new Error('Not enough billing credits for this operation.');
    }

    if (monthlyRemaining >= unitsToConsume) {
        return {
            balance: { monthlyCredits: monthlyRemaining - unitsToConsume, topUpCredits: topUpRemaining },
            beforeBalance: { monthlyCredits: monthlyRemaining, topUpCredits: topUpRemaining },
            billingPeriod,
            chargedBalance: { monthlyCredits: unitsToConsume, topUpCredits: 0 },
        };
    }
    const chargedTopUpCredits = Math.min(topUpRemaining, Math.max(0, unitsToConsume - monthlyRemaining));
    return {
        balance: {
            monthlyCredits: 0,
            topUpCredits: topUpRemaining - chargedTopUpCredits,
        },
        beforeBalance: { monthlyCredits: monthlyRemaining, topUpCredits: topUpRemaining },
        billingPeriod,
        chargedBalance: { monthlyCredits: monthlyRemaining, topUpCredits: chargedTopUpCredits },
    };
}

/**
 * Atomically reserves paid MenuList credits before provider work begins.
 * The reservation shell intentionally has no `createdOn`, so it is excluded
 * from the existing owner/platform transaction-history query until settlement.
 */
export async function reserveAiCapacity({
    action,
    idempotencyKey,
    pId,
    recoveryMode = "automatic_refund",
    sId,
    source,
    subscription,
    tId,
    uId,
    unitsToReserve,
}: ReserveAiCapacityParams): Promise<AiCapacityReservation> {
    if (!Number.isSafeInteger(unitsToReserve) || unitsToReserve <= 0) {
        throw new Error("AI capacity reservation units must be a positive safe integer.");
    }
    const expectedTenantId = normalizeAccountingScope(tId);
    const expectedStoreId = normalizeAccountingScope(sId);
    const subscriptionTenantId = normalizeAccountingScope(subscription.tenantId ?? subscription.tId);
    const subscriptionStoreId = normalizeAccountingScope(subscription.storeId ?? subscription.sId);
    if (
        !expectedTenantId
        || !expectedStoreId
        || !subscriptionStoreId
        || subscriptionTenantId !== expectedTenantId
    ) {
        throw new Error("AI capacity reservation subscription scope mismatch.");
    }
    const subscriptionId = normalizeBillingSubscriptionDocumentId(subscription.id);
    if (!subscriptionId) throw new Error("Billing subscription is not available.");

    const operationCollection = firestoreAdmin
        .collection(DB_COLLECTIONS.MENULIST_AI_OPERATIONS)
        .doc(expectedTenantId)
        .collection(expectedStoreId);
    const generatedId = operationCollection.doc().id;
    const operationId = normalizeAiOperationDocumentId(idempotencyKey ?? generatedId);
    if (!operationId) throw new Error("Invalid AI capacity reservation idempotency key.");
    const operationRef = operationCollection.doc(operationId);
    const subscriptionRef = firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);
    const expected = {
        action,
        billingStoreId: subscriptionStoreId,
        id: operationId,
        sId: expectedStoreId,
        subscriptionId,
        tId: expectedTenantId,
        unitsReserved: unitsToReserve,
    };

    return firestoreAdmin.runTransaction(async (transaction) => {
        const [operationSnap, subscriptionSnap] = await Promise.all([
            transaction.get(operationRef),
            transaction.get(subscriptionRef),
        ]);
        const existing = operationSnap.data() || {};
        if (operationSnap.exists && existing.accountingStatus !== "refunded") {
            return readPersistedReservation(existing, expected);
        }
        if (operationSnap.exists) assertReservationContract(existing, expected);
        if (!subscriptionSnap.exists) throw new Error("Billing subscription is not available.");

        const current = { ...(subscriptionSnap.data() as FirestoreSubscriptionDoc), id: subscriptionSnap.id };
        if (
            normalizeAccountingScope(current.tenantId ?? current.tId) !== expectedTenantId
            || normalizeAccountingScope(current.storeId ?? current.sId) !== expected.billingStoreId
        ) {
            throw new Error("AI capacity reservation persisted subscription scope mismatch.");
        }
        const { balance, beforeBalance, billingPeriod, chargedBalance } = calculateConsumedBalance(current, unitsToReserve);
        const now = admin.firestore.Timestamp.now();
        const recoveryAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + AI_CAPACITY_RESERVATION_TTL_MS);
        const reservationAttempt = Number.isSafeInteger(Number(existing.accountingReservationAttempt))
            ? Number(existing.accountingReservationAttempt) + 1
            : 1;

        transaction.set(subscriptionRef, {
            monthlyCredits: balance.monthlyCredits,
            topUpCredits: balance.topUpCredits,
            ...(billingPeriod !== null ? { creditsLastResetMonth: billingPeriod } : {}),
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        transaction.set(operationRef, {
            accountingBillingStoreId: Number(expected.billingStoreId),
            accountingChargedMonthlyCredits: chargedBalance.monthlyCredits,
            accountingChargedTopUpCredits: chargedBalance.topUpCredits,
            accountingIdempotencyKey: operationId,
            accountingMonthlyCreditCeiling: Math.max(
                beforeBalance.monthlyCredits,
                Number(current.monthlyCreditsAllowance ?? 0),
            ),
            accountingRecoveryMode: recoveryMode,
            accountingReservationAttempt: reservationAttempt,
            accountingReservationBillingPeriod: billingPeriod,
            accountingStatus: "reserved",
            accountingSubscriptionId: subscriptionId,
            accountingUnits: unitsToReserve,
            action,
            billingMode: "billable",
            ...(pId !== undefined ? { pId: String(pId).toUpperCase() } : {}),
            ...(source ? { source } : {}),
            ...(uId !== undefined ? { uId: String(uId) } : {}),
            remainingMonthlyCredits: balance.monthlyCredits,
            remainingTopUpCredits: balance.topUpCredits,
            reservedOn: now,
            ...(recoveryMode === "automatic_refund" ? { reservationRecoveryAt: recoveryAt } : {}),
            sId: Number(expectedStoreId),
            tId: Number(expectedTenantId),
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
            refundedOn: admin.firestore.FieldValue.delete(),
            refundReason: admin.firestore.FieldValue.delete(),
        }, { merge: true });

        return {
            ...expected,
            recoveryMode,
            remainingBalance: { billingStoreId: Number(expected.billingStoreId), ...balance },
            state: "reserved" as const,
        };
    });
}

export async function finalizeAiCapacityReservation({
    operationData,
    reservation,
}: {
    operationData: Record<string, unknown>;
    reservation: AiCapacityReservation;
}): Promise<{ alreadyConsumed: boolean; remainingBalance: RemainingBalance }> {
    const operationRef = getReservationOperationRef(reservation.tId, reservation.sId, reservation.id);
    const subscriptionRef = firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(reservation.subscriptionId);
    const result = await firestoreAdmin.runTransaction(async (transaction) => {
        const [operationSnap, subscriptionSnap] = await Promise.all([
            transaction.get(operationRef),
            transaction.get(subscriptionRef),
        ]);
        if (!operationSnap.exists) throw new Error("AI capacity reservation is not available.");
        const existing = operationSnap.data() || {};
        assertReservationContract(existing, reservation);
        const persisted = readPersistedReservation(existing, reservation);
        if (existing.accountingStatus === "consumed") {
            return {
                alreadyConsumed: true,
                balance: persisted.remainingBalance,
                subscription: subscriptionSnap.exists
                    ? { ...(subscriptionSnap.data() as FirestoreSubscriptionDoc), id: subscriptionSnap.id }
                    : null,
            };
        }
        if (!subscriptionSnap.exists) throw new Error("Billing subscription is not available.");
        const current = { ...(subscriptionSnap.data() as FirestoreSubscriptionDoc), id: subscriptionSnap.id };
        if (
            normalizeAccountingScope(current.tenantId ?? current.tId) !== reservation.tId
            || normalizeAccountingScope(current.storeId ?? current.sId) !== reservation.billingStoreId
        ) {
            throw new Error("AI capacity reservation persisted subscription scope mismatch.");
        }
        if (
            operationData.action !== reservation.action
            || Number(operationData.unitsConsumed) !== reservation.unitsReserved
            || normalizeAccountingScope(operationData.tId ?? operationData.tenantId) !== reservation.tId
            || normalizeAccountingScope(operationData.sId ?? operationData.storeId) !== reservation.sId
        ) {
            throw new Error("AI capacity reservation settlement conflict.");
        }

        transaction.set(operationRef, {
            ...operationData,
            accountingBillingStoreId: Number(reservation.billingStoreId),
            accountingChargedMonthlyCredits: existing.accountingChargedMonthlyCredits,
            accountingChargedTopUpCredits: existing.accountingChargedTopUpCredits,
            accountingIdempotencyKey: reservation.id,
            accountingMonthlyCreditCeiling: existing.accountingMonthlyCreditCeiling,
            accountingRecoveryMode: existing.accountingRecoveryMode,
            accountingReservationAttempt: existing.accountingReservationAttempt,
            accountingReservationBillingPeriod: existing.accountingReservationBillingPeriod,
            accountingStatus: "consumed",
            accountingSubscriptionId: reservation.subscriptionId,
            accountingUnits: reservation.unitsReserved,
            remainingMonthlyCredits: persisted.remainingBalance.monthlyCredits,
            remainingTopUpCredits: persisted.remainingBalance.topUpCredits,
            reservedOn: existing.reservedOn,
            settledOn: admin.firestore.FieldValue.serverTimestamp(),
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: false });
        return { alreadyConsumed: false, balance: persisted.remainingBalance, subscription: current };
    });

    if (!result.alreadyConsumed && result.subscription) {
        await sendCreditsExhaustedLifecycleMessage(result.subscription, reservation.unitsReserved, result.balance);
    }
    return { alreadyConsumed: result.alreadyConsumed, remainingBalance: result.balance };
}

export async function refundAiCapacityReservation(
    reservation: AiCapacityReservation,
    reason: string,
): Promise<{ alreadyTerminal: boolean; remainingBalance: RemainingBalance | null }> {
    const operationRef = getReservationOperationRef(reservation.tId, reservation.sId, reservation.id);
    const subscriptionRef = firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(reservation.subscriptionId);
    return firestoreAdmin.runTransaction(async (transaction) => {
        const [operationSnap, subscriptionSnap] = await Promise.all([
            transaction.get(operationRef),
            transaction.get(subscriptionRef),
        ]);
        if (!operationSnap.exists) return { alreadyTerminal: true, remainingBalance: null };
        const existing = operationSnap.data() || {};
        assertReservationContract(existing, reservation);
        if (existing.accountingStatus === "consumed" || existing.accountingStatus === "refunded") {
            const monthlyCredits = Number(existing.refundRemainingMonthlyCredits ?? existing.remainingMonthlyCredits);
            const topUpCredits = Number(existing.refundRemainingTopUpCredits ?? existing.remainingTopUpCredits);
            return {
                alreadyTerminal: true,
                remainingBalance: Number.isFinite(monthlyCredits) && Number.isFinite(topUpCredits)
                    ? { billingStoreId: Number(reservation.billingStoreId), monthlyCredits, topUpCredits }
                    : null,
            };
        }
        if (existing.accountingStatus !== "reserved" || !subscriptionSnap.exists) {
            throw new Error("AI capacity reservation refund evidence is not available.");
        }
        const current = { ...(subscriptionSnap.data() as FirestoreSubscriptionDoc), id: subscriptionSnap.id };
        if (
            normalizeAccountingScope(current.tenantId ?? current.tId) !== reservation.tId
            || normalizeAccountingScope(current.storeId ?? current.sId) !== reservation.billingStoreId
        ) {
            throw new Error("AI capacity reservation persisted subscription scope mismatch.");
        }
        const currentMonthlyCredits = Number(current.monthlyCredits ?? 0);
        const currentTopUpCredits = Number(current.topUpCredits ?? 0);
        const chargedMonthlyCredits = Number(existing.accountingChargedMonthlyCredits ?? 0);
        const chargedTopUpCredits = Number(existing.accountingChargedTopUpCredits ?? 0);
        const monthlyCreditCeiling = Number(existing.accountingMonthlyCreditCeiling ?? current.monthlyCreditsAllowance ?? 0);
        if (
            !Number.isFinite(currentMonthlyCredits) || currentMonthlyCredits < 0
            || !Number.isFinite(currentTopUpCredits) || currentTopUpCredits < 0
            || !Number.isFinite(chargedMonthlyCredits) || chargedMonthlyCredits < 0
            || !Number.isFinite(chargedTopUpCredits) || chargedTopUpCredits < 0
            || !Number.isFinite(monthlyCreditCeiling) || monthlyCreditCeiling < 0
        ) {
            throw new Error("AI capacity reservation refund credit evidence is invalid.");
        }
        const currentBillingPeriod = getBillingPeriodKey(current.cycleStartDate);
        const reservedBillingPeriod = Number(existing.accountingReservationBillingPeriod);
        const sameBillingPeriod = currentBillingPeriod === null
            ? existing.accountingReservationBillingPeriod === null
            : currentBillingPeriod === reservedBillingPeriod;
        const refundedMonthlyCredits = sameBillingPeriod
            ? Math.min(chargedMonthlyCredits, Math.max(0, monthlyCreditCeiling - currentMonthlyCredits))
            : 0;
        const nextBalance = {
            billingStoreId: Number(reservation.billingStoreId),
            monthlyCredits: currentMonthlyCredits + refundedMonthlyCredits,
            topUpCredits: currentTopUpCredits + chargedTopUpCredits,
        };
        const now = admin.firestore.Timestamp.now();
        transaction.set(subscriptionRef, {
            monthlyCredits: nextBalance.monthlyCredits,
            topUpCredits: nextBalance.topUpCredits,
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        transaction.set(operationRef, {
            accountingExpiredMonthlyCredits: chargedMonthlyCredits - refundedMonthlyCredits,
            accountingStatus: "refunded",
            refundReason: String(reason || "provider_work_failed")
                .replace(/[\u0000-\u001f\u007f]/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 240),
            refundRemainingMonthlyCredits: nextBalance.monthlyCredits,
            refundRemainingTopUpCredits: nextBalance.topUpCredits,
            refundedMonthlyCredits,
            refundedOn: now,
            refundedTopUpCredits: chargedTopUpCredits,
            reservationRecoveryAt: admin.firestore.Timestamp.fromMillis(now.toMillis() + AI_CAPACITY_REFUND_RETENTION_MS),
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return { alreadyTerminal: false, remainingBalance: nextBalance };
    });
}

export async function refundAiCapacityReservationSafely(
    reservation: AiCapacityReservation | null | undefined,
    reason: string,
    context: Record<string, unknown> = {},
): Promise<void> {
    if (!reservation) return;
    try {
        await refundAiCapacityReservation(reservation, reason);
    } catch (error) {
        logRuntimeFailure("ai_capacity_reservation_refund_failed", error, {
            ...getBoundedRuntimeStringContext("action", reservation.action),
            ...getBoundedRuntimeStringContext("operationId", reservation.id),
            ...getBoundedRuntimeStringContext("storeId", reservation.sId),
            ...getBoundedRuntimeStringContext("tenantId", reservation.tId),
            ...context,
            unitsReserved: reservation.unitsReserved,
        });
    }
}

export async function refundDurableAiCapacityReservationByIdSafely({
    action,
    context = {},
    operationId,
    reason,
    sId,
    tId,
}: {
    action: string;
    context?: Record<string, string | number | boolean>;
    operationId: string;
    reason: string;
    sId: string | number;
    tId: string | number;
}): Promise<void> {
    const tenantId = normalizeAccountingScope(tId);
    const storeId = normalizeAccountingScope(sId);
    const normalizedOperationId = normalizeAiOperationDocumentId(operationId);
    if (!tenantId || !storeId || !normalizedOperationId) {
        logRuntimeFailure("ai_capacity_durable_reservation_refund_scope_invalid", undefined, {
            ...getBoundedRuntimeStringContext("operationId", operationId),
            ...getBoundedRuntimeStringContext("storeId", sId),
            ...getBoundedRuntimeStringContext("tenantId", tId),
            ...context,
        });
        return;
    }

    try {
        const operationSnap = await getReservationOperationRef(tenantId, storeId, normalizedOperationId).get();
        if (!operationSnap.exists) return;
        const operation = operationSnap.data() || {};
        if (operation.accountingStatus === "consumed" || operation.accountingStatus === "refunded") return;
        const subscriptionId = normalizeBillingSubscriptionDocumentId(operation.accountingSubscriptionId);
        const billingStoreId = getPersistedBillingStoreId(operation);
        const unitsReserved = Number(operation.accountingUnits);
        if (
            operation.accountingStatus !== "reserved"
            || operation.accountingRecoveryMode !== "durable_retry"
            || operation.action !== action
            || !subscriptionId
            || !billingStoreId
            || !Number.isSafeInteger(unitsReserved)
            || unitsReserved <= 0
        ) {
            throw new Error("Durable AI capacity reservation evidence is invalid.");
        }
        const reservation = readPersistedReservation(operation, {
            action,
            billingStoreId,
            id: normalizedOperationId,
            sId: storeId,
            subscriptionId,
            tId: tenantId,
            unitsReserved,
        });
        await refundAiCapacityReservation(reservation, reason);
    } catch (error) {
        logRuntimeFailure("ai_capacity_durable_reservation_refund_failed", error, {
            ...getBoundedRuntimeStringContext("action", action),
            ...getBoundedRuntimeStringContext("operationId", normalizedOperationId),
            ...getBoundedRuntimeStringContext("storeId", storeId),
            ...getBoundedRuntimeStringContext("tenantId", tenantId),
            ...context,
        });
    }
}

/**
 * Consume AI capacity from a store's subscription.
 * Decrements monthlyCredits first, then topUpCredits.
 *
 * Returns the new balance so the API route can include it in the response,
 * allowing the frontend to update state without an extra Firebase read.
 *
 * Legacy compatibility helper for historical idempotent accounting replay.
 * New paid provider paths must use reserveAiCapacity() before provider work.
 *
 * @param subscription - The subscription document (from checkAICapacity result)
 * @param unitsToConsume - Number of internal units to consume
 * @returns The updated balance after consumption
 */
export async function consumeAICapacity(
    subscription: FirestoreSubscriptionDoc,
    unitsToConsume: number,
): Promise<RemainingBalance | null> {
    if (unitsToConsume === 0) return null;
    if (!Number.isSafeInteger(unitsToConsume) || unitsToConsume < 0) {
        throw new Error('AI accounting units must be a positive safe integer.');
    }

    const normalizedSubscriptionId = normalizeBillingSubscriptionDocumentId(subscription?.id);
    if (!normalizedSubscriptionId) {
        throw new Error("Billing subscription is not available.");
    }

    const subscriptionRef = firestoreAdmin
        .collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .doc(normalizedSubscriptionId);

    const updatedBalance = await firestoreAdmin.runTransaction(async (tx) => {
        const subscriptionSnap = await tx.get(subscriptionRef);
        if (!subscriptionSnap.exists) return null;

        const current = subscriptionSnap.data() as FirestoreSubscriptionDoc;
        const billingStoreId = normalizeAccountingScope(current.storeId ?? current.sId);
        if (!billingStoreId) throw new Error('Billing subscription scope is invalid.');
        const { balance, billingPeriod } = calculateConsumedBalance(current, unitsToConsume);

        tx.set(subscriptionRef, {
            monthlyCredits: balance.monthlyCredits,
            topUpCredits: balance.topUpCredits,
            ...(billingPeriod !== null ? { creditsLastResetMonth: billingPeriod } : {}),
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        return {
            billingStoreId: Number(billingStoreId),
            monthlyCredits: balance.monthlyCredits,
            topUpCredits: balance.topUpCredits,
            subscription: current,
        };
    });

    if (!updatedBalance) return null;

    await sendCreditsExhaustedLifecycleMessage(updatedBalance.subscription, unitsToConsume, updatedBalance);

    return {
        billingStoreId: updatedBalance.billingStoreId,
        monthlyCredits: updatedBalance.monthlyCredits,
        topUpCredits: updatedBalance.topUpCredits,
    };
}

export async function consumeAICapacityIdempotently({
    idempotencyKey,
    operationData,
    operationRef,
    subscription,
    unitsToConsume,
}: {
    idempotencyKey: string;
    operationData: Record<string, unknown>;
    operationRef: FirebaseFirestore.DocumentReference;
    subscription: FirestoreSubscriptionDoc;
    unitsToConsume: number;
}): Promise<{ alreadyConsumed: boolean; remainingBalance: RemainingBalance }> {
    if (!Number.isSafeInteger(unitsToConsume) || unitsToConsume <= 0) {
        throw new Error('AI accounting units must be a positive safe integer.');
    }
    const expectedTenantId = normalizeAccountingScope(operationData.tId ?? operationData.tenantId);
    const expectedStoreId = normalizeAccountingScope(operationData.sId ?? operationData.storeId);
    const subscriptionTenantId = normalizeAccountingScope(subscription.tenantId ?? subscription.tId);
    const subscriptionStoreId = normalizeAccountingScope(subscription.storeId ?? subscription.sId);
    if (
        !expectedTenantId
        || !expectedStoreId
        || !subscriptionStoreId
        || subscriptionTenantId !== expectedTenantId
    ) {
        throw new Error('AI accounting subscription scope mismatch.');
    }
    const normalizedSubscriptionId = normalizeBillingSubscriptionDocumentId(subscription?.id);
    if (!normalizedSubscriptionId) throw new Error('Billing subscription is not available.');
    const subscriptionRef = firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(normalizedSubscriptionId);

    const result = await firestoreAdmin.runTransaction(async (transaction) => {
        const operationSnap = await transaction.get(operationRef);
        const subscriptionSnap = await transaction.get(subscriptionRef);
        if (operationSnap.exists) {
            const existing = operationSnap.data() || {};
            if (
                existing.accountingIdempotencyKey !== idempotencyKey
                || Number(existing.accountingUnits) !== unitsToConsume
                || normalizeAccountingScope(existing.tId ?? existing.tenantId) !== expectedTenantId
                || normalizeAccountingScope(existing.sId ?? existing.storeId) !== expectedStoreId
                || existing.action !== operationData.action
            ) {
                throw new Error('AI accounting idempotency conflict.');
            }
            if (existing.accountingStatus === 'consumed') {
                const monthlyCredits = Number(existing.remainingMonthlyCredits);
                const topUpCredits = Number(existing.remainingTopUpCredits);
                if (!Number.isFinite(monthlyCredits) || !Number.isFinite(topUpCredits)) {
                    throw new Error('AI accounting replay state is invalid.');
                }
                return {
                    alreadyConsumed: true,
                    balance: { billingStoreId: Number(subscriptionStoreId), monthlyCredits, topUpCredits },
                    subscription: subscriptionSnap.exists
                        ? { ...(subscriptionSnap.data() as FirestoreSubscriptionDoc), id: subscriptionSnap.id }
                        : subscription,
                };
            }
        }
        if (!subscriptionSnap.exists) throw new Error('Billing subscription is not available.');
        const current = { ...(subscriptionSnap.data() as FirestoreSubscriptionDoc), id: subscriptionSnap.id };
        if (
            normalizeAccountingScope(current.tenantId ?? current.tId) !== expectedTenantId
            || normalizeAccountingScope(current.storeId ?? current.sId) !== subscriptionStoreId
        ) {
            throw new Error('AI accounting persisted subscription scope mismatch.');
        }
        const { balance, billingPeriod } = calculateConsumedBalance(current, unitsToConsume);
        transaction.set(subscriptionRef, {
            monthlyCredits: balance.monthlyCredits,
            topUpCredits: balance.topUpCredits,
            ...(billingPeriod !== null ? { creditsLastResetMonth: billingPeriod } : {}),
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        transaction.set(operationRef, {
            ...operationData,
            accountingBillingStoreId: Number(subscriptionStoreId),
            accountingIdempotencyKey: idempotencyKey,
            accountingStatus: 'consumed',
            accountingUnits: unitsToConsume,
            remainingMonthlyCredits: balance.monthlyCredits,
            remainingTopUpCredits: balance.topUpCredits,
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: false });
        return {
            alreadyConsumed: false,
            balance: { billingStoreId: Number(subscriptionStoreId), ...balance },
            subscription: current,
        };
    });

    if (!result.alreadyConsumed) {
        await sendCreditsExhaustedLifecycleMessage(result.subscription, unitsToConsume, result.balance);
    }
    return { alreadyConsumed: result.alreadyConsumed, remainingBalance: result.balance };
}
