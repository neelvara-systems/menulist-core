'use client';

import { ANSWERLATTICE_ROUTES, toAnswerlatticeDashboardRoute } from '@constant/answerlattice/navigations';
import { getAnswerlatticeUiErrorMessage } from '@lib/answerlattice/uiErrors';
import type { AnswerlatticeActivationStep, AnswerlatticeActivationSummary } from '@type/answerlattice';
import { Alert, Button, Card, Col, Empty, Flex, Grid, List, Row, Skeleton, Space, Statistic, Tag, Typography, message } from 'antd';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuBookOpen, LuExternalLink, LuMailCheck, LuRefreshCw, LuShieldCheck, LuTicket } from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;

type SummaryResponse = {
    summary?: AnswerlatticeActivationSummary;
    error?: string;
};

const STATUS_COLOR: Record<AnswerlatticeActivationStep['status'], string> = {
    complete: 'success',
    attention: 'warning',
    pending: 'default',
    optional: 'processing',
};

export default function AnswerlatticeWeeklyDigest() {
    const router = useRouter();
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const [summary, setSummary] = useState<AnswerlatticeActivationSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadSummary = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true);
        else setLoading(true);

        try {
            const response = await fetch('/api/answerlattice/activation/summary', { method: 'GET' });
            const data: SummaryResponse = await response.json().catch(() => ({}));
            if (!response.ok || !data.summary) {
                throw new Error(data.error || 'Failed to load weekly digest');
            }
            setSummary(data.summary);
        } catch (error) {
            message.error(getAnswerlatticeUiErrorMessage(error, 'Could not load weekly digest'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    const actionItems = useMemo(
        () => (summary?.steps || [])
            .filter((step) => step.required && step.status !== 'complete')
            .slice(0, 6),
        [summary?.steps],
    );

    const optionalSignals = useMemo(
        () => (summary?.steps || [])
            .filter((step) => !step.required && step.status !== 'complete')
            .slice(0, 4),
        [summary?.steps],
    );

    const openRoute = useCallback((route?: string) => {
        if (!route) return;
        router.push(toAnswerlatticeDashboardRoute(route, currentHostname));
    }, [currentHostname, router]);

    if (loading) {
        return <Skeleton active paragraph={{ rows: 10 }} />;
    }

    if (!summary) {
        return (
            <Alert
                type="warning"
                showIcon
                message="Weekly digest is unavailable"
                description="Refresh after Answerlattice activation summary is available for this workspace."
                action={<Button onClick={() => loadSummary(true)}>Retry</Button>}
            />
        );
    }

    return (
        <Flex vertical gap={isMobile ? 14 : 20} style={{ paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : 0 }}>
            <Flex align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={12} vertical={isMobile}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Weekly Digest</Title>
                    <Text type="secondary">
                        Review launch health, support gaps, and the next knowledge work for {summary.workspace.productName || 'this product'}.
                    </Text>
                </div>
                <Button icon={<LuRefreshCw />} loading={refreshing} onClick={() => loadSummary(true)} style={{ minHeight: 44 }}>
                    Refresh
                </Button>
            </Flex>

            <Alert
                type="info"
                showIcon
                message="Cost-safe digest"
                description="This digest is built from compact activation, context, coverage, and trust summaries. It does not scan tickets, chats, KB articles, changelog pages, or signal collections on load."
            />

            <Row gutter={[12, 12]}>
                <Col xs={12} md={6}>
                    <Card>
                        <Statistic title="Readiness" value={summary.readinessScore} suffix="%" prefix={<LuShieldCheck />} />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card>
                        <Statistic title="Articles" value={summary.content.articleCount} prefix={<LuBookOpen />} />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card>
                        <Statistic title="Surfaces" value={summary.content.surfaceCount} prefix={<LuMailCheck />} />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card>
                        <Statistic title="Ticket signals" value={summary.content.ticketCount} prefix={<LuTicket />} />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[12, 12]}>
                <Col xs={24} lg={14}>
                    <Card title="This Week's Actions">
                        {actionItems.length === 0 ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No required action from the current summary" />
                        ) : (
                            <List
                                dataSource={actionItems}
                                renderItem={(step) => (
                                    <List.Item
                                        actions={step.route ? [
                                            <Button
                                                key="open"
                                                type="link"
                                                icon={<LuExternalLink />}
                                                onClick={() => openRoute(step.route)}
                                            >
                                                {isMobile ? '' : step.actionLabel || 'Open'}
                                            </Button>,
                                        ] : undefined}
                                    >
                                        <List.Item.Meta
                                            title={(
                                                <Space wrap>
                                                    <Text strong>{step.title}</Text>
                                                    <Tag color={STATUS_COLOR[step.status]}>{step.status}</Tag>
                                                </Space>
                                            )}
                                            description={step.description}
                                        />
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={10}>
                    <Card title="Knowledge Health">
                        <Space direction="vertical" size={12} style={{ width: '100%' }}>
                            <Flex justify="space-between" gap={12}>
                                <Text type="secondary">Canonical coverage</Text>
                                <Text>{summary.governance.canonicalCoverageRate ?? 'Pending'}{summary.governance.canonicalCoverageRate !== null && summary.governance.canonicalCoverageRate !== undefined ? '%' : ''}</Text>
                            </Flex>
                            <Flex justify="space-between" gap={12}>
                                <Text type="secondary">Covered answers</Text>
                                <Text>{summary.governance.canonicalCoverageTotal ?? 0}</Text>
                            </Flex>
                            <Flex justify="space-between" gap={12}>
                                <Text type="secondary">Trust score</Text>
                                <Text>{summary.governance.trustScore !== null && summary.governance.trustScore !== undefined ? `${summary.governance.trustScore}/100` : 'Pending'}</Text>
                            </Flex>
                            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                Improve this by reviewing entity candidates, approving canonical answer drafts, and resolving signal queue items.
                            </Paragraph>
                            <Button block onClick={() => openRoute(ANSWERLATTICE_ROUTES.GOVERNANCE)}>
                                Open Governance
                            </Button>
                        </Space>
                    </Card>
                </Col>
            </Row>

            <Card title="Optional Signals">
                {optionalSignals.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No optional signal work from the current summary" />
                ) : (
                    <List
                        dataSource={optionalSignals}
                        renderItem={(step) => (
                            <List.Item
                                actions={step.route ? [
                                    <Button key="open" type="link" onClick={() => openRoute(step.route)}>
                                        {step.actionLabel || 'Open'}
                                    </Button>,
                                ] : undefined}
                            >
                                <List.Item.Meta
                                    title={<Text strong>{step.title}</Text>}
                                    description={step.description}
                                />
                            </List.Item>
                        )}
                    />
                )}
            </Card>
        </Flex>
    );
}
