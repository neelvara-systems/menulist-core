/**
 * Owner Dashboard Hook v2
 * 
 * Provides all data and state management for the Owner Dashboard.
 * 
 * OPTIMIZED: Using SWR for automatic caching and deduplication
 * - Fetches overview + overall on initial load (default view)
 * - Overview includes: WTD, MTD, yesterday, historical weeks, AI summary
 * - Lazy loads weekly/monthly detail views only when needed
 * - SWR handles caching, deduplication, and revalidation
 * 
 * v2 Changes:
 * - Default view is now 'overview' (simplified hero + expandable detail)
 * - WTD/MTD calculated from daily docs (aggregated on frontend)
 * - Historical weeks comparison (last 4 weeks)
 * 
 * Usage:
 * const { data, loading, viewMode, setViewMode, currentViewData } = useOwnerDashboard();
 */

import {
    getOwnerDashboardDaily,
    getOwnerDashboardMonthly,
    getOwnerDashboardSettled,
    getOwnerDashboardToday,
    getOwnerDashboardWeekly,
} from '@database/ownerDashboard';
import {
    getCachedData,
    setCachedData,
    shouldRevalidate,
} from '@lib/cache/swrLocalStorageProvider';
import { getBusinessAnalyticsDateKey } from '@lib/analytics/businessDay';
import { getAnalyticsSchedulerCacheKey } from '@lib/analytics/dateKey';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import {
    DailyViewData,
    MonthlyViewData,
    OverviewData,
    OverallData,
    OwnerDashboardData,
    OwnerDashboardViewMode,
    UseOwnerDashboardReturn,
    WeeklyViewData,
} from '@template/main-app/projects/types';
import { useCallback, useContext, useMemo, useState } from 'react';
import useSWR from 'swr';

interface UseOwnerDashboardOptions {
    projectId?: string;
    loadHistorical?: boolean;
}

/**
 * SWR Cache Configuration
 * 
 * COST OPTIMIZATION:
 * - Scheduler generates data once per day
 * - No need to refetch if data hasn't changed
 * - localStorage cache persists across sessions
 * - Only fetch fresh data when date changes
 * 
 * Result: 90% reduction in Firebase reads (29,600 → ~3,000 for 100 users)
 */
const SWR_CONFIG = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 86400000, // 24 hours - scheduler data
    errorRetryCount: 2,
    focusThrottleInterval: 3600000, // 1 hour throttle
};

// For daily view - slightly shorter cache in case scheduler runs mid-day
const SWR_CONFIG_DAILY = {
    ...SWR_CONFIG,
    dedupingInterval: 3600000, // 1 hour for daily data
};

const SWR_CONFIG_TODAY = {
    ...SWR_CONFIG,
    dedupingInterval: 600000, // 10 minutes for live "today so far"
};

/**
 * Create a cache key for localStorage
 */
function createCacheKey(type: string, tId: string, sId: string, projectId: string): string {
    return `ownerDashboard-${type}-${tId}-${sId}-${projectId}`;
}

/**
 * Fetcher with localStorage cache
 * Checks localStorage first, only fetches if date changed or no cache
 */
async function cachedFetcher<T>(
    cacheKey: string,
    fetcher: () => Promise<T | null>,
    dayKey?: string,
): Promise<T | null> {
    // Check if we have valid cached data (same day)
    if (!shouldRevalidate(cacheKey, dayKey)) {
        const cached = getCachedData<T>(cacheKey, undefined, dayKey);
        if (cached !== undefined) {
            return cached;
        }
    }

    // Fetch fresh data
    const data = await fetcher();

    // Cache the result
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

export function useOwnerDashboard(options?: UseOwnerDashboardOptions): UseOwnerDashboardReturn {
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const projectId = options?.projectId;
    const loadHistorical = options?.loadHistorical ?? true;
    const [viewMode, setViewMode] = useState<OwnerDashboardViewMode>('today');

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
    const canFetch = Boolean(tId && sId && projectId);

    const settledCacheKey = canFetch ? createCacheKey('settled', tId!, sId!, projectId!) : null;
    const todayCacheKey = canFetch ? createCacheKey('today', tId!, sId!, projectId!) : null;
    const dailyCacheKey = canFetch ? createCacheKey('daily', tId!, sId!, projectId!) : null;
    const weeklyCacheKey = canFetch ? createCacheKey('weekly', tId!, sId!, projectId!) : null;
    const monthlyCacheKey = canFetch ? createCacheKey('monthly', tId!, sId!, projectId!) : null;

    const settledFallbackData = useMemo(() => getInitialCachedValue<OwnerDashboardData>(settledCacheKey, undefined, schedulerCacheKey), [schedulerCacheKey, settledCacheKey]);
    const todayFallbackData = useMemo(() => getInitialCachedValue<DailyViewData>(todayCacheKey, 600000, analyticsDayKey), [analyticsDayKey, todayCacheKey]);
    const dailyFallbackData = useMemo(() => getInitialCachedValue<DailyViewData>(dailyCacheKey, undefined, schedulerCacheKey), [schedulerCacheKey, dailyCacheKey]);
    const weeklyFallbackData = useMemo(() => getInitialCachedValue<WeeklyViewData>(weeklyCacheKey, undefined, schedulerCacheKey), [schedulerCacheKey, weeklyCacheKey]);
    const monthlyFallbackData = useMemo(() => getInitialCachedValue<MonthlyViewData>(monthlyCacheKey, undefined, schedulerCacheKey), [schedulerCacheKey, monthlyCacheKey]);

    const {
        data: settledData,
        error: settledError,
        isLoading: settledLoading,
        mutate: mutateSettled,
    } = useSWR(
        canFetch && loadHistorical ? ['ownerDashboard', 'settled', tId, sId, projectId] : null,
        () => cachedFetcher(
            settledCacheKey!,
            async () => {
                const response = await getOwnerDashboardSettled(tId!, sId!, projectId!, storeDetails?.timeZone, storeDetails?.businessDayEndTime);
                return response;
            },
            schedulerCacheKey,
        ),
        {
            ...SWR_CONFIG,
            fallbackData: settledFallbackData,
            revalidateOnMount: settledFallbackData === undefined,
        }
    );

    const {
        data: todayData,
        error: todayError,
        isLoading: todayLoading,
        mutate: mutateToday,
    } = useSWR(
        canFetch ? ['ownerDashboard', 'today', tId, sId, projectId] : null,
        () => cachedFetcherWithTTL(
            todayCacheKey!,
            async () => {
                const response = await getOwnerDashboardToday(tId!, sId!, projectId!, storeDetails?.timeZone, storeDetails?.businessDayEndTime);
                return response;
            },
            600000,
            analyticsDayKey,
        ),
        {
            ...SWR_CONFIG_TODAY,
            fallbackData: todayFallbackData,
            revalidateOnMount: todayFallbackData === undefined,
        }
    );

    // Daily data - LAZY: only fetch when viewMode is 'daily'
    // Uses shorter cache (1 hour) in case scheduler runs mid-day
    const {
        data: dailyData,
        error: dailyError,
        isLoading: dailyLoading,
        mutate: mutateDaily,
    } = useSWR(
        canFetch && loadHistorical && viewMode === 'daily' && !settledData?.daily ? ['ownerDashboard', 'daily', tId, sId, projectId] : null,
        () => cachedFetcher(
            dailyCacheKey!,
            async () => {
                const response = await getOwnerDashboardDaily(tId!, sId!, projectId!, storeDetails?.timeZone, storeDetails?.businessDayEndTime);
                return response;
            },
            schedulerCacheKey,
        ),
        {
            ...SWR_CONFIG_DAILY,
            fallbackData: dailyFallbackData,
            revalidateOnMount: dailyFallbackData === undefined,
        }
    );

    // Weekly data - LAZY: only fetch when viewMode is 'weekly'
    const {
        data: weeklyData,
        error: weeklyError,
        isLoading: weeklyLoading,
        mutate: mutateWeekly,
    } = useSWR(
        canFetch && loadHistorical && viewMode === 'weekly' && !settledData?.weekly ? ['ownerDashboard', 'weekly', tId, sId, projectId] : null,
        () => cachedFetcher(
            weeklyCacheKey!,
            async () => {
                const response = await getOwnerDashboardWeekly(tId!, sId!, projectId!, storeDetails?.timeZone, storeDetails?.businessDayEndTime);
                return response;
            },
            schedulerCacheKey,
        ),
        {
            ...SWR_CONFIG,
            fallbackData: weeklyFallbackData,
            revalidateOnMount: weeklyFallbackData === undefined,
        }
    );

    // Monthly data - LAZY: only fetch when viewMode is 'monthly'
    const {
        data: monthlyData,
        error: monthlyError,
        isLoading: monthlyLoading,
        mutate: mutateMonthly,
    } = useSWR(
        canFetch && loadHistorical && viewMode === 'monthly' && !settledData?.monthly ? ['ownerDashboard', 'monthly', tId, sId, projectId] : null,
        () => cachedFetcher(
            monthlyCacheKey!,
            async () => {
                const response = await getOwnerDashboardMonthly(tId!, sId!, projectId!, storeDetails?.timeZone, storeDetails?.businessDayEndTime);
                return response;
            },
            schedulerCacheKey,
        ),
        {
            ...SWR_CONFIG,
            fallbackData: monthlyFallbackData,
            revalidateOnMount: monthlyFallbackData === undefined,
        }
    );

    // Determine loading state based on current view
    const loading = useMemo(() => {
        if (todayLoading && !todayData) {
            return true;
        }

        if (!loadHistorical) {
            return false;
        }

        switch (viewMode) {
            case 'today':
                return todayLoading && !todayData;
            case 'overview':
                return settledLoading;
            case 'daily':
                return !settledData?.daily && dailyLoading;
            case 'weekly':
                return !settledData?.weekly && weeklyLoading;
            case 'monthly':
                return !settledData?.monthly && monthlyLoading;
            case 'overall':
                return settledLoading;
            default:
                return settledLoading;
        }
    }, [viewMode, loadHistorical, todayLoading, todayData, settledLoading, settledData?.daily, settledData?.weekly, settledData?.monthly, dailyLoading, weeklyLoading, monthlyLoading]);

    // Combine errors
    const error = useMemo(() => {
        if (!loadHistorical) {
            return todayError || null;
        }

        switch (viewMode) {
            case 'today':
                return todayError || null;
            case 'overview':
                return settledError || null;
            case 'daily':
                return settledError || dailyError || null;
            case 'weekly':
                return settledError || weeklyError || null;
            case 'monthly':
                return settledError || monthlyError || null;
            case 'overall':
                return settledError || null;
            default:
                return settledError || null;
        }
    }, [viewMode, loadHistorical, todayError, settledError, dailyError, weeklyError, monthlyError]);

    // Combined data object
    const data = useMemo((): OwnerDashboardData | null => {
        if (!settledData && !todayData && !dailyData && !weeklyData && !monthlyData) {
            return null;
        }

        return {
            overview: settledData?.overview || null,
            today: todayData || null,
            daily: settledData?.daily || dailyData || settledData?.overview?.yesterday || null,
            weekly: settledData?.weekly || weeklyData || null,
            monthly: settledData?.monthly || monthlyData || null,
            wtd: settledData?.wtd || settledData?.overview?.wtd || null,
            mtd: settledData?.mtd || settledData?.overview?.mtd || null,
            historicalWeeks: settledData?.historicalWeeks || settledData?.overview?.historicalWeeks || [],
            overall: settledData?.overall || null,
            ownerActionPlan: settledData?.ownerActionPlan || settledData?.overview?.ownerActionPlan,
            ownerConfidence: settledData?.ownerConfidence || settledData?.overview?.ownerConfidence,
            sourceQuality: settledData?.sourceQuality || settledData?.overview?.sourceQuality || [],
            analyticsAiEntitlement: settledData?.analyticsAiEntitlement || settledData?.overview?.analyticsAiEntitlement,
            projectId: projectId || '',
            lastFetched: new Date(),
        };
    }, [settledData, todayData, dailyData, weeklyData, monthlyData, projectId]);

    // Current view data based on selected mode
    const currentViewData = useMemo((): OverviewData | DailyViewData | WeeklyViewData | MonthlyViewData | OverallData | null => {
        switch (viewMode) {
            case 'today':
                return todayData || null;
            case 'overview':
                return settledData?.overview || null;
            case 'daily':
                return settledData?.daily || dailyData || settledData?.overview?.yesterday || null;
            case 'weekly':
                return settledData?.weekly || weeklyData || null;
            case 'monthly':
                return settledData?.monthly || monthlyData || null;
            case 'overall':
                return settledData?.overall || null;
            default:
                return settledData?.overview || null;
        }
    }, [viewMode, todayData, settledData, dailyData, weeklyData, monthlyData]);

    // Handle view mode change
    const handleSetViewMode = useCallback((mode: OwnerDashboardViewMode) => {
        setViewMode(mode);
    }, []);

    // Force refetch current view data
    const refetch = useCallback(async () => {
        switch (viewMode) {
            case 'today':
                await mutateToday();
                break;
            case 'overview':
                await Promise.all(loadHistorical ? [mutateSettled(), mutateToday()] : [mutateToday()]);
                break;
            case 'daily':
                await Promise.all(loadHistorical ? [mutateToday(), mutateSettled(), mutateDaily()] : [mutateToday()]);
                break;
            case 'weekly':
                await Promise.all(loadHistorical ? [mutateToday(), mutateSettled(), mutateWeekly()] : [mutateToday()]);
                break;
            case 'monthly':
                await Promise.all(loadHistorical ? [mutateToday(), mutateSettled(), mutateMonthly()] : [mutateToday()]);
                break;
            case 'overall':
                await Promise.all(loadHistorical ? [mutateToday(), mutateSettled()] : [mutateToday()]);
                break;
            default:
                await Promise.all(loadHistorical ? [mutateSettled(), mutateToday()] : [mutateToday()]);
                break;
        }
    }, [viewMode, loadHistorical, mutateSettled, mutateToday, mutateDaily, mutateWeekly, mutateMonthly]);

    return {
        data,
        loading,
        error,
        refetch,
        currentViewData,
        viewMode,
        setViewMode: handleSetViewMode,
        // Loading states for lazy-loaded views
        loadingToday: todayLoading,
        loadingDaily: !settledData?.daily && dailyLoading,
        loadingWeekly: !settledData?.weekly && weeklyLoading,
        loadingMonthly: !settledData?.monthly && monthlyLoading,
    };
}

export default useOwnerDashboard;
