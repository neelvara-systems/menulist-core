import { Button, Card, Skeleton, Space, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { useContext } from 'react';
import { LuActivity, LuArrowRight } from 'react-icons/lu';
import { useOwnerBusinessHealthCurrent } from '@hook/ownerBusinessAssistant/useOwnerBusinessHealthCurrent';
import { OWNER_BUSINESS_HEALTH_STATUS_LABELS } from '@lib/ownerBusinessAssistant/constants';
import { getOwnerBusinessHealthFreshnessNote } from '@lib/ownerBusinessAssistant/freshness';
import type { OwnerBusinessHealthCurrentDoc } from '@lib/ownerBusinessAssistant/types';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import styles from './OwnerBusinessAssistant.module.scss';

const { Paragraph, Text, Title } = Typography;

const getDashboardFeedbackLine = (current: OwnerBusinessHealthCurrentDoc) => {
  const feedback = current.feedbackSummary;
  if (!feedback) return null;
  const needsAttention = feedback.periods.last30Days?.needsAttentionCount ?? feedback.latestNeedsAttention.length;
  if (needsAttention > 0) {
    return `${needsAttention} guest feedback ${needsAttention === 1 ? 'item needs' : 'items need'} checking`;
  }
  const total = feedback.periods.last30Days?.totalCount ?? feedback.sampledCount;
  return total > 0 ? 'Guest feedback is clear' : null;
};

export function BusinessHealthDashboardCard({ current: providedCurrent, isLoading: providedIsLoading, projectId, storeScopeKey }: {
  current?: OwnerBusinessHealthCurrentDoc | null;
  isLoading?: boolean;
  projectId?: string;
  storeScopeKey?: string | number;
}) {
  const router = useRouter();
  const { storeDetails } = useContext(PlatformGlobalDataContext);
  const usesProvidedCurrent = providedCurrent !== undefined || providedIsLoading !== undefined;
  const fallback = useOwnerBusinessHealthCurrent(undefined, storeScopeKey || storeDetails?.storeId, { enabled: !usesProvidedCurrent });
  const current = usesProvidedCurrent ? providedCurrent || null : fallback.current;
  const isLoading = usesProvidedCurrent ? Boolean(providedIsLoading) : fallback.isLoading;
  const healthHref = projectId ? `/business-health?projectId=${encodeURIComponent(projectId)}` : '/business-health';

  if (isLoading && !current) {
    return <Card className={styles.dashboardCard}><Skeleton active paragraph={{ rows: 2 }} /></Card>;
  }

  if (!current) return null;
  const freshnessNote = getOwnerBusinessHealthFreshnessNote(current);
  const feedbackLine = getDashboardFeedbackLine(current);

  return (
    <Card className={styles.dashboardCard}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space align="start" size={12}>
          <span className={styles.statusIcon}><LuActivity size={22} /></span>
          <div>
            <Text type="secondary">Business Health · {OWNER_BUSINESS_HEALTH_STATUS_LABELS[current.status]}</Text>
            <Title level={4} style={{ margin: '4px 0' }}>{current.summary.headline}</Title>
            <Paragraph style={{ margin: 0 }}>{current.summary.ownerMessage}</Paragraph>
            {feedbackLine ? <Text type="secondary">{feedbackLine}</Text> : null}
            {freshnessNote ? <Text type="secondary">{freshnessNote}</Text> : null}
          </div>
        </Space>
        <Button icon={<LuArrowRight />} onClick={() => router.push(healthHref)}>
          Open Business Health
        </Button>
      </Space>
    </Card>
  );
}
