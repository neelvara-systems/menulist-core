#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { admin, firestoreAdmin } from '../../functions/src/firebaseAdmin';
import { startGenerationLogic } from '../../functions/src/logic/startGeneration';
import {
    ARTICLE_STATUS,
    INGESTION_JOB_COLLECTION,
    INGESTION_JOB_STATUS,
    type IngestionJob,
    KB_ARTICLES_COLLECTION,
    type ProcessedKBMap,
} from '../../functions/src/types';

const Timestamp = admin.firestore.Timestamp;
const jobs = firestoreAdmin.collection(INGESTION_JOB_COLLECTION);
const articles = firestoreAdmin.collection(KB_ARTICLES_COLLECTION);

const paragraph = (text: string) => ({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

const generatedKnowledge = (): ProcessedKBMap => ({
    help: {
        id: 'help',
        title: 'Help',
        description: '',
        sections: [],
        articles: [{
            id: 'generated-install',
            title: 'Install the widget',
            content: paragraph('Install the widget from Settings, then copy the verified snippet into your site header.'),
            sources: [],
            generatedFaqs: [],
        }],
    },
});

const buildJob = (id: string, overrides: Partial<IngestionJob> = {}): IngestionJob => {
    const now = Timestamp.now();
    return {
        id,
        pId: 'AL',
        status: INGESTION_JOB_STATUS.PENDING,
        sourceFiles: [{
            storagePath: 'ingestion_source_files/1/2/source.pdf',
            fileName: 'source.pdf',
            type: 'pdf',
            gsUri: 'gs://demo/source.pdf',
            downloadURL: 'https://example.invalid/source.pdf',
        }],
        createdOn: now,
        modifiedOn: now,
        sId: 2,
        tId: 1,
        uId: 'user-1',
        ...overrides,
    };
};

const waitForStatus = async (jobId: string, status: string): Promise<void> => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
        const snapshot = await jobs.doc(jobId).get();
        if (snapshot.data()?.status === status) return;
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error(`Timed out waiting for ${status}.`);
};

async function run(): Promise<void> {
    await Promise.all([
        articles.doc('same-tenant-existing').set({
            id: 'same-tenant-existing',
            pId: 'AL',
            tId: 1,
            sId: 2,
            title: 'Install the widget',
            categoryTitle: 'Help',
            sectionTitle: '',
            status: ARTICLE_STATUS.PUBLISHED,
            active: true,
        }),
        articles.doc('cross-tenant-existing').set({
            id: 'cross-tenant-existing',
            pId: 'AL',
            tId: 9,
            sId: 9,
            title: 'Install the widget',
            categoryTitle: 'Help',
            sectionTitle: '',
            status: ARTICLE_STATUS.PUBLISHED,
            active: true,
        }),
    ]);

    const concurrentJob = buildJob('shared-kb-concurrent');
    await jobs.doc(concurrentJob.id).set(concurrentJob);
    let generationCalls = 0;
    const dependencies = {
        generateKnowledge: async () => {
            generationCalls += 1;
            return generatedKnowledge();
        },
        generateEmbedding: async () => [1, 0],
    };
    const results = await Promise.all([
        startGenerationLogic(concurrentJob.id, concurrentJob, dependencies),
        startGenerationLogic(concurrentJob.id, concurrentJob, dependencies),
    ]);
    assert.equal(generationCalls, 1, 'Concurrent delivery must claim and generate exactly once.');
    assert.equal(results.filter(result => result.skipped === true).length, 1);

    const completed = (await jobs.doc(concurrentJob.id).get()).data() || {};
    assert.equal(completed.status, INGESTION_JOB_STATUS.NEEDS_REVIEW);
    assert.equal(completed.articleIds.length, 1);
    assert.equal(completed.categories.help.articles.length, 1);
    assert.equal('content' in completed.categories.help.articles[0], false, 'Job review navigation must omit article bodies.');
    assert.deepEqual(
        completed.articlesToReview[0].similarArticles.map((article: { id: string }) => article.id),
        ['same-tenant-existing'],
        'Duplicate evidence must not cross tenant/store scope.',
    );
    const createdArticle = (await articles.doc(completed.articleIds[0]).get()).data() || {};
    assert.equal(createdArticle.pId, 'AL');
    assert.equal(createdArticle.tId, 1);
    assert.equal(createdArticle.sId, 2);
    assert.equal(createdArticle.active, false);
    assert.deepEqual(createdArticle.reconciliation.similarArticleIds, ['same-tenant-existing']);
    const createdForJob = await articles.where('jobId', '==', concurrentJob.id).get();
    assert.equal(createdForJob.size, 1, 'Concurrent delivery must not create orphan duplicate articles.');

    const cancelledJob = buildJob('shared-kb-cancelled');
    await jobs.doc(cancelledJob.id).set(cancelledJob);
    let releaseGeneration: () => void = () => {
        throw new Error('Generation release was not initialized.');
    };
    const generationGate = new Promise<void>(resolve => { releaseGeneration = resolve; });
    const cancellationRun = startGenerationLogic(cancelledJob.id, cancelledJob, {
        generateKnowledge: async () => {
            await generationGate;
            return generatedKnowledge();
        },
        generateEmbedding: async () => [1, 0],
    });
    await waitForStatus(cancelledJob.id, INGESTION_JOB_STATUS.PROCESSING);
    await jobs.doc(cancelledJob.id).set({
        status: INGESTION_JOB_STATUS.CANCELLED,
        modifiedOn: Timestamp.now(),
    }, { merge: true });
    releaseGeneration();
    await cancellationRun;
    const cancelled = (await jobs.doc(cancelledJob.id).get()).data() || {};
    assert.equal(cancelled.status, INGESTION_JOB_STATUS.CANCELLED, 'Completion/failure must not overwrite cancellation.');
    assert.equal((await articles.where('jobId', '==', cancelledJob.id).get()).empty, true);

    const malformedJob = buildJob('shared-kb-malformed', { tId: '01' });
    await jobs.doc(malformedJob.id).set(malformedJob);
    const malformedResult = await startGenerationLogic(malformedJob.id, malformedJob, dependencies);
    assert.equal(malformedResult.skipped, true);
    const malformed = (await jobs.doc(malformedJob.id).get()).data() || {};
    assert.equal(malformed.status, INGESTION_JOB_STATUS.FAILED);
    assert.equal(malformed.errorMessage, 'Knowledge generation failed');
}

void run().then(() => {
    console.log('Shared KB generation emulator tests passed.');
});
