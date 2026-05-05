/**
 * OBP Content — Async Server Component
 *
 * Fetches store data and renders the Official Business Page.
 * Wrapped in Suspense boundary by the parent page.
 *
 * @see __docs__/official-business-page/official-business-page_impl.md §7
 */

import MenuBreadcrumb from "@/app/client/[[...slug]]/MenuBreadcrumb";
import TempStatusBanner from "@atoms/TempStatusBanner";
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import GlobalLanguagesList from "@data/languages";
import PublicMenuListAttribution from "@/components/customer/PublicMenuListAttribution";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import {
    getStoreByCustomDomain,
    getStoreBySubdomain,
} from "@lib/firestore/clientStoreLookup";
import { parseSummaryProjects } from "@lib/firestore/parseSummaryProjects";
import { getResolvedAnalyticsPreferences } from "@lib/analytics/preferences";
import { getBrandName, getStoreContextName, getStoreName } from "@lib/businessIdentity/names";
import {
    appendPublicLanguageParam,
    getNextIntlLocaleForPublicLanguage,
    getPublicLanguageOptions,
    resolveStorePublicLanguage,
    shouldExposePublicLanguageSwitcher,
} from "@lib/localization/publicRenderLanguage";
import { getLocalizedText, getPrimaryLocalizedLanguage } from "@lib/localization/text";
import { getTenantFromHeaders as sharedGetTenantFromHeaders } from "@lib/multiTenant/getTenantFromHeaders";
import { getBusinessAttributeConfigForType, normalizeCustomBusinessAttributes } from "@lib/obp/businessAttributes";
import { generateOBPUrl, getDefaultProjectUrl } from "@lib/obp/generateOBPUrl";
import { getStoreOpenStatus } from "@lib/obp/hoursStatus";
import { resolveHoursOutput } from "@lib/outputControl";
import { buildFaqSchema } from "@lib/schema";
import { formatClockTime } from '@util/dateTime';
import {
    doc,
    getDoc
} from "firebase/firestore";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import {
    LuBadgeCheck,
    LuBanknote,
    LuCalendarDays,
    LuCar,
    LuCheck,
    LuClock,
    LuCreditCard,
    LuDog,
    LuInfo,
    LuIndianRupee,
    LuLeaf,
    LuMapPin,
    LuMusic,
    LuParkingCircle,
    LuShieldCheck,
    LuShoppingBag,
    LuSprout,
    LuStore,
    LuTrees,
    LuTruck,
    LuUtensils,
    LuWheatOff,
    LuWifi,
    LuWind,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import BrandOBPContent from "./BrandOBPContent";
import OBPActions from "./OBPActions";
import OBPAnalytics from "./OBPAnalytics";
import OBPCustomerAppMount from "./OBPCustomerAppMount";
import OBPExternalLinks from "./OBPExternalLinks";
import OBPLanguageSwitcher from "./OBPLanguageSwitcher";
import OBPMenuCTA from "./OBPMenuCTA";
import OBPPhotoStrip from "./OBPPhotoStrip";
import OBPThemeToggle from "./OBPThemeToggle";
import { getOBPTranslations } from "./i18n";
import styles from "./obp.module.scss";
import { generateOBPSchema } from "./schema";

// ── Timeout + Retry (same patterns as menu page) ──

async function withTimeout<T>(promise: Promise<T>, ms: number = 5000): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`OBP: Firestore read timed out after ${ms}ms`)), ms)
        ),
    ]);
}

async function withRetry<T>(
    fn: () => Promise<T>,
    retries: number = 1,
    delayMs: number = 1000,
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return withRetry(fn, retries - 1, delayMs);
        }
        throw error;
    }
}

// ── Store lookup — shared with other client pages via @lib/firestore/clientStoreLookup ──

// ── Check if store has at least one published menu ──
// OPT-2: Uses projectsSummary (1 doc read) instead of legacy metadata WHERE query (N reads)

/**
 * OBP menu info — consolidated (G-05 + G-06 PUBLIC-ROUTING-DOCTRINE).
 *
 * Single cached read of `platformSummary/projects_{storeId}` that returns
 * everything OBP's render needs: the hasMenu boolean (D-03 gating),
 * the default project for the "View Menu" CTA (G-05), and the full active
 * projects list for per-project CTA rendering (G-06).
 *
 * D-15 (performance bound): still 1 cached Firestore read total.
 */
interface ObpMenuInfo {
    hasMenu: boolean;
    defaultSlug: string | undefined;
    /** Active menu projects ordered with the default first. Active special menus use their base project URL. */
    projects: Array<{
        projectId: string;
        slug: string;
        name: string | Record<string, string>;
        isDefault: boolean;
        projectImage?: string | null;
        isSpecialMenu?: boolean;
        specialMenuBaseProjectId?: string;
        specialMenuDisplayName?: string | Record<string, string>;
    }>;
}

const getObpMenuInfo = unstable_cache(
    async (storeId: number, activeSpecialMenuId?: string): Promise<ObpMenuInfo> => {
        const empty: ObpMenuInfo = { hasMenu: false, defaultSlug: undefined, projects: [] };
        try {
            const summaryRef = doc(
                firebaseClient,
                DB_COLLECTIONS.PLATFORM_SUMMARY || "platformSummary",
                `projects_${storeId}`,
            );
            const summarySnap = await getDoc(summaryRef);
            if (!summarySnap.exists()) return empty;
            const raw = parseSummaryProjects(summarySnap.data());
            const entries = Object.entries(raw).map(([projectId, data]: [string, any]) => ({ projectId, ...data }));
            const activeRegular = entries.filter(
                (p: any) => p.active !== false && p.deleted !== true && !p.isSpecialMenu
            );
            if (activeRegular.length === 0) return empty;

            // Order: explicit default first, then everything else.
            const defaultProj: any = activeRegular.find((p: any) => p.isDefault === true) || activeRegular[0];
            const activeSpecial = activeSpecialMenuId
                ? entries.find((p: any) => {
                    if (p.projectId !== activeSpecialMenuId) return false;
                    if (p.active === false || p.deleted === true || p.isSpecialMenu !== true) return false;
                    if (p.specialMenuStatus !== 'active') return false;
                    const endsAtMs = p.specialMenuEndsAt ? new Date(p.specialMenuEndsAt).getTime() : null;
                    return !endsAtMs || endsAtMs > Date.now();
                })
                : null;
            const others = activeRegular.filter((p: any) => p !== defaultProj);
            const ordered = [
                ...(activeSpecial ? [activeSpecial] : []),
                defaultProj,
                ...others,
            ];

            const projects = ordered
                .map((p: any) => ({
                    projectId: p.projectId,
                    slug: (p.slug as string) || '',
                    name: p.isSpecialMenu ? (p.specialMenuDisplayName || p.name) : p.name,
                    isDefault: !p.isSpecialMenu && p === defaultProj,
                    projectImage: (p.projectImage as string) || null,
                    isSpecialMenu: p.isSpecialMenu === true,
                    specialMenuBaseProjectId: p.specialMenuBaseProjectId,
                    specialMenuDisplayName: p.specialMenuDisplayName,
                }))
                .map((p) => {
                    if (!p.isSpecialMenu) return p;
                    const baseProject = activeRegular.find((project: any) => project.projectId === p.specialMenuBaseProjectId) || defaultProj;
                    return {
                        ...p,
                        slug: (baseProject?.slug as string) || p.slug,
                    };
                })
                .filter((p) => p.slug && p.name);

            return {
                hasMenu: true,
                defaultSlug: (defaultProj?.slug as string) || undefined,
                projects,
            };
        } catch {
            return empty;
        }
    },
    ['obp-menu-info'],
    { revalidate: 60, tags: ['client-stores'] }
);

// ── Count active stores for multi-store brand detection (URL Routing Architecture — Phase 2) ──
// OPT-3: Uses storesSummary doc (1 read) instead of full stores collection scan (N reads)

const countActiveStoresForTenant = unstable_cache(
    async (tenantId: number): Promise<number> => {
        try {
            const summaryRef = doc(
                firebaseClient,
                DB_COLLECTIONS.PLATFORM_SUMMARY || "platformSummary",
                "storesSummary",
            );
            const summarySnap = await getDoc(summaryRef);
            if (!summarySnap.exists()) return 1;
            const stores = summarySnap.data()?.stores || {};
            return Object.values(stores).filter(
                (s: any) => s.tId === tenantId && s.active !== false
            ).length;
        } catch {
            return 1; // Default to single-store on error
        }
    },
    ['obp-tenant-store-count'],
    { revalidate: 60, tags: ['client-stores'] }
);

// ── Tenant info from headers — shared with other client pages ──

async function getTenantFromHeaders() {
    return sharedGetTenantFromHeaders('OBPContent');
}

// ── Format today's hours for display ──

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function getTodayDayKey(timeZone: string | undefined): string {
    const tz = timeZone || 'Asia/Kolkata';
    try {
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
        const dayStr = formatter.format(new Date()).toLowerCase().slice(0, 3);
        return DAY_KEYS.includes(dayStr) ? dayStr : DAY_KEYS[new Date().getDay()];
    } catch {
        return DAY_KEYS[new Date().getDay()];
    }
}

function getTodayHoursDisplay(workingHours: Record<string, string> | undefined, timeZone: string | undefined, t: (key: string, values?: Record<string, any>) => string): string | null {
    if (!workingHours) return null;

    const todayHours = workingHours[getTodayDayKey(timeZone)];

    if (!todayHours || todayHours.toLowerCase() === 'closed') return t('publicClosedToday');

    const [openTime, closeTime] = todayHours.split('-').map((time) => time.trim());
    if (!openTime || !closeTime) return t('publicOpenToday', { hours: todayHours.replace('-', ' – ') });
    return t('publicOpenToday', { hours: `${formatClockTime(openTime)} – ${formatClockTime(closeTime)}` });
}

function getSafeGoogleMapsEmbedUrl(url?: string): string | null {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        const isGoogleHost = ['www.google.com', 'google.com', 'maps.google.com'].includes(parsed.hostname);
        if (parsed.protocol === 'https:' && isGoogleHost && parsed.pathname.startsWith('/maps/embed')) {
            return parsed.toString();
        }
    } catch {
        return null;
    }
    return null;
}

function getValidCoordinate(value: unknown): number | null {
    const numberValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
}

function buildGoogleMapsEmbedUrl(params: {
    address?: string;
    apiKey?: string;
    geo?: { latitude?: unknown; longitude?: unknown };
    googleMapsUrl?: string;
}): string | null {
    const safeOwnerEmbedUrl = getSafeGoogleMapsEmbedUrl(params.googleMapsUrl);
    if (safeOwnerEmbedUrl) return safeOwnerEmbedUrl;

    if (!params.apiKey) return null;

    const latitude = getValidCoordinate(params.geo?.latitude);
    const longitude = getValidCoordinate(params.geo?.longitude);
    const query = latitude !== null && longitude !== null
        ? `${latitude},${longitude}`
        : params.address?.trim();

    if (!query) return null;

    const searchParams = new URLSearchParams({
        key: params.apiKey,
        q: query,
        zoom: '16',
    });

    return `https://www.google.com/maps/embed/v1/place?${searchParams.toString()}`;
}

// ── Freshness signal text ──

function getFreshnessText(modifiedOn: any, t: (key: string) => string): string | null {
    if (!modifiedOn) return null;

    let date: Date;
    try {
        if (typeof modifiedOn === 'string') {
            date = new Date(modifiedOn);
        } else if (modifiedOn?.toDate) {
            date = modifiedOn.toDate();
        } else if (modifiedOn?.seconds) {
            date = new Date(modifiedOn.seconds * 1000);
        } else {
            return null;
        }
    } catch {
        return null;
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return t('publicInfoVerifiedToday');
    if (diffDays < 7) return t('publicInfoVerifiedThisWeek');
    if (diffDays < 30) return t('publicInfoVerifiedThisMonth');
    return null; // Don't show stale freshness — silence is better than "updated 6 months ago"
}

// ── Full hours display for AEO (all 7 days, SSR) ──

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function getAllHoursDisplay(workingHours: Record<string, string> | undefined, t: (key: string) => string, todayKey?: string): React.ReactNode | null {
    if (!workingHours || Object.keys(workingHours).length === 0) return null;

    const rows = DAY_ORDER.map(day => {
        const hours = workingHours[day];
        const isClosed = !hours || hours.toLowerCase() === 'closed';
        const display = hours
            ? hours.toLowerCase() === 'closed'
                ? t('publicClosed')
                : (() => {
                    const [openTime, closeTime] = hours.split('-').map((time) => time.trim());
                    if (!openTime || !closeTime) return hours.replace('-', ' – ');
                    return `${formatClockTime(openTime)} – ${formatClockTime(closeTime)}`;
                })()
            : t('publicClosed');
        const isToday = todayKey === day;
        return (
            <div key={day} className={`${styles.hoursRow} ${isToday ? styles.hoursRowToday : ''}`}>
                <span className={styles.hoursDay}>{t(`publicDays.${day}`)}</span>
                <span className={`${styles.hoursTime} ${isClosed ? styles.hoursClosed : ''}`}>{display}</span>
            </div>
        );
    });

    return <>{rows}</>;
}

// ── Service modes from businessAttributes ──

function buildServiceModes(attributes?: Record<string, boolean>): string[] {
    if (!attributes) return [];
    const modes: string[] = [];
    if (attributes.dineIn) modes.push('dineIn');
    if (attributes.takeaway) modes.push('takeaway');
    if (attributes.delivery) modes.push('delivery');
    if (attributes.driveThrough) modes.push('driveThrough');
    return modes;
}

// ── Payment methods from businessAttributes ──

function buildPaymentMethods(attributes?: Record<string, boolean>): string[] {
    if (!attributes) return [];
    const methods: string[] = [];
    if (attributes.acceptsCash) methods.push('cash');
    if (attributes.acceptsCards) methods.push('cards');
    if (attributes.acceptsUPI) methods.push('upi');
    return methods;
}

function getServiceModeIcon(mode: string): IconType {
    switch (mode) {
        case 'dineIn':
            return LuUtensils;
        case 'takeaway':
            return LuShoppingBag;
        case 'delivery':
            return LuTruck;
        case 'driveThrough':
            return LuCar;
        default:
            return LuStore;
    }
}

function getPaymentIcon(method: string): IconType {
    switch (method) {
        case 'cash':
            return LuBanknote;
        case 'cards':
            return LuCreditCard;
        case 'upi':
            return LuIndianRupee;
        default:
            return LuCreditCard;
    }
}

function getBusinessAttributeIcon(key: string): IconType {
    switch (key) {
        case 'vegetarian':
            return LuLeaf;
        case 'vegan':
            return LuSprout;
        case 'halal':
            return LuShieldCheck;
        case 'glutenFree':
            return LuWheatOff;
        case 'wifi':
            return LuWifi;
        case 'outdoorSeating':
            return LuTrees;
        case 'parking':
            return LuParkingCircle;
        case 'airConditioning':
            return LuWind;
        case 'liveMusic':
            return LuMusic;
        case 'petFriendly':
            return LuDog;
        case 'dineIn':
        case 'takeaway':
        case 'delivery':
        case 'driveThrough':
            return getServiceModeIcon(key);
        case 'acceptsCards':
            return LuCreditCard;
        case 'acceptsUPI':
            return LuIndianRupee;
        case 'acceptsCash':
            return LuBanknote;
        default:
            return LuBadgeCheck;
    }
}

type OBPIconVariant = 'icons' | 'emoji';

function getServiceModeEmoji(mode: string): string {
    switch (mode) {
        case 'dineIn':
            return '🍽️';
        case 'takeaway':
            return '🛍️';
        case 'delivery':
            return '🚚';
        case 'driveThrough':
            return '🚗';
        default:
            return '🏪';
    }
}

function getPaymentEmoji(method: string): string {
    switch (method) {
        case 'cash':
            return '💵';
        case 'cards':
            return '💳';
        case 'upi':
            return '₹';
        default:
            return '💳';
    }
}

function getBusinessAttributeEmoji(key: string): string {
    switch (key) {
        case 'vegetarian':
            return '🌿';
        case 'vegan':
            return '🌱';
        case 'halal':
            return '✅';
        case 'glutenFree':
            return '🚫';
        case 'wifi':
            return '📶';
        case 'outdoorSeating':
            return '🌳';
        case 'parking':
            return '🅿️';
        case 'airConditioning':
            return '❄️';
        case 'liveMusic':
            return '🎵';
        case 'petFriendly':
            return '🐾';
        case 'dineIn':
        case 'takeaway':
        case 'delivery':
        case 'driveThrough':
            return getServiceModeEmoji(key);
        case 'acceptsCards':
            return '💳';
        case 'acceptsUPI':
            return '₹';
        case 'acceptsCash':
            return '💵';
        default:
            return '✓';
    }
}

function renderDisplayIcon(iconVariant: OBPIconVariant, Icon: IconType, emoji: string, size: number = 15) {
    return iconVariant === 'emoji'
        ? <span aria-hidden="true" className={styles.displayEmoji}>{emoji}</span>
        : <Icon aria-hidden="true" size={size} />;
}

interface OBPIconItem {
    key: string;
    label: string;
    Icon?: IconType;
    fallbackIcon?: string;
}

function renderIconTile(item: OBPIconItem) {
    const Icon = item.Icon;
    return (
        <div key={item.key} className={styles.iconTile}>
            <span className={styles.iconTileSymbol}>
                {Icon ? <Icon aria-hidden="true" size={19} /> : <span aria-hidden="true" className={styles.iconTileEmoji}>{item.fallbackIcon}</span>}
            </span>
            <span className={styles.iconTileLabel}>{item.label}</span>
        </div>
    );
}

function isLegacySpecialNoteHelper(value: string): boolean {
    const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase();
    return normalized === 'shown on the official business page. use for service charges, today-only notes, or important customer information.';
}

function getLocalizedPublicText(value: unknown, language: string, fallback: string = ''): string {
    if (typeof value === 'string') return value.trim() || fallback;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;

    const entries = Object.entries(value as Record<string, unknown>);
    const candidates = [
        language,
        language.split('-')[0],
        getNextIntlLocaleForPublicLanguage(language),
        getNextIntlLocaleForPublicLanguage(language).split('-')[0],
    ].map((candidate) => candidate.trim()).filter(Boolean);

    for (const candidate of candidates) {
        const match = entries.find(([key]) => key.toLowerCase() === candidate.toLowerCase());
        const text = typeof match?.[1] === 'string' ? match[1].trim() : '';
        if (text) return text;
    }

    const english = entries.find(([key]) => key.toLowerCase() === 'en');
    const englishText = typeof english?.[1] === 'string' ? english[1].trim() : '';
    if (englishText) return englishText;

    const firstText = entries.map(([, entry]) => (typeof entry === 'string' ? entry.trim() : '')).find(Boolean);
    return firstText || fallback;
}

// ── Build full address string ──

function getFullAddress(store: any): string | null {
    const parts = [
        store?.addressLine,
        store?.area,
        store?.city,
        store?.state,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
}

function localizeStatusText(value: string | undefined, t: (key: string, values?: Record<string, any>) => string): string {
    if (!value) return '';
    const normalized = value.trim().toLowerCase();
    if (normalized === 'hours not available') return t('publicHoursNotAvailable');
    if (normalized === 'open now') return t('publicOpen');
    if (normalized === 'closed') return t('publicClosed');
    return value;
}

function localizeStatusNextChange(value: string | undefined, t: (key: string, values?: Record<string, any>) => string): string {
    if (!value) return '';
    const trimmed = value.trim();
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('closes ')) {
        return t('publicClosesAt', { time: trimmed.slice('Closes '.length) });
    }
    if (lower.startsWith('opens ')) {
        const target = trimmed.slice('Opens '.length);
        if (target.toLowerCase() === 'tomorrow') return t('publicOpensTomorrow');
        const dayKey = target.slice(0, 3).toLowerCase();
        const localizedDay = t(`publicDays.${dayKey}`);
        return t('publicOpensOn', { day: localizedDay === `publicDays.${dayKey}` ? target : localizedDay });
    }
    return trimmed;
}

// ── Main async component ──

interface OBPContentProps {
    /**
     * G-01 (§11 + D-07 PUBLIC-ROUTING-DOCTRINE): when set, OBPContent renders
     * the given outlet's OBP instead of looking up a store from the request
     * hostname. MenuContent uses this to render `/{outletSlug}` as the outlet
     * OBP surface — the Store surface IS the OBP for that outlet. The
     * multi-store BrandOBP selector branch is skipped because we are
     * explicitly rendering a specific outlet, not the brand root.
     */
    storeOverride?: any;
    /**
     * G-01: origin context for outlet renders. Outlets don't carry their own
     * subdomain/customDomain — those live on the master. When rendering an
     * outlet OBP we need the master's origin to emit absolute URLs for OG,
     * canonical, and schema markup.
     */
    masterSubdomain?: string;
    masterCustomDomain?: string;
    /**
     * T2-N-05 / D-12 PUBLIC-ROUTING-DOCTRINE: master brand display name
     * captured pre-outlet-switch by MenuContent. Used ONLY on outlet OBP
     * renders (storeOverride set) to show the Business → Outlet breadcrumb.
     * Brand OBP renders don't need this — they're the top node themselves.
     */
    masterBrandName?: string;
    requestedLanguage?: string | string[] | null;
}

export default async function OBPContent({
    storeOverride,
    masterSubdomain,
    masterCustomDomain,
    masterBrandName,
    requestedLanguage,
}: OBPContentProps = {}) {
    const { subdomain, customDomain, tenantType } = await getTenantFromHeaders();

    // Lookup store (skipped when an outlet override is supplied by the caller)
    let storeData: any = storeOverride ?? null;
    if (!storeData) {
        if (tenantType === "subdomain" && subdomain) {
            storeData = await withRetry(() => withTimeout(getStoreBySubdomain(subdomain)));
        } else if (tenantType === "custom" && customDomain) {
            storeData = await withRetry(() => withTimeout(getStoreByCustomDomain(customDomain)));
        }
    }

    if (!storeData) {
        notFound();
    }

    const contentLanguage = resolveStorePublicLanguage(storeData, requestedLanguage);

    // URL Routing Architecture — Phase 2: Multi-store brand detection.
    // G-01: skip the BrandOBPContent short-circuit when rendering a specific
    // outlet (storeOverride set) — we are intentionally on the outlet surface,
    // not the brand root.
    if (!storeOverride && storeData.isMaster) {
        const outletCount = await withTimeout(countActiveStoresForTenant(storeData.tenantId));
        if (outletCount > 1) {
            const baseUrl = customDomain
                ? `https://${customDomain}`
                : `https://${subdomain}.menulist.ai`;
            return (
                <BrandOBPContent
                    store={storeData}
                    baseUrl={baseUrl}
                    requestedLanguage={contentLanguage}
                />
            );
        }
    }

    // OPT-1: storeData already contains full store details from subdomain/custom domain lookup
    // Eliminated redundant getStoreById() call — saves 1 Firestore read per OBP page visit.
    // G-05 + G-06: single consolidated read returns hasMenu, default-project slug,
    // and the full active-projects list for per-project CTA rendering.
    const menuInfo = await withTimeout(getObpMenuInfo(storeData.storeId, storeData.activeSpecialMenuId))
        .catch(() => ({ hasMenu: false, defaultSlug: undefined, projects: [] } as ObpMenuInfo));
    const { hasMenu, defaultSlug, projects: activeProjects } = menuInfo;

    const store = storeData;
    const pp = store?.publicPresence || {};
    const iconVariant: OBPIconVariant = pp.iconVariant === 'emoji' ? 'emoji' : 'icons';
    const isPermanentlyClosed = store?.permanentlyClosed === true;
    const t = getOBPTranslations(getNextIntlLocaleForPublicLanguage(contentLanguage));
    const languageOptions = getPublicLanguageOptions(store);
    const showLanguageSwitcher = shouldExposePublicLanguageSwitcher(store);
    const activeLanguageName = GlobalLanguagesList.find((language) => language.code === contentLanguage)?.name || contentLanguage.toUpperCase();

    // Derive values
    const accentColor = pp.accentColor || '#111';
    const descriptor = getLocalizedText(pp.descriptor, contentLanguage, getPrimaryLocalizedLanguage(pp.descriptor, contentLanguage), '');
    const brandName = getBrandName(store, t('publicFallbackBusiness'));
    const storeLocationName = getStoreName(store, brandName);
    const storeName = storeOverride
        ? getStoreContextName(store, brandName)
        : brandName;
    const logo = store?.logo;
    const firstLetter = storeName.charAt(0);

    // Hours status: confidence-gated when ENABLE_OUTPUT_CONTROL is on
    const hoursOutput = FEATURE_FLAGS.ENABLE_OUTPUT_CONTROL
        ? resolveHoursOutput({
            workingHours: store?.workingHours,
            hoursLastUpdatedAt: store?.hoursLastUpdatedAt || store?.modifiedOn,
            timeZone: store?.timeZone,
        })
        : null;
    const status = hoursOutput
        ? { isOpen: hoursOutput.styleHint === "open", statusText: hoursOutput.statusText, nextChange: hoursOutput.secondaryText }
        : getStoreOpenStatus(store?.workingHours, store?.timeZone);
    const showStatusBadge = hoursOutput ? hoursOutput.showStatusBadge : true;
    const statusText = localizeStatusText(status.statusText, t);
    const statusNextChange = localizeStatusNextChange(status.nextChange, t);
    const todayDayKey = getTodayDayKey(store?.timeZone);
    const todayHours = getTodayHoursDisplay(store?.workingHours, store?.timeZone, t);
    const fullAddress = getFullAddress(store);

    // Origin resolution for URL emission. For non-outlet renders the store
    // itself carries subdomain/customDomain. For outlet renders (G-01), those
    // fields live on the MASTER store — passed through as
    // masterSubdomain/masterCustomDomain props by MenuContent.
    const originSubdomain = storeOverride
        ? masterSubdomain
        : (store?.subdomain ?? undefined);
    const originCustomDomain = storeOverride
        ? masterCustomDomain
        : (store?.customDomain ?? undefined);
    const outletPrefix = storeOverride && store?.outletSlug
        ? `/${store.outletSlug}`
        : '';

    // OBP URL: outlet OBP is served at `{master-origin}/{outletSlug}`; the
    // non-outlet OBP is served at the master root.
    const masterBase = generateOBPUrl(originSubdomain, originCustomDomain);
    const obpUrl = storeOverride
        ? `${masterBase}${outletPrefix}`
        : masterBase;

    const withCurrentLanguage = (url: string): string => (
        showLanguageSwitcher ? appendPublicLanguageParam(url, contentLanguage) : url
    );

    // Helper: build a project URL scoped to the current OBP surface (master
    // or outlet). For outlets the URL is prefixed with `/{outletSlug}` so
    // the canonical per-project URL is `/{outletSlug}/{projectSlug}`.
    const buildProjectUrl = (slug?: string): string => {
        if (storeOverride) {
            // Outlet path — absolute, rooted at master origin, with outlet slug.
            if (!slug) {
                return withCurrentLanguage(masterBase
                    ? `${masterBase}${outletPrefix}/menu`
                    : `${outletPrefix}/menu`);
            }
            return withCurrentLanguage(masterBase
                ? `${masterBase}${outletPrefix}/${slug}`
                : `${outletPrefix}/${slug}`);
        }
        return withCurrentLanguage(getDefaultProjectUrl(originSubdomain, originCustomDomain, slug));
    };

    // G-05 / R5 (§9 PUBLIC-ROUTING-DOCTRINE) sub-change 3: OBP's "View Menu"
    // CTA links to the default project's REAL canonical slug URL (e.g.,
    // /food-menu, /services), not the /menu alias. When defaultSlug is
    // unavailable (no published menu), falls back to /menu which Layer 2
    // handles gracefully.
    const menuUrl = buildProjectUrl(defaultSlug);
    const defaultActionProject = activeProjects.find((project) => project.isDefault) || activeProjects.find((project) => !project.isSpecialMenu) || activeProjects[0];
    const feedbackUrl = defaultActionProject?.projectId
        ? `${masterBase}/feedback/${defaultActionProject.projectId}?source=direct_link`
        : '';

    // G-06 (§11 + D-03): per-project-count CTA payload. Each entry carries
    // its real canonical slug URL so clicks go straight to /{projectSlug}
    // (or /{outletSlug}/{projectSlug} for outlet-scoped OBPs). Ordered
    // default-first by getObpMenuInfo so the primary CTA is always the
    // default project.
    const ctaProjects = activeProjects.map((p) => ({
        slug: p.slug,
        name: getLocalizedText(p.name, contentLanguage, getPrimaryLocalizedLanguage(p.name, contentLanguage), t('publicFallbackMenu')),
        isDefault: p.isDefault,
        projectImage: p.projectImage || null,
        url: buildProjectUrl(p.slug),
    })).map((project) => ({
        ...project,
        label: t('publicViewNamedMenu', { name: project.name }),
    }));

    // Action visibility (default to true if data exists)
    const showCall = (pp.showCall !== false) && !!store?.phoneNumber;
    const showWhatsApp = (pp.showWhatsApp !== false) && !!(pp.whatsappNumber || store?.phoneNumber);
    const showDirections = (pp.showDirections !== false) && !!(pp.googleMapsUrl || fullAddress);
    const showReservation = (pp.showReservation !== false) && !!pp.reservationUrl;
    const showOrder = (pp.showOrder !== false) && !!pp.orderUrl;
    const showGoogleReview = (pp.showGoogleReview !== false) && !!pp.googleReviewUrl;
    const showFeedback = (pp.showFeedback !== false) && store?.feedbackEnabled !== false && !!feedbackUrl;

    const whatsappNumber = (pp.whatsappNumber || store?.phoneNumber || '').replace(/[^0-9+]/g, '');
    const directionsUrl = pp.googleMapsUrl || (fullAddress ? `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}` : '');
    const googleMapsEmbedUrl = buildGoogleMapsEmbedUrl({
        address: fullAddress,
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY,
        geo: store?.geo || { latitude: store?.latitude, longitude: store?.longitude },
        googleMapsUrl: pp.googleMapsUrl,
    });

    // Social links
    const socialMedia = store?.socialMedia || {};
    const instagram = socialMedia.instagram;
    const facebook = socialMedia.facebook;
    const twitter = socialMedia.twitter;
    const linkedin = socialMedia.linkedin;
    const youtube = socialMedia.youtube;
    const socialWhatsApp = socialMedia.whatsapp;
    const website = store?.url || socialMedia.website;

    const hasSocials = !!(instagram || facebook || twitter || linkedin || youtube || socialWhatsApp || website);

    // Business attributes → display tags
    const attributeConfig = getBusinessAttributeConfigForType(store?.businessType, store?.businessCategory);
    const attributeTags = attributeConfig
        .filter((attribute) => store?.businessAttributes?.[attribute.key] === true)
        .map((attribute) => ({
            key: attribute.key,
            Icon: iconVariant === 'icons' ? getBusinessAttributeIcon(attribute.key) : undefined,
            fallbackIcon: iconVariant === 'emoji' ? getBusinessAttributeEmoji(attribute.key) : undefined,
            label: t(attribute.publicLabelKey),
        }));
    const customAttributeTags = normalizeCustomBusinessAttributes(pp.customAttributes).map((attribute) => ({
        key: attribute.id,
        Icon: iconVariant === 'icons' && !attribute.icon ? LuBadgeCheck : undefined,
        fallbackIcon: attribute.icon || (iconVariant === 'emoji' ? getBusinessAttributeEmoji(attribute.id) : '+'),
        label: attribute.label,
    }));
    const repeatedStructuredAttributeKeys = new Set([
        'dineIn',
        'takeaway',
        'delivery',
        'driveThrough',
        'acceptsCards',
        'acceptsUPI',
        'acceptsCash',
    ]);
    const allAttributeTags = [
        ...attributeTags.filter((attribute) => !repeatedStructuredAttributeKeys.has(attribute.key)),
        ...customAttributeTags,
    ].slice(0, 12);
    const dietaryAttributeKeys = new Set(['vegetarian', 'vegan', 'halal', 'glutenFree']);
    const dietaryAttributeTags = allAttributeTags.filter((attribute) => dietaryAttributeKeys.has(attribute.key));
    const amenityAttributeTags = allAttributeTags.filter((attribute) => !dietaryAttributeKeys.has(attribute.key));

    // Freshness signal — compute how recently the store was updated
    const freshnessText = getFreshnessText(store?.modifiedOn, t);

    // Established year
    const establishedYear = pp.establishedYear;

    // Known-for identity cue
    const knownFor = getLocalizedText(pp.knownFor, contentLanguage, getPrimaryLocalizedLanguage(pp.knownFor, contentLanguage), '');
    const rawSpecialNote = getLocalizedPublicText(pp.specialNote, contentLanguage, '');
    const specialNote = isLegacySpecialNoteHelper(rawSpecialNote) ? '' : rawSpecialNote.trim();

    // Short area context (city name for quick location recognition)
    const areaContext = store?.area || store?.city || null;

    // Google review reference (P1 — highest impact trust signal)
    const googleReviewUrl = pp.googleReviewUrl;
    const googleRating = pp.googleRating;
    const googleReviewCount = pp.googleReviewCount;
    const hasGoogleReview = !!(googleReviewUrl && googleRating);

    // Business photos: OBP previews the first 3 for speed; tap opens the full owner-managed gallery.
    const photos = (pp.photos || []).filter(Boolean);

    // Structured info for AEO (P3 — full hours, services, payment, cuisine, price)
    const allHours = getAllHoursDisplay(store?.workingHours, t, todayDayKey);
    const serviceModeItems = buildServiceModes(store?.businessAttributes).map((mode) => ({
        key: mode,
        Icon: iconVariant === 'icons' ? getServiceModeIcon(mode) : undefined,
        fallbackIcon: iconVariant === 'emoji' ? getServiceModeEmoji(mode) : undefined,
        label: t(`publicServiceModes.${mode}`),
    }));
    const serviceModeTags = serviceModeItems.map((item) => item.label);
    const paymentItems = buildPaymentMethods(store?.businessAttributes).map((method) => ({
        key: method,
        Icon: iconVariant === 'icons' ? getPaymentIcon(method) : undefined,
        fallbackIcon: iconVariant === 'emoji' ? getPaymentEmoji(method) : undefined,
        label: t(`publicPaymentMethods.${method}`),
    }));
    const paymentTags = paymentItems.map((item) => item.label);
    const cuisineTypes = store?.cuisineTypes || [];
    const priceRange = store?.priceRange;
    const hasStructuredInfo = !!(allHours || serviceModeTags.length || paymentTags.length || cuisineTypes.length || priceRange);
    const identityPills = [areaContext, ...serviceModeTags.slice(0, 3), priceRange]
        .filter(Boolean)
        .slice(0, 4) as string[];

    // Schema.org
    const schema = generateOBPSchema(store, obpUrl, contentLanguage, storeOverride ? 'store' : 'brand');
    const faqSchema = buildFaqSchema(store, obpUrl, t, storeName);

    const analyticsPreferences = getResolvedAnalyticsPreferences(store?.analytics);
    const trackingEnabled = analyticsPreferences.trackOfficialBusinessPage;
    const includeLocation = analyticsPreferences.trackLocation;
    const policyLinks = [
        pp.showPrivacyLink !== false ? { href: '/privacy', label: t('publicPrivacy') } : null,
        pp.showTermsLink !== false ? { href: '/terms', label: t('publicTerms') } : null,
        pp.showRefundLink !== false ? { href: '/refund', label: t('publicRefund') } : null,
    ].filter(Boolean) as Array<{ href: string; label: string }>;
    const officialPageLabel = t('publicOfficialPagePoweredBy').split('·')[0]?.trim() || t('publicOfficialPagePoweredBy');

    return (
        <>
            <OBPAnalytics
                tenantId={store?.tenantId}
                storeId={store?.storeId}
                storeTimeZone={store?.timeZone}
                businessDayEndTime={store?.businessDayEndTime}
                trackViews={trackingEnabled}
                includeLocation={includeLocation}
                activeLanguage={showLanguageSwitcher ? contentLanguage : undefined}
                activeLanguageName={showLanguageSwitcher ? activeLanguageName : undefined}
                trackLanguageUsage={showLanguageSwitcher}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            />
            {faqSchema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
                />
            )}
            <main className={styles.page} data-obp-page="true" style={{ '--obp-accent': accentColor } as any}>
                <div className={styles.shell}>
                    {showLanguageSwitcher ? (
                        <OBPLanguageSwitcher
                            activeLanguage={contentLanguage}
                            ariaLabel={t('publicLanguageSelectorLabel')}
                            baseUrl={obpUrl}
                            languages={languageOptions}
                        />
                    ) : null}

                {/*
                 * T2-N-05 / D-12 PUBLIC-ROUTING-DOCTRINE: visible breadcrumb
                 * on OUTLET OBP pages only. Brand OBPs are the top node so
                 * they never render a breadcrumb. Requires masterBrandName +
                 * outletSlug — MenuContent passes the former; the outlet
                 * store carries the latter. Falls back silently if either
                 * is missing (breadcrumb is an affordance, not load-bearing).
                 */}
                {storeOverride && store?.outletSlug && (masterBrandName || store?.name) ? (
                    <MenuBreadcrumb
                        businessName={masterBrandName || brandName}
                        outletName={storeLocationName || undefined}
                        outletSlug={store.outletSlug}
                    />
                ) : null}

                {/* ── Temporary Status Banner ── */}
                {FEATURE_FLAGS.ENABLE_TEMP_STATUS && store?.tempStatus && (
                    <TempStatusBanner tempStatus={store.tempStatus} variant="pill" />
                )}

                    {/* ── Identity Block ── */}
                    <section className={styles.identity} aria-label={storeName}>
                        <div className={styles.identityHeader}>
                            {logo ? (
                                <img
                                    src={logo}
                                    alt={storeName}
                                    className={styles.logo}
                                    width={72}
                                    height={72}
                                    loading="eager"
                                />
                            ) : (
                                <div className={styles.logoFallback} style={{ background: accentColor }}>
                                    {firstLetter}
                                </div>
                            )}

                            <div className={styles.identityText}>
                                <h1 className={styles.name}>{storeName}</h1>

                                {descriptor && (
                                    <p className={styles.descriptor}>{descriptor}</p>
                                )}

                                {/* Above-fold scan chips: area + core service modes */}
                                {identityPills.length > 0 && (
                                    <div className={styles.identityPills}>
                                        {identityPills.map((pill) => (
                                            <span key={pill} className={styles.identityPill}>{pill}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.trustRow}>
                            {isPermanentlyClosed ? (
                                <div className={`${styles.statusBadge} ${styles.statusClosed}`}>
                                    <LuClock aria-hidden="true" size={14} />
                                    {t('publicPermanentlyClosed')}
                                </div>
                            ) : showStatusBadge ? (
                                <div className={`${styles.statusBadge} ${status.isOpen ? styles.statusOpen : styles.statusClosed}`}>
                                    {status.isOpen ? (
                                        <span className={`${styles.statusDot} ${styles.statusDotOpen}`} />
                                    ) : (
                                        renderDisplayIcon(iconVariant, LuClock, '🕒', 14)
                                    )}
                                    {status.isOpen ? t('publicOpen') : t('publicClosed')}{statusNextChange ? ` · ${statusNextChange}` : ''}
                                </div>
                            ) : (
                                <p className={`${styles.nextChange} ${styles.statusMuted}`}>
                                    {statusText}
                                </p>
                            )}

                            <span className={styles.officialBadge}>
                                {renderDisplayIcon(iconVariant, LuBadgeCheck, '✅', 14)}
                                {officialPageLabel}
                            </span>

                            {freshnessText && !isPermanentlyClosed && (
                                <span className={styles.freshnessBadge}>
                                    <LuCheck aria-hidden="true" size={14} />
                                    <span>{freshnessText}</span>
                                </span>
                            )}

                            {/* Google rating as subtle reference signal (NOT dominant) */}
                            {hasGoogleReview && (
                                <OBPExternalLinks
                                    tenantId={store?.tenantId}
                                    storeId={store?.storeId}
                                    trackingEnabled={trackingEnabled}
                                    storeTimeZone={store?.timeZone}
                                    businessDayEndTime={store?.businessDayEndTime}
                                    includeLocation={includeLocation}
                                    googleReviewUrl={googleReviewUrl}
                                    googleReviewLabel={
                                        googleReviewCount
                                            ? t('publicGoogleRatingWithCount', { count: googleReviewCount, rating: googleRating })
                                            : t('publicGoogleRating', { rating: googleRating })
                                    }
                                />
                            )}
                        </div>

                        {(knownFor || establishedYear) && (
                            <p className={styles.identityMeta}>
                                {[knownFor ? t('publicKnownForPrefix', { value: knownFor }) : null, establishedYear ? t('publicServingSince', { year: establishedYear }) : null].filter(Boolean).join(' · ')}
                            </p>
                        )}
                    </section>

                    {/* ── Primary CTA ── */}
                    <div className={styles.primaryCta}>
                    {isPermanentlyClosed ? (
                        <span className={styles.menuButtonDisabled}>
                            {t('publicBusinessPermanentlyClosed')}
                        </span>
                    ) : hasMenu ? (
                        <OBPMenuCTA
                            menuUrl={menuUrl}
                            fallbackLabel={t('publicViewMenu')}
                            accentColor={accentColor}
                            tenantId={store?.tenantId}
                            storeId={store?.storeId}
                            storeTimeZone={store?.timeZone}
                            businessDayEndTime={store?.businessDayEndTime}
                            projects={ctaProjects}
                            // T2-N-02 / A-07: when OBPContent renders for an
                            // outlet URL, storeOverride is set (see G-01).
                            // That's the signal that this is the outlet OBP
                            // surface, not the brand root.
                            obpSurface={storeOverride ? 'outlet' : 'brand'}
                            trackingEnabled={trackingEnabled}
                            includeLocation={includeLocation}
                        />
                    ) : (
                        <span className={styles.menuButtonDisabled}>
                            {t('publicMenuComingSoon')}
                        </span>
                    )}
                    </div>

                    {/* ── Quick Actions (Client Component for onClick tracking) ── */}
                    <OBPActions
                        tenantId={store?.tenantId}
                        storeId={store?.storeId}
                        trackingEnabled={trackingEnabled}
                        storeTimeZone={store?.timeZone}
                        businessDayEndTime={store?.businessDayEndTime}
                        includeLocation={includeLocation}
                        phoneNumber={store?.phoneNumber}
                        whatsappNumber={whatsappNumber}
                        directionsUrl={directionsUrl}
                        reservationUrl={pp.reservationUrl}
                        orderUrl={pp.orderUrl}
                        googleReviewUrl={googleReviewUrl}
                        feedbackUrl={feedbackUrl}
                        iconVariant={iconVariant}
                        showCall={showCall}
                        showWhatsApp={showWhatsApp}
                        showDirections={showDirections}
                        showReservation={showReservation}
                        showOrder={showOrder}
                        showGoogleReview={showGoogleReview}
                        showFeedback={showFeedback}
                        labels={{
                            call: t('publicActionCall'),
                            whatsapp: t('publicActionWhatsApp'),
                            directions: t('publicActionDirections'),
                            reserve: t('publicActionReserve'),
                            order: t('publicActionOrder'),
                            reviews: t('publicActionReviews'),
                            feedback: t('publicActionFeedback'),
                        }}
                    />

                    {/* ── Business Photos (first 3 preview, full tap viewer) ── */}
                    <OBPPhotoStrip
                        closePreviewLabel={t('publicPhotoPreviewClose')}
                        nextPhotoLabel={t('publicPhotoNext')}
                        photoLabelTemplate={t('publicPhotoLabel', { index: '{index}' })}
                        photoPositionTemplate={t('publicPhotoPosition', { index: '{index}', total: '{total}' })}
                        previousPhotoLabel={t('publicPhotoPrevious')}
                        photos={photos}
                        previewLabel={t('publicPhotoPreview')}
                        storeName={storeName}
                    />

                    {specialNote ? (
                        <section className={styles.note} aria-label={t('publicSpecialNote')}>
                            <h2 className={styles.groupTitle}>
                                <span className={styles.groupTitleIcon}>{renderDisplayIcon(iconVariant, LuInfo, 'ℹ️')}</span>
                                {t('publicSpecialNote')}
                            </h2>
                            <p className={styles.noteText}>{specialNote}</p>
                        </section>
                    ) : null}

                    {/* ── Info Block ── */}
                    {(fullAddress || todayHours) && (
                        <section className={`${styles.info} ${styles.locationInfo}`} aria-label={t('publicBusinessDetailsLabel')}>
                            <h2 className={styles.groupTitle}>
                                <span className={styles.groupTitleIcon}>{renderDisplayIcon(iconVariant, LuMapPin, '📍')}</span>
                                {t('publicLocation')}
                            </h2>
                            {googleMapsEmbedUrl && (
                                <div className={styles.mapPreview}>
                                    <iframe
                                        allowFullScreen
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        src={googleMapsEmbedUrl}
                                        title={`${storeLocationName} ${t('publicLocation')}`}
                                    />
                                </div>
                            )}
                            {fullAddress && (
                                <p className={styles.locationAddress}>{fullAddress}</p>
                            )}
                            {todayHours && (
                                <div className={styles.infoRow}>
                                    <span className={styles.infoIcon}>{renderDisplayIcon(iconVariant, LuClock, '🕒', 16)}</span>
                                    <span>{todayHours}</span>
                                </div>
                            )}
                        </section>
                    )}

                {(hasStructuredInfo || (FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES && allAttributeTags.length > 0)) && (
                    <div className={styles.utilityStack}>
                        {/* ── Structured Info Section (P3 — AEO critical, all SSR) ── */}
                        {allHours && !isPermanentlyClosed && (
                            <section className={`${styles.info} ${styles.utilityInfo}`} aria-label={t('publicBusinessHours')}>
                                <h2 className={styles.groupTitle}>
                                    <span className={styles.groupTitleIcon}>{renderDisplayIcon(iconVariant, LuCalendarDays, '📅')}</span>
                                    {t('publicBusinessHours')}
                                </h2>
                                <div className={styles.hoursList}>
                                    {allHours}
                                </div>
                            </section>
                        )}

                        {(serviceModeItems.length > 0 || cuisineTypes.length > 0 || priceRange) && !isPermanentlyClosed && (
                            <section className={`${styles.info} ${styles.utilityInfo}`} aria-label={t('publicServiceOptions')}>
                                <h2 className={styles.groupTitle}>
                                    <span className={styles.groupTitleIcon}>{renderDisplayIcon(iconVariant, LuStore, '🏪')}</span>
                                    {t('publicServiceOptions')}
                                </h2>
                                {serviceModeItems.length > 0 && (
                                    <div className={`${styles.iconGrid} ${styles.iconGridCompact}`}>
                                        {serviceModeItems.map(renderIconTile)}
                                    </div>
                                )}
                            {cuisineTypes.length > 0 && (
                                <div className={styles.infoRow}>
                                    <span className={styles.infoIcon}>{renderDisplayIcon(iconVariant, LuUtensils, '🍽️', 16)}</span>
                                    <span>{cuisineTypes.join(', ')}</span>
                                </div>
                            )}
                            {priceRange && (
                                <div className={styles.infoRow}>
                                    <span className={styles.infoIcon}>{renderDisplayIcon(iconVariant, LuIndianRupee, '₹', 16)}</span>
                                    <span>{t('publicPriceRange', { value: priceRange })}</span>
                                </div>
                            )}
                            </section>
                        )}

                        {paymentItems.length > 0 && !isPermanentlyClosed && (
                            <section className={`${styles.info} ${styles.utilityInfo}`} aria-label={t('publicPaymentOptions')}>
                                <h2 className={styles.groupTitle}>
                                    <span className={styles.groupTitleIcon}>{renderDisplayIcon(iconVariant, LuCreditCard, '💳')}</span>
                                    {t('publicPaymentOptions')}
                                </h2>
                                <div className={`${styles.iconGrid} ${styles.iconGridCompact}`}>
                                    {paymentItems.map(renderIconTile)}
                                </div>
                            </section>
                        )}

                        {FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES && dietaryAttributeTags.length > 0 && (
                            <section className={`${styles.info} ${styles.utilityInfo}`} aria-label={t('publicDietaryOptions')}>
                                <h2 className={styles.groupTitle}>
                                    <span className={styles.groupTitleIcon}>{renderDisplayIcon(iconVariant, LuLeaf, '🌿')}</span>
                                    {t('publicDietaryOptions')}
                                </h2>
                                <div className={`${styles.iconGrid} ${styles.iconGridCompact}`}>
                                    {dietaryAttributeTags.map(renderIconTile)}
                                </div>
                            </section>
                        )}

                        {/* ── Business Attributes (BTG Layer 12) ── */}
                        {FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES && amenityAttributeTags.length > 0 && (
                            <section className={`${styles.info} ${styles.utilityInfo}`} aria-label={t('publicAmenities')}>
                                <h2 className={styles.groupTitle}>
                                    <span className={styles.groupTitleIcon}>{renderDisplayIcon(iconVariant, LuStore, '🏪')}</span>
                                    {t('publicAmenities')}
                                </h2>
                                <div className={styles.iconGrid}>
                                    {amenityAttributeTags.map(renderIconTile)}
                                </div>
                            </section>
                        )}
                    </div>
                )}

                    {/* ── Footer ── */}
                    <footer className={styles.footer}>
                    {hasSocials && (
                        <div className={styles.footerSocials}>
                            <OBPExternalLinks
                                tenantId={store?.tenantId}
                                storeId={store?.storeId}
                                trackingEnabled={trackingEnabled}
                                storeTimeZone={store?.timeZone}
                                businessDayEndTime={store?.businessDayEndTime}
                                includeLocation={includeLocation}
                                labels={{
                                    facebook: t('publicSocialPlatforms.facebook'),
                                    instagram: t('publicSocialPlatforms.instagram'),
                                    linkedin: t('publicSocialPlatforms.linkedin'),
                                    twitter: t('publicSocialPlatforms.twitter'),
                                    website: t('publicSocialPlatforms.website'),
                                    whatsapp: t('publicSocialPlatforms.whatsapp'),
                                    youtube: t('publicSocialPlatforms.youtube'),
                                }}
                                socialAriaLabelTemplate={t('publicSocialLinkLabel', { platform: '{platform}' })}
                                instagram={instagram}
                                facebook={facebook}
                                twitter={twitter}
                                linkedin={linkedin}
                                youtube={youtube}
                                whatsapp={socialWhatsApp}
                                website={website}
                            />
                        </div>
                    )}
                    <PublicMenuListAttribution
                        mode="compact"
                        surfaceLabel={t('publicOfficialPagePoweredBy')}
                        rightsLabel={t('publicAllRightsReserved')}
                        ctaLabel={null}
                        mutedColor="#bbb"
                    />
                    {FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES && policyLinks.length > 0 && (
                            <div className={styles.policyLinks}>
                            {policyLinks.map((link) => (
                                    <a key={link.href} href={link.href}>{link.label}</a>
                            ))}
                            </div>
                    )}
                    <OBPThemeToggle
                        switchToDarkLabel={t('publicSwitchToDarkTheme')}
                        switchToLightLabel={t('publicSwitchToLightTheme')}
                    />
                    </footer>
                </div>
            </main>

            {/*
             * T2-N-07 / A-10 PUBLIC-ROUTING-DOCTRINE: mount the Customer App
             * controller on OBP surfaces so the install prompt respects
             * `pwaSettings.promoteInstallation` on ALL three surfaces (obp,
             * outlet, project). Previously the controller only mounted inside
             * ClientMenuRenderer, leaving OBP installs unreachable. Renders
             * nothing unless feature flag + promoteInstallation + visit
             * threshold gates all pass.
             */}
            {FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA && store?.storeId ? (
                <OBPCustomerAppMount
                    storeId={store.storeId}
                    tenantId={store.tenantId}
                    storeName={storeName || t('publicFallbackMenu')}
                    storeTimeZone={store.timeZone}
                    promoteInstallation={
                        (store as any)?.pwaSettings?.promoteInstallation !== false
                    }
                    trackingEnabled={trackingEnabled}
                />
            ) : null}
        </>
    );
}
