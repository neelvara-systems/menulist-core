'use client'

import { getSchedulerDashboardSnapshot } from '@database/ops/scheduler';
import { usePlatformStoreSummaryOptions } from '@hook/usePlatformStoreSummaryOptions';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import { normalizeSchedulerRecoveryResponse, normalizeSchedulerRecoveryRunLogId } from '@lib/ops/schedulerRecoveryResponse';
import type { SchedulerHealthSummary, SchedulerRunLog, SchedulerSettlementSummary, SchedulerTaskResult } from '@lib/ops/schedulerTypes';
import { formatDateTime, type IntlFormatter } from '@util/dateTime';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuActivity, LuClock, LuPlay, LuRefreshCw, LuShieldAlert } from 'react-icons/lu';
import { Alert } from 'antd';
import { Button, Card, Dialog, DotLoading, Flex, List, Select, Tag, Text, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileSchedulerMonitorScreenProps {
    onBack: () => void;
}

const TASK_LABELS: Record<string, string> = {
    authority_maturation: 'Authority Maturation',
    customer_obp_analytics: 'OBP + Menu Settlement',
    decision_blocks: 'Decision Blocks',
    extraction_learning: 'Extraction Learning',
    feedback_intelligence: 'Feedback Intelligence',
    guest_feedback_retention: 'Feedback Retention',
    health_signals: 'Health Signals',
    lifecycle_messaging: 'Lifecycle Messaging',
    menu_drift: 'Menu Drift',
    menu_intelligence: 'Menu Intelligence',
    obp_analytics: 'OBP Analytics',
    special_menu_switching: 'Special Menu Switching',
    staleness_check: 'Staleness Check',
    store_truth_confidence: 'Store Truth Confidence',
    subscription_reconciliation: 'Subscription Reconciliation',
    weekly_narrative: 'Weekly Narrative',
};

function formatTimestamp(value: any, formatter: IntlFormatter): string {
    if (!value) return '-';
    const label = formatDateTime(value, 'datetime', formatter);
    return label === 'N/A' ? '-' : label;
}

function formatDuration(ms?: number): string {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
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

function formatTaskError(value: unknown): string {
    if (value === undefined || value === null || value === '') return '';
    return `Error recorded: ${formatDetailValue(value)}`;
}

function flattenDetails(details: Record<string, unknown> | undefined, limit = 2): string {
    if (!details) return '';
    return Object.entries(details)
        .slice(0, limit)
        .map(([key, value], index) => `${formatDetailKey(key, index)}: ${formatDetailValue(value)}`)
        .join(' · ');
}

function statusColor(status?: string): 'success' | 'warning' | 'danger' | 'default' {
    if (status === 'success' || status === 'completed' || status === 'healthy') return 'success';
    if (status === 'partial' || status === 'running' || status === 'warning') return 'warning';
    if (status === 'failed' || status === 'critical') return 'danger';
    return 'default';
}

function renderTask(task: SchedulerTaskResult) {
    const detail = formatTaskError(task.error) || flattenDetails(task.details);

    return (
        <List.Item
            key={task.name}
            description={detail ? <Text type="secondary">{detail}</Text> : undefined}
            extra={<Tag color={statusColor(task.status)}>{task.status}</Tag>}
            title={<Text>{TASK_LABELS[task.name] || task.name}</Text>}
        />
    );
}

export default function MobileSchedulerMonitorScreen({ onBack }: MobileSchedulerMonitorScreenProps) {
    const formatter = useFormatter();
    const { data: session, status } = useSession();
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const isPlatform = platformRole === 'PLATFORM';
    const [health, setHealth] = useState<SchedulerHealthSummary | null>(null);
    const [runs, setRuns] = useState<SchedulerRunLog[]>([]);
    const [settlement, setSettlement] = useState<SchedulerSettlementSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [triggering, setTriggering] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const {
        error: storesError,
        loading: storesLoading,
        selectedStore,
        selectedStoreId,
        selectOptions,
        setSelectedStoreId,
    } = usePlatformStoreSummaryOptions(isPlatform);

    const lastRun = health?.lastRun || runs[0] || null;
    const latestTasks = useMemo(() => (lastRun?.tasks || []).slice(0, 8), [lastRun?.tasks]);

    const loadData = useCallback(async () => {
        if (!isPlatform) return;
        setLoading(true);
        setLoadError(false);
        try {
            const snapshot = await getSchedulerDashboardSnapshot({ limit: 10 }, 50);
            setHealth(snapshot.health);
            setRuns(snapshot.runHistory);
            setSettlement(snapshot.settlement);
        } catch {
            setLoadError(true);
            Toast.show({ content: 'Could not load scheduler data', duration: 1800 });
        } finally {
            setLoading(false);
        }
    }, [isPlatform]);

    useEffect(() => {
        if (status === 'loading') return;
        if (!isPlatform) {
            setLoading(false);
            return;
        }
        void loadData();
    }, [isPlatform, loadData, status]);

    const handleNightlyRecovery = () => {
        if (!selectedStore) {
            Toast.show({ content: 'Select a store first', duration: 1600 });
            return;
        }
        const buildRecoveryLogContext = (metadata: Record<string, boolean | number | string | null | undefined> = {}) => ({
            surface: 'mobile_scheduler_monitor',
            flow: 'trigger_store_nightly_scheduler',
            ...getBoundedOpsStringContext('selectedStoreId', selectedStore.sId),
            ...getBoundedOpsStringContext('selectedTenantId', selectedStore.tId),
            ...metadata,
        });

        void Dialog.confirm({
            confirmText: 'Run recovery',
            content: `Run the store-level nightly scheduler for ${selectedStore.name || `store ${selectedStore.sId}`}. This settles analytics and recomputes Decision Blocks and Menu Intelligence for all active projects under this store.`,
            onConfirm: async () => {
                setTriggering(true);
                try {
                    const { getFunctions, httpsCallable } = await import('firebase/functions');
                    const triggerFn = httpsCallable(getFunctions(), 'triggerStoreNightlyScheduler', { timeout: 600000 });
                    const result = await triggerFn({ tId: selectedStore.tId, sId: selectedStore.sId });
                    const summary = normalizeSchedulerRecoveryResponse(result?.data);
                    if (!summary) throw new Error('mobile_scheduler_recovery_response_invalid');
                    Toast.show({
                        content: `${summary.status}: ${summary.successCount} DI success, ${summary.failedCount} failed`,
                        duration: 2200,
                    });
                    await loadData();
                } catch (error) {
                    const runLogId = normalizeSchedulerRecoveryRunLogId(
                        error && typeof error === 'object' && 'details' in error
                            ? (error as { details?: { runLogId?: unknown } }).details?.runLogId
                            : null,
                    );
                    logOpsFailure('mobile_scheduler_recovery_trigger_failed', error, buildRecoveryLogContext({
                        ...getBoundedOpsStringContext('runLogId', runLogId),
                    }));
                    Toast.show({ content: 'Nightly recovery failed', duration: 2600 });
                } finally {
                    setTriggering(false);
                }
            },
            title: 'Run nightly recovery?',
        });
    };

    if (status !== 'loading' && !isPlatform) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <MobileSettingsScreenHeader
                    description="Platform-only scheduler controls."
                    onBack={onBack}
                    title="Scheduler Monitor"
                />
                <Flex gap={12} style={{ padding: 16 }} vertical>
                    <Card>
                        <Flex align="center" gap={12} vertical>
                            <LuShieldAlert size={28} />
                            <Text type="secondary" style={{ textAlign: 'center' }}>This screen is available only to platform admins.</Text>
                        </Flex>
                    </Card>
                </Flex>
            </Flex>
        );
    }

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description="Nightly jobs, settlement state, and recovery controls."
                onBack={onBack}
                title="Scheduler Monitor"
            />

            <Flex gap={12} style={{ padding: 16, paddingBottom: 24 }} vertical>
                <Flex gap={8}>
                    <Button block loading={loading} onClick={() => { void loadData(); }}>
                        <Flex align="center" gap={6} justify="center">
                            <LuRefreshCw size={16} />
                            <Text>Refresh</Text>
                        </Flex>
                    </Button>
                </Flex>

                {loading ? (
                    <Card>
                        <Flex align="center" gap={8} justify="center">
                            <DotLoading color="primary" />
                            <Text type="secondary">Loading scheduler state</Text>
                        </Flex>
                    </Card>
                ) : (
                    <>
                        {loadError ? (
                            <Alert
                                message="Scheduler state unavailable"
                                description="Values may be missing or from the previous successful refresh."
                                showIcon
                                type="error"
                            />
                        ) : null}
                        <Card size="small" title={<Text strong>Manual Recovery</Text>}>
                            <Flex gap={10} vertical>
                                <Text type="secondary">Select a store from storesSummary. Recovery runs all active projects under that store.</Text>
                                <Select
                                    options={selectOptions}
                                    placeholder={storesLoading ? 'Loading stores' : 'Select store'}
                                    value={selectedStoreId}
                                    onChange={setSelectedStoreId}
                                />
                                {storesError ? <Text type="danger">Store options are unavailable. Refresh before recovery.</Text> : null}
                                {selectedStore ? (
                                    <Text type="secondary">Tenant {selectedStore.tId} · Store {selectedStore.sId}</Text>
                                ) : null}
                                <Button block color="primary" disabled={!selectedStore} loading={triggering} onClick={handleNightlyRecovery}>
                                    <Flex align="center" gap={6} justify="center">
                                        <LuPlay size={16} />
                                        <Text>Run Nightly Recovery</Text>
                                    </Flex>
                                </Button>
                            </Flex>
                        </Card>

                        <Card size="small" title={<Text strong>Health</Text>}>
                            <Flex gap={12} vertical>
                                <Flex align="center" justify="space-between">
                                    <Flex align="center" gap={8}>
                                        <LuActivity size={16} />
                                        <Text>Status</Text>
                                    </Flex>
                                    <Tag color={statusColor(health?.healthStatus)}>{health?.healthStatus || 'unknown'}</Tag>
                                </Flex>
                                <Flex align="center" justify="space-between">
                                    <Text type="secondary">Last run</Text>
                                    <Text>{formatTimestamp(lastRun?.startedAt, formatter)}</Text>
                                </Flex>
                                <Flex align="center" justify="space-between">
                                    <Text type="secondary">Duration</Text>
                                    <Text>{formatDuration(lastRun?.durationMs)}</Text>
                                </Flex>
                                <Flex align="center" justify="space-between">
                                    <Text type="secondary">Failures in a row</Text>
                                    <Text>{health?.consecutiveFailures || 0}</Text>
                                </Flex>
                            </Flex>
                        </Card>

                        <Card size="small" title={<Text strong>Settlement</Text>}>
                            <Flex gap={12} wrap>
                                <Metric label="Tracked Stores" value={settlement?.totalTrackedStores || 0} />
                                <Metric label="Latest Date" value={settlement?.latestSettledDate || '-'} />
                                <Metric label="Failed" value={settlement?.failedCount || 0} />
                                <Metric label="Stale" value={settlement?.staleCount || 0} />
                            </Flex>
                        </Card>

                        <Card size="small" title={<Text strong>Latest Tasks</Text>}>
                            {latestTasks.length ? (
                                <List>{latestTasks.map(renderTask)}</List>
                            ) : (
                                <Text type="secondary">No task details found.</Text>
                            )}
                        </Card>

                        <Card size="small" title={<Text strong>Recent Runs</Text>}>
                            {runs.length ? (
                                <List>
                                    {runs.slice(0, 8).map((run) => (
                                        <List.Item
                                            key={run.id || `${run.startedAt}`}
                                            description={(
                                                <Flex align="center" gap={6}>
                                                    <LuClock size={12} />
                                                    <Text type="secondary">{formatTimestamp(run.startedAt, formatter)} · {formatDuration(run.durationMs)}</Text>
                                                </Flex>
                                            )}
                                            extra={<Tag color={statusColor(run.status)}>{run.status}</Tag>}
                                            title={<Text>{`${run.successCount || 0} success · ${run.failedCount || 0} failed`}</Text>}
                                        />
                                    ))}
                                </List>
                            ) : (
                                <Text type="secondary">No scheduler runs found.</Text>
                            )}
                        </Card>
                    </>
                )}
            </Flex>
        </Flex>
    );
}

function Metric({ label, value }: { label: string; value: number | string }) {
    return (
        <Flex
            gap={2}
            style={{
                background: 'var(--ant-color-fill-tertiary)',
                border: '1px solid var(--ant-color-border-secondary)',
                borderRadius: 8,
                flex: '1 1 45%',
                minHeight: 72,
                minWidth: 120,
                padding: 10,
            }}
            vertical
        >
            <Text type="secondary">{label}</Text>
            <Title level={4} style={{ margin: 0 }}>{value}</Title>
        </Flex>
    );
}
