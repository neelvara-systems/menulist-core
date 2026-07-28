import { getOwnerDashboardSettled } from '@database/ownerDashboard';
import {
    getCachedData,
    setCachedData,
    shouldRevalidate,
} from '@lib/cache/swrLocalStorageProvider';
import { getAnalyticsSchedulerCacheKey } from '@lib/analytics/dateKey';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import {
    AnalyticsAiEntitlement,
    OwnerActionPlan,
    OwnerConfidence,
    OwnerDashboardData,
    SourceQuality,
} from '@template/main-app/projects/types';
import { useContext, useMemo } from 'react';
import useSWR from 'swr';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { resolveOwnerBusinessAssistantClientScope } from '@lib/ownerBusinessAssistant/clientScope';

interface UseOwnerActionPlanResult {
    actionPlan?: OwnerActionPlan;
    confidence?: OwnerConfidence;
    sourceQuality: SourceQuality[];
    analyticsAiEntitlement?: AnalyticsAiEntitlement;
    loading: boolean;
}

const SWR_CONFIG = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 86400000,
    errorRetryCount: 1,
};

function createCacheKey(tId: string, sId: string, projectId: string): string {
    return `ownerDashboard-settled-${tId}-${sId}-${projectId}`;
}

async function cachedSettledFetcher(
    cacheKey: string,
    fetcher: () => Promise<OwnerDashboardData | null>,
    schedulerCacheKey: string,
): Promise<OwnerDashboardData | null> {
    if (!shouldRevalidate(cacheKey, schedulerCacheKey)) {
        const cached = getCachedData<OwnerDashboardData>(cacheKey, undefined, schedulerCacheKey);
        if (cached !== undefined) return cached;
    }

    const data = await fetcher();
    if (data) {
        setCachedData(cacheKey, data, schedulerCacheKey);
    }
    return data;
}

export function useOwnerActionPlan(projectId?: string | null): UseOwnerActionPlanResult {
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const session = useClientAuthSession();
    const scope = useMemo(
        () => resolveOwnerBusinessAssistantClientScope(session, storeDetails?.storeId, storeDetails?.tenantId),
        [session, storeDetails?.storeId, storeDetails?.tenantId],
    );
    const tId = scope?.tenantId || null;
    const sId = scope?.storeId || null;
    const canFetch = Boolean(tId && sId && projectId);
    const schedulerCacheKey = useMemo(
        () => getAnalyticsSchedulerCacheKey(new Date(), storeDetails?.timeZone, storeDetails?.businessDayEndTime),
        [storeDetails?.timeZone, storeDetails?.businessDayEndTime],
    );
    const cacheKey = canFetch ? createCacheKey(tId!, sId!, projectId!) : null;
    const fallbackData = useMemo(
        () => cacheKey ? getCachedData<OwnerDashboardData>(cacheKey, undefined, schedulerCacheKey) : undefined,
        [cacheKey, schedulerCacheKey],
    );

    const { data, isLoading } = useSWR(
        canFetch ? ['ownerActionPlan', tId, sId, projectId] : null,
        () => cachedSettledFetcher(
            cacheKey!,
            () => getOwnerDashboardSettled(tId!, sId!, projectId!, storeDetails?.timeZone, storeDetails?.businessDayEndTime),
            schedulerCacheKey,
        ),
        {
            ...SWR_CONFIG,
            fallbackData,
            revalidateOnMount: fallbackData === undefined,
        },
    );

    return {
        actionPlan: data?.ownerActionPlan || data?.overview?.ownerActionPlan,
        confidence: data?.ownerConfidence || data?.overview?.ownerConfidence,
        sourceQuality: data?.sourceQuality || data?.overview?.sourceQuality || [],
        analyticsAiEntitlement: data?.analyticsAiEntitlement || data?.overview?.analyticsAiEntitlement,
        loading: isLoading && !data,
    };
}

export default useOwnerActionPlan;
