import { useOfferingLabels } from '@hook/useOfferingLabels';
import { AnalyticsData } from '@lib/analytics/types';
import { Card, Col, Row, Statistic, Tooltip, Typography, theme } from 'antd';
import React from 'react';
import { LuCalendar, LuEye, LuFlame, LuGlobe, LuLineChart, LuSmartphone, LuTrendingUp, LuTrophy } from 'react-icons/lu';

const { Title } = Typography;
const { useToken } = theme;

interface OverallMetricsProps {
  data: AnalyticsData | null;
}

const OverallMetrics: React.FC<OverallMetricsProps> = ({ data }) => {
    const { token } = useToken();
    const labels = useOfferingLabels();

  // Calculate totals from daily data if summary is not available
  const calculateTotals = () => {
    if (!data) return { views: 0, clicks: 0, searches: 0, zeroResultSearches: 0, actions: 0, unavailable: 0, recent7Views: 0, recent7Clicks: 0, recent30Views: 0, recent30Clicks: 0 };

    if (data.summary) {
      // Use summary data if available
      return {
        views: data.summary.lifetimeTotalViews || 0,
        clicks: data.summary.lifetimeTotalClicks || 0,
        searches: data.summary.lifetimeTotalSearches || 0,
        zeroResultSearches: data.summary.lifetimeZeroResultSearches || 0,
        actions: data.summary.lifetimeTotalMenuActionClicks || 0,
        unavailable: data.summary.lifetimeTotalUnavailableItemTaps || 0,
        recent7Views: data.summary.last7Days?.totalViews || 0,
        recent7Clicks: data.summary.last7Days?.totalClicks || 0,
        recent30Views: data.summary.last30Days?.totalViews || 0,
        recent30Clicks: data.summary.last30Days?.totalClicks || 0
      };
    } else if (data.daily && data.daily.length > 0) {
      // Calculate from daily data if summary not available
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);

      const last7Days = data.daily.filter(day => {
        const dayDate = new Date(day.date);
        return dayDate >= sevenDaysAgo && dayDate <= now;
      });

      const last30Days = data.daily.filter(day => {
        const dayDate = new Date(day.date);
        return dayDate >= thirtyDaysAgo && dayDate <= now;
      });

      return {
        views: data.daily.reduce((sum, day) => sum + (day.totalViews || 0), 0),
        clicks: data.daily.reduce((sum, day) => sum + (day.totalClicks || 0), 0),
        searches: data.daily.reduce((sum, day) => sum + (day.totalSearches || 0), 0),
        zeroResultSearches: data.daily.reduce((sum, day) => sum + (day.zeroResultSearches || 0), 0),
        actions: data.daily.reduce((sum, day) => sum + (day.totalMenuActionClicks || 0), 0),
        unavailable: data.daily.reduce((sum, day) => sum + (day.totalUnavailableItemTaps || 0), 0),
        recent7Views: last7Days.reduce((sum, day) => sum + (day.totalViews || 0), 0),
        recent7Clicks: last7Days.reduce((sum, day) => sum + (day.totalClicks || 0), 0),
        recent30Views: last30Days.reduce((sum, day) => sum + (day.totalViews || 0), 0),
        recent30Clicks: last30Days.reduce((sum, day) => sum + (day.totalClicks || 0), 0)
      };
    }

    return { views: 0, clicks: 0, searches: 0, zeroResultSearches: 0, actions: 0, unavailable: 0, recent7Views: 0, recent7Clicks: 0, recent30Views: 0, recent30Clicks: 0 };
  };

  const { views, clicks, searches, zeroResultSearches, actions, unavailable, recent7Views, recent7Clicks, recent30Views, recent30Clicks } = calculateTotals();

  // Calculate CTR (Click-Through Rate)
  const ctr = views > 0 ? ((clicks / views) * 100).toFixed(2) : '0.00';
  const ctr7Days = recent7Views > 0 ? ((recent7Clicks / recent7Views) * 100).toFixed(2) : '0.00';
  const ctr30Days = recent30Views > 0 ? ((recent30Clicks / recent30Views) * 100).toFixed(2) : '0.00';

  // Get unique device count (approximate from most recent day)
  const getDeviceCount = () => {
    if (!data || !data.daily || data.daily.length === 0) return 0;

    // Use the most recent day's data
    const latestDay = data.daily[data.daily.length - 1];
    if (!latestDay.viewsByDevice) return 0;

    // Count number of device types with views
    return Object.keys(latestDay.viewsByDevice).length;
  };

  // Get unique location count (approximate from most recent day)
  const getLocationCount = () => {
    if (!data || !data.daily || data.daily.length === 0) return 0;

    // Use the most recent day's data
    const latestDay = data.daily[data.daily.length - 1];
    if (!latestDay.viewsByLocation) return 0;

    // Count number of locations with views
    return Object.keys(latestDay.viewsByLocation).length;
  };

  // Get top performing item
  const getTopItem = () => {
    if (!data?.summary?.topItems || data.summary.topItems.length === 0) {
      return { name: 'No data', clicks: 0 };
    }

    return {
      name: data.summary.topItems[0].name,
      clicks: data.summary.topItems[0].totalClicks
    };
  };

  const topItem = getTopItem();

  return (
    <Card>
      <Title level={5}>Overall Metrics</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Statistic
            title={labels.totalViewsLabel}
            value={views}
            prefix={<LuEye />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Total Item Clicks"
            value={clicks}
            prefix={<LuLineChart />}
          />
        </Col>
        <Col xs={12} sm={6}>
            <Statistic
                title="Overall CTR"
                value={`${ctr}%`}
                prefix={<LuTrendingUp />}
                valueStyle={{ color: Number(ctr) > 5 ? token.colorSuccess : token.colorError }}
            />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Unique Devices"
            value={getDeviceCount()}
            prefix={<LuSmartphone />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Searches"
            value={searches}
            prefix={<LuFlame />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="No-result Searches"
            value={zeroResultSearches}
            prefix={<LuLineChart />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Customer Actions"
            value={actions}
            prefix={<LuTrendingUp />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Unavailable Interest"
            value={unavailable}
            prefix={<LuLineChart />}
          />
        </Col>
      </Row>

      <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 16 }}>
        Searches are de-duplicated within a session. Customer actions count final clicks only, and unavailable interest shows demand rather than confirmed lost sales.
      </Typography.Text>

      <Title level={5}>Recent Performance</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Tooltip title="Views in the last 7 days">
            <Statistic
              title="Recent Views (7d)"
              value={recent7Views}
              prefix={<LuCalendar />}
            />
          </Tooltip>
        </Col>
        <Col xs={12} sm={6}>
          <Tooltip title="Clicks in the last 7 days">
            <Statistic
              title="Recent Clicks (7d)"
              value={recent7Clicks}
              prefix={<LuFlame />}
            />
          </Tooltip>
        </Col>
        <Col xs={12} sm={6}>
          <Tooltip title="Click-through rate in the last 7 days">
            <Statistic
                title="Recent CTR (7d)"
                value={`${ctr7Days}%`}
                prefix={<LuTrendingUp />}
                valueStyle={{ color: Number(ctr7Days) > 5 ? token.colorSuccess : token.colorError }}
            />
          </Tooltip>
        </Col>
        <Col xs={12} sm={6}>
          <Tooltip title="Unique locations where your menu was viewed">
            <Statistic
              title="Locations"
              value={getLocationCount()}
              prefix={<LuGlobe />}
            />
          </Tooltip>
        </Col>
      </Row>

      <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 16 }}>
        Location counts are approximate city or region-level only. MenuList does not use exact GPS in this analytics flow.
      </Typography.Text>

      <Title level={5}>Top Performing {labels.itemSingular.charAt(0).toUpperCase() + labels.itemSingular.slice(1)}</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Statistic
            title="Most Popular Item"
            value={topItem.name}
            prefix={<LuTrophy />}
          />
        </Col>
        <Col xs={24} sm={12}>
          <Statistic
            title="Click Count"
            value={topItem.clicks}
            prefix={<LuLineChart />}
          />
        </Col>
      </Row>
    </Card>
  );
};

export default OverallMetrics;
