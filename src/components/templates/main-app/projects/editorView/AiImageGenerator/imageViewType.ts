import { resolveBusinessCategory } from '@data/shared/businessTypes';
import imageViewTypesData from './imageViewTypes.json';
import platformEditingFeaturesData from './platformEditingFeatures.json';

export type ImageViewType = (typeof imageViewTypesData)[number];

export const IMAGE_VIEW_TYPES: readonly ImageViewType[] = imageViewTypesData;

const CATEGORY_IMAGE_VIEW_FALLBACKS: Record<string, string> = {
    creative: 'Photography Studio',
    food: 'Restaurant',
    health: 'Gym',
    professional: 'Real Estate Agent',
    retail: 'Fashion Boutique',
    service: 'Salon',
    specialty: 'Car Dealership',
};

export function getImageViewTypeForBusiness(
    businessType?: string | null,
    businessCategory?: string | null,
): ImageViewType {
    const normalizedBusinessType = businessType?.trim().toLowerCase();
    const exact = normalizedBusinessType
        ? IMAGE_VIEW_TYPES.find((type) => type.businessType?.trim().toLowerCase() === normalizedBusinessType)
        : null;
    if (exact) return exact;

    const resolvedCategory = resolveBusinessCategory(businessType || undefined, businessCategory || undefined);
    const fallbackBusinessType = resolvedCategory ? CATEGORY_IMAGE_VIEW_FALLBACKS[resolvedCategory] : undefined;
    const categoryFallback = fallbackBusinessType
        ? IMAGE_VIEW_TYPES.find((type) => type.businessType === fallbackBusinessType)
        : null;

    return categoryFallback || IMAGE_VIEW_TYPES[0];
}

export type ImageEditingFeatureType = {
    featureName: string;
    description: string;
    prompt: string;
    userPrompt?: 'required' | 'optional' | '';
    promptImage?: 'required' | 'optional' | '';
    icon?: string;
    friendlyName?: string;
    whatItDoes?: string;
    example?: string;
}

export const PLATFORM_EDITING_FEATURES: ImageEditingFeatureType[] = platformEditingFeaturesData as ImageEditingFeatureType[];

export const BUSINESS_FEATURE_MAP: Record<string, string[]> = {
    'Salon': ['Hair Style', 'Skin Treatment'],
    'Spa': ['Skin Treatment'],
    'Tattoo Studio': ['Tattoo Try-On'],
    'Fashion': ['Clothing Try-On', 'Hair Style'],
    'Apparel': ['Clothing Try-On'],
    'Boutique': ['Clothing Try-On'],
};

export const UNIVERSAL_FEATURES = ['Enhance Image', 'Replace Background', 'Remove Background', 'Custom Prompt'];
