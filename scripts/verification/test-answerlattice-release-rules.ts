#!/usr/bin/env ts-node

import fs from 'node:fs';
import path from 'node:path';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { seedActiveAnswerlatticeRuleWorkspace } from './answerlattice-rule-test-fixtures';

const projectId = process.env.GCLOUD_PROJECT || 'demo-answerlattice-release-rules';
const root = path.resolve(__dirname, '..', '..');
const rulesFile = process.env.ANSWERLATTICE_RULES_FILE || 'firestore-answerlattice.rules';

async function run(): Promise<void> {
    const environment = await initializeTestEnvironment({
        projectId,
        firestore: { rules: fs.readFileSync(path.join(root, rulesFile), 'utf8') },
    });
    try {
        const now = Timestamp.now();
        const release = {
            pId: 'AL', tId: 1, sId: 101, versionLabel: '1.0.0', versionNormalized: 1_000_000,
            releasedAt: now, entityChanges: ['billing'], status: 'pending',
            requestId: 'release_request_1', requestFingerprint: 'a'.repeat(64),
            createdOn: now, createdBy: 'Owner', modifiedOn: now, modifiedBy: 'Owner',
        };
        await environment.withSecurityRulesDisabled(async (context) => {
            await seedActiveAnswerlatticeRuleWorkspace(context.firestore());
            await seedActiveAnswerlatticeRuleWorkspace(context.firestore(), { tenantId: 1, storeId: 102 });
            await seedActiveAnswerlatticeRuleWorkspace(context.firestore(), { tenantId: 2, storeId: 202 });
            await setDoc(doc(context.firestore(), 'answerlattice_releases', 'release-1'), release);
        });
        const ownerDb = environment.authenticatedContext('owner-1', {
            role: 'OWNER', tenantId: '1', storeId: '101', uId: 'owner-1',
        }).firestore();
        const otherDb = environment.authenticatedContext('owner-2', {
            role: 'OWNER', tenantId: '2', storeId: '202', uId: 'owner-2',
        }).firestore();
        const siblingStoreDb = environment.authenticatedContext('owner-3', {
            role: 'OWNER', tenantId: '1', storeId: '102', uId: 'owner-3',
        }).firestore();

        await assertSucceeds(getDoc(doc(ownerDb, 'answerlattice_releases', 'release-1')));
        await assertFails(getDoc(doc(siblingStoreDb, 'answerlattice_releases', 'release-1')));
        await assertFails(getDoc(doc(otherDb, 'answerlattice_releases', 'release-1')));
        await assertFails(setDoc(doc(ownerDb, 'answerlattice_releases', 'release-client'), release));
        await assertFails(updateDoc(doc(ownerDb, 'answerlattice_releases', 'release-1'), { status: 'active' }));
    } finally {
        await environment.cleanup();
    }
    process.stdout.write('Answerlattice release rules tests passed.\n');
}

run().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exit(1);
});
