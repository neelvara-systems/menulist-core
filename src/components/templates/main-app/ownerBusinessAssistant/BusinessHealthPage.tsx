'use client';

import { Alert, Card, Space } from 'antd';
import { FEATURE_FLAGS } from '@config/features';
import { useOwnerBusinessContextPacket } from '@hook/ownerBusinessAssistant/useOwnerBusinessContextPacket';
import { BusinessHealthAnalyticsStrip } from './BusinessHealthAnalyticsStrip';
import { BusinessHealthHeader } from './BusinessHealthHeader';
import { BusinessHealthPriorityChecks } from './BusinessHealthPriorityChecks';
import { BusinessHealthSummaryCard } from './BusinessHealthSummaryCard';
import { OwnerAssistantPanel } from './OwnerAssistantPanel';
import styles from './OwnerBusinessAssistant.module.scss';

export function BusinessHealthPage({ projectId }: { projectId?: string }) {
  const { current, isLoading, error, refresh } = useOwnerBusinessContextPacket(projectId);

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
              <BusinessHealthAnalyticsStrip projectId={projectId} />
              <BusinessHealthPriorityChecks checks={current?.suggestedChecks} projectId={projectId} />
            </Space>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <OwnerAssistantPanel
                projectId={projectId}
                questions={FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_SUGGESTED_QUESTIONS ? current?.suggestedQuestions : undefined}
              />
            </Space>
          </div>
        )}
      </Space>
    </div>
  );
}
