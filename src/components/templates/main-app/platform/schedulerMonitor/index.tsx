'use client'

import { getSchedulerHealthSummary, getSchedulerRunHistory } from '@database/ops/scheduler';
import type { SchedulerHealthSummary, SchedulerRunFilter, SchedulerRunLog, SchedulerRunStatus, SchedulerTaskResult, SchedulerTrigger } from '@lib/ops/schedulerTypes';
import { Button, Card, Collapse, Divider, Modal, Select, Spin, Table, Tag, Typography, message } from 'antd';
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
 * - Run history table with status/trigger filters
 * - Error details (expandable rows)
 * - Manual trigger button (calls triggerDecisionBlocksScoring CF)
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
    const [triggerLoading, setTriggerLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<SchedulerRunStatus | undefined>(undefined);
    const [filterTrigger, setFilterTrigger] = useState<SchedulerTrigger | undefined>(undefined);

    // Gate: superadmin only
    if (session && (session as any).platformRole !== 'PLATFORM') {
        redirect('/dashboard');
    }

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const filter: SchedulerRunFilter = { limit: 20 };
            if (filterStatus) filter.status = filterStatus;
            if (filterTrigger) filter.trigger = filterTrigger;

            const [healthData, historyData] = await Promise.all([
                getSchedulerHealthSummary(),
                getSchedulerRunHistory(filter),
            ]);
            setHealth(healthData);
            setRunHistory(historyData);
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

    // Manual trigger
    const handleManualTrigger = async () => {
        Modal.confirm({
            title: 'Trigger Nightly Scheduler Manually',
            content: (
                <div>
                    <p>This will run the full nightly scheduler immediately — all 8 tasks including Decision Blocks, Menu Intelligence, Authority Maturation, etc.</p>
                    <p><strong>This may take up to 9 minutes.</strong> The page will refresh when complete.</p>
                </div>
            ),
            okText: 'Run Scheduler Now',
            okButtonProps: { type: 'primary' },
            onOk: async () => {
                setTriggerLoading(true);
                try {
                    const { getFunctions, httpsCallable } = await import('firebase/functions');
                    const fns = getFunctions();
                    const triggerFn = httpsCallable(fns, 'triggerDecisionBlocksScoring', { timeout: 600000 });
                    const result: any = await triggerFn({});
                    const data = result.data;
                    message.success(
                        `Scheduler complete: ${data.successCount || 0} success, ${data.failedCount || 0} failed`
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
                    <Button
                        type="primary"
                        onClick={handleManualTrigger}
                        loading={triggerLoading}
                    >
                        Run Scheduler Now
                    </Button>
                </div>
            </div>

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

            {/* Section 3: Last Run Errors (if any) */}
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

            {/* Section 4: Run History with Filters */}
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
                    <Text><strong>Tasks:</strong> 16+ sub-tasks (DI, CMI, Authority, Drift, Feedback Retention, Billing Reconciliation, OBP, Messaging, Special Menus, Infra Compounding ×3, Reseller, AI Insights ×4, Canonica)</Text>
                    <Text><strong>Dead Man Switch:</strong> Telegram alert fires on completion — if no alert, scheduler did not finish</Text>
                    <Text><strong>Mismatch Alert:</strong> Warns if expected store count ≠ processed count</Text>
                    <Text><strong>Manual Trigger:</strong> Uses <code>triggerDecisionBlocksScoring</code> callable CF — processes all stores/projects</Text>
                    <Text><strong>TTL:</strong> Decision Blocks have 48h TTL — if scheduler fails 2 nights, client falls back to pinned-only mode</Text>
                </div>
            </Card>
        </div>
    );
}

export default SchedulerMonitor;
