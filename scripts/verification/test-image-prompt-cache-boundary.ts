import assert from 'node:assert/strict';
import {
    buildImagePromptCacheSourcePath,
    getReusableImagePromptCacheSource,
    imagePromptCacheWriteCommitted,
    IMAGE_PROMPT_CACHE_KEY_VERSION,
    IMAGE_PROMPT_CACHE_STORAGE_PREFIX,
    isImagePromptCacheSourcePathForKey,
} from '../../src/lib/ai/imagePromptCacheBoundary';

const cacheKey = 'a'.repeat(64);
const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const sourceVersion = '123e4567-e89b-12d3-a456-426614174000';
const validSourcePath = buildImagePromptCacheSourcePath(cacheKey, sourceVersion, 'png');
assert.ok(validSourcePath);
assert.equal(isImagePromptCacheSourcePathForKey(validSourcePath, cacheKey), true);
assert.equal(isImagePromptCacheSourcePathForKey(`${IMAGE_PROMPT_CACHE_STORAGE_PREFIX}/${cacheKey}/../bad.png`, cacheKey), false);
assert.equal(isImagePromptCacheSourcePathForKey(validSourcePath, 'b'.repeat(64)), false);
const validDoc = {
    keyVersion: IMAGE_PROMPT_CACHE_KEY_VERSION,
    mimeType: 'image/png',
    outputSizeBytes: pngBytes.byteLength,
    sourcePath: validSourcePath,
};

assert.deepEqual(
    getReusableImagePromptCacheSource(validDoc, cacheKey, pngBytes),
    {
        extension: 'png',
        mimeType: 'image/png',
        sourcePath: validDoc.sourcePath,
    },
);

for (const invalidDoc of [
    { ...validDoc, keyVersion: 0 },
    { ...validDoc, keyVersion: IMAGE_PROMPT_CACHE_KEY_VERSION + 1 },
    { ...validDoc, mimeType: 'text/html' },
    { ...validDoc, mimeType: null },
    { ...validDoc, outputSizeBytes: 0 },
    { ...validDoc, outputSizeBytes: pngBytes.byteLength + 1 },
    { ...validDoc, outputSizeBytes: Number.NaN },
    { ...validDoc, sourcePath: `${IMAGE_PROMPT_CACHE_STORAGE_PREFIX}/${'b'.repeat(64)}/${sourceVersion}.png` },
    { ...validDoc, sourcePath: `${IMAGE_PROMPT_CACHE_STORAGE_PREFIX}/${cacheKey}/${sourceVersion}.webp` },
    { ...validDoc, sourcePath: `media/menuItem/1/2/${cacheKey}.png` },
]) {
    assert.equal(getReusableImagePromptCacheSource(invalidDoc, cacheKey, pngBytes), null);
}

assert.equal(getReusableImagePromptCacheSource(validDoc, 'not-a-cache-key', pngBytes), null);
assert.equal(
    getReusableImagePromptCacheSource(validDoc, cacheKey, Uint8Array.from([0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e, 0x00, 0x00])),
    null,
);

assert.equal(imagePromptCacheWriteCommitted({ sourcePath: validSourcePath }, validSourcePath), true);
assert.equal(imagePromptCacheWriteCommitted({ sourcePath: `${validSourcePath}.other` }, validSourcePath), false);
assert.equal(imagePromptCacheWriteCommitted(null, validSourcePath), false);

console.log('Image prompt cache boundary tests passed.');
