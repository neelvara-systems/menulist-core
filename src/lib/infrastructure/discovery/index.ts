/**
 * Business Entity Discovery Index — Barrel Exports
 *
 * Part of MenuList Infrastructure Layer (Phase 2A).
 *
 * @see __docs__/discovery-infrastructure/business-entity-index.md
 */

export type {
    BusinessEntityIndexDoc,
    IndexBuildInput,
} from './types';

export {
    buildBusinessEntityIndexDoc,
    validateIndexDocSafety,
} from './indexBuilder';
