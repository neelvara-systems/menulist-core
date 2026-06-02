'use client';

import { Line } from '@ant-design/plots';
import { fetchDateRangeStats } from '@services/analytics';
import { formatDateKey } from '@util/dateTime';
import { Spin, Tabs, Typography } from 'antd';
import { useFormatter } from 'next-intl';
import React, { useEffect, useState } from 'react';

const { Title } = Typography;

interface TrendAnalysisProps {
    propertyId: string;
    dateRange: {
        startDate: string;
        endDate: string;
    };
}

interface ChartData {
    date: string;
    value: number;
    metric: string;
}

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ propertyId, dateRange }) => {
    const formatter = useFormatter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ChartData[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await fetchDateRangeStats(propertyId, dateRange);

                const chartData: ChartData[] = [];
                response?.rows?.forEach(row => {
                    const date = row.dimensionValues[0].value;
                    const formattedDate = formatDateKey(date, formatter);

                    // Add visitors data
                    chartData.push({
                        date: formattedDate,
                        value: parseInt(row.metricValues[0].value),
                        metric: 'Visitors'
                    });

                    // Add page views data
                    chartData.push({
                        date: formattedDate,
                        value: parseInt(row.metricValues[1].value),
                        metric: 'Page Views'
                    });

                    // Add revenue data
                    chartData.push({
                        date: formattedDate,
                        value: parseFloat(row.metricValues[3].value),
                        metric: 'Revenue'
                    });
                });

                setData(chartData);
            } catch (error) {
                console.error('Error fetching trend data:', error);
            }
            setLoading(false);
        };

        fetchData();
    }, [formatter, propertyId, dateRange]);

    const renderChart = (metricName: string) => {
        const metricData = data.filter(item => item.metric === metricName);

        const config = {
            data: metricData,
            xField: 'date',
            yField: 'value',
            smooth: true,
            animation: {
                appear: {
                    animation: 'path-in',
                    duration: 1000,
                },
            },
            tooltip: {
                formatter: (datum: any) => {
                    return {
                        name: metricName,
                        value: metricName === 'Revenue'
                            ? `$${datum.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                            : datum.value.toLocaleString()
                    };
                }
            },
            yAxis: {
                label: {
                    formatter: (value: any) => {
                        if (metricName === 'Revenue') {
                            return `$${value}`;
                        }
                        return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value;
                    }
                }
            }
        };

        return <Line {...config} />;
    };

    const items = [
        {
            key: 'visitors',
            label: 'Visitors',
            children: loading ? <Spin /> : renderChart('Visitors')
        },
        {
            key: 'pageViews',
            label: 'Page Views',
            children: loading ? <Spin /> : renderChart('Page Views')
        },
        {
            key: 'revenue',
            label: 'Revenue',
            children: loading ? <Spin /> : renderChart('Revenue')
        }
    ];

    return (
        <>
            <Title level={5}>Trend Analysis</Title>
            <Tabs items={items} />
        </>
    );
};

export default TrendAnalysis;
