type AddLocationReplayExpectation = {
    locationCount: number;
    operationId: string;
    resellerId: string;
    storeId: number;
    subscriptionId: string;
    tenantId: number;
};

type AddLocationReplayResult = {
    amountExpected: number;
    daysRemaining: number;
    locationCount: number;
    quantity: number;
    validUntil: Date;
};

type RenewReplayExpectation = {
    durationMonths: number;
    operationId: string;
    pricingTier: string;
    resellerId: string;
    storeId: number;
    subscriptionId: string;
    tenantId: number;
};

type RenewReplayResult = {
    amountExpected: number;
    locationCount: number;
    validFrom: Date;
    validUntil: Date;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

export const isNonNegativeSafeInteger = (value: unknown): value is number => (
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0
);

export const isPositiveSafeInteger = (value: unknown): value is number => (
    typeof value === "number" && Number.isSafeInteger(value) && value > 0
);

export const addNonNegativeSafeIntegers = (
    left: unknown,
    right: unknown,
): number | null => {
    if (!isNonNegativeSafeInteger(left) || !isNonNegativeSafeInteger(right)) return null;
    const sum = left + right;
    return isNonNegativeSafeInteger(sum) ? sum : null;
};

export type ResellerOfflineCapacity = {
    cap: number;
    current: number;
};

export const projectResellerOfflineCapacity = (
    value: unknown,
    defaultCap: unknown,
): ResellerOfflineCapacity | null => {
    if (!isRecord(value) || !isPositiveSafeInteger(defaultCap)) return null;
    const current = value.currentActiveOfflineStores === undefined
        ? 0
        : value.currentActiveOfflineStores;
    const cap = value.maxOfflineActivations === undefined
        ? defaultCap
        : value.maxOfflineActivations;
    return isNonNegativeSafeInteger(current) && isPositiveSafeInteger(cap)
        ? { cap, current }
        : null;
};

export type ResellerMutationProfileCounterResult = {
    status: "ok";
    updates: {
        currentActiveOfflineStores?: number;
        totalRevenueCollectedPaise: number;
        totalTransactions: number;
    };
} | {
    cap: number;
    status: "cap-exceeded";
} | {
    status: "invalid";
};

export const projectResellerMutationProfileCounters = (
    value: unknown,
    amountPaise: unknown,
    options: {
        addOfflineSlot: boolean;
        defaultOfflineCap: number;
    },
): ResellerMutationProfileCounterResult => {
    if (!isRecord(value) || !isNonNegativeSafeInteger(amountPaise)) {
        return { status: "invalid" };
    }
    const readCounter = (field: string): number | null => (
        value[field] === undefined
            ? 0
            : (isNonNegativeSafeInteger(value[field]) ? value[field] : null)
    );
    const totalTransactions = readCounter("totalTransactions");
    const totalRevenueCollectedPaise = readCounter("totalRevenueCollectedPaise");
    const currentActiveOfflineStores = readCounter("currentActiveOfflineStores");
    if (
        totalTransactions === null
        || totalRevenueCollectedPaise === null
        || currentActiveOfflineStores === null
    ) {
        return { status: "invalid" };
    }
    const nextTransactions = addNonNegativeSafeIntegers(totalTransactions, 1);
    const nextRevenue = addNonNegativeSafeIntegers(totalRevenueCollectedPaise, amountPaise);
    const nextOfflineSlots = options.addOfflineSlot
        ? addNonNegativeSafeIntegers(currentActiveOfflineStores, 1)
        : currentActiveOfflineStores;
    if (nextTransactions === null || nextRevenue === null || nextOfflineSlots === null) {
        return { status: "invalid" };
    }
    if (options.addOfflineSlot) {
        const cap = value.maxOfflineActivations === undefined
            ? options.defaultOfflineCap
            : value.maxOfflineActivations;
        if (!isPositiveSafeInteger(cap)) return { status: "invalid" };
        if (currentActiveOfflineStores >= cap) return { cap, status: "cap-exceeded" };
    }
    return {
        status: "ok",
        updates: {
            ...(options.addOfflineSlot ? { currentActiveOfflineStores: nextOfflineSlots } : {}),
            totalRevenueCollectedPaise: nextRevenue,
            totalTransactions: nextTransactions,
        },
    };
};

export const resellerMutationDate = (value: unknown): Date | null => {
    try {
        let date: Date | null = null;
        if (value instanceof Date) {
            date = value;
        } else if (isRecord(value) && typeof value.toDate === "function") {
            const converted = value.toDate();
            date = converted instanceof Date ? converted : null;
        } else if (isRecord(value) && typeof value.toMillis === "function") {
            const millis = value.toMillis();
            date = typeof millis === "number" && Number.isFinite(millis) ? new Date(millis) : null;
        } else if (typeof value === "string" || typeof value === "number") {
            date = new Date(value);
        }
        return date && Number.isFinite(date.getTime()) ? date : null;
    } catch {
        return null;
    }
};

export const projectAddLocationReplay = (
    value: unknown,
    expected: AddLocationReplayExpectation,
): AddLocationReplayResult | null => {
    if (!isRecord(value)) return null;
    if (
        value.operationId !== expected.operationId
        || value.action !== "ADD_LOCATION"
        || value.resellerId !== expected.resellerId
        || value.storeId !== expected.storeId
        || value.tenantId !== expected.tenantId
        || value.locationCount !== expected.locationCount
        || value.subscriptionId !== expected.subscriptionId
        || !isNonNegativeSafeInteger(value.amountExpected)
        || !isPositiveSafeInteger(value.daysRemaining)
        || !isPositiveSafeInteger(value.subscriptionQuantity)
    ) {
        return null;
    }
    const validUntil = resellerMutationDate(value.validUntil);
    if (!validUntil) return null;
    return {
        amountExpected: value.amountExpected,
        daysRemaining: value.daysRemaining,
        locationCount: value.locationCount,
        quantity: value.subscriptionQuantity,
        validUntil,
    };
};

export const projectRenewReplay = (
    value: unknown,
    expected: RenewReplayExpectation,
): RenewReplayResult | null => {
    if (!isRecord(value)) return null;
    if (
        value.operationId !== expected.operationId
        || value.action !== "RENEW"
        || value.resellerId !== expected.resellerId
        || value.storeId !== expected.storeId
        || value.tenantId !== expected.tenantId
        || value.pricingTier !== expected.pricingTier
        || value.commitmentMonths !== expected.durationMonths
        || value.subscriptionId !== expected.subscriptionId
        || !isNonNegativeSafeInteger(value.amountExpected)
        || !isPositiveSafeInteger(value.locationCount)
    ) {
        return null;
    }
    const validFrom = resellerMutationDate(value.validFrom);
    const validUntil = resellerMutationDate(value.validUntil);
    if (!validFrom || !validUntil || validUntil <= validFrom) return null;
    return {
        amountExpected: value.amountExpected,
        locationCount: value.locationCount,
        validFrom,
        validUntil,
    };
};

export const resolveResellerMutationProfileId = (
    persistedProfileId: unknown,
    admittedProfileId: unknown,
    isPlatformUser: boolean,
): string | null => {
    const persisted = isValidFirestoreDocumentId(persistedProfileId)
        ? persistedProfileId
        : null;
    if (isPlatformUser) return persisted;
    if (!isValidFirestoreDocumentId(admittedProfileId)) return null;
    if (persistedProfileId !== undefined && persistedProfileId !== null && persisted !== admittedProfileId) {
        return null;
    }
    return admittedProfileId;
};
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
