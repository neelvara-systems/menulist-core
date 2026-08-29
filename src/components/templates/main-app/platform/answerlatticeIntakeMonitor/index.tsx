'use client';

import { FEATURE_FLAGS } from '@config/features';
import { formatDateTime, type IntlFormatter } from '@util/dateTime';
import type { TableColumnsType } from 'antd';
import { Alert, Button, Card, Empty, Modal, Select, Space, Spin, Statistic, Table, Tag, Tooltip, Typography, App, theme } from 'antd';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuActivity, LuAlertTriangle, LuBookOpen, LuCheckCircle, LuClock3, LuCreditCard, LuPlay, LuRefreshCw, LuXCircle } from 'react-icons/lu';

const { Title, Text } = Typography;
const ANSWERLATTICE_INTAKE_MONITOR_LOAD_FAILED = 'Failed to load Answerlattice intake monitor.';
const ANSWERLATTICE_INTAKE_MONITOR_RETRY_FAILED = 'Manual Answerlattice retry failed.';
const ANSWERLATTICE_INTAKE_MONITOR_RESPONSE_JSON_MAX_BYTES = 512 * 1024;

type IntakeMonitorJob = {
    id: string;
    tId: number;
    sId: number;
    title: string;
    status: string;
    sourceCount: number;
    readySourceCount: number;
    reviewItemCount: number;
    acceptedItemCount: number;
    publishedItemCount: number;
    rejectedItemCount: number;
    usageUnitsConsumed: number;
    modifiedOn: string | null;
    errorMessage: string | null;
};

type IntakeMonitorLedgerRow = {
    id: string;
    tId: number;
    sId: number;
    jobId: string | null;
    action: string;
    status: string;
    provider: string | null;
    model: string | null;
    fileName: string | null;
    mimeType: string | null;
    byteSize: number;
    unitsReserved: number;
    unitsCharged: number;
    refundedMonthlyCredits: number;
    refundedTopUpCredits: number;
    expiredMonthlyCredits: number;
    createdOn: string | null;
    settledOn: string | null;
    refundedOn: string | null;
    errorMessage: string | null;
};

type IntakeMonitorSchedulerReadWindow = {
    key: string;
    task: string;
    source: string;
    window: string;
    operationCount: number;
    documentsReturned: number;
    configuredLimit: number;
    saturated: boolean;
};

type IntakeMonitorSchedulerRun = {
    id: string;
    runLogId: string;
    status: string;
    trigger: string;
    tenantsProcessed: number;
    durationMs: number;
    startedAt: string | null;
    updatedAt: string | null;
    knowledgeIntakeJobsScanned: number;
    knowledgeIntakeSummaryWritten: number;
    knowledgeIntakeUsageUnits: number;
    knowledgeIntakeSchedulerEnabled: boolean;
    selectedTenantRun: {
        tId: number;
        sId: number;
        status: string;
        durationMs: number;
        taskCount: number;
        errorCount: number;
        driftDetected: number;
        proposalsCreated: number;
        coverageRate: number;
        observedOperationCount: number;
        observedDocumentsReturned: number;
        saturatedReadWindowCount: number;
        readWindows: IntakeMonitorSchedulerReadWindow[];
    } | null;
    errorCount: number;
    errorMessages: string[];
};

type IntakeMonitorTenant = {
    key: string;
    tId: number;
    sId: number;
    active: boolean;
    hasEntities?: boolean;
    source?: string | null;
    timeZone?: string | null;
    businessDayEndTime?: string | null;
    schedulerHour?: number | null;
    lastSeenAt?: string | null;
    updatedAt?: string | null;
};

type IntakeMonitorSnapshot = {
    tenants: IntakeMonitorTenant[];
    tenantSummaryUpdatedAt: string | null;
    selectedTenant: IntakeMonitorTenant | null;
    stats: {
        recentJobs: number;
        activeJobs: number;
        failedJobs: number;
        readySources: number;
        reviewItems: number;
        acceptedItems: number;
        publishedItems: number;
        usageUnitsConsumed: number;
        ledgerRows: number;
        ledgerReservedUnits: number;
        ledgerChargedUnits: number;
        ledgerRefundedUnits: number;
        mediaExtractions: number;
        latestSchedulerRun: IntakeMonitorSchedulerRun | null;
    };
    jobs: IntakeMonitorJob[];
    ledger: IntakeMonitorLedgerRow[];
    schedulerRuns: IntakeMonitorSchedulerRun[];
    warnings: string[];
    costModel: {
        readPattern: string;
        realtime: boolean;
        writes: boolean;
    };
};

type SelectedScope = { tId: number; sId: number };

type IntakeMonitorRetryTask = {
    name: string;
    status: string;
    activity: boolean;
    durationMs: number | null;
};

type IntakeMonitorRetryResult = {
    scheduler: string | null;
    runId: string | null;
    status: string;
    trigger: string | null;
    durationMs: number | null;
    taskCount: number;
    failedTaskCount: number;
    tasks: IntakeMonitorRetryTask[];
};

type IntakeMonitorRetryResponse = {
    success: true;
    scope: SelectedScope;
    result: IntakeMonitorRetryResult;
    costModel: IntakeMonitorSnapshot['costModel'];
};

type IntakeMonitorResponseKind = 'snapshot_load' | 'manual_retry';

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

const isNullableString = (value: unknown): value is string | null => (
    value === null || typeof value === 'string'
);

const isOptionalNullableString = (value: unknown): value is string | null | undefined => (
    value === undefined || isNullableString(value)
);

const isOptionalNullableNumber = (value: unknown): value is number | null | undefined => (
    value === undefined || value === null || isFiniteNumber(value)
);

const isStringArray = (value: unknown): value is string[] => (
    Array.isArray(value) && value.every(item => typeof item === 'string')
);

const isIntakeMonitorCostModel = (value: unknown): value is IntakeMonitorSnapshot['costModel'] => (
    isRecord(value)
    && typeof value.readPattern === 'string'
    && typeof value.realtime === 'boolean'
    && typeof value.writes === 'boolean'
);

const isIntakeMonitorTenant = (value: unknown): value is IntakeMonitorTenant => (
    isRecord(value)
    && typeof value.key === 'string'
    && isFiniteNumber(value.tId)
    && isFiniteNumber(value.sId)
    && typeof value.active === 'boolean'
    && (value.hasEntities === undefined || typeof value.hasEntities === 'boolean')
    && isOptionalNullableString(value.source)
    && isOptionalNullableString(value.timeZone)
    && isOptionalNullableString(value.businessDayEndTime)
    && isOptionalNullableNumber(value.schedulerHour)
    && isOptionalNullableString(value.lastSeenAt)
    && isOptionalNullableString(value.updatedAt)
);

const isIntakeMonitorJob = (value: unknown): value is IntakeMonitorJob => (
    isRecord(value)
    && typeof value.id === 'string'
    && isFiniteNumber(value.tId)
    && isFiniteNumber(value.sId)
    && typeof value.title === 'string'
    && typeof value.status === 'string'
    && isFiniteNumber(value.sourceCount)
    && isFiniteNumber(value.readySourceCount)
    && isFiniteNumber(value.reviewItemCount)
    && isFiniteNumber(value.acceptedItemCount)
    && isFiniteNumber(value.publishedItemCount)
    && isFiniteNumber(value.rejectedItemCount)
    && isFiniteNumber(value.usageUnitsConsumed)
    && isNullableString(value.modifiedOn)
    && isNullableString(value.errorMessage)
);

const isIntakeMonitorLedgerRow = (value: unknown): value is IntakeMonitorLedgerRow => (
    isRecord(value)
    && typeof value.id === 'string'
    && isFiniteNumber(value.tId)
    && isFiniteNumber(value.sId)
    && isNullableString(value.jobId)
    && typeof value.action === 'string'
    && typeof value.status === 'string'
    && isNullableString(value.provider)
    && isNullableString(value.model)
    && isNullableString(value.fileName)
    && isNullableString(value.mimeType)
    && isFiniteNumber(value.byteSize)
    && isFiniteNumber(value.unitsReserved)
    && isFiniteNumber(value.unitsCharged)
    && isFiniteNumber(value.refundedMonthlyCredits)
    && isFiniteNumber(value.refundedTopUpCredits)
    && isFiniteNumber(value.expiredMonthlyCredits)
    && isNullableString(value.createdOn)
    && isNullableString(value.settledOn)
    && isNullableString(value.refundedOn)
    && isNullableString(value.errorMessage)
);

const isIntakeMonitorSelectedTenantRun = (
    value: unknown,
): value is NonNullable<IntakeMonitorSchedulerRun['selectedTenantRun']> => (
    isRecord(value)
    && isFiniteNumber(value.tId)
    && isFiniteNumber(value.sId)
    && typeof value.status === 'string'
    && isFiniteNumber(value.durationMs)
    && isFiniteNumber(value.taskCount)
    && isFiniteNumber(value.errorCount)
    && isFiniteNumber(value.driftDetected)
    && isFiniteNumber(value.proposalsCreated)
    && isFiniteNumber(value.coverageRate)
    && isFiniteNumber(value.observedOperationCount)
    && isFiniteNumber(value.observedDocumentsReturned)
    && isFiniteNumber(value.saturatedReadWindowCount)
    && Array.isArray(value.readWindows)
    && value.readWindows.every((entry) => (
        isRecord(entry)
        && typeof entry.key === 'string'
        && typeof entry.task === 'string'
        && typeof entry.source === 'string'
        && typeof entry.window === 'string'
        && isFiniteNumber(entry.operationCount)
        && isFiniteNumber(entry.documentsReturned)
        && isFiniteNumber(entry.configuredLimit)
        && typeof entry.saturated === 'boolean'
    ))
);

const isIntakeMonitorSchedulerRun = (value: unknown): value is IntakeMonitorSchedulerRun => (
    isRecord(value)
    && typeof value.id === 'string'
    && typeof value.runLogId === 'string'
    && typeof value.status === 'string'
    && typeof value.trigger === 'string'
    && isFiniteNumber(value.tenantsProcessed)
    && isFiniteNumber(value.durationMs)
    && isNullableString(value.startedAt)
    && isNullableString(value.updatedAt)
    && isFiniteNumber(value.knowledgeIntakeJobsScanned)
    && isFiniteNumber(value.knowledgeIntakeSummaryWritten)
    && isFiniteNumber(value.knowledgeIntakeUsageUnits)
    && typeof value.knowledgeIntakeSchedulerEnabled === 'boolean'
    && (value.selectedTenantRun === null || isIntakeMonitorSelectedTenantRun(value.selectedTenantRun))
    && isFiniteNumber(value.errorCount)
    && isStringArray(value.errorMessages)
);

const isIntakeMonitorStats = (value: unknown): value is IntakeMonitorSnapshot['stats'] => (
    isRecord(value)
    && isFiniteNumber(value.recentJobs)
    && isFiniteNumber(value.activeJobs)
    && isFiniteNumber(value.failedJobs)
    && isFiniteNumber(value.readySources)
    && isFiniteNumber(value.reviewItems)
    && isFiniteNumber(value.acceptedItems)
    && isFiniteNumber(value.publishedItems)
    && isFiniteNumber(value.usageUnitsConsumed)
    && isFiniteNumber(value.ledgerRows)
    && isFiniteNumber(value.ledgerReservedUnits)
    && isFiniteNumber(value.ledgerChargedUnits)
    && isFiniteNumber(value.ledgerRefundedUnits)
    && isFiniteNumber(value.mediaExtractions)
    && (value.latestSchedulerRun === null || isIntakeMonitorSchedulerRun(value.latestSchedulerRun))
);

const isIntakeMonitorSnapshot = (value: unknown): value is IntakeMonitorSnapshot => (
    isRecord(value)
    && Array.isArray(value.tenants)
    && value.tenants.every(isIntakeMonitorTenant)
    && isNullableString(value.tenantSummaryUpdatedAt)
    && (value.selectedTenant === null || isIntakeMonitorTenant(value.selectedTenant))
    && isIntakeMonitorStats(value.stats)
    && Array.isArray(value.jobs)
    && value.jobs.every(isIntakeMonitorJob)
    && Array.isArray(value.ledger)
    && value.ledger.every(isIntakeMonitorLedgerRow)
    && Array.isArray(value.schedulerRuns)
    && value.schedulerRuns.every(isIntakeMonitorSchedulerRun)
    && isStringArray(value.warnings)
    && isIntakeMonitorCostModel(value.costModel)
);

const isIntakeMonitorRetryTask = (value: unknown): value is IntakeMonitorRetryTask => (
    isRecord(value)
    && typeof value.name === 'string'
    && typeof value.status === 'string'
    && typeof value.activity === 'boolean'
    && (value.durationMs === null || isFiniteNumber(value.durationMs))
);

const isIntakeMonitorRetryResult = (value: unknown): value is IntakeMonitorRetryResult => (
    isRecord(value)
    && isNullableString(value.scheduler)
    && isNullableString(value.runId)
    && typeof value.status === 'string'
    && isNullableString(value.trigger)
    && (value.durationMs === null || isFiniteNumber(value.durationMs))
    && isFiniteNumber(value.taskCount)
    && isFiniteNumber(value.failedTaskCount)
    && Array.isArray(value.tasks)
    && value.tasks.every(isIntakeMonitorRetryTask)
);

const isIntakeMonitorRetryResponse = (value: unknown): value is IntakeMonitorRetryResponse => (
    isRecord(value)
    && value.success === true
    && isRecord(value.scope)
    && isFiniteNumber(value.scope.tId)
    && isFiniteNumber(value.scope.sId)
    && isIntakeMonitorRetryResult(value.result)
    && isIntakeMonitorCostModel(value.costModel)
);

const getIntakeMonitorResponseLogContext = (
    kind: IntakeMonitorResponseKind,
    response: Response,
) => ({
    surface: 'answerlattice_intake_monitor',
    ...getBoundedRuntimeStringContext('responseKind', kind),
    responseOk: response.ok,
    responseStatus: response.status,
});

const readIntakeMonitorResponse = async <T,>(
    response: Response,
    kind: IntakeMonitorResponseKind,
    isValid: (value: unknown) => value is T,
    failureMessage: string,
): Promise<T> => {
    const context = getIntakeMonitorResponseLogContext(kind, response);
    let payload: unknown;

    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            ANSWERLATTICE_INTAKE_MONITOR_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logRuntimeFailure('answerlattice_intake_monitor_response_parse_failed', error, context);
        throw new Error(failureMessage);
    }

    if (!response.ok) {
        logRuntimeFailure('answerlattice_intake_monitor_response_rejected', undefined, context);
        throw new Error(failureMessage);
    }

    if (!isValid(payload)) {
        logRuntimeFailure('answerlattice_intake_monitor_response_invalid', undefined, context);
        throw new Error(failureMessage);
    }

    return payload;
};

const getManualRetryStatusLabel = (response: IntakeMonitorRetryResponse): string => {
    return response.result.status.trim() || 'complete';
};

const STATUS_COLORS: Record<string, string> = {
    draft: 'default',
    collecting: 'blue',
    reviewing: 'cyan',
    publishing: 'gold',
    published: 'green',
    failed: 'red',
    cancelled: 'default',
    reserved: 'blue',
    succeeded: 'green',
    settled: 'green',
    refunded: 'orange',
    failed_refunded: 'orange',
    success: 'green',
    partial: 'orange',
    running: 'blue',
};

function StatusTag({ status }: { status: string }) {
    return <Tag color={STATUS_COLORS[status] || 'default'}>{status || 'unknown'}</Tag>;
}

function formatDate(value: string | null, formatter: IntlFormatter) {
    if (!value) return '-';
    const label = formatDateTime(value, 'datetime', formatter);
    return label === 'N/A' ? '-' : label;
}

function formatDuration(ms: number) {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function shortId(value: string | null | undefined) {
    if (!value) return '-';
    return value.length > 12 ? `${value.slice(0, 10)}...` : value;
}

export default function AnswerlatticeIntakeMonitor() {
    const { message: messageApi } = App.useApp();
    const { token } = theme.useToken();
    const formatter = useFormatter();
    const { data: session, status: sessionStatus } = useSession();
    const [snapshot, setSnapshot] = useState<IntakeMonitorSnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedScope, setSelectedScope] = useState<SelectedScope | null>(null);
    const [triggering, setTriggering] = useState(false);

    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const isPlatform = platformRole === 'PLATFORM';
    const isEnabled = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INTAKE_PLATFORM_MONITOR;

    const loadSnapshot = useCallback(async (mode: 'initial' | 'refresh' = 'initial', scope = selectedScope) => {
        if (!isEnabled || !isPlatform) {
            setLoading(false);
            return;
        }

        if (mode === 'refresh') setRefreshing(true);
        else setLoading(true);

        try {
            const params = new URLSearchParams({ limit: '10' });
            if (scope) {
                params.set('tId', String(scope.tId));
                params.set('sId', String(scope.sId));
            }
            const response = await fetch(`/api/platform/answerlattice-intake?${params.toString()}`, {
                cache: 'no-store',
            });
            const data = await readIntakeMonitorResponse(
                response,
                'snapshot_load',
                isIntakeMonitorSnapshot,
                ANSWERLATTICE_INTAKE_MONITOR_LOAD_FAILED,
            );
            setSnapshot(data);
        } catch {
            messageApi.error(ANSWERLATTICE_INTAKE_MONITOR_LOAD_FAILED);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [isEnabled, isPlatform, selectedScope]);

    useEffect(() => {
        if (sessionStatus === 'loading') return;
        loadSnapshot('initial', null);
    }, [loadSnapshot, sessionStatus]);

    const health = useMemo(() => {
        if (!snapshot) return { color: 'default', icon: <LuActivity />, label: 'No Data' };
        const selectedRunErrors = snapshot.stats.latestSchedulerRun?.selectedTenantRun?.errorCount || 0;
        if (snapshot.stats.failedJobs > 0 || selectedRunErrors > 0) {
            return { color: 'red', icon: <LuXCircle />, label: 'Needs Attention' };
        }
        if (snapshot.warnings.length > 0 || snapshot.stats.activeJobs > 0) {
            return { color: 'orange', icon: <LuAlertTriangle />, label: 'Watch' };
        }
        return { color: 'green', icon: <LuCheckCircle />, label: 'Healthy' };
    }, [snapshot]);

    if (!isEnabled) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <Empty description="Answerlattice Intake Monitor is disabled." />
            </div>
        );
    }

    if (session && !isPlatform) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <Empty description="Access restricted to platform administrators." />
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    const stats = snapshot?.stats;
    const tenantOptions = (snapshot?.tenants || []).map((tenant) => ({
        value: `${tenant.tId}:${tenant.sId}`,
        label: `${tenant.tId}/${tenant.sId}${tenant.timeZone ? ` · ${tenant.timeZone}` : ''}`,
    }));
    const selectedTenantRun = stats?.latestSchedulerRun?.selectedTenantRun || null;

    const handleTenantChange = (value: string) => {
        const [tenantId, storeId] = value.split(':').map(Number);
        if (!Number.isFinite(tenantId) || !Number.isFinite(storeId)) return;
        const nextScope = { tId: tenantId, sId: storeId };
        setSelectedScope(nextScope);
        loadSnapshot('refresh', nextScope);
    };

    const handleManualRetry = () => {
        if (!selectedScope) {
            messageApi.warning('Select an Answerlattice workspace first.');
            return;
        }

        Modal.confirm({
            title: 'Run Answerlattice nightly for selected workspace?',
            content: (
                <div>
                    <p>This runs the Answerlattice scheduler for workspace {selectedScope.tId}/{selectedScope.sId} only.</p>
                    <p>Use it after a failed nightly run, stale summary, or intake summary issue. It can still read/write Answerlattice governance, summary, and scheduler state for this workspace.</p>
                </div>
            ),
            okText: 'Run retry',
            okButtonProps: { danger: true },
            onOk: async () => {
                setTriggering(true);
                try {
                    const response = await fetch('/api/platform/answerlattice-intake', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'trigger-nightly',
                            ...selectedScope,
                        }),
                    });
                    const data = await readIntakeMonitorResponse(
                        response,
                        'manual_retry',
                        isIntakeMonitorRetryResponse,
                        ANSWERLATTICE_INTAKE_MONITOR_RETRY_FAILED,
                    );
                    messageApi.success(`Manual retry finished: ${getManualRetryStatusLabel(data)}`);
                    await loadSnapshot('refresh', selectedScope);
                } catch {
                    messageApi.error(ANSWERLATTICE_INTAKE_MONITOR_RETRY_FAILED);
                } finally {
                    setTriggering(false);
                }
            },
        });
    };

    const jobColumns: TableColumnsType<IntakeMonitorJob> = [
        {
            title: 'Workspace',
            key: 'workspace',
            width: 120,
            render: (_, row) => <Text>{row.tId}/{row.sId}</Text>,
        },
        {
            title: 'Job',
            dataIndex: 'title',
            key: 'title',
            width: 220,
            render: (title: string, row) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{title}</Text>
                    <Tooltip title={row.id}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{shortId(row.id)}</Text>
                    </Tooltip>
                </Space>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: string) => <StatusTag status={status} />,
        },
        {
            title: 'Sources',
            key: 'sources',
            width: 110,
            render: (_, row) => `${row.readySourceCount}/${row.sourceCount}`,
        },
        {
            title: 'Review',
            key: 'review',
            width: 150,
            render: (_, row) => (
                <Text>{row.reviewItemCount} total · {row.acceptedItemCount} accepted</Text>
            ),
        },
        {
            title: 'Published',
            dataIndex: 'publishedItemCount',
            key: 'publishedItemCount',
            width: 100,
        },
        {
            title: 'Credits',
            dataIndex: 'usageUnitsConsumed',
            key: 'usageUnitsConsumed',
            width: 90,
        },
        {
            title: 'Updated',
            dataIndex: 'modifiedOn',
            key: 'modifiedOn',
            width: 140,
            render: (value: string | null) => formatDate(value, formatter),
        },
        {
            title: 'Error',
            dataIndex: 'errorMessage',
            key: 'errorMessage',
            width: 220,
            render: (error: string | null) => error ? <Text type="danger">{error}</Text> : <Text type="secondary">-</Text>,
        },
    ];

    const ledgerColumns: TableColumnsType<IntakeMonitorLedgerRow> = [
        {
            title: 'Created',
            dataIndex: 'createdOn',
            key: 'createdOn',
            width: 140,
            render: (value: string | null) => formatDate(value, formatter),
        },
        {
            title: 'Workspace',
            key: 'workspace',
            width: 120,
            render: (_, row) => <Text>{row.tId}/{row.sId}</Text>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (status: string) => <StatusTag status={status} />,
        },
        {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
            width: 180,
            render: (action: string) => <Text>{action}</Text>,
        },
        {
            title: 'Credits',
            key: 'credits',
            width: 170,
            render: (_, row) => {
                const refunded = row.refundedMonthlyCredits + row.refundedTopUpCredits;
                return row.status === 'refunded' || row.status === 'failed_refunded'
                    ? `${refunded} refunded${row.expiredMonthlyCredits ? `; ${row.expiredMonthlyCredits} expired` : ''}`
                    : `${row.unitsCharged}/${row.unitsReserved}`;
            },
        },
        {
            title: 'File',
            key: 'file',
            width: 240,
            render: (_, row) => (
                <Space direction="vertical" size={0}>
                    <Text>{row.fileName || '-'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{row.mimeType || row.provider || '-'}</Text>
                </Space>
            ),
        },
        {
            title: 'Job',
            dataIndex: 'jobId',
            key: 'jobId',
            width: 120,
            render: (jobId: string | null) => <Text type="secondary">{shortId(jobId)}</Text>,
        },
        {
            title: 'Error',
            dataIndex: 'errorMessage',
            key: 'errorMessage',
            width: 220,
            render: (error: string | null) => error ? <Text type="danger">{error}</Text> : <Text type="secondary">-</Text>,
        },
    ];

    const schedulerColumns: TableColumnsType<IntakeMonitorSchedulerRun> = [
        {
            title: 'Started',
            dataIndex: 'startedAt',
            key: 'startedAt',
            width: 140,
            render: (value: string | null) => formatDate(value, formatter),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (status: string) => <StatusTag status={status} />,
        },
        {
            title: 'Trigger',
            dataIndex: 'trigger',
            key: 'trigger',
            width: 110,
        },
        {
            title: 'Tenants',
            dataIndex: 'tenantsProcessed',
            key: 'tenantsProcessed',
            width: 90,
        },
        {
            title: 'Jobs scanned',
            dataIndex: 'knowledgeIntakeJobsScanned',
            key: 'knowledgeIntakeJobsScanned',
            width: 120,
        },
        {
            title: 'Summaries',
            dataIndex: 'knowledgeIntakeSummaryWritten',
            key: 'knowledgeIntakeSummaryWritten',
            width: 110,
        },
        {
            title: 'Credits',
            dataIndex: 'knowledgeIntakeUsageUnits',
            key: 'knowledgeIntakeUsageUnits',
            width: 90,
        },
        {
            title: 'Duration',
            dataIndex: 'durationMs',
            key: 'durationMs',
            width: 100,
            render: formatDuration,
        },
        {
            title: 'Errors',
            key: 'errors',
            width: 180,
            render: (_, row) => {
                const selectedErrors = row.selectedTenantRun?.errorCount || 0;
                const totalErrors = selectedErrors || row.errorCount;
                return totalErrors
                    ? <Tooltip title={row.errorMessages.join(' | ')}><Text type="danger">{totalErrors} errors</Text></Tooltip>
                    : <Text type="secondary">-</Text>;
            },
        },
    ];
    const readWindowColumns: TableColumnsType<IntakeMonitorSchedulerReadWindow> = [
        {
            title: 'Task',
            dataIndex: 'task',
            key: 'task',
            width: 180,
        },
        {
            title: 'Source',
            dataIndex: 'source',
            key: 'source',
            width: 210,
        },
        {
            title: 'Window',
            dataIndex: 'window',
            key: 'window',
            width: 190,
        },
        {
            title: 'Operations',
            dataIndex: 'operationCount',
            key: 'operationCount',
            width: 90,
        },
        {
            title: 'Documents',
            dataIndex: 'documentsReturned',
            key: 'documentsReturned',
            width: 100,
        },
        {
            title: 'Configured cap',
            dataIndex: 'configuredLimit',
            key: 'configuredLimit',
            width: 100,
        },
        {
            title: 'Window state',
            dataIndex: 'saturated',
            key: 'saturated',
            width: 120,
            render: (saturated: boolean) => (
                <Tag color={saturated ? 'red' : 'green'}>{saturated ? 'Saturated' : 'Within cap'}</Tag>
            ),
        },
    ];

    return (
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div>
                    <Space align="center" size={10}>
                        <LuBookOpen color={token.colorPrimary} size={28} />
                        <Title level={3} style={{ margin: 0 }}>Answerlattice Intake Monitor</Title>
                        <Tag color={health.color} icon={health.icon}>{health.label}</Tag>
                    </Space>
                    <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>
                        Platform-only view for intake jobs, support-credit ledger rows, and nightly summary health.
                    </Text>
                </div>
                <Space wrap>
                    <Button disabled={!selectedScope} icon={<LuPlay />} loading={triggering} onClick={handleManualRetry}>
                        Retry selected nightly
                    </Button>
                    <Button icon={<LuRefreshCw />} loading={refreshing} onClick={() => loadSnapshot('refresh')}>
                        Refresh
                    </Button>
                </Space>
            </div>

            <Card size="small" style={{ marginBottom: 16 }} title="Workspace scope">
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                    <Text type="secondary">
                        Initial load reads the Answerlattice tenant summary. Pick one workspace before reading intake jobs or usage-ledger rows.
                    </Text>
                    <Space wrap style={{ width: '100%' }}>
                        <Select
                            aria-label="Answerlattice workspace"
                            allowClear
                            onChange={(value) => {
                                if (!value) {
                                    setSelectedScope(null);
                                    loadSnapshot('refresh', null);
                                    return;
                                }
                                handleTenantChange(value);
                            }}
                            options={tenantOptions}
                            placeholder="Select tenant/store"
                            showSearch
                            style={{ minWidth: 280 }}
                            value={selectedScope ? `${selectedScope.tId}:${selectedScope.sId}` : undefined}
                        />
                        <Tag>{snapshot?.tenants?.length || 0} Answerlattice workspaces</Tag>
                        {snapshot?.tenantSummaryUpdatedAt ? <Tag>Summary {formatDate(snapshot.tenantSummaryUpdatedAt, formatter)}</Tag> : null}
                    </Space>
                </Space>
            </Card>

            {snapshot?.warnings?.length ? (
                <Alert
                    message="Operational attention"
                    description={snapshot.warnings.join(' ')}
                    showIcon
                    style={{ marginBottom: 16 }}
                    type="warning"
                />
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
                <Card size="small"><Statistic prefix={<LuActivity />} title="Recent jobs" value={stats?.recentJobs || 0} /></Card>
                <Card size="small"><Statistic title="Active jobs" value={stats?.activeJobs || 0} valueStyle={{ color: token.colorInfo }} /></Card>
                <Card size="small"><Statistic prefix={<LuAlertTriangle />} title="Failed jobs" value={stats?.failedJobs || 0} valueStyle={{ color: stats?.failedJobs ? token.colorError : token.colorText }} /></Card>
                <Card size="small"><Statistic title="Review items" value={stats?.reviewItems || 0} /></Card>
                <Card size="small"><Statistic title="Published" value={stats?.publishedItems || 0} valueStyle={{ color: token.colorSuccess }} /></Card>
                <Card size="small"><Statistic prefix={<LuCreditCard />} title="Credits charged" value={stats?.ledgerChargedUnits || 0} /></Card>
                <Card size="small"><Statistic title="Media extractions" value={stats?.mediaExtractions || 0} /></Card>
                <Card size="small"><Statistic title="Tenant run errors" value={selectedTenantRun?.errorCount || 0} valueStyle={{ color: selectedTenantRun?.errorCount ? token.colorError : token.colorText }} /></Card>
                <Card size="small"><Statistic title="Observed source operations" value={selectedTenantRun?.observedOperationCount || 0} /></Card>
                <Card size="small"><Statistic title="Observed source documents" value={selectedTenantRun?.observedDocumentsReturned || 0} /></Card>
                <Card size="small">
                    <Statistic
                        prefix={<LuClock3 />}
                        title="Last summary run"
                        value={stats?.latestSchedulerRun ? formatDate(stats.latestSchedulerRun.startedAt, formatter) : '-'}
                        valueStyle={{ fontSize: 16 }}
                    />
                </Card>
            </div>

            <Card
                size="small"
                style={{ marginBottom: 16 }}
                title="Cost model"
            >
                <Text type="secondary">
                    {snapshot?.costModel?.readPattern || 'Manual bounded reads only.'} No realtime listener. Refresh is read-only; retry writes scheduler state for the selected workspace.
                </Text>
            </Card>

            <Card
                size="small"
                style={{ marginBottom: 16 }}
                title="Latest scheduler source windows"
            >
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    Logical high-volume source-operation observations for the selected workspace. These are documents returned by instrumented source windows, not billed Firestore reads or a currency estimate.
                </Text>
                <Table
                    columns={readWindowColumns}
                    dataSource={selectedTenantRun?.readWindows || []}
                    locale={{ emptyText: selectedScope ? 'No source-window telemetry exists for the latest run.' : 'Select a workspace to inspect source windows.' }}
                    pagination={false}
                    rowKey="key"
                    scroll={{ x: 990 }}
                    size="small"
                />
            </Card>

            <Card title="Recent intake jobs" style={{ marginBottom: 16 }}>
                <Table
                    columns={jobColumns}
                    dataSource={selectedScope ? snapshot?.jobs || [] : []}
                    locale={{ emptyText: selectedScope ? 'No intake jobs found for this workspace.' : 'Select a workspace to load intake jobs.' }}
                    pagination={{ pageSize: 10 }}
                    rowKey="id"
                    scroll={{ x: 1340 }}
                    size="small"
                />
            </Card>

            <Card title="Support-credit intake ledger" style={{ marginBottom: 16 }}>
                <Table
                    columns={ledgerColumns}
                    dataSource={selectedScope ? snapshot?.ledger || [] : []}
                    locale={{ emptyText: selectedScope ? 'No intake ledger rows found for this workspace.' : 'Select a workspace to load ledger rows.' }}
                    pagination={{ pageSize: 10 }}
                    rowKey="id"
                    scroll={{ x: 1320 }}
                    size="small"
                />
            </Card>

            <Card title="Answerlattice scheduler intake summaries">
                <Table
                    columns={schedulerColumns}
                    dataSource={snapshot?.schedulerRuns || []}
                    pagination={false}
                    rowKey="id"
                    scroll={{ x: 1120 }}
                    size="small"
                />
            </Card>
        </div>
    );
}
