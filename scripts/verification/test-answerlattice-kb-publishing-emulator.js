#!/usr/bin/env node

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required.');
const sharedRuntime = process.env.KB_FUNCTIONS_RUNTIME === 'shared';
if (!sharedRuntime) {
    process.env.ANSWERLATTICE_FIREBASE_MODE = 'separate';
    process.env.ANSWERLATTICE_FIREBASE_PROJECT_ID = process.env.GCLOUD_PROJECT;
}
const runtimeRoot = sharedRuntime ? '../../functions/lib' : '../../functions-answerlattice/lib';

const { admin, firestoreAdmin } = require(`${runtimeRoot}/firebaseAdmin`);
const { FieldValue, Timestamp } = admin.firestore;
const {
    ANSWERLATTICE_EMBEDDING_CACHE_VERSION,
    ANSWERLATTICE_EMBEDDING_OUTPUT_DIMENSIONALITY,
    ANSWERLATTICE_EMBEDDING_VECTOR_FIELD,
} = require(`${runtimeRoot}/constants/ai`);
const { DB_COLLECTIONS } = require(`${runtimeRoot}/constants/database`);
const { embedArticleWorkerLogic } = require(`${runtimeRoot}/logic/embedArticleWorker`);
const { dispatchPublishingEmbeddingTasks, finalizePublishingJob } = require(`${runtimeRoot}/logic/kbPublishingLifecycle`);
const { publishApprovedJobLogic } = require(`${runtimeRoot}/logic/publishApprovedJob`);
const { tiptapToText } = require(`${runtimeRoot}/utils/tiptapUtils`);

// The local readiness runner can execute this suite repeatedly against one
// approved emulator. Use a fresh numeric tenant/store scope per process so
// earlier navigation and cache-version documents cannot affect this run.
const runScopeSeed = (Date.now() % 1_000_000_000) + (process.pid % 1_000);
const SCOPE = { tId: runScopeSeed, sId: runScopeSeed + 1 };
const VECTOR = Array.from(
    { length: ANSWERLATTICE_EMBEDDING_OUTPUT_DIMENSIONALITY },
    (_, index) => (index + 1) / 1_000_000,
);

const content = (text) => ({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

const sourceHash = ({ categoryTitle, sectionTitle = '', title, content: articleContent }) => createHash('sha256')
    .update([categoryTitle, sectionTitle, title, tiptapToText(articleContent)].filter(Boolean).join('\n\n'))
    .digest('hex');

const articleData = (id, jobId, overrides = {}) => {
    const base = {
        id,
        pId: 'AL',
        ...SCOPE,
        active: false,
        categoryId: 'billing',
        sectionId: '',
        categoryTitle: 'Billing',
        sectionTitle: '',
        title: 'Fix a failed invoice',
        index: 0,
        url: `/billing/${id}`,
        content: content('Open Billing, update the payment method, and retry the failed invoice.'),
        [ANSWERLATTICE_EMBEDDING_VECTOR_FIELD]: FieldValue.vector(VECTOR),
        embeddingStatus: 'embedded',
        embeddingCacheVersion: ANSWERLATTICE_EMBEDDING_CACHE_VERSION,
        tags: ['billing'],
        generatedFaqs: [{
            question: 'Why did my invoice fail?',
            answer: 'Open Billing, update the payment method, and retry the invoice.',
        }],
        createdOn: Timestamp.now(),
        modifiedOn: Timestamp.now(),
        status: 'needs_review',
        jobId,
        sources: [],
    };
    return {
        ...base,
        embeddingSourceHash: sourceHash(base),
        ...overrides,
    };
};

const jobData = (id, articleId, overrides = {}) => ({
    id,
    pId: 'AL',
    ...SCOPE,
    uId: 'platform-owner',
    title: id,
    status: 'needs_review',
    sourceFiles: [],
    articleIds: [articleId],
    categories: {},
    articlesToReview: [],
    createdOn: Timestamp.now(),
    modifiedOn: Timestamp.now(),
    ...overrides,
});

const finalCategories = (articleId, reEmbedding = false) => ({
    billing: {
        id: 'billing',
        title: 'Billing',
        description: 'Billing help',
        active: true,
        articles: [{
            id: articleId,
            title: 'Fix a failed invoice',
            active: true,
            index: 0,
            url: `/billing/${articleId}`,
            ...(reEmbedding ? { reEmbedding: true } : {}),
        }],
    },
});

async function run() {
    const jobs = firestoreAdmin.collection(DB_COLLECTIONS.KB_GENERATION_JOBS);
    const articles = firestoreAdmin.collection(DB_COLLECTIONS.KB_ARTICLES);
    const categories = firestoreAdmin.collection(DB_COLLECTIONS.KB_CATEGORIES);
    const faqs = firestoreAdmin.collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS);

    const jobId = 'publish-job-1';
    const articleId = 'publish-article-1';
    const staleFaqIds = [1, 2, 3].map((index) => `${articleId}_faq_${index}`);
    await Promise.all([
        jobs.doc(jobId).set(jobData(jobId, articleId)),
        articles.doc(articleId).set(articleData(articleId, jobId, { faqIds: staleFaqIds })),
        ...staleFaqIds.map((faqId) => firestoreAdmin.collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS).doc(faqId).set({
            id: faqId,
            pId: 'AL',
            ...SCOPE,
            articleId,
            active: true,
            question: 'Stale question',
            answer: 'Stale answer',
        })),
    ]);

    const publishInput = finalCategories(articleId);
    publishInput.billing.url = '//untrusted.example/navigation';
    publishInput.billing.articles[0].url = '/untrusted/article/path';
    const publishResult = await publishApprovedJobLogic(jobId, publishInput);
    assert.equal(publishResult.success, true);
    assert.equal(publishResult.alreadyStarted, false);
    let job = (await jobs.doc(jobId).get()).data();
    assert.equal(job.status, 'publishing');
    assert.deepEqual(job.embeddingPendingArticleIds, []);
    assert.equal((await categories.doc(`categories_${SCOPE.tId}_${SCOPE.sId}`).get()).exists, false);
    const preFinalizeArticle = (await articles.doc(articleId).get()).data();
    assert.equal(preFinalizeArticle.status, 'needs_review');
    assert.equal(preFinalizeArticle.active, false);
    const preFinalizeFaq = (await faqs.doc(`${articleId}_faq_1`).get()).data();
    assert.equal(preFinalizeFaq.status, 'needs_review');
    assert.equal(preFinalizeFaq.active, false);

    const dispatchResult = await dispatchPublishingEmbeddingTasks(jobId, job);
    assert.equal(dispatchResult.skipped, false);
    assert.equal(dispatchResult.dispatched, 0);
    const finalizeResult = await finalizePublishingJob(jobId);
    assert.equal(finalizeResult.published, true);
    job = (await jobs.doc(jobId).get()).data();
    assert.equal(job.status, 'published');
    assert.equal(job.articlesEmbeddedCount, 0);
    const cacheVersion = (await firestoreAdmin.collection(DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS)
        .doc(`kb_${SCOPE.tId}_${SCOPE.sId}`)
        .get()).data();
    const sourceVersions = (await firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(`sourceVersions_${SCOPE.tId}_${SCOPE.sId}`)
        .get()).data();
    const bundleManifest = (await firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(`bundleManifest_${SCOPE.tId}_${SCOPE.sId}`)
        .get()).data();
    assert.equal(cacheVersion.version, 1);
    assert.equal(sourceVersions.kb, 1);
    assert.equal(sourceVersions.docsNav, 1);
    assert.equal(bundleManifest.status, 'stale');
    const navigation = (await categories
        .doc(`categories_${SCOPE.tId}_${SCOPE.sId}`)
        .get()).data().categories;
    assert.equal(navigation.billing.url, '/billing');
    assert.equal(navigation.billing.articles[0].url, `/billing/${articleId}`);

    const article = (await articles.doc(articleId).get()).data();
    assert.equal(article.status, 'published');
    assert.equal(article.active, true);
    assert.equal(article.generatedFaqs, undefined);
    const faqSnap = await faqs
        .where('articleId', '==', articleId)
        .limit(2)
        .get();
    assert.equal(faqSnap.size, 1);
    assert.equal(faqSnap.docs[0].data().pId, 'AL');
    assert.equal((await faqs.doc(staleFaqIds[1]).get()).exists, false);
    assert.equal((await faqs.doc(staleFaqIds[2]).get()).exists, false);

    const duplicatePublish = await publishApprovedJobLogic(jobId, finalCategories(articleId));
    assert.equal(duplicatePublish.alreadyStarted, true);

    const workerJobId = 'publish-job-2';
    const workerArticleId = 'publish-article-2';
    const runId = 'publish_run_2';
    const workerFaqId = `${workerArticleId}_faq_1`;
    await Promise.all([
        jobs.doc(workerJobId).set(jobData(workerJobId, workerArticleId, {
            status: 'publishing',
            categories: finalCategories(workerArticleId),
            embeddingPendingArticleIds: [workerArticleId],
            embeddingCompletedArticleIds: [],
            embeddingFailedArticleIds: [],
            embeddingEnqueueStatus: 'queued',
            embeddingRunId: runId,
            articlesToEmbedCount: 1,
            articlesEmbeddedCount: 0,
        })),
        articles.doc(workerArticleId).set(articleData(workerArticleId, workerJobId, {
            faqIds: [workerFaqId],
        })),
        faqs.doc(workerFaqId).set({
            id: workerFaqId,
            pId: 'AL',
            ...SCOPE,
            articleId: workerArticleId,
            active: false,
            status: 'needs_review',
            question: 'Why did my invoice fail?',
            answer: 'Update the payment method and retry.',
        }),
    ]);

    const missingRunResult = await embedArticleWorkerLogic(
        { id: workerArticleId },
        workerJobId,
        { retryCount: 0 },
    );
    assert.equal(missingRunResult.skipped, true, 'A current-run task must carry the exact embedding run ID.');
    let guardedJob = (await jobs.doc(workerJobId).get()).data();
    assert.deepEqual(guardedJob.embeddingCompletedArticleIds, []);
    assert.deepEqual(guardedJob.embeddingFailedArticleIds, []);

    const wrongRunResult = await embedArticleWorkerLogic(
        { id: workerArticleId },
        workerJobId,
        { embeddingRunId: 'stale-run', retryCount: 0 },
    );
    assert.equal(wrongRunResult.skipped, true, 'A stale run must not process the current article.');

    const outsideWorkerResult = await embedArticleWorkerLogic(
        { id: 'article-outside-worker-job' },
        workerJobId,
        { embeddingRunId: runId, retryCount: 2, finalAttempt: true },
    );
    assert.equal(outsideWorkerResult.failed, true);
    guardedJob = (await jobs.doc(workerJobId).get()).data();
    assert.equal(guardedJob.status, 'publishing', 'An out-of-job task must not poison the job status.');
    assert.deepEqual(guardedJob.embeddingFailedArticleIds, [], 'An out-of-job task must not enter the failure set.');

    const workerResult = await embedArticleWorkerLogic(
        { id: workerArticleId },
        workerJobId,
        { embeddingRunId: runId, retryCount: 0 },
    );
    assert.equal(workerResult.completed, true);
    job = (await jobs.doc(workerJobId).get()).data();
    assert.deepEqual(job.embeddingCompletedArticleIds, [workerArticleId]);
    assert.equal(job.articlesEmbeddedCount, 1);
    assert.equal((await articles.doc(workerArticleId).get()).data().status, 'needs_review');
    assert.equal((await articles.doc(workerArticleId).get()).data().active, false);
    assert.equal((await faqs.doc(workerFaqId).get()).data().status, 'needs_review');

    assert.equal((await finalizePublishingJob(workerJobId)).published, true);
    assert.equal((await jobs.doc(workerJobId).get()).data().status, 'published');
    assert.equal((await articles.doc(workerArticleId).get()).data().status, 'published');
    assert.equal((await articles.doc(workerArticleId).get()).data().active, true);
    assert.equal((await faqs.doc(workerFaqId).get()).data().status, 'published');
    assert.equal((await faqs.doc(workerFaqId).get()).data().active, true);
    assert.equal((await firestoreAdmin.collection(DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS)
        .doc(`kb_${SCOPE.tId}_${SCOPE.sId}`)
        .get()).data().version, 2);
    assert.equal((await firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(`sourceVersions_${SCOPE.tId}_${SCOPE.sId}`)
        .get()).data().kb, 2);
    assert.equal((await firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(`sourceVersions_${SCOPE.tId}_${SCOPE.sId}`)
        .get()).data().docsNav, 2);
    const duplicateWorker = await embedArticleWorkerLogic(
        { id: workerArticleId },
        workerJobId,
        { embeddingRunId: runId, retryCount: 0 },
    );
    assert.equal(duplicateWorker.skipped, true);

    const outsideJobId = 'publish-job-3';
    await jobs.doc(outsideJobId).set(jobData(outsideJobId, articleId));
    await assert.rejects(
        publishApprovedJobLogic(outsideJobId, finalCategories('article-outside-job')),
        /outside this job/,
    );

    const malformedStateJobId = 'publish-job-malformed-state';
    await jobs.doc(malformedStateJobId).set(jobData(malformedStateJobId, 'valid-article', {
        status: 'publishing',
        embeddingPendingArticleIds: ['valid-article', 'bad/article-id'],
        embeddingCompletedArticleIds: ['valid-article'],
        embeddingFailedArticleIds: [],
        embeddingEnqueueStatus: 'queued',
        embeddingRunId: 'publish_malformed_state',
    }));
    assert.equal(
        (await finalizePublishingJob(malformedStateJobId)).published,
        false,
        'Malformed durable pending IDs must never normalize into a publishable state.',
    );
    assert.equal((await jobs.doc(malformedStateJobId).get()).data().status, 'publishing');
    assert.equal((await finalizePublishingJob('bad/job-id')).published, false);

    const staleTitleJobId = 'publish-job-stale-title';
    const staleTitleArticleId = 'publish-article-stale-title';
    await Promise.all([
        jobs.doc(staleTitleJobId).set(jobData(staleTitleJobId, staleTitleArticleId)),
        articles.doc(staleTitleArticleId).set(articleData(staleTitleArticleId, staleTitleJobId)),
    ]);
    const staleTitleCategories = finalCategories(staleTitleArticleId);
    staleTitleCategories.billing.articles[0].title = 'Resolve a failed invoice';
    await publishApprovedJobLogic(staleTitleJobId, staleTitleCategories);
    const staleTitleJob = (await jobs.doc(staleTitleJobId).get()).data();
    assert.deepEqual(
        staleTitleJob.embeddingPendingArticleIds,
        [staleTitleArticleId],
        'Changing an article title must invalidate its existing embedding.',
    );
    assert.equal((await articles.doc(staleTitleArticleId).get()).data().active, false);
    assert.equal((await faqs.doc(`${staleTitleArticleId}_faq_1`).get()).data().status, 'needs_review');

    const replacementJobId = 'publish-job-replacement';
    const replacementArticleId = 'publish-article-replacement';
    const replacedArticleId = 'published-article-being-replaced';
    const replacedFaqId = `${replacedArticleId}_faq_1`;
    await Promise.all([
        jobs.doc(replacementJobId).set(jobData(replacementJobId, replacementArticleId, {
            articlesToReview: [{
                id: replacementArticleId,
                title: 'Fix a failed invoice',
                status: 'replace',
                similarArticles: [{
                    id: replacedArticleId,
                    title: 'Old failed invoice guidance',
                    categoryTitle: 'Billing',
                    sectionTitle: '',
                    status: 'published',
                    active: true,
                }],
            }],
        })),
        articles.doc(replacementArticleId).set(articleData(replacementArticleId, replacementJobId)),
        articles.doc(replacedArticleId).set({
            ...articleData(replacedArticleId, 'old-job', {
                active: true,
                status: 'published',
                faqIds: [replacedFaqId],
            }),
            jobId: 'old-job',
        }),
        faqs.doc(replacedFaqId).set({
            id: replacedFaqId,
            pId: 'AL',
            ...SCOPE,
            articleId: replacedArticleId,
            active: true,
            status: 'published',
            question: 'Old question',
            answer: 'Old answer',
        }),
        categories.doc(`categories_${SCOPE.tId}_${SCOPE.sId}`).set({
            pId: 'AL',
            ...SCOPE,
            categories: {
                old: {
                    id: 'old',
                    title: 'Old billing help',
                    active: true,
                    articles: [{ id: replacedArticleId, title: 'Old failed invoice guidance', active: true }],
                },
            },
        }),
    ]);
    await publishApprovedJobLogic(replacementJobId, finalCategories(replacementArticleId));
    assert.equal((await articles.doc(replacedArticleId).get()).exists, true, 'Replacement source stays live until atomic finalization.');
    assert.equal(
        (await categories.doc(`categories_${SCOPE.tId}_${SCOPE.sId}`).get()).data().categories.old.articles[0].id,
        replacedArticleId,
        'Existing navigation stays live until atomic finalization.',
    );
    const replacementJob = (await jobs.doc(replacementJobId).get()).data();
    await dispatchPublishingEmbeddingTasks(replacementJobId, replacementJob);
    assert.equal((await finalizePublishingJob(replacementJobId)).published, true);
    assert.equal((await articles.doc(replacedArticleId).get()).exists, false);
    assert.equal((await faqs.doc(replacedFaqId).get()).exists, false);
    const replacementNavigation = (await categories.doc(`categories_${SCOPE.tId}_${SCOPE.sId}`).get()).data().categories;
    assert.equal(replacementNavigation.old.articles.length, 0);
    assert.equal(replacementNavigation.billing.articles[0].id, replacementArticleId);

    const invalidContentJobId = 'publish-job-invalid-content';
    const invalidContentArticleId = 'publish-article-invalid-content';
    await Promise.all([
        jobs.doc(invalidContentJobId).set(jobData(invalidContentJobId, invalidContentArticleId)),
        articles.doc(invalidContentArticleId).set(articleData(invalidContentArticleId, invalidContentJobId, {
            content: { type: 'doc', content: [] },
        })),
    ]);
    await assert.rejects(
        publishApprovedJobLogic(invalidContentJobId, finalCategories(invalidContentArticleId)),
        /invalid content for embedding/,
    );
    assert.equal((await jobs.doc(invalidContentJobId).get()).data().status, 'needs_review');

    const unsafeArticleId = 'unsafe?article';
    await assert.rejects(
        publishApprovedJobLogic('unsafe-article-job', finalCategories(unsafeArticleId)),
        /article identity is invalid/,
    );

    const ownershipJobId = 'publish-job-foreign-invalidation';
    const ownershipArticleId = 'publish-article-foreign-invalidation';
    const cacheVersionRef = firestoreAdmin.collection(DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS)
        .doc(`kb_${SCOPE.tId}_${SCOPE.sId}`);
    await Promise.all([
        jobs.doc(ownershipJobId).set(jobData(ownershipJobId, ownershipArticleId, {
            status: 'publishing',
            categories: finalCategories(ownershipArticleId),
            embeddingPendingArticleIds: [],
            embeddingCompletedArticleIds: [],
            embeddingFailedArticleIds: [],
            embeddingEnqueueStatus: 'queued',
            embeddingRunId: 'publish_foreign_invalidation',
        })),
        articles.doc(ownershipArticleId).set(articleData(ownershipArticleId, ownershipJobId)),
        cacheVersionRef.set({
            pId: 'ML',
            ...SCOPE,
            source: 'kb',
            version: 99,
            marker: 'foreign-cache-version',
        }),
    ]);
    await assert.rejects(
        finalizePublishingJob(ownershipJobId),
        /cache-version ownership conflict/,
    );
    assert.equal((await cacheVersionRef.get()).data().marker, 'foreign-cache-version');
    assert.equal((await jobs.doc(ownershipJobId).get()).data().status, 'publishing');
    assert.equal((await articles.doc(ownershipArticleId).get()).data().status, 'needs_review');
    assert.equal((await articles.doc(ownershipArticleId).get()).data().active, false);

    process.stdout.write(`${sharedRuntime ? 'Shared' : 'Dedicated'} Answerlattice KB publishing emulator tests passed.\n`);
}

run()
    .then(() => firestoreAdmin.terminate())
    .catch(async (error) => {
        console.error(error);
        await firestoreAdmin.terminate().catch(() => undefined);
        process.exit(1);
    });
