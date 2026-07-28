#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { seedActiveAnswerlatticeRuleWorkspace } from './answerlattice-rule-test-fixtures';

const ROOT = path.resolve(__dirname, '..', '..');
const RULES_FILE = process.env.ANSWERLATTICE_RULES_FILE || 'firestore-answerlattice.rules';
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-chat-session-rules';
const NOW = Timestamp.fromMillis(1_700_000_000_000);

const message = (id: string) => ({ id, role: 'user', content: `Question ${id}`, createdOn: NOW });
const chatSession = (overrides: Record<string, unknown> = {}) => ({
    pId: 'AL',
    tId: 1,
    sId: 101,
    uId: 'owner-1',
    title: 'Scoped conversation',
    mode: 'qna',
    messages: [message('message-1')],
    role: 'OWNER',
    sourceContext: null,
    traceId: 'al_chat_trace',
    requestId: 'al_chat_trace',
    createdOn: NOW,
    createdBy: 'Owner',
    modifiedOn: NOW,
    modifiedBy: 'Owner',
    ...overrides,
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, RULES_FILE), 'utf8') },
    });

    try {
        const ownerDb = testEnv.authenticatedContext('owner-1', {
            role: 'OWNER',
            tenantId: '1',
            storeId: '101',
            uId: 'owner-1',
        }).firestore();
        const otherDb = testEnv.authenticatedContext('owner-2', {
            role: 'OWNER',
            tenantId: '2',
            storeId: '202',
            uId: 'owner-2',
        }).firestore();
        const noSupportDb = testEnv.authenticatedContext('viewer-1', {
            role: 'VIEWER', tenantId: '1', storeId: '101', uId: 'viewer-1',
        }).firestore();
        const supportDb = testEnv.authenticatedContext('support-1', {
            canManageSupport: true, role: 'CUSTOM', tenantId: '1', storeId: '101', uId: 'support-1',
        }).firestore();
        const platformSupportDb = testEnv.authenticatedContext('platform-support-1', {
            platformRole: 'PLATFORM_SUPPORT', role: 'PLATFORM_SUPPORT', uId: 'platform-support-1',
        }).firestore();
        const platformAdminDb = testEnv.authenticatedContext('platform-admin-1', {
            platformRole: 'PLATFORM', role: 'PLATFORM', uId: 'platform-admin-1',
        }).firestore();
        const publicDb = testEnv.unauthenticatedContext().firestore();
        const sessionRef = doc(ownerDb, 'chatSessions', 'session-1');

        await testEnv.withSecurityRulesDisabled(async (context) => {
            await seedActiveAnswerlatticeRuleWorkspace(context.firestore());
        });

        await assertSucceeds(setDoc(sessionRef, chatSession()));
        await assertSucceeds(getDoc(sessionRef));
        await assertFails(getDoc(doc(noSupportDb, 'chatSessions', 'session-1')));
        await assertSucceeds(getDoc(doc(supportDb, 'chatSessions', 'session-1')));
        await assertSucceeds(getDoc(doc(platformSupportDb, 'chatSessions', 'session-1')));
        await assertFails(getDoc(doc(otherDb, 'chatSessions', 'session-1')));
        await assertFails(getDoc(doc(publicDb, 'chatSessions', 'session-1')));
        await assertSucceeds(getDocs(query(
            collection(ownerDb, 'chatSessions'),
            where('pId', '==', 'AL'),
            where('tId', '==', 1),
            where('sId', '==', 101),
        )));
        await assertFails(getDocs(query(
            collection(ownerDb, 'chatSessions'),
            where('pId', '==', 'AL'),
            where('tId', '==', 2),
            where('sId', '==', 202),
        )));

        await assertFails(setDoc(doc(ownerDb, 'chatSessions', 'wrong-product'), chatSession({ pId: 'ML' })));
        await assertFails(setDoc(doc(ownerDb, 'chatSessions', 'forged-actor'), chatSession({ uId: 'another-user' })));
        await assertFails(setDoc(doc(ownerDb, 'chatSessions', 'wrong-scope'), chatSession({ tId: 2, sId: 202 })));
        await assertFails(setDoc(doc(ownerDb, 'chatSessions', 'empty-title'), chatSession({ title: '' })));
        await assertFails(setDoc(doc(ownerDb, 'chatSessions', 'invalid-mode'), chatSession({ mode: 'admin' })));
        await assertFails(setDoc(doc(ownerDb, 'chatSessions', 'empty-messages'), chatSession({ messages: [] })));
        await assertFails(setDoc(doc(ownerDb, 'chatSessions', 'too-many-messages'), chatSession({
            messages: Array.from({ length: 51 }, (_, index) => message(`message-${index + 1}`)),
        })));
        await assertFails(setDoc(doc(ownerDb, 'chatSessions', 'invalid-time'), chatSession({ modifiedOn: 'now' })));
        await assertFails(setDoc(doc(ownerDb, 'chatSessions', 'unknown-field'), chatSession({ secret: 'must not persist' })));

        await assertSucceeds(updateDoc(sessionRef, {
            title: 'Updated conversation',
            messages: [message('message-1'), message('message-2')],
            modifiedOn: Timestamp.fromMillis(NOW.toMillis() + 1),
            modifiedBy: 'Owner',
        }));
        await assertFails(updateDoc(doc(supportDb, 'chatSessions', 'session-1'), {
            messages: [message('message-1'), message('support-forged-message')],
            modifiedOn: Timestamp.fromMillis(NOW.toMillis() + 2),
            modifiedBy: 'Support',
        }));
        await assertSucceeds(updateDoc(doc(supportDb, 'chatSessions', 'session-1'), {
            adminStatus: 'in_progress',
            modifiedOn: Timestamp.fromMillis(NOW.toMillis() + 2),
            modifiedBy: 'Support',
        }));
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'aiSearchHistory', 'history-owner-1'), {
                pId: 'AL',
                tId: 1,
                sId: 101,
                uId: 'owner-1',
            });
            await setDoc(doc(context.firestore(), 'aiSearchHistory', 'history-platform-test'), {
                pId: 'AL',
                tId: 1,
                sId: 101,
                uId: 'owner-1',
            });
        });
        const feedbackUpdate = {
            isGood: true,
            reasonsToImprove: [],
            comments: '',
            submittedAt: Timestamp.fromMillis(NOW.toMillis() + 3),
            modifiedOn: Timestamp.fromMillis(NOW.toMillis() + 3),
            modifiedBy: 'Owner',
        };
        await assertSucceeds(updateDoc(doc(ownerDb, 'aiSearchHistory', 'history-owner-1'), feedbackUpdate));
        await assertFails(updateDoc(doc(supportDb, 'aiSearchHistory', 'history-owner-1'), {
            ...feedbackUpdate,
            isGood: false,
            modifiedBy: 'Support',
        }));
        await assertSucceeds(updateDoc(doc(platformAdminDb, 'aiSearchHistory', 'history-platform-test'), {
            ...feedbackUpdate,
            modifiedBy: 'Platform Admin',
        }));
        await assertFails(updateDoc(sessionRef, { uId: 'another-user', modifiedOn: NOW, modifiedBy: 'Owner' }));
        await assertFails(updateDoc(sessionRef, { createdOn: Timestamp.fromMillis(NOW.toMillis() + 1), modifiedOn: NOW, modifiedBy: 'Owner' }));
        await assertFails(updateDoc(sessionRef, { messages: [], modifiedOn: NOW, modifiedBy: 'Owner' }));
        await assertFails(updateDoc(sessionRef, { secret: true, modifiedOn: NOW, modifiedBy: 'Owner' }));
        await assertFails(updateDoc(doc(otherDb, 'chatSessions', 'session-1'), {
            title: 'Cross-workspace update',
            modifiedOn: NOW,
            modifiedBy: 'Other Owner',
        }));

        await assertSucceeds(deleteDoc(sessionRef));
    } finally {
        await testEnv.cleanup();
    }
}

run()
    .then(() => process.stdout.write(`Answerlattice chat-session rules passed (${RULES_FILE}).\n`))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    });
