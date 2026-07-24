#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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
import {
    getOwnerControlUsageMonthKey,
    parseOwnerControlUsageDocument,
} from '../../src/data/shared/ownerControlUsageContract';
import {
    shouldRetryOwnerControlMonthBoundary,
} from '../../src/lib/ownerControlUsage/writeOwnerControlUsage';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-owner-control-usage-rules';
const ROOT = path.resolve(__dirname, '..', '..');

function currentUtcMonth(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function parseUsage(value: unknown, documentId: string) {
    return parseOwnerControlUsageDocument(
        value,
        documentId,
        (candidate): candidate is Timestamp => candidate instanceof Timestamp,
        (timestamp) => timestamp.toMillis(),
    );
}

async function run(): Promise<void> {
    assert.equal(
        fs.readFileSync(path.join(ROOT, 'src/data/shared/ownerControlUsageContract.ts'), 'utf8'),
        fs.readFileSync(path.join(ROOT, 'functions/src/sharedData/ownerControlUsageContract.ts'), 'utf8'),
        'App and Functions owner-control contracts must remain byte-identical',
    );

    const timestamp = Timestamp.fromMillis(1_700_000_000_000);
    const valid = {
        tId: '1',
        sId: '101',
        counts: { ownerBoost: 2 },
        lastUsed: { ownerBoost: timestamp },
        monthlyUsage: { '2023-11': { ownerBoost: 2 } },
        firstTrackedAt: timestamp,
        lastUpdatedAt: timestamp,
    };
    assert.deepEqual(parseUsage(valid, '1_101'), valid);
    for (const malformed of [
        { ...valid, tId: 1 },
        { ...valid, counts: { ownerBoost: 1 } },
        { ...valid, counts: { unknownControl: 2 } },
        { ...valid, monthlyUsage: { '2023-13': { ownerBoost: 2 } } },
        { ...valid, monthlyUsage: { '2023-12': { ownerBoost: 2 } } },
        { ...valid, lastUpdatedAt: Timestamp.fromMillis(timestamp.toMillis() + 1) },
        { ...valid, firstTrackedAt: Timestamp.fromMillis(-1) },
        { ...valid, lastUpdatedAt: new Date() },
        { ...valid, extra: true },
        {
            ...valid,
            lastUsed: { ownerBoost: Timestamp.fromDate(new Date('2100-01-01T00:00:00.000Z')) },
            monthlyUsage: { '2100-01': { ownerBoost: 2 } },
            firstTrackedAt: Timestamp.fromDate(new Date('2100-01-01T00:00:00.000Z')),
            lastUpdatedAt: Timestamp.fromDate(new Date('2100-01-01T00:00:00.000Z')),
        },
    ]) {
        assert.equal(parseUsage(malformed, '1_101'), null);
    }
    assert.equal(parseUsage(valid, '1_102'), null);
    assert.equal(
        getOwnerControlUsageMonthKey(new Date('2026-01-31T23:59:59.999Z')),
        '2026-01',
    );
    assert.equal(
        getOwnerControlUsageMonthKey(new Date('2026-02-01T00:00:00.000Z')),
        '2026-02',
    );
    assert.equal(
        shouldRetryOwnerControlMonthBoundary(
            { code: 'permission-denied' },
            '2026-01',
            '2026-02',
            0,
        ),
        true,
    );
    assert.equal(
        shouldRetryOwnerControlMonthBoundary(
            { code: 'permission-denied' },
            '2026-01',
            '2026-02',
            1,
        ),
        false,
    );
    assert.equal(
        shouldRetryOwnerControlMonthBoundary(
            { code: 'unavailable' },
            '2026-01',
            '2026-02',
            0,
        ),
        false,
    );

    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }
    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') },
    });

    try {
        const ownerDb = testEnv.authenticatedContext('owner-1', {
            role: 'OWNER', storeId: '101', storeIds: ['101'], tenantId: '1', uId: 'owner-1',
        }).firestore();
        const otherStoreDb = testEnv.authenticatedContext('owner-2', {
            role: 'OWNER', storeId: '102', storeIds: ['102'], tenantId: '1', uId: 'owner-2',
        }).firestore();
        const wrongTenantDb = testEnv.authenticatedContext('owner-3', {
            role: 'OWNER', storeId: '101', storeIds: ['101'], tenantId: '2', uId: 'owner-3',
        }).firestore();
        const staffDb = testEnv.authenticatedContext('staff-1', {
            role: 'STAFF', storeId: '103', storeIds: ['103'], tenantId: '1', uId: 'staff-1',
        }).firestore();
        const usageRef = doc(ownerDb, 'ownerControlUsage/1_101');
        const month = currentUtcMonth();

        await assertSucceeds(setDoc(usageRef, {
            tId: '1',
            sId: '101',
            counts: { ownerBoost: 1 },
            lastUsed: { ownerBoost: serverTimestamp() },
            monthlyUsage: { [month]: { ownerBoost: 1 } },
            firstTrackedAt: serverTimestamp(),
            lastUpdatedAt: serverTimestamp(),
        }));
        await assertSucceeds(updateDoc(usageRef, {
            'counts.screenOverride': increment(1),
            'lastUsed.screenOverride': serverTimestamp(),
            [`monthlyUsage.${month}.screenOverride`]: increment(1),
            lastUpdatedAt: serverTimestamp(),
        }));
        await assertSucceeds(updateDoc(usageRef, {
            'counts.ownerBoost': increment(1),
            'lastUsed.ownerBoost': serverTimestamp(),
            [`monthlyUsage.${month}.ownerBoost`]: increment(1),
            lastUpdatedAt: serverTimestamp(),
        }));

        const snapshot = await assertSucceeds(getDoc(usageRef));
        const parsed = parseUsage(snapshot.data(), snapshot.id);
        assert.ok(parsed);
        assert.deepEqual(parsed.counts, { ownerBoost: 2, screenOverride: 1 });
        assert.deepEqual(parsed.monthlyUsage[month], { ownerBoost: 2, screenOverride: 1 });

        await assertFails(getDoc(doc(otherStoreDb, 'ownerControlUsage/1_101')));
        await assertFails(getDoc(doc(wrongTenantDb, 'ownerControlUsage/1_101')));
        await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'ownerControlUsage/1_101')));
        await assertFails(updateDoc(doc(otherStoreDb, 'ownerControlUsage/1_101'), {
            'counts.ownerBoost': increment(1),
            'lastUsed.ownerBoost': serverTimestamp(),
            [`monthlyUsage.${month}.ownerBoost`]: increment(1),
            lastUpdatedAt: serverTimestamp(),
        }));
        await assertFails(setDoc(doc(staffDb, 'ownerControlUsage/1_103'), {
            tId: '1',
            sId: '103',
            counts: { ownerBoost: 1 },
            lastUsed: { ownerBoost: serverTimestamp() },
            monthlyUsage: { [month]: { ownerBoost: 1 } },
            firstTrackedAt: serverTimestamp(),
            lastUpdatedAt: serverTimestamp(),
        }));

        await assertFails(updateDoc(usageRef, {
            'counts.ownerBoost': increment(2),
            [`lastUsed.ownerBoost`]: serverTimestamp(),
            [`monthlyUsage.${month}.ownerBoost`]: increment(2),
            lastUpdatedAt: serverTimestamp(),
        }));
        await assertFails(updateDoc(usageRef, {
            'counts.ownerBoost': increment(1),
            [`lastUsed.ownerBoost`]: Timestamp.now(),
            [`monthlyUsage.${month}.ownerBoost`]: increment(1),
            lastUpdatedAt: Timestamp.now(),
        }));
        await assertFails(updateDoc(usageRef, { extra: true }));
        await assertFails(updateDoc(usageRef, { tId: '2' }));
        await assertFails(deleteDoc(usageRef));

        await assertFails(setDoc(doc(otherStoreDb, 'ownerControlUsage/1_102'), {
            tId: '1',
            sId: '102',
            counts: { ownerBoost: 1, screenOverride: 1 },
            lastUsed: {
                ownerBoost: serverTimestamp(),
                screenOverride: serverTimestamp(),
            },
            monthlyUsage: {
                [month]: { ownerBoost: 1, screenOverride: 1 },
            },
            firstTrackedAt: serverTimestamp(),
            lastUpdatedAt: serverTimestamp(),
        }));
    } finally {
        await testEnv.cleanup();
    }
}

run().then(() => {
    process.stdout.write('Owner control usage rules, transaction, and runtime tests passed.\n');
}).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
