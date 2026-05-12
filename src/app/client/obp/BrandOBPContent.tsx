/**
 * Brand OBP Content — Multi-Store Location Selector
 *
 * When a brand has multiple outlets and OBP is enabled, the root URL
 * shows this store selector instead of a single store's OBP.
 *
 * URL Routing Architecture — Phase 2
 * @see __docs__/url-routing-architecture/README.md
 */

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import GlobalLanguagesList from "@data/languages";
import PublicMenuListAttribution from "@/components/customer/PublicMenuListAttribution";
import { getResolvedAnalyticsPreferences } from "@lib/analytics/preferences";
import { getBrandName } from "@lib/businessIdentity/names";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { parseSummaryStores } from "@lib/firestore/parseSummaryStores";
import {
    appendPublicLanguageParam,
    getNextIntlLocaleForPublicLanguage,
    getPublicLanguageOptions,
    resolveStorePublicLanguage,
    shouldExposePublicLanguageSwitcher,
} from "@lib/localization/publicRenderLanguage";
import { getLocalizedText, getPrimaryLocalizedLanguage } from "@lib/localization/text";
import { getBusinessCoverAltText, getBusinessLogoAltText } from "@lib/media/altText";
import { resolveOBPAccentColor } from "@lib/obp/accentColor";
import { getStoreOpenStatus } from "@lib/obp/hoursStatus";
import { resolveHoursOutput } from "@lib/outputControl";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import { StoreDataType } from "@type/platform/store";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
} from "firebase/firestore";
import { unstable_cache } from "next/cache";
import OBPLanguageSwitcher from "./OBPLanguageSwitcher";
import OBPAnalytics from "./OBPAnalytics";
import OBPThemeToggle from "./OBPThemeToggle";
import { getOBPTranslations } from "./i18n";
import styles from "./obp.module.scss";

interface OutletInfo {
    storeId: number;
    name: string;
    outletSlug?: string;
    city?: string;
    addressLine?: string;
    logo?: string;
    workingHours?: Record<string, string>;
    timeZone?: string;
    active?: boolean;
    blocked?: boolean;
    modifiedOn?: any;
    isMaster?: boolean;
}

const mapSummaryStoreToOutlet = (storeId: string, data: any): OutletInfo => ({
    storeId: Number(data.storeId || storeId),
    name: data.name,
    outletSlug: data.outletSlug,
    city: data.city,
    addressLine: data.addressLine,
    logo: data.logo,
    workingHours: data.workingHours,
    timeZone: data.timeZone,
    active: data.active,
    blocked: data.blocked,
    isMaster: data.isMaster,
    modifiedOn: data.modifiedOn,
});

// Summary-first active outlet list. Falls back to the store collection for
// legacy summaries that do not yet carry outletSlug/isMaster fields.
const getSummaryOutletsForTenant = unstable_cache(
    async (tenantId: number): Promise<OutletInfo[] | null> => {
        const summaryRef = doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY || "platformSummary", "storesSummary");
        const summarySnap = await getDoc(summaryRef);
        if (!summarySnap.exists()) return null;

        const stores = parseSummaryStores(summarySnap.data());
        const tenantStores = Object.entries(stores)
            .filter(([, data]: [string, any]) => data?.tId === tenantId && data?.active !== false && !isPlatformEntityBlocked(data))
            .map(([storeId, data]: [string, any]) => mapSummaryStoreToOutlet(storeId, data));

        if (tenantStores.length === 0) return null;

        // Old summaries only contain name/type fields, so they cannot power
        // customer-routable location cards. Use collection fallback until the
        // next store/outlet save backfills summary routing fields.
        const hasRoutableOutlet = tenantStores.some((entry) => entry.outletSlug);
        if (!hasRoutableOutlet) return null;

        return tenantStores.sort((a, b) => {
            if (a.isMaster) return -1;
            if (b.isMaster) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });
    },
    ['brand-obp-summary-outlets'],
    { revalidate: 60, tags: ['client-stores'] },
);

// Legacy fallback for storesSummary docs that predate outlet routing fields.
const getCollectionOutletsForTenant = unstable_cache(
    async (tenantId: number, masterStoreId: number): Promise<OutletInfo[]> => {
        const storesRef = collection(firebaseClient, DB_COLLECTIONS.STORES);
        const q = query(
            storesRef,
            where("tenantId", "==", tenantId),
            where("active", "==", true),
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) return [];

        return snapshot.docs
            .map((doc) => {
                const data = doc.data();
                return {
                    storeId: data.storeId,
                    name: data.name,
                    outletSlug: data.outletSlug,
                    city: data.city,
                    addressLine: data.addressLine,
                    logo: data.logo,
                    workingHours: data.workingHours,
                    timeZone: data.timeZone,
                    active: data.active,
                    blocked: data.blocked,
                    isMaster: data.isMaster,
                    modifiedOn: data.modifiedOn,
                } as OutletInfo & { isMaster?: boolean };
            })
            .filter((store) => !isPlatformEntityBlocked(store))
            // Sort: master store first, then alphabetical
            .sort((a, b) => {
                if ((a as any).isMaster) return -1;
                if ((b as any).isMaster) return 1;
                return (a.name || '').localeCompare(b.name || '');
            });
    },
    ['brand-obp-outlets'],
    { revalidate: 60, tags: ['client-stores'] }
);

async function getOutletsForTenant(tenantId: number, masterStoreId: number): Promise<OutletInfo[]> {
    const summaryOutlets = await getSummaryOutletsForTenant(tenantId);
    if (summaryOutlets) return summaryOutlets;
    return getCollectionOutletsForTenant(tenantId, masterStoreId);
}

interface BrandOBPContentProps {
    store: StoreDataType;
    baseUrl: string;
    requestedLanguage?: string | string[] | null;
}

function localizeOutletStatusText(value: string | undefined, t: (key: string, values?: Record<string, any>) => string): string {
    if (!value) return '';
    const normalized = value.trim().toLowerCase();
    if (normalized === 'hours not available') return t('publicHoursNotAvailable');
    if (normalized === 'open now') return t('publicOpen');
    if (normalized === 'closed') return t('publicClosed');
    return value;
}

export default async function BrandOBPContent({ store, baseUrl, requestedLanguage }: BrandOBPContentProps) {
    const contentLanguage = resolveStorePublicLanguage(store, requestedLanguage);
    const t = getOBPTranslations(getNextIntlLocaleForPublicLanguage(contentLanguage));
    const allOutlets = await getOutletsForTenant(store.tenantId, store.storeId);
    // G-12 (§11 PUBLIC-ROUTING-DOCTRINE): only outlets with a real outletSlug
    // are ever routable and linkable. The outlet-create API guarantees a slug
    // on every new outlet; anything missing a slug here is structurally
    // broken and should not be exposed to customers.
    const outlets = allOutlets.filter((o: any) => !!o?.outletSlug);

    const pp = store?.publicPresence || {};
    const accentColor = resolveOBPAccentColor(pp);
    const languageOptions = getPublicLanguageOptions(store);
    const showLanguageSwitcher = shouldExposePublicLanguageSwitcher(store);
    const activeLanguageName = GlobalLanguagesList.find((language) => language.code === contentLanguage)?.name || contentLanguage.toUpperCase();
    const analyticsPreferences = getResolvedAnalyticsPreferences(store?.analytics);
    const brandName = getBrandName(store, t('publicFallbackBusiness'));
    const logo = store?.logo;
    const businessCover = typeof pp.businessCover === 'string' ? pp.businessCover.trim() : '';
    const firstLetter = brandName.charAt(0);

    return (
        <main className={styles.page} data-obp-page="true" style={{ '--obp-accent': accentColor } as any}>
            <OBPAnalytics
                tenantId={store?.tenantId}
                storeId={store?.storeId}
                storeTimeZone={store?.timeZone}
                businessDayEndTime={store?.businessDayEndTime}
                trackViews={analyticsPreferences.trackOfficialBusinessPage}
                includeLocation={analyticsPreferences.trackLocation}
                activeLanguage={showLanguageSwitcher ? contentLanguage : undefined}
                activeLanguageName={showLanguageSwitcher ? activeLanguageName : undefined}
                trackLanguageUsage={showLanguageSwitcher}
            />
            <div className={styles.shell}>
                {showLanguageSwitcher ? (
                    <OBPLanguageSwitcher
                        activeLanguage={contentLanguage}
                        ariaLabel={t('publicLanguageSelectorLabel')}
                        baseUrl={baseUrl}
                        languages={languageOptions}
                    />
                ) : null}

                {businessCover ? (
                    <div className={styles.businessCover}>
                        <img
                            alt={getBusinessCoverAltText(brandName)}
                            src={businessCover}
                            loading="eager"
                        />
                    </div>
                ) : null}

                {/* Brand Identity */}
                <section className={styles.identity} aria-label={brandName}>
                {logo ? (
                    <img
                        src={logo}
                        alt={getBusinessLogoAltText(brandName)}
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
                <h1 className={styles.name}>{brandName}</h1>
                <p className={styles.descriptor}>{t('publicChooseLocation')}</p>
                </section>

                {/* Location Cards */}
                <section className={styles.outletList} aria-label={t('publicChooseLocation')}>
                {outlets.map((outlet) => {
                    const hoursOutput = FEATURE_FLAGS.ENABLE_OUTPUT_CONTROL
                        ? resolveHoursOutput({
                            workingHours: outlet.workingHours,
                            hoursLastUpdatedAt: outlet.modifiedOn,
                            timeZone: outlet.timeZone,
                        })
                        : null;
                    const status = hoursOutput
                        ? { isOpen: hoursOutput.styleHint === 'open', statusText: hoursOutput.statusText }
                        : getStoreOpenStatus(outlet.workingHours, outlet.timeZone);
                    const statusText = localizeOutletStatusText(status.statusText, t);
                    const showBadge = hoursOutput ? hoursOutput.showStatusBadge : true;
                    // G-12 (§11 PUBLIC-ROUTING-DOCTRINE): outletSlug is the
                    // only acceptable outlet URL segment. Outlets without a
                    // slug are filtered out earlier in this render (see the
                    // guard above the map); the `store-${storeId}` fallback
                    // that used to live here was removed because it would
                    // produce indexable URLs that aren't owner-chosen.
                    const outletUrl = showLanguageSwitcher
                        ? appendPublicLanguageParam(`${baseUrl}/${outlet.outletSlug}`, contentLanguage)
                        : `${baseUrl}/${outlet.outletSlug}`;

                    return (
                        <a
                            key={outlet.storeId}
                            href={outletUrl}
                            className={styles.outletCard}
                        >
                            {/* Outlet mini logo or initial */}
                            {outlet.logo ? (
                                <img
                                    src={outlet.logo}
                                    alt={outlet.name}
                                    className={styles.outletLogo}
                                />
                            ) : (
                                <div className={styles.outletLogoFallback}>
                                    {getLocalizedText(
                                        outlet.name,
                                        contentLanguage,
                                        getPrimaryLocalizedLanguage(outlet.name, contentLanguage),
                                        t('publicFallbackOutlet'),
                                    ).charAt(0)}
                                </div>
                            )}

                            <div className={styles.outletBody}>
                                <div className={styles.outletName}>
                                    {getLocalizedText(
                                        outlet.name,
                                        contentLanguage,
                                        getPrimaryLocalizedLanguage(outlet.name, contentLanguage),
                                        t('publicFallbackOutlet'),
                                    ).replace(/ - Main Store$/, '')}
                                </div>
                                {(outlet.city || outlet.addressLine) && (
                                    <div className={styles.outletAddress}>
                                        {outlet.city || outlet.addressLine}
                                    </div>
                                )}
                            </div>

                            {/* Open/Closed badge — confidence-gated */}
                            {showBadge ? (
                                <div className={`${styles.outletStatus} ${status.isOpen ? styles.outletStatusOpen : styles.outletStatusClosed}`}>
                                    {status.isOpen ? t('publicOpen') : t('publicClosed')}
                                </div>
                            ) : (
                                <div className={styles.outletStatusMuted}>
                                    {statusText}
                                </div>
                            )}
                        </a>
                    );
                })}
                </section>

                {/* Footer */}
                <footer className={styles.footer}>
                    <div className={`${styles.footerCard} ${styles.footerUtilityCard}`}>
                        <OBPThemeToggle
                            switchToDarkLabel={t('publicSwitchToDarkTheme')}
                            switchToLightLabel={t('publicSwitchToLightTheme')}
                        />
                    </div>
                    <div className={`${styles.footerCard} ${styles.footerBrandingCard}`}>
                        <PublicMenuListAttribution
                            mode="compact"
                            surfaceLabel={t('publicPoweredBy')}
                            rightsLabel={t('publicAllRightsReserved')}
                            ctaLabel={null}
                            mutedColor="#999"
                            containerStyle={{ marginTop: 0, paddingBottom: 0 }}
                        />
                    </div>
                </footer>
            </div>
        </main>
    );
}
