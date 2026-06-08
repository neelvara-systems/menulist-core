import { Card, Skeleton } from 'antd';
import { useOwnerBusinessHealthCurrent } from '@hook/ownerBusinessAssistant/useOwnerBusinessHealthCurrent';
import styles from './OwnerBusinessAssistant.module.scss';

export function BusinessHealthAnalyticsStrip({ projectId }: { projectId?: string }) {
  const { current, isLoading } = useOwnerBusinessHealthCurrent(projectId);
  const teaser = current?.analyticsTeaser;

  if (isLoading && !current) {
    return <Card className={styles.analyticsStrip}><Skeleton active paragraph={{ rows: 1 }} /></Card>;
  }

  if (!teaser) return null;

  const metrics = [
    teaser.today ? { label: teaser.today.label, value: teaser.today.value, delta: teaser.today.deltaLabel } : null,
    teaser.thisWeek ? { label: teaser.thisWeek.label, value: teaser.thisWeek.value, delta: teaser.thisWeek.deltaLabel } : null,
    teaser.topItem ? { label: teaser.topItem.label, value: teaser.topItem.value, delta: teaser.topItem.deltaLabel } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; delta?: string }>;

  if (!metrics.length) return null;

  return (
    <Card className={styles.analyticsStrip} bodyStyle={{ padding: 12 }}>
      <div className={styles.metricGrid}>
        {metrics.map((metric) => (
          <div className={styles.metricBox} key={metric.label}>
            <span className={styles.metricLabel}>{metric.label}</span>
            <span className={styles.metricValue}>{metric.value}</span>
            {metric.delta ? <span className={styles.metricDelta}>{metric.delta}</span> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
