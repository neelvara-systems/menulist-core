import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { PRODUCT_IDS } from '../../src/constants/product';
import {
    addAiSearchHistoryServer,
    findCachedSearchByCacheKeyServer,
} from '../../src/database/aiSearchHistory/server';
import {
    getCachedEmbedding,
    saveCachedEmbedding,
} from '../../src/database/queryEmbeddings';
import {
    AnswerlatticeVector,
    requireAnswerlatticeFirestoreAdmin,
} from '../../src/lib/firebase/answerlatticeFirebaseAdmin';

const scope = { tId: 31, sId: 3101 };
const db = requireAnswerlatticeFirestoreAdmin();
const vectorValues = Array.from({ length: 768 }, (_, index) => (index % 17) / 17);

const embeddingDocumentId = (cacheKey: string, embeddingScope = scope) => (
    `qe_${createHash('sha256')
        .update(JSON.stringify([PRODUCT_IDS.ANSWERLATTICE, embeddingScope.tId, embeddingScope.sId, cacheKey]))
        .digest('hex')}`
);

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const cacheKey = `${scope.tId}:${scope.sId}:query/with unsafe document separators`;
    await saveCachedEmbedding(
        cacheKey,
        'Why did my invoice fail?',
        new AnswerlatticeVector(vectorValues),
        scope,
    );

    const embeddingDoc = await db.collection(DB_COLLECTIONS.QUERY_EMBEDDINGS)
        .doc(embeddingDocumentId(cacheKey, scope))
        .get();
    assert.equal(embeddingDoc.exists, true);
    assert.equal(embeddingDoc.data()?.pId, PRODUCT_IDS.ANSWERLATTICE);
    assert.equal(embeddingDoc.data()?.tId, scope.tId);
    assert.equal(embeddingDoc.data()?.sId, scope.sId);
    assert.equal(embeddingDoc.data()?.query, undefined, 'embedding cache must not duplicate raw user queries');
    assert.equal(embeddingDoc.data()?.vector?.length, 768);

    const cachedVector = await getCachedEmbedding(cacheKey, scope);
    assert.ok(cachedVector);
    assert.deepEqual(cachedVector?.toArray(), vectorValues);
    const otherScope = { tId: scope.tId, sId: scope.sId + 1 };
    const otherVectorValues = vectorValues.map((value) => value / 2);
    await saveCachedEmbedding(
        cacheKey,
        'Why did my invoice fail?',
        new AnswerlatticeVector(otherVectorValues),
        otherScope,
    );
    assert.deepEqual(
        (await getCachedEmbedding(cacheKey, scope))?.toArray(),
        vectorValues,
        'a same-key write in another workspace must not overwrite the first workspace cache',
    );
    assert.deepEqual(
        (await getCachedEmbedding(cacheKey, otherScope))?.toArray(),
        otherVectorValues,
        'same raw cache keys must coexist under independently scoped document identities',
    );
    await assert.rejects(
        () => getCachedEmbedding(cacheKey, { tId: scope.tId, sId: String(scope.sId) as unknown as number }),
        /scope is invalid/,
        'runtime scope aliases must not be coerced into cache authority',
    );

    const expiredCacheKey = `${scope.tId}:${scope.sId}:expired-query-embedding`;
    const expiredDocRef = db.collection(DB_COLLECTIONS.QUERY_EMBEDDINGS)
        .doc(embeddingDocumentId(expiredCacheKey, scope));
    await expiredDocRef.set({
        pId: PRODUCT_IDS.ANSWERLATTICE,
        ...scope,
        cacheKeyHash: createHash('sha256').update(expiredCacheKey).digest('hex'),
        queryLength: 8,
        vector: vectorValues,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 60_000),
        retentionDays: 30,
        hitCount: 0,
    });
    assert.equal(
        await getCachedEmbedding(expiredCacheKey, scope),
        null,
        'embedding cache must reject an explicitly expired row even before asynchronous TTL deletion',
    );
    assert.equal((await expiredDocRef.get()).exists, false, 'expired embedding cache row should be removed');

    const missingCreatedAtCacheKey = `${scope.tId}:${scope.sId}:missing-created-at`;
    const missingCreatedAtDocRef = db.collection(DB_COLLECTIONS.QUERY_EMBEDDINGS)
        .doc(embeddingDocumentId(missingCreatedAtCacheKey, scope));
    await missingCreatedAtDocRef.set({
        pId: PRODUCT_IDS.ANSWERLATTICE,
        ...scope,
        cacheKeyHash: createHash('sha256').update(missingCreatedAtCacheKey).digest('hex'),
        queryLength: 8,
        vector: vectorValues,
        expiresAt: new Date(Date.now() + 60_000),
        retentionDays: 30,
        hitCount: 0,
    });
    assert.equal(
        await getCachedEmbedding(missingCreatedAtCacheKey, scope),
        null,
        'legacy embedding cache rows without creation time must fail closed',
    );
    assert.equal((await missingCreatedAtDocRef.get()).exists, false, 'invalid legacy embedding row should be removed');

    const historyCacheKey = `${scope.tId}:${scope.sId}:rag-v5:billing invoice failure`;
    const fullReference: any = {
        id: 'article-billing-failure',
        title: 'Resolve a failed invoice',
        url: '/billing/failed-invoice',
        categoryId: 'billing',
        sectionId: 'invoices',
        categoryTitle: 'Billing',
        sectionTitle: 'Invoices',
        similarityScore: 0.91,
        content: { type: 'doc', content: [{ type: 'paragraph', text: 'large duplicated body' }] },
        embedding: vectorValues,
        tId: scope.tId,
        sId: scope.sId,
    };
    const citationCandidate: any = {
        id: 'citation-billing-failure',
        title: 'Failed invoice documentation',
        url: 'https://docs.example.com/billing/failed-invoice',
        sourceId: 'source-private-billing',
    };
    const history = await addAiSearchHistoryServer({
        query: 'Why did my invoice fail?',
        cacheKey: historyCacheKey,
        craftedAnswer: 'Open Billing, review the failed invoice, and retry with an active payment method.',
        references: [fullReference],
        citations: [citationCandidate],
        suggestedQuestions: ['How can I retry the invoice?'],
        answerSource: 'rag',
        answerType: 'faq',
        drifted: false,
        canonical: false,
        fallbackReason: 'canonical_scope_context_required',
        clarification: { type: 'scope_context', requiredContext: ['plan', 'role', 'plan'] },
        mountContext: 'help_center',
        uId: 'owner-31',
        ...scope,
    });

    assert.ok(history.id, 'persisted search history must acknowledge its document ID');
    const historyDoc = await db.collection(DB_COLLECTIONS.AI_SEARCH_HISTORY).doc(history.id).get();
    assert.equal(historyDoc.data()?.cacheKey, createHash('sha256').update(historyCacheKey).digest('hex'));
    assert.equal(historyDoc.data()?.responseCacheVersion, 2);
    assert.deepEqual(historyDoc.data()?.suggestedQuestions, ['How can I retry the invoice?']);
    assert.equal(historyDoc.data()?.answerType, 'faq');
    assert.equal(historyDoc.data()?.drifted, false);
    assert.equal(historyDoc.data()?.references?.[0]?.content, undefined);
    assert.equal(historyDoc.data()?.references?.[0]?.embedding, undefined);
    assert.equal(historyDoc.data()?.references?.[0]?.tId, undefined);
    assert.equal(historyDoc.data()?.references?.[0]?.sId, undefined);
    assert.equal(historyDoc.data()?.citations?.[0]?.sourceId, undefined, 'public citation cache must remove internal source IDs');

    const cachedHistory = await findCachedSearchByCacheKeyServer(historyCacheKey, {
        tId: scope.tId,
        sId: scope.sId,
    });
    assert.equal(cachedHistory?.id, history.id);
    assert.equal(cachedHistory?.references.length, 1);
    assert.equal(cachedHistory?.references[0]?.id, fullReference.id);
    assert.deepEqual(cachedHistory?.suggestedQuestions, ['How can I retry the invoice?']);
    assert.equal(cachedHistory?.answerType, 'faq');
    assert.equal(cachedHistory?.drifted, false);
    assert.deepEqual(cachedHistory?.citations, [{
        id: 'citation-billing-failure',
        title: 'Failed invoice documentation',
        url: 'https://docs.example.com/billing/failed-invoice',
    }]);
    assert.deepEqual(cachedHistory?.clarification, { type: 'scope_context', requiredContext: ['plan', 'role'] });
    assert.equal(
        await findCachedSearchByCacheKeyServer(historyCacheKey, {
            tId: scope.tId,
            sId: scope.sId + 1,
        }),
        null,
        'search-history cache must not cross workspace scope',
    );

    await historyDoc.ref.update({ responseCacheVersion: 1 });
    assert.equal(
        await findCachedSearchByCacheKeyServer(historyCacheKey, scope),
        null,
        'legacy compact history rows must remain analytics records but cannot replay as complete responses',
    );

    const malformedReplayCases: Array<{
        cacheKey: string;
        field: string;
        value: unknown;
    }> = [
        {
            cacheKey: `${scope.tId}:${scope.sId}:malformed-clarification`,
            field: 'clarification',
            value: { type: 'scope_context', requiredContext: ['plan', 'invalid'] },
        },
        {
            cacheKey: `${scope.tId}:${scope.sId}:malformed-entity-ids`,
            field: 'matchedEntityIds',
            value: ['entity-1', ' entity-1 '],
        },
        {
            cacheKey: `${scope.tId}:${scope.sId}:malformed-source-versions`,
            field: 'sourceVersions',
            value: { kb: '1' },
        },
        {
            cacheKey: `${scope.tId}:${scope.sId}:malformed-answer-id`,
            field: 'canonicalAnswerId',
            value: ' answer-1 ',
        },
    ];
    for (const malformedCase of malformedReplayCases) {
        await db.collection(DB_COLLECTIONS.AI_SEARCH_HISTORY).add({
            pId: PRODUCT_IDS.ANSWERLATTICE,
            ...scope,
            cacheKey: createHash('sha256').update(malformedCase.cacheKey).digest('hex'),
            query: 'Can this corrupted row replay?',
            craftedAnswer: 'This answer must not be returned.',
            references: [],
            citations: [],
            suggestedQuestions: [],
            responseCacheVersion: 2,
            createdOn: new Date(),
            modifiedOn: new Date(),
            expiresAt: new Date(Date.now() + 60_000),
            retentionDays: 30,
            [malformedCase.field]: malformedCase.value,
        });
        assert.equal(
            await findCachedSearchByCacheKeyServer(malformedCase.cacheKey, scope),
            null,
            `search-history cache must reject malformed ${malformedCase.field}`,
        );
    }

    process.stdout.write('Answerlattice search cache emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
