import assert from 'node:assert/strict';
import { normalizeOBPFreshnessDate } from '../../src/lib/obp/freshnessTimestamp';
import { hasOBPPublicStoreIdentity } from '../../src/lib/obp/publicStoreIdentity';

const expected = '2026-07-31T08:30:15.250Z';
const milliseconds = Date.parse(expected);

assert.equal(normalizeOBPFreshnessDate(new Date(milliseconds))?.toISOString(), expected);
assert.equal(normalizeOBPFreshnessDate(expected)?.toISOString(), expected);
assert.equal(normalizeOBPFreshnessDate({
    nanoseconds: 250_000_000,
    seconds: Math.floor(milliseconds / 1000),
})?.toISOString(), expected);
assert.equal(normalizeOBPFreshnessDate({
    _nanoseconds: 250_000_000,
    _seconds: Math.floor(milliseconds / 1000),
})?.toISOString(), expected);
assert.equal(normalizeOBPFreshnessDate({ toDate: () => new Date(milliseconds) })?.toISOString(), expected);

assert.equal(normalizeOBPFreshnessDate({ seconds: 0 })?.toISOString(), '1970-01-01T00:00:00.000Z');
assert.equal(normalizeOBPFreshnessDate({ seconds: '1' }), null);
assert.equal(normalizeOBPFreshnessDate({ seconds: 1, nanoseconds: 1_000_000_000 }), null);
assert.equal(normalizeOBPFreshnessDate({ toDate: () => 'not-a-date' }), null);
assert.equal(normalizeOBPFreshnessDate(new Date(Number.NaN)), null);
assert.equal(normalizeOBPFreshnessDate({
    get toDate() {
        throw new Error('hostile timestamp getter');
    },
}), null);

assert.equal(hasOBPPublicStoreIdentity({ storeId: 2, tenantId: 1 }), true);
assert.equal(hasOBPPublicStoreIdentity({ storeId: '2', tenantId: 1 }), false);
assert.equal(hasOBPPublicStoreIdentity({ storeId: 2, tenantId: 0 }), false);
assert.equal(hasOBPPublicStoreIdentity({ storeId: 2 }), false);
assert.equal(hasOBPPublicStoreIdentity({
    get storeId() {
        throw new Error('hostile store identity getter');
    },
    tenantId: 1,
}), false);
assert.equal(normalizeOBPFreshnessDate({
    toDate() {
        throw new Error('hostile timestamp method');
    },
}), null);

process.stdout.write('OBP freshness timestamp boundary tests passed.\n');
