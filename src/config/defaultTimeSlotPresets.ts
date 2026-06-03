/**
 * Default Time Slot Presets by Business Category
 * 
 * When a store is created during onboarding, we assign appropriate
 * default time slot presets based on the business type.
 * 
 * These are system-provided defaults that help owners get started quickly.
 * Owners can modify or delete these presets later.
 */

import { resolveBusinessCategory } from '@constant/common';
import { antdTagsColorCodes } from '@data/common';
import { generateOwnCustomUid } from '@lib/utils/generateOwnCustomUid';
import { TimeSlotPreset } from '@type/platform/store';

// Get color codes array for preset colors
const PRESET_COLORS = Object.values(antdTagsColorCodes).map(c => c.color);

// Preset template (without id - id is generated at creation time)
interface PresetTemplate {
    label: string;
    startTime: string;
    endTime: string;
}

// Category-based default presets
const CATEGORY_PRESETS: Record<string, PresetTemplate[]> = {
    food: [
        { label: 'Breakfast', startTime: '07:00', endTime: '11:00' },
        { label: 'Lunch', startTime: '11:00', endTime: '15:00' },
        { label: 'Dinner', startTime: '18:00', endTime: '22:00' },
        { label: 'Late Night', startTime: '22:00', endTime: '02:00' },
    ],
    service: [
        { label: 'Off-Peak', startTime: '10:00', endTime: '12:00' },
        { label: 'Regular', startTime: '12:00', endTime: '17:00' },
        { label: 'Peak', startTime: '17:00', endTime: '20:00' },
    ],
    health: [
        { label: 'Morning', startTime: '06:00', endTime: '12:00' },
        { label: 'Afternoon', startTime: '12:00', endTime: '17:00' },
        { label: 'Evening', startTime: '17:00', endTime: '21:00' },
    ],
    retail: [
        { label: 'Morning', startTime: '09:00', endTime: '12:00' },
        { label: 'Afternoon', startTime: '12:00', endTime: '17:00' },
        { label: 'Evening', startTime: '17:00', endTime: '21:00' },
    ],
    professional: [
        { label: 'Morning', startTime: '09:00', endTime: '12:00' },
        { label: 'Afternoon', startTime: '13:00', endTime: '17:00' },
    ],
    creative: [
        { label: 'Morning', startTime: '10:00', endTime: '13:00' },
        { label: 'Afternoon', startTime: '14:00', endTime: '18:00' },
        { label: 'Evening', startTime: '18:00', endTime: '21:00' },
    ],
    specialty: [
        { label: 'Morning', startTime: '09:00', endTime: '12:00' },
        { label: 'Afternoon', startTime: '12:00', endTime: '17:00' },
        { label: 'Evening', startTime: '17:00', endTime: '21:00' },
    ],
};

// Default presets (fallback for unknown business types)
const DEFAULT_PRESETS: PresetTemplate[] = [
    { label: 'Morning', startTime: '09:00', endTime: '12:00' },
    { label: 'Afternoon', startTime: '12:00', endTime: '17:00' },
    { label: 'Evening', startTime: '17:00', endTime: '21:00' },
];

/**
 * Get default time slot presets for a business type
 * 
 * @param businessType - The store's business type (e.g., "Restaurant", "Salon")
 * @param businessCategory - Optional broad category when exact type is generic
 * @param tenantId - Tenant ID for generating preset IDs
 * @param storeId - Store ID for generating preset IDs
 * @returns Array of TimeSlotPreset with generated IDs and colors
 */
export function getDefaultTimeSlotPresets(
    businessType: string | undefined,
    tenantId: number,
    storeId: number,
    businessCategory?: string,
): TimeSlotPreset[] {
    const category = resolveBusinessCategory(businessType, businessCategory);
    const templates = category && CATEGORY_PRESETS[category]
        ? CATEGORY_PRESETS[category]
        : DEFAULT_PRESETS;

    return templates.map((template, index) => ({
        id: generateOwnCustomUid(tenantId, storeId),
        label: template.label,
        startTime: template.startTime,
        endTime: template.endTime,
        color: PRESET_COLORS[index % PRESET_COLORS.length],
    }));
}

/**
 * Get preset templates for a business category (without IDs)
 * Useful for previewing what presets will be created
 */
export function getPresetTemplatesForCategory(businessType?: string, businessCategory?: string): PresetTemplate[] {
    const category = resolveBusinessCategory(businessType, businessCategory);
    if (category && CATEGORY_PRESETS[category]) {
        return CATEGORY_PRESETS[category];
    }
    return DEFAULT_PRESETS;
}
