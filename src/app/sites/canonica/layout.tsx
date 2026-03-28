import { Metadata } from 'next';
import './styles.css';

const canonicaUrl = 'https://canonica.app';

export const metadata: Metadata = {
    title: {
        default: 'Canonica — The Support Knowledge Control Plane for SaaS',
        template: '%s | Canonica',
    },
    description: 'Canonica turns your support knowledge into a single, governed source of truth. Canonical answers. Zero drift. Enterprise-grade knowledge infrastructure.',
    metadataBase: new URL(canonicaUrl),
    openGraph: {
        title: 'Canonica — The Support Knowledge Control Plane for SaaS',
        description: 'Canonica turns your support knowledge into a single, governed source of truth. Canonical answers. Zero drift. Enterprise-grade knowledge infrastructure.',
        url: canonicaUrl,
        siteName: 'Canonica',
        images: [
            {
                url: '/canonica-og-image.png',
                width: 1200,
                height: 630,
                alt: 'Canonica — The Support Knowledge Control Plane for SaaS',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Canonica — The Support Knowledge Control Plane for SaaS',
        description: 'Canonica turns your support knowledge into a single, governed source of truth.',
        images: ['/canonica-og-image.png'],
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
