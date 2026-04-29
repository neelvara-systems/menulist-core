import { getAnalyticsSummary, getDailyAnalyticsRange } from '@database/analytics';
import {
  getCachedData,
  setCachedData,
  shouldRevalidate,
} from '@lib/cache/swrLocalStorageProvider';
import { AnalyticsData, AnalyticsDateRange } from '@lib/analytics/types';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { useContext, useMemo } from 'react';
import useSWR from 'swr';

const SWR_CONFIG_SETTLED = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateOnMount: true,
  dedupingInterval: 86400000, // 24 hours for scheduler-backed settled data
  errorRetryCount: 2,
  focusThrottleInterval: 3600000,
};

const SWR_CONFIG_LIVE = {
  ...SWR_CONFIG_SETTLED,
  dedupingInterval: 600000, // 10 minutes when the selected range includes today
};

function createCacheKey(type: string, ...parts: Array<string | number | undefined>): string {
  return `analytics-${type}-${parts.filter(Boolean).join('-')}`;
}

async function cachedFetcher<T>(
  cacheKey: string,
  fetcher: () => Promise<T | null>
): Promise<T | null> {
  if (!shouldRevalidate(cacheKey)) {
    const cached = getCachedData<T>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
  }

  const data = await fetcher();

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

function getDefaultDateRange(): { startDate: string; endDate: string } {
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  return {
    startDate: sevenDaysAgo.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
  };
}

function isTodayRange(endDate: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return endDate >= today;
}

/**
 * Custom hook for fetching analytics data
 *
 * Cost model:
 * - Summary is cached separately because it only changes after nightly aggregation.
 * - Daily range is cached separately because ranges including today are live/partial.
 * - This avoids refetching both documents on every dashboard visit.
 */
export const useAnalyticsData = (dateRange?: AnalyticsDateRange, projectId?: string) => {
  const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

  const effectiveRange = useMemo(() => {
    if (dateRange?.startDate && dateRange?.endDate) {
      return {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };
    }

    return getDefaultDateRange();
  }, [dateRange?.endDate, dateRange?.startDate]);

  const isLiveRange = useMemo(
    () => isTodayRange(effectiveRange.endDate),
    [effectiveRange.endDate]
  );

  const tId = storeDetails?.tenantId;
  const sId = storeDetails?.storeId;
  const canFetch = Boolean(tId && sId && projectId);

  const {
    data: summary,
    error: summaryError,
    isLoading: summaryLoading,
    mutate: mutateSummary,
  } = useSWR(
    canFetch ? ['analytics', 'summary', tId, sId, projectId] : null,
    () => cachedFetcher(
      createCacheKey('summary', tId, sId, projectId),
      () => getAnalyticsSummary(tId!, sId!, projectId!)
    ),
    SWR_CONFIG_SETTLED
  );

  const {
    data: daily,
    error: dailyError,
    isLoading: dailyLoading,
    mutate: mutateDaily,
  } = useSWR(
    canFetch ? ['analytics', 'daily', tId, sId, projectId, effectiveRange.startDate, effectiveRange.endDate] : null,
    () => {
      const cacheKey = createCacheKey(
        'daily',
        tId,
        sId,
        projectId,
        effectiveRange.startDate,
        effectiveRange.endDate
      );

      if (isLiveRange) {
        return cachedFetcherWithTTL(
          cacheKey,
          () => getDailyAnalyticsRange(tId!, sId!, projectId!, effectiveRange.startDate, effectiveRange.endDate),
          600000
        );
      }

      return cachedFetcher(
        cacheKey,
        () => getDailyAnalyticsRange(tId!, sId!, projectId!, effectiveRange.startDate, effectiveRange.endDate)
      );
    },
    isLiveRange ? SWR_CONFIG_LIVE : SWR_CONFIG_SETTLED
  );

  const data = useMemo<AnalyticsData | null>(() => {
    if (!summary && !daily) {
      return null;
    }

    return {
      summary: summary || null,
      daily: daily || [],
    };
  }, [daily, summary]);

  const loading = canFetch && ((summaryLoading && !summary) || (dailyLoading && !daily));
  const error = summaryError || dailyError || null;

  return {
    data,
    loading,
    error,
    mutate: async () => {
      await Promise.all([mutateSummary(), mutateDaily()]);
    },
  };
};

export const useTopItems = (limit: number = 10) => {
  const { data, loading, error } = useAnalyticsData();
  const topItems = data?.summary?.topItems?.slice(0, limit) || [];

  return { topItems, loading, error };
};

export default useAnalyticsData;
