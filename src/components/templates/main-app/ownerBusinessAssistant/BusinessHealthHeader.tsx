import { Button, Space, Typography } from 'antd';
import { LuActivity, LuRefreshCw } from 'react-icons/lu';
import type { OwnerBusinessHealthCurrentDoc } from '@lib/ownerBusinessAssistant/types';
import { OWNER_BUSINESS_HEALTH_STATUS_LABELS } from '@lib/ownerBusinessAssistant/constants';
import { OwnerAssistantFreshnessLabel } from './OwnerAssistantFreshnessLabel';
import styles from './OwnerBusinessAssistant.module.scss';

const { Text, Title } = Typography;

export function BusinessHealthHeader({ current, onRefresh }: {
  current: OwnerBusinessHealthCurrentDoc | null;
  onRefresh?: () => void;
}) {
  return (
    <div className={styles.header}>
      <Space align="start" size={12}>
        <span className={styles.statusIcon}><LuActivity size={22} /></span>
        <div>
          <Title level={3} style={{ margin: 0 }}>Business Health</Title>
          <Text type="secondary">
            {current ? OWNER_BUSINESS_HEALTH_STATUS_LABELS[current.status] : 'Latest check'}
          </Text>
        </div>
      </Space>
      <Space>
        <OwnerAssistantFreshnessLabel label={current?.sourceRefs?.[0]?.freshnessLabel || current?.generatedAt?.slice(0, 10)} />
        {onRefresh ? (
          <Button icon={<LuRefreshCw />} onClick={onRefresh}>
            Refresh
          </Button>
        ) : null}
      </Space>
    </div>
  );
}
