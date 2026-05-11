'use client'

import { getSchedulerHealthSummary, getSchedulerRunHistory, getSchedulerSettlementSummary } from '@database/ops/scheduler';
import { usePlatformStoreSummaryOptions } from '@hook/usePlatformStoreSummaryOptions';
import type { SchedulerHealthSummary, SchedulerRunLog, SchedulerSettlementSummary, SchedulerTaskResult } from '@lib/ops/schedulerTypes';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuActivity, LuClock, LuPlay, LuRefreshCw, LuShieldAlert } from 'react-icons/lu';
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

function formatTimestamp(value: any): string {
    if (!value) return '-';
    try {
        const date = value.toDate ? value.toDate() : new Date(value.seconds ? value.seconds * 1000 : value);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            hour: '2-digit',
            hour12: true,
            minute: '2-digit',
            month: 'short',
        });
    } catch {
        return '-';
    }
}

function formatDuration(ms?: number): string {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function statusColor(status?: string): 'success' | 'warning' | 'danger' | 'default' {
    if (status === 'success' || status === 'completed' || status === 'healthy') return 'success';
    if (status === 'partial' || status === 'running' || status === 'warning') return 'warning';
    if (status === 'failed' || status === 'critical') return 'danger';
    return 'default';
}

function renderTask(task: SchedulerTaskResult) {
    const detail = task.error || Object.entries(task.details || {})
        .slice(0, 2)
        .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
        .join(' · ');

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
    const { data: session, status } = useSession();
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const isPlatform = platformRole === 'PLATFORM';
    const [health, setHealth] = useState<SchedulerHealthSummary | null>(null);
    const [runs, setRuns] = useState<SchedulerRunLog[]>([]);
    const [settlement, setSettlement] = useState<SchedulerSettlementSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [triggering, setTriggering] = useState(false);
    const {
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
        try {
            const [healthData, runData, settlementData] = await Promise.all([
                getSchedulerHealthSummary(),
                getSchedulerRunHistory({ limit: 10 }),
                getSchedulerSettlementSummary(50),
            ]);
            setHealth(healthData);
            setRuns(runData);
            setSettlement(settlementData);
        } catch {
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

        void Dialog.confirm({
            confirmText: 'Run recovery',
            content: `Run the store-level nightly scheduler for ${selectedStore.name || `store ${selectedStore.sId}`}. This settles analytics and recomputes Decision Blocks and Menu Intelligence for all active projects under this store.`,
            onConfirm: async () => {
                setTriggering(true);
                try {
                    const { getFunctions, httpsCallable } = await import('firebase/functions');
                    const triggerFn = httpsCallable(getFunctions(), 'triggerStoreNightlyScheduler', { timeout: 600000 });
                    const result: any = await triggerFn({ tId: selectedStore.tId, sId: selectedStore.sId });
                    const summary = result?.data || {};
                    Toast.show({
                        content: `Done: ${summary.successCount || 0} DI success, ${summary.failedCount || 0} failed`,
                        duration: 2200,
                    });
                    await loadData();
                } catch (error: any) {
                    Toast.show({ content: error?.message || 'Nightly recovery failed', duration: 2200 });
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
                        <Card size="small" title={<Text strong>Manual Recovery</Text>}>
                            <Flex gap={10} vertical>
                                <Text type="secondary">Select a store from storesSummary. Recovery runs all active projects under that store.</Text>
                                <Select
                                    options={selectOptions}
                                    placeholder={storesLoading ? 'Loading stores' : 'Select store'}
                                    value={selectedStoreId}
                                    onChange={setSelectedStoreId}
                                />
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
                                    <Text>{formatTimestamp(lastRun?.startedAt)}</Text>
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
                                                    <Text type="secondary">{formatTimestamp(run.startedAt)} · {formatDuration(run.durationMs)}</Text>
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
