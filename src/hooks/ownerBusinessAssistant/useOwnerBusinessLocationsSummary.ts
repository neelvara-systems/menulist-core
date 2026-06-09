import useSWR from 'swr';
import { FEATURE_FLAGS } from '@config/features';
import { getCachedData, setCachedData, shouldRevalidate } from '@lib/cache/swrLocalStorageProvider';
import { OWNER_BUSINESS_ASSISTANT_CACHE, OWNER_BUSINESS_ASSISTANT_ENDPOINTS } from '@lib/ownerBusinessAssistant/constants';
import type { OwnerBusinessMultiLocationStoreSummary } from '@lib/ownerBusinessAssistant/types';

type LocationsResponse = {
  data: {
    generatedAt?: string | null;
    stores: OwnerBusinessMultiLocationStoreSummary[];
  };
  cache?: {
    source: string;
    metrics?: Record<string, unknown>;
  };
};

const fetcher = async ([url]: readonly [string, string, string]): Promise<LocationsResponse> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to load Business Health locations');
  return response.json();
};

export function useOwnerBusinessLocationsSummary(
  enabled = true,
  scopeKey?: string | number | null,
  storeScopeKey?: string | number | null,
) {
  const scope = String(scopeKey || 'tenant');
  const selectedStoreScope = String(storeScopeKey || 'store');
  const params = new URLSearchParams();
  if (storeScopeKey) params.set('storeId', String(storeScopeKey));
  const url = `${OWNER_BUSINESS_ASSISTANT_ENDPOINTS.locations}${params.toString() ? `?${params.toString()}` : ''}`;
  const cacheKey = `${OWNER_BUSINESS_ASSISTANT_CACHE.browserLocationsPrefix}:${scope}:${selectedStoreScope}`;
  const cached = typeof window !== 'undefined'
    ? getCachedData<LocationsResponse>(cacheKey, OWNER_BUSINESS_ASSISTANT_CACHE.browserReadModelTtlMs)
    : undefined;
  const swr = useSWR<LocationsResponse>(
    FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH && enabled
      ? [url, scope, selectedStoreScope] as const
      : null,
    fetcher,
    {
      fallbackData: cached,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: typeof window === 'undefined' ? false : shouldRevalidate(cacheKey),
      dedupingInterval: 10 * 60 * 1000,
      onSuccess: (data) => {
        setCachedData(cacheKey, data, data.data?.generatedAt?.slice(0, 10));
      },
    },
  );

  return {
    generatedAt: swr.data?.data.generatedAt || null,
    stores: swr.data?.data.stores || [],
    cache: swr.data?.cache,
    isLoading: enabled && !swr.data && swr.isLoading,
    error: swr.error,
    refresh: swr.mutate,
  };
}
