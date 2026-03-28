/**
 * Semantic Attribute Registry — Unified Attribute Lookup
 *
 * Maps store.businessAttributes boolean fields to semantic IDs with schema.org mappings.
 * Static data, zero Firebase cost.
 *
 * @see __docs__/discovery-infrastructure/semantic-attributes.md
 */

import type { SemanticAttribute, SemanticAttributeGroup, StoreSemanticProfile } from './types';

// ═══════════════════════════════════════════════════════════════
// ATTRIBUTE REGISTRY (Static Data)
// ═══════════════════════════════════════════════════════════════

const SEMANTIC_ATTRIBUTES: SemanticAttribute[] = [
    // Amenities
    { id: 'wifi', label: 'Free WiFi', group: 'amenity', schemaOrg: 'LocationFeatureSpecification', storeField: 'wifi' },
    { id: 'outdoor_seating', label: 'Outdoor Seating', group: 'amenity', schemaOrg: 'LocationFeatureSpecification', storeField: 'outdoorSeating' },
    { id: 'parking', label: 'Parking', group: 'amenity', schemaOrg: 'LocationFeatureSpecification', storeField: 'parking' },
    { id: 'air_conditioning', label: 'Air Conditioning', group: 'amenity', schemaOrg: 'LocationFeatureSpecification', storeField: 'airConditioning' },
    { id: 'live_music', label: 'Live Music', group: 'amenity', schemaOrg: 'LocationFeatureSpecification', storeField: 'liveMusic' },
    { id: 'pet_friendly', label: 'Pet Friendly', group: 'accessibility', schemaOrg: 'LocationFeatureSpecification', storeField: 'petFriendly' },

    // Dietary
    { id: 'vegetarian_options', label: 'Vegetarian Options', group: 'dietary', schemaOrg: 'https://schema.org/VegetarianDiet', storeField: 'vegetarian' },
    { id: 'vegan_options', label: 'Vegan Options', group: 'dietary', schemaOrg: 'https://schema.org/VeganDiet', storeField: 'vegan' },
    { id: 'halal_options', label: 'Halal', group: 'dietary', schemaOrg: 'https://schema.org/HalalDiet', storeField: 'halal' },
    { id: 'gluten_free_options', label: 'Gluten-Free Options', group: 'dietary', schemaOrg: 'https://schema.org/GlutenFreeDiet', storeField: 'glutenFree' },

    // Service Modes
    { id: 'dine_in', label: 'Dine-In', group: 'service_mode', storeField: 'dineIn' },
    { id: 'takeaway', label: 'Takeaway', group: 'service_mode', storeField: 'takeaway' },
    { id: 'delivery', label: 'Delivery', group: 'service_mode', storeField: 'delivery' },
    { id: 'drive_through', label: 'Drive-Through', group: 'service_mode', storeField: 'driveThrough' },

    // Payment
    { id: 'accepts_cards', label: 'Accepts Cards', group: 'payment', storeField: 'acceptsCards' },
    { id: 'accepts_upi', label: 'Accepts UPI', group: 'payment', storeField: 'acceptsUPI' },
    { id: 'accepts_cash', label: 'Accepts Cash', group: 'payment', storeField: 'acceptsCash' },
];

// ═══════════════════════════════════════════════════════════════
// LOOKUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all semantic attributes.
 */
export function getAllSemanticAttributes(): SemanticAttribute[] {
    return SEMANTIC_ATTRIBUTES;
}

/**
 * Get semantic attributes by group.
 */
export function getAttributesByGroup(group: SemanticAttributeGroup): SemanticAttribute[] {
    return SEMANTIC_ATTRIBUTES.filter(a => a.group === group);
}

/**
 * Look up a semantic attribute by ID.
 */
export function getSemanticAttributeById(id: string): SemanticAttribute | undefined {
    return SEMANTIC_ATTRIBUTES.find(a => a.id === id);
}

// ═══════════════════════════════════════════════════════════════
// STORE ADAPTER
// ═══════════════════════════════════════════════════════════════

/**
 * Extract semantic attribute profile from a store's businessAttributes.
 *
 * Reads store.businessAttributes (boolean fields) and maps to semantic IDs.
 * READ-ONLY — does not modify the store document.
 *
 * @param businessAttributes - store.businessAttributes object
 * @returns StoreSemanticProfile with active attribute IDs
 */
export function extractStoreSemanticProfile(
    businessAttributes?: Record<string, boolean>,
): StoreSemanticProfile {
    const attributeIds: string[] = [];
    const byGroup: Record<SemanticAttributeGroup, string[]> = {
        amenity: [],
        dietary: [],
        service_mode: [],
        payment: [],
        accessibility: [],
    };

    if (!businessAttributes) {
        return { attributeIds, byGroup };
    }

    for (const attr of SEMANTIC_ATTRIBUTES) {
        if (attr.storeField && businessAttributes[attr.storeField] === true) {
            attributeIds.push(attr.id);
            byGroup[attr.group].push(attr.id);
        }
    }

    return { attributeIds, byGroup };
}
