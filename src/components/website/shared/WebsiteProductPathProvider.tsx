'use client';

import { createContext, useContext, useMemo } from 'react';

const WebsiteProductPathContext = createContext('');

const PREFIXABLE_WEBSITE_PATHS = [
    '/',
    '/about',
    '/ai-menu-manager',
    '/contact',
    '/create-menu',
    '/features',
    '/get-started',
    '/how-it-works',
    '/industries',
    '/multi-location',
    '/pricing',
    '/privacy-policy',
    '/refund-policy',
    '/resources',
    '/terms-of-service',
    '/trust-security',
];

function normalizeBasePath(basePath?: string | null): string {
    if (!basePath || !basePath.startsWith('/') || basePath.includes('//')) return '';
    return basePath === '/' ? '' : basePath.replace(/\/+$/, '');
}

export function shouldPrefixWebsiteHref(href: string): boolean {
    if (!href.startsWith('/') || href.startsWith('//')) return false;

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

export function useWebsitePath(href: string): string {
    const basePath = useContext(WebsiteProductPathContext);
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
    return (
        <WebsiteProductPathContext.Provider value={normalizeBasePath(basePath)}>
            {children}
        </WebsiteProductPathContext.Provider>
    );
}
