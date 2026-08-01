/**
 * Subscription Reconciliation - Firebase Cloud Function
 * ═══════════════════════════════════════════════════════════════
 *
 * Migrated from Vercel API route (/api/internal/reconcile-subscriptions)
 * to Firebase Functions for:
 * - Longer timeout (540s vs Vercel's 10s)
 * - Runs alongside existing nightly scheduler (no extra cron needed)
 * - Same infrastructure as other nightly jobs
 *
 * Fetches all active/past_due/paused subscriptions from Firestore,
 * compares with Razorpay's authoritative state, and syncs mismatches.
 * This is the safety net for webhook failures.
 *
 * Called from: menulistMaintenanceScheduler.ts daily leased task
 */

import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin } from '../firebaseAdmin';
import { revalidatePublicClientCacheForStore } from '../logic/publicCacheRevalidation';
import { invalidateOwnerBusinessAssistantContextPackets } from '../ownerBusinessAssistant/contextPacketCacheInvalidation';
import { getExactMenuListSubscriptionScope } from './subscriptionScope';
import {
    getBoundedFunctionsErrorCode,
    getBoundedFunctionsErrorName,
    getBoundedFunctionsErrorStatus,
} from '../utils/boundedErrorContext';

const MENULIST_PRODUCT_ID = 'ML' as const;
// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type PaymentStatus =
    | 'pending'
    | 'active'
    | 'cancelled'
    | 'expired'
    | 'paid'
    | 'failed'
    | 'past_due'
    | 'paused'
    | 'completed';

const SUBSCRIPTION_ENTITLEMENT_AUDIT_STATUSES = new Set<PaymentStatus>([
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

export function projectSubscriptionEntitlementAuditStatus(value: unknown): PaymentStatus | null {
    return typeof value === 'string'
        && SUBSCRIPTION_ENTITLEMENT_AUDIT_STATUSES.has(value as PaymentStatus)
        ? value as PaymentStatus
        : null;
}

// Map Razorpay API status → our internal PaymentStatus
const RAZORPAY_STATUS_MAP: Record<string, PaymentStatus> = {
    active: 'active',
    pending: 'past_due',
    halted: 'past_due',
    paused: 'paused',
    cancelled: 'cancelled',
    completed: 'completed',
    expired: 'expired',
};

const BILLING_SUBSCRIPTION_RECONCILIATION_SUBSCRIPTION_FAILED =
    'BILLING_SUBSCRIPTION_RECONCILIATION_SUBSCRIPTION_FAILED';
const BILLING_SUBSCRIPTION_STATUS_HISTORY_LIMIT = 100;

function appendBoundedBillingStatusHistory(current: unknown, entry: Record<string, unknown>): unknown[] {
    const existing = Array.isArray(current) ? current : [];
    return [...existing, entry].slice(-BILLING_SUBSCRIPTION_STATUS_HISTORY_LIMIT);
}

function getReconciliationStringContext(label: string, value: unknown): Record<string, boolean | number> {
    const normalized = value === undefined || value === null ? '' : String(value);
    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
}

function getReconciliationErrorContext(error: unknown): Record<string, string> {
    if (error instanceof Error) {
        const sourceErrorCode = getBoundedFunctionsErrorCode(error);
        const sourceErrorStatus = getBoundedFunctionsErrorStatus(error);

        return {
            sourceErrorName: getBoundedFunctionsErrorName(error) || 'Error',
            ...(sourceErrorCode === undefined ? {} : { sourceErrorCode }),
            ...(sourceErrorStatus === undefined ? {} : {
                sourceErrorStatus: sourceErrorStatus.toString(),
            }),
        };
    }

    return {
        sourceErrorName: typeof error,
    };
}

function getReconciliationSubscriptionLogContext(
    sub: Record<string, any>,
    providerSubId?: string | null,
): Record<string, boolean | number> {
    return {
        ...getReconciliationStringContext('subscriptionId', sub?.id),
        ...getReconciliationStringContext('providerSubscriptionId', providerSubId || sub?.providerSubscriptionId),
        ...getReconciliationStringContext('tenantId', sub?.tenantId ?? sub?.tId),
        ...getReconciliationStringContext('storeId', sub?.storeId ?? sub?.sId),
        ...getReconciliationStringContext('status', sub?.status),
        ...getReconciliationStringContext('activePlanType', sub?.activePlanType),
        hasAnalyticsEntitlement: Boolean(sub?.analyticsEntitlement),
    };
}

function getReconciliationUpdateLogContext(updates: Record<string, any>): Record<string, boolean | number> {
    const updateKeys = Object.keys(updates);
    return {
        updateFieldCount: updateKeys.length,
        hasStatusUpdate: updateKeys.includes('status'),
        hasCycleStartUpdate: updateKeys.includes('cycleStartDate'),
        hasCycleEndUpdate: updateKeys.includes('cycleEndDate'),
        hasPaidCountUpdate: updateKeys.includes('totalPaymentsMadeCount'),
        hasRenewsOnUpdate: updateKeys.includes('renewsOn'),
        hasQuantityUpdate: updateKeys.includes('quantity'),
    };
}

function normalizePlanId(planId: unknown): string | null {
    if (typeof planId !== 'string' || planId.length > 160) return null;
    const normalized = planId.trim().toLowerCase();
    return normalized || null;
}

export const PLAN_ENTITLED_SUBSCRIPTION_STATUSES = ['active', 'cancelled', 'paused'] as const;

const POSITIVE_NUMERIC_DOCUMENT_ID_PATTERN = /^[1-9]\d*$/;
const RESERVED_FIRESTORE_DOCUMENT_ID_PATTERN = /^__.*__$/;

export function normalizeSubscriptionDocumentId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    if (
        !value
        || value !== value.trim()
        || value.length > 180
        || value === '.'
        || value === '..'
        || value.includes('/')
        || value.includes('\0')
        || RESERVED_FIRESTORE_DOCUMENT_ID_PATTERN.test(value)
    ) return null;
    return value;
}

export function normalizeScopeDocumentId(value: unknown): { documentId: string; numericId: number } | null {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const documentId = String(value);
    if (!POSITIVE_NUMERIC_DOCUMENT_ID_PATTERN.test(documentId)) return null;
    const numericId = Number(documentId);
    if (!Number.isSafeInteger(numericId) || numericId <= 0 || String(numericId) !== documentId) return null;
    return { documentId, numericId };
}

function toTimestampMillis(value: unknown): number {
    if (value === undefined || value === null) return 0;
    try {
        if (value instanceof Date) {
            const millis = Date.prototype.getTime.call(value);
            return Number.isFinite(millis) && millis >= 0 ? millis : 0;
        }
        if (typeof value !== 'object' || Array.isArray(value)) return 0;
        const descriptors = Object.getOwnPropertyDescriptors(value);
        if (Object.values(descriptors).some((descriptor) => descriptor.get || descriptor.set)) return 0;
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
        ) return 0;
        const millis = (seconds * 1_000) + Math.floor(nanoseconds / 1_000_000);
        return Number.isSafeInteger(millis) ? millis : 0;
    } catch {
        return 0;
    }
}

function getPlanEntitlementStatusPriority(status: unknown): number {
    if (status === 'active') return 3;
    if (status === 'cancelled') return 2;
    if (status === 'paused') return 1;
    return 0;
}

export function hasCurrentSubscriptionPlanEntitlement(
    sub: Record<string, any>,
    status: PaymentStatus = sub.status,
    nowMs = Date.now(),
): boolean {
    if (!Number.isFinite(nowMs) || nowMs < 0) return false;
    if (!['active', 'cancelled', 'paused'].includes(status)) return false;
    if (sub.cycleEndDate === undefined || sub.cycleEndDate === null) return false;
    const cycleEndMs = toTimestampMillis(sub.cycleEndDate);
    return cycleEndMs > 0 && cycleEndMs >= nowMs;
}

function getActivePlanTypeForSubscription(
    sub: Record<string, any>,
    status: PaymentStatus = sub.status,
    nowMs = Date.now(),
): string | null {
    if (!hasCurrentSubscriptionPlanEntitlement(sub, status, nowMs)) return null;
    return normalizePlanId(sub.planId);
}

export function getReconciliationEntitlementDecision(
    current: Record<string, any>,
    updates: Record<string, any>,
    subscriptionId: string,
    nowMs = Date.now(),
): {
    desiredActivePlanType: string | null;
    finalStatus: PaymentStatus;
    nextSubscription: Record<string, any>;
    previousActivePlanType: unknown;
    shouldSyncEntitlement: boolean;
} {
    const finalStatus = (updates.status || current.status) as PaymentStatus;
    const nextSubscription = {
        ...current,
        ...updates,
        id: subscriptionId,
    } as Record<string, any>;
    const desiredActivePlanType = getActivePlanTypeForSubscription(
        nextSubscription,
        finalStatus,
        nowMs,
    );
    const previousActivePlanType = current.analyticsEntitlement?.activePlanType ?? null;
    return {
        desiredActivePlanType,
        finalStatus,
        nextSubscription,
        previousActivePlanType,
        shouldSyncEntitlement: previousActivePlanType !== desiredActivePlanType
            || Boolean(updates.status && updates.status !== current.status),
    };
}

export async function syncStorePlanEntitlement(
    db: FirebaseFirestore.Firestore,
    sub: Record<string, any>,
    source: string,
): Promise<boolean> {
    const subscriptionId = normalizeSubscriptionDocumentId(sub.id);
    const expectedScope = getExactMenuListSubscriptionScope(sub);
    const expectedTenantScope = normalizeScopeDocumentId(expectedScope?.tenantId);
    const expectedStoreScope = normalizeScopeDocumentId(expectedScope?.storeId);
    if (
        !subscriptionId
        || !expectedTenantScope
        || !expectedStoreScope
    ) return false;

    const subscriptionsRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS);
    const subscriptionRef = subscriptionsRef.doc(subscriptionId);
    const entitledSubscriptionsQuery = subscriptionsRef
        .where('pId', '==', MENULIST_PRODUCT_ID)
        .where('productId', '==', MENULIST_PRODUCT_ID)
        .where('status', 'in', [...PLAN_ENTITLED_SUBSCRIPTION_STATUSES])
        .where('storeId', '==', expectedStoreScope.numericId)
        .where('tenantId', '==', expectedTenantScope.numericId)
        .where('sId', '==', expectedStoreScope.numericId)
        .where('tId', '==', expectedTenantScope.numericId)
        .where('cycleEndDate', '>=', Timestamp.now())
        .orderBy('cycleEndDate', 'desc')
        .limit(10);
    const syncResult = await db.runTransaction(async (transaction) => {
        const [subscriptionSnapshot, entitledSubscriptionsSnapshot] = await Promise.all([
            transaction.get(subscriptionRef),
            transaction.get(entitledSubscriptionsQuery),
        ]);
        if (!subscriptionSnapshot.exists) return null;

        const current = {
            ...(subscriptionSnapshot.data() || {}),
            id: subscriptionSnapshot.id,
        } as Record<string, any>;
        const currentScope = getExactMenuListSubscriptionScope(current);
        const currentTenantScope = normalizeScopeDocumentId(currentScope?.tenantId);
        const currentStoreScope = normalizeScopeDocumentId(currentScope?.storeId);
        if (
            !currentTenantScope
            || !currentStoreScope
            || currentTenantScope.numericId !== expectedTenantScope.numericId
            || currentStoreScope.numericId !== expectedStoreScope.numericId
        ) return null;

        const entitledSubscription = entitledSubscriptionsSnapshot.docs
            .map((entitledSnapshot) => ({
                ...(entitledSnapshot.data() || {}),
                id: entitledSnapshot.id,
            } as Record<string, any>))
            .filter((candidate) => {
                const candidateScope = getExactMenuListSubscriptionScope(candidate);
                return Boolean(
                    candidateScope
                    && hasCurrentSubscriptionPlanEntitlement(candidate)
                    && candidateScope.tenantId === expectedTenantScope.numericId
                    && candidateScope.storeId === expectedStoreScope.numericId
                );
            })
            .sort((left, right) => (
                getPlanEntitlementStatusPriority(right.status) - getPlanEntitlementStatusPriority(left.status)
                || toTimestampMillis(right.cycleEndDate) - toTimestampMillis(left.cycleEndDate)
            ))[0]
            || null;
        const activePlanType = entitledSubscription
            ? getActivePlanTypeForSubscription(entitledSubscription, entitledSubscription.status)
            : null;
        const entitlementValue = activePlanType || FieldValue.delete();
        const activeSubscriptionIdValue = entitledSubscription?.id || FieldValue.delete();
        const syncedAt = FieldValue.serverTimestamp();

        transaction.set(db.collection(DB_COLLECTIONS.STORES).doc(currentStoreScope.documentId), {
            activePlanType: entitlementValue,
            analyticsEntitlementUpdatedAt: syncedAt,
            billingSubscriptionId: activeSubscriptionIdValue,
        }, { merge: true });
        transaction.set(db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary'), {
            lastUpdated: syncedAt,
            stores: {
                [currentStoreScope.documentId]: {
                    activePlanType: entitlementValue,
                    billingSubscriptionId: activeSubscriptionIdValue,
                },
            },
        }, { merge: true });
        transaction.set(subscriptionRef, {
            analyticsEntitlement: {
                activePlanType,
                status: projectSubscriptionEntitlementAuditStatus(current.status),
                syncedAt,
                source,
            },
        }, { merge: true });

        return {
            storeId: currentStoreScope.documentId,
            tenantId: currentTenantScope.numericId,
        };
    });
    if (!syncResult) return false;

    await Promise.all([
        revalidatePublicClientCacheForStore(syncResult.storeId, source, {
            touchDigitalScreen: true,
        }),
        invalidateOwnerBusinessAssistantContextPackets({
            tId: syncResult.tenantId,
            sId: syncResult.storeId,
        }),
    ]);
    return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE MACHINE (mirrors src/lib/billing/subscriptionStateMachine.ts)
// ─────────────────────────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, PaymentStatus[]> = {
    pending: ['active', 'past_due', 'cancelled'],
    active: ['past_due', 'paused', 'cancelled', 'completed', 'expired'],
    past_due: ['active', 'cancelled', 'expired'],
    paused: ['active', 'cancelled', 'expired'],
    cancelled: ['expired'],
    expired: [],
    completed: [],
};

function getTransitionLogContext(
    from: string,
    to: string,
    context: string,
    allowedTransitions: PaymentStatus[] = [],
): Record<string, boolean | number> {
    return {
        ...getReconciliationStringContext('fromStatus', from),
        ...getReconciliationStringContext('toStatus', to),
        ...getReconciliationStringContext('transitionContext', context),
        allowedTransitionCount: allowedTransitions.length,
    };
}

function validateTransition(from: string, to: string, context: string): boolean {
    if (from === to) return true;
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed) {
        functions.logger.warn(
            '[Reconciliation] Unknown subscription state transition',
            getTransitionLogContext(from, to, context),
        );
        return false;
    }
    const isValid = allowed.includes(to as PaymentStatus);
    if (!isValid) {
        functions.logger.warn(
            '[Reconciliation] Invalid subscription state transition',
            getTransitionLogContext(from, to, context, allowed),
        );
    }
    return isValid;
}

const RAZORPAY_SUBSCRIPTION_ID_PATTERN = /^sub_[A-Za-z0-9]+$/;

function getRazorpayManagedSubscriptionId(sub: Record<string, any>): string | null {
    if (typeof sub.providerSubscriptionId !== 'string') return null;
    const providerSubscriptionId = sub.providerSubscriptionId;
    if (providerSubscriptionId !== providerSubscriptionId.trim()) return null;
    if (sub.paymentProvider && sub.paymentProvider !== 'razorpay') return null;
    if (sub.billingMode === 'manual') return null;
    if (!RAZORPAY_SUBSCRIPTION_ID_PATTERN.test(providerSubscriptionId)) return null;
    return providerSubscriptionId;
}

function getProviderEpochMillis(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return null;
    const seconds = value;
    const millis = seconds * 1000;
    return Number.isSafeInteger(millis) ? millis : null;
}

function getProviderBillingPeriod(value: unknown): number | null {
    const millis = getProviderEpochMillis(value);
    if (millis === null) return null;
    const date = new Date(millis);
    if (!Number.isFinite(date.getTime())) return null;
    return date.getUTCFullYear() * 100 + date.getUTCMonth() + 1;
}

function getNonNegativeSafeInteger(value: unknown): number | null {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
        ? value
        : null;
}

function getProviderSubscriptionQuantity(value: unknown): number | null {
    return typeof value === 'number'
        && Number.isSafeInteger(value)
        && value > 0
        && value <= 10_000
        ? value
        : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RAZORPAY CLIENT (initialized lazily with Firebase secrets)
// ─────────────────────────────────────────────────────────────────────────────

let razorpayInstance: any = null;

function getRazorpayClient(): any {
    if (razorpayInstance) return razorpayInstance;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set as Firebase secrets');
    }

    // Dynamic import to avoid top-level require issues
    const Razorpay = require('razorpay');
    razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    return razorpayInstance;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RECONCILIATION LOGIC
// ─────────────────────────────────────────────────────────────────────────────

export interface ReconciliationResult {
    success: boolean;
    processed: number;
    synced: number;
    errors: number;
    checkpointed?: boolean;
    cycleCompleted?: boolean;
    syncDetails?: Array<{ subId: string; field: string; local: string; remote: string }>;
    durationMs: number;
}

export async function reconcileSubscriptions(): Promise<ReconciliationResult> {
    const logger = functions.logger;
    const startTime = Date.now();
    let processed = 0;
    let synced = 0;
    let errors = 0;
    const syncDetails: Array<{ subId: string; field: string; local: string; remote: string }> = [];

    const db = firestoreAdmin;

    const subscriptionsRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS);
    const cursorRef = db.collection(DB_COLLECTIONS.SYSTEM).doc('subscriptionReconciliationCursor');
    const pageSize = 100;
    const providerConcurrency = 5;
    const runtimeBudgetMs = 6 * 60 * 1000;
    const cursorSnapshot = await cursorRef.get();
    const storedCursor = normalizeSubscriptionDocumentId(cursorSnapshot.data()?.lastDocumentId);
    let lastDocumentId = storedCursor;
    let foundSubscriptions = false;
    let checkpointed = false;
    let cycleCompleted = false;

    while (true) {
        let pageQuery = subscriptionsRef
            .where('pId', '==', MENULIST_PRODUCT_ID)
            .where('productId', '==', MENULIST_PRODUCT_ID)
            .where('status', 'in', ['active', 'past_due', 'paused'])
            .orderBy(FieldPath.documentId())
            .limit(pageSize);
        if (lastDocumentId) pageQuery = pageQuery.startAfter(lastDocumentId);
        const snapshot = await pageQuery.get();
        if (snapshot.empty) {
            await cursorRef.delete();
            cycleCompleted = true;
            break;
        }
        foundSubscriptions = true;

        // Fetch provider truth outside the transaction, then re-read local truth
        // inside the transaction before applying any change. Provider calls use
        // bounded concurrency so growth does not turn the nightly task into one
        // long serial chain or an unbounded request burst.
        for (let offset = 0; offset < snapshot.docs.length; offset += providerConcurrency) {
            await Promise.all(snapshot.docs.slice(offset, offset + providerConcurrency).map(async (docSnap) => {
                const sub = { ...docSnap.data(), id: docSnap.id } as Record<string, any>;
                processed++;
                let providerSubId: string | null = null;

                try {
                    if (!RAZORPAY_SUBSCRIPTION_ID_PATTERN.test(docSnap.id)) return;
                    if (!getExactMenuListSubscriptionScope(sub)) return;
                    providerSubId = getRazorpayManagedSubscriptionId(sub);
                    if (!providerSubId || providerSubId !== docSnap.id) return;

                const razorpay = getRazorpayClient();
                const rzpSub = await razorpay.subscriptions.fetch(providerSubId);
                const hasInvalidProviderScalar = [
                    [rzpSub.current_start, getProviderEpochMillis],
                    [rzpSub.current_end, getProviderEpochMillis],
                    [rzpSub.charge_at, getProviderEpochMillis],
                    [rzpSub.paid_count, getNonNegativeSafeInteger],
                    [rzpSub.quantity, getProviderSubscriptionQuantity],
                ].some(([value, projector]) => value != null && projector(value) === null);
                if (hasInvalidProviderScalar) {
                    throw new Error('Razorpay subscription scalar is invalid.');
                }
                const application = await db.runTransaction(async (transaction) => {
                    const currentSnapshot = await transaction.get(docSnap.ref);
                    if (!currentSnapshot.exists) return null;
                    const current = {
                        ...(currentSnapshot.data() || {}),
                        id: currentSnapshot.id,
                    } as Record<string, any>;
                    if (
                        !getExactMenuListSubscriptionScope(current)
                        || getRazorpayManagedSubscriptionId(current) !== providerSubId
                    ) return null;

                    const updates: Record<string, any> = {};
                    const changes: Array<{ field: string; local: string; remote: string }> = [];
                    const rzpStatus = RAZORPAY_STATUS_MAP[String(rzpSub.status || '')];
                    if (
                        rzpStatus
                        && rzpStatus !== current.status
                        && validateTransition(current.status, rzpStatus, 'reconciliation:status-sync')
                    ) {
                        updates.status = rzpStatus;
                        updates.statuses = appendBoundedBillingStatusHistory(current.statuses, {
                                status: rzpStatus,
                                timestamp: Timestamp.now(),
                                amount: Number.isFinite(Number(current.amount)) ? Number(current.amount) : 0,
                                currency: current.currency || 'INR',
                                remark: `Reconciled from Razorpay status ${String(rzpSub.status || 'unknown')}`,
                        });
                        if (rzpStatus === 'past_due') {
                            updates.pastDueSinceAt = current.pastDueSinceAt || Timestamp.now();
                        } else if (rzpStatus === 'active') {
                            updates.pastDueSinceAt = null;
                        }
                        changes.push({ field: 'status', local: String(current.status), remote: rzpStatus });
                    }

                    const rzpCycleStart = getProviderEpochMillis(rzpSub.current_start);
                    const rzpCycleEnd = getProviderEpochMillis(rzpSub.current_end);
                    const localCycleStart = toTimestampMillis(current.cycleStartDate);
                    const localCycleEnd = toTimestampMillis(current.cycleEndDate);
                    if (
                        rzpCycleStart !== null
                        && rzpCycleEnd !== null
                        && rzpCycleEnd > rzpCycleStart
                        && rzpCycleStart > localCycleStart
                    ) {
                        updates.cycleStartDate = Timestamp.fromMillis(rzpCycleStart);
                        updates.cycleEndDate = Timestamp.fromMillis(rzpCycleEnd);
                        const billingPeriod = getProviderBillingPeriod(rzpSub.current_start);
                        const finalStatus = (updates.status || current.status) as PaymentStatus;
                        if (billingPeriod !== null && finalStatus === 'active' && current.creditsLastResetMonth !== billingPeriod) {
                            const allowance = getNonNegativeSafeInteger(current.monthlyCreditsAllowance);
                            if (allowance === null) throw new Error('Subscription monthly credit allowance is invalid.');
                            updates.monthlyCredits = allowance;
                            updates.creditsLastResetMonth = billingPeriod;
                        }
                        changes.push({
                            field: 'cycleDates',
                            local: `${new Date(localCycleStart).toISOString()} -> ${new Date(localCycleEnd).toISOString()}`,
                            remote: `${new Date(rzpCycleStart).toISOString()} -> ${new Date(rzpCycleEnd).toISOString()}`,
                        });
                    }

                    const providerPaidCount = getNonNegativeSafeInteger(rzpSub.paid_count);
                    const localPaidCount = getNonNegativeSafeInteger(current.totalPaymentsMadeCount);
                    if (providerPaidCount !== null && providerPaidCount !== localPaidCount) {
                        updates.totalPaymentsMadeCount = providerPaidCount;
                        changes.push({
                            field: 'paidCount',
                            local: String(current.totalPaymentsMadeCount),
                            remote: String(providerPaidCount),
                        });
                    }

                    const providerQuantity = getProviderSubscriptionQuantity(rzpSub.quantity);
                    const localQuantity = getProviderSubscriptionQuantity(current.quantity) || 1;
                    if (providerQuantity !== null && providerQuantity !== localQuantity) {
                        updates.quantity = providerQuantity;
                        changes.push({
                            field: 'quantity',
                            local: String(localQuantity),
                            remote: String(providerQuantity),
                        });
                    }

                    const rzpChargeAt = getProviderEpochMillis(rzpSub.charge_at);
                    const localRenewsOn = toTimestampMillis(current.renewsOn);
                    if (rzpChargeAt !== null && Math.abs(rzpChargeAt - localRenewsOn) > 86400000) {
                        updates.renewsOn = Timestamp.fromMillis(rzpChargeAt);
                        changes.push({
                            field: 'renewsOn',
                            local: new Date(localRenewsOn).toISOString(),
                            remote: new Date(rzpChargeAt).toISOString(),
                        });
                    }

                    const {
                        desiredActivePlanType,
                        nextSubscription,
                        previousActivePlanType,
                        shouldSyncEntitlement,
                    } = getReconciliationEntitlementDecision(
                        current,
                        updates,
                        currentSnapshot.id,
                    );
                    if (shouldSyncEntitlement) {
                        updates.billingEntitlementSyncPending = true;
                        nextSubscription.billingEntitlementSyncPending = true;
                    }
                    if (Object.keys(updates).length > 0) {
                        updates.lastWebhook = {
                            event: 'reconciliation.sync',
                            timestamp: FieldValue.serverTimestamp(),
                        };
                        updates.modifiedOn = FieldValue.serverTimestamp();
                        transaction.update(docSnap.ref, updates);
                    }

                    return {
                        changes,
                        desiredActivePlanType,
                        previousActivePlanType,
                        shouldSyncEntitlement,
                        subscription: nextSubscription,
                        updatesApplied: Object.keys(updates).length > 0,
                        updates,
                    };
                });
                    if (!application) return;

                application.changes.forEach((change) => {
                    if (syncDetails.length < 100) syncDetails.push({
                        subId: docSnap.id,
                        ...change,
                    });
                });
                if (application.updatesApplied) {
                    synced++;
                    logger.info('[Reconciliation] Subscription synced', {
                        ...getReconciliationSubscriptionLogContext(application.subscription, providerSubId),
                        ...getReconciliationUpdateLogContext(application.updates),
                    });
                }
                if (application.shouldSyncEntitlement) {
                    const entitlementSynced = await syncStorePlanEntitlement(
                        db,
                        application.subscription,
                        'reconciliation:subscription-entitlement',
                    );
                    if (!entitlementSynced) {
                        throw new Error('Subscription entitlement scope is invalid.');
                    }
                    await docSnap.ref.set({
                        billingEntitlementSyncPending: FieldValue.delete(),
                        modifiedOn: FieldValue.serverTimestamp(),
                    }, { merge: true });
                    synced++;
                    if (syncDetails.length < 100) {
                        syncDetails.push({
                            subId: docSnap.id,
                            field: 'analyticsEntitlement',
                            local: String(application.previousActivePlanType),
                            remote: String(application.desiredActivePlanType),
                        });
                    }
                }
                } catch (subError: any) {
                    errors++;
                    logger.error('[Reconciliation] Failed to process subscription', {
                        failureCode: BILLING_SUBSCRIPTION_RECONCILIATION_SUBSCRIPTION_FAILED,
                        ...getReconciliationSubscriptionLogContext(sub, providerSubId),
                        ...getReconciliationErrorContext(subError),
                    });
                }
            }));
        }

        lastDocumentId = snapshot.docs[snapshot.docs.length - 1]?.id || null;
        if (snapshot.size < pageSize || !lastDocumentId) {
            await cursorRef.delete();
            cycleCompleted = true;
            break;
        }
        await cursorRef.set({
            lastDocumentId,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        if (Date.now() - startTime >= runtimeBudgetMs) {
            checkpointed = true;
            break;
        }
    }

    if (!foundSubscriptions) {
        logger.info('[Reconciliation] No active subscriptions to reconcile');
    }

    const result: ReconciliationResult = {
        success: true,
        processed,
        synced,
        errors,
        checkpointed,
        cycleCompleted,
        syncDetails: syncDetails.length > 0 ? syncDetails : undefined,
        durationMs: Date.now() - startTime,
    };

    logger.info('[Reconciliation] Completed', {
        processed,
        synced,
        errors,
        checkpointed,
        cycleCompleted,
        durationMs: result.durationMs,
    });

    return result;
}
