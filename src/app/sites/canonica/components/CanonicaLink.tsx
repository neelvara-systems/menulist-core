'use client';

import Link from 'next/link';

interface CanonicaLinkProps extends Omit<React.ComponentProps<typeof Link>, 'href'> {
    href: string;
    basePath?: string;
    children: React.ReactNode;
}

/**
 * Product-aware Link for Canonica website.
 * In production (canonica.app): basePath="" → links work naturally
 * In dev mode: basePath="/__canonica" → links prefixed automatically
 */
export default function CanonicaLink({ href, basePath = '', children, ...props }: CanonicaLinkProps) {
    const resolvedHref = href.startsWith('/') ? `${basePath}${href}` : href;
    return (
        <Link href={resolvedHref} {...props}>
            {children}
        </Link>
    );
}
