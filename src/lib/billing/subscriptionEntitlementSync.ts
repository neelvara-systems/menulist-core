import { DB_COLLECTIONS } from '@constant/database';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
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

export interface SubscriptionEntitlementSyncInput {
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

function normalizePlanId(planId: unknown): string | null {
    const normalized = String(planId || '').trim().toLowerCase();
    return normalized || null;
}

export function getActivePlanTypeForSubscription(subscription: SubscriptionEntitlementSyncInput): string | null {
    if (subscription.status !== 'active') return null;
    return normalizePlanId(subscription.planId);
}

export function isSubscriptionEntitlementSynced(
    subscription: Partial<FirestoreSubscriptionDoc>,
    desiredActivePlanType: string | null,
): boolean {
    const syncedPlanType = (subscription as any)?.analyticsEntitlement?.activePlanType ?? null;
    return syncedPlanType === desiredActivePlanType;
}

const toTimestampMillis = (value: unknown): number => {
    if (!value || typeof value !== 'object') return 0;
    try {
        const toMillis = (value as { toMillis?: unknown }).toMillis;
        if (typeof toMillis === 'function') {
            const millis = Number(toMillis.call(value));
            return Number.isFinite(millis) ? millis : 0;
        }
        const seconds = Number((value as { seconds?: unknown }).seconds);
        return Number.isFinite(seconds) ? seconds * 1000 : 0;
    } catch {
        return 0;
    }
};

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
    const activeSubscriptionsQuery = subscriptionsRef
        .where('status', '==', 'active')
        .where('storeId', '==', expectedStoreScope.numericId)
        .where('tenantId', '==', expectedTenantScope.numericId)
        .where('cycleEndDate', '>=', admin.firestore.Timestamp.now())
        .orderBy('cycleEndDate', 'desc')
        .limit(10);
    const syncResult = await firestoreAdmin.runTransaction(async (transaction) => {
        const [subscriptionSnapshot, activeSubscriptionsSnapshot] = await Promise.all([
            transaction.get(subscriptionRef),
            transaction.get(activeSubscriptionsQuery),
        ]);
        if (!subscriptionSnapshot.exists) return null;

        const current = {
            ...(subscriptionSnapshot.data() as FirestoreSubscriptionDoc),
            id: subscriptionSnapshot.id,
        } as FirestoreSubscriptionDoc;
        const currentTenantScope = normalizeBillingSubscriptionScopeDocumentId(current.tenantId ?? current.tId);
        const currentStoreScope = normalizeBillingSubscriptionScopeDocumentId(current.storeId ?? current.sId);
        if (
            !currentTenantScope
            || !currentStoreScope
            || currentTenantScope.numericId !== expectedTenantScope.numericId
            || currentStoreScope.numericId !== expectedStoreScope.numericId
        ) {
            return null;
        }

        const activeSubscription = activeSubscriptionsSnapshot.docs
            .map((snapshot) => ({
                ...(snapshot.data() as FirestoreSubscriptionDoc),
                id: snapshot.id,
            } as FirestoreSubscriptionDoc))
            .filter((candidate) => (
                normalizeBillingSubscriptionScopeDocumentId(candidate.tenantId ?? candidate.tId)?.numericId
                    === expectedTenantScope.numericId
                && normalizeBillingSubscriptionScopeDocumentId(candidate.storeId ?? candidate.sId)?.numericId
                    === expectedStoreScope.numericId
            ))
            .sort((left, right) => toTimestampMillis(right.cycleEndDate) - toTimestampMillis(left.cycleEndDate))[0]
            || null;
        const activePlanType = activeSubscription
            ? getActivePlanTypeForSubscription(activeSubscription)
            : null;
        const entitlementValue = activePlanType || admin.firestore.FieldValue.delete();
        const activeSubscriptionIdValue = activeSubscription?.id || admin.firestore.FieldValue.delete();
        const syncedAt = admin.firestore.FieldValue.serverTimestamp();

        transaction.set(firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(currentStoreScope.documentId), {
            activePlanType: entitlementValue,
            analyticsEntitlementUpdatedAt: syncedAt,
            billingSubscriptionId: activeSubscriptionIdValue,
        }, { merge: true });
        transaction.set(firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary'), {
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
                status: current.status || null,
                syncedAt,
                source,
            },
        }, { merge: true });

        return {
            storeId: currentStoreScope.documentId,
            tenantId: currentTenantScope.numericId,
        };
    });
    if (!syncResult) return;

    revalidateTag(`menu-store-${syncResult.storeId}`);
    revalidateTag(`store-${syncResult.storeId}`);
    revalidateTag('client-stores');
    revalidateTag('screen-data');
    await touchDigitalScreenContentVersionForStoreServer(syncResult.storeId, 'subscriptionEntitlementSync');
    await invalidateOwnerBusinessAssistantPacketCache({
        tId: syncResult.tenantId,
        sId: syncResult.storeId,
    });
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
