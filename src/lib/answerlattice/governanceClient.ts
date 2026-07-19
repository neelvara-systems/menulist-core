import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

import type {
    AnswerlatticeGovernanceAction,
    AnswerlatticeGovernanceActionResult,
} from './governanceContracts';
import { AnswerlatticeGovernanceActionResultSchema } from './governanceContracts';

const GOVERNANCE_ENDPOINT = '/api/answerlattice/governance/actions';
const GOVERNANCE_RESPONSE_MAX_BYTES = 16 * 1024;
const GOVERNANCE_ACTION_FAILED = 'Answerlattice governance action failed';

export class AnswerlatticeGovernanceClientError extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = 'AnswerlatticeGovernanceClientError';
    }
}

const getGovernanceErrorMessage = (payload: unknown): string | null => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    const error = (payload as { error?: unknown }).error;
    if (typeof error !== 'string') return null;
    const normalized = error.trim();
    return normalized && normalized.length <= 500 ? normalized : null;
};

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

    if (!response.ok) {
        throw new AnswerlatticeGovernanceClientError(
            getGovernanceErrorMessage(payload) || GOVERNANCE_ACTION_FAILED,
        );
    }

    const parsed = AnswerlatticeGovernanceActionResultSchema.safeParse(payload);
    if (!parsed.success || parsed.data.action !== action.action) {
        throw new AnswerlatticeGovernanceClientError(GOVERNANCE_ACTION_FAILED);
    }

    return parsed.data;
}
