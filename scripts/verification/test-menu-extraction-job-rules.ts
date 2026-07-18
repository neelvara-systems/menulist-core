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
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where,
} from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-menu-extraction-job-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const tId = '814';
const sId = '815';
const projectId = '814-default-815';

function job(status: 'pending' | 'preview_ready', id: string, overrides: Record<string, unknown> = {}) {
    const now = Timestamp.now();
    return {
        createdAt: now,
        currentStep: status === 'preview_ready' ? 'Ready for review' : 'Queued',
        id,
        projectId,
        sId,
        status,
        tId,
        uId: 'owner-user',
        updatedAt: now,
        ...overrides,
    };
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') },
    });

    try {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await Promise.all([
                setDoc(doc(context.firestore(), 'menuImageProcessingJobs', 'pending-job'), job('pending', 'pending-job')),
                setDoc(doc(context.firestore(), 'menuImageProcessingJobs', 'preview-job'), job('preview_ready', 'preview-job')),
                setDoc(doc(context.firestore(), 'menuImageProcessingJobs', 'token-owner-job'), job('pending', 'token-owner-job', {
                    uId: 'owner-record-id',
                })),
            ]);
        });

        const ownerDb = testEnv.authenticatedContext('owner-user', {
            storeIds: [sId],
            tenantId: Number(tId),
            uId: 'owner-record-id',
        }).firestore();
        const switchedTenantDb = testEnv.authenticatedContext('owner-user', {
            storeIds: ['999'],
            tenantId: 998,
            uId: 'owner-record-id',
        }).firestore();
        const switchedStoreDb = testEnv.authenticatedContext('owner-user', {
            storeIds: ['999'],
            tenantId: Number(tId),
            uId: 'owner-record-id',
        }).firestore();
        const foreignUserDb = testEnv.authenticatedContext('foreign-user', {
            storeIds: [sId],
            tenantId: Number(tId),
            uId: 'foreign-record-id',
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform-user', {
            platformRole: 'PLATFORM',
        }).firestore();

        await assertSucceeds(getDoc(doc(ownerDb, 'menuImageProcessingJobs', 'pending-job')));
        await assertSucceeds(getDoc(doc(ownerDb, 'menuImageProcessingJobs', 'token-owner-job')));
        await assertFails(getDoc(doc(switchedTenantDb, 'menuImageProcessingJobs', 'pending-job')));
        await assertFails(getDoc(doc(switchedStoreDb, 'menuImageProcessingJobs', 'pending-job')));
        await assertFails(getDoc(doc(foreignUserDb, 'menuImageProcessingJobs', 'pending-job')));
        await assertSucceeds(getDoc(doc(platformDb, 'menuImageProcessingJobs', 'pending-job')));

        const scopedActiveQuery = query(
            collection(ownerDb, 'menuImageProcessingJobs'),
            where('tId', '==', tId),
            where('sId', '==', sId),
            where('projectId', '==', projectId),
            where('uId', '==', 'owner-user'),
            where('status', 'in', ['pending', 'processing', 'preview_ready']),
        );
        const scopedSnapshot = await assertSucceeds(getDocs(scopedActiveQuery));
        assert.deepEqual(
            scopedSnapshot.docs.map((entry) => entry.id).sort(),
            ['pending-job', 'preview-job'],
        );

        await assertFails(getDocs(query(
            collection(ownerDb, 'menuImageProcessingJobs'),
            where('projectId', '==', projectId),
            where('uId', '==', 'owner-user'),
            where('status', 'in', ['pending', 'processing', 'preview_ready']),
        )));

        await assertSucceeds(updateDoc(doc(ownerDb, 'menuImageProcessingJobs', 'pending-job'), {
            completedAt: Timestamp.now(),
            status: 'cancelled',
            updatedAt: Timestamp.now(),
        }));
        await assertSucceeds(updateDoc(doc(ownerDb, 'menuImageProcessingJobs', 'preview-job'), {
            completedAt: Timestamp.now(),
            currentStep: 'Changes discarded by user',
            status: 'cancelled',
            updatedAt: Timestamp.now(),
        }));
        await assertFails(updateDoc(doc(switchedTenantDb, 'menuImageProcessingJobs', 'token-owner-job'), {
            completedAt: Timestamp.now(),
            status: 'cancelled',
            updatedAt: Timestamp.now(),
        }));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('Menu extraction job Firestore rules tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
