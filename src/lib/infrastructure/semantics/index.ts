/**
 * Semantic Attribute Registry — Barrel Exports
 *
 * Part of MenuList Infrastructure Layer (Phase 1C).
 *
 * @see __docs__/discovery-infrastructure/semantic-attributes.md
 */

export type {
    SemanticAttribute,
    SemanticAttributeGroup,
    StoreSemanticProfile,
} from './types';

export {
    getAllSemanticAttributes,
    getAttributesByGroup,
    getSemanticAttributeById,
    extractStoreSemanticProfile,
} from './attributeRegistry';
