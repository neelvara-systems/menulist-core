#!/usr/bin/env ts-node

import fs from 'node:fs';
import path from 'node:path';
import {
    assertFails,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    setDoc,
} from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-gemini-spend-window-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const RULES_FILE = process.env.GEMINI_SPEND_RULES_FILE;
const PRODUCT = process.env.GEMINI_SPEND_PRODUCT;
const ALLOWED_RULES_FILES = new Set([
    'firestore.rules',
    'firestore-answerlattice.rules',
    'firestore-signaldesk.rules',
]);
const ALLOWED_PRODUCTS = new Set(['menulist', 'answerlattice', 'signaldesk']);

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }
    if (!RULES_FILE || !ALLOWED_RULES_FILES.has(RULES_FILE)) {
        throw new Error('GEMINI_SPEND_RULES_FILE must select a maintained spend-window ruleset');
    }
    if (!PRODUCT || !ALLOWED_PRODUCTS.has(PRODUCT)) {
        throw new Error('GEMINI_SPEND_PRODUCT must select a maintained product document');
    }

    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: fs.readFileSync(path.join(ROOT, RULES_FILE), 'utf8'),
        },
    });

    try {
        await testEnv.clearFirestore();
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'geminiSpendWindows', PRODUCT), {
                buckets: [],
                limitMicroUsd: 8_000_000,
                product: PRODUCT,
                updatedAtMs: Date.now(),
                version: 1,
                windowMinutes: 10,
            });
        });

        const contexts = [
            testEnv.unauthenticatedContext().firestore(),
            testEnv.authenticatedContext('owner-user', {
                platformRole: 'OWNER',
                role: 'OWNER',
                storeId: '101',
                storeIds: ['101'],
                tenantId: '1',
            }).firestore(),
            testEnv.authenticatedContext('platform-user', {
                platformRole: 'PLATFORM',
                role: 'PLATFORM',
            }).firestore(),
        ];

        for (const firestore of contexts) {
            const spendDocument = doc(firestore, 'geminiSpendWindows', PRODUCT);
            const clientCreatedDocument = doc(
                firestore,
                'geminiSpendWindows',
                `${PRODUCT}-client-created`,
            );
            await assertFails(getDoc(spendDocument));
            await assertFails(getDocs(collection(firestore, 'geminiSpendWindows')));
            await assertFails(setDoc(clientCreatedDocument, {
                buckets: [],
                product: PRODUCT,
                version: 1,
                windowMinutes: 10,
            }));
            await assertFails(setDoc(spendDocument, {
                buckets: [],
                product: PRODUCT,
                version: 1,
                windowMinutes: 10,
            }));
            await assertFails(deleteDoc(spendDocument));
        }
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write(`Gemini spend-window rules tests passed for ${PRODUCT} via ${RULES_FILE}.\n`);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
