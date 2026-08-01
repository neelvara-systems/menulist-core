import assert from 'node:assert/strict';

import { runAnswerlatticeOntologyAction } from '../../src/lib/answerlattice/ontologyClient';
import {
    acquireAnswerlatticePendingMutation,
    settleAnswerlatticePendingMutation,
    type AnswerlatticePendingMutationEntry,
} from '../../src/lib/answerlattice/pendingMutationRequests';

type DeferredResponse = {
    resolve: (response: Response) => void;
};

const originalFetch = globalThis.fetch;
const requests: Array<{ body: Record<string, unknown>; deferred: DeferredResponse }> = [];

const successResponse = (action: string): Response => new Response(JSON.stringify({
    success: true,
    action,
    replayed: false,
}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
});

async function run(): Promise<void> {
    const registry = new Map<string, AnswerlatticePendingMutationEntry>();
    const firstClaim = acquireAnswerlatticePendingMutation(
        registry,
        'same-action',
        'same-fingerprint',
        () => 'request-same',
        5,
    );
    const concurrentClaim = acquireAnswerlatticePendingMutation(
        registry,
        'same-action',
        'same-fingerprint',
        () => 'must-not-be-used',
        5,
    );
    assert.equal(concurrentClaim.requestId, firstClaim.requestId);
    assert.equal(settleAnswerlatticePendingMutation(registry, 'same-action', firstClaim), true);
    assert.equal(registry.has('same-action'), true, 'one acknowledgement must retain an unresolved concurrent claim');
    assert.equal(settleAnswerlatticePendingMutation(registry, 'same-action', concurrentClaim), true);
    assert.equal(registry.has('same-action'), false);

    globalThis.fetch = (async (_input, init) => new Promise<Response>((resolve) => {
        requests.push({
            body: JSON.parse(String(init?.body || '{}')) as Record<string, unknown>,
            deferred: { resolve },
        });
    })) as typeof fetch;

    const first = runAnswerlatticeOntologyAction({
        action: 'deprecate_entity',
        entityId: 'entity-one',
    }, 'shared-editor-action');
    const second = runAnswerlatticeOntologyAction({
        action: 'deprecate_entity',
        entityId: 'entity-two',
    }, 'shared-editor-action');

    assert.equal(requests.length, 2);
    const firstRequestId = requests[0].body.requestId;
    const secondRequestId = requests[1].body.requestId;
    assert.equal(typeof firstRequestId, 'string');
    assert.equal(typeof secondRequestId, 'string');
    assert.notEqual(firstRequestId, secondRequestId);

    requests[0].deferred.resolve(successResponse('deprecate_entity'));
    await first;

    const secondRetry = runAnswerlatticeOntologyAction({
        action: 'deprecate_entity',
        entityId: 'entity-two',
    }, 'shared-editor-action');
    assert.equal(requests.length, 3);
    assert.equal(
        requests[2].body.requestId,
        secondRequestId,
        'an older response must not retire the newer action idempotency key',
    );

    requests[1].deferred.resolve(successResponse('deprecate_entity'));
    requests[2].deferred.resolve(successResponse('deprecate_entity'));
    await Promise.all([second, secondRetry]);
}

run()
    .then(() => process.stdout.write('Answerlattice ontology client settlement tests passed.\n'))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    })
    .finally(() => {
        globalThis.fetch = originalFetch;
    });
