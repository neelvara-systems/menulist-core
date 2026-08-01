import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { isNonNegativeSafeInteger, isPositiveSafeInteger } from './resellerMutationState';
import type { ResellerProfileRecord } from '@type/reseller';

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isBoundedString = (
    value: unknown,
    maximum: number,
    allowEmpty = false,
): value is string => (
    typeof value === 'string'
    && value.length <= maximum
    && (allowEmpty || value.trim().length > 0)
);

const isTimestampValue = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    try {
        return typeof value.toDate === 'function'
            && typeof value.toMillis === 'function'
            && value.toDate() instanceof Date
            && Number.isFinite(value.toMillis());
    } catch {
        return false;
    }
};

const OPTIONAL_STRINGS = {
    addressLine: 200,
    authUserId: 180,
    city: 100,
    country: 100,
    createdBy: 180,
    name: 100,
    notes: 500,
    phone: 40,
    postalCode: 20,
    state: 100,
    username: 50,
} as const;

const OPTIONAL_COUNTERS = [
    'currentActiveOfflineStores',
    'totalOfflineStores',
    'totalOnlineStores',
    'totalRevenueCollectedPaise',
    'totalStoresOnboarded',
    'totalTransactions',
] as const;

const OPTIONAL_TIMESTAMPS = [
    'activatedAt',
    'createdOn',
    'deactivatedAt',
    'modifiedOn',
    'passwordSetAt',
] as const;

export const projectResellerProfileRecord = (
    documentId: unknown,
    value: unknown,
): ResellerProfileRecord | null => {
    if (
        typeof documentId !== 'string'
        || documentId !== documentId.trim()
        || !isValidFirestoreDocumentId(documentId)
        || !isRecord(value)
        || typeof value.active !== 'boolean'
        || !isBoundedString(value.email, 320)
        || (value.deleted !== undefined && typeof value.deleted !== 'boolean')
        || value.deleted === true
    ) {
        return null;
    }

    for (const [field, maximum] of Object.entries(OPTIONAL_STRINGS)) {
        const fieldValue = value[field];
        if (fieldValue !== undefined && !isBoundedString(fieldValue, maximum, true)) return null;
    }
    if (
        value.authUserId !== undefined
        && (
            !isValidFirestoreDocumentId(value.authUserId)
            || value.authUserId !== value.authUserId.trim()
        )
    ) return null;

    for (const field of OPTIONAL_COUNTERS) {
        if (value[field] !== undefined && !isNonNegativeSafeInteger(value[field])) return null;
    }
    if (value.maxOfflineActivations !== undefined && !isPositiveSafeInteger(value.maxOfflineActivations)) {
        return null;
    }
    for (const field of OPTIONAL_TIMESTAMPS) {
        const fieldValue = value[field];
        if (fieldValue !== undefined && fieldValue !== null && !isTimestampValue(fieldValue)) return null;
    }

    const profile: ResellerProfileRecord = {
        active: value.active,
        email: value.email,
        id: documentId,
    };
    if (typeof value.deleted === 'boolean') profile.deleted = value.deleted;
    if (typeof value.addressLine === 'string') profile.addressLine = value.addressLine;
    if (typeof value.authUserId === 'string') profile.authUserId = value.authUserId;
    if (typeof value.city === 'string') profile.city = value.city;
    if (typeof value.country === 'string') profile.country = value.country;
    if (typeof value.createdBy === 'string') profile.createdBy = value.createdBy;
    if (typeof value.name === 'string') profile.name = value.name;
    if (typeof value.notes === 'string') profile.notes = value.notes;
    if (typeof value.phone === 'string') profile.phone = value.phone;
    if (typeof value.postalCode === 'string') profile.postalCode = value.postalCode;
    if (typeof value.state === 'string') profile.state = value.state;
    if (typeof value.username === 'string') profile.username = value.username;
    for (const field of OPTIONAL_COUNTERS) {
        const fieldValue = value[field];
        if (typeof fieldValue === 'number') profile[field] = fieldValue;
    }
    if (typeof value.maxOfflineActivations === 'number') {
        profile.maxOfflineActivations = value.maxOfflineActivations;
    }
    for (const field of OPTIONAL_TIMESTAMPS) {
        if (value[field] !== undefined) profile[field] = value[field];
    }
    return profile;
};
