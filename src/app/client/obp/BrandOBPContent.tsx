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
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { getLocalizedText, getPrimaryLocalizedLanguage } from "@lib/localization/text";
import { getStoreOpenStatus } from "@lib/obp/hoursStatus";
import { resolveHoursOutput } from "@lib/outputControl";
import { StoreDataType } from "@type/platform/store";
import {
    collection,
    getDocs,
    query,
    where,
} from "firebase/firestore";
import { getTranslations } from "next-intl/server";
import { unstable_cache } from "next/cache";
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
    modifiedOn?: any;
}

// Fetch all active outlets for a tenant
const getOutletsForTenant = unstable_cache(
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
                    isMaster: data.isMaster,
                    modifiedOn: data.modifiedOn,
                } as OutletInfo & { isMaster?: boolean };
            })
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

interface BrandOBPContentProps {
    store: StoreDataType;
    baseUrl: string;
}

export default async function BrandOBPContent({ store, baseUrl }: BrandOBPContentProps) {
    const t = await getTranslations({ namespace: 'BusinessSettings' });
    const allOutlets = await getOutletsForTenant(store.tenantId, store.storeId);
    // G-12 (§11 PUBLIC-ROUTING-DOCTRINE): only outlets with a real outletSlug
    // are ever routable and linkable. The outlet-create API guarantees a slug
    // on every new outlet; anything missing a slug here is structurally
    // broken and should not be exposed to customers.
    const outlets = allOutlets.filter((o: any) => !!o?.outletSlug);

    const pp = store?.publicPresence || {};
    const accentColor = pp.accentColor || '#111';
    const contentLanguage = store?.defaultLanguage || store?.activeLanguages?.[0] || store?.language || 'en';
    const brandName = getLocalizedText(
        pp.displayName,
        contentLanguage,
        getPrimaryLocalizedLanguage(pp.displayName, contentLanguage),
        store?.name?.replace(/ - Main Store$/, '') || 'Business',
    );
    const logo = store?.logo;
    const firstLetter = brandName.charAt(0);

    return (
        <div className={styles.page}>
            {/* Brand Identity */}
            <div className={styles.identity}>
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
            </div>

            {/* Location Cards */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: '0 20px',
                maxWidth: 480,
                margin: '0 auto',
                width: '100%',
            }}>
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
                    const showBadge = hoursOutput ? hoursOutput.showStatusBadge : true;
                    // G-12 (§11 PUBLIC-ROUTING-DOCTRINE): outletSlug is the
                    // only acceptable outlet URL segment. Outlets without a
                    // slug are filtered out earlier in this render (see the
                    // guard above the map); the `store-${storeId}` fallback
                    // that used to live here was removed because it would
                    // produce indexable URLs that aren't owner-chosen.
                    const outletUrl = `${baseUrl}/${outlet.outletSlug}`;

                    return (
                        <a
                            key={outlet.storeId}
                            href={outletUrl}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 14,
                                padding: '14px 16px',
                                borderRadius: 12,
                                border: '1px solid #e5e5e5',
                                textDecoration: 'none',
                                color: 'inherit',
                                background: '#fff',
                                transition: 'box-shadow 0.15s',
                            }}
                        >
                            {/* Outlet mini logo or initial */}
                            {outlet.logo ? (
                                <img
                                    src={outlet.logo}
                                    alt={outlet.name}
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 8,
                                        objectFit: 'cover',
                                        flexShrink: 0,
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 8,
                                    background: accentColor,
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 18,
                                    fontWeight: 600,
                                    flexShrink: 0,
                                }}>
                                    {getLocalizedText(
                                        outlet.name,
                                        contentLanguage,
                                        getPrimaryLocalizedLanguage(outlet.name, contentLanguage),
                                        '?',
                                    ).charAt(0)}
                                </div>
                            )}

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: 15,
                                    fontWeight: 600,
                                    lineHeight: 1.3,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}>
                                    {getLocalizedText(
                                        outlet.name,
                                        contentLanguage,
                                        getPrimaryLocalizedLanguage(outlet.name, contentLanguage),
                                        'Outlet',
                                    ).replace(/ - Main Store$/, '')}
                                </div>
                                {(outlet.city || outlet.addressLine) && (
                                    <div style={{
                                        fontSize: 13,
                                        color: '#666',
                                        marginTop: 2,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        {outlet.city || outlet.addressLine}
                                    </div>
                                )}
                            </div>

                            {/* Open/Closed badge — confidence-gated */}
                            {showBadge ? (
                                <div style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: '3px 8px',
                                    borderRadius: 20,
                                    background: status.isOpen ? '#dcfce7' : '#fee2e2',
                                    color: status.isOpen ? '#166534' : '#991b1b',
                                    flexShrink: 0,
                                    whiteSpace: 'nowrap',
                                }}>
                                    {status.isOpen ? t('publicOpen') : t('publicClosed')}
                                </div>
                            ) : (
                                <div style={{
                                    fontSize: 11,
                                    fontWeight: 500,
                                    padding: '3px 8px',
                                    color: '#94a3b8',
                                    flexShrink: 0,
                                    whiteSpace: 'nowrap',
                                }}>
                                    {status.statusText}
                                </div>
                            )}
                        </a>
                    );
                })}
            </div>

            {/* Footer */}
            <footer className={styles.footer}>
                <span className={styles.footerText}>{t('publicPoweredBy')}</span>
            </footer>
        </div>
    );
}
