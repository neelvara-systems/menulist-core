'use client'

import type { OwnerPublicTruthReadinessMobileFixTarget, OwnerPublicTruthReadinessReport } from '@lib/public-truth-tools/ownerPublicTruthReadiness';
import {
    getOwnerPublicTruthFactPresentation,
    getOwnerPublicTruthModulePresentation,
    getOwnerPublicTruthSetupJobPresentation,
    getOwnerPublicTruthStatusPresentation,
} from '@lib/public-truth-tools/ownerPublicTruthPresentation';
import { formatNumber } from '@util/formatters';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { LuAlertCircle, LuArrowRight, LuCheckCircle2, LuInfo, LuListChecks, LuSearch } from 'react-icons/lu';
import { Button, Card, Flex, Tag, Text } from '../antd';

const RESULT_COLORS: Record<OwnerPublicTruthReadinessReport['checks'][number]['result'], 'success' | 'danger' | 'warning' | 'default'> = {
    present: 'success',
    missing: 'danger',
    unclear: 'warning',
    not_applicable: 'default',
    not_checked: 'default',
};

const MODULE_STATUS_COLORS: Record<OwnerPublicTruthReadinessReport['modules'][number]['status'], 'success' | 'danger' | 'warning' | 'default'> = {
    ready: 'success',
    needs_attention: 'danger',
    check: 'warning',
    not_checked: 'default',
};

export default function MobilePublicTruthOwnerCheckCard({
    isLoading,
    onFixTarget,
    report,
}: {
    isLoading?: boolean;
    onFixTarget?: (target: OwnerPublicTruthReadinessMobileFixTarget) => void;
    report: OwnerPublicTruthReadinessReport | null;
}) {
    const { token } = theme.useToken();
    const t = useTranslations('Dashboard.owner');

    if (!report && !isLoading) return null;

    const status = report ? getOwnerPublicTruthStatusPresentation(report.status, t) : null;
    const attentionChecks = report?.checks.filter((check) => check.result !== 'present' && check.result !== 'not_applicable') || [];
    const setupJobs = report?.setupJobList || [];

    return (
        <Card>
            <Flex gap={12} vertical>
                <Flex align="flex-start" gap={12}>
                    <Flex
                        align="center"
                        justify="center"
                        style={{
                            background: status?.tone === 'success' ? token.colorSuccessBg : token.colorWarningBg,
                            border: `1px solid ${status?.tone === 'success' ? token.colorSuccessBorder : token.colorWarningBorder}`,
                            borderRadius: 8,
                            color: status?.tone === 'success' ? token.colorSuccess : token.colorWarning,
                            flex: '0 0 40px',
                            height: 40,
                            width: 40,
                        }}
                    >
                        {report?.status === 'ready'
                            ? <LuCheckCircle2 size={20} />
                            : report?.status === 'missing_basics'
                                ? <LuAlertCircle size={20} />
                                : report
                                    ? <LuInfo size={20} />
                                    : <LuSearch size={20} />}
                    </Flex>
                    <Flex flex={1} gap={6} style={{ minWidth: 0 }} vertical>
                        <Flex align="center" gap={8} justify="space-between">
                            <Text type="secondary" style={{ fontSize: 12 }}>{t('businessHealth.publicTruth.title')}</Text>
                            {status
                                ? <Tag color={status.tone === 'error' ? 'danger' : status.tone}>{status.label}</Tag>
                                : <Tag color="default">{t('businessHealth.publicTruth.checking')}</Tag>}
                        </Flex>
                        <Text strong>{status?.message || t('businessHealth.publicTruth.checkingFacts')}</Text>
                        {report?.sourceSummary.checkedProjectName ? (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {t('businessHealth.publicTruth.checkedMenu', { name: report.sourceSummary.checkedProjectName })}
                            </Text>
                        ) : null}
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('businessHealth.publicTruth.boundaryShort')}
                        </Text>
                    </Flex>
                </Flex>

                {report ? (
                    <Flex gap={8} wrap>
                        <Tag color="success">{t('businessHealth.publicTruth.readyModuleCount', {
                            count: report.modules.filter((module) => module.status === 'ready').length,
                            total: report.modules.length,
                        })}</Tag>
                        {report.summary.missing ? <Tag color="danger">{t('businessHealth.publicTruth.missingCount', { count: report.summary.missing })}</Tag> : null}
                        {report.summary.unclear ? <Tag color="warning">{t('businessHealth.publicTruth.checkCount', { count: report.summary.unclear })}</Tag> : null}
                    </Flex>
                ) : null}

                {setupJobs.length ? (
                    <Flex
                        gap={8}
                        style={{
                            background: token.colorBgContainer,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: 10,
                            padding: 10,
                        }}
                        vertical
                    >
                        <Flex align="center" gap={6}>
                            <LuListChecks color={token.colorTextSecondary} size={15} />
                            <Text strong>{t('businessHealth.publicTruth.nextFixes')}</Text>
                            <Tag color="default">{formatNumber(setupJobs.length)}</Tag>
                        </Flex>
                        {setupJobs.slice(0, 4).map((job) => {
                            const presentation = getOwnerPublicTruthSetupJobPresentation(job, t);
                            return (
                                <Flex
                                    gap={7}
                                    key={job.id}
                                    style={{
                                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                                        paddingTop: 8,
                                    }}
                                    vertical
                                >
                                    <Flex align="flex-start" gap={8} justify="space-between">
                                        <Flex flex={1} gap={2} style={{ minWidth: 0 }} vertical>
                                            <Text strong>{presentation.title}</Text>
                                            <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                                {presentation.reason}
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                                {presentation.evidence}
                                            </Text>
                                        </Flex>
                                        <Tag color={MODULE_STATUS_COLORS[job.status]}>{presentation.statusLabel}</Tag>
                                    </Flex>
                                    {onFixTarget ? (
                                        <Button
                                            fill="outline"
                                            onClick={() => onFixTarget(job.mobileFixTarget)}
                                            size="small"
                                            style={{
                                                alignSelf: 'flex-start',
                                                minHeight: 44,
                                            }}
                                        >
                                            <Flex align="center" gap={6}>
                                                <Text>{presentation.actionLabel}</Text>
                                                <LuArrowRight size={14} />
                                            </Flex>
                                        </Button>
                                    ) : null}
                                </Flex>
                            );
                        })}
                    </Flex>
                ) : null}

                {report?.modules.length ? (
                    <Flex gap={7} vertical>
                        {report.modules.map((module) => {
                            const presentation = getOwnerPublicTruthModulePresentation(module, t);
                            return (
                                <Flex
                                    gap={6}
                                    key={module.id}
                                    style={{
                                        border: `1px solid ${token.colorBorderSecondary}`,
                                        borderRadius: 8,
                                        padding: '9px 10px',
                                    }}
                                    vertical
                                >
                                    <Flex align="center" gap={8} justify="space-between">
                                        <Text strong>{presentation.title}</Text>
                                        <Tag color={MODULE_STATUS_COLORS[module.status]}>{presentation.statusLabel}</Tag>
                                    </Flex>
                                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                        {presentation.description}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                        {presentation.evidence}
                                    </Text>
                                    {onFixTarget ? (
                                        <Button
                                            fill="none"
                                            onClick={() => onFixTarget(module.mobileFixTarget)}
                                            size="small"
                                            style={{
                                                alignSelf: 'flex-start',
                                                minHeight: 36,
                                                paddingInline: 0,
                                            }}
                                        >
                                            <Flex align="center" gap={6}>
                                                <Text>{presentation.actionLabel}</Text>
                                                <LuArrowRight size={14} />
                                            </Flex>
                                        </Button>
                                    ) : null}
                                </Flex>
                            );
                        })}
                    </Flex>
                ) : null}

                {attentionChecks.length ? (
                    <Flex gap={7} vertical>
                        {attentionChecks.slice(0, 4).map((check) => {
                            const presentation = getOwnerPublicTruthFactPresentation(check, t);
                            return (
                                <Flex
                                    align="flex-start"
                                    gap={8}
                                    justify="space-between"
                                    key={check.id}
                                    style={{
                                        border: `1px solid ${token.colorBorderSecondary}`,
                                        borderRadius: 8,
                                        padding: '8px 10px',
                                    }}
                                >
                                    <Flex flex={1} gap={2} style={{ minWidth: 0 }} vertical>
                                        <Text>{presentation.label}</Text>
                                        <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                            {presentation.evidence}
                                        </Text>
                                    </Flex>
                                    <Tag color={RESULT_COLORS[check.result]}>{presentation.resultLabel}</Tag>
                                </Flex>
                            );
                        })}
                    </Flex>
                ) : report ? (
                    <Tag color="success"><LuCheckCircle2 size={14} /> {t('businessHealth.noActionNeeded')}</Tag>
                ) : null}
            </Flex>
        </Card>
    );
}
