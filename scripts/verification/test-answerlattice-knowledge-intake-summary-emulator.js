#!/usr/bin/env node

const assert = require('node:assert/strict');

if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST is required.');
}

process.env.ANSWERLATTICE_FIREBASE_MODE = 'separate';
process.env.ANSWERLATTICE_FIREBASE_PROJECT_ID = process.env.GCLOUD_PROJECT;

const { DB_COLLECTIONS } = require('../../functions-answerlattice/lib/constants/database');
const { admin, firestoreAdmin } = require('../../functions-answerlattice/lib/firebaseAdmin');
const { Timestamp } = admin.firestore;
const {
    syncKnowledgeIntakeSummary,
} = require('../../functions-answerlattice/lib/answerlattice/knowledgeIntakeSummary');

const SCOPE = { tId: 71, sId: 701 };
const SUMMARY_ID = `knowledgeIntakeSummary_${SCOPE.tId}_${SCOPE.sId}`;

const makeJob = (id, overrides = {}) => ({
    id,
    pId: 'AL',
    ...SCOPE,
    title: id,
    status: 'collecting',
    sourceCount: 2,
    readySourceCount: 1,
    reviewItemCount: 3,
    acceptedItemCount: 1,
    publishedItemCount: 0,
    rejectedItemCount: 0,
    usageUnitsConsumed: 2,
    modifiedOn: Timestamp.fromMillis(1_700_000_000_000),
    ...overrides,
});

async function run() {
    const summaryRef = firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(SUMMARY_ID);
    await summaryRef.set({
        id: SUMMARY_ID,
        pId: 'AL',
        ...SCOPE,
        activeJobId: 'stale_job',
        activeJobs: 9,
        recentJobs: 9,
        latestJobStatus: 'failed',
        summaryHash: 'stale',
    });

    const emptyResult = await syncKnowledgeIntakeSummary(SCOPE.tId, SCOPE.sId);
    assert.equal(emptyResult.jobsScanned, 0);
    assert.equal(emptyResult.summaryWritten, true);
    assert.equal(emptyResult.lastJobStatus, null);

    const emptySummary = (await summaryRef.get()).data();
    assert.equal(emptySummary.activeJobId, null);
    assert.equal(emptySummary.activeJobs, 0);
    assert.equal(emptySummary.recentJobs, 0);
    assert.equal(emptySummary.lastJobStatus, null);
    assert.equal(emptySummary.latestJobStatus, undefined);

    const unchangedResult = await syncKnowledgeIntakeSummary(SCOPE.tId, SCOPE.sId);
    assert.equal(unchangedResult.summaryWritten, false);
    assert.equal(unchangedResult.unchanged, true);

    const jobs = firestoreAdmin.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS);
    await Promise.all([
        jobs.doc('A1234567890123456789').set(makeJob('A1234567890123456789', {
            status: 'reviewing',
            modifiedOn: Timestamp.fromMillis(1_700_000_000_000),
        })),
        jobs.doc('B1234567890123456789').set(makeJob('B1234567890123456789', {
            status: 'published',
            sourceCount: 4,
            readySourceCount: 4,
            reviewItemCount: 5,
            acceptedItemCount: 0,
            publishedItemCount: 5,
            usageUnitsConsumed: 3,
            publishedOn: Timestamp.fromMillis(1_700_000_050_000),
            modifiedOn: Timestamp.fromMillis(1_700_000_100_000),
        })),
    ]);

    const populatedResult = await syncKnowledgeIntakeSummary(SCOPE.tId, SCOPE.sId);
    assert.equal(populatedResult.summaryWritten, true);
    assert.equal(populatedResult.jobsScanned, 2);
    assert.equal(populatedResult.lastJobStatus, 'published');

    const populatedSummary = (await summaryRef.get()).data();
    assert.equal(populatedSummary.activeJobId, 'A1234567890123456789');
    assert.equal(populatedSummary.activeJobs, 1);
    assert.equal(populatedSummary.recentJobs, 2);
    assert.equal(populatedSummary.sourceCount, 6);
    assert.equal(populatedSummary.readySources, 5);
    assert.equal(populatedSummary.reviewItems, 8);
    assert.equal(populatedSummary.publishedItems, 5);
    assert.equal(populatedSummary.usageUnitsConsumed, 5);
    assert.equal(populatedSummary.lastJobStatus, 'published');

    const stableHash = populatedSummary.summaryHash;
    await jobs.doc('C1234567890123456789').set(makeJob('C1234567890123456789', {
        pId: 'ML',
        modifiedOn: Timestamp.fromMillis(1_700_000_200_000),
    }));

    await assert.rejects(
        syncKnowledgeIntakeSummary(SCOPE.tId, SCOPE.sId),
        /invalid identity or status/,
    );
    assert.equal((await summaryRef.get()).data().summaryHash, stableHash);

    await jobs.doc('C1234567890123456789').delete();
    await jobs.doc('D1234567890123456789').set(makeJob('D1234567890123456789', {
        pId: ' al ',
        modifiedOn: Timestamp.fromMillis(1_700_000_200_000),
    }));
    await assert.rejects(
        syncKnowledgeIntakeSummary(SCOPE.tId, SCOPE.sId),
        /invalid identity or status/,
    );

    await jobs.doc('D1234567890123456789').delete();
    const missingProductJob = makeJob('E1234567890123456789', {
        modifiedOn: Timestamp.fromMillis(1_700_000_200_000),
    });
    delete missingProductJob.pId;
    await jobs.doc('E1234567890123456789').set(missingProductJob);
    await assert.rejects(
        syncKnowledgeIntakeSummary(SCOPE.tId, SCOPE.sId),
        /invalid identity or status/,
    );

    process.stdout.write('Answerlattice Knowledge Intake summary emulator tests passed.\n');
}

run()
    .then(() => firestoreAdmin.terminate())
    .catch(async (error) => {
        console.error(error);
        await firestoreAdmin.terminate().catch(() => undefined);
        process.exit(1);
    });
