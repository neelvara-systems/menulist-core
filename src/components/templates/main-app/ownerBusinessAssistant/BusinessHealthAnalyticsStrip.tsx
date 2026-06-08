import { Card, Skeleton } from 'antd';
import { useOwnerBusinessAnalyticsIndex } from '@hook/ownerBusinessAssistant/useOwnerBusinessAnalyticsIndex';
import type { OwnerBusinessAnalyticsIndexDoc, OwnerBusinessAnalyticsPeriod } from '@lib/ownerBusinessAssistant/types';
import styles from './OwnerBusinessAssistant.module.scss';

const formatCount = (value?: number) => new Intl.NumberFormat('en').format(
  typeof value === 'number' && Number.isFinite(value) ? value : 0,
);

const firstAvailablePeriod = (
  periods: OwnerBusinessAnalyticsIndexDoc['periods'] | undefined,
) => periods?.today
  || periods?.thisWeek
  || periods?.last7Days
  || periods?.yesterday
  || null;

const buildMetricTeaser = (
  period: OwnerBusinessAnalyticsPeriod | undefined,
  key: string,
) => {
  if (!period) return null;
  return {
    key,
    label: period.label,
    value: `${formatCount(period.metrics.menuVisits)} visits`,
  };
};

const buildTopItemTeaser = (
  period: OwnerBusinessAnalyticsPeriod | undefined,
) => {
  const topItem = period?.topItems?.[0];
  if (!topItem) return null;
  return {
    key: 'top-item',
    label: 'Top item',
    value: topItem.name || topItem.itemId,
    delta: `${formatCount(topItem.value)} ${topItem.signal}`,
  };
};

export function BusinessHealthAnalyticsStrip({ projectId, storeScopeKey }: {
  projectId?: string;
  storeScopeKey?: string | number;
}) {
  const { analytics, isLoading } = useOwnerBusinessAnalyticsIndex(projectId, storeScopeKey);
  const primaryPeriod = firstAvailablePeriod(analytics?.periods);

  if (isLoading && !analytics) {
    return <Card className={styles.analyticsStrip}><Skeleton active paragraph={{ rows: 1 }} /></Card>;
  }

  if (!primaryPeriod) return null;

  const metrics = [
    buildMetricTeaser(primaryPeriod, 'primary-period'),
    primaryPeriod.key === 'thisWeek' ? null : buildMetricTeaser(analytics?.periods?.thisWeek, 'this-week'),
    buildTopItemTeaser(primaryPeriod),
  ].filter(Boolean) as Array<{ key: string; label: string; value: string; delta?: string }>;

  if (!metrics.length) return null;

  return (
    <Card className={styles.analyticsStrip} bodyStyle={{ padding: 12 }}>
      <div className={styles.metricGrid}>
        {metrics.map((metric) => (
          <div className={styles.metricBox} key={metric.key}>
            <span className={styles.metricLabel}>{metric.label}</span>
            <span className={styles.metricValue}>{metric.value}</span>
            {metric.delta ? <span className={styles.metricDelta}>{metric.delta}</span> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
