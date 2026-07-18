import {
    getSuggestionValue,
    type ExtractedBusinessProfile,
} from '@data/shared/extractedBusinessProfile';
import type { Project } from '@template/main-app/projects/types';

type ProjectConfig = NonNullable<Project['config']>;
type ProjectAIPreferences = NonNullable<Project['aiPreferences']>;

export interface ProjectVisualDefaultsShape {
    projectId?: Project['projectId'];
    masterProjectId?: Project['masterProjectId'];
    config?: {
        design?: {
            menu?: Partial<ProjectConfig['design']['menu']>;
            brand?: Partial<NonNullable<ProjectConfig['design']['brand']>>;
        };
    };
    aiPreferences?: {
        description?: ProjectAIPreferences['description'];
        image?: Partial<NonNullable<ProjectAIPreferences['image']>>;
    };
}

export function mergeProjectWithExtractedProfileDefaults(
    projectData: ProjectVisualDefaultsShape | null | undefined,
    profile: ExtractedBusinessProfile | null | undefined,
): ProjectVisualDefaultsShape | null | undefined {
    if (!profile) return projectData;
    const imageBackgroundColor = getSuggestionValue(profile?.visualBrand?.imageBackgroundColor, 'medium');
    if (!imageBackgroundColor) return projectData;

    return {
        ...(projectData || {}),
        aiPreferences: {
            ...(projectData?.aiPreferences || {}),
            image: {
                ...(projectData?.aiPreferences?.image || {}),
                backgroundColor: projectData?.aiPreferences?.image?.backgroundColor || imageBackgroundColor,
            },
        },
    };
}

export function buildExtractedProfileProjectPatch(
    projectData: ProjectVisualDefaultsShape | null | undefined,
    profile: ExtractedBusinessProfile | null | undefined,
): Partial<Project> | null {
    if (!projectData?.projectId || !profile) return null;

    const patch: Partial<Project> = { projectId: projectData.projectId };
    if (projectData.masterProjectId) patch.masterProjectId = projectData.masterProjectId;

    const brandAccentColor = getSuggestionValue(profile?.visualBrand?.brandAccentColor, 'medium');
    const imageBackgroundColor = getSuggestionValue(profile?.visualBrand?.imageBackgroundColor, 'medium');

    if (brandAccentColor && !projectData?.config?.design?.brand?.accentColor) {
        patch.config = { design: { brand: { accentColor: brandAccentColor } } } as Project['config'];
    }
    if (imageBackgroundColor && !projectData?.aiPreferences?.image?.backgroundColor) {
        patch.aiPreferences = { image: { backgroundColor: imageBackgroundColor } } as Project['aiPreferences'];
    }

    return patch.config || patch.aiPreferences ? patch : null;
}

export function preserveExistingProjectVisualDefaults<T extends ProjectVisualDefaultsShape>(
    patch: T,
    currentProject: ProjectVisualDefaultsShape,
): T {
    const next: ProjectVisualDefaultsShape = { ...patch };

    if (patch.config?.design?.brand?.accentColor && currentProject.config?.design?.brand?.accentColor) {
        next.config = {
            ...patch.config,
            design: {
                ...patch.config.design,
                brand: {
                    ...patch.config.design?.brand,
                },
            },
        };
        delete next.config.design?.brand?.accentColor;
    }

    if (patch.aiPreferences?.image?.backgroundColor && currentProject.aiPreferences?.image?.backgroundColor) {
        next.aiPreferences = {
            ...patch.aiPreferences,
            image: {
                ...patch.aiPreferences.image,
            },
        };
        delete next.aiPreferences.image?.backgroundColor;
    }

    return next as T;
}
