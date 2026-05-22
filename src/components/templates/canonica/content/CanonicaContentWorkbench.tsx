'use client';

import {
    CANONICA_GOVERNANCE_TABS,
    CANONICA_ROUTES,
    getCanonicaGovernanceRoute,
} from '@constant/canonica/navigations';
import type { CanonicaActivationSummary } from '@type/canonica';
import { Button, Card, Flex, List, Tag, Typography } from 'antd';
import {
    LuBookOpen,
    LuHelpCircle,
    LuCode,
    LuFileText,
    LuGitPullRequest,
    LuLayers,
    LuReceipt,
    LuSettings,
    LuTicket,
} from 'react-icons/lu';

const { Paragraph, Text } = Typography;

type CanonicaContentWorkbenchProps = {
    summary: CanonicaActivationSummary;
    isMobile?: boolean;
    onOpen: (route: string) => void;
};

export default function CanonicaContentWorkbench({
    summary,
    isMobile = false,
    onOpen,
}: CanonicaContentWorkbenchProps) {
    const productProfileReady = Boolean(summary.workspace.productUrl && summary.workspace.supportEmail);
    const widgetReady = summary.widget.hasWidgetKey && summary.widget.allowedOriginCount > 0;

    const items = [
        {
            key: 'product-profile',
            title: 'Product Profile',
            description: 'Keep product URL, support email, and primary pages accurate before publishing support.',
            route: CANONICA_ROUTES.SETTINGS,
            action: 'Edit Details',
            icon: LuSettings,
            tag: productProfileReady ? 'Ready' : 'Needs details',
            tagColor: productProfileReady ? 'success' : 'warning',
        },
        {
            key: 'import-knowledge',
            title: 'Import Knowledge',
            description: 'Upload docs, FAQs, or starter answers, then review generated content before it goes live.',
            route: CANONICA_ROUTES.KB_GENERATION,
            action: 'Import',
            icon: LuFileText,
            tag: `${summary.content.articleCount} articles · ${summary.content.faqCount || 0} FAQs`,
            tagColor: (summary.content.articleCount + (summary.content.faqCount || 0)) > 0 ? 'success' : 'default',
        },
        {
            key: 'faqs',
            title: 'FAQs',
            description: 'Manage short repeated answers and connect them to articles and product surfaces.',
            route: CANONICA_ROUTES.FAQS,
            action: 'Manage',
            icon: LuHelpCircle,
            tag: `${summary.content.faqCount || 0} live`,
            tagColor: (summary.content.faqCount || 0) > 0 ? 'success' : 'default',
        },
        {
            key: 'knowledge-base',
            title: 'Knowledge Base',
            description: 'Edit categories, articles, tags, and product-surface bindings from one content library.',
            route: CANONICA_ROUTES.KNOWLEDGE_BASE,
            action: 'Manage',
            icon: LuBookOpen,
            tag: `${summary.content.articleCount} live`,
            tagColor: summary.content.articleCount > 0 ? 'success' : 'default',
        },
        {
            key: 'product-surfaces',
            title: 'Product Surfaces',
            description: 'Connect routes and workflows to the right articles, release notes, entities, and signals.',
            route: CANONICA_ROUTES.PRODUCT_SURFACES,
            action: 'Map',
            icon: LuLayers,
            tag: `${summary.content.surfaceCount} surfaces`,
            tagColor: summary.content.surfaceCount > 0 ? 'success' : 'default',
        },
        {
            key: 'changelog',
            title: 'Changelog',
            description: 'Publish release notes and bind updates to affected product areas and help content.',
            route: CANONICA_ROUTES.CHANGELOG,
            action: 'Publish',
            icon: LuReceipt,
            tag: `${summary.content.changelogCount} releases`,
            tagColor: summary.content.changelogCount > 0 ? 'processing' : 'default',
        },
        {
            key: 'signal-queue',
            title: 'Signal Queue',
            description: 'Review repeated gaps from tickets and conversations, then turn them into approved answers.',
            route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.SIGNAL_QUEUE),
            action: 'Review',
            icon: LuGitPullRequest,
            tag: 'Human review',
            tagColor: 'blue',
        },
        {
            key: 'widget',
            title: 'Widget Install',
            description: 'Configure appearance, allowed origins, blocked routes, and page-aware install snippets.',
            route: CANONICA_ROUTES.WIDGET,
            action: 'Configure',
            icon: LuCode,
            tag: widgetReady ? 'Install ready' : 'Needs setup',
            tagColor: widgetReady ? 'success' : 'warning',
        },
        {
            key: 'tickets',
            title: 'Tickets',
            description: 'Handle fallback requests and keep resolved issues feeding the knowledge review loop.',
            route: CANONICA_ROUTES.TICKETS,
            action: 'Open',
            icon: LuTicket,
            tag: `${summary.content.ticketCount} signals`,
            tagColor: summary.content.ticketCount > 0 ? 'processing' : 'default',
        },
    ];

    return (
        <Card
            title="Content Control"
            extra={!isMobile ? <Tag color="blue">Product-owner workflow</Tag> : null}
        >
            <Flex vertical gap={12}>
                <Paragraph type="secondary" style={{ margin: 0 }}>
                    Manage the content customers see, the product pages it belongs to, and the review queue that keeps answers current.
                </Paragraph>
                <List
                    grid={isMobile ? undefined : { gutter: 12, column: 2 }}
                    dataSource={items}
                    renderItem={(item) => {
                        const Icon = item.icon;
                        return (
                            <List.Item>
                                <Flex
                                    align={isMobile ? 'stretch' : 'center'}
                                    justify="space-between"
                                    gap={12}
                                    vertical={isMobile}
                                    style={{
                                        minHeight: 92,
                                        padding: 12,
                                        border: '1px solid #f0f0f0',
                                        borderRadius: 8,
                                        background: '#fff',
                                    }}
                                >
                                    <Flex align="flex-start" gap={10}>
                                        <span style={{ display: 'inline-flex', marginTop: 2 }}>
                                            <Icon size={18} />
                                        </span>
                                        <Flex vertical gap={4}>
                                            <Flex align="center" gap={8} wrap="wrap">
                                                <Text strong>{item.title}</Text>
                                                <Tag color={item.tagColor}>{item.tag}</Tag>
                                            </Flex>
                                            <Text type="secondary">{item.description}</Text>
                                        </Flex>
                                    </Flex>
                                    <Button onClick={() => onOpen(item.route)} style={{ minHeight: 36 }}>
                                        {item.action}
                                    </Button>
                                </Flex>
                            </List.Item>
                        );
                    }}
                />
            </Flex>
        </Card>
    );
}
