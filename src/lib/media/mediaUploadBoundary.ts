import {
    getMediaImageProfile,
    type MediaImageType,
    type MediaImageVariantId,
} from './imageProfiles';
import { getDataUrlBlob } from './mediaStorage';

export interface MediaUploadBlobCandidate {
    blob: Blob;
    mimeType: string;
    preparedOutput: boolean;
    profile: MediaImageType;
    variant: MediaImageVariantId;
}

export interface MediaUploadCleanupResult {
    attemptedCount: number;
    failedCount: number;
}

export type MediaUploadDeleteResult = Promise<{ success: boolean }>;
export type MediaUploadDelete = (url: string) => MediaUploadDeleteResult;

const MEDIA_UPLOAD_CLEANUP_ATTEMPTS = 2;

const bytesToHex = (bytes: Uint8Array): string => (
    Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
);

async function sha256Bytes(value: ArrayBuffer): Promise<string> {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
        throw new Error('prepared_media_hash_unavailable');
    }
    return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', value)));
}

export async function getMediaBlobChecksum(blob: Blob): Promise<string> {
    return sha256Bytes(await blob.arrayBuffer());
}

export async function getMediaTextChecksum(value: string): Promise<string> {
    if (typeof TextEncoder === 'undefined') {
        throw new Error('prepared_media_hash_unavailable');
    }
    return sha256Bytes(new TextEncoder().encode(value).buffer as ArrayBuffer);
}

export async function assertMediaBlobMatchesDataUrl(blob: Blob, dataUrl: string): Promise<void> {
    let dataUrlBlob: Blob;
    try {
        dataUrlBlob = getDataUrlBlob(dataUrl);
    } catch {
        throw new Error('prepared_media_blob_data_url_mismatch');
    }
    const [blobChecksum, dataUrlChecksum] = await Promise.all([
        getMediaBlobChecksum(blob),
        getMediaBlobChecksum(dataUrlBlob),
    ]);
    if (blobChecksum !== dataUrlChecksum) {
        throw new Error('prepared_media_blob_data_url_mismatch');
    }
}

export function normalizeMediaUploadMimeType(value: unknown): string {
    if (typeof value !== 'string') return '';
    const normalized = value.trim().toLowerCase();
    return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
}

export function resolvePreparedMediaIdentity({
    blobFingerprint,
    mediaChecksum,
    mediaId,
    preparedDataUrlChecksum,
    preparedChecksum,
    preparedMediaId,
    profile,
}: {
    blobFingerprint: string;
    mediaChecksum?: string;
    mediaId?: string;
    preparedDataUrlChecksum?: string;
    preparedChecksum?: string;
    preparedMediaId?: string;
    profile: MediaImageType;
}): { checksum: string; mediaId: string } {
    const normalizedFingerprint = blobFingerprint.trim();
    const normalizedPreparedChecksum = preparedChecksum?.trim() || '';
    const normalizedPreparedDataUrlChecksum = preparedDataUrlChecksum?.trim() || '';
    const normalizedProvidedChecksum = mediaChecksum?.trim() || '';
    if (
        normalizedPreparedChecksum
        && normalizedPreparedDataUrlChecksum !== normalizedPreparedChecksum
    ) {
        throw new Error('prepared_media_checksum_mismatch');
    }
    const checksum = normalizedPreparedChecksum || normalizedFingerprint;
    if (!/^[a-f0-9]{8,128}$/i.test(checksum)) throw new Error('prepared_media_checksum_invalid');
    if (normalizedProvidedChecksum && normalizedProvidedChecksum !== checksum) {
        throw new Error('prepared_media_checksum_mismatch');
    }

    const expectedMediaId = `${profile}_${checksum.slice(0, 16)}`;
    const normalizedPreparedMediaId = preparedMediaId?.trim() || '';
    const normalizedProvidedMediaId = mediaId?.trim() || '';
    if (normalizedPreparedMediaId && normalizedProvidedMediaId && normalizedProvidedMediaId !== normalizedPreparedMediaId) {
        throw new Error('prepared_media_identity_mismatch');
    }
    const resolvedMediaId = normalizedPreparedMediaId || normalizedProvidedMediaId || expectedMediaId;
    if (resolvedMediaId !== expectedMediaId) throw new Error('prepared_media_identity_mismatch');
    return { checksum, mediaId: resolvedMediaId };
}

export function assertMediaUploadBlobCandidate({
    blob,
    mimeType,
    preparedOutput,
    profile,
    variant,
}: MediaUploadBlobCandidate): void {
    const profileConfig = getMediaImageProfile(profile);
    if (!profileConfig) throw new Error('prepared_media_profile_invalid');
    if (!profileConfig.variants.some((entry) => entry.id === variant)) {
        throw new Error('prepared_media_variant_invalid');
    }

    const normalizedMimeType = normalizeMediaUploadMimeType(mimeType || blob.type);
    if (!profileConfig.allowedMimeTypes.includes(normalizedMimeType)) {
        throw new Error('prepared_media_mime_type_invalid');
    }
    if (!Number.isSafeInteger(blob.size) || blob.size <= 0) {
        throw new Error('prepared_media_blob_empty');
    }

    const maxBytes = preparedOutput
        ? profileConfig.maxOutputSizeKB * 1024
        : profileConfig.maxSourceBytes;
    if (blob.size > maxBytes) {
        throw new Error('prepared_media_blob_too_large');
    }
}

export async function cleanupUploadedMediaUrls(
    urls: readonly string[],
    deleteFile: MediaUploadDelete,
): Promise<MediaUploadCleanupResult> {
    const uniqueUrls = Array.from(new Set(
        urls.filter((url) => typeof url === 'string' && url.length > 0),
    ));
    const results = await Promise.all(uniqueUrls.map(async (url) => {
        for (let attempt = 0; attempt < MEDIA_UPLOAD_CLEANUP_ATTEMPTS; attempt += 1) {
            try {
                const result = await deleteFile(url);
                if (result.success) return true;
            } catch {
                // Retry once. The caller records one bounded diagnostic if cleanup still fails.
            }
        }
        return false;
    }));

    return {
        attemptedCount: uniqueUrls.length,
        failedCount: results.filter((success) => !success).length,
    };
}
