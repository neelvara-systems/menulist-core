import {
    getOBPDashboardData,
    getOBPDashboardToday,
    type OBPDashboardData,
    type OBPTodayData,
} from '@database/ownerDashboard';
import {
    getCachedData,
    removeCachedData,
    setCachedData,
    shouldRevalidate,
} from '@lib/cache/swrLocalStorageProvider';
import { normalizeOBPDashboardCacheValue, normalizeOBPTodayCacheValue } from '@lib/analytics/obpReadBoundary';
import { getBusinessAnalyticsDateKey } from '@lib/analytics/businessDay';
import { getAnalyticsSchedulerCacheKey } from '@lib/analytics/dateKey';
import { PlatformGlobalDataContext, type PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { useCallback, useContext, useMemo } from 'react';
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

interface UseOBPDashboardOptions {
    loadHistorical?: boolean;
}

function createCacheKey(type: string, tId: string, sId: string): string {
    return `obpDashboard-${type}-${tId}-${sId}`;
}

interface ScopedOBPCacheEnvelope<T> {
    tId: string;
    sId: string;
    data: T;
}

function normalizeScopedCache<T>(
    value: unknown,
    tId: string,
    sId: string,
    normalize: (input: unknown) => T | null,
): T | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const envelope = value as Partial<ScopedOBPCacheEnvelope<unknown>>;
    if (envelope.tId !== tId || envelope.sId !== sId) return undefined;
    return normalize(envelope.data) || undefined;
}

async function cachedFetcher<T>(
    cacheKey: string,
    fetcher: () => Promise<T | null>,
    dayKey?: string,
    tId?: string,
    sId?: string,
    normalize?: (input: unknown) => T | null,
): Promise<T | null> {
    if (!shouldRevalidate(cacheKey, dayKey)) {
        const cached = getCachedData<unknown>(cacheKey, undefined, dayKey);
        if (cached !== undefined) {
            const normalized = tId && sId && normalize ? normalizeScopedCache(cached, tId, sId, normalize) : undefined;
            if (normalized) return normalized;
            removeCachedData(cacheKey);
        }
    }

    const data = await fetcher();
    if (data !== null) {
        setCachedData(cacheKey, { tId, sId, data }, dayKey);
    }
    return data;
}

async function cachedFetcherWithTTL<T>(
    cacheKey: string,
    fetcher: () => Promise<T | null>,
    maxAgeMs: number,
    dayKey?: string,
    tId?: string,
    sId?: string,
    normalize?: (input: unknown) => T | null,
): Promise<T | null> {
    const cached = getCachedData<unknown>(cacheKey, maxAgeMs, dayKey);
    if (cached !== undefined) {
        const normalized = tId && sId && normalize ? normalizeScopedCache(cached, tId, sId, normalize) : undefined;
        if (normalized) return normalized;
        removeCachedData(cacheKey);
    }

    const data = await fetcher();
    if (data !== null) {
        setCachedData(cacheKey, { tId, sId, data }, dayKey);
    }
    return data;
}

function getInitialCachedValue<T>(
    cacheKey: string | null,
    tId: string | null,
    sId: string | null,
    normalize: (input: unknown) => T | null,
    maxAgeMs?: number,
    dayKey?: string,
): T | undefined {
    if (typeof window === 'undefined' || !cacheKey) {
        return undefined;
    }

    const cached = getCachedData<unknown>(cacheKey, maxAgeMs, dayKey);
    if (cached === undefined || !tId || !sId) return undefined;
    const normalized = normalizeScopedCache(cached, tId, sId, normalize);
    if (!normalized) removeCachedData(cacheKey);
    return normalized;
}

export function useOBPDashboard(options?: UseOBPDashboardOptions) {
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const loadHistorical = options?.loadHistorical ?? true;

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
    const settledFallbackData = useMemo(
        () => getInitialCachedValue(settledCacheKey, tId, sId, (value) => normalizeOBPDashboardCacheValue(value, tId!, sId!), undefined, schedulerCacheKey),
        [sId, schedulerCacheKey, settledCacheKey, tId],
    );
    const todayFallbackData = useMemo(
        () => getInitialCachedValue(todayCacheKey, tId, sId, normalizeOBPTodayCacheValue, 600000, analyticsDayKey),
        [analyticsDayKey, sId, tId, todayCacheKey],
    );

    const {
        data: settledData,
        error: settledError,
        isLoading: settledLoading,
        mutate: mutateSettled,
    } = useSWR(
        canFetch && loadHistorical ? ['obpDashboard', 'settled', tId, sId] : null,
        () => cachedFetcher(
            settledCacheKey!,
            async () => {
                const response = await getOBPDashboardData(tId!, sId!, storeDetails?.timeZone, storeDetails?.businessDayEndTime);
                return response;
            },
            schedulerCacheKey,
            tId!,
            sId!,
            (value) => normalizeOBPDashboardCacheValue(value, tId!, sId!),
        ),
        {
            ...SETTLED_SWR_CONFIG,
            fallbackData: settledFallbackData,
            revalidateOnMount: settledFallbackData === undefined,
        },
    );

    const {
        data: todayData,
        error: todayError,
        isLoading: todayLoading,
        mutate: mutateToday,
    } = useSWR(
        canFetch ? ['obpDashboard', 'today', tId, sId] : null,
        () => cachedFetcherWithTTL(
            todayCacheKey!,
            async () => {
                const response = await getOBPDashboardToday(tId!, sId!, storeDetails?.timeZone, storeDetails?.businessDayEndTime);
                return response;
            },
            600000,
            analyticsDayKey,
            tId!,
            sId!,
            normalizeOBPTodayCacheValue,
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

    const refetch = useCallback(async () => {
        await Promise.all(loadHistorical ? [mutateSettled(), mutateToday()] : [mutateToday()]);
    }, [loadHistorical, mutateSettled, mutateToday]);

    return {
        data,
        error: (loadHistorical ? settledError || todayError : todayError) || null,
        loading: (loadHistorical ? settledLoading && !settledData : false) || (todayLoading && !todayData),
        loadingToday: todayLoading,
        refetch,
    };
}

export type { OBPDashboardData, OBPTodayData };
