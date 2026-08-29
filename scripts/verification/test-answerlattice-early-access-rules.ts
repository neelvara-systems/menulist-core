#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { assertFails, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

const ROOT = path.resolve(__dirname, '..', '..');
const RULES_FILE = process.env.ANSWERLATTICE_RULES_FILE || 'firestore-answerlattice.rules';
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-early-access-rules';
const COLLECTION = 'answerlattice_earlyAccessRequests';
// ANSWERLATTICE_PRE_TENANT_RULE_FIXTURE: requests exist before any workspace is provisioned.

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, RULES_FILE), 'utf8') },
    });

    try {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), COLLECTION, 'seed-request'), {
                pId: 'AL',
                name: 'Seed Founder',
                workEmail: 'seed@example.com',
                status: 'pending',
            });
        });

        const contexts = [
            testEnv.unauthenticatedContext().firestore(),
            testEnv.authenticatedContext('workspace-owner', {
                role: 'OWNER', tenantId: '1', storeId: '101', uId: 'workspace-owner',
            }).firestore(),
            testEnv.authenticatedContext('platform-admin', {
                role: 'PLATFORM', platformRole: 'PLATFORM', uId: 'platform-admin',
            }).firestore(),
        ];

        for (const clientDb of contexts) {
            await assertFails(getDoc(doc(clientDb, COLLECTION, 'seed-request')));
            await assertFails(getDocs(collection(clientDb, COLLECTION)));
            await assertFails(setDoc(doc(clientDb, COLLECTION, 'forged-request'), {
                pId: 'AL', name: 'Forged', workEmail: 'forged@example.com', status: 'approved',
            }));
        }
    } finally {
        await testEnv.cleanup();
    }
}

run()
    .then(() => process.stdout.write(`Answerlattice early-access client isolation passed (${RULES_FILE}).\n`))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    });
