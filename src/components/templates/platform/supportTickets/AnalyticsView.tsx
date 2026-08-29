'use client';

import {
    calculateSupportTicketSLAStatus,
    getFirstSupportTicketResponse,
    getSupportTicketTimestampMillis,
    SUPPORT_TICKET_PRIORITY,
    SUPPORT_TICKET_STATUS,
    SupportTicketType,
} from '@type/supportTicket';
import { Badge, Card, Col, Flex, Progress, Row, Space, Statistic, Tag, theme, Tooltip, Typography } from 'antd';
import { useMemo } from 'react';
import { LuHelpCircle } from 'react-icons/lu';
import TicketStatsCards from './TicketStatsCards';

const { Title, Text } = Typography;
const { useToken } = theme;

interface AnalyticsViewProps {
    tickets: SupportTicketType[];
}

const formatSupportTicketDuration = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
    if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
};

function AnalyticsView({ tickets }: AnalyticsViewProps) {
    const { token } = useToken();

    const analyticsData = useMemo(() => {
        if (!tickets?.length) return null;

        try {
            const totalOpenTickets = tickets.filter(t =>
                t.status === SUPPORT_TICKET_STATUS.OPEN || t.status === SUPPORT_TICKET_STATUS.IN_PROGRESS
            ).length;

            const ticketsByStatus = tickets.reduce((acc, ticket) => {
                acc[ticket.status] = (acc[ticket.status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const statusChartData = Object.entries(ticketsByStatus).map(([type, value]) => ({ type, value }));

            const ticketsByCategory = tickets.reduce((acc, ticket) => {
                acc[ticket.category] = (acc[ticket.category] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const categoryChartData = Object.entries(ticketsByCategory).map(([category, count]) => ({ category, count }));

            // Tickets by priority
            const ticketsByPriority = tickets.reduce((acc, ticket) => {
                acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const priorityChartData = Object.entries(ticketsByPriority).map(([type, value]) => ({ type, value }));

            // Tickets over time (last 30 days)
            const now = Date.now();
            const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
            const ticketsLast30Days = tickets.filter((ticket) => {
                const createdOnMillis = getSupportTicketTimestampMillis(ticket.createdOn);
                return createdOnMillis !== null
                    && createdOnMillis >= thirtyDaysAgo
                    && createdOnMillis <= now;
            });

            // Group by day
            const ticketsByDay = ticketsLast30Days.reduce((acc, ticket) => {
                const createdOnMillis = getSupportTicketTimestampMillis(ticket.createdOn);
                if (createdOnMillis !== null) {
                    const dayKey = new Date(createdOnMillis).toISOString().slice(0, 10);
                    acc[dayKey] = (acc[dayKey] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>);

            const timelineData = Object.entries(ticketsByDay)
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => a.date.localeCompare(b.date));

            // Calculate average first response time (creation to first message from admin)
            const firstResponseTimes: number[] = [];
            tickets.forEach(ticket => {
                if (ticket.messages && ticket.messages.length > 0) {
                    // Find first message that's not from the ticket creator
                    const firstAdminMessage = getFirstSupportTicketResponse(ticket);
                    const responseMillis = getSupportTicketTimestampMillis(firstAdminMessage?.timestamp);
                    const createdOnMillis = getSupportTicketTimestampMillis(ticket.createdOn);
                    if (
                        responseMillis !== null
                        && createdOnMillis !== null
                        && responseMillis >= createdOnMillis
                    ) {
                        firstResponseTimes.push(responseMillis - createdOnMillis);
                    }
                }
            });

            const avgFirstResponseTime = firstResponseTimes.length > 0
                ? formatSupportTicketDuration(firstResponseTimes.reduce((a, b) => a + b, 0) / firstResponseTimes.length)
                : 'N/A';

            // Calculate average resolution time (creation to resolved status)
            const resolutionTimes: number[] = [];
            tickets.forEach(ticket => {
                if (ticket.status === SUPPORT_TICKET_STATUS.RESOLVED || ticket.status === SUPPORT_TICKET_STATUS.CLOSED) {
                    const resolvedStatus = ticket.statuses?.find(
                        s => s.status === SUPPORT_TICKET_STATUS.RESOLVED || s.status === SUPPORT_TICKET_STATUS.CLOSED
                    );
                    const resolutionMillis = getSupportTicketTimestampMillis(resolvedStatus?.timestamp);
                    const createdOnMillis = getSupportTicketTimestampMillis(ticket.createdOn);
                    if (
                        resolutionMillis !== null
                        && createdOnMillis !== null
                        && resolutionMillis >= createdOnMillis
                    ) {
                        resolutionTimes.push(resolutionMillis - createdOnMillis);
                    }
                }
            });

            const avgResolutionTime = resolutionTimes.length > 0
                ? formatSupportTicketDuration(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
                : 'N/A';

            // SLA Compliance Metrics
            const slaMetrics = {
                onTime: 0,
                atRisk: 0,
                breached: 0,
            };

            tickets.forEach(ticket => {
                if (!ticket.createdOn) return;
                const isResolved = ticket.status === SUPPORT_TICKET_STATUS.RESOLVED || ticket.status === SUPPORT_TICKET_STATUS.CLOSED;
                const sla = calculateSupportTicketSLAStatus(ticket);
                if (!sla) return;
                if (sla.resolutionStatus === 'breached') {
                    slaMetrics.breached++;
                } else if (sla.resolutionStatus === 'at_risk' && !isResolved) {
                    slaMetrics.atRisk++;
                } else {
                    slaMetrics.onTime++;
                }
            });

            const slaComplianceRate = tickets?.length > 0
                ? Math.round((slaMetrics.onTime / tickets?.length) * 100)
                : 0;

            return {
                totalOpenTickets,
                statusChartData,
                categoryChartData,
                priorityChartData,
                timelineData,
                avgFirstResponseTime,
                avgResolutionTime,
                slaMetrics,
                slaComplianceRate
            };
        } catch (error) {
            return null;
        }
    }, [tickets]);

    if (!analyticsData) {
        return (
            <Card>
                <Flex vertical align="center" gap={16} style={{ padding: '60px 20px' }}>
                    <Typography.Title level={4} type="secondary">No ticket activity yet</Typography.Title>
                    <Typography.Text type="secondary">Analytics will appear after customers contact support.</Typography.Text>
                </Flex>
            </Card>
        );
    }

    return (
        <Flex vertical gap={24}>
            {/* Quick Stats Cards */}
            <TicketStatsCards tickets={tickets} />

            {/* Performance Metrics - What matters daily */}
            <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                    <Card
                        variant='borderless'
                        styles={{ body: { padding: 16 } }}
                        style={{
                            borderRadius: 12,
                            border: `1px solid ${token.colorBorderSecondary}`
                        }}
                    >
                        <Statistic
                            title={<Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>Avg. First Response</Text>}
                            value={analyticsData.avgFirstResponseTime}
                            valueStyle={{ fontSize: 24, fontWeight: 700 }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card
                        variant='borderless'
                        styles={{ body: { padding: 16 } }}
                        style={{
                            borderRadius: 12,
                            border: `1px solid ${token.colorBorderSecondary}`
                        }}
                    >
                        <Statistic
                            title={<Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>Avg. Resolution</Text>}
                            value={analyticsData.avgResolutionTime}
                            valueStyle={{ fontSize: 24, fontWeight: 700 }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card
                        variant='borderless'
                        styles={{ body: { padding: 16 } }}
                        style={{
                            borderRadius: 12,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderLeft: `4px solid ${token.colorWarning}`
                        }}
                    >
                        <Statistic
                            title={<Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>High Priority</Text>}
                            value={tickets.filter(t => t.priority === SUPPORT_TICKET_PRIORITY.HIGH).length}
                            valueStyle={{ fontSize: 24, fontWeight: 700, color: token.colorWarning }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card
                        variant='borderless'
                        styles={{ body: { padding: 16 } }}
                        style={{
                            borderRadius: 12,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderLeft: `4px solid ${token.colorError}`
                        }}
                    >
                        <Statistic
                            title={<Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>Needs Attention</Text>}
                            value={analyticsData.slaMetrics.breached + analyticsData.slaMetrics.atRisk}
                            valueStyle={{ fontSize: 24, fontWeight: 700, color: token.colorError }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* SLA Metrics Row */}
            <Row gutter={[16, 16]}>
                <Col xs={12} sm={8}>
                    <Card
                        variant='borderless'
                        styles={{ body: { padding: 16 } }}
                        style={{
                            borderRadius: 12,
                            border: `1px solid ${token.colorBorderSecondary}`
                        }}
                    >
                        <Statistic
                            title={
                                <Tooltip title="Percentage of tickets resolved within time commitments (High: 24h, Normal: 72h, Low: 168h)">
                                    <Space size={4}>
                                        <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>SLA Compliance</Text>
                                        <LuHelpCircle style={{ fontSize: 12, opacity: 0.5 }} />
                                    </Space>
                                </Tooltip>
                            }
                            value={analyticsData.slaComplianceRate}
                            suffix="%"
                            valueStyle={{
                                fontSize: 28,
                                fontWeight: 700,
                                color: analyticsData.slaComplianceRate >= 90 ? token.colorSuccess : analyticsData.slaComplianceRate >= 70 ? token.colorWarning : token.colorError
                            }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={8}>
                    <Card
                        variant='borderless'
                        styles={{ body: { padding: 16 } }}
                        style={{
                            borderRadius: 12,
                            border: `1px solid ${token.colorBorderSecondary}`
                        }}
                    >
                        <Statistic
                            title={
                                <Tooltip title="Tickets that exceeded the resolution time deadline">
                                    <Space size={4}>
                                        <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>SLA Breached</Text>
                                        <LuHelpCircle style={{ fontSize: 12, opacity: 0.5 }} />
                                    </Space>
                                </Tooltip>
                            }
                            value={analyticsData.slaMetrics.breached}
                            valueStyle={{ fontSize: 28, fontWeight: 700, color: token.colorError }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={8}>
                    <Card
                        variant='borderless'
                        styles={{ body: { padding: 16 } }}
                        style={{
                            borderRadius: 12,
                            border: `1px solid ${token.colorBorderSecondary}`
                        }}
                    >
                        <Statistic
                            title={
                                <Tooltip title="Tickets using 80-100% of allowed time (need urgent attention)">
                                    <Space size={4}>
                                        <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>SLA At Risk</Text>
                                        <LuHelpCircle style={{ fontSize: 12, opacity: 0.5 }} />
                                    </Space>
                                </Tooltip>
                            }
                            value={analyticsData.slaMetrics.atRisk}
                            valueStyle={{ fontSize: 28, fontWeight: 700, color: token.colorWarning }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Status & Category Cards */}
            <Row gutter={[16, 16]}>
                {/* Tickets by Status - List View */}
                <Col xs={24} lg={12}>
                    <Card
                        title={<Text strong style={{ fontSize: 16 }}>Tickets by Status</Text>}
                        variant='borderless'
                        style={{
                            borderRadius: 12,
                            border: `1px solid ${token.colorBorderSecondary}`
                        }}
                    >
                        <Space direction="vertical" size={16} style={{ width: '100%' }}>
                            {analyticsData.statusChartData.map((item: any) => {
                                const percentage = ((item.value / tickets?.length) * 100).toFixed(0);
                                const statusColors: Record<string, string> = {
                                    [SUPPORT_TICKET_STATUS.OPEN]: token.colorInfo,
                                    [SUPPORT_TICKET_STATUS.IN_PROGRESS]: token.colorWarning,
                                    [SUPPORT_TICKET_STATUS.RESOLVED]: token.colorSuccess,
                                    [SUPPORT_TICKET_STATUS.CLOSED]: token.colorTextTertiary,
                                };
                                return (
                                    <div key={item.type}>
                                        <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                                            <Space>
                                                <Badge color={statusColors[item.type] || token.colorPrimary} />
                                                <Text>{item.type}</Text>
                                            </Space>
                                            <Space>
                                                <Text strong style={{ fontSize: 16 }}>{item.value}</Text>
                                                <Text type="secondary" style={{ fontSize: 12 }}>({percentage}%)</Text>
                                            </Space>
                                        </Flex>
                                        <Progress
                                            percent={Number(percentage)}
                                            strokeColor={statusColors[item.type] || token.colorPrimary}
                                            showInfo={false}
                                            size="small"
                                        />
                                    </div>
                                );
                            })}
                        </Space>
                    </Card>
                </Col>

                {/* Tickets by Category - List View */}
                <Col xs={24} lg={12}>
                    <Card
                        title={<Text strong style={{ fontSize: 16 }}>Tickets by Category</Text>}
                        variant='borderless'
                        style={{
                            borderRadius: 12,
                            border: `1px solid ${token.colorBorderSecondary}`
                        }}
                    >
                        <Space direction="vertical" size={16} style={{ width: '100%' }}>
                            {analyticsData.categoryChartData.map((item: any, index: number) => {
                                const total = analyticsData.categoryChartData.reduce((sum: number, cat: any) => sum + cat.count, 0);
                                const percentage = ((item.count / total) * 100).toFixed(0);
                                const colors = [token.colorPrimary, token.colorSuccess, token.colorWarning, token.colorError, token.colorInfo];
                                return (
                                    <div key={item.category}>
                                        <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                                            <Space>
                                                <Badge color={colors[index % colors.length]} />
                                                <Text>{item.category}</Text>
                                            </Space>
                                            <Space>
                                                <Text strong style={{ fontSize: 16 }}>{item.count}</Text>
                                                <Text type="secondary" style={{ fontSize: 12 }}>({percentage}%)</Text>
                                            </Space>
                                        </Flex>
                                        <Progress
                                            percent={Number(percentage)}
                                            strokeColor={colors[index % colors.length]}
                                            showInfo={false}
                                            size="small"
                                        />
                                    </div>
                                );
                            })}
                        </Space>
                    </Card>
                </Col>
            </Row>

            {/* Priority Breakdown */}
            <Card
                title={<Text strong style={{ fontSize: 16 }}>Tickets by Priority</Text>}
                variant='borderless'
                style={{
                    borderRadius: 12,
                    border: `1px solid ${token.colorBorderSecondary}`
                }}
            >
                <Row gutter={[12, 12]}>
                    {analyticsData.priorityChartData.map((item: any) => {
                        const percentage = ((item.value / tickets?.length) * 100).toFixed(0);
                        const priorityConfig: Record<string, { color: string; label: string }> = {
                            [SUPPORT_TICKET_PRIORITY.HIGH]: { color: token.colorError, label: 'High' },
                            [SUPPORT_TICKET_PRIORITY.NORMAL]: { color: token.colorInfo, label: 'Normal' },
                            [SUPPORT_TICKET_PRIORITY.LOW]: { color: token.colorSuccess, label: 'Low' },
                        };
                        const config = priorityConfig[item.type] || { color: token.colorPrimary, label: item.type };

                        return (
                            <Col xs={24} sm={8} key={item.type}>
                                <Card
                                    size="small"
                                    style={{
                                        borderLeft: `4px solid ${config.color}`,
                                        backgroundColor: token.colorBgLayout
                                    }}
                                >
                                    <Flex justify="space-between" align="center">
                                        <Space>
                                            <Tag color={config.color}>{config.label}</Tag>
                                            <Text type="secondary">{percentage}%</Text>
                                        </Space>
                                        <Text strong style={{ fontSize: 24, color: config.color }}>{item.value}</Text>
                                    </Flex>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            </Card>
        </Flex>
    );
}

export default AnalyticsView;
