import { getOptimizedAnalyticsData } from '@database/analytics';
import { getBusinessAnalyticsDateKey } from '@lib/analytics/businessDay';
import { getAnalyticsSchedulerCacheKey } from '@lib/analytics/dateKey';
import {
  getCachedData,
  removeCachedData,
  setCachedData,
  shouldRevalidate,
} from '@lib/cache/swrLocalStorageProvider';
import { AnalyticsData, AnalyticsDateRange } from '@lib/analytics/types';
import { normalizeAnalyticsData } from '@lib/analytics/readBoundary';
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
  return `analytics:${type}:${JSON.stringify(parts)}`;
}

async function cachedFetcher<T>(
  cacheKey: string,
  fetcher: () => Promise<T | null>,
  normalizeCached: (value: unknown) => T | null,
  dayKey?: string,
): Promise<T | null> {
  if (!shouldRevalidate(cacheKey, dayKey)) {
    const cached = getCachedData<unknown>(cacheKey, undefined, dayKey);
    if (cached !== undefined) {
      const normalized = normalizeCached(cached);
      if (normalized !== null) return normalized;
      removeCachedData(cacheKey);
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
  normalizeCached: (value: unknown) => T | null,
  maxAgeMs: number,
  dayKey?: string,
): Promise<T | null> {
  const cached = getCachedData<unknown>(cacheKey, maxAgeMs, dayKey);
  if (cached !== undefined) {
    const normalized = normalizeCached(cached);
    if (normalized !== null) return normalized;
    removeCachedData(cacheKey);
  }

  const data = await fetcher();

  if (data !== null) {
    setCachedData(cacheKey, data, dayKey);
  }

  return data;
}

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  date.setUTCDate(date.getUTCDate() + days);
  const outYear = date.getUTCFullYear();
  const outMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const outDay = String(date.getUTCDate()).padStart(2, '0');
  return `${outYear}-${outMonth}-${outDay}`;
}

function getDefaultDateRange(timeZone?: string, businessDayEndTime?: string): { startDate: string; endDate: string } {
  const today = getBusinessAnalyticsDateKey(new Date(), timeZone, businessDayEndTime);
  return {
    startDate: addDays(today, -7),
    endDate: today,
  };
}

function isTodayRange(endDate: string, timeZone?: string, businessDayEndTime?: string): boolean {
  const today = getBusinessAnalyticsDateKey(new Date(), timeZone, businessDayEndTime);
  return endDate >= today;
}

/**
 * Custom hook for fetching analytics data
 *
 * Cost model:
 * - Uses the nightly dashboard read model for ranges covered by the compact
 *   `daily30d` cache.
 * - Ranges including today read the read model plus today's daily doc only.
 * - Older/custom ranges outside compact read-model coverage return unavailable
 *   instead of triggering an unbounded client daily-range query.
 */
export const useAnalyticsData = (dateRange?: AnalyticsDateRange, projectId?: string) => {
  const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
  const analyticsDayKey = useMemo(
    () => getBusinessAnalyticsDateKey(new Date(), storeDetails?.timeZone, storeDetails?.businessDayEndTime),
    [storeDetails?.timeZone, storeDetails?.businessDayEndTime]
  );
  const schedulerCacheKey = useMemo(
    () => getAnalyticsSchedulerCacheKey(new Date(), storeDetails?.timeZone, storeDetails?.businessDayEndTime),
    [storeDetails?.timeZone, storeDetails?.businessDayEndTime]
  );

  const effectiveRange = useMemo(() => {
    if (dateRange?.startDate && dateRange?.endDate) {
      return {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };
    }

    return getDefaultDateRange(storeDetails?.timeZone, storeDetails?.businessDayEndTime);
  }, [dateRange?.endDate, dateRange?.startDate, storeDetails?.timeZone, storeDetails?.businessDayEndTime]);

  const isLiveRange = useMemo(
    () => isTodayRange(effectiveRange.endDate, storeDetails?.timeZone, storeDetails?.businessDayEndTime),
    [effectiveRange.endDate, storeDetails?.timeZone, storeDetails?.businessDayEndTime]
  );

  const tId = storeDetails?.tenantId;
  const sId = storeDetails?.storeId;
  const canFetch = Boolean(tId && sId && projectId);

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<AnalyticsData | null>(
    canFetch ? ['analytics', 'optimized', tId, sId, projectId, effectiveRange.startDate, effectiveRange.endDate] : null,
    () => {
      const cacheKey = createCacheKey(
        'optimized',
        tId,
        sId,
        projectId,
        effectiveRange.startDate,
        effectiveRange.endDate
      );

      if (isLiveRange) {
        return cachedFetcherWithTTL(
          cacheKey,
          () => getOptimizedAnalyticsData(
            tId!,
            sId!,
            projectId!,
            effectiveRange.startDate,
            effectiveRange.endDate,
            storeDetails?.timeZone,
            storeDetails?.businessDayEndTime,
          ),
          normalizeAnalyticsData,
          600000,
          analyticsDayKey
        );
      }

      return cachedFetcher(
        cacheKey,
        () => getOptimizedAnalyticsData(
          tId!,
          sId!,
          projectId!,
          effectiveRange.startDate,
          effectiveRange.endDate,
          storeDetails?.timeZone,
          storeDetails?.businessDayEndTime,
        ),
        normalizeAnalyticsData,
        schedulerCacheKey
      );
    },
    isLiveRange ? SWR_CONFIG_LIVE : SWR_CONFIG_SETTLED
  );

  return {
    data: data || null,
    loading: canFetch && isLoading && !data,
    error: error || null,
    mutate,
  };
};

export const useTopItems = (limit: number = 10) => {
  const { data, loading, error } = useAnalyticsData();
  const topItems = data?.summary?.topItems?.slice(0, limit) || [];

  return { topItems, loading, error };
};

export default useAnalyticsData;
