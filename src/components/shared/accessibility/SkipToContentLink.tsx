'use client';

import { useEffect, type MouseEvent, type ReactNode } from 'react';

type SkipToContentLinkProps = {
    children?: ReactNode;
    targetId?: string;
    targetSelector?: string;
};

function prepareTarget(targetId: string, targetSelector: string): HTMLElement | null {
    const existingTarget = document.getElementById(targetId);
    if (existingTarget) {
        if (!existingTarget.hasAttribute('tabindex')) {
            existingTarget.setAttribute('tabindex', '-1');
        }
        return existingTarget;
    }

    const target = document.querySelector<HTMLElement>(targetSelector);
    if (!target) return null;

    target.id = targetId;
    if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
    }
    return target;
}

export default function SkipToContentLink({
    children = 'Skip to main content',
    targetId = 'main-content',
    targetSelector = 'main, [role="main"]',
}: SkipToContentLinkProps) {
    useEffect(() => {
        prepareTarget(targetId, targetSelector);
    }, [targetId, targetSelector]);

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
        const target = prepareTarget(targetId, targetSelector);
        if (!target) return;

        event.preventDefault();
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: 'start' });
        window.history.replaceState(null, '', `#${targetId}`);
    };

    return (
        <a className="skip-to-content-link" href={`#${targetId}`} onClick={handleClick}>
            {children}
        </a>
    );
}
