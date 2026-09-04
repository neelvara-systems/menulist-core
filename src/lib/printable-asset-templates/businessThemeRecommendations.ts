import {
    getBusinessCategoryConfig,
    getBusinessTypeConfig,
    resolveStoreBusinessCategory,
} from '@data/shared/businessTypes';
import {
    DEFAULT_PRINTABLE_TEMPLATE_FAMILY_ID,
    getPrintableThemeFamilies,
    isPrintableTemplateFamilyVisibleForBusiness,
} from './templateFamilies';
import type { PrintableTemplateFamily, PrintableTemplateFamilyId } from './types';

export type PrintableBusinessThemeRecommendation = {
    audienceLabel: string;
    matchedBy: 'business-category' | 'business-type' | 'fallback';
    primaryThemeId: PrintableTemplateFamilyId;
    recommendedThemeIds: readonly PrintableTemplateFamilyId[];
};

const SALON_THEME_IDS = [
    'salon-atelier',
    'petal-studio',
    'pearl-veil',
    'terracotta-glow',
    'glasshouse-beauty',
] as const satisfies readonly PrintableTemplateFamilyId[];

const MAKEUP_STUDIO_THEME_IDS = [
    'petal-studio',
    'pearl-veil',
    'terracotta-glow',
    'glasshouse-beauty',
    'salon-atelier',
] as const satisfies readonly PrintableTemplateFamilyId[];

const SPA_THEME_IDS = [
    'ritual-sanctuary',
    'eucalyptus-retreat',
    'mineral-spring',
    'lotus-stillness',
    'sunlit-ritual',
] as const satisfies readonly PrintableTemplateFamilyId[];

const PERFORMANCE_THEME_IDS = [
    'performance-circuit',
    'vital-current',
    'gallery-ledger',
    'midnight-gold',
] as const satisfies readonly PrintableTemplateFamilyId[];

const FOOD_THEME_IDS = [
    'craft-kitchen',
    'ember-house',
    'coastal-table',
    'sunday-table',
    'counter-rush',
    'ink-vine',
    'indian-atelier',
    'bombay-chronicle',
    'japanese-night-luxe',
    'tea-salon-heritage',
    'lankan-block-print',
] as const satisfies readonly PrintableTemplateFamilyId[];

const ROASTERY_THEME_IDS = [
    'roastery-ledger',
    'craft-kitchen',
    'ink-vine',
    'gallery-ledger',
] as const satisfies readonly PrintableTemplateFamilyId[];

const PATISSERIE_THEME_IDS = [
    'patisserie-conservatory',
    'tea-salon-heritage',
    'art-deco-garden',
    'craft-kitchen',
] as const satisfies readonly PrintableTemplateFamilyId[];

const GELATERIA_THEME_IDS = [
    'gelateria-riviera',
    'tea-salon-heritage',
    'art-deco-garden',
    'sunset-atelier',
] as const satisfies readonly PrintableTemplateFamilyId[];

const RETAIL_THEME_IDS = [
    'gallery-ledger',
    'boutique-window',
    'market-label',
    'art-deco-garden',
    'botanical-heritage',
] as const satisfies readonly PrintableTemplateFamilyId[];

const PROFESSIONAL_THEME_IDS = [
    'civic-letterpress',
    'modern-practice',
    'gallery-ledger',
    'indian-atelier',
    'botanical-heritage',
] as const satisfies readonly PrintableTemplateFamilyId[];

const CREATIVE_THEME_IDS = [
    'studio-contact-sheet',
    'maker-ledger',
    'gallery-ledger',
    'sunset-atelier',
] as const satisfies readonly PrintableTemplateFamilyId[];

const HEALTH_THEME_IDS = [
    'vital-current',
    'clinical-calm',
    'mindful-motion',
    'mineral-sanctuary',
    'botanical-heritage',
] as const satisfies readonly PrintableTemplateFamilyId[];

const SERVICE_THEME_IDS = [
    'neighbourhood-standard',
    'field-notes',
    'workshop-atlas',
    'botanical-heritage',
] as const satisfies readonly PrintableTemplateFamilyId[];

const SPECIALTY_THEME_IDS = [
    'workshop-atlas',
    'hospitality-house',
    'future-workshop',
    'botanical-heritage',
] as const satisfies readonly PrintableTemplateFamilyId[];

const GALLERY_LEDGER_EXACT_THEME_IDS = [
    'gallery-ledger',
    'art-deco-garden',
    'indian-atelier',
    'botanical-heritage',
] as const satisfies readonly PrintableTemplateFamilyId[];

const WORKSHOP_ATLAS_EXACT_THEME_IDS = [
    'workshop-atlas',
    'gallery-ledger',
    'botanical-heritage',
    'vital-current',
] as const satisfies readonly PrintableTemplateFamilyId[];

const VITAL_CURRENT_EXACT_THEME_IDS = [
    'clinical-calm',
    'vital-current',
    'mineral-sanctuary',
    'botanical-heritage',
    'gallery-ledger',
] as const satisfies readonly PrintableTemplateFamilyId[];

const NEIGHBOURHOOD_EXACT_THEME_IDS = [
    'neighbourhood-standard',
    'field-notes',
    'workshop-atlas',
    'botanical-heritage',
] as const satisfies readonly PrintableTemplateFamilyId[];

const FIELD_EXACT_THEME_IDS = [
    'field-notes',
    'neighbourhood-standard',
    'workshop-atlas',
    'vital-current',
] as const satisfies readonly PrintableTemplateFamilyId[];

const BOUTIQUE_EXACT_THEME_IDS = [
    'boutique-window',
    'gallery-ledger',
    'market-label',
    'art-deco-garden',
] as const satisfies readonly PrintableTemplateFamilyId[];

const MARKET_EXACT_THEME_IDS = [
    'market-label',
    'gallery-ledger',
    'boutique-window',
    'botanical-heritage',
] as const satisfies readonly PrintableTemplateFamilyId[];

const CIVIC_EXACT_THEME_IDS = [
    'civic-letterpress',
    'modern-practice',
    'gallery-ledger',
    'indian-atelier',
] as const satisfies readonly PrintableTemplateFamilyId[];

const MODERN_PRACTICE_EXACT_THEME_IDS = [
    'modern-practice',
    'civic-letterpress',
    'gallery-ledger',
    'art-deco-garden',
] as const satisfies readonly PrintableTemplateFamilyId[];

const STUDIO_EXACT_THEME_IDS = [
    'studio-contact-sheet',
    'gallery-ledger',
    'maker-ledger',
    'sunset-atelier',
] as const satisfies readonly PrintableTemplateFamilyId[];

const MAKER_EXACT_THEME_IDS = [
    'maker-ledger',
    'workshop-atlas',
    'gallery-ledger',
    'market-label',
] as const satisfies readonly PrintableTemplateFamilyId[];

const MINDFUL_EXACT_THEME_IDS = [
    'mindful-motion',
    'vital-current',
    'mineral-sanctuary',
    'botanical-heritage',
] as const satisfies readonly PrintableTemplateFamilyId[];

const HOSPITALITY_EXACT_THEME_IDS = [
    'hospitality-house',
    'gallery-ledger',
    'art-deco-garden',
    'botanical-heritage',
] as const satisfies readonly PrintableTemplateFamilyId[];

const FUTURE_EXACT_THEME_IDS = [
    'future-workshop',
    'workshop-atlas',
    'vital-current',
    'gallery-ledger',
] as const satisfies readonly PrintableTemplateFamilyId[];

const BUSINESS_TYPE_THEME_RECOMMENDATIONS: Readonly<Record<string, Omit<PrintableBusinessThemeRecommendation, 'matchedBy'>>> = {
    Cafe: {
        audienceLabel: 'Recommended for cafes',
        primaryThemeId: 'roastery-ledger',
        recommendedThemeIds: ROASTERY_THEME_IDS,
    },
    'Coffee Shop': {
        audienceLabel: 'Recommended for coffee shops',
        primaryThemeId: 'roastery-ledger',
        recommendedThemeIds: ROASTERY_THEME_IDS,
    },
    'Specialty Coffee Shop': {
        audienceLabel: 'Recommended for specialty coffee shops',
        primaryThemeId: 'roastery-ledger',
        recommendedThemeIds: ROASTERY_THEME_IDS,
    },
    'Cake Shop': {
        audienceLabel: 'Recommended for cake shops',
        primaryThemeId: 'patisserie-conservatory',
        recommendedThemeIds: PATISSERIE_THEME_IDS,
    },
    Bakery: {
        audienceLabel: 'Recommended for bakeries',
        primaryThemeId: 'patisserie-conservatory',
        recommendedThemeIds: PATISSERIE_THEME_IDS,
    },
    'Ice Cream Shop': {
        audienceLabel: 'Recommended for ice cream shops',
        primaryThemeId: 'gelateria-riviera',
        recommendedThemeIds: GELATERIA_THEME_IDS,
    },
    'Makeup Studio': {
        audienceLabel: 'Recommended for makeup studios',
        primaryThemeId: 'petal-studio',
        recommendedThemeIds: MAKEUP_STUDIO_THEME_IDS,
    },
    Salon: {
        audienceLabel: 'Recommended for salons',
        primaryThemeId: 'salon-atelier',
        recommendedThemeIds: SALON_THEME_IDS,
    },
    Spa: {
        audienceLabel: 'Recommended for spas',
        primaryThemeId: 'ritual-sanctuary',
        recommendedThemeIds: SPA_THEME_IDS,
    },
    'Spa Resort': {
        audienceLabel: 'Recommended for spa resorts',
        primaryThemeId: 'ritual-sanctuary',
        recommendedThemeIds: SPA_THEME_IDS,
    },
    Gym: {
        audienceLabel: 'Recommended for gyms',
        primaryThemeId: 'performance-circuit',
        recommendedThemeIds: PERFORMANCE_THEME_IDS,
    },
    'Fitness Center': {
        audienceLabel: 'Recommended for fitness centres',
        primaryThemeId: 'performance-circuit',
        recommendedThemeIds: PERFORMANCE_THEME_IDS,
    },
    'Fitness Bootcamp': {
        audienceLabel: 'Recommended for fitness bootcamps',
        primaryThemeId: 'performance-circuit',
        recommendedThemeIds: PERFORMANCE_THEME_IDS,
    },
    'Personal Trainer': {
        audienceLabel: 'Recommended for personal trainers',
        primaryThemeId: 'performance-circuit',
        recommendedThemeIds: PERFORMANCE_THEME_IDS,
    },
    'Pet Grooming Service': {
        audienceLabel: 'Recommended for pet grooming services',
        primaryThemeId: 'neighbourhood-standard',
        recommendedThemeIds: NEIGHBOURHOOD_EXACT_THEME_IDS,
    },
    'Pet Grooming Salon': {
        audienceLabel: 'Recommended for pet grooming salons',
        primaryThemeId: 'neighbourhood-standard',
        recommendedThemeIds: NEIGHBOURHOOD_EXACT_THEME_IDS,
    },
    'Pet Grooming Studio': {
        audienceLabel: 'Recommended for pet grooming studios',
        primaryThemeId: 'neighbourhood-standard',
        recommendedThemeIds: NEIGHBOURHOOD_EXACT_THEME_IDS,
    },
    'Cleaning Services Company': {
        audienceLabel: 'Recommended for cleaning services',
        primaryThemeId: 'field-notes',
        recommendedThemeIds: FIELD_EXACT_THEME_IDS,
    },
    'Landscaping Service': {
        audienceLabel: 'Recommended for landscaping services',
        primaryThemeId: 'field-notes',
        recommendedThemeIds: FIELD_EXACT_THEME_IDS,
    },
    'Landscaping Company': {
        audienceLabel: 'Recommended for landscaping companies',
        primaryThemeId: 'field-notes',
        recommendedThemeIds: FIELD_EXACT_THEME_IDS,
    },
    'Fashion Boutique': {
        audienceLabel: 'Recommended for fashion boutiques',
        primaryThemeId: 'boutique-window',
        recommendedThemeIds: BOUTIQUE_EXACT_THEME_IDS,
    },
    'Jewelry Store': {
        audienceLabel: 'Recommended for jewellery stores',
        primaryThemeId: 'boutique-window',
        recommendedThemeIds: BOUTIQUE_EXACT_THEME_IDS,
    },
    'Luxury Watch Dealer': {
        audienceLabel: 'Recommended for luxury watch dealers',
        primaryThemeId: 'boutique-window',
        recommendedThemeIds: BOUTIQUE_EXACT_THEME_IDS,
    },
    'Shoe Store': {
        audienceLabel: 'Recommended for shoe stores',
        primaryThemeId: 'boutique-window',
        recommendedThemeIds: BOUTIQUE_EXACT_THEME_IDS,
    },
    Bookstore: {
        audienceLabel: 'Recommended for bookstores',
        primaryThemeId: 'market-label',
        recommendedThemeIds: MARKET_EXACT_THEME_IDS,
    },
    'Craft Supply Store': {
        audienceLabel: 'Recommended for craft supply stores',
        primaryThemeId: 'market-label',
        recommendedThemeIds: MARKET_EXACT_THEME_IDS,
    },
    'Florist Shop': {
        audienceLabel: 'Recommended for florist shops',
        primaryThemeId: 'market-label',
        recommendedThemeIds: MARKET_EXACT_THEME_IDS,
    },
    'Handmade Crafts': {
        audienceLabel: 'Recommended for handmade craft businesses',
        primaryThemeId: 'market-label',
        recommendedThemeIds: MARKET_EXACT_THEME_IDS,
    },
    'Law Firm': {
        audienceLabel: 'Recommended for law firms',
        primaryThemeId: 'civic-letterpress',
        recommendedThemeIds: CIVIC_EXACT_THEME_IDS,
    },
    'Financial Advisor': {
        audienceLabel: 'Recommended for financial advisors',
        primaryThemeId: 'civic-letterpress',
        recommendedThemeIds: CIVIC_EXACT_THEME_IDS,
    },
    'Real Estate Agent': {
        audienceLabel: 'Recommended for real estate agents',
        primaryThemeId: 'civic-letterpress',
        recommendedThemeIds: CIVIC_EXACT_THEME_IDS,
    },
    'Real Estate Agency': {
        audienceLabel: 'Recommended for real estate agencies',
        primaryThemeId: 'civic-letterpress',
        recommendedThemeIds: CIVIC_EXACT_THEME_IDS,
    },
    'Wedding Planner': {
        audienceLabel: 'Recommended for wedding planners',
        primaryThemeId: 'modern-practice',
        recommendedThemeIds: MODERN_PRACTICE_EXACT_THEME_IDS,
    },
    'Event Planning Company': {
        audienceLabel: 'Recommended for event planning companies',
        primaryThemeId: 'modern-practice',
        recommendedThemeIds: MODERN_PRACTICE_EXACT_THEME_IDS,
    },
    'Life Coach': {
        audienceLabel: 'Recommended for life coaches',
        primaryThemeId: 'modern-practice',
        recommendedThemeIds: MODERN_PRACTICE_EXACT_THEME_IDS,
    },
    'Travel Agency': {
        audienceLabel: 'Recommended for travel agencies',
        primaryThemeId: 'modern-practice',
        recommendedThemeIds: MODERN_PRACTICE_EXACT_THEME_IDS,
    },
    'Photography Studio': {
        audienceLabel: 'Recommended for photography studios',
        primaryThemeId: 'studio-contact-sheet',
        recommendedThemeIds: STUDIO_EXACT_THEME_IDS,
    },
    'Photography Tour Operator': {
        audienceLabel: 'Recommended for photography tour operators',
        primaryThemeId: 'studio-contact-sheet',
        recommendedThemeIds: STUDIO_EXACT_THEME_IDS,
    },
    'Tattoo Studio': {
        audienceLabel: 'Recommended for tattoo studios',
        primaryThemeId: 'studio-contact-sheet',
        recommendedThemeIds: STUDIO_EXACT_THEME_IDS,
    },
    'Music School': {
        audienceLabel: 'Recommended for music schools',
        primaryThemeId: 'studio-contact-sheet',
        recommendedThemeIds: STUDIO_EXACT_THEME_IDS,
    },
    'Handmade Jewelry Brand': {
        audienceLabel: 'Recommended for handmade jewellery brands',
        primaryThemeId: 'maker-ledger',
        recommendedThemeIds: MAKER_EXACT_THEME_IDS,
    },
    Florist: {
        audienceLabel: 'Recommended for florists',
        primaryThemeId: 'maker-ledger',
        recommendedThemeIds: MAKER_EXACT_THEME_IDS,
    },
    'Event Decorator': {
        audienceLabel: 'Recommended for event decorators',
        primaryThemeId: 'maker-ledger',
        recommendedThemeIds: MAKER_EXACT_THEME_IDS,
    },
    'Tailoring Shop': {
        audienceLabel: 'Recommended for tailoring shops',
        primaryThemeId: 'maker-ledger',
        recommendedThemeIds: MAKER_EXACT_THEME_IDS,
    },
    'Yoga Studio': {
        audienceLabel: 'Recommended for yoga studios',
        primaryThemeId: 'mindful-motion',
        recommendedThemeIds: MINDFUL_EXACT_THEME_IDS,
    },
    'Martial Arts Academy': {
        audienceLabel: 'Recommended for martial arts academies',
        primaryThemeId: 'mindful-motion',
        recommendedThemeIds: MINDFUL_EXACT_THEME_IDS,
    },
    'Boutique Hotel': {
        audienceLabel: 'Recommended for boutique hotels',
        primaryThemeId: 'hospitality-house',
        recommendedThemeIds: HOSPITALITY_EXACT_THEME_IDS,
    },
    "Children's Daycare": {
        audienceLabel: 'Recommended for daycare businesses',
        primaryThemeId: 'hospitality-house',
        recommendedThemeIds: HOSPITALITY_EXACT_THEME_IDS,
    },
    'Daycare Center': {
        audienceLabel: 'Recommended for daycare centres',
        primaryThemeId: 'hospitality-house',
        recommendedThemeIds: HOSPITALITY_EXACT_THEME_IDS,
    },
    '3D Printing Studio': {
        audienceLabel: 'Recommended for 3D printing studios',
        primaryThemeId: 'future-workshop',
        recommendedThemeIds: FUTURE_EXACT_THEME_IDS,
    },
    'Drone Services Company': {
        audienceLabel: 'Recommended for drone service companies',
        primaryThemeId: 'future-workshop',
        recommendedThemeIds: FUTURE_EXACT_THEME_IDS,
    },
    'Car Dealership': {
        audienceLabel: 'Recommended for car dealerships',
        primaryThemeId: 'future-workshop',
        recommendedThemeIds: FUTURE_EXACT_THEME_IDS,
    },
    'Bike Rental Shop': {
        audienceLabel: 'Recommended for bike rental shops',
        primaryThemeId: 'future-workshop',
        recommendedThemeIds: FUTURE_EXACT_THEME_IDS,
    },
    'Interior Designer': {
        audienceLabel: 'Recommended for interior designers',
        primaryThemeId: 'gallery-ledger',
        recommendedThemeIds: GALLERY_LEDGER_EXACT_THEME_IDS,
    },
    'Art Gallery': {
        audienceLabel: 'Recommended for art galleries',
        primaryThemeId: 'studio-contact-sheet',
        recommendedThemeIds: STUDIO_EXACT_THEME_IDS,
    },
    'Coworking Space': {
        audienceLabel: 'Recommended for coworking spaces',
        primaryThemeId: 'hospitality-house',
        recommendedThemeIds: HOSPITALITY_EXACT_THEME_IDS,
    },
    'Home Renovation Contractor': {
        audienceLabel: 'Recommended for renovation contractors',
        primaryThemeId: 'workshop-atlas',
        recommendedThemeIds: WORKSHOP_ATLAS_EXACT_THEME_IDS,
    },
    'Furniture Maker': {
        audienceLabel: 'Recommended for furniture makers',
        primaryThemeId: 'maker-ledger',
        recommendedThemeIds: MAKER_EXACT_THEME_IDS,
    },
    'Furniture Store': {
        audienceLabel: 'Recommended for furniture stores',
        primaryThemeId: 'boutique-window',
        recommendedThemeIds: BOUTIQUE_EXACT_THEME_IDS,
    },
    'Auto Repair Shop': {
        audienceLabel: 'Recommended for auto repair shops',
        primaryThemeId: 'future-workshop',
        recommendedThemeIds: FUTURE_EXACT_THEME_IDS,
    },
    'Car Wash & Detailing Service': {
        audienceLabel: 'Recommended for detailing services',
        primaryThemeId: 'field-notes',
        recommendedThemeIds: FIELD_EXACT_THEME_IDS,
    },
    'Dental Clinic': {
        audienceLabel: 'Recommended for dental clinics',
        primaryThemeId: 'clinical-calm',
        recommendedThemeIds: VITAL_CURRENT_EXACT_THEME_IDS,
    },
    'Veterinary Clinic': {
        audienceLabel: 'Recommended for veterinary clinics',
        primaryThemeId: 'clinical-calm',
        recommendedThemeIds: VITAL_CURRENT_EXACT_THEME_IDS,
    },
};

const BUSINESS_CATEGORY_THEME_RECOMMENDATIONS: Readonly<Record<string, Omit<PrintableBusinessThemeRecommendation, 'matchedBy'>>> = {
    service: {
        audienceLabel: 'Recommended for service businesses',
        primaryThemeId: 'neighbourhood-standard',
        recommendedThemeIds: SERVICE_THEME_IDS,
    },
    retail: {
        audienceLabel: 'Recommended for retail businesses',
        primaryThemeId: 'gallery-ledger',
        recommendedThemeIds: RETAIL_THEME_IDS,
    },
    food: {
        audienceLabel: 'Recommended for food and beverage businesses',
        primaryThemeId: 'craft-kitchen',
        recommendedThemeIds: FOOD_THEME_IDS,
    },
    professional: {
        audienceLabel: 'Recommended for professional services',
        primaryThemeId: 'civic-letterpress',
        recommendedThemeIds: PROFESSIONAL_THEME_IDS,
    },
    creative: {
        audienceLabel: 'Recommended for creative businesses',
        primaryThemeId: 'studio-contact-sheet',
        recommendedThemeIds: CREATIVE_THEME_IDS,
    },
    health: {
        audienceLabel: 'Recommended for health and wellness businesses',
        primaryThemeId: 'vital-current',
        recommendedThemeIds: HEALTH_THEME_IDS,
    },
    specialty: {
        audienceLabel: 'Recommended for specialty businesses',
        primaryThemeId: 'workshop-atlas',
        recommendedThemeIds: SPECIALTY_THEME_IDS,
    },
};

const FALLBACK_RECOMMENDATION: PrintableBusinessThemeRecommendation = {
    audienceLabel: 'Recommended for your business',
    matchedBy: 'fallback',
    primaryThemeId: DEFAULT_PRINTABLE_TEMPLATE_FAMILY_ID,
    recommendedThemeIds: [DEFAULT_PRINTABLE_TEMPLATE_FAMILY_ID],
};

/**
 * Resolves exact business-type recommendations first, then category-level
 * recommendations through the shared business registry. Unknown businesses
 * keep the conservative common default instead of being guessed into a vertical.
 */
export function resolvePrintableBusinessThemeRecommendation(params: {
    businessCategory?: string | null;
    businessType?: string | null;
}): PrintableBusinessThemeRecommendation {
    const businessType = getBusinessTypeConfig(params.businessType || undefined);
    const typeRecommendation = businessType
        ? BUSINESS_TYPE_THEME_RECOMMENDATIONS[businessType.value]
        : undefined;
    if (typeRecommendation) return { ...typeRecommendation, matchedBy: 'business-type' };

    const explicitBusinessCategory = getBusinessCategoryConfig(params.businessCategory || undefined);
    if (!businessType && !explicitBusinessCategory) {
        return FALLBACK_RECOMMENDATION;
    }

    const businessCategory = resolveStoreBusinessCategory(
        params.businessType || undefined,
        params.businessCategory || undefined,
    );
    const categoryRecommendation = BUSINESS_CATEGORY_THEME_RECOMMENDATIONS[businessCategory];
    return categoryRecommendation
        ? { ...categoryRecommendation, matchedBy: 'business-category' }
        : FALLBACK_RECOMMENDATION;
}

export function getPrintableThemeFamiliesForBusiness(params: {
    businessCategory?: string | null;
    businessType?: string | null;
}): PrintableTemplateFamily[] {
    const recommendation = resolvePrintableBusinessThemeRecommendation(params);
    const order = new Map(
        recommendation.recommendedThemeIds.map((themeId, index) => [themeId, index]),
    );
    return getPrintableThemeFamilies().filter((family) => (
        isPrintableTemplateFamilyVisibleForBusiness({
            ...params,
            templateFamilyId: family.id,
        })
    )).sort((left, right) => {
        const leftOrder = order.get(left.id) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = order.get(right.id) ?? Number.MAX_SAFE_INTEGER;
        return leftOrder - rightOrder;
    });
}

export function isRecommendedPrintableTheme(params: {
    businessCategory?: string | null;
    businessType?: string | null;
    templateFamilyId: PrintableTemplateFamilyId;
}): boolean {
    return resolvePrintableBusinessThemeRecommendation(params)
        .recommendedThemeIds.includes(params.templateFamilyId);
}
