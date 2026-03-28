/**
 * Semantic Attribute Registry — Types
 *
 * Controlled vocabulary for dietary tags, business attributes, and service modes.
 * Part of MenuList Infrastructure Layer (Phase 1C).
 *
 * @see __docs__/discovery-infrastructure/semantic-attributes.md
 */

/**
 * A semantic attribute with canonical ID, label, and optional schema.org mapping.
 */
export interface SemanticAttribute {
    /** Canonical ID, e.g. 'wifi', 'outdoor_seating', 'dine_in' */
    id: string;
    /** English display label */
    label: string;
    /** Attribute group for categorization */
    group: SemanticAttributeGroup;
    /** Schema.org property or type (if applicable) */
    schemaOrg?: string;
    /** The field name on store.businessAttributes (if applicable) */
    storeField?: string;
}

/**
 * Groups of semantic attributes.
 */
export type SemanticAttributeGroup =
    | 'amenity'         // WiFi, parking, outdoor seating, etc.
    | 'dietary'         // Vegetarian, vegan, halal, etc.
    | 'service_mode'    // Dine-in, takeaway, delivery, etc.
    | 'payment'         // Cards, UPI, cash, etc.
    | 'accessibility';  // Wheelchair, pet-friendly, etc.

/**
 * Result of extracting semantic attributes from a store document.
 */
export interface StoreSemanticProfile {
    /** All active semantic attribute IDs */
    attributeIds: string[];
    /** Grouped by category for structured output */
    byGroup: Record<SemanticAttributeGroup, string[]>;
}
