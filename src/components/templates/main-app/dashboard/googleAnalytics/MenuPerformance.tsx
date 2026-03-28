'use client';

import { DollarOutlined, EyeOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { fetchMenuItemStats } from '@services/analytics';
import { Card, Space, Table, Tag, Tooltip, Typography } from 'antd';
import React, { useEffect, useState } from 'react';

const { Title, Text } = Typography;

interface MenuPerformanceProps {
    propertyId: string;
    dateRange: {
        startDate: string;
        endDate: string;
    };
}

interface MenuItem {
    name: string;
    category: string;
    views: number;
    revenue: number;
    orders: number;
}

const MenuPerformance: React.FC<MenuPerformanceProps> = ({ propertyId, dateRange }) => {
    const labels = useOfferingLabels();
    const [loading, setLoading] = useState(true);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await fetchMenuItemStats(propertyId, dateRange);

                const items = response?.rows?.map(row => ({
                    name: row.dimensionValues[0].value,
                    category: row.dimensionValues[1].value,
                    views: parseInt(row.metricValues[0].value),
                    revenue: parseFloat(row.metricValues[1].value),
                    orders: parseInt(row.metricValues[2].value)
                })) || [];

                setMenuItems(items.sort((a, b) => b.views - a.views));
            } catch (error) {
                console.error('Error fetching menu stats:', error);
            }
            setLoading(false);
        };

        fetchData();
    }, [propertyId, dateRange]);

    const columns = [
        {
            title: 'Item Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: MenuItem) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{text}</Text>
                    <Tag color="blue">{record.category}</Tag>
                </Space>
            )
        },
        {
            title: (
                <Tooltip title="Number of times this item was viewed">
                    <Space>
                        <EyeOutlined />
                        Views
                    </Space>
                </Tooltip>
            ),
            dataIndex: 'views',
            key: 'views',
            sorter: (a: MenuItem, b: MenuItem) => a.views - b.views,
            render: (views: number) => (
                <Text>{views.toLocaleString()}</Text>
            )
        },
        {
            title: (
                <Tooltip title="Number of times this item was ordered">
                    <Space>
                        <ShoppingCartOutlined />
                        Orders
                    </Space>
                </Tooltip>
            ),
            dataIndex: 'orders',
            key: 'orders',
            sorter: (a: MenuItem, b: MenuItem) => a.orders - b.orders,
            render: (orders: number) => (
                <Text>{orders.toLocaleString()}</Text>
            )
        },
        {
            title: (
                <Tooltip title="Total revenue from this item">
                    <Space>
                        <DollarOutlined />
                        Revenue
                    </Space>
                </Tooltip>
            ),
            dataIndex: 'revenue',
            key: 'revenue',
            sorter: (a: MenuItem, b: MenuItem) => a.revenue - b.revenue,
            render: (revenue: number) => (
                <Text>${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            )
        }
    ];

    return (
        <Card>
            <Title level={5}>{labels.performanceLabel}</Title>
            <Table
                dataSource={menuItems}
                columns={columns}
                loading={loading}
                rowKey="name"
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} items`
                }}
            />
        </Card>
    );
};

export default MenuPerformance;
