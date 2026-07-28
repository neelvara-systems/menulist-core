import assert from 'node:assert/strict';
import { readOwnerPublicTruthTimestampMs } from '../../src/lib/public-truth-tools/ownerPublicTruthReadiness';

const expected = Date.parse('2026-07-26T00:00:00.123Z');

assert.equal(readOwnerPublicTruthTimestampMs(new Date(expected)), expected);
assert.equal(readOwnerPublicTruthTimestampMs(expected), expected);
assert.equal(readOwnerPublicTruthTimestampMs('2026-07-26T00:00:00.123Z'), expected);
assert.equal(
    readOwnerPublicTruthTimestampMs({ seconds: 1_785_024_000, nanoseconds: 123_000_000 }),
    expected,
);
assert.equal(readOwnerPublicTruthTimestampMs({ toMillis: () => expected }), expected);
assert.equal(readOwnerPublicTruthTimestampMs({ toDate: () => new Date(expected) }), expected);

assert.equal(readOwnerPublicTruthTimestampMs(Number.NaN), null);
assert.equal(readOwnerPublicTruthTimestampMs(Number.POSITIVE_INFINITY), null);
assert.equal(readOwnerPublicTruthTimestampMs(-1), null);
assert.equal(readOwnerPublicTruthTimestampMs({ seconds: '1774742400' }), null);
assert.equal(readOwnerPublicTruthTimestampMs({ seconds: 1_785_024_000, nanoseconds: -1 }), null);
assert.equal(readOwnerPublicTruthTimestampMs({ seconds: 1_785_024_000, nanoseconds: 1_000_000_000 }), null);
assert.equal(readOwnerPublicTruthTimestampMs({ toMillis: () => '1774742400123' }), null);
assert.equal(readOwnerPublicTruthTimestampMs({ toDate: () => '2026-07-26' }), null);
assert.equal(readOwnerPublicTruthTimestampMs({
    get toMillis() {
        throw new Error('hostile getter');
    },
}), null);
assert.equal(readOwnerPublicTruthTimestampMs({
    toDate() {
        throw new Error('hostile method');
    },
}), null);

console.log('Owner public-truth timestamp boundary tests passed.');
