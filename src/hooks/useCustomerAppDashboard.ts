import {
    getCustomerAppDashboardSummary,
    type CustomerAppDashboardSummary,
} from '@database/ownerDashboard';
import { getAnalyticsSchedulerCacheKey } from '@lib/analytics/dateKey';
import {
    getCachedData,
    setCachedData,
    shouldRevalidate,
} from '@lib/cache/swrLocalStorageProvider';
import { PlatformGlobalDataContext, type PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { useContext, useMemo } from 'react';
import useSWR from 'swr';

const SWR_CONFIG = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 86400000,
    errorRetryCount: 1,
};

function createCacheKey(tId: string, sId: string): string {
    return `customerAppDashboard-${tId}-${sId}`;
}

async function cachedFetcher<T>(
    cacheKey: string,
    fetcher: () => Promise<T | null>,
    schedulerCacheKey: string,
): Promise<T | null> {
    if (!shouldRevalidate(cacheKey, schedulerCacheKey)) {
        const cached = getCachedData<T>(cacheKey, undefined, schedulerCacheKey);
        if (cached !== undefined) {
            return cached;
        }
    }

    const data = await fetcher();
    if (data !== null) {
        setCachedData(cacheKey, data, schedulerCacheKey);
    }
    return data;
}

function getInitialCachedValue<T>(cacheKey: string | null, schedulerCacheKey: string): T | undefined {
    if (typeof window === 'undefined' || !cacheKey) {
        return undefined;
    }

    return getCachedData<T>(cacheKey, undefined, schedulerCacheKey);
}

export function useCustomerAppDashboard() {
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const tId = storeDetails?.tenantId ? String(storeDetails.tenantId) : null;
    const sId = storeDetails?.storeId ? String(storeDetails.storeId) : null;
    const schedulerCacheKey = useMemo(
        () => getAnalyticsSchedulerCacheKey(new Date(), storeDetails?.timeZone, storeDetails?.businessDayEndTime),
        [storeDetails?.timeZone, storeDetails?.businessDayEndTime],
    );
    const canFetch = Boolean(tId && sId);
    const cacheKey = canFetch ? createCacheKey(tId!, sId!) : null;
    const fallbackData = useMemo(
        () => getInitialCachedValue<CustomerAppDashboardSummary>(cacheKey, schedulerCacheKey),
        [cacheKey, schedulerCacheKey],
    );

    const { data, error, isLoading, mutate } = useSWR(
        canFetch ? ['customerAppDashboard', tId, sId] : null,
        () => cachedFetcher(
            cacheKey!,
            () => getCustomerAppDashboardSummary(tId!, sId!),
            schedulerCacheKey,
        ),
        {
            ...SWR_CONFIG,
            fallbackData,
            revalidateOnMount: fallbackData === undefined,
        },
    );

    return {
        data: data || null,
        loading: canFetch && isLoading && !data,
        error: error || null,
        mutate,
    };
}

export default useCustomerAppDashboard;
