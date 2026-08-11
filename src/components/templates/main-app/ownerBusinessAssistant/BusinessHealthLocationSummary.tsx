import { Card, Empty, Space, Tag, Typography } from 'antd';
import { useOwnerBusinessLocationsSummary } from '@hook/ownerBusinessAssistant/useOwnerBusinessLocationsSummary';
import { getOwnerBusinessLocationPresentation } from '@lib/ownerBusinessAssistant/dashboardPresentation';
import type { OwnerBusinessHealthStatus } from '@lib/ownerBusinessAssistant/types';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import styles from './OwnerBusinessAssistant.module.scss';

const { Text } = Typography;

const statusColor = (status: OwnerBusinessHealthStatus) => {
  if (status === 'stable') return 'success';
  if (status === 'needs_review') return 'error';
  if (status === 'watch' || status === 'stale') return 'warning';
  return 'default';
};

export function BusinessHealthLocationSummary({ enabled, scopeKey, storeScopeKey }: {
  enabled: boolean;
  scopeKey?: string | number | null;
  storeScopeKey?: string | number | null;
}) {
  const formatter = useFormatter();
  const locale = useLocale();
  const t = useTranslations('Dashboard.owner');
  const { stores, isLoading } = useOwnerBusinessLocationsSummary(enabled, scopeKey, storeScopeKey);

  if (!enabled) return null;

  return (
    <Card title={t('businessHealth.locations.title')} loading={isLoading} className={styles.dashboardCard}>
      {stores.length > 1 ? (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {stores.slice(0, 8).map((store) => {
            const presentation = getOwnerBusinessLocationPresentation(store, locale, formatter, t);
            return <div className={styles.locationSummaryRow} key={store.sId}>
              <div>
                <Text strong>{presentation.name}</Text>
                {presentation.reason ? <Text type="secondary" className={styles.locationSummaryReason}>{presentation.reason}</Text> : null}
                {presentation.checkedLabel ? (
                  <Text type="secondary" className={styles.locationSummaryReason}>{presentation.checkedLabel}</Text>
                ) : null}
              </div>
              <Space size={6}>
                {store.actionCount > 0 ? <Tag color="warning">{t('businessHealth.locations.checkCount', { count: store.actionCount })}</Tag> : null}
                <Tag color={statusColor(store.status)}>{presentation.statusLabel}</Tag>
              </Space>
            </div>;
          })}
        </Space>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('businessHealth.locations.empty')} />
      )}
    </Card>
  );
}
