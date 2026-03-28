import { Card, Table, Typography, Empty } from 'antd';
import { AnalyticsData } from '@lib/analytics/types';

const { Title } = Typography;

interface MediumBreakdownProps {
  data: AnalyticsData | null;
}

const MediumBreakdown: React.FC<MediumBreakdownProps> = ({ data }) => {
  const viewsByMedium = data?.summary?.viewsByMedium || {};

  const dataSource = Object.entries(viewsByMedium)
    .map(([medium, views]) => ({
      key: medium,
      medium: medium.replace(/^viewsByMedium\./, ''), // Clean up key
      views: views as number,
    }))
    .sort((a, b) => b.views - a.views);

  const columns = [
    {
      title: 'Medium',
      dataIndex: 'medium',
      key: 'medium',
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
    <Card title={<Title level={5}>Views by Medium</Title>}>
      {dataSource.length > 0 ? (
        <Table dataSource={dataSource} columns={columns} pagination={false} size="small" />
      ) : (
        <Empty description="No medium data available" />
      )}
    </Card>
  );
};

export default MediumBreakdown;
