import { DB_COLLECTIONS } from '@constant/database';
import { DEFAULT_PRODUCT_ID } from '@constant/product';
import { getDirectActiveSubscriptionForStoreServer } from '@database/subscriptions/server';
import {
    OWNER_REFERRAL_LEDGER_EVENT,
    OWNER_REFERRAL_LEDGER_TRANSACTION_TYPE,
    OWNER_REFERRAL_PENDING_REPAIR_LIMIT,
    OWNER_REFERRAL_REFERRED_CREDITS,
    OWNER_REFERRAL_REFERRER_CREDITS,
    OWNER_REFERRAL_REWARD_TYPE,
    OWNER_REFERRAL_STATUS,
} from '@data/shared/ownerReferralPolicy';
import { FEATURE_FLAGS } from '@config/features';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
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

const timestampToMillis = (value: any): number | null => {
    if (!value) return null;
    if (typeof value.toMillis === 'function') return Number(value.toMillis());
    if (typeof value.toDate === 'function') return Number(value.toDate().getTime());
    if (value instanceof Date) return value.getTime();
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const isCurrentVerifiedPaidSubscription = (subscription: Record<string, any> | null | undefined): boolean => {
    if (!subscription) return false;
    const productId = subscription.productId ?? subscription.pId ?? DEFAULT_PRODUCT_ID;
    if (productId !== DEFAULT_PRODUCT_ID) return false;
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

const normalizeTopUpCredits = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
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

    const referrerScope = {
        tenantId: Number(initialReferral.referrerTenantId),
        storeId: Number(initialReferral.referrerStoreId),
    };
    const referredScope = {
        tenantId: Number(initialReferral.referredTenantId),
        storeId: Number(initialReferral.referredStoreId),
    };
    const [referrerWallet, referredWallet] = await Promise.all([
        getDirectVerifiedPaidOwnerReferralWallet(referrerScope),
        getDirectVerifiedPaidOwnerReferralWallet(referredScope),
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

    if (!referrerWallet || !referredWallet || referrerWallet.id === referredWallet.id) {
        await firestoreAdmin.runTransaction(async (transaction) => {
            const currentSnapshot = await transaction.get(referralRef);
            if (!currentSnapshot.exists) return;
            const current = currentSnapshot.data() as OwnerReferralDocument;
            if (current.status === OWNER_REFERRAL_STATUS.REWARD_ISSUED) return;
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
        const [referralSnapshot, referrerSubscriptionSnapshot, referredSubscriptionSnapshot] = await Promise.all([
            transaction.get(referralRef),
            transaction.get(referrerSubscriptionRef),
            transaction.get(referredSubscriptionRef),
        ]);
        if (!referralSnapshot.exists) return 'missing_referral';
        const referral = referralSnapshot.data() as OwnerReferralDocument;
        if (referral.status === OWNER_REFERRAL_STATUS.REWARD_ISSUED) return 'already_issued';

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

        const referrerTopUpBefore = normalizeTopUpCredits(referrerSubscription.topUpCredits);
        const referredTopUpBefore = normalizeTopUpCredits(referredSubscription.topUpCredits);
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
): Promise<{ issued: number; processed: number }> => {
    if (!FEATURE_FLAGS.ENABLE_OWNER_REFERRAL_REWARD_PROCESSING) return { issued: 0, processed: 0 };

    let issued = 0;
    let processed = 0;
    const directReferralId = getOwnerReferralDocumentId(paidScope.tenantId, paidScope.storeId);
    if (!options.skipDirectReferral) {
        const directResult = await settleOwnerReferral({ referralId: directReferralId });
        if (directResult !== 'missing_referral' && directResult !== 'disabled') processed += 1;
        if (directResult === 'reward_issued') issued += 1;
    }

    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    while (true) {
        let query: FirebaseFirestore.Query = firestoreAdmin
            .collection(DB_COLLECTIONS.OWNER_REFERRALS)
            .where('referrerTenantId', '==', paidScope.tenantId)
            .where('referrerStoreId', '==', paidScope.storeId)
            .where('status', '==', OWNER_REFERRAL_STATUS.PAYMENT_PENDING)
            .orderBy('referredFirstPaidAt', 'asc')
            .limit(OWNER_REFERRAL_PENDING_REPAIR_LIMIT);
        if (cursor) query = query.startAfter(cursor);
        const page = await query.get();
        if (page.empty) break;

        for (const referral of page.docs) {
            if (referral.id === directReferralId) continue;
            const result = await settleOwnerReferral({ referralId: referral.id });
            processed += 1;
            if (result === 'reward_issued') issued += 1;
        }
        if (page.size < OWNER_REFERRAL_PENDING_REPAIR_LIMIT) break;
        cursor = page.docs[page.docs.length - 1];
    }

    return { issued, processed };
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
        await settlePendingOwnerReferralsForPaidStore(params.paidScope, { skipDirectReferral: true });
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
