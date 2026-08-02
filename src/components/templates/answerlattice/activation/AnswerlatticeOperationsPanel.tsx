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
    theme,
} from 'antd';
import {
    ANSWERLATTICE_ACTIVATION_DASHBOARD_REQUEST_POLICY,
    isAnswerlatticeOperationsStatusResponse,
    readAnswerlatticeActivationDashboardResponse,
} from '@lib/answerlattice/activationDashboardResponseClient';
import { useAnswerlatticeCacheScope } from '@hook/answerlattice/useAnswerlatticeCacheScope';
import type { AnswerlatticeOperationsStatusSummary, AnswerlatticeOwnerOperationStatus } from '@type/answerlattice';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuClock3, LuRefreshCw, LuServerCog, LuSettings } from 'react-icons/lu';

const { Text } = Typography;
const ANSWERLATTICE_OPERATIONS_STATUS_LOAD_FAILED = 'Could not load operations status';
const ANSWERLATTICE_OPERATIONS_LAST_RUN_NEEDS_REVIEW = 'Last run needs review';

const STATUS_COLOR: Record<AnswerlatticeOwnerOperationStatus | 'unknown', string> = {
    success: 'success',
    completed: 'success',
    partial: 'warning',
    running: 'processing',
    skipped: 'default',
    not_started: 'default',
    failed: 'error',
    unknown: 'default',
};

const STATUS_LABEL: Record<AnswerlatticeOwnerOperationStatus | 'unknown', string> = {
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

const getStatusLabel = (status: AnswerlatticeOwnerOperationStatus | 'unknown' | null | undefined): string =>
    STATUS_LABEL[status || 'unknown'] || STATUS_LABEL.unknown;

const getStatusColor = (status: AnswerlatticeOwnerOperationStatus | 'unknown' | null | undefined): string =>
    STATUS_COLOR[status || 'unknown'] || STATUS_COLOR.unknown;

const actionButtonStyle: CSSProperties = {
    minHeight: 44,
};

export default function AnswerlatticeOperationsPanel({
    isMobile,
    onOpenSettings,
}: {
    isMobile: boolean;
    onOpenSettings?: () => void;
}) {
    const cacheScopeKey = useAnswerlatticeCacheScope();
    const { token } = theme.useToken();
    const [operations, setOperations] = useState<AnswerlatticeOperationsStatusSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadedScopeKey, setLoadedScopeKey] = useState<string | null>(null);
    const currentScopeKeyRef = useRef(cacheScopeKey);
    const loadRequestRef = useRef(0);
    currentScopeKeyRef.current = cacheScopeKey;
    const scopeIsCurrent = Boolean(cacheScopeKey && loadedScopeKey === cacheScopeKey);

    const loadOperations = useCallback(async (silent = false) => {
        const requestScopeKey = cacheScopeKey;
        const requestId = loadRequestRef.current + 1;
        loadRequestRef.current = requestId;
        if (!requestScopeKey) {
            setOperations(null);
            setLoadedScopeKey(null);
            setLoading(false);
            setRefreshing(false);
            return;
        }
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
            setOperations(null);
            setLoadedScopeKey(null);
        }

        try {
            const response = await fetch('/api/answerlattice/operations/status', {
                ...ANSWERLATTICE_ACTIVATION_DASHBOARD_REQUEST_POLICY,
                method: 'GET',
            });
            const data = await readAnswerlatticeActivationDashboardResponse(
                response,
                'operations_status_load',
                isAnswerlatticeOperationsStatusResponse,
                ANSWERLATTICE_OPERATIONS_STATUS_LOAD_FAILED,
            );
            if (currentScopeKeyRef.current !== requestScopeKey || loadRequestRef.current !== requestId) return;
            setOperations(data.operations);
            setLoadedScopeKey(requestScopeKey);
        } catch {
            if (currentScopeKeyRef.current !== requestScopeKey || loadRequestRef.current !== requestId) return;
            setOperations(null);
            setLoadedScopeKey(requestScopeKey);
            message.error(ANSWERLATTICE_OPERATIONS_STATUS_LOAD_FAILED);
        } finally {
            if (currentScopeKeyRef.current === requestScopeKey && loadRequestRef.current === requestId) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [cacheScopeKey]);

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
    const metricBoxStyle: CSSProperties = {
        flex: 1,
        minWidth: 0,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: 12,
    };

    if (loading || !scopeIsCurrent) {
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
                        <Text type="danger">
                            {ANSWERLATTICE_OPERATIONS_LAST_RUN_NEEDS_REVIEW}
                        </Text>
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
