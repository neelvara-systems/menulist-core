'use client';

import {
    getPublicTruthMonitorSummary,
    refreshPublicTruthMonitor,
} from '@database/publicTruthMonitor';
import {
    getPublicTruthMonitorClientCacheKey,
    getPublicTruthMonitorClientScope,
} from '@lib/public-truth-tools/publicTruthMonitorClientContracts';
import type {
    PublicTruthMonitorEntitlementResult,
    PublicTruthMonitorSummaryDocument,
} from '@type/publicTruthMonitor';
import useSWR from 'swr';

const DISABLED_ENTITLEMENT: PublicTruthMonitorEntitlementResult = {
    allowed: false,
    message: 'Public truth history is not available yet.',
    mode: 'disabled',
    reason: 'feature_off',
};

export function usePublicTruthMonitor({
    enabled = true,
    selectedProjectId,
    storeId,
    tenantId,
}: {
    enabled?: boolean;
    selectedProjectId?: string | null;
    storeId?: string | number | null;
    tenantId?: string | number | null;
}) {
    const scope = getPublicTruthMonitorClientScope(tenantId, storeId);
    const cacheKey = enabled && scope ? getPublicTruthMonitorClientCacheKey(scope) : null;
    const fetcher = scope ? () => getPublicTruthMonitorSummary(scope) : null;
    const request = useSWR(
        cacheKey,
        fetcher,
        {
            dedupingInterval: 10 * 60 * 1000,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        },
    );
    const data = request.data || null;

    return {
        entitlement: data?.entitlement || DISABLED_ENTITLEMENT,
        error: request.error,
        isLoading: request.isLoading,
        refresh: async (): Promise<PublicTruthMonitorSummaryDocument | null> => {
            if (!scope) return null;
            const result = await refreshPublicTruthMonitor({ scope, selectedProjectId });
            await request.mutate({
                entitlement: result.entitlement,
                summary: result.summary,
            }, false);
            return result.summary;
        },
        summary: data?.summary || null,
    };
}
