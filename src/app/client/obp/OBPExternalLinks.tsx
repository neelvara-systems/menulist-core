'use client';

import { getSessionId } from '@lib/analytics/session';
import { trackBeforeNavigate } from '@lib/analytics/trackBeforeNavigate';
import { trackOBPLinkClick } from '@lib/analytics/unified';
import { LuGlobe, LuStar } from 'react-icons/lu';
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
    twitter?: string | null;
    linkedin?: string | null;
    youtube?: string | null;
    whatsapp?: string | null;
    website?: string | null;
}

type OBPTrackedLink = 'google_review' | 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube' | 'whatsapp' | 'website';

function normalizeUrl(value: string, prefix: string) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) return trimmed;
    return `${prefix}${trimmed.replace(/^@/, '')}`;
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
    twitter,
    linkedin,
    youtube,
    whatsapp,
    website,
}: OBPExternalLinksProps) {
    const hasSocials = !!(instagram || facebook || twitter || linkedin || youtube || whatsapp || website);
    const hasReview = !!(googleReviewUrl && googleReviewLabel);

    if (!hasSocials && !hasReview) return null;

    const handleClick = (obpLink: OBPTrackedLink) => {
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
    const twitterUrl = twitter ? normalizeUrl(twitter, 'https://twitter.com/') : '';
    const linkedinUrl = linkedin ? normalizeUrl(linkedin, 'https://linkedin.com/in/') : '';
    const youtubeUrl = youtube ? normalizeUrl(youtube, 'https://youtube.com/') : '';
    const whatsappUrl = whatsapp ? normalizeUrl(whatsapp.replace(/[^0-9+]/g, '').replace('+', ''), 'https://wa.me/') : '';
    const websiteUrl = website ? normalizeUrl(website, 'https://') : '';

    return (
        <>
            {hasReview && googleReviewUrl && googleReviewLabel ? (
                <a
                    href={googleReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.reviewLink}
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: googleReviewUrl,
                        target: '_blank',
                        track: () => handleClick('google_review'),
                    })}
                >
                    <LuStar aria-hidden="true" size={14} />
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
                    {twitter ? (
                        <a
                            href={twitterUrl}
                            className={styles.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Twitter"
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: twitterUrl,
                                target: '_blank',
                                track: () => handleClick('twitter'),
                            })}
                        >
                            X
                        </a>
                    ) : null}
                    {linkedin ? (
                        <a
                            href={linkedinUrl}
                            className={styles.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="LinkedIn"
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: linkedinUrl,
                                target: '_blank',
                                track: () => handleClick('linkedin'),
                            })}
                        >
                            IN
                        </a>
                    ) : null}
                    {youtube ? (
                        <a
                            href={youtubeUrl}
                            className={styles.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="YouTube"
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: youtubeUrl,
                                target: '_blank',
                                track: () => handleClick('youtube'),
                            })}
                        >
                            YT
                        </a>
                    ) : null}
                    {whatsapp ? (
                        <a
                            href={whatsappUrl}
                            className={styles.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="WhatsApp"
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: whatsappUrl,
                                target: '_blank',
                                track: () => handleClick('whatsapp'),
                            })}
                        >
                            WA
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
                            <LuGlobe aria-hidden="true" size={16} />
                        </a>
                    ) : null}
                </div>
            ) : null}
        </>
    );
}
