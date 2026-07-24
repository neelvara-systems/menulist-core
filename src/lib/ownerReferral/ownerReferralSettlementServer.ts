import { DB_COLLECTIONS } from '@constant/database';
import { DEFAULT_PRODUCT_ID } from '@constant/product';
import { getDirectActiveSubscriptionForStoreServer } from '@database/subscriptions/server';
import {
    OWNER_REFERRAL_LEDGER_EVENT,
    OWNER_REFERRAL_LEDGER_TRANSACTION_TYPE,
    OWNER_REFERRAL_PENDING_REPAIR_LIMIT,
    OWNER_REFERRAL_PROGRAM_VERSION,
    OWNER_REFERRAL_REFERRED_CREDITS,
    OWNER_REFERRAL_REFERRER_CREDITS,
    OWNER_REFERRAL_REWARD_TYPE,
    OWNER_REFERRAL_STATUS,
} from '@data/shared/ownerReferralPolicy';
import { FEATURE_FLAGS } from '@config/features';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';
import {
    getOwnerReferralDocumentId,
    getOwnerReferralRewardIssueId,
    getOwnerReferralRewardTransactionId,
    hashOwnerReferralEvidence,
} from './ownerReferralTokenServer';
import type { OwnerReferralDocument, OwnerReferralScope } from './ownerReferralTypes';

export type OwnerReferralPaymentEvidence = {
    paidAt: Date;
    paymentEvidenceId: string;
    source: string;
    subscriptionId: string;
};

type PaidOwnerReferralWallet = {
    id: string;
    subscription: FirestoreSubscriptionDoc;
};

type OwnerReferralSettlementResult =
    | 'disabled'
    | 'missing_referral'
    | 'already_issued'
    | 'payment_pending'
    | 'reward_issued';

const isOwnerReferralSettlementPendingStatus = (value: unknown): boolean => (
    value === OWNER_REFERRAL_STATUS.ATTRIBUTED
    || value === OWNER_REFERRAL_STATUS.PAYMENT_PENDING
);

const timestampToMillis = (value: any): number | null => {
    if (!value) return null;
    try {
        let parsed: number | null = null;
        if (typeof value.toMillis === 'function') parsed = Number(value.toMillis());
        else if (typeof value.toDate === 'function') parsed = Number(value.toDate().getTime());
        else if (value instanceof Date) parsed = value.getTime();
        else if (typeof value === 'string') parsed = Date.parse(value);
        else if (typeof value === 'number') parsed = value;
        else if (typeof value.seconds === 'number') parsed = value.seconds * 1000;
        return parsed !== null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    } catch {
        return null;
    }
};

const isCurrentVerifiedPaidSubscription = (subscription: Record<string, any> | null | undefined): boolean => {
    if (!subscription) return false;
    if (subscription.pId !== DEFAULT_PRODUCT_ID || subscription.productId !== DEFAULT_PRODUCT_ID) return false;
    if (!['active', 'past_due', 'cancelled', 'paused'].includes(String(subscription.status || ''))) return false;

    const paidThrough = timestampToMillis(subscription.cycleEndDate ?? subscription.validUntil);
    if (!paidThrough || paidThrough < Date.now()) return false;

    if (subscription.billingMode === 'manual') {
        return subscription.manualPaymentConfirmed === true;
    }

    return Number(subscription.totalPaymentsMadeCount || 0) > 0
        || (Array.isArray(subscription.billingHistory) && subscription.billingHistory.length > 0);
};

export const getDirectVerifiedPaidOwnerReferralWallet = async (
    scope: OwnerReferralScope,
): Promise<PaidOwnerReferralWallet | null> => {
    const subscription = await getDirectActiveSubscriptionForStoreServer(scope.tenantId, scope.storeId);
    if (!subscription?.id || !isCurrentVerifiedPaidSubscription(subscription as any)) return null;
    return { id: subscription.id, subscription };
};

const normalizeTopUpCredits = (value: unknown, creditsToAdd: number): number | null => {
    if (value === undefined || value === null) return 0;
    if (
        typeof value !== 'number'
        || !Number.isSafeInteger(value)
        || value < 0
        || value > Number.MAX_SAFE_INTEGER - creditsToAdd
    ) return null;
    return value;
};

const normalizeOwnerReferralScope = (tenantId: unknown, storeId: unknown): OwnerReferralScope | null => {
    const normalizedTenantId = Number(tenantId);
    const normalizedStoreId = Number(storeId);
    if (
        !Number.isSafeInteger(normalizedTenantId)
        || normalizedTenantId <= 0
        || !Number.isSafeInteger(normalizedStoreId)
        || normalizedStoreId <= 0
    ) return null;
    return { tenantId: normalizedTenantId, storeId: normalizedStoreId };
};

const isOwnerReferralStoreEligible = (
    snapshot: FirebaseFirestore.DocumentSnapshot,
    scope: OwnerReferralScope,
): boolean => {
    const store = snapshot.exists ? snapshot.data() : null;
    return Boolean(
        store
        && Number(store.tenantId) === scope.tenantId
        && Number(store.storeId ?? snapshot.id) === scope.storeId
        && store.active !== false
        && store.deleted !== true
        && !isPlatformEntityBlocked(store)
    );
};

const normalizeEvidenceText = (value: string, maxLength: number): string => (
    String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength)
);

const buildRewardLedgerDocument = (params: {
    credits: number;
    createdAtSeconds: number;
    referralId: string;
    rewardIssueId: string;
    role: 'referrer' | 'referred';
    scope: OwnerReferralScope;
    subscriptionId: string;
    topUpAfter: number;
    topUpBefore: number;
}) => {
    const now = admin.firestore.FieldValue.serverTimestamp();
    return {
        auditVersion: 2,
        event: OWNER_REFERRAL_LEDGER_EVENT,
        transactionType: OWNER_REFERRAL_LEDGER_TRANSACTION_TYPE,
        rewardType: OWNER_REFERRAL_REWARD_TYPE,
        rewardRole: params.role,
        rewardIssueId: params.rewardIssueId,
        referralId: params.referralId,
        productId: DEFAULT_PRODUCT_ID,
        pId: DEFAULT_PRODUCT_ID,
        tenantId: params.scope.tenantId,
        storeId: params.scope.storeId,
        tId: params.scope.tenantId,
        sId: params.scope.storeId,
        subscriptionId: params.subscriptionId,
        credits: params.credits,
        creditAmount: params.credits,
        topUpCreditsBefore: params.topUpBefore,
        topUpCreditsAfter: params.topUpAfter,
        amount: 0,
        currency: 'CREDITS',
        status: 'credited',
        description: 'Owner referral reward',
        source: 'owner_referral',
        created_at: params.createdAtSeconds,
        createdOn: now,
        modifiedOn: now,
    };
};

const settleOwnerReferral = async (params: {
    evidence?: OwnerReferralPaymentEvidence;
    referralId: string;
}): Promise<OwnerReferralSettlementResult> => {
    if (!FEATURE_FLAGS.ENABLE_OWNER_REFERRAL_REWARD_PROCESSING) return 'disabled';

    const referralRef = firestoreAdmin.collection(DB_COLLECTIONS.OWNER_REFERRALS).doc(params.referralId);
    const initialReferralSnapshot = await referralRef.get();
    if (!initialReferralSnapshot.exists) return 'missing_referral';
    const initialReferral = initialReferralSnapshot.data() as OwnerReferralDocument;
    if (initialReferral.status === OWNER_REFERRAL_STATUS.REWARD_ISSUED) return 'already_issued';

    const referrerScope = normalizeOwnerReferralScope(
        initialReferral.referrerTenantId,
        initialReferral.referrerStoreId,
    );
    const referredScope = normalizeOwnerReferralScope(
        initialReferral.referredTenantId,
        initialReferral.referredStoreId,
    );
    if (
        initialReferral.programVersion !== OWNER_REFERRAL_PROGRAM_VERSION
        || !referrerScope
        || !referredScope
        || !isOwnerReferralSettlementPendingStatus(initialReferral.status)
    ) {
        throw new Error('owner_referral_document_invalid');
    }
    const referrerStoreRef = firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(String(referrerScope.storeId));
    const referredStoreRef = firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(String(referredScope.storeId));
    const [referrerWallet, referredWallet, referrerStore, referredStore] = await Promise.all([
        getDirectVerifiedPaidOwnerReferralWallet(referrerScope),
        getDirectVerifiedPaidOwnerReferralWallet(referredScope),
        referrerStoreRef.get(),
        referredStoreRef.get(),
    ]);
    const effectiveEvidence = params.evidence || (referredWallet ? {
        paidAt: new Date(
            timestampToMillis(
                referredWallet.subscription.subscriptionStartDate
                ?? referredWallet.subscription.cycleStartDate,
            ) || Date.now(),
        ),
        paymentEvidenceId: referredWallet.id,
        source: 'current-paid-wallet',
        subscriptionId: referredWallet.id,
    } : undefined);

    if (
        !referrerWallet
        || !referredWallet
        || referrerWallet.id === referredWallet.id
        || !isOwnerReferralStoreEligible(referrerStore, referrerScope)
        || !isOwnerReferralStoreEligible(referredStore, referredScope)
    ) {
        await firestoreAdmin.runTransaction(async (transaction) => {
            const currentSnapshot = await transaction.get(referralRef);
            if (!currentSnapshot.exists) return;
            const current = currentSnapshot.data() as OwnerReferralDocument;
            if (current.status === OWNER_REFERRAL_STATUS.REWARD_ISSUED) return;
            const currentReferrerScope = normalizeOwnerReferralScope(current.referrerTenantId, current.referrerStoreId);
            const currentReferredScope = normalizeOwnerReferralScope(current.referredTenantId, current.referredStoreId);
            if (
                current.programVersion !== OWNER_REFERRAL_PROGRAM_VERSION
                || !currentReferrerScope
                || !currentReferredScope
                || currentReferrerScope.tenantId !== referrerScope.tenantId
                || currentReferrerScope.storeId !== referrerScope.storeId
                || currentReferredScope.tenantId !== referredScope.tenantId
                || currentReferredScope.storeId !== referredScope.storeId
                || !isOwnerReferralSettlementPendingStatus(current.status)
            ) {
                throw new Error('owner_referral_document_invalid');
            }
            const now = admin.firestore.Timestamp.now();
            transaction.update(referralRef, {
                status: OWNER_REFERRAL_STATUS.PAYMENT_PENDING,
                paymentPendingAt: current.paymentPendingAt || now,
                updatedAt: now,
                ...(effectiveEvidence && !current.referredFirstPaidAt ? {
                    referredFirstPaidAt: admin.firestore.Timestamp.fromDate(effectiveEvidence.paidAt),
                    referredFirstPaidSubscriptionId: normalizeEvidenceText(effectiveEvidence.subscriptionId, 160),
                    referredPaymentEvidenceHash: hashOwnerReferralEvidence([
                        effectiveEvidence.source,
                        effectiveEvidence.subscriptionId,
                        effectiveEvidence.paymentEvidenceId,
                    ].join(':')),
                } : {}),
            });
        });
        return 'payment_pending';
    }

    const referrerSubscriptionRef = firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(referrerWallet.id);
    const referredSubscriptionRef = firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(referredWallet.id);
    const rewardIssueId = getOwnerReferralRewardIssueId(params.referralId);
    const referrerRewardTransactionId = getOwnerReferralRewardTransactionId(rewardIssueId, 'referrer');
    const referredRewardTransactionId = getOwnerReferralRewardTransactionId(rewardIssueId, 'referred');
    const referrerRewardRef = firestoreAdmin.collection(DB_COLLECTIONS.PAYMENT_TRANSACTIONS).doc(referrerRewardTransactionId);
    const referredRewardRef = firestoreAdmin.collection(DB_COLLECTIONS.PAYMENT_TRANSACTIONS).doc(referredRewardTransactionId);
    const createdAtSeconds = Math.floor(Date.now() / 1000);

    return firestoreAdmin.runTransaction(async (transaction) => {
        const [
            referralSnapshot,
            referrerSubscriptionSnapshot,
            referredSubscriptionSnapshot,
            currentReferrerStore,
            currentReferredStore,
        ] = await Promise.all([
            transaction.get(referralRef),
            transaction.get(referrerSubscriptionRef),
            transaction.get(referredSubscriptionRef),
            transaction.get(referrerStoreRef),
            transaction.get(referredStoreRef),
        ]);
        if (!referralSnapshot.exists) return 'missing_referral';
        const referral = referralSnapshot.data() as OwnerReferralDocument;
        if (referral.status === OWNER_REFERRAL_STATUS.REWARD_ISSUED) return 'already_issued';
        const currentReferrerScope = normalizeOwnerReferralScope(
            referral.referrerTenantId,
            referral.referrerStoreId,
        );
        const currentReferredScope = normalizeOwnerReferralScope(
            referral.referredTenantId,
            referral.referredStoreId,
        );
        if (
            referral.programVersion !== OWNER_REFERRAL_PROGRAM_VERSION
            || !currentReferrerScope
            || !currentReferredScope
            || currentReferrerScope.tenantId !== referrerScope.tenantId
            || currentReferrerScope.storeId !== referrerScope.storeId
            || currentReferredScope.tenantId !== referredScope.tenantId
            || currentReferredScope.storeId !== referredScope.storeId
            || !isOwnerReferralSettlementPendingStatus(referral.status)
        ) {
            throw new Error('owner_referral_document_invalid');
        }

        const referrerSubscription = referrerSubscriptionSnapshot.data() || {};
        const referredSubscription = referredSubscriptionSnapshot.data() || {};
        if (
            !isCurrentVerifiedPaidSubscription(referrerSubscription)
            || !isCurrentVerifiedPaidSubscription(referredSubscription)
            || referrerSubscriptionSnapshot.id === referredSubscriptionSnapshot.id
            || Number(referrerSubscription.tenantId) !== Number(referral.referrerTenantId)
            || Number(referrerSubscription.storeId) !== Number(referral.referrerStoreId)
            || Number(referredSubscription.tenantId) !== Number(referral.referredTenantId)
            || Number(referredSubscription.storeId) !== Number(referral.referredStoreId)
            || !isOwnerReferralStoreEligible(currentReferrerStore, referrerScope)
            || !isOwnerReferralStoreEligible(currentReferredStore, referredScope)
        ) {
            const now = admin.firestore.Timestamp.now();
            transaction.update(referralRef, {
                status: OWNER_REFERRAL_STATUS.PAYMENT_PENDING,
                paymentPendingAt: referral.paymentPendingAt || now,
                updatedAt: now,
                ...(effectiveEvidence && !referral.referredFirstPaidAt ? {
                    referredFirstPaidAt: admin.firestore.Timestamp.fromDate(effectiveEvidence.paidAt),
                    referredFirstPaidSubscriptionId: normalizeEvidenceText(effectiveEvidence.subscriptionId, 160),
                    referredPaymentEvidenceHash: hashOwnerReferralEvidence([
                        effectiveEvidence.source,
                        effectiveEvidence.subscriptionId,
                        effectiveEvidence.paymentEvidenceId,
                    ].join(':')),
                } : {}),
            });
            return 'payment_pending';
        }

        const referrerTopUpBefore = normalizeTopUpCredits(
            referrerSubscription.topUpCredits,
            OWNER_REFERRAL_REFERRER_CREDITS,
        );
        const referredTopUpBefore = normalizeTopUpCredits(
            referredSubscription.topUpCredits,
            OWNER_REFERRAL_REFERRED_CREDITS,
        );
        if (referrerTopUpBefore === null || referredTopUpBefore === null) {
            throw new Error('owner_referral_wallet_credit_invalid');
        }
        const referrerTopUpAfter = referrerTopUpBefore + OWNER_REFERRAL_REFERRER_CREDITS;
        const referredTopUpAfter = referredTopUpBefore + OWNER_REFERRAL_REFERRED_CREDITS;
        const rewardIssuedAt = admin.firestore.Timestamp.now();
        const modifiedOn = admin.firestore.FieldValue.serverTimestamp();

        transaction.set(referrerSubscriptionRef, {
            topUpCredits: referrerTopUpAfter,
            modifiedOn,
        }, { merge: true });
        transaction.set(referredSubscriptionRef, {
            topUpCredits: referredTopUpAfter,
            modifiedOn,
        }, { merge: true });
        transaction.create(referrerRewardRef, buildRewardLedgerDocument({
            credits: OWNER_REFERRAL_REFERRER_CREDITS,
            createdAtSeconds,
            referralId: params.referralId,
            rewardIssueId,
            role: 'referrer',
            scope: referrerScope,
            subscriptionId: referrerSubscriptionSnapshot.id,
            topUpAfter: referrerTopUpAfter,
            topUpBefore: referrerTopUpBefore,
        }));
        transaction.create(referredRewardRef, buildRewardLedgerDocument({
            credits: OWNER_REFERRAL_REFERRED_CREDITS,
            createdAtSeconds,
            referralId: params.referralId,
            rewardIssueId,
            role: 'referred',
            scope: referredScope,
            subscriptionId: referredSubscriptionSnapshot.id,
            topUpAfter: referredTopUpAfter,
            topUpBefore: referredTopUpBefore,
        }));
        transaction.update(referralRef, {
            status: OWNER_REFERRAL_STATUS.REWARD_ISSUED,
            rewardIssueId,
            rewardIssuedAt,
            updatedAt: rewardIssuedAt,
            referrerSubscriptionIdAtIssue: referrerSubscriptionSnapshot.id,
            referredSubscriptionIdAtIssue: referredSubscriptionSnapshot.id,
            referrerCreditsAdded: OWNER_REFERRAL_REFERRER_CREDITS,
            referredCreditsAdded: OWNER_REFERRAL_REFERRED_CREDITS,
            referrerTopUpBefore,
            referrerTopUpAfter,
            referredTopUpBefore,
            referredTopUpAfter,
            referrerRewardTransactionId,
            referredRewardTransactionId,
            ...(effectiveEvidence && !referral.referredFirstPaidAt ? {
                referredFirstPaidAt: admin.firestore.Timestamp.fromDate(effectiveEvidence.paidAt),
                referredFirstPaidSubscriptionId: normalizeEvidenceText(effectiveEvidence.subscriptionId, 160),
                referredPaymentEvidenceHash: hashOwnerReferralEvidence([
                    effectiveEvidence.source,
                    effectiveEvidence.subscriptionId,
                    effectiveEvidence.paymentEvidenceId,
                ].join(':')),
            } : {}),
        });
        return 'reward_issued';
    });
};

export const recordReferredOwnerReferralPaymentAndSettle = async (params: {
    evidence: OwnerReferralPaymentEvidence;
    referredScope: OwnerReferralScope;
}): Promise<OwnerReferralSettlementResult> => {
    const referralId = getOwnerReferralDocumentId(params.referredScope.tenantId, params.referredScope.storeId);
    return settleOwnerReferral({ referralId, evidence: params.evidence });
};

export const settlePendingOwnerReferralsForPaidStore = async (
    paidScope: OwnerReferralScope,
    options: { skipDirectReferral?: boolean } = {},
): Promise<{ hasMore: boolean; issued: number; processed: number }> => {
    if (!FEATURE_FLAGS.ENABLE_OWNER_REFERRAL_REWARD_PROCESSING) {
        return { hasMore: false, issued: 0, processed: 0 };
    }

    let issued = 0;
    let processed = 0;
    const directReferralId = getOwnerReferralDocumentId(paidScope.tenantId, paidScope.storeId);
    if (!options.skipDirectReferral) {
        const directResult = await settleOwnerReferral({ referralId: directReferralId });
        if (directResult !== 'missing_referral' && directResult !== 'disabled') processed += 1;
        if (directResult === 'reward_issued') issued += 1;
    }

    const page = await firestoreAdmin
        .collection(DB_COLLECTIONS.OWNER_REFERRALS)
        .where('referrerTenantId', '==', paidScope.tenantId)
        .where('referrerStoreId', '==', paidScope.storeId)
        .where('status', '==', OWNER_REFERRAL_STATUS.PAYMENT_PENDING)
        .orderBy('referredFirstPaidAt', 'asc')
        .limit(OWNER_REFERRAL_PENDING_REPAIR_LIMIT + 1)
        .get();
    const repairCandidates = page.docs
        .filter((referral) => referral.id !== directReferralId)
        .slice(0, OWNER_REFERRAL_PENDING_REPAIR_LIMIT);
    for (const referral of repairCandidates) {
        const result = await settleOwnerReferral({ referralId: referral.id });
        processed += 1;
        if (result === 'reward_issued') issued += 1;
    }

    return {
        hasMore: page.size > OWNER_REFERRAL_PENDING_REPAIR_LIMIT,
        issued,
        processed,
    };
};

export const safelyRecordOwnerReferralPaymentAndRepair = async (params: {
    evidence: OwnerReferralPaymentEvidence;
    paidScope: OwnerReferralScope;
}): Promise<void> => {
    if (!FEATURE_FLAGS.ENABLE_OWNER_REFERRAL_REWARD_PROCESSING) return;
    try {
        await recordReferredOwnerReferralPaymentAndSettle({
            evidence: params.evidence,
            referredScope: params.paidScope,
        });
        const repair = await settlePendingOwnerReferralsForPaidStore(
            params.paidScope,
            { skipDirectReferral: true },
        );
        if (repair.hasMore) {
            logger.error(
                'Owner referral pending repair batch remains',
                new Error('owner_referral_pending_repair_remaining'),
                {
                    tenantId: params.paidScope.tenantId,
                    storeId: params.paidScope.storeId,
                    processed: repair.processed,
                    issued: repair.issued,
                },
            );
        }
    } catch (error) {
        logger.error(
            'Owner referral settlement failed after verified payment',
            new Error('owner_referral_settlement_failed'),
            {
                source: normalizeEvidenceText(params.evidence.source, 80),
                tenantId: params.paidScope.tenantId,
                storeId: params.paidScope.storeId,
                errorName: error instanceof Error ? error.name : 'unknown',
            },
        );
    }
};
