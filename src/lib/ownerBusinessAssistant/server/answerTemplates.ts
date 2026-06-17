import { OWNER_BUSINESS_HEALTH_STATUS_LABELS } from '../constants';
import { formatOwnerBusinessHealthDateKey } from '../freshness';
import type {
  OwnerBusinessAssistantContextPacket,
  OwnerBusinessAssistantIntent,
  OwnerBusinessAnalyticsPeriod,
  OwnerBusinessFeedbackSummary,
} from '../types';
import { buildAnalyticsPeriodArtifacts } from './answerArtifacts';

const numberFormatter = new Intl.NumberFormat('en');

const formatNumber = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0';
  return numberFormatter.format(value);
};

export function buildBusinessStatusAnswer(packet: OwnerBusinessAssistantContextPacket) {
  const health = packet.health;
  const checks = health.suggestedChecks.filter((check) => check.priority !== 'low').slice(0, 3);
  const checkText = checks.length
    ? ` ${checks.map((check) => check.message).join(' ')}`
    : '';

  return {
    text: `${health.summary.ownerMessage || health.summary.headline} ${health.summary.noActionNeeded ? 'No action needed.' : ''}${checkText}`.trim(),
    sourceFactIds: [
      ...health.sourceRefs.map((ref) => ref.id),
      ...checks.flatMap((check) => check.sourceFactIds),
    ].filter(Boolean),
    artifacts: health.answerArtifacts,
    confidence: health.status === 'not_ready' || health.status === 'insufficient_data' ? 'low' : 'high',
  };
}

export function buildAnalyticsAnswer(
  period: OwnerBusinessAnalyticsPeriod,
  intent: OwnerBusinessAssistantIntent,
) {
  const topItem = period.topItems?.[0];
  const scopeLabel = period.scope === 'project' && period.projectName
    ? ` for ${period.projectName}`
    : period.scope === 'store' && (period.indexedProjectCount || 0) > 1
      ? ` across ${formatNumber(period.indexedProjectCount)} menus`
      : '';
  const topItemScope = topItem?.projectName && period.scope === 'store' && (period.indexedProjectCount || 0) > 1
    ? ` in ${topItem.projectName}`
    : '';
  const base = `${period.label}${scopeLabel}: ${formatNumber(period.metrics.menuVisits)} menu visits, ${formatNumber(period.metrics.itemClicks)} item clicks, and ${formatNumber(period.metrics.searches)} searches.`;
  const extra = topItem
    ? ` Top item was ${topItem.name || topItem.itemId}${topItemScope} with ${formatNumber(topItem.value)} ${topItem.signal}.`
    : '';
  const intentSuffix = intent === 'item_attention' && topItem
    ? ` This is the item getting the most attention for ${period.rangeLabel}.`
    : '';

  return {
    text: `${base}${extra}${intentSuffix}`.trim(),
    sourceFactIds: period.sourceFactIds,
    artifacts: buildAnalyticsPeriodArtifacts(period),
    confidence: period.status === 'available' ? 'high' : 'medium',
  };
}

const plural = (count: number, singular: string, pluralLabel = `${singular}s`) =>
  `${formatNumber(count)} ${count === 1 ? singular : pluralLabel}`;

const getProjectScopedFeedback = (
  summary: OwnerBusinessFeedbackSummary,
  projectId?: string,
) => {
  if (!projectId) {
    return {
      totalCount: summary.periods.last30Days?.totalCount ?? summary.sampledCount,
      needsAttentionCount: summary.periods.last30Days?.needsAttentionCount ?? summary.latestNeedsAttention.length,
      latestNeedsAttention: summary.latestNeedsAttention,
      latestFeedback: summary.latestFeedback,
      sourceFactIds: summary.sourceFactIds,
      projectName: undefined,
    };
  }

  const project = summary.projectBreakdown[projectId];
  return {
    totalCount: project?.totalCount || 0,
    needsAttentionCount: project?.needsAttentionCount || 0,
    latestNeedsAttention: summary.latestNeedsAttention.filter((item) => item.projectId === projectId),
    latestFeedback: summary.latestFeedback.filter((item) => item.projectId === projectId),
    sourceFactIds: project?.sourceFactIds?.length ? project.sourceFactIds : summary.sourceFactIds,
    projectName: project?.projectName,
  };
};

export function buildFeedbackPatternAnswer(packet: OwnerBusinessAssistantContextPacket) {
  const summary = packet.health.feedbackSummary;
  if (!summary) {
    return {
      text: 'MenuList does not have a guest feedback summary in the latest Business Health check.',
      sourceFactIds: packet.health.sourceRefs.map((ref) => ref.id),
      artifacts: undefined,
      confidence: 'low',
    };
  }

  const scoped = getProjectScopedFeedback(summary, packet.projectId);
  const scopeLabel = scoped.projectName
    ? ` for ${scoped.projectName}`
    : packet.projectId
      ? ' for the selected menu'
      : '';
  const latest = scoped.latestNeedsAttention[0] || scoped.latestFeedback[0];
  const topTheme = !packet.projectId ? summary.topThemes[0] : undefined;
  const sourceFactIds = Array.from(new Set([
    ...scoped.sourceFactIds,
    ...(latest?.sourceFactId ? [latest.sourceFactId] : []),
  ])).filter(Boolean);

  if (scoped.totalCount === 0) {
    return {
      text: `MenuList has not received guest feedback${scopeLabel} in the latest feedback window.`,
      sourceFactIds,
      artifacts: [{
        type: 'metric_row' as const,
        metrics: [
          { label: 'Guest feedback', value: '0' },
          { label: 'Needs checking', value: '0' },
        ],
      }],
      confidence: summary.truncated ? 'medium' : 'high',
    };
  }

  const attentionText = scoped.needsAttentionCount > 0
    ? `${plural(scoped.needsAttentionCount, 'item')} need checking`
    : 'none need checking';
  const latestText = latest?.snippet
    ? ` Latest note: "${latest.snippet}"`
    : '';
  const themeText = topTheme
    ? ` Main theme: ${topTheme.label}.`
    : '';
  const truncationText = summary.truncated
    ? ' This is based on the latest capped feedback sample from the scheduled check.'
    : '';

  return {
    text: `Guest feedback${scopeLabel}: ${plural(scoped.totalCount, 'item')} in the latest feedback window; ${attentionText}.${themeText}${latestText}${truncationText}`.trim(),
    sourceFactIds,
    artifacts: [
      {
        type: 'metric_row' as const,
        metrics: [
          { label: 'Guest feedback', value: formatNumber(scoped.totalCount) },
          { label: 'Needs checking', value: formatNumber(scoped.needsAttentionCount) },
        ],
      },
      ...(scoped.latestNeedsAttention.length ? [{
        type: 'compact_table' as const,
        columns: ['Rating', 'Menu', 'Note'],
        rows: scoped.latestNeedsAttention.slice(0, 3).map((item) => [
          `${item.rating}/5`,
          item.projectName || item.projectId || 'Menu',
          item.snippet || 'No note',
        ]),
        maxRows: 3,
      }] : []),
    ],
    confidence: summary.truncated ? 'medium' : 'high',
  };
}

export const describeHealthStatus = (packet: OwnerBusinessAssistantContextPacket) => {
  const throughDate = packet.health.sourceWindow?.lastSettledDate
    || packet.health.sourceWindow?.today
    || packet.health.localDate;
  const throughLabel = formatOwnerBusinessHealthDateKey(throughDate);
  const label = OWNER_BUSINESS_HEALTH_STATUS_LABELS[packet.health.status];
  return throughLabel
    ? `${label}. Uses data through ${throughLabel}. Today may not be complete yet.`
    : `${label}. Uses the latest available MenuList data.`;
};
