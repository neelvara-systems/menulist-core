'use client';

import type { AnswerlatticeActivationSummary, AnswerlatticeSurfaceReadinessItem } from '@type/answerlattice';
import { ANSWERLATTICE_ROUTES } from '@constant/answerlattice/navigations';
import { Button, Card, Empty, Flex, List, Space, Tag, Typography, theme } from 'antd';
import { LuBookOpen, LuCheckCircle2, LuHelpCircle, LuGitPullRequest, LuLayers, LuRouter } from 'react-icons/lu';

const { Paragraph, Text } = Typography;

type AnswerlatticeSurfaceReadinessMatrixProps = {
    summary: AnswerlatticeActivationSummary;
    isMobile?: boolean;
    onOpen: (route: string) => void;
};

const STATUS_META: Record<AnswerlatticeSurfaceReadinessItem['status'], {
    label: string;
    color: string;
    icon: typeof LuCheckCircle2;
    recommendation: string;
    actionLabel: string;
    actionRoute: string;
}> = {
    ready: {
        label: 'Ready',
        color: 'success',
        icon: LuCheckCircle2,
        recommendation: 'This surface has mapped context and approved content available for customers.',
        actionLabel: 'Review Surface',
        actionRoute: ANSWERLATTICE_ROUTES.PRODUCT_SURFACES,
    },
    needs_mapping: {
        label: 'Needs mapping',
        color: 'warning',
        icon: LuRouter,
        recommendation: 'Add route, feature, page, workflow, or entity signals so Answerlattice knows where this surface applies.',
        actionLabel: 'Map Surface',
        actionRoute: ANSWERLATTICE_ROUTES.PRODUCT_SURFACES,
    },
    needs_articles: {
        label: 'Needs content',
        color: 'error',
        icon: LuBookOpen,
        recommendation: 'Add or bind at least one article so customers on this surface can get an approved answer.',
        actionLabel: 'Add Content',
        actionRoute: ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE,
    },
    open_signals: {
        label: 'Open signals',
        color: 'processing',
        icon: LuGitPullRequest,
        recommendation: 'Review open tickets tied to this surface, then convert repeated gaps into approved knowledge.',
        actionLabel: 'Review Tickets',
        actionRoute: ANSWERLATTICE_ROUTES.TICKETS,
    },
};

export default function AnswerlatticeSurfaceReadinessMatrix({
    summary,
    isMobile = false,
    onOpen,
}: AnswerlatticeSurfaceReadinessMatrixProps) {
    const { token } = theme.useToken();
    const surfaces = summary.content.surfaceReadiness || [];

    return (
        <Card
            title="Surface Readiness"
            extra={!isMobile ? <Tag color="blue">Page-aware support</Tag> : null}
        >
            <Flex vertical gap={12}>
                <Paragraph type="secondary" style={{ margin: 0 }}>
                    See which product areas are ready for customer questions, and which ones need content, routing, or ticket review.
                </Paragraph>

                {surfaces.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No product surfaces are mapped yet."
                    >
                        <Button
                            type="primary"
                            onClick={() => onOpen(ANSWERLATTICE_ROUTES.PRODUCT_SURFACES)}
                            style={{ minHeight: 44 }}
                        >
                            Map Product Surfaces
                        </Button>
                    </Empty>
                ) : (
                    <List
                        grid={isMobile ? undefined : { gutter: 12, column: 2 }}
                        dataSource={surfaces}
                        renderItem={(surface) => {
                            const meta = STATUS_META[surface.status] || STATUS_META.ready;
                            const Icon = meta.icon;
                            const routes = surface.routePatterns || [];

                            return (
                                <List.Item>
                                    <Flex
                                        vertical
                                        gap={10}
                                        style={{
                                            minHeight: 154,
                                            padding: 12,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                            borderRadius: token.borderRadiusLG,
                                            background: token.colorBgContainer,
                                        }}
                                    >
                                        <Flex align="flex-start" justify="space-between" gap={12}>
                                            <Flex align="flex-start" gap={10} style={{ minWidth: 0 }}>
                                                <span style={{ display: 'inline-flex', marginTop: 2 }}>
                                                    <Icon size={18} />
                                                </span>
                                                <Flex vertical gap={4} style={{ minWidth: 0 }}>
                                                    <Flex align="center" gap={8} wrap="wrap">
                                                        <Text strong>{surface.label}</Text>
                                                        <Tag color={meta.color}>{meta.label}</Tag>
                                                    </Flex>
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        {surface.key}
                                                    </Text>
                                                </Flex>
                                            </Flex>
                                            <Button
                                                onClick={() => onOpen(meta.actionRoute)}
                                                style={{ minHeight: 44 }}
                                            >
                                                {meta.actionLabel}
                                            </Button>
                                        </Flex>

                                        <Text type="secondary">{meta.recommendation}</Text>

                                        <Space size={[4, 4]} wrap>
                                            <Tag icon={<LuBookOpen size={12} />}>{surface.articleCount} articles</Tag>
                                            <Tag icon={<LuHelpCircle size={12} />}>{surface.faqCount || 0} FAQs</Tag>
                                            <Tag>{surface.changelogCount} releases</Tag>
                                            <Tag color={surface.openTicketCount > 0 ? 'processing' : undefined}>
                                                {surface.openTicketCount} open / {surface.ticketCount} tickets
                                            </Tag>
                                        </Space>

                                        {routes.length > 0 && (
                                            <Flex gap={4} wrap="wrap">
                                                <LuLayers size={14} style={{ marginTop: 3 }} />
                                                {routes.slice(0, 2).map(route => (
                                                    <Tag key={route}>{route}</Tag>
                                                ))}
                                                {routes.length > 2 && <Tag>+{routes.length - 2}</Tag>}
                                            </Flex>
                                        )}
                                    </Flex>
                                </List.Item>
                            );
                        }}
                    />
                )}
            </Flex>
        </Card>
    );
}
