export const IMAGE_SUBJECT_PROFILE_LIMIT = 8;
export const IMAGE_SUBJECT_REFERENCE_MIN = 2;
export const IMAGE_SUBJECT_REFERENCE_MAX = 4;
export const IMAGE_SUBJECT_CONSENT_VERSION = '2026-08-31';
export const IMAGE_SUBJECT_PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

export type ImageSubjectProfileStatus = 'active' | 'withdrawn' | 'deleting';

export interface ImageSubjectProfileReference {
    checksum: string;
    height: number;
    id: string;
    mimeType: string;
    previewUrl: string;
    sizeBytes: number;
    width: number;
}

export interface ImageSubjectProfileSummary {
    createdAt: string;
    id: string;
    label: string;
    references: ImageSubjectProfileReference[];
    status: ImageSubjectProfileStatus;
    updatedAt: string;
    version: number;
}

export interface ImageSubjectProfileCacheState {
    includeWithdrawn: boolean;
    loadedAt: number | null;
    profiles: ImageSubjectProfileSummary[];
    scopeKey: string | null;
}

export function createEmptyImageSubjectProfileCache(): ImageSubjectProfileCacheState {
    return {
        includeWithdrawn: false,
        loadedAt: null,
        profiles: [],
        scopeKey: null,
    };
}

export function getImageSubjectProfileCacheScopeKey(
    tenantId: unknown,
    storeId: unknown,
    includeWithdrawn: boolean,
): string | null {
    const normalizedTenantId = Number(tenantId);
    const normalizedStoreId = Number(storeId);
    if (
        !Number.isSafeInteger(normalizedTenantId)
        || normalizedTenantId <= 0
        || !Number.isSafeInteger(normalizedStoreId)
        || normalizedStoreId <= 0
    ) {
        return null;
    }
    return JSON.stringify([
        normalizedTenantId,
        normalizedStoreId,
        includeWithdrawn ? 'manager' : 'active',
    ]);
}

export interface ImageSubjectProfileConsentInput {
    adultConfirmed: boolean;
    commercialUsePermissionConfirmed: boolean;
    publicFigureConfirmedFalse: boolean;
    rightsConfirmed: boolean;
}

export interface ImageSubjectProfileCreateInput {
    consent: ImageSubjectProfileConsentInput;
    label: string;
    references: Array<{
        dataUrl: string;
        name?: string;
    }>;
}

export interface ImageSubjectProfileUpdateInput extends ImageSubjectProfileCreateInput {
    expectedVersion: number;
    profileId: string;
}
