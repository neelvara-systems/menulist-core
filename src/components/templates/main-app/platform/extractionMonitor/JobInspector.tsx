'use client';

/**
 * Job Inspector — Drawer for inspecting extraction job details
 * 
 * Opens from the job feed table. Shows:
 * Tab 1: Overview — metadata, per-file results, error details
 * Tab 2: AI Response — raw combinedData as JSON tree
 * Tab 3: Cost — token usage, credits, charge
 * 
 * Actions: Retry (for failed jobs), Copy Job ID, Copy Raw Data
 * 
 * @see __docs__/ai-extraction-monitoring/
 */

import {
    getExtractionJobDetails,
    retryExtractionJob,
} from '@database/ops/extraction';
import type { ExtractionJobDetails } from '@lib/ops/extractionTypes';
import { formatInrPaise } from '@util/formatters';
import {
    Button,
    Descriptions,
    Drawer,
    Empty,
    notification,
    Popconfirm,
    Spin,
    Statistic,
    Table,
    Tabs,
    Tag,
    Typography,
    theme,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { LuCopy, LuRefreshCw } from 'react-icons/lu';

const { Text } = Typography;

function PipelineTag({ value }: { value?: string | null }) {
    if (!value) return <>—</>;
    const colorMap: Record<string, string> = {
        messaging_onboarding: 'geekblue',
        project: 'blue',
        public_menu_draft: 'green',
        menu_link_import: 'purple',
        owner_upload: 'cyan',
        public_create_menu: 'green',
        MESSAGING_ONBOARDING: 'geekblue',
    };
    return <Tag color={colorMap[value] || 'default'}>{value.replace(/_/g, ' ')}</Tag>;
}

interface JobInspectorProps {
    jobId: string | null;
    open: boolean;
    onClose: () => void;
    onRetrySuccess?: () => void;
}

export default function JobInspector({ jobId, open, onClose, onRetrySuccess }: JobInspectorProps) {
    const { token } = theme.useToken();
    const [loading, setLoading] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [job, setJob] = useState<ExtractionJobDetails | null>(null);

    const fetchJob = useCallback(async () => {
        if (!jobId) return;
        setLoading(true);
        try {
            const details = await getExtractionJobDetails(jobId);
            setJob(details);
        } catch (error: any) {
            notification.error({ message: 'Failed to load job details', description: error.message });
        } finally {
            setLoading(false);
        }
    }, [jobId]);

    useEffect(() => {
        if (open && jobId) {
            fetchJob();
        } else {
            setJob(null);
        }
    }, [open, jobId, fetchJob]);

    const handleRetry = async () => {
        if (!jobId) return;
        setRetrying(true);
        try {
            const newJobId = await retryExtractionJob(jobId);
            notification.success({ message: 'Retry started', description: `New job: ${newJobId.substring(0, 12)}...` });
            onRetrySuccess?.();
            onClose();
        } catch (error: any) {
            notification.error({ message: 'Retry failed', description: error.message });
        } finally {
            setRetrying(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        notification.success({ message: `${label} copied to clipboard`, duration: 2 });
    };

    // ================================================================
    // TAB 1: OVERVIEW
    // ================================================================

    const OverviewTab = () => {
        if (!job) return <Empty description="No data" />;

        const statusColor: Record<string, string> = {
            pending: 'blue', processing: 'orange', completed: 'green',
            preview_ready: 'cyan', failed: 'red', cancelled: 'default',
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Descriptions size="small" column={2} bordered>
                    <Descriptions.Item label="Job ID">
                        <Text copyable={{ text: job.id }}>{job.id}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                        <Tag color={statusColor[job.status] || 'default'}>{job.status}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Project ID">
                        <Text copyable={{ text: job.projectId }}>{job.projectId}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Tenant / Store">
                        {job.tId} / {job.sId}
                    </Descriptions.Item>
                    <Descriptions.Item label="Files">{job.filesCount}</Descriptions.Item>
                    <Descriptions.Item label="Items Extracted">{job.itemsExtracted || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Categories">{job.categoriesExtracted || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Quality Score">
                        {job.qualityScore != null ? (
                            <Tag color={job.qualityScore >= 70 ? 'green' : job.qualityScore >= 40 ? 'orange' : 'red'}>
                                {job.qualityScore}
                            </Tag>
                        ) : '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Processing Time">
                        {job.processingTime != null ? `${Math.round(job.processingTime / 1000)}s` : '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Type">
                        {job.isFirstExtraction === true ? 'First Extraction' : job.isFirstExtraction === false ? 'Re-extraction' : '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Destination">
                        <PipelineTag value={job.destinationType || job.destination?.type} />
                    </Descriptions.Item>
                    <Descriptions.Item label="Source">
                        <PipelineTag value={job.source} />
                    </Descriptions.Item>
                    <Descriptions.Item label="Skip Project Save">
                        {job.skipProjectSave ? <Tag color="orange">Yes</Tag> : <Tag>No</Tag>}
                    </Descriptions.Item>
                </Descriptions>

                {/* Per-file results */}
                {job.fileResults && Object.keys(job.fileResults).length > 0 && (
                    <div>
                        <Text strong style={{ marginBottom: 8, display: 'block' }}>Per-File Results</Text>
                        <Table
                            size="small"
                            pagination={false}
                            dataSource={Object.entries(job.fileResults).map(([uid, res]) => ({
                                key: uid,
                                uid: uid.substring(0, 12) + '...',
                                categories: res.categoriesCount,
                                items: res.itemsCount,
                            }))}
                            columns={[
                                { title: 'File UID', dataIndex: 'uid', key: 'uid' },
                                { title: 'Categories', dataIndex: 'categories', key: 'categories', align: 'center' as const },
                                { title: 'Items', dataIndex: 'items', key: 'items', align: 'center' as const },
                            ]}
                        />
                    </div>
                )}

                {/* Error details */}
                {job.error && (
                    <div style={{ background: token.colorErrorBg, padding: 12, borderRadius: 6, border: `1px solid ${token.colorErrorBorder}` }}>
                        <Text strong type="danger" style={{ display: 'block', marginBottom: 4 }}>Error Details</Text>
                        <Text type="danger">{job.error.message}</Text>
                        <div style={{ marginTop: 4, display: 'flex', gap: 8 }}>
                            <Tag>{job.error.code}</Tag>
                            <Tag color={job.error.retryable ? 'green' : 'red'}>
                                {job.error.retryable ? 'Retryable' : 'Not Retryable'}
                            </Tag>
                        </div>
                    </div>
                )}

                {/* Quality breakdown */}
                {job.result?.qualityDetails && (
                    <div>
                        <Text strong style={{ marginBottom: 8, display: 'block' }}>Quality Breakdown</Text>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <Statistic title="Category" value={job.result.qualityDetails.categoryQuality} suffix="/ 25" />
                            <Statistic title="Item" value={job.result.qualityDetails.itemQuality} suffix="/ 10" />
                            <Statistic title="Price" value={job.result.qualityDetails.priceQuality} suffix="/ 50" />
                            <Statistic title="Description" value={job.result.qualityDetails.descriptionQuality} suffix="/ 25" />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ================================================================
    // TAB 2: AI RESPONSE (JSON)
    // ================================================================

    const AIResponseTab = () => {
        if (!job?.result?.combinedData && !job?.result?.rawBatchResponses?.length) return <Empty description="No AI response data" />;

        const combinedJson = JSON.stringify(job.result.combinedData || null, null, 2);
        const rawResponsesJson = JSON.stringify(job.result.rawBatchResponses || [], null, 2);

        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <Button
                        size="small"
                        icon={<LuCopy />}
                        onClick={() => copyToClipboard(combinedJson, 'Normalized AI data')}
                    >
                        Copy Normalized Data
                    </Button>
                </div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Normalized Extraction Output</Text>
                <pre style={{
                    background: token.colorFillAlter,
                    padding: 12,
                    borderRadius: 6,
                    fontSize: 11,
                    maxHeight: 500,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                }}>
                    {combinedJson}
                </pre>

                {job.result.rawBatchResponses?.length ? (
                    <div style={{ marginTop: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                            <Text strong>Raw Provider Responses</Text>
                            <Button
                                size="small"
                                icon={<LuCopy />}
                                onClick={() => copyToClipboard(rawResponsesJson, 'Raw provider responses')}
                            >
                                Copy Raw Responses
                            </Button>
                        </div>
                        <pre style={{
                            background: token.colorFillAlter,
                            padding: 12,
                            borderRadius: 6,
                            fontSize: 11,
                            maxHeight: 360,
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                        }}>
                            {rawResponsesJson}
                        </pre>
                    </div>
                ) : null}

                {/* Confidence summary */}
                {job.result.confidenceSummary && (
                    <div style={{ marginTop: 16 }}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Confidence Summary</Text>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <Statistic title="High" value={job.result.confidenceSummary.highConfidenceCount} valueStyle={{ color: token.colorSuccess }} />
                            <Statistic title="Medium" value={job.result.confidenceSummary.mediumConfidenceCount} valueStyle={{ color: token.colorWarning }} />
                            <Statistic title="Low" value={job.result.confidenceSummary.lowConfidenceCount} valueStyle={{ color: token.colorError }} />
                            <Statistic title="Avg Score" value={Math.round(job.result.confidenceSummary.averageConfidenceScore * 100) / 100} />
                        </div>
                    </div>
                )}

                {/* Model + prompt version */}
                {(job.result.model || job.result.promptVersion) && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        {job.result.model && <Tag>Model: {job.result.model}</Tag>}
                        {job.result.promptVersion && <Tag>Prompt v{job.result.promptVersion}</Tag>}
                    </div>
                )}
            </div>
        );
    };

    // ================================================================
    // TAB 3: COST
    // ================================================================

    const CostTab = () => {
        if (!job?.transaction) return <Empty description="No cost data available" />;
        const tokenUsage = job.transaction.tokenUsage;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <Statistic title="Owner Units" value={job.transaction.unitsConsumed || 0} />
                    <Statistic title="Token Credits (Audit)" value={job.transaction.totalCredits} />
                    <Statistic
                        title="Estimated AI Cost"
                        value={formatInrPaise(job.transaction.totalCharge, {
                            maximumFractionDigits: 2,
                            minimumFractionDigits: 2,
                        })}
                    />
                    <Statistic title="Transaction ID" valueRender={() => (
                        <Text copyable={{ text: job.transaction!.transactionId }} style={{ fontSize: 14 }}>
                            {job.transaction!.transactionId.substring(0, 16)}...
                        </Text>
                    )} />
                </div>
                {tokenUsage ? (
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                        <Statistic title="Total Tokens" value={tokenUsage.totalTokenCount} />
                        <Statistic title="Prompt Tokens" value={tokenUsage.promptTokenCount} />
                        <Statistic title="Output Tokens" value={tokenUsage.candidatesTokenCount} />
                    </div>
                ) : null}

                {/* Batch results */}
                {job.result?.batchResults && job.result.batchResults.length > 0 && (
                    <div>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Batch Results</Text>
                        <Table
                            size="small"
                            pagination={false}
                            dataSource={job.result.batchResults.map((b, i) => ({ ...b, key: i }))}
                            columns={[
                                { title: 'Batch', dataIndex: 'batchIndex', key: 'batch' },
                                {
                                    title: 'Status', dataIndex: 'success', key: 'status',
                                    render: (success: boolean) => <Tag color={success ? 'green' : 'red'}>{success ? 'Success' : 'Failed'}</Tag>,
                                },
                                { title: 'Files Processed', dataIndex: 'filesProcessed', key: 'files', align: 'center' as const },
                            ]}
                        />
                    </div>
                )}
            </div>
        );
    };

    // ================================================================
    // RENDER
    // ================================================================

    const canRetry = job?.status === 'failed' && job?.error?.retryable !== false;

    return (
        <Drawer
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Job Inspector</span>
                    {jobId && (
                        <Text copyable={{ text: jobId }} type="secondary" style={{ fontSize: 12 }}>
                            {jobId.substring(0, 12)}...
                        </Text>
                    )}
                </div>
            }
            open={open}
            onClose={onClose}
            width={640}
            extra={
                canRetry ? (
                    <Popconfirm
                        title="Retry this extraction?"
                        description="Creates a new job with the same files."
                        onConfirm={handleRetry}
                        okText="Retry"
                    >
                        <Button type="primary" icon={<LuRefreshCw />} loading={retrying}>
                            Retry Extraction
                        </Button>
                    </Popconfirm>
                ) : null
            }
        >
            {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                    <Spin size="large" />
                </div>
            ) : !job ? (
                <Empty description="Job not found" />
            ) : (
                <Tabs
                    defaultActiveKey="overview"
                    items={[
                        { key: 'overview', label: 'Overview', children: <OverviewTab /> },
                        { key: 'ai-response', label: 'AI Response', children: <AIResponseTab /> },
                        { key: 'cost', label: 'Cost', children: <CostTab /> },
                    ]}
                />
            )}
        </Drawer>
    );
}
