import { Card, Skeleton, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useOwnerBusinessAnalyticsIndex } from '@hook/ownerBusinessAssistant/useOwnerBusinessAnalyticsIndex';
import {
  buildLocalizedOwnerBusinessActivityMetrics,
  getLocalizedOwnerBusinessPrimaryPeriod,
} from '@lib/ownerBusinessAssistant/dashboardPresentation';
import styles from './OwnerBusinessAssistant.module.scss';

const { Text } = Typography;

export function BusinessHealthAnalyticsStrip({ enabled = true, projectId, storeScopeKey }: {
  enabled?: boolean;
  projectId?: string;
  storeScopeKey?: string | number;
}) {
  const t = useTranslations('Dashboard.owner');
  const { analytics, isLoading } = useOwnerBusinessAnalyticsIndex(projectId, storeScopeKey, { enabled });
  const primaryPeriod = getLocalizedOwnerBusinessPrimaryPeriod(analytics?.periods);

  if (isLoading && !analytics) {
    return <Card className={styles.analyticsStrip}><Skeleton active paragraph={{ rows: 1 }} /></Card>;
  }

  if (!primaryPeriod) return null;

  const metrics = buildLocalizedOwnerBusinessActivityMetrics(primaryPeriod, t);

  if (!metrics.length) return null;

  return (
    <Card className={styles.analyticsStrip} bodyStyle={{ padding: 12 }}>
      <div className={styles.analyticsStripHeader}>
        <Text strong>{primaryPeriod.key === 'today' ? t('businessHealth.today') : t('businessHealth.latestActivity')}</Text>
        <Text type="secondary">{t(`businessHealth.periods.${primaryPeriod.key}`)}</Text>
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
