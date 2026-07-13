import { getMediaImageProfile } from '@lib/media/imageProfiles';
import { getMediaFileExtension } from '@lib/media/mediaStorage';
import { normalizeMediaUploadMimeType } from '@lib/media/mediaUploadBoundary';
import { validateMagicBytes } from '@lib/security/magicBytesValidator';

export const IMAGE_PROMPT_CACHE_KEY_VERSION = 1;
export const IMAGE_PROMPT_CACHE_STORAGE_PREFIX = `system/aiImagePromptCache/v${IMAGE_PROMPT_CACHE_KEY_VERSION}`;

export interface ReusableImagePromptCacheSource {
    extension: string;
    mimeType: string;
    sourcePath: string;
}

export function getReusableImagePromptCacheSource(
    cacheDoc: Record<string, unknown>,
    cacheKey: string,
    sourceBytes: Uint8Array,
): ReusableImagePromptCacheSource | null {
    if (!/^[a-f0-9]{64}$/.test(cacheKey)) return null;

    const profile = getMediaImageProfile('menuItem');
    const mimeType = normalizeMediaUploadMimeType(cacheDoc.mimeType);
    if (!profile.allowedMimeTypes.includes(mimeType)) return null;

    const extension = getMediaFileExtension(mimeType);
    const sourcePath = typeof cacheDoc.sourcePath === 'string' ? cacheDoc.sourcePath : '';
    const expectedSourcePath = `${IMAGE_PROMPT_CACHE_STORAGE_PREFIX}/${cacheKey}.${extension}`;
    if (sourcePath !== expectedSourcePath) return null;
    if (cacheDoc.keyVersion !== IMAGE_PROMPT_CACHE_KEY_VERSION) return null;

    const outputSizeBytes = cacheDoc.outputSizeBytes;
    const maxBytes = profile.maxOutputSizeKB * 1024;
    if (
        !Number.isSafeInteger(outputSizeBytes)
        || outputSizeBytes !== sourceBytes.byteLength
        || sourceBytes.byteLength <= 0
        || sourceBytes.byteLength > maxBytes
    ) {
        return null;
    }

    const exactBuffer = new Uint8Array(sourceBytes.byteLength);
    exactBuffer.set(sourceBytes);
    if (!validateMagicBytes(exactBuffer.buffer, mimeType).valid) return null;

    return { extension, mimeType, sourcePath };
}
