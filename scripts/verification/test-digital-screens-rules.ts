#!/usr/bin/env ts-node

import fs from 'node:fs';
import path from 'node:path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
    collection,
    doc,
    type Firestore,
    getDoc,
    getDocs,
    setDoc,
    Timestamp,
} from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-digital-screens-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const SAFE_SCREEN_PATH = 'platformSummary/screen_42';
const DISABLED_SCREEN_PATH = 'platformSummary/screen_43';
const LEGACY_SCREEN_PATH = 'platformSummary/screen_44';

const publicScreenState = (storeId: string, enabled = true) => ({
    contentVersion: 1,
    enabled,
    lastContentChangeAt: Timestamp.fromDate(new Date('2026-07-16T06:00:00.000Z')),
    storeId,
    updatedAt: Timestamp.fromDate(new Date('2026-07-16T06:00:00.000Z')),
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const testEnvironment = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'),
        },
    });

    try {
        await testEnvironment.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore() as unknown as Firestore;
            await Promise.all([
                setDoc(doc(db, SAFE_SCREEN_PATH), publicScreenState('42')),
                setDoc(doc(db, DISABLED_SCREEN_PATH), publicScreenState('43', false)),
                setDoc(doc(db, LEGACY_SCREEN_PATH), {
                    ...publicScreenState('44'),
                    screenToken: 'legacy-public-bearer-token',
                }),
            ]);
        });

        const publicDb = testEnvironment.unauthenticatedContext().firestore() as unknown as Firestore;
        const safeSnapshot = await assertSucceeds(getDoc(doc(publicDb, SAFE_SCREEN_PATH)));
        if (safeSnapshot.data()?.screenToken !== undefined) {
            throw new Error('Public screen projection exposed a bearer screen token');
        }

        // Disabled state stays exactly readable so a connected display can fail
        // closed immediately instead of waiting for the next page-data request.
        await assertSucceeds(getDoc(doc(publicDb, DISABLED_SCREEN_PATH)));

        // A legacy token-bearing mirror must stop being public, and public users
        // must never enumerate platformSummary to discover store identifiers.
        await assertFails(getDoc(doc(publicDb, LEGACY_SCREEN_PATH)));
        await assertFails(getDocs(collection(publicDb, 'platformSummary')));

        const ownerDb = testEnvironment.authenticatedContext('owner-42', {
            role: 'OWNER',
            storeId: '42',
            storeIds: ['42'],
            tenantId: '1',
            uId: 'owner-42',
        }).firestore() as unknown as Firestore;

        await assertSucceeds(setDoc(doc(ownerDb, SAFE_SCREEN_PATH), {
            ...publicScreenState('42'),
            contentVersion: 2,
        }));
        await assertFails(setDoc(doc(ownerDb, SAFE_SCREEN_PATH), {
            ...publicScreenState('42'),
            contentVersion: 3,
            screenToken: 'must-not-be-written',
        }));

        process.stdout.write('Digital Screens Firestore rules tests passed.\n');
    } finally {
        await testEnvironment.cleanup();
    }
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
