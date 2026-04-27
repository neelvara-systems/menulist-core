/**
 * Centralized Tenant + Store Creation
 *
 * Single source of truth for the atomic transaction core shared by ALL onboarding flows.
 * Each flow calls this inside their own transaction and handles user/project/subscription separately.
 *
 * Used by:
 * - /api/onboarding/create-subscription (website onboarding)
 * - /api/canonica/onboard (Canonica onboarding)
 * - /api/msg-preview/[sessionId]/approve (messaging onboarding)
 * - /api/public/create-menu/claim (public menu entry)
 * - /api/reseller/onboard (reseller onboarding)
 *
 * @see __docs__/onboarding-centralization/README.md
 */

import { getDefaultTimeSlotPresets } from '@config/defaultTimeSlotPresets';
import { getBusinessCategory } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { isReservedSubdomain } from '@constant/reservedSlugs';
import { createDefaultRoles, getOwnerRoleId } from '@data/defaultRoles';
import { admin } from '@lib/firebase/firebaseAdmin';
import { CANONICAL_SOURCE_LANGUAGE } from '@lib/localization/languagePolicy';
import { slugify } from '@lib/utils/slugify';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface TenantStoreConfig {
    /** Business display name (used for tenant name, store name derivation, keys) */
    businessName: string;

    /** Actual business type (e.g. 'Restaurant', 'Salon', 'SaaS') */
    businessType: string;

    /** Owner email for tenant + store + default roles */
    email: string;

    /** Source identifier (e.g. 'WEBSITE_ONBOARDING', 'RESELLER_ONBOARDING') */
    onboardingSource: string;

    /** Industry/plan type (e.g. 'B2C', 'B2B', ''). Default: '' */
    businessIndustry?: string;

    /** Subdomain config. Omit to skip subdomain generation entirely. */
    subdomain?: {
        /** Pre-checked subdomain from preCheckSubdomain(). Empty string = collision detected. */
        preChecked: string;
    };

    /** Override store name. Default: `${businessName} - Main Store` */
    storeName?: string;

    /** Whether to auto-generate time slot presets based on businessType. Default: false */
    includeTimeSlotPresets?: boolean;

    /** Additional fields merged into the tenant document (source-specific) */
    tenantExtra?: Record<string, any>;

    /** Additional fields merged into the store document (source-specific) */
    storeExtra?: Record<string, any>;
}

export interface TenantStoreResult {
    tenantId: number;
    storeId: number;
    storeName: string;
    subdomain?: string;
    /** Timestamp used for all docs in this transaction — reuse for consistency */
    now: FirebaseFirestore.Timestamp;
    /** Default roles created for the store */
    defaultRoles: ReturnType<typeof createDefaultRoles>;
}

// ═══════════════════════════════════════════════════════════════
// Pre-Transaction Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Pre-check subdomain uniqueness BEFORE a Firestore transaction.
 * Firestore transactions cannot do WHERE queries on other collections,
 * so subdomain uniqueness must be checked outside the transaction.
 *
 * Race condition window is tiny (ms) and collision auto-resolves
 * via storeId suffix fallback inside the transaction.
 *
 * @returns Pre-checked subdomain string. Empty string if collision detected or invalid input.
 */
export async function preCheckSubdomain(
    db: FirebaseFirestore.Firestore,
    businessName: string,
): Promise<string> {
    const subdomain = slugify(businessName);
    if (!subdomain || isReservedSubdomain(subdomain)) {
        return '';
    }

    const existingStore = await db
        .collection(DB_COLLECTIONS.STORES)
        .where('subdomain', '==', subdomain)
        .where('active', '==', true)
        .limit(1)
        .get();

    if (!existingStore.empty) {
        return ''; // Collision — caller will get storeId suffix fallback
    }

    return subdomain;
}

// ═══════════════════════════════════════════════════════════════
// Core Transaction Helper
// ═══════════════════════════════════════════════════════════════

/**
 * Creates Tenant + Store + storesSummary sync + platformSummary count update
 * inside an existing Firestore transaction.
 *
 * Callers manage their own transaction and handle user creation/update,
 * project creation, subscription creation, etc. separately.
 *
 * @param transaction - Active Firestore transaction
 * @param db - Firestore instance (admin.firestore())
 * @param config - Tenant/store configuration
 * @returns Result with generated IDs, computed fields, and timestamp
 */
export async function createTenantStoreInTransaction(
    transaction: FirebaseFirestore.Transaction,
    db: FirebaseFirestore.Firestore,
    config: TenantStoreConfig,
): Promise<TenantStoreResult> {
    const {
        businessName,
        businessType,
        businessIndustry = '',
        email,
        onboardingSource,
        storeName: storeNameOverride,
        subdomain: subdomainConfig,
        includeTimeSlotPresets = false,
        tenantExtra = {},
        storeExtra = {},
    } = config;

    // 1. Read platformSummary (with transaction lock — prevents race conditions)
    const platformSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('summary');
    const platformSummary = await transaction.get(platformSummaryRef);

    if (!platformSummary.exists) {
        throw new Error('Platform summary not found');
    }

    const summaryData = platformSummary.data()!;
    const newTenantId = (summaryData?.tenants?.count || 0) + 1;
    const newStoreId = (summaryData?.stores?.count || 0) + 1;
    const now = admin.firestore.Timestamp.now();

    // 2. Derive computed fields
    const storeName = storeNameOverride || `${businessName} - Main Store`;
    const tenantKey = businessName.toLowerCase().replaceAll(' ', '_');
    const storeKey = storeName.toLowerCase().replaceAll(' ', '_');
    const businessCategory = getBusinessCategory(businessType) || 'specialty';
    const defaultRoles = createDefaultRoles(newStoreId, email || 'system');

    // 3. Resolve subdomain (if requested)
    let autoSubdomain: string | undefined;
    if (subdomainConfig) {
        autoSubdomain = subdomainConfig.preChecked || '';
        if (!autoSubdomain || isReservedSubdomain(autoSubdomain)) {
            const base = slugify(businessName);
            autoSubdomain = base ? `${base}-${newStoreId}` : `store-${newStoreId}`;
        }
    }

    // 4. Generate time slot presets (if requested)
    const timeSlotPresets = includeTimeSlotPresets
        ? getDefaultTimeSlotPresets(businessType, newTenantId, newStoreId)
        : undefined;

    // 5. Build storesList entry
    const storesListEntry: Record<string, any> = {
        storeId: newStoreId,
        name: storeName,
        isMaster: true,
    };
    if (autoSubdomain) {
        storesListEntry.subdomain = autoSubdomain;
    }

    // 6. Create Tenant
    const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(String(newTenantId));
    transaction.set(tenantRef, {
        name: businessName,
        businessType,
        businessIndustry,
        email,
        active: true,
        verified: false,
        storesList: [storesListEntry],
        tenantId: newTenantId,
        tenantKey,
        ...(autoSubdomain ? { subDomain: autoSubdomain } : {}),
        onboardingSource,
        createdOn: now,
        modifiedOn: now,
        ...tenantExtra,
    });

    // 7. Create Store
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(newStoreId));
    transaction.set(storeRef, {
        name: storeName,
        businessType,
        businessCategory,
        businessIndustry,
        email,
        active: true,
        verified: false,
        tenantId: newTenantId,
        storeId: newStoreId,
        storeKey,
        ...(autoSubdomain ? { subdomain: autoSubdomain } : {}),
        ...(timeSlotPresets ? { timeSlotPresets } : {}),
        publicPresence: {
            displayName: {
                [CANONICAL_SOURCE_LANGUAGE]: storeName,
            },
        },
        activeLanguages: [CANONICAL_SOURCE_LANGUAGE],
        defaultLanguage: CANONICAL_SOURCE_LANGUAGE,
        roles: defaultRoles,
        isMaster: true,
        onboardingSource,
        createdOn: now,
        modifiedOn: now,
        ...storeExtra,
    });

    // 8. Sync storesSummary (for Cloud Function cost optimization)
    const storesSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary');
    transaction.set(
        storesSummaryRef,
        {
            lastUpdated: now,
            [`stores.${newStoreId}`]: {
                tId: newTenantId,
                businessType,
                businessCategory,
                active: true,
                name: storeName,
            },
        },
        { merge: true },
    );

    // 9. Update Platform Summary Counts
    transaction.update(platformSummaryRef, {
        'tenants.count': newTenantId,
        'stores.count': newStoreId,
    });

    return {
        tenantId: newTenantId,
        storeId: newStoreId,
        storeName,
        subdomain: autoSubdomain,
        now,
        defaultRoles,
    };
}

// ═══════════════════════════════════════════════════════════════
// User Update Helper
// ═══════════════════════════════════════════════════════════════

/**
 * Updates an existing user document with tenant/store ownership.
 * Use for flows where the user already exists (website onboarding, Canonica, public menu entry).
 *
 * For flows with complex user handling (messaging onboarding, reseller),
 * handle user creation/update directly in the caller.
 */
export function updateUserWithTenantStore(
    transaction: FirebaseFirestore.Transaction,
    db: FirebaseFirestore.Firestore,
    userId: string,
    result: TenantStoreResult,
    extraFields?: Record<string, any>,
): void {
    const userRef = db.collection(DB_COLLECTIONS.USERS).doc(userId);
    transaction.update(userRef, {
        tenantId: result.tenantId,
        storeId: result.storeId,
        stores: [
            {
                storeId: result.storeId,
                name: result.storeName,
                role: getOwnerRoleId(),
            },
        ],
        modifiedOn: result.now,
        ...extraFields,
    });
}
