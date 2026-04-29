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
    getOwnerDashboardOverall,
    getOwnerDashboardOverview,
    getOwnerDashboardToday,
    getOwnerDashboardWeekly,
} from '@database/ownerDashboard';
import {
    getCachedData,
    setCachedData,
    shouldRevalidate,
} from '@lib/cache/swrLocalStorageProvider';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import {
    DailyViewData,
    MonthlyViewData,
    OverviewData,
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
    // Let SWR start the initial request. `cachedFetcher` still prevents
    // same-day Firestore reads when localStorage has fresh dashboard data.
    revalidateOnMount: true,
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
    fetcher: () => Promise<T | null>
): Promise<T | null> {
    // Check if we have valid cached data (same day)
    if (!shouldRevalidate(cacheKey)) {
        const cached = getCachedData<T>(cacheKey);
        if (cached !== undefined) {
            return cached;
        }
    }

    // Fetch fresh data
    const data = await fetcher();

    // Cache the result
    if (data !== null) {
        setCachedData(cacheKey, data);
    }

    return data;
}

async function cachedFetcherWithTTL<T>(
    cacheKey: string,
    fetcher: () => Promise<T | null>,
    maxAgeMs: number
): Promise<T | null> {
    const cached = getCachedData<T>(cacheKey, maxAgeMs);
    if (cached !== undefined) {
        return cached;
    }

    const data = await fetcher();

    if (data !== null) {
        setCachedData(cacheKey, data);
    }

    return data;
}

export function useOwnerDashboard(options?: UseOwnerDashboardOptions): UseOwnerDashboardReturn {
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const projectId = options?.projectId;
    const loadHistorical = options?.loadHistorical ?? true;
    const [viewMode, setViewMode] = useState<OwnerDashboardViewMode>('overview');

    const tId = storeDetails?.tenantId ? String(storeDetails.tenantId) : null;
    const sId = storeDetails?.storeId ? String(storeDetails.storeId) : null;
    const canFetch = Boolean(tId && sId && projectId);

    // Overview data - fetched on initial load (default view)
    // Includes: WTD, MTD, yesterday, historical weeks, AI summary
    // Uses localStorage cache - only fetches if date changed
    const {
        data: overviewData,
        error: overviewError,
        isLoading: overviewLoading,
        mutate: mutateOverview,
    } = useSWR(
        canFetch && loadHistorical ? ['ownerDashboard', 'overview', tId, sId, projectId] : null,
        () => cachedFetcher(
            createCacheKey('overview', tId!, sId!, projectId!),
            () => getOwnerDashboardOverview(tId!, sId!, projectId!)
        ),
        SWR_CONFIG
    );

    const {
        data: todayData,
        error: todayError,
        isLoading: todayLoading,
        mutate: mutateToday,
    } = useSWR(
        canFetch ? ['ownerDashboard', 'today', tId, sId, projectId] : null,
        () => cachedFetcherWithTTL(
            createCacheKey('today', tId!, sId!, projectId!),
            () => getOwnerDashboardToday(tId!, sId!, projectId!),
            600000
        ),
        SWR_CONFIG_TODAY
    );

    // Overall data - fetched with overview (always needed for footer)
    const {
        data: overallData,
        error: overallError,
        mutate: mutateOverall,
    } = useSWR(
        canFetch && loadHistorical ? ['ownerDashboard', 'overall', tId, sId, projectId] : null,
        () => cachedFetcher(
            createCacheKey('overall', tId!, sId!, projectId!),
            () => getOwnerDashboardOverall(tId!, sId!, projectId!)
        ),
        SWR_CONFIG
    );

    // Daily data - LAZY: only fetch when viewMode is 'daily'
    // Uses shorter cache (1 hour) in case scheduler runs mid-day
    const {
        data: dailyData,
        error: dailyError,
        isLoading: dailyLoading,
        mutate: mutateDaily,
    } = useSWR(
        canFetch && loadHistorical && viewMode === 'daily' ? ['ownerDashboard', 'daily', tId, sId, projectId] : null,
        () => cachedFetcher(
            createCacheKey('daily', tId!, sId!, projectId!),
            () => getOwnerDashboardDaily(tId!, sId!, projectId!)
        ),
        SWR_CONFIG_DAILY
    );

    // Weekly data - LAZY: only fetch when viewMode is 'weekly'
    const {
        data: weeklyData,
        error: weeklyError,
        isLoading: weeklyLoading,
        mutate: mutateWeekly,
    } = useSWR(
        canFetch && loadHistorical && viewMode === 'weekly' ? ['ownerDashboard', 'weekly', tId, sId, projectId] : null,
        () => cachedFetcher(
            createCacheKey('weekly', tId!, sId!, projectId!),
            () => getOwnerDashboardWeekly(tId!, sId!, projectId!)
        ),
        SWR_CONFIG
    );

    // Monthly data - LAZY: only fetch when viewMode is 'monthly'
    const {
        data: monthlyData,
        error: monthlyError,
        isLoading: monthlyLoading,
        mutate: mutateMonthly,
    } = useSWR(
        canFetch && loadHistorical && viewMode === 'monthly' ? ['ownerDashboard', 'monthly', tId, sId, projectId] : null,
        () => cachedFetcher(
            createCacheKey('monthly', tId!, sId!, projectId!),
            () => getOwnerDashboardMonthly(tId!, sId!, projectId!)
        ),
        SWR_CONFIG
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
            case 'overview':
                return overviewLoading;
            case 'daily':
                return dailyLoading;
            case 'weekly':
                return weeklyLoading;
            case 'monthly':
                return monthlyLoading;
            default:
                return overviewLoading;
        }
    }, [viewMode, loadHistorical, todayLoading, todayData, overviewLoading, dailyLoading, weeklyLoading, monthlyLoading]);

    // Combine errors
    const error = useMemo(() => {
        if (!loadHistorical) {
            return todayError || null;
        }

        switch (viewMode) {
            case 'overview':
                return overviewError || overallError || null;
            case 'daily':
                return dailyError || null;
            case 'weekly':
                return weeklyError || null;
            case 'monthly':
                return monthlyError || null;
            default:
                return overviewError || overallError || null;
        }
    }, [viewMode, loadHistorical, todayError, overviewError, dailyError, weeklyError, monthlyError, overallError]);

    // Combined data object
    const data = useMemo((): OwnerDashboardData | null => {
        if (!overviewData && !todayData && !dailyData && !weeklyData && !monthlyData && !overallData) {
            return null;
        }

        return {
            overview: overviewData || null,
            today: todayData || null,
            daily: dailyData || overviewData?.yesterday || null,
            weekly: weeklyData || null,
            monthly: monthlyData || null,
            wtd: overviewData?.wtd || null,
            mtd: overviewData?.mtd || null,
            historicalWeeks: overviewData?.historicalWeeks || [],
            overall: overallData || null,
            projectId: projectId || '',
            lastFetched: new Date(),
        };
    }, [overviewData, todayData, dailyData, weeklyData, monthlyData, overallData, projectId]);

    // Current view data based on selected mode
    const currentViewData = useMemo((): OverviewData | DailyViewData | WeeklyViewData | MonthlyViewData | null => {
        switch (viewMode) {
            case 'overview':
                return overviewData || null;
            case 'daily':
                return dailyData || overviewData?.yesterday || null;
            case 'weekly':
                return weeklyData || null;
            case 'monthly':
                return monthlyData || null;
            default:
                return overviewData || null;
        }
    }, [viewMode, overviewData, dailyData, weeklyData, monthlyData]);

    // Handle view mode change
    const handleSetViewMode = useCallback((mode: OwnerDashboardViewMode) => {
        setViewMode(mode);
    }, []);

    // Force refetch current view data
    const refetch = useCallback(async () => {
        switch (viewMode) {
            case 'overview':
                await Promise.all(loadHistorical ? [mutateOverview(), mutateToday(), mutateOverall()] : [mutateToday()]);
                break;
            case 'daily':
                await Promise.all(loadHistorical ? [mutateToday(), mutateDaily()] : [mutateToday()]);
                break;
            case 'weekly':
                await Promise.all(loadHistorical ? [mutateToday(), mutateWeekly()] : [mutateToday()]);
                break;
            case 'monthly':
                await Promise.all(loadHistorical ? [mutateToday(), mutateMonthly()] : [mutateToday()]);
                break;
            default:
                await Promise.all(loadHistorical ? [mutateOverview(), mutateToday(), mutateOverall()] : [mutateToday()]);
                break;
        }
    }, [viewMode, loadHistorical, mutateOverview, mutateToday, mutateDaily, mutateWeekly, mutateMonthly, mutateOverall]);

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
        loadingDaily: dailyLoading,
        loadingWeekly: weeklyLoading,
        loadingMonthly: monthlyLoading,
    };
}

export default useOwnerDashboard;
