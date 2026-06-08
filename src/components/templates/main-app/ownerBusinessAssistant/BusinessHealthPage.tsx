'use client';

import { Alert, Card, Space } from 'antd';
import { FEATURE_FLAGS } from '@config/features';
import { useOwnerBusinessContextPacket } from '@hook/ownerBusinessAssistant/useOwnerBusinessContextPacket';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useContext } from 'react';
import { BusinessHealthAnalyticsStrip } from './BusinessHealthAnalyticsStrip';
import { BusinessHealthHeader } from './BusinessHealthHeader';
import { BusinessHealthLocationSummary } from './BusinessHealthLocationSummary';
import { BusinessHealthPriorityChecks } from './BusinessHealthPriorityChecks';
import { BusinessHealthSummaryCard } from './BusinessHealthSummaryCard';
import { OwnerAssistantPanel } from './OwnerAssistantPanel';
import styles from './OwnerBusinessAssistant.module.scss';

export function BusinessHealthPage({ projectId }: { projectId?: string }) {
  const { storeDetails, tenantDetails } = useContext(PlatformGlobalDataContext);
  const { current, isLoading, error, refresh } = useOwnerBusinessContextPacket(projectId, storeDetails?.storeId);
  const hasMultipleStores = Array.isArray(tenantDetails?.storesList)
    && tenantDetails.storesList.filter((store: any) => store?.active !== false && store?.storeDetails?.active !== false).length > 1;

  return (
    <div className={styles.pageShell}>
      <Space direction="vertical" size="large" className={styles.businessHealthStack}>
        <BusinessHealthHeader current={current} onRefresh={refresh} />
        {error ? (
          <Alert
            type="warning"
            showIcon
            message="Business Health could not load"
            description="Please try refreshing this page."
          />
        ) : null}
        {isLoading && !current ? (
          <Card loading className={styles.dashboardCard} />
        ) : (
          <div className={styles.summaryGrid}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <BusinessHealthSummaryCard current={current} />
              <BusinessHealthLocationSummary
                enabled={hasMultipleStores}
                scopeKey={tenantDetails?.tenantId || storeDetails?.tenantId || storeDetails?.storeId}
              />
              <BusinessHealthAnalyticsStrip projectId={projectId} storeScopeKey={storeDetails?.storeId} />
              <BusinessHealthPriorityChecks
                checks={current?.suggestedChecks}
                localDate={current?.localDate}
                projectId={projectId}
              />
            </Space>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <OwnerAssistantPanel
                current={current}
                projectId={projectId}
                questions={FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_SUGGESTED_QUESTIONS ? current?.suggestedQuestions : undefined}
                storeScopeKey={storeDetails?.storeId}
              />
            </Space>
          </div>
        )}
      </Space>
    </div>
  );
}
