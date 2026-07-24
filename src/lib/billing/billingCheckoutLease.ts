import { createHash, randomUUID } from 'crypto';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export type BillingCheckoutKind = 'subscription' | 'topup';

export type BillingCheckoutClaim =
    | { outcome: 'acquired'; attemptId: string; startedAtMillis: number }
    | { outcome: 'in_progress' }
    | { outcome: 'conflict' }
    | { outcome: 'recover_attempt'; attemptId: string; startedAtMillis: number }
    | { outcome: 'recover_provider'; attemptId: string; startedAtMillis: number }
    | { outcome: 'provider_created'; attemptId: string; providerEntityId: string; startedAtMillis: number };

type BillingCheckoutLeaseRecord = {
    actorHash?: unknown;
    attemptId?: unknown;
    expiresAt?: unknown;
    kind?: unknown;
    productId?: unknown;
    providerEntityId?: unknown;
    requestHash?: unknown;
    stateVersion?: unknown;
    startedAt?: unknown;
    status?: unknown;
    storeId?: unknown;
    tenantId?: unknown;
};

type BillingCheckoutLeaseIdentity = {
    actorId: string;
    kind: BillingCheckoutKind;
    productId: string;
    requestFacts: Record<string, string | number | boolean | null | undefined>;
    storeId: string | number;
    tenantId: string | number;
};

const BILLING_CHECKOUT_PROCESSING_LEASE_MS = 2 * 60 * 1000;
const BILLING_CHECKOUT_PROVIDER_RECOVERY_MS = 24 * 60 * 60 * 1000;
const BILLING_CHECKOUT_COMPLETED_REPLAY_MS = 2 * 60 * 1000;
const BILLING_CHECKOUT_STATE_VERSION = 2;

function digest(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

function getTimestampMillis(value: unknown): number {
    if (!value || typeof value !== 'object') return 0;
    const maybeTimestamp = value as { toMillis?: unknown; seconds?: unknown };
    if (typeof maybeTimestamp.toMillis === 'function') {
        const millis = Number(maybeTimestamp.toMillis.call(value));
        return Number.isFinite(millis) ? millis : 0;
    }
    const seconds = Number(maybeTimestamp.seconds);
    return Number.isFinite(seconds) ? seconds * 1000 : 0;
}

function normalizeFacts(
    facts: BillingCheckoutLeaseIdentity['requestFacts'],
): Array<[string, string | number | boolean | null]> {
    return Object.entries(facts)
        .filter((entry): entry is [string, string | number | boolean | null] => entry[1] !== undefined)
        .sort(([left], [right]) => left.localeCompare(right));
}

export function getBillingCheckoutRequestHash(
    facts: BillingCheckoutLeaseIdentity['requestFacts'],
): string {
    return digest(JSON.stringify(normalizeFacts(facts)));
}

function getLeaseContext(identity: BillingCheckoutLeaseIdentity) {
    const productId = String(identity.productId).trim().toUpperCase();
    const tenantId = String(identity.tenantId);
    const storeId = String(identity.storeId);
    const requestHash = getBillingCheckoutRequestHash(identity.requestFacts);
    const actorHash = digest(String(identity.actorId));
    const leaseId = digest(`${identity.kind}|${productId}|${tenantId}|${storeId}`);

    return {
        actorHash,
        kind: identity.kind,
        leaseId,
        productId,
        requestHash,
        storeId,
        tenantId,
    };
}

function recordMatchesScope(record: BillingCheckoutLeaseRecord, context: ReturnType<typeof getLeaseContext>): boolean {
    return String(record.kind || '') === context.kind
        && String(record.productId || '') === context.productId
        && String(record.tenantId || '') === context.tenantId
        && String(record.storeId || '') === context.storeId;
}

export async function claimBillingCheckoutLease(
    identity: BillingCheckoutLeaseIdentity,
): Promise<BillingCheckoutClaim> {
    const context = getLeaseContext(identity);
    const ref = firestoreAdmin.collection(DB_COLLECTIONS.BILLING_CHECKOUT_LEASES).doc(context.leaseId);
    const nowMillis = Date.now();

    return firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const existing = snapshot.exists ? snapshot.data() as BillingCheckoutLeaseRecord : null;

        if (existing) {
            if (!recordMatchesScope(existing, context)) {
                throw new Error('billing_checkout_lease_scope_mismatch');
            }
            const sameRequest = existing.requestHash === context.requestHash
                && existing.actorHash === context.actorHash;
            const attemptId = typeof existing.attemptId === 'string' ? existing.attemptId : '';
            const startedAtMillis = getTimestampMillis(existing.startedAt);
            const expiresAtMillis = getTimestampMillis(existing.expiresAt);

            if (existing.status === 'completed' && attemptId && expiresAtMillis > nowMillis) {
                const providerEntityId = typeof existing.providerEntityId === 'string'
                    ? existing.providerEntityId
                    : '';
                if (sameRequest && providerEntityId) {
                    return {
                        outcome: 'provider_created' as const,
                        attemptId,
                        providerEntityId,
                        startedAtMillis,
                    };
                }
                return { outcome: 'conflict' as const };
            }

            if (existing.status === 'provider_created' && attemptId) {
                const providerEntityId = typeof existing.providerEntityId === 'string'
                    ? existing.providerEntityId
                    : '';
                if (sameRequest && providerEntityId) {
                    return {
                        outcome: 'provider_created' as const,
                        attemptId,
                        providerEntityId,
                        startedAtMillis,
                    };
                }
                return { outcome: 'conflict' as const };
            }

            if (existing.status === 'processing' && expiresAtMillis > nowMillis) {
                return { outcome: sameRequest ? 'in_progress' as const : 'conflict' as const };
            }

            if (existing.status === 'processing' && existing.stateVersion !== BILLING_CHECKOUT_STATE_VERSION) {
                if (!sameRequest || !attemptId) return { outcome: 'conflict' as const };
                return {
                    outcome: 'recover_provider' as const,
                    attemptId,
                    startedAtMillis,
                };
            }

            if (existing.status === 'processing' && sameRequest && attemptId) {
                return {
                    outcome: 'recover_attempt' as const,
                    attemptId,
                    startedAtMillis,
                };
            }

            if (existing.status === 'provider_creating' && attemptId) {
                if (!sameRequest) return { outcome: 'conflict' as const };
                if (expiresAtMillis > nowMillis) return { outcome: 'in_progress' as const };
                return {
                    outcome: 'recover_provider' as const,
                    attemptId,
                    startedAtMillis,
                };
            }

            const completedProviderEntityId = typeof existing.providerEntityId === 'string'
                ? existing.providerEntityId
                : '';
            const mayReplaceExpiredPreProviderLease = existing.status === 'processing'
                && existing.stateVersion === BILLING_CHECKOUT_STATE_VERSION
                && !sameRequest
                && Boolean(attemptId)
                && expiresAtMillis > 0;
            const mayReplaceExpiredCompletedReplay = existing.status === 'completed'
                && Boolean(attemptId)
                && Boolean(completedProviderEntityId)
                && expiresAtMillis > 0;
            if (!mayReplaceExpiredPreProviderLease && !mayReplaceExpiredCompletedReplay) {
                return { outcome: 'conflict' as const };
            }
        }

        const attemptId = randomUUID();
        transaction.set(ref, {
            ...context,
            attemptId,
            startedAt: Timestamp.fromMillis(nowMillis),
            expiresAt: Timestamp.fromMillis(nowMillis + BILLING_CHECKOUT_PROCESSING_LEASE_MS),
            status: 'processing',
            stateVersion: BILLING_CHECKOUT_STATE_VERSION,
            updatedAt: Timestamp.fromMillis(nowMillis),
        });
        return { outcome: 'acquired' as const, attemptId, startedAtMillis: nowMillis };
    });
}

export async function markBillingCheckoutProviderCreateStarted(params: {
    attemptId: string;
    identity: BillingCheckoutLeaseIdentity;
}): Promise<boolean> {
    const context = getLeaseContext(params.identity);
    const ref = firestoreAdmin.collection(DB_COLLECTIONS.BILLING_CHECKOUT_LEASES).doc(context.leaseId);
    const nowMillis = Date.now();

    return firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) return false;
        const existing = snapshot.data() as BillingCheckoutLeaseRecord;
        if (
            !recordMatchesScope(existing, context)
            || existing.attemptId !== params.attemptId
            || existing.requestHash !== context.requestHash
            || existing.actorHash !== context.actorHash
            || existing.stateVersion !== BILLING_CHECKOUT_STATE_VERSION
            || getTimestampMillis(existing.expiresAt) <= nowMillis
            || !['processing', 'provider_creating'].includes(String(existing.status))
        ) return false;
        transaction.set(ref, {
            status: 'provider_creating',
            updatedAt: Timestamp.fromMillis(nowMillis),
        }, { merge: true });
        return true;
    });
}

export async function renewExpiredBillingCheckoutLease(
    identity: BillingCheckoutLeaseIdentity,
    expiredAttemptId: string,
): Promise<{ acquired: boolean; attemptId?: string; startedAtMillis?: number }> {
    const context = getLeaseContext(identity);
    const ref = firestoreAdmin.collection(DB_COLLECTIONS.BILLING_CHECKOUT_LEASES).doc(context.leaseId);
    const nowMillis = Date.now();

    return firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) return { acquired: false };
        const existing = snapshot.data() as BillingCheckoutLeaseRecord;
        if (
            !recordMatchesScope(existing, context)
            || existing.status !== 'processing'
            || existing.attemptId !== expiredAttemptId
            || existing.requestHash !== context.requestHash
            || existing.actorHash !== context.actorHash
            || existing.stateVersion !== BILLING_CHECKOUT_STATE_VERSION
            || getTimestampMillis(existing.expiresAt) > nowMillis
        ) return { acquired: false };

        const attemptId = randomUUID();
        transaction.set(ref, {
            ...context,
            attemptId,
            startedAt: Timestamp.fromMillis(nowMillis),
            expiresAt: Timestamp.fromMillis(nowMillis + BILLING_CHECKOUT_PROCESSING_LEASE_MS),
            status: 'processing',
            stateVersion: BILLING_CHECKOUT_STATE_VERSION,
            updatedAt: Timestamp.fromMillis(nowMillis),
        });
        return { acquired: true, attemptId, startedAtMillis: nowMillis };
    });
}

/**
 * Top-up orders have a provider-enforced unique receipt derived from the
 * attempt ID. That lets a retry keep the same provider identity fence. Razorpay
 * subscriptions do not expose an equivalent create idempotency key, so they
 * must remain in recovery-only mode once provider creation has started.
 */
export async function renewBillingCheckoutProviderRecoveryLease(
    identity: BillingCheckoutLeaseIdentity,
    attemptId: string,
): Promise<boolean> {
    const context = getLeaseContext(identity);
    if (context.kind !== 'topup') return false;
    const ref = firestoreAdmin.collection(DB_COLLECTIONS.BILLING_CHECKOUT_LEASES).doc(context.leaseId);
    const nowMillis = Date.now();

    return firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) return false;
        const existing = snapshot.data() as BillingCheckoutLeaseRecord;
        if (
            !recordMatchesScope(existing, context)
            || !(
                existing.status === 'provider_creating'
                || (
                    existing.status === 'processing'
                    && existing.stateVersion !== BILLING_CHECKOUT_STATE_VERSION
                )
            )
            || existing.attemptId !== attemptId
            || existing.requestHash !== context.requestHash
            || existing.actorHash !== context.actorHash
            || getTimestampMillis(existing.expiresAt) > nowMillis
        ) return false;
        transaction.set(ref, {
            expiresAt: Timestamp.fromMillis(nowMillis + BILLING_CHECKOUT_PROCESSING_LEASE_MS),
            stateVersion: BILLING_CHECKOUT_STATE_VERSION,
            status: 'provider_creating',
            updatedAt: Timestamp.fromMillis(nowMillis),
        }, { merge: true });
        return true;
    });
}

export async function markBillingCheckoutProviderCreated(params: {
    attemptId: string;
    identity: BillingCheckoutLeaseIdentity;
    providerEntityId: string;
}): Promise<boolean> {
    const context = getLeaseContext(params.identity);
    const ref = firestoreAdmin.collection(DB_COLLECTIONS.BILLING_CHECKOUT_LEASES).doc(context.leaseId);
    const nowMillis = Date.now();

    const providerEntityId = String(params.providerEntityId || '').trim();
    if (!providerEntityId) return false;

    return firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) return false;
        const existing = snapshot.data() as BillingCheckoutLeaseRecord;
        if (
            !recordMatchesScope(existing, context)
            || existing.attemptId !== params.attemptId
            || existing.requestHash !== context.requestHash
            || existing.actorHash !== context.actorHash
        ) return false;
        if (existing.status === 'provider_created' || existing.status === 'completed') {
            return existing.providerEntityId === providerEntityId;
        }
        if (
            existing.status !== 'provider_creating'
            && !(
                existing.status === 'processing'
                && existing.stateVersion !== BILLING_CHECKOUT_STATE_VERSION
            )
        ) return false;
        transaction.set(ref, {
            providerEntityId,
            stateVersion: BILLING_CHECKOUT_STATE_VERSION,
            status: 'provider_created',
            expiresAt: Timestamp.fromMillis(nowMillis + BILLING_CHECKOUT_PROVIDER_RECOVERY_MS),
            updatedAt: Timestamp.fromMillis(nowMillis),
        }, { merge: true });
        return true;
    });
}

/**
 * Keeps a short replay checkpoint after local persistence. Deleting the lease
 * immediately leaves a narrow race where another already-running request can
 * acquire a fresh attempt after its earlier pending-state read. The completed
 * checkpoint makes that request reuse the exact provider entity while still
 * allowing a deliberate later purchase after the replay window expires.
 */
export async function completeBillingCheckoutLease(params: {
    attemptId: string;
    identity: BillingCheckoutLeaseIdentity;
}): Promise<boolean> {
    const context = getLeaseContext(params.identity);
    const ref = firestoreAdmin.collection(DB_COLLECTIONS.BILLING_CHECKOUT_LEASES).doc(context.leaseId);
    const nowMillis = Date.now();

    return firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) return false;
        const existing = snapshot.data() as BillingCheckoutLeaseRecord;
        if (
            !recordMatchesScope(existing, context)
            || existing.attemptId !== params.attemptId
            || existing.requestHash !== context.requestHash
            || existing.actorHash !== context.actorHash
            || !['provider_created', 'completed'].includes(String(existing.status))
            || typeof existing.providerEntityId !== 'string'
            || existing.providerEntityId.length === 0
        ) return false;
        transaction.set(ref, {
            status: 'completed',
            expiresAt: Timestamp.fromMillis(nowMillis + BILLING_CHECKOUT_COMPLETED_REPLAY_MS),
            updatedAt: Timestamp.fromMillis(nowMillis),
        }, { merge: true });
        return true;
    });
}

export async function releaseBillingCheckoutLease(params: {
    attemptId: string;
    identity: BillingCheckoutLeaseIdentity;
    providerEntityId?: string;
}): Promise<boolean> {
    const context = getLeaseContext(params.identity);
    const ref = firestoreAdmin.collection(DB_COLLECTIONS.BILLING_CHECKOUT_LEASES).doc(context.leaseId);

    return firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) return true;
        const existing = snapshot.data() as BillingCheckoutLeaseRecord;
        if (
            !recordMatchesScope(existing, context)
            || existing.attemptId !== params.attemptId
            || existing.requestHash !== context.requestHash
            || existing.actorHash !== context.actorHash
        ) return false;
        const canReleasePreProvider = existing.status === 'processing'
            && existing.stateVersion === BILLING_CHECKOUT_STATE_VERSION;
        const canReleaseCompensatedProvider = existing.status === 'provider_created'
            && typeof params.providerEntityId === 'string'
            && params.providerEntityId.length > 0
            && existing.providerEntityId === params.providerEntityId;
        if (!canReleasePreProvider && !canReleaseCompensatedProvider) return false;
        transaction.delete(ref);
        return true;
    });
}
