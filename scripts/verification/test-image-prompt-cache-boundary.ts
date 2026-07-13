import assert from 'node:assert/strict';
import {
    getReusableImagePromptCacheSource,
    IMAGE_PROMPT_CACHE_KEY_VERSION,
    IMAGE_PROMPT_CACHE_STORAGE_PREFIX,
} from '../../src/lib/ai/imagePromptCacheBoundary';

const cacheKey = 'a'.repeat(64);
const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const validDoc = {
    keyVersion: IMAGE_PROMPT_CACHE_KEY_VERSION,
    mimeType: 'image/png',
    outputSizeBytes: pngBytes.byteLength,
    sourcePath: `${IMAGE_PROMPT_CACHE_STORAGE_PREFIX}/${cacheKey}.png`,
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
    { ...validDoc, sourcePath: `${IMAGE_PROMPT_CACHE_STORAGE_PREFIX}/${'b'.repeat(64)}.png` },
    { ...validDoc, sourcePath: `${IMAGE_PROMPT_CACHE_STORAGE_PREFIX}/${cacheKey}.webp` },
    { ...validDoc, sourcePath: `media/menuItem/1/2/${cacheKey}.png` },
]) {
    assert.equal(getReusableImagePromptCacheSource(invalidDoc, cacheKey, pngBytes), null);
}

assert.equal(getReusableImagePromptCacheSource(validDoc, 'not-a-cache-key', pngBytes), null);
assert.equal(
    getReusableImagePromptCacheSource(validDoc, cacheKey, Uint8Array.from([0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e, 0x00, 0x00])),
    null,
);

console.log('Image prompt cache boundary tests passed.');
