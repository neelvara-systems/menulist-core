import { Metadata } from 'next';
import { getStaticAnswerlatticeAppleStartupImages } from '@lib/answerlattice/pwaAssets';
import AnswerlatticeAnalytics from './components/AnswerlatticeAnalytics';
import AnswerlatticeScrollReveal from './components/AnswerlatticeScrollReveal';
import { buildAnswerlatticeUrl, ANSWERLATTICE_SITE_DESCRIPTION, ANSWERLATTICE_SITE_TITLE, ANSWERLATTICE_SITE_URL } from './siteConfig';
import { ANSWERLATTICE_THEME_COLOR } from './theme';

export const metadata: Metadata = {
    applicationName: 'Answerlattice',
    authors: [{ name: 'Answerlattice', url: ANSWERLATTICE_SITE_URL }],
    creator: 'Answerlattice',
    publisher: 'Answerlattice',
    category: 'customer support software',
    title: {
        default: ANSWERLATTICE_SITE_TITLE,
        template: '%s | Answerlattice',
    },
    description: ANSWERLATTICE_SITE_DESCRIPTION,
    metadataBase: new URL(ANSWERLATTICE_SITE_URL),
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
    manifest: '/answerlattice.webmanifest',
    icons: {
        icon: [
            { url: '/answerlattice-favicon.ico', sizes: 'any' },
            { url: '/answerlattice-favicon-16.png', sizes: '16x16', type: 'image/png' },
            { url: '/answerlattice-favicon-32.png', sizes: '32x32', type: 'image/png' },
            { url: '/answerlattice-icon-192.png', sizes: '192x192', type: 'image/png' },
        ],
        apple: [{ url: '/answerlattice-apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    appleWebApp: {
        capable: true,
        title: 'Answerlattice',
        statusBarStyle: 'black-translucent',
        startupImage: getStaticAnswerlatticeAppleStartupImages(),
    },
    formatDetection: {
        telephone: false,
    },
    openGraph: {
        title: ANSWERLATTICE_SITE_TITLE,
        description: ANSWERLATTICE_SITE_DESCRIPTION,
        url: ANSWERLATTICE_SITE_URL,
        siteName: 'Answerlattice',
        images: [
            {
                url: buildAnswerlatticeUrl('/answerlattice-og-image.png'),
                width: 1200,
                height: 630,
                alt: ANSWERLATTICE_SITE_TITLE,
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: ANSWERLATTICE_SITE_TITLE,
        description: ANSWERLATTICE_SITE_DESCRIPTION,
        images: [buildAnswerlatticeUrl('/answerlattice-og-image.png')],
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
    themeColor: ANSWERLATTICE_THEME_COLOR,
};

interface AnswerlatticeLayoutProps {
    children: React.ReactNode;
}

export default function AnswerlatticeWebsiteLayout({ children }: AnswerlatticeLayoutProps) {
    return (
        <div className="answerlattice-site antialiased">
            <AnswerlatticeAnalytics />
            <AnswerlatticeScrollReveal />
            {/* AnswerlatticeClientLayout is imported dynamically to avoid making the entire layout a client component */}
            {children}
        </div>
    );
}
