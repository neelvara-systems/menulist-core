// Color metadata for tooltips and descriptions
// Maps hex colors to their semantic meanings

export interface ColorMetadata {
  name: string;
  description: string;
}

export const COLOR_DESCRIPTIONS: Record<string, ColorMetadata> = {
  // DARK MODE COLORS
  '#3B82F6': { name: 'Blue', description: 'Professional & trustworthy' },
  '#8B5CF6': { name: 'Purple', description: 'Creative & modern' },
  '#EC4899': { name: 'Pink', description: 'Energetic & friendly' },
  '#10B981': { name: 'Green', description: 'Success & growth' },
  '#F59E0B': { name: 'Amber', description: 'Warning & attention' },
  '#06B6D4': { name: 'Cyan', description: 'Tech & innovation' },
  '#EF4444': { name: 'Red', description: 'Error & urgent' },
  '#6366F1': { name: 'Indigo', description: 'Deep & premium' },
  '#14B8A6': { name: 'Teal', description: 'Balance & calm' },
  '#F97316': { name: 'Orange', description: 'Warm & inviting' },
  '#A855F7': { name: 'Vibrant Purple', description: 'Bold' },
  '#22D3EE': { name: 'Sky Blue', description: 'Fresh' },
  '#84CC16': { name: 'Lime', description: 'Energy' },

  // LIGHT MODE COLORS
  '#1E40AF': { name: 'Deep Blue', description: 'Professional' },
  '#7C3AED': { name: 'Deep Purple', description: 'Creative' },
  '#BE185D': { name: 'Deep Pink', description: 'Bold' },
  '#047857': { name: 'Deep Green', description: 'Success' },
  '#D97706': { name: 'Deep Amber', description: 'Attention' },
  '#0E7490': { name: 'Deep Cyan', description: 'Tech' },
  '#DC2626': { name: 'Deep Red', description: 'Error' },
  '#4F46E5': { name: 'Deep Indigo', description: 'Premium' },
  '#0F766E': { name: 'Deep Teal', description: 'Balanced' },
  '#EA580C': { name: 'Deep Orange', description: 'Warm' },
  '#9333EA': { name: 'Deep Purple', description: 'Distinctive' },
  '#0284C7': { name: 'Deep Sky', description: 'Clear' },
  '#65A30D': { name: 'Deep Lime', description: 'Fresh' },
};

// Helper function to get color description
export const getColorDescription = (hex: string): ColorMetadata | null => {
  // Normalize hex (uppercase, with #)
  const normalizedHex = hex.toUpperCase().startsWith('#') ? hex.toUpperCase() : `#${hex.toUpperCase()}`;
  return COLOR_DESCRIPTIONS[normalizedHex] || null;
};

// Helper function to format tooltip text
export const formatColorTooltip = (hex: string, action?: string): string => {
  const metadata = getColorDescription(hex);
  
  if (metadata) {
    const baseText = `${metadata.name} - ${metadata.description}`;
    return action ? `${baseText}\n${action}` : baseText;
  }
  
  // Fallback if no metadata found
  return action ? `${hex}\n${action}` : hex;
};
