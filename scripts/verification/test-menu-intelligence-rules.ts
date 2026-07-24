#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-menu-intelligence-rules';
const ROOT = path.resolve(__dirname, '..', '..');

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }
    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') },
    });

    try {
        const documentPath = 'menuIntelligence/1_101_menu';
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), documentPath), {
                tId: '1',
                sId: '101',
                projectId: 'menu',
                computedAt: Timestamp.now(),
                privateConfidence: 0.8,
            });
        });

        const platformDb = testEnv.authenticatedContext('platform-1', {
            platformRole: 'PLATFORM',
        }).firestore();
        const ownerDb = testEnv.authenticatedContext('owner-1', {
            role: 'OWNER', tenantId: '1', storeId: '101', storeIds: ['101'],
        }).firestore();
        const staffDb = testEnv.authenticatedContext('staff-1', {
            role: 'STAFF', tenantId: '1', storeId: '101', storeIds: ['101'],
        }).firestore();

        const platformSnapshot = await assertSucceeds(getDoc(doc(platformDb, documentPath)));
        assert.equal(platformSnapshot.exists(), true);
        await assertFails(getDoc(doc(ownerDb, documentPath)));
        await assertFails(getDoc(doc(staffDb, documentPath)));
        await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), documentPath)));
        await assertFails(setDoc(doc(platformDb, documentPath), { privateConfidence: 1 }));
    } finally {
        await testEnv.cleanup();
    }
}

run().then(() => {
    process.stdout.write('Menu Intelligence private-read Firestore rules tests passed.\n');
}).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
