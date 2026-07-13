import { DB_COLLECTIONS } from "@constant/database";
import { resolveStoreBusinessCategory } from "@data/shared/businessTypes";
import {
    parsePlatformStoreSummary,
    type PlatformStoreSummaryData,
} from "@data/shared/storeSummaryBoundary";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import {
    allocateNextPlatformEntityId,
    readPlatformCounterSnapshot,
    type PlatformEntityCounter,
} from "@lib/platform/platformCounterAllocator";
import { doc, getDoc } from "firebase/firestore";

/**
 * STORES SUMMARY PATTERN
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * Single document containing minimal data for all stores.
 * Used by Cloud Functions to avoid N reads when processing all stores.
 * 
 * Document: platformSummary/storesSummary
 * 
 * Structure:
 * {
 *   lastUpdated: Timestamp,
 *   stores: {
 *     "storeId": { tId: number, businessType: string, active: boolean, name: string, tenantName: string, subdomain?: string }
 *   }
 * }
 * 
 * See: __docs__/patterns/summary-document-pattern.md
 */

export interface StoreSummaryData {
    tId: number;
    businessType: string;
    businessCategory: string;  // Derived from businessType, used by Cloud Functions
    active: boolean;
    blocked?: boolean;
    tenantBlocked?: boolean;
    name: string;
    tenantName?: string;
    subdomain?: string;
    isMaster?: boolean;
    outletSlug?: string;
    city?: string;
    addressLine?: string;
    logo?: string;
    workingHours?: Record<string, string>;
    timeZone?: string;         // IANA timezone (e.g., 'Asia/Kolkata') — used for DST-safe runtime scheduling
    businessDayEndTime?: string; // Store-local HH:mm analytics business-day cutoff
    schedulerHour?: number;    // UTC hour (0-23) — FALLBACK ONLY when timeZone is missing
    activePlanType?: string;    // Denormalized billing plan id for scheduler entitlements, e.g. 'starter' | 'pro' | 'premium'
    menuPresence?: StoreDistributionPresenceSummary;
    presence?: StoreDistributionPresenceSummary;
    modifiedOn?: unknown;
}

type StorePresenceValue = boolean | string | null | { linked?: boolean | null };

export type StoreDistributionPresenceSummary = {
    appleBusiness?: StorePresenceValue;
    bingPlaces?: StorePresenceValue;
    googleBusiness?: StorePresenceValue;
    instagramBio?: StorePresenceValue;
    qrCodeInstalled?: StorePresenceValue;
    qrInstalled?: StorePresenceValue;
    websiteLinked?: StorePresenceValue;
    websiteMenuLink?: StorePresenceValue;
    whatsappProfile?: StorePresenceValue;
    instagramLinked?: StorePresenceValue;
    instagramBioLinked?: StorePresenceValue;
    whatsappLinked?: StorePresenceValue;
    whatsappMenuLinked?: StorePresenceValue;
};

export interface StoresSummary {
    lastUpdated: unknown;
    stores: Record<string, PlatformStoreSummaryData>;
}

const COLLECTION = DB_COLLECTIONS.PLATFORM_SUMMARY;

export const getPlatformSummary = async () => {
    return await apiCallComposer(
        () => readPlatformCounterSnapshot(firebaseClient),
        "getPlatformSummary"
    );
}

export const reserveNextPlatformEntityId = async (counter: PlatformEntityCounter): Promise<number> => {
    return await apiCallComposer(
        () => allocateNextPlatformEntityId(firebaseClient, counter),
        { counter },
        "reserveNextPlatformEntityId"
    );
}


// ============================
// STORES SUMMARY (Cost Optimization)
// ============================

const getStoresSummaryDocRef = () => {
    return doc(firebaseClient, `${COLLECTION}`, 'storesSummary')
}

const STORE_DISTRIBUTION_PRESENCE_KEYS: Array<keyof StoreDistributionPresenceSummary> = [
    'appleBusiness',
    'bingPlaces',
    'googleBusiness',
    'instagramBio',
    'qrCodeInstalled',
    'qrInstalled',
    'websiteLinked',
    'websiteMenuLink',
    'whatsappProfile',
    'instagramLinked',
    'instagramBioLinked',
    'whatsappLinked',
    'whatsappMenuLinked',
];

const normalizePresenceValue = (value: unknown): StorePresenceValue | undefined => {
    if (value === null) return null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().slice(0, 120);
        return normalized || null;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const linked = (value as { linked?: unknown }).linked;
        if (linked === null) {
            return { linked: null };
        }
        if (typeof linked === 'boolean') {
            return { linked };
        }
    }
    return undefined;
};

export const buildStoreDistributionPresenceSummary = (
    value: unknown,
): StoreDistributionPresenceSummary | undefined => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }

    const source = value as Record<string, unknown>;
    const summary = STORE_DISTRIBUTION_PRESENCE_KEYS.reduce<StoreDistributionPresenceSummary>((acc, key) => {
        if (!Object.prototype.hasOwnProperty.call(source, key)) return acc;
        const normalized = normalizePresenceValue(source[key]);
        if (normalized !== undefined) {
            acc[key] = normalized;
        }
        return acc;
    }, {});

    return Object.keys(summary).length > 0 ? summary : undefined;
};

export const buildStoreSummaryEntry = (data: StoreSummaryData): Record<string, unknown> => {
    const businessCategory = resolveStoreBusinessCategory(data.businessType, data.businessCategory);
    const summaryEntry: Record<string, unknown> = {
        tId: data.tId,
        businessType: data.businessType || 'unknown',
        businessCategory,
        active: data.active ?? true,
        blocked: data.blocked ?? false,
        name: data.name || '',
        tenantName: data.tenantName || '',
    };
    if (data.tenantBlocked !== undefined) summaryEntry.tenantBlocked = data.tenantBlocked;
    if (data.subdomain !== undefined) summaryEntry.subdomain = data.subdomain || '';
    if (data.timeZone) summaryEntry.timeZone = data.timeZone;
    if (data.businessDayEndTime) summaryEntry.businessDayEndTime = data.businessDayEndTime;
    if (data.isMaster !== undefined) summaryEntry.isMaster = data.isMaster;
    if (data.outletSlug !== undefined) summaryEntry.outletSlug = data.outletSlug;
    if (data.city !== undefined) summaryEntry.city = data.city || '';
    if (data.addressLine !== undefined) summaryEntry.addressLine = data.addressLine || '';
    if (data.logo !== undefined) summaryEntry.logo = data.logo || '';
    if (data.workingHours !== undefined) summaryEntry.workingHours = data.workingHours || {};
    if (data.schedulerHour !== undefined) summaryEntry.schedulerHour = data.schedulerHour;
    if (data.activePlanType !== undefined) summaryEntry.activePlanType = data.activePlanType;
    if (data.menuPresence !== undefined) {
        summaryEntry.menuPresence = buildStoreDistributionPresenceSummary(data.menuPresence) || {};
    }
    if (data.presence !== undefined) {
        summaryEntry.presence = buildStoreDistributionPresenceSummary(data.presence) || {};
    }
    if (data.modifiedOn !== undefined) summaryEntry.modifiedOn = data.modifiedOn;
    return summaryEntry;
};

/**
 * Get all stores summary data (1 read instead of N)
 * Used by Cloud Functions for batch processing
 */
export const getStoresSummary = async (): Promise<StoresSummary | null> => {
    return await apiCallComposer(
        async () => {
            const docSnap = await getDoc(getStoresSummaryDocRef());
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    lastUpdated: data.lastUpdated ?? null,
                    stores: parsePlatformStoreSummary(data),
                } satisfies StoresSummary;
            }
            return null;
        },
        "getStoresSummary"
    );
}
