import { Card, Skeleton, Typography } from 'antd';
import { useOwnerBusinessAnalyticsIndex } from '@hook/ownerBusinessAssistant/useOwnerBusinessAnalyticsIndex';
import {
  buildOwnerBusinessActivityMetrics,
  getOwnerBusinessPrimaryAnalyticsPeriod,
} from '@lib/ownerBusinessAssistant/businessSignals';
import styles from './OwnerBusinessAssistant.module.scss';

const { Text } = Typography;

export function BusinessHealthAnalyticsStrip({ enabled = true, projectId, storeScopeKey }: {
  enabled?: boolean;
  projectId?: string;
  storeScopeKey?: string | number;
}) {
  const { analytics, isLoading } = useOwnerBusinessAnalyticsIndex(projectId, storeScopeKey, { enabled });
  const primaryPeriod = getOwnerBusinessPrimaryAnalyticsPeriod(analytics?.periods);

  if (isLoading && !analytics) {
    return <Card className={styles.analyticsStrip}><Skeleton active paragraph={{ rows: 1 }} /></Card>;
  }

  if (!primaryPeriod) return null;

  const metrics = buildOwnerBusinessActivityMetrics(primaryPeriod);

  if (!metrics.length) return null;

  return (
    <Card className={styles.analyticsStrip} bodyStyle={{ padding: 12 }}>
      <div className={styles.analyticsStripHeader}>
        <Text strong>{primaryPeriod.key === 'today' ? 'Today' : 'Latest activity'}</Text>
        <Text type="secondary">{primaryPeriod.rangeLabel}</Text>
      </div>
      <div className={styles.metricGrid}>
        {metrics.map((metric) => (
          <div className={styles.metricBox} key={metric.key}>
            <span className={styles.metricLabel}>{metric.label}</span>
            <span className={styles.metricValue}>{metric.value}</span>
            {metric.detail ? <span className={styles.metricDelta}>{metric.detail}</span> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
