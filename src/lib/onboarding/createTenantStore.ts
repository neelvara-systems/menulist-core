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
import { resolveBusinessCategory } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { isReservedSubdomain } from '@constant/reservedSlugs';
import { createDefaultRoles, getOwnerRoleId } from '@data/defaultRoles';
import { admin } from '@lib/firebase/firebaseAdmin';
import { resolveBusinessDayEndTime } from '@lib/analytics/businessDay';
import { CANONICAL_SOURCE_LANGUAGE } from '@lib/localization/languagePolicy';
import { slugify } from '@lib/utils/slugify';
import { computeSchedulerHour } from '@lib/utils/schedulerHour';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface TenantStoreConfig {
    /** Brand display name used for tenant identity. Store identity stays location-specific. */
    businessName: string;

    /** Actual business type (e.g. 'Restaurant', 'Salon', 'SaaS') */
    businessType: string;

    /** Owner email for tenant + store + default roles */
    email: string;

    /** Source identifier (e.g. 'WEBSITE_ONBOARDING', 'RESELLER_ONBOARDING') */
    onboardingSource: string;

    /** Industry/plan type (e.g. 'B2C', 'B2B', ''). Default: '' */
    businessIndustry?: string;
    timeZone?: string;
    businessDayEndTime?: string;

    /** Subdomain config. Omit to skip subdomain generation entirely. */
    subdomain?: {
        /** Pre-checked subdomain from preCheckSubdomain(). Empty string = collision detected. */
        preChecked: string;
    };

    /** Override store/location name. Default: `Main Store` */
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
    locality?: string,
): Promise<string> {
    const slugSource = [businessName, locality]
        .map((part) => typeof part === 'string' ? part.trim() : '')
        .filter(Boolean)
        .join(' ');
    const subdomain = slugify(slugSource || businessName);
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
        timeZone,
        businessDayEndTime,
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
    const storesSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary');
    const platformSummary = await transaction.get(platformSummaryRef);
    const storesSummary = await transaction.get(storesSummaryRef);

    const storesSummaryData = storesSummary.exists ? storesSummary.data() : null;
    const deriveCountsFromStoresSummary = () => {
        const stores = storesSummaryData?.stores || {};
        let maxTenantId = 0;
        let maxStoreId = 0;

        Object.entries(stores).forEach(([storeId, storeData]: [string, any]) => {
            const numericStoreId = Number(storeData?.storeId || storeId);
            const numericTenantId = Number(storeData?.tId || storeData?.tenantId || 0);
            if (Number.isFinite(numericStoreId)) maxStoreId = Math.max(maxStoreId, numericStoreId);
            if (Number.isFinite(numericTenantId)) maxTenantId = Math.max(maxTenantId, numericTenantId);
        });

        return { tenantCount: maxTenantId, storeCount: maxStoreId };
    };

    const summaryData = platformSummary.exists ? platformSummary.data()! : {};
    const derivedCounts = deriveCountsFromStoresSummary();
    const currentTenantCount = Number(summaryData?.tenants?.count || 0) || derivedCounts.tenantCount;
    const currentStoreCount = Number(summaryData?.stores?.count || 0) || derivedCounts.storeCount;

    if (!currentTenantCount || !currentStoreCount) {
        throw new Error('Platform summary not found and storesSummary cannot bootstrap counters');
    }

    const newTenantId = currentTenantCount + 1;
    const newStoreId = currentStoreCount + 1;
    const now = admin.firestore.Timestamp.now();

    // 2. Derive computed fields
    const storeName = storeNameOverride || 'Main Store';
    const tenantKey = businessName.toLowerCase().replaceAll(' ', '_');
    const storeKey = storeName.toLowerCase().replaceAll(' ', '_');
    const businessCategory = resolveBusinessCategory(businessType) || 'specialty';
    const defaultRoles = createDefaultRoles(newStoreId, email || 'system');
    const resolvedBusinessDayEndTime = resolveBusinessDayEndTime(businessType, businessDayEndTime, businessCategory);
    const schedulerHour = computeSchedulerHour(timeZone, resolvedBusinessDayEndTime);

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
        tenantName: businessName,
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
        tenantName: businessName,
        businessType,
        businessCategory,
        businessIndustry,
        email,
        active: true,
        verified: false,
        tenantId: newTenantId,
        storeId: newStoreId,
        storeKey,
        ...(timeZone ? { timeZone } : {}),
        businessDayEndTime: resolvedBusinessDayEndTime,
        schedulerHour,
        ...(autoSubdomain ? { subdomain: autoSubdomain } : {}),
        ...(timeSlotPresets ? { timeSlotPresets } : {}),
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
                tenantName: businessName,
                isMaster: true,
                city: storeExtra?.city || '',
                addressLine: storeExtra?.addressLine || '',
                logo: storeExtra?.logo || '',
                workingHours: storeExtra?.workingHours || {},
                ...(timeZone ? { timeZone } : {}),
                businessDayEndTime: resolvedBusinessDayEndTime,
                schedulerHour,
                modifiedOn: now,
            },
        },
        { merge: true },
    );

    // 9. Update Platform Summary Counts
    transaction.set(
        platformSummaryRef,
        {
            tenants: { count: newTenantId },
            stores: { count: newStoreId },
            modifiedOn: now,
        },
        { merge: true },
    );

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
