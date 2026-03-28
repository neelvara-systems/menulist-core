import { SUPPORT_TICKET_STATUS, SupportTicketType } from '@type/supportTicket';
import { Card, Col, Flex, Row, theme, Typography } from 'antd';
import { useMemo } from 'react';
import { IconType } from 'react-icons';
import { LuAlertCircle, LuCheckCircle, LuClipboardList, LuClock } from 'react-icons/lu';

const { Text } = Typography;
const { useToken } = theme;

interface StatCardProps {
    title: string;
    value: number;
    icon: IconType;
    color?: string;
}

interface TicketStatsCardsProps {
    tickets: SupportTicketType[];
}

const StatCard = ({ title, value, icon: Icon, color }: StatCardProps) => {
    const { token } = useToken();

    return (
        <Card
            variant='borderless'
            styles={{ body: { padding: 16 } }}
            style={{
                borderRadius: 12,
                border: `1px solid ${token.colorBorderSecondary}`,
            }}
        >
            <Flex justify="space-between" align="flex-start" style={{ marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>{title}</Text>
                <div style={{
                    padding: 6,
                    borderRadius: 6,
                    backgroundColor: color ? `${color}15` : token.colorBgLayout,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon size={16} color={color || token.colorTextSecondary} />
                </div>
            </Flex>
            <Text strong style={{ fontSize: 28, fontWeight: 700, color: token.colorText }}>{value}</Text>
        </Card>
    );
};

export default function TicketStatsCards({ tickets }: TicketStatsCardsProps) {
    const { token } = useToken();

    // Calculate stats from tickets
    const stats = useMemo(() => {
        const total = tickets?.length;
        const open = tickets.filter(t =>
            t.status === SUPPORT_TICKET_STATUS.OPEN ||
            t.status === SUPPORT_TICKET_STATUS.IN_PROGRESS
        ).length;
        const resolved = tickets.filter(t =>
            t.status === SUPPORT_TICKET_STATUS.RESOLVED
        ).length;
        const unresolved = tickets.filter(t =>
            t.status !== SUPPORT_TICKET_STATUS.RESOLVED &&
            t.status !== SUPPORT_TICKET_STATUS.CLOSED
        ).length;

        return { total, open, resolved, unresolved };
    }, [tickets]);

    return (
        <Row gutter={[16, 16]}>
            <Col xs={12} sm={12} md={6}>
                <StatCard
                    title="Total Tickets"
                    value={stats.total}
                    icon={LuClipboardList}
                    color={token.colorPrimary}
                />
            </Col>
            <Col xs={12} sm={12} md={6}>
                <StatCard
                    title="Open Tickets"
                    value={stats.open}
                    icon={LuClock}
                    color={token.colorInfo}
                />
            </Col>
            <Col xs={12} sm={12} md={6}>
                <StatCard
                    title="Resolved Tickets"
                    value={stats.resolved}
                    icon={LuCheckCircle}
                    color={token.colorSuccess}
                />
            </Col>
            <Col xs={12} sm={12} md={6}>
                <StatCard
                    title="Unresolved Tickets"
                    value={stats.unresolved}
                    icon={LuAlertCircle}
                    color={token.colorError}
                />
            </Col>
        </Row>
    );
}
