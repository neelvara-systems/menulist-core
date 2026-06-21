import type { Metadata, Viewport } from 'next';
import PublicCookieConsentBanner from '@/components/shared/publicCookieConsent/PublicCookieConsentBanner';
import CampaignCueScrollReveal from './components/CampaignCueScrollReveal';
import {
    CAMPAIGNCUE_SITE_DESCRIPTION,
    CAMPAIGNCUE_SITE_TITLE,
    CAMPAIGNCUE_SITE_URL,
    buildCampaignCueUrl,
} from '@constant/campaigncue/website';

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
    manifest: '/campaigncue.webmanifest',
    icons: {
        icon: [{ url: '/campaigncue-icon.svg', type: 'image/svg+xml' }],
    },
    appleWebApp: {
        capable: true,
        title: 'CampaignCue',
        statusBarStyle: 'default',
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
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary',
        title: CAMPAIGNCUE_SITE_TITLE,
        description: CAMPAIGNCUE_SITE_DESCRIPTION,
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
    themeColor: '#061a78',
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
