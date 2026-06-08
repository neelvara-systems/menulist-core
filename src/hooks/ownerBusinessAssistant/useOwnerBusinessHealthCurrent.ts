import useSWR from 'swr';
import { FEATURE_FLAGS } from '@config/features';
import { getCachedData, removeCachedData, setCachedData, shouldRevalidate } from '@lib/cache/swrLocalStorageProvider';
import { OWNER_BUSINESS_ASSISTANT_CACHE, OWNER_BUSINESS_ASSISTANT_ENDPOINTS } from '@lib/ownerBusinessAssistant/constants';
import type { OwnerBusinessHealthCurrentDoc } from '@lib/ownerBusinessAssistant/types';

type CurrentResponse = {
  data: OwnerBusinessHealthCurrentDoc;
  cache?: {
    source: string;
    cacheKey: string;
    generatedAt: string;
  };
};

const fetcher = async ([url]: readonly [string, string]): Promise<CurrentResponse> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to load Business Health');
  return response.json();
};

const isNotReadyFallbackResponse = (response: CurrentResponse | undefined) =>
  response?.data?.status === 'not_ready' && !response.data.sourceRefs?.length;

export function useOwnerBusinessHealthCurrent(projectId?: string, storeScopeKey?: string | number, options?: { enabled?: boolean }) {
  const enabled = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH && (options?.enabled ?? true);
  const params = new URLSearchParams();
  if (projectId) params.set('projectId', projectId);
  const url = `${OWNER_BUSINESS_ASSISTANT_ENDPOINTS.current}${params.toString() ? `?${params.toString()}` : ''}`;
  const cacheKey = `${OWNER_BUSINESS_ASSISTANT_CACHE.browserCurrentPrefix}:${storeScopeKey || 'store'}:${projectId || 'all'}`;
  const cached = typeof window !== 'undefined'
    ? getCachedData<CurrentResponse>(cacheKey, OWNER_BUSINESS_ASSISTANT_CACHE.browserReadModelTtlMs)
    : undefined;
  const cachedNotReady = isNotReadyFallbackResponse(cached);

  const swr = useSWR<CurrentResponse>(
    enabled ? [url, String(storeScopeKey || 'store')] as const : null,
    fetcher,
    {
      fallbackData: cachedNotReady ? undefined : cached,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: typeof window === 'undefined' ? false : cachedNotReady || shouldRevalidate(cacheKey),
      dedupingInterval: 10 * 60 * 1000,
      onSuccess: (data) => {
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
