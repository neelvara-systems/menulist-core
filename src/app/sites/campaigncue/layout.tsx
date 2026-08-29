import './styles.css';
import './scroll-reveal.css';
import type { Metadata, Viewport } from 'next';
import PublicCookieConsentBanner from '@/components/shared/publicCookieConsent/PublicCookieConsentBanner';
import CampaignCueScrollReveal from './components/CampaignCueScrollReveal';
import {
    CAMPAIGNCUE_SITE_DESCRIPTION,
    CAMPAIGNCUE_SITE_TITLE,
    CAMPAIGNCUE_SITE_URL,
    buildCampaignCueUrl,
} from '@constant/campaigncue/website';
import {
    CAMPAIGNCUE_MANIFEST_PATH,
    CAMPAIGNCUE_SITE_THEME_COLOR,
    getStaticCampaignCueAppleStartupImages,
} from '@lib/campaigncue/pwaAssets';

export const metadata: Metadata = {
    applicationName: 'CampaignCue',
    authors: [{ name: 'CampaignCue', url: CAMPAIGNCUE_SITE_URL }],
    creator: 'CampaignCue',
    publisher: 'CampaignCue',
    category: 'local business marketing software',
    title: {
        default: CAMPAIGNCUE_SITE_TITLE,
        template: '%s | CampaignCue',
    },
    description: CAMPAIGNCUE_SITE_DESCRIPTION,
    metadataBase: new URL(CAMPAIGNCUE_SITE_URL),
    manifest: CAMPAIGNCUE_MANIFEST_PATH,
    icons: {
        icon: [
            { url: '/campaigncue-favicon.ico', sizes: 'any' },
            { url: '/campaigncue-icon.svg', type: 'image/svg+xml' },
            { url: '/campaigncue-favicon-16.png', sizes: '16x16', type: 'image/png' },
            { url: '/campaigncue-favicon-32.png', sizes: '32x32', type: 'image/png' },
            { url: '/campaigncue-icon-192.png', sizes: '192x192', type: 'image/png' },
        ],
        apple: [{ url: '/campaigncue-apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    appleWebApp: {
        capable: true,
        title: 'CampaignCue',
        statusBarStyle: 'default',
        startupImage: getStaticCampaignCueAppleStartupImages(),
    },
    formatDetection: {
        telephone: false,
    },
    keywords: [
        'local business campaign packs',
        'restaurant marketing content',
        'salon marketing content',
        'WhatsApp campaign pack',
        'Google Business Profile post ideas',
        'local campaign planning',
        'source checked campaign content',
    ],
    openGraph: {
        title: CAMPAIGNCUE_SITE_TITLE,
        description: CAMPAIGNCUE_SITE_DESCRIPTION,
        url: CAMPAIGNCUE_SITE_URL,
        siteName: 'CampaignCue',
        images: [
            {
                url: buildCampaignCueUrl('/campaigncue-og-image.png'),
                width: 1200,
                height: 630,
                alt: CAMPAIGNCUE_SITE_TITLE,
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: CAMPAIGNCUE_SITE_TITLE,
        description: CAMPAIGNCUE_SITE_DESCRIPTION,
        images: [buildCampaignCueUrl('/campaigncue-og-image.png')],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    alternates: {
        canonical: buildCampaignCueUrl('/'),
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    themeColor: CAMPAIGNCUE_SITE_THEME_COLOR,
};

interface CampaignCueLayoutProps {
    children: React.ReactNode;
}

export default function CampaignCueLayout({ children }: CampaignCueLayoutProps) {
    return (
        <>
            <CampaignCueScrollReveal />
            {children}
            <PublicCookieConsentBanner
                acceptLabel="Okay"
                message="We use essential storage to keep this site working and remember basic preferences."
                panelLabel="Cookie preference"
                product="campaigncue"
                showDecline={false}
                storageKey="campaigncue_website_cookie_ack_v1"
            />
        </>
    );
}
