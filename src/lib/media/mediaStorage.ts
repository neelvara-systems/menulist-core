import { getMediaImageProfile, type MediaImageType, type MediaImageVariantId } from './imageProfiles';

export interface MediaStoragePathInput {
    entityId: string;
    extension?: string;
    mediaId: string;
    profile: MediaImageType;
    storeId: string;
    tenantId: string;
    variant: MediaImageVariantId;
}

const MAX_MEDIA_STORAGE_PATH_SEGMENT_LENGTH = 160;
const MEDIA_STORAGE_PATH_SEGMENT_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MEDIA_STORAGE_EXTENSION_PATTERN = /^(?:jpe?g|png|webp)$/;

export function normalizeMediaStoragePathSegment(value: unknown, label: string): string {
    const rawSegment = typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : '';
    const segment = rawSegment.trim();

    if (
        !segment
        || segment !== rawSegment
        || segment.length > MAX_MEDIA_STORAGE_PATH_SEGMENT_LENGTH
        || !MEDIA_STORAGE_PATH_SEGMENT_PATTERN.test(segment)
    ) {
        throw new Error(`INVALID_MEDIA_STORAGE_${label.toUpperCase()}`);
    }

    return segment;
}

export function isValidMediaStoragePathSegment(value: unknown): boolean {
    try {
        normalizeMediaStoragePathSegment(value, 'segment');
        return true;
    } catch {
        return false;
    }
}

export function getMediaDataFingerprint(value: string): string {
    let hash = 0x811c9dc5;
    const sampleLimit = Math.min(value.length, 8000);

    for (let index = 0; index < sampleLimit; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }

    hash ^= value.length;
    hash = Math.imul(hash, 0x01000193);

    return (hash >>> 0).toString(16).padStart(8, '0');
}

export function isDataUrl(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    const separatorIndex = value.indexOf(',');
    if (separatorIndex < 0 || separatorIndex > 128) return false;
    if (!/^data:[^;,]+;base64$/i.test(value.slice(0, separatorIndex))) return false;

    const payload = value.slice(separatorIndex + 1);
    return Boolean(payload)
        && payload.length % 4 === 0
        && /^[A-Za-z0-9+/]+={0,2}$/.test(payload);
}

export function getDataUrlBlob(dataUrl: string): Blob {
    const [, base64 = ''] = dataUrl.split(',');
    const mimeType = dataUrl.match(/^data:([^;]+);base64,/)?.[1] || 'application/octet-stream';
    const binary = typeof atob === 'function' ? atob(base64) : '';
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return new Blob([bytes], { type: mimeType });
}

export function getMediaFileExtension(mimeType: string): string {
    if (mimeType.includes('webp')) return 'webp';
    if (mimeType.includes('png')) return 'png';
    return 'jpg';
}

export function buildMediaStoragePath({
    entityId,
    extension = 'webp',
    mediaId,
    profile,
    storeId,
    tenantId,
    variant,
}: MediaStoragePathInput): string {
    const profileConfig = getMediaImageProfile(profile);
    if (!profileConfig) throw new Error('INVALID_MEDIA_STORAGE_PROFILE');
    if (!profileConfig.variants.some((entry) => entry.id === variant)) {
        throw new Error('INVALID_MEDIA_STORAGE_VARIANT');
    }

    const cleanTenantId = normalizeMediaStoragePathSegment(tenantId, 'tenant_id');
    const cleanStoreId = normalizeMediaStoragePathSegment(storeId, 'store_id');
    const cleanEntityId = normalizeMediaStoragePathSegment(entityId, 'entity_id');
    const cleanMediaId = normalizeMediaStoragePathSegment(mediaId, 'media_id');
    const extensionWithoutDot = extension.replace(/^\./, '');
    const cleanExtension = extensionWithoutDot.toLowerCase();
    if (!MEDIA_STORAGE_EXTENSION_PATTERN.test(cleanExtension)) {
        throw new Error('INVALID_MEDIA_STORAGE_EXTENSION');
    }

    return `media/${profile}/${cleanTenantId}/${cleanStoreId}/${cleanEntityId}/${cleanMediaId}_${variant}.${cleanExtension}`;
}
