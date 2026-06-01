import '@styles/app.scss';
import '@styles/mobile-theme.css';
import './sites/answerlattice/styles.css';
import './sites/answerlattice/scroll-reveal.css';
import 'antd/dist/reset.css';
import { Metadata } from 'next';
import { PLATFORM_URL } from '@constant/urls';
import { APP_THEME_COLOR } from 'src/constants/common';
import { interFont } from 'src/fonts/inter';
import DeploymentBuildBadge from '../components/common/DeploymentBuildBadge';
import ServiceWorkerRegister from '../components/ServiceWorkerRegister';
import AntdRegistry from '../lib/AntdRegistry';

const siteUrl = PLATFORM_URL;

const defaultTitle = 'MenuList - Upload Your Menu Online';
const defaultDescription = 'Start with your current menu. MenuList prepares your live menu, official page, QR assets, customer app, PDF, and web link from one owner-approved source.';
const defaultImage = '/images/website/menulist-og-official-source.png';
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
                alt: 'MenuList - upload your menu online preview',
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
    maximumScale: 1,
    userScalable: false,
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
                <meta name="color-scheme" content="light" />
                <meta name="mobile-web-app-capable" content="yes" />
                <style
                    dangerouslySetInnerHTML={{
                        __html: `
                            html,
                            body {
                                background: #ffffff !important;
                                color-scheme: light;
                            }
                        `,
                    }}
                />
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />
                {/* CSP Violation Monitor (Development Only) */}
                {isDev && (
                    <script dangerouslySetInnerHTML={{
                        __html: `
                            // Local dev must never stay controlled by an old PWA worker.
                            // A stale Workbox registration can serve old _next chunks and
                            // surface as React/webpack "undefined.call" hydration errors.
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
                                            registrations.map((registration) => registration.unregister().catch(() => false))
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
                                    .catch(() => {});
                            })();

                            // Suppress known development warnings
                            const originalConsoleWarn = console.warn;
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
                                
                                // Show prominent warning for actual blocked resources
                                const violatedDirective = e.violatedDirective;
                                const blockedURI = e.blockedURI;
                                
                                console.groupCollapsed(
                                    '%c🚨 CSP BLOCKED URL - ADD TO ALLOWLIST!',
                                    'background: #dc2626; color: white; padding: 8px 16px; font-size: 14px; font-weight: bold; border-radius: 4px;'
                                );
                                
                                console.log('%c📍 Directive:', 'font-weight: bold; color: #0051d1;', violatedDirective);
                                console.log('%c🔗 Blocked URL:', 'font-weight: bold; color: #dc2626;', blockedURI);
                                
                                if (blockedURI && blockedURI !== 'inline' && blockedURI !== 'eval') {
                                    console.log('%c\\n✅ HOW TO FIX:', 'font-weight: bold; color: #16a34a; font-size: 13px;');
                                    console.log('%c1. Open:', 'font-weight: bold;', 'src/config/csp-allowlist.ts');
                                    console.log('%c2. Add URL to appropriate array:', 'font-weight: bold;');
                                    
                                    if (violatedDirective.includes('script')) {
                                        console.log('   scriptSources: [\\n     "' + blockedURI + '", // Add this\\n   ]');
                                    } else if (violatedDirective.includes('style')) {
                                        console.log('   styleSources: [\\n     "' + blockedURI + '", // Add this\\n   ]');
                                    } else if (violatedDirective.includes('font')) {
                                        console.log('   fontSources: [\\n     "' + blockedURI + '", // Add this\\n   ]');
                                    } else if (violatedDirective.includes('connect')) {
                                        console.log('   connectSources: [\\n     "' + blockedURI + '", // Add this\\n   ]');
                                    } else if (violatedDirective.includes('frame')) {
                                        console.log('   frameSources: [\\n     "' + blockedURI + '", // Add this\\n   ]');
                                    }
                                    
                                    console.log('%c3. Restart dev server:', 'font-weight: bold;', 'npm run dev');
                                }
                                
                                console.log('%c\\n📄 Full details:', 'font-weight: bold; color: #6b7280;', {
                                    directive: violatedDirective,
                                    blockedURL: blockedURI,
                                    sourceFile: e.sourceFile,
                                    lineNumber: e.lineNumber,
                                    violatedPolicy: e.originalPolicy,
                                });
                                
                                console.groupEnd();
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
