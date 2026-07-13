import {
    getMediaImageProfile,
    type MediaImageType,
    type MediaImageVariantId,
} from './imageProfiles';

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

export function normalizeMediaUploadMimeType(value: unknown): string {
    if (typeof value !== 'string') return '';
    const normalized = value.trim().toLowerCase();
    return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
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
