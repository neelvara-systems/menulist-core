import {
    AnswerlatticeProposalImpactResponseSchema,
    type AnswerlatticeProposalImpactResponse,
} from '@lib/answerlattice/proposalImpactContracts';
import type { AnswerlatticeGovernanceEditedContent } from '@lib/answerlattice/governanceContracts';
import { createRuntimeId } from '@lib/runtime/randomId';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

const PROPOSAL_IMPACT_ENDPOINT = '/api/answerlattice/answer-tests/proposal-impact';
const PROPOSAL_IMPACT_RESPONSE_MAX_BYTES = 128 * 1024;
const PROPOSAL_IMPACT_TIMEOUT_MS = 30_000;
const PROPOSAL_IMPACT_FAILED = 'Could not check the proposed answer';

export async function checkAnswerlatticeProposalImpact(
    proposalId: string,
    editedContent?: AnswerlatticeGovernanceEditedContent,
): Promise<AnswerlatticeProposalImpactResponse> {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), PROPOSAL_IMPACT_TIMEOUT_MS);
    try {
        const response = await fetch(PROPOSAL_IMPACT_ENDPOINT, {
            method: 'POST',
            cache: 'no-store',
            credentials: 'same-origin',
            redirect: 'manual',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                requestId: createRuntimeId('al_impact'),
                proposalId,
                ...(editedContent ? { editedContent } : {}),
            }),
        });

        const payload = await readJsonResponseWithLimit<unknown>(
            response,
            PROPOSAL_IMPACT_RESPONSE_MAX_BYTES,
        );
        const parsed = AnswerlatticeProposalImpactResponseSchema.safeParse(payload);
        if (!response.ok || !parsed.success || parsed.data.proposalId !== proposalId) {
            throw new Error(PROPOSAL_IMPACT_FAILED);
        }
        return parsed.data;
    } catch {
        throw new Error(PROPOSAL_IMPACT_FAILED);
    } finally {
        globalThis.clearTimeout(timeout);
    }
}
