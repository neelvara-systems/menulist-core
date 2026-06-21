"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const REVEAL_DELAY_STEP = 0.045;
const REVEAL_MAX_DELAY = 0.28;
const REVEAL_DISTANCE = "34px";
const REVEAL_DURATION = "780ms";
const FALLBACK_VP_CHECK_DELAY_MS = 140;
const ROOT_MARGIN = "0px 0px -7% 0px";
const INTERSECTION_THRESHOLD = 0.12;

const CAMPAIGNCUE_REVEAL_SELECTOR = [
    ".campaigncue-hero-copy",
    ".campaigncue-preview-window",
    ".campaigncue-floating-asset",
    ".campaigncue-proof-strip span",
    ".campaigncue-fit-check-copy",
    ".campaigncue-fit-check-row",
    ".campaigncue-powerhouse-heading",
    ".campaigncue-powerhouse-card",
    ".campaigncue-real-work-copy",
    ".campaigncue-real-work-row",
    ".campaigncue-catalog-rail",
    ".campaigncue-catalog-row",
    ".campaigncue-owner-path-intro",
    ".campaigncue-owner-path li",
    ".campaigncue-section-intro",
    ".campaigncue-workflow-step",
    ".campaigncue-band-copy",
    ".campaigncue-desk-preview",
    ".campaigncue-output-row",
    ".campaigncue-editor-preview",
    ".campaigncue-benefit-row",
    ".campaigncue-cuelayers-preview",
    ".campaigncue-start-row",
    ".campaigncue-asset-wall-copy",
    ".campaigncue-asset-tile",
    ".campaigncue-trust-points span",
    ".campaigncue-trust-matrix",
    ".campaigncue-delivery-list span",
    ".campaigncue-capability-row",
    ".campaigncue-faq-list details",
    ".campaigncue-final-cta",
    ".campaigncue-footer-brand",
    ".campaigncue-footer-groups nav",
    ".campaigncue-feature-hero-copy",
    ".campaigncue-feature-preview",
    ".campaigncue-feature-outcome div",
    ".campaigncue-feature-section-heading",
    ".campaigncue-feature-steps article",
    ".campaigncue-feature-proof-grid article",
    ".campaigncue-feature-benefits span",
    ".campaigncue-feature-boundary",
    ".campaigncue-feature-system-map",
    ".campaigncue-feature-faq details",
    ".campaigncue-feature-related a",
    ".campaigncue-use-case-hero-copy",
    ".campaigncue-use-case-preview",
    ".campaigncue-use-case-proof-strip span",
    ".campaigncue-use-case-section-heading",
    ".campaigncue-use-case-question-grid article",
    ".campaigncue-use-case-source-pack",
    ".campaigncue-use-case-asset-grid article",
    ".campaigncue-use-case-scenarios article",
    ".campaigncue-use-case-steps article",
    ".campaigncue-use-case-reuse-preview",
    ".campaigncue-use-case-boundary",
    ".campaigncue-use-case-system-map",
].join(", ");

function markVisible(element: HTMLElement) {
    element.classList.remove("cc-scroll-reveal--pending");
    element.classList.add("cc-scroll-reveal--visible");
}

function isInViewport(element: HTMLElement) {
    const bounds = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    return bounds.top < viewportHeight + 24 && bounds.bottom > -24;
}

function hasReadableContent(element: HTMLElement) {
    return (element.textContent || "").trim().length > 0 || element.children.length > 0;
}

function getSiblingRevealIndex(element: HTMLElement, targets: HTMLElement[]) {
    const siblings = targets.filter((target) => target.parentElement === element.parentElement);
    const index = siblings.indexOf(element);
    return Math.max(index, 0);
}

function prepareTarget(target: HTMLElement, targets: HTMLElement[]) {
    target.classList.add("cc-scroll-reveal");
    target.classList.remove("cc-scroll-reveal--visible");
    const siblingIndex = getSiblingRevealIndex(target, targets);
    target.style.setProperty("--cc-reveal-delay", `${Math.min(siblingIndex * REVEAL_DELAY_STEP, REVEAL_MAX_DELAY)}s`);
    target.style.setProperty("--cc-reveal-distance", REVEAL_DISTANCE);
    target.style.setProperty("--cc-reveal-duration", REVEAL_DURATION);
}

export default function CampaignCueScrollReveal() {
    const pathname = usePathname();

    useEffect(() => {
        const root = document.querySelector(".campaigncue-site");
        if (!root) {
            return undefined;
        }

        const declaredTargets = Array.from(root.querySelectorAll<HTMLElement>(CAMPAIGNCUE_REVEAL_SELECTOR));
        const targets = Array.from(new Set(declaredTargets.filter(hasReadableContent)));
        if (!targets.length) {
            return undefined;
        }

        targets.forEach((target) => prepareTarget(target, targets));

        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReducedMotion || typeof window.IntersectionObserver !== "function") {
            targets.forEach(markVisible);
            return undefined;
        }

        const initiallyVisibleTargets = targets.filter(isInViewport);

        targets.forEach((target) => {
            target.classList.add("cc-scroll-reveal--pending");
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
                if (!target.classList.contains("cc-scroll-reveal--visible") && isInViewport(target)) {
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
