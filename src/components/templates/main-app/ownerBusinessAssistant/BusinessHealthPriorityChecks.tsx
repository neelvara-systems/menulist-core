import { Card, Empty, Space, Tag, Typography } from 'antd';
import type { OwnerBusinessHealthCheck } from '@lib/ownerBusinessAssistant/types';
import {
  getOwnerBusinessCheckActionLabel,
  getOwnerBusinessCheckOwnerMessage,
} from '@lib/ownerBusinessAssistant/businessSignals';
import styles from './OwnerBusinessAssistant.module.scss';

const { Text } = Typography;

export function BusinessHealthPriorityChecks({ checks }: {
  checks?: OwnerBusinessHealthCheck[];
  localDate?: string;
  projectId?: string;
  storeScopeKey?: string | number;
}) {
  const visibleChecks = checks || [];

  if (!visibleChecks.length) {
    return (
      <Card title="Needs attention" className={styles.dashboardCard}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No action needed" />
      </Card>
    );
  }

  return (
    <Card title="Needs attention" className={styles.dashboardCard}>
      <div className={styles.checkList}>
        {visibleChecks.map((check) => (
          <div className={styles.checkItem} key={check.id}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Space align="start" style={{ justifyContent: 'space-between', width: '100%' }}>
                <Text strong>{check.title}</Text>
                <Tag color={check.priority === 'high' ? 'error' : check.priority === 'medium' ? 'warning' : 'processing'}>
                  {getOwnerBusinessCheckActionLabel(check)}
                </Tag>
              </Space>
              <Text>{getOwnerBusinessCheckOwnerMessage(check)}</Text>
            </Space>
          </div>
        ))}
      </div>
    </Card>
  );
}
