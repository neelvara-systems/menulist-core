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

    process.env.MENULIST_GEMINI_AI_KEY = 'menu-key-one';
    process.env.GEMINI_AI_KEY_2 = 'menu-key-two';
    process.env.GEMINI_AI_KEY_4 = 'menu-extraction-provider-key';
    process.env.MENULIST_GEMINI_AI_KEY_4 = 'menu-extraction-provider-key';
    const { KeyManager } = require('../../src/lib/google/genAi/keyManager') as {
        KeyManager: new () => {
            totalKeys: number;
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
    assert.equal(manager.totalKeys, 1, 'The app-side MenuList client discovers only its primary credential');
    const firstRequestClient = manager.getClient();
    const concurrentRequestClient = manager.getClient();
    manager.markKeyRateLimited(firstRequestClient);
    assert.equal(manager.getStats().currentKeyIndex, 0);
    assert.equal(manager.getClient(), firstRequestClient);
    manager.markKeySuccess(concurrentRequestClient);
    manager.markKeyRateLimited(concurrentRequestClient);
    assert.deepEqual(
        manager.getStats().keys.map((key) => key.totalRateLimits),
        [2],
    );

    console.log('Provider client boundary verification passed.');
}

void main();
