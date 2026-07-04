import type { PublicTruthMonitorSourceBoundary } from "@type/publicTruthMonitor";

export const PUBLIC_TRUTH_MONITOR_OWNER_LABEL = "Public truth history";

export const PUBLIC_TRUTH_MONITOR_SUMMARY_DOC_PREFIX = "publicTruthMonitor";

export const PUBLIC_TRUTH_MONITOR_SUPPORTED_PAID_PLANS = ["pro", "premium"];

export const PUBLIC_TRUTH_MONITOR_DEFAULT_HISTORY_LIMIT = 6;

export const PUBLIC_TRUTH_MONITOR_DEFAULT_MULTI_LOCATION_LIMIT = 10;

export const PUBLIC_TRUTH_MONITOR_API_MAX_BODY_BYTES = 8 * 1024;

export const PUBLIC_TRUTH_MONITOR_CLIENT_RESPONSE_JSON_MAX_BYTES = 96 * 1024;

export const PUBLIC_TRUTH_MONITOR_SOURCE_BOUNDARY: PublicTruthMonitorSourceBoundary = {
    aiOrSearchChecked: false,
    externalPlatformMutation: false,
    externalSourcesFetched: false,
    publicRouteAdded: false,
    rankingPromise: false,
};

export function buildPublicTruthMonitorSummaryDocId(storeId: string | number): string {
    return `${PUBLIC_TRUTH_MONITOR_SUMMARY_DOC_PREFIX}_${storeId}`;
}
