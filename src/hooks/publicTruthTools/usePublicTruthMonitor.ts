'use client';

import {
    getPublicTruthMonitorSummary,
    refreshPublicTruthMonitor,
} from '@database/publicTruthMonitor';
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
}: {
    enabled?: boolean;
    selectedProjectId?: string | null;
    storeId?: string | number | null;
}) {
    const shouldLoad = Boolean(enabled && storeId);
    const request = useSWR(
        shouldLoad ? ['publicTruthMonitorSummary', String(storeId)] : null,
        getPublicTruthMonitorSummary,
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
            const result = await refreshPublicTruthMonitor({ selectedProjectId });
            await request.mutate({
                entitlement: result.entitlement,
                summary: result.summary,
            }, false);
            return result.summary;
        },
        summary: data?.summary || null,
    };
}
