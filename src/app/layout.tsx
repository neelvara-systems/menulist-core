import '@styles/app.scss';
import '@styles/mobile-theme.css';
import 'antd/dist/reset.css';
import { Metadata } from 'next';
import { APP_THEME_COLOR } from 'src/constants/common';
import { interFont } from 'src/fonts/inter';
import DeploymentBuildBadge from '../components/common/DeploymentBuildBadge';
import ServiceWorkerRegister from '../components/ServiceWorkerRegister';
import AntdRegistry from '../lib/AntdRegistry';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menulist.ai';

const defaultTitle = 'MenuList — Your Menu, Always Running';
const defaultDescription = 'MenuList keeps your digital menu accurate, up-to-date, and ready to share. Upload once. Everything stays current automatically.';

export const metadata: Metadata = {
    title: defaultTitle,
    description: defaultDescription,
    metadataBase: new URL(siteUrl),
    keywords: ['digital menu', 'restaurant menu', 'menu management', 'QR menu', 'online menu', 'menu link'],
    authors: [{ name: 'MenuList', url: siteUrl }],
    openGraph: {
        title: defaultTitle,
        description: defaultDescription,
        url: siteUrl,
        siteName: 'MenuList',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'MenuList — Your Menu, Always Running',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: defaultTitle,
        description: defaultDescription,
        images: ['/og-image.png'],
    },
    icons: {
        icon: '/favicon.ico',
        apple: '/icons/apple-touch-icon.png',
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
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />
                {/* CSP Violation Monitor (Development Only) */}
                {isDev && (
                    <script dangerouslySetInnerHTML={{
                        __html: `
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
                                
                                console.log('%c📍 Directive:', 'font-weight: bold; color: #2563eb;', violatedDirective);
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
