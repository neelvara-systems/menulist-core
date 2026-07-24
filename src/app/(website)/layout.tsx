import WebsiteAnalyticsConsent from '@/components/website/WebsiteAnalyticsConsent';
import { ThemeProvider } from "@/components/website/shadcn/theme-provider";
import LocalisationProvider from '@providers/localisationProvider';
import "@styles/app.scss";
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';
import WebsiteThemeShortcut from '@/components/website/shared/WebsiteThemeShortcut';
import WebsiteDocumentTheme from '@/components/website/shared/WebsiteDocumentTheme';
import WebsiteProductPathProvider from '@/components/website/shared/WebsiteProductPathProvider';
import SkipToContentLink from '@/components/shared/accessibility/SkipToContentLink';
import WebsiteAuthProvider from "./WebsiteAuthProvider";
import {
    MENULIST_SITE_DESCRIPTION,
    MENULIST_SITE_IMAGE,
    MENULIST_SITE_IMAGE_ALT,
    MENULIST_SITE_TITLE,
    MENULIST_SITE_URL,
} from '@constant/menulist/website';

const siteUrl = MENULIST_SITE_URL;

const siteTitle = MENULIST_SITE_TITLE;
const siteDescription = MENULIST_SITE_DESCRIPTION;
const siteImage = MENULIST_SITE_IMAGE;

async function getWebsiteBasePath(): Promise<string> {
    try {
        const basePath = (await headers()).get('x-product-base-path') || '';
        return basePath === '/ml' ? basePath : '';
    } catch {
        return '';
    }
}

export const metadata: Metadata = {
    title: siteTitle,
    description: siteDescription,
    metadataBase: new URL(siteUrl),
    alternates: {
        canonical: siteUrl,
    },
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
                alt: MENULIST_SITE_IMAGE_ALT,
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
};

// Website layout props type
interface WebsiteLayoutProps {
    children: React.ReactNode;
}

export default async function WebsiteLayout({ children }: WebsiteLayoutProps) {
    // Get locale for internationalization
    const locale = await getLocale();
    const basePath = await getWebsiteBasePath();

    return (
        <LocalisationProvider locale={locale}>
            <WebsiteAuthProvider>
                <ThemeProvider>
                    <WebsiteProductPathProvider basePath={basePath}>
                        <SkipToContentLink />
                        <WebsiteDocumentTheme />
                        <WebsiteThemeShortcut />
                        <WebsiteAnalyticsConsent />
                        <>{children}</>
                    </WebsiteProductPathProvider>
                </ThemeProvider>
            </WebsiteAuthProvider>
        </LocalisationProvider>
    );
}
