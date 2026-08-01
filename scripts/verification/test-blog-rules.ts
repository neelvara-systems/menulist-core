#!/usr/bin/env ts-node

import fs from 'node:fs';
import path from 'node:path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-blog-rules';
const ROOT = path.resolve(__dirname, '..', '..');

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
            await setDoc(doc(context.firestore(), 'blogs', 'legacy-private'), {
                title: 'Dormant platform article',
                modifiedBy: 'Private Founder Name',
                role: 'PLATFORM',
                tId: 1,
                sId: 1,
                uId: 'platform-user',
            });
        });

        const publicDb = testEnv.unauthenticatedContext().firestore();
        const ownerDb = testEnv.authenticatedContext('owner-user', {
            platformRole: 'OWNER',
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform-user', {
            platformRole: 'PLATFORM',
        }).firestore();

        await assertFails(getDoc(doc(publicDb, 'blogs', 'legacy-private')));
        await assertFails(getDoc(doc(ownerDb, 'blogs', 'legacy-private')));
        await assertSucceeds(getDoc(doc(platformDb, 'blogs', 'legacy-private')));
        await assertFails(setDoc(doc(publicDb, 'blogs', 'public-write'), { title: 'Denied' }));
        await assertFails(setDoc(doc(ownerDb, 'blogs', 'owner-write'), { title: 'Denied' }));
        await assertSucceeds(setDoc(doc(platformDb, 'blogs', 'platform-write'), { title: 'Allowed' }));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('Blog Firestore rules tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
