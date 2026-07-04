import { Alert, Button, Card, Flex, Space, Tag, Typography } from 'antd';
import { LuAlertCircle, LuArrowRight, LuCheckCircle2, LuExternalLink, LuInfo, LuListChecks, LuRefreshCw, LuSearch } from 'react-icons/lu';
import type { OwnerPublicTruthReadinessReport } from '@lib/public-truth-tools/ownerPublicTruthReadiness';
import type { PublicTruthCheckFactId, PublicTruthCheckResult } from '@lib/public-truth-tools/publicTruthCheckTypes';
import styles from './OwnerBusinessAssistant.module.scss';

const { Paragraph, Text, Title } = Typography;

const CHECK_COPY: Record<PublicTruthCheckFactId, { fixHref: string; label: string }> = {
  business_identity: { fixHref: '/business-settings?section=business-profile&focus=identity', label: 'Business name' },
  menu_or_service_source: { fixHref: '/projects?view=editor&focus=menu-readiness&qualityAction=editor', label: 'Menu or service list' },
  prices: { fixHref: '/projects?view=editor&focus=menu-readiness&qualityAction=prices', label: 'Prices' },
  hours: { fixHref: '/business-settings?section=hours&focus=working-hours', label: 'Hours' },
  location: { fixHref: '/business-settings?section=business-profile&focus=location', label: 'Location' },
  contact: { fixHref: '/business-settings?section=business-profile&focus=contact', label: 'Contact' },
  customer_actions: { fixHref: '/business-settings?section=business-profile&focus=official-page-actions', label: 'Customer actions' },
  public_link: { fixHref: '/business-settings?section=search-discovery&focus=customer-link', label: 'Customer link' },
  photos: { fixHref: '/business-settings?section=business-profile&focus=official-page-photos', label: 'Photos' },
  machine_readable_source: { fixHref: '/business-settings?section=search-discovery&focus=customer-link', label: 'Search-readable source' },
};

const RESULT_COPY: Record<PublicTruthCheckResult, { color: string; label: string }> = {
  present: { color: 'success', label: 'Ready' },
  missing: { color: 'error', label: 'Missing' },
  unclear: { color: 'warning', label: 'Check' },
  not_applicable: { color: 'default', label: 'Not needed' },
  not_checked: { color: 'default', label: 'Not checked' },
};

const MODULE_STATUS_COPY: Record<OwnerPublicTruthReadinessReport['modules'][number]['status'], { color: string; label: string }> = {
  ready: { color: 'success', label: 'Ready' },
  needs_attention: { color: 'error', label: 'Missing' },
  check: { color: 'warning', label: 'Check' },
  not_checked: { color: 'default', label: 'Not checked' },
};

function getStatusConfig(status: OwnerPublicTruthReadinessReport['status']) {
  if (status === 'ready') {
    return {
      color: 'success',
      icon: <LuCheckCircle2 size={22} />,
      label: 'Ready',
      message: 'Your public source has the basics customers need.',
    };
  }
  if (status === 'missing_basics') {
    return {
      color: 'error',
      icon: <LuAlertCircle size={22} />,
      label: 'Missing basics',
      message: 'Some public facts need attention before this is a strong customer source.',
    };
  }
  return {
    color: 'warning',
    icon: <LuInfo size={22} />,
    label: 'Needs checking',
    message: 'Most basics are present, but one or more public facts still need checking.',
  };
}

function getPrimaryAction(report: OwnerPublicTruthReadinessReport) {
  if (report.status === 'ready') {
    return {
      href: report.publicLinks.officialPageUrl || report.publicLinks.menuUrl || '/use-menulist',
      label: report.publicLinks.officialPageUrl || report.publicLinks.menuUrl ? 'Open customer source' : 'Open sharing tools',
      external: Boolean(report.publicLinks.officialPageUrl || report.publicLinks.menuUrl),
    };
  }

  const moduleAction = report.modules.find((module) => module.status !== 'ready');
  if (moduleAction) {
    return {
      href: moduleAction.fixHref,
      label: moduleAction.actionLabel,
      external: false,
    };
  }

  const actionable = report.checks.find((check) =>
    check.result === 'missing' || check.result === 'unclear' || check.result === 'not_checked'
  );
  const copy = actionable ? CHECK_COPY[actionable.id] : CHECK_COPY.business_identity;
  return {
    href: copy.fixHref,
    label: `Fix ${copy.label.toLowerCase()}`,
    external: false,
  };
}

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
  if (isLoading && !report) {
    return <Card loading className={styles.dashboardCard} />;
  }

  if (!report) {
    return null;
  }

  const status = getStatusConfig(report.status);
  const primaryAction = getPrimaryAction(report);
  const attentionChecks = report.checks.filter((check) => check.result !== 'present' && check.result !== 'not_applicable');
  const readyModuleCount = report.modules.filter((module) => module.status === 'ready').length;
  const setupJobs = report.setupJobList;

  return (
    <Card className={`${styles.dashboardCard} ${styles.publicTruthCheckCard}`}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Flex align="flex-start" gap={12} justify="space-between" wrap="wrap">
          <Flex align="flex-start" gap={12} style={{ minWidth: 0 }}>
            <span className={`${styles.statusIcon} ${report.status === 'ready' ? '' : report.status === 'missing_basics' ? styles.statusIconReview : styles.statusIconWatch}`}>
              {report.status === 'ready' ? <LuSearch size={22} /> : status.icon}
            </span>
            <div>
              <Flex align="center" gap={8} wrap="wrap">
                <Title level={4} style={{ margin: 0 }}>Public readiness</Title>
                <Tag color={status.color}>{status.label}</Tag>
              </Flex>
              <Paragraph style={{ margin: '6px 0 0' }}>{status.message}</Paragraph>
              <Text type="secondary">
                Checked from MenuList store and menu data. No external sites were scanned.
              </Text>
            </div>
          </Flex>
          <Space>
            {onRefresh ? (
              <Button icon={<LuRefreshCw />} onClick={onRefresh}>
                Refresh
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
            message="Public Truth Check could not refresh"
            description="The last available MenuList facts are still shown below."
          />
        ) : null}

        <div className={styles.publicTruthScoreRow}>
          <div className={styles.metricBox}>
            <span className={styles.metricLabel}>Ready modules</span>
            <span className={styles.metricValue}>{readyModuleCount}/{report.modules.length}</span>
          </div>
          <div className={styles.metricBox}>
            <span className={styles.metricLabel}>Missing facts</span>
            <span className={styles.metricValue}>{report.summary.missing}</span>
          </div>
          <div className={styles.metricBox}>
            <span className={styles.metricLabel}>Checked menu</span>
            <span className={styles.metricValue}>
              {report.sourceSummary.checkedProjectName || 'None'}
            </span>
          </div>
        </div>

        {setupJobs.length ? (
          <div className={styles.publicTruthSetupJobList}>
            <Flex align="center" gap={8}>
              <LuListChecks size={16} />
              <Text strong>Fix list</Text>
              <Tag>{setupJobs.length}</Tag>
            </Flex>
            <div className={styles.publicTruthSetupJobGrid}>
              {setupJobs.map((job) => {
                const statusCopy = MODULE_STATUS_COPY[job.status];
                return (
                  <div className={styles.publicTruthSetupJobItem} key={job.id}>
                    <Flex align="flex-start" gap={8} justify="space-between">
                      <div className={styles.publicTruthCheckItemBody}>
                        <Text strong>{job.title}</Text>
                        <Text className={styles.publicTruthCheckEvidence} type="secondary">
                          {job.reason}
                        </Text>
                      </div>
                      <Tag color={statusCopy.color} style={{ marginInlineEnd: 0 }}>{statusCopy.label}</Tag>
                    </Flex>
                    <Text className={styles.publicTruthCheckEvidence} type="secondary">
                      {job.evidenceText}
                    </Text>
                    <Button
                      className={styles.publicTruthModuleAction}
                      href={job.fixHref}
                      icon={<LuArrowRight />}
                      iconPosition="end"
                      size="small"
                      type="link"
                    >
                      {job.actionLabel}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className={styles.publicTruthModuleList}>
          {report.modules.map((module) => {
            const statusCopy = MODULE_STATUS_COPY[module.status];
            return (
              <div className={styles.publicTruthModuleItem} key={module.id}>
                <Flex align="flex-start" className={styles.publicTruthModuleItemHeader} gap={10} justify="space-between">
                  <div className={styles.publicTruthCheckItemBody}>
                    <Text strong>{module.title}</Text>
                    <Text className={styles.publicTruthCheckEvidence} type="secondary">
                      {module.description}
                    </Text>
                  </div>
                  <Tag color={statusCopy.color} style={{ marginInlineEnd: 0 }}>{statusCopy.label}</Tag>
                </Flex>
                <Text className={styles.publicTruthCheckEvidence} type="secondary">
                  {module.evidenceText}
                </Text>
                <Button
                  className={styles.publicTruthModuleAction}
                  href={module.fixHref}
                  icon={<LuArrowRight />}
                  iconPosition="end"
                  size="small"
                  type="link"
                >
                  {module.actionLabel}
                </Button>
              </div>
            );
          })}
        </div>

        <div className={styles.publicTruthCheckList}>
          {report.checks.map((check) => {
            const copy = CHECK_COPY[check.id];
            const result = RESULT_COPY[check.result];
            return (
              <Flex align="flex-start" className={styles.publicTruthCheckItem} gap={10} justify="space-between" key={check.id}>
                <div className={styles.publicTruthCheckItemBody}>
                  <Text>{copy.label}</Text>
                  <Text className={styles.publicTruthCheckEvidence} type="secondary">
                    {check.evidenceText}
                  </Text>
                </div>
                <Tag color={result.color} style={{ marginInlineEnd: 0 }}>{result.label}</Tag>
              </Flex>
            );
          })}
        </div>

        {attentionChecks.length ? (
          <Alert
            showIcon
            type={report.status === 'missing_basics' ? 'warning' : 'info'}
            message={`${attentionChecks.length} ${attentionChecks.length === 1 ? 'item needs' : 'items need'} checking`}
            description={attentionChecks.slice(0, 3).map((check) => CHECK_COPY[check.id].label).join(', ')}
          />
        ) : (
          <Tag color="success"><LuCheckCircle2 size={14} /> No action needed</Tag>
        )}
      </Space>
    </Card>
  );
}
