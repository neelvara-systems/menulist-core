import imageViewTypesData from './imageViewTypes.json';
import platformEditingFeaturesData from './platformEditingFeatures.json';

export const IMAGE_VIEW_TYPES: any[] = imageViewTypesData as any[];

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
