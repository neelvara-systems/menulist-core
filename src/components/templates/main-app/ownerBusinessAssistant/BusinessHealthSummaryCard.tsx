import { Alert, Card, Space, Typography } from 'antd';
import { LuAlertCircle, LuCheckCircle2, LuInfo } from 'react-icons/lu';
import type { OwnerBusinessHealthCurrentDoc } from '@lib/ownerBusinessAssistant/types';
import { getOwnerBusinessHealthFreshnessNote } from '@lib/ownerBusinessAssistant/freshness';
import { OwnerAssistantSourceDisclosure } from './OwnerAssistantSourceDisclosure';
import styles from './OwnerBusinessAssistant.module.scss';

const { Paragraph, Text, Title } = Typography;

const getStatusIcon = (status?: string) => {
  if (status === 'needs_review') return <LuAlertCircle size={22} />;
  if (status === 'watch' || status === 'stale' || status === 'not_ready' || status === 'insufficient_data') return <LuInfo size={22} />;
  return <LuCheckCircle2 size={22} />;
};

const getFeedbackLine = (current: OwnerBusinessHealthCurrentDoc) => {
  const feedback = current.feedbackSummary;
  if (!feedback) return null;
  const recent = feedback.periods.last30Days;
  const total = recent?.totalCount ?? feedback.sampledCount;
  const needsAttention = recent?.needsAttentionCount ?? feedback.latestNeedsAttention.length;
  if (!total && feedback.status === 'insufficient_data') return 'Guest feedback: no feedback received in the latest window.';
  if (needsAttention > 0) {
    return `Guest feedback: ${needsAttention} ${needsAttention === 1 ? 'item needs' : 'items need'} checking.`;
  }
  return 'Guest feedback: no feedback needs attention.';
};

export function BusinessHealthSummaryCard({ current }: { current: OwnerBusinessHealthCurrentDoc | null }) {
  if (!current) {
    return (
      <Card className={styles.dashboardCard}>
        <Alert type="info" showIcon message="Business Health is loading" />
      </Card>
    );
  }

  const statusClass = current.status === 'needs_review'
    ? styles.statusIconReview
    : current.status === 'watch' || current.status === 'stale'
      ? styles.statusIconWatch
      : current.status === 'not_ready' || current.status === 'insufficient_data'
        ? styles.statusIconInfo
      : '';
  const freshnessNote = getOwnerBusinessHealthFreshnessNote(current);
  const feedbackLine = getFeedbackLine(current);
  const showNoActionNeeded = Boolean(
    current.summary.noActionNeeded &&
    current.status !== 'not_ready' &&
    current.sourceRefs?.length,
  );

  return (
    <Card className={styles.dashboardCard}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space align="start" size={12}>
          <span className={`${styles.statusIcon} ${statusClass}`}>{getStatusIcon(current.status)}</span>
          <div>
            <Title level={4} style={{ margin: 0 }}>{current.summary.headline}</Title>
            <Paragraph style={{ margin: '6px 0 0' }}>{current.summary.ownerMessage}</Paragraph>
            {showNoActionNeeded ? <Text strong>No action needed.</Text> : null}
          </div>
        </Space>
        {freshnessNote ? <Alert type="info" showIcon message={freshnessNote} /> : null}
        {feedbackLine ? (
          <Alert
            type={current.feedbackSummary?.status === 'needs_review' ? 'warning' : 'info'}
            showIcon
            message={feedbackLine}
          />
        ) : null}
        <OwnerAssistantSourceDisclosure sources={current.sourceRefs} />
      </Space>
    </Card>
  );
}
