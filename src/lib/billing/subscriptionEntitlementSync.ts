import { DB_COLLECTIONS } from '@constant/database';
import { DEFAULT_PRODUCT_ID } from '@constant/product';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { runStorePublicTruthPostCommitEffects } from '@lib/cache/storePublicTruthPostCommit';
import { invalidateOwnerBusinessAssistantPacketCache } from '@lib/ownerBusinessAssistant/server/contextPacketCache';
import { touchDigitalScreenContentVersionForStoreServer } from '@lib/screen/serverScreenInvalidation';
import { secureError } from '@lib/security/secureLogger';
import type { FirestoreSubscriptionDoc, PaymentStatus } from '@type/razorpay';
import { revalidateTag } from 'next/cache';
import { getBoundedRazorpayStringContext, getRazorpayFailureLogData } from './razorpayDiagnostics';
import {
    normalizeBillingSubscriptionDocumentId,
    normalizeBillingSubscriptionScopeDocumentId,
} from './subscriptionDocumentIdBoundary';
import { getMenuListSubscriptionEntitlementScope } from './menuListSubscriptionEntitlementBoundary';
import {
    getActivePlanTypeForSubscription,
    getSubscriptionPlanEntitlementStatusPriority,
    hasCurrentSubscriptionPlanEntitlement,
    PLAN_ENTITLED_SUBSCRIPTION_STATUSES,
    toSubscriptionCycleEndMillis,
} from './subscriptionPlanEntitlement';

export {
    getActivePlanTypeForSubscription,
    hasCurrentSubscriptionPlanEntitlement,
    PLAN_ENTITLED_SUBSCRIPTION_STATUSES,
} from './subscriptionPlanEntitlement';

export interface SubscriptionEntitlementSyncInput {
    cycleEndDate?: unknown;
    id?: string;
    tenantId: string | number;
    storeId: string | number;
    planId?: string | null;
    status?: PaymentStatus | string | null;
}

export interface SubscriptionEntitlementState {
    activePlanType: string | null;
    status: string | null;
    syncedAt?: any;
    source?: string;
}

const getSubscriptionEntitlementLogContext = (
    subscription: SubscriptionEntitlementSyncInput,
    source: string,
) => ({
    ...getBoundedRazorpayStringContext('subscriptionId', subscription.id),
    ...getBoundedRazorpayStringContext('tenantId', subscription.tenantId),
    ...getBoundedRazorpayStringContext('storeId', subscription.storeId),
    ...getBoundedRazorpayStringContext('planId', subscription.planId),
    ...getBoundedRazorpayStringContext('status', subscription.status),
    ...getBoundedRazorpayStringContext('source', source),
});

export function isSubscriptionEntitlementSynced(
    subscription: Partial<FirestoreSubscriptionDoc>,
    desiredActivePlanType: string | null,
): boolean {
    const syncedPlanType = (subscription as any)?.analyticsEntitlement?.activePlanType ?? null;
    return syncedPlanType === desiredActivePlanType;
}

export async function syncStorePlanEntitlementFromSubscription(
    subscription: SubscriptionEntitlementSyncInput,
    source: string,
): Promise<void> {
    const subscriptionId = normalizeBillingSubscriptionDocumentId(subscription.id);
    const expectedTenantScope = normalizeBillingSubscriptionScopeDocumentId(subscription.tenantId);
    const expectedStoreScope = normalizeBillingSubscriptionScopeDocumentId(subscription.storeId);
    if (!subscriptionId || !expectedTenantScope || !expectedStoreScope) return;

    const subscriptionsRef = firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS);
    const subscriptionRef = subscriptionsRef.doc(subscriptionId);
    const entitledSubscriptionsQuery = subscriptionsRef
        .where('pId', '==', DEFAULT_PRODUCT_ID)
        .where('productId', '==', DEFAULT_PRODUCT_ID)
        .where('status', 'in', [...PLAN_ENTITLED_SUBSCRIPTION_STATUSES])
        .where('storeId', '==', expectedStoreScope.numericId)
        .where('tenantId', '==', expectedTenantScope.numericId)
        .where('tId', '==', expectedTenantScope.numericId)
        .where('sId', '==', expectedStoreScope.numericId)
        .where('cycleEndDate', '>=', admin.firestore.Timestamp.now())
        .orderBy('cycleEndDate', 'desc')
        .limit(10);
    const syncResult = await firestoreAdmin.runTransaction(async (transaction) => {
        const [subscriptionSnapshot, entitledSubscriptionsSnapshot] = await Promise.all([
            transaction.get(subscriptionRef),
            transaction.get(entitledSubscriptionsQuery),
        ]);
        if (!subscriptionSnapshot.exists) return null;

        const current = {
            ...(subscriptionSnapshot.data() as FirestoreSubscriptionDoc),
            id: subscriptionSnapshot.id,
        } as FirestoreSubscriptionDoc;
        const currentScope = getMenuListSubscriptionEntitlementScope(current);
        if (
            !currentScope
            || currentScope.tenantId !== expectedTenantScope.numericId
            || currentScope.storeId !== expectedStoreScope.numericId
        ) {
            return null;
        }

        const entitledSubscription = entitledSubscriptionsSnapshot.docs
            .map((snapshot) => ({
                ...(snapshot.data() as FirestoreSubscriptionDoc),
                id: snapshot.id,
            } as FirestoreSubscriptionDoc))
            .filter((candidate) => {
                const candidateScope = getMenuListSubscriptionEntitlementScope(candidate);
                return candidateScope?.tenantId === expectedTenantScope.numericId
                    && candidateScope.storeId === expectedStoreScope.numericId
                    && hasCurrentSubscriptionPlanEntitlement(candidate);
            })
            .sort((left, right) => (
                getSubscriptionPlanEntitlementStatusPriority(right.status)
                    - getSubscriptionPlanEntitlementStatusPriority(left.status)
                || toSubscriptionCycleEndMillis(right.cycleEndDate)
                    - toSubscriptionCycleEndMillis(left.cycleEndDate)
            ))[0]
            || null;
        const activePlanType = entitledSubscription
            ? getActivePlanTypeForSubscription(entitledSubscription)
            : null;
        const entitlementValue = activePlanType || admin.firestore.FieldValue.delete();
        const activeSubscriptionIdValue = entitledSubscription?.id || admin.firestore.FieldValue.delete();
        const syncedAt = admin.firestore.FieldValue.serverTimestamp();

        transaction.set(firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(expectedStoreScope.documentId), {
            activePlanType: entitlementValue,
            analyticsEntitlementUpdatedAt: syncedAt,
            billingSubscriptionId: activeSubscriptionIdValue,
        }, { merge: true });
        transaction.set(firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary'), {
            lastUpdated: syncedAt,
            stores: {
                [expectedStoreScope.documentId]: {
                    activePlanType: entitlementValue,
                    billingSubscriptionId: activeSubscriptionIdValue,
                },
            },
        }, { merge: true });
        transaction.set(subscriptionRef, {
            analyticsEntitlement: {
                activePlanType,
                status: current.status || null,
                syncedAt,
                source,
            },
        }, { merge: true });

        return {
            storeId: expectedStoreScope.documentId,
            tenantId: expectedTenantScope.numericId,
        };
    });
    if (!syncResult) return;

    const postCommit = await runStorePublicTruthPostCommitEffects({
        chunkSize: 1,
        storeIds: [syncResult.storeId],
        tenantId: String(syncResult.tenantId),
        deps: {
            invalidateAssistant: (storeId, tenantId) => (
                invalidateOwnerBusinessAssistantPacketCache({ tId: tenantId, sId: storeId })
            ),
            revalidate: (tag) => revalidateTag(tag),
            touchScreen: (storeId) => touchDigitalScreenContentVersionForStoreServer(
                storeId,
                'subscriptionEntitlementSync',
            ),
        },
    });
    if (postCommit.effectsPending) {
        secureError(
            '[Billing] Store plan entitlement post-commit effect failed',
            new Error('billing_store_plan_entitlement_post_commit_effect_failed'),
            getRazorpayFailureLogData(
                'billing_store_plan_entitlement_post_commit_effect_failed',
                postCommit.firstError,
                {
                    failedEffectCount: postCommit.failedEffectCount,
                    ...getSubscriptionEntitlementLogContext(subscription, source),
                },
            ),
        );
    }
}

export async function safeSyncStorePlanEntitlementFromSubscription(
    subscription: SubscriptionEntitlementSyncInput,
    source: string,
): Promise<void> {
    try {
        await syncStorePlanEntitlementFromSubscription(subscription, source);
    } catch (error) {
        secureError(
            '[Billing] Store plan entitlement sync failed',
            new Error('billing_store_plan_entitlement_sync_failed'),
            getRazorpayFailureLogData(
                'billing_store_plan_entitlement_sync_failed',
                error,
                getSubscriptionEntitlementLogContext(subscription, source),
            ),
        );
    }
}
