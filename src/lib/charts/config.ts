/**
 * Unified Chart Configuration
 * Consistent styling across all Recharts components
 * 
 * This ensures all charts follow the same design system,
 * adapt to theme changes (dark mode), and are easy to maintain
 */

import { theme } from 'antd';
import { formatInrAmount } from '@util/formatters';

// ================================================================
// CHART CONFIGURATION HOOK
// ================================================================

export const useChartConfig = () => {
  const { token } = theme.useToken();
  
  return {
    // Chart dimensions
    dimensions: {
      defaultHeight: 300,
      compactHeight: 200,
      mobileHeight: 150,
      minHeight: 120,
      maxHeight: 500,
    },
    
    // Colors - All theme-aware
    colors: {
      primary: token.colorPrimary,
      success: token.colorSuccess,
      warning: token.colorWarning,
      error: token.colorError,
      info: token.colorInfo,
      text: token.colorText,
      textSecondary: token.colorTextSecondary,
      textTertiary: token.colorTextTertiary,
      border: token.colorBorder,
      borderSecondary: token.colorBorderSecondary,
      background: token.colorBgContainer,
      backgroundElevated: token.colorBgElevated,
      backgroundLayout: token.colorBgLayout,
    },
    
    // Grid styling
    grid: {
      stroke: token.colorBorder,
      strokeDasharray: '3 3',
      strokeOpacity: 0.3,
    },
    
    // Axis styling
    axis: {
      stroke: token.colorTextSecondary,
      fontSize: 12,
      fontFamily: token.fontFamily,
      tick: {
        fill: token.colorTextSecondary,
      },
    },
    
    // Tooltip styling
    tooltip: {
      contentStyle: {
        backgroundColor: token.colorBgElevated,
        borderColor: token.colorBorder,
        color: token.colorText,
        borderRadius: token.borderRadius,
        padding: '12px',
        boxShadow: token.boxShadowSecondary,
      },
      labelStyle: {
        color: token.colorText,
        fontWeight: 500,
        marginBottom: '4px',
      },
      itemStyle: {
        color: token.colorTextSecondary,
      },
    },
    
    // Legend styling
    legend: {
      iconSize: 12,
      fontSize: 12,
      fontFamily: token.fontFamily,
      color: token.colorText,
    },
    
    // Margins
    margins: {
      default: { top: 20, right: 30, left: 20, bottom: 20 },
      compact: { top: 10, right: 20, left: 10, bottom: 10 },
      withLegend: { top: 20, right: 30, left: 20, bottom: 40 },
    },
    
    // Animation
    animation: {
      duration: 300,
      easing: 'ease-in-out' as const,
    },
    
    // Bar chart specific
    bar: {
      radius: [4, 4, 0, 0] as [number, number, number, number],
      maxBarSize: 60,
    },
    
    // Line chart specific
    line: {
      strokeWidth: 2,
      dot: {
        r: 4,
        strokeWidth: 2,
      },
      activeDot: {
        r: 6,
        strokeWidth: 0,
      },
    },
    
    // Area chart specific
    area: {
      fillOpacity: 0.1,
      strokeWidth: 2,
    },
    
    // Pie chart specific
    pie: {
      innerRadius: 0,
      outerRadius: 80,
      paddingAngle: 2,
      labelLine: true,
    },
  };
};

// ================================================================
// PREDEFINED COLOR PALETTES
// ================================================================

export const CHART_PALETTES = {
  // Satisfaction colors
  satisfaction: ['#52c41a', '#ff4d4f'],
  
  // Volume colors
  volume: ['#1890ff', '#13c2c2'],
  
  // Mode colors
  modes: ['#722ed1', '#eb2f96'],
  
  // Gradient colors
  gradient: ['#108ee9', '#87d068'],
  
  // Status colors
  status: ['#52c41a', '#faad14', '#ff4d4f', '#d9d9d9'],
  
  // Multi-category (up to 8 categories)
  multiCategory: [
    '#1890ff', // Blue
    '#52c41a', // Green
    '#faad14', // Orange
    '#722ed1', // Purple
    '#eb2f96', // Pink
    '#13c2c2', // Cyan
    '#fa8c16', // Gold
    '#a0d911', // Lime
  ],
  
  // Severity colors
  severity: {
    low: '#52c41a',
    medium: '#faad14',
    high: '#ff4d4f',
    critical: '#cf1322',
  },
} as const;

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Get color by index from a palette
 */
export function getColorFromPalette(
  palette: keyof typeof CHART_PALETTES,
  index: number
): string {
  const colors = CHART_PALETTES[palette];
  if (Array.isArray(colors)) {
    return colors[index % colors.length];
  }
  return '#1890ff'; // Fallback
}

/**
 * Get severity color
 */
export function getSeverityColor(
  severity: 'low' | 'medium' | 'high' | 'critical'
): string {
  return CHART_PALETTES.severity[severity];
}

/**
 * Generate gradient ID for charts
 */
export function generateGradientId(name: string): string {
  return `gradient-${name}-${Date.now()}`;
}

/**
 * Format chart label
 */
export function formatChartLabel(
  value: number,
  type: 'number' | 'percentage' | 'currency' = 'number'
): string {
  switch (type) {
    case 'percentage':
      return `${value}%`;
    case 'currency':
      return formatInrAmount(value);
    case 'number':
    default:
      return value.toLocaleString();
  }
}

/**
 * Format chart date label
 */
export function formatChartDate(
  date: string | Date,
  format: 'short' | 'medium' | 'long' = 'short'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'long':
      return d.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    case 'medium':
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    case 'short':
    default:
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
  }
}

/**
 * Get responsive dimensions based on screen size
 */
export function getResponsiveDimensions(
  windowWidth: number,
  baseHeight: number = 300
): { width: string; height: number } {
  if (windowWidth < 576) {
    // Mobile
    return { width: '100%', height: Math.max(150, baseHeight * 0.5) };
  } else if (windowWidth < 992) {
    // Tablet
    return { width: '100%', height: Math.max(200, baseHeight * 0.7) };
  } else {
    // Desktop
    return { width: '100%', height: baseHeight };
  }
}

// ================================================================
// CHART TYPE CONFIGS
// ================================================================

export const CHART_TYPES = {
  BAR: 'bar',
  LINE: 'line',
  AREA: 'area',
  PIE: 'pie',
  COMPOSED: 'composed',
} as const;

export type ChartType = typeof CHART_TYPES[keyof typeof CHART_TYPES];

/**
 * Get default config for chart type
 * Note: Must pass baseConfig from useChartConfig() hook
 */
export function getChartTypeConfig(
  type: ChartType,
  baseConfig: ReturnType<typeof useChartConfig>
) {
  switch (type) {
    case CHART_TYPES.BAR:
      return {
        ...baseConfig,
        margin: baseConfig.margins.default,
        barCategoryGap: '20%',
      };
    case CHART_TYPES.LINE:
      return {
        ...baseConfig,
        margin: baseConfig.margins.default,
        dot: baseConfig.line.dot,
      };
    case CHART_TYPES.AREA:
      return {
        ...baseConfig,
        margin: baseConfig.margins.default,
        fillOpacity: baseConfig.area.fillOpacity,
      };
    case CHART_TYPES.PIE:
      return {
        ...baseConfig,
        margin: baseConfig.margins.compact,
        ...baseConfig.pie,
      };
    default:
      return baseConfig;
  }
}
