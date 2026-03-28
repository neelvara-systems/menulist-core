/**
 * Field-Level Provenance Tracker — Stamping Logic
 *
 * Pure functions for creating and updating provenance metadata on items.
 * No side effects, no Firebase calls. Safe to call from any context.
 *
 * @see __docs__/discovery-infrastructure/provenance-metadata.md
 */

import type { ItemProvenance, ProvenanceEntry, ProvenanceField, ProvenanceSource } from './types';

/**
 * Create a provenance entry for a field.
 */
export function createProvenanceEntry(
    source: ProvenanceSource,
    confidence: number = 1.0,
): ProvenanceEntry {
    return {
        source,
        confidence: Math.max(0, Math.min(1, confidence)),
        timestamp: Date.now(),
    };
}

/**
 * Stamp provenance on specific fields of an item.
 * Returns a new _provenance object (does not mutate input).
 *
 * @param existing - Current _provenance (if any)
 * @param fields - Fields to stamp
 * @param source - Source of the change
 * @param confidence - Confidence score (default 1.0 for owner edits)
 */
export function stampProvenance(
    existing: ItemProvenance | undefined,
    fields: ProvenanceField[],
    source: ProvenanceSource,
    confidence: number = 1.0,
): ItemProvenance {
    const entry = createProvenanceEntry(source, confidence);
    const result: ItemProvenance = existing ? { ...existing } : {};

    for (const field of fields) {
        result[field] = entry;
    }

    return result;
}

/**
 * Stamp all fields with AI extraction provenance.
 * Used when AI extracts menu data from images.
 *
 * @param confidence - AI extraction confidence score (0.0–1.0)
 */
export function stampAIExtraction(confidence: number = 0.8): ItemProvenance {
    const entry = createProvenanceEntry('ai_extraction', confidence);
    return {
        name: entry,
        price: entry,
        description: entry,
        category: entry,
        tags: entry,
    };
}

/**
 * Stamp a single field with owner edit provenance.
 * Used when owner manually edits a field value.
 *
 * @param existing - Current _provenance
 * @param field - Which field was edited
 */
export function stampOwnerEdit(
    existing: ItemProvenance | undefined,
    field: ProvenanceField,
): ItemProvenance {
    return stampProvenance(existing, [field], 'owner_edit', 1.0);
}

/**
 * Detect which fields changed between two item states.
 * Returns the list of changed field names that are provenance-trackable.
 *
 * @param oldItem - Previous item state
 * @param newItem - New item state
 * @param primaryLanguage - Language key for name/description comparison
 */
export function detectChangedFields(
    oldItem: Record<string, any>,
    newItem: Record<string, any>,
    primaryLanguage: string = 'en',
): ProvenanceField[] {
    const changed: ProvenanceField[] = [];

    // Name change
    if (oldItem?.name?.[primaryLanguage] !== newItem?.name?.[primaryLanguage]) {
        changed.push('name');
    }

    // Price change
    if (String(oldItem?.price || '') !== String(newItem?.price || '')) {
        changed.push('price');
    }

    // Description change
    if (oldItem?.description?.[primaryLanguage] !== newItem?.description?.[primaryLanguage]) {
        changed.push('description');
    }

    // Category change
    if (oldItem?.category !== newItem?.category) {
        changed.push('category');
    }

    // Tags change
    const oldTags = JSON.stringify(oldItem?.tags || []);
    const newTags = JSON.stringify(newItem?.tags || []);
    if (oldTags !== newTags) {
        changed.push('tags');
    }

    // Availability change
    if (oldItem?.available !== newItem?.available) {
        changed.push('available');
    }

    return changed;
}
