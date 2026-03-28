'use client';

import { Pie } from '@ant-design/plots';
import { DEVICE_TYPES_LIST } from '@constant/builder';
import { AnalyticsData } from '@lib/analytics/types';
import { Card, Empty, Radio, Typography } from 'antd';
import React, { useState } from 'react';

const { Title } = Typography;

interface DeviceBreakdownProps {
  data: AnalyticsData | null;
}

const DeviceBreakdown: React.FC<DeviceBreakdownProps> = ({ data }) => {
  const [metric, setMetric] = useState<'views' | 'clicks'>('views');

  // Calculate device breakdown from daily data
  const calculateDeviceBreakdown = () => {
    if (!data || !data.daily || data.daily.length === 0) {
      return [];
    }

    const deviceCounts: Record<string, number> = {};

    // Aggregate device data across all days
    data.daily.forEach(day => {
      const deviceData = metric === 'views' ? day.viewsByDevice : day.clicksByDevice;

      if (deviceData) {
        Object.entries(deviceData).forEach(([device, count]) => {
          deviceCounts[device] = (deviceCounts[device] || 0) + (count as number);
        });
      }
    });

    // Convert to chart data format
    return Object.entries(deviceCounts).map(([device, value]) => ({
      type: formatDeviceType(device),
      value
    }));
  };

  // Format device type for display
  const formatDeviceType = (device: string): string => {
    switch (device.toLowerCase()) {
      case DEVICE_TYPES_LIST.MOBILE:
        return 'Mobile';
      case DEVICE_TYPES_LIST.DESKTOP:
        return 'Desktop';
      case DEVICE_TYPES_LIST.TABLET:
        return 'Tablet';
      default:
        return 'Other';
    }
  };

  const deviceData = calculateDeviceBreakdown();

  if (deviceData.length === 0) {
    return (
      <Card>
        <Title level={5}>Device Breakdown</Title>
        <Empty description="No device data available" />
      </Card>
    );
  }

  const config = {
    data: deviceData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name}: {percentage}',
    },
    interactions: [{ type: 'element-active' }],
    legend: {
      layout: 'horizontal',
      position: 'bottom'
    },
    tooltip: {
      formatter: (datum: any) => {
        return { name: datum.type, value: `${datum.value} ${metric}` };
      },
    },
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5}>Device Breakdown</Title>
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
      <div style={{ height: 300 }}>
        <Pie {...config} />
      </div>
    </Card>
  );
};

export default DeviceBreakdown;
