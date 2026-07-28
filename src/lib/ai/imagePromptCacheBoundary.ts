import { getMediaImageProfile } from '@lib/media/imageProfiles';
import { getMediaFileExtension } from '@lib/media/mediaStorage';
import { normalizeMediaUploadMimeType } from '@lib/media/mediaUploadBoundary';
import { validateMagicBytes } from '@lib/security/magicBytesValidator';

export const IMAGE_PROMPT_CACHE_KEY_VERSION = 2;
export const IMAGE_PROMPT_CACHE_STORAGE_PREFIX = `system/aiImagePromptCache/v${IMAGE_PROMPT_CACHE_KEY_VERSION}`;
const IMAGE_PROMPT_CACHE_SOURCE_VERSION_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function buildImagePromptCacheSourcePath(
    cacheKey: string,
    sourceVersion: string,
    extension: string,
): string | null {
    if (!/^[a-f0-9]{64}$/.test(cacheKey)) return null;
    if (!IMAGE_PROMPT_CACHE_SOURCE_VERSION_PATTERN.test(sourceVersion)) return null;
    if (!/^[a-z0-9]+$/.test(extension)) return null;
    return `${IMAGE_PROMPT_CACHE_STORAGE_PREFIX}/${cacheKey}/${sourceVersion}.${extension}`;
}

export function isImagePromptCacheSourcePathForKey(sourcePath: unknown, cacheKey: string): sourcePath is string {
    if (typeof sourcePath !== 'string' || !/^[a-f0-9]{64}$/.test(cacheKey)) return false;
    const expectedPrefix = `${IMAGE_PROMPT_CACHE_STORAGE_PREFIX}/${cacheKey}/`;
    if (!sourcePath.startsWith(expectedPrefix)) return false;
    const [sourceVersion, extension, ...extra] = sourcePath.slice(expectedPrefix.length).split('.');
    return extra.length === 0
        && IMAGE_PROMPT_CACHE_SOURCE_VERSION_PATTERN.test(sourceVersion)
        && /^[a-z0-9]+$/.test(extension || '');
}

export interface ReusableImagePromptCacheSource {
    extension: string;
    mimeType: string;
    sourcePath: string;
}

export function imagePromptCacheWriteCommitted(
    currentData: unknown,
    stagedSourcePath: string,
): boolean {
    return Boolean(
        currentData
        && typeof currentData === 'object'
        && !Array.isArray(currentData)
        && (currentData as Record<string, unknown>).sourcePath === stagedSourcePath,
    );
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
    if (!isImagePromptCacheSourcePathForKey(sourcePath, cacheKey) || !sourcePath.endsWith(`.${extension}`)) return null;
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
