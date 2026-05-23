"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const REVEAL_DELAY_STEP = 0.09;
const REVEAL_MAX_DELAY = 0.9;
const REVEAL_TARGET_SELECTOR =
    "[data-canonica-reveal], [data-canonica-reveal-item], main section, main article, main aside, footer section, footer article, footer aside";
const REVEAL_DISTANCE = "14px";
const REVEAL_DURATION = "560ms";
const FALLBACK_VP_CHECK_DELAY_MS = 120;
const ROOT_MARGIN = "0px 0px -6% 0px";
const INTERSECTION_THRESHOLD = 0.1;

function markVisible(element: HTMLElement) {
    element.classList.remove("ws-animate-on-scroll--pending");
    element.classList.add("ws-animate-on-scroll--visible");
}

function isInViewport(element: HTMLElement) {
    const bounds = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    return bounds.top < viewportHeight + 24 && bounds.bottom > -24;
}

function isArticleRevealCandidate(element: HTMLElement) {
    const tagName = element.tagName.toLowerCase();
    if (tagName !== "article") {
        return true;
    }

    const className = element.className;
    if (typeof className !== "string") {
        return false;
    }

    const hasRoundedClass = /rounded-(?:xl|2xl|3xl|lg|md|sm|\[1\.75rem\])/;
    if (!hasRoundedClass.test(className) && !className.includes("rounded-full")) {
        return false;
    }

    const hasText = (element.textContent || "").trim().length > 0;
    if (!hasText) {
        return false;
    }

    const hasChildren = element.children.length > 0;
    if (!hasChildren) {
        return false;
    }

    return true;
}

export default function CanonicaScrollReveal() {
    const pathname = usePathname();

    useEffect(() => {
        const root = document.querySelector(".canonica-site");
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
            Array.from(region.querySelectorAll<HTMLElement>(REVEAL_TARGET_SELECTOR)),
        );
        const targets = Array.from(new Set(declaredTargets.filter((target) => isArticleRevealCandidate(target))));

        if (!targets.length) {
            return;
        }

        targets.forEach((target, index) => {
            target.classList.add("ws-animate-on-scroll");
            target.classList.remove("ws-animate-on-scroll--visible");
            target.style.setProperty("--ws-appear-delay", `${Math.min(index * REVEAL_DELAY_STEP, REVEAL_MAX_DELAY)}s`);
            target.style.setProperty("--ws-appear-distance", REVEAL_DISTANCE);
            target.style.setProperty("--ws-appear-duration", REVEAL_DURATION);
            target.style.transitionDuration = REVEAL_DURATION;
        });

        if (prefersReducedMotion || typeof window.IntersectionObserver !== "function") {
            targets.forEach(markVisible);
            return undefined;
        }

        targets.forEach((target) => {
            target.classList.add("ws-animate-on-scroll--pending");
            if (isInViewport(target)) {
                markVisible(target);
            }
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

        const visibleTargets = targets.filter((target) => target.classList.contains("ws-animate-on-scroll--visible"));
        targets.forEach((target) => {
            if (!visibleTargets.includes(target)) {
                observer.observe(target);
            }
        });

        const fallbackTimer = window.setTimeout(() => {
            targets.forEach((target) => {
                if (!target.classList.contains("ws-animate-on-scroll--visible") && isInViewport(target)) {
                    markVisible(target);
                    observer.unobserve(target);
                }
            });
        }, FALLBACK_VP_CHECK_DELAY_MS);

        return () => {
            observer.disconnect();
            clearTimeout(fallbackTimer);
        };
    }, [pathname]);

    return null;
}
