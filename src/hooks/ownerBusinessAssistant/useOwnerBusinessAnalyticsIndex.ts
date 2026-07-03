import useSWR from 'swr';
import { FEATURE_FLAGS } from '@config/features';
import { getCachedData, removeCachedData, setCachedData, shouldRevalidate } from '@lib/cache/swrLocalStorageProvider';
import { OWNER_BUSINESS_ASSISTANT_CACHE, OWNER_BUSINESS_ASSISTANT_ENDPOINTS } from '@lib/ownerBusinessAssistant/constants';
import {
  OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY,
  readOwnerBusinessAssistantAnalyticsResponse,
  type OwnerBusinessAssistantAnalyticsResponse,
} from '@lib/ownerBusinessAssistant/clientResponses';
import { getBoundedRuntimeStringContext } from '@lib/runtime/runtimeDiagnostics';

const fetcher = async ([url, storeScopeKey]: readonly [string, string]): Promise<OwnerBusinessAssistantAnalyticsResponse> => {
  const response = await fetch(url, OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY);
  const payload = await readOwnerBusinessAssistantAnalyticsResponse(response, {
    ...getBoundedRuntimeStringContext('url', url),
    ...getBoundedRuntimeStringContext('storeScopeKey', storeScopeKey),
  });
  if (!payload) throw new Error('Failed to load Business Health analytics');
  return payload;
};

const hasAnalyticsData = (response: OwnerBusinessAssistantAnalyticsResponse | undefined) => Boolean(response?.data);

export function useOwnerBusinessAnalyticsIndex(projectId?: string, storeScopeKey?: string | number, options?: { enabled?: boolean }) {
  const enabled = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH
    && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_ANALYTICS_INDEX
    && (options?.enabled ?? true);
  const params = new URLSearchParams();
  if (projectId) params.set('projectId', projectId);
  if (storeScopeKey) params.set('storeId', String(storeScopeKey));
  const url = `${OWNER_BUSINESS_ASSISTANT_ENDPOINTS.analytics}${params.toString() ? `?${params.toString()}` : ''}`;
  const cacheKey = `${OWNER_BUSINESS_ASSISTANT_CACHE.browserAnalyticsPrefix}:${storeScopeKey || 'store'}:${projectId || 'all'}`;
  const cached = typeof window !== 'undefined'
    ? getCachedData<OwnerBusinessAssistantAnalyticsResponse>(cacheKey, OWNER_BUSINESS_ASSISTANT_CACHE.browserReadModelTtlMs)
    : undefined;

  const cachedMissingAnalytics = !hasAnalyticsData(cached);

  const swr = useSWR<OwnerBusinessAssistantAnalyticsResponse>(
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
