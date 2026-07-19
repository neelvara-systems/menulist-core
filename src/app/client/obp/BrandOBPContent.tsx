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
import { firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import {
    appendPublicLanguageParam,
    getNextIntlLocaleForPublicLanguage,
    getPublicLanguageOptions,
    resolveStorePublicLanguage,
    shouldExposePublicLanguageSwitcher,
} from "@lib/localization/publicRenderLanguage";
import { getLocalizedText, getPrimaryLocalizedLanguage } from "@lib/localization/text";
import { createPublicCustomerTranslator } from "@lib/localization/publicCustomerMessages";
import { resolveOBPAccentColor } from "@lib/obp/accentColor";
import { getStoreOpenStatus } from "@lib/obp/hoursStatus";
import { resolveHoursOutput } from "@lib/outputControl";
import { resolveMenuListAttributionPolicy } from "@lib/platform/menuListBranding";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import { normalizeMultiOutletNumericDocumentId } from "@lib/multiOutlet/projectIdBoundary";
import { normalizePublicOutletSlug } from "@lib/publicRouting/pathSegments";
import { StoreDataType } from "@type/platform/store";
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
    modifiedOn?: unknown;
    isMaster?: boolean;
}

function isOutletRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeOutletStringMap(value: unknown): Record<string, string> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const entries = Object.entries(value).filter((entry): entry is [string, string] => (
        Boolean(entry[0]) && typeof entry[1] === 'string'
    ));
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

const mapCanonicalStoreToOutlet = (storeId: string, value: unknown): OutletInfo | null => {
    const storeScope = normalizeMultiOutletNumericDocumentId(storeId);
    if (!storeScope || !isOutletRecord(value) || isPlatformEntityBlocked(value)) return null;
    return {
        storeId: storeScope.numericId,
        name: typeof value.name === 'string' ? value.name : '',
        outletSlug: typeof value.outletSlug === 'string' ? value.outletSlug : undefined,
        city: typeof value.city === 'string' ? value.city : undefined,
        addressLine: typeof value.addressLine === 'string' ? value.addressLine : undefined,
        logo: typeof value.logo === 'string' ? value.logo : undefined,
        workingHours: normalizeOutletStringMap(value.workingHours),
        timeZone: typeof value.timeZone === 'string' ? value.timeZone : undefined,
        active: typeof value.active === 'boolean' ? value.active : undefined,
        blocked: typeof value.blocked === 'boolean' ? value.blocked : undefined,
        isMaster: typeof value.isMaster === 'boolean' ? value.isMaster : undefined,
        modifiedOn: value.modifiedOn,
    };
};

// Public outlet selection derives tenant membership and identity only from
// canonical store documents. storesSummary remains an internal read model and
// must not become a public routing or authorization source.
const getCollectionOutletsForTenant = unstable_cache(
    async (tenantId: number): Promise<OutletInfo[]> => {
        const snapshot = await firestoreAdmin
            .collection(DB_COLLECTIONS.STORES)
            .where("tenantId", "==", tenantId)
            .where("active", "==", true)
            .limit(FEATURE_FLAGS.MAX_OUTLETS_PER_TENANT + 1)
            .get();

        if (snapshot.empty) return [];

        return snapshot.docs
            .map((doc) => mapCanonicalStoreToOutlet(doc.id, doc.data()))
            .filter((store): store is OutletInfo => Boolean(store))
            // Sort: master store first, then alphabetical
            .sort((a, b) => {
                if (a.isMaster) return -1;
                if (b.isMaster) return 1;
                return (a.name || '').localeCompare(b.name || '');
            });
    },
    ['brand-obp-outlets'],
    { revalidate: 60, tags: ['client-stores'] }
);

async function getOutletsForTenant(tenantId: number): Promise<OutletInfo[]> {
    return getCollectionOutletsForTenant(tenantId);
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
    const publicCustomerT = createPublicCustomerTranslator(contentLanguage);
    const t = getOBPTranslations(getNextIntlLocaleForPublicLanguage(contentLanguage));
    const allOutlets = await getOutletsForTenant(store.tenantId);
    // G-12 (§11 PUBLIC-ROUTING-DOCTRINE): only outlets with a safe, real
    // outletSlug are ever routable and linkable. The outlet-create API writes
    // safe slugs, but legacy summary/collection data can drift, so public
    // rendering still validates the stored segment before emitting hrefs.
    const outlets = allOutlets
        .map((outlet) => ({
            ...outlet,
            publicOutletSlug: normalizePublicOutletSlug(outlet.outletSlug),
        }))
        .filter((outlet): outlet is OutletInfo & { publicOutletSlug: string } => Boolean(outlet.publicOutletSlug));

    const pp = store?.publicPresence || {};
    const accentColor = resolveOBPAccentColor(pp);
    const languageOptions = getPublicLanguageOptions(store);
    const showLanguageSwitcher = shouldExposePublicLanguageSwitcher(store);
    const activeLanguageName = GlobalLanguagesList.find((language) => language.code === contentLanguage)?.name || contentLanguage.toUpperCase();
    const activeLanguageDirection = GlobalLanguagesList.find((language) => language.code === contentLanguage)?.direction || 'ltr';
    const analyticsPreferences = getResolvedAnalyticsPreferences(store?.analytics);
    const brandName = getBrandName(store, t('publicFallbackBusiness'));
    const logo = store?.logo;
    const businessCover = typeof pp.businessCover === 'string' ? pp.businessCover.trim() : '';
    const firstLetter = brandName.charAt(0);

    return (
        <main
            className={styles.page}
            data-obp-page="true"
            dir={activeLanguageDirection}
            lang={contentLanguage}
            style={{ '--obp-accent': accentColor } as any}
        >
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
                            alt={brandName}
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
                        alt={brandName}
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
                        ? appendPublicLanguageParam(`${baseUrl}/${outlet.publicOutletSlug}`, contentLanguage)
                        : `${baseUrl}/${outlet.publicOutletSlug}`;

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
                    {resolveMenuListAttributionPolicy({ activePlanType: (store as any)?.activePlanType }).showAttribution ? (
                    <div className={`${styles.footerCard} ${styles.footerBrandingCard}`}>
                        <PublicMenuListAttribution
                            activePlanType={(store as any)?.activePlanType}
                            ariaLabel={publicCustomerT('common.createOfficialCustomerLink')}
                            mode="compact"
                            surfaceLabel={t('publicPoweredBy')}
                            rightsLabel={t('publicAllRightsReserved')}
                            ctaLabel={null}
                            mutedColor="#999"
                            containerStyle={{ marginTop: 0, paddingBottom: 0 }}
                        />
                    </div>
                    ) : null}
                </footer>
            </div>
        </main>
    );
}
