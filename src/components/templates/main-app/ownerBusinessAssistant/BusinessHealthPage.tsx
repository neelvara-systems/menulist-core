'use client';

import { Alert, Card, Space } from 'antd';
import { FEATURE_FLAGS } from '@config/features';
import { useOwnerBusinessContextPacket } from '@hook/ownerBusinessAssistant/useOwnerBusinessContextPacket';
import { useOwnerPublicTruthReadiness } from '@hook/publicTruthTools/useOwnerPublicTruthReadiness';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useContext, useEffect, useState } from 'react';
import { BusinessHealthAnalyticsStrip } from './BusinessHealthAnalyticsStrip';
import { BusinessHealthHeader } from './BusinessHealthHeader';
import { BusinessHealthLocationSummary } from './BusinessHealthLocationSummary';
import { BusinessHealthPriorityChecks } from './BusinessHealthPriorityChecks';
import { BusinessHealthProjectScopeSelector } from './BusinessHealthProjectScopeSelector';
import { BusinessHealthSummaryCard } from './BusinessHealthSummaryCard';
import { OwnerAssistantPanel } from './OwnerAssistantPanel';
import { PublicTruthOwnerCheckCard } from './PublicTruthOwnerCheckCard';
import styles from './OwnerBusinessAssistant.module.scss';

export function BusinessHealthPage({ projectId }: { projectId?: string }) {
  const { storeDetails, tenantDetails } = useContext(PlatformGlobalDataContext);
  const pathname = usePathname();
  const router = useRouter();
  const [scopedProjectId, setScopedProjectId] = useState<string | undefined>(projectId);
  const { current, isLoading, error, refresh } = useOwnerBusinessContextPacket(undefined, storeDetails?.storeId);
  const {
    error: publicTruthError,
    isLoading: isPublicTruthLoading,
    refresh: refreshPublicTruth,
    report: publicTruthReport,
  } = useOwnerPublicTruthReadiness({
    selectedProjectId: scopedProjectId,
    storeDetails,
  });
  const isHealthReady = Boolean(current && current.status !== 'not_ready' && current.sourceRefs?.length);
  const hasMultipleStores = Array.isArray(tenantDetails?.storesList)
    && tenantDetails.storesList.filter((store: any) => store?.active !== false && store?.storeDetails?.active !== false).length > 1;
  const handleScopeChange = useCallback((nextProjectId?: string) => {
    setScopedProjectId(nextProjectId);
    const nextPath = nextProjectId
      ? `${pathname}?projectId=${encodeURIComponent(nextProjectId)}`
      : pathname;
    router.replace(nextPath, { scroll: false });
  }, [pathname, router]);

  useEffect(() => {
    setScopedProjectId(projectId);
  }, [projectId, storeDetails?.storeId]);

  return (
    <div className={styles.pageShell}>
      <Space direction="vertical" size="large" className={styles.businessHealthStack}>
        <BusinessHealthHeader current={current} onRefresh={refresh} />
        <BusinessHealthProjectScopeSelector
          onChange={handleScopeChange}
          selectedProjectId={scopedProjectId}
        />
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
          <div className={`${styles.summaryGrid} ${isHealthReady ? '' : styles.summaryGridSingle}`}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <BusinessHealthSummaryCard current={current} />
              <PublicTruthOwnerCheckCard
                error={publicTruthError}
                isLoading={isPublicTruthLoading}
                onRefresh={() => void refreshPublicTruth()}
                report={publicTruthReport}
              />
              <BusinessHealthLocationSummary
                enabled={hasMultipleStores}
                scopeKey={tenantDetails?.tenantId || storeDetails?.tenantId || storeDetails?.storeId}
                storeScopeKey={storeDetails?.storeId}
              />
              <BusinessHealthAnalyticsStrip
                enabled={isHealthReady}
                projectId={scopedProjectId}
                storeScopeKey={storeDetails?.storeId}
              />
              {isHealthReady ? (
                <BusinessHealthPriorityChecks
                  checks={current?.suggestedChecks}
                  localDate={current?.localDate}
                  projectId={scopedProjectId}
                  storeScopeKey={storeDetails?.storeId}
                />
              ) : null}
            </Space>
            {isHealthReady ? (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <OwnerAssistantPanel
                  key={`${storeDetails?.storeId || 'store'}:${scopedProjectId || 'all'}`}
                  current={current}
                  projectId={scopedProjectId}
                  questions={FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_SUGGESTED_QUESTIONS ? current?.suggestedQuestions : undefined}
                  storeScopeKey={storeDetails?.storeId}
                />
              </Space>
            ) : null}
          </div>
        )}
      </Space>
    </div>
  );
}
