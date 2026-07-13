import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

import type {
    AnswerlatticeGovernanceAction,
    AnswerlatticeGovernanceActionResult,
} from './governanceContracts';
import { AnswerlatticeGovernanceActionResultSchema } from './governanceContracts';

const GOVERNANCE_ENDPOINT = '/api/answerlattice/governance/actions';
const GOVERNANCE_RESPONSE_MAX_BYTES = 16 * 1024;
const GOVERNANCE_ACTION_FAILED = 'Answerlattice governance action failed';

export async function runAnswerlatticeGovernanceAction(
    action: AnswerlatticeGovernanceAction,
): Promise<AnswerlatticeGovernanceActionResult> {
    const response = await fetch(GOVERNANCE_ENDPOINT, {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        redirect: 'manual',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(action),
    });

    let payload: unknown;
    try {
        payload = await readJsonResponseWithLimit<unknown>(response, GOVERNANCE_RESPONSE_MAX_BYTES);
    } catch {
        throw new Error(GOVERNANCE_ACTION_FAILED);
    }

    const parsed = AnswerlatticeGovernanceActionResultSchema.safeParse(payload);
    if (!response.ok || !parsed.success || parsed.data.action !== action.action) {
        throw new Error(GOVERNANCE_ACTION_FAILED);
    }

    return parsed.data;
}
