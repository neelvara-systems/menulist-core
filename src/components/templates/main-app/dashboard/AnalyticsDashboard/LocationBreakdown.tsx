import { GlobalOutlined } from '@ant-design/icons';
import { AnalyticsData } from '@lib/analytics/types';
import { Card, Empty, Radio, Table, Typography } from 'antd';
import React, { useState } from 'react';

const { Title } = Typography;

interface LocationBreakdownProps {
  data: AnalyticsData | null;
}

const LocationBreakdown: React.FC<LocationBreakdownProps> = ({ data }) => {
  const [metric, setMetric] = useState<'views' | 'clicks'>('views');

  // Calculate location breakdown from daily data
  const calculateLocationBreakdown = () => {
    if (!data || !data.daily || data.daily.length === 0) {
      return [];
    }

    const locationCounts: Record<string, number> = {};

    // Aggregate location data across all days
    data.daily.forEach(day => {
      const locationData = metric === 'views' ? day.viewsByLocation : day.clicksByLocation;

      if (locationData) {
        Object.entries(locationData).forEach(([location, count]) => {
          locationCounts[location] = (locationCounts[location] || 0) + (count as number);
        });
      }
    });

    // Convert to table data format and sort by count (descending)
    return Object.entries(locationCounts)
      .map(([location, count]) => {
        const [country, city] = formatLocationKey(location);
        return {
          key: location,
          country,
          city,
          count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Limit to top 10 locations
  };

  // Format location key (e.g., "US_NewYork" to ["United States", "New York"])
  const formatLocationKey = (locationKey: string): [string, string] => {
    if (locationKey === 'unknown') {
      return ['Unknown', ''];
    }

    const parts = locationKey.split('_');

    if (parts.length === 1) {
      return [getCountryName(parts[0]), ''];
    }

    return [getCountryName(parts[0]), formatCityName(parts.slice(1).join(' '))];
  };

  // Get full country name from country code
  const getCountryName = (countryCode: string): string => {
    // This is a simplified version - in a real app, you'd use a proper country code mapping
    const countryMap: Record<string, string> = {
      'US': 'United States',
      'GB': 'United Kingdom',
      'CA': 'Canada',
      'AU': 'Australia',
      'DE': 'Germany',
      'FR': 'France',
      'JP': 'Japan',
      'CN': 'China',
      'IN': 'India',
      'BR': 'Brazil',
      // Add more as needed
    };

    return countryMap[countryCode] || countryCode;
  };

  // Format city name (e.g., "NewYork" to "New York")
  const formatCityName = (cityName: string): string => {
    // If already has spaces, return as is
    if (cityName.includes(' ')) {
      return cityName;
    }

    // Add spaces before capital letters (e.g., "NewYork" to "New York")
    return cityName.replace(/([A-Z])/g, ' $1').trim();
  };

  const locationData = calculateLocationBreakdown();

  if (locationData.length === 0) {
    return (
      <Card>
        <Title level={5}>Location Breakdown</Title>
        <Empty description="No location data available" />
      </Card>
    );
  }

  const columns = [
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
      render: (text: string) => (
        <span>
          <GlobalOutlined style={{ marginRight: 8 }} />
          {text}
        </span>
      ),
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: metric === 'views' ? 'Views' : 'Clicks',
      dataIndex: 'count',
      key: 'count',
      align: 'right' as const,
    },
  ];

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5}>Location Breakdown</Title>
        <Radio.Group
          value={metric}
          onChange={e => setMetric(e.target.value)}
          buttonStyle="solid"
          size="small"
        >
          <Radio.Button value="views">Views</Radio.Button>
          <Radio.Button value="clicks">Clicks</Radio.Button>
        </Radio.Group>
      </div>
      <Table
        dataSource={locationData}
        columns={columns}
        pagination={false}
        size="small"
      />
    </Card>
  );
};

export default LocationBreakdown;
