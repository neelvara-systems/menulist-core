import { Metadata } from 'next';
import { getStaticAnswerlatticeAppleStartupImages } from '@lib/answerlattice/pwaAssets';
import AnswerlatticeAnalytics from './components/AnswerlatticeAnalytics';
import AnswerlatticeScrollReveal from './components/AnswerlatticeScrollReveal';
import { AnswerlatticeThemeProvider } from './components/AnswerlatticeThemeProvider';
import { buildAnswerlatticeUrl, ANSWERLATTICE_SITE_DESCRIPTION, ANSWERLATTICE_SITE_TITLE, ANSWERLATTICE_SITE_URL } from './siteConfig';
import {
    ANSWERLATTICE_DARK_THEME_COLOR,
    ANSWERLATTICE_LIGHT_THEME_COLOR,
    ANSWERLATTICE_THEME_STORAGE_KEY,
} from './theme';

export const metadata: Metadata = {
    applicationName: 'AnswerLattice',
    authors: [{ name: 'AnswerLattice', url: ANSWERLATTICE_SITE_URL }],
    creator: 'AnswerLattice',
    publisher: 'AnswerLattice',
    category: 'customer support software',
    title: {
        default: ANSWERLATTICE_SITE_TITLE,
        template: '%s | AnswerLattice',
    },
    description: ANSWERLATTICE_SITE_DESCRIPTION,
    metadataBase: new URL(ANSWERLATTICE_SITE_URL),
    keywords: [
        'support knowledge infrastructure',
        'SaaS support widget',
        'founder-led SaaS support',
        'in-app support widget',
        'safe page context',
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
        'approved answers',
        'support knowledge review',
        'support gap review',
        'help center software',
        'support gap tracking',
        'changelog support',
        'product surface mapping',
        'reviewable support answers',
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
        title: 'AnswerLattice',
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
        siteName: 'AnswerLattice',
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
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: ANSWERLATTICE_LIGHT_THEME_COLOR },
        { media: '(prefers-color-scheme: dark)', color: ANSWERLATTICE_DARK_THEME_COLOR },
    ],
};

interface AnswerlatticeLayoutProps {
    children: React.ReactNode;
}

function AnswerlatticeThemeBootstrapScript() {
    const script = `
        (() => {
            try {
                const storedTheme = window.localStorage.getItem(${JSON.stringify(ANSWERLATTICE_THEME_STORAGE_KEY)});
                const theme = storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system' ? storedTheme : 'system';
                const resolvedTheme = theme === 'system'
                    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
                    : theme;
                document.documentElement.dataset.answerlatticeTheme = resolvedTheme;
                document.documentElement.style.colorScheme = resolvedTheme;
                const themeColor = resolvedTheme === 'light'
                    ? ${JSON.stringify(ANSWERLATTICE_LIGHT_THEME_COLOR)}
                    : ${JSON.stringify(ANSWERLATTICE_DARK_THEME_COLOR)};
                document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
                    meta.setAttribute('content', themeColor);
                });
            } catch (error) {
                document.documentElement.dataset.answerlatticeTheme = 'dark';
            }
        })();
    `;

    return <script id="answerlattice-theme-bootstrap" dangerouslySetInnerHTML={{ __html: script }} />;
}

export default function AnswerlatticeWebsiteLayout({ children }: AnswerlatticeLayoutProps) {
    return (
        <>
            <AnswerlatticeThemeBootstrapScript />
            <AnswerlatticeThemeProvider>
                <AnswerlatticeAnalytics />
                <AnswerlatticeScrollReveal />
                {/* AnswerlatticeClientLayout is imported dynamically to avoid making the entire layout a client component */}
                {children}
            </AnswerlatticeThemeProvider>
        </>
    );
}
