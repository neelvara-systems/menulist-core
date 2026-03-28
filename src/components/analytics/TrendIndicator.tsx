/**
 * Trend Indicator Component
 * Displays metric changes with visual indicators
 */

'use client';

import { Tooltip, Typography } from 'antd';
import { motion } from 'framer-motion';
import { LuArrowDown, LuArrowRight, LuArrowUp } from 'react-icons/lu';
import type { ComparisonResult } from '@lib/analytics/comparison';
import { formatComparison } from '@lib/analytics/comparison';

const { Text } = Typography;

// ================================================================
// TYPES
// ================================================================

interface TrendIndicatorProps {
  comparison: ComparisonResult;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  showText?: boolean;
  animated?: boolean;
}

// ================================================================
// COMPONENT
// ================================================================

export function TrendIndicator({
  comparison,
  label,
  size = 'medium',
  showIcon = true,
  showText = true,
  animated = true,
}: TrendIndicatorProps) {
  const { text, color, icon } = formatComparison(comparison);

  // Size configurations
  const sizeConfig = {
    small: { fontSize: 12, iconSize: 14, gap: 4 },
    medium: { fontSize: 14, iconSize: 16, gap: 6 },
    large: { fontSize: 16, iconSize: 20, gap: 8 },
  };

  const config = sizeConfig[size];

  // Icon component
  const IconComponent = comparison.trend === 'up' 
    ? LuArrowUp 
    : comparison.trend === 'down' 
    ? LuArrowDown 
    : LuArrowRight;

  // Animation variants
  const variants = animated ? {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  } : {};

  return (
    <Tooltip
      title={`${label || 'Metric'}: ${comparison.current} (${comparison.change >= 0 ? '+' : ''}${comparison.change.toFixed(2)})`}
    >
      <motion.div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: config.gap,
          color,
          fontSize: config.fontSize,
          fontWeight: 500,
          cursor: 'pointer',
        }}
        {...variants}
      >
        {showIcon && (
          <IconComponent 
            size={config.iconSize}
            style={{ 
              flexShrink: 0,
              strokeWidth: 2.5,
            }}
          />
        )}
        {showText && <Text style={{ color, margin: 0 }}>{text}</Text>}
      </motion.div>
    </Tooltip>
  );
}

// ================================================================
// METRIC CARD WITH COMPARISON
// ================================================================

interface MetricCardProps {
  title: string;
  value: number | string;
  comparison?: ComparisonResult;
  format?: (value: number) => string;
  prefix?: string;
  suffix?: string;
  loading?: boolean;
}

export function MetricCardWithComparison({
  title,
  value,
  comparison,
  format,
  prefix,
  suffix,
  loading = false,
}: MetricCardProps) {
  const formattedValue = typeof value === 'number' && format 
    ? format(value) 
    : value;

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #f0f0f0',
        background: '#fff',
      }}
    >
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
        {title}
      </Text>
      
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        {prefix && <Text style={{ fontSize: 20, fontWeight: 600 }}>{prefix}</Text>}
        <Text style={{ fontSize: 28, fontWeight: 600, lineHeight: 1 }}>
          {loading ? '...' : formattedValue}
        </Text>
        {suffix && <Text style={{ fontSize: 20, fontWeight: 600 }}>{suffix}</Text>}
      </div>

      {comparison && !loading && (
        <TrendIndicator 
          comparison={comparison} 
          label={title}
          size="small"
        />
      )}
    </div>
  );
}

// ================================================================
// COMPACT TREND BADGE
// ================================================================

interface TrendBadgeProps {
  comparison: ComparisonResult;
  hideText?: boolean;
}

export function TrendBadge({ comparison, hideText = false }: TrendBadgeProps) {
  const { color, icon } = formatComparison(comparison);
  const percentText = Math.abs(comparison.changePercent).toFixed(1);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: '12px',
        background: `${color}15`,
        color,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      <span>{icon}</span>
      {!hideText && <span>{percentText}%</span>}
    </span>
  );
}

// ================================================================
// EXPORTS
// ================================================================

export default TrendIndicator;
