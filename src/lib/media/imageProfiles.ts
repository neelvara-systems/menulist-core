import { FEATURE_FLAGS } from '@config/features';

export type MediaAspectRatioValue = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

export type MediaImageType =
    | 'menuItem'
    | 'projectImage'
    | 'menuBackground'
    | 'businessLogo'
    | 'businessCover'
    | 'digitalScreenSlide'
    | 'galleryImage';

export type MediaImageFit = 'cover' | 'contain';
export type MediaImageAnimationPolicy = 'static-only';
export type MediaImageVariantId =
    | 'thumb'
    | 'small'
    | 'medium'
    | 'large'
    | 'card'
    | 'hero'
    | 'mobile'
    | 'desktop'
    | 'full';

export interface MediaAspectRatioOption {
    value: MediaAspectRatioValue;
    width: number;
    height: number;
    title: string;
    useCase: string;
}

export interface MediaImageVariantPolicy {
    id: MediaImageVariantId;
    maxDimension: number;
}

export interface MediaImageProfile {
    allowedAspectRatios: MediaAspectRatioValue[];
    allowedMimeTypes: readonly string[];
    animationPolicy: MediaImageAnimationPolicy;
    backgroundColor: string;
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
    minQuality: number;
    outputFormat: 'image/jpeg' | 'image/png' | 'image/webp';
    paddingRatio?: number;
    preserveTransparency: boolean;
    primaryVariant: MediaImageVariantId;
    quality: number;
    storageFolder: string;
    variants: readonly MediaImageVariantPolicy[];
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
    { value: '9:16', width: 25, height: 40, title: 'Mobile vertical', useCase: 'Best for menu backgrounds' },
];

const MB = 1024 * 1024;
const OWNER_IMAGE_SOURCE_LIMIT = 15 * MB;

export const MEDIA_IMAGE_PROFILES: Record<MediaImageType, MediaImageProfile> = {
    menuItem: {
        id: 'menuItem',
        label: 'Item image',
        description: 'Primary public image for one menu item or service.',
        allowedMimeTypes: MEDIA_ACCEPTED_IMAGE_MIME_TYPES,
        animationPolicy: 'static-only',
        allowedAspectRatios: ['1:1', '4:3'],
        defaultAspectRatio: '1:1',
        backgroundColor: '#ffffff',
        cropRequired: true,
        fit: 'cover',
        maxSourceBytes: OWNER_IMAGE_SOURCE_LIMIT,
        maxDimension: 1200,
        outputFormat: 'image/webp',
        preserveTransparency: false,
        primaryVariant: 'large',
        quality: 0.82,
        minQuality: 0.58,
        minDimension: 720,
        maxOutputSizeKB: 500,
        storageFolder: 'itemImages',
        variants: [
            { id: 'thumb', maxDimension: 120 },
            { id: 'small', maxDimension: 300 },
            { id: 'medium', maxDimension: 600 },
            { id: 'large', maxDimension: 1200 },
        ],
    },
    projectImage: {
        id: 'projectImage',
        label: 'Menu image',
        description: 'Project or menu-card image used in owner and public menu selection surfaces.',
        allowedMimeTypes: MEDIA_ACCEPTED_IMAGE_MIME_TYPES,
        animationPolicy: 'static-only',
        allowedAspectRatios: ['16:9', '1:1'],
        defaultAspectRatio: '16:9',
        backgroundColor: '#ffffff',
        cropRequired: true,
        fit: 'cover',
        maxSourceBytes: OWNER_IMAGE_SOURCE_LIMIT,
        maxDimension: 1600,
        outputFormat: 'image/webp',
        preserveTransparency: false,
        primaryVariant: 'hero',
        quality: 0.8,
        minQuality: 0.58,
        minDimension: 900,
        maxOutputSizeKB: 650,
        storageFolder: 'project-images',
        variants: [
            { id: 'card', maxDimension: 600 },
            { id: 'hero', maxDimension: 1600 },
        ],
    },
    menuBackground: {
        id: 'menuBackground',
        label: 'Menu background',
        description: 'Customer-facing menu background image.',
        allowedMimeTypes: MEDIA_ACCEPTED_IMAGE_MIME_TYPES,
        animationPolicy: 'static-only',
        allowedAspectRatios: ['9:16'],
        defaultAspectRatio: '9:16',
        backgroundColor: '#ffffff',
        cropRequired: true,
        fit: 'cover',
        maxSourceBytes: OWNER_IMAGE_SOURCE_LIMIT,
        maxDimension: 1400,
        outputFormat: 'image/jpeg',
        preserveTransparency: false,
        primaryVariant: 'desktop',
        quality: 0.72,
        minQuality: 0.48,
        minDimension: 900,
        maxOutputSizeKB: 800,
        storageFolder: 'assets',
        variants: [
            { id: 'mobile', maxDimension: 768 },
            { id: 'desktop', maxDimension: 1400 },
        ],
    },
    businessLogo: {
        id: 'businessLogo',
        label: 'Business logo',
        description: 'Business logo shown on owner, public, PWA, and menu kit surfaces.',
        allowedMimeTypes: MEDIA_ACCEPTED_IMAGE_MIME_TYPES,
        animationPolicy: 'static-only',
        allowedAspectRatios: ['1:1'],
        defaultAspectRatio: '1:1',
        backgroundColor: 'transparent',
        cropRequired: true,
        fit: 'contain',
        maxSourceBytes: OWNER_IMAGE_SOURCE_LIMIT,
        maxDimension: 512,
        outputFormat: 'image/png',
        paddingRatio: 0.84,
        preserveTransparency: true,
        primaryVariant: 'full',
        quality: 0.94,
        minQuality: 0.86,
        minDimension: 512,
        maxOutputSizeKB: 350,
        storageFolder: 'logos',
        variants: [
            { id: 'thumb', maxDimension: 64 },
            { id: 'full', maxDimension: 512 },
        ],
    },
    businessCover: {
        id: 'businessCover',
        label: 'Business cover',
        description: 'Official Business Page cover image.',
        allowedMimeTypes: MEDIA_ACCEPTED_IMAGE_MIME_TYPES,
        animationPolicy: 'static-only',
        allowedAspectRatios: ['16:9'],
        defaultAspectRatio: '16:9',
        backgroundColor: '#ffffff',
        cropRequired: true,
        fit: 'cover',
        maxSourceBytes: OWNER_IMAGE_SOURCE_LIMIT,
        maxDimension: 1600,
        outputFormat: 'image/webp',
        preserveTransparency: false,
        primaryVariant: 'hero',
        quality: 0.8,
        minQuality: 0.56,
        minDimension: 900,
        maxOutputSizeKB: 800,
        storageFolder: 'business-covers',
        variants: [
            { id: 'card', maxDimension: 600 },
            { id: 'hero', maxDimension: 1600 },
        ],
    },
    digitalScreenSlide: {
        id: 'digitalScreenSlide',
        label: 'Screen slide',
        description: 'Owner-uploaded custom slide for Digital Screens Highlights.',
        allowedMimeTypes: MEDIA_ACCEPTED_IMAGE_MIME_TYPES,
        animationPolicy: 'static-only',
        allowedAspectRatios: ['16:9'],
        defaultAspectRatio: '16:9',
        backgroundColor: '#ffffff',
        cropRequired: true,
        fit: 'cover',
        maxSourceBytes: OWNER_IMAGE_SOURCE_LIMIT,
        maxDimension: 1920,
        outputFormat: 'image/webp',
        preserveTransparency: false,
        primaryVariant: 'full',
        quality: 0.8,
        minQuality: 0.52,
        minDimension: 1280,
        maxOutputSizeKB: 500,
        storageFolder: 'screen_slides',
        variants: [
            { id: 'desktop', maxDimension: 1280 },
            { id: 'full', maxDimension: 1920 },
        ],
    },
    galleryImage: {
        id: 'galleryImage',
        label: 'Gallery image',
        description: 'Official Business Page gallery image.',
        allowedMimeTypes: MEDIA_ACCEPTED_IMAGE_MIME_TYPES,
        animationPolicy: 'static-only',
        allowedAspectRatios: ['4:3', '1:1'],
        defaultAspectRatio: '4:3',
        backgroundColor: '#ffffff',
        cropRequired: true,
        fit: 'cover',
        maxSourceBytes: OWNER_IMAGE_SOURCE_LIMIT,
        maxDimension: 1400,
        outputFormat: 'image/webp',
        preserveTransparency: false,
        primaryVariant: 'full',
        quality: 0.8,
        minQuality: 0.56,
        minDimension: 800,
        maxOutputSizeKB: 700,
        storageFolder: 'gallery',
        variants: [
            { id: 'thumb', maxDimension: 300 },
            { id: 'full', maxDimension: 1400 },
        ],
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

export function getMediaAspectRatioCss(aspectRatio: MediaAspectRatioValue): string {
    const [width, height] = aspectRatio.split(':').map(Number);
    return `${width} / ${height}`;
}

export function getMediaImageFrameAspectRatioCss(type: MediaImageType): string {
    return getMediaAspectRatioCss(getMediaImageProfile(type).defaultAspectRatio);
}

export function getMediaImageCardFrameMaxWidth(type: MediaImageType, size: 'compact' | 'default' = 'default'): number | undefined {
    const profile = getMediaImageProfile(type);
    const ratio = parseMediaAspectRatio(profile.defaultAspectRatio);

    if (ratio < 1) {
        return size === 'compact' ? 180 : 220;
    }

    return undefined;
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
