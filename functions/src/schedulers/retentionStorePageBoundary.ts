const DAY_MS = 24 * 60 * 60 * 1000;

export type RetentionStorePage<T> = {
  entries: Array<[string, T]>;
  pageCount: number;
  pageIndex: number;
  totalStores: number;
};

export function selectDeterministicRetentionStorePage<T extends Record<string, unknown>>(
  stores: Record<string, T>,
  nowMillis: number,
  limit: number,
  includeStore: (storeInfo: T) => boolean = () => true,
): RetentionStorePage<T> {
  const safeLimit = Math.max(1, Math.floor(limit));
  const entries = Object.entries(stores)
    .filter(([, storeInfo]) => includeStore(storeInfo))
    .sort(([leftStoreId], [rightStoreId]) => Number(leftStoreId) - Number(rightStoreId));
  const totalStores = entries.length;
  if (totalStores === 0) {
    return { entries: [], pageCount: 0, pageIndex: 0, totalStores: 0 };
  }

  const pageCount = Math.ceil(totalStores / safeLimit);
  const utcDayNumber = Number.isFinite(nowMillis) ? Math.floor(nowMillis / DAY_MS) : 0;
  const pageIndex = ((utcDayNumber % pageCount) + pageCount) % pageCount;
  const pageStart = pageIndex * safeLimit;

  return {
    entries: entries.slice(pageStart, pageStart + safeLimit),
    pageCount,
    pageIndex,
    totalStores,
  };
}
