import { Alert, Card, Space, Typography } from 'antd';
import { LuAlertCircle, LuCheckCircle2, LuInfo } from 'react-icons/lu';
import type { OwnerBusinessHealthCurrentDoc } from '@lib/ownerBusinessAssistant/types';
import { OwnerAssistantSourceDisclosure } from './OwnerAssistantSourceDisclosure';
import styles from './OwnerBusinessAssistant.module.scss';

const { Paragraph, Text, Title } = Typography;

const getStatusIcon = (status?: string) => {
  if (status === 'needs_review') return <LuAlertCircle size={22} />;
  if (status === 'watch' || status === 'stale') return <LuInfo size={22} />;
  return <LuCheckCircle2 size={22} />;
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
      : '';

  return (
    <Card className={styles.dashboardCard}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space align="start" size={12}>
          <span className={`${styles.statusIcon} ${statusClass}`}>{getStatusIcon(current.status)}</span>
          <div>
            <Title level={4} style={{ margin: 0 }}>{current.summary.headline}</Title>
            <Paragraph style={{ margin: '6px 0 0' }}>{current.summary.ownerMessage}</Paragraph>
            {current.summary.noActionNeeded ? <Text strong>No action needed.</Text> : null}
          </div>
        </Space>
        <OwnerAssistantSourceDisclosure sources={current.sourceRefs} />
      </Space>
    </Card>
  );
}
