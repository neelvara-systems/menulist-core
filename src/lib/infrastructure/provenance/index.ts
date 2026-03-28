/**
 * Field-Level Provenance Metadata — Barrel Exports
 *
 * Part of MenuList Infrastructure Layer (Phase 1B).
 *
 * @see __docs__/discovery-infrastructure/provenance-metadata.md
 */

export type {
    ProvenanceSource,
    ProvenanceEntry,
    ItemProvenance,
    ProvenanceField,
} from './types';

export { PROVENANCE_FIELDS } from './types';

export {
    createProvenanceEntry,
    stampProvenance,
    stampAIExtraction,
    stampOwnerEdit,
    detectChangedFields,
} from './tracker';
