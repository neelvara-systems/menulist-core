import { FEATURE_FLAGS } from '@config/features';
import { assertProjectUpdateSucceeded, updateProjectMetadata, uploadFile } from '@database/projects';
import { resolveBusinessCategory } from '@data/shared/businessTypes';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { getMediaImageProfile } from '@lib/media/imageProfiles';
import { prepareMediaImage, toPreparedUploadName } from '@lib/media/prepareMediaImage';
import generateImageViaApi from '@services/ai/image/generateImageViaApi';
import type {
    ImageGenerationConfigType,
    ProjectSummaryData,
} from '@template/main-app/projects/types';
import type { ComparisonEngineOutput } from '@lib/extraction/comparisonEngine.types';

type ProjectImageSource = {
    active?: boolean;
    defaultLanguage?: string;
    description?: string | Record<string, string>;
    files?: any[];
    isDefault?: boolean;
    isSpecialMenu?: boolean;
    languages?: string[];
    name?: string | Record<string, string>;
    projectId?: string | null;
    projectImage?: string | null;
    [key: string]: any;
};

type ProjectImageCandidateParams = {
    allowNameOnly?: boolean;
    businessCategory?: string | null;
    businessType?: string | null;
    categories?: any[];
    items?: any[];
    project: ProjectImageSource;
    storeName?: string | null;
};

type GenerateAndSaveProjectImageParams = ProjectImageCandidateParams & {
    summaryData?: Partial<ProjectSummaryData> | null;
};

type BusinessCoverCandidateParams = {
    businessCategory?: string | null;
    businessType?: string | null;
    projects?: ProjectImageSource[];
    store: {
        businessCategory?: string | null;
        businessType?: string | null;
        name?: string | Record<string, string> | null;
        publicPresence?: {
            descriptor?: string | Record<string, string>;
            knownFor?: string | Record<string, string>;
            specialNote?: string | Record<string, string>;
        };
        storeId?: string | number | null;
        tenantName?: string | Record<string, string> | null;
        [key: string]: any;
    };
    storeName?: string | null;
};

export type GeneratedProjectImageCandidate = {
    dataUrl: string;
    mimeType: string;
    name: string;
};

type GenerateAndSaveProjectImageResult = {
    imageUrl?: string;
    skippedReason?: 'existing-image' | 'feature-disabled' | 'not-enough-data' | 'generation-failed' | 'upload-failed' | 'missing-project-id';
};

type BusinessImageViewType = {
    description?: string;
    type: string;
};

type BusinessImageViewConfig = {
    contextual_elements?: {
        colors?: string[];
        compositions?: string[];
        environments?: string[];
        lighting?: string[];
        moods?: string[];
        subjects?: string[];
    };
    imageTypes?: BusinessImageViewType[];
    persona?: string;
};

const PROJECT_IMAGE_GENERATION_CONFIG: ImageGenerationConfigType = {
    prompt: 'Generate a professional menu cover image for this business.',
    referanceImages: [],
    referanceImage: null,
    generatedImages: [],
    loading: false,
    aspectRatio: getMediaImageProfile('projectImage').defaultAspectRatio,
    stylesCategory: 'Photorealism',
    styles: ['Natural Light'],
    lighting: ['soft natural light'],
    moods: ['welcoming', 'premium'],
    compositions: ['hero product composition'],
    negativePrompt: 'text, words, letters, logo, watermark, menu text, price list, blurry, distorted',
    agreeToTerms: true,
};

const BUSINESS_COVER_GENERATION_CONFIG: ImageGenerationConfigType = {
    ...PROJECT_IMAGE_GENERATION_CONFIG,
    prompt: 'Generate a professional official business page cover image.',
    aspectRatio: getMediaImageProfile('businessCover').defaultAspectRatio,
    negativePrompt: 'text, words, letters, logo, watermark, menu text, price list, blurry, distorted, excessive filters',
};

const PROJECT_COVER_IMAGE_GUIDANCE_BY_CATEGORY: Record<string, BusinessImageViewConfig> = {
    food: {
        persona: 'Specialist in polished hospitality cover photography',
        imageTypes: [{
            type: 'Menu cover ambiance',
            description: 'A polished cover shot blending signature food or drinks with the business setting',
        }],
        contextual_elements: {
            subjects: ['Signature dishes', 'Drinks', 'Fresh ingredients', 'Table setting', 'Staff serving'],
            environments: ['Restaurant interior', 'Cafe counter', 'Table setting', 'Bar area'],
            lighting: ['Warm ambient', 'Natural daylight'],
            colors: ['Warm tones', 'Fresh greens'],
            moods: ['Inviting', 'Fresh'],
            compositions: ['Wide shot of ambiance', 'Overhead food spread'],
        },
    },
    service: {
        persona: 'Specialist in premium local service photography',
        imageTypes: [{
            type: 'Service cover ambiance',
            description: 'A clean cover shot showing the service environment and key service details',
        }],
        contextual_elements: {
            subjects: ['Service professional', 'Service tools', 'Finished result', 'Product display', 'Customer interaction'],
            environments: ['Modern service interior', 'Service station', 'Treatment room', 'Product display'],
            lighting: ['Soft natural light', 'Bright clean lighting'],
            colors: ['Clean whites', 'Soft neutrals'],
            moods: ['Premium', 'Professional'],
            compositions: ['Close-up on service detail', 'Staff in action'],
        },
    },
    retail: {
        persona: 'Specialist in clean retail and product display photography',
        imageTypes: [{
            type: 'Product collection cover',
            description: 'A clean cover shot showing a curated product selection or store display',
        }],
        contextual_elements: {
            subjects: ['Product display', 'Curated collection', 'Shelf display', 'Customer browsing'],
            environments: ['Store display', 'Showroom floor', 'Simple studio setup', 'Shelf wall'],
            lighting: ['Studio lighting', 'Bright natural light'],
            colors: ['Neutral backgrounds', 'Brand colors'],
            moods: ['Clean', 'Premium'],
            compositions: ['Collection grouping', 'Store display overview'],
        },
    },
    professional: {
        persona: 'Specialist in credible professional service photography',
        imageTypes: [{
            type: 'Professional service cover',
            description: 'A credible cover shot showing the workspace, consultation, or customer-facing service moment',
        }],
        contextual_elements: {
            subjects: ['Owner or staff', 'Client meeting', 'Workspace', 'Planning tools', 'Finished result'],
            environments: ['Office setting', 'Consultation area', 'Meeting table', 'Reception area'],
            lighting: ['Natural light', 'Soft studio light'],
            colors: ['Neutral backgrounds', 'Brand colors'],
            moods: ['Trustworthy', 'Professional'],
            compositions: ['Consultation scene', 'Workspace overview'],
        },
    },
    creative: {
        persona: 'Specialist in expressive creative and event service photography',
        imageTypes: [{
            type: 'Creative work cover',
            description: 'A visual cover shot showing craft, creative output, or event atmosphere',
        }],
        contextual_elements: {
            subjects: ['Artist or maker', 'Finished work', 'Tools', 'Decor details', 'Behind-the-scenes process'],
            environments: ['Studio space', 'Workshop area', 'Event setup', 'Gallery space'],
            lighting: ['Soft studio light', 'Natural light'],
            colors: ['Brand colors', 'Natural tones'],
            moods: ['Creative', 'Premium'],
            compositions: ['Work in progress', 'Finished display'],
        },
    },
    health: {
        persona: 'Specialist in trustworthy health and wellness service photography',
        imageTypes: [{
            type: 'Care and wellness cover',
            description: 'A trustworthy cover shot showing the service space, activity, or care environment',
        }],
        contextual_elements: {
            subjects: ['Instructor', 'Care professional', 'Clean equipment', 'Service room', 'Group activity'],
            environments: ['Clean clinic environment', 'Studio interior', 'Training room', 'Reception area'],
            lighting: ['Bright clean lighting', 'Soft natural light'],
            colors: ['Clean whites', 'Neutral tones'],
            moods: ['Trustworthy', 'Healthy'],
            compositions: ['Wide environment shot', 'Professional in action'],
        },
    },
    specialty: {
        persona: 'Specialist in clear specialty business cover photography',
        imageTypes: [{
            type: 'Specialty business cover',
            description: 'A clear cover shot showing the business result, space, vehicle, equipment, or team in action',
        }],
        contextual_elements: {
            subjects: ['Team at work', 'Equipment', 'Finished result', 'Business space', 'Customer interaction'],
            environments: ['Workshop bay', 'Customer-facing space', 'Showroom', 'Outdoor work area'],
            lighting: ['Natural daylight', 'Bright clean lighting'],
            colors: ['Clean whites', 'Brand colors'],
            moods: ['Reliable', 'Professional'],
            compositions: ['Finished service overview', 'Team in action'],
        },
    },
};

function resolveText(value: unknown, fallback = ''): string {
    return getLocalizedText(
        value as any,
        undefined,
        getPrimaryLocalizedLanguage(value as any, 'en'),
        fallback,
    );
}

function uniqueNonEmpty(values: string[], limit: number): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
        const normalized = value.replace(/\s+/g, ' ').trim();
        if (!normalized || seen.has(normalized.toLowerCase())) continue;
        seen.add(normalized.toLowerCase());
        result.push(normalized);
        if (result.length >= limit) break;
    }

    return result;
}

function cleanPromptPhrase(value?: string | null): string {
    return (value || '').replace(/[."]/g, ',').replace(/\s+/g, ' ').trim();
}

function takeNonEmpty(values: string[] | undefined, limit: number): string[] {
    return uniqueNonEmpty(values || [], limit);
}

function findBusinessImageViewConfig(
    businessType?: string | null,
    businessCategory?: string | null,
): BusinessImageViewConfig {
    const resolvedCategory = resolveBusinessCategory(
        businessType || undefined,
        businessCategory || undefined,
    );

    return PROJECT_COVER_IMAGE_GUIDANCE_BY_CATEGORY[resolvedCategory || 'specialty']
        || PROJECT_COVER_IMAGE_GUIDANCE_BY_CATEGORY.specialty;
}

function pickPreferredValue(values: string[] | undefined, preferredTerms: string[]): string | undefined {
    const options = takeNonEmpty(values, 12);
    if (!options.length) return undefined;

    for (const term of preferredTerms) {
        const match = options.find((option) => option.toLowerCase().includes(term));
        if (match) return match;
    }

    return options[0];
}

function pickProjectCoverImageType(imageTypes: BusinessImageViewType[] | undefined): BusinessImageViewType | undefined {
    const options = imageTypes || [];
    if (!options.length) return undefined;

    const preferredTerms = [
        'ambiance',
        'interior',
        'environment',
        'display',
        'showroom',
        'lifestyle',
        'scene',
        'overview',
        'wide',
        'customer',
        'staff',
        'action',
        'at work',
    ];

    for (const term of preferredTerms) {
        const match = options.find((option) => option.type.toLowerCase().includes(term));
        if (match) return match;
    }

    return options[0];
}

function buildBusinessImageGuidance(businessType?: string | null, businessCategory?: string | null) {
    const businessConfig = findBusinessImageViewConfig(businessType, businessCategory);
    const imageType = pickProjectCoverImageType(businessConfig.imageTypes);
    const contextualElements = businessConfig.contextual_elements || {};

    return {
        colors: takeNonEmpty(contextualElements.colors, 2),
        compositions: takeNonEmpty([
            pickPreferredValue(contextualElements.compositions, ['wide', 'ambiance', 'lifestyle', 'display', 'overview', 'customer', 'action', 'close-up']) || '',
        ], 1),
        environments: takeNonEmpty([
            pickPreferredValue(contextualElements.environments, ['interior', 'display', 'shop', 'store', 'salon', 'clinic', 'studio', 'showroom', 'table', 'office', 'environment', 'setting']) || '',
        ], 1),
        imageType,
        lighting: takeNonEmpty(contextualElements.lighting, 2),
        moods: takeNonEmpty(contextualElements.moods, 2),
        persona: cleanPromptPhrase(businessConfig.persona),
        subjects: takeNonEmpty(contextualElements.subjects, 5),
    };
}

function collectProjectMenuData(
    project: ProjectImageSource,
    categoriesOverride?: any[],
    itemsOverride?: any[],
) {
    const fileCategories = project.files?.flatMap((file) => file?.extractedData?.data?.categories || []) || [];
    const fileItems = project.files?.flatMap((file) => file?.extractedData?.data?.items || []) || [];

    const categories = categoriesOverride?.length ? categoriesOverride : fileCategories;
    const items = itemsOverride?.length ? itemsOverride : fileItems;

    const categoryNameById = new Map<string, string>();
    const categoryNames = uniqueNonEmpty(
        categories.map((category) => {
            const categoryName = resolveText(category?.name, '');
            if (category?.id && categoryName) {
                categoryNameById.set(category.id, categoryName);
            }
            return categoryName;
        }),
        5,
    );

    const itemNames = uniqueNonEmpty(
        items
            .filter((item) => item?.active !== false && item?.available !== false)
            .map((item) => resolveText(item?.name, '')),
        8,
    );

    const itemCategoryNames = uniqueNonEmpty(
        items.map((item) => (
            resolveText(item?.categoryName, '') ||
            categoryNameById.get(item?.category || item?.categoryId) ||
            ''
        )),
        4,
    );

    return {
        categoryNames: categoryNames.length ? categoryNames : itemCategoryNames,
        itemNames,
    };
}

function buildProjectImageDescription(params: ProjectImageCandidateParams) {
    const { allowNameOnly = false, businessCategory, businessType, project, storeName } = params;
    const projectName = resolveText(project.name, 'Menu');
    const projectDescription = resolveText(project.description, '');
    const { categoryNames, itemNames } = collectProjectMenuData(project, params.categories, params.items);
    const businessGuidance = buildBusinessImageGuidance(businessType, businessCategory);

    if (!allowNameOnly && !categoryNames.length && !itemNames.length) {
        return null;
    }

    const contextParts = [
        `${projectName} is a ${businessType || 'business'} menu${storeName ? ` for ${storeName}` : ''}`,
        projectDescription ? `Owner description: ${cleanPromptPhrase(projectDescription)}` : null,
        categoryNames.length ? `Menu sections to represent include ${categoryNames.join(', ')}` : null,
        itemNames.length ? `Representative items or services to visually reference include ${itemNames.join(', ')}` : null,
        businessGuidance.persona ? `Business photo style is ${businessGuidance.persona}` : null,
        businessGuidance.subjects.length ? `Relevant visual subjects include ${businessGuidance.subjects.join(', ')}` : null,
        businessGuidance.imageType ? `Use photo direction ${businessGuidance.imageType.type}: ${cleanPromptPhrase(businessGuidance.imageType.description)}` : null,
        'Create one polished widescreen menu card image, focused on the business offering, with no readable text, no logo, and no watermark',
    ].filter(Boolean);

    return {
        businessGuidance,
        coverSubject: itemNames.length
            ? `${projectName} menu cover featuring ${itemNames.slice(0, 4).join(', ')}`
            : categoryNames.length
                ? `${projectName} menu cover featuring ${categoryNames.slice(0, 4).join(', ')}`
                : `${projectName} menu cover`,
        descriptionLine: contextParts.join('; '),
        projectName,
    };
}

function buildBusinessCoverDescription(params: BusinessCoverCandidateParams) {
    const storeName = resolveText(params.storeName || params.store.tenantName || params.store.name, 'Business');
    const publicPresence = params.store.publicPresence || {};
    const descriptor = resolveText(publicPresence.descriptor, '');
    const knownFor = resolveText(publicPresence.knownFor, '');
    const specialNote = resolveText(publicPresence.specialNote, '');
    const businessType = params.businessType || params.store.businessType || 'business';
    const businessCategory = params.businessCategory || params.store.businessCategory;
    const businessGuidance = buildBusinessImageGuidance(businessType, businessCategory);
    const activeProjects = (params.projects || [])
        .filter((project) => project?.active !== false && project?.deleted !== true)
        .slice(0, 5);
    const projectNames = uniqueNonEmpty(activeProjects.map((project) => resolveText(project.name, '')), 5);
    const projectDescriptions = uniqueNonEmpty(activeProjects.map((project) => resolveText(project.description, '')), 3);
    const collected = activeProjects.map((project) => collectProjectMenuData(project));
    const categoryNames = uniqueNonEmpty(collected.flatMap((entry) => entry.categoryNames), 6);
    const itemNames = uniqueNonEmpty(collected.flatMap((entry) => entry.itemNames), 8);

    const contextParts = [
        `${storeName} is a ${businessType}`,
        descriptor ? `Public descriptor: ${cleanPromptPhrase(descriptor)}` : null,
        knownFor ? `Known for: ${cleanPromptPhrase(knownFor)}` : null,
        specialNote ? `Owner note: ${cleanPromptPhrase(specialNote)}` : null,
        projectNames.length ? `Menu or service groups include ${projectNames.join(', ')}` : null,
        projectDescriptions.length ? `Owner menu descriptions include ${projectDescriptions.join(', ')}` : null,
        categoryNames.length ? `Business categories to represent include ${categoryNames.join(', ')}` : null,
        itemNames.length ? `Representative items or services include ${itemNames.slice(0, 6).join(', ')}` : null,
        businessGuidance.persona ? `Business photo style is ${businessGuidance.persona}` : null,
        businessGuidance.subjects.length ? `Relevant visual subjects include ${businessGuidance.subjects.join(', ')}` : null,
        businessGuidance.imageType ? `Use photo direction ${businessGuidance.imageType.type}: ${cleanPromptPhrase(businessGuidance.imageType.description)}` : null,
        'Create one polished widescreen cover photo for the official business page, focused on the business atmosphere and offering, with no readable text, no logo, and no watermark',
    ].filter(Boolean);

    return {
        businessGuidance,
        coverSubject: itemNames.length
            ? `${storeName} official business cover featuring ${itemNames.slice(0, 4).join(', ')}`
            : categoryNames.length
                ? `${storeName} official business cover featuring ${categoryNames.slice(0, 4).join(', ')}`
                : `${storeName} official business cover`,
        descriptionLine: contextParts.join('; '),
        projectId: activeProjects[0]?.projectId || `store-${params.store.storeId || 'business-cover'}`,
        storeName,
    };
}

export function getProjectImageDataFromComparisonPreview(comparisonResult: ComparisonEngineOutput | null | undefined) {
    const preview = comparisonResult?.preview;
    if (!preview) return { categories: [], items: [] };

    return {
        categories: [
            ...preview.newCategories,
            ...preview.updatedCategories,
        ].filter((row) => row.approved).map((row) => row.extractedCategory),
        items: [
            ...preview.newItems,
            ...preview.updatedItems,
            ...preview.overrideSuggestions,
        ].filter((row) => row.approved).map((row) => row.extractedItem),
    };
}

export async function generateProjectImageCandidate(
    params: ProjectImageCandidateParams,
): Promise<GeneratedProjectImageCandidate | null> {
    if (!FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION) return null;

    const description = buildProjectImageDescription(params);
    if (!description) return null;

    const projectId = params.project.projectId || 'project-draft';
    const generatedImages = await generateImageViaApi({
        businessType: params.businessType || params.businessCategory || 'business',
        fileId: 'project-image',
        generationConfig: {
            ...PROJECT_IMAGE_GENERATION_CONFIG,
            colors: description.businessGuidance.colors,
            compositions: description.businessGuidance.compositions,
            environments: description.businessGuidance.environments,
            isMultiMode: false,
            lighting: description.businessGuidance.lighting,
            moods: description.businessGuidance.moods,
            prompt: `Generate a professional menu cover image for ${description.projectName}.`,
            selectedImageTypes: [],
        },
        itemDetails: {
            id: `${projectId}-project-image`,
            itemName: description.coverSubject,
            name: description.coverSubject,
            categoryName: 'Menu cover',
            category: 'Menu cover',
            descriptionLine: description.descriptionLine,
            description: description.descriptionLine,
            attributesList: ['menu cover', 'official business page', 'square image'],
            attributes: ['menu cover', 'official business page', 'square image'],
            fileId: 'project-image',
        } as any,
        projectId,
    });

    const firstImage = generatedImages?.[0];
    if (!firstImage?.base64) return null;

    return {
        dataUrl: firstImage.base64,
        mimeType: firstImage.mimeType || 'image/jpeg',
        name: `${description.projectName} menu cover`,
    };
}

export async function generateBusinessCoverCandidate(
    params: BusinessCoverCandidateParams,
): Promise<GeneratedProjectImageCandidate | null> {
    if (!FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION) return null;

    const description = buildBusinessCoverDescription(params);
    const generatedImages = await generateImageViaApi({
        businessType: params.businessType || params.store.businessType || params.businessCategory || params.store.businessCategory || 'business',
        fileId: 'business-cover',
        generationConfig: {
            ...BUSINESS_COVER_GENERATION_CONFIG,
            colors: description.businessGuidance.colors,
            compositions: description.businessGuidance.compositions,
            environments: description.businessGuidance.environments,
            isMultiMode: false,
            lighting: description.businessGuidance.lighting,
            moods: description.businessGuidance.moods,
            prompt: `Generate a professional official business page cover image for ${description.storeName}.`,
            selectedImageTypes: [],
        },
        itemDetails: {
            id: `${description.projectId}-business-cover`,
            itemName: description.coverSubject,
            name: description.coverSubject,
            categoryName: 'Business cover',
            category: 'Business cover',
            descriptionLine: description.descriptionLine,
            description: description.descriptionLine,
            attributesList: ['official business page cover', 'widescreen image', 'business atmosphere'],
            attributes: ['official business page cover', 'widescreen image', 'business atmosphere'],
            fileId: 'business-cover',
        } as any,
        projectId: String(description.projectId),
    });

    const firstImage = generatedImages?.[0];
    if (!firstImage?.base64) return null;

    return {
        dataUrl: firstImage.base64,
        mimeType: firstImage.mimeType || 'image/jpeg',
        name: `${description.storeName} business cover`,
    };
}

export async function generateAndSaveProjectImageIfMissing(
    params: GenerateAndSaveProjectImageParams,
): Promise<GenerateAndSaveProjectImageResult> {
    if (!FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION) return { skippedReason: 'feature-disabled' };

    const projectId = params.project.projectId;
    if (!projectId) return { skippedReason: 'missing-project-id' };
    if (params.project.projectImage || params.summaryData?.projectImage) {
        return { skippedReason: 'existing-image' };
    }

    const candidate = await generateProjectImageCandidate({
        ...params,
        allowNameOnly: false,
    });

    if (!candidate) {
        return { skippedReason: 'not-enough-data' };
    }

    const preparedCandidate = await prepareMediaImage(candidate.dataUrl, 'projectImage', {
        fileName: candidate.name,
    });

    const imageUrl = await uploadFile({
        blob: preparedCandidate.blob,
        mediaChecksum: preparedCandidate.checksum,
        mediaId: preparedCandidate.mediaId,
        mediaProfile: 'projectImage',
        mediaVariant: preparedCandidate.primaryVariant,
        mediaVersion: preparedCandidate.version,
        name: toPreparedUploadName(candidate.name, preparedCandidate.mimeType, candidate.name),
        preparedMedia: preparedCandidate,
        type: preparedCandidate.mimeType,
        uid: `${projectId}-generated-menu-cover`,
        url: preparedCandidate.dataUrl,
    } as any, 'project-images');

    if (!imageUrl) {
        return { skippedReason: 'upload-failed' };
    }

    const metadataResult = await updateProjectMetadata(
        projectId,
        { projectImage: imageUrl },
        { preserveExistingProjectImage: true },
    );
    assertProjectUpdateSucceeded(
        metadataResult,
        projectId,
        'project_image_generation_metadata_update_rejected',
    );
    if (metadataResult.projectImage !== imageUrl) {
        return { skippedReason: 'existing-image' };
    }

    return { imageUrl };
}
