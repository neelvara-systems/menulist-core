/**
 * Peak Hours Heatmap Component
 * Visualizes activity patterns across hours of the day
 */

'use client';

import { Card, Typography, Tooltip } from 'antd';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;

// ================================================================
// TYPES
// ================================================================

export interface HourData {
  hour: number;
  count: number;
  intensity?: number;
}

interface PeakHoursHeatmapProps {
  data: HourData[];
  title?: string;
  subtitle?: string;
}

export interface NormalizedHourData extends HourData {
  intensity: number;
}

export const normalizePeakHoursData = (data: HourData[]): NormalizedHourData[] => {
  const counts = new Array<number>(24).fill(0);
  data.forEach((item) => {
    if (!Number.isInteger(item?.hour) || item.hour < 0 || item.hour > 23) return;
    if (!Number.isFinite(item.count) || item.count < 0) return;
    counts[item.hour] += item.count;
  });
  const peakCount = Math.max(0, ...counts);
  return counts.map((count, hour) => ({
    hour,
    count,
    intensity: peakCount > 0 ? (count / peakCount) * 100 : 0,
  }));
};

// ================================================================
// COMPONENT
// ================================================================

export function PeakHoursHeatmap({
  data,
  title = 'Peak Activity Hours',
  subtitle = '24-hour activity distribution',
}: PeakHoursHeatmapProps) {
  const normalizedData = normalizePeakHoursData(data);
  const peakHour = normalizedData.reduce((prev, current) => (
    current.count > prev.count ? current : prev
  ));

  return (
    <Card
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {subtitle}
          </Text>
        </div>
      }
      bordered={false}
    >
      <div style={{ padding: '16px 0' }}>
        {/* Heatmap Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: 8,
            marginBottom: 24,
          }}
        >
          {normalizedData.map((hourData, index) => (
            <motion.div
              key={hourData.hour}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02, duration: 0.3 }}
            >
              <Tooltip
                title={
                  <div>
                    <div><strong>{formatHour(hourData.hour)}</strong></div>
                    <div>{hourData.count} conversations</div>
                    <div>{hourData.intensity.toFixed(0)}% of peak</div>
                  </div>
                }
              >
                <div
                  style={{
                    aspectRatio: '1',
                    borderRadius: 6,
                    backgroundColor: getHeatColor(hourData.intensity),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: hourData.hour === peakHour.hour ? '2px solid #1890ff' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.zIndex = '10';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.zIndex = '1';
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: hourData.intensity > 50 ? '#fff' : '#262626',
                    }}
                  >
                    {hourData.hour}
                  </Text>
                  <Text
                    style={{
                      fontSize: 9,
                      color: hourData.intensity > 50 ? '#fff' : '#595959',
                    }}
                  >
                    {formatShortTime(hourData.hour)}
                  </Text>
                </div>
              </Tooltip>
            </motion.div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <Text strong style={{ fontSize: 12 }}>
            Intensity:
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Low
            </Text>
            {[0, 25, 50, 75, 100].map(intensity => (
              <div
                key={intensity}
                style={{
                  width: 40,
                  height: 20,
                  backgroundColor: getHeatColor(intensity),
                  borderRadius: 4,
                }}
              />
            ))}
            <Text type="secondary" style={{ fontSize: 11 }}>
              High
            </Text>
          </div>
        </div>

        {/* Insights */}
        <div
          style={{
            padding: 16,
            background: '#f5f5f5',
            borderRadius: 8,
            marginTop: 16,
          }}
        >
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            📊 Insights:
          </Text>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>
              <Text>
                Peak hour: <strong>{formatHour(peakHour.hour)}</strong> with{' '}
                <strong>{peakHour.count}</strong> conversations
              </Text>
            </li>
            <li>
              <Text>
                Busiest period: {getBusiestPeriod(normalizedData)}
              </Text>
            </li>
            <li>
              <Text>
                Quietest period: {getQuietestPeriod(normalizedData)}
              </Text>
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function getHeatColor(intensity: number): string {
  if (intensity === 0) return '#f0f0f0';
  if (intensity < 20) return '#e6f7ff';
  if (intensity < 40) return '#bae7ff';
  if (intensity < 60) return '#69c0ff';
  if (intensity < 80) return '#1890ff';
  return '#0050b3';
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${period}`;
}

function formatShortTime(hour: number): string {
  return hour >= 12 ? 'PM' : 'AM';
}

function getBusiestPeriod(data: HourData[]): string {
  const periods = [
    { name: 'Morning (6-12)', range: [6, 12] },
    { name: 'Afternoon (12-18)', range: [12, 18] },
    { name: 'Evening (18-24)', range: [18, 24] },
    { name: 'Night (0-6)', range: [0, 6] },
  ];

  const periodCounts = periods.map(period => ({
    name: period.name,
    total: data
      .filter(d => d.hour >= period.range[0] && d.hour < period.range[1])
      .reduce((sum, d) => sum + d.count, 0),
  }));

  const busiest = periodCounts.reduce((prev, current) =>
    current.total > prev.total ? current : prev
  );

  return busiest.name;
}

function getQuietestPeriod(data: HourData[]): string {
  const periods = [
    { name: 'Morning (6-12)', range: [6, 12] },
    { name: 'Afternoon (12-18)', range: [12, 18] },
    { name: 'Evening (18-24)', range: [18, 24] },
    { name: 'Night (0-6)', range: [0, 6] },
  ];

  const periodCounts = periods.map(period => ({
    name: period.name,
    total: data
      .filter(d => d.hour >= period.range[0] && d.hour < period.range[1])
      .reduce((sum, d) => sum + d.count, 0),
  }));

  const quietest = periodCounts.reduce((prev, current) =>
    current.total < prev.total ? current : prev
  );

  return quietest.name;
}

// ================================================================
// EXPORTS
// ================================================================

export default PeakHoursHeatmap;
