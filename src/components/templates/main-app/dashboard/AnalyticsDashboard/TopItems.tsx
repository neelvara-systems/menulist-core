import { useOfferingLabels } from '@hook/useOfferingLabels';
import { AnalyticsData } from '@lib/analytics/types';
import { Card, Empty, List, Tag, Typography, theme } from 'antd';
import React from 'react';
import { LuFlame } from 'react-icons/lu';

const { Title, Text } = Typography;
const { useToken } = theme;

interface TopItemsProps {
  data: AnalyticsData | null;
}

const TopItems: React.FC<TopItemsProps> = ({ data }) => {
    const { token } = useToken();
    const countTagStyle = {
        backgroundColor: token.colorPrimaryBg,
        borderColor: token.colorPrimaryBorder,
        color: token.colorPrimaryText,
    };

    // Get top items from summary or calculate from daily data
  const getTopItems = () => {
    if (!data) return [];

    // Use summary data if available
    if (data.summary?.topItems && data.summary.topItems.length > 0) {
      return data.summary.topItems.slice(0, 10);
    }

    // Calculate from daily data if summary not available
    if (data.daily && data.daily.length > 0) {
      const itemClicks: Record<string, { id: string; name: string; clicks: number }> = {};

      // Aggregate clicks by item across all days
      data.daily.forEach(day => {
        if (day.clicksByItem) {
          Object.entries(day.clicksByItem).forEach(([itemId, clicks]) => {
            if (!itemClicks[itemId]) {
              itemClicks[itemId] = {
                id: itemId,
                name: day.itemNames?.[itemId] || itemId,
                clicks: 0
              };
            }
            itemClicks[itemId].clicks += clicks;
          });
        }
      });

      // Sort by clicks and take top 10
      return Object.values(itemClicks)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10)
        .map(item => ({
          menuItemId: item.id,
          name: item.name,
          totalClicks: item.clicks,
          lastClicked: ''
        }));
    }

    return [];
  };

  const topItems = getTopItems();

  const labels = useOfferingLabels();

  if (topItems.length === 0) {
    return (
      <Card>
        <Title level={5}>{labels.topItemsLabel}</Title>
        <Empty description="No item click data available" />
      </Card>
    );
  }

  return (
    <Card>
      <Title level={5}>{labels.topItemsLabel}</Title>
      <List
        dataSource={topItems}
        renderItem={(item, index) => (
          <List.Item>
            <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
              <div style={{ marginRight: 16, minWidth: 24, textAlign: 'center' }}>
                    {index < 3 ? (
                    <LuFlame style={{
                    color: index === 0
                        ? token.colorError
                        : index === 1
                            ? token.colorWarning
                            : token.colorSuccess,
                    fontSize: 18
                  }} />
                ) : (
                  <Text type="secondary">{index + 1}</Text>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <Text strong>{item.name}</Text>
              </div>
              <div>
                <Tag style={countTagStyle}>{item.totalClicks} clicks</Tag>
              </div>
            </div>
          </List.Item>
        )}
      />
    </Card>
  );
};

export default TopItems;
