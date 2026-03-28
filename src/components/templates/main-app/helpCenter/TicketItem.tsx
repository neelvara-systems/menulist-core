'use client'
import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { SUPPORT_TICKET_PRIORITY, SupportTicketType } from '@type/supportTicket';
import { Badge, Card, Flex, Tooltip, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { LuAlertCircle, LuAlertTriangle, LuChevronRight, LuInfo } from 'react-icons/lu';

const { Text, Title } = Typography;

const TicketItem = ({ ticket, onClick }: { ticket: SupportTicketType, onClick: () => void }) => {
    const t = useTranslations('HelpCenter');
    const { token } = theme.useToken();

    // Priority icon and color
    const getPriorityConfig = (priority: string) => {
        switch (priority) {
            case SUPPORT_TICKET_PRIORITY.HIGH:
                return {
                    icon: <LuAlertTriangle size={16} />,
                    color: token.colorError,
                    text: t('priorityHigh'),
                    tooltip: t('priorityHighTooltip')
                };
            case SUPPORT_TICKET_PRIORITY.LOW:
                return {
                    icon: <LuInfo size={16} />,
                    color: token.colorSuccess,
                    text: t('priorityLow'),
                    tooltip: t('priorityLowTooltip')
                };
            case SUPPORT_TICKET_PRIORITY.NORMAL:
            default:
                return {
                    icon: <LuAlertCircle size={16} />,
                    color: token.colorWarning,
                    text: t('priorityMedium'),
                    tooltip: t('priorityMediumTooltip')
                };
        }
    };

    // Status badge color
    const getStatusBadge = (status: string) => {
        const statusLower = status.toLowerCase();
        if (statusLower.includes('progress')) {
            return { status: 'warning', text: t('statusInProgress'), tooltip: t('statusInProgressTooltip') };
        }
        if (statusLower.includes('resolved')) {
            return { status: 'success', text: t('statusResolved'), tooltip: t('statusResolvedTooltip') };
        }
        if (statusLower.includes('closed')) {
            return { status: 'default', text: t('statusClosed'), tooltip: t('statusClosedTooltip') };
        }
        if (statusLower.includes('open')) {
            return { status: 'error', text: t('statusOpen'), tooltip: t('statusOpenTooltip') };
        }
        return { status: 'default', text: statusLower, tooltip: status };
    };

    const priority = getPriorityConfig(ticket.priority);
    const statusBadge = getStatusBadge(ticket.status) as { status: any; text: string; tooltip: string };

    return (
        <Card
            hoverable
            onClick={onClick}
            style={{
                width: '100%',
                borderRadius: 12,
                cursor: 'pointer'
            }}
            styles={{ body: { padding: 16 } }}
        >
            <Flex vertical gap={10}>
                {/* Row 1: Ticket ID + Priority + Action Icon */}
                <Flex justify="space-between" align="center">
                    <Flex align="center" gap={6}>
                        <Text
                            strong
                            style={{
                                fontFamily: 'monospace',
                                color: token.colorTextSecondary,
                                fontSize: 13,
                                letterSpacing: 0.5
                            }}
                        >
                            {ticket.displayId}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>·</Text>
                        <Tooltip title={priority.tooltip}>
                            <Flex align="center" gap={4} style={{ color: priority.color, cursor: 'help' }}>
                                {priority.icon}
                                <Text strong style={{ color: priority.color, fontSize: 13 }}>
                                    {priority.text}
                                </Text>
                            </Flex>
                        </Tooltip>
                    </Flex>
                    <LuChevronRight
                        size={18}
                        color={token.colorTextTertiary}
                        style={{ flexShrink: 0 }}
                    />
                </Flex>

                {/* Row 2: Subject */}
                <Title
                    level={5}
                    ellipsis={{ rows: 2 }}
                    style={{ margin: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}
                >
                    {ticket.subject}
                </Title>

                {/* Row 3: Category + Status + Time (compact single line) */}
                <Flex align="center" gap={6} wrap>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {ticket.category}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>·</Text>
                    <Tooltip title={statusBadge.tooltip}>
                        <span>
                            <Badge
                                status={statusBadge.status}
                                text={statusBadge.text}
                                style={{ fontSize: 12, cursor: 'help' }}
                            />
                        </span>
                    </Tooltip>
                    <Text type="secondary" style={{ fontSize: 12 }}>·</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        <DateTimeDisplay value={ticket.modifiedOn || ticket.createdOn} mode="fromnow" />
                    </Text>
                </Flex>
            </Flex>
        </Card>
    );
};

export default TicketItem;
