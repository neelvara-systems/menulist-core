#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-support-board-rules';
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
    const cardPath = 'answerlattice_supportBoardCards/card-1';
    try {
        await testEnv.withSecurityRulesDisabled(async context => {
            await setDoc(doc(context.firestore(), cardPath), {
                pId: 'AL', tId: 1, sId: 101,
                title: 'Review support gap', description: '',
                status: 'needs_triage', priority: 'medium',
                sourceType: 'manual', sourceId: null,
                notes: [], notesCount: 0,
                statuses: [{ status: 'needs_triage' }],
            });
        });
        const supportDb = testEnv.authenticatedContext('support-1', {
            tenantId: '1', storeId: '101', uId: 'support-1', canManageSupport: true,
        }).firestore();
        const unprivilegedDb = testEnv.authenticatedContext('staff-1', {
            tenantId: '1', storeId: '101', uId: 'staff-1', canManageSupport: false, canManageWidget: false,
        }).firestore();
        const otherDb = testEnv.authenticatedContext('support-2', {
            tenantId: '2', storeId: '202', uId: 'support-2', canManageSupport: true,
        }).firestore();

        await assertSucceeds(getDoc(doc(supportDb, cardPath)));
        await assertFails(getDoc(doc(unprivilegedDb, cardPath)));
        await assertFails(getDoc(doc(otherDb, cardPath)));
        await assertSucceeds(updateDoc(doc(supportDb, cardPath), { status: 'needs_answer' }));
        await assertFails(updateDoc(doc(supportDb, cardPath), { tId: 2 }));
        await assertFails(updateDoc(doc(supportDb, cardPath), { sourceType: 'ticket', sourceId: 'ticket-1' }));
        await assertFails(updateDoc(doc(supportDb, cardPath), { notes: Array.from({ length: 26 }, (_, index) => ({ id: String(index) })), notesCount: 26 }));
        await assertFails(setDoc(doc(unprivilegedDb, 'answerlattice_supportBoardCards/card-2'), {
            pId: 'AL', tId: 1, sId: 101,
            title: 'Blocked', description: '', status: 'new_signals', priority: 'medium',
            sourceType: 'manual', sourceId: null, notes: [], notesCount: 0,
            statuses: [{ status: 'new_signals' }],
        }));
        console.log(`Answerlattice support-board rules passed for ${RULES_FILE}.`);
    } finally {
        await testEnv.cleanup();
    }
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
