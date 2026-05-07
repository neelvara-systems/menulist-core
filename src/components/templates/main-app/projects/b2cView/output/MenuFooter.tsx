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
import { trackBeforeNavigate } from '@lib/analytics/trackBeforeNavigate';
import { trackMenuAction, type TrackingData } from '@lib/analytics/unified';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { StoreDataType } from '@type/platform/store';
import { LuFacebook, LuInstagram, LuLinkedin, LuMessageCircle, LuTwitter, LuYoutube } from 'react-icons/lu';
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
}

// Social media icon mapping
const SOCIAL_ICONS: Record<string, React.ElementType> = {
    facebook: LuFacebook,
    instagram: LuInstagram,
    twitter: LuTwitter,
    linkedin: LuLinkedin,
    youtube: LuYoutube,
    whatsapp: LuMessageCircle,
};

/**
 * Format a Firestore Timestamp or Date to a human-readable relative string.
 * Examples: "today", "yesterday", "3 days ago", "Jan 15"
 */
function formatRelativeDate(timestamp: any): string {
    try {
        const date = timestamp?.toDate?.() || (timestamp instanceof Date ? timestamp : new Date(timestamp));
        if (isNaN(date.getTime())) return '';

        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'today';
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    } catch {
        return '';
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
}: MenuFooterProps) {
    // Feedback visibility: Both store-level AND project-level must be enabled
    // Default: true if undefined (opt-out pattern)
    const showFeedback = projectId &&
        storeDetails?.feedbackEnabled !== false &&
        feedbackEnabled !== false;
    // G09 ENFORCEMENT: Business name is required
    // Legacy fallback: Show "Menu" if no store name provided
    // This ensures footer ALWAYS renders with at least a neutral name
    const businessName = getStoreContextName(storeDetails, 'Menu');

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
    const normalizedPhone = storeDetails?.phoneNumber?.replace(/\s+/g, '');
    const callHref = storeDetails?.phoneNumber
        ? storeDetails.phoneNumber.startsWith('+')
            ? `tel:${normalizedPhone}`
            : storeDetails?.dialCode
                ? `tel:${storeDetails.dialCode.startsWith('+') ? storeDetails.dialCode : `+${storeDetails.dialCode}`}${normalizedPhone?.replace(/^0+/, '') || ''}`
                : `tel:${normalizedPhone}`
        : undefined;
    const showCall = (publicPresence?.showCall !== false) && !!callHref;
    const whatsappNumber = (publicPresence?.whatsappNumber || storeDetails?.phoneNumber || '').replace(/[^0-9+]/g, '');
    const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber.replace('+', '')}` : undefined;
    const showWhatsApp = (publicPresence?.showWhatsApp !== false) && !!whatsappHref;
    const directionsHref = publicPresence?.googleMapsUrl || (fullAddress ? `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}` : undefined);
    const showDirections = (publicPresence?.showDirections !== false) && !!directionsHref;
    const showReservation = (publicPresence?.showReservation !== false) && !!publicPresence?.reservationUrl;
    const showOrder = (publicPresence?.showOrder !== false) && !!publicPresence?.orderUrl;
    const shouldTrackMenuActions = trackingEnabled && !!analyticsIds?.tenantId && !!analyticsIds?.storeId && !!analyticsIds?.projectId;
    const displayPhone = storeDetails?.phoneNumber
        ? storeDetails?.dialCode && !storeDetails.phoneNumber.startsWith('+')
            ? `${storeDetails.dialCode} ${storeDetails.phoneNumber}`
            : storeDetails.phoneNumber
        : '';

    // Get social media links that have values
    const socialLinks = storeDetails?.socialMedia
        ? Object.entries(storeDetails.socialMedia).filter(([_, url]) => url && url.trim())
        : [];

    const handleMenuAction = (menuAction: 'call' | 'whatsapp' | 'directions' | 'reserve' | 'order') => {
        if (!shouldTrackMenuActions) return Promise.resolve();
        return trackMenuAction(menuAction, {
            tenantId: analyticsIds?.tenantId,
            storeId: String(analyticsIds?.storeId),
            projectId: analyticsIds?.projectId,
            storeTimeZone: analyticsIds?.storeTimeZone,
            businessDayEndTime: analyticsIds?.businessDayEndTime,
        });
    };

    // Get language native names for display
    const getLanguageDisplay = (code: string) => {
        const lang = GlobalLanguagesList.find(l => l.code === code);
        return lang?.nativeName || code.toUpperCase();
    };

    return (
        <footer
            className="py-6 px-4 text-center border-t"
            style={{
                width: '100%',
                boxSizing: 'border-box',
                borderColor: moodConfig.itemStyle.borderColor,
                borderTop: `1px solid ${moodConfig.itemStyle.borderColor}`,
                marginTop: '22px',
                padding: '20px 0 calc(16px + env(safe-area-inset-bottom))',
                textAlign: 'left',
                fontFamily: moodConfig.bodyFont,
                color: moodConfig.bodyColor,
            }}
            aria-label="Business information"
        >
            {/*
             * T1-N-02 / A-09 + D-12 PUBLIC-ROUTING-DOCTRINE: the footer brand
             * links to the tenant's OBP root. After G-02 made the header logo
             * decorative on public pages, this is the canonical "back to
             * business home" affordance — must remain a real anchor.
             */}
            <a
                href="/"
                aria-label={`${businessName} — business home`}
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
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-start',
                    gap: '8px',
                    marginTop: '12px',
                }}>
                    {showCall && callHref && (
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
                                border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                                borderRadius: 999,
                                minHeight: 40,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                padding: '8px 14px',
                                fontSize: '14px',
                                lineHeight: '20px',
                                fontWeight: 600,
                                fontFamily: moodConfig.bodyFont,
                            }}
                        >
                            <span>Call</span>
                            {displayPhone && (
                                <span
                                    style={{
                                        color: moodConfig.bodyColor,
                                        fontSize: 12,
                                        fontWeight: 500,
                                        opacity: 0.68,
                                    }}
                                >
                                    {displayPhone}
                                </span>
                            )}
                        </a>
                    )}
                    {showWhatsApp && whatsappHref && (
                        <a
                            href={whatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: whatsappHref,
                                target: '_blank',
                                track: () => handleMenuAction('whatsapp'),
                            })}
                            style={{
                                color: moodConfig.accentColor,
                                textDecoration: 'none',
                                border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                                borderRadius: 999,
                                minHeight: 40,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '8px 14px',
                                fontSize: '14px',
                                lineHeight: '20px',
                                fontWeight: 600,
                                fontFamily: moodConfig.bodyFont,
                            }}
                        >
                            WhatsApp
                        </a>
                    )}
                    {showDirections && directionsHref && (
                        <a
                            href={directionsHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: directionsHref,
                                target: '_blank',
                                track: () => handleMenuAction('directions'),
                            })}
                            style={{
                                color: moodConfig.accentColor,
                                textDecoration: 'none',
                                border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                                borderRadius: 999,
                                minHeight: 40,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '8px 14px',
                                fontSize: '14px',
                                lineHeight: '20px',
                                fontWeight: 600,
                                fontFamily: moodConfig.bodyFont,
                            }}
                        >
                            Directions
                        </a>
                    )}
                    {showReservation && publicPresence?.reservationUrl && (
                        <a
                            href={publicPresence.reservationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: publicPresence.reservationUrl,
                                target: '_blank',
                                track: () => handleMenuAction('reserve'),
                            })}
                            style={{
                                color: moodConfig.accentColor,
                                textDecoration: 'none',
                                border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                                borderRadius: 999,
                                minHeight: 40,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '8px 14px',
                                fontSize: '14px',
                                lineHeight: '20px',
                                fontWeight: 600,
                                fontFamily: moodConfig.bodyFont,
                            }}
                        >
                            Reserve
                        </a>
                    )}
                    {showOrder && publicPresence?.orderUrl && (
                        <a
                            href={publicPresence.orderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: publicPresence.orderUrl,
                                target: '_blank',
                                track: () => handleMenuAction('order'),
                            })}
                            style={{
                                color: moodConfig.accentColor,
                                textDecoration: 'none',
                                border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                                borderRadius: 999,
                                minHeight: 40,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '8px 14px',
                                fontSize: '14px',
                                lineHeight: '20px',
                                fontWeight: 600,
                                fontFamily: moodConfig.bodyFont,
                            }}
                        >
                            Order
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
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '12px',
                }}>
                    {socialLinks.map(([platform, url]) => {
                        const Icon = SOCIAL_ICONS[platform.toLowerCase()];
                        if (!Icon) return null;

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
                                aria-label={`Visit our ${platform}`}
                            >
                                <Icon size={16} />
                            </a>
                        );
                    })}
                </div>
            )}

            {/* Guest Feedback Link */}
            {/* Shows only if both store and project have feedback enabled */}
            {showFeedback && (
                <a
                    href={`/feedback/${projectId}?source=menu_footer`}
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
                    Share Feedback
                </a>
            )}

            {/* Language selector */}
            {showLanguageSelector && languages.length > 1 && (
                <nav
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-start',
                        gap: '8px',
                        marginTop: '14px',
                        width: '100%',
                        flexWrap: 'wrap',
                    }}
                    aria-label="Change menu language"
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
                                <span style={{ marginLeft: '8px', opacity: 0.3 }}>•</span>
                            )}
                        </button>
                    ))}
                </nav>
            )}

            {/* Canonical Truth: Version + Timestamp (machine-readable, trust signal) */}
            {showUpdateMeta && (menuVersion || lastPublishedAt) && (
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
                    data-last-updated={lastPublishedAt?.toDate?.()?.toISOString?.() || lastPublishedAt}
                >
                    {lastPublishedAt && `Updated ${formatRelativeDate(lastPublishedAt)}`}
                    {menuVersion && lastPublishedAt && ' · '}
                    {menuVersion && `v${menuVersion}`}
                </p>
            )}

            <PublicMenuListAttribution
                mode="compact"
                rightsLabel={null}
                mutedColor={moodConfig.bodyColor}
                accentColor={moodConfig.accentColor}
            />
        </footer>
    );
}
