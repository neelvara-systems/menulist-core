'use client';

import Link from 'next/link';

interface AnswerlatticeLinkProps extends Omit<React.ComponentProps<typeof Link>, 'href'> {
    href: string;
    basePath?: string;
    children: React.ReactNode;
}

/**
 * Product-aware Link for AnswerLattice website.
 * On product hosts (QA canonica.app, production answerlattice.com): basePath="" → links work naturally
 * In dev mode: basePath="/__answerlattice" → links prefixed automatically
 */
export default function AnswerlatticeLink({ href, basePath = '', children, ...props }: AnswerlatticeLinkProps) {
    const resolvedHref = href.startsWith('/') ? `${basePath}${href}` : href;
    return (
        <Link href={resolvedHref} {...props}>
            {children}
        </Link>
    );
}
