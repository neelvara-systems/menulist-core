import '@styles/app.scss';
import '@styles/mobile-theme.css';
import './sites/answerlattice/styles.css';
import './sites/answerlattice/scroll-reveal.css';
import './sites/campaigncue/styles.css';
import './sites/campaigncue/scroll-reveal.css';
import './sites/neelvara/styles.css';
import 'antd/dist/reset.css';
import { Metadata } from 'next';
import { APP_THEME_COLOR } from 'src/constants/common';
import {
    MENULIST_SITE_DESCRIPTION,
    MENULIST_SITE_IMAGE,
    MENULIST_SITE_IMAGE_ALT,
    MENULIST_SITE_TITLE,
    MENULIST_SITE_URL,
} from '@constant/menulist/website';
import { interFont } from 'src/fonts/inter';
import DeploymentBuildBadge from '../components/common/DeploymentBuildBadge';
import ServiceWorkerRegister from '../components/ServiceWorkerRegister';
import AntdRegistry from '../lib/AntdRegistry';

const siteUrl = MENULIST_SITE_URL;

const defaultTitle = MENULIST_SITE_TITLE;
const defaultDescription = MENULIST_SITE_DESCRIPTION;
const defaultImage = MENULIST_SITE_IMAGE;
const appleStartupImages = [
    {
        url: '/splash/apple-splash-1290x2796.png',
        media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        url: '/splash/apple-splash-1179x2556.png',
        media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        url: '/splash/apple-splash-1170x2532.png',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        url: '/splash/apple-splash-1125x2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        url: '/splash/apple-splash-1242x2688.png',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        url: '/splash/apple-splash-828x1792.png',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)',
    },
    {
        url: '/splash/apple-splash-1242x2208.png',
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        url: '/splash/apple-splash-750x1334.png',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
    },
    {
        url: '/splash/apple-splash-640x1136.png',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
    },
];

export const metadata: Metadata = {
    title: defaultTitle,
    description: defaultDescription,
    metadataBase: new URL(siteUrl),
    alternates: {
        canonical: siteUrl,
    },
    manifest: '/manifest.json',
    keywords: ['official menu', 'business menu', 'menu management', 'QR menu', 'official business page', 'multi-location menu'],
    authors: [{ name: 'MenuList', url: siteUrl }],
    openGraph: {
        title: defaultTitle,
        description: defaultDescription,
        url: siteUrl,
        siteName: 'MenuList',
        images: [
            {
                url: defaultImage,
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
        title: defaultTitle,
        description: defaultDescription,
        images: [defaultImage],
    },
    icons: {
        icon: '/favicon.ico',
        apple: '/icons/apple-touch-icon.png',
    },
    appleWebApp: {
        capable: true,
        title: 'MenuList',
        statusBarStyle: 'default',
        startupImage: appleStartupImages,
    },
    formatDetection: {
        telephone: false,
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
    viewportFit: 'cover',
    themeColor: APP_THEME_COLOR,
};

interface RootLayoutProps {
    children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
    const isDev = process.env.NODE_ENV === 'development';

    return (
        <html lang="en" className={`${interFont.variable}`} suppressHydrationWarning={true}>
            <head>
                <meta name="mobile-web-app-capable" content="yes" />
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />
                {/* CSP Violation Monitor (Development Only) */}
                {isDev && (
                    <script dangerouslySetInnerHTML={{
                        __html: `
                            // Local dev must never stay controlled by an old PWA worker.
                            // A stale Workbox registration can serve old _next chunks and
                            // surface as React/webpack "undefined.call" hydration errors.
                            const originalConsoleWarn = console.warn;
                            const getBoundedDevSwErrorContext = (error) => {
                                const isObject = error && typeof error === 'object';
                                const errorName = isObject && error.name ? String(error.name) : typeof error;
                                const errorCode = isObject && error.code ? String(error.code).slice(0, 80) : undefined;
                                const errorStatus = isObject && Number.isFinite(Number(error.status)) ? Number(error.status) : undefined;
                                return {
                                    sourceErrorName: errorName.slice(0, 80),
                                    sourceErrorCode: errorCode,
                                    sourceErrorStatus: errorStatus,
                                };
                            };
                            const logDevServiceWorkerCleanupFailure = (reason, error) => {
                                originalConsoleWarn.call(console, '[App Dev] Service worker cleanup failed', {
                                    reason,
                                    hasController: Boolean(navigator.serviceWorker && navigator.serviceWorker.controller),
                                    hostPresent: Boolean(window.location.hostname),
                                    hostLength: window.location.hostname ? window.location.hostname.length : 0,
                                    ...getBoundedDevSwErrorContext(error),
                                });
                            };
                            (() => {
                                if (!('serviceWorker' in navigator)) return;
                                const host = window.location.hostname;
                                const isLocalHost =
                                    host === 'localhost' ||
                                    host === '0.0.0.0' ||
                                    host.endsWith('.local') ||
                                    /^127(?:\\.\\d{1,3}){3}$/.test(host) ||
                                    /^192\\.168(?:\\.\\d{1,3}){2}$/.test(host) ||
                                    /^10(?:\\.\\d{1,3}){3}$/.test(host) ||
                                    /^172\\.(1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2}$/.test(host);

                                if (!isLocalHost) return;

                                navigator.serviceWorker.getRegistrations()
                                    .then((registrations) => {
                                        if (!registrations.length) return;
                                        return Promise.all(
                                            registrations.map((registration) => registration.unregister().catch((error) => {
                                                logDevServiceWorkerCleanupFailure('unregister_failed', error);
                                                return false;
                                            }))
                                        ).then(() => {
                                            if (!navigator.serviceWorker.controller) return;
                                            try {
                                                const reloadKey = '__app_dev_sw_cleared__';
                                                if (sessionStorage.getItem(reloadKey)) return;
                                                sessionStorage.setItem(reloadKey, '1');
                                                window.location.reload();
                                            } catch {
                                                window.location.reload();
                                            }
                                        });
                                    })
                                    .catch((error) => {
                                        logDevServiceWorkerCleanupFailure('get_registrations_failed', error);
                                    });
                            })();

                            // Suppress known development warnings
                            console.warn = (...args) => {
                                const message = args.join(' ');
                                // Filter out the GenerateSW warning
                                if (message.includes('GenerateSW has been called multiple times')) {
                                    return;
                                }
                                originalConsoleWarn.apply(console, args);
                            };
                            
                            // Monitor CSP violations and show prominent warnings
                            document.addEventListener('securitypolicyviolation', (e) => {
                                const isNextJsNoise = 
                                    e.blockedURI.includes('webpack') || 
                                    e.blockedURI === 'eval' ||
                                    e.blockedURI === 'inline' ||
                                    e.sourceFile?.includes('/_next/') ||
                                    e.sourceFile?.includes('webpack');
                                
                                // Skip Next.js dev mode noise
                                if (isNextJsNoise) return;
                                
                                const violatedDirective = e.violatedDirective;
                                const blockedURI = e.blockedURI;
                                const sourceFile = e.sourceFile || '';

                                originalConsoleWarn.call(console, '[CSP] Non-Next.js resource blocked. Check src/config/csp-allowlist.ts.', {
                                    directive: violatedDirective,
                                    blockedUrlPresent: Boolean(blockedURI),
                                    blockedUrlLength: blockedURI ? blockedURI.length : 0,
                                    sourceFilePresent: Boolean(sourceFile),
                                    sourceFileLength: sourceFile.length,
                                    lineNumber: Number.isFinite(Number(e.lineNumber)) ? Number(e.lineNumber) : undefined,
                                    policyPresent: Boolean(e.originalPolicy),
                                    policyLength: e.originalPolicy ? e.originalPolicy.length : 0,
                                });
                            });
                        `
                    }} />
                )}
            </head>
            <body
                className={`${interFont.className} antialiased font-sans`}
                style={{ backgroundColor: '#ffffff' }}
            >
                <AntdRegistry>
                    {children}
                    <DeploymentBuildBadge />
                    <ServiceWorkerRegister />
                </AntdRegistry>
            </body>
        </html>
    );
}
