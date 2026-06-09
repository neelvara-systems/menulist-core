import { Card, Empty, Space, Tag, Typography } from 'antd';
import { useOwnerBusinessLocationsSummary } from '@hook/ownerBusinessAssistant/useOwnerBusinessLocationsSummary';
import { OWNER_BUSINESS_HEALTH_STATUS_LABELS } from '@lib/ownerBusinessAssistant/constants';
import { formatOwnerBusinessHealthDateKey } from '@lib/ownerBusinessAssistant/freshness';
import type { OwnerBusinessHealthStatus } from '@lib/ownerBusinessAssistant/types';
import styles from './OwnerBusinessAssistant.module.scss';

const { Text } = Typography;

const statusColor = (status: OwnerBusinessHealthStatus) => {
  if (status === 'stable') return 'success';
  if (status === 'needs_review') return 'error';
  if (status === 'watch' || status === 'stale') return 'warning';
  return 'default';
};

const getLocationFreshnessLabel = (localDate?: string) => {
  const formatted = formatOwnerBusinessHealthDateKey(localDate);
  return formatted ? `Checked ${formatted}` : null;
};

export function BusinessHealthLocationSummary({ enabled, scopeKey, storeScopeKey }: {
  enabled: boolean;
  scopeKey?: string | number | null;
  storeScopeKey?: string | number | null;
}) {
  const { stores, isLoading } = useOwnerBusinessLocationsSummary(enabled, scopeKey, storeScopeKey);

  if (!enabled) return null;

  return (
    <Card title="Locations" loading={isLoading} className={styles.dashboardCard}>
      {stores.length > 1 ? (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {stores.slice(0, 8).map((store) => (
            <div className={styles.locationSummaryRow} key={store.sId}>
              <div>
                <Text strong>{store.storeName || `Store ${store.sId}`}</Text>
                {store.topReason ? <Text type="secondary" className={styles.locationSummaryReason}>{store.topReason}</Text> : null}
                {getLocationFreshnessLabel(store.localDate) ? (
                  <Text type="secondary" className={styles.locationSummaryReason}>{getLocationFreshnessLabel(store.localDate)}</Text>
                ) : null}
              </div>
              <Space size={6}>
                {store.actionCount > 0 ? <Tag color="warning">{store.actionCount} checks</Tag> : null}
                <Tag color={statusColor(store.status)}>{OWNER_BUSINESS_HEALTH_STATUS_LABELS[store.status] || store.status}</Tag>
              </Space>
            </div>
          ))}
        </Space>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No location summary yet" />
      )}
    </Card>
  );
}
