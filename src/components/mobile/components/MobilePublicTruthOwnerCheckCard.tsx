'use client'

import type { OwnerPublicTruthReadinessMobileFixTarget, OwnerPublicTruthReadinessReport } from '@lib/public-truth-tools/ownerPublicTruthReadiness';
import type { PublicTruthCheckFactId, PublicTruthCheckResult } from '@lib/public-truth-tools/publicTruthCheckTypes';
import { theme } from 'antd';
import { LuAlertCircle, LuArrowRight, LuCheckCircle2, LuInfo, LuListChecks, LuSearch } from 'react-icons/lu';
import { Button, Card, Flex, Tag, Text } from '../antd';

const CHECK_LABELS: Record<PublicTruthCheckFactId, string> = {
    business_identity: 'Business name',
    menu_or_service_source: 'Menu or service list',
    prices: 'Prices',
    hours: 'Hours',
    location: 'Location',
    contact: 'Contact',
    customer_actions: 'Customer actions',
    public_link: 'Customer link',
    photos: 'Photos',
    machine_readable_source: 'Search-readable source',
};

const RESULT_LABELS: Record<PublicTruthCheckResult, { color: 'success' | 'danger' | 'warning' | 'default'; label: string }> = {
    present: { color: 'success', label: 'Ready' },
    missing: { color: 'danger', label: 'Missing' },
    unclear: { color: 'warning', label: 'Check' },
    not_applicable: { color: 'default', label: 'Not needed' },
    not_checked: { color: 'default', label: 'Not checked' },
};

const MODULE_STATUS_LABELS: Record<OwnerPublicTruthReadinessReport['modules'][number]['status'], { color: 'success' | 'danger' | 'warning' | 'default'; label: string }> = {
    ready: { color: 'success', label: 'Ready' },
    needs_attention: { color: 'danger', label: 'Missing' },
    check: { color: 'warning', label: 'Check' },
    not_checked: { color: 'default', label: 'Not checked' },
};

function getStatus(report: OwnerPublicTruthReadinessReport) {
    if (report.status === 'ready') {
        return {
            color: 'success' as const,
            icon: <LuCheckCircle2 size={20} />,
            label: 'Ready',
            message: 'Your official customer source has the basics customers need.',
        };
    }
    if (report.status === 'missing_basics') {
        return {
            color: 'warning' as const,
            icon: <LuAlertCircle size={20} />,
            label: 'Missing basics',
            message: 'Menu, hours, prices, actions, or customer link details need attention.',
        };
    }
    return {
        color: 'warning' as const,
        icon: <LuInfo size={20} />,
        label: 'Needs checking',
        message: 'Most basics are present, but a few facts need checking.',
    };
}

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

    if (!report && !isLoading) return null;

    const status = report ? getStatus(report) : null;
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
                            background: status?.color === 'success' ? token.colorSuccessBg : token.colorWarningBg,
                            border: `1px solid ${status?.color === 'success' ? token.colorSuccessBorder : token.colorWarningBorder}`,
                            borderRadius: 8,
                            color: status?.color === 'success' ? token.colorSuccess : token.colorWarning,
                            flex: '0 0 40px',
                            height: 40,
                            width: 40,
                        }}
                    >
                        {status?.icon || <LuSearch size={20} />}
                    </Flex>
                    <Flex flex={1} gap={6} style={{ minWidth: 0 }} vertical>
                        <Flex align="center" gap={8} justify="space-between">
                            <Text type="secondary" style={{ fontSize: 12 }}>Official customer source</Text>
                            {status ? <Tag color={status.color}>{status.label}</Tag> : <Tag color="default">Checking</Tag>}
                        </Flex>
                        <Text strong>{status?.message || 'Checking MenuList public facts...'}</Text>
                        {report?.sourceSummary.checkedProjectName ? (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Checked menu: {report.sourceSummary.checkedProjectName}
                            </Text>
                        ) : null}
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            External platforms stay owner-confirmed.
                        </Text>
                    </Flex>
                </Flex>

                {report ? (
                    <Flex gap={8} wrap>
                        <Tag color="success">Ready modules {report.modules.filter((module) => module.status === 'ready').length}/{report.modules.length}</Tag>
                        {report.summary.missing ? <Tag color="danger">Missing {report.summary.missing}</Tag> : null}
                        {report.summary.unclear ? <Tag color="warning">Check {report.summary.unclear}</Tag> : null}
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
                            <Text strong>Next public fixes</Text>
                            <Tag color="default">{setupJobs.length}</Tag>
                        </Flex>
                        {setupJobs.slice(0, 4).map((job) => {
                            const statusLabel = MODULE_STATUS_LABELS[job.status];
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
                                            <Text strong>{job.title}</Text>
                                            <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                                {job.reason}
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                                {job.evidenceText}
                                            </Text>
                                        </Flex>
                                        <Tag color={statusLabel.color}>{statusLabel.label}</Tag>
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
                                                <Text>{job.actionLabel}</Text>
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
                            const statusLabel = MODULE_STATUS_LABELS[module.status];
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
                                        <Text strong>{module.title}</Text>
                                        <Tag color={statusLabel.color}>{statusLabel.label}</Tag>
                                    </Flex>
                                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                        {module.description}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                        {module.evidenceText}
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
                                                <Text>{module.actionLabel}</Text>
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
                            const result = RESULT_LABELS[check.result];
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
                                        <Text>{CHECK_LABELS[check.id]}</Text>
                                        <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                            {check.evidenceText}
                                        </Text>
                                    </Flex>
                                    <Tag color={result.color}>{result.label}</Tag>
                                </Flex>
                            );
                        })}
                    </Flex>
                ) : report ? (
                    <Tag color="success"><LuCheckCircle2 size={14} /> No action needed</Tag>
                ) : null}
            </Flex>
        </Card>
    );
}
