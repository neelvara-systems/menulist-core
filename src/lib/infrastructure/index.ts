/**
 * MenuList Infrastructure Layer — Barrel Exports
 *
 * Data infrastructure for AI discovery, machine readability, and ecosystem interoperability.
 * Isolated from core MenuList business logic. All features are additive and feature-flagged.
 *
 * @see __docs__/discovery-infrastructure/README.md
 */

// Phase 1A: Offering Taxonomy System
export * from './taxonomy';

// Phase 1B: Field-Level Provenance
export * from './provenance';

// Phase 1C: Semantic Attributes
export * from './semantics';

// Phase 2: Discovery Index
export * from './discovery';
