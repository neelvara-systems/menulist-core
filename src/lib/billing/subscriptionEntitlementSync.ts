import { DB_COLLECTIONS } from '@constant/database';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import type { FirestoreSubscriptionDoc, PaymentStatus } from '@type/razorpay';
import { revalidateTag } from 'next/cache';

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

export async function syncStorePlanEntitlementFromSubscription(
    subscription: SubscriptionEntitlementSyncInput,
    source: string,
): Promise<void> {
    const storeId = String(subscription.storeId || '').trim();
    if (!storeId) return;

    const activePlanType = getActivePlanTypeForSubscription(subscription);
    const entitlementValue = activePlanType || admin.firestore.FieldValue.delete();
    const syncedAt = admin.firestore.FieldValue.serverTimestamp();

    await Promise.all([
        firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeId).set({
            activePlanType: entitlementValue,
            analyticsEntitlementUpdatedAt: syncedAt,
        }, { merge: true }),
        firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').set({
            lastUpdated: syncedAt,
            [`stores.${storeId}.activePlanType`]: entitlementValue,
        }, { merge: true }),
    ]);

    if (subscription.id) {
        await firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscription.id).set({
            analyticsEntitlement: {
                activePlanType,
                status: subscription.status || null,
                syncedAt,
                source,
            },
            }, { merge: true });
    }

    revalidateTag(`menu-store-${storeId}`);
    revalidateTag(`store-${storeId}`);
    revalidateTag('client-stores');
}

export async function safeSyncStorePlanEntitlementFromSubscription(
    subscription: SubscriptionEntitlementSyncInput,
    source: string,
): Promise<void> {
    try {
        await syncStorePlanEntitlementFromSubscription(subscription, source);
    } catch (error) {
        logger.error('Failed to sync store plan entitlement', error, {
            source,
            subscriptionId: subscription.id,
            tenantId: subscription.tenantId,
            storeId: subscription.storeId,
            planId: subscription.planId,
            status: subscription.status,
        });
    }
}
