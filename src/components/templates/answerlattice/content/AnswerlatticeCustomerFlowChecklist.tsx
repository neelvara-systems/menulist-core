'use client';

import {
    ANSWERLATTICE_ROUTES,
} from '@constant/answerlattice/navigations';
import type { AnswerlatticeActivationSummary } from '@type/answerlattice';
import { Button, Card, Flex, List, Tag, Typography, theme } from 'antd';
import {
    LuBookOpen,
    LuMessageCircle,
    LuTicket,
} from 'react-icons/lu';

const { Paragraph, Text } = Typography;

type AnswerlatticeCustomerFlowChecklistProps = {
    summary: AnswerlatticeActivationSummary;
    isMobile?: boolean;
    embedded?: boolean;
    onOpen: (route: string) => void;
};

type CustomerFlowStatus = 'ready' | 'needs_review' | 'pending' | 'optional';

type CustomerFlowItem = {
    key: string;
    title: string;
    description: string;
    status: CustomerFlowStatus;
    actionLabel: string;
    route: string;
    icon: typeof LuBookOpen;
};

const STATUS_META: Record<CustomerFlowStatus, { label: string; color: string }> = {
    ready: { label: 'Ready to test', color: 'success' },
    needs_review: { label: 'Needs setup', color: 'warning' },
    pending: { label: 'Not ready', color: 'default' },
    optional: { label: 'Optional', color: 'processing' },
};

export default function AnswerlatticeCustomerFlowChecklist({
    summary,
    isMobile = false,
    embedded = false,
    onOpen,
}: AnswerlatticeCustomerFlowChecklistProps) {
    const { token } = theme.useToken();
    const hasPublicKnowledge = (summary.content.articleCount + (summary.content.faqCount || 0)) > 0;
    const hasWidgetInstall = summary.widget.hasWidgetKey && summary.widget.allowedOriginCount > 0;
    const getStepStatus = (key: string) => summary.steps.find(step => step.key === key)?.status;
    const hasWidgetSeen = getStepStatus('widget-install') === 'complete';
    const hasPageContext = getStepStatus('page-context') === 'complete';
    const hasTicketFallback = summary.notifications.enabled
        && summary.notifications.smtpConfigured
        && Boolean(summary.workspace.supportEmail);

    const items: CustomerFlowItem[] = [
        {
            key: 'help-center',
            title: 'Review public help content',
            description: hasPublicKnowledge
                ? 'Approved articles and FAQs are available. Open the public-facing docs preview and verify one real question manually.'
                : 'Publish one approved article or FAQ before this becomes useful to customers.',
            status: hasPublicKnowledge ? 'ready' : 'pending',
            actionLabel: hasPublicKnowledge ? 'Preview Help Content' : 'Import Content',
            route: hasPublicKnowledge ? ANSWERLATTICE_ROUTES.DOCS : ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE,
            icon: LuBookOpen,
        },
        {
            key: 'contextual-widget',
            title: 'Ask a contextual widget question',
            description: hasWidgetSeen && hasPageContext
                ? `Recent widget and context evidence exists for ${summary.widget.runtimeStatus?.lastPath || 'a product page'}. Ask one real question and confirm the approved answer changes only when its scope should change.`
                : hasWidgetSeen
                    ? 'The widget was seen recently, but current page context still needs review before testing a contextual answer.'
                    : 'Install the widget, open the product, and pass current page context before testing a real question.',
            status: hasWidgetSeen && hasPageContext ? 'ready' : hasWidgetInstall ? 'needs_review' : 'pending',
            actionLabel: hasWidgetSeen && !hasPageContext ? 'Map Context' : 'Open Widget Setup',
            route: hasWidgetSeen && !hasPageContext ? ANSWERLATTICE_ROUTES.PRODUCT_SURFACES : ANSWERLATTICE_ROUTES.WIDGET,
            icon: LuMessageCircle,
        },
        {
            key: 'ticket-fallback',
            title: 'Submit an unresolved question',
            description: hasTicketFallback
                ? 'Fallback prerequisites are configured. Submit one unresolved question and verify that the resulting ticket contains enough context.'
                : 'Set support email and sender configuration so unresolved questions do not get missed.',
            status: hasTicketFallback ? 'ready' : 'needs_review',
            actionLabel: hasTicketFallback ? 'Open Ticket Inbox' : 'Review Notifications',
            route: hasTicketFallback ? ANSWERLATTICE_ROUTES.TICKETS : ANSWERLATTICE_ROUTES.ACTIVATION,
            icon: LuTicket,
        },
    ];

    const content = (
        <Flex vertical gap={12}>
            {embedded ? (
                <Flex align="center" gap={8} wrap="wrap">
                    <Text strong>Test as customer</Text>
                    <Tag color="blue">Manual checklist</Tag>
                </Flex>
            ) : null}
            <Paragraph type="secondary" style={{ margin: 0 }}>
                These statuses prove prerequisites, not customer resolution. Manually preview an approved answer, ask from the installed widget with page context, and submit one unresolved fallback before launch.
            </Paragraph>
            <List
                grid={isMobile || embedded ? undefined : { gutter: 12, column: 2 }}
                dataSource={items}
                renderItem={(item) => {
                    const Icon = item.icon;
                    const meta = STATUS_META[item.status];
                    return (
                        <List.Item>
                            <Flex
                                align={isMobile ? 'stretch' : 'center'}
                                justify="space-between"
                                gap={12}
                                vertical={isMobile}
                                style={{
                                    minHeight: 108,
                                    padding: 12,
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    borderRadius: token.borderRadiusLG,
                                    background: token.colorBgContainer,
                                }}
                            >
                                <Flex align="flex-start" gap={10} style={{ minWidth: 0 }}>
                                    <span style={{ display: 'inline-flex', marginTop: 2 }}>
                                        <Icon size={18} />
                                    </span>
                                    <Flex vertical gap={4} style={{ minWidth: 0 }}>
                                        <Flex align="center" gap={8} wrap="wrap">
                                            <Text strong>{item.title}</Text>
                                            <Tag color={meta.color}>{meta.label}</Tag>
                                        </Flex>
                                        <Text type="secondary">{item.description}</Text>
                                    </Flex>
                                </Flex>
                                <Button
                                    onClick={() => onOpen(item.route)}
                                    style={{ minHeight: 44, width: isMobile ? '100%' : undefined }}
                                >
                                    {item.actionLabel}
                                </Button>
                            </Flex>
                        </List.Item>
                    );
                }}
            />
        </Flex>
    );

    if (embedded) return content;

    return (
        <Card
            title="Test as Customer"
            extra={!isMobile ? <Tag color="blue">Manual checklist</Tag> : null}
        >
            {content}
        </Card>
    );
}
