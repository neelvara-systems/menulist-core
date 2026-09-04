import type { StoreDataType } from '@type/platform/store';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';
import {
    isStarterActivationExpired,
    isStarterActivationStore,
    STARTER_ACTIVATION_STATUS,
} from './starterActivation';

export type OwnerAccessRecoveryState =
    | 'payment_pending'
    | 'starter_expired'
    | 'plan_ended'
    | 'plan_required'
    | 'workspace_missing';

const ENDED_SUBSCRIPTION_STATUSES = new Set([
    'cancelled',
    'completed',
    'expired',
    'paused',
]);

export function maskOwnerAccountIdentifier(value?: string | null): string | null {
    const identifier = String(value || '').trim();
    if (!identifier) return null;

    const atIndex = identifier.indexOf('@');
    if (atIndex > 0 && atIndex < identifier.length - 1) {
        const localPart = identifier.slice(0, atIndex);
        const domain = identifier.slice(atIndex + 1);
        const visibleLocal = localPart.slice(0, Math.min(2, localPart.length));
        const maskedLocal = `${visibleLocal}${'•'.repeat(Math.max(3, localPart.length - visibleLocal.length))}`;
        return `${maskedLocal}@${domain}`;
    }

    const compactIdentifier = identifier.replace(/\s+/g, ' ');
    if (compactIdentifier.length <= 4) {
        return `${compactIdentifier.slice(0, 1)}•••`;
    }

    return `${compactIdentifier.slice(0, 2)}${'•'.repeat(Math.min(6, compactIdentifier.length - 4))}${compactIdentifier.slice(-2)}`;
}

/**
 * Explains why an authenticated owner is outside the paid/starter workspace.
 * This is presentation-only: entitlement remains governed by the existing
 * paid and Starter access checks.
 */
export function resolveOwnerAccessRecoveryState({
    activeSubscription,
    nowMs = Date.now(),
    storeDetails,
}: {
    activeSubscription?: Pick<FirestoreSubscriptionDoc, 'status'> | null;
    nowMs?: number;
    storeDetails?: Pick<StoreDataType, 'activationDeadline' | 'onboardingSource' | 'starterActivationStatus'> | null;
}): OwnerAccessRecoveryState {
    if (
        activeSubscription?.status === 'pending'
        || storeDetails?.starterActivationStatus === STARTER_ACTIVATION_STATUS.PAYMENT_PENDING
    ) return 'payment_pending';

    if (isStarterActivationStore(storeDetails) && isStarterActivationExpired(storeDetails, nowMs)) {
        return 'starter_expired';
    }

    if (activeSubscription?.status && ENDED_SUBSCRIPTION_STATUSES.has(activeSubscription.status)) {
        return 'plan_ended';
    }

    if (storeDetails) return 'plan_required';
    return 'workspace_missing';
}
