import type { ImageGenerationConfigType, Project, ProjectAIPreferences, ProjectAIImagePreferences } from '@template/main-app/projects/types';

export const DEFAULT_PROJECT_DESCRIPTION_LENGTH: NonNullable<ProjectAIPreferences['description']>['contentLength'] = 'Standard';
export const DEFAULT_PROJECT_DESCRIPTION_TONE: NonNullable<ProjectAIPreferences['description']>['tone'] = 'Professional';
export const DEFAULT_PROJECT_IMAGE_ASPECT_RATIO = '1:1';
export const DEFAULT_PROJECT_IMAGE_STYLE_CATEGORY = 'Photorealism';
export const DEFAULT_PROJECT_IMAGE_STYLES = ['Natural Light'];

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

export function getResolvedProjectAIPreferences(projectData?: Project | null): Required<ProjectAIPreferences> {
    return {
        description: {
            contentLength: projectData?.aiPreferences?.description?.contentLength || DEFAULT_PROJECT_DESCRIPTION_LENGTH,
            tone: projectData?.aiPreferences?.description?.tone || DEFAULT_PROJECT_DESCRIPTION_TONE,
        },
        image: {
            aspectRatio: projectData?.aiPreferences?.image?.aspectRatio || DEFAULT_PROJECT_IMAGE_ASPECT_RATIO,
            colors: projectData?.aiPreferences?.image?.colors || [],
            compositions: projectData?.aiPreferences?.image?.compositions || [],
            environments: projectData?.aiPreferences?.image?.environments || [],
            isMultiMode: projectData?.aiPreferences?.image?.isMultiMode || false,
            lighting: projectData?.aiPreferences?.image?.lighting || [],
            moods: projectData?.aiPreferences?.image?.moods || [],
            styles: projectData?.aiPreferences?.image?.styles?.length
                ? projectData.aiPreferences.image.styles
                : DEFAULT_PROJECT_IMAGE_STYLES,
            stylesCategory: projectData?.aiPreferences?.image?.stylesCategory || DEFAULT_PROJECT_IMAGE_STYLE_CATEGORY,
        },
    };
}

export function getProjectDescriptionContentLength(projectData?: Project | null): 'Standard' | 'Detailed' {
    return getResolvedProjectAIPreferences(projectData).description.contentLength;
}

export function getProjectImagePreferencesSummary(projectData?: Project | null): { aspectRatio: string; primaryStyle: string } {
    const resolved = getResolvedProjectAIPreferences(projectData);

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
        colors: config.colors || [],
        compositions: config.compositions || [],
        environments: config.environments || [],
        isMultiMode: config.isMultiMode || false,
        lighting: config.lighting || [],
        moods: config.moods || [],
        styles: config.styles?.length ? config.styles : DEFAULT_PROJECT_IMAGE_STYLES,
        stylesCategory: config.stylesCategory || DEFAULT_PROJECT_IMAGE_STYLE_CATEGORY,
    };
}

export function applyProjectImagePreferencesToGenerationConfig(
    config: ImageGenerationConfigType,
    projectData?: Project | null
): ImageGenerationConfigType {
    const resolved = getResolvedProjectAIPreferences(projectData);

    return {
        ...config,
        aspectRatio: resolved.image.aspectRatio || config.aspectRatio,
        colors: resolved.image.colors,
        compositions: resolved.image.compositions,
        environments: resolved.image.environments,
        isMultiMode: resolved.image.isMultiMode,
        lighting: resolved.image.lighting,
        moods: resolved.image.moods,
        styles: resolved.image.styles,
        stylesCategory: resolved.image.stylesCategory,
    };
}
