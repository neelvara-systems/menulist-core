import assert from 'node:assert/strict';

import {
    buildPlatformEntityBlockAcknowledgement,
    parsePlatformEntityBlockAcknowledgement,
} from '../../src/lib/platform/entityBlockAcknowledgement';

const blockDetails = {
    blocked: true,
    reason: 'Policy violation',
    source: 'platform_settings' as const,
    updatedAt: '2026-07-26T00:00:00.000Z',
    updatedByEmail: 'admin@example.com',
};

assert.deepEqual(
    buildPlatformEntityBlockAcknowledgement({
        blocked: true,
        blockDetails,
        entityId: 10,
        entityType: 'store',
    }),
    { blocked: true, blockDetails, storeId: 10 },
);
assert.deepEqual(
    parsePlatformEntityBlockAcknowledgement(
        { blocked: true, blockDetails, storeId: 10 },
        { blocked: true, entityId: '10', entityType: 'store' },
    ),
    { blocked: true, blockDetails, storeId: 10 },
);
assert.deepEqual(
    parsePlatformEntityBlockAcknowledgement(
        { blocked: true, blockDetails, id: 'user-1' },
        { blocked: true, entityId: 'user-1', entityType: 'user' },
    ),
    { blocked: true, blockDetails, id: 'user-1' },
);

for (const value of [
    { blocked: true, blockDetails, storeId: '010' },
    { blocked: false, blockDetails, storeId: 10 },
    { blocked: true, blockDetails: { ...blockDetails, blocked: false }, storeId: 10 },
    { blocked: true, blockDetails, storeId: 10, passwordHash: 'private' },
    { blocked: true, blockDetails: { ...blockDetails, internalToken: 'private' }, storeId: 10 },
]) {
    assert.equal(
        parsePlatformEntityBlockAcknowledgement(
            value,
            { blocked: true, entityId: 10, entityType: 'store' },
        ),
        null,
    );
}

let coercionAttempted = false;
assert.equal(
    parsePlatformEntityBlockAcknowledgement(
        {
            blocked: true,
            blockDetails,
            storeId: {
                toString() {
                    coercionAttempted = true;
                    throw new Error('must not coerce response identity');
                },
            },
        },
        { blocked: true, entityId: 10, entityType: 'store' },
    ),
    null,
);
assert.equal(coercionAttempted, false);

process.stdout.write('Platform entity-block acknowledgement tests passed.\n');
