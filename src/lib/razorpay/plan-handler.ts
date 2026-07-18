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
    planId: string; // e.g., 'pro', 'starter'
    productId?: ProductId;
}

const RAZORPAY_PLAN_PAGE_SIZE = 100;
const RAZORPAY_PLAN_MAX_PAGES = 20;
const RAZORPAY_PLAN_REGISTRY_LEASE_MS = 2 * 60 * 1000;
const RAZORPAY_PLAN_REGISTRY_WAIT_ATTEMPTS = 20;
const RAZORPAY_PLAN_REGISTRY_WAIT_MS = 250;

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

async function waitForProviderPlanRegistry(lookupKey: string): Promise<string | null> {
    const registryRef = getProviderPlanRegistryRef(lookupKey);
    for (let attempt = 0; attempt < RAZORPAY_PLAN_REGISTRY_WAIT_ATTEMPTS; attempt += 1) {
        const snapshot = await registryRef.get();
        const data = snapshot.data();
        if (
            data?.status === 'ready'
            && data.lookupKey === lookupKey
            && typeof data.providerPlanId === 'string'
            && data.providerPlanId.length > 0
        ) return data.providerPlanId;
        await new Promise((resolve) => setTimeout(resolve, RAZORPAY_PLAN_REGISTRY_WAIT_MS));
    }
    return null;
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
        const current = snapshot.data();
        if (
            current?.status === 'ready'
            && current.lookupKey === params.lookupKey
            && typeof current.providerPlanId === 'string'
            && current.providerPlanId.length > 0
        ) return current.providerPlanId;
        if (
            current?.status !== 'processing'
            || current.lookupKey !== params.lookupKey
            || current.attemptId !== params.attemptId
        ) throw new Error('Razorpay plan registry ownership changed.');

        transaction.set(registryRef, {
            attemptId: params.attemptId,
            lookupKey: params.lookupKey,
            productId: params.productId,
            providerPlanId: params.providerPlanId,
            status: 'ready',
            updatedAt: Timestamp.now(),
        });
        return params.providerPlanId;
    });
}

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
            && typeof registry.providerPlanId === 'string'
            && registry.providerPlanId.length > 0
        ) return registry.providerPlanId;

        const attemptId = randomUUID();
        const nowMillis = Date.now();
        const claim = await firestoreAdmin.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(registryRef);
            const current = snapshot.data();
            if (
                current?.status === 'ready'
                && current.lookupKey === lookupKey
                && typeof current.providerPlanId === 'string'
                && current.providerPlanId.length > 0
            ) return { outcome: 'ready' as const, providerPlanId: current.providerPlanId };

            const leaseExpiresAt = current?.leaseExpiresAt?.toMillis?.() || 0;
            if (current?.status === 'processing' && leaseExpiresAt > nowMillis) {
                return { outcome: 'waiting' as const };
            }

            transaction.set(registryRef, {
                attemptId,
                leaseExpiresAt: Timestamp.fromMillis(nowMillis + RAZORPAY_PLAN_REGISTRY_LEASE_MS),
                lookupKey,
                productId,
                status: 'processing',
                updatedAt: Timestamp.fromMillis(nowMillis),
            });
            return { outcome: 'acquired' as const };
        });

        if (claim.outcome === 'ready') return claim.providerPlanId;
        if (claim.outcome === 'waiting') {
            const providerPlanId = await waitForProviderPlanRegistry(lookupKey);
            if (providerPlanId) return providerPlanId;
            throw new Error('Razorpay plan creation is already in progress.');
        }

        // The lease owner performs a complete bounded provider search. This
        // recovers stale/ambiguous creates and prevents concurrent duplicates.
        const existingPlan = await findProviderPlan(lookupKey, legacyLookupKey, productId);
        if (existingPlan) {
            const providerPlanId = await completeProviderPlanRegistry({
                attemptId,
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
            attemptId,
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
