import { Card, Flex, Skeleton, Tag, Typography } from 'antd';
import { FEATURE_FLAGS } from '@config/features';
import { useOwnerBusinessAnalyticsIndex } from '@hook/ownerBusinessAssistant/useOwnerBusinessAnalyticsIndex';
import { buildLocalizedOwnerBusinessWeeklyMenuReview } from '@lib/ownerBusinessAssistant/dashboardPresentation';
import type { OwnerBusinessHealthCurrentDoc } from '@lib/ownerBusinessAssistant/types';
import { useTranslations } from 'next-intl';
import { LuAlertTriangle, LuCalendarDays, LuCheckCircle2 } from 'react-icons/lu';
import { BusinessHealthAnalyticsStrip } from './BusinessHealthAnalyticsStrip';
import styles from './OwnerBusinessAssistant.module.scss';

const { Text } = Typography;

export function BusinessHealthWeeklyMenuReview({
  current,
  enabled = true,
  projectId,
  storeScopeKey,
}: {
  current?: OwnerBusinessHealthCurrentDoc | null;
  enabled?: boolean;
  projectId?: string;
  storeScopeKey?: string | number;
}) {
  const t = useTranslations('Dashboard.owner');
  const isEnabled = enabled && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_WEEKLY_MENU_REVIEW;
  const { analytics, isLoading } = useOwnerBusinessAnalyticsIndex(projectId, storeScopeKey, { enabled: isEnabled });
  const review = buildLocalizedOwnerBusinessWeeklyMenuReview(analytics?.periods, current, t);

  if (!isEnabled) return null;
  if (isLoading && !analytics) {
    return <Card className={styles.analyticsStrip}><Skeleton active paragraph={{ rows: 2 }} /></Card>;
  }
  if (!review || !review.metrics.length) {
    return (
      <BusinessHealthAnalyticsStrip
        enabled={enabled}
        projectId={projectId}
        storeScopeKey={storeScopeKey}
      />
    );
  }

  return (
    <Card className={styles.analyticsStrip} bodyStyle={{ padding: 12 }}>
      <div className={styles.analyticsStripHeader}>
        <Flex align="center" gap={8}>
          <LuCalendarDays aria-hidden size={16} />
          <Text strong>{t('businessHealth.latestActivity')}</Text>
        </Flex>
        <Text type="secondary">{t('businessHealth.periods.thisWeek')}</Text>
      </div>
      <div className={styles.metricGrid}>
        {review.metrics.map((metric) => (
          <div className={styles.metricBox} key={metric.key}>
            <span className={styles.metricLabel}>{metric.label}</span>
            <span className={styles.metricValue}>{metric.value}</span>
            {metric.detail ? <span className={styles.metricDelta}>{metric.detail}</span> : null}
          </div>
        ))}
      </div>
      <Flex align="center" gap={10} justify="space-between" style={{ marginTop: 12 }} wrap="wrap">
        {review.comparison ? (
          <Flex gap={6}>
            <Text type="secondary">{review.comparison.label} · {review.comparison.detail}</Text>
            <Text strong>{review.comparison.value}</Text>
          </Flex>
        ) : <span />}
        <Flex align="center" gap={6} wrap="wrap">
          <Text type="secondary">{t('businessHealth.scope.locationLevel')}</Text>
          <Tag
            color={review.status === 'needs_review' ? 'warning' : 'success'}
            icon={review.status === 'needs_review' ? <LuAlertTriangle size={13} /> : <LuCheckCircle2 size={13} />}
          >
            {review.statusLabel}
          </Tag>
        </Flex>
      </Flex>
    </Card>
  );
}
