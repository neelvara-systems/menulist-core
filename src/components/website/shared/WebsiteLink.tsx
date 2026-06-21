'use client';

import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { useWebsitePath } from './WebsiteProductPathProvider';

type WebsiteLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | 'href'> & LinkProps & {
    children: ReactNode;
};

export default function WebsiteLink({ href, children, ...props }: WebsiteLinkProps) {
    const resolvedHref = useWebsitePath(typeof href === 'string' ? href : href.pathname || '/');
    const finalHref = typeof href === 'string'
        ? resolvedHref
        : {
            ...href,
            pathname: resolvedHref,
        };

    return (
        <Link href={finalHref} {...props}>
            {children}
        </Link>
    );
}
