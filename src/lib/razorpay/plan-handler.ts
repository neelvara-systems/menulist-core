import { createHash, randomUUID } from 'crypto';
import { DB_COLLECTIONS } from '@constant/database';
import { Currency, PlanInterval, UserType } from "../../types/razorpay";
import { DEFAULT_PRODUCT_ID, type ProductId } from "@constant/product";
import { getBoundedRazorpayStringContext, getRazorpayFailureLogData } from "@lib/billing/razorpayDiagnostics";
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { logger } from "@lib/monitoring/logger";
import { secureError } from "@lib/security/secureLogger";
import { Timestamp } from 'firebase-admin/firestore';
import { razorpayClient } from "./razorpay";

interface PlanInfo {
    price: number; // in smallest currency unit
    currency: Currency;
    interval: PlanInterval;
    userType: UserType;
    planId: string; // e.g., 'menulist_pro', 'menulist_official'
    productId?: ProductId;
}

const RAZORPAY_PLAN_PAGE_SIZE = 100;
const RAZORPAY_PLAN_MAX_PAGES = 20;
const RAZORPAY_PLAN_REGISTRY_LEASE_MS = 2 * 60 * 1000;
const RAZORPAY_PLAN_REGISTRY_WAIT_ATTEMPTS = 20;
const RAZORPAY_PLAN_REGISTRY_WAIT_MS = 250;
const RAZORPAY_PLAN_REGISTRY_STATE_VERSION = 2;

type ProviderPlanRegistryRecord = {
    attemptId?: unknown;
    leaseExpiresAt?: unknown;
    lookupKey?: unknown;
    productId?: unknown;
    providerPlanId?: unknown;
    stateVersion?: unknown;
    status?: unknown;
};

type ProviderPlanRegistryClaim =
    | { outcome: 'acquired'; attemptId: string }
    | { outcome: 'recover_provider'; attemptId: string }
    | { outcome: 'ready'; providerPlanId: string }
    | { outcome: 'waiting' };

type RazorpayPlanLogContextInput = {
    currency?: unknown;
    interval?: unknown;
    legacyLookupKey?: unknown;
    lookupKey?: unknown;
    planId?: unknown;
    price?: number;
    productId?: unknown;
    providerPlanId?: unknown;
    userType?: unknown;
};

const getRazorpayPlanLogContext = ({
    currency,
    interval,
    legacyLookupKey,
    lookupKey,
    planId,
    price,
    productId,
    providerPlanId,
    userType,
}: RazorpayPlanLogContextInput) => ({
    ...getBoundedRazorpayStringContext('lookupKey', lookupKey),
    ...getBoundedRazorpayStringContext('legacyLookupKey', legacyLookupKey),
    ...getBoundedRazorpayStringContext('providerPlanId', providerPlanId),
    ...getBoundedRazorpayStringContext('productId', productId),
    ...getBoundedRazorpayStringContext('userType', userType),
    ...getBoundedRazorpayStringContext('planId', planId),
    ...getBoundedRazorpayStringContext('interval', interval),
    ...getBoundedRazorpayStringContext('currency', currency),
    price,
});

type ProviderPlanMatch = { id: string };

async function findProviderPlan(lookupKey: string, legacyLookupKey: string, productId: ProductId): Promise<ProviderPlanMatch | null> {
    let providerSearchComplete = false;
    for (let page = 0; page < RAZORPAY_PLAN_MAX_PAGES; page += 1) {
        const existingPlans = await razorpayClient.plans.all({
            count: RAZORPAY_PLAN_PAGE_SIZE,
            skip: page * RAZORPAY_PLAN_PAGE_SIZE,
        });
        const foundPlan = existingPlans.items.find((plan) => (
            plan.notes?.lookupKey === lookupKey
            || (productId === DEFAULT_PRODUCT_ID && plan.notes?.lookupKey === legacyLookupKey)
        ));
        if (foundPlan) return { id: foundPlan.id };
        if (existingPlans.items.length < RAZORPAY_PLAN_PAGE_SIZE) {
            providerSearchComplete = true;
            break;
        }
    }
    if (!providerSearchComplete) {
        throw new Error('Razorpay plan lookup exceeded the safe pagination boundary.');
    }
    return null;
}

function getProviderPlanRegistryRef(lookupKey: string) {
    const registryId = createHash('sha256').update(lookupKey).digest('hex');
    return firestoreAdmin.collection(DB_COLLECTIONS.BILLING_PROVIDER_PLANS).doc(registryId);
}

async function waitForProviderPlanRegistry(lookupKey: string, productId: ProductId): Promise<string | null> {
    const registryRef = getProviderPlanRegistryRef(lookupKey);
    for (let attempt = 0; attempt < RAZORPAY_PLAN_REGISTRY_WAIT_ATTEMPTS; attempt += 1) {
        const snapshot = await registryRef.get();
        const data = snapshot.data();
        if (
            data?.status === 'ready'
            && data.lookupKey === lookupKey
            && data.productId === productId
            && typeof data.providerPlanId === 'string'
            && data.providerPlanId.length > 0
        ) return data.providerPlanId;
        await new Promise((resolve) => setTimeout(resolve, RAZORPAY_PLAN_REGISTRY_WAIT_MS));
    }
    return null;
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

export async function claimProviderPlanRegistry(params: {
    attemptId: string;
    lookupKey: string;
    productId: ProductId;
}): Promise<ProviderPlanRegistryClaim> {
    const registryRef = getProviderPlanRegistryRef(params.lookupKey);
    const nowMillis = Date.now();
    return firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(registryRef);
        const current = snapshot.data() as ProviderPlanRegistryRecord | undefined;
        if (current) {
            if (current.lookupKey !== params.lookupKey || current.productId !== params.productId) {
                throw new Error('Razorpay plan registry scope changed.');
            }
            if (current.status === 'ready') {
                if (typeof current.providerPlanId !== 'string' || current.providerPlanId.length === 0) {
                    throw new Error('Razorpay plan registry ready state is malformed.');
                }
                return { outcome: 'ready' as const, providerPlanId: current.providerPlanId };
            }
            const currentAttemptId = typeof current.attemptId === 'string' ? current.attemptId : '';
            const leaseExpiresAtMillis = getTimestampMillis(current.leaseExpiresAt);
            if (current.status === 'processing') {
                if (!currentAttemptId || leaseExpiresAtMillis <= 0) {
                    throw new Error('Razorpay plan registry processing state is malformed.');
                }
                if (leaseExpiresAtMillis > nowMillis) return { outcome: 'waiting' as const };
                if (current.stateVersion !== RAZORPAY_PLAN_REGISTRY_STATE_VERSION) {
                    return { outcome: 'recover_provider' as const, attemptId: currentAttemptId };
                }
            } else if (current.status === 'provider_creating') {
                if (!currentAttemptId || leaseExpiresAtMillis <= 0) {
                    throw new Error('Razorpay plan registry provider state is malformed.');
                }
                if (leaseExpiresAtMillis > nowMillis) return { outcome: 'waiting' as const };
                return { outcome: 'recover_provider' as const, attemptId: currentAttemptId };
            } else {
                throw new Error('Razorpay plan registry state is invalid.');
            }
        }

        transaction.set(registryRef, {
            attemptId: params.attemptId,
            leaseExpiresAt: Timestamp.fromMillis(nowMillis + RAZORPAY_PLAN_REGISTRY_LEASE_MS),
            lookupKey: params.lookupKey,
            productId: params.productId,
            stateVersion: RAZORPAY_PLAN_REGISTRY_STATE_VERSION,
            status: 'processing',
            updatedAt: Timestamp.fromMillis(nowMillis),
        });
        return { outcome: 'acquired' as const, attemptId: params.attemptId };
    });
}

export async function markProviderPlanCreateStarted(params: {
    attemptId: string;
    lookupKey: string;
    productId: ProductId;
}): Promise<boolean> {
    const registryRef = getProviderPlanRegistryRef(params.lookupKey);
    const nowMillis = Date.now();
    return firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(registryRef);
        const current = snapshot.data() as ProviderPlanRegistryRecord | undefined;
        if (
            current?.status !== 'processing'
            || current.stateVersion !== RAZORPAY_PLAN_REGISTRY_STATE_VERSION
            || current.lookupKey !== params.lookupKey
            || current.productId !== params.productId
            || current.attemptId !== params.attemptId
            || getTimestampMillis(current.leaseExpiresAt) <= nowMillis
        ) return false;
        transaction.set(registryRef, {
            stateVersion: RAZORPAY_PLAN_REGISTRY_STATE_VERSION,
            status: 'provider_creating',
            updatedAt: Timestamp.fromMillis(nowMillis),
        }, { merge: true });
        return true;
    });
}

async function completeProviderPlanRegistry(params: {
    attemptId: string;
    lookupKey: string;
    productId: ProductId;
    providerPlanId: string;
}): Promise<string> {
    const registryRef = getProviderPlanRegistryRef(params.lookupKey);
    return firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(registryRef);
        const current = snapshot.data() as ProviderPlanRegistryRecord | undefined;
        const providerPlanId = String(params.providerPlanId || '').trim();
        if (!providerPlanId) throw new Error('Razorpay provider plan ID is invalid.');
        if (
            current?.status === 'ready'
            && current.lookupKey === params.lookupKey
            && current.productId === params.productId
            && typeof current.providerPlanId === 'string'
            && current.providerPlanId.length > 0
        ) return current.providerPlanId;
        if (
            !(
                current?.status === 'provider_creating'
                || current?.status === 'processing'
            )
            || current.lookupKey !== params.lookupKey
            || current.productId !== params.productId
            || current.attemptId !== params.attemptId
        ) throw new Error('Razorpay plan registry ownership changed.');
        if (
            current.status === 'processing'
            && current.stateVersion === RAZORPAY_PLAN_REGISTRY_STATE_VERSION
            && getTimestampMillis(current.leaseExpiresAt) <= 0
        ) throw new Error('Razorpay plan registry processing state is malformed.');

        transaction.set(registryRef, {
            attemptId: params.attemptId,
            lookupKey: params.lookupKey,
            productId: params.productId,
            providerPlanId,
            stateVersion: RAZORPAY_PLAN_REGISTRY_STATE_VERSION,
            status: 'ready',
            updatedAt: Timestamp.now(),
        });
        return providerPlanId;
    });
}

export const completeProviderPlanRegistryForTest = completeProviderPlanRegistry;

/**
 * Finds an existing Razorpay plan or creates a new one to avoid duplicates.
 * It uses a unique key stored in the plan's 'notes' for lookups.
 * @param planInfo - The details of the plan to find or create.
 * @returns The Razorpay Plan ID (e.g., 'plan_xxxxxxxxxxxxx').
 */
export async function getOrCreateRazorpayPlan(planInfo: PlanInfo): Promise<string> {
    const { price, currency, interval, userType, planId, productId = DEFAULT_PRODUCT_ID } = planInfo;

    // 1. Generate a unique, predictable key for this plan variation.
    const lookupKey = `${productId}_${userType}_${planId}_${interval}_${currency}_${price}`.toUpperCase();
    const legacyLookupKey = `${userType}_${planId}_${interval}_${currency}_${price}`.toUpperCase();
    const planLogContext = getRazorpayPlanLogContext({
        currency,
        interval,
        legacyLookupKey,
        lookupKey,
        planId,
        price,
        productId,
        userType,
    });
    try {
        const registryRef = getProviderPlanRegistryRef(lookupKey);
        const registrySnapshot = await registryRef.get();
        const registry = registrySnapshot.data();
        if (
            registry?.status === 'ready'
            && registry.lookupKey === lookupKey
            && registry.productId === productId
            && typeof registry.providerPlanId === 'string'
            && registry.providerPlanId.length > 0
        ) return registry.providerPlanId;

        const attemptId = randomUUID();
        const claim = await claimProviderPlanRegistry({
            attemptId,
            lookupKey,
            productId,
        });

        if (claim.outcome === 'ready') return claim.providerPlanId;
        if (claim.outcome === 'waiting') {
            const providerPlanId = await waitForProviderPlanRegistry(lookupKey, productId);
            if (providerPlanId) return providerPlanId;
            throw new Error('Razorpay plan creation is already in progress.');
        }

        // The lease owner performs a complete bounded provider search. This
        // recovers stale/ambiguous creates and prevents concurrent duplicates.
        const existingPlan = await findProviderPlan(lookupKey, legacyLookupKey, productId);
        if (existingPlan) {
            const providerPlanId = await completeProviderPlanRegistry({
                attemptId: claim.attemptId,
                lookupKey,
                productId,
                providerPlanId: existingPlan.id,
            });
            logger.info('Existing Razorpay plan found', {
                ...planLogContext,
                ...getBoundedRazorpayStringContext('providerPlanId', providerPlanId),
            });
            return providerPlanId;
        }

        if (claim.outcome === 'recover_provider') {
            throw new Error('Razorpay plan provider result is still resolving.');
        }

        if (!(await markProviderPlanCreateStarted({
            attemptId: claim.attemptId,
            lookupKey,
            productId,
        }))) throw new Error('Razorpay plan registry ownership changed before provider creation.');

        logger.info('Creating new Razorpay plan', planLogContext);

        const planPayload = {
            period: (interval === "MONTH" ? "monthly" : "yearly") as "monthly" | "yearly",
            interval: 1,
            item: {
                name: `${userType} ${planId} - ${interval === "MONTH" ? "Monthly" : "Yearly"} (${currency})`,
                description: `Subscription for ${productId} ${userType} ${planId} tier on a ${interval.toLowerCase()} basis in ${currency}.`,
                amount: price,
                currency: currency,
            },
            notes: {
                productId,
                lookupKey: lookupKey, // Store our unique key for future searches
            },
        };

        let newPlan: ProviderPlanMatch;
        try {
            newPlan = await razorpayClient.plans.create(planPayload);
        } catch (createError) {
            const recoveredPlan = await findProviderPlan(lookupKey, legacyLookupKey, productId);
            if (!recoveredPlan) throw createError;
            newPlan = recoveredPlan;
        }
        const providerPlanId = await completeProviderPlanRegistry({
            attemptId: claim.attemptId,
            lookupKey,
            productId,
            providerPlanId: newPlan.id,
        });
        logger.info('Razorpay plan created successfully', {
            ...planLogContext,
            ...getBoundedRazorpayStringContext('providerPlanId', providerPlanId),
        });

        return providerPlanId;
    } catch (error) {
        secureError(
            '[Razorpay] Plan lookup or create failed',
            new Error('razorpay_plan_lookup_or_create_failed'),
            getRazorpayFailureLogData(
                'razorpay_plan_lookup_or_create_failed',
                error,
                planLogContext,
            ),
        );
        throw new Error('Could not process Razorpay plan.');
    }
}
