'use client';

import { useEffect } from 'react';

const REVEAL_SELECTOR = '.nv-reveal';

export default function ScrollRevealController() {
    useEffect(() => {
        const root = document.querySelector<HTMLElement>('.neelvara-site');

        if (!root) {
            return;
        }

        const targets = Array.from(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));

        if (!targets.length) {
            return;
        }

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
            targets.forEach((target) => {
                target.classList.add('is-visible');
            });
            root.classList.add('nv-reveal-ready');
            return;
        }

        root.classList.add('nv-reveal-ready');

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                });
            },
            {
                rootMargin: '0px 0px -12% 0px',
                threshold: 0.12,
            },
        );

        targets.forEach((target, index) => {
            target.style.setProperty('--nv-reveal-delay', `${Math.min(index * 45, 220)}ms`);
            observer.observe(target);
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    return null;
}
