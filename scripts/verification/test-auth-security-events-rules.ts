#!/usr/bin/env ts-node

import fs from 'node:fs';
import path from 'node:path';
import {
    assertFails,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-auth-security-events-rules';
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
        const publicDb = testEnv.unauthenticatedContext().firestore();
        const ownerDb = testEnv.authenticatedContext('owner-user', {
            platformRole: 'OWNER',
            tenantId: 1,
            storeIds: ['1'],
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform-user', {
            platformRole: 'PLATFORM',
        }).firestore();
        const event = {
            email: 'rules@example.com',
            eventType: 'login_failed',
            expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
            timestamp: Timestamp.now(),
        };

        for (const db of [publicDb, ownerDb, platformDb]) {
            await assertFails(getDoc(doc(db, 'authSecurityEvents', 'event')));
            await assertFails(setDoc(doc(db, 'authSecurityEvents', 'event'), event));
        }
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('Auth security event Firestore rules tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
