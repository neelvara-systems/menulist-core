'use client';

import type { MouseEvent, ReactNode } from 'react';

interface PreviewNavigationGuardProps {
    children: ReactNode;
}

export default function PreviewNavigationGuard({ children }: PreviewNavigationGuardProps) {
    const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
        const target = event.target instanceof Element ? event.target : null;
        const anchor = target?.closest('a[href]');
        if (!anchor) return;

        event.preventDefault();
        event.stopPropagation();
    };

    return (
        <div data-preview-navigation-guard="true" onClickCapture={handleClickCapture}>
            {children}
        </div>
    );
}
