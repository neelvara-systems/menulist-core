import { Metadata } from 'next';
import { getStaticCanonicaAppleStartupImages } from '@lib/canonica/pwaAssets';
import CanonicaAnalytics from './components/CanonicaAnalytics';
import CanonicaScrollReveal from './components/CanonicaScrollReveal';
import { buildCanonicaUrl, CANONICA_SITE_DESCRIPTION, CANONICA_SITE_TITLE, CANONICA_SITE_URL } from './siteConfig';
import { CANONICA_THEME_COLOR } from './theme';
import './styles.css';
import './scroll-reveal.css';

export const metadata: Metadata = {
    applicationName: 'Canonica',
    authors: [{ name: 'Canonica', url: CANONICA_SITE_URL }],
    creator: 'Canonica',
    publisher: 'Canonica',
    category: 'customer support software',
    title: {
        default: CANONICA_SITE_TITLE,
        template: '%s | Canonica',
    },
    description: CANONICA_SITE_DESCRIPTION,
    metadataBase: new URL(CANONICA_SITE_URL),
    keywords: [
        'support knowledge infrastructure',
        'SaaS support widget',
        'page-aware support',
        'page-aware support widget',
        'support widget for solo founders',
        'support for AI-built SaaS',
        'AI-built SaaS support',
        'vibe-coded SaaS support',
        'hosted help center for SaaS',
        'AI help center with approved answers',
        'SaaS help widget',
        'hosted help center',
        'custom help domain',
        'widget install',
        'ticket debugging context',
        'canonical answers',
        'support knowledge governance',
        'drift detection',
        'help center software',
        'support gap tracking',
        'changelog support',
        'product surface mapping',
        'product support ontology',
    ],
    manifest: '/canonica.webmanifest',
    icons: {
        icon: [
            { url: '/canonica-favicon.ico', sizes: 'any' },
            { url: '/canonica-favicon-16.png', sizes: '16x16', type: 'image/png' },
            { url: '/canonica-favicon-32.png', sizes: '32x32', type: 'image/png' },
            { url: '/canonica-icon-192.png', sizes: '192x192', type: 'image/png' },
        ],
        apple: [{ url: '/canonica-apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    appleWebApp: {
        capable: true,
        title: 'Canonica',
        statusBarStyle: 'black-translucent',
        startupImage: getStaticCanonicaAppleStartupImages(),
    },
    formatDetection: {
        telephone: false,
    },
    openGraph: {
        title: CANONICA_SITE_TITLE,
        description: CANONICA_SITE_DESCRIPTION,
        url: CANONICA_SITE_URL,
        siteName: 'Canonica',
        images: [
            {
                url: buildCanonicaUrl('/canonica-og-image.png'),
                width: 1200,
                height: 630,
                alt: CANONICA_SITE_TITLE,
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: CANONICA_SITE_TITLE,
        description: CANONICA_SITE_DESCRIPTION,
        images: [buildCanonicaUrl('/canonica-og-image.png')],
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
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    themeColor: CANONICA_THEME_COLOR,
};

interface CanonicaLayoutProps {
    children: React.ReactNode;
}

export default function CanonicaWebsiteLayout({ children }: CanonicaLayoutProps) {
    return (
        <div className="canonica-site antialiased">
            <CanonicaAnalytics />
            <CanonicaScrollReveal />
            {/* CanonicaClientLayout is imported dynamically to avoid making the entire layout a client component */}
            {children}
        </div>
    );
}
