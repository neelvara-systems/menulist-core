import { getUnitCost } from '@constant/AI/unitCosts';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    getCreditBillingPeriodKey,
    getNonNegativeCreditInteger,
} from '@data/shared/aiCreditScalarContract';
import {
    normalizeAnswerlatticeIntakeUsageLedgerId,
    normalizeAnswerlatticeBillingScopeDocumentId,
    normalizeAnswerlatticeSubscriptionId,
} from '@lib/answerlattice/billingDocumentIdBoundary';
import { isAnswerlatticeSubscriptionInScope } from '@lib/answerlattice/billingScopeBoundary';
import { notifyAnswerlatticeCreditState } from '@lib/answerlattice/creditNotifications';
import {
    getAnswerlatticeSubscriptionTimestampMillis,
    projectActiveAnswerlatticeSubscriptionForRead,
} from '@lib/answerlattice/subscriptionReadBoundary';
import {
    isAnswerlatticeIntakeLedgerInScope,
    resolveAnswerlatticeIntakeRefundAllocation,
} from '@lib/answerlattice/intakeUsageSettlement';
import { sanitizeAnswerlatticeIntakeMetadata } from '@lib/answerlattice/knowledgeIntakePrivacy';
import { isAnswerlatticeStoreInScope } from '@lib/answerlattice/sessionScope';
import { getBillingPeriodKey, isValidBillingPeriodKey } from '@lib/billing/billingPeriod';
import { requireAnswerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
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

const getAnswerlatticeIntakeUsageDb = () => requireAnswerlatticeFirestoreAdmin();
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

async function resolveSubscriptionRef(scope: AnswerlatticeScope) {
    const db = getAnswerlatticeIntakeUsageDb();
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
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('productId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tenantId', '==', tenantScope.numericId)
        .where('storeId', '==', storeScope.numericId)
        .where('tId', '==', tenantScope.numericId)
        .where('sId', '==', storeScope.numericId)
        .limit(5)
        .get();

    const match = fallback.docs
        .map((doc) => projectActiveAnswerlatticeSubscriptionForRead(
            doc.data(),
            doc.id,
            tenantScope.numericId,
            storeScope.numericId,
        ))
        .find((subscription) => subscription !== null);

    if (!match?.id) {
        throw new Error('An active Answerlattice subscription is required before running paid intake processing.');
    }

    return {
        storeRef,
        subscriptionRef: db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(match.id),
    };
}

export async function reserveAnswerlatticeIntakeUsage(scope: AnswerlatticeScope, input: ReserveUsageInput) {
    const db = getAnswerlatticeIntakeUsageDb();
    const action = cleanText(input.action, 120);
    if (!ANSWERLATTICE_INTAKE_USAGE_ACTIONS.has(action)) {
        throw new Error('Unsupported Answerlattice intake usage action.');
    }

    const unitsRequired = getNonNegativeCreditInteger(getUnitCost(action));
    const byteSize = getNonNegativeCreditInteger(input.byteSize ?? 0);
    if (unitsRequired === null || byteSize === null) {
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

        const subscription = projectActiveAnswerlatticeSubscriptionForRead(
            subscriptionSnap.data(),
            subscriptionSnap.id,
            tenantScope.numericId,
            storeScope.numericId,
        );
        if (!subscription) {
            throw new Error('An active Answerlattice subscription is required before running paid intake processing.');
        }

        let monthlyCredits = getNonNegativeCreditInteger(subscription.monthlyCredits ?? 0);
        const topUpCredits = getNonNegativeCreditInteger(subscription.topUpCredits ?? 0);
        const monthlyCreditsAllowance = getNonNegativeCreditInteger(subscription.monthlyCreditsAllowance ?? 0);
        const billingPeriod = getBillingPeriodKey(subscription.cycleStartDate);
        if (billingPeriod === null) {
            throw new Error('Answerlattice subscription billing period is invalid.');
        }

        if (
            monthlyCredits === null
            || topUpCredits === null
            || monthlyCreditsAllowance === null
        ) {
            throw new Error('Answerlattice subscription credit balance is invalid.');
        }

        const rawLastResetPeriod = subscription.creditsLastResetMonth;
        const lastResetPeriod = rawLastResetPeriod === undefined || rawLastResetPeriod === null
            ? null
            : getCreditBillingPeriodKey(rawLastResetPeriod);
        if (rawLastResetPeriod !== undefined && rawLastResetPeriod !== null && lastResetPeriod === null) {
            throw new Error('Answerlattice subscription billing period is invalid.');
        }
        if (monthlyCreditsAllowance > 0 && lastResetPeriod !== billingPeriod) {
            monthlyCredits = monthlyCreditsAllowance;
        }

        const remaining = monthlyCredits + topUpCredits;
        if (!Number.isSafeInteger(remaining)) {
            throw new Error('Answerlattice subscription credit balance is invalid.');
        }
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
            monthlyCreditsAllowance,
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
            metadata: sanitizeAnswerlatticeIntakeMetadata(input.metadata, { maxEntries: 24 }),
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
    const db = getAnswerlatticeIntakeUsageDb();
    const normalizedLedgerId = normalizeAnswerlatticeIntakeUsageLedgerId(ledgerId);
    if (!normalizedLedgerId) throw new Error('Answerlattice intake usage ledger is not available.');
    const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.tId);
    const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(scope.sId);
    if (!tenantScope || !storeScope) throw new Error('Answerlattice workspace is not available.');
    const ledgerRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTAKE_USAGE_LEDGER).doc(normalizedLedgerId);
    const creditNotification = await db.runTransaction(async (transaction) => {
        const ledgerSnap = await transaction.get(ledgerRef);
        if (!ledgerSnap.exists) throw new Error('Answerlattice intake usage ledger is not available.');
        const ledger = ledgerSnap.data() || {};
        if (!isAnswerlatticeIntakeLedgerInScope(ledger, { tId: tenantScope.numericId, sId: storeScope.numericId })) {
            throw new Error('Answerlattice intake usage scope does not match this workspace.');
        }
        if (ledger.status === 'succeeded') return null;
        if (ledger.status !== 'reserved') {
            throw new Error('Answerlattice intake usage reservation is not available for settlement.');
        }
        const unitsReserved = getNonNegativeCreditInteger(ledger.unitsReserved);
        const billingPeriod = getCreditBillingPeriodKey(ledger.billingPeriod);
        const monthlyAllowance = getNonNegativeCreditInteger(ledger.monthlyCreditsAllowance);
        const previousRemainingCredits = getNonNegativeCreditInteger(ledger.beforeBalance?.totalCredits);
        const remainingCredits = getNonNegativeCreditInteger(ledger.afterReserveBalance?.totalCredits);
        const subscriptionId = normalizeAnswerlatticeSubscriptionId(ledger.subscriptionId);
        if (
            unitsReserved === null
            || billingPeriod === null
            || monthlyAllowance === null
            || previousRemainingCredits === null
            || remainingCredits === null
            || !subscriptionId
        ) {
            throw new Error('Answerlattice intake reservation credit evidence is invalid.');
        }
        const timestamp = now();
        const unitsCharged = input.unitsCharged === undefined
            ? unitsReserved
            : getNonNegativeCreditInteger(input.unitsCharged);
        if (unitsCharged !== unitsReserved) {
            throw new Error('Answerlattice intake settlement units do not match the reservation.');
        }
        const promptTokenCount = getNonNegativeCreditInteger(input.promptTokenCount ?? 0);
        const candidatesTokenCount = getNonNegativeCreditInteger(input.candidatesTokenCount ?? 0);
        const totalTokenCount = getNonNegativeCreditInteger(input.totalTokenCount ?? 0);
        const tokenCountSource = input.tokenCountSource ?? 'none';
        if (
            promptTokenCount === null
            || candidatesTokenCount === null
            || totalTokenCount === null
            || !['provider', 'estimated', 'mixed', 'none'].includes(tokenCountSource)
        ) {
            throw new Error('Answerlattice intake settlement token evidence is invalid.');
        }
        if (settlementWriter) {
            await settlementWriter(transaction, { ledger, timestamp, unitsReserved });
        }
        transaction.set(ledgerRef, {
            status: 'succeeded',
            unitsCharged: unitsReserved,
            aiOperationId: input.aiOperationId || null,
            promptTokenCount,
            candidatesTokenCount,
            tokenCountSource,
            totalTokenCount,
            metadata: {
                ...sanitizeAnswerlatticeIntakeMetadata(ledger.metadata, { maxEntries: 24 }),
                ...sanitizeAnswerlatticeIntakeMetadata(input.metadata, { maxEntries: 24 }),
            },
            settledOn: timestamp,
            modifiedOn: timestamp,
        }, { merge: true });
        return {
            billingPeriod,
            monthlyAllowance,
            previousRemainingCredits,
            remainingCredits,
            subscriptionId,
        };
    });
    if (creditNotification) {
        await notifyAnswerlatticeCreditState({
            ...creditNotification,
            scope,
            sourcePath: 'src/lib/answerlattice/intakeUsageLedger.ts:settled-credit-state',
        });
    }
}

export async function refundAnswerlatticeIntakeUsage(scope: AnswerlatticeScope, ledgerId: string, reason: string) {
    const db = getAnswerlatticeIntakeUsageDb();
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
        const refundMonthly = getNonNegativeCreditInteger(ledger.chargedMonthlyCredits ?? 0);
        const refundTopUp = getNonNegativeCreditInteger(ledger.chargedTopUpCredits ?? 0);
        if (refundMonthly === null || refundTopUp === null) {
            throw new Error('Answerlattice intake refund credit evidence is invalid.');
        }
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
        const storedBillingPeriod = getCreditBillingPeriodKey(ledger.billingPeriod);
        const reservedOnMillis = getAnswerlatticeSubscriptionTimestampMillis(ledger.reservedOn);
        const reservedBillingPeriod = storedBillingPeriod !== null && isValidBillingPeriodKey(storedBillingPeriod)
            ? storedBillingPeriod
            : reservedOnMillis
                ? getBillingPeriodKey(subscription.cycleStartDate, new Date(reservedOnMillis))
                : null;
        if (reservedBillingPeriod === null) {
            throw new Error('Answerlattice intake reservation billing period is invalid.');
        }
        const allocation = resolveAnswerlatticeIntakeRefundAllocation({
            currentBillingPeriod,
            currentMonthlyCredits: subscription.monthlyCredits ?? 0,
            monthlyCreditsAllowance: subscription.monthlyCreditsAllowance ?? 0,
            refundMonthlyCredits: refundMonthly,
            refundTopUpCredits: refundTopUp,
            reservedBillingPeriod,
        });
        if (!allocation) {
            throw new Error('Answerlattice intake refund credit evidence is invalid.');
        }
        const currentMonthlyCredits = getNonNegativeCreditInteger(subscription.monthlyCredits ?? 0);
        const currentTopUpCredits = getNonNegativeCreditInteger(subscription.topUpCredits ?? 0);
        if (currentMonthlyCredits === null || currentTopUpCredits === null) {
            throw new Error('Answerlattice subscription credit balance is invalid.');
        }
        const nextMonthlyCredits = currentMonthlyCredits + allocation.refundedMonthlyCredits;
        const nextTopUpCredits = currentTopUpCredits + allocation.refundedTopUpCredits;
        if (
            !Number.isSafeInteger(nextMonthlyCredits)
            || !Number.isSafeInteger(nextTopUpCredits)
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
