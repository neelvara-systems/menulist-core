import assert = require('node:assert/strict');

import {
    fileUploadSchema,
    numericIdSchema,
    sanitizeFirestoreQuery,
    validateDocumentId,
    validateURL,
} from '../../src/lib/security/inputValidation';

assert.equal(numericIdSchema.parse('42'), 42);
assert.equal(numericIdSchema.parse(42), 42);
for (const invalidId of ['01', '9'.repeat(400), 1.5, Number.POSITIVE_INFINITY]) {
    assert.equal(numericIdSchema.safeParse(invalidId).success, false);
}

assert.equal(fileUploadSchema.safeParse({
    name: 'menu.png',
    size: 1024,
    type: 'image/png',
}).success, true);
for (const invalidSize of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(fileUploadSchema.safeParse({
        name: 'menu.png',
        size: invalidSize,
        type: 'image/png',
    }).success, false);
}
assert.equal(fileUploadSchema.safeParse({
    name: 'menu.png',
    size: 1024,
    type: 'image/png',
    unexpected: true,
}).success, false);

assert.equal(validateURL('https://example.com/path', ['example.com']), true);
assert.equal(validateURL('https://cdn.example.com/path', ['example.com']), true);
assert.equal(validateURL('https://example.com.evil.test/path', ['example.com']), false);
assert.equal(validateURL('https://user:password@example.com/path', ['example.com']), false);
assert.equal(validateURL('https://127.0.0.1/path'), false);
assert.equal(validateURL('https://[::1]/path'), false);
assert.equal(validateURL('https://[fe90::1]/path'), false);
assert.equal(validateURL('https://172.15.0.1/path'), true);
assert.equal(validateURL('https://172.16.0.1/path'), false);

assert.equal(validateDocumentId('menu-item').valid, true);
assert.equal(validateDocumentId('é'.repeat(750)).valid, true);
assert.equal(validateDocumentId('é'.repeat(751)).valid, false);

const sanitized = sanitizeFirestoreQuery(JSON.parse(
    '{"valid":" value ","finite":2,"invalidNumber":1e400,"__proto__":"safe-text","nested":{"x":1}}',
) as Record<string, unknown>);
assert.equal(Object.getPrototypeOf(sanitized), null);
assert.equal(sanitized.valid, 'value');
assert.equal(sanitized.finite, 2);
assert.equal(Object.prototype.hasOwnProperty.call(sanitized, '__proto__'), true);
assert.equal(sanitized.__proto__, 'safe-text');
assert.equal(Object.prototype.hasOwnProperty.call(sanitized, 'invalidNumber'), false);
assert.equal(Object.prototype.hasOwnProperty.call(sanitized, 'nested'), false);

process.stdout.write('Input validation boundary tests passed.\n');
