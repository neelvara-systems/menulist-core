import { AnalyticsData } from '@lib/analytics/types';
import { Card, Col, Empty, List, Row, Statistic, Tag, Typography } from 'antd';
import React, { useMemo } from 'react';

const { Text, Title } = Typography;

interface CustomerIntentInsightsProps {
  data: AnalyticsData | null;
}

function sumMapValues(map?: Record<string, number>): number {
  if (!map) return 0;
  return Object.values(map).reduce((sum, value) => sum + (value || 0), 0);
}

const CustomerIntentInsights: React.FC<CustomerIntentInsightsProps> = ({ data }) => {
  const computed = useMemo(() => {
    if (!data?.daily?.length) {
      return {
        totalSearches: 0,
        zeroResultSearches: 0,
        totalUnavailableItemTaps: 0,
        totalMenuActionClicks: 0,
        actionBreakdown: {} as Record<string, number>,
        topSearchTerms: [] as Array<{ term: string; count: number }>,
        unavailableItems: [] as Array<{ itemId: string; name?: string; count: number }>,
      };
    }

    const actionBreakdown: Record<string, number> = {};
    const searchTerms: Record<string, number> = {};
    const unavailableItems: Record<string, { count: number; name?: string }> = {};

    let totalSearches = 0;
    let zeroResultSearches = 0;
    let totalUnavailableItemTaps = 0;
    let totalMenuActionClicks = 0;

    for (const day of data.daily) {
      totalSearches += day.totalSearches || 0;
      zeroResultSearches += day.zeroResultSearches || 0;
      totalUnavailableItemTaps += day.totalUnavailableItemTaps || 0;
      totalMenuActionClicks += day.totalMenuActionClicks || 0;

      if (day.menuActionClicks) {
        for (const [action, count] of Object.entries(day.menuActionClicks)) {
          actionBreakdown[action] = (actionBreakdown[action] || 0) + (count || 0);
        }
      }

      if (day.searchTerms) {
        for (const [term, count] of Object.entries(day.searchTerms)) {
          searchTerms[term] = (searchTerms[term] || 0) + (count || 0);
        }
      }

      if (day.unavailableItemTapsByItem) {
        for (const [itemId, count] of Object.entries(day.unavailableItemTapsByItem)) {
          const existing = unavailableItems[itemId] || { count: 0, name: day.itemNames?.[itemId] };
          unavailableItems[itemId] = {
            count: existing.count + (count || 0),
            name: existing.name || day.itemNames?.[itemId],
          };
        }
      }
    }

    return {
      totalSearches,
      zeroResultSearches,
      totalUnavailableItemTaps,
      totalMenuActionClicks,
      actionBreakdown,
      topSearchTerms: Object.entries(searchTerms)
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      unavailableItems: Object.entries(unavailableItems)
        .map(([itemId, value]) => ({ itemId, name: value.name, count: value.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }, [data]);

  const hasData = computed.totalSearches > 0
    || computed.totalUnavailableItemTaps > 0
    || computed.totalMenuActionClicks > 0
    || computed.topSearchTerms.length > 0
    || computed.unavailableItems.length > 0
    || sumMapValues(computed.actionBreakdown) > 0;

  if (!hasData) {
    return (
      <Card>
        <Title level={5}>Customer Intent</Title>
        <Empty description="No search, action, or unavailable-demand data for this period" />
      </Card>
    );
  }

  return (
    <Card>
      <Title level={5}>Customer Intent</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Statistic title="Searches" value={computed.totalSearches} />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic title="No-result Searches" value={computed.zeroResultSearches} />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic title="Customer Actions" value={computed.totalMenuActionClicks} />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic title="Unavailable Interest" value={computed.totalUnavailableItemTaps} />
        </Col>
      </Row>

      <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 16 }}>
        Searches are de-duplicated within a session for cleaner trends. Customer actions count final clicks only, and unavailable interest shows demand rather than confirmed lost sales.
      </Text>

      {sumMapValues(computed.actionBreakdown) > 0 && (
        <>
          <Text type="secondary">Action breakdown</Text>
          <div style={{ marginTop: 8, marginBottom: 16 }}>
            {Object.entries(computed.actionBreakdown)
              .filter(([, count]) => count > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([action, count]) => (
                <Tag key={action} style={{ marginBottom: 8 }}>
                  {action} ({count})
                </Tag>
              ))}
          </div>
        </>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card size="small" title="Top Searches">
            {computed.topSearchTerms.length ? (
              <List
                dataSource={computed.topSearchTerms}
                renderItem={(item) => (
                  <List.Item extra={<Tag>{item.count}</Tag>}>
                    <Text>{item.term}</Text>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No tracked searches in this period" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small" title="Unavailable Demand">
            {computed.unavailableItems.length ? (
              <List
                dataSource={computed.unavailableItems}
                renderItem={(item) => (
                  <List.Item extra={<Tag>{item.count}</Tag>}>
                    <Text>{item.name || item.itemId}</Text>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No unavailable-item interest in this period" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default CustomerIntentInsights;
