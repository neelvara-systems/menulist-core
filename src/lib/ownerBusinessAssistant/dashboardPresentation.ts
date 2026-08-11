import type { DashboardTranslator } from '@lib/analytics/ownerDashboardPresentation';
import {
  getOwnerDashboardSourceLabel,
  isEnglishDashboardLocale,
} from '@lib/analytics/ownerDashboardPresentation';
import type { IntlFormatter } from '@util/dateTime';
import { formatDateKey } from '@util/dateTime';
import { formatNumber } from '@util/formatters';
import type {
  OwnerBusinessActivityMetric,
} from './businessSignals';
import { getOwnerBusinessPrimaryAnalyticsPeriod } from './businessSignals';
import type {
  OwnerBusinessAnalyticsIndexDoc,
  OwnerBusinessAnalyticsPeriod,
  OwnerBusinessHealthCheck,
  OwnerBusinessHealthCurrentDoc,
  OwnerBusinessHealthQuestion,
  OwnerBusinessHealthSourceRef,
  OwnerBusinessMultiLocationStoreSummary,
} from './types';

export interface OwnerBusinessHealthDashboardPresentation {
    feedbackLine: string | null;
    firstSignal: { action: string; message: string } | null;
    freshnessNote: string;
    headline: string;
    message: string;
    noActionLabel: string;
    statusLabel: string;
    title: string;
}

const SUPPORTED_CHECK_IDS = new Set([
  'guest_feedback_needs_attention',
  'low_latest_activity',
  'no_active_projects',
  'unavailable_item_taps',
]);

function getCheckKey(check: OwnerBusinessHealthCheck): string {
  return SUPPORTED_CHECK_IDS.has(check.id) ? check.id : 'default';
}

export function getOwnerBusinessHealthCheckPresentation(
  check: OwnerBusinessHealthCheck | undefined,
  t: DashboardTranslator,
): (OwnerBusinessHealthDashboardPresentation['firstSignal'] & {
  priorityLabel: string;
  title: string;
}) | null {
  if (!check) return null;
  const key = getCheckKey(check);
  return {
    action: t(`businessHealth.checks.${key}.action`),
    message: t(`businessHealth.checks.${key}.message`),
    priorityLabel: t(`actionPlan.priorities.${check.priority}`),
    title: t(`businessHealth.checks.${key}.title`),
  };
}

function getFeedbackLine(
    current: OwnerBusinessHealthCurrentDoc,
    t: DashboardTranslator,
): string | null {
    const feedback = current.feedbackSummary;
    if (!feedback) return null;
    const needsAttention = feedback.periods.last30Days?.needsAttentionCount
        ?? feedback.latestNeedsAttention.length;
    if (needsAttention > 0) {
        return t('businessHealth.feedback.needsAttention', { count: needsAttention });
    }
    const total = feedback.periods.last30Days?.totalCount ?? feedback.sampledCount;
    return total > 0 ? t('businessHealth.feedback.clear') : null;
}

function getFreshnessNote(
    current: OwnerBusinessHealthCurrentDoc,
    formatter: IntlFormatter,
    t: DashboardTranslator,
): string {
    if (current.status === 'not_ready' && !current.sourceRefs?.length) {
        return t('businessHealth.freshness.notReady');
    }
    const throughDate = current.sourceWindow?.lastSettledDate
        || current.sourceWindow?.today
        || current.localDate;
    const throughLabel = formatDateKey(throughDate, formatter, '');
    return throughLabel
        ? t('businessHealth.freshness.throughDate', { date: throughLabel })
        : t('businessHealth.freshness.latest');
}

export function getOwnerBusinessHealthDashboardPresentation(
    current: OwnerBusinessHealthCurrentDoc,
    formatter: IntlFormatter,
    t: DashboardTranslator,
): OwnerBusinessHealthDashboardPresentation {
    return {
        feedbackLine: getFeedbackLine(current, t),
        firstSignal: getOwnerBusinessHealthCheckPresentation(current.suggestedChecks?.[0], t),
        freshnessNote: getFreshnessNote(current, formatter, t),
        headline: t(`businessHealth.summary.${current.status}.headline`),
        message: current.summary.actionCount > 0
            ? t('businessHealth.summary.actionsNeedReview', { count: current.summary.actionCount })
            : t(`businessHealth.summary.${current.status}.message`),
        noActionLabel: t('businessHealth.noActionNeeded'),
        statusLabel: t(`businessHealth.status.${current.status}`),
        title: t('businessHealth.title'),
    };
}

function getBestSource(period: OwnerBusinessAnalyticsPeriod) {
    return [...(period.sourceQuality || [])]
        .filter((source) => Number(source.visits || 0) > 0)
        .sort((a, b) => b.visits - a.visits || Number(b.actionRate || 0) - Number(a.actionRate || 0))[0];
}

export function buildLocalizedOwnerBusinessActivityMetrics(
    period: OwnerBusinessAnalyticsPeriod | null | undefined,
    t: DashboardTranslator,
): OwnerBusinessActivityMetric[] {
    if (!period) return [];
    const topItem = period.topItems?.[0];
    const bestSource = getBestSource(period);
    const metrics: Array<OwnerBusinessActivityMetric | null> = [
        {
            key: 'menu-views',
            label: t('businessHealth.metrics.menuViews'),
            value: formatNumber(period.metrics.menuVisits || 0),
            detail: t(`businessHealth.periods.${period.key}`),
        },
        topItem ? {
            key: 'top-demand',
            label: t('businessHealth.metrics.topDemand'),
            value: topItem.name || topItem.itemId,
            detail: t('businessHealth.metrics.topDemandDetail', {
                count: formatNumber(topItem.value || 0),
                signal: t(`businessHealth.signals.${topItem.signal}`),
            }),
        } : null,
        bestSource ? {
            key: 'best-source',
            label: t('businessHealth.metrics.bestSource'),
            value: getOwnerDashboardSourceLabel(bestSource.source, bestSource.source, t),
            detail: t('businessHealth.metrics.bestSourceDetail', {
                count: formatNumber(bestSource.visits || 0),
            }),
        } : null,
    ];
    return metrics.filter(Boolean) as OwnerBusinessActivityMetric[];
}

export function getLocalizedOwnerBusinessPrimaryPeriod(
  periods: OwnerBusinessAnalyticsIndexDoc['periods'] | undefined,
) {
  return getOwnerBusinessPrimaryAnalyticsPeriod(periods);
}

export function getOwnerBusinessHealthQuestionLabel(
  question: OwnerBusinessHealthQuestion,
  t: DashboardTranslator,
): string {
  const supported = new Set([
    'checks',
    'today_stats',
    'this_week_stats',
    'top_item',
    'last_week_stats',
    'this_month_stats',
    'last_month_stats',
    'public_menu_status',
    'profile_status',
    'feedback_reviews',
    'feedback_recent',
  ]);
  const key = supported.has(question.id) ? question.id : 'default';
  return t(`businessHealth.assistant.questions.${key}`);
}

function getSourceKey(source: OwnerBusinessHealthSourceRef): string {
  if (source.id === 'projects_summary') return 'menuProjects';
  if (source.id === 'guest_feedback_summary') return 'guestFeedback';
  if (source.id === 'store_summary') return 'storeSettings';
  if (source.id.startsWith('analytics_')) return 'ownerAnalytics';
  return 'menuListData';
}

export function getOwnerBusinessHealthSourcePresentation(
  source: OwnerBusinessHealthSourceRef,
  formatter: IntlFormatter,
  t: DashboardTranslator,
) {
  const dateKey = source.generatedAt?.slice(0, 10);
  const date = formatDateKey(dateKey, formatter, '');
  return {
    freshness: date
      ? t('businessHealth.sources.updatedOn', { date })
      : t('businessHealth.sources.latest'),
    label: t(`businessHealth.sources.${getSourceKey(source)}`),
  };
}

export function getOwnerBusinessLocationPresentation(
  store: OwnerBusinessMultiLocationStoreSummary,
  locale: string,
  formatter: IntlFormatter,
  t: DashboardTranslator,
) {
  const checkedDate = formatDateKey(store.localDate, formatter, '');
  const genericReason = store.actionCount > 0
    ? t('businessHealth.locations.checksNeedReview', {
      count: store.actionCount,
    })
    : t(`businessHealth.locations.statusReason.${store.status}`);
  return {
    checkedLabel: checkedDate
      ? t('businessHealth.locations.checkedOn', { date: checkedDate })
      : null,
    name: store.storeName || t('businessHealth.locations.storeFallback', { id: store.sId }),
    reason: isEnglishDashboardLocale(locale) && store.topReason
      ? store.topReason
      : genericReason,
    statusLabel: t(`businessHealth.status.${store.status}`),
  };
}
