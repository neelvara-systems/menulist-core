"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const REVEAL_DELAY_STEP = 0.05;
const REVEAL_MAX_DELAY = 0.32;
const EXPLICIT_REVEAL_SELECTOR = [
    "[data-answerlattice-reveal]",
    "[data-answerlattice-reveal-item]",
    "[data-answerlattice-asset-src]",
    "main h1:not(.al-home-hero-title)",
    "main section:first-child p[class*='leading-relaxed']",
    "main section:first-child a[class*='rounded-']",
    ".al-page-hero__proof",
    ".al-page-hero__eyebrow",
    ".al-page-hero__title",
    ".al-page-hero__description",
    ".al-page-hero__actions",
].join(", ");
const CARD_REVEAL_SELECTOR = [
    "main .grid > a[class*='rounded-']",
    "main .grid > article[class*='rounded-']",
    "main .grid > div[class*='rounded-']",
    "main [class*='space-y-'] > article[class*='rounded-']",
    "main [class*='space-y-'] > div[class*='rounded-']",
    "main .flex > a[class*='rounded-']",
    "main .flex > button[class*='rounded-']",
    "main ol > li[class*='rounded-']",
    "main ul > li[class*='rounded-']",
].join(", ");
const REVEAL_DISTANCE = "38px";
const REVEAL_DURATION = "840ms";
const FALLBACK_VP_CHECK_DELAY_MS = 120;
const ROOT_MARGIN = "0px 0px -6% 0px";
const INTERSECTION_THRESHOLD = 0.1;

function markVisible(element: HTMLElement) {
    element.classList.remove("al-scroll-reveal--pending");
    element.classList.add("al-scroll-reveal--visible");
}

function isInViewport(element: HTMLElement) {
    const bounds = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    return bounds.top < viewportHeight + 24 && bounds.bottom > -24;
}

function getElementClassName(element: HTMLElement) {
    const className = element.className;
    return typeof className === "string" ? className : "";
}

function hasReadableContent(element: HTMLElement) {
    return (element.textContent || "").trim().length > 0 || element.children.length > 0;
}

function isLayoutContainer(element: HTMLElement) {
    return ["main", "section", "footer", "header", "nav", "aside"].includes(element.tagName.toLowerCase());
}

function isCardLikeElement(element: HTMLElement) {
    if (isLayoutContainer(element)) {
        return false;
    }

    const className = getElementClassName(element);
    if (!className || !className.includes("rounded-") || className.includes("rounded-full")) {
        return false;
    }

    const hasPanelTreatment =
        className.includes("border") ||
        className.includes("bg-") ||
        className.includes("shadow") ||
        className.includes("ring-");
    if (!hasPanelTreatment || !hasReadableContent(element)) {
        return false;
    }

    const bounds = element.getBoundingClientRect();
    return bounds.width >= 72 && bounds.height >= 18;
}

function shouldRevealElement(element: HTMLElement) {
    if (isLayoutContainer(element)) {
        return false;
    }

    if (element.matches(EXPLICIT_REVEAL_SELECTOR)) {
        return hasReadableContent(element);
    }

    return isCardLikeElement(element);
}

function getSiblingRevealIndex(element: HTMLElement, targets: HTMLElement[]) {
    const siblings = targets.filter((target) => target.parentElement === element.parentElement);
    const index = siblings.indexOf(element);
    return Math.max(index, 0);
}

export default function AnswerlatticeScrollReveal(): null {
    const pathname = usePathname();

    useEffect(() => {
        const root = document.querySelector(".answerlattice-site");
        if (!root) {
            return;
        }

        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const main = root.querySelector("main");
        const footer = root.querySelector("footer");
        const targetRegions = [main, footer].filter((node): node is HTMLElement => Boolean(node));
        if (!targetRegions.length) {
            return;
        }

        const declaredTargets = targetRegions.flatMap((region) =>
            [
                ...Array.from(region.querySelectorAll<HTMLElement>(EXPLICIT_REVEAL_SELECTOR)),
                ...Array.from(region.querySelectorAll<HTMLElement>(CARD_REVEAL_SELECTOR)),
            ],
        );
        const targets = Array.from(new Set(declaredTargets.filter(shouldRevealElement)));

        if (!targets.length) {
            return;
        }

        targets.forEach((target) => {
            target.classList.add("al-scroll-reveal");
            target.classList.remove("al-scroll-reveal--visible");
            const siblingIndex = getSiblingRevealIndex(target, targets);
            target.style.setProperty("--al-reveal-delay", `${Math.min(siblingIndex * REVEAL_DELAY_STEP, REVEAL_MAX_DELAY)}s`);
            target.style.setProperty("--al-reveal-distance", REVEAL_DISTANCE);
            target.style.setProperty("--al-reveal-duration", REVEAL_DURATION);
            target.style.transitionDuration = REVEAL_DURATION;
        });

        if (prefersReducedMotion || typeof window.IntersectionObserver !== "function") {
            targets.forEach(markVisible);
            return undefined;
        }

        const initiallyVisibleTargets = targets.filter(isInViewport);

        targets.forEach((target) => {
            target.classList.add("al-scroll-reveal--pending");
        });

        targetRegions[0]?.getBoundingClientRect();

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
                if (!target.classList.contains("al-scroll-reveal--visible") && isInViewport(target)) {
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
