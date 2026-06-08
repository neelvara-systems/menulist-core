import type { OwnerAssistantAnswerArtifact, OwnerBusinessAnalyticsPeriod } from '../types';

const formatNumber = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0';
  return new Intl.NumberFormat('en').format(value);
};

export function buildAnalyticsPeriodArtifacts(
  period: OwnerBusinessAnalyticsPeriod,
): OwnerAssistantAnswerArtifact[] {
  const metrics = [
    { label: 'Menu visits', value: formatNumber(period.metrics.menuVisits) },
    { label: 'Item clicks', value: formatNumber(period.metrics.itemClicks) },
    { label: 'Searches', value: formatNumber(period.metrics.searches) },
    { label: 'Action sessions', value: formatNumber(period.metrics.actionSessions) },
  ];

  const artifacts: OwnerAssistantAnswerArtifact[] = [
    {
      type: 'metric_row',
      metrics,
    },
  ];

  if (period.topItems?.length) {
    const showMenuColumn = period.scope === 'store'
      && (period.indexedProjectCount || 0) > 1
      && period.topItems.some((item) => item.projectName);
    artifacts.push({
      type: 'compact_table',
      columns: showMenuColumn ? ['Item', 'Menu', 'Signal'] : ['Item', 'Signal'],
      rows: period.topItems.slice(0, 5).map((item) => [
        item.name || item.itemId,
        ...(showMenuColumn ? [item.projectName || item.projectId || 'Menu'] : []),
        `${formatNumber(item.value)} ${item.signal}`,
      ]),
      maxRows: 5,
    });
  }

  return artifacts;
}
