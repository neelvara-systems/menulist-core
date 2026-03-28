import { AnalyticsData } from '@lib/analytics/types';
import { Card, Empty, Table, Typography } from 'antd';

const { Title } = Typography;

interface SourceBreakdownProps {
    data: AnalyticsData | null;
}

const SourceBreakdown: React.FC<SourceBreakdownProps> = ({ data }) => {
    const viewsBySource = data?.summary?.viewsBySource || {};

    const dataSource = Object.entries(viewsBySource)
        .map(([source, views]) => ({
            key: source,
            source: source.replace(/^viewsBySource\./, ''), // Clean up key if necessary
            views: views as number,
        }))
        .sort((a, b) => b.views - a.views);

    const columns = [
        {
            title: 'Source',
            dataIndex: 'source',
            key: 'source',
        },
        {
            title: 'Views',
            dataIndex: 'views',
            key: 'views',
            sorter: (a: { views: number }, b: { views: number }) => a.views - b.views,
            defaultSortOrder: 'descend' as const,
        },
    ];

    return (
        <Card title={<Title level={5}>Views by Source</Title>}>
            {dataSource.length > 0 ? (
                <Table dataSource={dataSource} columns={columns} pagination={false} size="small" />
            ) : (
                <Empty description="No source data available" />
            )}
        </Card>
    );
};

export default SourceBreakdown;
