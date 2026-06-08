'use client';

import { useEffect, useState } from 'react';

export type SupportSurfaceStoryNavItem = {
    id: string;
    label: string;
};

type SupportSurfaceStoryNavProps = {
    items: SupportSurfaceStoryNavItem[];
};

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

    return (
        <nav className="al-surface-story__nav" aria-label="Support surface cards">
            {items.map((item) => {
                const active = activeId === item.id;

                return (
                    <a
                        key={item.id}
                        className="al-surface-story__step"
                        href={`#${item.id}`}
                        aria-current={active ? 'step' : undefined}
                        data-active={active ? 'true' : undefined}
                        onClick={() => setActiveId(item.id)}
                    >
                        <span className="al-surface-story__step-label">{item.label}</span>
                    </a>
                );
            })}
        </nav>
    );
}
