import type { Metadata, Viewport } from 'next';
import ConstantLayerCookieConsentBanner from './ConstantLayerCookieConsentBanner';
import './styles.css';
import {
    CONSTANTLAYER_SITE_DESCRIPTION,
    CONSTANTLAYER_SITE_TITLE,
    CONSTANTLAYER_SITE_URL,
    buildConstantLayerUrl,
} from '@constant/constantlayer/website';

export const metadata: Metadata = {
    applicationName: 'ConstantLayer Systems',
    authors: [{ name: 'ConstantLayer Systems', url: CONSTANTLAYER_SITE_URL }],
    creator: 'ConstantLayer Systems',
    publisher: 'ConstantLayer Systems',
    category: 'business information infrastructure',
    title: {
        default: CONSTANTLAYER_SITE_TITLE,
        template: '%s | ConstantLayer Systems',
    },
    description: CONSTANTLAYER_SITE_DESCRIPTION,
    metadataBase: new URL(CONSTANTLAYER_SITE_URL),
    manifest: '/constantlayer.webmanifest',
    icons: {
        icon: [{ url: '/constantlayer-icon.svg', type: 'image/svg+xml' }],
    },
    appleWebApp: {
        capable: false,
        title: 'ConstantLayer Systems',
        statusBarStyle: 'default',
    },
    formatDetection: {
        telephone: false,
    },
    keywords: [
        'ConstantLayer Systems',
        'product portfolio operating layer',
        'MenuList',
        'Answerlattice',
        'CampaignCue',
        'business information infrastructure',
        'small business operating systems',
        'business entity website',
    ],
    openGraph: {
        title: CONSTANTLAYER_SITE_TITLE,
        description: CONSTANTLAYER_SITE_DESCRIPTION,
        url: CONSTANTLAYER_SITE_URL,
        siteName: 'ConstantLayer Systems',
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary',
        title: CONSTANTLAYER_SITE_TITLE,
        description: CONSTANTLAYER_SITE_DESCRIPTION,
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
        canonical: buildConstantLayerUrl('/'),
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    themeColor: '#07070d',
};

interface ConstantLayerLayoutProps {
    children: React.ReactNode;
}

export default function ConstantLayerLayout({ children }: ConstantLayerLayoutProps) {
    return (
        <>
            {children}
            <ConstantLayerCookieConsentBanner />
        </>
    );
}
