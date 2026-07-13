'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ComponentProps, useEffect, useState } from 'react';
import { LuMenu, LuX } from 'react-icons/lu';

type NeelvaraNavItem = {
    label: string;
    href: string;
    activeHrefs?: string[];
};

function getNeelvaraBasePath(pathname: string): string {
    if (pathname === '/nv' || pathname.startsWith('/nv/')) {
        return '/nv';
    }

    if (pathname === '/__neelvara' || pathname.startsWith('/__neelvara/')) {
        return '/__neelvara';
    }

    if (pathname === '/sites/neelvara' || pathname.startsWith('/sites/neelvara/')) {
        return '/sites/neelvara';
    }

    return '';
}

function normalizeNeelvaraPath(pathname: string): string {
    const stripped = pathname
        .replace(/^\/nv(?=\/|$)/, '')
        .replace(/^\/__neelvara/, '')
        .replace(/^\/sites\/neelvara/, '')
        .replace(/\/$/, '');

    return stripped || '/';
}

function withNeelvaraBasePath(basePath: string, href: string): string {
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http')) return href;
    if (href === '/') return basePath || '/';
    return `${basePath}${href}`;
}

function isActivePath(currentPath: string, item: NeelvaraNavItem): boolean {
    const activeHrefs = item.activeHrefs || [item.href];

    return activeHrefs.some((href) => {
        if (href === '/') return currentPath === '/';
        return currentPath === href || currentPath.startsWith(`${href}/`);
    });
}

export function SiteHeaderNav({
    items,
}: {
    items: NeelvaraNavItem[];
}) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const basePath = getNeelvaraBasePath(pathname || '/');
    const currentPath = normalizeNeelvaraPath(pathname || '/');

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleEscape = (event: globalThis.KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            setIsOpen(false);
            document.getElementById('neelvara-nav-toggle')?.focus();
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    return (
        <>
            <button
                aria-controls="neelvara-primary-navigation"
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
                className="nv-nav-toggle"
                id="neelvara-nav-toggle"
                onClick={() => setIsOpen((current) => !current)}
                type="button"
            >
                {isOpen ? <LuX aria-hidden="true" /> : <LuMenu aria-hidden="true" />}
            </button>
            <nav
                aria-label="Neelvara navigation"
                className={`nv-header-nav${isOpen ? ' is-open' : ''}`}
                id="neelvara-primary-navigation"
            >
                {items.map((item) => {
                    const active = isActivePath(currentPath, item);
                    const targetHref = item.href === '/' ? basePath || '/' : `${basePath}${item.href}`;

                    return (
                        <Link
                            key={item.href}
                            href={targetHref}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => setIsOpen(false)}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}

type NeelvaraLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
    href: string;
};

export function NeelvaraLink({ href, ...props }: NeelvaraLinkProps) {
    const pathname = usePathname();
    const basePath = getNeelvaraBasePath(pathname || '/');

    return (
        <Link
            {...props}
            href={withNeelvaraBasePath(basePath, href)}
        />
    );
}
