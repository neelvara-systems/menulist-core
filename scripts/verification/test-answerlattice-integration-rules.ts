#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-integration-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const RULES_FILE = process.env.ANSWERLATTICE_RULES_FILE === 'firestore.rules'
    ? 'firestore.rules'
    : 'firestore-answerlattice.rules';

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, RULES_FILE), 'utf8') },
    });

    const configPath = 'platformSummary/integrationConfig_1_101';
    const healthPath = 'platformSummary/integrationHealth_1_101';
    const eventPath = 'answerlattice_integrationEvents/event-1';
    const deliveryPath = 'answerlattice_integrationDeliveryLogs/delivery-1';
    try {
        await testEnv.withSecurityRulesDisabled(async context => {
            const adminDb = context.firestore();
            await setDoc(doc(adminDb, configPath), {
                pId: 'AL', tId: 1, sId: 101,
                slack: { enabled: true, webhookUrl: 'https://hooks.slack.com/services/secret', eventFilters: [] },
                modifiedOn: Timestamp.now(),
            });
            await setDoc(doc(adminDb, healthPath), {
                pId: 'AL', tId: 1, sId: 101,
                adapters: {}, modifiedOn: Timestamp.now(),
            });
            await setDoc(doc(adminDb, eventPath), { pId: 'AL', tId: 1, sId: 101, status: 'pending' });
            await setDoc(doc(adminDb, deliveryPath), { pId: 'AL', tId: 1, sId: 101, status: 'delivered' });
        });

        const ownerDb = testEnv.authenticatedContext('owner-1', {
            role: 'OWNER', tenantId: '1', storeId: '101', uId: 'owner-1', canManageIntegrations: true,
        }).firestore();
        const otherDb = testEnv.authenticatedContext('owner-2', {
            role: 'OWNER', tenantId: '2', storeId: '202', uId: 'owner-2', canManageIntegrations: true,
        }).firestore();
        const unprivilegedDb = testEnv.authenticatedContext('staff-1', {
            role: 'staff', tenantId: '1', storeId: '101', uId: 'staff-1', canManageIntegrations: false,
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform-1', {
            platformRole: 'PLATFORM', uId: 'platform-1',
        }).firestore();

        await assertFails(getDoc(doc(ownerDb, configPath)));
        await assertFails(updateDoc(doc(ownerDb, configPath), { 'slack.enabled': false }));
        await assertFails(setDoc(doc(ownerDb, 'platformSummary/integrationConfig_1_102'), {
            pId: 'AL', tId: 1, sId: 101, slack: {}, modifiedOn: Timestamp.now(),
        }));
        await assertSucceeds(getDoc(doc(ownerDb, healthPath)));
        await assertSucceeds(getDoc(doc(ownerDb, eventPath)));
        await assertSucceeds(getDoc(doc(ownerDb, deliveryPath)));
        await assertFails(getDoc(doc(unprivilegedDb, eventPath)));
        await assertFails(getDoc(doc(unprivilegedDb, deliveryPath)));
        await assertFails(getDoc(doc(otherDb, eventPath)));
        await assertFails(updateDoc(doc(ownerDb, healthPath), { modifiedOn: Timestamp.now() }));
        await assertFails(getDoc(doc(otherDb, healthPath)));
        await assertSucceeds(getDoc(doc(platformDb, configPath)));
        await assertSucceeds(updateDoc(doc(platformDb, configPath), { modifiedOn: Timestamp.now() }));

        console.log(`Answerlattice integration secret rules passed for ${RULES_FILE}.`);
    } finally {
        await testEnv.cleanup();
    }
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
