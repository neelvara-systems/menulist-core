import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    extractEntitiesFromArticles,
    extractPlainTextFromTipTap,
} from '../../src/lib/answerlattice/entityExtraction';
import { normalizeAnswerlatticeEntityCandidateIdentityName } from '../../src/lib/answerlattice/entityCandidateIdentity';

const article = {
    title: 'Webhook retries',
    content: 'Webhook retry configuration controls delivery recovery after an endpoint failure.',
    category: 'Integrations',
};
const scope = { tId: 71, sId: 701 };

async function run() {
    assert.equal(normalizeAnswerlatticeEntityCandidateIdentityName('Invoice Recovery'), 'invoice recovery');
    assert.equal(normalizeAnswerlatticeEntityCandidateIdentityName('سجل الإصدارات'), 'سجل الإصدارات');
    assert.notEqual(
        normalizeAnswerlatticeEntityCandidateIdentityName('سجل الإصدارات'),
        normalizeAnswerlatticeEntityCandidateIdentityName('إدارة الفواتير'),
    );
    let persistedCandidateCount = 0;
    const persistCandidate = async () => {
        persistedCandidateCount += 1;
    };

    const confirmedEmpty = await extractEntitiesFromArticles(
        [article],
        scope.tId,
        scope.sId,
        async () => JSON.stringify({ entities: [] }),
        [],
        persistCandidate,
    );
    assert.equal(confirmedEmpty.successfulBatchCount, 1);
    assert.equal(confirmedEmpty.failedBatchCount, 0);
    assert.deepEqual(confirmedEmpty.matchedEntityIds, []);
    assert.equal(
        persistedCandidateCount,
        0,
        'An explicitly empty provider result must not create a candidate.',
    );

    const malformed = await extractEntitiesFromArticles(
        [article],
        scope.tId,
        scope.sId,
        async () => JSON.stringify({
            entities: [{
                name: 'Webhooks',
                type: 'integration',
                confidence: 'high',
            }],
        }),
        [],
        persistCandidate,
    );
    assert.equal(malformed.successfulBatchCount, 0);
    assert.equal(malformed.failedBatchCount, 1);
    assert.deepEqual(malformed.matchedEntityIds, []);
    assert.equal(
        persistedCandidateCount,
        0,
        'Malformed provider output must not create candidates or qualify as confirmed extraction.',
    );

    const existingMatch = await extractEntitiesFromArticles(
        [article],
        scope.tId,
        scope.sId,
        async () => JSON.stringify({
            entities: [{
                name: 'Webhooks',
                type: 'integration',
                confidence: 0.95,
                description: 'Webhook delivery and retry behavior.',
                source: 'existing',
            }],
        }),
        [{
            id: 'entity_webhooks',
            name: 'Webhooks',
            slug: 'webhooks',
            aliases: ['webhook'],
        }],
        persistCandidate,
    );
    assert.equal(existingMatch.successfulBatchCount, 1);
    assert.equal(existingMatch.failedBatchCount, 0);
    assert.deepEqual(existingMatch.matchedEntityIds, ['entity_webhooks']);
    assert.equal(existingMatch.newCandidateCount, 0);
    assert.equal(
        persistedCandidateCount,
        0,
        'A registry match must reuse the governed entity instead of creating a candidate.',
    );

    const deferred = await extractEntitiesFromArticles(
        [article],
        scope.tId,
        scope.sId,
        async () => JSON.stringify({
            entities: [{
                name: 'Delivery Recovery',
                type: 'workflow',
                confidence: 0.88,
                description: 'Delivery recovery governs retries after an endpoint failure.',
                source: 'new',
            }],
        }),
        [],
        persistCandidate,
        { persistCandidates: false },
    );
    assert.equal(deferred.candidateDrafts?.length, 1);
    assert.equal(persistedCandidateCount, 0, 'deferred extraction must not write candidates before source revalidation');

    const ambiguous = await extractEntitiesFromArticles(
        [article],
        scope.tId,
        scope.sId,
        async () => JSON.stringify({
            entities: [{
                name: 'Webhook',
                type: 'integration',
                confidence: 0.9,
                description: 'Webhook delivery integration.',
                source: 'existing',
            }],
        }),
        [
            { id: 'entity_webhook_a', name: 'Webhook Delivery', slug: 'webhook-delivery', aliases: ['webhook'] },
            { id: 'entity_webhook_b', name: 'Webhook Events', slug: 'webhook-events', aliases: ['webhook'] },
        ],
        persistCandidate,
        { persistCandidates: false },
    );
    assert.deepEqual(ambiguous.matchedEntityIds, []);
    assert.equal(ambiguous.candidateDrafts?.length, 1, 'ambiguous aliases must become review work instead of an arbitrary link');

    const multilingual = await extractEntitiesFromArticles(
        [article],
        scope.tId,
        scope.sId,
        async () => JSON.stringify({
            entities: [
                {
                    name: 'إدارة الفواتير',
                    type: 'feature',
                    confidence: 0.91,
                    description: 'تدير الفواتير وحالات الدفع.',
                    source: 'new',
                },
                {
                    name: 'سجل الإصدارات',
                    type: 'feature',
                    confidence: 0.9,
                    description: 'يمثل سجل إصدارات المنتج.',
                    source: 'new',
                },
            ],
        }),
        [],
        persistCandidate,
        { persistCandidates: false },
    );
    assert.equal(multilingual.candidateDrafts?.length, 2, 'distinct non-Latin entities must not collapse during deduplication');

    const cyclicContent: Record<string, unknown> = { type: 'doc', content: [] };
    (cyclicContent.content as unknown[]).push(cyclicContent);
    assert.doesNotThrow(() => extractPlainTextFromTipTap(cyclicContent));
    assert.ok(extractPlainTextFromTipTap('x'.repeat(30_000)).length <= 20_000);
    assert.equal(extractPlainTextFromTipTap(new Proxy({}, {
        get() {
            throw new Error('hostile rich-text access');
        },
    })), '');

    const routeSource = fs.readFileSync(
        path.resolve(__dirname, '../../src/app/api/answerlattice/articles/extract-entities/route.ts'),
        'utf8',
    );
    const extractionSource = fs.readFileSync(
        path.resolve(__dirname, '../../src/lib/answerlattice/entityExtraction.ts'),
        'utf8',
    );
    const standaloneHelperSource = extractionSource.slice(
        extractionSource.indexOf('export async function extractEntitiesForArticle('),
    );
    assert.match(
        standaloneHelperSource,
        /existingContext,\s*async \(\) => undefined,\s*\{ persistCandidates: false \}/,
        'The standalone non-persisting helper must not invoke the disabled browser candidate writer',
    );
    assert.match(routeSource, /buildArticleSourceFingerprint\(currentArticle\) !== sourceFingerprint/);
    assert.doesNotMatch(routeSource, /content: z\.any\(\)/);
    assert.doesNotMatch(routeSource, /persistedArticle\.title \|\| article\.title/);
    assert.doesNotMatch(routeSource, /persistedArticle\.categoryTitle \|\| article\.categoryTitle/);
    assert.match(routeSource, /if \(providerUnavailable\) \{[\s\S]*?\{ status: 503 \}/);
    assert.match(routeSource, /\{ persistCandidates: false \}/);
    assert.match(routeSource, /readAnswerlatticeInvalidationOwnership\(\{/);
    assert.match(routeSource, /getAnswerlatticeMissingBundleManifestBase\(scope\)/);
    assert.ok(
        routeSource.indexOf('const invalidationOwnership = await readAnswerlatticeInvalidationOwnership')
            < routeSource.indexOf('transaction.update(articleRef'),
        'article invalidation ownership must be verified before transaction writes begin',
    );
    assert.ok(
        routeSource.indexOf('const matchedEntityIds = await syncArticleEntityIds')
            < routeSource.indexOf('for (const candidate of result.candidateDrafts'),
        'candidate persistence must occur only after the article links pass transaction revalidation',
    );
}

run()
    .then(() => {
        process.stdout.write('Answerlattice entity extraction contract tests passed.\n');
    })
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
