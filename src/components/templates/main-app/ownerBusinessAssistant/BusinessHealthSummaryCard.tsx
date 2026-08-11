import { Alert, Card, Space, Typography } from 'antd';
import { LuAlertCircle, LuCheckCircle2, LuInfo } from 'react-icons/lu';
import type { OwnerBusinessHealthCurrentDoc } from '@lib/ownerBusinessAssistant/types';
import { getOwnerBusinessHealthDashboardPresentation } from '@lib/ownerBusinessAssistant/dashboardPresentation';
import { useFormatter, useTranslations } from 'next-intl';
import { OwnerAssistantSourceDisclosure } from './OwnerAssistantSourceDisclosure';
import styles from './OwnerBusinessAssistant.module.scss';

const { Paragraph, Text, Title } = Typography;

const getStatusIcon = (status?: string) => {
  if (status === 'needs_review') return <LuAlertCircle size={22} />;
  if (status === 'watch' || status === 'stale' || status === 'not_ready' || status === 'insufficient_data') return <LuInfo size={22} />;
  return <LuCheckCircle2 size={22} />;
};

export function BusinessHealthSummaryCard({ current }: { current: OwnerBusinessHealthCurrentDoc | null }) {
  const formatter = useFormatter();
  const t = useTranslations('Dashboard.owner');
  if (!current) {
    return (
      <Card className={styles.dashboardCard}>
        <Alert type="info" showIcon message={t('businessHealth.page.loading')} />
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
  const presentation = getOwnerBusinessHealthDashboardPresentation(current, formatter, t);
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
            <Title level={4} style={{ margin: 0 }}>{presentation.headline}</Title>
            <Paragraph style={{ margin: '6px 0 0' }}>{presentation.message}</Paragraph>
            {showNoActionNeeded ? <Text strong>{presentation.noActionLabel}</Text> : null}
          </div>
        </Space>
        {presentation.freshnessNote ? <Alert type="info" showIcon message={presentation.freshnessNote} /> : null}
        {presentation.feedbackLine ? (
          <Alert
            type={current.feedbackSummary?.status === 'needs_review' ? 'warning' : 'info'}
            showIcon
            message={presentation.feedbackLine}
          />
        ) : null}
        <OwnerAssistantSourceDisclosure sources={current.sourceRefs} />
      </Space>
    </Card>
  );
}
