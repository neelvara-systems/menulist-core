#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-workspace-lifecycle-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const RULES_FILE = process.env.ANSWERLATTICE_RULES_FILE === 'firestore.rules'
    ? 'firestore.rules'
    : 'firestore-answerlattice.rules';
const USES_SHARED_RULES = RULES_FILE === 'firestore.rules';

const storeData = (overrides: Record<string, unknown> = {}) => ({
    active: true,
    authDisabled: false,
    deleted: false,
    id: 101,
    pId: 'AL',
    productId: 'AL',
    sId: 101,
    storeId: 101,
    tId: 1,
    tenantId: 1,
    ...overrides,
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const testEnv = await initializeTestEnvironment({
        firestore: { rules: fs.readFileSync(path.join(ROOT, RULES_FILE), 'utf8') },
        projectId: PROJECT_ID,
    });

    try {
        await testEnv.clearFirestore();
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'stores', '101'), storeData());
            await setDoc(doc(context.firestore(), 'tenants', '1'), {
                active: true,
                pId: 'AL',
                productId: 'AL',
                tId: 1,
                tenantId: 1,
            });
            await setDoc(doc(context.firestore(), 'answerlattice_canonicalAnswers', 'answer-1'), {
                answer: 'Use the approved workflow.',
                pId: 'AL',
                sId: 101,
                status: 'approved',
                tId: 1,
            });
        });

        const ownerDb = testEnv.authenticatedContext('owner-1', {
            canManageKnowledge: true,
            pId: 'AL',
            role: 'OWNER',
            storeId: '101',
            storeIds: ['101'],
            tenantId: '1',
            uId: 'owner-1',
        }).firestore();
        const otherTenantDb = testEnv.authenticatedContext('owner-2', {
            canManageKnowledge: true,
            pId: 'AL',
            role: 'OWNER',
            storeId: '202',
            storeIds: ['202'],
            tenantId: '2',
            uId: 'owner-2',
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform-1', {
            pId: 'AL',
            platformRole: 'PLATFORM',
            role: 'PLATFORM',
            uId: 'platform-1',
        }).firestore();
        const answerRef = doc(ownerDb, 'answerlattice_canonicalAnswers', 'answer-1');
        const ownerStoreRef = doc(ownerDb, 'stores', '101');
        const platformStoreRef = doc(platformDb, 'stores', '101');

        await assertSucceeds(getDoc(answerRef));
        await assertFails(getDoc(doc(otherTenantDb, 'answerlattice_canonicalAnswers', 'answer-1')));
        await assertSucceeds(getDoc(doc(platformDb, 'answerlattice_canonicalAnswers', 'answer-1')));
        await assertSucceeds(getDoc(ownerStoreRef));
        await assertFails(updateDoc(ownerStoreRef, { active: false }));
        await assertSucceeds(getDoc(platformStoreRef));
        if (USES_SHARED_RULES) {
            await assertSucceeds(getDoc(doc(ownerDb, 'tenants', '1')));
            await assertSucceeds(getDoc(doc(platformDb, 'tenants', '1')));
        } else {
            await assertFails(getDoc(doc(ownerDb, 'tenants', '1')));
        }

        if (!USES_SHARED_RULES) {
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const {
                    authDisabled: _authDisabled,
                    deleted: _deleted,
                    ...activeStoreWithoutOptionalFlags
                } = storeData();
                await setDoc(doc(context.firestore(), 'stores', '101'), activeStoreWithoutOptionalFlags);
            });
            await assertSucceeds(getDoc(answerRef));
            await assertSucceeds(getDoc(ownerStoreRef));
        }

        for (const closedFields of [
            { active: false },
            { active: true, deleted: true },
            { active: true, deleted: false, authDisabled: true },
        ]) {
            await testEnv.withSecurityRulesDisabled(async (context) => {
                await setDoc(doc(context.firestore(), 'stores', '101'), storeData(closedFields));
            });
            await assertFails(getDoc(answerRef));
            await assertFails(getDoc(ownerStoreRef));
            await assertSucceeds(getDoc(doc(platformDb, 'answerlattice_canonicalAnswers', 'answer-1')));
            await assertSucceeds(getDoc(platformStoreRef));
            if (USES_SHARED_RULES) {
                await assertFails(getDoc(doc(ownerDb, 'tenants', '1')));
                await assertSucceeds(getDoc(doc(platformDb, 'tenants', '1')));
            }
        }

        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'stores', '101'), {
                active: deleteField(),
                authDisabled: false,
                deleted: false,
            }, { merge: true });
        });
        await assertFails(getDoc(answerRef));
        await assertFails(getDoc(ownerStoreRef));

        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'stores', '101'), storeData({
                active: true,
                authDisabled: false,
                deleted: false,
            }));
        });
        await assertSucceeds(getDoc(answerRef));
        await assertSucceeds(getDoc(ownerStoreRef));
        if (USES_SHARED_RULES) {
            await assertSucceeds(getDoc(doc(ownerDb, 'tenants', '1')));
        }
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write(`Answerlattice workspace lifecycle ${RULES_FILE} rules tests passed.\n`);
}

void run();
