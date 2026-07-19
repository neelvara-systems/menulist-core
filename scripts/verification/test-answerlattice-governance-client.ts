import assert from 'node:assert/strict';

import {
    AnswerlatticeGovernanceClientError,
    runAnswerlatticeGovernanceAction,
} from '../../src/lib/answerlattice/governanceClient';

const originalFetch = globalThis.fetch;

async function run(): Promise<void> {
    globalThis.fetch = (async () => new Response(JSON.stringify({
        error: 'The approved answer changed after this proposal was created. Review the latest answer and submit a new proposal.',
    }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    await assert.rejects(
        runAnswerlatticeGovernanceAction({ action: 'reject_proposal', proposalId: 'proposal_123' }),
        (error: unknown) => (
            error instanceof AnswerlatticeGovernanceClientError
            && /approved answer changed/i.test(error.message)
        ),
        'safe governance API errors must reach the review workflow',
    );

    globalThis.fetch = (async () => new Response(JSON.stringify({
        success: true,
        action: 'reject_proposal',
        proposalId: 'proposal_123',
        status: 'rejected',
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    const result = await runAnswerlatticeGovernanceAction({
        action: 'reject_proposal',
        proposalId: 'proposal_123',
    });
    assert.equal(result.status, 'rejected');

    globalThis.fetch = (async () => new Response(JSON.stringify({
        success: true,
        action: 'approve_proposal',
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    await assert.rejects(
        runAnswerlatticeGovernanceAction({ action: 'reject_proposal', proposalId: 'proposal_123' }),
        (error: unknown) => (
            error instanceof AnswerlatticeGovernanceClientError
            && error.message === 'Answerlattice governance action failed'
        ),
        'mismatched success payloads must fail closed without exposing response internals',
    );
}

run()
    .then(() => process.stdout.write('Answerlattice governance client tests passed.\n'))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    })
    .finally(() => {
        globalThis.fetch = originalFetch;
    });
