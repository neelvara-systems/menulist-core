'use client';

import { fetchLocationStats } from '@services/analytics';
import { Card, Progress, Space, Table, Typography, theme } from 'antd';
import React, { useEffect, useState } from 'react';
import { LuGlobe } from 'react-icons/lu';

const { Title, Text } = Typography;
const { useToken } = theme;

interface LocationInsightsProps {
    propertyId: string;
    dateRange: {
        startDate: string;
        endDate: string;
    };
}

interface LocationData {
    country: string;
    city: string;
    visitors: number;
    views: number;
    revenue: number;
    percentage: number;
}

const LocationInsights: React.FC<LocationInsightsProps> = ({ propertyId, dateRange }) => {
    const { token } = useToken();

    const [loading, setLoading] = useState(true);
    const [locations, setLocations] = useState<LocationData[]>([]);
    const [totalVisitors, setTotalVisitors] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await fetchLocationStats(propertyId, dateRange);

                const locationData = response?.rows?.map(row => ({
                    country: row.dimensionValues[0].value,
                    city: row.dimensionValues[1].value,
                    visitors: parseInt(row.metricValues[0].value),
                    views: parseInt(row.metricValues[1].value),
                    revenue: parseFloat(row.metricValues[2].value)
                })) || [];

                // Calculate total visitors for percentage
                const total = locationData.reduce((sum, loc) => sum + loc.visitors, 0);
                setTotalVisitors(total);

                // Add percentage and sort by visitors
                const processedData = locationData
                    .map(loc => ({
                        ...loc,
                        percentage: (loc.visitors / total) * 100
                    }))
                    .sort((a, b) => b.visitors - a.visitors);

                setLocations(processedData);
            } catch (error) {
                console.error('Error fetching location stats:', error);
            }
            setLoading(false);
        };

        fetchData();
    }, [propertyId, dateRange]);

    const columns = [
        {
            title: (
                <Space>
                    <LuGlobe />
                    Location
                </Space>
            ),
            key: 'location',
            render: (_: any, record: LocationData) => (
                <Space direction="vertical" size={0}>
                    <Text strong key={`${record.country}-${record.city}`}>{record.city}</Text>
                    <Text type="secondary">{record.country}</Text>
                </Space>
            )
        },
        {
            title: 'Visitors',
            key: 'visitors',
            render: (record: LocationData) => (
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                    <Space>
                        <Text>{record.visitors.toLocaleString()}</Text>
                        <Text type="secondary">({record.percentage.toFixed(1)}%)</Text>
                    </Space>
                    <Progress
                        percent={record.percentage}
                        showInfo={false}
                        size="small"
                        strokeColor={token.colorPrimary}
                    />
                </Space>
            )
        }
    ];

    return (
        <Card>
            <Title level={5}>Visitor Locations</Title>
            <Table
                dataSource={locations}
                columns={columns}
                loading={loading}
                rowKey="city"
                pagination={{
                    pageSize: 5,
                    hideOnSinglePage: true
                }}
                summary={() => (
                    <Table.Summary>
                        <Table.Summary.Row>
                            <Table.Summary.Cell index={0}>
                                <Text strong>Total Visitors</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1}>
                                <Text strong>{totalVisitors.toLocaleString()}</Text>
                            </Table.Summary.Cell>
                        </Table.Summary.Row>
                    </Table.Summary>
                )}
            />
        </Card>
    );
};

export default LocationInsights;
