import ClarityAnalytics from '@/components/website/ClarityAnalytics';
import GoogleAnalytics from '@/components/website/GoogleAnalytics';
import { ThemeProvider } from "@/components/website/shadcn/theme-provider";
import LocalisationProvider from '@providers/localisationProvider';
import "@styles/app.scss";
import { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import WebsiteAuthProvider from "./WebsiteAuthProvider";


import { PLATFORM_URL } from '@constant/urls';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || PLATFORM_URL;

export const metadata: Metadata = {
    title: 'MenuList — Upload Your Menu. Your Business is Online.',
    description: 'Turn a menu photo into your digital menu, QR menu, and official business page — in minutes, not months. One menu, everywhere customers look.',
    metadataBase: new URL(siteUrl),
    openGraph: {
        title: 'MenuList — Upload Your Menu. Your Business is Online.',
        description: 'Turn a menu photo into your digital menu, QR menu, and official business page — in minutes, not months. One menu, everywhere customers look.',
        url: siteUrl,
        siteName: 'MenuList',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'MenuList — Where your menu lives',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'MenuList — Upload Your Menu. Your Business is Online.',
        description: 'Turn a menu photo into your digital menu, QR menu, and official business page — in minutes, not months. One menu, everywhere customers look.',
        images: ['/og-image.png'],
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

// Next.js 14 separate viewport configuration
export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1
};

// Website layout props type
interface WebsiteLayoutProps {
    children: React.ReactNode;
}

export default async function WebsiteLayout({ children }: WebsiteLayoutProps) {
    // Get locale for internationalization
    const locale = await getLocale();

    return (
        <LocalisationProvider locale={locale}>
            <WebsiteAuthProvider>
                <ThemeProvider forcedTheme="light">
                    <GoogleAnalytics />
                    <ClarityAnalytics />
                    <>{children}</>
                </ThemeProvider>
            </WebsiteAuthProvider>
        </LocalisationProvider>
    );
}