/**
 * Menu Footer Component - Contact/Location Display (G09)
 * 
 * Constitutional requirement: Business identity must be visible.
 * Trust signal: Customers need to know who they're ordering from.
 * 
 * HARD RULES:
 * - Always rendered if businessName exists
 * - Cannot be hidden or removed
 * - Fixed positioning in footer trust zone
 * - Minimal, non-intrusive layout
 * - Cross-vertical safe styling
 * 
 * FOOTER CONSTITUTION:
 * - Social links (icons only)
 * - Footer language labels directly activate the selected language
 * 
 * This is trust infrastructure, not marketing space.
 */

import GlobalLanguagesList from '@data/languages';
import PublicMenuListAttribution from '@/components/customer/PublicMenuListAttribution';
import { FEATURE_FLAGS } from '@config/features';
import useDeviceType from '@hook/useDeviceType';
import { trackBeforeNavigate } from '@lib/analytics/trackBeforeNavigate';
import { trackMenuAction, type TrackingData } from '@lib/analytics/unified';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { getStoreStatus } from '@lib/hours';
import { appendPublicLanguageParam } from '@lib/localization/publicRenderLanguage';
import {
    createPublicCustomerTranslator,
    getPublicCustomerLocale,
    type PublicCustomerTranslator,
} from '@lib/localization/publicCustomerMessages';
import { buildTelHref, buildWhatsAppPhoneParam } from '@lib/phone/phoneNumber';
import { resolveMenuListAttributionPolicy } from '@lib/platform/menuListBranding';
import {
    normalizeOBPExternalHttpsUrl,
    normalizeOBPGoogleMapsUrl,
    normalizeOBPSocialUrl,
    type OBPSocialPlatform,
} from '@lib/obp/publicLinks';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { StoreDataType } from '@type/platform/store';
import {
    LuCalendarCheck,
    LuFacebook,
    LuInstagram,
    LuLinkedin,
    LuMapPin,
    LuMessageCircle,
    LuPhone,
    LuShoppingBag,
    LuTwitter,
    LuYoutube,
} from 'react-icons/lu';
import { MenuMoodConfig } from '../designSystem';

interface MenuFooterProps {
    storeDetails?: StoreDataType;
    moodConfig: MenuMoodConfig;
    /** Available languages for read-only display */
    languages?: string[];
    /** Current active language */
    activeLanguage?: string;
    /** Activates a footer language directly */
    onLanguageSelect?: (language: string) => void;
    /** Project ID for feedback link */
    projectId?: string;
    /** Project-level feedback toggle (from menuSettings.feedback) */
    feedbackEnabled?: boolean;
    /** Menu publish version (monotonic, from project.menuVersion) */
    menuVersion?: number;
    /** When menu was last published (from project.lastPublishedAt) */
    lastPublishedAt?: any; // Firestore Timestamp or Date
    showLanguageSelector?: boolean;
    showUpdateMeta?: boolean;
    analyticsIds?: Partial<Pick<TrackingData, 'tenantId' | 'storeId' | 'projectId' | 'storeTimeZone' | 'businessDayEndTime'>>;
    trackingEnabled?: boolean;
    footerExtraAction?: React.ReactNode;
    showFeedbackLink?: boolean;
}

// Social media icon mapping
type MenuFooterSocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'youtube' | 'whatsapp';

const SOCIAL_ICONS: Record<MenuFooterSocialPlatform, React.ElementType> = {
    facebook: LuFacebook,
    instagram: LuInstagram,
    twitter: LuTwitter,
    linkedin: LuLinkedin,
    youtube: LuYoutube,
    whatsapp: LuMessageCircle,
};

function normalizeMenuFooterSocialUrl(platform: string, value: unknown): string | null {
    const normalizedPlatform = platform.toLowerCase();
    if (!(normalizedPlatform in SOCIAL_ICONS)) return null;
    if (normalizedPlatform === 'whatsapp') {
        return normalizeOBPExternalHttpsUrl(value, {
            allowedHostBases: ['wa.me', 'whatsapp.com', 'api.whatsapp.com'],
        });
    }
    return normalizeOBPSocialUrl(normalizedPlatform as OBPSocialPlatform, value);
}

type MenuFooterFreshnessFailureType = 'relative' | 'iso';

const reportedMenuFooterFreshnessFailures = new Set<MenuFooterFreshnessFailureType>();

function getMenuFooterTimestampType(timestamp: unknown): string {
    if (timestamp === null) return 'null';
    if (timestamp === undefined) return 'undefined';
    if (timestamp instanceof Date) return 'date';
    if (typeof timestamp === 'object' && typeof (timestamp as { toDate?: unknown }).toDate === 'function') {
        return 'firestore_timestamp';
    }
    return typeof timestamp;
}

function logMenuFooterFreshnessFailure(
    failureType: MenuFooterFreshnessFailureType,
    error: unknown,
    timestamp: unknown,
): void {
    if (reportedMenuFooterFreshnessFailures.has(failureType)) return;
    reportedMenuFooterFreshnessFailures.add(failureType);

    const failureCode = failureType === 'relative'
        ? 'public_menu_footer_freshness_relative_failed'
        : 'public_menu_footer_freshness_iso_failed';
    const timestampType = getMenuFooterTimestampType(timestamp);

    logRuntimeFailure(failureCode, error, {
        failureType,
        ...getBoundedRuntimeStringContext('timestampType', timestampType),
        hasToDate: typeof (timestamp as { toDate?: unknown } | null | undefined)?.toDate === 'function',
        isDate: timestamp instanceof Date,
        hasWindow: typeof window !== 'undefined',
    });
}

function resolveMenuFooterDate(
    timestamp: unknown,
    failureType: MenuFooterFreshnessFailureType,
): Date | null {
    try {
        const value = typeof (timestamp as { toDate?: unknown } | null | undefined)?.toDate === 'function'
            ? (timestamp as { toDate: () => unknown }).toDate()
            : timestamp;
        const date = value instanceof Date ? value : new Date(value as string | number | Date);
        if (!Number.isFinite(date.getTime())) {
            throw new Error('invalid_last_published_at');
        }
        return date;
    } catch (error) {
        logMenuFooterFreshnessFailure(failureType, error, timestamp);
        return null;
    }
}

/**
 * Format a Firestore Timestamp or Date to a human-readable relative string.
 * Examples: "today", "yesterday", "3 days ago", "Jan 15"
 */
function formatRelativeDate(
    timestamp: any,
    language: string | undefined,
    t: PublicCustomerTranslator,
): string {
    const date = resolveMenuFooterDate(timestamp, 'relative');
    if (!date) return '';

    try {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return t('menu.today');
        if (diffDays === 1) return t('menu.yesterday');
        if (diffDays < 7) return t('menu.daysAgo', { count: diffDays });
        if (diffDays < 30) {
            const weekCount = Math.floor(diffDays / 7);
            return weekCount === 1
                ? t('menu.weekAgo')
                : t('menu.weeksAgo', { count: weekCount });
        }

        return date.toLocaleDateString(getPublicCustomerLocale(language), {
            month: 'short',
            day: 'numeric',
        });
    } catch (error) {
        logMenuFooterFreshnessFailure('relative', error, timestamp);
        return '';
    }
}

function getMenuFooterUpdatedAtIso(timestamp: any): string | undefined {
    try {
        const date = resolveMenuFooterDate(timestamp, 'iso');
        return date?.toISOString();
    } catch (error) {
        logMenuFooterFreshnessFailure('iso', error, timestamp);
        return undefined;
    }
}

export default function MenuFooter({
    storeDetails,
    moodConfig,
    languages = [],
    activeLanguage,
    onLanguageSelect,
    projectId,
    feedbackEnabled,
    menuVersion,
    lastPublishedAt,
    showLanguageSelector = true,
    showUpdateMeta = true,
    analyticsIds,
    trackingEnabled = true,
    footerExtraAction,
    showFeedbackLink = true,
}: MenuFooterProps) {
    const { isMobile } = useDeviceType();
    const t = createPublicCustomerTranslator(activeLanguage);
    // Feedback visibility: Both store-level AND project-level must be enabled
    // Default: true if undefined (opt-out pattern)
    const showFeedback = showFeedbackLink && projectId &&
        storeDetails?.feedbackEnabled !== false &&
        feedbackEnabled !== false;
    // G09 ENFORCEMENT: Business name is required
    // Legacy fallback: show a localized neutral offering name if no store name exists.
    // This ensures footer ALWAYS renders with at least a neutral name
    const businessName = getStoreContextName(storeDetails, t('menu.menuOffering'));

    // Build full address from components (handle undefined storeDetails)
    const addressParts = [
        storeDetails?.addressLine,
        storeDetails?.area,
        storeDetails?.city,
        storeDetails?.state,
        storeDetails?.postalCode,
    ].filter(Boolean);

    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : undefined;
    const publicPresence = storeDetails?.publicPresence;
    const callHref = buildTelHref({
        countryCode: storeDetails?.countryCode,
        dialCode: storeDetails?.dialCode,
        phoneNumber: storeDetails?.phoneNumber,
    }) || undefined;
    const showCall = (publicPresence?.showCall !== false) && !!callHref;
    const whatsappNumber = buildWhatsAppPhoneParam({
        countryCode: storeDetails?.countryCode,
        dialCode: storeDetails?.dialCode,
        phoneNumber: publicPresence?.whatsappNumber || storeDetails?.phoneNumber,
    });
    const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : undefined;
    const showWhatsApp = (publicPresence?.showWhatsApp !== false) && !!whatsappHref;
    const directionsHref = normalizeOBPGoogleMapsUrl(publicPresence?.googleMapsUrl) || (fullAddress ? `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}` : undefined);
    const reservationHref = normalizeOBPExternalHttpsUrl(publicPresence?.reservationUrl) || undefined;
    const orderHref = normalizeOBPExternalHttpsUrl(publicPresence?.orderUrl) || undefined;
    const showDirections = (publicPresence?.showDirections !== false) && !!directionsHref;
    const showReservation = (publicPresence?.showReservation !== false) && !!reservationHref;
    const showOrder = (publicPresence?.showOrder !== false) && !!orderHref;
    const shouldTrackMenuActions = trackingEnabled && !!analyticsIds?.tenantId && !!analyticsIds?.storeId && !!analyticsIds?.projectId;
    const displayPhone = storeDetails?.phoneNumber
        ? storeDetails?.dialCode && !storeDetails.phoneNumber.startsWith('+')
            ? `${storeDetails.dialCode} ${storeDetails.phoneNumber}`
            : storeDetails.phoneNumber
        : '';
    const visibleActionCount = [
        showCall,
        showWhatsApp,
        showDirections,
        showReservation,
        showOrder,
    ].filter(Boolean).length;
    const homeHref = appendPublicLanguageParam('/', activeLanguage);
    const useSingleRowActions = visibleActionCount > 1 && visibleActionCount <= 3 && !showReservation && !showOrder;
    const useFullWidthActionGrid = isMobile && useSingleRowActions;
    const relativeUpdatedAt = lastPublishedAt
        ? formatRelativeDate(lastPublishedAt, activeLanguage, t)
        : '';
    const lastUpdatedIso = lastPublishedAt ? getMenuFooterUpdatedAtIso(lastPublishedAt) : undefined;
    const showFreshnessText = Boolean(relativeUpdatedAt);

    // Get social media links that have values
    const socialLinks = storeDetails?.socialMedia
        ? Object.entries(storeDetails.socialMedia)
            .map(([platform, url]) => {
                const normalizedPlatform = platform.toLowerCase();
                const safeUrl = normalizeMenuFooterSocialUrl(normalizedPlatform, url);
                return safeUrl ? [normalizedPlatform, safeUrl] as const : null;
            })
            .filter((link): link is readonly [MenuFooterSocialPlatform, string] => Boolean(link))
        : [];
    const policyLinks = FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES
        ? [
            publicPresence?.showPrivacyLink !== false ? { href: appendPublicLanguageParam('/privacy', activeLanguage), label: t('menu.privacy') } : null,
            publicPresence?.showTermsLink !== false ? { href: appendPublicLanguageParam('/terms', activeLanguage), label: t('menu.terms') } : null,
            publicPresence?.showRefundLink !== false ? { href: appendPublicLanguageParam('/refund', activeLanguage), label: t('menu.refund') } : null,
        ].filter((link): link is { href: string; label: string } => Boolean(link))
        : [];
    const footerCardStyle: React.CSSProperties = {
        width: '100%',
        boxSizing: 'border-box' as const,
        border: `1px solid ${moodConfig.itemStyle.borderColor}`,
        borderRadius: Math.max(12, moodConfig.itemStyle.borderRadius || 12),
        background: moodConfig.itemStyle.background,
        padding: isMobile ? '16px' : '20px 24px',
        textAlign: 'center' as const,
    };
    const contactActionsStyle: React.CSSProperties = useFullWidthActionGrid ? {
        display: 'grid',
        gap: 8,
        gridTemplateColumns: `repeat(${visibleActionCount}, minmax(0, 1fr))`,
        marginTop: 12,
        width: '100%',
    } : {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
        marginTop: 14,
    };
    const contactActionStyle: React.CSSProperties = {
        color: moodConfig.accentColor,
        textDecoration: 'none',
        border: `1px solid ${moodConfig.itemStyle.borderColor}`,
        borderRadius: 999,
        minHeight: isMobile ? 40 : 36,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: useFullWidthActionGrid ? '8px 8px' : '8px 18px',
        fontSize: 13,
        lineHeight: '20px',
        fontWeight: 600,
        fontFamily: moodConfig.bodyFont,
        minInlineSize: useFullWidthActionGrid ? 0 : 132,
        minWidth: 0,
        width: useFullWidthActionGrid ? '100%' : undefined,
        whiteSpace: 'nowrap',
    };
    const hasWorkingHours = !!storeDetails?.workingHours && Object.keys(storeDetails.workingHours).length > 0;
    const openHoursState: TrackingData['openHoursState'] = hasWorkingHours
        ? (getStoreStatus(storeDetails.workingHours, storeDetails.timeZone).isOpen ? 'open' : 'closed')
        : 'unknown';

    const handleMenuAction = (menuAction: 'call' | 'whatsapp' | 'directions' | 'reserve' | 'order') => {
        if (!shouldTrackMenuActions) return Promise.resolve();
        return trackMenuAction(menuAction, {
            tenantId: analyticsIds?.tenantId,
            storeId: String(analyticsIds?.storeId),
            projectId: analyticsIds?.projectId,
            storeTimeZone: analyticsIds?.storeTimeZone,
            businessDayEndTime: analyticsIds?.businessDayEndTime,
            openHoursState,
        });
    };
    const showMenuListAttribution = resolveMenuListAttributionPolicy({
        activePlanType: (storeDetails as any)?.activePlanType,
    }).showAttribution;

    // Get language native names for display
    const getLanguageDisplay = (code: string) => {
        const lang = GlobalLanguagesList.find(l => l.code === code);
        return lang?.nativeName || code.toUpperCase();
    };

    return (
        <footer
            className="py-6 px-4 text-center"
            style={{
                width: '100%',
                boxSizing: 'border-box',
                marginTop: '22px',
                padding: '20px 0 0',
                textAlign: 'center',
                fontFamily: moodConfig.bodyFont,
                color: moodConfig.bodyColor,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
            }}
            aria-label={t('menu.businessInformation')}
        >
            <div style={footerCardStyle}>
            {/*
             * T1-N-02 / A-09 + D-12 PUBLIC-ROUTING-DOCTRINE: the footer brand
             * links to the tenant's OBP root. After G-02 made the header logo
             * decorative on public pages, this is the canonical "back to
             * business home" affordance — must remain a real anchor.
            */}
            <a
                href={homeHref}
                aria-label={t('menu.businessHome', { businessName })}
                style={{
                    color: moodConfig.headingColor,
                    fontWeight: 700,
                    fontSize: '17px',
                    lineHeight: 1.25,
                    fontFamily: moodConfig.headingFont,
                    textDecoration: 'none',
                    display: 'inline-block',
                    overflowWrap: 'anywhere',
                }}
            >
                {businessName}
            </a>

            {fullAddress && (
                <p style={{
                    color: moodConfig.bodyColor,
                    fontSize: '14px',
                    lineHeight: 1.45,
                    margin: '6px 0 0 0',
                    fontFamily: moodConfig.bodyFont,
                    opacity: 0.82,
                }}>
                    {fullAddress}
                </p>
            )}

            {(showCall || showWhatsApp || showDirections || showReservation || showOrder) && (
                <div style={contactActionsStyle}>
                    {showCall && callHref && (
                        <a
                            href={callHref}
                            data-footer-contact-action="true"
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: callHref,
                                track: () => handleMenuAction('call'),
                            })}
                            style={contactActionStyle}
                            aria-label={displayPhone
                                ? t('menu.callPhone', { phone: displayPhone })
                                : t('menu.call')}
                        >
                            <LuPhone size={16} aria-hidden="true" />
                            <span>{t('menu.call')}</span>
                        </a>
                    )}
                    {showWhatsApp && whatsappHref && (
                        <a
                            href={whatsappHref}
                            data-footer-contact-action="true"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: whatsappHref,
                                target: '_blank',
                                track: () => handleMenuAction('whatsapp'),
                            })}
                            style={contactActionStyle}
                        >
                            <LuMessageCircle size={16} aria-hidden="true" />
                            <span>{t('menu.whatsApp')}</span>
                        </a>
                    )}
                    {showDirections && directionsHref && (
                        <a
                            href={directionsHref}
                            data-footer-contact-action="true"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: directionsHref,
                                target: '_blank',
                                track: () => handleMenuAction('directions'),
                            })}
                            style={contactActionStyle}
                        >
                            <LuMapPin size={16} aria-hidden="true" />
                            <span>{t('menu.directions')}</span>
                        </a>
                    )}
                    {showReservation && reservationHref && (
                        <a
                            href={reservationHref}
                            data-footer-contact-action="true"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: reservationHref,
                                target: '_blank',
                                track: () => handleMenuAction('reserve'),
                            })}
                            style={contactActionStyle}
                        >
                            <LuCalendarCheck size={16} aria-hidden="true" />
                            <span>{t('menu.reserve')}</span>
                        </a>
                    )}
                    {showOrder && orderHref && (
                        <a
                            href={orderHref}
                            data-footer-contact-action="true"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: orderHref,
                                target: '_blank',
                                track: () => handleMenuAction('order'),
                            })}
                            style={contactActionStyle}
                        >
                            <LuShoppingBag size={16} aria-hidden="true" />
                            <span>{t('menu.order')}</span>
                        </a>
                    )}
                </div>
            )}

            {storeDetails?.phoneNumber && (!showCall || !callHref) && (
                <p style={{
                    color: moodConfig.bodyColor,
                    fontSize: '14px',
                    lineHeight: '20px',
                    margin: '10px 0 0 0',
                    fontFamily: moodConfig.bodyFont,
                }}>
                    {showCall && callHref ? (
                        <a
                            href={callHref}
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: callHref,
                                track: () => handleMenuAction('call'),
                            })}
                            style={{
                                color: moodConfig.accentColor,
                                textDecoration: 'none',
                            }}
                        >
                            {displayPhone}
                        </a>
                    ) : (
                        <span>
                            {displayPhone}
                        </span>
                    )}
                </p>
            )}

            {/* Social Links - Icons only */}
            {socialLinks.length > 0 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '12px',
                }}>
                    {socialLinks.map(([platform, url]) => {
                        const Icon = SOCIAL_ICONS[platform];

                        return (
                            <a
                                key={platform}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    color: moodConfig.bodyColor,
                                    opacity: 0.6,
                                    transition: 'opacity 0.2s',
                                    width: 34,
                                    height: 34,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 999,
                                }}
                                className="hover:opacity-100"
                                aria-label={t('menu.visitSocial', { platform })}
                            >
                                <Icon size={16} />
                            </a>
                        );
                    })}
                </div>
            )}

            {policyLinks.length > 0 && (
                <nav
                    aria-label={t('menu.policyLinks')}
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        gap: '10px',
                        marginTop: '12px',
                    }}
                >
                    {policyLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            style={{
                                color: moodConfig.bodyColor,
                                fontSize: '12px',
                                lineHeight: '18px',
                                opacity: 0.58,
                                textDecoration: 'none',
                                fontFamily: moodConfig.bodyFont,
                            }}
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>
            )}

            {/* Guest Feedback Link */}
            {/* Shows only if both store and project have feedback enabled */}
            {showFeedback && (
                <a
                    href={appendPublicLanguageParam(
                        `/feedback/${projectId}?source=menu_footer`,
                        activeLanguage,
                    )}
                    style={{
                        display: 'inline-block',
                        color: moodConfig.bodyColor,
                        fontSize: '14px',
                        lineHeight: '20px',
                        marginTop: '12px',
                        opacity: 0.62,
                        textDecoration: 'none',
                        fontFamily: moodConfig.bodyFont,
                    }}
                    className="hover:opacity-100"
                >
                    {t('menu.shareFeedback')}
                </a>
            )}

            {footerExtraAction ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                    {footerExtraAction}
                </div>
            ) : null}

            {/* Language selector */}
            {showLanguageSelector && languages.length > 1 && (
                <nav
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '14px',
                        width: '100%',
                        flexWrap: 'wrap',
                    }}
                    aria-label={t('menu.changeLanguage')}
                >
                    {languages.map((lang, index) => (
                        <button
                            key={lang}
                            type="button"
                            onClick={() => onLanguageSelect?.(lang)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: lang === activeLanguage ? moodConfig.accentColor : moodConfig.bodyColor,
                                cursor: 'pointer',
                                fontSize: '13px',
                                lineHeight: '18px',
                                fontFamily: moodConfig.bodyFont,
                                fontWeight: lang === activeLanguage ? 600 : 400,
                                minHeight: 36,
                                opacity: lang === activeLanguage ? 1 : 0.6,
                                padding: '6px 0',
                            }}
                            aria-current={lang === activeLanguage ? 'true' : undefined}
                        >
                            {getLanguageDisplay(lang)}
                            {index < languages.length - 1 && (
                                <span style={{ marginInlineStart: '8px', opacity: 0.3 }}>•</span>
                            )}
                        </button>
                    ))}
                </nav>
            )}

            {/* Canonical Truth: Version + Timestamp (machine-readable, trust signal) */}
            {showUpdateMeta && (menuVersion || showFreshnessText) && (
                <p
                    style={{
                        color: moodConfig.bodyColor,
                        fontSize: '12px',
                        lineHeight: '18px',
                        marginTop: '14px',
                        opacity: 0.4,
                        fontFamily: moodConfig.bodyFont,
                    }}
                    data-menu-version={menuVersion}
                    data-last-updated={lastUpdatedIso}
                >
                    {showFreshnessText && t('menu.updated', { when: relativeUpdatedAt })}
                    {menuVersion && showFreshnessText && ' · '}
                    {menuVersion && `v${menuVersion}`}
                </p>
            )}
            </div>

            {showMenuListAttribution ? (
            <div style={{ ...footerCardStyle, padding: '13px 16px', textAlign: 'center' }}>
                <PublicMenuListAttribution
                    activePlanType={(storeDetails as any)?.activePlanType}
                    ariaLabel={t('common.createOfficialCustomerLink')}
                    mode="compact"
                    rightsLabel={t('common.allRightsReserved')}
                    surfaceLabel={t('common.poweredByMenuList')}
                    mutedColor={moodConfig.bodyColor}
                    accentColor={moodConfig.accentColor}
                    containerStyle={{ marginTop: 0, paddingBottom: 0 }}
                />
            </div>
            ) : null}
        </footer>
    );
}
