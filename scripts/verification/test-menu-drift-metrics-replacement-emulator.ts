#!/usr/bin/env ts-node

import assert = require('node:assert/strict');
import { admin, firestoreAdmin } from '../../functions/src/firebaseAdmin';
import {
    readStoreDriftAccumulators,
    writeProjectDriftMetrics,
    type ProjectDriftAccumulators,
} from '../../functions/src/analytics/menuDriftMetrics';

const COLLECTION = 'menuItemState';

async function clearCollection(
    collection: FirebaseFirestore.CollectionReference,
): Promise<void> {
    const snapshot = await collection.get();
    if (snapshot.empty) return;
    const batch = collection.firestore.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const db = firestoreAdmin;
    const changeLog = db.collection('menuChangeLog').doc('1').collection('101');
    const metrics = db.collection(COLLECTION)
        .doc('1')
        .collection('101')
        .doc('project-101')
        .collection('metrics');
    await Promise.all([clearCollection(metrics), clearCollection(changeLog)]);

    const windowStartTimestamp = admin.firestore.Timestamp.fromDate(new Date('2026-06-21T00:00:00.000Z'));
    const windowEndTimestamp = admin.firestore.Timestamp.fromDate(new Date('2026-07-21T23:59:59.999Z'));
    await Promise.all([
        changeLog.doc('current-price').set({
            projectId: 'project-101',
            itemId: 'item-current',
            changeType: 'PRICE',
            timestamp: admin.firestore.Timestamp.fromDate(new Date('2026-07-20T00:00:00.000Z')),
        }),
        changeLog.doc('forged-future-price').set({
            projectId: 'project-101',
            itemId: 'item-current',
            changeType: 'PRICE',
            timestamp: admin.firestore.Timestamp.fromDate(new Date('2027-07-20T00:00:00.000Z')),
        }),
    ]);
    const boundedSource = await readStoreDriftAccumulators(
        db,
        '1',
        '101',
        new Set(['project-101']),
        windowStartTimestamp,
        windowEndTimestamp,
    );
    assert.equal(
        boundedSource.changesByProject.get('project-101')?.get('item-current')?.priceChangeCount,
        1,
        'future-dated change-log rows must not poison the current rolling window',
    );

    const currentRef = metrics.doc('item-current');
    const agedOutRef = metrics.doc('item-aged-out');
    await Promise.all([
        currentRef.set({
            itemId: 'item-current',
            projectId: 'project-101',
            tId: '1',
            sId: '101',
            priceChangeCount30d: 99,
            availabilityToggleCount30d: 99,
            unknownLegacyField: 'must-be-pruned',
        }),
        agedOutRef.set({
            itemId: 'item-aged-out',
            projectId: 'project-101',
            unknownLegacyField: 'must-be-deleted',
        }),
    ]);

    const source: ProjectDriftAccumulators = new Map([
        ['item-current', {
            priceChangeCount: 2,
            availabilityToggleCount: 1,
            lastPriceChange: admin.firestore.Timestamp.fromDate(new Date('2026-07-20T00:00:00.000Z')),
            lastAvailabilityChange: admin.firestore.Timestamp.fromDate(new Date('2026-07-19T00:00:00.000Z')),
        }],
    ]);
    const result = await writeProjectDriftMetrics(
        db,
        '1',
        '101',
        'project-101',
        source,
        '2026-06-21',
        '2026-07-21',
    );

    assert.equal(result.itemsProcessed, 1);
    assert.equal(result.writes, 2, 'one stale delete and one exact replacement are expected');

    const [current, agedOut] = await Promise.all([currentRef.get(), agedOutRef.get()]);
    assert.equal(agedOut.exists, false, 'an item outside the rolling source window must be removed');
    assert.deepEqual(
        Object.keys(current.data() || {}).sort(),
        [
            '_availabilityChurn',
            '_highVolatility',
            '_priceStale',
            '_priceStaleStatus',
            'availabilityToggleCount30d',
            'computedAt',
            'daysSinceLastAvailabilityChange',
            'daysSinceLastPriceChange',
            'itemId',
            'priceChangeCount30d',
            'projectId',
            'sId',
            'tId',
            'windowEnd',
            'windowStart',
        ].sort(),
        'exact replacement must prune unknown and retired derived fields',
    );
    assert.equal(current.get('priceChangeCount30d'), 2);
    assert.equal(current.get('availabilityToggleCount30d'), 1);
    assert.equal(current.get('unknownLegacyField'), undefined);
    assert.ok(current.get('computedAt') instanceof admin.firestore.Timestamp);

    const emptyResult = await writeProjectDriftMetrics(
        db,
        '1',
        '101',
        'project-101',
        new Map(),
        '2026-06-22',
        '2026-07-22',
    );
    assert.equal(emptyResult.itemsProcessed, 0);
    assert.equal(emptyResult.writes, 1);
    assert.equal((await currentRef.get()).exists, false, 'an empty rolling source must clear prior metrics');

    process.stdout.write('Menu drift metrics replacement emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
