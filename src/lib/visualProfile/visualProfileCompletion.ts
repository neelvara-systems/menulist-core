import { resolveBusinessCategoryOrFallback } from '@data/shared/businessTypes';

type VisualProfileTaskStatus = 'complete' | 'missing';
type VisualProfileStatus = 'complete' | 'needs-attention';

export interface VisualProfileProjectSummary {
    active?: boolean;
    deleted?: boolean;
    isSpecialMenu?: boolean;
    projectImage?: string | null;
}

export interface VisualProfileCompletionInput {
    businessCategory?: string | null;
    businessType?: string | null;
    businessCover?: string | null;
    photos?: Array<string | null | undefined> | null;
    projects?: VisualProfileProjectSummary[] | null;
}

export interface VisualProfileCompletionTask {
    id: 'main-photo' | 'business-photos' | 'offering-photo';
    detail: string;
    label: string;
    status: VisualProfileTaskStatus;
}

export interface VisualProfileCompletionResult {
    completedCount: number;
    coverage: 'business-only' | 'full';
    headline: string;
    helperText: string;
    missingCount: number;
    photoCount: number;
    requiredPhotoCount: number;
    status: VisualProfileStatus;
    statusLabel: 'No action needed' | 'Needs attention';
    tasks: VisualProfileCompletionTask[];
    totalCount: number;
}

const REQUIRED_GALLERY_PHOTOS_BY_CATEGORY: Record<string, number> = {
    creative: 3,
    food: 3,
    health: 3,
    professional: 2,
    retail: 2,
    service: 3,
    specialty: 2,
};

const OFFERING_PHOTO_LABEL_BY_CATEGORY: Record<string, string> = {
    food: 'Menu photo',
    retail: 'Product photo',
};

function hasValue(value?: string | null): boolean {
    return typeof value === 'string' && value.trim().length > 0;
}

function pluralizePhoto(count: number): string {
    return count === 1 ? 'photo' : 'photos';
}

function getOfferingPhotoLabel(category: string): string {
    return OFFERING_PHOTO_LABEL_BY_CATEGORY[category] || 'Service photo';
}

export function buildVisualProfileCompletion(input: VisualProfileCompletionInput): VisualProfileCompletionResult {
    const category = resolveBusinessCategoryOrFallback(
        input.businessType || undefined,
        input.businessCategory || undefined,
    );
    const requiredPhotoCount = REQUIRED_GALLERY_PHOTOS_BY_CATEGORY[category] || REQUIRED_GALLERY_PHOTOS_BY_CATEGORY.specialty;
    const photoCount = new Set(
        (input.photos || [])
            .filter(hasValue)
            .map((photo) => photo!.trim()),
    ).size;
    const hasBusinessCover = hasValue(input.businessCover);
    const tasks: VisualProfileCompletionTask[] = [
        {
            detail: hasBusinessCover
                ? 'Ready for the top of the public page.'
                : 'Add a main photo for the top of the public page.',
            id: 'main-photo',
            label: 'Main photo',
            status: hasBusinessCover ? 'complete' : 'missing',
        },
        {
            detail: photoCount >= requiredPhotoCount
                ? `${photoCount} ${pluralizePhoto(photoCount)} added.`
                : `${photoCount} of ${requiredPhotoCount} ${pluralizePhoto(requiredPhotoCount)} added.`,
            id: 'business-photos',
            label: 'Business photos',
            status: photoCount >= requiredPhotoCount ? 'complete' : 'missing',
        },
    ];

    const hasProjectCoverage = Array.isArray(input.projects);
    if (hasProjectCoverage) {
        const hasOfferingPhoto = input.projects.some((project) => (
            project?.active !== false
            && project?.deleted !== true
            && project?.isSpecialMenu !== true
            && hasValue(project?.projectImage)
        ));

        tasks.push({
            detail: hasOfferingPhoto
                ? 'At least one public menu or service page has a photo.'
                : 'Add one photo to a menu or service page.',
            id: 'offering-photo',
            label: getOfferingPhotoLabel(category),
            status: hasOfferingPhoto ? 'complete' : 'missing',
        });
    }

    const completedCount = tasks.filter((task) => task.status === 'complete').length;
    const missingCount = tasks.length - completedCount;
    const status: VisualProfileStatus = missingCount === 0 ? 'complete' : 'needs-attention';

    return {
        completedCount,
        coverage: hasProjectCoverage ? 'full' : 'business-only',
        headline: status === 'complete'
            ? hasProjectCoverage
                ? 'Visual profile is complete'
                : 'Business photos are ready'
            : `${missingCount} visual ${missingCount === 1 ? 'detail' : 'details'} missing`,
        helperText: status === 'complete'
            ? hasProjectCoverage
                ? 'Customers can see the key photos for this business.'
                : 'Menu or service page photos are checked when that menu data is available.'
            : 'Add the missing photos from the controls below.',
        missingCount,
        photoCount,
        requiredPhotoCount,
        status,
        statusLabel: status === 'complete' ? 'No action needed' : 'Needs attention',
        tasks,
        totalCount: tasks.length,
    };
}
