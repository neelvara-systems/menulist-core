#!/usr/bin/env ts-node

import assert from 'node:assert/strict';

const {
    acquireForceRepublishLease: acquireForceRepublishLeaseForTest,
    completeForceRepublishLease: completeForceRepublishLeaseForTest,
} = require('../../functions/lib/monitoring/publishVerification.js');
const { firestoreAdmin } = require('../../functions/lib/firebaseAdmin.js');

const SYSTEM_COLLECTION = '_system';
const MINUTE_MS = 60 * 1000;

function stateRef(tenantId: string, storeId: string) {
    return firestoreAdmin
        .collection(SYSTEM_COLLECTION)
        .doc(`forceRepublish_${tenantId}_${storeId}`);
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const tenantId = '1';
    const storeId = '101';
    const batch = firestoreAdmin.batch();
    batch.set(firestoreAdmin.collection('tenants').doc(tenantId), { active: true });
    batch.set(firestoreAdmin.collection('stores').doc(storeId), { active: true, tId: Number(tenantId), subdomain: 'lease-test' });
    batch.set(firestoreAdmin.collection('users').doc('platform-user'), { active: true, platformRole: 'PLATFORM' });
    batch.set(firestoreAdmin.collection('tenants').doc('2'), { active: true });
    batch.set(firestoreAdmin.collection('stores').doc('201'), { active: true, tId: 2, subdomain: 'lease-test-2' });
    batch.set(firestoreAdmin.collection('tenants').doc('3'), { active: true });
    batch.set(firestoreAdmin.collection('stores').doc('301'), { active: true, tId: 3, subdomain: 'lease-test-3' });
    batch.set(firestoreAdmin.collection('users').doc('revoked-user'), { active: true, platformRole: 'OWNER' });
    await batch.commit();
    await Promise.all([
        stateRef(tenantId, storeId).delete(),
        stateRef('2', '201').delete(),
        stateRef('3', '301').delete(),
    ]);

    const firstRunAt = new Date('2026-07-23T13:00:00.000Z');
    const concurrent = await Promise.all([
        acquireForceRepublishLeaseForTest(tenantId, storeId, 'platform-user', 'desktop-run', firstRunAt),
        acquireForceRepublishLeaseForTest(tenantId, storeId, 'platform-user', 'mobile-run', firstRunAt),
    ]);
    const acquired = concurrent.filter(Boolean);
    assert.equal(acquired.length, 1, 'one tenant/store may have only one active force republish');

    const otherTenantLease = await acquireForceRepublishLeaseForTest(
        '2',
        '201',
        'platform-user',
        'other-tenant-run',
        firstRunAt,
    );
    assert.ok(otherTenantLease, 'another tenant/store scope must use an independent lease');
    assert.equal(await completeForceRepublishLeaseForTest(otherTenantLease), true);

    const firstLease = acquired[0];
    assert.equal(await completeForceRepublishLeaseForTest(firstLease), true);
    const completedState = (await stateRef(tenantId, storeId).get()).data() || {};
    assert.equal(completedState.status, 'completed');
    assert.equal(completedState.leaseOwner, undefined);
    assert.equal(completedState.leaseExpiresAt, undefined);

    const secondLease = await acquireForceRepublishLeaseForTest(
        tenantId,
        storeId,
        'platform-user',
        'later-run',
        new Date(firstRunAt.getTime() + MINUTE_MS),
    );
    assert.ok(secondLease, 'completion must allow an intentional later recovery');
    assert.equal(
        await acquireForceRepublishLeaseForTest(
            tenantId,
            storeId,
            'platform-user',
            'concurrent-run',
            new Date(firstRunAt.getTime() + 2 * MINUTE_MS),
        ),
        null,
        'an unexpired force-republish lease must reject another owner',
    );

    const replacementLease = await acquireForceRepublishLeaseForTest(
        tenantId,
        storeId,
        'platform-user',
        'replacement-run',
        new Date(firstRunAt.getTime() + 3 * MINUTE_MS),
    );
    assert.ok(replacementLease, 'an expired force-republish lease must be recoverable');
    assert.equal(
        await completeForceRepublishLeaseForTest(secondLease),
        false,
        'a stale owner must not finalize over its replacement',
    );
    assert.equal(await completeForceRepublishLeaseForTest(replacementLease), true);

    await assert.rejects(
        acquireForceRepublishLeaseForTest(
            '3',
            '301',
            'revoked-user',
            'revoked-run',
            firstRunAt,
        ),
        /PUBLISH_VERIFICATION_SCOPE_INVALID/,
        'a stale token must not acquire a lease after persisted platform authority is revoked',
    );
    assert.equal(
        (await stateRef('3', '301').get()).exists,
        false,
        'authorization must be established before the first lease write',
    );

    process.stdout.write('Force republish lease emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
