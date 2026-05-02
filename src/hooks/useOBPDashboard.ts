import {
    getOBPDashboardData,
    getOBPDashboardToday,
    type OBPDashboardData,
    type OBPTodayData,
} from '@database/ownerDashboard';
import {
    getCachedData,
    setCachedData,
    shouldRevalidate,
} from '@lib/cache/swrLocalStorageProvider';
import { getBusinessAnalyticsDateKey } from '@lib/analytics/businessDay';
import { getAnalyticsSchedulerCacheKey } from '@lib/analytics/dateKey';
import { PlatformGlobalDataContext, type PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { useContext, useMemo } from 'react';
import useSWR from 'swr';

const SETTLED_SWR_CONFIG = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 3600000,
    errorRetryCount: 1,
};

const TODAY_SWR_CONFIG = {
    ...SETTLED_SWR_CONFIG,
    dedupingInterval: 600000,
};

export interface OBPDashboardViewData extends OBPDashboardData {
    today: OBPTodayData | null;
}

function createCacheKey(type: string, tId: string, sId: string): string {
    return `obpDashboard-${type}-${tId}-${sId}`;
}

async function cachedFetcher<T>(
    cacheKey: string,
    fetcher: () => Promise<T | null>,
    dayKey?: string,
): Promise<T | null> {
    if (!shouldRevalidate(cacheKey, dayKey)) {
        const cached = getCachedData<T>(cacheKey, undefined, dayKey);
        if (cached !== undefined) {
            return cached;
        }
    }

    const data = await fetcher();
    if (data !== null) {
        setCachedData(cacheKey, data, dayKey);
    }
    return data;
}

async function cachedFetcherWithTTL<T>(
    cacheKey: string,
    fetcher: () => Promise<T | null>,
    maxAgeMs: number,
    dayKey?: string,
): Promise<T | null> {
    const cached = getCachedData<T>(cacheKey, maxAgeMs, dayKey);
    if (cached !== undefined) {
        return cached;
    }

    const data = await fetcher();
    if (data !== null) {
        setCachedData(cacheKey, data, dayKey);
    }
    return data;
}

function getInitialCachedValue<T>(cacheKey: string | null, maxAgeMs?: number, dayKey?: string): T | undefined {
    if (typeof window === 'undefined' || !cacheKey) {
        return undefined;
    }

    return getCachedData<T>(cacheKey, maxAgeMs, dayKey);
}

export function useOBPDashboard() {
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

    const tId = storeDetails?.tenantId ? String(storeDetails.tenantId) : null;
    const sId = storeDetails?.storeId ? String(storeDetails.storeId) : null;
    const analyticsDayKey = useMemo(
        () => getBusinessAnalyticsDateKey(new Date(), storeDetails?.timeZone, storeDetails?.businessDayEndTime),
        [storeDetails?.timeZone, storeDetails?.businessDayEndTime],
    );
    const schedulerCacheKey = useMemo(
        () => getAnalyticsSchedulerCacheKey(new Date(), storeDetails?.timeZone, storeDetails?.businessDayEndTime),
        [storeDetails?.timeZone, storeDetails?.businessDayEndTime],
    );
    const canFetch = Boolean(tId && sId);
    const settledCacheKey = canFetch ? createCacheKey('settled', tId!, sId!) : null;
    const todayCacheKey = canFetch ? createCacheKey('today', tId!, sId!) : null;
    const settledFallbackData = useMemo(() => getInitialCachedValue<OBPDashboardData>(settledCacheKey, undefined, schedulerCacheKey), [schedulerCacheKey, settledCacheKey]);
    const todayFallbackData = useMemo(() => getInitialCachedValue<OBPTodayData>(todayCacheKey, 600000, analyticsDayKey), [analyticsDayKey, todayCacheKey]);

    const {
        data: settledData,
        isLoading: settledLoading,
    } = useSWR(
        canFetch ? ['obpDashboard', 'settled', tId, sId] : null,
        () => cachedFetcher(
            settledCacheKey!,
            () => getOBPDashboardData(tId!, sId!, storeDetails?.timeZone, storeDetails?.businessDayEndTime),
            schedulerCacheKey,
        ),
        {
            ...SETTLED_SWR_CONFIG,
            fallbackData: settledFallbackData,
            revalidateOnMount: settledFallbackData === undefined,
        },
    );

    const {
        data: todayData,
        isLoading: todayLoading,
    } = useSWR(
        canFetch ? ['obpDashboard', 'today', tId, sId] : null,
        () => cachedFetcherWithTTL(
            todayCacheKey!,
            () => getOBPDashboardToday(tId!, sId!, storeDetails?.timeZone, storeDetails?.businessDayEndTime),
            600000,
            analyticsDayKey,
        ),
        {
            ...TODAY_SWR_CONFIG,
            fallbackData: todayFallbackData,
            revalidateOnMount: todayFallbackData === undefined,
        },
    );

    const data = useMemo(() => {
        if (!settledData && !todayData) return null;
        return {
            ...((settledData || {}) as OBPDashboardData),
            today: todayData ?? null,
            lastFetched: new Date(),
        } as OBPDashboardViewData;
    }, [settledData, todayData]);

    return {
        data,
        loading: settledLoading && !settledData && todayLoading && !todayData,
        loadingToday: todayLoading,
    };
}

export type { OBPDashboardData, OBPTodayData };
