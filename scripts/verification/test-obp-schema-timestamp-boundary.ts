import assert from 'node:assert/strict';
import { normalizeOBPSchemaModifiedOn } from '../../src/app/client/obp/schema';

const expected = '2024-01-02T03:04:05.000Z';
const expectedMs = Date.parse(expected);

assert.equal(normalizeOBPSchemaModifiedOn(expected), expected);
assert.equal(normalizeOBPSchemaModifiedOn(new Date(expectedMs)), expected);
assert.equal(
    normalizeOBPSchemaModifiedOn({ toMillis: () => expectedMs }),
    expected,
);
assert.equal(
    normalizeOBPSchemaModifiedOn({ toDate: () => new Date(expectedMs) }),
    expected,
);
assert.equal(
    normalizeOBPSchemaModifiedOn({ seconds: expectedMs / 1000 }),
    expected,
);

for (const invalid of [
    '',
    'not-a-date',
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -1,
    {},
    { toDate: 'not-a-function' },
    { toDate: () => new Date(Number.NaN) },
    { toMillis: () => Number.NaN },
    { get toMillis() { throw new Error('hostile getter'); } },
]) {
    assert.equal(normalizeOBPSchemaModifiedOn(invalid), undefined);
}

const hostileProxy = new Proxy({}, {
    get() {
        throw new Error('hostile proxy');
    },
});
assert.equal(normalizeOBPSchemaModifiedOn(hostileProxy), undefined);

console.log('OBP schema timestamp boundary tests passed.');
