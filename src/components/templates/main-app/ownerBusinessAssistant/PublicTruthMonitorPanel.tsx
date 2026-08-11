'use client';

import { Alert, Button, Card, Flex, Space, Tag, Typography } from 'antd';
import { FEATURE_FLAGS } from '@config/features';
import { getPublicTruthMonitorExportText } from '@database/publicTruthMonitor';
import { usePublicTruthMonitor } from '@hook/publicTruthTools/usePublicTruthMonitor';
import { formatDateTime } from '@util/dateTime';
import { formatNumber } from '@util/formatters';
import {
  getOwnerPublicTruthModulePresentation,
  getOwnerPublicTruthStatusPresentation,
} from '@lib/public-truth-tools/ownerPublicTruthPresentation';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { LuDownload, LuFileText, LuHistory, LuRefreshCw } from 'react-icons/lu';
import styles from './OwnerBusinessAssistant.module.scss';

const { Paragraph, Text, Title } = Typography;

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function PublicTruthMonitorPanel({
  selectedProjectId,
  storeId,
  tenantId,
}: {
  selectedProjectId?: string | null;
  storeId?: string | number | null;
  tenantId?: string | number | null;
}) {
  const formatter = useFormatter();
  const t = useTranslations('Dashboard.owner');
  const isEnabled = FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
    && FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_OWNER_CHECK
    && FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_MONITOR_ADDON;
  const { entitlement, error, isLoading, refresh, summary } = usePublicTruthMonitor({
    enabled: isEnabled,
    selectedProjectId,
    storeId,
    tenantId,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const latest = summary?.latest || null;
  const tag = latest
    ? getOwnerPublicTruthStatusPresentation(latest.status, t)
    : { label: t('businessHealth.publicTruth.notRun'), tone: 'default' as const };
  const history = useMemo(() => (summary?.history || []).slice(0, 6), [summary?.history]);

  if (!isEnabled) return null;
  if (isLoading && !summary) return <Card loading className={styles.dashboardCard} />;
  if (!entitlement.allowed && !summary) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshError(false);
    try {
      await refresh();
    } catch {
      setRefreshError(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDownload = () => {
    const dateKey = new Date().toISOString().slice(0, 10);
    downloadTextFile(`menulist-public-truth-report-${dateKey}.txt`, getPublicTruthMonitorExportText(summary));
  };

  return (
    <Card className={`${styles.dashboardCard} ${styles.publicTruthCheckCard}`}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Flex align="flex-start" gap={12} justify="space-between" wrap="wrap">
          <Flex align="flex-start" gap={12} style={{ minWidth: 0 }}>
            <span className={styles.statusIcon}>
              <LuHistory size={22} />
            </span>
            <div>
              <Flex align="center" gap={8} wrap="wrap">
                <Title level={4} style={{ margin: 0 }}>{t('businessHealth.publicTruth.historyTitle')}</Title>
                <Tag color={tag.tone}>{tag.label}</Tag>
              </Flex>
              <Paragraph style={{ margin: '6px 0 0' }}>
                {latest
                  ? t('businessHealth.publicTruth.lastSaved', { date: formatDateTime(latest.generatedAt, 'date', formatter) })
                  : t('businessHealth.publicTruth.noSavedReport')}
              </Paragraph>
              <Text type="secondary">
                {t('businessHealth.publicTruth.historyBoundary')}
              </Text>
            </div>
          </Flex>
          <Space wrap>
            <Button
              disabled={!latest}
              icon={<LuDownload />}
              onClick={handleDownload}
            >
              {t('businessHealth.publicTruth.downloadEnglishReport')}
            </Button>
            <Button
              icon={<LuRefreshCw />}
              loading={isRefreshing}
              onClick={handleRefresh}
              type="primary"
            >
              {t('businessHealth.publicTruth.runCheck')}
            </Button>
          </Space>
        </Flex>

        {error || refreshError ? (
          <Alert
            description={t('businessHealth.publicTruth.historyErrorDescription')}
            message={refreshError
              ? t('businessHealth.publicTruth.historyRefreshError')
              : t('businessHealth.publicTruth.historyLoadError')}
            showIcon
            type="warning"
          />
        ) : null}

        {latest ? (
          <div className={styles.publicTruthScoreRow}>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>{t('businessHealth.publicTruth.metrics.readyModules')}</span>
              <span className={styles.metricValue}>{formatNumber(latest.readyModuleCount)}/{formatNumber(latest.totalModuleCount)}</span>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>{t('businessHealth.publicTruth.metrics.missingFacts')}</span>
              <span className={styles.metricValue}>{formatNumber(latest.missingFactCount)}</span>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>{t('businessHealth.publicTruth.metrics.savedReports')}</span>
              <span className={styles.metricValue}>{formatNumber(history.length)}/{formatNumber(summary?.historyLimit || 0)}</span>
            </div>
          </div>
        ) : (
          <Alert
            description={t('businessHealth.publicTruth.noSavedReportDescription')}
            message={t('businessHealth.publicTruth.noSavedReport')}
            showIcon
            type="info"
          />
        )}

        {latest?.primaryFix ? (() => {
          const snapshot = latest.moduleSummaries.find((module) => module.id === latest.primaryFix?.id);
          const presentation = getOwnerPublicTruthModulePresentation(snapshot || {
            id: latest.primaryFix.id,
            mobileFixTarget: 'basic_settings',
            status: 'not_checked',
          }, t);
          return (
          <div className={styles.publicTruthSetupJobList}>
            <Flex align="center" gap={8}>
              <LuFileText size={16} />
              <Text strong>{t('businessHealth.publicTruth.currentFix')}</Text>
            </Flex>
            <div className={styles.publicTruthSetupJobItem}>
              <Text strong>{presentation.title}</Text>
              <Text className={styles.publicTruthCheckEvidence} type="secondary">
                {presentation.evidence}
              </Text>
              <Button
                className={styles.publicTruthModuleAction}
                href={latest.primaryFix.fixHref}
                size="small"
                type="link"
              >
                {presentation.actionLabel}
              </Button>
            </div>
          </div>
          );
        })() : null}

        {history.length > 1 ? (
          <div className={styles.publicTruthCheckList}>
            {history.map((entry) => {
              const entryTag = getOwnerPublicTruthStatusPresentation(entry.status, t);
              return (
                <div className={styles.publicTruthCheckItem} key={entry.id}>
                  <Flex align="flex-start" gap={8} justify="space-between">
                    <div className={styles.publicTruthCheckItemBody}>
                      <Text strong>{formatDateTime(entry.generatedAt, 'date', formatter)}</Text>
                      <Text className={styles.publicTruthCheckEvidence} type="secondary">
                        {t('businessHealth.publicTruth.modulesReady', {
                          count: entry.readyModuleCount,
                          total: entry.totalModuleCount,
                        })}
                      </Text>
                    </div>
                    <Tag color={entryTag.tone} style={{ marginInlineEnd: 0 }}>{entryTag.label}</Tag>
                  </Flex>
                </div>
              );
            })}
          </div>
        ) : null}
      </Space>
    </Card>
  );
}
