import { resolveBusinessCategory } from '@data/shared/businessTypes';
import imageViewTypesData from './imageViewTypes.json';
import platformEditingFeaturesData from './platformEditingFeatures.json';

export type ImageViewType = (typeof imageViewTypesData)[number];

export const IMAGE_VIEW_TYPES: readonly ImageViewType[] = imageViewTypesData;

const CATEGORY_IMAGE_VIEW_FALLBACKS: Record<string, string> = {
    creative: 'Photography Studio',
    food: 'Restaurant',
    health: 'Fitness Center / Gym',
    professional: 'Real Estate Agent / Agency',
    retail: 'Fashion Boutique',
    service: 'Salon',
    specialty: 'Car Dealership',
};

const BUSINESS_TYPE_IMAGE_VIEW_ALIASES: Record<string, string> = {
    bakery: 'Bakery / Cake Shop',
    'cake shop': 'Bakery / Cake Shop',
    "children's daycare": "Daycare / Children's Center",
    'daycare center': "Daycare / Children's Center",
    'etsy shop': 'Handmade Crafts / Etsy Shop',
    'event decorator': 'Florist & Event Decorator',
    'fitness center': 'Fitness Center / Gym',
    florist: 'Florist & Event Decorator',
    'florist shop': 'Florist & Event Decorator',
    gym: 'Fitness Center / Gym',
    'handmade crafts': 'Handmade Crafts / Etsy Shop',
    'landscaping company': 'Landscaping Service / Company',
    'landscaping service': 'Landscaping Service / Company',
    'life coach': 'Life Coach / Personal Development Coach',
    'personal development': 'Life Coach / Personal Development Coach',
    'pet grooming salon': 'Pet Grooming Service / Salon',
    'pet grooming service': 'Pet Grooming Service / Salon',
    'pet grooming studio': 'Pet Grooming Service / Salon',
    'real estate agency': 'Real Estate Agent / Agency',
    'real estate agent': 'Real Estate Agent / Agency',
    'specialty coffee shop': 'Coffee Shop / Specialty Cafe',
};

const SAVED_PERSON_RECOMMENDED_BUSINESS_TYPES = new Set([
    'fashion boutique',
    'fitness bootcamp',
    'fitness center',
    'gym',
    'barbershop',
    'makeup studio',
    'martial arts academy',
    'nail salon',
    'personal trainer',
    'photography studio',
    'salon',
    'spa',
    'spa resort',
    'tailoring shop',
    'tattoo studio',
    'yoga studio',
]);

export function getImageViewTypeForBusiness(
    businessType?: string | null,
    businessCategory?: string | null,
): ImageViewType {
    const normalizedBusinessType = businessType?.trim().toLowerCase();
    const exact = normalizedBusinessType
        ? IMAGE_VIEW_TYPES.find((type) => type.businessType?.trim().toLowerCase() === normalizedBusinessType)
        : null;
    if (exact) return exact;

    const aliasBusinessType = normalizedBusinessType
        ? BUSINESS_TYPE_IMAGE_VIEW_ALIASES[normalizedBusinessType]
        : undefined;
    const aliasMatch = aliasBusinessType
        ? IMAGE_VIEW_TYPES.find((type) => type.businessType === aliasBusinessType)
        : null;
    if (aliasMatch) return aliasMatch;

    const resolvedCategory = resolveBusinessCategory(businessType || undefined, businessCategory || undefined);
    const fallbackBusinessType = resolvedCategory ? CATEGORY_IMAGE_VIEW_FALLBACKS[resolvedCategory] : undefined;
    const categoryFallback = fallbackBusinessType
        ? IMAGE_VIEW_TYPES.find((type) => type.businessType === fallbackBusinessType)
        : null;

    return categoryFallback || IMAGE_VIEW_TYPES[0];
}

export function isSavedPersonRecommendedForBusiness(businessType?: string | null): boolean {
    return SAVED_PERSON_RECOMMENDED_BUSINESS_TYPES.has(String(businessType || '').trim().toLowerCase());
}

export function getSavedPersonPromptInstruction(businessType: string | null | undefined, itemName: string): string {
    const normalizedBusinessType = String(businessType || '').trim().toLowerCase();
    const normalizedItemName = itemName.toLowerCase();

    if (
        normalizedBusinessType === 'salon'
        || normalizedBusinessType === 'makeup studio'
        || normalizedBusinessType === 'nail salon'
        || normalizedBusinessType === 'barbershop'
    ) {
        return `Show ${normalizedItemName} as the requested hairstyle, makeup, or beauty treatment on that same person without changing their identity. `;
    }
    if (normalizedBusinessType === 'tattoo studio') {
        return `Show ${normalizedItemName} as the requested tattoo design or placement on that same person without changing their identity, skin tone, or unrequested body features. `;
    }
    if (normalizedBusinessType === 'fashion boutique' || normalizedBusinessType === 'tailoring shop') {
        return `Show that same person wearing or presenting ${normalizedItemName} while preserving their identity and natural body proportions. `;
    }
    if (
        normalizedBusinessType === 'gym'
        || normalizedBusinessType === 'fitness center'
        || normalizedBusinessType === 'fitness bootcamp'
        || normalizedBusinessType === 'personal trainer'
        || normalizedBusinessType === 'yoga studio'
        || normalizedBusinessType === 'martial arts academy'
    ) {
        return `Show that same person naturally demonstrating ${normalizedItemName}; preserve their identity and existing physique, and change only the requested pose, activity, clothing, or setting. `;
    }
    if (normalizedBusinessType === 'spa' || normalizedBusinessType === 'spa resort') {
        return `Show that same person naturally receiving or representing ${normalizedItemName} in a professional wellness setting while preserving their identity. `;
    }
    if (normalizedBusinessType === 'photography studio') {
        return `Show that same person in a photography-session interpretation of ${normalizedItemName}, changing only the requested pose, wardrobe, lighting, composition, or setting. `;
    }

    return `Include that same person naturally in the presentation of ${normalizedItemName}; preserve their identity and change only the requested pose, clothing, activity, treatment, or setting. `;
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
