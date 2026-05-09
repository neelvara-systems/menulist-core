import { FEATURE_FLAGS } from '@config/features';

export type MediaAspectRatioValue = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

export type MediaImageType =
    | 'menuItem'
    | 'categoryImage'
    | 'projectImage'
    | 'menuBackground'
    | 'businessLogo'
    | 'businessCover'
    | 'digitalScreenSlide'
    | 'galleryImage';

export type MediaImageFit = 'cover' | 'contain';

export interface MediaAspectRatioOption {
    value: MediaAspectRatioValue;
    width: number;
    height: number;
    title: string;
    useCase: string;
}

export interface MediaImageProfile {
    allowedAspectRatios: MediaAspectRatioValue[];
    allowedMimeTypes: readonly string[];
    cropRequired: boolean;
    defaultAspectRatio: MediaAspectRatioValue;
    description: string;
    fit: MediaImageFit;
    id: MediaImageType;
    label: string;
    maxDimension: number;
    maxOutputSizeKB: number;
    maxSourceBytes: number;
    minDimension: number;
    minHeight: number;
    minQuality: number;
    minWidth: number;
    outputFormat: 'image/jpeg' | 'image/png' | 'image/webp';
    paddingRatio?: number;
    quality: number;
    storageFolder: string;
    variants: readonly number[];
}

export const MEDIA_ACCEPTED_IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
] as const;

export const MEDIA_ACCEPTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

export const MEDIA_ASPECT_RATIO_OPTIONS: MediaAspectRatioOption[] = [
    { value: '1:1', width: 40, height: 40, title: 'Square', useCase: 'Best for menu cards' },
    { value: '4:3', width: 40, height: 30, title: 'Landscape', useCase: 'Best for item photos' },
    { value: '16:9', width: 50, height: 28, title: 'Widescreen', useCase: 'Best for covers' },
    { value: '3:4', width: 30, height: 40, title: 'Portrait', useCase: 'Limited use' },
    { value: '9:16', width: 25, height: 40, title: 'Mobile vertical', useCase: 'Social-only' },
];

const MB = 1024 * 1024;

export const MEDIA_IMAGE_PROFILES: Record<MediaImageType, MediaImageProfile> = {
    menuItem: {
        id: 'menuItem',
        label: 'Item image',
        description: 'Primary public image for one menu item or service.',
        allowedMimeTypes: MEDIA_ACCEPTED_IMAGE_MIME_TYPES,
        allowedAspectRatios: ['1:1', '4:3'],
        defaultAspectRatio: '1:1',
        cropRequired: true,
        fit: 'cover',
        maxSourceBytes: 8 * MB,
        minWidth: 400,
        minHeight: 300,
        maxDimension: 1200,
        outputFormat: 'image/webp',
        quality: 0.82,
        minQuality: 0.58,
        minDimension: 720,
        maxOutputSizeKB: 500,
        storageFolder: 'itemImages',
        variants: [300, 600, 1200],
    },
    categoryImage: {
        id: 'categoryImage',
        label: 'Category image',
        description: 'Public category presentation image.',
        allowedMimeTypes: MEDIA_ACCEPTED_IMAGE_MIME_TYPES,
        allowedAspectRatios: ['4:3', '1:1'],
        defaultAspectRatio: '4:3',
        cropRequired: true,
        fit: 'cover',
        maxSourceBytes: 8 * MB,
        minWidth: 400,
        minHeight: 300,
        maxDimension: 1200,
        outputFormat: 'image/webp',
        quality: 0.8,
        minQuality: 0.58,
        minDimension: 720,
        maxOutputSizeKB: 500,
        storageFolder: 'categoryImages',
        variants: [300, 600, 1200],
    },
    projectImage: {
        id: 'projectImage',
        label: 'Menu image',
        description: 'Project or menu-card image used in owner and public menu selection surfaces.',
        allowedMimeTypes: MEDIA_ACCEPTED_IMAGE_MIME_TYPES,
        allowedAspectRatios: ['16:9', '1:1'],
        defaultAspectRatio: '16:9',
        cropRequired: true,
        fit: 'cover',
        maxSourceBytes: 8 * MB,
        minWidth: 640,
        minHeight: 360,
        maxDimension: 1600,
        outputFormat: 'image/webp',
        quality: 0.8,
        minQuality: 0.58,
        minDimension: 900,
        maxOutputSizeKB: 650,
        storageFolder: 'project-images',
        variants: [300, 600, 1200, 1600],
    },
    menuBackground: {
        id: 'menuBackground',
        label: 'Menu background',
        description: 'Customer-facing menu background image.',
        allowedMimeTypes: MEDIA_ACCEPTED_IMAGE_MIME_TYPES,
        allowedAspectRatios: ['16:9'],
        defaultAspectRatio: '16:9',
        cropRequired: true,
        fit: 'cover',
        maxSourceBytes: 10 * MB,
        minWidth: 800,
        minHeight: 450,
        maxDimension: 1400,
        outputFormat: 'image/jpeg',
        quality: 0.72,
        minQuality: 0.48,
        minDimension: 900,
        maxOutputSizeKB: 800,
        storageFolder: 'assets',
        variants: [700, 1400],
    },
    businessLogo: {
        id: 'businessLogo',
        label: 'Business logo',
        description: 'Business logo shown on owner, public, PWA, and menu kit surfaces.',
        allowedMimeTypes: MEDIA_ACCEPTED_IMAGE_MIME_TYPES,
        allowedAspectRatios: ['1:1'],
        defaultAspectRatio: '1:1',
        cropRequired: true,
        fit: 'contain',
        maxSourceBytes: 5 * MB,
        minWidth: 128,
        minHeight: 128,
        maxDimension: 512,
        outputFormat: 'image/png',
        paddingRatio: 0.84,
        quality: 0.94,
        minQuality: 0.86,
        minDimension: 512,
        maxOutputSizeKB: 350,
        storageFolder: 'logos',
        variants: [128, 256, 512],
    },
    businessCover: {
        id: 'businessCover',
        label: 'Business cover',
        description: 'Official Business Page cover image.',
        allowedMimeTypes: MEDIA_ACCEPTED_IMAGE_MIME_TYPES,
        allowedAspectRatios: ['16:9'],
        defaultAspectRatio: '16:9',
        cropRequired: true,
        fit: 'cover',
        maxSourceBytes: 10 * MB,
        minWidth: 800,
        minHeight: 450,
        maxDimension: 1600,
        outputFormat: 'image/webp',
        quality: 0.8,
        minQuality: 0.56,
        minDimension: 900,
        maxOutputSizeKB: 800,
        storageFolder: 'business-covers',
        variants: [600, 1200, 1600],
    },
    digitalScreenSlide: {
        id: 'digitalScreenSlide',
        label: 'Screen slide',
        description: 'Owner-uploaded custom slide for Digital Screens Highlights.',
        allowedMimeTypes: MEDIA_ACCEPTED_IMAGE_MIME_TYPES,
        allowedAspectRatios: ['16:9'],
        defaultAspectRatio: '16:9',
        cropRequired: true,
        fit: 'cover',
        maxSourceBytes: 10 * MB,
        minWidth: 960,
        minHeight: 540,
        maxDimension: 1920,
        outputFormat: 'image/webp',
        quality: 0.8,
        minQuality: 0.52,
        minDimension: 1280,
        maxOutputSizeKB: 500,
        storageFolder: 'screen_slides',
        variants: [960, 1280, 1920],
    },
    galleryImage: {
        id: 'galleryImage',
        label: 'Gallery image',
        description: 'Official Business Page gallery image.',
        allowedMimeTypes: MEDIA_ACCEPTED_IMAGE_MIME_TYPES,
        allowedAspectRatios: ['4:3', '1:1'],
        defaultAspectRatio: '4:3',
        cropRequired: true,
        fit: 'cover',
        maxSourceBytes: 8 * MB,
        minWidth: 500,
        minHeight: 375,
        maxDimension: 1400,
        outputFormat: 'image/webp',
        quality: 0.8,
        minQuality: 0.56,
        minDimension: 800,
        maxOutputSizeKB: 700,
        storageFolder: 'gallery',
        variants: [300, 700, 1400],
    },
};

export function getMediaImageProfile(type: MediaImageType): MediaImageProfile {
    return MEDIA_IMAGE_PROFILES[type];
}

export function isMediaImageSystemEnabled(): boolean {
    return FEATURE_FLAGS.ENABLE_MEDIA_IMAGE_SYSTEM;
}

export function getAllowedMediaAspectRatioOptions(type: MediaImageType): MediaAspectRatioOption[] {
    const allowed = new Set(getMediaImageProfile(type).allowedAspectRatios);
    return MEDIA_ASPECT_RATIO_OPTIONS.filter((option) => allowed.has(option.value));
}

export function isAllowedMediaAspectRatio(
    type: MediaImageType,
    aspectRatio: string | null | undefined,
): aspectRatio is MediaAspectRatioValue {
    return Boolean(
        aspectRatio &&
        getMediaImageProfile(type).allowedAspectRatios.includes(aspectRatio as MediaAspectRatioValue),
    );
}

export function getSafeMediaAspectRatio(
    type: MediaImageType,
    aspectRatio?: string | null,
): MediaAspectRatioValue {
    return isAllowedMediaAspectRatio(type, aspectRatio)
        ? aspectRatio
        : getMediaImageProfile(type).defaultAspectRatio;
}

export function parseMediaAspectRatio(aspectRatio: MediaAspectRatioValue): number {
    const [width, height] = aspectRatio.split(':').map(Number);
    return width / height;
}

export function getMediaProfileAcceptAttribute(type: MediaImageType): string {
    return getMediaImageProfile(type).allowedMimeTypes.join(',');
}

export function getDataUrlMimeType(dataUrl: string, fallback = 'image/jpeg'): string {
    return dataUrl.match(/^data:([^;]+);base64,/)?.[1] || fallback;
}

export function getMediaImageProfileSummary(type: MediaImageType): string {
    const profile = getMediaImageProfile(type);
    const maxMB = profile.maxSourceBytes / MB;
    const ratios = profile.allowedAspectRatios.join(', ');
    return `JPG, PNG, or WebP up to ${maxMB % 1 === 0 ? maxMB.toFixed(0) : maxMB.toFixed(1)}MB. Shape: ${ratios}.`;
}
