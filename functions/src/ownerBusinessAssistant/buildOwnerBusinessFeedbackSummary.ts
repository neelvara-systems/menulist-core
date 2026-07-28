import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { DB_COLLECTIONS } from '../constants/database';
import { getBusinessAnalyticsDateKey } from '../utils/businessDay';
import {
  addDaysToAnalyticsDateKey,
  formatAnalyticsDateKey,
  isValidAnalyticsDateKey,
  parseAnalyticsDateKey,
} from '../utils/analyticsDate';
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
const GUEST_FEEDBACK_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
const PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
const logger = functions.logger;

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
    .map((entry) => compactString(entry))
    .find(Boolean);
};

export const getOwnerBusinessFeedbackProjectName = (entry: ActiveProjectEntry) =>
  compactLocalizedString(entry.data?.projectName)
  || compactLocalizedString(entry.data?.name)
  || compactLocalizedString(entry.data?.title)
  || `Menu ${entry.projectId}`;

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

export type OwnerBusinessFeedbackFact = {
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

const normalizePositiveSafeInteger = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const projectPersistedTimestampDate = (value: unknown): Date | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value instanceof Timestamp) {
    const date = value.toDate();
    return Number.isFinite(date.getTime()) ? date : null;
  }
  const candidate = value as { nanoseconds?: unknown; seconds?: unknown };
  if (
    !Number.isSafeInteger(candidate.seconds)
    || !Number.isInteger(candidate.nanoseconds)
    || Number(candidate.nanoseconds) < 0
    || Number(candidate.nanoseconds) > 999_999_999
  ) return null;
  const date = new Date(
    Number(candidate.seconds) * 1_000
    + Math.floor(Number(candidate.nanoseconds) / 1_000_000),
  );
  return Number.isFinite(date.getTime()) ? date : null;
};

export const projectOwnerBusinessFeedbackFact = (params: {
  feedbackId: string;
  data: unknown;
  expectedTId: number;
  expectedSId: number;
  projectNames?: ReadonlyMap<string, string>;
  timeZone?: string;
  businessDayEndTime?: string;
}): OwnerBusinessFeedbackFact | null => {
  if (
    !GUEST_FEEDBACK_ID_PATTERN.test(params.feedbackId)
    || !params.data
    || typeof params.data !== 'object'
    || Array.isArray(params.data)
  ) return null;
  const data = params.data as Record<string, unknown>;
  const tId = normalizePositiveSafeInteger(data.tId);
  const sId = normalizePositiveSafeInteger(data.sId);
  const projectId = compactString(data.projectId);
  const rating = data.rating;
  const status = data.status;
  const createdAtDate = projectPersistedTimestampDate(data.createdOn);
  const expiresAtDate = projectPersistedTimestampDate(data.expiresOn);
  const expectedNeedsAttention = Number.isInteger(rating)
    && Number(rating) <= 3
    && status === 'new';
  const source = data.source;
  const message = data.message;
  if (
    tId !== params.expectedTId
    || sId !== params.expectedSId
    || !projectId
    || !PROJECT_ID_PATTERN.test(projectId)
    || !Number.isInteger(rating)
    || Number(rating) < 1
    || Number(rating) > 5
    || (status !== 'new' && status !== 'resolved')
    || data.needsAttention !== expectedNeedsAttention
    || data.createdBy !== 'guest'
    || !createdAtDate
    || !expiresAtDate
    || expiresAtDate.getTime() <= createdAtDate.getTime()
    || (
      source !== 'menu_footer'
      && source !== 'feedback_qr'
      && source !== 'direct_link'
    )
    || (
      message !== undefined
      && (typeof message !== 'string' || message.length > 300)
    )
    || (
      data.businessDate !== undefined
      && !isValidAnalyticsDateKey(data.businessDate)
    )
  ) return null;

  const createdAt = createdAtDate.toISOString();
  const localDate = isValidAnalyticsDateKey(data.businessDate)
    ? data.businessDate
    : getBusinessAnalyticsDateKey(
      createdAtDate,
      params.timeZone,
      params.businessDayEndTime,
    );
  return {
    feedbackId: params.feedbackId,
    projectId,
    projectName: params.projectNames?.get(projectId),
    rating: Number(rating),
    source,
    snippet: sanitizeSnippet(message),
    createdAt,
    localDate,
    needsAttention: expectedNeedsAttention,
    sourceFactId: `guest_feedback_${params.feedbackId}`,
  };
};

const toItemSummary = (fact: OwnerBusinessFeedbackFact): OwnerBusinessFeedbackItemSummary => ({
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
  facts: OwnerBusinessFeedbackFact[],
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

const buildProjectBreakdown = (facts: OwnerBusinessFeedbackFact[]): Record<string, OwnerBusinessFeedbackProjectSummary> => {
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

const buildTopThemes = (facts: OwnerBusinessFeedbackFact[]): OwnerBusinessFeedbackThemeSummary[] => {
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
  const numericTId = normalizePositiveSafeInteger(params.tId);
  const numericSId = normalizePositiveSafeInteger(params.sId);
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

  if (!numericTId || !numericSId || !isValidAnalyticsDateKey(params.localDate)) {
    return { summary: emptySummary, readCount: 0, feedbackDocIds: [] };
  }

  const projectNames = new Map(params.activeProjects.map((entry) => [entry.projectId, getOwnerBusinessFeedbackProjectName(entry)]));
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
  const invalidFeedbackDocIds: string[] = [];
  const facts = docs.flatMap((doc) => {
    const fact = projectOwnerBusinessFeedbackFact({
      feedbackId: doc.id,
      data: doc.data(),
      expectedTId: numericTId,
      expectedSId: numericSId,
      projectNames,
      timeZone: params.timeZone,
      businessDayEndTime: params.businessDayEndTime,
    });
    if (fact) return [fact];
    invalidFeedbackDocIds.push(doc.id);
    return [];
  });
  if (invalidFeedbackDocIds.length > 0) {
    logger.warn('[OwnerBusinessAssistant] Invalid guest feedback records omitted', {
      failureCode: 'OWNER_BUSINESS_FEEDBACK_INVALID_RECORD',
      invalidRecordCount: invalidFeedbackDocIds.length,
      sampledDocumentIds: invalidFeedbackDocIds.slice(0, 3),
      storeId: params.sId,
      tenantId: params.tId,
    });
  }

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
    feedbackDocIds: facts.map((fact) => fact.feedbackId),
  };
}
