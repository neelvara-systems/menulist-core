#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-analytics-rules';
const ROOT = path.resolve(__dirname, '..', '..');

const validDailyAnalytics = (tId: string, sId: string) => ({
    analyticsScope: 'customer',
    grain: 'daily',
    lastUpdated: Timestamp.fromMillis(1_700_000_000_000),
    localDate: '2026-07-11',
    projectId: 'menu-project',
    sId,
    storeTimeZone: 'UTC',
    surface: 'menu',
    tId,
    totalViews: 1,
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');

    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') },
    });

    try {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(
                doc(context.firestore(), 'analytics', '1_101_menu-project_daily_2026-07-11'),
                validDailyAnalytics('1', '101'),
            );
        });

        const storeDb = testEnv.authenticatedContext('store-user', {
            tenantId: '1',
            storeId: '101',
            storeIds: ['101'],
            role: 'OWNER',
        }).firestore();
        const otherStoreDb = testEnv.authenticatedContext('other-store-user', {
            tenantId: '1',
            storeId: '102',
            storeIds: ['102'],
            role: 'OWNER',
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform-user', {
            platformRole: 'PLATFORM',
        }).firestore();
        const publicDb = testEnv.unauthenticatedContext().firestore();
        const existingRef = doc(storeDb, 'analytics', '1_101_menu-project_daily_2026-07-11');

        await assertSucceeds(getDoc(existingRef));
        await assertFails(getDoc(doc(otherStoreDb, 'analytics', existingRef.id)));
        await assertSucceeds(getDoc(doc(platformDb, 'analytics', existingRef.id)));
        await assertFails(getDoc(doc(publicDb, 'analytics', existingRef.id)));

        await assertFails(updateDoc(existingRef, { totalViews: 'forged-overwrite' }));
        await assertFails(updateDoc(existingRef, { totalViews: 999 }));
        await assertFails(setDoc(
            doc(storeDb, 'analytics', '1_101_menu-project_daily_2026-07-12'),
            validDailyAnalytics('1', '101'),
        ));
        await assertFails(setDoc(
            doc(platformDb, 'analytics', '1_101_menu-project_daily_2026-07-12'),
            validDailyAnalytics('1', '101'),
        ));
        for (const db of [storeDb, platformDb, publicDb]) {
            const receiptRef = doc(db, 'analyticsDeliveryReceipts', 'receipt-1');
            await assertFails(getDoc(receiptRef));
            await assertFails(setDoc(receiptRef, {
                deliveryId: 'a'.repeat(32),
                expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
                sId: '101',
                tId: '1',
            }));
        }
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('Analytics Firestore rules tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
