import useSWR from 'swr';
import { FEATURE_FLAGS } from '@config/features';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { getCachedData, removeCachedData, setCachedData, shouldRevalidate } from '@lib/cache/swrLocalStorageProvider';
import { OWNER_BUSINESS_ASSISTANT_CACHE, OWNER_BUSINESS_ASSISTANT_ENDPOINTS } from '@lib/ownerBusinessAssistant/constants';
import {
  OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY,
  projectOwnerBusinessAssistantAnalyticsResponse,
  readOwnerBusinessAssistantAnalyticsResponse,
  type OwnerBusinessAssistantAnalyticsResponse,
} from '@lib/ownerBusinessAssistant/clientResponses';
import { getBoundedRuntimeStringContext } from '@lib/runtime/runtimeDiagnostics';
import { resolveOwnerBusinessAssistantClientScope } from '@lib/ownerBusinessAssistant/clientScope';
import { useMemo } from 'react';

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
  const session = useClientAuthSession();
  const clientScope = useMemo(
    () => resolveOwnerBusinessAssistantClientScope(session, storeScopeKey),
    [session?.sId, session?.tId, session?.uId, session?.user?.id, storeScopeKey],
  );
  const enabled = Boolean(clientScope)
    && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH
    && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_ANALYTICS_INDEX
    && (options?.enabled ?? true);
  const params = new URLSearchParams();
  if (projectId) params.set('projectId', projectId);
  if (clientScope) params.set('storeId', clientScope.storeId);
  const url = `${OWNER_BUSINESS_ASSISTANT_ENDPOINTS.analytics}${params.toString() ? `?${params.toString()}` : ''}`;
  const cacheKey = clientScope
    ? `${OWNER_BUSINESS_ASSISTANT_CACHE.browserAnalyticsPrefix}:${clientScope.cacheScope}:${projectId || 'all'}`
    : null;
  const cachedValue = typeof window !== 'undefined' && cacheKey
    ? getCachedData<unknown>(cacheKey, OWNER_BUSINESS_ASSISTANT_CACHE.browserReadModelTtlMs)
    : undefined;
  const cached = projectOwnerBusinessAssistantAnalyticsResponse(cachedValue);
  if (cacheKey && cachedValue !== undefined && !cached) removeCachedData(cacheKey);

  const cachedMissingAnalytics = !hasAnalyticsData(cached || undefined);

  const swr = useSWR<OwnerBusinessAssistantAnalyticsResponse>(
    enabled && clientScope ? [url, clientScope.cacheScope] as const : null,
    fetcher,
    {
      fallbackData: cachedMissingAnalytics ? undefined : cached || undefined,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: typeof window === 'undefined' || !cacheKey ? false : cachedMissingAnalytics || shouldRevalidate(cacheKey),
      dedupingInterval: 10 * 60 * 1000,
      onSuccess: (data) => {
        if (!cacheKey) return;
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
