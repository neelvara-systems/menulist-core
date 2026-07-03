/**
 * Business Entity Index Builder
 *
 * Builds discovery index documents from existing store + project data.
 * Pure functions — no Firebase calls, no side effects.
 * The actual Firestore writes require separate scheduler wiring; no writer is
 * active while ENABLE_INFRASTRUCTURE_DISCOVERY_INDEX remains false.
 *
 * COMPLIANCE: Only extracts PUBLIC business data. No PII, no billing, no internal data.
 *
 * @see __docs__/discovery-infrastructure/business-entity-index.md
 */

import { extractStoreSemanticProfile } from '../semantics/attributeRegistry';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { extractTaxonomyFromProject } from '../taxonomy/adapter';
import type { BusinessEntityIndexDoc, IndexBuildInput } from './types';

/**
 * Build a BusinessEntityIndexDoc from store and project data.
 *
 * This function is READ-ONLY — it reads existing data and produces
 * a new index document. Does not modify input data.
 *
 * @param input - Store data, project data, and business category
 * @returns A complete index document ready for Firestore write
 */
export function buildBusinessEntityIndexDoc(
    input: IndexBuildInput,
): BusinessEntityIndexDoc {
    const { storeData, projectData, projectFiles, businessCategory } = input;

    // Extract taxonomy data from project through the read-only utility.
    const taxonomyResult = extractTaxonomyFromProject(
        projectFiles,
        businessCategory,
        'en',
    );

    // Extract semantic attributes from store through the read-only utility.
    const semanticProfile = extractStoreSemanticProfile(
        storeData.businessAttributes,
    );
    const contentLanguage = storeData.defaultLanguage || storeData.activeLanguages?.[0] || storeData.language || 'en';

    // Build the index document (PUBLIC data only)
    const doc: BusinessEntityIndexDoc = {
        // Identity
        storeId: storeData.storeId,
        tenantId: storeData.tenantId,
        name: getStoreContextName(storeData, ''),
        businessType: storeData.businessType || '',
        businessCategory: businessCategory || '',
        descriptor: getLocalizedText(
            storeData.publicPresence?.descriptor,
            contentLanguage,
            getPrimaryLocalizedLanguage(storeData.publicPresence?.descriptor, contentLanguage),
            '',
        ) || undefined,

        // Location
        geo: storeData.geo ? {
            latitude: storeData.geo.latitude,
            longitude: storeData.geo.longitude,
        } : undefined,
        city: storeData.city,
        state: storeData.state,
        country: storeData.country,

        // Taxonomy (SMB-universal)
        standardCategories: taxonomyResult.standardCategoryIds,
        offeringTags: taxonomyResult.allDietaryTags,
        subCategories: [], // Reserved for separately audited subtype detection.

        // Semantic Attributes
        semanticAttributes: semanticProfile.attributeIds,

        // Offerings Summary
        topItems: taxonomyResult.topItems,
        totalItems: taxonomyResult.totalItems,
        totalCategories: taxonomyResult.totalCategories,

        // Freshness
        menuVersion: projectData.menuVersion,
        lastPublishedAt: projectData.lastPublishedAt
            ? (typeof projectData.lastPublishedAt.toDate === 'function'
                ? projectData.lastPublishedAt.toDate().toISOString()
                : String(projectData.lastPublishedAt))
            : undefined,
        priceRange: storeData.priceRange,

        // Hours
        workingHours: storeData.workingHours,

        // Metadata
        indexedAt: new Date().toISOString(),
        active: storeData.active !== false,
    };

    return doc;
}

/**
 * Validate that an index document contains only public data.
 * Safety check — ensures no sensitive fields leaked into the index.
 *
 * @returns true if document is safe, false if it contains suspicious fields
 */
export function validateIndexDocSafety(doc: BusinessEntityIndexDoc): boolean {
    const dangerousFields = [
        'email', 'phone', 'password', 'apiKey', 'secret',
        'token', 'billing', 'subscription', 'payment',
        'analytics', 'chatSession', 'feedback', 'internalNote',
    ];

    const docString = JSON.stringify(doc).toLowerCase();

    for (const field of dangerousFields) {
        // Check if any field key contains sensitive terms
        if (Object.keys(doc).some(k => k.toLowerCase().includes(field))) {
            return false;
        }
    }

    return true;
}
