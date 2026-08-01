import assert from 'node:assert/strict';

import { normalizeGoogleAnalyticsPrivateKey } from '../../src/lib/analytics/server';
import { getImageAsBase64 } from '../../src/lib/apiUtils';

assert.equal(
    normalizeGoogleAnalyticsPrivateKey('line-one\\nline-two'),
    'line-one\nline-two',
);
assert.equal(
    normalizeGoogleAnalyticsPrivateKey('line-one\nline-two'),
    'line-one\nline-two',
);

async function main() {
    const jpeg = await getImageAsBase64({
        type: 'image/jpeg',
        url: 'data:image/jpeg;base64,/9j/4A==',
    });
    assert.equal(jpeg.mimeType, 'image/jpeg');
    assert.equal(jpeg.base64ImageData, '/9j/4A==');

    await assert.rejects(
        () => getImageAsBase64({
            type: 'image/jpeg',
            url: 'data:image/jpeg;base64,iVBORw0KGgo=',
        }),
        /Invalid source image/,
    );
    await assert.rejects(
        () => getImageAsBase64({
            type: 'image/jpeg',
            url: 'data:image/jpeg;base64,@@@@',
        }),
        /Invalid image data URL format/,
    );

    process.env.GEMINI_AI_KEY = 'menu-key-one';
    process.env.GEMINI_AI_KEY_2 = 'menu-key-two';
    const { KeyManager } = require('../../src/lib/google/genAi/keyManager') as {
        KeyManager: new () => {
            getClient(): object;
            markKeyRateLimited(client: object): void;
            markKeySuccess(client: object): void;
            getStats(): {
                currentKeyIndex: number;
                keys: Array<{ totalRateLimits: number }>;
            };
        };
    };

    const manager = new KeyManager();
    const firstRequestClient = manager.getClient();
    const concurrentRequestClient = manager.getClient();
    manager.markKeyRateLimited(firstRequestClient);
    assert.equal(manager.getStats().currentKeyIndex, 1);
    assert.notEqual(manager.getClient(), firstRequestClient);
    manager.markKeySuccess(concurrentRequestClient);
    manager.markKeyRateLimited(concurrentRequestClient);
    assert.deepEqual(
        manager.getStats().keys.map((key) => key.totalRateLimits),
        [2, 0],
    );

    console.log('Provider client boundary verification passed.');
}

void main();
