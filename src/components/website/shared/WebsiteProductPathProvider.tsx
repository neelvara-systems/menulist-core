'use client';

import { isReviewedWebsiteResourceLocale } from '@/content/websiteResources/routing';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useMemo } from 'react';

const WebsiteProductPathContext = createContext('');

const PREFIXABLE_WEBSITE_PATHS = [
    '/',
    '/about',
    '/ai-menu-manager',
    '/contact',
    '/create-menu',
    '/features',
    '/faq',
    '/get-started',
    '/how-it-works',
    '/industries',
    '/invite',
    '/multi-location',
    '/pricing',
    '/privacy-policy',
    '/refund-policy',
    '/resources',
    '/terms-of-service',
    '/tools',
    '/trust-security',
    '/whatsapp',
];

function normalizeBasePath(basePath?: string | null): string {
    if (!basePath || !basePath.startsWith('/') || basePath.includes('//')) return '';
    return basePath === '/' ? '' : basePath.replace(/\/+$/, '');
}

export function shouldPrefixWebsiteHref(href: string): boolean {
    if (!href.startsWith('/') || href.startsWith('//')) return false;

    const [firstPathPart, secondPathPart] = href.split('/').filter(Boolean);
    if (isReviewedWebsiteResourceLocale(firstPathPart) && secondPathPart === 'resources') {
        return true;
    }

    return PREFIXABLE_WEBSITE_PATHS.some((path) => (
        href === path
        || href.startsWith(`${path}/`)
        || href.startsWith(`${path}?`)
        || href.startsWith(`${path}#`)
    ));
}

export function withWebsiteBasePath(href: string, basePath: string): string {
    const normalizedBasePath = normalizeBasePath(basePath);
    if (!normalizedBasePath || !shouldPrefixWebsiteHref(href)) return href;

    if (href === '/') return normalizedBasePath;
    return `${normalizedBasePath}${href}`;
}

export function withoutWebsiteBasePath(pathname: string, basePath: string): string {
    const normalizedBasePath = normalizeBasePath(basePath);
    if (!normalizedBasePath) return pathname;
    if (pathname === normalizedBasePath) return '/';
    if (pathname.startsWith(`${normalizedBasePath}/`)) return pathname.slice(normalizedBasePath.length);
    return pathname;
}

export function useWebsiteBasePath(): string {
    return useContext(WebsiteProductPathContext);
}

export function useWebsitePath(href: string): string {
    const basePath = useWebsiteBasePath();
    return useMemo(() => withWebsiteBasePath(href, basePath), [basePath, href]);
}

interface WebsiteProductPathProviderProps {
    basePath?: string | null;
    children: React.ReactNode;
}

export default function WebsiteProductPathProvider({
    basePath,
    children,
}: WebsiteProductPathProviderProps) {
    const pathname = usePathname();
    const resolvedBasePath = useMemo(() => {
        const explicitBasePath = normalizeBasePath(basePath);
        if (explicitBasePath) return explicitBasePath;
        return pathname === '/ml' || pathname?.startsWith('/ml/') ? '/ml' : '';
    }, [basePath, pathname]);

    return (
        <WebsiteProductPathContext.Provider value={resolvedBasePath}>
            {children}
        </WebsiteProductPathContext.Provider>
    );
}
