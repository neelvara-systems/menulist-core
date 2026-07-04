'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const REVEAL_SELECTOR = '.nv-reveal';
const REVEAL_DELAY_STEP = 0.045;
const REVEAL_MAX_DELAY = 0.24;
const REVEAL_DISTANCE = '28px';
const REVEAL_DURATION = '780ms';
const FALLBACK_VP_CHECK_DELAY_MS = 140;
const ROOT_MARGIN = '0px 0px -2% 0px';
const INTERSECTION_THRESHOLD = 0.01;

function markVisible(element: HTMLElement) {
    element.classList.remove('nv-reveal--pending');
    element.classList.add('nv-reveal--visible');
}

function isInViewport(element: HTMLElement) {
    const bounds = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    return bounds.top < viewportHeight + 24 && bounds.bottom > -24;
}

function getSiblingRevealIndex(element: HTMLElement, targets: HTMLElement[]) {
    const siblings = targets.filter((target) => target.parentElement === element.parentElement);
    const index = siblings.indexOf(element);
    return Math.max(index, 0);
}

export default function ScrollRevealController() {
    const pathname = usePathname();

    useEffect(() => {
        const root = document.querySelector<HTMLElement>('.neelvara-site');

        if (!root) {
            return undefined;
        }

        const targets = Array.from(new Set(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)));

        if (!targets.length) {
            return undefined;
        }

        targets.forEach((target) => {
            target.classList.remove('nv-reveal--visible', 'is-visible');
            const siblingIndex = getSiblingRevealIndex(target, targets);
            target.style.setProperty('--nv-reveal-delay', `${Math.min(siblingIndex * REVEAL_DELAY_STEP, REVEAL_MAX_DELAY)}s`);
            target.style.setProperty('--nv-reveal-distance', REVEAL_DISTANCE);
            target.style.setProperty('--nv-reveal-duration', REVEAL_DURATION);
        });

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion || typeof window.IntersectionObserver !== 'function') {
            targets.forEach(markVisible);
            return undefined;
        }

        const initiallyVisibleTargets = targets.filter(isInViewport);

        targets.forEach((target) => {
            target.classList.add('nv-reveal--pending');
        });

        root.getBoundingClientRect();

        let initialRevealFrame = 0;
        const initialRevealPrepareFrame = window.requestAnimationFrame(() => {
            initialRevealFrame = window.requestAnimationFrame(() => {
                initiallyVisibleTargets.forEach(markVisible);
            });
        });

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    markVisible(entry.target as HTMLElement);
                    observer.unobserve(entry.target);
                });
            },
            { threshold: INTERSECTION_THRESHOLD, rootMargin: ROOT_MARGIN },
        );

        const visibleTargets = new Set(initiallyVisibleTargets);
        targets.forEach((target) => {
            if (!visibleTargets.has(target)) {
                observer.observe(target);
            }
        });

        const fallbackTimer = window.setTimeout(() => {
            targets.forEach((target) => {
                if (!target.classList.contains('nv-reveal--visible') && isInViewport(target)) {
                    markVisible(target);
                    observer.unobserve(target);
                }
            });
        }, FALLBACK_VP_CHECK_DELAY_MS);

        return () => {
            observer.disconnect();
            cancelAnimationFrame(initialRevealPrepareFrame);
            cancelAnimationFrame(initialRevealFrame);
            clearTimeout(fallbackTimer);
        };
    }, [pathname]);

    return null;
}
