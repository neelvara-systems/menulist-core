import { removeCachedDataByPrefix } from '@lib/cache/swrLocalStorageProvider';
import { OWNER_BUSINESS_ASSISTANT_CACHE } from './constants';

export type OwnerBusinessAssistantBrowserCacheInvalidation = {
  storeId?: string | number | null;
  projectId?: string | number | null;
};

const normalizeId = (value?: string | number | null) => {
  const normalized = String(value ?? '').trim();
  return normalized || null;
};

export function invalidateOwnerBusinessAssistantBrowserCache(
  params: OwnerBusinessAssistantBrowserCacheInvalidation,
): number {
  if (typeof window === 'undefined') return 0;

  const storeId = normalizeId(params.storeId);
  if (!storeId) return 0;

  let removed = 0;
  removed += removeCachedDataByPrefix(`${OWNER_BUSINESS_ASSISTANT_CACHE.browserCurrentPrefix}:${storeId}:`);
  removed += removeCachedDataByPrefix(`${OWNER_BUSINESS_ASSISTANT_CACHE.browserAnalyticsPrefix}:${storeId}:`);
  removed += removeCachedDataByPrefix(`${OWNER_BUSINESS_ASSISTANT_CACHE.browserLocationsPrefix}:`);
  removed += removeCachedDataByPrefix(`${OWNER_BUSINESS_ASSISTANT_CACHE.browserPacketPrefix}:${storeId}:`);

  const projectId = normalizeId(params.projectId);
  if (projectId) {
    removed += removeCachedDataByPrefix(`${OWNER_BUSINESS_ASSISTANT_CACHE.browserCurrentPrefix}:${storeId}:${projectId}`);
    removed += removeCachedDataByPrefix(`${OWNER_BUSINESS_ASSISTANT_CACHE.browserAnalyticsPrefix}:${storeId}:${projectId}`);
    removed += removeCachedDataByPrefix(`${OWNER_BUSINESS_ASSISTANT_CACHE.browserPacketPrefix}:${storeId}:${projectId}`);
  }

  return removed;
}
