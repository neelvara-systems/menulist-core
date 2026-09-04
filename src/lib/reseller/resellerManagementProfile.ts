import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { LOGIN_USERNAME_PATTERN } from "@lib/auth/loginIdentifiers";
import { validateEmail } from "@lib/validation/emailDomainValidator";
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

export type ResellerManagementDraftValidationOptions = {
    isEditing: boolean;
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

export const getResellerManagementDraftValidationError = (
    draft: ResellerManagementEditableDraft,
    options: ResellerManagementDraftValidationOptions,
): string | null => {
    const name = normalizedDraftText(draft.name);
    const phone = normalizedDraftText(draft.phone);
    const email = normalizedDraftText(draft.email).toLowerCase();
    const username = normalizedDraftText(draft.username).toLowerCase();
    const password = normalizedDraftText(draft.password);
    const maxOfflineActivations = Number(draft.maxOfflineActivations);

    if (!name || !phone || !email || !username) {
        return "Name, phone, email, and username are required.";
    }
    if (name.length < 2 || name.length > 100) {
        return "Name must be between 2 and 100 characters.";
    }
    if (phone.length < 10 || phone.length > 15) {
        return "Phone must be between 10 and 15 characters.";
    }
    if (!validateEmail(email).valid) {
        return "Enter a valid reseller email.";
    }
    if (!LOGIN_USERNAME_PATTERN.test(username)) {
        return "Username must use 3 to 50 lowercase letters, numbers, dots, underscores, or hyphens.";
    }
    if (
        (!options.isEditing && password.length < 6)
        || (options.isEditing && password.length > 0 && password.length < 6)
        || password.length > 100
    ) {
        return options.isEditing
            ? "New password must be between 6 and 100 characters."
            : "Password must be between 6 and 100 characters.";
    }
    if (!Number.isSafeInteger(maxOfflineActivations) || maxOfflineActivations < 1 || maxOfflineActivations > 100) {
        return "Maximum offline activations must be between 1 and 100.";
    }
    if (normalizedDraftText(draft.addressLine).length > 200) return "Address must be 200 characters or fewer.";
    if (normalizedDraftText(draft.city).length > 100) return "City must be 100 characters or fewer.";
    if (normalizedDraftText(draft.state).length > 100) return "State must be 100 characters or fewer.";
    if (normalizedDraftText(draft.postalCode).length > 10) return "Postal code must be 10 characters or fewer.";
    if (normalizedDraftText(draft.country).length > 50) return "Country must be 50 characters or fewer.";
    if (normalizedDraftText(draft.notes).length > 500) return "Internal notes must be 500 characters or fewer.";

    return null;
};

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
