import { DB_COLLECTIONS, getAnalyticsDocId } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { OWNER_BUSINESS_ASSISTANT_DOCS } from './constants';
import type {
  ActiveProjectEntry,
  OwnerBusinessAnalyticsIndexDoc,
  OwnerBusinessAnalyticsPeriod,
  OwnerBusinessProjectAnalyticsSummary,
  OwnerBusinessHealthSourceRef,
} from './types';

const MAX_INDEXED_PROJECTS = 10;
const METRIC_KEYS: Array<keyof OwnerBusinessAnalyticsPeriod['metrics']> = [
  'menuVisits',
  'itemClicks',
  'menuSessions',
  'engagedSessions',
  'actionSessions',
  'searches',
  'unavailableItemTaps',
];

const toNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0;

const compactString = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const compactLocalizedString = (value: unknown) => {
  const direct = compactString(value);
  if (direct) return direct;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return Object.values(value as Record<string, unknown>)
    .map(compactString)
    .find(Boolean);
};

const formatDateRange = (start?: string, end?: string) => {
  if (start && end) return `${start} to ${end}`;
  if (start) return start;
  if (end) return end;
  return 'Latest available';
};

const getProjectName = (entry: ActiveProjectEntry) =>
  compactLocalizedString(entry.data?.projectName)
  || compactLocalizedString(entry.data?.name)
  || compactLocalizedString(entry.data?.title)
  || `Menu ${entry.projectId}`;

const isDefaultProject = (entry: ActiveProjectEntry) =>
  entry.data?.isDefault === true
  || entry.data?.default === true
  || entry.data?.isPrimary === true;

const sortProjectsForIndex = (projects: ActiveProjectEntry[]) =>
  [...projects].sort((a, b) => {
    const aDefault = isDefaultProject(a) ? 0 : 1;
    const bDefault = isDefaultProject(b) ? 0 : 1;
    if (aDefault !== bDefault) return aDefault - bDefault;
    return getProjectName(a).localeCompare(getProjectName(b)) || a.projectId.localeCompare(b.projectId);
  });

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
  if (Array.isArray(data?.topItems)) {
    return data.topItems.slice(0, 5).map((item: any) => {
      const clicks = item.clicks ?? item.totalClicks;
      const views = item.views ?? item.totalViews;
      return {
        itemId: String(item.itemId || item.id || compactLocalizedString(item.name) || 'item'),
        name: compactLocalizedString(item.name),
        value: toNumber(clicks ?? views ?? item.value),
        signal: clicks != null ? 'clicks' : 'views',
      };
    });
  }

  const clicksByItem = data?.clicksByItem && typeof data.clicksByItem === 'object' ? data.clicksByItem : null;
  const viewsByItem = data?.viewsByItem && typeof data.viewsByItem === 'object' ? data.viewsByItem : null;
  const metricMap = clicksByItem || viewsByItem;
  if (!metricMap) return [];

  const itemNames = data?.itemNames && typeof data.itemNames === 'object' ? data.itemNames : {};
  const signal: 'clicks' | 'views' = clicksByItem ? 'clicks' : 'views';
  return Object.entries(metricMap)
    .map(([itemId, value]) => ({
      itemId,
      name: compactLocalizedString(itemNames[itemId]),
      value: toNumber(value),
      signal,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
};

const readTopCategories = (data: any): OwnerBusinessAnalyticsPeriod['topCategories'] => {
  const source = Array.isArray(data?.topCategories) ? data.topCategories : [];
  return source.slice(0, 5).map((category: any) => ({
    categoryId: String(category.categoryId || category.id || compactLocalizedString(category.name) || 'category'),
    name: compactLocalizedString(category.name),
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
  scope: 'store' | 'project';
  projectId?: string;
  projectName?: string;
  indexedProjectCount?: number;
}): OwnerBusinessAnalyticsPeriod | undefined {
  if (!params.source) return undefined;
  const metrics = readMetrics(params.source);
  const hasData = Object.values(metrics).some((value) => value > 0);
  const addProjectScope = <T extends Record<string, any>>(entry: T): T => ({
    ...entry,
    ...(params.projectId ? { projectId: params.projectId } : {}),
    ...(params.projectName ? { projectName: params.projectName } : {}),
  });
  const sourceQuality = Array.isArray(params.source.sourceQuality)
    ? params.source.sourceQuality.slice(0, 5)
    : undefined;
  return {
    key: params.key,
    label: params.label,
    rangeLabel: params.rangeLabel,
    scope: params.scope,
    projectId: params.projectId,
    projectName: params.projectName,
    indexedProjectCount: params.indexedProjectCount,
    status: hasData ? 'available' : 'partial',
    metrics,
    topItems: readTopItems(params.source)?.map(addProjectScope),
    topCategories: readTopCategories(params.source)?.map(addProjectScope),
    topSearches: readTopSearches(params.source),
    sourceQuality,
    freshnessLabel: params.source.lastUpdated ? 'Updated after store end of day' : 'Latest settled data',
    sourceFactIds: params.sourceFactIds,
  };
}

const mergeTopSearches = (periods: OwnerBusinessAnalyticsPeriod[]) => {
  const totals = new Map<string, number>();
  periods.forEach((period) => {
    period.topSearches?.forEach((entry) => {
      totals.set(entry.term, (totals.get(entry.term) || 0) + toNumber(entry.count));
    });
  });
  return Array.from(totals.entries())
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
};

const mergeSourceQuality = (periods: OwnerBusinessAnalyticsPeriod[]) => {
  const totals = new Map<string, { source: string; visits: number; actionSessions: number }>();
  periods.forEach((period) => {
    period.sourceQuality?.forEach((entry) => {
      const existing = totals.get(entry.source) || { source: entry.source, visits: 0, actionSessions: 0 };
      const visits = toNumber(entry.visits);
      existing.visits += visits;
      existing.actionSessions += visits * toNumber(entry.actionRate);
      totals.set(entry.source, existing);
    });
  });
  return Array.from(totals.values())
    .map((entry) => ({
      source: entry.source,
      visits: entry.visits,
      actionRate: entry.visits > 0 ? Number((entry.actionSessions / entry.visits).toFixed(2)) : undefined,
    }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5);
};

function aggregateStorePeriod(params: {
  key: string;
  label: string;
  projectPeriods: OwnerBusinessAnalyticsPeriod[];
  indexedProjectCount: number;
}): OwnerBusinessAnalyticsPeriod | undefined {
  if (!params.projectPeriods.length) return undefined;

  const metrics = METRIC_KEYS.reduce<OwnerBusinessAnalyticsPeriod['metrics']>((acc, key) => {
    acc[key] = params.projectPeriods.reduce((sum, period) => sum + toNumber(period.metrics[key]), 0);
    return acc;
  }, {});
  const hasData = Object.values(metrics).some((value) => toNumber(value) > 0);
  const sourceFactIds = Array.from(new Set(params.projectPeriods.flatMap((period) => period.sourceFactIds || [])));
  const topItems = params.projectPeriods
    .flatMap((period) => period.topItems || [])
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const topCategories = params.projectPeriods
    .flatMap((period) => period.topCategories || [])
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const topSearches = mergeTopSearches(params.projectPeriods);
  const sourceQuality = mergeSourceQuality(params.projectPeriods);

  return {
    key: params.key,
    label: params.label,
    rangeLabel: params.projectPeriods[0]?.rangeLabel || 'Latest available',
    scope: 'store',
    indexedProjectCount: params.indexedProjectCount,
    status: hasData ? 'available' : 'partial',
    metrics,
    topItems,
    topCategories,
    topSearches,
    sourceQuality,
    freshnessLabel: params.key === 'today' ? 'Updated after store end of day' : 'Latest settled data',
    sourceFactIds,
  };
}

function buildProjectPeriods(params: {
  projectId: string;
  projectName: string;
  localDate: string;
  dashboardData: any;
  dashboardDocId?: string;
  todayData: any;
  todayDocId?: string;
}): Record<string, OwnerBusinessAnalyticsPeriod | undefined> {
  const dashboardSourceFactIds = params.dashboardDocId && params.dashboardData ? [`analytics_${params.dashboardDocId}`] : [];
  const todaySourceFactIds = params.todayDocId && params.todayData ? [`analytics_${params.todayDocId}`] : [];
  const projectScope = {
    scope: 'project' as const,
    projectId: params.projectId,
    projectName: params.projectName,
  };
  const daily = params.dashboardData?.daily || params.dashboardData?.overview?.yesterday;
  const wtd = params.dashboardData?.wtd || params.dashboardData?.overview?.wtd;
  const mtd = params.dashboardData?.mtd || params.dashboardData?.overview?.mtd;

  return {
    today: buildPeriod({
      key: 'today',
      label: 'Today',
      rangeLabel: params.todayData?.date || params.todayData?.localDate || params.localDate,
      source: params.todayData ? { ...params.todayData, lastUpdated: params.todayData.lastUpdated || params.todayData.updatedAt || params.todayData.modifiedOn } : null,
      sourceFactIds: todaySourceFactIds,
      ...projectScope,
    }),
    yesterday: buildPeriod({
      key: 'yesterday',
      label: 'Yesterday',
      rangeLabel: daily?.date || 'Yesterday',
      source: daily,
      sourceFactIds: dashboardSourceFactIds,
      ...projectScope,
    }),
    thisWeek: buildPeriod({
      key: 'thisWeek',
      label: 'This week',
      rangeLabel: formatDateRange(wtd?.weekStart, wtd?.weekEnd),
      source: wtd,
      sourceFactIds: dashboardSourceFactIds,
      ...projectScope,
    }),
    lastWeek: buildPeriod({
      key: 'lastWeek',
      label: 'Last week',
      rangeLabel: formatDateRange(params.dashboardData?.weekly?.weekStart, params.dashboardData?.weekly?.weekEnd),
      source: params.dashboardData?.weekly,
      sourceFactIds: dashboardSourceFactIds,
      ...projectScope,
    }),
    thisMonth: buildPeriod({
      key: 'thisMonth',
      label: 'This month',
      rangeLabel: formatDateRange(mtd?.monthStart, mtd?.monthEnd),
      source: mtd,
      sourceFactIds: dashboardSourceFactIds,
      ...projectScope,
    }),
    lastMonth: buildPeriod({
      key: 'lastMonth',
      label: 'Last month',
      rangeLabel: formatDateRange(params.dashboardData?.monthly?.monthStart, params.dashboardData?.monthly?.monthEnd),
      source: params.dashboardData?.monthly,
      sourceFactIds: dashboardSourceFactIds,
      ...projectScope,
    }),
    last7Days: buildPeriod({
      key: 'last7Days',
      label: 'Last 7 days',
      rangeLabel: formatDateRange(wtd?.weekStart, wtd?.weekEnd),
      source: wtd,
      sourceFactIds: dashboardSourceFactIds,
      ...projectScope,
    }),
    last30Days: buildPeriod({
      key: 'last30Days',
      label: 'Last 30 days',
      rangeLabel: formatDateRange(mtd?.monthStart, mtd?.monthEnd),
      source: mtd,
      sourceFactIds: dashboardSourceFactIds,
      ...projectScope,
    }),
    overall: buildPeriod({
      key: 'overall',
      label: 'Overall',
      rangeLabel: 'All time',
      source: params.dashboardData?.overall,
      sourceFactIds: dashboardSourceFactIds,
      ...projectScope,
    }),
  };
}

const buildUnsupportedPeriods = (periods: Record<string, OwnerBusinessAnalyticsPeriod | undefined>) => ({
  ...(periods.today ? {} : { today: FUNCTION_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_TODAY_OVERLAY ? 'not_available' as const : 'not_enabled' as const }),
});

const buildSourceRef = (params: {
  docId: string;
  source: string;
  generatedAt: string;
  freshnessLabel: string;
}): OwnerBusinessHealthSourceRef => ({
  id: `analytics_${params.docId}`,
  source: params.source,
  docId: params.docId,
  generatedAt: params.generatedAt,
  freshnessLabel: params.freshnessLabel,
});

export async function buildOwnerBusinessAnalyticsIndex(params: {
  db: FirebaseFirestore.Firestore;
  tId: string;
  sId: string;
  localDate: string;
  generatedAt: string;
  activeProjects: ActiveProjectEntry[];
}): Promise<{ doc: OwnerBusinessAnalyticsIndexDoc; readCount: number; analyticsDocIds: string[] }> {
  const indexedProjects = sortProjectsForIndex(params.activeProjects).slice(0, MAX_INDEXED_PROJECTS);
  const dashboardEntries = indexedProjects.map((project) => ({
    project,
    projectName: getProjectName(project),
    docId: `${params.tId}_${params.sId}_${project.projectId}_dashboard_summary`,
  }));
  const todayEntries = FUNCTION_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_TODAY_OVERLAY
    ? indexedProjects.map((project) => ({
        project,
        projectName: getProjectName(project),
        docId: getAnalyticsDocId.daily(params.tId, params.sId, project.projectId, params.localDate),
      }))
    : [];
  const dashboardRefs = dashboardEntries.map((entry) => params.db.collection(DB_COLLECTIONS.ANALYTICS).doc(entry.docId));
  const todayRefs = todayEntries.map((entry) => params.db.collection(DB_COLLECTIONS.ANALYTICS).doc(entry.docId));
  const allRefs = [...dashboardRefs, ...todayRefs];
  const snaps = allRefs.length ? await params.db.getAll(...allRefs) : [];
  const dashboardSnaps = snaps.slice(0, dashboardEntries.length);
  const todaySnaps = snaps.slice(dashboardEntries.length);
  const dashboardDataByProject = new Map<string, { docId: string; data: FirebaseFirestore.DocumentData }>();
  const todayDataByProject = new Map<string, { docId: string; data: FirebaseFirestore.DocumentData }>();

  dashboardSnaps.forEach((snap, index) => {
    const entry = dashboardEntries[index];
    if (entry && snap.exists) {
      dashboardDataByProject.set(entry.project.projectId, { docId: entry.docId, data: snap.data() || {} });
    }
  });
  todaySnaps.forEach((snap, index) => {
    const entry = todayEntries[index];
    if (entry && snap.exists) {
      todayDataByProject.set(entry.project.projectId, { docId: entry.docId, data: snap.data() || {} });
    }
  });

  const projectSummaries: Record<string, OwnerBusinessProjectAnalyticsSummary> = {};
  dashboardEntries.forEach((entry) => {
    const dashboard = dashboardDataByProject.get(entry.project.projectId);
    const today = todayDataByProject.get(entry.project.projectId);
    const projectPeriods = buildProjectPeriods({
      projectId: entry.project.projectId,
      projectName: entry.projectName,
      localDate: params.localDate,
      dashboardData: dashboard?.data || null,
      dashboardDocId: dashboard?.docId,
      todayData: today?.data || null,
      todayDocId: today?.docId,
    });
    const sourceRefs = [
      ...(dashboard ? [buildSourceRef({
        docId: dashboard.docId,
        source: 'Owner dashboard analytics',
        generatedAt: params.generatedAt,
        freshnessLabel: 'Settled analytics',
      })] : []),
      ...(today ? [buildSourceRef({
        docId: today.docId,
        source: 'Today analytics',
        generatedAt: params.generatedAt,
        freshnessLabel: 'Partial today',
      })] : []),
    ];
    projectSummaries[entry.project.projectId] = {
      projectId: entry.project.projectId,
      projectName: entry.projectName,
      isDefault: isDefaultProject(entry.project),
      active: entry.project.data?.active !== false,
      periods: projectPeriods,
      unsupportedPeriods: buildUnsupportedPeriods(projectPeriods),
      sourceRefs,
    };
  });

  const aggregateFor = (key: string, label: string) => aggregateStorePeriod({
    key,
    label,
    projectPeriods: Object.values(projectSummaries)
      .map((summary) => summary.periods[key])
      .filter(Boolean) as OwnerBusinessAnalyticsPeriod[],
    indexedProjectCount: indexedProjects.length,
  });

  const periods: Record<string, OwnerBusinessAnalyticsPeriod | undefined> = {
    today: aggregateFor('today', 'Today'),
    yesterday: aggregateFor('yesterday', 'Yesterday'),
    thisWeek: aggregateFor('thisWeek', 'This week'),
    lastWeek: aggregateFor('lastWeek', 'Last week'),
    thisMonth: aggregateFor('thisMonth', 'This month'),
    lastMonth: aggregateFor('lastMonth', 'Last month'),
    last7Days: aggregateFor('last7Days', 'Last 7 days'),
    last30Days: aggregateFor('last30Days', 'Last 30 days'),
    overall: aggregateFor('overall', 'Overall'),
  };

  const sourceRefs = Array.from(
    new Map(
      Object.values(projectSummaries)
        .flatMap((summary) => summary.sourceRefs)
        .map((ref) => [ref.id, ref] as const),
    ).values(),
  );
  const primaryDashboardData = dashboardEntries
    .map((entry) => dashboardDataByProject.get(entry.project.projectId)?.data)
    .find(Boolean) || null;
  const analyticsDocIds = sourceRefs.map((ref) => ref.docId).filter(Boolean) as string[];

  return {
    doc: {
      version: 1,
      tId: params.tId,
      sId: params.sId,
      localDate: params.localDate,
      generatedAt: params.generatedAt,
      lastSettledLocalDate: primaryDashboardData?.overview?.yesterday?.date || primaryDashboardData?.daily?.date,
      projectScope: {
        totalActiveProjects: params.activeProjects.length,
        indexedProjectCount: indexedProjects.length,
        indexedProjectIds: indexedProjects.map((project) => project.projectId),
        overflowProjectCount: Math.max(0, params.activeProjects.length - indexedProjects.length),
        defaultProjectId: indexedProjects.find(isDefaultProject)?.projectId,
      },
      periods,
      projectSummaries,
      unsupportedPeriods: buildUnsupportedPeriods(periods),
      sourceRefs,
      cost: {
        builderReadCount: allRefs.length,
        hotPathReadCount: 1,
      },
    },
    readCount: allRefs.length,
    analyticsDocIds,
  };
}

export function getOwnerBusinessAnalyticsIndexDocId(tId: string, sId: string) {
  return OWNER_BUSINESS_ASSISTANT_DOCS.getAnalyticsIndex(tId, sId);
}
