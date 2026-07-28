#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import {
    assertFails,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    Timestamp,
    where,
} from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-reviews-reputation-rules';
const ROOT = path.resolve(__dirname, '..', '..');

const reviewState = (tId: number | string, sId: number | string) => ({
    autoExpiresAt: Timestamp.fromMillis(1_900_000_000_000),
    blockActive: true,
    classification: 'negative_high_risk',
    classifiedOn: Timestamp.fromMillis(1_700_000_000_000),
    classifierVersion: 'rules-v1',
    escalationActive: false,
    id: `review-${tId}-${sId}`,
    sId,
    tId,
    updatedOn: Timestamp.fromMillis(1_700_000_000_000),
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'),
        },
    });

    try {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(doc(db, 'reviewsState', 'review-1-101'), reviewState(1, 101));
            await setDoc(doc(db, 'reviewsState', 'review-1-102'), reviewState(1, 102));
            await setDoc(doc(db, 'reviewsState', 'review-2-201'), reviewState(2, 201));
            await setDoc(doc(db, 'reviewsState', 'review-string-scope'), reviewState('1', '101'));
            await setDoc(doc(db, 'reviewsState', 'review-missing-scope'), {
                blockActive: true,
                tId: 1,
            });
        });

        const ownerDb = testEnv.authenticatedContext('owner-1-101', {
            role: 'OWNER',
            storeId: '101',
            storeIds: ['101'],
            tenantId: '1',
        }).firestore();
        const multiStoreDb = testEnv.authenticatedContext('owner-1-multi', {
            role: 'OWNER',
            storeId: '102',
            storeIds: ['101', '102'],
            tenantId: '1',
        }).firestore();
        const otherTenantDb = testEnv.authenticatedContext('owner-2-201', {
            role: 'OWNER',
            storeId: '201',
            storeIds: ['201'],
            tenantId: '2',
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform-user', {
            platformRole: 'PLATFORM',
        }).firestore();
        const publicDb = testEnv.unauthenticatedContext().firestore();

        await assertFails(getDoc(doc(ownerDb, 'reviewsState', 'review-1-101')));
        await assertFails(getDoc(doc(ownerDb, 'reviewsState', 'review-string-scope')));
        await assertFails(getDoc(doc(multiStoreDb, 'reviewsState', 'review-1-101')));
        await assertFails(getDoc(doc(ownerDb, 'reviewsState', 'review-1-102')));
        await assertFails(getDoc(doc(ownerDb, 'reviewsState', 'review-2-201')));
        await assertFails(getDoc(doc(otherTenantDb, 'reviewsState', 'review-1-101')));
        await assertFails(getDoc(doc(ownerDb, 'reviewsState', 'review-missing-scope')));
        await assertFails(getDoc(doc(platformDb, 'reviewsState', 'review-missing-scope')));
        await assertFails(getDoc(doc(publicDb, 'reviewsState', 'review-1-101')));

        await assertFails(getDocs(query(
            collection(ownerDb, 'reviewsState'),
            where('tId', '==', 1),
            where('sId', '==', 101),
        )));
        await assertFails(getDocs(query(
            collection(ownerDb, 'reviewsState'),
            where('tId', '==', 1),
        )));

        await assertFails(setDoc(
            doc(ownerDb, 'reviewsState', 'owner-write'),
            reviewState(1, 101),
        ));
        await assertFails(setDoc(
            doc(platformDb, 'reviewsState', 'platform-write'),
            reviewState(1, 101),
        ));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('Reviews and reputation Firestore rules tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
