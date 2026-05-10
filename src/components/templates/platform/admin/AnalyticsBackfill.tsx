'use client';

import { useAppDispatch } from '@hook/useAppDispatch';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { backfillAggregates } from '@services/chatAnalytics';
import {
    Alert,
    Button,
    Card,
    Col,
    Descriptions,
    Divider,
    InputNumber,
    Modal,
    Progress,
    Row,
    Space,
    Statistic,
    Table,
    Tag,
    Typography,
    message,
    theme
} from 'antd';
import { useRouter } from 'next/navigation';
import { useContext, useState } from 'react';
import { LuAlertTriangle, LuCheckCircle, LuClock, LuDatabase, LuSkipForward, LuXCircle } from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;

interface BackfillResult {
    date: string;
    chats?: number;
    status: 'success' | 'skipped' | 'error';
    error?: string;
    reason?: 'exists' | 'no_data';
}

export default function AnalyticsBackfill() {
    const router = useRouter();
    const loggedInSession = useClientAuthSession();
    const dispatch = useAppDispatch();
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const { token } = theme.useToken();
    const [days, setDays] = useState<number | null>(30);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [results, setResults] = useState<BackfillResult[]>([]);
    const [summary, setSummary] = useState<{
        total: number;
        success: number;
        skipped: number;
        errors: number;
    } | null>(null);
    const [progress, setProgress] = useState<number>(0);

    // Calculate date range for display
    const getDateRange = () => {
        const daysValue = days || 30; // Use default if null
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 1); // Yesterday (backfill starts from yesterday)

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysValue); // X days ago

        const formatDate = (date: Date) => {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        };

        return {
            start: formatDate(startDate),
            end: formatDate(endDate),
            formatted: `${formatDate(startDate)} - ${formatDate(endDate)}`
        };
    };

    // Check if user is owner
    //uncomment this in production
    const isOwner = true //loggedInSession?.user?.role === ECOMSAI_PLATFORM_USER_ROLE;

    if (!isOwner) {
        return (
            <div style={{ padding: '24px' }}>
                <Alert
                    message="Access Denied"
                    description="Only store owners can access this page. This tool generates reports from past chat history."
                    type="error"
                    showIcon
                    icon={<LuXCircle />}
                    action={
                        <Button size="small" onClick={() => router.back()}>
                            Go Back
                        </Button>
                    }
                />
            </div>
        );
    }

    const handleBackfillConfirmation = () => {
        // Validate days before showing modal
        if (!days || days < 1) {
            message.warning('Please enter a valid number of days (1-90)');
            return;
        }

        const dateRange = getDateRange();
        Modal.confirm({
            title: 'Confirm Report Generation',
            icon: <LuAlertTriangle />,
            content: (
                <div>
                    <Paragraph>
                        You are about to generate reports for the past <Text strong>{days} days</Text>.
                    </Paragraph>
                    <Paragraph type="secondary" style={{ fontSize: '13px', marginBottom: '4px' }}>
                        <strong>Date Range:</strong> {dateRange.formatted}
                    </Paragraph>
                    <Paragraph type="secondary" style={{ fontSize: '13px', marginBottom: '8px' }}>
                        This operation will:
                    </Paragraph>
                    <ul style={{ fontSize: '13px', marginTop: 0 }}>
                        <li>Analyze conversations from {days} day{days > 1 ? 's' : ''}</li>
                        <li>Take about {Math.ceil(days * 1.5)} seconds to complete</li>
                        <li>Skip days that already have reports</li>
                        <li>Process data for your store: <Text strong>{getStoreContextName(storeDetails as any, 'Your Store')}</Text></li>
                    </ul>
                    <Paragraph type="warning" style={{ fontSize: '13px', marginBottom: 0 }}>
                        ⚠️ This process reads a lot of data. Only continue if you need past reports.
                    </Paragraph>
                </div>
            ),
            okText: 'Generate Reports',
            okType: 'primary',
            cancelText: 'Cancel',
            width: 520,
            onOk: handleBackfill,
        });
    };

    const handleBackfill = async () => {
        if (!loggedInSession?.tId || !loggedInSession?.sId) {
            message.error('Session Error: Store information not found in session');
            return;
        }

        setIsProcessing(true);
        setResults([]);
        setSummary(null);
        setProgress(0);
        dispatch(startLoader('Generating reports...'));

        try {
            const result = await backfillAggregates(
                Number(loggedInSession.tId),  // ✅ Send as number (matches Firestore type)
                Number(loggedInSession.sId),  // ✅ Send as number (matches Firestore type)
                days || 30 // Ensure we pass a valid number
            );

            setResults(result.results);

            // Calculate summary
            const successCount = result.results.filter(r => r.status === 'success').length;
            const skippedCount = result.results.filter(r => r.status === 'skipped').length;
            const errorCount = result.results.filter(r => r.status === 'error').length;

            setSummary({
                total: result.results.length,
                success: successCount,
                skipped: skippedCount,
                errors: errorCount,
            });

            setProgress(100);

            if (errorCount === 0) {
                message.success(`Successfully created reports for ${successCount} days, skipped ${skippedCount} days (already had reports)`, 8);
            } else {
                message.warning(`Completed with some errors: ${successCount} succeeded, ${skippedCount} skipped, ${errorCount} failed`, 8);
            }

        } catch (error: any) {
            console.error('Report generation failed:', error);
            message.error(error.message || 'Report generation failed. Please try again or contact support', 10);
            setProgress(0);
        } finally {
            setIsProcessing(false);
            dispatch(stopLoader('Generating reports...'));
        }
    };

    const columns = [
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            width: 150,
            sorter: (a: BackfillResult, b: BackfillResult) => a.date.localeCompare(b.date),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: string) => {
                const config = {
                    success: { color: 'success', icon: <LuCheckCircle />, text: 'Success' },
                    skipped: { color: 'default', icon: <LuSkipForward />, text: 'Skipped' },
                    error: { color: 'error', icon: <LuXCircle />, text: 'Error' },
                };
                const cfg = config[status as keyof typeof config];
                return (
                    <Tag color={cfg.color} icon={cfg.icon}>
                        {cfg.text}
                    </Tag>
                );
            },
            filters: [
                { text: 'Success', value: 'success' },
                { text: 'Skipped', value: 'skipped' },
                { text: 'Error', value: 'error' },
            ],
            onFilter: (value: any, record: BackfillResult) => record.status === value,
        },
        {
            title: 'Chats',
            dataIndex: 'chats',
            key: 'chats',
            width: 100,
            render: (chats?: number) => chats !== undefined ? chats : '-',
            sorter: (a: BackfillResult, b: BackfillResult) => (a.chats || 0) - (b.chats || 0),
        },
        {
            title: 'Details',
            dataIndex: 'error',
            key: 'error',
            render: (error?: string, record?: BackfillResult) => {
                if (error) {
                    return <Text type="danger" style={{ fontSize: '12px' }}>{error}</Text>;
                }
                if (record?.status === 'skipped') {
                    if (record?.reason === 'exists') {
                        return <Text type="secondary" style={{ fontSize: '12px' }}>Already exists</Text>;
                    } else {
                        return <Text type="secondary" style={{ fontSize: '12px' }}>No chat data for this day</Text>;
                    }
                }
                return <Text type="success" style={{ fontSize: '12px' }}>Generated successfully</Text>;
            },
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Header */}
                <div>
                    <Title level={2}>
                        <LuDatabase style={{ marginRight: '8px' }} />
                        Chat Backfill
                    </Title>
                    <Paragraph type="secondary">
                        Generate reports from your past chat history
                    </Paragraph>
                </div>

                {/* What is This? - Detailed Explanation */}
                <Card
                    title={
                        <span style={{ fontSize: '16px', fontWeight: 600 }}>
                            💡 What is This?
                        </span>
                    }
                >
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        {/* Overview */}
                        <div>
                            <Paragraph style={{ marginBottom: '12px', fontSize: '14px' }}>
                                This tool helps you create reports from your past conversations.
                            </Paragraph>
                        </div>

                        <Divider style={{ margin: '12px 0' }} />

                        {/* When to Use */}
                        <div>
                            <Text strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                                ✅ When Should You Use This?
                            </Text>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                                <li style={{ marginBottom: '6px' }}>
                                    <strong>First Time Setup:</strong> You just set up reports and want to see data from the past 30-60 days
                                </li>
                                <li style={{ marginBottom: '6px' }}>
                                    <strong>Missing Reports:</strong> Some daily reports are missing and you want to create them
                                </li>
                                <li style={{ marginBottom: '6px' }}>
                                    <strong>System Upgrade:</strong> You&apos;re moving from an old version and want to bring your old reports over
                                </li>
                            </ul>
                        </div>

                        <Divider style={{ margin: '12px 0' }} />

                        {/* When NOT to Use */}
                        <div>
                            <Text strong type="danger" style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                                ❌ When Should You NOT Use This?
                            </Text>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                                <li style={{ marginBottom: '6px' }}>
                                    <strong>Daily Updates:</strong> For today&apos;s reports, use the <strong>Refresh</strong> button in your Dashboard instead
                                </li>
                                <li style={{ marginBottom: '6px' }}>
                                    <strong>Reports Already Exist:</strong> The system automatically skips days that already have reports
                                </li>
                                <li style={{ marginBottom: '6px' }}>
                                    <strong>Regular Use:</strong> This is a one-time setup tool, you don&apos;t need to run it regularly
                                </li>
                            </ul>
                        </div>

                        <Divider style={{ margin: '12px 0' }} />

                        {/* How it Works */}
                        <div>
                            <Text strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                                🔄 How Does It Work?
                            </Text>
                            <Row gutter={[16, 12]}>
                                <Col xs={24} md={12}>
                                    <Card size="small" style={{ height: '100%' }}>
                                        <Space direction="vertical" size={4}>
                                            <Text strong style={{ fontSize: '13px', color: token.colorPrimary }}>
                                                Step 1: Collect Chats
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                Gathers all conversations from the days you choose
                                            </Text>
                                        </Space>
                                    </Card>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Card size="small" style={{ height: '100%' }}>
                                        <Space direction="vertical" size={4}>
                                            <Text strong style={{ fontSize: '13px', color: token.colorSuccess }}>
                                                Step 2: Count & Analyze
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                Counts important metrics from your conversations
                                            </Text>
                                        </Space>
                                    </Card>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Card size="small" style={{ height: '100%' }}>
                                        <Space direction="vertical" size={4}>
                                            <Text strong style={{ fontSize: '13px', color: token.colorWarning }}>
                                                Step 3: Save Reports
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                Saves the generated reports for viewing later
                                            </Text>
                                        </Space>
                                    </Card>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Card size="small" style={{ height: '100%' }}>
                                        <Space direction="vertical" size={4}>
                                            <Text strong style={{ fontSize: '13px', color: token.colorInfoText }}>
                                                Step 4: View in Dashboard
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                Your Dashboard now shows past reports and trends
                                            </Text>
                                        </Space>
                                    </Card>
                                </Col>
                            </Row>
                        </div>

                        <Divider style={{ margin: '12px 0' }} />

                        {/* What to Expect */}
                        <div>
                            <Text strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                                ⏱️ What to Expect
                            </Text>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                                <li style={{ marginBottom: '6px' }}>
                                    <strong>Processing Time:</strong> ~1-2 seconds per day (30 days ≈ 30-60 seconds)
                                </li>
                                <li style={{ marginBottom: '6px' }}>
                                    <strong>Smart Skipping:</strong> Days with existing reports are automatically skipped
                                </li>
                                <li style={{ marginBottom: '6px' }}>
                                    <strong>Safe to Re-run:</strong> Running this multiple times won&apos;t create duplicate reports
                                </li>
                                <li style={{ marginBottom: '6px' }}>
                                    <strong>Live Updates:</strong> You&apos;ll see the status for each day as it processes
                                </li>
                            </ul>
                        </div>
                    </Space>
                </Card>

                {/* Index Requirement Alert */}
                <Alert
                    message="📋 What You Need"
                    description={
                        <div>
                            <Paragraph>
                                This tool needs to be set up properly to work. Don&apos;t worry - if something is missing, you&apos;ll see a clear message with a link to fix it.
                            </Paragraph>
                            <Paragraph type="secondary" style={{ fontSize: '13px', marginBottom: '8px' }}>
                                <strong>If you see an error message:</strong>
                            </Paragraph>
                            <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                                <li>Click the setup link shown in the error</li>
                                <li>Wait 2-5 minutes for the setup to complete</li>
                                <li>Come back and try again</li>
                            </ol>
                            <Paragraph type="secondary" style={{ marginTop: '8px', marginBottom: 0, fontSize: '12px' }}>
                                💡 This is a one-time setup. Once done, you won&apos;t see this error again.
                            </Paragraph>
                        </div>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: '16px' }}
                />

                {/* Warning Alert */}
                <Alert
                    message="⚠️ Important Information"
                    description={
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            <li>This process reads a lot of data and may take a minute or two</li>
                            <li>Processing time: ~1-2 seconds per day (30 days = about 1 minute)</li>
                            <li>Days with existing reports will be skipped automatically</li>
                            <li>Only use this when setting up for the first time or fixing missing reports</li>
                            <li>For today&apos;s updates, use the <strong>Refresh</strong> button in your Dashboard</li>
                        </ul>
                    }
                    type="warning"
                    showIcon
                    icon={<LuAlertTriangle />}
                />

                {/* Store Info */}
                <Card title="Your Store Information" size="small">
                    <Descriptions column={2} size="small">
                        <Descriptions.Item label="Store Name">
                            {getStoreContextName(storeDetails as any, 'N/A')}
                        </Descriptions.Item>
                        <Descriptions.Item label="Your Access">
                            <Tag color="gold">Owner</Tag>
                        </Descriptions.Item>
                    </Descriptions>
                </Card>

                {/* Configuration */}
                <Card title="Generate Reports">
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} sm={12} md={8}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Text strong>How Many Days Back?</Text>
                                <InputNumber
                                    min={1}
                                    max={90}
                                    value={days}
                                    onChange={(value) => setDays(value)}
                                    onBlur={() => {
                                        // Ensure valid value on blur
                                        if (days === null || days === undefined || days < 1) {
                                            setDays(30); // Reset to default if invalid
                                        } else if (days > 90) {
                                            setDays(90); // Cap at maximum
                                        }
                                    }}
                                    disabled={isProcessing}
                                    style={{ width: '100%' }}
                                    addonAfter="days"
                                    placeholder="Enter days"
                                    keyboard
                                />
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Recommended: 30 days for initial setup
                                </Text>
                            </Space>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Space direction="vertical">
                                <Text type="secondary">
                                    <LuClock style={{ marginRight: '4px' }} />
                                    Estimated time: {Math.ceil((days || 30) * 1.5)} seconds
                                </Text>
                                <Text type="secondary">
                                    <LuDatabase style={{ marginRight: '4px' }} />
                                    Date range: {getDateRange().formatted}
                                </Text>
                            </Space>
                        </Col>
                        <Col xs={24} sm={24} md={8}>
                            <Button
                                type="primary"
                                size="large"
                                onClick={handleBackfillConfirmation}
                                loading={isProcessing}
                                disabled={isProcessing}
                                block
                            >
                                {isProcessing ? 'Processing...' : 'Generate Reports'}
                            </Button>
                        </Col>
                    </Row>

                    {isProcessing && (
                        <>
                            <Divider />
                            <Progress
                                percent={progress}
                                status={progress === 100 ? 'success' : 'active'}
                            />
                            <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                                Analyzing your past conversations... This may take a few minutes.
                            </Text>
                        </>
                    )}
                </Card>

                {/* Summary */}
                {summary && (
                    <Card title="Summary">
                        <Row gutter={16}>
                            <Col xs={12} sm={6}>
                                <Statistic
                                    title="Total Days"
                                    value={summary.total}
                                    prefix={<LuDatabase />}
                                />
                            </Col>
                            <Col xs={12} sm={6}>
                                <Statistic
                                    title="Success"
                                    value={summary.success}
                                    valueStyle={{ color: token.colorSuccess }}
                                    prefix={<LuCheckCircle />}
                                />
                            </Col>
                            <Col xs={12} sm={6}>
                                <Statistic
                                    title="Skipped"
                                    value={summary.skipped}
                                    valueStyle={{ color: token.colorTextDescription }}
                                    prefix={<LuSkipForward />}
                                />
                            </Col>
                            <Col xs={12} sm={6}>
                                <Statistic
                                    title="Errors"
                                    value={summary.errors}
                                    valueStyle={{ color: summary.errors > 0 ? token.colorError : token.colorTextDescription }}
                                    prefix={<LuXCircle />}
                                />
                            </Col>
                        </Row>
                    </Card>
                )}

                {/* Results Table */}
                {results.length > 0 && (
                    <Card title="Detailed Results">
                        <Table
                            columns={columns}
                            dataSource={results}
                            rowKey="date"
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                showTotal: (total) => `Total ${total} days`,
                            }}
                            size="small"
                        />
                    </Card>
                )}

                {/* Help Text */}
                {!isProcessing && results.length === 0 && (
                    <Alert
                        message="Need Help?"
                        description={
                            <div>
                                <Paragraph>
                                    <strong>When to use this tool:</strong>
                                </Paragraph>
                                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                    <li>First time setting up reports for a store that already has chat history</li>
                                    <li>Fixing missing reports from previous days</li>
                                    <li>Bringing over old data after a system upgrade</li>
                                </ul>
                                <Divider style={{ margin: '12px 0' }} />
                                <Paragraph>
                                    <strong>What happens:</strong> The system will look at all your past conversations,
                                    count important metrics, and create daily reports.
                                    Days that already have reports will be skipped automatically.
                                </Paragraph>
                            </div>
                        }
                        type="info"
                        showIcon
                    />
                )}
            </Space>
        </div>
    );
}
