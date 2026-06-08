import useSWR from 'swr';
import { FEATURE_FLAGS } from '@config/features';
import { getCachedData, setCachedData, shouldRevalidate } from '@lib/cache/swrLocalStorageProvider';
import { OWNER_BUSINESS_ASSISTANT_CACHE, OWNER_BUSINESS_ASSISTANT_ENDPOINTS } from '@lib/ownerBusinessAssistant/constants';
import type { OwnerBusinessAnalyticsIndexDoc } from '@lib/ownerBusinessAssistant/types';

type AnalyticsResponse = {
  data: Pick<OwnerBusinessAnalyticsIndexDoc, 'periods' | 'unsupportedPeriods' | 'sourceRefs'> | null;
  cache?: {
    source: string;
    cacheKey: string;
    generatedAt: string;
  };
};

const fetcher = async (url: string): Promise<AnalyticsResponse> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to load Business Health analytics');
  return response.json();
};

export function useOwnerBusinessAnalyticsIndex(projectId?: string) {
  const enabled = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_ANALYTICS_INDEX;
  const params = new URLSearchParams();
  if (projectId) params.set('projectId', projectId);
  const url = `${OWNER_BUSINESS_ASSISTANT_ENDPOINTS.analytics}${params.toString() ? `?${params.toString()}` : ''}`;
  const cacheKey = `${OWNER_BUSINESS_ASSISTANT_CACHE.browserAnalyticsPrefix}:${projectId || 'store'}`;
  const cached = typeof window !== 'undefined' ? getCachedData<AnalyticsResponse>(cacheKey) : undefined;

  const swr = useSWR<AnalyticsResponse>(
    enabled ? url : null,
    fetcher,
    {
      fallbackData: cached,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: typeof window === 'undefined' ? false : shouldRevalidate(cacheKey),
      dedupingInterval: 10 * 60 * 1000,
      onSuccess: (data) => setCachedData(cacheKey, data),
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
