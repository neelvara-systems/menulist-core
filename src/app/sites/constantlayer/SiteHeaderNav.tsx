'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';

type ConstantLayerNavItem = {
    label: string;
    href: string;
    activeHrefs?: string[];
};

function getConstantLayerBasePath(pathname: string): string {
    if (pathname === '/cl' || pathname.startsWith('/cl/')) {
        return '/cl';
    }

    if (pathname === '/__constantlayer' || pathname.startsWith('/__constantlayer/')) {
        return '/__constantlayer';
    }

    if (pathname === '/sites/constantlayer' || pathname.startsWith('/sites/constantlayer/')) {
        return '/sites/constantlayer';
    }

    return '';
}

function normalizeConstantLayerPath(pathname: string): string {
    const stripped = pathname
        .replace(/^\/cl(?=\/|$)/, '')
        .replace(/^\/__constantlayer/, '')
        .replace(/^\/sites\/constantlayer/, '')
        .replace(/\/$/, '');

    return stripped || '/';
}

function withConstantLayerBasePath(basePath: string, href: string): string {
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http')) return href;
    if (href === '/') return basePath || '/';
    return `${basePath}${href}`;
}

function isActivePath(currentPath: string, item: ConstantLayerNavItem): boolean {
    const activeHrefs = item.activeHrefs || [item.href];

    return activeHrefs.some((href) => {
        if (href === '/') return currentPath === '/';
        return currentPath === href || currentPath.startsWith(`${href}/`);
    });
}

export function SiteHeaderNav({
    items,
}: {
    items: ConstantLayerNavItem[];
}) {
    const pathname = usePathname();
    const basePath = getConstantLayerBasePath(pathname || '/');
    const currentPath = normalizeConstantLayerPath(pathname || '/');

    return (
        <nav aria-label="ConstantLayer navigation">
            {items.map((item) => {
                const active = isActivePath(currentPath, item);
                const targetHref = item.href === '/' ? basePath || '/' : `${basePath}${item.href}`;

                return (
                    <Link
                        key={item.href}
                        href={targetHref}
                        aria-current={active ? 'page' : undefined}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}

type ConstantLayerLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
    href: string;
};

export function ConstantLayerLink({ href, ...props }: ConstantLayerLinkProps) {
    const pathname = usePathname();
    const basePath = getConstantLayerBasePath(pathname || '/');

    return (
        <Link
            {...props}
            href={withConstantLayerBasePath(basePath, href)}
        />
    );
}
