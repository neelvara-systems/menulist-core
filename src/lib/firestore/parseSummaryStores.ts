/**
 * Parse stores from platformSummary/storesSummary.
 *
 * Handles both the nested shape:
 *   { stores: { "1": { ... } } }
 * and flat dot-notation writes:
 *   { "stores.1.name": "Main Store" }
 */
import { parseSummaryMap, type SummaryMapData } from './summaryMapParser';

export type SummaryStoreData = SummaryMapData;
export type SummaryStoreWithId = SummaryStoreData & { storeId: string };

export function withAuthoritativeSummaryStoreId(
    storeId: string,
    data: SummaryStoreData,
): SummaryStoreWithId {
    return { ...data, storeId };
}

export function parseSummaryStores(data: unknown): Record<string, SummaryStoreData> {
    return parseSummaryMap(data, 'stores');
}
