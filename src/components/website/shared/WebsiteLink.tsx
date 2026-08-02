'use client';

import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { OWNER_APP_URL } from '@constant/urls';
import { useWebsitePath } from './WebsiteProductPathProvider';

type WebsiteLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | 'href'> & LinkProps & {
    children: ReactNode;
};

export default function WebsiteLink({ href, children, ...props }: WebsiteLinkProps) {
    const rawHref = typeof href === 'string' ? href : href.pathname || '/';
    const websiteHref = useWebsitePath(rawHref);
    const resolvedHref = typeof href === 'string'
        && (href === '/create-menu' || href.startsWith('/create-menu?') || href.startsWith('/create-menu#'))
        ? `${OWNER_APP_URL}${href}`
        : websiteHref;
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
