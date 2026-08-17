import type { Metadata, Viewport } from 'next';
import {
    NEELVARA_BUSINESS_DESCRIPTION,
    NEELVARA_OG_IMAGE_PATH,
    NEELVARA_PUBLIC_BRAND,
    NEELVARA_SITE_DESCRIPTION,
    NEELVARA_SITE_TITLE,
    NEELVARA_SITE_URL,
    NEELVARA_TRADE_NAME,
    buildNeelvaraUrl,
} from '@constant/neelvara/website';

export const metadata: Metadata = {
    applicationName: NEELVARA_TRADE_NAME,
    authors: [{ name: NEELVARA_TRADE_NAME, url: NEELVARA_SITE_URL }],
    creator: NEELVARA_TRADE_NAME,
    publisher: NEELVARA_TRADE_NAME,
    category: 'business information infrastructure',
    title: {
        default: NEELVARA_SITE_TITLE,
        template: '%s | Neelvara Systems',
    },
    description: NEELVARA_SITE_DESCRIPTION,
    metadataBase: new URL(NEELVARA_SITE_URL),
    manifest: '/neelvara.webmanifest',
    icons: {
        icon: [
            { url: '/neelvara-favicon.svg', type: 'image/svg+xml', sizes: 'any' },
            { url: '/neelvara-favicon-16.png', type: 'image/png', sizes: '16x16' },
            { url: '/neelvara-favicon-32.png', type: 'image/png', sizes: '32x32' },
            { url: '/neelvara-icon-192.png', type: 'image/png', sizes: '192x192' },
            { url: '/neelvara-icon-512.png', type: 'image/png', sizes: '512x512' },
        ],
        apple: [{ url: '/neelvara-apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
    },
    appleWebApp: {
        capable: false,
        title: 'Neelvara Systems',
        statusBarStyle: 'default',
    },
    formatDetection: {
        telephone: false,
    },
    keywords: [
        NEELVARA_TRADE_NAME,
        NEELVARA_PUBLIC_BRAND,
        NEELVARA_BUSINESS_DESCRIPTION,
        'customer-facing business information',
        'software infrastructure for business information',
        'MenuList',
        'Answerlattice',
        'business information infrastructure',
        'business entity website',
    ],
    openGraph: {
        title: NEELVARA_SITE_TITLE,
        description: NEELVARA_SITE_DESCRIPTION,
        url: NEELVARA_SITE_URL,
        siteName: NEELVARA_PUBLIC_BRAND,
        locale: 'en_US',
        type: 'website',
        images: [
            {
                url: buildNeelvaraUrl(NEELVARA_OG_IMAGE_PATH),
                width: 1200,
                height: 630,
                alt: 'Neelvara Systems, Neelvara, MenuList and Answerlattice',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: NEELVARA_SITE_TITLE,
        description: NEELVARA_SITE_DESCRIPTION,
        images: [buildNeelvaraUrl(NEELVARA_OG_IMAGE_PATH)],
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
        canonical: buildNeelvaraUrl('/'),
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
    themeColor: '#f7f9fc',
};

interface NeelvaraLayoutProps {
    children: React.ReactNode;
}

export default function NeelvaraLayout({ children }: NeelvaraLayoutProps) {
    return <>{children}</>;
}
