'use client'

import { getSchedulerHealthSummary, getSchedulerRunHistory, getSchedulerSettlementSummary } from '@database/ops/scheduler';
import type { SchedulerHealthSummary, SchedulerRunFilter, SchedulerRunLog, SchedulerRunStatus, SchedulerSettlementSummary, SchedulerTaskResult, SchedulerTrigger } from '@lib/ops/schedulerTypes';
import { Button, Card, Collapse, Divider, Input, Modal, Select, Spin, Table, Tag, Typography, message } from 'antd';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

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
 * - Manual Decision Blocks recovery trigger (calls triggerDecisionBlocksScoring CF)
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
    canonica_nightly: 'Canonica Nightly (Drift + Mutation)',
};

const STATUS_COLORS: Record<string, string> = {
    success: 'green',
    partial: 'orange',
    failed: 'red',
    skipped: 'default',
    unknown: 'default',
};

const HEALTH_CONFIG: Record<string, { color: string; label: string; description: string }> = {
    healthy: { color: '#52c41a', label: 'Healthy', description: 'Last run completed successfully' },
    warning: { color: '#faad14', label: 'Warning', description: 'Last run had errors or is overdue' },
    critical: { color: '#ff4d4f', label: 'Critical', description: '3+ consecutive failures' },
    unknown: { color: '#d9d9d9', label: 'No Data', description: 'No scheduler runs found' },
};

// ================================================================
// HELPERS
// ================================================================

function formatTimestamp(ts: any): string {
    if (!ts) return '-';
    try {
        const date = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
        return date.toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true,
        });
    } catch { return '-'; }
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

function flattenDetails(details: Record<string, any> | undefined): string {
    if (!details) return '-';
    return Object.entries(details)
        .map(([k, v]) => {
            if (typeof v === 'object') return `${k}: ${JSON.stringify(v)}`;
            return `${k}: ${v}`;
        })
        .join(' | ');
}

// ================================================================
// COMPONENT
// ================================================================

function SchedulerMonitor() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [health, setHealth] = useState<SchedulerHealthSummary | null>(null);
    const [runHistory, setRunHistory] = useState<SchedulerRunLog[]>([]);
    const [settlement, setSettlement] = useState<SchedulerSettlementSummary | null>(null);
    const [triggerLoading, setTriggerLoading] = useState(false);
    const [analyticsBackfillLoading, setAnalyticsBackfillLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<SchedulerRunStatus | undefined>(undefined);
    const [filterTrigger, setFilterTrigger] = useState<SchedulerTrigger | undefined>(undefined);
    const [manualTenantId, setManualTenantId] = useState('');
    const [manualStoreId, setManualStoreId] = useState('');
    const [manualProjectId, setManualProjectId] = useState('');
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;

    // Gate: superadmin only
    if (session && platformRole !== 'PLATFORM') {
        redirect('/dashboard');
    }

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const filter: SchedulerRunFilter = { limit: 20 };
            if (filterStatus) filter.status = filterStatus;
            if (filterTrigger) filter.trigger = filterTrigger;

            const [healthData, historyData, settlementData] = await Promise.all([
                getSchedulerHealthSummary(),
                getSchedulerRunHistory(filter),
                getSchedulerSettlementSummary(50),
            ]);
            setHealth(healthData);
            setRunHistory(historyData);
            setSettlement(settlementData);
        } catch (error) {
            console.error('[SchedulerMonitor] Failed to load data:', error);
            message.error('Failed to load scheduler data');
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterTrigger]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const getManualScope = (requiresProject = false) => {
        const tId = manualTenantId.trim();
        const sId = manualStoreId.trim();
        const projectId = manualProjectId.trim();

        if (!tId || !sId) {
            message.warning('Enter Tenant ID and Store ID first');
            return null;
        }

        if (requiresProject && !projectId) {
            message.warning('Enter Project ID for analytics backfill');
            return null;
        }

        return projectId ? { tId, sId, projectId } : { tId, sId };
    };

    // Manual Decision Blocks recovery trigger. This is scoped to one store or one project.
    const handleManualDecisionBlocks = async () => {
        const scope = getManualScope(false);
        if (!scope) return;

        Modal.confirm({
            title: 'Recompute Decision Blocks',
            content: (
                <div>
                    <p>This recomputes Decision Blocks for the entered store{manualProjectId.trim() ? ' and project' : ''}.</p>
                    <p>It does not run the full timezone-aware nightly scheduler, analytics settlement, billing reconciliation, or global maintenance tasks.</p>
                    <p><strong>This may take up to 9 minutes.</strong> The page will refresh when complete.</p>
                </div>
            ),
            okText: 'Recompute Now',
            okButtonProps: { type: 'primary' },
            onOk: async () => {
                setTriggerLoading(true);
                try {
                    const { getFunctions, httpsCallable } = await import('firebase/functions');
                    const fns = getFunctions();
                    const triggerFn = httpsCallable(fns, 'triggerDecisionBlocksScoring', { timeout: 600000 });
                    const result: any = await triggerFn(scope);
                    const data = result.data;
                    message.success(
                        `Decision Blocks recomputed: ${data.successCount || 0} success, ${data.failedCount || 0} failed`
                    );
                    await loadData();
                } catch (error: any) {
                    message.error(`Scheduler trigger failed: ${error.message}`);
                } finally {
                    setTriggerLoading(false);
                }
            },
        });
    };

    const handleManualAnalyticsBackfill = async () => {
        const scope = getManualScope(true);
        if (!scope || !('projectId' in scope)) return;

        Modal.confirm({
            title: 'Backfill Analytics Summary',
            content: (
                <div>
                    <p>This reprocesses the latest settled analytics summary for the entered project.</p>
                    <p>Use this when dashboard analytics are stale after the nightly settlement ran or after a known scheduler gap.</p>
                    <p>It does not run the full all-store scheduler.</p>
                </div>
            ),
            okText: 'Backfill Analytics',
            okButtonProps: { type: 'primary' },
            onOk: async () => {
                setAnalyticsBackfillLoading(true);
                try {
                    const { getFunctions, httpsCallable } = await import('firebase/functions');
                    const triggerFn = httpsCallable(getFunctions(), 'triggerCustomerAnalyticsManually', { timeout: 600000 });
                    const result: any = await triggerFn(scope);
                    const data = result?.data || {};
                    message.success(data.message || 'Analytics backfill completed');
                    await loadData();
                } catch (error: any) {
                    message.error(`Analytics backfill failed: ${error.message}`);
                } finally {
                    setAnalyticsBackfillLoading(false);
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

            <Card title="Manual Recovery" size="small" style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    Scoped recovery only. Enter one store, and optionally one project, before running manual jobs.
                </Text>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
                    <Input
                        placeholder="Tenant ID"
                        value={manualTenantId}
                        onChange={(event) => setManualTenantId(event.target.value)}
                    />
                    <Input
                        placeholder="Store ID"
                        value={manualStoreId}
                        onChange={(event) => setManualStoreId(event.target.value)}
                    />
                    <Input
                        placeholder="Project ID for analytics"
                        value={manualProjectId}
                        onChange={(event) => setManualProjectId(event.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button
                        type="primary"
                        onClick={handleManualDecisionBlocks}
                        loading={triggerLoading}
                    >
                        Recompute Decision Blocks
                    </Button>
                    <Button
                        onClick={handleManualAnalyticsBackfill}
                        loading={analyticsBackfillLoading}
                    >
                        Backfill Analytics Summary
                    </Button>
                </div>
            </Card>

            {/* Section 1: Health Badge */}
            <Card size="small" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Health Status</Text>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '6px 16px', borderRadius: 8,
                            backgroundColor: healthInfo.color + '15',
                            border: `1px solid ${healthInfo.color}40`,
                        }}>
                            <div style={{
                                width: 10, height: 10, borderRadius: '50%',
                                backgroundColor: healthInfo.color,
                            }} />
                            <Text strong style={{ color: healthInfo.color, fontSize: 16 }}>
                                {healthInfo.label}
                            </Text>
                        </div>
                        <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                            {healthInfo.description}
                        </Text>
                    </div>
                    <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Last Run</Text>
                        <Text strong>{formatTimestamp(health?.lastRun?.startedAt)}</Text>
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
                                backgroundColor: task.status === 'failed' ? '#fff2f0' : task.status === 'skipped' ? '#fafafa' : '#f6ffed',
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
                                    {task.error || flattenDetails(task.details)}
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
                            <Text strong style={{ color: '#52c41a' }}>{health.lastRun.successCount}</Text>
                        </div>
                        <div>
                            <Text type="secondary">DI Failed</Text><br />
                            <Text strong style={{ color: health.lastRun.failedCount > 0 ? '#ff4d4f' : undefined }}>
                                {health.lastRun.failedCount}
                            </Text>
                        </div>
                        <div>
                            <Text type="secondary">DI Skipped</Text><br />
                            <Text strong>{health.lastRun.skippedCount}</Text>
                        </div>
                        <div>
                            <Text type="secondary">CMI OK</Text><br />
                            <Text strong style={{ color: '#52c41a' }}>{health.lastRun.intelligenceSuccess}</Text>
                        </div>
                        <div>
                            <Text type="secondary">CMI Fail</Text><br />
                            <Text strong style={{ color: health.lastRun.intelligenceFailed > 0 ? '#ff4d4f' : undefined }}>
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
                        <Text strong style={{ color: (settlement?.failedCount ?? 0) > 0 ? '#ff4d4f' : undefined }}>
                            {settlement?.failedCount ?? 0}
                        </Text>
                    </div>
                    <div>
                        <Text type="secondary">Stale &gt;2d</Text><br />
                        <Text strong style={{ color: (settlement?.staleCount ?? 0) > 0 ? '#faad14' : undefined }}>
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
                                                {state.id}: {state.lastAttemptedLocalDate || '-'} / {state.phase || '-'} — {state.error || 'failed'}
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
                    title={<span style={{ color: '#ff4d4f' }}>Last Run Errors ({health.lastRun.errors.length})</span>}
                    size="small"
                    style={{ marginBottom: 16, borderColor: '#ffccc7' }}
                >
                    <Collapse
                        size="small"
                        items={health.lastRun.errors.map((err, idx) => ({
                            key: idx,
                            label: (
                                <Text>
                                    <Text type="secondary">Store {err.sId}</Text>
                                    {err.projectId && <Text type="secondary"> / Project {err.projectId}</Text>}
                                    <Text> — {err.error}</Text>
                                </Text>
                            ),
                            children: (
                                <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
                                    <div>Tenant ID: {err.tId}</div>
                                    <div>Store ID: {err.sId}</div>
                                    {err.projectId && <div>Project ID: {err.projectId}</div>}
                                    <div style={{ marginTop: 8, color: '#ff4d4f' }}>Error: {err.error}</div>
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
                        placeholder="Status"
                        allowClear
                        style={{ width: 120 }}
                        value={filterStatus}
                        onChange={(v) => setFilterStatus(v)}
                        options={[
                            { value: 'success', label: 'Success' },
                            { value: 'partial', label: 'Partial' },
                            { value: 'failed', label: 'Failed' },
                            { value: 'skipped', label: 'Skipped' },
                        ]}
                        size="small"
                    />
                    <Select
                        placeholder="Trigger"
                        allowClear
                        style={{ width: 120 }}
                        value={filterTrigger}
                        onChange={(v) => setFilterTrigger(v)}
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
                                            {task.error && <Text type="danger" style={{ fontSize: 11 }}>{task.error}</Text>}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* Errors */}
                            {record.errors && record.errors.length > 0 && (
                                <div>
                                    <Text strong style={{ display: 'block', marginBottom: 4, color: '#ff4d4f' }}>
                                        Errors ({record.errors.length}):
                                    </Text>
                                    {record.errors.slice(0, 10).map((err, idx) => (
                                        <div key={idx} style={{ fontFamily: 'monospace', fontSize: 11, padding: '2px 0' }}>
                                            Store {err.sId}{err.projectId ? ` / Project ${err.projectId}` : ''} — {err.error}
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
                        render: (ts: any) => <Text style={{ fontSize: 12 }}>{formatTimestamp(ts)}</Text>,
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
                        render: (_: any, record: SchedulerRunLog) => (
                            <span>
                                <Text style={{ color: '#52c41a' }}>{record.successCount}</Text>
                                {' / '}
                                <Text style={{ color: record.failedCount > 0 ? '#ff4d4f' : undefined }}>
                                    {record.failedCount}
                                </Text>
                            </span>
                        ),
                    },
                    {
                        title: 'Errors',
                        width: 70,
                        align: 'center' as const,
                        render: (_: any, record: SchedulerRunLog) => (
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
                    <Text><strong>Manual Decision Blocks Recovery:</strong> Uses <code>triggerDecisionBlocksScoring</code> callable CF for one tenant/store or project.</Text>
                    <Text><strong>Manual Analytics Backfill:</strong> Uses <code>triggerCustomerAnalyticsManually</code> callable CF for one tenant/store/project summary.</Text>
                    <Text><strong>TTL:</strong> Decision Blocks have 48h TTL — if scheduler fails 2 nights, client falls back to pinned-only mode</Text>
                </div>
            </Card>
        </div>
    );
}

export default SchedulerMonitor;
