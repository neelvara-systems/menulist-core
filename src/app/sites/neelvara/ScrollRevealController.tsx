"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const REVEAL_SELECTOR = ".nv-reveal";
const REVEAL_ITEM_SELECTOR = [
  ".nv-hero-copy > *",
  ".nv-page-hero-copy > *",
  ".nv-section-intro",
  ".nv-principle",
  ".nv-product-summary",
  ".nv-product-row",
  ".nv-section-head",
  ".nv-routing-card",
  ".nv-product-detail-card",
  ".nv-trust-overview-head",
  ".nv-trust-status-row",
  ".nv-text-panel > div:first-child",
  ".nv-text-panel > .nv-check-list",
  ".nv-support-product-link",
  ".nv-final-band > *",
].join(",");
const REVEAL_DELAY_STEP = 0.035;
const REVEAL_MAX_DELAY = 0.14;
const REVEAL_ITEM_DELAY_STEP = 0.065;
const REVEAL_ITEM_MAX_DELAY = 0.325;
const ROOT_MARGIN = "0px 0px -12% 0px";
const INTERSECTION_THRESHOLD = 0.08;

function markVisible(element: HTMLElement) {
  element.classList.remove("nv-reveal--pending");
  element.classList.add("nv-reveal--visible");
}

function getSiblingRevealIndex(element: HTMLElement, targets: HTMLElement[]) {
  const siblings = targets.filter(
    (target) => target.parentElement === element.parentElement,
  );
  return Math.max(siblings.indexOf(element), 0);
}

export default function ScrollRevealController(): null {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".neelvara-site");

    if (!root) return undefined;

    const targets = Array.from(
      new Set(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)),
    );
    if (!targets.length) return undefined;

    targets.forEach((target) => {
      target.classList.remove("nv-reveal--visible", "is-visible");
      const siblingIndex = getSiblingRevealIndex(target, targets);
      target.style.setProperty(
        "--nv-reveal-delay",
        `${Math.min(siblingIndex * REVEAL_DELAY_STEP, REVEAL_MAX_DELAY)}s`,
      );

      target
        .querySelectorAll<HTMLElement>(REVEAL_ITEM_SELECTOR)
        .forEach((item, itemIndex) => {
          item.classList.add("nv-reveal-item");
          item.style.setProperty(
            "--nv-reveal-item-delay",
            `${Math.min(itemIndex * REVEAL_ITEM_DELAY_STEP, REVEAL_ITEM_MAX_DELAY)}s`,
          );
        });
    });

    const clearRevealStyles = () => {
      targets.forEach((target) => {
        target.style.removeProperty("--nv-reveal-delay");
        target
          .querySelectorAll<HTMLElement>(".nv-reveal-item")
          .forEach((item) => {
            item.classList.remove("nv-reveal-item");
            item.style.removeProperty("--nv-reveal-item-delay");
          });
      });
    };

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (
      prefersReducedMotion ||
      typeof window.IntersectionObserver !== "function"
    ) {
      targets.forEach(markVisible);
      return clearRevealStyles;
    }

    targets.forEach((target) => target.classList.add("nv-reveal--pending"));

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

    let observeFrame: number | null = null;
    const paintFrame = window.requestAnimationFrame(() => {
      observeFrame = window.requestAnimationFrame(() => {
        targets.forEach((target) => observer.observe(target));
      });
    });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(paintFrame);
      if (observeFrame !== null) window.cancelAnimationFrame(observeFrame);
      clearRevealStyles();
    };
  }, [pathname]);

  return null;
}
