#!/usr/bin/env ts-node

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
    deleteDoc,
    doc,
    getDoc,
    increment,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
} from 'firebase/firestore';
import { parseMasterOperationalState } from '../../src/lib/multiOutlet/masterOperationalState';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-master-operational-state-rules';
const ROOT = path.resolve(__dirname, '..', '..');

async function run(): Promise<void> {
    const validTimestamp = Timestamp.fromMillis(1_700_000_000_000);
    assert.deepEqual(parseMasterOperationalState({
        lastUpdatedAt: validTimestamp,
        operationalVersion: 2,
    }), {
        lastUpdatedAt: validTimestamp,
        operationalVersion: 2,
    });
    for (const malformed of [
        null,
        { lastUpdatedAt: validTimestamp, operationalVersion: 0 },
        { lastUpdatedAt: validTimestamp, operationalVersion: 1.5 },
        { lastUpdatedAt: validTimestamp, operationalVersion: '2' },
        { lastUpdatedAt: new Date(), operationalVersion: 2 },
        { extra: true, lastUpdatedAt: validTimestamp, operationalVersion: 2 },
    ]) assert.equal(parseMasterOperationalState(malformed), null);

    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') },
    });

    try {
        const ownerDb = testEnv.authenticatedContext('owner-1', {
            role: 'OWNER', storeId: '101', storeIds: ['101'], tenantId: '1', uId: 'owner-1',
        }).firestore();
        const sameTenantOtherStoreDb = testEnv.authenticatedContext('owner-2', {
            role: 'OWNER', storeId: '102', storeIds: ['102'], tenantId: '1', uId: 'owner-2',
        }).firestore();
        const wrongTenantDb = testEnv.authenticatedContext('owner-3', {
            role: 'OWNER', storeId: '101', storeIds: ['101'], tenantId: '2', uId: 'owner-3',
        }).firestore();
        const staffDb = testEnv.authenticatedContext('staff-1', {
            role: 'STAFF', storeId: '101', storeIds: ['101'], tenantId: '1', uId: 'staff-1',
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform-1', {
            platformRole: 'PLATFORM', uId: 'platform-1',
        }).firestore();
        const signalPath = 'masterOperationalState/1-abc-101';

        await assertFails(setDoc(doc(sameTenantOtherStoreDb, signalPath), {
            lastUpdatedAt: serverTimestamp(), operationalVersion: increment(1),
        }));
        await assertFails(setDoc(doc(wrongTenantDb, signalPath), {
            lastUpdatedAt: serverTimestamp(), operationalVersion: increment(1),
        }));
        await assertFails(setDoc(doc(staffDb, signalPath), {
            lastUpdatedAt: serverTimestamp(), operationalVersion: increment(1),
        }));
        await assertFails(setDoc(doc(ownerDb, signalPath), {
            lastUpdatedAt: serverTimestamp(), operationalVersion: 2,
        }));
        await assertFails(setDoc(doc(ownerDb, signalPath), {
            extra: true, lastUpdatedAt: serverTimestamp(), operationalVersion: increment(1),
        }));
        await assertFails(setDoc(doc(ownerDb, signalPath), {
            lastUpdatedAt: validTimestamp, operationalVersion: increment(1),
        }));
        await assertFails(setDoc(doc(platformDb, 'masterOperationalState/9-platform-909'), {
            extra: true, lastUpdatedAt: serverTimestamp(), operationalVersion: increment(1),
        }));
        await assertSucceeds(setDoc(doc(platformDb, 'masterOperationalState/9-platform-909'), {
            lastUpdatedAt: serverTimestamp(), operationalVersion: increment(1),
        }, { merge: true }));

        await assertSucceeds(setDoc(doc(ownerDb, signalPath), {
            lastUpdatedAt: serverTimestamp(), operationalVersion: increment(1),
        }, { merge: true }));
        await assertSucceeds(getDoc(doc(ownerDb, signalPath)));
        await assertSucceeds(getDoc(doc(sameTenantOtherStoreDb, signalPath)));
        await assertSucceeds(getDoc(doc(platformDb, signalPath)));
        await assertFails(getDoc(doc(wrongTenantDb, signalPath)));
        await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), signalPath)));

        await assertFails(updateDoc(doc(sameTenantOtherStoreDb, signalPath), {
            lastUpdatedAt: serverTimestamp(), operationalVersion: increment(1),
        }));
        await assertFails(updateDoc(doc(ownerDb, signalPath), {
            lastUpdatedAt: serverTimestamp(), operationalVersion: increment(2),
        }));
        await assertFails(updateDoc(doc(ownerDb, signalPath), { operationalVersion: 2 }));
        await assertSucceeds(updateDoc(doc(ownerDb, signalPath), {
            lastUpdatedAt: serverTimestamp(), operationalVersion: increment(1),
        }));
        await assertFails(deleteDoc(doc(ownerDb, signalPath)));
    } finally {
        await testEnv.cleanup();
    }
}

run().then(() => {
    process.stdout.write('Master operational state rules and runtime tests passed.\n');
}).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
