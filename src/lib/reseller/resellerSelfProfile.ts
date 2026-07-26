import type { ResellerProfile } from "@type/reseller";

export type ResellerSelfProfile = Pick<
    ResellerProfile,
    | "active"
    | "addressLine"
    | "city"
    | "country"
    | "currentActiveOfflineStores"
    | "email"
    | "id"
    | "maxOfflineActivations"
    | "name"
    | "phone"
    | "postalCode"
    | "state"
    | "totalOfflineStores"
    | "totalOnlineStores"
    | "totalRevenueCollectedPaise"
    | "totalStoresOnboarded"
    | "totalTransactions"
    | "username"
> & {
    activatedAt: string | null;
    createdOn: string | null;
    modifiedOn: string | null;
};

const optionalString = (value: unknown, maxLength: number): string | undefined => {
    if (typeof value !== "string") return undefined;
    const normalized = value.trim();
    return normalized ? normalized.slice(0, maxLength) : undefined;
};

const nonNegativeInteger = (value: unknown): number => {
    const numeric = typeof value === "number" ? value : Number.NaN;
    return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : 0;
};

const timestampToIso = (value: unknown): string | null => {
    try {
        let date: Date | null = null;
        if (value instanceof Date) {
            date = value;
        } else if (value && typeof value === "object" && "toDate" in value) {
            const toDate = (value as { toDate?: unknown }).toDate;
            if (typeof toDate === "function") {
                const converted = toDate.call(value);
                date = converted instanceof Date ? converted : null;
            }
        } else if (value && typeof value === "object" && "toMillis" in value) {
            const toMillis = (value as { toMillis?: unknown }).toMillis;
            if (typeof toMillis === "function") {
                const millis = toMillis.call(value);
                date = typeof millis === "number" && Number.isFinite(millis)
                    ? new Date(millis)
                    : null;
            }
        } else if (typeof value === "string" || typeof value === "number") {
            date = new Date(value);
        }
        return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
    } catch {
        return null;
    }
};

const SELF_PROFILE_KEYS = new Set([
    "active",
    "activatedAt",
    "addressLine",
    "city",
    "country",
    "createdOn",
    "currentActiveOfflineStores",
    "email",
    "id",
    "maxOfflineActivations",
    "modifiedOn",
    "name",
    "phone",
    "postalCode",
    "state",
    "totalOfflineStores",
    "totalOnlineStores",
    "totalRevenueCollectedPaise",
    "totalStoresOnboarded",
    "totalTransactions",
    "username",
]);

const isNonNegativeInteger = (value: unknown): value is number => (
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0
);

export const isResellerSelfProfile = (value: unknown): value is ResellerSelfProfile => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const profile = value as Record<string, unknown>;
    if (!Object.keys(profile).every((key) => SELF_PROFILE_KEYS.has(key))) return false;
    if (profile.active !== true) return false;
    if (
        typeof profile.id !== "string"
        || typeof profile.email !== "string"
        || typeof profile.name !== "string"
        || typeof profile.phone !== "string"
        || typeof profile.username !== "string"
    ) {
        return false;
    }
    for (const key of ["addressLine", "city", "country", "postalCode", "state"]) {
        if (profile[key] !== undefined && typeof profile[key] !== "string") return false;
    }
    for (const key of ["activatedAt", "createdOn", "modifiedOn"]) {
        if (profile[key] !== null && typeof profile[key] !== "string") return false;
    }
    return [
        "currentActiveOfflineStores",
        "maxOfflineActivations",
        "totalOfflineStores",
        "totalOnlineStores",
        "totalRevenueCollectedPaise",
        "totalStoresOnboarded",
        "totalTransactions",
    ].every((key) => isNonNegativeInteger(profile[key]));
};

export const projectResellerSelfProfile = (
    profileId: string,
    value: unknown,
): ResellerSelfProfile => {
    const data = value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
    const addressLine = optionalString(data.addressLine, 200);
    const city = optionalString(data.city, 100);
    const country = optionalString(data.country, 50);
    const postalCode = optionalString(data.postalCode, 20);
    const state = optionalString(data.state, 100);

    return {
        active: data.active === true,
        activatedAt: timestampToIso(data.activatedAt),
        ...(addressLine ? { addressLine } : {}),
        ...(city ? { city } : {}),
        ...(country ? { country } : {}),
        createdOn: timestampToIso(data.createdOn),
        currentActiveOfflineStores: nonNegativeInteger(data.currentActiveOfflineStores),
        email: optionalString(data.email, 320) || "",
        id: profileId,
        maxOfflineActivations: nonNegativeInteger(data.maxOfflineActivations),
        modifiedOn: timestampToIso(data.modifiedOn),
        name: optionalString(data.name, 100) || "",
        phone: optionalString(data.phone, 32) || "",
        ...(postalCode ? { postalCode } : {}),
        ...(state ? { state } : {}),
        totalOfflineStores: nonNegativeInteger(data.totalOfflineStores),
        totalOnlineStores: nonNegativeInteger(data.totalOnlineStores),
        totalRevenueCollectedPaise: nonNegativeInteger(data.totalRevenueCollectedPaise),
        totalStoresOnboarded: nonNegativeInteger(data.totalStoresOnboarded),
        totalTransactions: nonNegativeInteger(data.totalTransactions),
        username: optionalString(data.username, 50) || "",
    };
};
