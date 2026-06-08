import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { OWNER_BUSINESS_ASSISTANT_DOCS } from './constants';
import type {
  ActiveProjectEntry,
  OwnerBusinessAnalyticsIndexDoc,
  OwnerBusinessAnalyticsPeriod,
  OwnerBusinessHealthSourceRef,
} from './types';

const toNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0;

const formatDateRange = (start?: string, end?: string) => {
  if (start && end) return `${start} to ${end}`;
  if (start) return start;
  if (end) return end;
  return 'Latest available';
};

const readMetrics = (data: any) => ({
  menuVisits: toNumber(data?.metrics?.menuVisits ?? data?.totalViews ?? data?.lifetimeMetrics?.totalViews),
  itemClicks: toNumber(data?.metrics?.itemClicks ?? data?.totalClicks ?? data?.lifetimeMetrics?.totalClicks),
  menuSessions: toNumber(data?.metrics?.menuSessions ?? data?.menuSessions ?? data?.lifetimeMetrics?.menuSessions),
  engagedSessions: toNumber(data?.metrics?.engagedSessions ?? data?.engagedSessions ?? data?.lifetimeMetrics?.engagedSessions),
  actionSessions: toNumber(data?.metrics?.actionSessions ?? data?.actionSessions ?? data?.lifetimeMetrics?.actionSessions),
  searches: toNumber(data?.metrics?.searches ?? data?.totalSearches ?? data?.lifetimeMetrics?.totalSearches),
  unavailableItemTaps: toNumber(data?.metrics?.unavailableItemTaps ?? data?.totalUnavailableItemTaps ?? data?.lifetimeMetrics?.totalUnavailableItemTaps),
});

const readTopItems = (data: any): OwnerBusinessAnalyticsPeriod['topItems'] => {
  const source = Array.isArray(data?.topItems) ? data.topItems : [];
  return source.slice(0, 5).map((item: any) => ({
    itemId: String(item.itemId || item.id || item.name || 'item'),
    name: item.name,
    value: toNumber(item.clicks ?? item.views ?? item.value),
    signal: item.views ? 'views' : 'clicks',
  }));
};

const readTopCategories = (data: any): OwnerBusinessAnalyticsPeriod['topCategories'] => {
  const source = Array.isArray(data?.topCategories) ? data.topCategories : [];
  return source.slice(0, 5).map((category: any) => ({
    categoryId: String(category.categoryId || category.id || category.name || 'category'),
    name: category.name,
    value: toNumber(category.views ?? category.clicks ?? category.value),
  }));
};

const readTopSearches = (data: any): OwnerBusinessAnalyticsPeriod['topSearches'] => {
  const source = Array.isArray(data?.topSearchTerms) ? data.topSearchTerms : [];
  return source.slice(0, 5).map((term: any): { term: string; count: number } => ({
    term: String(term.term || term.key || ''),
    count: toNumber(term.count),
  })).filter((term: { term: string; count: number }) => term.term);
};

function buildPeriod(params: {
  key: string;
  label: string;
  rangeLabel: string;
  source: any;
  sourceFactIds: string[];
}): OwnerBusinessAnalyticsPeriod | undefined {
  if (!params.source) return undefined;
  const metrics = readMetrics(params.source);
  const hasData = Object.values(metrics).some((value) => value > 0);
  return {
    key: params.key,
    label: params.label,
    rangeLabel: params.rangeLabel,
    status: hasData ? 'available' : 'partial',
    metrics,
    topItems: readTopItems(params.source),
    topCategories: readTopCategories(params.source),
    topSearches: readTopSearches(params.source),
    sourceQuality: params.source.sourceQuality,
    freshnessLabel: params.source.lastUpdated ? 'Updated after store end of day' : 'Latest settled data',
    sourceFactIds: params.sourceFactIds,
  };
}

export async function buildOwnerBusinessAnalyticsIndex(params: {
  db: FirebaseFirestore.Firestore;
  tId: string;
  sId: string;
  localDate: string;
  generatedAt: string;
  activeProjects: ActiveProjectEntry[];
}): Promise<{ doc: OwnerBusinessAnalyticsIndexDoc; readCount: number; analyticsDocIds: string[] }> {
  const projectIds = params.activeProjects.map((entry) => entry.projectId).slice(0, 3);
  const docIds = projectIds.map((projectId) => `${params.tId}_${params.sId}_${projectId}_dashboard_summary`);
  const refs = docIds.map((docId) => params.db.collection(DB_COLLECTIONS.ANALYTICS).doc(docId));
  const snaps = refs.length ? await params.db.getAll(...refs) : [];
  const dashboards = snaps.map((snap) => ({ id: snap.id, data: snap.exists ? snap.data() || {} : null })).filter((entry) => entry.data);
  const primary = dashboards[0]?.data || {};
  const sourceFactIds = dashboards.map((entry) => `analytics_${entry.id}`);

  const periods: Record<string, OwnerBusinessAnalyticsPeriod | undefined> = {
    today: undefined,
    yesterday: buildPeriod({
      key: 'yesterday',
      label: 'Yesterday',
      rangeLabel: primary?.daily?.date || primary?.overview?.yesterday?.date || 'Yesterday',
      source: primary?.daily || primary?.overview?.yesterday,
      sourceFactIds,
    }),
    thisWeek: buildPeriod({
      key: 'thisWeek',
      label: 'This week',
      rangeLabel: formatDateRange(primary?.wtd?.weekStart || primary?.overview?.wtd?.weekStart, primary?.wtd?.weekEnd || primary?.overview?.wtd?.weekEnd),
      source: primary?.wtd || primary?.overview?.wtd,
      sourceFactIds,
    }),
    lastWeek: buildPeriod({
      key: 'lastWeek',
      label: 'Last week',
      rangeLabel: formatDateRange(primary?.weekly?.weekStart, primary?.weekly?.weekEnd),
      source: primary?.weekly,
      sourceFactIds,
    }),
    thisMonth: buildPeriod({
      key: 'thisMonth',
      label: 'This month',
      rangeLabel: formatDateRange(primary?.mtd?.monthStart || primary?.overview?.mtd?.monthStart, primary?.mtd?.monthEnd || primary?.overview?.mtd?.monthEnd),
      source: primary?.mtd || primary?.overview?.mtd,
      sourceFactIds,
    }),
    lastMonth: buildPeriod({
      key: 'lastMonth',
      label: 'Last month',
      rangeLabel: formatDateRange(primary?.monthly?.monthStart, primary?.monthly?.monthEnd),
      source: primary?.monthly,
      sourceFactIds,
    }),
    last7Days: buildPeriod({
      key: 'last7Days',
      label: 'Last 7 days',
      rangeLabel: formatDateRange(primary?.overview?.wtd?.weekStart, primary?.overview?.wtd?.weekEnd),
      source: primary?.overview?.wtd || primary?.wtd,
      sourceFactIds,
    }),
    last30Days: buildPeriod({
      key: 'last30Days',
      label: 'Last 30 days',
      rangeLabel: formatDateRange(primary?.overview?.mtd?.monthStart, primary?.overview?.mtd?.monthEnd),
      source: primary?.overview?.mtd || primary?.mtd,
      sourceFactIds,
    }),
    overall: buildPeriod({
      key: 'overall',
      label: 'Overall',
      rangeLabel: 'All time',
      source: primary?.overall,
      sourceFactIds,
    }),
  };

  const sourceRefs: OwnerBusinessHealthSourceRef[] = docIds.map((docId) => ({
    id: `analytics_${docId}`,
    source: 'Owner dashboard analytics',
    docId,
    generatedAt: params.generatedAt,
    freshnessLabel: 'Settled analytics',
  }));

  return {
    doc: {
      version: 1,
      tId: params.tId,
      sId: params.sId,
      localDate: params.localDate,
      generatedAt: params.generatedAt,
      lastSettledLocalDate: primary?.overview?.yesterday?.date || primary?.daily?.date,
      periods,
      unsupportedPeriods: {
        ...(periods.today ? {} : { today: FUNCTION_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_TODAY_OVERLAY ? 'not_available' : 'not_enabled' }),
      },
      sourceRefs,
      cost: {
        builderReadCount: refs.length,
        hotPathReadCount: 1,
      },
    },
    readCount: refs.length,
    analyticsDocIds: docIds,
  };
}

export function getOwnerBusinessAnalyticsIndexDocId(tId: string, sId: string) {
  return OWNER_BUSINESS_ASSISTANT_DOCS.getAnalyticsIndex(tId, sId);
}
