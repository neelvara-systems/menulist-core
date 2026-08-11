import { Alert, Button, Card, Flex, Space, Tag, Typography } from 'antd';
import { LuAlertCircle, LuArrowRight, LuCheckCircle2, LuExternalLink, LuInfo, LuListChecks, LuRefreshCw, LuSearch } from 'react-icons/lu';
import type { OwnerPublicTruthReadinessReport } from '@lib/public-truth-tools/ownerPublicTruthReadiness';
import {
  getOwnerPublicTruthFactPresentation,
  getOwnerPublicTruthModulePresentation,
  getOwnerPublicTruthPrimaryAction,
  getOwnerPublicTruthSetupJobPresentation,
  getOwnerPublicTruthStatusPresentation,
} from '@lib/public-truth-tools/ownerPublicTruthPresentation';
import { formatNumber } from '@util/formatters';
import { useTranslations } from 'next-intl';
import styles from './OwnerBusinessAssistant.module.scss';

const { Paragraph, Text, Title } = Typography;

const RESULT_COLORS: Record<OwnerPublicTruthReadinessReport['checks'][number]['result'], string> = {
  present: 'success',
  missing: 'error',
  unclear: 'warning',
  not_applicable: 'default',
  not_checked: 'default',
};

const MODULE_STATUS_COLORS: Record<OwnerPublicTruthReadinessReport['modules'][number]['status'], string> = {
  ready: 'success',
  needs_attention: 'error',
  check: 'warning',
  not_checked: 'default',
};

export function PublicTruthOwnerCheckCard({
  error,
  isLoading,
  onRefresh,
  report,
}: {
  error?: unknown;
  isLoading?: boolean;
  onRefresh?: () => void;
  report: OwnerPublicTruthReadinessReport | null;
}) {
  const t = useTranslations('Dashboard.owner');
  if (isLoading && !report) {
    return <Card loading className={styles.dashboardCard} />;
  }

  if (!report) {
    return null;
  }

  const status = getOwnerPublicTruthStatusPresentation(report.status, t);
  const primaryAction = getOwnerPublicTruthPrimaryAction(report, t);
  const attentionChecks = report.checks.filter((check) => check.result !== 'present' && check.result !== 'not_applicable');
  const readyModuleCount = report.modules.filter((module) => module.status === 'ready').length;
  const setupJobs = report.setupJobList;

  return (
    <Card className={`${styles.dashboardCard} ${styles.publicTruthCheckCard}`}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Flex align="flex-start" gap={12} justify="space-between" wrap="wrap">
          <Flex align="flex-start" gap={12} style={{ minWidth: 0 }}>
            <span className={`${styles.statusIcon} ${report.status === 'ready' ? '' : report.status === 'missing_basics' ? styles.statusIconReview : styles.statusIconWatch}`}>
              {report.status === 'ready'
                ? <LuSearch size={22} />
                : report.status === 'missing_basics'
                  ? <LuAlertCircle size={22} />
                  : <LuInfo size={22} />}
            </span>
            <div>
              <Flex align="center" gap={8} wrap="wrap">
                <Title level={4} style={{ margin: 0 }}>{t('businessHealth.publicTruth.title')}</Title>
                <Tag color={status.tone}>{status.label}</Tag>
              </Flex>
              <Paragraph style={{ margin: '6px 0 0' }}>{status.message}</Paragraph>
              <Text type="secondary">
                {t('businessHealth.publicTruth.boundary')}
              </Text>
            </div>
          </Flex>
          <Space>
            {onRefresh ? (
              <Button icon={<LuRefreshCw />} onClick={onRefresh}>
                {t('businessHealth.page.refresh')}
              </Button>
            ) : null}
            <Button
              href={primaryAction.href}
              icon={primaryAction.external ? <LuExternalLink /> : undefined}
              target={primaryAction.external ? '_blank' : undefined}
              type="primary"
            >
              {primaryAction.label}
            </Button>
          </Space>
        </Flex>

        {error ? (
          <Alert
            showIcon
            type="warning"
            message={t('businessHealth.publicTruth.refreshErrorTitle')}
            description={t('businessHealth.publicTruth.refreshErrorDescription')}
          />
        ) : null}

        <div className={styles.publicTruthScoreRow}>
          <div className={styles.metricBox}>
            <span className={styles.metricLabel}>{t('businessHealth.publicTruth.metrics.readyModules')}</span>
            <span className={styles.metricValue}>{formatNumber(readyModuleCount)}/{formatNumber(report.modules.length)}</span>
          </div>
          <div className={styles.metricBox}>
            <span className={styles.metricLabel}>{t('businessHealth.publicTruth.metrics.missingFacts')}</span>
            <span className={styles.metricValue}>{formatNumber(report.summary.missing)}</span>
          </div>
          <div className={styles.metricBox}>
            <span className={styles.metricLabel}>{t('businessHealth.publicTruth.metrics.checkedMenu')}</span>
            <span className={styles.metricValue}>
              {report.sourceSummary.checkedProjectName || t('businessHealth.publicTruth.none')}
            </span>
          </div>
        </div>

        {setupJobs.length ? (
          <div className={styles.publicTruthSetupJobList}>
            <Flex align="center" gap={8}>
              <LuListChecks size={16} />
              <Text strong>{t('businessHealth.publicTruth.nextFixes')}</Text>
              <Tag>{formatNumber(setupJobs.length)}</Tag>
            </Flex>
            <div className={styles.publicTruthSetupJobGrid}>
              {setupJobs.map((job) => {
                const presentation = getOwnerPublicTruthSetupJobPresentation(job, t);
                return (
                  <div className={styles.publicTruthSetupJobItem} key={job.id}>
                    <Flex align="flex-start" gap={8} justify="space-between">
                      <div className={styles.publicTruthCheckItemBody}>
                        <Text strong>{presentation.title}</Text>
                        <Text className={styles.publicTruthCheckEvidence} type="secondary">
                          {presentation.reason}
                        </Text>
                      </div>
                      <Tag color={MODULE_STATUS_COLORS[job.status]} style={{ marginInlineEnd: 0 }}>{presentation.statusLabel}</Tag>
                    </Flex>
                    <Text className={styles.publicTruthCheckEvidence} type="secondary">
                      {presentation.evidence}
                    </Text>
                    <Button
                      className={styles.publicTruthModuleAction}
                      href={job.fixHref}
                      icon={<LuArrowRight />}
                      iconPosition="end"
                      size="small"
                      type="link"
                    >
                      {presentation.actionLabel}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className={styles.publicTruthModuleList}>
          {report.modules.map((module) => {
            const presentation = getOwnerPublicTruthModulePresentation(module, t);
            return (
              <div className={styles.publicTruthModuleItem} key={module.id}>
                <Flex align="flex-start" className={styles.publicTruthModuleItemHeader} gap={10} justify="space-between">
                  <div className={styles.publicTruthCheckItemBody}>
                    <Text strong>{presentation.title}</Text>
                    <Text className={styles.publicTruthCheckEvidence} type="secondary">
                      {presentation.description}
                    </Text>
                  </div>
                  <Tag color={MODULE_STATUS_COLORS[module.status]} style={{ marginInlineEnd: 0 }}>{presentation.statusLabel}</Tag>
                </Flex>
                <Text className={styles.publicTruthCheckEvidence} type="secondary">
                  {presentation.evidence}
                </Text>
                <Button
                  className={styles.publicTruthModuleAction}
                  href={module.fixHref}
                  icon={<LuArrowRight />}
                  iconPosition="end"
                  size="small"
                  type="link"
                >
                  {presentation.actionLabel}
                </Button>
              </div>
            );
          })}
        </div>

        <div className={styles.publicTruthCheckList}>
          {report.checks.map((check) => {
            const presentation = getOwnerPublicTruthFactPresentation(check, t);
            return (
              <Flex align="flex-start" className={styles.publicTruthCheckItem} gap={10} justify="space-between" key={check.id}>
                <div className={styles.publicTruthCheckItemBody}>
                  <Text>{presentation.label}</Text>
                  <Text className={styles.publicTruthCheckEvidence} type="secondary">
                    {presentation.evidence}
                  </Text>
                </div>
                <Tag color={RESULT_COLORS[check.result]} style={{ marginInlineEnd: 0 }}>{presentation.resultLabel}</Tag>
              </Flex>
            );
          })}
        </div>

        {attentionChecks.length ? (
          <Alert
            showIcon
            type={report.status === 'missing_basics' ? 'warning' : 'info'}
            message={t('businessHealth.publicTruth.attentionCount', { count: attentionChecks.length })}
            description={attentionChecks.slice(0, 3).map((check) => (
              getOwnerPublicTruthFactPresentation(check, t).label
            )).join(', ')}
          />
        ) : (
          <Tag color="success"><LuCheckCircle2 size={14} /> {t('businessHealth.noActionNeeded')}</Tag>
        )}
      </Space>
    </Card>
  );
}
