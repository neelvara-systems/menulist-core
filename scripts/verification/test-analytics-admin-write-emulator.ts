#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writePublicAnalyticsEventAdmin } from '../../src/lib/analytics/serverWrite';
import { firestoreAdmin } from '../../src/lib/firebase/firebaseAdmin';

const DOCUMENT_ID = '1_101_menu-project_daily_2026-07-11';
const documentRef = firestoreAdmin.collection('analytics').doc(DOCUMENT_ID);
const deliveryReceiptRef = (deliveryId: string) => firestoreAdmin
    .collection('analyticsDeliveryReceipts')
    .doc(createHash('sha256').update(`1:101:menu-project:2026-07-11:${deliveryId}`).digest('hex'));

const write = (updateData: Record<string, unknown>, deliveryId: string) => writePublicAnalyticsEventAdmin({
    updateData,
    tenantId: '1',
    storeId: '101',
    projectId: 'menu-project',
    dateString: '2026-07-11',
    storeTimeZone: 'UTC',
    businessDayEndTime: '03:00',
    deliveryId,
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    await Promise.all([
        documentRef.delete().catch(() => undefined),
        ...['a', 'b', 'c', 'd'].map((value) => deliveryReceiptRef(value.repeat(32)).delete().catch(() => undefined)),
    ]);

    await Promise.all([
        write({ totalViews: 2, 'viewsByItem.item_1': 2, 'itemNames.item_1': 'Lunch' }, 'a'.repeat(32)),
        write({ totalViews: 3, 'viewsByItem.item_2': 3, 'itemNames.item_2': 'Dinner' }, 'b'.repeat(32)),
    ]);

    const afterConcurrentWrites = await documentRef.get();
    const data = afterConcurrentWrites.data() || {};
    assert.equal(data.totalViews, 5, 'concurrent Admin writes must add shared counters');
    assert.equal(data.viewsByItem?.item_1, 2, 'concurrent nested map write must preserve first sibling');
    assert.equal(data.viewsByItem?.item_2, 3, 'concurrent nested map write must preserve second sibling');
    assert.equal(data.itemNames?.item_1, 'Lunch');
    assert.equal(data.itemNames?.item_2, 'Dinner');
    assert.equal(data.tId, '1');
    assert.equal(data.sId, '101');
    assert.equal(data.projectId, 'menu-project');
    assert.equal(data.localDate, '2026-07-11');

    await write({
        'viewsByItem.constructor': 100,
        'itemNames.prototype': 'forged',
        'hourlyClicksByItem.__proto__.12': 100,
    }, 'c'.repeat(32));
    const afterDangerousKeys = (await documentRef.get()).data() || {};
    assert.equal(afterDangerousKeys.totalViews, 5, 'rejected object-meta keys must not alter persisted counters');
    assert.equal(Object.prototype.hasOwnProperty.call(afterDangerousKeys.viewsByItem || {}, 'constructor'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(afterDangerousKeys.itemNames || {}, 'prototype'), false);

    const duplicateDeliveryId = 'd'.repeat(32);
    const firstDelivery = await write({ totalViews: 4 }, duplicateDeliveryId);
    const duplicateDelivery = await write({ totalViews: 4 }, duplicateDeliveryId);
    assert.ok(firstDelivery, 'accepted analytics delivery must return an application receipt');
    assert.ok(duplicateDelivery, 'duplicate analytics delivery must return a duplicate receipt');
    assert.equal(firstDelivery.status, 'applied');
    assert.equal(duplicateDelivery.status, 'duplicate');
    assert.equal((await documentRef.get()).data()?.totalViews, 9, 'duplicate delivery must not increment twice');

    await assert.rejects(
        () => writePublicAnalyticsEventAdmin({
            updateData: { totalViews: 1 },
            tenantId: '01',
            storeId: '101',
            projectId: 'menu-project',
            dateString: '2026-07-11',
            deliveryId: 'e'.repeat(32),
        }),
        /Invalid public analytics write scope/,
    );
    await assert.rejects(
        () => writePublicAnalyticsEventAdmin({
            updateData: { totalViews: 1 },
            tenantId: '1',
            storeId: '101',
            projectId: 'menu-project',
            dateString: '2026-02-30',
            deliveryId: 'f'.repeat(32),
        }),
        /Invalid public analytics write scope/,
    );

    process.stdout.write('Analytics Admin write emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
