'use client';

import {
    ANSWERLATTICE_GOVERNANCE_TABS,
    ANSWERLATTICE_ROUTES,
    getAnswerlatticeGovernanceRoute,
} from '@constant/answerlattice/navigations';
import { ANSWERLATTICE_CUSTOMER_LANGUAGE } from '@constant/answerlattice/customerLanguage';
import type { AnswerlatticeActivationSummary } from '@type/answerlattice';
import { Button, Card, Flex, List, Tag, Typography, theme } from 'antd';
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

type AnswerlatticeContentWorkbenchProps = {
    summary: AnswerlatticeActivationSummary;
    isMobile?: boolean;
    onOpen: (route: string) => void;
};

export default function AnswerlatticeContentWorkbench({
    summary,
    isMobile = false,
    onOpen,
}: AnswerlatticeContentWorkbenchProps) {
    const { token } = theme.useToken();
    const productProfileReady = Boolean(summary.workspace.productUrl && summary.workspace.supportEmail);
    const widgetReady = summary.widget.hasWidgetKey && summary.widget.allowedOriginCount > 0;

    const items = [
        {
            key: 'product-profile',
            title: 'Product Profile',
            description: 'Keep product URL, support email, and primary pages accurate before publishing support.',
            route: ANSWERLATTICE_ROUTES.SETTINGS,
            action: 'Edit Details',
            icon: LuSettings,
            tag: productProfileReady ? 'Ready' : 'Needs details',
            tagColor: productProfileReady ? 'success' : 'warning',
        },
        {
            key: 'import-knowledge',
            title: 'Import Knowledge',
            description: 'Upload docs, FAQs, or starter answers, then review generated content before it goes live.',
            route: ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE,
            action: 'Import',
            icon: LuFileText,
            tag: `${summary.content.articleCount} articles · ${summary.content.faqCount || 0} FAQs`,
            tagColor: (summary.content.articleCount + (summary.content.faqCount || 0)) > 0 ? 'success' : 'default',
        },
        {
            key: 'faqs',
            title: 'FAQs',
            description: 'Manage short repeated answers and connect them to articles and Product Pages & Flows.',
            route: ANSWERLATTICE_ROUTES.FAQS,
            action: 'Manage',
            icon: LuHelpCircle,
            tag: `${summary.content.faqCount || 0} live`,
            tagColor: (summary.content.faqCount || 0) > 0 ? 'success' : 'default',
        },
        {
            key: 'knowledge-base',
            title: 'Knowledge Base',
            description: 'Edit categories, articles, tags, and page or workflow connections from one content library.',
            route: ANSWERLATTICE_ROUTES.KNOWLEDGE_BASE,
            action: 'Manage',
            icon: LuBookOpen,
            tag: `${summary.content.articleCount} live`,
            tagColor: summary.content.articleCount > 0 ? 'success' : 'default',
        },
        {
            key: 'product-surfaces',
            title: ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.productPagesAndFlows,
            description: 'Connect customer pages and workflows to the right articles, release notes, product topics, and support evidence.',
            route: ANSWERLATTICE_ROUTES.PRODUCT_SURFACES,
            action: 'Map',
            icon: LuLayers,
            tag: `${summary.content.surfaceCount} surfaces`,
            tagColor: summary.content.surfaceCount > 0 ? 'success' : 'default',
        },
        {
            key: 'changelog',
            title: 'Changelog',
            description: 'Publish release notes and bind updates to affected product areas and help content.',
            route: ANSWERLATTICE_ROUTES.CHANGELOG,
            action: 'Publish',
            icon: LuReceipt,
            tag: `${summary.content.changelogCount} releases`,
            tagColor: summary.content.changelogCount > 0 ? 'processing' : 'default',
        },
        {
            key: 'signal-queue',
            title: ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.suggestedUpdates,
            description: 'Review repeated gaps from tickets and conversations, then turn them into approved answers.',
            route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.SIGNAL_QUEUE),
            action: 'Review',
            icon: LuGitPullRequest,
            tag: 'Human review',
            tagColor: 'blue',
        },
        {
            key: 'widget',
            title: 'Widget Install',
            description: 'Configure appearance, allowed origins, blocked routes, and page-aware install snippets.',
            route: ANSWERLATTICE_ROUTES.WIDGET,
            action: 'Configure',
            icon: LuCode,
            tag: widgetReady ? 'Install ready' : 'Needs setup',
            tagColor: widgetReady ? 'success' : 'warning',
        },
        {
            key: 'tickets',
            title: 'Tickets',
            description: 'Handle fallback requests and keep resolved issues feeding the knowledge review loop.',
            route: ANSWERLATTICE_ROUTES.TICKETS,
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
                                        border: `1px solid ${token.colorBorderSecondary}`,
                                        borderRadius: token.borderRadiusLG,
                                        background: token.colorBgContainer,
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
                                    <Button onClick={() => onOpen(item.route)} style={{ minHeight: 44 }}>
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
