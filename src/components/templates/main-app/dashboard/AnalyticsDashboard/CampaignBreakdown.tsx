import { Card, Table, Typography, Empty } from 'antd';
import { AnalyticsData } from '@lib/analytics/types';

const { Title } = Typography;

interface CampaignBreakdownProps {
  data: AnalyticsData | null;
}

const CampaignBreakdown: React.FC<CampaignBreakdownProps> = ({ data }) => {
  const viewsByCampaign = data?.summary?.viewsByCampaign || {};

  const dataSource = Object.entries(viewsByCampaign)
    .map(([campaign, views]) => ({
      key: campaign,
      campaign: campaign.replace(/^viewsByCampaign\./, ''), // Clean up key
      views: views as number,
    }))
    .sort((a, b) => b.views - a.views);

  const columns = [
    {
      title: 'Campaign',
      dataIndex: 'campaign',
      key: 'campaign',
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
    <Card title={<Title level={5}>Views by Campaign</Title>}>
      {dataSource.length > 0 ? (
        <Table dataSource={dataSource} columns={columns} pagination={false} size="small" />
      ) : (
        <Empty description="No campaign data available" />
      )}
    </Card>
  );
};

export default CampaignBreakdown;
