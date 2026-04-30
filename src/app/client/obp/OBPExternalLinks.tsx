'use client';

import { getSessionId } from '@lib/analytics/session';
import { trackOBPLinkClick } from '@lib/analytics/unified';
import styles from './obp.module.scss';

interface OBPExternalLinksProps {
    tenantId: number;
    storeId: number;
    trackingEnabled?: boolean;
    includeLocation?: boolean;
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
        if (!trackingEnabled) return;
        trackOBPLinkClick(storeId, obpLink, {
            tenantId,
            sessionId: getSessionId(),
            includeLocation,
        }).catch(() => { });
    };

    return (
        <>
            {hasReview && googleReviewUrl && googleReviewLabel ? (
                <a
                    href={googleReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none', color: '#666', fontSize: 13 }}
                    onClick={() => handleClick('google_review')}
                >
                    {googleReviewLabel}
                </a>
            ) : null}

            {hasSocials ? (
                <div className={styles.socials}>
                    {instagram ? (
                        <a
                            href={normalizeUrl(instagram, 'https://instagram.com/')}
                            className={styles.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Instagram"
                            onClick={() => handleClick('instagram')}
                        >
                            IG
                        </a>
                    ) : null}
                    {facebook ? (
                        <a
                            href={normalizeUrl(facebook, 'https://facebook.com/')}
                            className={styles.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Facebook"
                            onClick={() => handleClick('facebook')}
                        >
                            FB
                        </a>
                    ) : null}
                    {website ? (
                        <a
                            href={normalizeUrl(website, 'https://')}
                            className={styles.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Website"
                            onClick={() => handleClick('website')}
                        >
                            🌐
                        </a>
                    ) : null}
                </div>
            ) : null}
        </>
    );
}
