import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { PRODUCT_IDS } from '../../src/constants/product';
import {
    analyzeKnowledgeIntakeJob,
    getKnowledgeIntakeBundle,
    publishKnowledgeIntakeJob,
} from '../../src/lib/answerlattice/knowledgeIntake';
import { answerlatticeFirestoreAdmin as db } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

const scope = { tId: 1, sId: 101 };
const jobId = 'ABCDEFGHIJKLMNOPQRST';
const actor = { id: 'owner-1', email: 'owner@example.com', name: 'Owner' };

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    if (!db || typeof (db as any).collection !== 'function') throw new Error('Answerlattice emulator Firestore is not configured');

    const createdOn = Timestamp.fromMillis(1_700_000_000_000);
    await db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS).doc(jobId).set({
        id: jobId,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        ...scope,
        title: 'Billing knowledge',
        status: 'collecting',
        sourceCount: 1,
        readySourceCount: 1,
        reviewItemCount: 0,
        acceptedItemCount: 0,
        publishedItemCount: 0,
        rejectedItemCount: 0,
        usageUnitsConsumed: 0,
        usageSummary: {},
        createdOn,
        modifiedOn: createdOn,
    });
    const sourceId = `kis_${'c'.repeat(28)}`;
    await db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES).doc(sourceId).set({
        id: sourceId,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        ...scope,
        jobId,
        type: 'faq',
        title: 'Billing failures',
        status: 'ready',
        contentText: 'Question: Why did my invoice fail?\nAnswer: Open Billing, inspect the failed invoice, and retry with an active payment method.',
        contentExcerpt: 'Question: Why did my invoice fail?',
        contentHash: 'b'.repeat(64),
        tags: ['billing'],
        contextKeys: ['billing'],
        entityIds: [],
        metadata: {},
        errorMessage: null,
        createdOn,
        modifiedOn: createdOn,
    });

    const first = await analyzeKnowledgeIntakeJob(scope, jobId, actor);
    assert.ok(first.created > 0, 'first analysis must create deterministic review drafts');

    const firstBundle = await getKnowledgeIntakeBundle(scope, jobId);
    assert.equal(firstBundle.reviewItems.length, first.created);
    const ownerEdited = firstBundle.reviewItems[0];
    await db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTAKE_REVIEW_ITEMS).doc(ownerEdited.id).set({
        status: 'accepted',
        title: 'Owner-approved billing answer',
        modifiedOn: Timestamp.now(),
    }, { merge: true });

    const second = await analyzeKnowledgeIntakeJob(scope, jobId, actor);
    assert.equal(second.created, 0, 're-analysis must not rewrite deterministic drafts');
    const secondBundle = await getKnowledgeIntakeBundle(scope, jobId);
    const preserved = secondBundle.reviewItems.find(item => item.id === ownerEdited.id);
    assert.equal(preserved?.status, 'accepted', 'owner review status must survive re-analysis');
    assert.equal(preserved?.title, 'Owner-approved billing answer', 'owner edits must survive re-analysis');
    assert.equal(secondBundle.job?.acceptedItemCount, 1, 'job counters must be rebuilt from current review state');

    const faqItem = secondBundle.reviewItems.find(item => item.target === 'faq');
    assert.ok(faqItem, 'the repeated question source must create a reviewable FAQ');
    const reviewBatch = db.batch();
    secondBundle.reviewItems.forEach((reviewItem) => {
        reviewBatch.set(
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTAKE_REVIEW_ITEMS).doc(reviewItem.id),
            { status: reviewItem.id === faqItem.id ? 'accepted' : 'rejected', modifiedOn: Timestamp.now() },
            { merge: true },
        );
    });
    await reviewBatch.commit();

    const publishResult = await publishKnowledgeIntakeJob(scope, jobId, undefined, actor);
    assert.equal(publishResult.published.length, 1, 'only the accepted FAQ should publish');
    assert.equal(publishResult.published[0]?.target, 'faq');
    const publishedFaq = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS).doc(publishResult.published[0].id).get();
    assert.equal(publishedFaq.exists, true);
    assert.equal(publishedFaq.data()?.intakeReviewItemId, faqItem.id);
    const publishedBundle = await getKnowledgeIntakeBundle(scope, jobId);
    assert.equal(publishedBundle.job?.status, 'published');
    assert.equal(
        publishedBundle.reviewItems.find(item => item.id === faqItem.id)?.status,
        'published',
        'review and target writes must commit together',
    );
    await assert.rejects(
        () => publishKnowledgeIntakeJob(scope, jobId, undefined, actor),
        /Accept at least one review item|can no longer publish/,
        'a terminal published job must not start a second publish run',
    );

    const wrongProductJobId = 'ZYXWVUTSRQPONMLKJIHG';
    await db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS).doc(wrongProductJobId).set({
        id: wrongProductJobId,
        pId: PRODUCT_IDS.MENULIST,
        ...scope,
        title: 'Wrong product',
        status: 'collecting',
        sourceCount: 0,
        reviewItemCount: 0,
        acceptedItemCount: 0,
        publishedItemCount: 0,
        createdOn,
        modifiedOn: createdOn,
    });
    await assert.rejects(
        () => getKnowledgeIntakeBundle(scope, wrongProductJobId),
        /Invalid literal value|Invalid input/,
        'wrong-product intake documents must fail closed',
    );

    process.stdout.write('Answerlattice Knowledge Intake emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
