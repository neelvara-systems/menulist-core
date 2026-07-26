import assert from 'node:assert/strict';
import {
    GENERATED_IMAGE_MAX_BYTES,
    GENERATED_IMAGE_MAX_COUNT,
    getBase64DecodedSize,
    normalizeGeneratedImagesFromProvider,
} from '../../src/lib/ai/generatedImageOutput';

const pngBase64 = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]).toString('base64');
const jpegBase64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString('base64');

assert.equal(getBase64DecodedSize(pngBase64), 8);
assert.equal(getBase64DecodedSize('not base64'), -1);
assert.equal(getBase64DecodedSize('AAAAA'), -1);

assert.deepEqual(
    normalizeGeneratedImagesFromProvider({
        candidates: [{
            content: {
                parts: [
                    { text: 'ignored' },
                    { inlineData: { data: pngBase64, mimeType: ' IMAGE/PNG ' } },
                    { inlineData: { data: jpegBase64, mimeType: 'image/jpg' } },
                ],
            },
        }],
    }),
    [
        { base64: pngBase64, mimeType: 'image/png', sizeBytes: 8 },
        { base64: jpegBase64, mimeType: 'image/jpeg', sizeBytes: 4 },
    ],
);

for (const malformed of [
    null,
    [],
    {},
    { candidates: null },
    { candidates: [] },
    { candidates: [null] },
    { candidates: [{ content: null }] },
    { candidates: [{ content: { parts: null } }] },
    { candidates: [{ content: { parts: [{ inlineData: null }] } }] },
    { candidates: [{ content: { parts: [{ inlineData: { data: 1, mimeType: 'image/png' } }] } }] },
    { candidates: [{ content: { parts: [{ inlineData: { data: pngBase64, mimeType: 'image/svg+xml' } }] } }] },
    { candidates: [{ content: { parts: [{ inlineData: { data: pngBase64, mimeType: 'image/jpeg' } }] } }] },
    { candidates: [{ content: { parts: [{ inlineData: { data: 'AAAA', mimeType: 'image/png' } }] } }] },
]) {
    assert.deepEqual(normalizeGeneratedImagesFromProvider(malformed), []);
}

const repeatedParts = Array.from(
    { length: GENERATED_IMAGE_MAX_COUNT + 2 },
    () => ({ inlineData: { data: pngBase64, mimeType: 'image/png' } }),
);
assert.equal(
    normalizeGeneratedImagesFromProvider({
        candidates: [{ content: { parts: repeatedParts } }],
    }).length,
    GENERATED_IMAGE_MAX_COUNT,
);

const encodedLengthAboveLimit = Math.ceil((GENERATED_IMAGE_MAX_BYTES + 1) / 3) * 4;
assert.equal(
    getBase64DecodedSize(`${'A'.repeat(encodedLengthAboveLimit - 1)}=`) > GENERATED_IMAGE_MAX_BYTES,
    true,
);

console.log('Generated image provider-output regression checks passed.');
