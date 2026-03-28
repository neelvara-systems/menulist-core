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
}

export interface BusinessType {
    label: string;
    value: string;
    category: string;
}

// ═══════════════════════════════════════════════════════════════
// BUSINESS CATEGORIES
// ═══════════════════════════════════════════════════════════════

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
    { label: "Service Businesses", value: "service" },
    { label: "Retail Businesses", value: "retail" },
    { label: "Food & Beverage", value: "food" },
    { label: "Professional Services", value: "professional" },
    { label: "Creative Businesses", value: "creative" },
    { label: "Health & Wellness", value: "health" },
    { label: "Specialty Businesses", value: "specialty" },
];

// ═══════════════════════════════════════════════════════════════
// BUSINESS TYPES (Full list — all categories)
// ═══════════════════════════════════════════════════════════════

export const BUSINESS_TYPES: BusinessType[] = [
    // Food & Beverage
    { label: "Restaurant", value: "Restaurant", category: "food" },
    { label: "Cafe", value: "Cafe", category: "food" },
    { label: "Cake Shop", value: "Cake Shop", category: "food" },
    { label: "Bakery", value: "Bakery", category: "food" },
    { label: "Coffee Shop", value: "Coffee Shop", category: "food" },
    { label: "Specialty Coffee Shop", value: "Specialty Coffee Shop", category: "food" },
    { label: "Ice Cream Shop", value: "Ice Cream Shop", category: "food" },

    // Service Businesses
    { label: "Spa", value: "Spa", category: "service" },
    { label: "Salon", value: "Salon", category: "service" },
    { label: "Pet Grooming Service", value: "Pet Grooming Service", category: "service" },
    { label: "Pet Grooming Salon", value: "Pet Grooming Salon", category: "service" },
    { label: "Pet Grooming Studio", value: "Pet Grooming Studio", category: "service" },
    { label: "Cleaning Services Company", value: "Cleaning Services Company", category: "service" },
    { label: "Car Wash & Detailing Service", value: "Car Wash & Detailing Service", category: "service" },
    { label: "Landscaping Service", value: "Landscaping Service", category: "service" },
    { label: "Landscaping Company", value: "Landscaping Company", category: "service" },

    // Retail Businesses
    { label: "Fashion Boutique", value: "Fashion Boutique", category: "retail" },
    { label: "Jewelry Store", value: "Jewelry Store", category: "retail" },
    { label: "Bookstore", value: "Bookstore", category: "retail" },
    { label: "Electronics Store", value: "Electronics Store", category: "retail" },
    { label: "Furniture Store", value: "Furniture Store", category: "retail" },
    { label: "Luxury Watch Dealer", value: "Luxury Watch Dealer", category: "retail" },
    { label: "Craft Supply Store", value: "Craft Supply Store", category: "retail" },
    { label: "Music Store", value: "Music Store", category: "retail" },
    { label: "Shoe Store", value: "Shoe Store", category: "retail" },
    { label: "Aquarium Store", value: "Aquarium Store", category: "retail" },
    { label: "Florist Shop", value: "Florist Shop", category: "retail" },
    { label: "Handmade Crafts", value: "Handmade Crafts", category: "retail" },
    { label: "Etsy Shop", value: "Etsy Shop", category: "retail" },
    { label: "Fitness Equipment Seller", value: "Fitness Equipment Seller", category: "retail" },

    // Professional Services
    { label: "Real Estate Agent", value: "Real Estate Agent", category: "professional" },
    { label: "Real Estate Agency", value: "Real Estate Agency", category: "professional" },
    { label: "Law Firm", value: "Law Firm", category: "professional" },
    { label: "Financial Advisor", value: "Financial Advisor", category: "professional" },
    { label: "Wedding Planner", value: "Wedding Planner", category: "professional" },
    { label: "Event Planning Company", value: "Event Planning Company", category: "professional" },
    { label: "Interior Designer", value: "Interior Designer", category: "professional" },
    { label: "Life Coach", value: "Life Coach", category: "professional" },
    { label: "Personal Development", value: "Personal Development", category: "professional" },
    { label: "Travel Agency", value: "Travel Agency", category: "professional" },
    { label: "Home Renovation Contractor", value: "Home Renovation Contractor", category: "professional" },

    // Creative Businesses
    { label: "Photography Studio", value: "Photography Studio", category: "creative" },
    { label: "Photography Tour Operator", value: "Photography Tour Operator", category: "creative" },
    { label: "Tattoo Studio", value: "Tattoo Studio", category: "creative" },
    { label: "Art Gallery", value: "Art Gallery", category: "creative" },
    { label: "Music School", value: "Music School", category: "creative" },
    { label: "Makeup Studio", value: "Makeup Studio", category: "creative" },
    { label: "Handmade Jewelry Brand", value: "Handmade Jewelry Brand", category: "creative" },
    { label: "Furniture Maker", value: "Furniture Maker", category: "creative" },
    { label: "Florist", value: "Florist", category: "creative" },
    { label: "Event Decorator", value: "Event Decorator", category: "creative" },
    { label: "Tailoring Shop", value: "Tailoring Shop", category: "creative" },

    // Health & Wellness
    { label: "Dental Clinic", value: "Dental Clinic", category: "health" },
    { label: "Yoga Studio", value: "Yoga Studio", category: "health" },
    { label: "Fitness Bootcamp", value: "Fitness Bootcamp", category: "health" },
    { label: "Gym", value: "Gym", category: "health" },
    { label: "Fitness Center", value: "Fitness Center", category: "health" },
    { label: "Personal Trainer", value: "Personal Trainer", category: "health" },
    { label: "Spa Resort", value: "Spa Resort", category: "health" },
    { label: "Martial Arts Academy", value: "Martial Arts Academy", category: "health" },
    { label: "Veterinary Clinic", value: "Veterinary Clinic", category: "health" },

    // Specialty Businesses
    { label: "Car Dealership", value: "Car Dealership", category: "specialty" },
    { label: "Auto Repair Shop", value: "Auto Repair Shop", category: "specialty" },
    { label: "3D Printing Studio", value: "3D Printing Studio", category: "specialty" },
    { label: "Drone Services Company", value: "Drone Services Company", category: "specialty" },
    { label: "Boutique Hotel", value: "Boutique Hotel", category: "specialty" },
    { label: "Children's Daycare", value: "Children's Daycare", category: "specialty" },
    { label: "Daycare Center", value: "Daycare Center", category: "specialty" },
    { label: "Coworking Space", value: "Coworking Space", category: "specialty" },
    { label: "Bike Rental Shop", value: "Bike Rental Shop", category: "specialty" },
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
    if (!businessType) return undefined;
    return BUSINESS_TYPES.find(
        bt => bt.value.toLowerCase() === businessType.toLowerCase()
    )?.category;
}
