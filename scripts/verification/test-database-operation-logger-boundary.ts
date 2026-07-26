import assert from 'node:assert/strict';

import {
    getBoundedErrorLogContext,
} from '../../src/lib/monitoring/boundedLogContext';
import {
    getObjectKeyCount,
} from '../../src/database/loggers/loggerDiagnostics';

assert.deepEqual(getBoundedErrorLogContext({
    code: 'permission-denied',
    status: '403',
}), {
    sourceErrorCode: 'permission-denied',
    sourceErrorName: 'object',
    sourceStatusCode: 403,
});

assert.deepEqual(getBoundedErrorLogContext({
    code: 7,
    statusCode: 503,
}), {
    sourceErrorCode: '7',
    sourceErrorName: 'object',
    sourceStatusCode: 503,
});

assert.deepEqual(getBoundedErrorLogContext({
    code: { toString: () => { throw new Error('must not coerce code'); } },
    status: { valueOf: () => { throw new Error('must not coerce status'); } },
}), {
    sourceErrorCode: undefined,
    sourceErrorName: 'object',
    sourceStatusCode: undefined,
});

const throwingFields = new Proxy({}, {
    has: () => { throw new Error('must contain field access'); },
    ownKeys: () => { throw new Error('must contain key enumeration'); },
});

assert.deepEqual(getBoundedErrorLogContext(throwingFields), {
    sourceErrorCode: undefined,
    sourceErrorName: 'object',
    sourceStatusCode: undefined,
});
assert.equal(getObjectKeyCount(throwingFields), 0);
assert.equal(getObjectKeyCount({ one: true, two: false }), 2);
assert.equal(getObjectKeyCount(null), 0);

console.log('Database operation logger boundary tests passed.');
