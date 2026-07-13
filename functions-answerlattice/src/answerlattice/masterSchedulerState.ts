export function resolveAnswerlatticeTenantSettlementCompletionStatus(
    tenantStatus: 'success' | 'partial' | 'failed' | undefined,
): 'completed' | 'failed' {
    return tenantStatus === 'failed' || tenantStatus === undefined ? 'failed' : 'completed';
}
