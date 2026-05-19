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

const siteTitle = 'MenuList - Upload Your Menu Online';
const siteDescription = 'Start with your current menu. MenuList turns it into a live menu, official page, QR, web link, customer view, and PDF from one approved source.';
const siteImage = '/images/website/menulist-og-official-source.png';

export const metadata: Metadata = {
    title: siteTitle,
    description: siteDescription,
    metadataBase: new URL(siteUrl),
    openGraph: {
        title: siteTitle,
        description: siteDescription,
        url: siteUrl,
        siteName: 'MenuList',
        images: [
            {
                url: siteImage,
                width: 1200,
                height: 630,
                alt: 'MenuList - upload your menu online preview',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: siteTitle,
        description: siteDescription,
        images: [siteImage],
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
