import {
    getCustomerAppDashboardSummary,
    type CustomerAppDashboardSummary,
} from '@database/ownerDashboard';
import { getAnalyticsSchedulerCacheKey } from '@lib/analytics/dateKey';
import { normalizeCustomerAppDashboardReadModel } from '@lib/analytics/readBoundary';
import {
    getCachedData,
    removeCachedData,
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

function normalizeCachedDashboard(
    value: unknown,
    tId: string,
    sId: string,
): CustomerAppDashboardSummary | undefined {
    const normalized = normalizeCustomerAppDashboardReadModel(value, tId, sId);
    return normalized ? { ...normalized, lastFetched: new Date() } : undefined;
}

async function cachedFetcher(
    cacheKey: string,
    fetcher: () => Promise<CustomerAppDashboardSummary | null>,
    schedulerCacheKey: string,
    tId: string,
    sId: string,
): Promise<CustomerAppDashboardSummary | null> {
    if (!shouldRevalidate(cacheKey, schedulerCacheKey)) {
        const cached = getCachedData<unknown>(cacheKey, undefined, schedulerCacheKey);
        if (cached !== undefined) {
            const normalized = normalizeCachedDashboard(cached, tId, sId);
            if (normalized) return normalized;
            removeCachedData(cacheKey);
        }
    }

    const data = await fetcher();
    if (data !== null) {
        setCachedData(cacheKey, data, schedulerCacheKey);
    }
    return data;
}

function getInitialCachedValue(
    cacheKey: string | null,
    schedulerCacheKey: string,
    tId: string | null,
    sId: string | null,
): CustomerAppDashboardSummary | undefined {
    if (typeof window === 'undefined' || !cacheKey) {
        return undefined;
    }
    const cached = getCachedData<unknown>(cacheKey, undefined, schedulerCacheKey);
    if (cached === undefined || !tId || !sId) return undefined;
    const normalized = normalizeCachedDashboard(cached, tId, sId);
    if (!normalized) removeCachedData(cacheKey);
    return normalized;
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
        () => getInitialCachedValue(cacheKey, schedulerCacheKey, tId, sId),
        [cacheKey, schedulerCacheKey, sId, tId],
    );

    const { data, error, isLoading, mutate } = useSWR(
        canFetch ? ['customerAppDashboard', tId, sId] : null,
        () => cachedFetcher(
            cacheKey!,
            () => getCustomerAppDashboardSummary(tId!, sId!),
            schedulerCacheKey,
            tId!,
            sId!,
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
