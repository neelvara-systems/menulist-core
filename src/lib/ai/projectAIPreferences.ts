import { getBusinessCategory } from '@data/shared/businessTypes';
import type { ImageGenerationConfigType, Project, ProjectAIPreferences, ProjectAIImagePreferences } from '@template/main-app/projects/types';

export const DEFAULT_PROJECT_DESCRIPTION_LENGTH: NonNullable<ProjectAIPreferences['description']>['contentLength'] = 'Standard';
export const DEFAULT_PROJECT_DESCRIPTION_TONE: NonNullable<ProjectAIPreferences['description']>['tone'] = 'Professional';
export const DEFAULT_PROJECT_IMAGE_ASPECT_RATIO = '1:1';
export const DEFAULT_PROJECT_IMAGE_STYLE_CATEGORY = 'Photorealism';
export const DEFAULT_PROJECT_IMAGE_STYLES = ['Natural Light'];

function includesBusinessTerm(businessType: string | undefined, terms: string[]): boolean {
    const normalized = businessType?.trim().toLowerCase() || '';
    return terms.some((term) => normalized.includes(term));
}

function resolveBusinessPresetCategory(businessType?: string): string {
    if (includesBusinessTerm(businessType, ['restaurant', 'cafe', 'coffee', 'bakery', 'cake', 'ice cream'])) return 'food';
    if (includesBusinessTerm(businessType, ['salon', 'spa', 'makeup', 'grooming', 'pet grooming'])) return 'service';
    if (includesBusinessTerm(businessType, ['clinic', 'dental', 'yoga', 'gym', 'fitness', 'trainer', 'wellness'])) return 'health';
    if (includesBusinessTerm(businessType, ['boutique', 'jewelry', 'watch', 'store', 'shop', 'furniture', 'electronics', 'book'])) return 'retail';
    if (includesBusinessTerm(businessType, ['photo', 'tattoo', 'art', 'music', 'florist', 'decor', 'tailor', 'handmade'])) return 'creative';
    if (includesBusinessTerm(businessType, ['real estate', 'law', 'financial', 'planner', 'coach', 'travel', 'contractor'])) return 'professional';

    return getBusinessCategory(businessType) || 'default';
}

export function getRecommendedProjectAIPreferences(businessType?: string): Required<ProjectAIPreferences> {
    const presetCategory = resolveBusinessPresetCategory(businessType);
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

export function getResolvedProjectAIPreferences(projectData?: Project | null, businessType?: string): Required<ProjectAIPreferences> {
    const recommended = getRecommendedProjectAIPreferences(businessType);

    return {
        description: {
            contentLength: projectData?.aiPreferences?.description?.contentLength || recommended.description.contentLength,
            tone: projectData?.aiPreferences?.description?.tone || recommended.description.tone,
        },
        image: {
            aspectRatio: projectData?.aiPreferences?.image?.aspectRatio || recommended.image.aspectRatio,
            backgroundColor: projectData?.aiPreferences?.image?.backgroundColor ?? recommended.image.backgroundColor,
            colors: projectData?.aiPreferences?.image?.colors || recommended.image.colors,
            compositions: projectData?.aiPreferences?.image?.compositions || recommended.image.compositions,
            environments: projectData?.aiPreferences?.image?.environments || recommended.image.environments,
            foregroundColor: projectData?.aiPreferences?.image?.foregroundColor ?? recommended.image.foregroundColor,
            isMultiMode: projectData?.aiPreferences?.image?.isMultiMode || recommended.image.isMultiMode,
            lighting: projectData?.aiPreferences?.image?.lighting || recommended.image.lighting,
            moods: projectData?.aiPreferences?.image?.moods || recommended.image.moods,
            negativePrompt: projectData?.aiPreferences?.image?.negativePrompt || recommended.image.negativePrompt,
            styles: projectData?.aiPreferences?.image?.styles?.length
                ? projectData.aiPreferences.image.styles
                : recommended.image.styles,
            stylesCategory: projectData?.aiPreferences?.image?.stylesCategory || recommended.image.stylesCategory,
            transparentBg: projectData?.aiPreferences?.image?.transparentBg || recommended.image.transparentBg,
        },
    };
}

export function getProjectDescriptionContentLength(projectData?: Project | null, businessType?: string): 'Standard' | 'Detailed' {
    return getResolvedProjectAIPreferences(projectData, businessType).description.contentLength;
}

export function getProjectDescriptionTone(projectData?: Project | null, businessType?: string): NonNullable<ProjectAIPreferences['description']>['tone'] {
    return getResolvedProjectAIPreferences(projectData, businessType).description.tone;
}

export function getProjectImagePreferencesSummary(projectData?: Project | null, businessType?: string): { aspectRatio: string; primaryStyle: string } {
    const resolved = getResolvedProjectAIPreferences(projectData, businessType);

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
    businessType?: string
): ImageGenerationConfigType {
    const resolved = getResolvedProjectAIPreferences(projectData, businessType);

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
