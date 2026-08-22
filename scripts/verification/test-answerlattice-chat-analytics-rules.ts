#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { seedActiveAnswerlatticeRuleWorkspace } from './answerlattice-rule-test-fixtures';

const ROOT = path.resolve(__dirname, '..', '..');
const RULES_FILE = process.env.ANSWERLATTICE_RULES_FILE || 'firestore-answerlattice.rules';
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-chat-analytics-rules';
const NOW = Timestamp.fromMillis(1_700_000_000_000);

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, RULES_FILE), 'utf8') },
    });
    try {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await seedActiveAnswerlatticeRuleWorkspace(context.firestore());
            await seedActiveAnswerlatticeRuleWorkspace(context.firestore(), { tenantId: 3, storeId: 303 });
            await setDoc(doc(context.firestore(), 'chatAnalytics', '1_101_2026-07-10'), {
                pId: 'AL', tId: 1, sId: 101, date: '2026-07-10', totalChats: 1,
            });
            await setDoc(doc(context.firestore(), 'chatAnalytics', '2_202_2026-07-10'), {
                pId: 'AL', tId: 2, sId: 202, date: '2026-07-10', totalChats: 1,
            });
            await setDoc(doc(context.firestore(), 'aiSearchHistory', 'search-1'), {
                pId: 'AL', tId: 1, sId: 101, query: 'Question', craftedAnswer: 'Answer',
                uId: 'owner-1', modifiedOn: NOW,
            });
            await setDoc(doc(context.firestore(), 'insights', '1', 'stores', '101', 'ai', 'weekly'), {
                pId: 'AL', tId: 1, sId: 101, weekStart: '2026-07-01', weekEnd: '2026-07-07',
            });
            await setDoc(doc(context.firestore(), 'insights', '2', 'stores', '202', 'ai', 'weekly'), {
                pId: 'AL', tId: 2, sId: 202, weekStart: '2026-07-01', weekEnd: '2026-07-07',
            });
            await setDoc(doc(context.firestore(), 'insights', '1', 'stores', '101', 'ai', 'forged'), {
                pId: 'ML', tId: 1, sId: 101,
            });
        });
        const ownerDb = testEnv.authenticatedContext('owner-1', {
            role: 'OWNER', tenantId: '1', storeId: '101', uId: 'owner-1',
        }).firestore();
        const otherDb = testEnv.authenticatedContext('owner-2', {
            role: 'OWNER', tenantId: '2', storeId: '202', uId: 'owner-2',
        }).firestore();
        const noSupportDb = testEnv.authenticatedContext('viewer-1', {
            role: 'VIEWER', tenantId: '1', storeId: '101', uId: 'viewer-1',
        }).firestore();
        const supportOnlyDb = testEnv.authenticatedContext('support-1', {
            role: 'STAFF', tenantId: '1', storeId: '101', uId: 'support-1',
            canManageSupport: true,
        }).firestore();
        const platformSupportDb = testEnv.authenticatedContext('platform-support-1', {
            platformRole: 'PLATFORM_SUPPORT', role: 'PLATFORM_SUPPORT', uId: 'platform-support-1',
        }).firestore();
        const emptyOwnerDb = testEnv.authenticatedContext('owner-3', {
            role: 'OWNER', tenantId: '3', storeId: '303', uId: 'owner-3',
        }).firestore();
        const emptyViewerDb = testEnv.authenticatedContext('viewer-3', {
            role: 'VIEWER', tenantId: '3', storeId: '303', uId: 'viewer-3',
        }).firestore();
        const emptySupportDb = testEnv.authenticatedContext('support-3', {
            role: 'STAFF', tenantId: '3', storeId: '303', uId: 'support-3',
            canManageSupport: true,
        }).firestore();
        const analyticsRef = doc(ownerDb, 'chatAnalytics', '1_101_2026-07-10');
        await assertSucceeds(getDoc(analyticsRef));
        await assertFails(getDoc(doc(noSupportDb, 'chatAnalytics', '1_101_2026-07-10')));
        await assertSucceeds(getDoc(doc(platformSupportDb, 'chatAnalytics', '1_101_2026-07-10')));
        await assertFails(getDoc(doc(ownerDb, 'chatAnalytics', '2_202_2026-07-10')));
        await assertFails(setDoc(analyticsRef, { pId: 'AL', tId: 1, sId: 101 }, { merge: true }));

        const weeklyInsightRef = doc(ownerDb, 'insights', '1', 'stores', '101', 'ai', 'weekly');
        const missingInsightRef = doc(emptyOwnerDb, 'insights', '3', 'stores', '303', 'ai', 'weekly');
        await assertSucceeds(getDoc(weeklyInsightRef));
        await assertSucceeds(getDoc(missingInsightRef));
        await assertFails(getDoc(doc(noSupportDb, 'insights', '1', 'stores', '101', 'ai', 'weekly')));
        await assertFails(getDoc(doc(emptyViewerDb, 'insights', '3', 'stores', '303', 'ai', 'weekly')));
        await assertFails(getDoc(doc(supportOnlyDb, 'insights', '1', 'stores', '101', 'ai', 'weekly')));
        await assertFails(getDoc(doc(emptySupportDb, 'insights', '3', 'stores', '303', 'ai', 'weekly')));
        await assertSucceeds(getDoc(doc(platformSupportDb, 'insights', '1', 'stores', '101', 'ai', 'weekly')));
        await assertSucceeds(getDoc(doc(platformSupportDb, 'insights', '3', 'stores', '303', 'ai', 'weekly')));
        await assertFails(getDoc(doc(ownerDb, 'insights', '2', 'stores', '202', 'ai', 'weekly')));
        await assertFails(getDoc(doc(ownerDb, 'insights', '3', 'stores', '303', 'ai', 'weekly')));
        await assertFails(getDoc(doc(ownerDb, 'insights', '1', 'stores', '101', 'ai', 'forged')));
        await assertFails(setDoc(weeklyInsightRef, { narrative: 'Forged' }, { merge: true }));

        const searchRef = doc(ownerDb, 'aiSearchHistory', 'search-1');
        await assertSucceeds(updateDoc(searchRef, {
            isGood: false,
            reasonsToImprove: [{ value: 'stale', label: 'Stale' }],
            comments: 'The answer was stale.',
            submittedAt: NOW,
            modifiedBy: 'Owner',
            modifiedOn: NOW,
        }));
        await assertFails(updateDoc(searchRef, { query: 'Forged query', modifiedBy: 'Owner', modifiedOn: NOW }));
        await assertFails(updateDoc(doc(otherDb, 'aiSearchHistory', 'search-1'), {
            isGood: true, submittedAt: NOW, modifiedBy: 'Other', modifiedOn: NOW,
        }));
        await assertFails(setDoc(doc(ownerDb, 'aiSearchHistory', 'forged-search'), {
            pId: 'AL', tId: 1, sId: 101, query: 'Forged', craftedAnswer: 'Forged',
        }));
    } finally {
        await testEnv.cleanup();
    }
}

run()
    .then(() => process.stdout.write(`Answerlattice chat analytics rules passed (${RULES_FILE}).\n`))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    });
