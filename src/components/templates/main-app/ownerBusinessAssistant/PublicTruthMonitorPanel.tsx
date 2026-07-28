'use client';

import { Alert, Button, Card, Flex, Space, Tag, Typography } from 'antd';
import { FEATURE_FLAGS } from '@config/features';
import { getPublicTruthMonitorExportText } from '@database/publicTruthMonitor';
import { usePublicTruthMonitor } from '@hook/publicTruthTools/usePublicTruthMonitor';
import type { PublicTruthMonitorHistoryEntry } from '@type/publicTruthMonitor';
import { useMemo, useState } from 'react';
import { LuDownload, LuFileText, LuHistory, LuRefreshCw } from 'react-icons/lu';
import styles from './OwnerBusinessAssistant.module.scss';

const { Paragraph, Text, Title } = Typography;

function formatDate(value?: string): string {
  if (!value) return 'Not run yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusTag(entry?: PublicTruthMonitorHistoryEntry | null) {
  if (!entry) return { color: 'default', label: 'Not run' };
  if (entry.status === 'ready') return { color: 'success', label: 'Ready' };
  if (entry.status === 'missing_basics') return { color: 'error', label: 'Missing basics' };
  return { color: 'warning', label: 'Needs checking' };
}

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
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const latest = summary?.latest || null;
  const tag = statusTag(latest);
  const history = useMemo(() => (summary?.history || []).slice(0, 6), [summary?.history]);

  if (!isEnabled) return null;
  if (isLoading && !summary) return <Card loading className={styles.dashboardCard} />;
  if (!entitlement.allowed && !summary) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      await refresh();
    } catch {
      setRefreshError('Public truth history could not refresh.');
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
                <Title level={4} style={{ margin: 0 }}>Public truth history</Title>
                <Tag color={tag.color}>{tag.label}</Tag>
              </Flex>
              <Paragraph style={{ margin: '6px 0 0' }}>
                {latest
                  ? `Last saved ${formatDate(latest.generatedAt)}.`
                  : 'No saved report yet.'}
              </Paragraph>
              <Text type="secondary">
                Uses MenuList store and menu facts only. No external sites are scanned.
              </Text>
            </div>
          </Flex>
          <Space wrap>
            <Button
              disabled={!latest}
              icon={<LuDownload />}
              onClick={handleDownload}
            >
              Download report
            </Button>
            <Button
              icon={<LuRefreshCw />}
              loading={isRefreshing}
              onClick={handleRefresh}
              type="primary"
            >
              Run check
            </Button>
          </Space>
        </Flex>

        {error || refreshError ? (
          <Alert
            description="The last saved report is still shown when available."
            message={refreshError || 'Public truth history could not load'}
            showIcon
            type="warning"
          />
        ) : null}

        {latest ? (
          <div className={styles.publicTruthScoreRow}>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Ready modules</span>
              <span className={styles.metricValue}>{latest.readyModuleCount}/{latest.totalModuleCount}</span>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Missing facts</span>
              <span className={styles.metricValue}>{latest.missingFactCount}</span>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Saved reports</span>
              <span className={styles.metricValue}>{history.length}/{summary?.historyLimit || 0}</span>
            </div>
          </div>
        ) : (
          <Alert
            description="Run the check to save the first report for this location."
            message="No saved report"
            showIcon
            type="info"
          />
        )}

        {latest?.primaryFix ? (
          <div className={styles.publicTruthSetupJobList}>
            <Flex align="center" gap={8}>
              <LuFileText size={16} />
              <Text strong>Current fix item</Text>
            </Flex>
            <div className={styles.publicTruthSetupJobItem}>
              <Text strong>{latest.primaryFix.title}</Text>
              <Text className={styles.publicTruthCheckEvidence} type="secondary">
                {latest.primaryFix.evidenceText}
              </Text>
              <Button
                className={styles.publicTruthModuleAction}
                href={latest.primaryFix.fixHref}
                size="small"
                type="link"
              >
                {latest.primaryFix.actionLabel}
              </Button>
            </div>
          </div>
        ) : null}

        {history.length > 1 ? (
          <div className={styles.publicTruthCheckList}>
            {history.map((entry) => {
              const entryTag = statusTag(entry);
              return (
                <div className={styles.publicTruthCheckItem} key={entry.id}>
                  <Flex align="flex-start" gap={8} justify="space-between">
                    <div className={styles.publicTruthCheckItemBody}>
                      <Text strong>{formatDate(entry.generatedAt)}</Text>
                      <Text className={styles.publicTruthCheckEvidence} type="secondary">
                        {entry.readyModuleCount}/{entry.totalModuleCount} modules ready
                      </Text>
                    </div>
                    <Tag color={entryTag.color} style={{ marginInlineEnd: 0 }}>{entryTag.label}</Tag>
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
