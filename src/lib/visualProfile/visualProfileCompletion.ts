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

function hasValue(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function asOptionalText(value: unknown): string | null | undefined {
    if (typeof value === 'string') return value;
    if (value === null) return null;
    return undefined;
}

function readOwnDataField(value: unknown, key: string): unknown {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
    try {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && 'value' in descriptor ? descriptor.value : undefined;
    } catch {
        return undefined;
    }
}

function snapshotArray(value: unknown, maxItems: number): unknown[] | null {
    if (!Array.isArray(value)) return null;
    try {
        const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
        const length = lengthDescriptor && 'value' in lengthDescriptor
            ? lengthDescriptor.value
            : undefined;
        if (!Number.isSafeInteger(length) || length < 0 || length > maxItems) return null;
        const output: unknown[] = [];
        for (let index = 0; index < length; index += 1) {
            const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
            output.push(descriptor && 'value' in descriptor ? descriptor.value : undefined);
        }
        return output;
    } catch {
        return null;
    }
}

function pluralizePhoto(count: number): string {
    return count === 1 ? 'photo' : 'photos';
}

function getOfferingPhotoLabel(category: string): string {
    return OFFERING_PHOTO_LABEL_BY_CATEGORY[category] || 'Service photo';
}

export function buildVisualProfileCompletion(input: VisualProfileCompletionInput): VisualProfileCompletionResult {
    const businessType = readOwnDataField(input, 'businessType');
    const businessCategory = readOwnDataField(input, 'businessCategory');
    const category = resolveBusinessCategoryOrFallback(
        typeof businessType === 'string' ? businessType : undefined,
        typeof businessCategory === 'string' ? businessCategory : undefined,
    );
    const requiredPhotoCount = REQUIRED_GALLERY_PHOTOS_BY_CATEGORY[category] || REQUIRED_GALLERY_PHOTOS_BY_CATEGORY.specialty;
    const photos = snapshotArray(readOwnDataField(input, 'photos'), 64) || [];
    const photoCount = new Set(
        photos
            .filter(hasValue)
            .map((photo) => photo.trim()),
    ).size;
    const businessCover = readOwnDataField(input, 'businessCover');
    const hasBusinessCover = hasValue(asOptionalText(businessCover));
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

    const projectsValue = readOwnDataField(input, 'projects');
    const projects = snapshotArray(projectsValue, 1_000);
    const hasProjectCoverage = projects !== null;
    if (hasProjectCoverage) {
        const hasOfferingPhoto = projects.some((project) => {
            const active = readOwnDataField(project, 'active');
            const deleted = readOwnDataField(project, 'deleted');
            const isSpecialMenu = readOwnDataField(project, 'isSpecialMenu');
            const projectImage = readOwnDataField(project, 'projectImage');
            return active !== false
                && deleted !== true
                && isSpecialMenu !== true
                && hasValue(asOptionalText(projectImage));
        });

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
