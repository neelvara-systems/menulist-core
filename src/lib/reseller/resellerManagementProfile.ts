import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { isNonNegativeSafeInteger, isPositiveSafeInteger } from "./resellerMutationState";

export type ResellerManagementProfile = {
    active: boolean;
    addressLine?: string;
    city?: string;
    country?: string;
    currentActiveOfflineStores: number;
    email: string;
    id: string;
    maxOfflineActivations: number;
    name: string;
    notes?: string;
    phone: string;
    postalCode?: string;
    state?: string;
    totalOfflineStores: number;
    totalOnlineStores: number;
    totalRevenueCollectedPaise: number;
    totalStoresOnboarded: number;
    totalTransactions: number;
    username: string;
};

export type ResellerManagementProfilesResponse = {
    invalidProfileCount: number;
    isCapped: boolean;
    isPartial: boolean;
    profiles: ResellerManagementProfile[];
};

export type ResellerManagementEditableDraft = {
    active?: boolean;
    addressLine?: string;
    city?: string;
    country?: string;
    email?: string;
    maxOfflineActivations?: number | string;
    name?: string;
    notes?: string;
    password?: string;
    phone?: string;
    postalCode?: string;
    state?: string;
    username?: string;
};

const PROFILE_KEYS = new Set([
    "active", "addressLine", "city", "country", "currentActiveOfflineStores",
    "email", "id", "maxOfflineActivations", "name", "notes", "phone",
    "postalCode", "state", "totalOfflineStores", "totalOnlineStores",
    "totalRevenueCollectedPaise", "totalStoresOnboarded", "totalTransactions",
    "username",
]);
const RESPONSE_KEYS = new Set(["invalidProfileCount", "isCapped", "isPartial", "profiles"]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);
const boundedString = (value: unknown, max: number): value is string => (
    typeof value === "string" && value.length > 0 && value.length <= max
);
const optionalString = (value: unknown, max: number): value is string | undefined => (
    value === undefined || (typeof value === "string" && value.length <= max)
);

const normalizedDraftText = (value: unknown): string => (
    typeof value === "string" ? value.trim() : ""
);

export const isResellerManagementDraftChanged = (
    draft: ResellerManagementEditableDraft,
    profile: ResellerManagementProfile,
): boolean => {
    if (normalizedDraftText(draft.password)) return true;

    return (draft.active ?? true) !== profile.active
        || normalizedDraftText(draft.addressLine) !== normalizedDraftText(profile.addressLine)
        || normalizedDraftText(draft.city) !== normalizedDraftText(profile.city)
        || normalizedDraftText(draft.country) !== normalizedDraftText(profile.country)
        || normalizedDraftText(draft.email).toLowerCase() !== normalizedDraftText(profile.email).toLowerCase()
        || Number(draft.maxOfflineActivations) !== profile.maxOfflineActivations
        || normalizedDraftText(draft.name) !== normalizedDraftText(profile.name)
        || normalizedDraftText(draft.notes) !== normalizedDraftText(profile.notes)
        || normalizedDraftText(draft.phone) !== normalizedDraftText(profile.phone)
        || normalizedDraftText(draft.postalCode) !== normalizedDraftText(profile.postalCode)
        || normalizedDraftText(draft.state) !== normalizedDraftText(profile.state)
        || normalizedDraftText(draft.username).toLowerCase() !== normalizedDraftText(profile.username).toLowerCase();
};

export const projectResellerManagementProfile = (
    value: unknown,
): ResellerManagementProfile | null => {
    if (!isRecord(value)) return null;
    if (
        !isValidFirestoreDocumentId(value.id)
        || value.id !== value.id.trim()
        || !boundedString(value.name, 100)
        || !boundedString(value.phone, 40)
        || !boundedString(value.email, 320)
        || !boundedString(value.username, 50)
        || typeof value.active !== "boolean"
        || !isPositiveSafeInteger(value.maxOfflineActivations)
        || !isNonNegativeSafeInteger(value.currentActiveOfflineStores)
        || !isNonNegativeSafeInteger(value.totalStoresOnboarded)
        || !isNonNegativeSafeInteger(value.totalOnlineStores)
        || !isNonNegativeSafeInteger(value.totalOfflineStores)
        || !isNonNegativeSafeInteger(value.totalRevenueCollectedPaise)
        || !isNonNegativeSafeInteger(value.totalTransactions)
        || !optionalString(value.addressLine, 200)
        || !optionalString(value.city, 100)
        || !optionalString(value.state, 100)
        || !optionalString(value.postalCode, 20)
        || !optionalString(value.country, 100)
        || !optionalString(value.notes, 500)
    ) {
        return null;
    }
    return {
        active: value.active,
        ...(value.addressLine !== undefined ? { addressLine: value.addressLine } : {}),
        ...(value.city !== undefined ? { city: value.city } : {}),
        ...(value.country !== undefined ? { country: value.country } : {}),
        currentActiveOfflineStores: value.currentActiveOfflineStores,
        email: value.email,
        id: value.id,
        maxOfflineActivations: value.maxOfflineActivations,
        name: value.name,
        ...(value.notes !== undefined ? { notes: value.notes } : {}),
        phone: value.phone,
        ...(value.postalCode !== undefined ? { postalCode: value.postalCode } : {}),
        ...(value.state !== undefined ? { state: value.state } : {}),
        totalOfflineStores: value.totalOfflineStores,
        totalOnlineStores: value.totalOnlineStores,
        totalRevenueCollectedPaise: value.totalRevenueCollectedPaise,
        totalStoresOnboarded: value.totalStoresOnboarded,
        totalTransactions: value.totalTransactions,
        username: value.username,
    };
};

export const isResellerManagementProfile = (
    value: unknown,
): value is ResellerManagementProfile => (
    isRecord(value)
    && Object.keys(value).every((key) => PROFILE_KEYS.has(key))
    && projectResellerManagementProfile(value) !== null
);

export const isResellerManagementProfilesResponse = (
    value: unknown,
): value is ResellerManagementProfilesResponse => (
    isRecord(value)
    && Object.keys(value).every((key) => RESPONSE_KEYS.has(key))
    && Object.keys(value).length === RESPONSE_KEYS.size
    && Array.isArray(value.profiles)
    && value.profiles.length <= 50
    && value.profiles.every(isResellerManagementProfile)
    && isNonNegativeSafeInteger(value.invalidProfileCount)
    && typeof value.isCapped === "boolean"
    && typeof value.isPartial === "boolean"
    && value.isPartial === (value.isCapped || value.invalidProfileCount > 0)
);
