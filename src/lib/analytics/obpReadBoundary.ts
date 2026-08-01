const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAP_KEY = /^[A-Za-z0-9_:-]{1,120}$/;

const DAILY_NUMERIC_FIELDS = [
  'totalOBPActionClicks',
  'totalOBPLinkClicks',
  'totalOBPMenuClicks',
  'totalOBPShares',
  'totalOBPViews',
] as const;
const DAILY_NUMERIC_MAP_FIELDS = [
  'obpActionClicks',
  'obpActionClicksByOpenHoursState',
  'obpActionClicksBySource',
  'obpLanguageAdoptions',
  'obpLinkClicks',
  'obpLinkClicksByOpenHoursState',
  'obpLinkClicksBySource',
  'obpMenuClicksByOpenHoursState',
  'obpMenuClicksBySource',
  'obpSessionsByLanguage',
  'obpShares',
  'obpViewsByLanguage',
  'viewsByEntrySource',
  'viewsBySource',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeDate = (value: unknown): string | null => {
  if (typeof value !== 'string' || !DATE_KEY.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
};

const normalizeNumber = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
);

const normalizeNumberMap = (value: unknown): Record<string, number> | null => {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value);
  if (entries.some(([key, entry]) => !MAP_KEY.test(key) || normalizeNumber(entry) === null)) return null;
  return Object.fromEntries(entries) as Record<string, number>;
};

const normalizeStringMap = (value: unknown): Record<string, string> | null => {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value);
  if (entries.some(([key, entry]) => (
    !MAP_KEY.test(key)
    || typeof entry !== 'string'
    || !entry.trim()
    || entry.length > 120
  ))) return null;
  return Object.fromEntries(entries.map(([key, entry]) => [key, (entry as string).trim()]));
};

const normalizeBreakdown = <K extends readonly string[]>(value: unknown, keys: K): Record<K[number], number> | null => {
  if (!isRecord(value)) return null;
  const result: Partial<Record<K[number], number>> = {};
  for (const key of keys) {
    const normalized = normalizeNumber(value[key]);
    if (normalized === null) return null;
    result[key as K[number]] = normalized;
  }
  return result as Record<K[number], number>;
};

const normalizeSources = (value: unknown) => {
  if (!Array.isArray(value) || value.length > 20) return null;
  return value.map((entry) => {
    if (!isRecord(entry)) return null;
    const source = typeof entry.source === 'string' && MAP_KEY.test(entry.source) ? entry.source : null;
    const label = typeof entry.label === 'string' && entry.label.trim() && entry.label.length <= 120
      ? entry.label.trim()
      : null;
    const views = normalizeNumber(entry.views);
    const actionClicks = normalizeNumber(entry.actionClicks);
    const menuClicks = normalizeNumber(entry.menuClicks);
    const linkClicks = normalizeNumber(entry.linkClicks);
    return source && label && views !== null && actionClicks !== null && menuClicks !== null && linkClicks !== null
      ? { source, label, views, actionClicks, menuClicks, linkClicks }
      : null;
  }).every(Boolean)
    ? value.map((entry) => ({
      source: (entry as Record<string, unknown>).source as string,
      label: ((entry as Record<string, unknown>).label as string).trim(),
      views: (entry as Record<string, unknown>).views as number,
      actionClicks: (entry as Record<string, unknown>).actionClicks as number,
      menuClicks: (entry as Record<string, unknown>).menuClicks as number,
      linkClicks: (entry as Record<string, unknown>).linkClicks as number,
    }))
    : null;
};

const normalizeOpenHours = (value: unknown) => {
  if (!isRecord(value)) return null;
  const open = normalizeNumber(value.open);
  const closed = normalizeNumber(value.closed);
  const unknown = normalizeNumber(value.unknown);
  const closedShare = normalizeNumber(value.closedShare);
  return open !== null && closed !== null && unknown !== null && closedShare !== null
    ? { open, closed, unknown, closedShare }
    : null;
};

const normalizeLanguages = (value: unknown) => {
  if (!Array.isArray(value) || value.length > 20) return null;
  const result = value.map((entry) => {
    if (!isRecord(entry)) return null;
    const language = typeof entry.language === 'string' && MAP_KEY.test(entry.language) ? entry.language : null;
    const label = typeof entry.label === 'string' && entry.label.trim() && entry.label.length <= 120
      ? entry.label.trim()
      : null;
    const views = normalizeNumber(entry.views);
    const sessions = normalizeNumber(entry.sessions);
    const adoptions = normalizeNumber(entry.adoptions);
    return language && label && views !== null && sessions !== null && adoptions !== null
      ? { language, label, views, sessions, adoptions }
      : null;
  });
  return result.every(Boolean) ? result.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)) : null;
};

const normalizePeriod = (value: unknown) => {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const views = normalizeNumber(value.views);
  const actionClicks = normalizeNumber(value.actionClicks);
  const menuClicks = normalizeNumber(value.menuClicks);
  const linkClicks = normalizeNumber(value.linkClicks);
  const shares = normalizeNumber(value.shares);
  const daysWithData = normalizeNumber(value.daysWithData);
  const actions = normalizeBreakdown(value.actions, ['call', 'whatsapp', 'directions', 'reserve', 'order'] as const);
  const shareMethods = normalizeBreakdown(value.shareMethods, ['whatsapp', 'copy_link', 'copy_message'] as const);
  const links = normalizeBreakdown(value.links, ['google_review', 'instagram', 'facebook', 'website'] as const);
  const sources = normalizeSources(value.sources);
  const openHoursActionBreakdown = normalizeOpenHours(value.openHoursActionBreakdown);
  const topLanguages = normalizeLanguages(value.topLanguages);
  if (
    views === null || actionClicks === null || menuClicks === null || linkClicks === null || shares === null
    || daysWithData === null || !actions || !shareMethods || !links || !sources
    || !openHoursActionBreakdown || !topLanguages
  ) return undefined;
  return {
    views,
    actionClicks,
    menuClicks,
    linkClicks,
    shares,
    actions,
    shareMethods,
    links,
    sources,
    openHoursActionBreakdown,
    topLanguages,
    daysWithData,
  };
};

export function normalizeOBPDailyReadDocument(
  value: unknown,
  expected: { date: string; sId: string; tId: string },
): Record<string, unknown> | null {
  if (!isRecord(value) || normalizeDate(expected.date) !== expected.date) return null;
  if (
    String(value.tId ?? '') !== expected.tId
    || String(value.sId ?? '') !== expected.sId
    || value.projectId !== 'obp'
    || value.grain !== 'daily'
    || value.analyticsScope !== 'customer'
    || value.surface !== 'obp'
    || normalizeDate(value.date ?? value.localDate) !== expected.date
  ) return null;
  for (const field of DAILY_NUMERIC_FIELDS) {
    if (value[field] !== undefined && normalizeNumber(value[field]) === null) return null;
  }
  for (const field of DAILY_NUMERIC_MAP_FIELDS) {
    if (value[field] !== undefined && !normalizeNumberMap(value[field])) return null;
  }
  if (value.obpLanguageNames !== undefined && !normalizeStringMap(value.obpLanguageNames)) return null;
  if (value.obpLanguageTrackingEnabled !== undefined && typeof value.obpLanguageTrackingEnabled !== 'boolean') return null;
  return { ...value, date: expected.date };
}

export function normalizeOBPDashboardReadModel(
  value: unknown,
  expectedTenantId: string,
  expectedStoreId: string,
) {
  if (!isRecord(value)) return null;
  if (
    String(value.tId ?? '') !== expectedTenantId
    || String(value.sId ?? '') !== expectedStoreId
    || value.projectId !== 'obp'
    || value.kind !== 'obpDashboardSummary'
  ) return null;
  const lastSettledLocalDate = normalizeDate(value.lastSettledLocalDate);
  if (!lastSettledLocalDate || !Array.isArray(value.daily30d)) return null;
  const daily30d = value.daily30d.map((row) => {
    if (!isRecord(row)) return null;
    const date = normalizeDate(row.date);
    if (!date) return null;
    for (const field of DAILY_NUMERIC_FIELDS) {
      if (row[field] !== undefined && normalizeNumber(row[field]) === null) return null;
    }
    for (const field of DAILY_NUMERIC_MAP_FIELDS) {
      if (row[field] !== undefined && !normalizeNumberMap(row[field])) return null;
    }
    if (row.obpLanguageNames !== undefined && !normalizeStringMap(row.obpLanguageNames)) return null;
    if (row.obpLanguageTrackingEnabled !== undefined && typeof row.obpLanguageTrackingEnabled !== 'boolean') return null;
    return { ...row, date };
  });
  if (daily30d.some((row) => row === null)) return null;

  if (!isRecord(value.overview) || !isRecord(value.overall)) return null;
  const status = value.overview.status;
  const statusMessage = value.overview.statusMessage;
  const yesterday = normalizePeriod(value.overview.yesterday);
  const wtd = normalizePeriod(value.overview.wtd);
  const mtdBase = normalizePeriod(value.overview.mtd);
  const mtd = mtdBase && isRecord(value.overview.mtd)
    && typeof value.overview.mtd.monthName === 'string'
    && value.overview.mtd.monthName.length <= 40
    ? { ...mtdBase, monthName: value.overview.mtd.monthName }
    : mtdBase === null ? null : undefined;
  const historicalWeeks = value.overview.historicalWeeks;
  const viewsChange = value.overview.viewsChange;
  if (
    !['working', 'low_activity', 'no_data'].includes(String(status))
    || typeof statusMessage !== 'string' || !statusMessage.trim() || statusMessage.length > 240
    || yesterday === undefined || wtd === undefined || mtd === undefined
    || !Array.isArray(historicalWeeks) || historicalWeeks.length > 20
    || viewsChange !== null && (typeof viewsChange !== 'number' || !Number.isFinite(viewsChange))
  ) return null;
  const normalizedWeeks = historicalWeeks.map((week) => {
    if (!isRecord(week)) return null;
    const weekStart = normalizeDate(week.weekStart);
    const weekEnd = normalizeDate(week.weekEnd);
    const weekLabel = typeof week.weekLabel === 'string' && week.weekLabel.length <= 80 ? week.weekLabel : null;
    const views = normalizeNumber(week.views);
    const actionClicks = normalizeNumber(week.actionClicks);
    return weekStart && weekEnd && weekStart <= weekEnd && weekLabel && views !== null && actionClicks !== null
      && typeof week.isCurrentWeek === 'boolean'
      ? { weekStart, weekEnd, weekLabel, views, actionClicks, isCurrentWeek: week.isCurrentWeek }
      : null;
  });
  if (normalizedWeeks.some((week) => week === null)) return null;

  const overallNumbers = [
    'lifetimeViews', 'lifetimeActionClicks', 'lifetimeMenuClicks', 'lifetimeLinkClicks', 'lifetimeShares',
  ] as const;
  const normalizedOverallNumbers = normalizeBreakdown(value.overall, overallNumbers);
  if (!normalizedOverallNumbers) return null;
  const lifetimeActions = normalizeBreakdown(value.overall.lifetimeActions, ['call', 'whatsapp', 'directions', 'reserve', 'order'] as const);
  const lifetimeShareMethods = normalizeBreakdown(value.overall.lifetimeShareMethods, ['whatsapp', 'copy_link', 'copy_message'] as const);
  const lifetimeLinks = normalizeBreakdown(value.overall.lifetimeLinks, ['google_review', 'instagram', 'facebook', 'website'] as const);
  const lifetimeSources = normalizeSources(value.overall.lifetimeSources);
  const lifetimeOpenHoursActionBreakdown = normalizeOpenHours(value.overall.lifetimeOpenHoursActionBreakdown);
  const lifetimeLanguages = normalizeLanguages(value.overall.lifetimeLanguages);
  const firstDataDate = value.overall.firstDataDate === undefined ? undefined : normalizeDate(value.overall.firstDataDate);
  if (!lifetimeActions || !lifetimeShareMethods || !lifetimeLinks || !lifetimeSources
    || !lifetimeOpenHoursActionBreakdown || !lifetimeLanguages || value.overall.firstDataDate !== undefined && !firstDataDate) return null;

  return {
    tId: expectedTenantId,
    sId: expectedStoreId,
    projectId: 'obp' as const,
    kind: 'obpDashboardSummary' as const,
    overview: {
      status: status as 'working' | 'low_activity' | 'no_data',
      statusMessage: statusMessage.trim(),
      yesterday,
      wtd,
      mtd,
      historicalWeeks: normalizedWeeks.filter((week): week is NonNullable<typeof week> => Boolean(week)),
      viewsChange: viewsChange as number | null,
    },
    overall: {
      ...normalizedOverallNumbers,
      lifetimeActions,
      lifetimeShareMethods,
      lifetimeLinks,
      lifetimeSources,
      lifetimeOpenHoursActionBreakdown,
      lifetimeLanguages,
      firstDataDate: firstDataDate || undefined,
      lastUpdated: value.overall.lastUpdated,
    },
    daily30d: daily30d.filter((row): row is NonNullable<typeof row> => Boolean(row)),
    lastSettledLocalDate,
  };
}

export function normalizeOBPTodayCacheValue(value: unknown) {
  if (!isRecord(value)) return null;
  const date = normalizeDate(value.date);
  const period = normalizePeriod(value);
  if (!date || !period || typeof value.isPartial !== 'boolean') return null;
  let lastUpdated: Date | undefined;
  if (value.lastUpdated !== undefined) {
    const parsed = value.lastUpdated instanceof Date ? value.lastUpdated : new Date(String(value.lastUpdated));
    if (!Number.isFinite(parsed.getTime())) return null;
    lastUpdated = parsed;
  }
  return { ...period, date, isPartial: value.isPartial, lastUpdated };
}

export function normalizeOBPDashboardCacheValue(
  value: unknown,
  expectedTenantId: string,
  expectedStoreId: string,
) {
  if (!isRecord(value) || !Array.isArray(value.daily30d)) return null;
  const base = normalizeOBPDashboardReadModel(
    { ...value, daily30d: [] },
    expectedTenantId,
    expectedStoreId,
  );
  if (!base) return null;
  const daily30d = value.daily30d.map(normalizeOBPTodayCacheValue);
  if (daily30d.some((row) => row === null)) return null;
  let overallLastUpdated: Date | undefined;
  if (base.overall.lastUpdated !== undefined) {
    const parsed = base.overall.lastUpdated instanceof Date
      ? base.overall.lastUpdated
      : new Date(String(base.overall.lastUpdated));
    if (!Number.isFinite(parsed.getTime())) return null;
    overallLastUpdated = parsed;
  }
  return {
    ...base,
    overall: { ...base.overall, lastUpdated: overallLastUpdated },
    daily30d: daily30d.filter((row): row is NonNullable<typeof row> => Boolean(row)),
    lastFetched: new Date(),
  };
}
