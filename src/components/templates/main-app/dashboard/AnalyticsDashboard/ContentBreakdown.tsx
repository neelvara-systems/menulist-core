import { AnalyticsData } from '@lib/analytics/types';
import { Card, Empty, Table, Typography } from 'antd';

const { Title } = Typography;

interface ContentBreakdownProps {
  data: AnalyticsData | null;
}

const ContentBreakdown: React.FC<ContentBreakdownProps> = ({ data }) => {
  const viewsByContent = data?.summary?.viewsByContent || {};

  const dataSource = Object.entries(viewsByContent)
    .map(([content, views]) => ({
      key: content,
      content: content.replace(/^viewsByContent\./, ''),
      views: views as number,
    }))
    .sort((a, b) => b.views - a.views);

  const columns = [
    {
      title: 'Content',
      dataIndex: 'content',
      key: 'content',
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
    <Card title={<Title level={5}>Views by Content</Title>}>
      {dataSource.length > 0 ? (
        <Table dataSource={dataSource} columns={columns} pagination={false} size="small" />
      ) : (
        <Empty description="No content variant data available" />
      )}
    </Card>
  );
};

export default ContentBreakdown;
