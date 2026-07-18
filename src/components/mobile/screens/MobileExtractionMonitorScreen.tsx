'use client'

import { FEATURE_FLAGS } from '@config/features';
import {
    getExtractionDashboardSnapshot,
} from '@database/ops/extraction';
import type {
    ExtractionCostMetrics,
    ExtractionHealthMetrics,
    ExtractionJobSummary,
    ExtractionQualityMetrics,
} from '@lib/ops/extractionTypes';
import { formatDateTime, type IntlFormatter } from '@util/dateTime';
import { formatInrPaise } from '@util/formatters';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { LuActivity, LuAlertTriangle, LuClock, LuRefreshCw, LuShieldAlert } from 'react-icons/lu';
import { Alert } from 'antd';
import { Button, Card, DotLoading, Flex, List, Tag, Text, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileExtractionMonitorScreenProps {
    onBack: () => void;
}

type JobFilter = 'all' | 'failed' | 'processing' | 'completed';

function statusColor(status?: string): 'success' | 'warning' | 'danger' | 'primary' | 'default' {
    if (status === 'completed' || status === 'preview_ready' || status === 'healthy') return 'success';
    if (status === 'processing' || status === 'pending' || status === 'warning') return 'warning';
    if (status === 'failed' || status === 'critical') return 'danger';
    if (status === 'cancelled' || status === 'unknown') return 'default';
    return 'primary';
}

function formatTimestamp(value: any, formatter: IntlFormatter): string {
    if (!value) return '-';
    const label = formatDateTime(value, 'datetime', formatter);
    return label === 'N/A' ? '-' : label;
}

function formatDuration(ms?: number | null): string {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function filterToStatus(filter: JobFilter): string | undefined {
    if (filter === 'all') return undefined;
    return filter;
}

function formatInrCost(value: number | undefined): string {
    return formatInrPaise(value, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    });
}

export default function MobileExtractionMonitorScreen({ onBack }: MobileExtractionMonitorScreenProps) {
    const formatter = useFormatter();
    const { data: session, status } = useSession();
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const isPlatform = platformRole === 'PLATFORM';
    const isEnabled = FEATURE_FLAGS.ENABLE_EXTRACTION_MONITORING_DASHBOARD;
    const [loading, setLoading] = useState(true);
    const [health, setHealth] = useState<ExtractionHealthMetrics | null>(null);
    const [quality, setQuality] = useState<ExtractionQualityMetrics | null>(null);
    const [cost, setCost] = useState<ExtractionCostMetrics | null>(null);
    const [jobs, setJobs] = useState<ExtractionJobSummary[]>([]);
    const [jobFilter, setJobFilter] = useState<JobFilter>('all');
    const [loadError, setLoadError] = useState(false);

    const loadData = useCallback(async () => {
        if (!isPlatform || !isEnabled) return;
        setLoading(true);
        setLoadError(false);
        try {
            const snapshot = await getExtractionDashboardSnapshot({ status: filterToStatus(jobFilter), pageSize: 20 });
            setHealth(snapshot.health);
            setQuality(snapshot.quality);
            setCost(snapshot.cost);
            setJobs(snapshot.jobs);
        } catch {
            setLoadError(true);
            Toast.show({ content: 'Could not load extraction data', duration: 1800 });
        } finally {
            setLoading(false);
        }
    }, [isEnabled, isPlatform, jobFilter]);

    useEffect(() => {
        if (status === 'loading') return;
        if (!isPlatform || !isEnabled) {
            setLoading(false);
            return;
        }
        void loadData();
    }, [isEnabled, isPlatform, loadData, status]);

    if (!isEnabled) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <MobileSettingsScreenHeader
                    description="Extraction monitoring is disabled by feature flag."
                    onBack={onBack}
                    title="Extraction Monitor"
                />
                <Flex gap={12} style={{ padding: 16 }} vertical>
                    <Card>
                        <Text type="secondary">Enable ENABLE_EXTRACTION_MONITORING_DASHBOARD to use this screen.</Text>
                    </Card>
                </Flex>
            </Flex>
        );
    }

    if (status !== 'loading' && !isPlatform) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <MobileSettingsScreenHeader
                    description="Platform-only extraction monitoring."
                    onBack={onBack}
                    title="Extraction Monitor"
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
                description="Extraction health, cost, quality, and recent job failures."
                onBack={onBack}
                title="Extraction Monitor"
            />
            <Flex gap={12} style={{ padding: 16, paddingBottom: 24 }} vertical>
                <Button block loading={loading} onClick={() => { void loadData(); }}>
                    <Flex align="center" gap={6} justify="center">
                        <LuRefreshCw size={16} />
                        <Text>Refresh</Text>
                    </Flex>
                </Button>

                {loading ? (
                    <Card>
                        <Flex align="center" gap={8} justify="center">
                            <DotLoading color="primary" />
                            <Text type="secondary">Loading extraction state</Text>
                        </Flex>
                    </Card>
                ) : (
                    <>
                        {loadError ? (
                            <Alert
                                message="Extraction state unavailable"
                                description={health ? 'Showing the previous successful snapshot.' : 'No current extraction snapshot could be verified.'}
                                showIcon
                                type="error"
                            />
                        ) : null}
                        {loadError && !health ? null : (
                        <>
                        <Card size="small" title={<Text strong>Health</Text>}>
                            <Flex gap={12} vertical>
                                <Flex align="center" justify="space-between">
                                    <Flex align="center" gap={8}>
                                        <LuActivity size={16} />
                                        <Text>Status</Text>
                                    </Flex>
                                    <Tag color={statusColor(health?.healthStatus)}>{health?.healthStatus || 'unknown'}</Tag>
                                </Flex>
                                <Flex gap={12} wrap>
                                    <Metric label="Active Jobs" value={health?.activeJobs ?? 0} />
                                    <Metric label="Failed 24h" value={`${health?.failedJobs24h ?? 0} / ${health?.totalJobs24h ?? 0}`} />
                                    <Metric label="Failure Rate" value={`${health?.failureRate ?? 0}%`} />
                                    <Metric label="Avg Processing" value={`${health?.avgProcessingTime ?? 0}s`} />
                                    <Metric label="Avg Quality" value={`${health?.avgQualityScore ?? 0}/100`} />
                                </Flex>
                            </Flex>
                        </Card>

                        <Card size="small" title={<Text strong>Cost Today</Text>}>
                            <Flex gap={12} wrap>
                                <Metric label="Calls" value={cost?.callsToday ?? 0} />
                                <Metric label="Spend" value={formatInrCost(cost?.dailySpend)} />
                                <Metric label="Avg / Job" value={formatInrCost(cost?.avgCostPerExtraction)} />
                                <Metric label="Highest Job" value={formatInrCost(cost?.mostExpensiveJobCost)} />
                            </Flex>
                        </Card>

                        <Card size="small" title={<Text strong>Quality</Text>}>
                            <Flex gap={12} wrap>
                                <Metric label="Avg Score" value={`${quality?.avgScore ?? 0}/100`} />
                                <Metric label="High Confidence" value={quality?.confidenceDistribution.high ?? 0} />
                                <Metric label="Medium" value={quality?.confidenceDistribution.medium ?? 0} />
                                <Metric label="Low" value={quality?.confidenceDistribution.low ?? 0} />
                                <Metric label="Low Quality Rate" value={`${quality?.lowQualityRate ?? 0}%`} />
                            </Flex>
                        </Card>

                        <Card size="small" title={<Text strong>Recent Jobs</Text>}>
                            <Flex gap={8} wrap style={{ marginBottom: 12 }}>
                                {(['all', 'failed', 'processing', 'completed'] as JobFilter[]).map((filter) => (
                                    <Button
                                        key={filter}
                                        color={jobFilter === filter ? 'primary' : 'default'}
                                        fill={jobFilter === filter ? 'solid' : 'outline'}
                                        onClick={() => setJobFilter(filter)}
                                        size="small"
                                    >
                                        {filter}
                                    </Button>
                                ))}
                            </Flex>
                            {jobs.length ? (
                                <List>
                                    {jobs.slice(0, 12).map((job) => (
                                        <List.Item
                                            key={job.id}
                                            description={(
                                                <Flex gap={4} vertical>
                                                    <Flex align="center" gap={6}>
                                                        <LuClock size={12} />
                                                        <Text type="secondary">{formatTimestamp(job.createdAt, formatter)} · {formatDuration(job.processingTime)}</Text>
                                                    </Flex>
                                                    <Text type="secondary">
                                                        {job.filesCount} files · {job.itemsExtracted || 0} items · {job.categoriesExtracted || 0} categories
                                                    </Text>
                                                    {job.errorMessage ? (
                                                        <Flex align="center" gap={6}>
                                                            <LuAlertTriangle size={12} />
                                                            <Text type="secondary">{job.errorMessage}</Text>
                                                        </Flex>
                                                    ) : null}
                                                </Flex>
                                            )}
                                            extra={<Tag color={statusColor(job.status)}>{job.status}</Tag>}
                                            title={<Text>{job.id.slice(0, 10)} · Quality {job.qualityScore ?? '-'}</Text>}
                                        />
                                    ))}
                                </List>
                            ) : (
                                <Text type="secondary">No extraction jobs found.</Text>
                            )}
                        </Card>
                        </>
                        )}
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
