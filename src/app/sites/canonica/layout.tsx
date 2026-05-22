import { Metadata } from 'next';
import { buildCanonicaUrl, CANONICA_SITE_DESCRIPTION, CANONICA_SITE_URL } from './siteConfig';
import './styles.css';

export const metadata: Metadata = {
    applicationName: 'Canonica',
    authors: [{ name: 'Canonica', url: CANONICA_SITE_URL }],
    creator: 'Canonica',
    publisher: 'Canonica',
    category: 'customer support software',
    title: {
        default: 'Canonica — Support Knowledge Control Plane for SaaS',
        template: '%s | Canonica',
    },
    description: CANONICA_SITE_DESCRIPTION,
    metadataBase: new URL(CANONICA_SITE_URL),
    keywords: [
        'support knowledge infrastructure',
        'SaaS support widget',
        'page-aware support',
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
            { url: '/canonica-favicon-32.png', sizes: '32x32', type: 'image/png' },
            { url: '/canonica-icon-192.png', sizes: '192x192', type: 'image/png' },
        ],
        apple: [{ url: '/canonica-icon-192.png', sizes: '192x192', type: 'image/png' }],
    },
    appleWebApp: {
        capable: true,
        title: 'Canonica',
        statusBarStyle: 'black-translucent',
    },
    formatDetection: {
        telephone: false,
    },
    openGraph: {
        title: 'Canonica — Support Knowledge Control Plane for SaaS',
        description: CANONICA_SITE_DESCRIPTION,
        url: CANONICA_SITE_URL,
        siteName: 'Canonica',
        images: [
            {
                url: buildCanonicaUrl('/canonica-og-image.png'),
                width: 1200,
                height: 630,
                alt: 'Canonica — Support Knowledge Control Plane for SaaS',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Canonica — Support Knowledge Control Plane for SaaS',
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
    themeColor: '#0a0a1a',
};

interface CanonicaLayoutProps {
    children: React.ReactNode;
}

export default function CanonicaWebsiteLayout({ children }: CanonicaLayoutProps) {
    return (
        <div className="canonica-site antialiased">
            {/* CanonicaClientLayout is imported dynamically to avoid making the entire layout a client component */}
            {children}
        </div>
    );
}
