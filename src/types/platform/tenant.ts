import { Timestamp } from "firebase/firestore";
import type { PlatformBlockDetails } from "./blocking";
import { MinimalStoreDataType } from "./store";

/**
 * TenantDataType — Account-level container
 *
 * ARCHITECTURE DECISION (Feb 15, 2026):
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Tenant = account container (billing, stores list, outlet locks)
 * Store  = rendering source (logo, name, address, hours, menu)
 *
 * For rendering (menus, OBP, public pages): ONLY read from store.
 * Tenant is NEVER fetched during public page rendering.
 *
 * Identity fields (logo, address, contact, locale) exist here for
 * platform admin use only. In normal user flow, these are managed
 * at store level via Business Settings → updateStore().
 *
 * @see __docs__/official-business-page/official-business-page_impl.md §2
 */
export type TenantDataType = {
    // ─────────────────────────────────────────────────────────────
    // ACCOUNT IDENTITY (actively used in normal flow)
    // ─────────────────────────────────────────────────────────────

    tenantId?: number;
    tenantKey: string;

    active: boolean;
    blocked?: boolean;
    blockDetails?: PlatformBlockDetails;
    deleted: boolean;
    verified?: boolean;

    businessEntityType?: 'B2B' | 'B2C';

    name: string;
    email: string;
    phoneNumber?: string;
    businessType?: string;

    createdBy?: string;
    createdOn?: string;

    storesList: MinimalStoreDataType[];

    // ─────────────────────────────────────────────────────────────
    // MULTI-OUTLET (Feature #4C)
    // ─────────────────────────────────────────────────────────────

    outletCreationLock?: boolean;
    outletCreationLockAt?: Timestamp;

    // ─────────────────────────────────────────────────────────────
    // PLATFORM ADMIN FIELDS (not used in normal user flow)
    // These duplicate store-level fields and exist only for the
    // internal platform admin tenant editor (tenantDetailsModal.tsx).
    // In normal flow, all identity/branding is managed at store level.
    // ─────────────────────────────────────────────────────────────

    logo?: string;
    countryCode?: string;
    alternatePhoneNumber?: string;
    description?: string;
    gstn?: string;
    domain?: string;
    subDomain?: string;
    url?: string;

    licenceKey?: string;
    licenceExpiryDate?: string;

    addressLine?: string;
    area?: string;
    district?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;

    timeZone?: string;
    dateFormat?: string;
    timeFormat?: string;
    language?: string;

    currencyCode?: string;
    currencySymbol?: string;

    contactPersonName?: string;
    contactPersonEmail?: string;
    contactPersonNumber?: string;

    // ─────────────────────────────────────────────────────────────
    // ONBOARDING TRACKING
    // @see __docs__/reseller-dashboard/
    // ─────────────────────────────────────────────────────────────
    onboardingSource?: 'WEBSITE_ONBOARDING' | 'RESELLER_ONBOARDING' | 'MESSAGING_ONBOARDING' | 'PUBLIC_MENU_ENTRY';
    starterActivationStatus?: 'preview_created' | 'starter_active' | 'payment_pending' | 'active_paid' | 'starter_expired' | 'archived';
    starterActivatedAt?: Timestamp;
    activationDeadline?: Timestamp;
    resellerId?: string;              // Reseller profile ID (if onboarded by reseller)
};
