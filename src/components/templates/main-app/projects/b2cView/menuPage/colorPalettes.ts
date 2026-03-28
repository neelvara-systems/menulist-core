// Color palette definitions for use in the application
// Organized by categories: neon, dark, light, pastel, etc.
import gradientPresetsData from './gradientPresets.json';

export interface ColorGroup {
  name: string;
  colors: string[];
}

export interface GradientPreset {
  name: string;
  colors: string[];
}

// Neon Colors
export const neonColors: ColorGroup = {
  name: 'Neon',
  colors: [
    '#00FF00', // Neon Green
    '#FF00FF', // Neon Pink
    '#00FFFF', // Neon Cyan
    '#FF0000', // Neon Red
    '#FFFF00', // Neon Yellow
    '#FE01B1', // Neon Magenta
    '#39FF14', // Neon Green (Bright)
    '#BC13FE', // Neon Purple
    '#FF9933', // Neon Orange
    '#FF1493', // Deep Pink
  ]
};

// Dark Colors
export const darkColors: ColorGroup = {
  name: 'Dark',
  colors: [
    '#000000', // Black
    '#1A1A1A', // Almost Black
    '#333333', // Dark Gray
    '#222222', // Charcoal
    '#0D0D0D', // Night
    '#1E1E1E', // Code Dark
    '#2D2D2D', // Dark Slate
    '#121212', // Spotify Dark
    '#1F2937', // Tailwind Dark Gray
    '#111827', // Tailwind Darker Gray
  ]
};

// Light Colors
export const lightColors: ColorGroup = {
  name: 'Light',
  colors: [
    '#FFFFFF', // White
    '#F5F5F5', // White Smoke
    '#F8F8F8', // Ghost White
    '#FAFAFA', // Almost White
    '#EFEFEF', // Light Gray
    '#E5E5E5', // Gainsboro
    '#F0F0F0', // Platinum
    '#F9FAFB', // Tailwind Gray 50
    '#F3F4F6', // Tailwind Gray 100
    '#E5E7EB', // Tailwind Gray 200
  ]
};

// Pastel Colors
export const pastelColors: ColorGroup = {
  name: 'Pastel',
  colors: [
    '#FFD1DC', // Pastel Pink
    '#FFABAB', // Pastel Red
    '#FFC3A0', // Pastel Orange
    '#FDFD96', // Pastel Yellow
    '#B5EAD7', // Pastel Green
    '#C7CEEA', // Pastel Blue
    '#E0BBE4', // Pastel Purple
    '#D4F0F0', // Pastel Turquoise
    '#FCE1E4', // Pastel Rose
    '#DDDDFF', // Pastel Lavender
  ]
};

// Primary Colors
export const primaryColors: ColorGroup = {
  name: 'Primary',
  colors: [
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FF8000', // Orange
    '#8000FF', // Purple
    '#0080FF', // Azure
    '#FF0080', // Rose
  ]
};

// Material Design Colors
export const materialColors: ColorGroup = {
  name: 'Material',
  colors: [
    '#F44336', // Red
    '#E91E63', // Pink
    '#9C27B0', // Purple
    '#673AB7', // Deep Purple
    '#3F51B5', // Indigo
    '#2196F3', // Blue
    '#03A9F4', // Light Blue
    '#00BCD4', // Cyan
    '#009688', // Teal
    '#4CAF50', // Green
    '#8BC34A', // Light Green
    '#CDDC39', // Lime
    '#FFEB3B', // Yellow
    '#FFC107', // Amber
    '#FF9800', // Orange
    '#FF5722', // Deep Orange
    '#795548', // Brown
    '#9E9E9E', // Grey
    '#607D8B', // Blue Grey
  ]
};

// Tailwind CSS Colors
export const tailwindColors: ColorGroup = {
  name: 'Tailwind',
  colors: [
    '#EF4444', // Red 500
    '#F97316', // Orange 500
    '#F59E0B', // Amber 500
    '#EAB308', // Yellow 500
    '#84CC16', // Lime 500
    '#22C55E', // Green 500
    '#10B981', // Emerald 500
    '#14B8A6', // Teal 500
    '#06B6D4', // Cyan 500
    '#0EA5E9', // Sky 500
    '#3B82F6', // Blue 500
    '#6366F1', // Indigo 500
    '#8B5CF6', // Violet 500
    '#A855F7', // Purple 500
    '#D946EF', // Fuchsia 500
    '#EC4899', // Pink 500
    '#F43F5E', // Rose 500
  ]
};

// Brand Colors
export const brandColors: ColorGroup = {
  name: 'Brand',
  colors: [
    '#1877F2', // Facebook
    '#1DA1F2', // Twitter
    '#EA4335', // Google Red
    '#4285F4', // Google Blue
    '#FBBC05', // Google Yellow
    '#34A853', // Google Green
    '#0A66C2', // LinkedIn
    '#FF0000', // YouTube
    '#C13584', // Instagram Gradient
    '#5865F2', // Discord
    '#25D366', // WhatsApp
    '#FF4500', // Reddit
    '#000000', // Apple
    '#7289DA', // Discord Old
    '#00AFF0', // Skype
    '#6441A4', // Twitch
    '#BD081C', // Pinterest
    '#00B2FF', // Messenger
  ]
};

// All color groups
export const allColorGroups: ColorGroup[] = [
  primaryColors,
  materialColors,
  tailwindColors,
  neonColors,
  pastelColors,
  darkColors,
  lightColors,
  brandColors,
];

// Gradient presets
export const gradientPresets: GradientPreset[] = gradientPresetsData as GradientPreset[];

export default {
  allColorGroups,
  gradientPresets,
  neonColors,
  darkColors,
  lightColors,
  pastelColors,
  primaryColors,
  materialColors,
  tailwindColors,
  brandColors
};
