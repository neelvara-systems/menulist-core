import useSWR from 'swr';
import { FEATURE_FLAGS } from '@config/features';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { getCachedData, removeCachedData, setCachedData, shouldRevalidate } from '@lib/cache/swrLocalStorageProvider';
import { OWNER_BUSINESS_ASSISTANT_CACHE, OWNER_BUSINESS_ASSISTANT_ENDPOINTS } from '@lib/ownerBusinessAssistant/constants';
import {
  OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY,
  readOwnerBusinessAssistantCurrentResponse,
  type OwnerBusinessAssistantCurrentResponse,
} from '@lib/ownerBusinessAssistant/clientResponses';
import { getBoundedRuntimeStringContext } from '@lib/runtime/runtimeDiagnostics';
import { resolveOwnerBusinessAssistantClientScope } from '@lib/ownerBusinessAssistant/clientScope';
import { useMemo } from 'react';

const fetcher = async ([url, storeScopeKey]: readonly [string, string]): Promise<OwnerBusinessAssistantCurrentResponse> => {
  const response = await fetch(url, OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY);
  const payload = await readOwnerBusinessAssistantCurrentResponse(response, {
    ...getBoundedRuntimeStringContext('url', url),
    ...getBoundedRuntimeStringContext('storeScopeKey', storeScopeKey),
  });
  if (!payload) throw new Error('Failed to load Business Health');
  return payload;
};

const isNotReadyFallbackResponse = (response: OwnerBusinessAssistantCurrentResponse | undefined) =>
  response?.data?.status === 'not_ready' && !response.data.sourceRefs?.length;

export function useOwnerBusinessHealthCurrent(projectId?: string, storeScopeKey?: string | number, options?: { enabled?: boolean }) {
  const session = useClientAuthSession();
  const clientScope = useMemo(
    () => resolveOwnerBusinessAssistantClientScope(session, storeScopeKey),
    [session?.sId, session?.tId, storeScopeKey],
  );
  const enabled = Boolean(clientScope)
    && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH
    && (options?.enabled ?? true);
  const params = new URLSearchParams();
  if (projectId) params.set('projectId', projectId);
  if (clientScope) params.set('storeId', clientScope.storeId);
  const url = `${OWNER_BUSINESS_ASSISTANT_ENDPOINTS.current}${params.toString() ? `?${params.toString()}` : ''}`;
  const cacheKey = clientScope
    ? `${OWNER_BUSINESS_ASSISTANT_CACHE.browserCurrentPrefix}:${clientScope.cacheScope}:${projectId || 'all'}`
    : null;
  const cached = typeof window !== 'undefined' && cacheKey
    ? getCachedData<OwnerBusinessAssistantCurrentResponse>(cacheKey, OWNER_BUSINESS_ASSISTANT_CACHE.browserReadModelTtlMs)
    : undefined;
  const cachedNotReady = isNotReadyFallbackResponse(cached);

  const swr = useSWR<OwnerBusinessAssistantCurrentResponse>(
    enabled && clientScope ? [url, clientScope.cacheScope] as const : null,
    fetcher,
    {
      fallbackData: cachedNotReady ? undefined : cached,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: typeof window === 'undefined' || !cacheKey ? false : cachedNotReady || shouldRevalidate(cacheKey),
      dedupingInterval: 10 * 60 * 1000,
      onSuccess: (data) => {
        if (!cacheKey) return;
        if (isNotReadyFallbackResponse(data)) {
          removeCachedData(cacheKey);
          return;
        }
        setCachedData(cacheKey, data, data.data?.localDate);
      },
    },
  );

  return {
    current: swr.data?.data || null,
    cache: swr.data?.cache,
    isLoading: enabled && !swr.data && swr.isLoading,
    error: swr.error,
    refresh: swr.mutate,
  };
}
