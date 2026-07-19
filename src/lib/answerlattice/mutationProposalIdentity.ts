import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import { hashAnswerlatticeSignalIdentity } from '@lib/answerlattice/signalIdentity';

export const buildAnswerlatticeManualMutationProposalId = (params: {
    tId: unknown;
    sId: unknown;
    requestId: unknown;
}): string | null => {
    const tId = normalizeAnswerlatticeScopeDocumentId(params.tId);
    const sId = normalizeAnswerlatticeScopeDocumentId(params.sId);
    const requestId = typeof params.requestId === 'string' ? params.requestId.trim() : '';
    if (!tId || !sId || !requestId || requestId.length > 80) return null;
    return `almp_manual_${hashAnswerlatticeSignalIdentity(`${tId}:${sId}:${requestId}`)}`;
};
