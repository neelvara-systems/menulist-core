'use client';

import { type MouseEvent, useEffect, useState } from 'react';

export type SupportSurfaceStoryNavItem = {
    id: string;
    label: string;
    summary: string;
};

type SupportSurfaceStoryNavProps = {
    items: SupportSurfaceStoryNavItem[];
};

function getSurfaceCardFlowTop(target: HTMLElement) {
    const screens = target.closest<HTMLElement>('.al-surface-story__screens');

    if (!screens) {
        return target.getBoundingClientRect().top + window.scrollY;
    }

    const cards = Array.from(screens.querySelectorAll<HTMLElement>('.al-surface-story__screen'));
    const targetIndex = cards.findIndex((card) => card === target);

    if (targetIndex < 0) {
        return target.getBoundingClientRect().top + window.scrollY;
    }

    const screensStyle = window.getComputedStyle(screens);
    const rowGap = Number.parseFloat(screensStyle.rowGap || screensStyle.gap);
    const gap = Number.isFinite(rowGap) ? rowGap : 0;
    const screensTop = screens.getBoundingClientRect().top + window.scrollY;

    return cards.slice(0, targetIndex).reduce((top, card) => (
        top + card.getBoundingClientRect().height + gap
    ), screensTop);
}

export default function SupportSurfaceStoryNav({ items }: SupportSurfaceStoryNavProps) {
    const [activeId, setActiveId] = useState(items[0]?.id ?? '');

    useEffect(() => {
        if (!items.length || typeof window === 'undefined') {
            return undefined;
        }

        let frameId = 0;

        const updateActiveItem = () => {
            const readingLine = Math.min(window.innerHeight * 0.58, 520);
            let readingCandidateId = '';
            let nextActiveId = items[0]?.id ?? '';
            let bestDistance = Number.POSITIVE_INFINITY;

            for (const item of items) {
                const element = document.getElementById(item.id);
                if (!element) {
                    continue;
                }

                const rect = element.getBoundingClientRect();
                const isReading = rect.top <= readingLine && rect.bottom >= readingLine;

                if (isReading) {
                    readingCandidateId = item.id;
                    continue;
                }

                const distance = Math.abs(rect.top - readingLine);
                if (!readingCandidateId && distance < bestDistance) {
                    bestDistance = distance;
                    nextActiveId = item.id;
                }
            }

            if (readingCandidateId) {
                nextActiveId = readingCandidateId;
            }

            setActiveId((currentId) => (currentId === nextActiveId ? currentId : nextActiveId));
        };

        const scheduleUpdate = () => {
            window.cancelAnimationFrame(frameId);
            frameId = window.requestAnimationFrame(updateActiveItem);
        };

        updateActiveItem();
        window.addEventListener('scroll', scheduleUpdate, { passive: true });
        window.addEventListener('resize', scheduleUpdate);

        return () => {
            window.cancelAnimationFrame(frameId);
            window.removeEventListener('scroll', scheduleUpdate);
            window.removeEventListener('resize', scheduleUpdate);
        };
    }, [items]);

    const handleStepClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.altKey ||
            event.ctrlKey ||
            event.shiftKey
        ) {
            return;
        }

        const target = document.getElementById(id);
        if (!target) {
            return;
        }

        event.preventDefault();
        setActiveId(id);

        const computedStyle = window.getComputedStyle(target);
        const stickyTop = Number.parseFloat(computedStyle.top);
        const isStickyCard = computedStyle.position === 'sticky' && Number.isFinite(stickyTop);
        const header = document.querySelector<HTMLElement>('header');
        const storyNav = document.querySelector<HTMLElement>('.al-surface-story__copy');
        const mobileNavOffset = window.matchMedia('(max-width: 1100px)').matches
            ? (storyNav?.getBoundingClientRect().height ?? 0) + 16
            : 0;
        const fallbackOffset = (header?.getBoundingClientRect().height ?? 64) + mobileNavOffset + 18;
        const offset = isStickyCard ? stickyTop : fallbackOffset;
        const targetTop = Math.max(getSurfaceCardFlowTop(target) - offset, 0);
        window.history.pushState(null, '', `#${id}`);
        window.scrollTo({
            top: targetTop,
            behavior: 'auto',
        });
    };

    return (
        <nav className="al-surface-story__nav" aria-label="Support workflow cards">
            {items.map((item) => {
                const active = activeId === item.id;

                return (
                    <a
                        key={item.id}
                        className="al-surface-story__step"
                        href={`#${item.id}`}
                        aria-current={active ? 'step' : undefined}
                        data-active={active ? 'true' : undefined}
                        onClick={(event) => handleStepClick(event, item.id)}
                    >
                        <span className="al-surface-story__step-label">{item.label}</span>
                        <span className="al-surface-story__step-summary">{item.summary}</span>
                    </a>
                );
            })}
        </nav>
    );
}
