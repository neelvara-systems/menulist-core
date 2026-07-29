import assert from 'node:assert/strict';

import { normalizeAiImageResponseItems } from '../../src/services/ai/image/imageResponse';

assert.deepEqual(normalizeAiImageResponseItems(undefined), []);
assert.deepEqual(normalizeAiImageResponseItems(null), []);
assert.deepEqual(normalizeAiImageResponseItems([
    { base64: 'YWJj', mimeType: 'image/png' },
]), [
    { base64: 'data:image/png;base64,YWJj', mimeType: 'image/png' },
]);
assert.deepEqual(normalizeAiImageResponseItems([
    { base64: 'data:image/webp;base64,YWJj', mimeType: 'image/webp' },
]), [
    { base64: 'data:image/webp;base64,YWJj', mimeType: 'image/webp' },
]);
assert.equal(normalizeAiImageResponseItems({ base64: 'YWJj', mimeType: 'image/png' }), null);
assert.equal(normalizeAiImageResponseItems([{ base64: 123, mimeType: 'image/png' }]), null);
assert.equal(normalizeAiImageResponseItems([{ base64: 'YWJj', mimeType: 'text/html' }]), null);
assert.equal(normalizeAiImageResponseItems([
    { base64: 'data:text/html;base64,YWJj', mimeType: 'image/png' },
]), null);
assert.equal(normalizeAiImageResponseItems([{ base64: 'YWJj' }]), null);

console.log('AI service response boundary tests passed.');
