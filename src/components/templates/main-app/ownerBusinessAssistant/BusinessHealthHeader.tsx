import { Button, Space, Typography } from 'antd';
import { LuActivity, LuRefreshCw } from 'react-icons/lu';
import type { OwnerBusinessHealthCurrentDoc } from '@lib/ownerBusinessAssistant/types';
import { getOwnerBusinessHealthSourcePresentation } from '@lib/ownerBusinessAssistant/dashboardPresentation';
import { useFormatter, useTranslations } from 'next-intl';
import { OwnerAssistantFreshnessLabel } from './OwnerAssistantFreshnessLabel';
import styles from './OwnerBusinessAssistant.module.scss';

const { Text, Title } = Typography;

export function BusinessHealthHeader({ current, onRefresh }: {
  current: OwnerBusinessHealthCurrentDoc | null;
  onRefresh?: () => void;
}) {
  const formatter = useFormatter();
  const t = useTranslations('Dashboard.owner');
  const source = current?.sourceRefs?.[0]
    ? getOwnerBusinessHealthSourcePresentation(current.sourceRefs[0], formatter, t)
    : null;
  return (
    <div className={styles.header}>
      <Space align="start" size={12}>
        <span className={styles.statusIcon}><LuActivity size={22} /></span>
        <div>
          <Title level={3} style={{ margin: 0 }}>{t('businessHealth.title')}</Title>
          <Text type="secondary">
            {current ? t(`businessHealth.status.${current.status}`) : t('businessHealth.page.latestCheck')}
          </Text>
        </div>
      </Space>
      <Space>
        <OwnerAssistantFreshnessLabel label={source?.freshness} />
        {onRefresh ? (
          <Button icon={<LuRefreshCw />} onClick={onRefresh}>
            {t('businessHealth.page.refresh')}
          </Button>
        ) : null}
      </Space>
    </div>
  );
}
