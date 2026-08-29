'use client'

import { getSchedulerDashboardSnapshot } from '@database/ops/scheduler';
import { usePlatformStoreSummaryOptions } from '@hook/usePlatformStoreSummaryOptions';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import { labelConfirmDialog } from '@lib/accessibility/antConfirmDialog';
import { normalizeSchedulerRecoveryResponse, normalizeSchedulerRecoveryRunLogId } from '@lib/ops/schedulerRecoveryResponse';
import type { SchedulerHealthSummary, SchedulerRunFilter, SchedulerRunLog, SchedulerRunStatus, SchedulerSettlementSummary, SchedulerTaskResult, SchedulerTrigger } from '@lib/ops/schedulerTypes';
import { formatDateTime, type DateLike, type IntlFormatter } from '@util/dateTime';
import { Alert, Button, Card, Collapse, Divider, Modal, Select, Spin, Table, Tag, Typography, App, theme } from 'antd';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import { redirect } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const { Title, Text } = Typography;

/**
 * Scheduler Monitor — Nightly scheduler health dashboard for founder.
 * 
 * Features:
 * - Health badge (healthy/warning/critical/unknown)
 * - Last run summary with per-task breakdown
 * - Store-local analytics settlement state
 * - Run history table with status/trigger filters
 * - Error details (expandable rows)
 * - Manual store-level nightly recovery trigger (calls triggerStoreNightlyScheduler CF)
 * 
 * Access: platformRole === 'PLATFORM' only (superadmin).
 * Route: /ops/scheduler (not in sidebar — direct URL access).
 * 
 * Firebase cost: ~3 reads per page load.
 * 
 * @see __docs__/decision-intelligence/decision-intelligence_impl.md
 */

// ================================================================
// CONSTANTS
// ================================================================

const TASK_LABELS: Record<string, string> = {
    decision_blocks: 'Decision Blocks Scoring',
    menu_intelligence: 'Menu Intelligence (CMI)',
    customer_obp_analytics: 'OBP + Menu Analytics Settlement',
    authority_maturation: 'Authority Maturation',
    menu_drift: 'Menu Drift Metrics',
    guest_feedback_retention: 'Guest Feedback Retention',
    subscription_reconciliation: 'Subscription Reconciliation',
    obp_analytics: 'OBP Analytics Aggregation',
    lifecycle_messaging: 'Lifecycle Messaging',
    special_menu_switching: 'Special Menu Switching',
    extraction_learning: 'Extraction Learning Loop',
    store_truth_confidence: 'Store Truth Confidence',
    staleness_check: 'Periodic Staleness Check',
    reseller_license_expiry: 'Reseller License Expiry',
    feedback_intelligence: 'Feedback Intelligence (AI)',
    kb_quality: 'KB Quality Analysis',
    weekly_narrative: 'Weekly Narrative (AI)',
    health_signals: 'Health Signals (Trust/Loyalty/Risk)',
    answerlattice_nightly: 'Legacy Answerlattice Nightly (moved)',
};

const STATUS_COLORS: Record<string, string> = {
    success: 'green',
    partial: 'orange',
    failed: 'red',
    running: 'blue',
    skipped: 'default',
    unknown: 'default',
};

const HEALTH_CONFIG: Record<string, { tone: 'success' | 'warning' | 'error' | 'default'; label: string; description: string }> = {
    healthy: { tone: 'success', label: 'Healthy', description: 'Last run completed successfully' },
    warning: { tone: 'warning', label: 'Warning', description: 'Last run had errors or is overdue' },
    critical: { tone: 'error', label: 'Critical', description: '3+ consecutive failures' },
    unknown: { tone: 'default', label: 'No Data', description: 'No scheduler runs found' },
};

// ================================================================
// HELPERS
// ================================================================

function formatTimestamp(ts: DateLike, formatter: IntlFormatter): string {
    if (!ts) return '-';
    const label = formatDateTime(ts, 'datetime', formatter);
    return label === 'N/A' ? '-' : label;
}

function formatDuration(ms: number): string {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}

function formatDetailKey(key: string, index: number): string {
    const normalized = String(key || '').trim();
    return /^[a-zA-Z0-9_.:-]{1,48}$/.test(normalized) ? normalized : `detail_${index + 1}`;
}

function formatDetailValue(value: unknown): string {
    if (value === undefined || value === null) return '[empty]';
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') return `[text:length=${value.length}]`;
    if (Array.isArray(value)) return `[array:length=${value.length}]`;
    if (typeof value === 'object') return `[object:keys=${Object.keys(value as Record<string, unknown>).length}]`;
    return `[${typeof value}]`;
}

function formatStoredSchedulerError(value: unknown): string {
    if (value === undefined || value === null || value === '') return '';
    return `Error recorded: ${formatDetailValue(value)}`;
}

function formatTaskError(value: unknown): string {
    return formatStoredSchedulerError(value);
}

function flattenDetails(details: Record<string, unknown> | undefined): string {
    if (!details) return '-';
    return Object.entries(details)
        .map(([key, value], index) => `${formatDetailKey(key, index)}: ${formatDetailValue(value)}`)
        .join(' | ');
}

// ================================================================
// COMPONENT
// ================================================================

function SchedulerMonitor() {
    const { message: messageApi } = App.useApp();
    const { token } = theme.useToken();
    const formatter = useFormatter();
    const { data: session, status: sessionStatus } = useSession();
    const [loading, setLoading] = useState(true);
    const [health, setHealth] = useState<SchedulerHealthSummary | null>(null);
    const [runHistory, setRunHistory] = useState<SchedulerRunLog[]>([]);
    const [settlement, setSettlement] = useState<SchedulerSettlementSummary | null>(null);
    const [triggerLoading, setTriggerLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [filterStatus, setFilterStatus] = useState<SchedulerRunStatus | undefined>(undefined);
    const [filterTrigger, setFilterTrigger] = useState<SchedulerTrigger | undefined>(undefined);
    const platformRole = session?.platformRole || session?.user.platformRole;
    const isPlatform = platformRole === 'PLATFORM';
    const isMountedRef = useRef(true);
    const isPlatformRef = useRef(isPlatform);
    const latestLoadRequestRef = useRef(0);
    const recoveryInFlightRef = useRef(false);
    isPlatformRef.current = isPlatform;
    const {
        error: storesError,
        loading: storesLoading,
        selectedStore,
        selectedStoreId,
        selectOptions,
        setSelectedStoreId,
        stores,
    } = usePlatformStoreSummaryOptions(isPlatform);

    // Gate: superadmin only
    if (session && !isPlatform) {
        redirect('/dashboard');
    }

    const loadData = useCallback(async () => {
        if (!isPlatform) {
            setLoading(false);
            return;
        }
        const requestId = latestLoadRequestRef.current + 1;
        latestLoadRequestRef.current = requestId;
        setLoading(true);
        setLoadError(false);
        try {
            const filter: SchedulerRunFilter = { limit: 20 };
            if (filterStatus) filter.status = filterStatus;
            if (filterTrigger) filter.trigger = filterTrigger;

            const snapshot = await getSchedulerDashboardSnapshot(filter, stores.map((store) => store.sId), 50);
            if (!isMountedRef.current || !isPlatformRef.current || latestLoadRequestRef.current !== requestId) return;
            setHealth(snapshot.health);
            setRunHistory(snapshot.runHistory);
            setSettlement(snapshot.settlement);
        } catch (error) {
            if (!isMountedRef.current || !isPlatformRef.current || latestLoadRequestRef.current !== requestId) return;
            setLoadError(true);
            logOpsFailure('ops_scheduler_monitor_load_failed', error, {
                isPlatform,
                statusFilter: filterStatus,
                triggerFilter: filterTrigger,
                ...getBoundedOpsStringContext('platformRole', platformRole),
            });
            messageApi.error('Failed to load scheduler data');
        } finally {
            if (
                isMountedRef.current
                && isPlatformRef.current
                && latestLoadRequestRef.current === requestId
            ) {
                setLoading(false);
            }
        }
    }, [filterStatus, filterTrigger, isPlatform, stores]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            latestLoadRequestRef.current += 1;
            recoveryInFlightRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (sessionStatus === 'loading' || storesLoading) return;
        if (!isPlatform) {
            latestLoadRequestRef.current += 1;
            setLoading(false);
            return;
        }
        void loadData();
    }, [isPlatform, loadData, sessionStatus, storesLoading]);

    const changeStatusFilter = useCallback((value: SchedulerRunStatus | undefined) => {
        if (value === filterStatus) return;
        latestLoadRequestRef.current += 1;
        setFilterStatus(value);
    }, [filterStatus]);

    const changeTriggerFilter = useCallback((value: SchedulerTrigger | undefined) => {
        if (value === filterTrigger) return;
        latestLoadRequestRef.current += 1;
        setFilterTrigger(value);
    }, [filterTrigger]);

    const handleManualNightlyRecovery = () => {
        if (!selectedStore || recoveryInFlightRef.current) {
            if (!selectedStore) {
                messageApi.warning('Select a store first');
            }
            return;
        }
        recoveryInFlightRef.current = true;
        const recoveryStore = selectedStore;

        Modal.confirm({
            title: 'Run Store Nightly Recovery',
            modalRender: labelConfirmDialog('Run Store Nightly Recovery'),
            content: (
                <div>
                    <p>This runs the store-level nightly scheduler path for {recoveryStore.name || `store ${recoveryStore.sId}`}.</p>
                    <p>It settles analytics, recomputes Decision Blocks, and recomputes Menu Intelligence for all active projects under this store.</p>
                    <p><strong>This may take up to 9 minutes.</strong> The page will refresh when complete.</p>
                </div>
            ),
            okText: 'Run Recovery',
            okButtonProps: { type: 'primary' },
            onCancel: () => {
                recoveryInFlightRef.current = false;
            },
            onOk: async () => {
                if (!isMountedRef.current || !isPlatformRef.current) {
                    recoveryInFlightRef.current = false;
                    return;
                }
                setTriggerLoading(true);
                try {
                    const { getFunctions, httpsCallable } = await import('firebase/functions');
                    const fns = getFunctions();
                    const triggerFn = httpsCallable(fns, 'triggerStoreNightlyScheduler', { timeout: 600000 });
                    const result = await triggerFn({ tId: recoveryStore.tId, sId: recoveryStore.sId });
                    const data = normalizeSchedulerRecoveryResponse(result?.data);
                    if (!data) throw new Error('ops_scheduler_recovery_response_invalid');
                    if (!isMountedRef.current || !isPlatformRef.current) return;
                    const summary = `Nightly recovery ${data.status}: ${data.successCount} DI success, ${data.failedCount} failed · ${data.runLogId}`;
                    if (data.status === 'success') messageApi.success(summary);
                    else if (data.status === 'partial') messageApi.warning(summary);
                    else messageApi.error(summary);
                    await loadData();
                } catch (error: unknown) {
                    const runLogId = normalizeSchedulerRecoveryRunLogId(
                        error && typeof error === 'object' && 'details' in error
                            ? (error as { details?: { runLogId?: unknown } }).details?.runLogId
                            : null,
                    );
                    logOpsFailure('ops_scheduler_manual_recovery_failed', error, {
                        ...getBoundedOpsStringContext('storeId', recoveryStore.sId),
                        ...getBoundedOpsStringContext('tenantId', recoveryStore.tId),
                        ...getBoundedOpsStringContext('runLogId', runLogId),
                    });
                    if (isMountedRef.current && isPlatformRef.current) {
                        messageApi.error(`Nightly recovery failed${runLogId ? ` · Run log: ${runLogId}` : ''}`);
                    }
                } finally {
                    recoveryInFlightRef.current = false;
                    if (isMountedRef.current) setTriggerLoading(false);
                }
            },
        });
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    const healthInfo = HEALTH_CONFIG[health?.healthStatus || 'unknown'];
    const healthColor = healthInfo.tone === 'success'
        ? token.colorSuccess
        : healthInfo.tone === 'warning'
            ? token.colorWarning
            : healthInfo.tone === 'error'
                ? token.colorError
                : token.colorTextTertiary;
    const healthBg = healthInfo.tone === 'success'
        ? token.colorSuccessBg
        : healthInfo.tone === 'warning'
            ? token.colorWarningBg
            : healthInfo.tone === 'error'
                ? token.colorErrorBg
                : token.colorFillSecondary;
    const healthBorder = healthInfo.tone === 'success'
        ? token.colorSuccessBorder
        : healthInfo.tone === 'warning'
            ? token.colorWarningBorder
            : healthInfo.tone === 'error'
                ? token.colorErrorBorder
                : token.colorBorderSecondary;
    const getTaskBackground = (status: string) => {
        if (status === 'failed') return token.colorErrorBg;
        if (status === 'skipped') return token.colorFillAlter;
        return token.colorSuccessBg;
    };

    return (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>Scheduler Monitor</Title>
                    <Text type="secondary">Runs hourly — processes stores at their local 2:30 AM (timezone-aware)</Text>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button onClick={loadData} loading={loading}>Refresh</Button>
                </div>
            </div>

            {loadError && (
                <Alert
                    message="Scheduler state unavailable"
                    description="The latest run and settlement state could not be verified. Values may be missing or from the previous successful refresh."
                    showIcon
                    style={{ marginBottom: 16 }}
                    type="error"
                />
            )}

            <Card title="Manual Recovery" size="small" style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    Select a store from storesSummary. Recovery runs for all active projects under that store; no project ID is needed.
                </Text>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) auto', gap: 12, marginBottom: 12 }}>
                    <Select
                        aria-label="Store for nightly recovery"
                        showSearch
                        loading={storesLoading}
                        placeholder="Select store"
                        value={selectedStoreId}
                        onChange={setSelectedStoreId}
                        options={selectOptions}
                        optionFilterProp="label"
                    />
                    <Button onClick={handleManualNightlyRecovery} loading={triggerLoading} disabled={!selectedStore}>
                        Run Nightly Recovery
                    </Button>
                </div>
                {storesError && <Text type="danger">Store options are unavailable. Refresh before running recovery.</Text>}
                {selectedStore && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Selected scope: tenant {selectedStore.tId}, store {selectedStore.sId}
                    </Text>
                )}
            </Card>

            {/* Section 1: Health Badge */}
            <Card size="small" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Health Status</Text>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '6px 16px', borderRadius: 8,
                            backgroundColor: healthBg,
                            border: `1px solid ${healthBorder}`,
                        }}>
                            <div style={{
                                width: 10, height: 10, borderRadius: '50%',
                                backgroundColor: healthColor,
                            }} />
                            <Text strong style={{ color: healthColor, fontSize: 16 }}>
                                {healthInfo.label}
                            </Text>
                        </div>
                        <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                            {healthInfo.description}
                        </Text>
                    </div>
                    <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Last Run</Text>
                        <Text strong>{formatTimestamp(health?.lastRun?.startedAt, formatter)}</Text>
                        {health?.lastRun && (
                            <Tag color={STATUS_COLORS[health.lastRun.status]} style={{ marginLeft: 8 }}>
                                {health.lastRun.status.toUpperCase()}
                            </Tag>
                        )}
                    </div>
                    <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Duration</Text>
                        <Text strong>{formatDuration(health?.lastRun?.durationMs || 0)}</Text>
                    </div>
                    <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Runs (7d)</Text>
                        <Text strong style={{ fontSize: 20 }}>{health?.runsLast7Days ?? 0}</Text>
                    </div>
                    <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Avg Duration</Text>
                        <Text strong>{formatDuration(health?.avgDurationMs || 0)}</Text>
                    </div>
                </div>
            </Card>

            {/* Section 2: Last Run — Per-Task Breakdown */}
            {health?.lastRun?.tasks && health.lastRun.tasks.length > 0 && (
                <Card title="Last Run — Task Breakdown" size="small" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {health.lastRun.tasks.map((task: SchedulerTaskResult, idx: number) => (
                            <div key={idx} style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '6px 12px', borderRadius: 6,
                                backgroundColor: getTaskBackground(task.status),
                            }}>
                                <Tag color={STATUS_COLORS[task.status]} style={{ margin: 0 }}>
                                    {task.status.toUpperCase()}
                                </Tag>
                                <Text strong style={{ minWidth: 200 }}>
                                    {TASK_LABELS[task.name] || task.name}
                                </Text>
                                {task.durationMs && (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {formatDuration(task.durationMs)}
                                    </Text>
                                )}
                                <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>
                                    {formatTaskError(task.error) || flattenDetails(task.details)}
                                </Text>
                            </div>
                        ))}
                    </div>

                    {/* Core results summary */}
                    <Divider style={{ margin: '12px 0' }} />
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                        <div>
                            <Text type="secondary">Stores</Text><br />
                            <Text strong>{health.lastRun.totalStores}</Text>
                        </div>
                        <div>
                            <Text type="secondary">Projects</Text><br />
                            <Text strong>{health.lastRun.totalProjects}</Text>
                        </div>
                        <div>
                            <Text type="secondary">DI Success</Text><br />
                            <Text strong style={{ color: token.colorSuccess }}>{health.lastRun.successCount}</Text>
                        </div>
                        <div>
                            <Text type="secondary">DI Failed</Text><br />
                            <Text strong style={{ color: health.lastRun.failedCount > 0 ? token.colorError : undefined }}>
                                {health.lastRun.failedCount}
                            </Text>
                        </div>
                        <div>
                            <Text type="secondary">DI Skipped</Text><br />
                            <Text strong>{health.lastRun.skippedCount}</Text>
                        </div>
                        <div>
                            <Text type="secondary">CMI OK</Text><br />
                            <Text strong style={{ color: token.colorSuccess }}>{health.lastRun.intelligenceSuccess}</Text>
                        </div>
                        <div>
                            <Text type="secondary">CMI Fail</Text><br />
                            <Text strong style={{ color: health.lastRun.intelligenceFailed > 0 ? token.colorError : undefined }}>
                                {health.lastRun.intelligenceFailed}
                            </Text>
                        </div>
                    </div>
                </Card>
            )}

            {/* Section 3: Analytics Settlement State */}
            <Card title="Analytics Settlement State" size="small" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 12 }}>
                    <div>
                        <Text type="secondary">Tracked Stores</Text><br />
                        <Text strong style={{ fontSize: 20 }}>{settlement?.totalTrackedStores ?? 0}</Text>
                    </div>
                    <div>
                        <Text type="secondary">Latest Settled Date</Text><br />
                        <Text strong>{settlement?.latestSettledDate || '-'}</Text>
                    </div>
                    <div>
                        <Text type="secondary">Running</Text><br />
                        <Text strong>{settlement?.runningCount ?? 0}</Text>
                    </div>
                    <div>
                        <Text type="secondary">Failed</Text><br />
                        <Text strong style={{ color: (settlement?.failedCount ?? 0) > 0 ? token.colorError : undefined }}>
                            {settlement?.failedCount ?? 0}
                        </Text>
                    </div>
                    <div>
                        <Text type="secondary">Stale &gt;2d</Text><br />
                        <Text strong style={{ color: (settlement?.staleCount ?? 0) > 0 ? token.colorWarning : undefined }}>
                            {settlement?.staleCount ?? 0}
                        </Text>
                    </div>
                </div>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    Tracks `platformSummary/nightlyState_*`. OBP settles first; menu and Customer App analytics settle only after OBP succeeds for the same store-local date.
                </Text>
                {(settlement?.failedCount || 0) > 0 && (
                    <Collapse
                        size="small"
                        items={[{
                            key: 'failed-settlements',
                            label: `Failed settlements (${settlement?.failedCount})`,
                            children: (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {settlement?.states
                                        .filter((state) => state.status === 'failed')
                                        .slice(0, 10)
                                        .map((state) => (
                                            <div key={state.id} style={{ fontFamily: 'monospace', fontSize: 12 }}>
                                                {state.id}: {state.lastAttemptedLocalDate || '-'} / {state.phase || '-'} — {formatStoredSchedulerError(state.error) || 'failed'}
                                            </div>
                                        ))}
                                </div>
                            ),
                        }]}
                    />
                )}
            </Card>

            {/* Section 4: Last Run Errors (if any) */}
            {health?.lastRun?.errors && health.lastRun.errors.length > 0 && (
                <Card
                    title={<span style={{ color: token.colorError }}>Last Run Errors ({health.lastRun.errors.length})</span>}
                    size="small"
                    style={{ marginBottom: 16, borderColor: token.colorErrorBorder }}
                >
                    <Collapse
                        size="small"
                        items={health.lastRun.errors.map((err, idx) => ({
                            key: idx,
                            label: (
                                <Text>
                                    <Text type="secondary">Store {err.sId}</Text>
                                    {err.projectId && <Text type="secondary"> / Project {err.projectId}</Text>}
                                    <Text> — {formatStoredSchedulerError(err.error) || 'failed'}</Text>
                                </Text>
                            ),
                            children: (
                                <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
                                    {err.phase && <div>Phase: {err.phase}</div>}
                                    {err.operation && <div>Operation: {err.operation}</div>}
                                    {err.code && <div>Code: {err.code}</div>}
                                    <div>Tenant ID: {err.tId}</div>
                                    <div>Store ID: {err.sId}</div>
                                    {err.projectId && <div>Project ID: {err.projectId}</div>}
                                    {err.settlementDate && <div>Settlement Date: {err.settlementDate}</div>}
                                    <div style={{ marginTop: 8, color: token.colorError }}>Error: {formatStoredSchedulerError(err.error) || 'failed'}</div>
                                    {err.details && <div style={{ marginTop: 8 }}>Details: {flattenDetails(err.details)}</div>}
                                </div>
                            ),
                        }))}
                    />
                </Card>
            )}

            <Divider />

            {/* Section 5: Run History with Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <Title level={5} style={{ margin: 0 }}>Run History</Title>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Select
                        aria-label="Run status"
                        placeholder="Status"
                        allowClear
                        style={{ width: 120 }}
                        value={filterStatus}
                        onChange={changeStatusFilter}
                        options={[
                            { value: 'success', label: 'Success' },
                            { value: 'partial', label: 'Partial' },
                            { value: 'failed', label: 'Failed' },
                            { value: 'running', label: 'Running' },
                            { value: 'skipped', label: 'Skipped' },
                        ]}
                        size="small"
                    />
                    <Select
                        aria-label="Run trigger"
                        placeholder="Trigger"
                        allowClear
                        style={{ width: 120 }}
                        value={filterTrigger}
                        onChange={changeTriggerFilter}
                        options={[
                            { value: 'scheduled', label: 'Scheduled' },
                            { value: 'manual', label: 'Manual' },
                        ]}
                        size="small"
                    />
                </div>
            </div>

            <Table
                dataSource={runHistory}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ x: 700 }}
                expandable={{
                    expandedRowRender: (record: SchedulerRunLog) => (
                        <div style={{ padding: '8px 0' }}>
                            {/* Tasks */}
                            {record.tasks && record.tasks.length > 0 && (
                                <div style={{ marginBottom: 12 }}>
                                    <Text strong style={{ display: 'block', marginBottom: 4 }}>Tasks:</Text>
                                    {record.tasks.map((task: SchedulerTaskResult, idx: number) => (
                                        <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '2px 0' }}>
                                            <Tag color={STATUS_COLORS[task.status]} style={{ margin: 0, fontSize: 11 }}>
                                                {task.status}
                                            </Tag>
                                            <Text style={{ fontSize: 13 }}>{TASK_LABELS[task.name] || task.name}</Text>
                                            {task.durationMs && <Text type="secondary" style={{ fontSize: 11 }}>{formatDuration(task.durationMs)}</Text>}
                                            {formatTaskError(task.error) ? <Text type="danger" style={{ fontSize: 11 }}>{formatTaskError(task.error)}</Text> : null}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* Errors */}
                            {record.errors && record.errors.length > 0 && (
                                <div>
                                    <Text strong style={{ display: 'block', marginBottom: 4, color: token.colorError }}>
                                        Errors ({record.errors.length}):
                                    </Text>
                                    {record.errors.slice(0, 10).map((err, idx) => (
                                        <div key={idx} style={{ fontFamily: 'monospace', fontSize: 11, padding: '2px 0' }}>
                                            Store {err.sId}{err.projectId ? ` / Project ${err.projectId}` : ''} — {formatStoredSchedulerError(err.error) || 'failed'}
                                        </div>
                                    ))}
                                    {record.errors.length > 10 && (
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            ...and {record.errors.length - 10} more
                                        </Text>
                                    )}
                                </div>
                            )}
                        </div>
                    ),
                    rowExpandable: (record: SchedulerRunLog) =>
                        (record.tasks && record.tasks.length > 0) || (record.errors && record.errors.length > 0),
                }}
                columns={[
                    {
                        title: 'Status',
                        dataIndex: 'status',
                        width: 90,
                        render: (status: string) => (
                            <Tag color={STATUS_COLORS[status]}>{status?.toUpperCase()}</Tag>
                        ),
                    },
                    {
                        title: 'Trigger',
                        dataIndex: 'trigger',
                        width: 90,
                        render: (trigger: string) => (
                            <Tag color={trigger === 'manual' ? 'purple' : 'default'}>
                                {trigger}
                            </Tag>
                        ),
                    },
                    {
                        title: 'Started At',
                        dataIndex: 'startedAt',
                        width: 180,
                        render: (ts: DateLike) => <Text style={{ fontSize: 12 }}>{formatTimestamp(ts, formatter)}</Text>,
                    },
                    {
                        title: 'Duration',
                        dataIndex: 'durationMs',
                        width: 90,
                        render: (ms: number) => formatDuration(ms),
                    },
                    {
                        title: 'Stores',
                        dataIndex: 'totalStores',
                        width: 70,
                        align: 'center' as const,
                    },
                    {
                        title: 'Projects',
                        dataIndex: 'totalProjects',
                        width: 80,
                        align: 'center' as const,
                    },
                    {
                        title: 'OK / Fail',
                        width: 90,
                        render: (_: unknown, record: SchedulerRunLog) => (
                            <span>
                                <Text style={{ color: token.colorSuccess }}>{record.successCount}</Text>
                                {' / '}
                                <Text style={{ color: record.failedCount > 0 ? token.colorError : undefined }}>
                                    {record.failedCount}
                                </Text>
                            </span>
                        ),
                    },
                    {
                        title: 'Errors',
                        width: 70,
                        align: 'center' as const,
                        render: (_: unknown, record: SchedulerRunLog) => (
                            record.errors?.length > 0 ? (
                                <Tag color="red">{record.errors.length}</Tag>
                            ) : <Text type="secondary">0</Text>
                        ),
                    },
                ]}
            />

            {runHistory.length === 0 && (
                <div style={{ textAlign: 'center', padding: 32 }}>
                    <Text type="secondary">No scheduler runs found. The scheduler runs hourly (timezone-aware), or trigger it manually above.</Text>
                </div>
            )}

            {/* Section 5: Quick Reference */}
            <Divider />
            <Card title="Quick Reference" size="small">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                    <Text><strong>Schedule:</strong> Every hour at :30 UTC (timezone-aware — each store runs at 2:30 AM local)</Text>
                    <Text><strong>DST-Safe:</strong> Uses runtime <code>Intl.DateTimeFormat</code> — no static UTC hour drift</Text>
                    <Text><strong>Timeout:</strong> 540 seconds (9 minutes)</Text>
                    <Text><strong>Analytics Settlement:</strong> Store-local date state lives in <code>platformSummary/nightlyState_*</code>; per-date locks live in <code>platformSummary/nightlyLock_*</code></Text>
                    <Text><strong>Tasks:</strong> DI, CMI, OBP + menu analytics settlement, Authority, Drift, Feedback Retention, Billing Reconciliation, Messaging, Special Menus, Infra Compounding, Reseller, AI Insights</Text>
                    <Text><strong>Dead Man Switch:</strong> Telegram alert fires on completion — if no alert, scheduler did not finish</Text>
                    <Text><strong>Mismatch Alert:</strong> Warns if expected store count ≠ processed count</Text>
                    <Text><strong>Manual Store Recovery:</strong> Uses <code>triggerStoreNightlyScheduler</code> callable CF for one selected store and all active projects under it.</Text>
                    <Text><strong>TTL:</strong> Decision Blocks have 48h TTL — if scheduler fails 2 nights, client falls back to pinned-only mode</Text>
                </div>
            </Card>
        </div>
    );
}

export default SchedulerMonitor;
