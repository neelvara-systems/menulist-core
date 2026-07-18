import assert from 'node:assert/strict';

import { extractEntitiesFromArticles } from '../../src/lib/answerlattice/entityExtraction';

const article = {
    title: 'Webhook retries',
    content: 'Webhook retry configuration controls delivery recovery after an endpoint failure.',
    category: 'Integrations',
};
const scope = { tId: 71, sId: 701 };

async function run() {
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
}

run()
    .then(() => {
        process.stdout.write('Answerlattice entity extraction contract tests passed.\n');
    })
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
