export const POS_SYNC_CONNECTION_ISSUE_FAILURE_THRESHOLD = 3;

export type PosSyncDeliveryOutcome = {
    consecutiveFailures: number;
    lastCompletedMenuVersion: number;
    lastError: string;
    lastStatus: 'failed' | 'success';
    status: 'connection_issue' | 'healthy';
};

function getNonnegativeSafeInteger(value: unknown): number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function normalizePosSyncMenuVersion(value: unknown): number | null {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function getNextPosSyncMenuVersion(value: unknown): number | null {
    const normalized = normalizePosSyncMenuVersion(value);
    if (value !== undefined && value !== null && normalized === null) return null;
    const current = normalized ?? 0;
    return current < Number.MAX_SAFE_INTEGER ? current + 1 : null;
}

export function resolvePosSyncDeliveryOutcome(params: {
    connectionIssueMessage: string;
    currentConsecutiveFailures: unknown;
    currentLastCompletedMenuVersion: unknown;
    currentStatus: unknown;
    menuVersion: number;
    success: boolean;
}): PosSyncDeliveryOutcome | null {
    if (
        !Number.isSafeInteger(params.menuVersion)
        || params.menuVersion <= getNonnegativeSafeInteger(params.currentLastCompletedMenuVersion)
    ) return null;

    if (params.success) {
        return {
            consecutiveFailures: 0,
            lastCompletedMenuVersion: params.menuVersion,
            lastError: '',
            lastStatus: 'success',
            status: 'healthy',
        };
    }

    const nextConsecutiveFailures = Math.min(
        POS_SYNC_CONNECTION_ISSUE_FAILURE_THRESHOLD,
        getNonnegativeSafeInteger(params.currentConsecutiveFailures) + 1,
    );
    const reachedConnectionIssue = nextConsecutiveFailures >= POS_SYNC_CONNECTION_ISSUE_FAILURE_THRESHOLD
        || params.currentStatus === 'connection_issue';
    return {
        consecutiveFailures: nextConsecutiveFailures,
        lastCompletedMenuVersion: params.menuVersion,
        lastError: reachedConnectionIssue ? params.connectionIssueMessage : '',
        lastStatus: 'failed',
        status: reachedConnectionIssue ? 'connection_issue' : 'healthy',
    };
}
