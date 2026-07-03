'use client';

import { fetchDateRangeStats, fetchRealTimeStats } from '@services/analytics';
import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from '@lib/analytics/analyticsDiagnostics';
import { Card, Col, Row, Statistic, Typography, theme } from 'antd';
import React, { useEffect, useState } from 'react';
import { LuDollarSign, LuEye, LuShoppingCart, LuUser } from 'react-icons/lu';

const { Text } = Typography;
const { useToken } = theme;

interface QuickStatsProps {
    propertyId: string;
    dateRange: {
        startDate: string;
        endDate: string;
    };
}

const QuickStats: React.FC<QuickStatsProps> = ({ propertyId, dateRange }) => {
    const { token } = useToken();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        activeUsers: 0,
        totalVisitors: 0,
        totalOrders: 0,
        totalRevenue: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const [realTimeData, rangeData] = await Promise.all([
                    fetchRealTimeStats(propertyId),
                    fetchDateRangeStats(propertyId, dateRange)
                ]);

                // Process real-time data
                const activeUsers = realTimeData?.rows?.[0]?.metricValues?.[0]?.value || 0;

                // Process date range data
                const totalVisitors = rangeData?.rows?.reduce((sum, row) =>
                    sum + parseInt(row.metricValues?.[0]?.value || '0', 10), 0) || 0;
                const totalRevenue = rangeData?.rows?.reduce((sum, row) =>
                    sum + parseFloat(row.metricValues?.[2]?.value || '0'), 0) || 0;
                const totalOrders = 0;

                setStats({
                    activeUsers: parseInt(String(activeUsers), 10),
                    totalVisitors,
                    totalOrders,
                    totalRevenue
                });
            } catch (error) {
                logAnalyticsFailure('dashboard_google_quick_stats_load_failed', error, {
                    ...getBoundedAnalyticsStringContext('propertyId', propertyId),
                    ...getBoundedAnalyticsStringContext('startDate', dateRange.startDate),
                    ...getBoundedAnalyticsStringContext('endDate', dateRange.endDate),
                });
            }
            setLoading(false);
        };

        fetchStats();
        // Refresh real-time data every minute
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, [propertyId, dateRange]);

    const statCards = [
            {
                title: 'Active Now',
                value: stats.activeUsers,
            icon: <LuUser style={{ color: token.colorPrimary }} />,
                suffix: 'users',
                precision: 0
            },
            {
                title: 'Total Visitors',
                value: stats.totalVisitors,
            icon: <LuEye style={{ color: token.colorSuccess }} />,
                suffix: 'views',
                precision: 0
            },
            {
                title: 'Total Orders',
                value: stats.totalOrders,
            icon: <LuShoppingCart style={{ color: token.colorInfo }} />,
                suffix: 'orders',
                precision: 0
            },
            {
                title: 'Total Revenue',
                value: stats.totalRevenue,
            icon: <LuDollarSign style={{ color: token.colorWarning }} />,
                prefix: '$',
                precision: 2
            }
    ];

    return (
        <Row gutter={[16, 16]}>
            {statCards.map((stat, index) => (
                <Col key={index} xs={24} sm={12} md={6}>
                    <Card>
                            <Statistic
                                title={
                                <Text style={{ fontSize: '14px', color: token.colorTextSecondary }}>
                                    <span style={{ marginRight: '8px' }}>{stat.icon}</span>
                                    {stat.title}
                                </Text>
                            }
                            value={loading ? '-' : stat.value}
                            prefix={stat.prefix}
                            suffix={stat.suffix}
                            precision={stat.precision}
                            loading={loading}
                        />
                    </Card>
                </Col>
            ))}
        </Row>
    );
};

export default QuickStats;
