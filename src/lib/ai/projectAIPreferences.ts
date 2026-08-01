import { resolveBusinessCategory } from '@data/shared/businessTypes';
import type { ImageGenerationConfigType, Project, ProjectAIPreferences, ProjectAIImagePreferences } from '@template/main-app/projects/types';

type ResolvedProjectAIPreferences = {
    description: Required<NonNullable<ProjectAIPreferences['description']>>;
    image: Required<ProjectAIImagePreferences>;
};

export const DEFAULT_PROJECT_DESCRIPTION_LENGTH = 'Standard' as const;
export const DEFAULT_PROJECT_DESCRIPTION_TONE = 'Professional' as const;
export const DEFAULT_PROJECT_IMAGE_ASPECT_RATIO = '1:1';
export const DEFAULT_PROJECT_IMAGE_STYLE_CATEGORY = 'Photorealism';
export const DEFAULT_PROJECT_IMAGE_STYLES = ['Natural Light'];

const PROJECT_AI_ASPECT_RATIOS = new Set(['1:1', '4:5', '16:9']);
const PROJECT_AI_CONTENT_LENGTHS = new Set(['Standard', 'Detailed']);
const PROJECT_AI_DESCRIPTION_TONES = new Set(['Professional', 'Friendly', 'Premium']);
const PROJECT_AI_LIST_MAX_ITEMS = 20;
const PROJECT_AI_LIST_ITEM_MAX_LENGTH = 120;
const PROJECT_AI_TEXT_MAX_LENGTH = 500;

function normalizeExactString<T extends string>(
    value: unknown,
    allowed: ReadonlySet<string>,
    fallback: T,
): T {
    return typeof value === 'string' && allowed.has(value) ? value as T : fallback;
}

function normalizeBoundedString(value: unknown, fallback: string, allowEmpty = false): string {
    if (typeof value !== 'string' || value.length > PROJECT_AI_TEXT_MAX_LENGTH) return fallback;
    const normalized = value.trim();
    return normalized || (allowEmpty ? '' : fallback);
}

function normalizePreferenceList(value: unknown, fallback: string[], requireNonEmpty = false): string[] {
    if (
        !Array.isArray(value)
        || value.length > PROJECT_AI_LIST_MAX_ITEMS
        || value.some((entry) => (
            typeof entry !== 'string'
            || !entry.trim()
            || entry.length > PROJECT_AI_LIST_ITEM_MAX_LENGTH
        ))
    ) {
        return [...fallback];
    }
    const normalized = Array.from(new Set(value.map((entry) => entry.trim())));
    return requireNonEmpty && normalized.length === 0 ? [...fallback] : normalized;
}

function normalizePreferenceColor(value: unknown, fallback: string | null): string | null {
    if (value === null) return null;
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim();
    return /^#[0-9a-f]{3,8}$/i.test(normalized) ? normalized : fallback;
}

function includesBusinessTerm(businessType: string | undefined, terms: string[]): boolean {
    const normalized = businessType?.trim().toLowerCase() || '';
    return terms.some((term) => normalized.includes(term));
}

function resolveBusinessPresetCategory(businessType?: string, businessCategory?: string): string {
    const canonicalCategory = resolveBusinessCategory(businessType, businessCategory);
    if (canonicalCategory) return canonicalCategory;

    // Legacy fallback only for old/free-text stores that predate BUSINESS_TYPES.
    if (includesBusinessTerm(businessType, ['restaurant', 'cafe', 'coffee', 'bakery', 'cake', 'ice cream'])) return 'food';
    if (includesBusinessTerm(businessType, ['salon', 'spa', 'makeup', 'grooming', 'pet grooming'])) return 'service';
    if (includesBusinessTerm(businessType, ['clinic', 'dental', 'yoga', 'gym', 'fitness', 'trainer', 'wellness'])) return 'health';
    if (includesBusinessTerm(businessType, ['boutique', 'jewelry', 'watch', 'store', 'shop', 'furniture', 'electronics', 'book'])) return 'retail';
    if (includesBusinessTerm(businessType, ['photo', 'tattoo', 'art', 'music', 'florist', 'decor', 'tailor', 'handmade'])) return 'creative';
    if (includesBusinessTerm(businessType, ['real estate', 'law', 'financial', 'planner', 'coach', 'travel', 'contractor'])) return 'professional';

    return 'default';
}

export function getRecommendedProjectAIPreferences(businessType?: string, businessCategory?: string): ResolvedProjectAIPreferences {
    const presetCategory = resolveBusinessPresetCategory(businessType, businessCategory);
    const isPremium = includesBusinessTerm(businessType, ['luxury', 'jewelry', 'watch', 'spa', 'boutique hotel', 'wedding']);

    if (presetCategory === 'food') {
        return {
            description: {
                contentLength: 'Standard',
                tone: 'Friendly',
            },
            image: {
                aspectRatio: DEFAULT_PROJECT_IMAGE_ASPECT_RATIO,
                backgroundColor: null,
                colors: ['Warm Tones', 'Brand Colors'],
                compositions: ['Close-up on Dish Detail', 'Overhead Food Shot (Flat Lay)'],
                environments: ['Table Setting', 'Restaurant Interior'],
                foregroundColor: null,
                isMultiMode: false,
                lighting: ['Natural Daylight', 'Warm Ambient'],
                moods: ['Cozy', 'Fresh'],
                negativePrompt: '',
                styles: ['Food Photography', 'Natural Light'],
                stylesCategory: DEFAULT_PROJECT_IMAGE_STYLE_CATEGORY,
                transparentBg: false,
            },
        };
    }

    if (presetCategory === 'service' || presetCategory === 'health') {
        return {
            description: {
                contentLength: isPremium ? 'Detailed' : 'Standard',
                tone: isPremium ? 'Premium' : 'Professional',
            },
            image: {
                aspectRatio: DEFAULT_PROJECT_IMAGE_ASPECT_RATIO,
                backgroundColor: null,
                colors: ['Clean Whites', 'Brand Accent Colors'],
                compositions: ['Close-up on Service Detail', 'Staff in Action'],
                environments: ['Clean Service Room', 'Modern Interior'],
                foregroundColor: null,
                isMultiMode: false,
                lighting: ['Soft Natural Light', 'Bright Clean Lighting'],
                moods: ['Professional', 'Relaxing'],
                negativePrompt: '',
                styles: ['Shallow Depth of Field / Bokeh', 'Natural Light'],
                stylesCategory: DEFAULT_PROJECT_IMAGE_STYLE_CATEGORY,
                transparentBg: false,
            },
        };
    }

    if (presetCategory === 'retail') {
        return {
            description: {
                contentLength: isPremium ? 'Detailed' : 'Standard',
                tone: isPremium ? 'Premium' : 'Professional',
            },
            image: {
                aspectRatio: DEFAULT_PROJECT_IMAGE_ASPECT_RATIO,
                backgroundColor: null,
                colors: ['Neutral Backgrounds', 'Brand Colors'],
                compositions: ['Clean Product Shot', 'Close-up Product Detail'],
                environments: ['Store Display', 'Simple Studio Setup'],
                foregroundColor: null,
                isMultiMode: false,
                lighting: ['Studio Lighting', 'Bright Natural Light'],
                moods: ['Clean', 'Professional'],
                negativePrompt: '',
                styles: ['Product Photography', 'Studio Lighting'],
                stylesCategory: DEFAULT_PROJECT_IMAGE_STYLE_CATEGORY,
                transparentBg: false,
            },
        };
    }

    if (presetCategory === 'creative') {
        return {
            description: {
                contentLength: 'Detailed',
                tone: 'Friendly',
            },
            image: {
                aspectRatio: DEFAULT_PROJECT_IMAGE_ASPECT_RATIO,
                backgroundColor: null,
                colors: ['Brand Colors', 'Natural Tones'],
                compositions: ['Close-up Detail Shot', 'Work in Progress'],
                environments: ['Studio Space', 'Workshop Area'],
                foregroundColor: null,
                isMultiMode: false,
                lighting: ['Soft Studio Light', 'Natural Light'],
                moods: ['Creative', 'Professional'],
                negativePrompt: '',
                styles: ['Natural Light', 'Macro Photography'],
                stylesCategory: DEFAULT_PROJECT_IMAGE_STYLE_CATEGORY,
                transparentBg: false,
            },
        };
    }

    if (presetCategory === 'professional') {
        return {
            description: {
                contentLength: 'Standard',
                tone: 'Professional',
            },
            image: {
                aspectRatio: DEFAULT_PROJECT_IMAGE_ASPECT_RATIO,
                backgroundColor: null,
                colors: ['Neutral Backgrounds', 'Brand Colors'],
                compositions: ['Professional Service Shot', 'Customer Interaction'],
                environments: ['Office Setting', 'Consultation Area'],
                foregroundColor: null,
                isMultiMode: false,
                lighting: ['Natural Light', 'Soft Studio Light'],
                moods: ['Professional', 'Trustworthy'],
                negativePrompt: '',
                styles: ['Natural Light', 'Studio Lighting'],
                stylesCategory: DEFAULT_PROJECT_IMAGE_STYLE_CATEGORY,
                transparentBg: false,
            },
        };
    }

    return {
        description: {
            contentLength: DEFAULT_PROJECT_DESCRIPTION_LENGTH,
            tone: DEFAULT_PROJECT_DESCRIPTION_TONE,
        },
        image: {
            aspectRatio: DEFAULT_PROJECT_IMAGE_ASPECT_RATIO,
            backgroundColor: null,
            colors: [],
            compositions: [],
            environments: [],
            foregroundColor: null,
            isMultiMode: false,
            lighting: [],
            moods: [],
            negativePrompt: '',
            styles: DEFAULT_PROJECT_IMAGE_STYLES,
            stylesCategory: DEFAULT_PROJECT_IMAGE_STYLE_CATEGORY,
            transparentBg: false,
        },
    };
}

export const AI_IMAGE_ASPECT_RATIO_OPTIONS = [
    {
        description: 'Best for most menu photos',
        label: 'Square',
        value: '1:1',
    },
    {
        description: 'Works well for taller item photos',
        label: 'Portrait',
        value: '4:5',
    },
    {
        description: 'Useful for banners and wider dishes',
        label: 'Wide',
        value: '16:9',
    },
] as const;

export function getResolvedProjectAIPreferences(projectData?: Project | null, businessType?: string, businessCategory?: string): ResolvedProjectAIPreferences {
    const recommended = getRecommendedProjectAIPreferences(businessType, businessCategory);
    const savedDescription = projectData?.aiPreferences?.description;
    const savedImage = projectData?.aiPreferences?.image;

    return {
        description: {
            contentLength: normalizeExactString(
                savedDescription?.contentLength,
                PROJECT_AI_CONTENT_LENGTHS,
                recommended.description.contentLength,
            ),
            tone: normalizeExactString(
                savedDescription?.tone,
                PROJECT_AI_DESCRIPTION_TONES,
                recommended.description.tone,
            ),
        },
        image: {
            aspectRatio: normalizeExactString(
                savedImage?.aspectRatio,
                PROJECT_AI_ASPECT_RATIOS,
                recommended.image.aspectRatio,
            ),
            backgroundColor: normalizePreferenceColor(savedImage?.backgroundColor, recommended.image.backgroundColor),
            colors: normalizePreferenceList(savedImage?.colors, recommended.image.colors),
            compositions: normalizePreferenceList(savedImage?.compositions, recommended.image.compositions),
            environments: normalizePreferenceList(savedImage?.environments, recommended.image.environments),
            foregroundColor: normalizePreferenceColor(savedImage?.foregroundColor, recommended.image.foregroundColor),
            isMultiMode: typeof savedImage?.isMultiMode === 'boolean'
                ? savedImage.isMultiMode
                : recommended.image.isMultiMode,
            lighting: normalizePreferenceList(savedImage?.lighting, recommended.image.lighting),
            moods: normalizePreferenceList(savedImage?.moods, recommended.image.moods),
            negativePrompt: normalizeBoundedString(
                savedImage?.negativePrompt,
                recommended.image.negativePrompt,
                true,
            ),
            styles: normalizePreferenceList(savedImage?.styles, recommended.image.styles, true),
            stylesCategory: normalizeBoundedString(
                savedImage?.stylesCategory,
                recommended.image.stylesCategory,
            ),
            transparentBg: typeof savedImage?.transparentBg === 'boolean'
                ? savedImage.transparentBg
                : recommended.image.transparentBg,
        },
    };
}

export function getProjectDescriptionContentLength(projectData?: Project | null, businessType?: string, businessCategory?: string): 'Standard' | 'Detailed' {
    return getResolvedProjectAIPreferences(projectData, businessType, businessCategory).description.contentLength;
}

export function getProjectDescriptionTone(projectData?: Project | null, businessType?: string, businessCategory?: string): ResolvedProjectAIPreferences['description']['tone'] {
    return getResolvedProjectAIPreferences(projectData, businessType, businessCategory).description.tone;
}

export function getProjectImagePreferencesSummary(projectData?: Project | null, businessType?: string, businessCategory?: string): { aspectRatio: string; primaryStyle: string } {
    const resolved = getResolvedProjectAIPreferences(projectData, businessType, businessCategory);

    return {
        aspectRatio: resolved.image.aspectRatio,
        primaryStyle: resolved.image.styles[0] || DEFAULT_PROJECT_IMAGE_STYLES[0],
    };
}

export function mergeProjectAIPreferences(
    projectData: Project,
    updates: ProjectAIPreferences
): Project {
    return {
        ...projectData,
        aiPreferences: {
            ...(projectData.aiPreferences || {}),
            ...(updates || {}),
            description: {
                ...(projectData.aiPreferences?.description || {}),
                ...(updates.description || {}),
            },
            image: {
                ...(projectData.aiPreferences?.image || {}),
                ...(updates.image || {}),
            },
        },
    };
}

export function extractImagePreferencePatch(config: Partial<ImageGenerationConfigType>): ProjectAIImagePreferences {
    return {
        aspectRatio: config.aspectRatio || DEFAULT_PROJECT_IMAGE_ASPECT_RATIO,
        backgroundColor: config.backgroundColor ?? null,
        colors: config.colors || [],
        compositions: config.compositions || [],
        environments: config.environments || [],
        foregroundColor: config.foregroundColor ?? null,
        isMultiMode: config.isMultiMode || false,
        lighting: config.lighting || [],
        moods: config.moods || [],
        negativePrompt: config.negativePrompt || '',
        styles: config.styles?.length ? config.styles : DEFAULT_PROJECT_IMAGE_STYLES,
        stylesCategory: config.stylesCategory || DEFAULT_PROJECT_IMAGE_STYLE_CATEGORY,
        transparentBg: config.transparentBg || false,
    };
}

export function applyProjectImagePreferencesToGenerationConfig(
    config: ImageGenerationConfigType,
    projectData?: Project | null,
    businessType?: string,
    businessCategory?: string,
): ImageGenerationConfigType {
    const resolved = getResolvedProjectAIPreferences(projectData, businessType, businessCategory);

    return {
        ...config,
        aspectRatio: resolved.image.aspectRatio || config.aspectRatio,
        backgroundColor: resolved.image.backgroundColor,
        colors: resolved.image.colors,
        compositions: resolved.image.compositions,
        environments: resolved.image.environments,
        foregroundColor: resolved.image.foregroundColor,
        isMultiMode: resolved.image.isMultiMode,
        lighting: resolved.image.lighting,
        moods: resolved.image.moods,
        negativePrompt: resolved.image.negativePrompt,
        styles: resolved.image.styles,
        stylesCategory: resolved.image.stylesCategory,
        transparentBg: resolved.image.transparentBg,
    };
}
