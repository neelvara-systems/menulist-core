import type { ProductId } from '@constant/product';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';
import { razorpayClient } from '@lib/razorpay/razorpay';
import {
    applyProductSubscriptionUpgradeCarryForward,
    getProductSubscriptionById,
    safeSyncProductSubscriptionEntitlementFromSubscription,
    type ProductSubscriptionUpgradeApplicationResult,
} from './productBillingServer';
import { getProductSubscriptionBillingScope } from './productSubscriptionScopeBoundary';
import { getRazorpayManagedSubscriptionId } from './subscriptionProviderSync';
import { resolveSubscriptionReplacementEvidence } from './subscriptionReplacementEvidence';

const PROVIDER_TERMINAL_STATUSES = new Set(['cancelled', 'completed', 'expired']);

const hasExactScope = (
    productId: ProductId,
    subscription: FirestoreSubscriptionDoc,
    tenantId: number,
    storeId: number,
): boolean => {
    const scope = getProductSubscriptionBillingScope(productId, subscription);
    return scope?.tenantId === tenantId && scope.storeId === storeId;
};

/**
 * Completes an already-paid replacement subscription. Provider cancellation
 * happens before the Firestore carry-forward transaction so a retry can safely
 * resume after either side succeeds. The transaction itself is idempotent.
 */
export async function finalizeProductSubscriptionReplacement(params: {
    newSubscriptionId: string;
    oldSubscriptionId: string;
    productId: ProductId;
    source: string;
    storeId: number;
    tenantId: number;
    requireReplacementMarker?: boolean;
}): Promise<ProductSubscriptionUpgradeApplicationResult> {
    const {
        newSubscriptionId,
        oldSubscriptionId,
        productId,
        source,
        storeId,
        tenantId,
        requireReplacementMarker = true,
    } = params;
    const [oldSubscription, newSubscription] = await Promise.all([
        getProductSubscriptionById(productId, oldSubscriptionId),
        getProductSubscriptionById(productId, newSubscriptionId),
    ]);
    if (!oldSubscription || !newSubscription) {
        throw new Error('Replacement subscription records were not found.');
    }
    if (
        !hasExactScope(productId, oldSubscription, tenantId, storeId)
        || !hasExactScope(productId, newSubscription, tenantId, storeId)
    ) {
        throw new Error('Replacement subscriptions are outside the billing scope.');
    }

    const replacementEvidence = resolveSubscriptionReplacementEvidence(newSubscription);
    if (replacementEvidence.outcome === 'invalid') {
        throw new Error('Replacement subscription intent is invalid.');
    }
    const replacementMarker = replacementEvidence.outcome === 'replacement'
        ? replacementEvidence.subscriptionId
        : null;
    if (requireReplacementMarker && replacementMarker !== oldSubscriptionId) {
        throw new Error('Replacement subscription intent does not match the old subscription.');
    }
    if (replacementMarker && replacementMarker !== oldSubscriptionId) {
        throw new Error('Replacement subscription points to another subscription.');
    }

    const carryForwardAlreadyApplied = (
        oldSubscription.status === 'expired'
        && newSubscription.carryForwardFromSubscriptionId === oldSubscriptionId
    );
    if (!carryForwardAlreadyApplied) {
        if (newSubscription.status !== 'active') {
            throw new Error('Replacement subscription is not active.');
        }
        const providerSubscriptionId = getRazorpayManagedSubscriptionId(oldSubscription);
        if (!providerSubscriptionId) {
            throw new Error('Prepaid subscriptions cannot be replaced through Razorpay.');
        }

        const providerSubscription = await razorpayClient.subscriptions.fetch(providerSubscriptionId);
        if (!PROVIDER_TERMINAL_STATUSES.has(String(providerSubscription.status))) {
            await razorpayClient.subscriptions.cancel(providerSubscriptionId);
        }
    }

    const application = await applyProductSubscriptionUpgradeCarryForward(productId, {
        newSubscriptionId,
        oldSubscriptionId,
        storeId,
        tenantId,
    });
    if (!application || (!application.applied && !application.duplicate)) {
        throw new Error('Replacement subscription state changed before finalization.');
    }

    await safeSyncProductSubscriptionEntitlementFromSubscription(
        productId,
        application.oldSubscription,
        `${source}:old-expired`,
    );
    await safeSyncProductSubscriptionEntitlementFromSubscription(
        productId,
        application.newSubscription,
        `${source}:new-active`,
    );
    return application;
}
