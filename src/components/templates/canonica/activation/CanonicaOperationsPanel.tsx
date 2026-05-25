'use client';

import {
    Alert,
    Button,
    Card,
    Divider,
    Flex,
    List,
    Skeleton,
    Space,
    Statistic,
    Tag,
    Typography,
    message,
} from 'antd';
import type { CanonicaOperationsStatusSummary, CanonicaOwnerOperationStatus } from '@type/canonica';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuClock3, LuRefreshCw, LuServerCog, LuSettings } from 'react-icons/lu';

const { Text } = Typography;

type OperationsStatusResponse = {
    operations?: CanonicaOperationsStatusSummary;
    error?: string;
};

const STATUS_COLOR: Record<CanonicaOwnerOperationStatus | 'unknown', string> = {
    success: 'success',
    completed: 'success',
    partial: 'warning',
    running: 'processing',
    skipped: 'default',
    not_started: 'default',
    failed: 'error',
    unknown: 'default',
};

const STATUS_LABEL: Record<CanonicaOwnerOperationStatus | 'unknown', string> = {
    success: 'Complete',
    completed: 'Complete',
    partial: 'Partial',
    running: 'Running',
    skipped: 'No work',
    not_started: 'Not started',
    failed: 'Failed',
    unknown: 'Unknown',
};

const formatDateTime = (value: string | null | undefined): string => {
    if (!value) return 'Not seen yet';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not seen yet';
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatDuration = (durationMs: number): string => {
    if (!Number.isFinite(durationMs) || durationMs <= 0) return '-';
    if (durationMs < 1000) return `${Math.round(durationMs)} ms`;
    return `${Math.round(durationMs / 1000)} s`;
};

const getStatusLabel = (status: CanonicaOwnerOperationStatus | 'unknown' | null | undefined): string =>
    STATUS_LABEL[status || 'unknown'] || STATUS_LABEL.unknown;

const getStatusColor = (status: CanonicaOwnerOperationStatus | 'unknown' | null | undefined): string =>
    STATUS_COLOR[status || 'unknown'] || STATUS_COLOR.unknown;

const metricBoxStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    border: '1px solid #f0f0f0',
    borderRadius: 8,
    padding: 12,
};

const actionButtonStyle: CSSProperties = {
    minHeight: 44,
};

export default function CanonicaOperationsPanel({
    isMobile,
    onOpenSettings,
}: {
    isMobile: boolean;
    onOpenSettings?: () => void;
}) {
    const [operations, setOperations] = useState<CanonicaOperationsStatusSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadOperations = useCallback(async (silent = false) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const response = await fetch('/api/canonica/operations/status', { method: 'GET' });
            const data: OperationsStatusResponse = await response.json().catch(() => ({}));
            if (!response.ok || !data.operations) {
                throw new Error(data.error || 'Failed to load operations status');
            }
            setOperations(data.operations);
        } catch (error: any) {
            message.error(error?.message || 'Failed to load operations status');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadOperations();
    }, [loadOperations]);

    const workspaceStatus = operations?.workspace.status || 'not_started';
    const statusDescription = useMemo(() => {
        if (!operations) return '';
        if (operations.workspace.lastCompletedLocalDate) {
            return `Last completed for ${operations.workspace.lastCompletedLocalDate}.`;
        }
        if (operations.workspace.lastAttemptedLocalDate) {
            return `Last attempted for ${operations.workspace.lastAttemptedLocalDate}.`;
        }
        return 'No completed workspace run has been recorded yet.';
    }, [operations]);

    if (loading) {
        return <Card title="Daily Governance"><Skeleton active paragraph={{ rows: 4 }} /></Card>;
    }

    if (!operations) {
        return (
            <Card title="Daily Governance">
                <Alert
                    type="warning"
                    showIcon
                    message="Daily governance is unavailable"
                    action={<Button onClick={() => loadOperations(true)} style={actionButtonStyle}>Retry</Button>}
                />
            </Card>
        );
    }

    return (
        <Card title={<Flex align="center" gap={8}><LuServerCog size={16} /> Daily Governance</Flex>}>
            <Flex vertical gap={14}>
                <Alert
                    type={workspaceStatus === 'failed' ? 'error' : workspaceStatus === 'partial' ? 'warning' : 'info'}
                    showIcon
                    message="Daily governance runs automatically"
                    description={statusDescription}
                />

                <Flex vertical={isMobile} gap={12}>
                    <div style={metricBoxStyle}>
                        <Statistic
                            title="Workspace run"
                            value={getStatusLabel(workspaceStatus)}
                            prefix={<LuClock3 />}
                            valueStyle={{ fontSize: 20 }}
                        />
                    </div>
                    <div style={metricBoxStyle}>
                        <Statistic
                            title="Support day ends"
                            value={operations.schedule.businessDayEndTime}
                            valueStyle={{ fontSize: 20 }}
                        />
                    </div>
                    <div style={metricBoxStyle}>
                        <Statistic
                            title="Daily check starts"
                            value={operations.schedule.settlementLocalTime}
                            valueStyle={{ fontSize: 20 }}
                        />
                    </div>
                </Flex>

                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <Flex justify="space-between" gap={12}>
                        <Text type="secondary">Timezone</Text>
                        <Text style={{ textAlign: 'right', wordBreak: 'break-word' }}>{operations.schedule.timeZone}</Text>
                    </Flex>
                    <Flex justify="space-between" gap={12}>
                        <Text type="secondary">Last task status</Text>
                        <Tag color={getStatusColor(operations.masterScheduler.governanceTask.lastStatus)}>
                            {getStatusLabel(operations.masterScheduler.governanceTask.lastStatus || 'not_started')}
                        </Tag>
                    </Flex>
                    <Flex justify="space-between" gap={12}>
                        <Text type="secondary">Last finished</Text>
                        <Text style={{ textAlign: 'right' }}>{formatDateTime(operations.masterScheduler.governanceTask.lastFinishedAt)}</Text>
                    </Flex>
                    <Flex justify="space-between" gap={12}>
                        <Text type="secondary">Last duration</Text>
                        <Text>{formatDuration(operations.masterScheduler.governanceTask.lastDurationMs)}</Text>
                    </Flex>
                    {operations.masterScheduler.governanceTask.lastError && (
                        <Text type="danger">{operations.masterScheduler.governanceTask.lastError}</Text>
                    )}
                </Space>

                {operations.latestRuns.length > 0 && (
                    <>
                        <Divider style={{ margin: '4px 0' }} />
                        <List
                            size="small"
                            header={<Text strong>Recent governance runs</Text>}
                            dataSource={operations.latestRuns}
                            renderItem={(run) => {
                                const status = run.tenantStatus || run.status || 'unknown';
                                return (
                                    <List.Item>
                                        <Flex vertical gap={4} style={{ width: '100%' }}>
                                            <Flex justify="space-between" gap={12} wrap="wrap">
                                                <Space>
                                                    <Tag color={getStatusColor(status)}>
                                                        {getStatusLabel(status)}
                                                    </Tag>
                                                    <Text>{run.trigger || 'scheduled'}</Text>
                                                </Space>
                                                <Text type="secondary">{formatDateTime(run.completedAt || run.startedAt)}</Text>
                                            </Flex>
                                            <Text type="secondary">
                                                {run.taskCount} task{run.taskCount === 1 ? '' : 's'}, {run.errorCount} error{run.errorCount === 1 ? '' : 's'}
                                            </Text>
                                        </Flex>
                                    </List.Item>
                                );
                            }}
                        />
                    </>
                )}

                <Flex justify={isMobile ? 'stretch' : 'end'} gap={8} vertical={isMobile}>
                    {onOpenSettings && (
                        <Button
                            block={isMobile}
                            icon={<LuSettings size={14} />}
                            onClick={onOpenSettings}
                            style={actionButtonStyle}
                        >
                            Settings
                        </Button>
                    )}
                    <Button
                        block={isMobile}
                        icon={<LuRefreshCw size={14} />}
                        loading={refreshing}
                        onClick={() => loadOperations(true)}
                        style={actionButtonStyle}
                    >
                        Refresh
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}
