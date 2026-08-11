import { Card, Empty, Space, Tag, Typography } from 'antd';
import type { OwnerBusinessHealthCheck } from '@lib/ownerBusinessAssistant/types';
import { getOwnerBusinessHealthCheckPresentation } from '@lib/ownerBusinessAssistant/dashboardPresentation';
import { useTranslations } from 'next-intl';
import styles from './OwnerBusinessAssistant.module.scss';

const { Text } = Typography;

export function BusinessHealthPriorityChecks({ checks }: {
  checks?: OwnerBusinessHealthCheck[];
  localDate?: string;
  projectId?: string;
  storeScopeKey?: string | number;
}) {
  const t = useTranslations('Dashboard.owner');
  const visibleChecks = checks || [];

  if (!visibleChecks.length) {
    return (
      <Card title={t('businessHealth.page.needsAttention')} className={styles.dashboardCard}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('businessHealth.noActionNeeded')} />
      </Card>
    );
  }

  return (
    <Card title={t('businessHealth.page.needsAttention')} className={styles.dashboardCard}>
      <div className={styles.checkList}>
        {visibleChecks.map((check) => {
          const presentation = getOwnerBusinessHealthCheckPresentation(check, t);
          return <div className={styles.checkItem} key={check.id}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Space align="start" style={{ justifyContent: 'space-between', width: '100%' }}>
                <Text strong>{presentation?.title}</Text>
                <Tag color={check.priority === 'high' ? 'error' : check.priority === 'medium' ? 'warning' : 'processing'}>
                  {presentation?.action}
                </Tag>
              </Space>
              <Text>{presentation?.message}</Text>
            </Space>
          </div>;
        })}
      </div>
    </Card>
  );
}
