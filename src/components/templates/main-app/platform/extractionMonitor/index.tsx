'use client';

/**
 * Extraction Monitor Dashboard
 * 
 * Internal-only dashboard for monitoring extraction pipeline health.
 * Route: /ops/extraction
 * Access: platformRole === 'PLATFORM' only
 * 
 * Sections:
 * 1. Health Overview — active/pending/failed counts, avg time, failure rate
 * 2. Quality Metrics — avg score, confidence distribution, low quality rate
 * 3. Job Feed — recent jobs with status, scores, timing
 * 
 * @see __docs__/ai-extraction-monitoring/
 */

import { FEATURE_FLAGS } from '@config/features';
import {
    getExtractionHealthMetrics,
    getExtractionQualityMetrics,
    getRecentExtractionJobs,
} from '@database/ops/extraction';
import type {
    ExtractionHealthMetrics,
    ExtractionJobSummary,
    ExtractionQualityMetrics,
} from '@lib/ops/extractionTypes';
import { Button, Card, Empty, notification, Spin, Statistic, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { LuActivity, LuAlertTriangle, LuCheckCircle, LuClock, LuEye, LuRefreshCw, LuXCircle } from 'react-icons/lu';
import CostMonitor from './CostMonitor';
import JobInspector from './JobInspector';

const { Title, Text } = Typography;

// ================================================================
// HEALTH STATUS BADGE
// ================================================================

function HealthBadge({ status }: { status: ExtractionHealthMetrics['healthStatus'] }) {
    const config = {
        healthy: { color: 'green' as const, text: 'Healthy', icon: <LuCheckCircle /> },
        warning: { color: 'orange' as const, text: 'Warning', icon: <LuAlertTriangle /> },
        critical: { color: 'red' as const, text: 'Critical', icon: <LuXCircle /> },
        unknown: { color: 'default' as const, text: 'No Data', icon: <LuActivity /> },
    };
    const c = config[status];
    return <Tag color={c.color} icon={c.icon}>{c.text}</Tag>;
}

// ================================================================
// STATUS TAG
// ================================================================

function StatusTag({ status }: { status: string }) {
    const colorMap: Record<string, string> = {
        pending: 'blue',
        processing: 'orange',
        completed: 'green',
        preview_ready: 'cyan',
        failed: 'red',
        cancelled: 'default',
        cancelling: 'orange',
    };
    return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
}

// ================================================================
// MAIN COMPONENT
// ================================================================

export default function ExtractionMonitor() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [health, setHealth] = useState<ExtractionHealthMetrics | null>(null);
    const [quality, setQuality] = useState<ExtractionQualityMetrics | null>(null);
    const [jobs, setJobs] = useState<ExtractionJobSummary[]>([]);
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [refreshCounter, setRefreshCounter] = useState(0);

    const isEnabled = FEATURE_FLAGS.ENABLE_EXTRACTION_MONITORING_DASHBOARD;
    const isPlatform = (session as any)?.platformRole === 'PLATFORM';

    const fetchData = useCallback(async () => {
        if (!isEnabled) return;
        setLoading(true);
        try {
            const [healthData, qualityData, jobsData] = await Promise.all([
                getExtractionHealthMetrics(),
                getExtractionQualityMetrics(50),
                getRecentExtractionJobs({ status: statusFilter, pageSize: 30 }),
            ]);
            setHealth(healthData);
            setQuality(qualityData);
            setJobs(jobsData);
        } catch (error: any) {
            notification.error({
                message: 'Failed to load extraction data',
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    }, [statusFilter, isEnabled]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Feature flag check (after hooks)
    if (!isEnabled) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <Empty description="Extraction Monitor is disabled. Enable ENABLE_EXTRACTION_MONITORING_DASHBOARD flag." />
            </div>
        );
    }

    // Access check (after hooks)
    if (session && !isPlatform) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <Empty description="Access restricted to platform administrators." />
            </div>
        );
    }

    // ================================================================
    // TABLE COLUMNS
    // ================================================================

    const columns: ColumnsType<ExtractionJobSummary> = [
        {
            title: 'Job ID',
            dataIndex: 'id',
            key: 'id',
            width: 100,
            render: (id: string) => (
                <Tooltip title={id}>
                    <Text copyable={{ text: id }} style={{ fontSize: 12 }}>
                        {id.substring(0, 8)}...
                    </Text>
                </Tooltip>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: string) => <StatusTag status={status} />,
            filters: [
                { text: 'Completed', value: 'completed' },
                { text: 'Failed', value: 'failed' },
                { text: 'Processing', value: 'processing' },
                { text: 'Preview Ready', value: 'preview_ready' },
            ],
            onFilter: (value, record) => record.status === value,
        },
        {
            title: 'Files',
            dataIndex: 'filesCount',
            key: 'filesCount',
            width: 70,
            align: 'center' as const,
        },
        {
            title: 'Items',
            dataIndex: 'itemsExtracted',
            key: 'items',
            width: 70,
            align: 'center' as const,
            render: (val: number) => val || '—',
        },
        {
            title: 'Categories',
            dataIndex: 'categoriesExtracted',
            key: 'categories',
            width: 90,
            align: 'center' as const,
            render: (val: number) => val || '—',
        },
        {
            title: 'Quality',
            dataIndex: 'qualityScore',
            key: 'quality',
            width: 80,
            align: 'center' as const,
            render: (score: number | null) => {
                if (score == null) return '—';
                const color = score >= 70 ? 'green' : score >= 40 ? 'orange' : 'red';
                return <Tag color={color}>{score}</Tag>;
            },
            sorter: (a, b) => (a.qualityScore ?? 0) - (b.qualityScore ?? 0),
        },
        {
            title: 'Time',
            dataIndex: 'processingTime',
            key: 'time',
            width: 80,
            align: 'center' as const,
            render: (ms: number | null) => {
                if (ms == null) return '—';
                return `${Math.round(ms / 1000)}s`;
            },
        },
        {
            title: 'Type',
            dataIndex: 'isFirstExtraction',
            key: 'type',
            width: 90,
            render: (isFirst: boolean | null) => {
                if (isFirst === true) return <Tag color="blue">First</Tag>;
                if (isFirst === false) return <Tag color="purple">Re-extract</Tag>;
                return '—';
            },
        },
        {
            title: 'Error',
            dataIndex: 'errorMessage',
            key: 'error',
            width: 200,
            ellipsis: true,
            render: (msg: string | null) => msg ? <Text type="danger" style={{ fontSize: 12 }}>{msg}</Text> : null,
        },
        {
            title: '',
            key: 'actions',
            width: 70,
            render: (_: any, record: ExtractionJobSummary) => (
                <Button
                    size="small"
                    type="link"
                    icon={<LuEye />}
                    onClick={() => setSelectedJobId(record.id)}
                >
                    View
                </Button>
            ),
        },
    ];

    // ================================================================
    // RENDER
    // ================================================================

    return (
        <div style={{ padding: '24px', maxWidth: 1400 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>Extraction Monitor</Title>
                    <Text type="secondary">Internal pipeline health dashboard</Text>
                </div>
                <Button
                    icon={<LuRefreshCw />}
                    onClick={() => { fetchData(); setRefreshCounter(c => c + 1); }}
                    loading={loading}
                >
                    Refresh
                </Button>
            </div>

            {loading && !health ? (
                <div style={{ textAlign: 'center', padding: 80 }}>
                    <Spin size="large" />
                </div>
            ) : (
                <>
                    {/* Health Overview Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                        <Card size="small">
                            <Statistic
                                title="Health"
                                valueRender={() => health ? <HealthBadge status={health.healthStatus} /> : '—'}
                            />
                        </Card>
                        <Card size="small">
                            <Statistic
                                title="Active Jobs"
                                value={health?.activeJobs ?? 0}
                                prefix={<LuClock />}
                            />
                        </Card>
                        <Card size="small">
                            <Statistic
                                title="Failed (24h)"
                                value={health?.failedJobs24h ?? 0}
                                valueStyle={{ color: (health?.failedJobs24h ?? 0) > 0 ? '#ff4d4f' : undefined }}
                                suffix={health?.totalJobs24h ? `/ ${health.totalJobs24h}` : ''}
                            />
                        </Card>
                        <Card size="small">
                            <Statistic
                                title="Failure Rate"
                                value={health?.failureRate ?? 0}
                                suffix="%"
                                valueStyle={{ color: (health?.failureRate ?? 0) > 5 ? '#ff4d4f' : (health?.failureRate ?? 0) > 2 ? '#faad14' : '#52c41a' }}
                            />
                        </Card>
                        <Card size="small">
                            <Statistic
                                title="Avg Processing"
                                value={health?.avgProcessingTime ?? 0}
                                suffix="s"
                            />
                        </Card>
                        <Card size="small">
                            <Statistic
                                title="Avg Quality"
                                value={health?.avgQualityScore ?? 0}
                                suffix="/ 100"
                                valueStyle={{ color: (health?.avgQualityScore ?? 0) < 55 ? '#ff4d4f' : undefined }}
                            />
                        </Card>
                    </div>

                    {/* Quality Metrics */}
                    {quality && quality.totalJobsAnalyzed > 0 && (
                        <Card size="small" title="Quality Distribution (last 50 jobs)" style={{ marginBottom: 24 }}>
                            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                <Statistic title="Avg Score" value={quality.avgScore} suffix="/ 100" />
                                <Statistic title="High Confidence Items" value={quality.confidenceDistribution.high} valueStyle={{ color: '#52c41a' }} />
                                <Statistic title="Medium" value={quality.confidenceDistribution.medium} valueStyle={{ color: '#faad14' }} />
                                <Statistic title="Low" value={quality.confidenceDistribution.low} valueStyle={{ color: '#ff4d4f' }} />
                                <Statistic title="Low Quality Rate" value={quality.lowQualityRate} suffix="%" />
                                <Statistic title="Jobs Analyzed" value={quality.totalJobsAnalyzed} />
                            </div>
                        </Card>
                    )}

                    {/* Cost Monitor */}
                    <CostMonitor refreshTrigger={refreshCounter} />

                    {/* Job Feed */}
                    <Card
                        size="small"
                        title={`Recent Extraction Jobs (${jobs.length})`}
                    >
                        <Table
                            dataSource={jobs}
                            columns={columns}
                            rowKey="id"
                            size="small"
                            pagination={{ pageSize: 15 }}
                            scroll={{ x: 1100 }}
                            loading={loading}
                            locale={{ emptyText: 'No extraction jobs found' }}
                        />
                    </Card>
                </>
            )}

            {/* Job Inspector Drawer */}
            <JobInspector
                jobId={selectedJobId}
                open={!!selectedJobId}
                onClose={() => setSelectedJobId(null)}
                onRetrySuccess={() => { fetchData(); setRefreshCounter(c => c + 1); }}
            />
        </div>
    );
}
