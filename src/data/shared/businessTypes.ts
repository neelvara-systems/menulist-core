/**
 * Business Types & Categories — Shared Data (Self-Contained)
 * ═══════════════════════════════════════════════════════════════
 *
 * PRIMARY SOURCE — This file is the single source of truth.
 * It MUST be self-contained (no imports from other project files).
 *
 * COPY RULE: This exact file is copied as-is to:
 *   functions/src/sharedData/businessTypes.ts
 *
 * When updating this file, copy-paste the ENTIRE file to the backend.
 * Do NOT cherry-pick or modify — always full file replacement.
 *
 * @see functions/src/sharedData/README.md
 */

// ═══════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface BusinessCategory {
    label: string;
    value: string;
    schemaOrgType: string;
    catalogKind: BusinessCatalogKind;
    offeringKind: BusinessOfferingKind;
}

export interface BusinessType {
    label: string;
    value: string;
    category: string;
    schemaOrgType?: string;
    offeringKind?: BusinessOfferingKind;
}

export type BusinessCatalogKind = 'menu' | 'offerCatalog';

export type BusinessOfferingKind = 'menuItem' | 'product' | 'service';

// ═══════════════════════════════════════════════════════════════
// BUSINESS CATEGORIES
// ═══════════════════════════════════════════════════════════════

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
    { label: "Service Businesses", value: "service", schemaOrgType: "ProfessionalService", catalogKind: "offerCatalog", offeringKind: "service" },
    { label: "Retail Businesses", value: "retail", schemaOrgType: "Store", catalogKind: "offerCatalog", offeringKind: "product" },
    { label: "Food & Beverage", value: "food", schemaOrgType: "Restaurant", catalogKind: "menu", offeringKind: "menuItem" },
    { label: "Professional Services", value: "professional", schemaOrgType: "ProfessionalService", catalogKind: "offerCatalog", offeringKind: "service" },
    { label: "Creative Businesses", value: "creative", schemaOrgType: "ProfessionalService", catalogKind: "offerCatalog", offeringKind: "service" },
    { label: "Health & Wellness", value: "health", schemaOrgType: "HealthAndBeautyBusiness", catalogKind: "offerCatalog", offeringKind: "service" },
    { label: "Specialty Businesses", value: "specialty", schemaOrgType: "LocalBusiness", catalogKind: "offerCatalog", offeringKind: "service" },
];

// ═══════════════════════════════════════════════════════════════
// BUSINESS TYPES (Full list — all categories)
// ═══════════════════════════════════════════════════════════════

export const BUSINESS_TYPES: BusinessType[] = [
    // Food & Beverage
    { label: "Restaurant", value: "Restaurant", category: "food" },
    { label: "Cafe", value: "Cafe", category: "food", schemaOrgType: "CafeOrCoffeeShop" },
    { label: "Cake Shop", value: "Cake Shop", category: "food", schemaOrgType: "Bakery" },
    { label: "Bakery", value: "Bakery", category: "food", schemaOrgType: "Bakery" },
    { label: "Coffee Shop", value: "Coffee Shop", category: "food", schemaOrgType: "CafeOrCoffeeShop" },
    { label: "Specialty Coffee Shop", value: "Specialty Coffee Shop", category: "food", schemaOrgType: "CafeOrCoffeeShop" },
    { label: "Ice Cream Shop", value: "Ice Cream Shop", category: "food", schemaOrgType: "IceCreamShop" },

    // Service Businesses
    { label: "Spa", value: "Spa", category: "service", schemaOrgType: "DaySpa" },
    { label: "Salon", value: "Salon", category: "service", schemaOrgType: "BeautySalon" },
    { label: "Pet Grooming Service", value: "Pet Grooming Service", category: "service" },
    { label: "Pet Grooming Salon", value: "Pet Grooming Salon", category: "service" },
    { label: "Pet Grooming Studio", value: "Pet Grooming Studio", category: "service" },
    { label: "Cleaning Services Company", value: "Cleaning Services Company", category: "service", schemaOrgType: "HomeAndConstructionBusiness" },
    { label: "Car Wash & Detailing Service", value: "Car Wash & Detailing Service", category: "service", schemaOrgType: "AutoWash" },
    { label: "Landscaping Service", value: "Landscaping Service", category: "service", schemaOrgType: "HomeAndConstructionBusiness" },
    { label: "Landscaping Company", value: "Landscaping Company", category: "service", schemaOrgType: "HomeAndConstructionBusiness" },

    // Retail Businesses
    { label: "Fashion Boutique", value: "Fashion Boutique", category: "retail", schemaOrgType: "ClothingStore" },
    { label: "Jewelry Store", value: "Jewelry Store", category: "retail", schemaOrgType: "JewelryStore" },
    { label: "Bookstore", value: "Bookstore", category: "retail", schemaOrgType: "BookStore" },
    { label: "Electronics Store", value: "Electronics Store", category: "retail", schemaOrgType: "ElectronicsStore" },
    { label: "Furniture Store", value: "Furniture Store", category: "retail", schemaOrgType: "FurnitureStore" },
    { label: "Luxury Watch Dealer", value: "Luxury Watch Dealer", category: "retail", schemaOrgType: "JewelryStore" },
    { label: "Craft Supply Store", value: "Craft Supply Store", category: "retail" },
    { label: "Music Store", value: "Music Store", category: "retail", schemaOrgType: "MusicStore" },
    { label: "Shoe Store", value: "Shoe Store", category: "retail", schemaOrgType: "ShoeStore" },
    { label: "Aquarium Store", value: "Aquarium Store", category: "retail", schemaOrgType: "PetStore" },
    { label: "Florist Shop", value: "Florist Shop", category: "retail", schemaOrgType: "Florist" },
    { label: "Handmade Crafts", value: "Handmade Crafts", category: "retail" },
    { label: "Etsy Shop", value: "Etsy Shop", category: "retail" },
    { label: "Fitness Equipment Seller", value: "Fitness Equipment Seller", category: "retail", schemaOrgType: "SportingGoodsStore" },

    // Professional Services
    { label: "Real Estate Agent", value: "Real Estate Agent", category: "professional", schemaOrgType: "RealEstateAgent" },
    { label: "Real Estate Agency", value: "Real Estate Agency", category: "professional", schemaOrgType: "RealEstateAgent" },
    { label: "Law Firm", value: "Law Firm", category: "professional", schemaOrgType: "LegalService" },
    { label: "Financial Advisor", value: "Financial Advisor", category: "professional", schemaOrgType: "FinancialService" },
    { label: "Wedding Planner", value: "Wedding Planner", category: "professional" },
    { label: "Event Planning Company", value: "Event Planning Company", category: "professional" },
    { label: "Interior Designer", value: "Interior Designer", category: "professional" },
    { label: "Life Coach", value: "Life Coach", category: "professional" },
    { label: "Personal Development", value: "Personal Development", category: "professional" },
    { label: "Travel Agency", value: "Travel Agency", category: "professional", schemaOrgType: "TravelAgency" },
    { label: "Home Renovation Contractor", value: "Home Renovation Contractor", category: "professional", schemaOrgType: "HomeAndConstructionBusiness" },

    // Creative Businesses
    { label: "Photography Studio", value: "Photography Studio", category: "creative" },
    { label: "Photography Tour Operator", value: "Photography Tour Operator", category: "creative", schemaOrgType: "TravelAgency" },
    { label: "Tattoo Studio", value: "Tattoo Studio", category: "creative", schemaOrgType: "HealthAndBeautyBusiness" },
    { label: "Art Gallery", value: "Art Gallery", category: "creative", schemaOrgType: "ArtGallery", offeringKind: "product" },
    { label: "Music School", value: "Music School", category: "creative", schemaOrgType: "School" },
    { label: "Makeup Studio", value: "Makeup Studio", category: "creative", schemaOrgType: "BeautySalon" },
    { label: "Handmade Jewelry Brand", value: "Handmade Jewelry Brand", category: "creative", schemaOrgType: "JewelryStore", offeringKind: "product" },
    { label: "Furniture Maker", value: "Furniture Maker", category: "creative", schemaOrgType: "FurnitureStore", offeringKind: "product" },
    { label: "Florist", value: "Florist", category: "creative", schemaOrgType: "Florist", offeringKind: "product" },
    { label: "Event Decorator", value: "Event Decorator", category: "creative" },
    { label: "Tailoring Shop", value: "Tailoring Shop", category: "creative", schemaOrgType: "Store" },

    // Health & Wellness
    { label: "Dental Clinic", value: "Dental Clinic", category: "health", schemaOrgType: "Dentist" },
    { label: "Yoga Studio", value: "Yoga Studio", category: "health", schemaOrgType: "ExerciseGym" },
    { label: "Fitness Bootcamp", value: "Fitness Bootcamp", category: "health", schemaOrgType: "ExerciseGym" },
    { label: "Gym", value: "Gym", category: "health", schemaOrgType: "ExerciseGym" },
    { label: "Fitness Center", value: "Fitness Center", category: "health", schemaOrgType: "ExerciseGym" },
    { label: "Personal Trainer", value: "Personal Trainer", category: "health", schemaOrgType: "ExerciseGym" },
    { label: "Spa Resort", value: "Spa Resort", category: "health", schemaOrgType: "DaySpa" },
    { label: "Martial Arts Academy", value: "Martial Arts Academy", category: "health", schemaOrgType: "ExerciseGym" },
    { label: "Veterinary Clinic", value: "Veterinary Clinic", category: "health", schemaOrgType: "VeterinaryCare" },

    // Specialty Businesses
    { label: "Car Dealership", value: "Car Dealership", category: "specialty", schemaOrgType: "AutoDealer", offeringKind: "product" },
    { label: "Auto Repair Shop", value: "Auto Repair Shop", category: "specialty", schemaOrgType: "AutoRepair" },
    { label: "3D Printing Studio", value: "3D Printing Studio", category: "specialty", schemaOrgType: "ProfessionalService" },
    { label: "Drone Services Company", value: "Drone Services Company", category: "specialty", schemaOrgType: "ProfessionalService" },
    { label: "Boutique Hotel", value: "Boutique Hotel", category: "specialty", schemaOrgType: "Hotel" },
    { label: "Children's Daycare", value: "Children's Daycare", category: "specialty", schemaOrgType: "ChildCare" },
    { label: "Daycare Center", value: "Daycare Center", category: "specialty", schemaOrgType: "ChildCare" },
    { label: "Coworking Space", value: "Coworking Space", category: "specialty" },
    { label: "Bike Rental Shop", value: "Bike Rental Shop", category: "specialty", schemaOrgType: "Store" },
];

// ═══════════════════════════════════════════════════════════════
// FILTER SYSTEM
// ═══════════════════════════════════════════════════════════════

export type SystemFilter = 'popular' | 'veg' | 'nonveg' | 'forMen' | 'forWomen';

export const FILTER_ALLOWLIST: Record<string, SystemFilter[]> = {
    food: ['popular', 'veg', 'nonveg'],
    service: ['popular', 'forMen', 'forWomen'],
    health: ['popular', 'forMen', 'forWomen'],
    retail: ['popular'],
    creative: ['popular'],
    professional: [],
    specialty: ['popular'],
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get business category from business type value.
 * Case-insensitive exact match against BUSINESS_TYPES.
 */
export function getBusinessCategory(businessType?: string): string | undefined {
    return getBusinessTypeConfig(businessType)?.category;
}

/**
 * Get the canonical business type config from a stored business type value.
 * Case-insensitive exact match against BUSINESS_TYPES.
 */
export function getBusinessTypeConfig(businessType?: string): BusinessType | undefined {
    if (!businessType) return undefined;
    return BUSINESS_TYPES.find(
        bt => bt.value.toLowerCase() === businessType.toLowerCase()
    );
}

/**
 * Get canonical category defaults.
 */
export function getBusinessCategoryConfig(businessCategory?: string): BusinessCategory | undefined {
    const normalized = normalizeBusinessCategory(businessCategory);
    if (!normalized) return undefined;
    return BUSINESS_CATEGORIES.find(category => category.value === normalized);
}

/**
 * Normalize a stored business category value against BUSINESS_CATEGORIES.
 */
export function normalizeBusinessCategory(businessCategory?: string): string | undefined {
    const normalized = String(businessCategory || '').trim().toLowerCase();
    if (!normalized) return undefined;
    return BUSINESS_CATEGORIES.some(category => category.value === normalized)
        ? normalized
        : undefined;
}

/**
 * Resolve the canonical category for a store.
 * Stored businessCategory wins; businessType derivation is only the fallback.
 */
export function resolveBusinessCategory(businessType?: string, businessCategory?: string): string | undefined {
    return normalizeBusinessCategory(businessCategory) || getBusinessCategory(businessType);
}

export function getBusinessSchemaOrgType(businessType?: string, businessCategory?: string): string | undefined {
    const storedCategory = normalizeBusinessCategory(businessCategory);
    const config = getBusinessTypeConfig(businessType);
    const categoryConfig = getBusinessCategoryConfig(storedCategory || config?.category);

    if (config?.schemaOrgType && (!storedCategory || config.category === storedCategory)) {
        return config.schemaOrgType;
    }

    return categoryConfig?.schemaOrgType;
}

export function getBusinessCatalogKind(businessType?: string, businessCategory?: string): BusinessCatalogKind {
    const category = resolveBusinessCategory(businessType, businessCategory);
    return getBusinessCategoryConfig(category)?.catalogKind || 'offerCatalog';
}

export function getBusinessOfferingKind(businessType?: string, businessCategory?: string): BusinessOfferingKind {
    const storedCategory = normalizeBusinessCategory(businessCategory);
    const config = getBusinessTypeConfig(businessType);
    const categoryConfig = getBusinessCategoryConfig(storedCategory || config?.category);

    const exact = config?.category === storedCategory || !storedCategory
        ? config?.offeringKind
        : undefined;
    if (exact) return exact;

    return categoryConfig?.offeringKind || 'service';
}
