import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    ALERT_COOLDOWNS,
    ALERT_THRESHOLDS,
    ERROR_DEDUPLICATION,
} from '../../functions/src/monitoring/analyticsMetrics';
import {
    getSystemErrorDocumentId,
    getSystemErrorOccurrenceDecision,
    normalizeSystemErrorScopeId,
} from '../../functions/src/monitoring/systemErrorBoundary';

const root = path.resolve(__dirname, '../..');
const monitoringFiles = ['alerts.ts', 'errorTracking.ts'];

for (const fileName of monitoringFiles) {
    const source = fs.readFileSync(
        path.join(root, 'functions/src/monitoring', fileName),
        'utf8',
    );
    assert.equal(
        source.includes("from '../../../src/constants/analyticsMetrics'"),
        false,
        `${fileName} must not import an out-of-bundle TypeScript source`,
    );
    assert.match(
        source,
        /from ['"]\.\/analyticsMetrics['"]/,
        `${fileName} must use the Functions-owned runtime contract`,
    );
}

assert.equal(
    fs.existsSync(path.join(root, 'src/constants/analyticsMetrics.js')),
    false,
    'a generated JavaScript shadow must not sit beside the TypeScript source',
);
assert.equal(
    fs.existsSync(path.join(root, 'src/constants/analyticsMetrics.js.map')),
    false,
    'a generated source-map shadow must not be checked in',
);

assert.deepEqual(ALERT_THRESHOLDS, {
    ERROR_RATE_HIGH: 10,
    CRITICAL_ERROR_COUNT: 0,
    SATISFACTION_LOW: 60,
    RESPONSE_TIME_SLOW: 5000,
    KB_ARTICLES_MIN: 5,
    FIRESTORE_RESPONSE_SLOW: 500,
});
assert.deepEqual(ALERT_COOLDOWNS, {
    HIGH_ERROR_RATE: 60,
    LOW_SATISFACTION: 1440,
    LOW_KB_COVERAGE: 10080,
    SLOW_RESPONSE: 120,
    SYSTEM_DOWN: 15,
    DEFAULT: 60,
});
assert.deepEqual(ERROR_DEDUPLICATION, {
    WINDOW_HOURS: 1,
    MAX_OCCURRENCES: 5,
});

assert.equal(normalizeSystemErrorScopeId(' tenant-a '), 'tenant-a');
assert.equal(normalizeSystemErrorScopeId(''), 'system');
assert.equal(normalizeSystemErrorScopeId('x'.repeat(200)).length, 128);

const stableErrorIdentity = {
    tId: 'tenant-a',
    sId: 'store-a',
    errorType: 'function',
    message: 'ALERT_CREATE_FAILED',
};
const stableErrorId = getSystemErrorDocumentId(stableErrorIdentity);
assert.equal(stableErrorId.length, 64);
assert.equal(getSystemErrorDocumentId(stableErrorIdentity), stableErrorId);
assert.notEqual(
    getSystemErrorDocumentId({ ...stableErrorIdentity, sId: 'store-b' }),
    stableErrorId,
);
assert.equal(stableErrorId.includes('tenant-a'), false);

assert.deepEqual(
    getSystemErrorOccurrenceDecision(null, undefined, 10_000, 1_000),
    { occurrenceCount: 1, startsNewWindow: true },
);
assert.deepEqual(
    getSystemErrorOccurrenceDecision(9_500, 4, 10_000, 1_000),
    { occurrenceCount: 5, startsNewWindow: false },
);
assert.deepEqual(
    getSystemErrorOccurrenceDecision(9_500, 'bad', 10_000, 1_000),
    { occurrenceCount: 2, startsNewWindow: false },
);
assert.deepEqual(
    getSystemErrorOccurrenceDecision(8_999, 12, 10_000, 1_000),
    { occurrenceCount: 1, startsNewWindow: true },
);

console.log('Functions monitoring threshold boundary tests passed.');
