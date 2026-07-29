import useSWR from 'swr';
import { FEATURE_FLAGS } from '@config/features';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { getCachedData, removeCachedData, setCachedData, shouldRevalidate } from '@lib/cache/swrLocalStorageProvider';
import { OWNER_BUSINESS_ASSISTANT_CACHE, OWNER_BUSINESS_ASSISTANT_ENDPOINTS } from '@lib/ownerBusinessAssistant/constants';
import {
  OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY,
  projectOwnerBusinessAssistantLocationsResponse,
  readOwnerBusinessAssistantLocationsResponse,
  type OwnerBusinessAssistantLocationsResponse,
} from '@lib/ownerBusinessAssistant/clientResponses';
import { getBoundedRuntimeStringContext } from '@lib/runtime/runtimeDiagnostics';
import { resolveOwnerBusinessAssistantClientScope } from '@lib/ownerBusinessAssistant/clientScope';
import { useMemo } from 'react';

const fetcher = async ([url, scope, selectedStoreScope]: readonly [string, string, string]): Promise<OwnerBusinessAssistantLocationsResponse> => {
  const response = await fetch(url, OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY);
  const payload = await readOwnerBusinessAssistantLocationsResponse(response, {
    ...getBoundedRuntimeStringContext('url', url),
    ...getBoundedRuntimeStringContext('scope', scope),
    ...getBoundedRuntimeStringContext('selectedStoreScope', selectedStoreScope),
  });
  if (!payload) throw new Error('Failed to load Business Health locations');
  return payload;
};

export function useOwnerBusinessLocationsSummary(
  enabled = true,
  scopeKey?: string | number | null,
  storeScopeKey?: string | number | null,
) {
  const session = useClientAuthSession();
  const clientScope = useMemo(
    () => resolveOwnerBusinessAssistantClientScope(session, storeScopeKey),
    [session?.sId, session?.tId, session?.uId, session?.user?.id, storeScopeKey],
  );
  const requestedTenantScope = scopeKey === undefined || scopeKey === null || scopeKey === ''
    ? clientScope?.tenantId
    : String(scopeKey).trim();
  const scopeMatches = Boolean(clientScope && requestedTenantScope === clientScope.tenantId);
  const params = new URLSearchParams();
  if (clientScope) params.set('storeId', clientScope.storeId);
  const url = `${OWNER_BUSINESS_ASSISTANT_ENDPOINTS.locations}${params.toString() ? `?${params.toString()}` : ''}`;
  const cacheKey = clientScope && scopeMatches
    ? `${OWNER_BUSINESS_ASSISTANT_CACHE.browserLocationsPrefix}:${clientScope.cacheScope}`
    : null;
  const cachedValue = typeof window !== 'undefined' && cacheKey
    ? getCachedData<unknown>(cacheKey, OWNER_BUSINESS_ASSISTANT_CACHE.browserReadModelTtlMs)
    : undefined;
  const cached = projectOwnerBusinessAssistantLocationsResponse(cachedValue);
  if (cacheKey && cachedValue !== undefined && !cached) removeCachedData(cacheKey);
  const swr = useSWR<OwnerBusinessAssistantLocationsResponse>(
    FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH && enabled && clientScope && scopeMatches
      ? [url, clientScope.tenantId, clientScope.storeId] as const
      : null,
    fetcher,
    {
      fallbackData: cached || undefined,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: typeof window === 'undefined' || !cacheKey ? false : shouldRevalidate(cacheKey),
      dedupingInterval: 10 * 60 * 1000,
      onSuccess: (data) => {
        if (!cacheKey) return;
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
