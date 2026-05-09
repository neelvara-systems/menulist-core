import type { MediaImageType, MediaImageVariantId } from './imageProfiles';

export interface MediaStoragePathInput {
    entityId: string;
    extension?: string;
    mediaId: string;
    profile: MediaImageType;
    storeId: string;
    tenantId: string;
    variant: MediaImageVariantId;
}

function sanitizePathSegment(value: string): string {
    return value
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 96) || 'unknown';
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

export function isDataUrl(value: string | null | undefined): value is string {
    return typeof value === 'string' && /^data:[^;]+;base64,/.test(value);
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
    const cleanTenantId = sanitizePathSegment(tenantId);
    const cleanStoreId = sanitizePathSegment(storeId);
    const cleanEntityId = sanitizePathSegment(entityId);
    const cleanMediaId = sanitizePathSegment(mediaId);
    const cleanExtension = sanitizePathSegment(extension.replace(/^\./, '')) || 'webp';

    return `media/${profile}/${cleanTenantId}/${cleanStoreId}/${cleanEntityId}/${cleanMediaId}_${variant}.${cleanExtension}`;
}
