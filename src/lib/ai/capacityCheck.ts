import { FEATURE_FLAGS } from "@config/features";
import { getUnitCost, isFreeTierAction } from "@constant/AI/unitCosts";
import { DB_COLLECTIONS } from "@constant/database";
import {
    getCreditBillingPeriodKey,
    getNonNegativeCreditInteger,
    getPositiveCreditInteger,
} from "@data/shared/aiCreditScalarContract";
import {
    MENULIST_CONTENT_CREDIT_RATE_VERSION,
    resolveMenuListPromotionalCreditState,
} from "@data/shared/contentCreditPolicy";
import { resolveMenuListCreditNotification } from "@data/shared/creditNotificationPolicy";
import { getActiveSubscriptionForStore } from "@database/subscriptions/server";
import { getMenuListSubscriptionEntitlementScope } from "@lib/billing/menuListSubscriptionEntitlementBoundary";
import { normalizeBillingSubscriptionDocumentId } from "@lib/billing/subscriptionDocumentIdBoundary";
import { getBillingPeriodKey } from "@lib/billing/billingPeriod";
import {
    hasCurrentSubscriptionPlanEntitlement,
    hasVerifiedSubscriptionPaymentEvidence,
} from "@lib/billing/subscriptionPlanEntitlement";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { getGracePeriodInfo } from "@util/razorpay";
import { normalizeAiOperationDocumentId } from "./operationLog";

/**
 * AI Capacity Check & Consumption Module
 *
 * Effective-billing-subscription capacity enforcement using recurring,
 * promotional, and purchased credit buckets. Acting-store operation history
 * remains separate from the subscription that funds the work.
 *
 * Architecture: directly billed store or inherited Multi-location HQ scope.
 *
 * @see __docs__/ai-enhancement-packs/ai-enhancement-packs_impl.md
 */

export interface CapacityCheckResult {
    allowed: boolean;
    unitsRequired: number;
    remaining: number;
    reason?: "free" | "sufficient" | "exhausted" | "maintenance" | "no_subscription";
    subscription: FirestoreSubscriptionDoc | null;
}

function getAvailablePromotionalCredits(
    subscription: Pick<FirestoreSubscriptionDoc, "promotionalCredits" | "promotionalCreditsExpireAt">,
    nowMs = Date.now(),
): { credits: number | null; expiresAtMillis: number | null } {
    return resolveMenuListPromotionalCreditState({
        credits: subscription.promotionalCredits,
        expiresAt: subscription.promotionalCreditsExpireAt,
        nowMs,
    });
}

export function hasCurrentAiCapacitySubscriptionEntitlement(
    subscription: FirestoreSubscriptionDoc,
    nowMs = Date.now(),
): boolean {
    if (!Number.isFinite(nowMs) || nowMs < 0) return false;
    if (!hasVerifiedSubscriptionPaymentEvidence(subscription)) return false;
    if (subscription.status !== "past_due") {
        return hasCurrentSubscriptionPlanEntitlement(subscription, nowMs);
    }
    const gracePeriod = getGracePeriodInfo(subscription.pastDueSinceAt, 7, new Date(nowMs));
    return gracePeriod.hasKnownGracePeriod && gracePeriod.remainingDays > 0;
}

async function refreshMonthlyCreditsIfNeeded(
    subscription: FirestoreSubscriptionDoc,
): Promise<FirestoreSubscriptionDoc> {
    const normalizedSubscriptionId = normalizeBillingSubscriptionDocumentId(subscription.id);
    const expectedScope = getMenuListSubscriptionEntitlementScope(subscription);
    const initialAllowance = getPositiveCreditInteger(subscription.monthlyCreditsAllowance);
    if (!normalizedSubscriptionId || !expectedScope || initialAllowance === null) {
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
        const currentScope = getMenuListSubscriptionEntitlementScope(current);
        if (
            !currentScope
            || currentScope.tenantId !== expectedScope.tenantId
            || currentScope.storeId !== expectedScope.storeId
        ) {
            throw new Error('Billing subscription scope is invalid.');
        }
        if (!hasCurrentAiCapacitySubscriptionEntitlement(current)) {
            throw new Error('Billing subscription entitlement is not current.');
        }
        const billingPeriod = getBillingPeriodKey(current.cycleStartDate);
        const allowance = getPositiveCreditInteger(current.monthlyCreditsAllowance);

        if (billingPeriod === null || current.creditsLastResetMonth === billingPeriod || allowance === null) {
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
 * 4. Strict capacity check across recurring, valid promotional, and purchased credits
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

    const normalizedQuantity = quantity;
    const unitsRequired = getUnitCost(actionType) * (
        Number.isSafeInteger(normalizedQuantity) && normalizedQuantity > 0 ? normalizedQuantity : 1
    );
    let subscription = preloadedSubscription === undefined
        ? await getActiveSubscriptionForStore(tenantId, storeId)
        : preloadedSubscription;

    if (!subscription) {
        return { allowed: false, unitsRequired, remaining: 0, reason: "no_subscription", subscription: null };
    }
    const subscriptionScope = getMenuListSubscriptionEntitlementScope(subscription);
    if (!subscriptionScope || subscriptionScope.tenantId !== tenantId) {
        return { allowed: false, unitsRequired, remaining: 0, reason: "no_subscription", subscription: null };
    }
    if (!hasCurrentAiCapacitySubscriptionEntitlement(subscription)) {
        return { allowed: false, unitsRequired, remaining: 0, reason: "no_subscription", subscription: null };
    }

    // Lazy monthly credit reset: handles yearly plans (no monthly webhook) 
    // and acts as safety net for monthly plans. Race-safe (idempotent reset value).
    // Uses billing-cycle anchor day (not calendar month) to avoid premature resets.
    // E.g. sub starts Feb 15 → anchor=15 → billing months are 15th-to-15th.
    subscription = await refreshMonthlyCreditsIfNeeded(subscription);
    if (!hasCurrentAiCapacitySubscriptionEntitlement(subscription)) {
        return { allowed: false, unitsRequired, remaining: 0, reason: "no_subscription", subscription: null };
    }

    const monthlyCredits = getNonNegativeCreditInteger(subscription.monthlyCredits ?? 0);
    const promotional = getAvailablePromotionalCredits(subscription);
    const topUpCredits = getNonNegativeCreditInteger(subscription.topUpCredits ?? 0);
    if (
        monthlyCredits === null
        || promotional.credits === null
        || topUpCredits === null
    ) {
        return { allowed: false, unitsRequired, remaining: 0, reason: 'exhausted', subscription };
    }
    const remaining = monthlyCredits + promotional.credits + topUpCredits;
    if (!Number.isSafeInteger(remaining)) {
        return { allowed: false, unitsRequired, remaining: 0, reason: 'exhausted', subscription };
    }

    return {
        allowed: remaining >= unitsRequired,
        unitsRequired,
        remaining,
        reason: remaining >= unitsRequired ? "sufficient" : "exhausted",
        subscription,
    };
}

export interface RemainingBalance {
    billingStoreId?: number;
    monthlyCredits: number;
    promotionalCredits: number;
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

function getExactAccountingScopeAlias(
    data: Record<string, unknown>,
    compactKey: 'sId' | 'tId',
    legacyKey: 'storeId' | 'tenantId',
): string | null {
    const values = [data[compactKey], data[legacyKey]].filter((value) => value !== undefined);
    if (values.length === 0) return null;
    const normalized = values.map(normalizeAccountingScope);
    const [first] = normalized;
    return first && normalized.every((value) => value === first) ? first : null;
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
        ?? getExactAccountingScopeAlias(data, 'sId', 'storeId');
}

function assertReservationContract(
    data: Record<string, any>,
    expected: Pick<AiCapacityReservation, "action" | "billingStoreId" | "id" | "sId" | "subscriptionId" | "tId" | "unitsReserved">,
): void {
    if (
        data.accountingIdempotencyKey !== expected.id
        || data.action !== expected.action
        || data.accountingUnits !== expected.unitsReserved
        || getExactAccountingScopeAlias(data, 'tId', 'tenantId') !== expected.tId
        || getExactAccountingScopeAlias(data, 'sId', 'storeId') !== expected.sId
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
    const monthlyCredits = getNonNegativeCreditInteger(data.remainingMonthlyCredits);
    const promotionalCredits = getNonNegativeCreditInteger(data.remainingPromotionalCredits ?? 0);
    const topUpCredits = getNonNegativeCreditInteger(data.remainingTopUpCredits);
    if (monthlyCredits === null || promotionalCredits === null || topUpCredits === null) {
        throw new Error("AI capacity reservation balance is invalid.");
    }
    return {
        ...expected,
        recoveryMode: data.accountingRecoveryMode === "durable_retry" ? "durable_retry" : "automatic_refund",
        remainingBalance: {
            billingStoreId: Number(expected.billingStoreId),
            monthlyCredits,
            promotionalCredits,
            topUpCredits,
        },
        state: data.accountingStatus,
    };
}

async function sendCreditBalanceLifecycleMessage(
    subscription: FirestoreSubscriptionDoc,
    unitsToConsume: number,
    balance: RemainingBalance,
) {
    const totalRemaining = balance.monthlyCredits + balance.promotionalCredits + balance.topUpCredits;
    const monthlyAllowance = getNonNegativeCreditInteger(subscription.monthlyCreditsAllowance ?? 0) ?? 0;
    const { eventType } = resolveMenuListCreditNotification({ monthlyAllowance, remainingCredits: totalRemaining });
    if (!eventType) return;
    const subscriptionScope = getMenuListSubscriptionEntitlementScope(subscription);
    if (!subscriptionScope) return;
    const billingPeriod = getBillingPeriodKey(subscription.cycleStartDate) || new Date().toISOString().slice(0, 7);
    try {
        const { sendLifecycleMessage } = await import('@lib/messaging');
        await sendLifecycleMessage({
            storeId: String(subscriptionScope.storeId),
            tenantId: String(subscriptionScope.tenantId),
            eventType,
            referenceId: `${eventType.toLowerCase()}-${subscriptionScope.storeId}-${billingPeriod}`,
            recipientEmail: subscription.email || '',
            storeName: subscription.name || '',
            metadata: { remainingCredits: totalRemaining },
        }).catch((notificationError) => {
            logRuntimeFailure('ai_capacity_credits_exhausted_lifecycle_message_failed', notificationError, {
                eventType,
                unitsToConsume,
                monthlyCredits: balance.monthlyCredits,
                promotionalCredits: balance.promotionalCredits,
                topUpCredits: balance.topUpCredits,
                ...getBoundedRuntimeStringContext('subscriptionId', subscription.id),
                ...getBoundedRuntimeStringContext('tenantId', subscription.tenantId),
                ...getBoundedRuntimeStringContext('storeId', subscription.storeId),
            });
        });
    } catch (notificationImportError) {
        logRuntimeFailure('ai_capacity_credits_exhausted_lifecycle_message_import_failed', notificationImportError, {
            eventType,
            unitsToConsume,
            monthlyCredits: balance.monthlyCredits,
            promotionalCredits: balance.promotionalCredits,
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
    promotionalCreditsExpireAtMillis: number | null;
} {
    if (!hasCurrentAiCapacitySubscriptionEntitlement(current)) {
        throw new Error('Billing subscription entitlement is not current.');
    }
    const billingPeriod = getBillingPeriodKey(current.cycleStartDate);
    const monthlyAllowance = getNonNegativeCreditInteger(current.monthlyCreditsAllowance ?? 0);
    const storedMonthlyCredits = getNonNegativeCreditInteger(current.monthlyCredits ?? 0);
    const promotional = getAvailablePromotionalCredits(current);
    const topUpRemaining = getNonNegativeCreditInteger(current.topUpCredits ?? 0);
    if (
        monthlyAllowance === null
        || storedMonthlyCredits === null
        || promotional.credits === null
        || topUpRemaining === null
    ) {
        throw new Error('Not enough billing credits for this operation.');
    }
    const monthlyRemaining = billingPeriod !== null
        && current.creditsLastResetMonth !== billingPeriod
        && monthlyAllowance > 0
        ? monthlyAllowance
        : storedMonthlyCredits;
    const totalRemaining = monthlyRemaining + promotional.credits + topUpRemaining;
    if (
        !Number.isSafeInteger(totalRemaining)
        || totalRemaining < 0
        || unitsToConsume > totalRemaining
    ) {
        throw new Error('Not enough billing credits for this operation.');
    }

    if (monthlyRemaining >= unitsToConsume) {
        return {
            balance: {
                monthlyCredits: monthlyRemaining - unitsToConsume,
                promotionalCredits: promotional.credits,
                topUpCredits: topUpRemaining,
            },
            beforeBalance: {
                monthlyCredits: monthlyRemaining,
                promotionalCredits: promotional.credits,
                topUpCredits: topUpRemaining,
            },
            billingPeriod,
            chargedBalance: { monthlyCredits: unitsToConsume, promotionalCredits: 0, topUpCredits: 0 },
            promotionalCreditsExpireAtMillis: promotional.expiresAtMillis,
        };
    }
    const afterMonthly = unitsToConsume - monthlyRemaining;
    const chargedPromotionalCredits = Math.min(promotional.credits, afterMonthly);
    const chargedTopUpCredits = Math.min(topUpRemaining, afterMonthly - chargedPromotionalCredits);
    return {
        balance: {
            monthlyCredits: 0,
            promotionalCredits: promotional.credits - chargedPromotionalCredits,
            topUpCredits: topUpRemaining - chargedTopUpCredits,
        },
        beforeBalance: {
            monthlyCredits: monthlyRemaining,
            promotionalCredits: promotional.credits,
            topUpCredits: topUpRemaining,
        },
        billingPeriod,
        chargedBalance: {
            monthlyCredits: monthlyRemaining,
            promotionalCredits: chargedPromotionalCredits,
            topUpCredits: chargedTopUpCredits,
        },
        promotionalCreditsExpireAtMillis: promotional.expiresAtMillis,
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
    const subscriptionScope = getMenuListSubscriptionEntitlementScope(subscription);
    const subscriptionTenantId = subscriptionScope ? String(subscriptionScope.tenantId) : null;
    const subscriptionStoreId = subscriptionScope ? String(subscriptionScope.storeId) : null;
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

        const current = {
            ...(subscriptionSnap.data() as FirestoreSubscriptionDoc),
            id: subscriptionSnap.id,
        };
        const currentScope = getMenuListSubscriptionEntitlementScope(current);
        if (
            !currentScope
            || String(currentScope.tenantId) !== expectedTenantId
            || String(currentScope.storeId) !== expected.billingStoreId
        ) {
            throw new Error("AI capacity reservation persisted subscription scope mismatch.");
        }
        const {
            balance,
            beforeBalance,
            billingPeriod,
            chargedBalance,
            promotionalCreditsExpireAtMillis,
        } = calculateConsumedBalance(current, unitsToReserve);
        const now = admin.firestore.Timestamp.now();
        const recoveryAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + AI_CAPACITY_RESERVATION_TTL_MS);
        const priorReservationAttempt = existing.accountingReservationAttempt === undefined
            ? 0
            : getNonNegativeCreditInteger(existing.accountingReservationAttempt);
        if (priorReservationAttempt === null || priorReservationAttempt >= Number.MAX_SAFE_INTEGER) {
            throw new Error('AI capacity reservation attempt is invalid.');
        }
        const reservationAttempt = priorReservationAttempt + 1;

        transaction.set(subscriptionRef, {
            monthlyCredits: balance.monthlyCredits,
            promotionalCredits: balance.promotionalCredits,
            topUpCredits: balance.topUpCredits,
            ...(billingPeriod !== null ? { creditsLastResetMonth: billingPeriod } : {}),
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        transaction.set(operationRef, {
            accountingBillingStoreId: Number(expected.billingStoreId),
            accountingChargedMonthlyCredits: chargedBalance.monthlyCredits,
            accountingChargedPromotionalCredits: chargedBalance.promotionalCredits,
            accountingChargedTopUpCredits: chargedBalance.topUpCredits,
            accountingCreditRateVersion: MENULIST_CONTENT_CREDIT_RATE_VERSION,
            accountingIdempotencyKey: operationId,
            accountingMonthlyCreditCeiling: Math.max(
                beforeBalance.monthlyCredits,
                getNonNegativeCreditInteger(current.monthlyCreditsAllowance ?? 0) ?? 0,
            ),
            accountingPromotionalCreditCeiling: beforeBalance.promotionalCredits,
            accountingPromotionalCreditsExpireAtMillis: promotionalCreditsExpireAtMillis,
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
            remainingPromotionalCredits: balance.promotionalCredits,
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
            remainingBalance: {
                billingStoreId: Number(expected.billingStoreId),
                ...balance,
            },
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
            const replaySubscription = subscriptionSnap.exists
                ? {
                      ...(subscriptionSnap.data() as FirestoreSubscriptionDoc),
                      id: subscriptionSnap.id,
                  }
                : null;
            const replayScope = replaySubscription
                ? getMenuListSubscriptionEntitlementScope(replaySubscription)
                : null;
            if (
                replaySubscription
                && (
                    !replayScope
                    || String(replayScope.tenantId) !== reservation.tId
                    || String(replayScope.storeId) !== reservation.billingStoreId
                )
            ) {
                throw new Error('Billing subscription scope is invalid.');
            }
            return {
                alreadyConsumed: true,
                balance: persisted.remainingBalance,
                subscription: replaySubscription,
            };
        }
        if (!subscriptionSnap.exists) throw new Error("Billing subscription is not available.");
        const current = { ...(subscriptionSnap.data() as FirestoreSubscriptionDoc), id: subscriptionSnap.id };
        const currentScope = getMenuListSubscriptionEntitlementScope(current);
        if (
            !currentScope
            || String(currentScope.tenantId) !== reservation.tId
            || String(currentScope.storeId) !== reservation.billingStoreId
        ) {
            throw new Error("AI capacity reservation persisted subscription scope mismatch.");
        }
        if (
            operationData.action !== reservation.action
            || operationData.unitsConsumed !== reservation.unitsReserved
            || getExactAccountingScopeAlias(operationData, 'tId', 'tenantId') !== reservation.tId
            || getExactAccountingScopeAlias(operationData, 'sId', 'storeId') !== reservation.sId
        ) {
            throw new Error("AI capacity reservation settlement conflict.");
        }

        transaction.set(operationRef, {
            ...operationData,
            accountingBillingStoreId: Number(reservation.billingStoreId),
            accountingChargedMonthlyCredits: existing.accountingChargedMonthlyCredits,
            accountingChargedPromotionalCredits: existing.accountingChargedPromotionalCredits,
            accountingChargedTopUpCredits: existing.accountingChargedTopUpCredits,
            accountingCreditRateVersion: existing.accountingCreditRateVersion,
            accountingIdempotencyKey: reservation.id,
            accountingMonthlyCreditCeiling: existing.accountingMonthlyCreditCeiling,
            accountingPromotionalCreditCeiling: existing.accountingPromotionalCreditCeiling,
            accountingPromotionalCreditsExpireAtMillis: existing.accountingPromotionalCreditsExpireAtMillis,
            accountingRecoveryMode: existing.accountingRecoveryMode,
            accountingReservationAttempt: existing.accountingReservationAttempt,
            accountingReservationBillingPeriod: existing.accountingReservationBillingPeriod,
            accountingStatus: "consumed",
            accountingSubscriptionId: reservation.subscriptionId,
            accountingUnits: reservation.unitsReserved,
            remainingMonthlyCredits: persisted.remainingBalance.monthlyCredits,
            remainingPromotionalCredits: persisted.remainingBalance.promotionalCredits,
            remainingTopUpCredits: persisted.remainingBalance.topUpCredits,
            reservedOn: existing.reservedOn,
            settledOn: admin.firestore.FieldValue.serverTimestamp(),
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: false });
        return { alreadyConsumed: false, balance: persisted.remainingBalance, subscription: current };
    });

    if (!result.alreadyConsumed && result.subscription) {
        await sendCreditBalanceLifecycleMessage(result.subscription, reservation.unitsReserved, result.balance);
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
            const monthlyCredits = getNonNegativeCreditInteger(
                existing.refundRemainingMonthlyCredits ?? existing.remainingMonthlyCredits,
            );
            const promotionalCredits = getNonNegativeCreditInteger(
                existing.refundRemainingPromotionalCredits ?? existing.remainingPromotionalCredits ?? 0,
            );
            const topUpCredits = getNonNegativeCreditInteger(
                existing.refundRemainingTopUpCredits ?? existing.remainingTopUpCredits,
            );
            return {
                alreadyTerminal: true,
                remainingBalance: monthlyCredits !== null && promotionalCredits !== null && topUpCredits !== null
                    ? {
                        billingStoreId: Number(reservation.billingStoreId),
                        monthlyCredits,
                        promotionalCredits,
                        topUpCredits,
                    }
                    : null,
            };
        }
        if (existing.accountingStatus !== "reserved" || !subscriptionSnap.exists) {
            throw new Error("AI capacity reservation refund evidence is not available.");
        }
        const current = { ...(subscriptionSnap.data() as FirestoreSubscriptionDoc), id: subscriptionSnap.id };
        const currentScope = getMenuListSubscriptionEntitlementScope(current);
        if (
            !currentScope
            || String(currentScope.tenantId) !== reservation.tId
            || String(currentScope.storeId) !== reservation.billingStoreId
        ) {
            throw new Error("AI capacity reservation persisted subscription scope mismatch.");
        }
        const currentMonthlyCredits = getNonNegativeCreditInteger(current.monthlyCredits ?? 0);
        const currentPromotional = getAvailablePromotionalCredits(current);
        const currentTopUpCredits = getNonNegativeCreditInteger(current.topUpCredits ?? 0);
        const chargedMonthlyCredits = getNonNegativeCreditInteger(existing.accountingChargedMonthlyCredits ?? 0);
        const chargedPromotionalCredits = getNonNegativeCreditInteger(
            existing.accountingChargedPromotionalCredits ?? 0,
        );
        const chargedTopUpCredits = getNonNegativeCreditInteger(existing.accountingChargedTopUpCredits ?? 0);
        const monthlyCreditCeiling = getNonNegativeCreditInteger(
            existing.accountingMonthlyCreditCeiling ?? current.monthlyCreditsAllowance ?? 0,
        );
        if (
            currentMonthlyCredits === null
            || currentPromotional.credits === null
            || currentTopUpCredits === null
            || chargedMonthlyCredits === null
            || chargedPromotionalCredits === null
            || chargedTopUpCredits === null
            || monthlyCreditCeiling === null
        ) {
            throw new Error("AI capacity reservation refund credit evidence is invalid.");
        }
        const currentBillingPeriod = getBillingPeriodKey(current.cycleStartDate);
        const rawReservedBillingPeriod = existing.accountingReservationBillingPeriod;
        const reservedBillingPeriod = rawReservedBillingPeriod === null
            ? null
            : getCreditBillingPeriodKey(rawReservedBillingPeriod);
        if (rawReservedBillingPeriod !== null && reservedBillingPeriod === null) {
            throw new Error("AI capacity reservation refund billing period is invalid.");
        }
        const sameBillingPeriod = currentBillingPeriod === null
            ? rawReservedBillingPeriod === null
            : currentBillingPeriod === reservedBillingPeriod;
        const refundedMonthlyCredits = sameBillingPeriod
            ? Math.min(chargedMonthlyCredits, Math.max(0, monthlyCreditCeiling - currentMonthlyCredits))
            : 0;
        const nextMonthlyCredits = currentMonthlyCredits + refundedMonthlyCredits;
        const reservationPromotionalExpiry = Number(existing.accountingPromotionalCreditsExpireAtMillis);
        const promotionalStillValid = Number.isFinite(reservationPromotionalExpiry)
            && reservationPromotionalExpiry > Date.now();
        const refundedPromotionalCredits = promotionalStillValid ? chargedPromotionalCredits : 0;
        const nextPromotionalCredits = currentPromotional.credits + refundedPromotionalCredits;
        const nextTopUpCredits = currentTopUpCredits + chargedTopUpCredits;
        if (
            !Number.isSafeInteger(nextMonthlyCredits)
            || !Number.isSafeInteger(nextPromotionalCredits)
            || !Number.isSafeInteger(nextTopUpCredits)
        ) {
            throw new Error("AI capacity reservation refund credit balance overflowed.");
        }
        const nextBalance = {
            billingStoreId: Number(reservation.billingStoreId),
            monthlyCredits: nextMonthlyCredits,
            promotionalCredits: nextPromotionalCredits,
            topUpCredits: nextTopUpCredits,
        };
        const now = admin.firestore.Timestamp.now();
        transaction.set(subscriptionRef, {
            monthlyCredits: nextBalance.monthlyCredits,
            promotionalCredits: nextBalance.promotionalCredits,
            topUpCredits: nextBalance.topUpCredits,
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        transaction.set(operationRef, {
            accountingExpiredMonthlyCredits: chargedMonthlyCredits - refundedMonthlyCredits,
            accountingExpiredPromotionalCredits: chargedPromotionalCredits - refundedPromotionalCredits,
            accountingStatus: "refunded",
            refundReason: String(reason || "provider_work_failed")
                .replace(/[\u0000-\u001f\u007f]/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 240),
            refundRemainingMonthlyCredits: nextBalance.monthlyCredits,
            refundRemainingPromotionalCredits: nextBalance.promotionalCredits,
            refundRemainingTopUpCredits: nextBalance.topUpCredits,
            refundedMonthlyCredits,
            refundedPromotionalCredits,
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
        const unitsReserved = getPositiveCreditInteger(operation.accountingUnits);
        if (
            operation.accountingStatus !== "reserved"
            || operation.accountingRecoveryMode !== "durable_retry"
            || operation.action !== action
            || !subscriptionId
            || !billingStoreId
            || unitsReserved === null
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
 * Decrements recurring credits first, then valid promotional credits, then purchased credits.
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
        const currentScope = getMenuListSubscriptionEntitlementScope(current);
        if (!currentScope) {
            throw new Error('Billing subscription scope is invalid.');
        }
        const billingStoreId = String(currentScope.storeId);
        const { balance, billingPeriod } = calculateConsumedBalance(current, unitsToConsume);

        tx.set(subscriptionRef, {
            monthlyCredits: balance.monthlyCredits,
            promotionalCredits: balance.promotionalCredits,
            topUpCredits: balance.topUpCredits,
            ...(billingPeriod !== null ? { creditsLastResetMonth: billingPeriod } : {}),
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        return {
            billingStoreId: Number(billingStoreId),
            monthlyCredits: balance.monthlyCredits,
            promotionalCredits: balance.promotionalCredits,
            topUpCredits: balance.topUpCredits,
            subscription: current,
        };
    });

    if (!updatedBalance) return null;

    await sendCreditBalanceLifecycleMessage(updatedBalance.subscription, unitsToConsume, updatedBalance);

    return {
        billingStoreId: updatedBalance.billingStoreId,
        monthlyCredits: updatedBalance.monthlyCredits,
        promotionalCredits: updatedBalance.promotionalCredits,
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
    const expectedTenantId = getExactAccountingScopeAlias(operationData, 'tId', 'tenantId');
    const expectedStoreId = getExactAccountingScopeAlias(operationData, 'sId', 'storeId');
    const subscriptionScope = getMenuListSubscriptionEntitlementScope(subscription);
    const subscriptionTenantId = subscriptionScope ? String(subscriptionScope.tenantId) : null;
    const subscriptionStoreId = subscriptionScope ? String(subscriptionScope.storeId) : null;
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
                || existing.accountingUnits !== unitsToConsume
                || getExactAccountingScopeAlias(existing, 'tId', 'tenantId') !== expectedTenantId
                || getExactAccountingScopeAlias(existing, 'sId', 'storeId') !== expectedStoreId
                || existing.action !== operationData.action
            ) {
                throw new Error('AI accounting idempotency conflict.');
            }
            if (existing.accountingStatus === 'consumed') {
                const monthlyCredits = getNonNegativeCreditInteger(existing.remainingMonthlyCredits);
                const promotionalCredits = getNonNegativeCreditInteger(existing.remainingPromotionalCredits ?? 0);
                const topUpCredits = getNonNegativeCreditInteger(existing.remainingTopUpCredits);
                if (monthlyCredits === null || promotionalCredits === null || topUpCredits === null) {
                    throw new Error('AI accounting replay state is invalid.');
                }
                const replaySubscription = subscriptionSnap.exists
                    ? { ...(subscriptionSnap.data() as FirestoreSubscriptionDoc), id: subscriptionSnap.id }
                    : subscription;
                const replayScope = getMenuListSubscriptionEntitlementScope(replaySubscription);
                if (
                    !replayScope
                    || String(replayScope.tenantId) !== expectedTenantId
                    || String(replayScope.storeId) !== subscriptionStoreId
                ) {
                    throw new Error('Billing subscription scope is invalid.');
                }
                return {
                    alreadyConsumed: true,
                    balance: {
                        billingStoreId: Number(subscriptionStoreId),
                        monthlyCredits,
                        promotionalCredits,
                        topUpCredits,
                    },
                    subscription: replaySubscription,
                };
            }
        }
        if (!subscriptionSnap.exists) throw new Error('Billing subscription is not available.');
        const current = {
            ...(subscriptionSnap.data() as FirestoreSubscriptionDoc),
            id: subscriptionSnap.id,
        };
        const currentScope = getMenuListSubscriptionEntitlementScope(current);
        if (
            !currentScope
            || String(currentScope.tenantId) !== expectedTenantId
            || String(currentScope.storeId) !== subscriptionStoreId
        ) {
            throw new Error('AI accounting persisted subscription scope mismatch.');
        }
        const { balance, billingPeriod } = calculateConsumedBalance(current, unitsToConsume);
        transaction.set(subscriptionRef, {
            monthlyCredits: balance.monthlyCredits,
            promotionalCredits: balance.promotionalCredits,
            topUpCredits: balance.topUpCredits,
            ...(billingPeriod !== null ? { creditsLastResetMonth: billingPeriod } : {}),
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        transaction.set(operationRef, {
            ...operationData,
            accountingBillingStoreId: Number(subscriptionStoreId),
            accountingCreditRateVersion: MENULIST_CONTENT_CREDIT_RATE_VERSION,
            accountingIdempotencyKey: idempotencyKey,
            accountingStatus: 'consumed',
            accountingUnits: unitsToConsume,
            remainingMonthlyCredits: balance.monthlyCredits,
            remainingPromotionalCredits: balance.promotionalCredits,
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
        await sendCreditBalanceLifecycleMessage(result.subscription, unitsToConsume, result.balance);
    }
    return {
        alreadyConsumed: result.alreadyConsumed,
        remainingBalance: result.balance,
    };
}
