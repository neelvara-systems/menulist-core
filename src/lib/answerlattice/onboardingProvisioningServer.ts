import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { normalizeAnswerlatticeSubscriptionId } from '@lib/answerlattice/billingDocumentIdBoundary';
import {
    ANSWERLATTICE_ONBOARDING_STATUS,
    type AnswerlatticeOnboardingStatus,
} from '@lib/answerlattice/onboardingProvisioning';
import { requireAnswerlatticeOnboardingUserId } from '@lib/answerlattice/onboardingUserIdBoundary';
import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import { isAnswerlatticeSubscriptionInScope } from '@lib/answerlattice/billingScopeBoundary';
import { isAnswerlatticeWorkspaceBillingActivationAllowed } from '@lib/answerlattice/workspaceLifecycleContracts';
import {
    ANSWERLATTICE_TENANT_SUMMARY_SHARD_TYPE,
    getAnswerlatticeTenantSummaryShardId,
} from '@lib/answerlattice/tenantSummaryAdmin';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';
import { Timestamp } from 'firebase-admin/firestore';

export class AnswerlatticeOnboardingConflictError extends Error {
    readonly code:
        | 'ANSWERLATTICE_ACCOUNT_EXISTS'
        | 'ANSWERLATTICE_PROVIDER_CHECKOUT_EXPIRED'
        | 'ANSWERLATTICE_PROVIDER_RECOVERY_PENDING'
        | 'ANSWERLATTICE_SETUP_IN_PROGRESS'
        | 'ANSWERLATTICE_SETUP_REQUEST_CHANGED';

    constructor(code: AnswerlatticeOnboardingConflictError['code']) {
        super(code);
        this.name = 'AnswerlatticeOnboardingConflictError';
        this.code = code;
    }
}

export type AnswerlatticeProvisioningScope = {
    attemptId: string;
    requestFingerprint: string;
    storeId: number;
    tenantId: number;
    userId: string;
};

export type AnswerlatticeProvisioningDocumentKind = 'tenant' | 'workspace';

const requireScopeId = (value: unknown, field: 'storeId' | 'tenantId'): number => {
    const scopeId = normalizeAnswerlatticeScopeDocumentId(value);
    if (!scopeId) throw new Error(`answerlattice_onboarding_${field}_invalid`);
    return scopeId;
};

const hasConsistentProvisioningScopeId = (
    data: Record<string, unknown>,
    fields: readonly [string, string],
    expected: number,
    label: 'storeId' | 'tenantId',
): boolean => {
    const values = fields
        .map(field => data[field])
        .filter(value => value !== undefined && value !== null && value !== '');
    if (values.length === 0) return false;
    return values.every(value => requireScopeId(value, label) === expected);
};

export const answerlatticeProvisioningOwnershipMatches = (
    data: Record<string, unknown>,
    scope: AnswerlatticeProvisioningScope,
    kind: AnswerlatticeProvisioningDocumentKind = 'workspace',
): boolean => {
    try {
        return data.pId === PRODUCT_IDS.ANSWERLATTICE
            && data.productId === PRODUCT_IDS.ANSWERLATTICE
            && String(data.onboardingAttemptId || '') === scope.attemptId
            && String(data.onboardingRequestFingerprint || '') === scope.requestFingerprint
            && hasConsistentProvisioningScopeId(data, ['tId', 'tenantId'], scope.tenantId, 'tenantId')
            && (
                kind === 'tenant'
                || hasConsistentProvisioningScopeId(data, ['sId', 'storeId'], scope.storeId, 'storeId')
            );
    } catch {
        return false;
    }
};

const assertProvisioningOwnership = (
    data: Record<string, unknown>,
    scope: AnswerlatticeProvisioningScope,
    label: string,
) => {
    const kind: AnswerlatticeProvisioningDocumentKind = label === 'tenant' ? 'tenant' : 'workspace';
    if (!answerlatticeProvisioningOwnershipMatches(data, scope, kind)) {
        throw new Error(`answerlattice_onboarding_${label}_ownership_mismatch`);
    }
};

export async function persistAnswerlatticePendingSubscription(params: {
    db: FirebaseFirestore.Firestore;
    scope: AnswerlatticeProvisioningScope;
    storeSubscriptionSummary: Record<string, unknown>;
    subscriptionId: string;
    subscriptionPayload: Omit<FirestoreSubscriptionDoc, 'id'>;
    widgetApiState: Record<string, unknown>;
}): Promise<void> {
    const tenantId = requireScopeId(params.scope.tenantId, 'tenantId');
    const storeId = requireScopeId(params.scope.storeId, 'storeId');
    const userId = requireAnswerlatticeOnboardingUserId(params.scope.userId);
    const subscriptionId = normalizeAnswerlatticeSubscriptionId(params.subscriptionId);
    if (!subscriptionId) throw new Error('answerlattice_onboarding_subscription_id_invalid');
    if (!isAnswerlatticeSubscriptionInScope(params.subscriptionPayload, {
        tId: tenantId,
        sId: storeId,
    })) {
        throw new Error('answerlattice_onboarding_subscription_payload_scope_conflict');
    }

    await params.db.runTransaction(async (transaction) => {
        const tenantRef = params.db.collection(DB_COLLECTIONS.TENANTS).doc(String(tenantId));
        const storeRef = params.db.collection(DB_COLLECTIONS.STORES).doc(String(storeId));
        const userRef = params.db.collection(DB_COLLECTIONS.USERS).doc(userId);
        const subscriptionRef = params.db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);
        const [tenantSnap, storeSnap, userSnap, subscriptionSnap] = await Promise.all([
            transaction.get(tenantRef),
            transaction.get(storeRef),
            transaction.get(userRef),
            transaction.get(subscriptionRef),
        ]);

        if (!tenantSnap.exists || !storeSnap.exists || !userSnap.exists) {
            throw new Error('answerlattice_onboarding_provisional_scope_missing');
        }
        assertProvisioningOwnership(tenantSnap.data() || {}, params.scope, 'tenant');
        assertProvisioningOwnership(storeSnap.data() || {}, params.scope, 'store');
        if (!isAnswerlatticeWorkspaceBillingActivationAllowed(storeSnap.data())) {
            throw new Error('answerlattice_onboarding_workspace_activation_not_allowed');
        }
        assertProvisioningOwnership(userSnap.data() || {}, params.scope, 'user');

        if (subscriptionSnap.exists) {
            const subscriptionData = subscriptionSnap.data() || {};
            if (
                requireScopeId(subscriptionData.tId ?? subscriptionData.tenantId, 'tenantId') !== tenantId
                || requireScopeId(subscriptionData.sId ?? subscriptionData.storeId, 'storeId') !== storeId
                || !isAnswerlatticeSubscriptionInScope(subscriptionData, {
                    tId: tenantId,
                    sId: storeId,
                })
            ) {
                throw new Error('answerlattice_onboarding_subscription_scope_conflict');
            }
        }

        const now = Timestamp.now();
        const status: AnswerlatticeOnboardingStatus = ANSWERLATTICE_ONBOARDING_STATUS.PAYMENT_PENDING;
        transaction.set(subscriptionRef, {
            ...params.subscriptionPayload,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            tId: tenantId,
            tenantId,
            sId: storeId,
            storeId,
            uId: userId,
            role: 'owner',
            createdOn: subscriptionSnap.exists ? subscriptionSnap.data()?.createdOn || now : now,
            modifiedOn: now,
            createdBy: params.subscriptionPayload.name || params.subscriptionPayload.email || 'Answerlattice',
            modifiedBy: params.subscriptionPayload.name || params.subscriptionPayload.email || 'Answerlattice',
        }, { merge: subscriptionSnap.exists });
        transaction.set(storeRef, {
            active: true,
            answerlatticeSubscription: params.storeSubscriptionSummary,
            answerlatticeWidgetApi: params.widgetApiState,
            onboardingProviderCancellationPending: false,
            onboardingProviderRecoveryAvailableAt: null,
            onboardingProviderRecoveryReason: null,
            onboardingProviderSubscriptionId: subscriptionId,
            onboardingStatus: status,
            sId: storeId,
            tId: tenantId,
            modifiedOn: now,
        }, { merge: true });
        transaction.set(tenantRef, {
            active: true,
            onboardingProviderCancellationPending: false,
            onboardingProviderRecoveryAvailableAt: null,
            onboardingProviderRecoveryReason: null,
            onboardingProviderSubscriptionId: subscriptionId,
            onboardingStatus: status,
            tId: tenantId,
            modifiedOn: now,
        }, { merge: true });
        transaction.set(userRef, {
            active: true,
            onboardingProviderCancellationPending: false,
            onboardingProviderRecoveryAvailableAt: null,
            onboardingProviderRecoveryReason: null,
            onboardingProviderSubscriptionId: subscriptionId,
            onboardingStatus: status,
            sId: storeId,
            tId: tenantId,
            modifiedOn: now,
        }, { merge: true });
    });
}

export async function markAnswerlatticeOnboardingProviderRecoveryPending(params: {
    db: FirebaseFirestore.Firestore;
    providerSubscriptionId?: string | null;
    reason: string;
    recoveryAvailableAtMillis: number;
    scope: AnswerlatticeProvisioningScope;
}): Promise<void> {
    const tenantId = requireScopeId(params.scope.tenantId, 'tenantId');
    const storeId = requireScopeId(params.scope.storeId, 'storeId');
    const userId = requireAnswerlatticeOnboardingUserId(params.scope.userId);
    const providerSubscriptionId = params.providerSubscriptionId
        ? normalizeAnswerlatticeSubscriptionId(params.providerSubscriptionId)
        : null;
    if (params.providerSubscriptionId && !providerSubscriptionId) {
        throw new Error('answerlattice_onboarding_provider_subscription_id_invalid');
    }
    if (!Number.isFinite(params.recoveryAvailableAtMillis) || params.recoveryAvailableAtMillis <= 0) {
        throw new Error('answerlattice_onboarding_recovery_time_invalid');
    }

    await params.db.runTransaction(async (transaction) => {
        const tenantRef = params.db.collection(DB_COLLECTIONS.TENANTS).doc(String(tenantId));
        const storeRef = params.db.collection(DB_COLLECTIONS.STORES).doc(String(storeId));
        const userRef = params.db.collection(DB_COLLECTIONS.USERS).doc(userId);
        const [tenantSnap, storeSnap, userSnap] = await Promise.all([
            transaction.get(tenantRef),
            transaction.get(storeRef),
            transaction.get(userRef),
        ]);
        if (!tenantSnap.exists || !storeSnap.exists || !userSnap.exists) {
            throw new Error('answerlattice_onboarding_provisional_scope_missing');
        }
        assertProvisioningOwnership(tenantSnap.data() || {}, params.scope, 'tenant');
        assertProvisioningOwnership(storeSnap.data() || {}, params.scope, 'store');
        assertProvisioningOwnership(userSnap.data() || {}, params.scope, 'user');

        const now = Timestamp.now();
        const recoveryFields = {
            active: true,
            modifiedOn: now,
            onboardingProviderCancellationPending: false,
            onboardingProviderRecoveryAvailableAt: Timestamp.fromMillis(params.recoveryAvailableAtMillis),
            onboardingProviderRecoveryReason: String(
                params.reason || 'answerlattice_onboarding_provider_result_unconfirmed',
            ).slice(0, 80),
            onboardingProviderSubscriptionId: providerSubscriptionId,
            onboardingRecoveryMarkedAt: now,
            onboardingStatus: ANSWERLATTICE_ONBOARDING_STATUS.PROVIDER_RECOVERY_PENDING,
        };
        transaction.set(tenantRef, recoveryFields, { merge: true });
        transaction.set(storeRef, recoveryFields, { merge: true });
        transaction.set(userRef, recoveryFields, { merge: true });
    });
}

export async function compensateAnswerlatticeOnboardingProvisioning(params: {
    cancellationPending: boolean;
    db: FirebaseFirestore.Firestore;
    providerSubscriptionId?: string | null;
    reason: string;
    scope: AnswerlatticeProvisioningScope;
}): Promise<void> {
    const tenantId = requireScopeId(params.scope.tenantId, 'tenantId');
    const storeId = requireScopeId(params.scope.storeId, 'storeId');
    const userId = requireAnswerlatticeOnboardingUserId(params.scope.userId);
    const providerSubscriptionId = params.providerSubscriptionId
        ? normalizeAnswerlatticeSubscriptionId(params.providerSubscriptionId)
        : null;

    await params.db.runTransaction(async (transaction) => {
        const tenantRef = params.db.collection(DB_COLLECTIONS.TENANTS).doc(String(tenantId));
        const storeRef = params.db.collection(DB_COLLECTIONS.STORES).doc(String(storeId));
        const userRef = params.db.collection(DB_COLLECTIONS.USERS).doc(userId);
        const storesSummaryRef = params.db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary');
        const tenantSummaryRef = params.db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(
            getAnswerlatticeTenantSummaryShardId(tenantId, storeId),
        );
        const subscriptionRef = providerSubscriptionId
            ? params.db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(providerSubscriptionId)
            : null;
        const refs = [tenantRef, storeRef, userRef, ...(subscriptionRef ? [subscriptionRef] : [])];
        const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
        const [tenantSnap, storeSnap, userSnap, subscriptionSnap] = snapshots;
        const status = ANSWERLATTICE_ONBOARDING_STATUS.PAYMENT_PROVIDER_FAILED;
        const now = Timestamp.now();
        const reason = String(params.reason || 'answerlattice_onboarding_failed').slice(0, 80);
        const failureFields = {
            active: false,
            modifiedOn: now,
            onboardingCompensatedAt: now,
            onboardingCompensationReason: reason,
            onboardingProviderCancellationPending: params.cancellationPending,
            onboardingProviderSubscriptionId: providerSubscriptionId,
            onboardingStatus: status,
        };

        if (
            tenantSnap.exists
            && answerlatticeProvisioningOwnershipMatches(tenantSnap.data() || {}, params.scope, 'tenant')
        ) {
            transaction.set(tenantRef, failureFields, { merge: true });
        }
        if (storeSnap.exists && answerlatticeProvisioningOwnershipMatches(storeSnap.data() || {}, params.scope)) {
            transaction.set(storeRef, failureFields, { merge: true });
            transaction.set(storesSummaryRef, {
                lastUpdated: now,
                stores: {
                    [String(storeId)]: {
                        active: false,
                        modifiedOn: now,
                        onboardingStatus: status,
                    },
                },
            }, { merge: true });
            transaction.set(tenantSummaryRef, {
                summaryType: ANSWERLATTICE_TENANT_SUMMARY_SHARD_TYPE,
                shardVersion: 1,
                tenants: {
                    [`${tenantId}_${storeId}`]: {
                        active: false,
                        lastSeenAt: now,
                        pId: PRODUCT_IDS.ANSWERLATTICE,
                        sId: storeId,
                        source: 'client_onboarding_compensation',
                        tId: tenantId,
                        updatedAt: now,
                    },
                },
                updatedAt: now,
            }, { merge: true });
        }
        if (userSnap.exists && answerlatticeProvisioningOwnershipMatches(userSnap.data() || {}, params.scope)) {
            transaction.set(userRef, {
                modifiedOn: now,
                onboardingCompensatedAt: now,
                onboardingCompensationReason: reason,
                onboardingStatus: status,
                sId: null,
                storeId: null,
                storeIds: [],
                stores: [],
                tId: null,
                tenantId: null,
            }, { merge: true });
        }
        if (subscriptionRef && subscriptionSnap?.exists) {
            const subscriptionData = subscriptionSnap.data() || {};
            if (
                isAnswerlatticeSubscriptionInScope(subscriptionData, {
                    tId: tenantId,
                    sId: storeId,
                })
            ) {
                transaction.set(subscriptionRef, {
                    status: 'cancelled',
                    modifiedOn: now,
                    onboardingCompensatedAt: now,
                    onboardingCompensationReason: reason,
                }, { merge: true });
            }
        }
    });
}
