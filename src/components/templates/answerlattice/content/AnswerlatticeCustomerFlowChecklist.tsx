'use client';

import {
    ANSWERLATTICE_ROUTES,
    getAnswerlatticeGovernanceRoute,
    ANSWERLATTICE_GOVERNANCE_TABS,
} from '@constant/answerlattice/navigations';
import type { AnswerlatticeActivationSummary } from '@type/answerlattice';
import { Button, Card, Flex, List, Tag, Typography, theme } from 'antd';
import {
    LuBookOpen,
    LuCheckCircle2,
    LuMessageCircle,
    LuRadioTower,
    LuRouter,
    LuTicket,
} from 'react-icons/lu';

const { Paragraph, Text } = Typography;

type AnswerlatticeCustomerFlowChecklistProps = {
    summary: AnswerlatticeActivationSummary;
    isMobile?: boolean;
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
    icon: typeof LuCheckCircle2;
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
    const hasReleaseNotes = summary.content.changelogCount > 0;
    const hasSignals = summary.content.ticketCount > 0;

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
            key: 'widget',
            title: 'Ask from the widget',
            description: hasWidgetSeen
                ? `Recent widget telemetry exists for ${summary.widget.runtimeStatus?.lastPath || 'a product page'}. Ask one real question in the installed product.`
                : 'Install the widget and open your product once to confirm customers can ask in context.',
            status: hasWidgetSeen ? 'ready' : hasWidgetInstall ? 'needs_review' : 'pending',
            actionLabel: 'Open Widget Setup',
            route: ANSWERLATTICE_ROUTES.WIDGET,
            icon: LuMessageCircle,
        },
        {
            key: 'page-context',
            title: 'Confirm page context',
            description: hasPageContext
                ? `Recent context is ${summary.widget.runtimeStatus?.lastContextKey || summary.widget.runtimeStatus?.lastFeature || summary.widget.runtimeStatus?.lastPage}. Verify that the answer changes only when the approved scope should change.`
                : 'Send a context key or page value after route changes so answers match the screen the customer is on.',
            status: hasPageContext ? 'ready' : hasWidgetInstall ? 'needs_review' : 'pending',
            actionLabel: 'Map Context',
            route: ANSWERLATTICE_ROUTES.PRODUCT_SURFACES,
            icon: LuRouter,
        },
        {
            key: 'ticket-fallback',
            title: 'Review fallback tickets',
            description: hasTicketFallback
                ? 'Fallback prerequisites are configured. Submit one unresolved question and verify that the resulting ticket contains enough context.'
                : 'Set support email and sender configuration so unresolved questions do not get missed.',
            status: hasTicketFallback ? 'ready' : 'needs_review',
            actionLabel: hasTicketFallback ? 'Open Ticket Inbox' : 'Review Notifications',
            route: hasTicketFallback ? ANSWERLATTICE_ROUTES.TICKETS : ANSWERLATTICE_ROUTES.ACTIVATION,
            icon: LuTicket,
        },
        {
            key: 'release-notes',
            title: 'Review release notes',
            description: hasReleaseNotes
                ? 'Customers can see recent product changes from the release notes surface.'
                : 'Add release notes when product changes affect support answers.',
            status: hasReleaseNotes ? 'ready' : 'optional',
            actionLabel: hasReleaseNotes ? 'Review Changelog' : 'Add Release',
            route: ANSWERLATTICE_ROUTES.CHANGELOG,
            icon: LuRadioTower,
        },
        {
            key: 'signals',
            title: 'Review knowledge gaps',
            description: hasSignals
                ? 'Ticket signals are available for the owner review queue.'
                : 'Resolved tickets and repeated gaps will appear in the review queue after signals collect.',
            status: hasSignals ? 'ready' : 'optional',
            actionLabel: 'Open Signal Queue',
            route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.SIGNAL_QUEUE),
            icon: LuCheckCircle2,
        },
    ];

    return (
        <Card
            title="Test as Customer"
            extra={!isMobile ? <Tag color="blue">Manual checklist</Tag> : null}
        >
            <Flex vertical gap={12}>
                <Paragraph type="secondary" style={{ margin: 0 }}>
                    These statuses prove prerequisites, not customer resolution. Manually find an answer, ask in the installed widget, fall back to a ticket, and inspect the resulting knowledge signal before launch.
                </Paragraph>
                <List
                    grid={isMobile ? undefined : { gutter: 12, column: 2 }}
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
        </Card>
    );
}
