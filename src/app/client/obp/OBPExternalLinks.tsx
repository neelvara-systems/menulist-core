'use client';

import { getSessionId } from '@lib/analytics/session';
import { trackBeforeNavigate } from '@lib/analytics/trackBeforeNavigate';
import { trackOBPLinkClick } from '@lib/analytics/unified';
import { normalizeOBPReviewUrl, normalizeOBPSocialUrl, normalizeOBPWebsiteUrl } from '@lib/obp/publicLinks';
import { buildWhatsAppPhoneParam } from '@lib/phone/phoneNumber';
import { useState, type ElementType } from 'react';
import { LuExternalLink, LuGlobe } from 'react-icons/lu';
import type { OwnerCustomSocialMediaLink } from '@lib/obp/ownerSocialMediaBoundary';
import { TbBrandFacebook, TbBrandInstagram, TbBrandLinkedin, TbBrandTwitter, TbBrandWhatsapp, TbBrandYoutube } from 'react-icons/tb';
import styles from './obp.module.scss';

interface OBPExternalLinksProps {
    tenantId: number;
    storeId: number;
    trackingEnabled?: boolean;
    includeLocation?: boolean;
    storeTimeZone?: string;
    businessDayEndTime?: string;
    openHoursState?: OBPOpenHoursState;
    countryCode?: string;
    dialCode?: string;
    googleReviewLabel?: string;
    googleReviewUrl?: string;
    labels?: Partial<Record<Exclude<OBPTrackedLink, 'google_review'>, string>>;
    socialAriaLabelTemplate?: string;
    placeholderPlatforms?: OBPSocialLink[];
    placeholderMessage?: string;
    instagram?: string | null;
    facebook?: string | null;
    twitter?: string | null;
    linkedin?: string | null;
    youtube?: string | null;
    whatsapp?: string | null;
    website?: string | null;
    customLinks?: OwnerCustomSocialMediaLink[];
}

type OBPTrackedLink = 'google_review' | 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube' | 'whatsapp' | 'website';
type OBPSocialLink = Exclude<OBPTrackedLink, 'google_review'>;
type OBPOpenHoursState = 'open' | 'closed' | 'unknown';

const SOCIAL_ICONS: Partial<Record<OBPTrackedLink, ElementType>> = {
    instagram: TbBrandInstagram,
    facebook: TbBrandFacebook,
    twitter: TbBrandTwitter,
    linkedin: TbBrandLinkedin,
    youtube: TbBrandYoutube,
    whatsapp: TbBrandWhatsapp,
};

export default function OBPExternalLinks({
    tenantId,
    storeId,
    trackingEnabled = true,
    includeLocation = false,
    storeTimeZone,
    businessDayEndTime,
    openHoursState = 'unknown',
    countryCode,
    dialCode,
    googleReviewLabel,
    googleReviewUrl,
    labels,
    socialAriaLabelTemplate,
    placeholderPlatforms = [],
    placeholderMessage,
    instagram,
    facebook,
    twitter,
    linkedin,
    youtube,
    whatsapp,
    website,
    customLinks = [],
}: OBPExternalLinksProps) {
    const [placeholderNotice, setPlaceholderNotice] = useState('');
    const reviewUrl = normalizeOBPReviewUrl(googleReviewUrl);
    const instagramUrl = normalizeOBPSocialUrl('instagram', instagram);
    const facebookUrl = normalizeOBPSocialUrl('facebook', facebook);
    const twitterUrl = normalizeOBPSocialUrl('twitter', twitter);
    const linkedinUrl = normalizeOBPSocialUrl('linkedin', linkedin);
    const youtubeUrl = normalizeOBPSocialUrl('youtube', youtube);
    const whatsappDigits = whatsapp ? buildWhatsAppPhoneParam({ countryCode, dialCode, phoneNumber: whatsapp }) : '';
    const whatsappUrl = whatsappDigits ? `https://wa.me/${whatsappDigits}` : '';
    const websiteUrl = normalizeOBPWebsiteUrl(website);
    const hasSocials = !!(instagramUrl || facebookUrl || twitterUrl || linkedinUrl || youtubeUrl || whatsappUrl || websiteUrl || customLinks.length || placeholderPlatforms.length);
    const hasReview = !!(reviewUrl && googleReviewLabel);

    if (!hasSocials && !hasReview) return null;

    const handleClick = (obpLink: OBPTrackedLink) => {
        if (!trackingEnabled) return Promise.resolve();
        return trackOBPLinkClick(storeId, obpLink, {
            tenantId,
            sessionId: getSessionId(),
            storeTimeZone,
            businessDayEndTime,
            openHoursState,
            includeLocation,
        });
    };

    const InstagramIcon = SOCIAL_ICONS.instagram;
    const FacebookIcon = SOCIAL_ICONS.facebook;
    const TwitterIcon = SOCIAL_ICONS.twitter;
    const LinkedinIcon = SOCIAL_ICONS.linkedin;
    const YoutubeIcon = SOCIAL_ICONS.youtube;
    const WhatsappIcon = SOCIAL_ICONS.whatsapp;
    const realPlatforms = new Set<OBPSocialLink>([
        ...(instagramUrl ? ['instagram' as const] : []),
        ...(facebookUrl ? ['facebook' as const] : []),
        ...(twitterUrl ? ['twitter' as const] : []),
        ...(linkedinUrl ? ['linkedin' as const] : []),
        ...(youtubeUrl ? ['youtube' as const] : []),
        ...(whatsappUrl ? ['whatsapp' as const] : []),
        ...(websiteUrl ? ['website' as const] : []),
    ]);
    const visiblePlaceholderPlatforms = placeholderPlatforms.filter((platform) => !realPlatforms.has(platform));
    const getSocialLabel = (platform: OBPSocialLink) => labels?.[platform] || platform;
    const getSocialAriaLabel = (platform: OBPSocialLink) => (
        socialAriaLabelTemplate
            ? socialAriaLabelTemplate.replace('{platform}', getSocialLabel(platform))
            : getSocialLabel(platform)
    );
    const handlePlaceholderClick = (platform: OBPSocialLink) => {
        const label = getSocialLabel(platform);
        setPlaceholderNotice(placeholderMessage || `${label} is not set yet.`);
    };
    const renderSocialIcon = (platform: OBPSocialLink) => {
        const Icon = platform === 'website' ? LuGlobe : SOCIAL_ICONS[platform];
        return Icon ? <Icon aria-hidden="true" size={platform === 'website' ? 16 : 20} /> : null;
    };

    return (
        <>
            {hasReview && reviewUrl && googleReviewLabel ? (
                <a
                    href={reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.reviewLink}
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: reviewUrl,
                        target: '_blank',
                        track: () => handleClick('google_review'),
                    })}
                >
                    {googleReviewLabel}
                </a>
            ) : null}

            {hasSocials ? (
                <div className={styles.socials}>
                    {instagramUrl ? (
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
                    {facebookUrl ? (
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
                    {twitterUrl ? (
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
                    {linkedinUrl ? (
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
                    {youtubeUrl ? (
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
                    {whatsappUrl ? (
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
                    {websiteUrl ? (
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
                    {customLinks.map((link) => (
                        <a
                            key={`custom-${link.key}`}
                            href={link.url}
                            className={styles.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={socialAriaLabelTemplate
                                ? socialAriaLabelTemplate.replace('{platform}', link.label)
                                : link.label}
                        >
                            <LuExternalLink aria-hidden="true" size={18} />
                        </a>
                    ))}
                    {visiblePlaceholderPlatforms.map((platform) => (
                        <button
                            key={`placeholder-${platform}`}
                            type="button"
                            className={`${styles.socialLink} ${styles.socialPlaceholder}`}
                            aria-label={`${getSocialAriaLabel(platform)}. ${placeholderMessage || 'Not set yet.'}`}
                            onClick={() => handlePlaceholderClick(platform)}
                        >
                            {renderSocialIcon(platform)}
                        </button>
                    ))}
                    {placeholderNotice ? (
                        <div className={styles.socialPlaceholderNotice} role="status">
                            {placeholderNotice}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </>
    );
}
