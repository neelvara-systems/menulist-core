#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { seedActiveAnswerlatticeRuleWorkspace } from './answerlattice-rule-test-fixtures';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-intake-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const RULES_FILE = process.env.ANSWERLATTICE_RULES_FILE === 'firestore.rules'
    ? 'firestore.rules'
    : 'firestore-answerlattice.rules';
const NOW = Timestamp.fromMillis(1_700_000_000_000);

const scoped = (overrides: Record<string, unknown> = {}) => ({
    id: 'doc_1',
    pId: 'AL',
    tId: 1,
    sId: 101,
    createdOn: NOW,
    modifiedOn: NOW,
    ...overrides,
});

async function run(): Promise<void> {
    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, RULES_FILE), 'utf8') },
    });
    try {
        const ownerDb = testEnv.authenticatedContext('owner-1', {
            role: 'OWNER', tenantId: '1', storeId: '101', uId: 'owner-1',
        }).firestore();
        const otherDb = testEnv.authenticatedContext('owner-2', {
            role: 'OWNER', tenantId: '2', storeId: '202', uId: 'owner-2',
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform-1', {
            role: 'PLATFORM', platformRole: 'PLATFORM', uId: 'platform-1',
        }).firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const adminDb = context.firestore();
            await seedActiveAnswerlatticeRuleWorkspace(adminDb);
            await setDoc(doc(adminDb, 'answerlattice_knowledgeIntakeJobs', 'job_1'), scoped({ id: 'job_1' }));
            await setDoc(doc(adminDb, 'answerlattice_knowledgeSources', 'source_1'), scoped({ id: 'source_1' }));
            await setDoc(doc(adminDb, 'answerlattice_intakeReviewItems', 'review_1'), scoped({ id: 'review_1' }));
            await setDoc(doc(adminDb, 'answerlattice_intakeUsageLedger', 'ledger_1'), scoped({ id: 'ledger_1' }));
            await setDoc(doc(adminDb, 'platformSummary', 'knowledgeIntakeSummary_1_101'), scoped({
                id: 'knowledgeIntakeSummary_1_101',
                activeJobs: 1,
                recentJobs: 1,
                readySources: 1,
                reviewItems: 1,
                acceptedItems: 0,
                publishedItems: 0,
            }));
            await setDoc(doc(adminDb, 'answerlattice_knowledgeIntakeJobs', 'wrong_product'), scoped({ id: 'wrong_product', pId: 'ML' }));
            await setDoc(doc(adminDb, 'kb_generation_jobs', 'legacy_job_1'), scoped({
                id: 'legacy_job_1',
                status: 'needs_review',
                sourceFiles: [],
            }));
            await setDoc(doc(adminDb, 'kb_staging_sections', 'legacy_section_1'), scoped({ id: 'legacy_section_1' }));
            await setDoc(doc(adminDb, 'kb_staging_chunks', 'legacy_chunk_1'), scoped({ id: 'legacy_chunk_1' }));
        });

        for (const [collectionName, documentId] of [
            ['answerlattice_knowledgeIntakeJobs', 'job_1'],
            ['answerlattice_knowledgeSources', 'source_1'],
            ['answerlattice_intakeReviewItems', 'review_1'],
            ['answerlattice_intakeUsageLedger', 'ledger_1'],
        ] as const) {
            await assertSucceeds(getDoc(doc(ownerDb, collectionName, documentId)));
            await assertFails(getDoc(doc(otherDb, collectionName, documentId)));
            await assertFails(setDoc(doc(ownerDb, collectionName, `direct_${documentId}`), scoped({ id: `direct_${documentId}` })));
            await assertFails(updateDoc(doc(ownerDb, collectionName, documentId), { modifiedOn: NOW }));
        }
        const summaryRef = doc(ownerDb, 'platformSummary', 'knowledgeIntakeSummary_1_101');
        await assertSucceeds(getDoc(summaryRef));
        await assertFails(updateDoc(summaryRef, { activeJobs: 999, modifiedOn: NOW }));
        await assertFails(setDoc(
            doc(ownerDb, 'platformSummary', 'knowledgeIntakeSummary_1_999'),
            scoped({ id: 'knowledgeIntakeSummary_1_999', sId: 999, activeJobs: 1 }),
        ));
        await assertFails(getDoc(doc(ownerDb, 'answerlattice_knowledgeIntakeJobs', 'wrong_product')));
        for (const [collectionName, documentId] of [
            ['kb_generation_jobs', 'legacy_job_1'],
            ['kb_staging_sections', 'legacy_section_1'],
            ['kb_staging_chunks', 'legacy_chunk_1'],
        ] as const) {
            await assertFails(getDoc(doc(ownerDb, collectionName, documentId)));
            await assertFails(updateDoc(doc(ownerDb, collectionName, documentId), { modifiedOn: NOW }));
            await assertSucceeds(getDoc(doc(platformDb, collectionName, documentId)));
            await assertSucceeds(updateDoc(doc(platformDb, collectionName, documentId), { modifiedOn: NOW }));
        }
    } finally {
        await testEnv.cleanup();
    }
    process.stdout.write('Answerlattice Knowledge Intake Firestore rules tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
