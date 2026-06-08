import { Button, Card, Skeleton, Space, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { useContext } from 'react';
import { LuActivity, LuArrowRight } from 'react-icons/lu';
import { useOwnerBusinessHealthCurrent } from '@hook/ownerBusinessAssistant/useOwnerBusinessHealthCurrent';
import { OWNER_BUSINESS_HEALTH_STATUS_LABELS } from '@lib/ownerBusinessAssistant/constants';
import { getOwnerBusinessHealthFreshnessNote } from '@lib/ownerBusinessAssistant/freshness';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import styles from './OwnerBusinessAssistant.module.scss';

const { Paragraph, Text, Title } = Typography;

export function BusinessHealthDashboardCard({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const { storeDetails } = useContext(PlatformGlobalDataContext);
  const { current, isLoading } = useOwnerBusinessHealthCurrent(projectId, storeDetails?.storeId);
  const healthHref = projectId ? `/business-health?projectId=${encodeURIComponent(projectId)}` : '/business-health';

  if (isLoading && !current) {
    return <Card className={styles.dashboardCard}><Skeleton active paragraph={{ rows: 2 }} /></Card>;
  }

  if (!current) return null;
  const freshnessNote = getOwnerBusinessHealthFreshnessNote(current);

  return (
    <Card className={styles.dashboardCard}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space align="start" size={12}>
          <span className={styles.statusIcon}><LuActivity size={22} /></span>
          <div>
            <Text type="secondary">Business Health · {OWNER_BUSINESS_HEALTH_STATUS_LABELS[current.status]}</Text>
            <Title level={4} style={{ margin: '4px 0' }}>{current.summary.headline}</Title>
            <Paragraph style={{ margin: 0 }}>{current.summary.ownerMessage}</Paragraph>
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
