'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const REVEAL_SELECTOR = '.nv-reveal';
const REVEAL_DELAY_STEP = 0.035;
const REVEAL_MAX_DELAY = 0.14;
const ROOT_MARGIN = '0px 0px 10% 0px';
const INTERSECTION_THRESHOLD = 0.01;

function markVisible(element: HTMLElement) {
    element.classList.remove('nv-reveal--pending');
    element.classList.add('nv-reveal--visible');
}

function hasReachedViewport(element: HTMLElement) {
    if (element.getClientRects().length === 0) return true;

    const bounds = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    return bounds.top < viewportHeight;
}

function getSiblingRevealIndex(element: HTMLElement, targets: HTMLElement[]) {
    const siblings = targets.filter((target) => target.parentElement === element.parentElement);
    return Math.max(siblings.indexOf(element), 0);
}

export default function ScrollRevealController(): null {
    const pathname = usePathname();

    useEffect(() => {
        const root = document.querySelector<HTMLElement>('.neelvara-site');

        if (!root) return undefined;

        const targets = Array.from(new Set(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)));
        if (!targets.length) return undefined;

        targets.forEach((target) => {
            target.classList.remove('nv-reveal--visible', 'is-visible');
            const siblingIndex = getSiblingRevealIndex(target, targets);
            target.style.setProperty('--nv-reveal-delay', `${Math.min(siblingIndex * REVEAL_DELAY_STEP, REVEAL_MAX_DELAY)}s`);
        });

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion || typeof window.IntersectionObserver !== 'function') {
            targets.forEach(markVisible);
            return undefined;
        }

        targets.forEach((target) => target.classList.add('nv-reveal--pending'));

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    markVisible(entry.target as HTMLElement);
                    observer.unobserve(entry.target);
                });
            },
            { threshold: INTERSECTION_THRESHOLD, rootMargin: ROOT_MARGIN },
        );

        let recoveryFrame: number | null = null;

        const revealReachedTargets = () => {
            recoveryFrame = null;
            targets.forEach((target) => {
                if (!target.classList.contains('nv-reveal--pending') || !hasReachedViewport(target)) return;
                markVisible(target);
                observer.unobserve(target);
            });
        };

        const scheduleRevealRecovery = () => {
            if (recoveryFrame !== null) return;
            recoveryFrame = window.requestAnimationFrame(revealReachedTargets);
        };

        const frame = window.requestAnimationFrame(() => {
            targets.forEach((target) => {
                if (hasReachedViewport(target)) {
                    markVisible(target);
                } else {
                    observer.observe(target);
                }
            });
        });

        window.addEventListener('scroll', scheduleRevealRecovery, { passive: true });
        window.addEventListener('resize', scheduleRevealRecovery);

        return () => {
            observer.disconnect();
            window.cancelAnimationFrame(frame);
            if (recoveryFrame !== null) window.cancelAnimationFrame(recoveryFrame);
            window.removeEventListener('scroll', scheduleRevealRecovery);
            window.removeEventListener('resize', scheduleRevealRecovery);
        };
    }, [pathname]);

    return null;
}
