import useSWR from 'swr';
import { FEATURE_FLAGS } from '@config/features';
import { getCachedData, removeCachedData, setCachedData, shouldRevalidate } from '@lib/cache/swrLocalStorageProvider';
import { OWNER_BUSINESS_ASSISTANT_CACHE, OWNER_BUSINESS_ASSISTANT_ENDPOINTS } from '@lib/ownerBusinessAssistant/constants';
import type { OwnerBusinessAnalyticsIndexDoc } from '@lib/ownerBusinessAssistant/types';

type AnalyticsResponse = {
  data: Pick<OwnerBusinessAnalyticsIndexDoc, 'periods' | 'unsupportedPeriods' | 'sourceRefs' | 'projectScope'> | null;
  cache?: {
    source: string;
    cacheKey: string;
    generatedAt: string;
  };
};

const fetcher = async ([url]: readonly [string, string]): Promise<AnalyticsResponse> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to load Business Health analytics');
  return response.json();
};

const hasAnalyticsData = (response: AnalyticsResponse | undefined) => Boolean(response?.data);

export function useOwnerBusinessAnalyticsIndex(projectId?: string, storeScopeKey?: string | number) {
  const enabled = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_ANALYTICS_INDEX;
  const params = new URLSearchParams();
  if (projectId) params.set('projectId', projectId);
  const url = `${OWNER_BUSINESS_ASSISTANT_ENDPOINTS.analytics}${params.toString() ? `?${params.toString()}` : ''}`;
  const cacheKey = `${OWNER_BUSINESS_ASSISTANT_CACHE.browserAnalyticsPrefix}:${storeScopeKey || 'store'}:${projectId || 'all'}`;
  const cached = typeof window !== 'undefined'
    ? getCachedData<AnalyticsResponse>(cacheKey, OWNER_BUSINESS_ASSISTANT_CACHE.browserReadModelTtlMs)
    : undefined;

  const cachedMissingAnalytics = !hasAnalyticsData(cached);

  const swr = useSWR<AnalyticsResponse>(
    enabled ? [url, String(storeScopeKey || 'store')] as const : null,
    fetcher,
    {
      fallbackData: cachedMissingAnalytics ? undefined : cached,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: typeof window === 'undefined' ? false : cachedMissingAnalytics || shouldRevalidate(cacheKey),
      dedupingInterval: 10 * 60 * 1000,
      onSuccess: (data) => {
        if (!hasAnalyticsData(data)) {
          removeCachedData(cacheKey);
          return;
        }
        setCachedData(cacheKey, data);
      },
    },
  );

  return {
    analytics: swr.data?.data || null,
    cache: swr.data?.cache,
    isLoading: enabled && !swr.data && swr.isLoading,
    error: swr.error,
    refresh: swr.mutate,
  };
}
