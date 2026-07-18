import assert from 'node:assert/strict';

import { resolveBase64UploadConfig } from '../../src/lib/storage/base64UploadBoundary';

const dataUrl = (mimeType: string, bytes: number[]) => (
    `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`
);

assert.deepEqual(resolveBase64UploadConfig({
    type: 'jpg',
    url: dataUrl('image/jpeg', [0xff, 0xd8, 0xff, 0xe0]),
}), {
    contentType: 'image/jpeg',
    decodedBytes: 4,
    extension: '.jpeg',
    uploadFormat: 'data_url',
});
assert.equal(resolveBase64UploadConfig({
    url: dataUrl('image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
}).contentType, 'image/png');
assert.equal(resolveBase64UploadConfig({
    type: 'woff',
    url: dataUrl('application/font-woff', [0x77, 0x4f, 0x46, 0x46]),
}).contentType, 'font/woff');
assert.equal(resolveBase64UploadConfig({
    type: 'svg',
    url: dataUrl('image/svg+xml', Array.from(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>'))),
}).uploadFormat, 'data_url');

assert.throws(
    () => resolveBase64UploadConfig({
        type: 'image/jpeg',
        url: dataUrl('image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    }),
    /base64_upload_type_mismatch/,
);
assert.throws(
    () => resolveBase64UploadConfig({
        type: 'unknown',
        url: dataUrl('image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    }),
    /base64_upload_declared_type_invalid/,
);
assert.throws(
    () => resolveBase64UploadConfig({ type: 'image/png', url: 'https://example.com/base64,image.png' }),
    /base64_upload_data_url_invalid/,
);
assert.throws(
    () => resolveBase64UploadConfig({ type: 'image/png', url: 'data:image/png;base64,' }),
    /base64_upload_payload_empty|base64_upload_payload_invalid/,
);
assert.throws(
    () => resolveBase64UploadConfig({ type: 'image/png', url: 'data:image/png;base64,abc' }),
    /base64_upload_payload_invalid/,
);
assert.throws(
    () => resolveBase64UploadConfig({ type: 'image/png', url: 'data:image/png;base64,!!!!' }),
    /base64_upload_payload_invalid/,
);
assert.throws(
    () => resolveBase64UploadConfig({ type: 'image/png', url: dataUrl('image/png', [1, 2, 3, 4]) }),
    /base64_upload_signature_mismatch/,
);
assert.throws(
    () => resolveBase64UploadConfig({
        type: 'image/svg+xml',
        url: dataUrl('image/svg+xml', Array.from(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'))),
    }),
    /base64_upload_signature_mismatch/,
);
assert.throws(
    () => resolveBase64UploadConfig({
        type: 'image/svg+xml',
        url: dataUrl('image/svg+xml', Array.from(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))),
    }),
    /base64_upload_signature_mismatch/,
);
assert.throws(
    () => resolveBase64UploadConfig({
        type: 'image/svg+xml',
        url: dataUrl('image/svg+xml', Array.from(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/a.png"/></svg>'))),
    }),
    /base64_upload_signature_mismatch/,
);

console.log('Base64 upload boundary tests passed.');
