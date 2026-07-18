import assert from 'node:assert/strict';
import {
    isImagePromptCacheSourcePath,
    shouldDeleteCurrentImagePromptCacheDocument,
} from '../../functions/src/schedulers/imagePromptCacheRetentionBoundary';

const cacheKey = 'a'.repeat(64);
const claimedSourcePath = `system/aiImagePromptCache/v2/${cacheKey}/123e4567-e89b-12d3-a456-426614174000.png`;

assert.equal(isImagePromptCacheSourcePath(claimedSourcePath, cacheKey), true);
assert.equal(isImagePromptCacheSourcePath(`system/aiImagePromptCache/v2/${cacheKey}/../other.png`, cacheKey), false);
assert.equal(isImagePromptCacheSourcePath(claimedSourcePath, 'b'.repeat(64)), false);

assert.equal(shouldDeleteCurrentImagePromptCacheDocument({
    claimedSourcePath,
    currentData: { sourcePath: claimedSourcePath, expiresAt: { toMillis: () => 99 } },
    nowMillis: 100,
}), true);
assert.equal(shouldDeleteCurrentImagePromptCacheDocument({
    claimedSourcePath,
    currentData: { sourcePath: claimedSourcePath.replace('123e', '223e'), expiresAt: { toMillis: () => 99 } },
    nowMillis: 100,
}), false, 'a concurrent immutable refresh must preserve the current cache document');
assert.equal(shouldDeleteCurrentImagePromptCacheDocument({
    claimedSourcePath,
    currentData: { sourcePath: claimedSourcePath, expiresAt: { toMillis: () => 101 } },
    nowMillis: 100,
}), false, 'a concurrent expiry refresh must preserve the current cache document');
assert.equal(shouldDeleteCurrentImagePromptCacheDocument({
    claimedSourcePath,
    currentData: { sourcePath: claimedSourcePath, expiresAt: { toMillis: () => Number.NaN } },
    nowMillis: 100,
}), false, 'malformed current expiry must fail closed');

process.stdout.write('Image prompt cache retention boundary tests passed.\n');
