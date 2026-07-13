#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-compliance-pages-rules';
const ROOT = path.resolve(__dirname, '..', '..');

const complianceOverride = {
    modifiedOn: Timestamp.fromMillis(1_700_000_000_000),
    privacyOverride: 'Owner-reviewed privacy policy text.',
    sId: 202,
    tId: 101,
};

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
            await setDoc(doc(context.firestore(), 'compliancePages', '202'), complianceOverride);
        });

        const publicDb = testEnv.unauthenticatedContext().firestore();
        const ownerDb = testEnv.authenticatedContext('owner-user', {
            platformRole: 'OWNER',
            role: 'owner',
            storeIds: [202],
            tenantId: 101,
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform-user', {
            platformRole: 'PLATFORM',
        }).firestore();

        await assertSucceeds(getDoc(doc(publicDb, 'compliancePages', '202')));
        await assertSucceeds(getDoc(doc(ownerDb, 'compliancePages', '202')));

        await assertFails(setDoc(doc(publicDb, 'compliancePages', 'public-write'), complianceOverride));
        await assertFails(setDoc(doc(ownerDb, 'compliancePages', '203'), {
            ...complianceOverride,
            sId: 203,
        }));
        await assertFails(updateDoc(doc(ownerDb, 'compliancePages', '202'), {
            privacyOverride: '<script>direct client bypass</script>',
        }));
        await assertFails(setDoc(doc(platformDb, 'compliancePages', 'platform-write'), complianceOverride));
        await assertFails(deleteDoc(doc(ownerDb, 'compliancePages', '202')));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('Compliance page Firestore rules tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
