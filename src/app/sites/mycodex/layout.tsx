import { Metadata, Viewport } from 'next';
import './styles.css';

import { Inter } from 'next/font/google';
import {
    MYCODEX_MANIFEST_PATH,
    MYCODEX_SITE_URL,
    MYCODEX_THEME_COLOR,
    getStaticMyCodexAppleStartupImages,
} from '@lib/mycodex/pwaAssets';


const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
});

export const metadata: Metadata = {
    applicationName: 'MyCodex',
    metadataBase: new URL(MYCODEX_SITE_URL),
    title: {
        default: 'MyCodex — Personal Brain Reader',
        template: '%s | MyCodex',
    },
    description: 'Personal Brain & Documentation Reader for MenuList and Cascade persistence brain documentation.',
    manifest: MYCODEX_MANIFEST_PATH,
    icons: {
        icon: [
            { url: '/mycodex-logo.svg', type: 'image/svg+xml' },
            { url: '/mycodex-favicon-16.png', sizes: '16x16', type: 'image/png' },
            { url: '/mycodex-favicon-32.png', sizes: '32x32', type: 'image/png' },
            { url: '/mycodex-icon-192.png', sizes: '192x192', type: 'image/png' },
        ],
        apple: [{ url: '/mycodex-apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    appleWebApp: {
        capable: true,
        title: 'MyCodex',
        statusBarStyle: 'black-translucent',
        startupImage: getStaticMyCodexAppleStartupImages(),
    },
    formatDetection: {
        telephone: false,
    },
    other: {
        'mobile-web-app-capable': 'yes',
        'color-scheme': 'light dark',
    },
    robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
            'max-snippet': -1,
            'max-image-preview': 'none',
            'max-video-preview': -1,
        },
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    themeColor: MYCODEX_THEME_COLOR,
    viewportFit: 'cover',
};

/**
 * Inline script that runs synchronously before any paint to set the correct
 * dark/light class on <html> — prevents flash of wrong theme on load. If
 * storage or media-query access is blocked, it falls back to light mode.
 */
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch {
    document.documentElement.classList.remove('dark');
  }
})();
`;

interface MyCodexLayoutProps {
    children: React.ReactNode;
}

export default function MyCodexLayout({ children }: MyCodexLayoutProps) {
    return (
        <div
            className={`${inter.variable} mycodex-app-shell font-sans min-h-screen flex flex-col bg-white text-zinc-900 antialiased selection:bg-purple-500/30 selection:text-purple-700 dark:bg-zinc-950 dark:text-zinc-50 dark:selection:text-purple-200`}
        >
            {/* Anti-FOUC: set dark class before first paint */}
            {/* eslint-disable-next-line react/no-danger */}
            <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            {children}
        </div>
    );
}
