/**
 * Category Distribution Chart Component
 * Pie/Donut chart showing category breakdown
 */

'use client';

import { Card, Typography } from 'antd';
import { motion } from 'framer-motion';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, type PieLabelRenderProps } from 'recharts';

const { Title, Text } = Typography;

// ================================================================
// TYPES
// ================================================================

export interface CategoryData {
  name: string;
  count: number;
  percentage?: number;
  [key: string]: string | number | undefined;
}

export interface NormalizedCategoryData extends CategoryData {
  percentage: number;
}

interface CategoryDistributionChartProps {
  data: CategoryData[];
  title?: string;
  subtitle?: string;
  height?: number;
  chartType?: 'pie' | 'donut';
}

// ================================================================
// CONSTANTS
// ================================================================

const COLORS = [
  '#1890ff', // Blue
  '#52c41a', // Green
  '#faad14', // Orange
  '#f5222d', // Red
  '#722ed1', // Purple
  '#13c2c2', // Cyan
  '#eb2f96', // Magenta
  '#fa8c16', // Orange variant
];

export const normalizeCategoryDistribution = (data: CategoryData[]): NormalizedCategoryData[] => {
  const countsByName = new Map<string, number>();
  data.forEach((item) => {
    const name = typeof item?.name === 'string' ? item.name.trim() : '';
    const count = Number(item?.count);
    if (!name || !Number.isFinite(count) || count < 0) return;
    countsByName.set(name, (countsByName.get(name) ?? 0) + count);
  });
  const total = Array.from(countsByName.values()).reduce((sum, count) => sum + count, 0);
  return Array.from(countsByName, ([name, count]) => ({
    name,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0,
  }));
};

const toFiniteChartNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

// ================================================================
// COMPONENT
// ================================================================

export function CategoryDistributionChart({
  data,
  title = 'Category Distribution',
  subtitle = 'Breakdown by topic',
  height = 300,
  chartType = 'donut',
}: CategoryDistributionChartProps) {
  const normalizedData = normalizeCategoryDistribution(data);
  const total = normalizedData.reduce((sum, item) => sum + item.count, 0);

  // Custom label renderer
  const renderCustomLabel = (props: PieLabelRenderProps) => {
    const cx = toFiniteChartNumber(props.cx);
    const cy = toFiniteChartNumber(props.cy);
    const midAngle = toFiniteChartNumber(props.midAngle);
    const innerRadius = toFiniteChartNumber(props.innerRadius);
    const outerRadius = toFiniteChartNumber(props.outerRadius);
    const percent = toFiniteChartNumber(props.percent);
    if (
      cx === null || cy === null || midAngle === null
      || innerRadius === null || outerRadius === null || percent === null
    ) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

    if (percent < 0.05) return null; // Hide labels for small slices

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: 12, fontWeight: 600 }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {subtitle} • Total: {total.toLocaleString()}
          </Text>
        </div>
      }
      bordered={false}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={normalizedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={100}
              innerRadius={chartType === 'donut' ? 60 : 0}
              fill="#8884d8"
              dataKey="count"
              animationBegin={0}
              animationDuration={800}
            >
              {normalizedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  style={{
                    cursor: 'pointer',
                    filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))',
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #d9d9d9',
                borderRadius: 4,
                padding: 12,
              }}
              formatter={(value, name, props) => [
                `${Number(value).toLocaleString()} (${Number(props.payload.percentage).toFixed(1)}%)`,
                String(name),
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => (
                <span style={{ fontSize: 13, color: '#595959' }}>
                  {value} ({(normalizedData.find((item) => item.name === String(value))?.percentage ?? 0).toFixed(1)}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Top Categories List */}
        <div style={{ marginTop: 24 }}>
          <Text strong style={{ display: 'block', marginBottom: 12 }}>
            Top Categories:
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {normalizedData.slice(0, 5).map((category, index) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  background: '#fafafa',
                  borderRadius: 6,
                  borderLeft: `4px solid ${COLORS[index % COLORS.length]}`,
                }}
              >
                <div
                  style={{
                    minWidth: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: COLORS[index % COLORS.length],
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ display: 'block', fontSize: 13 }}>
                    {category.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {category.count.toLocaleString()} conversations
                  </Text>
                </div>
                <div
                  style={{
                    padding: '4px 12px',
                    background: '#fff',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    color: COLORS[index % COLORS.length],
                  }}
                >
                  {category.percentage.toFixed(1)}%
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </Card>
  );
}

// ================================================================
// EXPORTS
// ================================================================

export default CategoryDistributionChart;
