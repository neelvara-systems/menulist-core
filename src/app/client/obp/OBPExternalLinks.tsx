'use client';

import { getSessionId } from '@lib/analytics/session';
import { trackBeforeNavigate } from '@lib/analytics/trackBeforeNavigate';
import { trackOBPLinkClick } from '@lib/analytics/unified';
import type { ElementType } from 'react';
import { LuGlobe, LuStar } from 'react-icons/lu';
import { TbBrandFacebook, TbBrandInstagram, TbBrandLinkedin, TbBrandTwitter, TbBrandWhatsapp, TbBrandYoutube } from 'react-icons/tb';
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
    labels?: Partial<Record<Exclude<OBPTrackedLink, 'google_review'>, string>>;
    socialAriaLabelTemplate?: string;
    instagram?: string | null;
    facebook?: string | null;
    twitter?: string | null;
    linkedin?: string | null;
    youtube?: string | null;
    whatsapp?: string | null;
    website?: string | null;
}

type OBPTrackedLink = 'google_review' | 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube' | 'whatsapp' | 'website';

const SOCIAL_ICONS: Partial<Record<OBPTrackedLink, ElementType>> = {
    instagram: TbBrandInstagram,
    facebook: TbBrandFacebook,
    twitter: TbBrandTwitter,
    linkedin: TbBrandLinkedin,
    youtube: TbBrandYoutube,
    whatsapp: TbBrandWhatsapp,
};

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
    labels,
    socialAriaLabelTemplate,
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
    const InstagramIcon = SOCIAL_ICONS.instagram;
    const FacebookIcon = SOCIAL_ICONS.facebook;
    const TwitterIcon = SOCIAL_ICONS.twitter;
    const LinkedinIcon = SOCIAL_ICONS.linkedin;
    const YoutubeIcon = SOCIAL_ICONS.youtube;
    const WhatsappIcon = SOCIAL_ICONS.whatsapp;
    const getSocialLabel = (platform: Exclude<OBPTrackedLink, 'google_review'>) => labels?.[platform] || platform;
    const getSocialAriaLabel = (platform: Exclude<OBPTrackedLink, 'google_review'>) => (
        socialAriaLabelTemplate
            ? socialAriaLabelTemplate.replace('{platform}', getSocialLabel(platform))
            : getSocialLabel(platform)
    );

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
                            aria-label={getSocialAriaLabel('instagram')}
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: instagramUrl,
                                target: '_blank',
                                track: () => handleClick('instagram'),
                            })}
                        >
                            {InstagramIcon ? <InstagramIcon aria-hidden="true" size={20} /> : null}
                        </a>
                    ) : null}
                    {facebook ? (
                        <a
                            href={facebookUrl}
                            className={styles.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={getSocialAriaLabel('facebook')}
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: facebookUrl,
                                target: '_blank',
                                track: () => handleClick('facebook'),
                            })}
                        >
                            {FacebookIcon ? <FacebookIcon aria-hidden="true" size={20} /> : null}
                        </a>
                    ) : null}
                    {twitter ? (
                        <a
                            href={twitterUrl}
                            className={styles.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={getSocialAriaLabel('twitter')}
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: twitterUrl,
                                target: '_blank',
                                track: () => handleClick('twitter'),
                            })}
                        >
                            {TwitterIcon ? <TwitterIcon aria-hidden="true" size={20} /> : null}
                        </a>
                    ) : null}
                    {linkedin ? (
                        <a
                            href={linkedinUrl}
                            className={styles.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={getSocialAriaLabel('linkedin')}
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: linkedinUrl,
                                target: '_blank',
                                track: () => handleClick('linkedin'),
                            })}
                        >
                            {LinkedinIcon ? <LinkedinIcon aria-hidden="true" size={20} /> : null}
                        </a>
                    ) : null}
                    {youtube ? (
                        <a
                            href={youtubeUrl}
                            className={styles.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={getSocialAriaLabel('youtube')}
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: youtubeUrl,
                                target: '_blank',
                                track: () => handleClick('youtube'),
                            })}
                        >
                            {YoutubeIcon ? <YoutubeIcon aria-hidden="true" size={20} /> : null}
                        </a>
                    ) : null}
                    {whatsapp ? (
                        <a
                            href={whatsappUrl}
                            className={styles.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={getSocialAriaLabel('whatsapp')}
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: whatsappUrl,
                                target: '_blank',
                                track: () => handleClick('whatsapp'),
                            })}
                        >
                            {WhatsappIcon ? <WhatsappIcon aria-hidden="true" size={20} /> : null}
                        </a>
                    ) : null}
                    {website ? (
                        <a
                            href={websiteUrl}
                            className={styles.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={getSocialAriaLabel('website')}
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
