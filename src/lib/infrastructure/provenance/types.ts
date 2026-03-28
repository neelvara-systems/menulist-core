/**
 * Field-Level Provenance Metadata — Types
 *
 * Tracks data source, confidence, and lineage per field on menu items.
 * Part of MenuList Infrastructure Layer (Phase 1B).
 *
 * @see __docs__/discovery-infrastructure/provenance-metadata.md
 */

/**
 * Source of a data field value.
 */
export type ProvenanceSource =
    | 'ai_extraction'   // AI extracted from menu image/PDF
    | 'owner_edit'      // Business owner manually entered/edited
    | 'staff_edit'      // Staff member edited
    | 'system'          // System-generated (e.g., defaults, computed)
    | 'import';         // Imported from external source (POS, CSV, etc.)

/**
 * Provenance entry for a single field.
 */
export interface ProvenanceEntry {
    /** How this field value was produced */
    source: ProvenanceSource;
    /** Confidence score 0.0–1.0 (1.0 = owner-verified, 0.0–0.99 = AI confidence) */
    confidence: number;
    /** When this provenance was recorded (epoch ms) */
    timestamp: number;
}

/**
 * Provenance metadata for an item's fields.
 * Stored as `_provenance` on ExtractedDataItem (internal only).
 * Stripped by sanitizeForClient before customer exposure.
 */
export interface ItemProvenance {
    name?: ProvenanceEntry;
    price?: ProvenanceEntry;
    description?: ProvenanceEntry;
    category?: ProvenanceEntry;
    tags?: ProvenanceEntry;
    available?: ProvenanceEntry;
}

/**
 * Fields that can have provenance tracked.
 */
export type ProvenanceField = keyof ItemProvenance;

/**
 * All provenance-trackable fields.
 */
export const PROVENANCE_FIELDS: ProvenanceField[] = [
    'name', 'price', 'description', 'category', 'tags', 'available',
];
