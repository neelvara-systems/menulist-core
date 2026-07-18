import { getUnitCost } from '@constant/AI/unitCosts';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    normalizeAnswerlatticeIntakeUsageLedgerId,
    normalizeAnswerlatticeBillingScopeDocumentId,
    normalizeAnswerlatticeSubscriptionId,
} from '@lib/answerlattice/billingDocumentIdBoundary';
import { isAnswerlatticeSubscriptionInScope } from '@lib/answerlattice/billingScopeBoundary';
import {
    isAnswerlatticeIntakeLedgerInScope,
    resolveAnswerlatticeIntakeRefundAllocation,
} from '@lib/answerlattice/intakeUsageSettlement';
import { isAnswerlatticeStoreInScope } from '@lib/answerlattice/sessionScope';
import { getBillingPeriodKey, isValidBillingPeriodKey } from '@lib/billing/billingPeriod';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';
import { Timestamp } from 'firebase-admin/firestore';

type AnswerlatticeScope = {
    tId: number;
    sId: number;
};

type AnswerlatticeActor = {
    id?: string | number | null;
    name?: string | null;
    email?: string | null;
};

type ReserveUsageInput = {
    action: string;
    actor?: AnswerlatticeActor;
    byteSize?: number;
    fileName?: string | null;
    jobId?: string | null;
    metadata?: Record<string, any>;
    mimeType?: string | null;
    model?: string | null;
    provider?: string | null;
    sourceId?: string | null;
};

type FinalizeUsageInput = {
    aiOperationId?: string | null;
    metadata?: Record<string, any>;
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    tokenCountSource?: 'provider' | 'estimated' | 'mixed' | 'none';
    totalTokenCount?: number;
    unitsCharged?: number;
};

export type AnswerlatticeIntakeUsageSettlementContext = {
    ledger: Record<string, any>;
    timestamp: FirebaseFirestore.Timestamp;
    unitsReserved: number;
};

export type AnswerlatticeIntakeUsageSettlementWriter = (
    transaction: FirebaseFirestore.Transaction,
    context: AnswerlatticeIntakeUsageSettlementContext,
) => Promise<void> | void;

const db = answerlatticeFirestoreAdmin as FirebaseFirestore.Firestore;
const ANSWERLATTICE_INTAKE_USAGE_ACTIONS = new Set<string>([
    AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_OCR,
    AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_TRANSCRIPTION,
    AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_EMBEDDING,
    AI_ACTIONS_TYPES.ANSWERLATTICE_PRODUCT_STARTER_PACK,
]);

const now = () => Timestamp.now();

const cleanText = (value: unknown, max = 300) => String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const stringifyMetadataValue = (value: unknown): string => {
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
};

const sanitizeMetadata = (value: unknown): Record<string, any> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value as Record<string, any>)
        .slice(0, 24)
        .map(([key, nested]) => [
            cleanText(key, 80),
            typeof nested === 'string'
                ? cleanText(nested, 500)
                : typeof nested === 'number' || typeof nested === 'boolean' || nested === null
                    ? nested
                    : cleanText(stringifyMetadataValue(nested).slice(0, 500), 500),
        ])
        .filter(([key]) => Boolean(key)));
};

const toMillis = (value: any): number | null => {
    if (!value) return null;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;
    return null;
};

const isActiveSubscription = (subscription: Record<string, any>) => {
    if ((subscription.pId ?? subscription.productId) !== PRODUCT_IDS.ANSWERLATTICE) return false;
    const status = String(subscription.status || '').toLowerCase();
    if (!['active', 'trialing'].includes(status)) return false;
    const endMs = toMillis(subscription.subscriptionEndDate || subscription.cycleEndDate || subscription.currentPeriodEnd);
    return !endMs || endMs > Date.now();
};

async function resolveSubscriptionRef(scope: AnswerlatticeScope) {
    const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.tId);
    const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.sId);
    if (!tenantScope || !storeScope) {
        throw new Error('Answerlattice workspace is not available.');
    }
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId);
    const storeSnap = await storeRef.get();
    if (!storeSnap.exists) {
        throw new Error('Answerlattice workspace is not available.');
    }

    const storeData = storeSnap.data() || {};
    if (!isAnswerlatticeStoreInScope(
        storeData,
        { tenantId: tenantScope.numericId, storeId: storeScope.numericId },
        storeSnap.id,
    )) {
        throw new Error('Answerlattice workspace is not available.');
    }

    const summary = storeData.answerlatticeSubscription || {};
    const summaryId = normalizeAnswerlatticeSubscriptionId(cleanText(summary.id || summary.providerSubscriptionId, 180));
    if (summaryId) {
        return {
            storeRef,
            subscriptionRef: db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(summaryId),
        };
    }

    const fallback = await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .where('tenantId', '==', tenantScope.numericId)
        .where('storeId', '==', storeScope.numericId)
        .limit(5)
        .get();

    const match = fallback.docs
        .map((doc): Record<string, any> & { id: string } => ({ id: doc.id, ...(doc.data() as Record<string, any>) }))
        .filter(data => isAnswerlatticeSubscriptionInScope(data, {
            tId: tenantScope.numericId,
            sId: storeScope.numericId,
        }))
        .find(isActiveSubscription);

    if (!match?.id) {
        throw new Error('An active Answerlattice subscription is required before running paid intake processing.');
    }

    return {
        storeRef,
        subscriptionRef: db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(match.id),
    };
}

export async function reserveAnswerlatticeIntakeUsage(scope: AnswerlatticeScope, input: ReserveUsageInput) {
    if (!db || typeof (db as any).collection !== 'function') {
        throw new Error('Answerlattice Firebase is not configured.');
    }
    const action = cleanText(input.action, 120);
    if (!ANSWERLATTICE_INTAKE_USAGE_ACTIONS.has(action)) {
        throw new Error('Unsupported Answerlattice intake usage action.');
    }

    const unitsRequired = getUnitCost(action);
    const byteSize = Number(input.byteSize || 0);
    if (!Number.isFinite(unitsRequired) || unitsRequired < 0 || !Number.isFinite(byteSize) || byteSize < 0) {
        throw new Error('Answerlattice intake usage reservation is invalid.');
    }
    const { storeRef, subscriptionRef } = await resolveSubscriptionRef(scope);
    const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.tId);
    const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.sId);
    if (!tenantScope || !storeScope) {
        throw new Error('Answerlattice workspace is not available.');
    }
    const ledgerRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTAKE_USAGE_LEDGER).doc();
    const timestamp = now();

    const result = await db.runTransaction(async (transaction) => {
        const [subscriptionSnap, storeSnap] = await Promise.all([
            transaction.get(subscriptionRef),
            transaction.get(storeRef),
        ]);
        if (!subscriptionSnap.exists || !storeSnap.exists) {
            throw new Error('An active Answerlattice subscription is required before running paid intake processing.');
        }

        const storeData = storeSnap.data() || {};
        if (!isAnswerlatticeStoreInScope(
            storeData,
            { tenantId: tenantScope.numericId, storeId: storeScope.numericId },
            storeSnap.id,
        )) {
            throw new Error('Answerlattice workspace is not available.');
        }

        const subscription = {
            ...(subscriptionSnap.data() as FirestoreSubscriptionDoc),
            id: subscriptionSnap.id,
        } as FirestoreSubscriptionDoc;

        if (!isAnswerlatticeSubscriptionInScope(subscription, {
            tId: tenantScope.numericId,
            sId: storeScope.numericId,
        })) {
            throw new Error('Answerlattice subscription scope does not match this workspace.');
        }
        if (!isActiveSubscription(subscription as any)) {
            throw new Error('An active Answerlattice subscription is required before running paid intake processing.');
        }

        let monthlyCredits = Number(subscription.monthlyCredits || 0);
        let topUpCredits = Number(subscription.topUpCredits || 0);
        const monthlyCreditsAllowance = Number(subscription.monthlyCreditsAllowance || 0);
        const billingPeriod = getBillingPeriodKey(subscription.cycleStartDate);
        if (billingPeriod === null) {
            throw new Error('Answerlattice subscription billing period is invalid.');
        }

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

        if (monthlyCreditsAllowance > 0 && subscription.creditsLastResetMonth !== billingPeriod) {
            monthlyCredits = monthlyCreditsAllowance;
        }

        const remaining = monthlyCredits + topUpCredits;
        if (remaining < unitsRequired) {
            throw new Error('Not enough Answerlattice support credits for this intake processing step.');
        }

        const chargedMonthlyCredits = Math.min(monthlyCredits, unitsRequired);
        const chargedTopUpCredits = unitsRequired - chargedMonthlyCredits;
        const nextMonthlyCredits = monthlyCredits - chargedMonthlyCredits;
        const nextTopUpCredits = topUpCredits - chargedTopUpCredits;

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

        transaction.set(ledgerRef, {
            id: ledgerRef.id,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: tenantScope.numericId,
            sId: storeScope.numericId,
            jobId: cleanText(input.jobId, 160) || null,
            sourceId: cleanText(input.sourceId, 160) || null,
            subscriptionId: subscriptionRef.id,
            action,
            status: 'reserved',
            provider: cleanText(input.provider, 80) || null,
            model: cleanText(input.model, 80) || null,
            fileName: cleanText(input.fileName, 180) || null,
            mimeType: cleanText(input.mimeType, 120) || null,
            byteSize,
            unitsReserved: unitsRequired,
            billingPeriod,
            unitsCharged: 0,
            chargedMonthlyCredits,
            chargedTopUpCredits,
            beforeBalance: {
                monthlyCredits,
                topUpCredits,
                totalCredits: remaining,
            },
            afterReserveBalance: {
                monthlyCredits: nextMonthlyCredits,
                topUpCredits: nextTopUpCredits,
                totalCredits: nextMonthlyCredits + nextTopUpCredits,
            },
            metadata: sanitizeMetadata(input.metadata),
            createdOn: timestamp,
            modifiedOn: timestamp,
            reservedOn: timestamp,
            settledOn: null,
            refundedOn: null,
            aiOperationId: null,
            errorMessage: null,
            createdBy: cleanText(input.actor?.email || input.actor?.name || input.actor?.id, 160) || 'answerlattice',
            modifiedBy: cleanText(input.actor?.email || input.actor?.name || input.actor?.id, 160) || 'answerlattice',
            ...(input.actor?.id ? { uId: input.actor.id } : {}),
        });

        return {
            ledgerId: ledgerRef.id,
            unitsReserved: unitsRequired,
            chargedMonthlyCredits,
            chargedTopUpCredits,
            remainingBalance: {
                monthlyCredits: nextMonthlyCredits,
                topUpCredits: nextTopUpCredits,
            },
        };
    });

    return result;
}

export async function finalizeAnswerlatticeIntakeUsage(
    scope: AnswerlatticeScope,
    ledgerId: string,
    input: FinalizeUsageInput = {},
    settlementWriter?: AnswerlatticeIntakeUsageSettlementWriter,
) {
    const normalizedLedgerId = normalizeAnswerlatticeIntakeUsageLedgerId(ledgerId);
    if (!normalizedLedgerId) throw new Error('Answerlattice intake usage ledger is not available.');
    const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.tId);
    const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.sId);
    if (!tenantScope || !storeScope) throw new Error('Answerlattice workspace is not available.');
    const ledgerRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTAKE_USAGE_LEDGER).doc(normalizedLedgerId);
    await db.runTransaction(async (transaction) => {
        const ledgerSnap = await transaction.get(ledgerRef);
        if (!ledgerSnap.exists) throw new Error('Answerlattice intake usage ledger is not available.');
        const ledger = ledgerSnap.data() || {};
        if (!isAnswerlatticeIntakeLedgerInScope(ledger, { tId: tenantScope.numericId, sId: storeScope.numericId })) {
            throw new Error('Answerlattice intake usage scope does not match this workspace.');
        }
        if (ledger.status === 'succeeded') return;
        if (ledger.status !== 'reserved') {
            throw new Error('Answerlattice intake usage reservation is not available for settlement.');
        }
        const unitsReserved = Number(ledger.unitsReserved);
        if (!Number.isFinite(unitsReserved) || unitsReserved < 0) {
            throw new Error('Answerlattice intake reservation credit evidence is invalid.');
        }
        const timestamp = now();
        if (input.unitsCharged !== undefined && Number(input.unitsCharged) !== unitsReserved) {
            throw new Error('Answerlattice intake settlement units do not match the reservation.');
        }
        if (settlementWriter) {
            await settlementWriter(transaction, { ledger, timestamp, unitsReserved });
        }
        transaction.set(ledgerRef, {
            status: 'succeeded',
            unitsCharged: unitsReserved,
            aiOperationId: input.aiOperationId || null,
            promptTokenCount: Number(input.promptTokenCount || 0),
            candidatesTokenCount: Number(input.candidatesTokenCount || 0),
            tokenCountSource: input.tokenCountSource || 'none',
            totalTokenCount: Number(input.totalTokenCount || 0),
            metadata: {
                ...sanitizeMetadata(ledger.metadata),
                ...sanitizeMetadata(input.metadata),
            },
            settledOn: timestamp,
            modifiedOn: timestamp,
        }, { merge: true });
    });
}

export async function refundAnswerlatticeIntakeUsage(scope: AnswerlatticeScope, ledgerId: string, reason: string) {
    const normalizedLedgerId = normalizeAnswerlatticeIntakeUsageLedgerId(ledgerId);
    if (!normalizedLedgerId) throw new Error('Answerlattice intake usage ledger is not available.');
    const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.tId);
    const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.sId);
    if (!tenantScope || !storeScope) throw new Error('Answerlattice workspace is not available.');
    const ledgerRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTAKE_USAGE_LEDGER).doc(normalizedLedgerId);
    const ledgerPreview = await ledgerRef.get();
    if (!ledgerPreview.exists) throw new Error('Answerlattice intake usage ledger is not available.');
    const previewData = ledgerPreview.data() || {};
    if (!isAnswerlatticeIntakeLedgerInScope(previewData, { tId: tenantScope.numericId, sId: storeScope.numericId })) {
        throw new Error('Answerlattice intake usage scope does not match this workspace.');
    }
    const storedSubscriptionId = normalizeAnswerlatticeSubscriptionId(previewData.subscriptionId);
    const fallbackRefs = storedSubscriptionId ? null : await resolveSubscriptionRef(scope);
    const subscriptionRef = storedSubscriptionId
        ? db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(storedSubscriptionId)
        : fallbackRefs!.subscriptionRef;
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId);
    const timestamp = now();

    await db.runTransaction(async (transaction) => {
        const [ledgerSnap, subscriptionSnap, storeSnap] = await Promise.all([
            transaction.get(ledgerRef),
            transaction.get(subscriptionRef),
            transaction.get(storeRef),
        ]);
        if (!ledgerSnap.exists || !subscriptionSnap.exists || !storeSnap.exists) {
            throw new Error('Answerlattice intake refund evidence is not available.');
        }

        const ledger = ledgerSnap.data() || {};
        if (!isAnswerlatticeIntakeLedgerInScope(ledger, { tId: tenantScope.numericId, sId: storeScope.numericId })) {
            throw new Error('Answerlattice intake usage scope does not match this workspace.');
        }
        if (ledger.status !== 'reserved') return;
        const refundMonthly = Number(ledger.chargedMonthlyCredits || 0);
        const refundTopUp = Number(ledger.chargedTopUpCredits || 0);
        const subscription = subscriptionSnap.data() || {};
        if (!isAnswerlatticeSubscriptionInScope(subscription, {
            tId: tenantScope.numericId,
            sId: storeScope.numericId,
        })) {
            throw new Error('Answerlattice subscription scope does not match this workspace.');
        }
        const storeData = storeSnap.data() || {};
        if (!isAnswerlatticeStoreInScope(
            storeData,
            { tenantId: tenantScope.numericId, storeId: storeScope.numericId },
            storeSnap.id,
        )) {
            throw new Error('Answerlattice workspace is not available.');
        }
        const currentBillingPeriod = getBillingPeriodKey(subscription.cycleStartDate);
        if (currentBillingPeriod === null) {
            throw new Error('Answerlattice subscription billing period is invalid.');
        }
        const storedBillingPeriod = Number(ledger.billingPeriod);
        const reservedOnMillis = toMillis(ledger.reservedOn);
        const reservedBillingPeriod = isValidBillingPeriodKey(storedBillingPeriod)
            ? storedBillingPeriod
            : reservedOnMillis
                ? getBillingPeriodKey(subscription.cycleStartDate, new Date(reservedOnMillis))
                : null;
        if (reservedBillingPeriod === null) {
            throw new Error('Answerlattice intake reservation billing period is invalid.');
        }
        const allocation = resolveAnswerlatticeIntakeRefundAllocation({
            currentBillingPeriod,
            currentMonthlyCredits: subscription.monthlyCredits || 0,
            monthlyCreditsAllowance: subscription.monthlyCreditsAllowance || 0,
            refundMonthlyCredits: refundMonthly,
            refundTopUpCredits: refundTopUp,
            reservedBillingPeriod,
        });
        if (!allocation) {
            throw new Error('Answerlattice intake refund credit evidence is invalid.');
        }
        const currentMonthlyCredits = Number(subscription.monthlyCredits || 0);
        const currentTopUpCredits = Number(subscription.topUpCredits || 0);
        const nextMonthlyCredits = currentMonthlyCredits + allocation.refundedMonthlyCredits;
        const nextTopUpCredits = currentTopUpCredits + allocation.refundedTopUpCredits;
        if (
            !Number.isFinite(nextMonthlyCredits)
            || !Number.isFinite(nextTopUpCredits)
            || currentMonthlyCredits < 0
            || currentTopUpCredits < 0
            || nextMonthlyCredits < 0
            || nextTopUpCredits < 0
        ) {
            throw new Error('Answerlattice subscription credit balance is invalid.');
        }

        transaction.set(subscriptionRef, {
            monthlyCredits: nextMonthlyCredits,
            topUpCredits: nextTopUpCredits,
            modifiedOn: timestamp,
        }, { merge: true });
        transaction.set(storeRef, {
            answerlatticeSubscription: {
                monthlyCredits: nextMonthlyCredits,
                topUpCredits: nextTopUpCredits,
                updatedAt: timestamp,
            },
        }, { merge: true });
        transaction.set(ledgerRef, {
            status: 'failed_refunded',
            errorMessage: cleanText(reason, 500),
            expiredMonthlyCredits: allocation.expiredMonthlyCredits,
            refundedMonthlyCredits: allocation.refundedMonthlyCredits,
            refundedTopUpCredits: allocation.refundedTopUpCredits,
            refundBillingPeriod: currentBillingPeriod,
            refundedOn: timestamp,
            modifiedOn: timestamp,
        }, { merge: true });
    });
}
