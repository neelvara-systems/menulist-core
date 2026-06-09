import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { getBusinessAnalyticsDateKey } from '../utils/businessDay';
import { addDaysToAnalyticsDateKey, parseAnalyticsDateKey, formatAnalyticsDateKey } from '../utils/analyticsDate';
import type {
  ActiveProjectEntry,
  OwnerBusinessFeedbackItemSummary,
  OwnerBusinessFeedbackPeriodSummary,
  OwnerBusinessFeedbackProjectSummary,
  OwnerBusinessFeedbackSummary,
  OwnerBusinessFeedbackThemeKey,
  OwnerBusinessFeedbackThemeSummary,
} from './types';

const FEEDBACK_WINDOW_DAYS = 90;
const MAX_FEEDBACK_DOCS = 80;
const MAX_LATEST_ITEMS = 3;
const MAX_THEME_COUNT = 4;

const THEME_DEFINITIONS: Array<{ key: OwnerBusinessFeedbackThemeKey; label: string; patterns: RegExp[] }> = [
  { key: 'wrong_price', label: 'Wrong price or menu detail', patterns: [/price/i, /rate/i, /cost/i, /wrong menu/i, /old menu/i] },
  { key: 'hours', label: 'Hours or open status', patterns: [/closed/i, /open/i, /hours?/i, /timing/i, /time/i] },
  { key: 'unavailable_item', label: 'Unavailable item', patterns: [/unavailable/i, /not available/i, /sold out/i, /out of stock/i, /missing/i] },
  { key: 'service', label: 'Service experience', patterns: [/service/i, /staff/i, /wait/i, /slow/i, /rude/i] },
  { key: 'quality', label: 'Food or item quality', patterns: [/taste/i, /quality/i, /cold/i, /fresh/i, /bad/i, /poor/i] },
  { key: 'cleanliness', label: 'Cleanliness', patterns: [/clean/i, /dirty/i, /hygiene/i] },
  { key: 'delivery', label: 'Delivery or packing', patterns: [/delivery/i, /parcel/i, /pack/i, /packing/i, /takeaway/i] },
  { key: 'payment', label: 'Payment', patterns: [/payment/i, /upi/i, /card/i, /cash/i, /bill/i] },
];

const compactString = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().replace(/\s+/g, ' ');
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

const getProjectName = (entry: ActiveProjectEntry) =>
  compactLocalizedString(entry.data?.projectName)
  || compactLocalizedString(entry.data?.name)
  || compactLocalizedString(entry.data?.title)
  || `Menu ${entry.projectId}`;

const toDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isFinite(date.getTime()) ? date : undefined;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : undefined;
  }
  return undefined;
};

const sanitizeSnippet = (value: unknown) => {
  const text = compactString(value);
  if (!text) return undefined;
  const withoutTags = text.replace(/<[^>]*>/g, ' ');
  const redacted = withoutTags
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[contact]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[contact]')
    .replace(/\s+/g, ' ')
    .trim();
  return redacted.length > 140 ? `${redacted.slice(0, 137).trim()}...` : redacted;
};

const resolveTheme = (message?: string): OwnerBusinessFeedbackThemeKey => {
  if (!message) return 'other';
  const definition = THEME_DEFINITIONS.find((entry) => entry.patterns.some((pattern) => pattern.test(message)));
  return definition?.key || 'other';
};

const getThemeLabel = (key: OwnerBusinessFeedbackThemeKey) =>
  THEME_DEFINITIONS.find((entry) => entry.key === key)?.label || 'Other feedback';

const getMonthStart = (dateKey: string) => `${dateKey.slice(0, 7)}-01`;

const getPreviousMonthRange = (dateKey: string) => {
  const date = parseAnalyticsDateKey(getMonthStart(dateKey));
  date.setUTCMonth(date.getUTCMonth() - 1);
  const start = formatAnalyticsDateKey(date);
  const endDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { start, end: formatAnalyticsDateKey(endDate) };
};

const getWeekStart = (dateKey: string) => {
  const date = parseAnalyticsDateKey(dateKey);
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  return formatAnalyticsDateKey(date);
};

const inRange = (dateKey: string | undefined, start: string, end: string) =>
  Boolean(dateKey && dateKey >= start && dateKey <= end);

type FeedbackFact = {
  feedbackId: string;
  projectId?: string;
  projectName?: string;
  rating: number;
  source?: 'menu_footer' | 'feedback_qr' | 'direct_link';
  snippet?: string;
  createdAt?: string;
  localDate?: string;
  needsAttention: boolean;
  sourceFactId: string;
};

const toItemSummary = (fact: FeedbackFact): OwnerBusinessFeedbackItemSummary => ({
  feedbackId: fact.feedbackId,
  projectId: fact.projectId,
  projectName: fact.projectName,
  rating: fact.rating,
  source: fact.source,
  snippet: fact.snippet,
  createdAt: fact.createdAt,
  localDate: fact.localDate,
  sourceFactId: fact.sourceFactId,
});

const buildPeriod = (
  key: string,
  label: string,
  start: string,
  end: string,
  facts: FeedbackFact[],
): OwnerBusinessFeedbackPeriodSummary => {
  const scoped = facts.filter((fact) => inRange(fact.localDate, start, end));
  return {
    key,
    label,
    rangeLabel: start === end ? start : `${start} to ${end}`,
    totalCount: scoped.length,
    needsAttentionCount: scoped.filter((fact) => fact.needsAttention).length,
    sourceFactIds: Array.from(new Set(scoped.map((fact) => fact.sourceFactId))).slice(0, 12),
  };
};

const buildProjectBreakdown = (facts: FeedbackFact[]): Record<string, OwnerBusinessFeedbackProjectSummary> => {
  const result: Record<string, OwnerBusinessFeedbackProjectSummary> = {};
  facts.forEach((fact) => {
    if (!fact.projectId) return;
    const existing = result[fact.projectId] || {
      projectId: fact.projectId,
      projectName: fact.projectName,
      totalCount: 0,
      needsAttentionCount: 0,
      latestFeedbackAt: undefined,
      sourceFactIds: [],
    };
    existing.totalCount += 1;
    if (fact.needsAttention) existing.needsAttentionCount += 1;
    if (fact.createdAt && (!existing.latestFeedbackAt || fact.createdAt > existing.latestFeedbackAt)) {
      existing.latestFeedbackAt = fact.createdAt;
    }
    if (existing.sourceFactIds.length < 8) existing.sourceFactIds.push(fact.sourceFactId);
    result[fact.projectId] = existing;
  });
  return result;
};

const buildTopThemes = (facts: FeedbackFact[]): OwnerBusinessFeedbackThemeSummary[] => {
  const counts = new Map<OwnerBusinessFeedbackThemeKey, number>();
  facts
    .filter((fact) => fact.needsAttention && fact.snippet)
    .forEach((fact) => {
      const key = resolveTheme(fact.snippet);
      counts.set(key, (counts.get(key) || 0) + 1);
    });

  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, label: getThemeLabel(key), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, MAX_THEME_COUNT);
};

export async function buildOwnerBusinessFeedbackSummary(params: {
  db: FirebaseFirestore.Firestore;
  tId: string;
  sId: string;
  activeProjects: ActiveProjectEntry[];
  generatedAt: string;
  localDate: string;
  runAt: Date;
  timeZone?: string;
  businessDayEndTime?: string;
}): Promise<{ summary: OwnerBusinessFeedbackSummary; readCount: number; feedbackDocIds: string[] }> {
  const numericTId = Number(params.tId);
  const numericSId = Number(params.sId);
  const emptySourceFactId = 'guest_feedback_summary';
  const emptySummary: OwnerBusinessFeedbackSummary = {
    version: 1,
    status: 'insufficient_data',
    localDate: params.localDate,
    generatedAt: params.generatedAt,
    windowDays: FEEDBACK_WINDOW_DAYS,
    sampledCount: 0,
    truncated: false,
    periods: {},
    topThemes: [],
    latestNeedsAttention: [],
    latestFeedback: [],
    projectBreakdown: {},
    sourceFactIds: [emptySourceFactId],
  };

  if (!Number.isFinite(numericTId) || !Number.isFinite(numericSId)) {
    return { summary: emptySummary, readCount: 0, feedbackDocIds: [] };
  }

  const projectNames = new Map(params.activeProjects.map((entry) => [entry.projectId, getProjectName(entry)]));
  const cutoff = new Date(params.runAt.getTime() - FEEDBACK_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const snapshot = await params.db
    .collection(DB_COLLECTIONS.GUEST_FEEDBACK)
    .where('tId', '==', numericTId)
    .where('sId', '==', numericSId)
    .where('createdOn', '>=', Timestamp.fromDate(cutoff))
    .orderBy('createdOn', 'desc')
    .limit(MAX_FEEDBACK_DOCS + 1)
    .get();

  const docs = snapshot.docs.slice(0, MAX_FEEDBACK_DOCS);
  const facts: FeedbackFact[] = docs.map((doc) => {
    const data = doc.data() || {};
    const createdAtDate = toDate(data.createdOn);
    const createdAt = createdAtDate?.toISOString();
    const localDate = typeof data.businessDate === 'string' && data.businessDate
      ? data.businessDate
      : createdAtDate
        ? getBusinessAnalyticsDateKey(createdAtDate, params.timeZone, params.businessDayEndTime)
        : undefined;
    const projectId = compactString(data.projectId);
    const rating = typeof data.rating === 'number' && Number.isFinite(data.rating) ? data.rating : 0;
    const status = compactString(data.status);
    const source = ['menu_footer', 'feedback_qr', 'direct_link'].includes(String(data.source))
      ? data.source as FeedbackFact['source']
      : undefined;
    const sourceFactId = `guest_feedback_${doc.id}`;
    return {
      feedbackId: doc.id,
      projectId,
      projectName: projectId ? projectNames.get(projectId) : undefined,
      rating,
      source,
      snippet: sanitizeSnippet(data.message),
      createdAt,
      localDate,
      needsAttention: data.needsAttention === true || (rating > 0 && rating <= 3 && status !== 'resolved'),
      sourceFactId,
    };
  });

  const today = params.localDate;
  const yesterday = addDaysToAnalyticsDateKey(today, -1);
  const thisWeekStart = getWeekStart(today);
  const lastWeekStart = addDaysToAnalyticsDateKey(thisWeekStart, -7);
  const lastWeekEnd = addDaysToAnalyticsDateKey(thisWeekStart, -1);
  const thisMonthStart = getMonthStart(today);
  const previousMonth = getPreviousMonthRange(today);
  const last7Start = addDaysToAnalyticsDateKey(today, -6);
  const last30Start = addDaysToAnalyticsDateKey(today, -29);
  const oldestFactDate = facts.map((fact) => fact.localDate).filter(Boolean).sort()[0] || addDaysToAnalyticsDateKey(today, -(FEEDBACK_WINDOW_DAYS - 1));

  const periods: OwnerBusinessFeedbackSummary['periods'] = {
    today: buildPeriod('today', 'Today', today, today, facts),
    yesterday: buildPeriod('yesterday', 'Yesterday', yesterday, yesterday, facts),
    thisWeek: buildPeriod('thisWeek', 'This week', thisWeekStart, today, facts),
    lastWeek: buildPeriod('lastWeek', 'Last week', lastWeekStart, lastWeekEnd, facts),
    thisMonth: buildPeriod('thisMonth', 'This month', thisMonthStart, today, facts),
    lastMonth: buildPeriod('lastMonth', 'Last month', previousMonth.start, previousMonth.end, facts),
    last7Days: buildPeriod('last7Days', 'Last 7 days', last7Start, today, facts),
    last30Days: buildPeriod('last30Days', 'Last 30 days', last30Start, today, facts),
    overall: buildPeriod('overall', `Last ${FEEDBACK_WINDOW_DAYS} days`, oldestFactDate, today, facts),
  };

  const latestNeedsAttention = facts
    .filter((fact) => fact.needsAttention)
    .slice(0, MAX_LATEST_ITEMS)
    .map(toItemSummary);
  const latestFeedback = facts
    .slice(0, MAX_LATEST_ITEMS)
    .map(toItemSummary);
  const sourceFactIds = Array.from(new Set([
    emptySourceFactId,
    ...facts.slice(0, 12).map((fact) => fact.sourceFactId),
  ]));
  const summary: OwnerBusinessFeedbackSummary = {
    ...emptySummary,
    status: latestNeedsAttention.length
      ? 'needs_review'
      : facts.length
        ? 'stable'
        : 'insufficient_data',
    sampledCount: facts.length,
    truncated: snapshot.size > MAX_FEEDBACK_DOCS,
    latestFeedbackAt: facts[0]?.createdAt,
    latestNeedsAttentionAt: facts.find((fact) => fact.needsAttention)?.createdAt,
    periods,
    topThemes: buildTopThemes(facts),
    latestNeedsAttention,
    latestFeedback,
    projectBreakdown: buildProjectBreakdown(facts),
    sourceFactIds,
  };

  return {
    summary,
    readCount: snapshot.size,
    feedbackDocIds: docs.map((doc) => doc.id),
  };
}
