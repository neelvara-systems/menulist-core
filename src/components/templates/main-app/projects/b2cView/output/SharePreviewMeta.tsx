/**
 * Share Preview Meta Component (G13)
 * 
 * Constitutional requirement: Links must unfurl cleanly when shared.
 * Generates Open Graph and Twitter Card meta tags for social sharing.
 * 
 * PRIORITY ORDER (primary → fallback):
 * - Title: metaTitle → businessName + "Menu"
 * - Description: metaDescription → tagline → generic
 * - Image: logoUrl → default image
 * - URL: canonicalUrl → menuUrl
 * 
 * HARD RULES:
 * - Must work on all platforms (WhatsApp, iMessage, Facebook, Twitter)
 * - Title should be descriptive, 50-60 chars ideal
 * - Description should be 150-160 chars ideal
 * 
 * CRITICAL RENDER ORDER REQUIREMENT:
 * This component MUST render OUTSIDE any loading gates.
 * OG crawlers see initial SSR/SSG output - they don't wait for client hydration.
 * 
 * CORRECT USAGE:
 * ```tsx
 * <>
 *   <SharePreviewMeta ... />  // ALWAYS renders first (SSR-safe)
 *   {isLoading ? <MenuSkeleton /> : <MenuContent />}
 * </>
 * ```
 * 
 * WRONG USAGE:
 * ```tsx
 * {isLoading ? <MenuSkeleton /> : (
 *   <>
 *     <SharePreviewMeta ... />  // ❌ Never inside loading gate
 *     <MenuContent />
 *   </>
 * )}
 * ```
 */

import Head from 'next/head';

interface SharePreviewMetaProps {
    businessName: string;
    tagline?: string;
    logoUrl?: string;
    menuUrl: string;
    // SEO settings from Business Settings (primary source)
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
}

export default function SharePreviewMeta({
    businessName,
    tagline,
    logoUrl,
    menuUrl,
    // SEO settings (primary)
    metaTitle,
    metaDescription,
    keywords,
    canonicalUrl,
}: SharePreviewMetaProps) {
    // Priority: metaTitle (SEO settings) → businessName + "Menu" (fallback)
    const title = metaTitle || `${businessName} | Menu`;

    // Priority: metaDescription (SEO settings) → tagline (project) → generic
    const description = metaDescription || tagline || `View the menu for ${businessName}`;

    // Fallback image if no logo
    const imageUrl = logoUrl || '/images/default-menu-preview.png';

    // Priority: canonicalUrl (SEO settings) → menuUrl
    const url = canonicalUrl || menuUrl;

    return (
        <Head>
            {/* Primary Meta Tags */}
            <title>{title}</title>
            <meta name="title" content={title} />
            <meta name="description" content={description} />

            {/* Open Graph / Facebook / WhatsApp / iMessage */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={menuUrl} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={imageUrl} />
            <meta property="og:site_name" content={businessName} />

            {/* Twitter Card */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={menuUrl} />
            <meta property="twitter:title" content={title} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={imageUrl} />

            {/* Keywords (if provided from SEO settings) */}
            {keywords && keywords.length > 0 && (
                <meta name="keywords" content={keywords.join(', ')} />
            )}

            {/* Additional SEO */}
            <meta name="robots" content="index, follow" />
            <link rel="canonical" href={url} />
        </Head>
    );
}

/**
 * Generate OG meta tags object for dynamic head injection
 * Use this when you can't use the component directly
 */
export function generateSharePreviewMeta({
    businessName,
    tagline,
    logoUrl,
    menuUrl,
    metaTitle,
    metaDescription,
    keywords,
    canonicalUrl,
}: SharePreviewMetaProps): Record<string, string> {
    // Priority: SEO settings → project data → defaults
    const title = metaTitle || `${businessName} | Menu`;
    const description = metaDescription || tagline || `View the menu for ${businessName}`;
    const imageUrl = logoUrl || '/images/default-menu-preview.png';
    const url = canonicalUrl || menuUrl;

    const meta: Record<string, string> = {
        title,
        description,
        'og:type': 'website',
        'og:url': menuUrl,
        'og:title': title,
        'og:description': description,
        'og:image': imageUrl,
        'og:site_name': businessName,
        'twitter:card': 'summary_large_image',
        'twitter:url': menuUrl,
        'twitter:title': title,
        'twitter:description': description,
        'twitter:image': imageUrl,
        'canonical': url,
    };

    if (keywords && keywords.length > 0) {
        meta.keywords = keywords.join(', ');
    }

    return meta;
}
