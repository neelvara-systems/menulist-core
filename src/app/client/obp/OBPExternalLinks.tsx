'use client';

import { getSessionId } from '@lib/analytics/session';
import { trackBeforeNavigate } from '@lib/analytics/trackBeforeNavigate';
import { trackOBPLinkClick } from '@lib/analytics/unified';
import styles from './obp.module.scss';

interface OBPExternalLinksProps {
    tenantId: number;
    storeId: number;
    trackingEnabled?: boolean;
    includeLocation?: boolean;
    storeTimeZone?: string;
    businessDayEndTime?: string;
    googleReviewLabel?: string;
    googleReviewUrl?: string;
    instagram?: string | null;
    facebook?: string | null;
    website?: string | null;
}

function normalizeUrl(value: string, prefix: string) {
    return value.startsWith('http') ? value : `${prefix}${value}`;
}

export default function OBPExternalLinks({
    tenantId,
    storeId,
    trackingEnabled = true,
    includeLocation = true,
    storeTimeZone,
    businessDayEndTime,
    googleReviewLabel,
    googleReviewUrl,
    instagram,
    facebook,
    website,
}: OBPExternalLinksProps) {
    const hasSocials = !!(instagram || facebook || website);
    const hasReview = !!(googleReviewUrl && googleReviewLabel);

    if (!hasSocials && !hasReview) return null;

    const handleClick = (obpLink: 'google_review' | 'instagram' | 'facebook' | 'website') => {
        if (!trackingEnabled) return Promise.resolve();
        return trackOBPLinkClick(storeId, obpLink, {
            tenantId,
            sessionId: getSessionId(),
            storeTimeZone,
            businessDayEndTime,
            includeLocation,
        });
    };

    const instagramUrl = instagram ? normalizeUrl(instagram, 'https://instagram.com/') : '';
    const facebookUrl = facebook ? normalizeUrl(facebook, 'https://facebook.com/') : '';
    const websiteUrl = website ? normalizeUrl(website, 'https://') : '';

    return (
        <>
            {hasReview && googleReviewUrl && googleReviewLabel ? (
                <a
                    href={googleReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none', color: '#666', fontSize: 13 }}
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: googleReviewUrl,
                        target: '_blank',
                        track: () => handleClick('google_review'),
                    })}
                >
                    {googleReviewLabel}
                </a>
            ) : null}

            {hasSocials ? (
                <div className={styles.socials}>
                    {instagram ? (
                        <a
                            href={instagramUrl}
                            className={styles.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Instagram"
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: instagramUrl,
                                target: '_blank',
                                track: () => handleClick('instagram'),
                            })}
                        >
                            IG
                        </a>
                    ) : null}
                    {facebook ? (
                        <a
                            href={facebookUrl}
                            className={styles.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Facebook"
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: facebookUrl,
                                target: '_blank',
                                track: () => handleClick('facebook'),
                            })}
                        >
                            FB
                        </a>
                    ) : null}
                    {website ? (
                        <a
                            href={websiteUrl}
                            className={styles.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Website"
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: websiteUrl,
                                target: '_blank',
                                track: () => handleClick('website'),
                            })}
                        >
                            🌐
                        </a>
                    ) : null}
                </div>
            ) : null}
        </>
    );
}
