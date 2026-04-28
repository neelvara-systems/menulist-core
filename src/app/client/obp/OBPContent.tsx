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
import { firebaseClient } from "@lib/firebase/firebaseClient";
import {
    getStoreByCustomDomain,
    getStoreBySubdomain,
} from "@lib/firestore/clientStoreLookup";
import { parseSummaryProjects } from "@lib/firestore/parseSummaryProjects";
import { getResolvedAnalyticsPreferences } from "@lib/analytics/preferences";
import { getLocalizedText, getPrimaryLocalizedLanguage } from "@lib/localization/text";
import { getTenantFromHeaders as sharedGetTenantFromHeaders } from "@lib/multiTenant/getTenantFromHeaders";
import { generateOBPUrl, getDefaultProjectUrl } from "@lib/obp/generateOBPUrl";
import { getStoreOpenStatus } from "@lib/obp/hoursStatus";
import { resolveHoursOutput } from "@lib/outputControl";
import { buildFaqSchema } from "@lib/schema";
import { formatClockTime } from '@util/dateTime';
import {
    doc,
    getDoc
} from "firebase/firestore";
import { getTranslations } from "next-intl/server";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import BrandOBPContent from "./BrandOBPContent";
import OBPActions from "./OBPActions";
import OBPAnalytics from "./OBPAnalytics";
import OBPCustomerAppMount from "./OBPCustomerAppMount";
import OBPMenuCTA from "./OBPMenuCTA";
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
    /** Active, non-special menu projects ordered with the default first. */
    projects: Array<{ slug: string; name: string | Record<string, string>; isDefault: boolean; projectImage?: string | null }>;
}

const getObpMenuInfo = unstable_cache(
    async (storeId: number): Promise<ObpMenuInfo> => {
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
            const active = Object.values(raw).filter(
                (p: any) => p.active !== false && !p.isSpecialMenu
            );
            if (active.length === 0) return empty;

            // Order: explicit default first, then everything else.
            const defaultProj: any = active.find((p: any) => p.isDefault === true) || active[0];
            const others = active.filter((p: any) => p !== defaultProj);
            const ordered = [defaultProj, ...others];

            const projects = ordered
                .map((p: any) => ({
                    slug: (p.slug as string) || '',
                    name: p.name,
                    isDefault: p === defaultProj,
                    projectImage: (p.projectImage as string) || null,
                }))
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

function getTodayHoursDisplay(workingHours: Record<string, string> | undefined, timeZone: string | undefined, t: (key: string, values?: Record<string, any>) => string): string | null {
    if (!workingHours) return null;

    const tz = timeZone || 'Asia/Kolkata';
    let dayIndex: number;
    try {
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
        const dayStr = formatter.format(new Date()).toLowerCase().slice(0, 3);
        const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        dayIndex = dayKeys.indexOf(dayStr);
        if (dayIndex === -1) dayIndex = new Date().getDay();
    } catch {
        dayIndex = new Date().getDay();
    }

    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayHours = workingHours[dayKeys[dayIndex]];

    if (!todayHours || todayHours.toLowerCase() === 'closed') return t('publicClosedToday');

    const [openTime, closeTime] = todayHours.split('-').map((time) => time.trim());
    if (!openTime || !closeTime) return t('publicOpenToday', { hours: todayHours.replace('-', ' – ') });
    return t('publicOpenToday', { hours: `${formatClockTime(openTime)} – ${formatClockTime(closeTime)}` });
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

const DAY_LABELS: Record<string, string> = {
    sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
    thu: 'Thursday', fri: 'Friday', sat: 'Saturday',
};
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function getAllHoursDisplay(workingHours?: Record<string, string>): React.ReactNode | null {
    if (!workingHours || Object.keys(workingHours).length === 0) return null;

    const rows = DAY_ORDER.map(day => {
        const hours = workingHours[day];
        const display = hours
            ? (() => {
                const [openTime, closeTime] = hours.split('-').map((time) => time.trim());
                if (!openTime || !closeTime) return hours.replace('-', ' – ');
                return `${formatClockTime(openTime)} – ${formatClockTime(closeTime)}`;
            })()
            : 'Closed';
        return (
            <div key={day} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontWeight: 500, minWidth: 80 }}>{DAY_LABELS[day]}</span>
                <span style={{ opacity: hours ? 1 : 0.5 }}>{display}</span>
            </div>
        );
    });

    return <>{rows}</>;
}

// ── Service modes from businessAttributes ──

function buildServiceModes(attributes?: Record<string, boolean>): string[] {
    if (!attributes) return [];
    const modes: string[] = [];
    if (attributes.dineIn) modes.push('Dine-In');
    if (attributes.takeaway) modes.push('Takeaway');
    if (attributes.delivery) modes.push('Delivery');
    if (attributes.driveThrough) modes.push('Drive-Through');
    return modes;
}

// ── Payment methods from businessAttributes ──

function buildPaymentMethods(attributes?: Record<string, boolean>): string[] {
    if (!attributes) return [];
    const methods: string[] = [];
    if (attributes.acceptsCash) methods.push('Cash');
    if (attributes.acceptsCards) methods.push('Cards');
    if (attributes.acceptsUPI) methods.push('UPI');
    return methods;
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
}

export default async function OBPContent({
    storeOverride,
    masterSubdomain,
    masterCustomDomain,
    masterBrandName,
}: OBPContentProps = {}) {
    const t = await getTranslations({ namespace: 'BusinessSettings' });
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
            return <BrandOBPContent store={storeData} baseUrl={baseUrl} />;
        }
    }

    // OPT-1: storeData already contains full store details from subdomain/custom domain lookup
    // Eliminated redundant getStoreById() call — saves 1 Firestore read per OBP page visit.
    // G-05 + G-06: single consolidated read returns hasMenu, default-project slug,
    // and the full active-projects list for per-project CTA rendering.
    const menuInfo = await withTimeout(getObpMenuInfo(storeData.storeId))
        .catch(() => ({ hasMenu: false, defaultSlug: undefined, projects: [] } as ObpMenuInfo));
    const { hasMenu, defaultSlug, projects: activeProjects } = menuInfo;

    const store = storeData;
    const pp = store?.publicPresence || {};
    const isPermanentlyClosed = store?.permanentlyClosed === true;
    const contentLanguage = store?.defaultLanguage || store?.activeLanguages?.[0] || store?.language || 'en';

    // Derive values
    const accentColor = pp.accentColor || '#111';
    const descriptor = getLocalizedText(pp.descriptor, contentLanguage, getPrimaryLocalizedLanguage(pp.descriptor, contentLanguage), '');
    const storeName = getLocalizedText(pp.displayName, contentLanguage, getPrimaryLocalizedLanguage(pp.displayName, contentLanguage), store?.name || 'Business');
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

    // Helper: build a project URL scoped to the current OBP surface (master
    // or outlet). For outlets the URL is prefixed with `/{outletSlug}` so
    // the canonical per-project URL is `/{outletSlug}/{projectSlug}`.
    const buildProjectUrl = (slug?: string): string => {
        if (storeOverride) {
            // Outlet path — absolute, rooted at master origin, with outlet slug.
            if (!slug) {
                return masterBase
                    ? `${masterBase}${outletPrefix}/menu`
                    : `${outletPrefix}/menu`;
            }
            return masterBase
                ? `${masterBase}${outletPrefix}/${slug}`
                : `${outletPrefix}/${slug}`;
        }
        return getDefaultProjectUrl(originSubdomain, originCustomDomain, slug);
    };

    // G-05 / R5 (§9 PUBLIC-ROUTING-DOCTRINE) sub-change 3: OBP's "View Menu"
    // CTA links to the default project's REAL canonical slug URL (e.g.,
    // /food-menu, /services), not the /menu alias. When defaultSlug is
    // unavailable (no published menu), falls back to /menu which Layer 2
    // handles gracefully.
    const menuUrl = buildProjectUrl(defaultSlug);

    // G-06 (§11 + D-03): per-project-count CTA payload. Each entry carries
    // its real canonical slug URL so clicks go straight to /{projectSlug}
    // (or /{outletSlug}/{projectSlug} for outlet-scoped OBPs). Ordered
    // default-first by getObpMenuInfo so the primary CTA is always the
    // default project.
    const ctaProjects = activeProjects.map((p) => ({
        slug: p.slug,
        name: getLocalizedText(p.name, contentLanguage, getPrimaryLocalizedLanguage(p.name, contentLanguage), 'Menu'),
        isDefault: p.isDefault,
        projectImage: p.projectImage || null,
        url: buildProjectUrl(p.slug),
    }));

    // Action visibility (default to true if data exists)
    const showCall = (pp.showCall !== false) && !!store?.phoneNumber;
    const showWhatsApp = (pp.showWhatsApp !== false) && !!(pp.whatsappNumber || store?.phoneNumber);
    const showDirections = (pp.showDirections !== false) && !!(pp.googleMapsUrl || fullAddress);
    const showReservation = (pp.showReservation !== false) && !!pp.reservationUrl;
    const showOrder = (pp.showOrder !== false) && !!pp.orderUrl;

    const whatsappNumber = (pp.whatsappNumber || store?.phoneNumber || '').replace(/[^0-9+]/g, '');
    const directionsUrl = pp.googleMapsUrl || (fullAddress ? `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}` : '');

    // Social links
    const socialMedia = store?.socialMedia || {};
    const instagram = socialMedia.instagram;
    const facebook = socialMedia.facebook;
    const website = store?.url || socialMedia.website;

    const hasSocials = !!(instagram || facebook || website);

    // Business attributes → display tags
    const ATTRIBUTE_DISPLAY: Record<string, string> = {
        vegetarian: 'Vegetarian', vegan: 'Vegan', halal: 'Halal', glutenFree: 'Gluten-Free',
        wifi: 'Free WiFi', outdoorSeating: 'Outdoor Seating', parking: 'Parking',
        airConditioning: 'AC', liveMusic: 'Live Music', petFriendly: 'Pet Friendly',
        dineIn: 'Dine-In', takeaway: 'Takeaway', delivery: 'Delivery', driveThrough: 'Drive-Through',
        acceptsCards: 'Cards', acceptsUPI: 'UPI', acceptsCash: 'Cash',
    };
    const attributeTags: string[] = Object.entries(store?.businessAttributes || {})
        .filter(([key, val]) => val === true && ATTRIBUTE_DISPLAY[key])
        .map(([key]) => ATTRIBUTE_DISPLAY[key]);

    // Freshness signal — compute how recently the store was updated
    const freshnessText = getFreshnessText(store?.modifiedOn, t);

    // Established year
    const establishedYear = pp.establishedYear;

    // Known-for identity cue
    const knownFor = getLocalizedText(pp.knownFor, contentLanguage, getPrimaryLocalizedLanguage(pp.knownFor, contentLanguage), '');

    // Short area context (city name for quick location recognition)
    const areaContext = store?.area || store?.city || null;

    // Google review reference (P1 — highest impact trust signal)
    const googleReviewUrl = pp.googleReviewUrl;
    const googleRating = pp.googleRating;
    const googleReviewCount = pp.googleReviewCount;
    const hasGoogleReview = !!(googleReviewUrl && googleRating);

    // Business photos (P2 — max 3 curated, not a gallery)
    const photos = (pp.photos || []).filter(Boolean).slice(0, 3);

    // Structured info for AEO (P3 — full hours, services, payment, cuisine, price)
    const allHours = getAllHoursDisplay(store?.workingHours);
    const serviceModeTags = buildServiceModes(store?.businessAttributes);
    const paymentTags = buildPaymentMethods(store?.businessAttributes);
    const cuisineTypes = store?.cuisineTypes || [];
    const priceRange = store?.priceRange;
    const hasStructuredInfo = !!(allHours || serviceModeTags.length || paymentTags.length || cuisineTypes.length || priceRange);

    // Schema.org
    const schema = generateOBPSchema(store, obpUrl);
    const faqSchema = buildFaqSchema(store, obpUrl);

    const analyticsPreferences = getResolvedAnalyticsPreferences(store?.analytics);
    const trackingEnabled = analyticsPreferences.trackOfficialBusinessPage;
    const includeLocation = analyticsPreferences.trackLocation;

    return (
        <>
            <OBPAnalytics
                tenantId={store?.tenantId}
                storeId={store?.storeId}
                trackViews={trackingEnabled}
                includeLocation={includeLocation}
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
            <div className={styles.page}>
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
                        businessName={masterBrandName || storeName}
                        outletName={storeName || undefined}
                        outletSlug={store.outletSlug}
                    />
                ) : null}

                {/* ── Temporary Status Banner ── */}
                {FEATURE_FLAGS.ENABLE_TEMP_STATUS && store?.tempStatus && (
                    <TempStatusBanner tempStatus={store.tempStatus} />
                )}

                {/* ── Identity Block ── */}
                <div className={styles.identity}>
                    {logo ? (
                        <img
                            src={logo}
                            alt={storeName}
                            className={styles.logo}
                            width={80}
                            height={80}
                            loading="eager"
                        />
                    ) : (
                        <div className={styles.logoFallback} style={{ background: accentColor }}>
                            {firstLetter}
                        </div>
                    )}

                    <h1 className={styles.name}>{storeName}</h1>

                    {descriptor && (
                        <p className={styles.descriptor}>{descriptor}</p>
                    )}

                    {/* Above-fold trust strip: price range + area + service modes */}
                    {(priceRange || areaContext || serviceModeTags.length > 0) && (
                        <p className={styles.descriptor} style={{ fontSize: 13 }}>
                            {[priceRange, areaContext, serviceModeTags.join(' · ')].filter(Boolean).join(' · ')}
                        </p>
                    )}

                    {isPermanentlyClosed ? (
                        <div className={`${styles.statusBadge} ${styles.statusClosed}`}>
                            <span className={`${styles.statusDot} ${styles.statusDotClosed}`} />
                            {t('publicPermanentlyClosed')}
                        </div>
                    ) : showStatusBadge ? (
                        <div className={`${styles.statusBadge} ${status.isOpen ? styles.statusOpen : styles.statusClosed}`}>
                            <span className={`${styles.statusDot} ${status.isOpen ? styles.statusDotOpen : styles.statusDotClosed}`} />
                            {status.statusText}{status.nextChange ? ` · ${status.nextChange}` : ''}
                        </div>
                    ) : (
                        <p className={styles.nextChange} style={{ marginTop: 8, fontSize: 13, opacity: 0.6 }}>
                            {status.statusText}
                        </p>
                    )}

                    {/* Google rating as subtle reference signal (NOT dominant) */}
                    {hasGoogleReview && (
                        <a
                            href={googleReviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none', color: '#666', fontSize: 13 }}
                        >
                            {googleReviewCount
                                ? t('publicGoogleRatingWithCount', { count: googleReviewCount, rating: googleRating })
                                : t('publicGoogleRating', { rating: googleRating })}
                        </a>
                    )}

                    {knownFor && (
                        <p className={styles.nextChange}>{t('publicKnownForPrefix', { value: knownFor })}</p>
                    )}

                    {establishedYear && (
                        <p className={styles.nextChange}>{t('publicServingSince', { year: establishedYear })}</p>
                    )}
                </div>

                {/* ── Primary CTA ── */}
                <div className={styles.primaryCta}>
                    {isPermanentlyClosed ? (
                        <span className={styles.menuButtonDisabled}>
                            {t('publicBusinessPermanentlyClosed')}
                        </span>
                    ) : hasMenu ? (
                        <OBPMenuCTA
                            menuUrl={menuUrl}
                            accentColor={accentColor}
                            tenantId={store?.tenantId}
                            storeId={store?.storeId}
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

                {/* ── Business Photos (P2 — max 3, trust proof) ── */}
                {photos.length > 0 && (
                    <div style={{
                        display: 'flex',
                        gap: 8,
                        padding: '0 20px',
                        maxWidth: 480,
                        margin: '0 auto 24px',
                        width: '100%',
                    }}>
                        {photos.map((url, i) => (
                            <div
                                key={i}
                                style={{
                                    flex: 1,
                                    aspectRatio: '4/3',
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                    background: '#f5f5f5',
                                }}
                            >
                                <img
                                    src={url}
                                    alt={`${storeName} photo ${i + 1}`}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Quick Actions (Client Component for onClick tracking) ── */}
                <OBPActions
                    tenantId={store?.tenantId}
                    storeId={store?.storeId}
                    trackingEnabled={trackingEnabled}
                    includeLocation={includeLocation}
                    phoneNumber={store?.phoneNumber}
                    whatsappNumber={whatsappNumber}
                    directionsUrl={directionsUrl}
                    reservationUrl={pp.reservationUrl}
                    orderUrl={pp.orderUrl}
                    showCall={showCall}
                    showWhatsApp={showWhatsApp}
                    showDirections={showDirections}
                    showReservation={showReservation}
                    showOrder={showOrder}
                />

                {/* ── Info Block ── */}
                {(fullAddress || todayHours) && (
                    <div className={styles.info}>
                        {fullAddress && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoIcon}>📍</span>
                                <span>{fullAddress}</span>
                            </div>
                        )}
                        {todayHours && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoIcon}>🕐</span>
                                <span>{todayHours}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Structured Info Section (P3 — AEO critical, all SSR) ── */}
                {hasStructuredInfo && !isPermanentlyClosed && (
                    <div className={styles.info}>
                        {allHours && (
                            <details style={{ width: '100%' }}>
                                <summary className={styles.infoRow} style={{ cursor: 'pointer', listStyle: 'none' }}>
                                    <span className={styles.infoIcon}>📅</span>
                                    <span>{t('publicBusinessHours')}</span>
                                </summary>
                                <div style={{ paddingLeft: 28, paddingTop: 4, fontSize: 13, lineHeight: 1.8 }}>
                                    {allHours}
                                </div>
                            </details>
                        )}
                        {cuisineTypes.length > 0 && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoIcon}>🍽️</span>
                                <span>{cuisineTypes.join(', ')}</span>
                            </div>
                        )}
                        {priceRange && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoIcon}>💰</span>
                                <span>{t('publicPriceRange', { value: priceRange })}</span>
                            </div>
                        )}
                        {serviceModeTags.length > 0 && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoIcon}>🏪</span>
                                <span>{serviceModeTags.join(' · ')}</span>
                            </div>
                        )}
                        {paymentTags.length > 0 && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoIcon}>💳</span>
                                <span>{t('publicAccepts', { value: paymentTags.join(', ') })}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Business Attributes (BTG Layer 12) ── */}
                {FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES && attributeTags.length > 0 && (
                    <div className={styles.attributes}>
                        {attributeTags.map((tag) => (
                            <span key={tag} className={styles.attributeTag}>{tag}</span>
                        ))}
                    </div>
                )}

                {/* ── Social Links ── */}
                {hasSocials && (
                    <div className={styles.socials}>
                        {instagram && (
                            <a
                                href={instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram}`}
                                className={styles.socialLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Instagram"
                            >
                                IG
                            </a>
                        )}
                        {facebook && (
                            <a
                                href={facebook.startsWith('http') ? facebook : `https://facebook.com/${facebook}`}
                                className={styles.socialLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Facebook"
                            >
                                FB
                            </a>
                        )}
                        {website && (
                            <a
                                href={website.startsWith('http') ? website : `https://${website}`}
                                className={styles.socialLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Website"
                            >
                                🌐
                            </a>
                        )}
                    </div>
                )}

                {/* ── Freshness Signal ── */}
                {freshnessText && !isPermanentlyClosed && (
                    <div className={styles.info}>
                        <div className={styles.infoRow}>
                            <span className={styles.infoIcon}>✓</span>
                            <span style={{ fontSize: 12, opacity: 0.6 }}>{freshnessText}</span>
                        </div>
                    </div>
                )}

                {/* ── Footer ── */}
                <footer className={styles.footer}>
                    <span className={styles.footerText}>{t('publicOfficialPagePoweredBy')}</span>
                    {FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES && (
                        <div style={{ marginTop: 6, display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <a href="/privacy" style={{ fontSize: 11, color: '#999', textDecoration: 'none' }}>{t('publicPrivacy')}</a>
                            <span style={{ fontSize: 11, color: '#ccc' }}>·</span>
                            <a href="/terms" style={{ fontSize: 11, color: '#999', textDecoration: 'none' }}>{t('publicTerms')}</a>
                            <span style={{ fontSize: 11, color: '#ccc' }}>·</span>
                            <a href="/refund" style={{ fontSize: 11, color: '#999', textDecoration: 'none' }}>{t('publicRefund')}</a>
                        </div>
                    )}
                </footer>
            </div>

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
                    storeName={storeName || 'Menu'}
                    promoteInstallation={
                        (store as any)?.pwaSettings?.promoteInstallation !== false
                    }
                    trackingEnabled={trackingEnabled}
                />
            ) : null}
        </>
    );
}
