'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

type WebsiteGtagWindow = Window & {
    gtag?: (...args: unknown[]) => void;
};

interface ResourceTrackedLinkProps {
    children: ReactNode;
    className?: string;
    eventName: string;
    eventProps?: Record<string, string | number | undefined>;
    href: string;
}

export default function ResourceTrackedLink({
    children,
    className,
    eventName,
    eventProps,
    href,
}: ResourceTrackedLinkProps) {
    return (
        <Link
            href={href}
            className={className}
            onClick={() => {
                const analyticsWindow = window as WebsiteGtagWindow;
                if (typeof analyticsWindow.gtag !== 'function') return;
                analyticsWindow.gtag('event', eventName, {
                    destination: href,
                    ...eventProps,
                });
            }}
        >
            {children}
        </Link>
    );
}
