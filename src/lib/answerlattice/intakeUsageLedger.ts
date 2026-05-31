import { getUnitCost } from '@constant/AI/unitCosts';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { admin } from '@lib/firebase/firebaseAdmin';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';

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
    totalTokenCount?: number;
    unitsCharged?: number;
};

const db = answerlatticeFirestoreAdmin as FirebaseFirestore.Firestore;
const ANSWERLATTICE_INTAKE_USAGE_ACTIONS = new Set<string>([
    AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_OCR,
    AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_TRANSCRIPTION,
    AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_EMBEDDING,
]);

const now = () => admin.firestore.Timestamp.now();

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

const getBillingPeriodKey = (cycleStartDate: any): number => {
    const current = new Date();
    const startMs = toMillis(cycleStartDate);
    if (!startMs) return current.getFullYear() * 100 + (current.getMonth() + 1);

    const start = new Date(startMs);
    const anchorDay = start.getDate();
    const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
    const effectiveAnchor = Math.min(anchorDay, lastDay);
    const billingDate = current.getDate() >= effectiveAnchor
        ? current
        : new Date(current.getFullYear(), current.getMonth() - 1, 1);

    return billingDate.getFullYear() * 100 + (billingDate.getMonth() + 1);
};

const isActiveSubscription = (subscription: Record<string, any>) => {
    const status = String(subscription.status || '').toLowerCase();
    if (!['active', 'trialing'].includes(status)) return false;
    const endMs = toMillis(subscription.subscriptionEndDate || subscription.cycleEndDate || subscription.currentPeriodEnd);
    return !endMs || endMs > Date.now();
};

async function resolveSubscriptionRef(scope: AnswerlatticeScope) {
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.sId));
    const storeSnap = await storeRef.get();
    if (!storeSnap.exists) {
        throw new Error('Answerlattice workspace is not available.');
    }

    const storeData = storeSnap.data() || {};
    const storeTenantId = Number(storeData.tId || storeData.tenantId);
    if (Number.isFinite(storeTenantId) && storeTenantId !== Number(scope.tId)) {
        throw new Error('Answerlattice workspace is not available.');
    }

    const summary = storeData.answerlatticeSubscription || {};
    const summaryId = cleanText(summary.id || summary.providerSubscriptionId, 180);
    if (summaryId) {
        return {
            storeRef,
            subscriptionRef: db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(summaryId),
        };
    }

    const fallback = await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .where('tenantId', '==', Number(scope.tId))
        .where('storeId', '==', Number(scope.sId))
        .limit(5)
        .get();

    const match = fallback.docs
        .map((doc): Record<string, any> & { id: string } => ({ id: doc.id, ...(doc.data() as Record<string, any>) }))
        .filter(data => Number(data.tId || data.tenantId) === Number(scope.tId) && Number(data.sId || data.storeId) === Number(scope.sId))
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

    const unitsRequired = Math.max(0, getUnitCost(action));
    const { storeRef, subscriptionRef } = await resolveSubscriptionRef(scope);
    const ledgerRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTAKE_USAGE_LEDGER).doc();
    const timestamp = now();

    const result = await db.runTransaction(async (transaction) => {
        const subscriptionSnap = await transaction.get(subscriptionRef);
        if (!subscriptionSnap.exists) {
            throw new Error('An active Answerlattice subscription is required before running paid intake processing.');
        }

        const subscription = {
            ...(subscriptionSnap.data() as FirestoreSubscriptionDoc),
            id: subscriptionSnap.id,
        } as FirestoreSubscriptionDoc;

        if (Number(subscription.tId || subscription.tenantId) !== Number(scope.tId) || Number(subscription.sId || subscription.storeId) !== Number(scope.sId)) {
            throw new Error('Answerlattice subscription scope does not match this workspace.');
        }
        if (!isActiveSubscription(subscription as any)) {
            throw new Error('An active Answerlattice subscription is required before running paid intake processing.');
        }

        let monthlyCredits = Number(subscription.monthlyCredits || 0);
        let topUpCredits = Number(subscription.topUpCredits || 0);
        const monthlyCreditsAllowance = Number(subscription.monthlyCreditsAllowance || 0);
        const billingPeriod = getBillingPeriodKey(subscription.cycleStartDate);

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
            'answerlatticeSubscription.monthlyCredits': nextMonthlyCredits,
            'answerlatticeSubscription.topUpCredits': nextTopUpCredits,
            'answerlatticeSubscription.creditsLastResetMonth': billingPeriod,
            'answerlatticeSubscription.updatedAt': timestamp,
        }, { merge: true });

        transaction.set(ledgerRef, {
            id: ledgerRef.id,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: Number(scope.tId),
            sId: Number(scope.sId),
            jobId: cleanText(input.jobId, 160) || null,
            sourceId: cleanText(input.sourceId, 160) || null,
            action,
            status: 'reserved',
            provider: cleanText(input.provider, 80) || null,
            model: cleanText(input.model, 80) || null,
            fileName: cleanText(input.fileName, 180) || null,
            mimeType: cleanText(input.mimeType, 120) || null,
            byteSize: Number(input.byteSize || 0),
            unitsReserved: unitsRequired,
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

export async function finalizeAnswerlatticeIntakeUsage(_scope: AnswerlatticeScope, ledgerId: string, input: FinalizeUsageInput = {}) {
    if (!ledgerId) return;
    await db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTAKE_USAGE_LEDGER).doc(ledgerId).set({
        status: 'succeeded',
        unitsCharged: Number(input.unitsCharged || 0),
        aiOperationId: input.aiOperationId || null,
        promptTokenCount: Number(input.promptTokenCount || 0),
        candidatesTokenCount: Number(input.candidatesTokenCount || 0),
        totalTokenCount: Number(input.totalTokenCount || 0),
        metadata: sanitizeMetadata(input.metadata),
        settledOn: now(),
        modifiedOn: now(),
    }, { merge: true });
}

export async function refundAnswerlatticeIntakeUsage(scope: AnswerlatticeScope, ledgerId: string, reason: string) {
    if (!ledgerId) return;
    const { storeRef, subscriptionRef } = await resolveSubscriptionRef(scope);
    const ledgerRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTAKE_USAGE_LEDGER).doc(ledgerId);
    const timestamp = now();

    await db.runTransaction(async (transaction) => {
        const [ledgerSnap, subscriptionSnap] = await Promise.all([
            transaction.get(ledgerRef),
            transaction.get(subscriptionRef),
        ]);
        if (!ledgerSnap.exists || !subscriptionSnap.exists) return;

        const ledger = ledgerSnap.data() || {};
        if (ledger.status !== 'reserved') return;
        const refundMonthly = Number(ledger.chargedMonthlyCredits || 0);
        const refundTopUp = Number(ledger.chargedTopUpCredits || 0);
        const subscription = subscriptionSnap.data() || {};
        const nextMonthlyCredits = Number(subscription.monthlyCredits || 0) + refundMonthly;
        const nextTopUpCredits = Number(subscription.topUpCredits || 0) + refundTopUp;

        transaction.set(subscriptionRef, {
            monthlyCredits: nextMonthlyCredits,
            topUpCredits: nextTopUpCredits,
            modifiedOn: timestamp,
        }, { merge: true });
        transaction.set(storeRef, {
            'answerlatticeSubscription.monthlyCredits': nextMonthlyCredits,
            'answerlatticeSubscription.topUpCredits': nextTopUpCredits,
            'answerlatticeSubscription.updatedAt': timestamp,
        }, { merge: true });
        transaction.set(ledgerRef, {
            status: 'failed_refunded',
            errorMessage: cleanText(reason, 500),
            refundedOn: timestamp,
            modifiedOn: timestamp,
        }, { merge: true });
    });
}
