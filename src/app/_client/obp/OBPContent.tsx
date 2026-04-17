/**
 * OBP Content — Async Server Component
 *
 * Fetches store data and renders the Official Business Page.
 * Wrapped in Suspense boundary by the parent page.
 *
 * @see __docs__/official-business-page/official-business-page_impl.md §7
 */

import TempStatusBanner from "@atoms/TempStatusBanner";
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { resolveDomain } from "@lib/multiTenant/domainResolver";
import { generateMenuUrl, generateOBPUrl } from "@lib/obp/generateOBPUrl";
import { getStoreOpenStatus } from "@lib/obp/hoursStatus";
import { resolveHoursOutput } from "@lib/outputControl";
import { buildFaqSchema } from "@lib/schema";
import { formatClockTime } from '@util/dateTime';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    where,
} from "firebase/firestore";
import { getTranslations } from "next-intl/server";
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import BrandOBPContent from "./BrandOBPContent";
import OBPActions from "./OBPActions";
import OBPAnalytics from "./OBPAnalytics";
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

// ── Store lookup (reuse existing subdomain/custom domain patterns) ──

const getStoreBySubdomain = cache(
    unstable_cache(
        async (subdomain: string) => {
            const storesRef = collection(firebaseClient, DB_COLLECTIONS.STORES);
            const q = query(
                storesRef,
                where("subdomain", "==", subdomain.toLowerCase()),
                where("active", "==", true),
                limit(1),
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        },
        ['obp-store-subdomain'],
        { revalidate: 60, tags: ['client-stores'] }
    )
);

const getStoreByCustomDomain = cache(
    unstable_cache(
        async (domain: string) => {
            const storesRef = collection(firebaseClient, DB_COLLECTIONS.STORES);
            const q = query(
                storesRef,
                where("customDomain", "==", domain.toLowerCase()),
                where("domainVerified", "==", true),
                where("active", "==", true),
                limit(1),
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        },
        ['obp-store-custom-domain'],
        { revalidate: 60, tags: ['client-stores'] }
    )
);

// ── Check if store has at least one published menu ──
// OPT-2: Uses projectsSummary (1 doc read) instead of legacy metadata WHERE query (N reads)

const checkHasPublishedMenu = unstable_cache(
    async (storeId: number): Promise<boolean> => {
        try {
            const summaryRef = doc(
                firebaseClient,
                DB_COLLECTIONS.PLATFORM_SUMMARY || "platformSummary",
                `projects_${storeId}`,
            );
            const summarySnap = await getDoc(summaryRef);
            if (!summarySnap.exists()) return false;
            const projects = summarySnap.data()?.projects || {};
            return Object.values(projects).some((p: any) => p.active !== false);
        } catch {
            return false;
        }
    },
    ['obp-has-menu'],
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

// ── Tenant info from headers (set by middleware) ──

async function getTenantFromHeaders() {
    const headersList = headers();
    const tenantSubdomain = headersList.get("x-tenant-subdomain");
    const tenantCustomDomain = headersList.get("x-tenant-custom-domain");
    const tenantTypeHeader = headersList.get("x-tenant-type");
    const requestHost =
        headersList.get("x-forwarded-host") ||
        headersList.get("host");
    const host = requestHost ? requestHost.split(':')[0].toLowerCase() : null;

    // Fallback to resolveDomain if headers not set (middleware cache/header issues)
    const resolvedDomain = resolveDomain(host);
    const tenantType = tenantTypeHeader || (resolvedDomain.isClient ? resolvedDomain.type : null);
    const subdomain = tenantSubdomain || resolvedDomain.subdomain || null;
    const customDomain = tenantCustomDomain || resolvedDomain.customDomain || null;

    return { subdomain, customDomain, tenantType };
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

export default async function OBPContent() {
    const t = await getTranslations({ namespace: 'BusinessSettings' });
    const { subdomain, customDomain, tenantType } = await getTenantFromHeaders();

    // Lookup store
    let storeData: any = null;
    if (tenantType === "subdomain" && subdomain) {
        storeData = await withRetry(() => withTimeout(getStoreBySubdomain(subdomain)));
    } else if (tenantType === "custom" && customDomain) {
        storeData = await withRetry(() => withTimeout(getStoreByCustomDomain(customDomain)));
    }

    if (!storeData) {
        notFound();
    }

    // URL Routing Architecture — Phase 2: Multi-store brand detection
    // If this master store's tenant has multiple active stores, show brand store selector
    if (storeData.isMaster) {
        const outletCount = await withTimeout(countActiveStoresForTenant(storeData.tenantId));
        if (outletCount > 1) {
            const baseUrl = customDomain
                ? `https://${customDomain}`
                : `https://${subdomain}.menulist.ai`;
            return <BrandOBPContent store={storeData} baseUrl={baseUrl} />;
        }
    }

    // OPT-1: storeData already contains full store details from subdomain/custom domain lookup
    // Eliminated redundant getStoreById() call — saves 1 Firestore read per OBP page visit
    const hasMenu = await withTimeout(checkHasPublishedMenu(storeData.storeId));

    const store = storeData;
    const pp = store?.publicPresence || {};
    const isPermanentlyClosed = store?.permanentlyClosed === true;

    // Derive values
    const accentColor = pp.accentColor || '#111';
    const descriptor = pp.descriptor || '';
    const storeName = store?.name || 'Business';
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

    const obpUrl = generateOBPUrl(store?.subdomain, store?.customDomain);
    const menuUrl = generateMenuUrl(store?.subdomain, store?.customDomain);

    // Action visibility (default to true if data exists)
    const showCall = (pp.showCall !== false) && !!store?.phoneNumber;
    const showWhatsApp = (pp.showWhatsApp !== false) && !!(pp.whatsappNumber || store?.phoneNumber);
    const showDirections = (pp.showDirections !== false) && !!(pp.googleMapsUrl || fullAddress);

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
    const knownFor = pp.knownFor;

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

    // Analytics: track OBP views using same pattern as digital menu
    const trackingEnabled = store?.analytics?.trackMenuViews !== false;

    return (
        <>
            <OBPAnalytics
                tenantId={store?.tenantId}
                storeId={store?.storeId}
                trackViews={trackingEnabled}
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
                    phoneNumber={store?.phoneNumber}
                    whatsappNumber={whatsappNumber}
                    directionsUrl={directionsUrl}
                    reservationUrl={pp.reservationUrl}
                    orderUrl={pp.orderUrl}
                    showCall={showCall}
                    showWhatsApp={showWhatsApp}
                    showDirections={showDirections}
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
        </>
    );
}
