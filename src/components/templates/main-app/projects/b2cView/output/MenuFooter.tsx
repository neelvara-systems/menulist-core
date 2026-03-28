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
 * - Read-only language indicator (clicking scrolls to top + opens header selector)
 * - No direct language switching here (prevents desync with header)
 * 
 * This is trust infrastructure, not marketing space.
 */

import GlobalLanguagesList from '@data/languages';
import { StoreDataType } from '@type/platform/store';
import { TbBrandFacebook, TbBrandInstagram, TbBrandLinkedin, TbBrandTwitter, TbBrandWhatsapp, TbBrandYoutube } from 'react-icons/tb';
import { MenuMoodConfig } from '../designSystem';

interface MenuFooterProps {
    storeDetails?: StoreDataType;
    moodConfig: MenuMoodConfig;
    /** Available languages for read-only display */
    languages?: string[];
    /** Current active language */
    activeLanguage?: string;
    /** Project ID for feedback link */
    projectId?: string;
    /** Project-level feedback toggle (from menuSettings.feedback) */
    feedbackEnabled?: boolean;
    /** Menu publish version (monotonic, from project.menuVersion) */
    menuVersion?: number;
    /** When menu was last published (from project.lastPublishedAt) */
    lastPublishedAt?: any; // Firestore Timestamp or Date
}

// Social media icon mapping
const SOCIAL_ICONS: Record<string, React.ElementType> = {
    facebook: TbBrandFacebook,
    instagram: TbBrandInstagram,
    twitter: TbBrandTwitter,
    linkedin: TbBrandLinkedin,
    youtube: TbBrandYoutube,
    whatsapp: TbBrandWhatsapp,
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
    projectId,
    feedbackEnabled,
    menuVersion,
    lastPublishedAt,
}: MenuFooterProps) {
    // Feedback visibility: Both store-level AND project-level must be enabled
    // Default: true if undefined (opt-out pattern)
    const showFeedback = projectId &&
        storeDetails?.feedbackEnabled !== false &&
        feedbackEnabled !== false;
    // G09 ENFORCEMENT: Business name is required
    // Legacy fallback: Show "Menu" if no store name provided
    // This ensures footer ALWAYS renders with at least a neutral name
    const businessName = storeDetails?.name || 'Menu';

    // Build full address from components (handle undefined storeDetails)
    const addressParts = [
        storeDetails?.addressLine,
        storeDetails?.area,
        storeDetails?.city,
        storeDetails?.state,
        storeDetails?.postalCode,
    ].filter(Boolean);

    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : undefined;

    // Get social media links that have values
    const socialLinks = storeDetails?.socialMedia
        ? Object.entries(storeDetails.socialMedia).filter(([_, url]) => url && url.trim())
        : [];

    // Handle language indicator click - scroll to top to access header selector
    const handleLanguageClick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
                borderColor: moodConfig.itemStyle.borderColor,
                marginTop: '24px',
            }}
            aria-label="Business information"
        >
            <p style={{
                color: moodConfig.headingColor,
                fontWeight: 600,
                fontSize: '14px',
                margin: 0,
                fontFamily: moodConfig.headingFont,
            }}>
                {businessName}
            </p>

            {fullAddress && (
                <p style={{
                    color: moodConfig.bodyColor,
                    fontSize: '13px',
                    margin: '4px 0 0 0',
                    fontFamily: moodConfig.bodyFont,
                }}>
                    {fullAddress}
                </p>
            )}

            {storeDetails?.phoneNumber && (
                <p style={{
                    color: moodConfig.bodyColor,
                    fontSize: '13px',
                    margin: '4px 0 0 0',
                    fontFamily: moodConfig.bodyFont,
                }}>
                    <a
                        href={`tel:${storeDetails?.dialCode || ''}${storeDetails.phoneNumber.replace(/\s/g, '')}`}
                        style={{
                            color: moodConfig.accentColor,
                            textDecoration: 'none',
                        }}
                    >
                        {storeDetails?.dialCode && `${storeDetails.dialCode} `}{storeDetails.phoneNumber}
                    </a>
                </p>
            )}

            {/* Social Links - Icons only */}
            {socialLinks.length > 0 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '16px',
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
                                    opacity: 0.7,
                                    transition: 'opacity 0.2s',
                                }}
                                className="hover:opacity-100"
                                aria-label={`Visit our ${platform}`}
                            >
                                <Icon size={20} />
                            </a>
                        );
                    })}
                </div>
            )}

            {/* Guest Feedback Link */}
            {/* Shows only if both store and project have feedback enabled */}
            {showFeedback && (
                <a
                    href={`/feedback/${projectId}`}
                    style={{
                        display: 'inline-block',
                        color: moodConfig.bodyColor,
                        fontSize: '12px',
                        marginTop: '12px',
                        opacity: 0.7,
                        textDecoration: 'none',
                        fontFamily: moodConfig.bodyFont,
                    }}
                    className="hover:opacity-100"
                >
                    Share Feedback
                </a>
            )}

            {/* Read-only Language Indicator */}
            {/* Constitutional: Clicking scrolls to top where header selector is */}
            {languages.length > 1 && (
                <button
                    onClick={handleLanguageClick}
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '12px',
                        padding: '8px 0',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        width: '100%',
                    }}
                    aria-label="Scroll to top to change language"
                >
                    {languages.map((lang, index) => (
                        <span
                            key={lang}
                            style={{
                                color: lang === activeLanguage ? moodConfig.accentColor : moodConfig.bodyColor,
                                fontSize: '12px',
                                fontFamily: moodConfig.bodyFont,
                                fontWeight: lang === activeLanguage ? 600 : 400,
                                opacity: lang === activeLanguage ? 1 : 0.6,
                            }}
                        >
                            {getLanguageDisplay(lang)}
                            {index < languages.length - 1 && (
                                <span style={{ marginLeft: '8px', opacity: 0.3 }}>•</span>
                            )}
                        </span>
                    ))}
                </button>
            )}

            {/* Canonical Truth: Version + Timestamp (machine-readable, trust signal) */}
            {(menuVersion || lastPublishedAt) && (
                <p
                    style={{
                        color: moodConfig.bodyColor,
                        fontSize: '10px',
                        marginTop: '12px',
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
        </footer>
    );
}
