import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { Color } from 'antd/es/color-picker';

export interface GradientColor {
  color: string;
  position: number;
}

export interface GradientConfig {
  type: 'gradient';
  angle: number;
  colors: GradientColor[];
}

const MAX_GRADIENT_PARSE_DIAGNOSTICS = 25;
const reportedGradientParseFailures = new Set<string>();

function getGradientValueKind(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function getApproximateGradientStopCount(value: string): number {
  const innerMatch = value.match(/linear-gradient\((.*)\)/);
  if (!innerMatch?.[1]) return 0;
  return innerMatch[1].split(',').length;
}

function logGradientParseFailure(error: unknown, gradientStr: unknown): void {
  const valueKind = getGradientValueKind(gradientStr);
  const value = typeof gradientStr === 'string' ? gradientStr.trim() : '';
  const failureKey = [
    valueKind,
    value.length,
    value.includes('linear-gradient') ? 'linear-gradient' : 'not-linear-gradient',
    /\d+deg/.test(value) ? 'angle-token' : 'no-angle-token',
    getApproximateGradientStopCount(value),
  ].join(':');

  if (reportedGradientParseFailures.has(failureKey)) return;
  if (reportedGradientParseFailures.size >= MAX_GRADIENT_PARSE_DIAGNOSTICS) return;
  reportedGradientParseFailures.add(failureKey);

  logRuntimeFailure('public_menu_gradient_parse_failed', error, {
    valueKind,
    gradientStringLength: value.length,
    hasLinearGradientToken: value.includes('linear-gradient'),
    hasAngleToken: /\d+deg/.test(value),
    approximateStopCount: getApproximateGradientStopCount(value),
    fallbackPolicy: 'use_existing_gradient_fallback',
  });
}

/**
 * Generates a CSS gradient string from angle and colors
 */
export const generateGradientString = (angle: number, colors: GradientColor[]): string => {
  // Sort colors by position
  const sortedColors = [...colors].sort((a, b) => a.position - b.position);
  
  // Generate color stops
  const colorStops = sortedColors.map(item => {
    // Ensure color is properly formatted
    let color = item.color;
    
    // Clean up any malformed colors
    if (color.includes(')') && color.indexOf(')') < color.length - 1) {
      // Truncate anything after the closing parenthesis
      color = color.substring(0, color.indexOf(')') + 1);
    }
    
    return `${color} ${item.position}%`;
  }).join(', ');
  
  // Create gradient string
  return `linear-gradient(${angle}deg, ${colorStops})`;
};

/**
 * Parses a CSS gradient string into angle and colors
 */
export const parseGradientString = (gradientStr: string): { angle: number; colors: GradientColor[] } | null => {
  if (!gradientStr || !gradientStr.includes('linear-gradient')) {
    return null;
  }

  try {
    // Extract angle
    const angleMatch = gradientStr.match(/linear-gradient\((\d+)deg/);
    const angle = angleMatch && angleMatch[1] ? parseInt(angleMatch[1], 10) : 45;

    // Extract colors
    const colorsMatch = gradientStr.match(/linear-gradient\(\d+deg,\s*((?:[^,]+(?:,\s*)?)+)\)/);
    if (!colorsMatch || !colorsMatch[1]) {
      return { angle, colors: [{ color: '#00F5A0', position: 0 }, { color: '#00D9F5', position: 100 }] };
    }

    const colorParts = colorsMatch[1].split(',').map(part => part.trim());
    const parsedColors = colorParts.map((part, index) => {
      // Check if color has position
      const posMatch = part.match(/(#[0-9A-Fa-f]{3,8}|rgba?\([^)]+\))\s+(\d+)%/);
      if (posMatch) {
        return {
          color: posMatch[1],
          position: parseInt(posMatch[2], 10)
        };
      } else {
        // If no position, calculate based on index
        const position = index === 0 ? 0 : index === colorParts.length - 1 ? 100 :
          Math.round((index / (colorParts.length - 1)) * 100);
        return {
          color: part.replace(/\s+\d+%/, ''),
          position
        };
      }
    });

    return { angle, colors: parsedColors };
  } catch (error) {
    logGradientParseFailure(error, gradientStr);
    return null;
  }
};

/**
 * Finds the best position for a new color in the gradient
 */
export const findBestPositionForNewColor = (colors: GradientColor[]): number => {
  const positions = colors.map(c => c.position).sort((a, b) => a - b);
  let newPosition = 50;
  
  if (positions.length >= 2) {
    // Find the largest gap between positions
    let maxGap = 0;
    let gapPosition = 50;
    
    for (let i = 0; i < positions.length - 1; i++) {
      const gap = positions[i + 1] - positions[i];
      if (gap > maxGap) {
        maxGap = gap;
        gapPosition = positions[i] + gap / 2;
      }
    }
    
    newPosition = Math.round(gapPosition);
  }
  
  return newPosition;
};

/**
 * Adds a new color to the gradient
 */
export const addColorToGradient = (
  colors: GradientColor[], 
  maxColors: number = 4
): GradientColor[] | null => {
  if (colors.length >= maxColors) return null;
  
  const newPosition = findBestPositionForNewColor(colors);
  return [...colors, { color: '#ffffff', position: newPosition }];
};

/**
 * Removes a color from the gradient
 */
export const removeColorFromGradient = (
  colors: GradientColor[], 
  index: number,
  minColors: number = 2
): GradientColor[] | null => {
  if (colors.length <= minColors) return null;
  return colors.filter((_, i) => i !== index);
};

/**
 * Checks if a string is a gradient
 */
export const isGradientString = (value: string): boolean => {
  return value && value.includes('linear-gradient');
};

/**
 * Creates default gradient colors
 */
export const createDefaultGradientColors = (): GradientColor[] => {
  return [
    { color: '#00F5A0', position: 0 },
    { color: '#00D9F5', position: 100 }
  ];
};
