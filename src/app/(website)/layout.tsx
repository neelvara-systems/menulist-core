import WebsiteAnalyticsConsent from '@/components/website/WebsiteAnalyticsConsent';
import { ThemeProvider } from "@/components/website/shadcn/theme-provider";
import LocalisationProvider from '@providers/localisationProvider';
import "@styles/app.scss";
import { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import WebsiteThemeShortcut from '@/components/website/shared/WebsiteThemeShortcut';
import WebsiteAuthProvider from "./WebsiteAuthProvider";


import { PLATFORM_URL } from '@constant/urls';

const siteUrl = PLATFORM_URL;

const siteTitle = 'MenuList - One Official Menu Source for Customers';
const siteDescription = 'Upload your current menu. Review the prepared version. Publish one official menu, page, QR link, screen, PDF, and customer view from the same owner-approved source.';
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
                alt: 'MenuList official menu source preview',
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
                <ThemeProvider>
                    <WebsiteThemeShortcut />
                    <WebsiteAnalyticsConsent />
                    <>{children}</>
                </ThemeProvider>
            </WebsiteAuthProvider>
        </LocalisationProvider>
    );
}
