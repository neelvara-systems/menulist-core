import { removeCachedDataByPrefix } from '@lib/cache/swrLocalStorageProvider';
import { OWNER_BUSINESS_ASSISTANT_CACHE } from './constants';

export type OwnerBusinessAssistantBrowserCacheInvalidation = {
  tenantId?: string | number | null;
  storeId?: string | number | null;
  projectId?: string | number | null;
};

const normalizeId = (value?: string | number | null) => {
  const normalized = String(value ?? '').trim();
  return normalized || null;
};

export const getOwnerBusinessAssistantBrowserCacheInvalidationPrefixes = (
  params: OwnerBusinessAssistantBrowserCacheInvalidation,
): string[] => {
  const storeId = normalizeId(params.storeId);
  if (!storeId) return [];
  const tenantId = normalizeId(params.tenantId);
  const scopedPrefix = tenantId ? `${tenantId}:${storeId}:` : '';

  return [
    `${OWNER_BUSINESS_ASSISTANT_CACHE.browserCurrentPrefix}:${scopedPrefix}`,
    `${OWNER_BUSINESS_ASSISTANT_CACHE.browserAnalyticsPrefix}:${scopedPrefix}`,
    `${OWNER_BUSINESS_ASSISTANT_CACHE.browserLocationsPrefix}:`,
    `${OWNER_BUSINESS_ASSISTANT_CACHE.browserPacketPrefix}:${storeId}:`,
  ];
};

export function invalidateOwnerBusinessAssistantBrowserCache(
  params: OwnerBusinessAssistantBrowserCacheInvalidation,
): number {
  if (typeof window === 'undefined') return 0;

  let removed = 0;
  for (const prefix of getOwnerBusinessAssistantBrowserCacheInvalidationPrefixes(params)) {
    removed += removeCachedDataByPrefix(prefix);
  }

  return removed;
}
