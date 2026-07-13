/**
 * Centralized Tenant + Store Creation
 *
 * Single source of truth for the atomic transaction core shared by ALL onboarding flows.
 * Each flow calls this inside their own transaction and handles user/project/subscription separately.
 *
 * Used by:
 * - /api/onboarding/create-subscription (website onboarding)
 * - /api/answerlattice/onboard (Answerlattice onboarding)
 * - /api/msg-preview/[sessionId]/approve (messaging onboarding)
 * - /api/public/create-menu/claim (public menu entry)
 * - /api/reseller/onboard (reseller onboarding)
 *
 * @see __docs__/onboarding-centralization/README.md
 */

import { getDefaultTimeSlotPresets } from '@config/defaultTimeSlotPresets';
import { resolveStoreBusinessCategory } from '@data/shared/businessTypes';
import {
    findNextAvailablePlatformEntityId,
    LEGACY_PLATFORM_COUNTER_DOCUMENT_ID,
    PLATFORM_COUNTER_DOCUMENT_ID,
    resolvePlatformCounterFloor,
} from '@data/shared/platformCounterBoundary';
import { DB_COLLECTIONS } from '@constant/database';
import { isReservedSubdomain } from '@constant/reservedSlugs';
import { createDefaultRoles, getOwnerRoleId } from '@data/defaultRoles';
import { admin } from '@lib/firebase/firebaseAdmin';
import { isCurrentUserRecordEligible } from '@lib/auth/currentPlatformUser';
import { resolveBusinessDayEndTime } from '@lib/analytics/businessDay';
import { CANONICAL_SOURCE_LANGUAGE } from '@lib/localization/languagePolicy';
import { requireOnboardingUserId } from './onboardingUserId';
import {
    readSubdomainReservationInTransaction,
    isSubdomainUnavailableError,
    type SubdomainReservation,
    writeCurrentSubdomainClaim,
} from '@lib/routing/subdomainClaim';
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

    /** Explicit broad business category when known from intake or owner selection. */
    businessCategory?: string;

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

    /** Allow first tenant/store creation when the target product DB starts empty. */
    allowInitialCounters?: boolean;
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

export class OnboardingUserUnavailableError extends Error {
    constructor() {
        super('Current user is not eligible for onboarding');
        this.name = 'OnboardingUserUnavailableError';
    }
}

const isEmptyOnboardingScopeCollection = (value: unknown): boolean => (
    value === undefined
    || value === null
    || (Array.isArray(value) && value.length === 0)
);

const isOnboardingScopeUnset = (value: unknown): boolean => (
    value === undefined || value === null || value === ''
);

export function isCurrentUserAvailableForOnboarding(params: {
    documentId: string;
    session: unknown;
    userData: unknown;
}): boolean {
    if (!isCurrentUserRecordEligible(params)) return false;
    const userData = params.userData as Record<string, unknown>;
    return isOnboardingScopeUnset(userData.tenantId)
        && isOnboardingScopeUnset(userData.storeId)
        && isEmptyOnboardingScopeCollection(userData.stores)
        && isEmptyOnboardingScopeCollection(userData.storeIds);
}

/**
 * Locks and revalidates the exact current user inside the same transaction that
 * allocates tenant/store IDs. A stale session is only an advisory pre-check;
 * this read is the authority and makes concurrent onboarding attempts converge
 * on a single winning transaction.
 */
export async function assertCurrentUserAvailableForOnboardingInTransaction(
    transaction: FirebaseFirestore.Transaction,
    db: FirebaseFirestore.Firestore,
    userId: string,
    session: unknown,
): Promise<void> {
    const normalizedUserId = requireOnboardingUserId(userId);
    const userRef = db.collection(DB_COLLECTIONS.USERS).doc(normalizedUserId);
    const userSnapshot = await transaction.get(userRef);
    if (
        !userSnapshot.exists
        || !isCurrentUserAvailableForOnboarding({
            documentId: userSnapshot.id,
            session,
            userData: userSnapshot.data(),
        })
    ) {
        throw new OnboardingUserUnavailableError();
    }
}

// ═══════════════════════════════════════════════════════════════
// Pre-Transaction Helpers
// ═══════════════════════════════════════════════════════════════

const MIN_SUBDOMAIN_LENGTH = 3;
const MAX_SUBDOMAIN_LENGTH = 63;

export function normalizeSubdomainCandidate(value: string): string {
    const candidate = slugify(value).toLowerCase().slice(0, MAX_SUBDOMAIN_LENGTH).replace(/-+$/g, '');
    return candidate.length >= MIN_SUBDOMAIN_LENGTH ? candidate : '';
}

function buildFallbackSubdomain(businessName: string, storeId: number): string {
    const suffix = `-${storeId}`;
    const maxBaseLength = Math.max(0, MAX_SUBDOMAIN_LENGTH - suffix.length);
    const base = normalizeSubdomainCandidate(businessName)
        .slice(0, maxBaseLength)
        .replace(/-+$/g, '');
    const fallback = base ? `${base}${suffix}` : `store-${storeId}`;
    return normalizeSubdomainCandidate(fallback) || `store-${storeId}`;
}

/**
 * Advisory pre-check before the creation transaction. The transaction still
 * reads the durable claim plus current/redirect query ranges and owns the
 * final decision; this result only avoids choosing a known collision first.
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
    const subdomain = normalizeSubdomainCandidate(slugSource || businessName);
    if (!subdomain || isReservedSubdomain(subdomain)) {
        return '';
    }

    try {
        await db.runTransaction((transaction) => readSubdomainReservationInTransaction({
            db,
            nowMillis: Date.now(),
            storeId: '__precheck__',
            subdomain,
            tenantId: '__precheck__',
            transaction,
        }));
    } catch (error) {
        if (isSubdomainUnavailableError(error)) return '';
        throw error;
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
        businessCategory: explicitBusinessCategory,
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
        allowInitialCounters = false,
    } = config;

    // 1. Read platformSummary (with transaction lock — prevents race conditions)
    const platformSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(PLATFORM_COUNTER_DOCUMENT_ID);
    const legacyPlatformSummaryRef = db
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(LEGACY_PLATFORM_COUNTER_DOCUMENT_ID);
    const storesSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary');
    const [platformSummary, legacyPlatformSummary, storesSummary] = await Promise.all([
        transaction.get(platformSummaryRef),
        transaction.get(legacyPlatformSummaryRef),
        transaction.get(storesSummaryRef),
    ]);

    const summaryData = platformSummary.data();
    const legacySummaryData = legacyPlatformSummary.data();
    const storesSummaryData = storesSummary.data();
    const currentTenantCount = resolvePlatformCounterFloor(
        summaryData,
        legacySummaryData,
        storesSummaryData,
        'tenant',
    );
    const currentStoreCount = resolvePlatformCounterFloor(
        summaryData,
        legacySummaryData,
        storesSummaryData,
        'store',
    );

    const hasUsableCounters = currentTenantCount > 0 && currentStoreCount > 0;
    const canBootstrapCounters = allowInitialCounters && currentTenantCount >= 0 && currentStoreCount >= 0;
    if (!hasUsableCounters && !canBootstrapCounters) {
        throw new Error('Platform summary not found and storesSummary cannot bootstrap counters');
    }

    const newTenantId = await findNextAvailablePlatformEntityId(
        currentTenantCount,
        async (candidateId) => (
            await transaction.get(db.collection(DB_COLLECTIONS.TENANTS).doc(String(candidateId)))
        ).exists,
    );
    const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(String(newTenantId));
    const newStoreId = await findNextAvailablePlatformEntityId(
        currentStoreCount,
        async (candidateId) => (
            await transaction.get(db.collection(DB_COLLECTIONS.STORES).doc(String(candidateId)))
        ).exists,
    );
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(newStoreId));
    const now = admin.firestore.Timestamp.now();

    // 2. Derive computed fields
    const storeName = storeNameOverride || 'Main Store';
    const tenantKey = businessName.toLowerCase().replaceAll(' ', '_');
    const storeKey = storeName.toLowerCase().replaceAll(' ', '_');
    const businessCategory = resolveStoreBusinessCategory(businessType, explicitBusinessCategory);
    const defaultRoles = createDefaultRoles(newStoreId, email || 'system');
    const resolvedBusinessDayEndTime = resolveBusinessDayEndTime(businessType, businessDayEndTime, businessCategory);
    const schedulerHour = computeSchedulerHour(timeZone, resolvedBusinessDayEndTime);

    // 3. Resolve and transactionally reserve subdomain (if requested)
    let autoSubdomain: string | undefined;
    let subdomainReservation: SubdomainReservation | undefined;
    if (subdomainConfig) {
        const requestedSubdomain = normalizeSubdomainCandidate(subdomainConfig.preChecked || '');
        const fallbackSubdomain = buildFallbackSubdomain(businessName, newStoreId);
        const candidates = Array.from(new Set([requestedSubdomain, fallbackSubdomain]))
            .filter((candidate) => candidate && !isReservedSubdomain(candidate));
        for (const candidate of candidates) {
            try {
                subdomainReservation = await readSubdomainReservationInTransaction({
                    db,
                    nowMillis: now.toMillis(),
                    storeId: String(newStoreId),
                    subdomain: candidate,
                    tenantId: String(newTenantId),
                    transaction,
                });
                autoSubdomain = candidate;
                break;
            } catch (error) {
                if (isSubdomainUnavailableError(error)) continue;
                throw error;
            }
        }
        if (!autoSubdomain || !subdomainReservation) throw new Error('subdomain_allocation_conflict');
    }

    // 4. Generate time slot presets (if requested)
    const timeSlotPresets = includeTimeSlotPresets
        ? getDefaultTimeSlotPresets(businessType, newTenantId, newStoreId, businessCategory)
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
    if (subdomainReservation) {
        writeCurrentSubdomainClaim(transaction, subdomainReservation, now);
    }

    // 8. Sync storesSummary (for Cloud Function cost optimization)
    transaction.set(
        storesSummaryRef,
        {
            lastUpdated: now,
            stores: {
                [newStoreId]: {
                    tId: newTenantId,
                    businessType,
                    businessCategory,
                    active: true,
                    name: storeName,
                    tenantName: businessName,
                    ...(autoSubdomain ? { subdomain: autoSubdomain } : {}),
                    isMaster: true,
                    city: storeExtra?.city || '',
                    addressLine: storeExtra?.addressLine || '',
                    logo: storeExtra?.logo || '',
                    workingHours: storeExtra?.workingHours || {},
                    ...(timeZone ? { timeZone } : {}),
                    businessDayEndTime: resolvedBusinessDayEndTime,
                    schedulerHour,
                    ...(storeExtra?.activePlanType ? { activePlanType: storeExtra.activePlanType } : {}),
                    modifiedOn: now,
                },
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
 * Use for flows where the user already exists (website onboarding, Answerlattice, public menu entry).
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
    const normalizedUserId = requireOnboardingUserId(userId);
    const userRef = db.collection(DB_COLLECTIONS.USERS).doc(normalizedUserId);
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
